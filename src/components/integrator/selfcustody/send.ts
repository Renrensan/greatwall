'use server'

import { PARADAPP_FEE_VAULT_SOLANA, SOLANA_NATIVE_MINT } from "@/components/solana/config/constants";
import {
  PublicKey,
  Connection,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ACCOUNT_SIZE,
  getAccountLenForMint,
  unpackMint
} from "@solana/spl-token";
import bs58 from "bs58";


const RELAYER_KEY_STRING = process.env.PARADAPP_RELAYER_PRIVATE_KEY || "";
if (!RELAYER_KEY_STRING) {
  console.warn("Warning: PARADAPP_RELAYER_PRIVATE_KEY is missing from environment variables.");
}
const relayerKeypair = Keypair.fromSecretKey(bs58.decode(RELAYER_KEY_STRING));

export async function prepareGaslessSendTx(params: {
  senderAddress: string;
  recipientAddress: string;
  mintAddress: string;
  amountUi: number;
  decimals: number;
  rpcUrl: string;
}) {
  try {
    const { senderAddress, recipientAddress, mintAddress, amountUi, decimals, rpcUrl } = params;
    
    const conn = new Connection(rpcUrl, "confirmed");
    const senderPubKey = new PublicKey(senderAddress);
    const recipientPubKey = new PublicKey(recipientAddress);
    const mintPubKey = new PublicKey(mintAddress);
    const vaultPubKey = new PublicKey(PARADAPP_FEE_VAULT_SOLANA);

    const isNativeSol = mintAddress === SOLANA_NATIVE_MINT || mintAddress === "So11111111111111111111111111111111111111112";

    let tokenProgramId = SystemProgram.programId;
    let senderAta = senderPubKey;
    let recipientAta = recipientPubKey;
    let vaultAta = vaultPubKey;
    let needsRecipientAta = false;
    let needsVaultAta = false;
    // Standard SPL Token account size; overridden below for Token-2022 mints whose
    // extensions (transfer fees, etc.) require a larger account and therefore more rent.
    let tokenAccountSize = ACCOUNT_SIZE;

    if (!isNativeSol) {
      const mintAccountInfo = await conn.getAccountInfo(mintPubKey);
      if (!mintAccountInfo) throw new Error("The specified token mint address does not exist on-chain.");
      tokenProgramId = mintAccountInfo.owner;

      try {
        const mint = unpackMint(mintPubKey, mintAccountInfo, tokenProgramId);
        tokenAccountSize = getAccountLenForMint(mint);
      } catch {
        tokenAccountSize = ACCOUNT_SIZE;
      }

      senderAta = getAssociatedTokenAddressSync(mintPubKey, senderPubKey, false, tokenProgramId);
      recipientAta = getAssociatedTokenAddressSync(mintPubKey, recipientPubKey, true, tokenProgramId);
      vaultAta = getAssociatedTokenAddressSync(mintPubKey, vaultPubKey, true, tokenProgramId);

      const [recipientAtaInfo, vaultAtaInfo] = await Promise.all([
        conn.getAccountInfo(recipientAta),
        conn.getAccountInfo(vaultAta)
      ]);

      needsRecipientAta = recipientAtaInfo === null;
      needsVaultAta = vaultAtaInfo === null;
    }

    const jupHeaders: Record<string, string> = {};
    if (process.env.JUPITER_API_KEY) {
      jupHeaders["x-api-key"] = process.env.JUPITER_API_KEY;
    }

    const priceResponse = await fetch(
      `https://api.jup.ag/price/v3?ids=${mintAddress},${SOLANA_NATIVE_MINT}`,
      { headers: jupHeaders, next: { revalidate: 10 } }
    );
    
    if (!priceResponse.ok) throw new Error("Unable to fetch current exchange rates from the oracle.");
    const priceData = await priceResponse.json();

    const tokenUsdPrice = parseFloat(priceData?.data?.[mintAddress]?.price || priceData?.[mintAddress]?.usdPrice || "0");
    const solUsdPrice = parseFloat(priceData?.data?.[SOLANA_NATIVE_MINT]?.price || priceData?.[SOLANA_NATIVE_MINT]?.usdPrice || "0");

    if (!solUsdPrice || !tokenUsdPrice) {
      throw new Error("Token pair has insufficient valuation metrics to compute gasless parameters.");
    }

    // Rent is queried live (rather than a hardcoded lamport figure) so a Token-2022 mint
    // with extensions — which needs a bigger, costlier account than a standard SPL token —
    // is charged its actual rent instead of silently under-charging the relayer.
    // On top of the exact on-chain amount, a dedicated buffer is applied specifically to
    // this ATA-creation cost: it's an exact, concentrated SOL outlay the relayer fronts
    // per new address, so small misses here (decimal-rounding, a rent parameter tick)
    // compound over many first-time sends and quietly drain the relayer wallet.
    const ATA_RENT_BUFFER_MULTIPLIER = 1.10;
    let allocatedRentSol = 0;
    if (needsRecipientAta || needsVaultAta) {
      const rentExemptLamports = await conn.getMinimumBalanceForRentExemption(tokenAccountSize);
      const rentExemptSol = (rentExemptLamports / LAMPORTS_PER_SOL) * ATA_RENT_BUFFER_MULTIPLIER;
      if (needsRecipientAta) allocatedRentSol += rentExemptSol;
      if (needsVaultAta) allocatedRentSol += rentExemptSol;
    }

    // Priority fee is pulled from recent network activity (same percentile approach as
    // solana-provider.tsx's own estimateFee) instead of a fixed guess, so the fee charged
    // here actually matches what the relayer sets on the transaction below and what it
    // takes to land reliably under current conditions.
    const computeUnitLimit = 150_000;
    let priorityMicroLamports = 25_000;
    try {
      const recentFees = await conn.getRecentPrioritizationFees();
      const nonZeroFees = recentFees.map((f) => f.prioritizationFee).filter((f) => f > 0).sort((a, b) => a - b);
      if (nonZeroFees.length > 0) {
        const idx = Math.min(nonZeroFees.length - 1, Math.floor(nonZeroFees.length * 0.75));
        priorityMicroLamports = nonZeroFees[idx];
      }
    } catch (e) {
      console.warn("Failed to fetch live prioritization fees, using fallback rate", e);
    }

    // Solana's base fee is 5000 lamports per signature; this transaction always carries
    // exactly two — the sender (authorizing the transfer) and the relayer (fee payer).
    const BASE_FEE_LAMPORTS_PER_SIGNATURE = 5000;
    const REQUIRED_SIGNATURES = 2;
    const baseFeeSol = (BASE_FEE_LAMPORTS_PER_SIGNATURE * REQUIRED_SIGNATURES) / LAMPORTS_PER_SOL;
    const priorityFeeSol = Math.ceil((computeUnitLimit * priorityMicroLamports) / 1_000_000) / LAMPORTS_PER_SOL;
    const gasExecutionCostSol = baseFeeSol + priorityFeeSol;

    // Converted and broken down separately (rather than only as one combined total) so the
    // UI can show the user exactly what they're paying for: network/priority fee vs. the
    // one-time ATA rent, instead of a single opaque number.
    const operationalMarginMultiplier = 1.10;
    const solCostToTokenUi = (sol: number) => (sol * solUsdPrice / tokenUsdPrice) * operationalMarginMultiplier;

    const networkFeeUi = solCostToTokenUi(gasExecutionCostSol);
    const ataFeeUi = solCostToTokenUi(allocatedRentSol);
    const abstractFeeUi = networkFeeUi + ataFeeUi;

    const abstractFeeSmallestUnit = Math.floor(abstractFeeUi * Math.pow(10, decimals));
    const coreTransferSmallestUnit = Math.floor(amountUi * Math.pow(10, decimals));

    const pipelineInstructions = [];

    pipelineInstructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }));
    pipelineInstructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityMicroLamports }));

    if (isNativeSol) {
      if (abstractFeeSmallestUnit > 0) {
        pipelineInstructions.push(
          SystemProgram.transfer({
            fromPubkey: senderPubKey,
            toPubkey: vaultPubKey,
            lamports: abstractFeeSmallestUnit, 
          })
        );
      }
      pipelineInstructions.push(
        SystemProgram.transfer({
          fromPubkey: senderPubKey,
          toPubkey: recipientPubKey,
          lamports: coreTransferSmallestUnit, 
        })
      );
    } else {
      // --- SPL TOKEN TRANSFER INSTRUCTIONS ---
      if (needsVaultAta) {
        pipelineInstructions.push(
          createAssociatedTokenAccountInstruction(
            relayerKeypair.publicKey, 
            vaultAta,
            vaultPubKey,
            mintPubKey,
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      if (needsRecipientAta) {
        pipelineInstructions.push(
          createAssociatedTokenAccountInstruction(
            relayerKeypair.publicKey, 
            recipientAta,
            recipientPubKey,
            mintPubKey,
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      if (abstractFeeSmallestUnit > 0) {
        pipelineInstructions.push(
          createTransferCheckedInstruction(
            senderAta,
            mintPubKey,
            vaultAta,
            senderPubKey,
            abstractFeeSmallestUnit,
            decimals,
            [],
            tokenProgramId
          )
        );
      }

      pipelineInstructions.push(
        createTransferCheckedInstruction(
          senderAta,
          mintPubKey,
          recipientAta,
          senderPubKey,
          coreTransferSmallestUnit,
          decimals,
          [],
          tokenProgramId
        )
      );
    }

    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const v0Message = new TransactionMessage({
      payerKey: relayerKeypair.publicKey, // Relayer pays execution cost
      recentBlockhash: blockhash,
      instructions: pipelineInstructions,
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(v0Message);
    
    // REMOVED: versionedTx.sign([relayerKeypair]);
    // The transaction remains unsigned so Phantom can simulate and sign it cleanly first.

    return {
      success: true,
      transactionBase64: Buffer.from(versionedTx.serialize()).toString("base64"),
      calculatedFeeUi: abstractFeeUi,
      networkFeeUi,
      ataFeeUi,
      estimatedRentSol: allocatedRentSol
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Execution setup failure." };
  }
}


export async function broadcastGaslessSendTx(params: {
  signedTransactionBase64: string;
  rpcUrl: string;
}) {
  try {
    const { signedTransactionBase64, rpcUrl } = params;
    const connection = new Connection(rpcUrl, "confirmed");

    const decodedBuffer = Buffer.from(signedTransactionBase64, "base64");
    const processedTx = VersionedTransaction.deserialize(new Uint8Array(decodedBuffer));

    // ✅ Relayer signs SECOND (after Phantom has already signed)
    processedTx.sign([relayerKeypair]);

    const txSignature = await connection.sendRawTransaction(processedTx.serialize(), {
      skipPreflight: true, // You may want to set this to false to catch errors locally
      preflightCommitment: "confirmed",
    });

    return { success: true, signature: txSignature };
  } catch (err: any) {
    return { success: false, error: err.message || "Network confirmation rejected." };
  }
}