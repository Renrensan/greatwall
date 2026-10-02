'use server'

import { PARADAPP_FEE_VAULT_SOLANA, SOLANA_NATIVE_MINT } from "@/components/solana/config/constants";
import {
  PublicKey,
  Transaction,
  Connection,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  ACCOUNT_SIZE,
  getAccountLenForMint,
  unpackMint
} from "@solana/spl-token";
import bs58 from "bs58";
import { ADDITIONAL_SWAP_FEE_LAMPORTS, PARADAPP_JUPITER_FEE } from "./constant";

const RELAYER_KEY_STRING = process.env.PARADAPP_RELAYER_PRIVATE_KEY || "";
const relayerKeypair = Keypair.fromSecretKey(bs58.decode(RELAYER_KEY_STRING));

console.log("Relayer Public Key:", relayerKeypair.publicKey.toBase58());

import { AddressLookupTableAccount } from "@solana/web3.js";

/**
 * Every Jupiter call in this file goes through here. Two problems this fixes at once:
 *  - No call had a timeout, so a slow/unresponsive Jupiter endpoint left the caller awaiting
 *    forever — the exact bug that left the Solana Stake UI stuck on "Calculating Fee..."
 *    indefinitely (see SolanaStake.tsx's withTimeout for the same fix on the Kamino/RPC side).
 *  - No call retried a 429, so a burst of rapid requests (someone typing quickly in the swap
 *    input, each debounced request landing while Jupiter is already rate-limiting us) just
 *    kept hammering the same already-throttled endpoint instead of backing off.
 * A non-429 response (or a real error) is returned/thrown as-is on the first attempt — this
 * only slows down for the specific case of being rate-limited.
 */
async function fetchJupiterWithRetry(
  url: string,
  init: RequestInit = {},
  maxRetries = 3,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    if (res.status !== 429 || attempt >= maxRetries) return res;
    const backoffMs = 500 * Math.pow(2, attempt); // 500ms, 1s, 2s
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }
}

export async function getGaslessQuoteAndFee(
  inputMint: string,
  outputMint: string,
  amountUi: number,
  amountSmallest: number,
  needsInputAta: boolean,
  needsOutputAta: boolean,
  rpcUrl: string,
  swapMode: "ExactIn" | "ExactOut" = "ExactIn",
  inputDecimals: number = 9
) {
  try {
    const jupHeaders: Record<string, string> = {};
    if (process.env.JUPITER_API_KEY) {
      jupHeaders["x-api-key"] = process.env.JUPITER_API_KEY;
    }

    // Cached Price API
    const priceRes = await fetchJupiterWithRetry(
      `https://api.jup.ag/price/v3?ids=${inputMint},${outputMint},${SOLANA_NATIVE_MINT}`,
      {
        headers: jupHeaders,
        next: { revalidate: 15 }
      }
    );

    if (!priceRes.ok) throw new Error(`Price oracle unavailable (Status ${priceRes.status}).`);
    const priceData = await priceRes.json();

    const inputPrice = parseFloat(priceData?.data?.[inputMint]?.price || priceData?.[inputMint]?.usdPrice);
    const outputPrice = parseFloat(priceData?.data?.[outputMint]?.price || priceData?.[outputMint]?.usdPrice);
    const solPrice = parseFloat(priceData?.data?.[SOLANA_NATIVE_MINT]?.price || priceData?.[SOLANA_NATIVE_MINT]?.usdPrice);

    if (!solPrice) throw new Error("Critical: Solana network price feed is offline.");
    if (!inputPrice) throw new Error("This token lacks sufficient liquidity for gasless swaps.");
    if (!outputPrice && swapMode === "ExactOut") throw new Error("Target token lacks liquidity to calculate Exact Out.");

    const tradeValueUsd = swapMode === "ExactIn" ? (amountUi * inputPrice) : (amountUi * outputPrice);
    const platformFeeUsd = tradeValueUsd * PARADAPP_JUPITER_FEE;

    // Rent and network fee are both queried live (rather than the previous hardcoded
    // 0.00203928/0.0001 SOL guesses) and carry the same 10% buffer as prepareGaslessSendTx,
    // for the same reason: these are exact, concentrated SOL outlays the relayer fronts per
    // swap, so small misses here compound over many swaps and quietly drain the relayer wallet.
    const conn = new Connection(rpcUrl, "confirmed");

    const ATA_RENT_BUFFER_MULTIPLIER = 1.10;

    // Account size is looked up per-mint (rather than assuming the standard SPL size) so a
    // Token-2022 mint with extensions — which needs a bigger, costlier account — is charged
    // its actual rent instead of silently under-charging the relayer, same as send.ts.
    const estimateAtaRentForMint = async (mintAddress: string): Promise<number> => {
      let tokenAccountSize = ACCOUNT_SIZE;
      try {
        const mintPubkey = new PublicKey(mintAddress);
        const mintAccountInfo = await conn.getAccountInfo(mintPubkey);
        if (mintAccountInfo) {
          const mint = unpackMint(mintPubkey, mintAccountInfo, mintAccountInfo.owner);
          tokenAccountSize = getAccountLenForMint(mint);
        }
      } catch {
        tokenAccountSize = ACCOUNT_SIZE;
      }
      const rentExemptLamports = await conn.getMinimumBalanceForRentExemption(tokenAccountSize);
      return (rentExemptLamports / LAMPORTS_PER_SOL) * ATA_RENT_BUFFER_MULTIPLIER;
    };

    let allocatedRentSol = 0;
    if (needsInputAta) allocatedRentSol += await estimateAtaRentForMint(inputMint);
    if (needsOutputAta) allocatedRentSol += await estimateAtaRentForMint(outputMint);

    // Priority fee is pulled from recent network activity (same percentile approach as
    // prepareGaslessSendTx) instead of a fixed guess. computeUnitLimit is sized for a
    // typical multi-hop Jupiter route (heavier than a plain transfer's 150k) — this is only
    // an upfront estimate for the quote, since the executed swap uses Jupiter's own
    // dynamicComputeUnitLimit and priority-fee tier, not this exact figure.
    const computeUnitLimit = 400_000;
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
    // exactly two — the user (authorizing the swap) and the relayer (fee payer).
    const BASE_FEE_LAMPORTS_PER_SIGNATURE = 5000;
    const REQUIRED_SIGNATURES = 2;
    const baseFeeSol = (BASE_FEE_LAMPORTS_PER_SIGNATURE * REQUIRED_SIGNATURES) / LAMPORTS_PER_SOL;
    const priorityFeeSol = Math.ceil((computeUnitLimit * priorityMicroLamports) / 1_000_000) / LAMPORTS_PER_SOL;
    const gasExecutionCostSol = baseFeeSol + priorityFeeSol;

    // Broken down separately (rather than only as one combined total) so the UI can show
    // exactly what's being paid for: network/priority fee vs. ATA rent vs. platform fee,
    // instead of a single opaque number.
    const operationalMarginMultiplier = 1.10;
    const solCostToUsd = (sol: number) => sol * solPrice * operationalMarginMultiplier;

    const networkFeeUsd = solCostToUsd(gasExecutionCostSol);
    const ataFeeUsd = solCostToUsd(allocatedRentSol);
    const totalFeeUsd = platformFeeUsd + networkFeeUsd + ataFeeUsd;

    // Must be the INPUT mint's decimals specifically — amountSmallest/amountUi's ratio only
    // equals that in ExactIn mode. In ExactOut mode, callers size amountSmallest off the
    // OUTPUT mint (that's what Jupiter's own "amount" param needs for ExactOut), so deriving
    // the fee's raw-unit scale from that ratio silently used the wrong mint's decimals
    // whenever input/output decimals differ (e.g. SOL's 9 vs USDC's 6) — inflating/deflating
    // appliedFee by 10^|decimals diff| and, worse, feeding a wrong `decimals` value into
    // getAtomicGaslessSwapTx's createTransferCheckedInstruction, which validates decimals
    // against the mint on-chain and would reject the transaction outright.
    const totalFeeInInputUi = totalFeeUsd / inputPrice;
    const multiplier = Math.pow(10, inputDecimals);
    const feeInSmallestUnit = Math.ceil(totalFeeInInputUi * multiplier);

    let finalJupiterAmount = amountSmallest;
    if (swapMode === "ExactIn") {
      finalJupiterAmount = amountSmallest - feeInSmallestUnit;
      if (finalJupiterAmount <= 0) throw new Error("Input amount is too small to cover the gasless network fees.");
    }

    //  STANDARD JUPITER: No more maxAccounts limits! Let it use ALTs.
    const quoteRes = await fetchJupiterWithRetry(
      `https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${finalJupiterAmount}&swapMode=${swapMode}&slippageBps=50&restrictIntermediateTokens=true&maxAccounts=36`,
      { headers: jupHeaders }
    );

    if (!quoteRes.ok) throw new Error(`Quote failed. Route too complex or liquidity too low.`);

    const quote = await quoteRes.json();
    if (quote.error) throw new Error(`Jupiter Quote Error: ${quote.error}`);

    return {
      success: true,
      quote,
      appliedFee: feeInSmallestUnit,
      decimals: inputDecimals,
      networkFeeUi: networkFeeUsd / inputPrice,
      ataFeeUi: ataFeeUsd / inputPrice,
      platformFeeUi: platformFeeUsd / inputPrice,
      estimatedRentSol: allocatedRentSol,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to calculate fees" };
  }
}

export async function getAtomicGaslessSwapTx(
  userAddress: string,
  quoteResponse: any,
  appliedFee: number,
  needsInputAta: boolean,
  inputMint: string,
  inputDecimals: number,
  inputTokenProgram: string,
  rpcUrl: string, 
  isUltraFast: boolean = true,
  excludeFee: boolean = false 
) {
  try {
    const userPubKey = new PublicKey(userAddress);
    const inputMintPubKey = new PublicKey(inputMint);
    const vaultPubKey = new PublicKey(PARADAPP_FEE_VAULT_SOLANA);
    const tokenProgramId = new PublicKey(inputTokenProgram);
    const isNativeSol = inputMint === SOLANA_NATIVE_MINT || inputMint === "So11111111111111111111111111111111111111112";

    const priorityParams = isUltraFast 
      ? { priorityLevelWithMaxLamports: { maxLamports: ADDITIONAL_SWAP_FEE_LAMPORTS, priorityLevel: "veryHigh" } } 
      : { priorityLevelWithMaxLamports: { maxLamports: ADDITIONAL_SWAP_FEE_LAMPORTS/10, priorityLevel: "high" } };     

    const swapRes = await fetchJupiterWithRetry("https://api.jup.ag/swap/v1/swap", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-api-key": process.env.JUPITER_API_KEY || "" 
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: userAddress,
        wrapAndUnwrapSol: true,
        asLegacyTransaction: false, 
        dynamicComputeUnitLimit: true, 
        prioritizationFeeLamports: priorityParams,
        feePayer: relayerKeypair.publicKey.toBase58(), // Relayer is still set as the fee payer here, which is correct!
      }),
    });

    const swapData = await swapRes.json();
    if (!swapData || !swapData.swapTransaction) throw new Error(swapData?.error || "Jupiter failed to find a valid swap route.");

    const txBytes = Buffer.from(swapData.swapTransaction, "base64");
    const v0Tx = VersionedTransaction.deserialize(new Uint8Array(txBytes));

    const conn = new Connection(rpcUrl, "confirmed");
    const lookupTableAccounts = await Promise.all(
      v0Tx.message.addressTableLookups.map(async (lookup) => {
        const res = await conn.getAddressLookupTable(lookup.accountKey);
        return res.value;
      })
    );
    const validLookupTables = lookupTableAccounts.filter(Boolean) as AddressLookupTableAccount[];

    const decompiledMessage = TransactionMessage.decompile(v0Tx.message, { addressLookupTableAccounts: validLookupTables });

    const aTokenProgramId = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    const wSolMint = new PublicKey("So11111111111111111111111111111111111111112");
    let wSolRentFunded = false;
    
    decompiledMessage.instructions.forEach((ix) => {
      if (ix.programId.equals(aTokenProgramId)) {
        if (ix.keys[0].pubkey.equals(userPubKey)) {
          ix.keys[0].pubkey = relayerKeypair.publicKey;
          ix.keys[0].isSigner = true;
          if (ix.keys.length > 3 && ix.keys[3].pubkey.equals(wSolMint)) wSolRentFunded = true;
        }
      }
      if (ix.programId.equals(SystemProgram.programId)) {
         if (ix.keys[0].pubkey.equals(userPubKey) && !isNativeSol) {
            ix.keys[0].pubkey = relayerKeypair.publicKey;
            ix.keys[0].isSigner = true;
            if (ix.data.length > 0 && ix.data[0] === 0) wSolRentFunded = true; 
         }
      }
    });

    const customInstructions = [];

    if (needsInputAta && !isNativeSol) {
      const ataAddress = getAssociatedTokenAddressSync(inputMintPubKey, vaultPubKey, true, tokenProgramId);
      customInstructions.push(new TransactionInstruction({
        programId: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        keys: [
          { pubkey: relayerKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: ataAddress, isSigner: false, isWritable: true },
          { pubkey: vaultPubKey, isSigner: false, isWritable: false },
          { pubkey: inputMintPubKey, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: tokenProgramId, isSigner: false, isWritable: false },
        ],
        data: Buffer.alloc(0)
      }));
    }

    if (appliedFee > 0 && !excludeFee) {
      if (isNativeSol) {
        customInstructions.push(SystemProgram.transfer({
          fromPubkey: userPubKey, 
          toPubkey: vaultPubKey, 
          lamports: appliedFee
        }));
      } else {
        customInstructions.push(createTransferCheckedInstruction(
          getAssociatedTokenAddressSync(inputMintPubKey, userPubKey, false, tokenProgramId),
          inputMintPubKey,
          getAssociatedTokenAddressSync(inputMintPubKey, vaultPubKey, true, tokenProgramId),
          userPubKey, appliedFee, inputDecimals, [], tokenProgramId
        ));
      }
    }

    decompiledMessage.instructions.unshift(...customInstructions);

    if (wSolRentFunded) {
      decompiledMessage.instructions.push(SystemProgram.transfer({
        fromPubkey: userPubKey,
        toPubkey: relayerKeypair.publicKey,
        lamports: 2039280
      }));
    }

    const newV0Message = new TransactionMessage({
      payerKey: relayerKeypair.publicKey,
      recentBlockhash: decompiledMessage.recentBlockhash,
      instructions: decompiledMessage.instructions,
    }).compileToV0Message(validLookupTables);

    const finalTx = new VersionedTransaction(newV0Message);
    
    // ❌ REMOVED: finalTx.sign([relayerKeypair]);
    // Leave the transaction unsigned so Phantom can simulate cleanly!

    return { 
      success: true, 
      transactionBase64: Buffer.from(finalTx.serialize()).toString("base64") 
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function broadcastSwapTx(
  userSignedTxBase64: string,
  rpcUrl: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const txBytes = Buffer.from(userSignedTxBase64, "base64");
    const versionedTx = VersionedTransaction.deserialize(new Uint8Array(txBytes));

    versionedTx.sign([relayerKeypair]);

    const conn = new Connection(rpcUrl, "confirmed");
    const signature = await conn.sendRawTransaction(versionedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log("Gasless swap broadcast success:", signature);
    return { success: true, signature };
  } catch (err: any) {
    console.error("broadcastSwapTx error:", err);
    return { success: false, error: err.message };
  }
}

export async function searchJupiterToken(query: string) {
  try {
    const headers = { "x-api-key": process.env.JUPITER_API_KEY || "" };
    const res = await fetchJupiterWithRetry(`https://api.jup.ag/tokens/v2/search?query=${query}`, { headers });
    
    if (res.ok) {
      const tokens = await res.json();
      if (tokens && tokens.length > 0) {
        const tokenData = tokens[0];
        if (!(query.length >= 32 && tokenData.id !== query)) {
          return { 
            success: true, 
            mint: tokenData.id,       
            symbol: tokenData.symbol, 
            name: tokenData.name,
            decimals: tokenData.decimals,
            icon: tokenData.icon      
          };
        }
      }
    }
    return { success: false };
  } catch (err: any) {
    console.error("Token Search Error:", err);
    return { success: false }; 
  }
}

export async function getJupiterVerifiedTokens() {
  try {
    const res = await fetchJupiterWithRetry("https://api.jup.ag/tokens/v2/tag?query=verified", {
      headers: { "x-api-key": process.env.JUPITER_API_KEY || "" },
      next: { revalidate: 86400 } 
    });
    
    if (!res.ok) throw new Error("Failed to fetch verified tokens");
    
    const tokens = await res.json();
    return { success: true, tokens };
  } catch (err: any) {
    console.error("Jupiter Verified Tokens Error:", err);
    return { success: false, tokens: [] };
  }
}

export async function getJupiterPrices(mintAddresses: string[]) {
  if (!mintAddresses || mintAddresses.length === 0) return { success: false, prices: {} };

  try {
    const ids = mintAddresses.join(',');
    const res = await fetchJupiterWithRetry(`https://api.jup.ag/price/v3?ids=${ids}`, {
      headers: { "x-api-key": process.env.JUPITER_API_KEY || "" },
      next: { revalidate: 10 } 
    });

    if (!res.ok) throw new Error("Failed to fetch prices");

    const priceData = await res.json();
    return { success: true, prices: priceData };
  } catch (err: any) {
    console.error("Jupiter Price API Error:", err);
    return { success: false, prices: {} };
  }
}