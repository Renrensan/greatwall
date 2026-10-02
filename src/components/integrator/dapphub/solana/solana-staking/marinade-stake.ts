"use server";

import {
  Connection,
  Keypair,
  PublicKey,
  StakeProgram,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAuthNativeStakeSOLIx,
  getPrepareNativeUnstakeSOLIx,
  Marinade,
  MarinadeConfig,
} from "@marinade.finance/marinade-ts-sdk";
import BN from "bn.js";
import { createSolanaRpc, address, createNoopSigner } from "@solana/kit";
import { KaminoVault, DEFAULT_RECENT_SLOT_DURATION_MS, getCurrentLedgerInstant } from "@kamino-finance/klend-sdk";
import { Decimal } from "decimal.js";
import bs58 from "bs58";
import { Farms } from "@kamino-finance/farms-sdk";
import {
  getAssociatedTokenAddressSync,
  createTransferInstruction,
  ACCOUNT_SIZE,
  getAccountLenForMint,
  unpackMint,
} from "@solana/spl-token";

import {
  PARADAPP_FEE_VAULT_SOLANA,
  SOLANA_NATIVE_MINT,
  STAKE_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  USDC_MINT,
} from "@/components/solana/config/constants";
import {
  MARINADE_USDC_VAULT,
  PARADAPP_MARINANDE_FEE,
  MARINADE_ALT_ADDRESS,
  ESTIMATED_NETWORK_FEE_LAMPORTS,
  MIN_USDC_AMOUNT,
  MIN_CLAIM_REWARD_USDC,
} from "./constant";
import { sharesToUsdc, usdcToShares } from "./helper";


const MIN_SOL_LAMPORTS = Math.ceil(
  ESTIMATED_NETWORK_FEE_LAMPORTS / PARADAPP_MARINANDE_FEE
); 

 function getRelayerKeypair(): Keypair {
  const raw = process.env.PARADAPP_RELAYER_PRIVATE_KEY;
  if (!raw) throw new Error("PARADAPP_RELAYER_PRIVATE_KEY is not set on the server.");
  return Keypair.fromSecretKey(bs58.decode(raw));
}

// --- Gasless fee breakdown helpers ---
// Mirrors prepareGaslessSendTx's methodology (selfcustody/send.ts): the existing
// PARADAPP_MARINANDE_FEE percentage is kept as-is (platform revenue), and the relayer's
// actual on-chain costs — network/priority fee and, for USDC vault ops, ATA rent — are
// itemized and charged on top rather than assumed to be covered by the percentage. Each
// cost component carries a 10% buffer for the same reason send.ts does: these are exact,
// concentrated SOL outlays the relayer fronts per transaction, so small misses here
// (a percentile tick, a rent parameter change) compound over many stakes/swaps and
// quietly drain the relayer wallet.
const OPERATIONAL_MARGIN_MULTIPLIER = 1.10;
const ATA_RENT_BUFFER_MULTIPLIER = 1.10;
const BASE_FEE_LAMPORTS_PER_SIGNATURE = 5000;

/** Live per-compute-unit priority fee rate (microLamports), sampled from recent network
 * activity (same 75th-percentile approach as send.ts). Shared by estimateNetworkFeeLamports
 * (below) and, for the USDC/Kamino vault flows, the explicit ComputeBudget instructions set
 * directly on the transactions — fetched once per operation and reused for both, so what we
 * charge and what we actually submit always agree instead of drifting apart across two
 * independent samples taken moments apart. */
async function getPriorityFeeMicroLamports(conn: Connection): Promise<number> {
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
  return priorityMicroLamports;
}

/** Buffered network/priority fee estimate, in lamports, ready to add directly to a
 * SOL-denominated platform fee. Pass `priorityMicroLamportsOverride` when the caller has
 * already sampled the rate itself (e.g. to also use it for ComputeBudget instructions) —
 * otherwise this samples its own. */
async function estimateNetworkFeeLamports(
  conn: Connection,
  computeUnitLimit: number,
  requiredSignatures: number,
  priorityMicroLamportsOverride?: number
): Promise<number> {
  const priorityMicroLamports = priorityMicroLamportsOverride ?? (await getPriorityFeeMicroLamports(conn));

  const baseFeeLamports = BASE_FEE_LAMPORTS_PER_SIGNATURE * requiredSignatures;
  const priorityFeeLamports = Math.ceil((computeUnitLimit * priorityMicroLamports) / 1_000_000);
  return Math.ceil((baseFeeLamports + priorityFeeLamports) * OPERATIONAL_MARGIN_MULTIPLIER);
}

/** Buffered ATA-rent estimate, in SOL, for a set of not-yet-existing accounts. Takes each
 * account's actual byte size (rather than assuming the standard SPL size for all of them)
 * so a Token-2022 mint with extensions — e.g. a Kamino vault's shares mint, which needs a
 * bigger, costlier account — is charged its real rent instead of silently under-charging
 * the relayer, same reasoning as send.ts's tokenAccountSize handling. Rent itself is
 * queried live rather than hardcoded so it stays accurate if Solana's rent parameters change. */
async function estimateAtaRentSol(conn: Connection, missingAtaAccountSizes: number[]): Promise<number> {
  let total = 0;
  for (const size of missingAtaAccountSizes) {
    const rentExemptLamports = await conn.getMinimumBalanceForRentExemption(size);
    total += (rentExemptLamports / LAMPORTS_PER_SOL) * ATA_RENT_BUFFER_MULTIPLIER;
  }
  return total;
}

/** Resolves the real account size for `mint` (accounting for Token-2022 extensions),
 * falling back to the standard SPL size if the mint can't be unpacked for any reason. */
async function resolveTokenAccountSize(conn: Connection, mint: PublicKey, mintInfo: { owner: PublicKey; data: Buffer } | null): Promise<number> {
  if (!mintInfo) return ACCOUNT_SIZE;
  try {
    const unpacked = unpackMint(mint, mintInfo as any, mintInfo.owner);
    return getAccountLenForMint(unpacked);
  } catch {
    return ACCOUNT_SIZE;
  }
}

/** Live SOL/USD price, used to convert SOL-denominated network/rent costs into USDC
 * terms for the Kamino vault operations, which charge their fee in USDC. */
async function fetchSolUsdPrice(): Promise<number> {
  const res = await fetch(
    `https://api.jup.ag/price/v3?ids=${SOLANA_NATIVE_MINT}`,
    { next: { revalidate: 15 } }
  );
  if (!res.ok) throw new Error("Unable to fetch SOL price for fee calculation.");
  const data = await res.json();
  const price = parseFloat(data?.data?.[SOLANA_NATIVE_MINT]?.price || data?.[SOLANA_NATIVE_MINT]?.usdPrice || "0");
  if (!price) throw new Error("SOL price feed returned an invalid value.");
  return price;
}

function assertSolMinFee(lamports: number): void {
  const fee = Math.floor(lamports * PARADAPP_MARINANDE_FEE);
  if (fee < ESTIMATED_NETWORK_FEE_LAMPORTS) {
    throw new Error(
      `Amount too small for gasless. ` +
        `Minimum: ${(MIN_SOL_LAMPORTS / 1e9).toFixed(4)} SOL `
    );
  }
}

function assertUsdcMinFee(amountUsdc: number): void {
  if (amountUsdc < MIN_USDC_AMOUNT) {
    throw new Error(
      `Amount too small for gasless. Minimum: $${MIN_USDC_AMOUNT} USDC`
    );
  }
}


const ATOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

function kitIxToLegacy(ix: any, relayerPubkey: PublicKey, userPubkey: PublicKey): TransactionInstruction {
  const progId = ix.programAddress.toString();

  return new TransactionInstruction({
    programId: new PublicKey(progId),
    keys: (ix.accounts || []).map((k: any, index: number) => {
      let pubkeyStr = k.address.toString();
      let isSigner = k.role === 2 || k.role === 3;
      let isWritable = k.role === 1 || k.role === 3;

      if (progId === ATOKEN_PROGRAM_ID && index === 0 && pubkeyStr === userPubkey.toBase58()) {
        pubkeyStr = relayerPubkey.toBase58();
        isSigner = true;
      }

      return {
        pubkey: new PublicKey(pubkeyStr),
        isSigner,
        isWritable,
      };
    }),
    data: Buffer.from(ix.data),
  });
}


async function loadMarinadeAlt(
  conn: Connection
): Promise<AddressLookupTableAccount | null> {
  if (!MARINADE_ALT_ADDRESS) return null;
  try {
    const res = await conn.getAddressLookupTable(
      new PublicKey(MARINADE_ALT_ADDRESS)
    );
    return res.value ?? null;
  } catch {
    return null;
  }
}

const DEFAULT_ADDRESS_SENTINEL = "11111111111111111111111111111111";

/** A Kamino Earn Vault can ship its own Address Lookup Table (VaultState.vaultLookupTable,
 * unset when it equals the all-ones system-program placeholder) covering the vault's own
 * accounts plus every reserve it allocates into. klend-sdk 11+ requires deposit/withdraw to be
 * built with a preloaded reserves map and appends each reserve's accounts (state, oracle,
 * collateral mint, ...) as "remaining accounts" on the CPI — for a vault spread across several
 * reserves that meaningfully grows the account list and thus the transaction. Marinade's own
 * ALT (loadMarinadeAlt) doesn't help here — none of its entries are Kamino accounts — so the
 * vault's own table is loaded instead specifically for the USDC/Kamino deposit and withdraw
 * paths, keeping the transaction small enough for Phantom's simulator to confidently vouch for
 * instead of falling back to its "this dApp could be malicious" warning. */
async function loadVaultAlt(
  conn: Connection,
  vaultState: { vaultLookupTable: { toString(): string } }
): Promise<AddressLookupTableAccount | null> {
  const lutAddress = vaultState.vaultLookupTable?.toString();
  if (!lutAddress || lutAddress === DEFAULT_ADDRESS_SENTINEL) return null;
  try {
    const res = await conn.getAddressLookupTable(new PublicKey(lutAddress));
    return res.value ?? null;
  } catch {
    return null;
  }
}


async function buildGaslessTx(
  conn: Connection,
  instructions: TransactionInstruction[],
  serverSigners: Keypair[],
  altAccounts: AddressLookupTableAccount[] = []
): Promise<string> {
  const relayer = serverSigners[0];
  const { blockhash } = await conn.getLatestBlockhash("confirmed");

  const msg = new TransactionMessage({
    payerKey: relayer.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(altAccounts);

  const vtx = new VersionedTransaction(msg);
  // Left unsigned here on purpose (mirrors jupiter-swap.ts's getAtomicGaslessSwapTx) — a
  // transaction arriving at Phantom already signed by any account (the relayer, or e.g. a
  // freshly-generated stake account keypair for SystemProgram.createAccount — see
  // getMarinadeNativeDepositTx) is exactly what its "this dApp could be malicious" heuristic
  // is designed to catch, since it can't fully vet a signature it didn't just witness.
  // Every server-side signer — relayer included — signs afterward, once the user's own
  // signature is already on it. Extra signers beyond the relayer (like a stake keypair) have
  // no way to stay reachable at that later point on their own, since they're generated and
  // would normally fall out of scope right after this function returns — see
  // broadcastGaslessTx's extraSignerSecrets param for how their secret is threaded through.
  return Buffer.from(vtx.serialize()).toString("base64");
}

/** Adds the relayer's signature (withheld from buildGaslessTx above, see its comment) plus
 * any extra one-time signers (e.g. a freshly-generated stake account keypair, passed back as
 * base58-encoded secret keys since they fall out of scope once built), and broadcasts —
 * mirroring jupiter-swap.ts's broadcastSwapTx. Called only after Phantom has already signed,
 * so the relayer (and any extra signer) is never the first signature the wallet sees. Safe to
 * pass an extra signer's raw secret through the client like this specifically because it's a
 * single-use keypair whose only role is authorizing its own account's creation — the
 * instruction that consumes it hands all lasting stake/withdraw authority to Marinade's bot
 * and the user in that same step, so the key itself never holds any ongoing control. */
export async function broadcastGaslessTx(
  userSignedTxBase64: string | string[],
  rpcUrl: string,
  extraSignerSecrets?: string[]
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const relayer = getRelayerKeypair();
    const conn = new Connection(rpcUrl, "confirmed");
    const base64Array = Array.isArray(userSignedTxBase64) ? userSignedTxBase64 : [userSignedTxBase64];
    const extraSigners = (extraSignerSecrets || []).map((s) =>
      Keypair.fromSecretKey(bs58.decode(s))
    );

    let signature = "";
    for (const b64 of base64Array) {
      const vtx = VersionedTransaction.deserialize(Buffer.from(b64, "base64"));
      vtx.sign([relayer, ...extraSigners]);
      signature = await conn.sendRawTransaction(vtx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
    }

    return { success: true, signature };
  } catch (err: any) {
    console.error("broadcastGaslessTx error:", err);
    return { success: false, error: err.message };
  }
}


export async function fetchMarinadeSOLData(
  rpcUrl: string,
  userAddress?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const conn = new Connection(rpcUrl, "confirmed");
    const config = new MarinadeConfig({ connection: conn });
    const marinade = new Marinade(config);
    const state = await marinade.getMarinadeState();

    const mSolPrice = state.mSolPrice;
    const totalStaked = Number(
      (state.state.validatorSystem.totalActiveBalance.toNumber() / 1e9).toFixed(9)
    );

    let apys = { liquid: "0.00", native: "0.00" };
    let chartData = {
      liquid: { times: [] as number[], values: [] as number[] },
      native: { times: [] as number[], values: [] as number[] },
    };
    let mSolBalance = 0;
    let nativeStakeBalance = 0;
    let rawNativeLamports = 0;
    let pendingRewards = 0;
    let nativeAccounts: any[] = [];

    try {
      const toTime = Math.floor(Date.now() / 1000);
      const fromTime = toTime - 30 * 24 * 60 * 60;
      const window = 1209600;
      const [liqRes, natRes] = await Promise.all([
        fetch(
          `https://apy.marinade.finance/v1/rolling-apy/liquid-pool-token/MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD?window=${window}&from=${fromTime}&to=${toTime}`,
          { next: { revalidate: 3600 } }
        ),
        fetch(
          `https://apy.marinade.finance/v1/rolling-apy/marinade-native?window=${window}&from=${fromTime}&to=${toTime}`,
          { next: { revalidate: 3600 } }
        ),
      ]);
      if (liqRes.ok) {
        const d = await liqRes.json();
        if (d.values?.length) {
          apys.liquid = (d.values[d.values.length - 1] * 100).toFixed(2);
          chartData.liquid = {
            times: d.times,
            values: d.values.map((v: number) => Number((v * 100).toFixed(2))),
          };
        }
      }
      if (natRes.ok) {
        const d = await natRes.json();
        if (d.values?.length) {
          apys.native = (d.values[d.values.length - 1] * 100).toFixed(2);
          chartData.native = {
            times: d.times,
            values: d.values.map((v: number) => Number((v * 100).toFixed(2))),
          };
        }
      }
    } catch (e) {
      console.warn("Marinade Rolling APY fetch failed", e);
    }

    if (userAddress) {
      try {
        const r = await fetch(
          `https://native-staking.marinade.finance/v1/user-rewards?user=${userAddress}`
        );
        if (r.ok) {
          const d = await r.json();
          if (d.data_points) {
            pendingRewards = Number(
              (
                d.data_points.reduce(
                  (acc: number, curr: any) => acc + Number(curr.inflation_rewards),
                  0
                ) / 1e9
              ).toFixed(9)
            );
          }
        }
      } catch (e) {
        console.warn("Failed to fetch Native Rewards", e);
      }

      const userPubKey = new PublicKey(userAddress);
      const tokenAccounts = await conn.getParsedTokenAccountsByOwner(userPubKey, {
        mint: state.mSolMintAddress,
      });
      const rawMsol =
        tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount || 0;
      mSolBalance = Number(rawMsol.toFixed(9));

      const stakeProgramId = new PublicKey(STAKE_PROGRAM_ID);
      const accounts = await conn.getParsedProgramAccounts(stakeProgramId, {
        filters: [{ dataSize: 200 }, { memcmp: { offset: 44, bytes: userAddress } }],
      });
      nativeAccounts = accounts.map((res: any) => {
        const info = res.account.data.parsed.info;
        const delegation = info.stake?.delegation;
        const lamports = res.account.lamports;
        let status: any = "deactivated";
        if (delegation) {
          status =
            delegation.deactivationEpoch === "18446744073709551615"
              ? "active"
              : "deactivating";
        }
        rawNativeLamports += lamports;
        return { pubkey: res.pubkey.toBase58(), lamports, status };
      });
      nativeStakeBalance = Number((rawNativeLamports / 1e9).toFixed(9));
    }

    return {
      success: true,
      data: {
        mSolPrice,
        totalStaked,
        apys,
        chartData,
        mSolBalance,
        mSolValueInSol: Number((mSolBalance * mSolPrice).toFixed(9)),
        nativeStakeBalance,
        pendingRewards,
        nativeAccounts,
        minSolForGasless: MIN_SOL_LAMPORTS / 1e9,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function getMarinadeDepositTx(
  userAddress: string,
  lamports: number,
  rpcUrl: string
): Promise<{
  success: boolean;
  transactionBase64?: string;
  error?: string;
  calculatedFeeUi?: number;
  networkFeeUi?: number;
  ataFeeUi?: number;
  platformFeeUi?: number;
}> {
  try {
    assertSolMinFee(lamports);

    const relayer = getRelayerKeypair();
    const conn = new Connection(rpcUrl, "confirmed");
    const userPublicKey = new PublicKey(userAddress);

    const marinade = new Marinade(
      new MarinadeConfig({ connection: conn, publicKey: userPublicKey })
    );
    const { transaction } = await marinade.deposit(new BN(lamports));

    const ixs: TransactionInstruction[] = [...transaction.instructions];

    const platformFeeLamports = Math.floor(lamports * PARADAPP_MARINANDE_FEE);
    const networkFeeLamports = await estimateNetworkFeeLamports(conn, 300_000, 2);
    const feeInLamports = platformFeeLamports + networkFeeLamports;
    if (feeInLamports > 0) {
      ixs.unshift(
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: new PublicKey(PARADAPP_FEE_VAULT_SOLANA),
          lamports: feeInLamports,
        })
      );
    }

    const txBase64 = await buildGaslessTx(conn, ixs, [relayer]);
    return {
      success: true,
      transactionBase64: txBase64,
      calculatedFeeUi: feeInLamports / LAMPORTS_PER_SOL,
      networkFeeUi: networkFeeLamports / LAMPORTS_PER_SOL,
      platformFeeUi: platformFeeLamports / LAMPORTS_PER_SOL,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMarinadeLiquidUnstakeTx(
  userAddress: string,
  mSolLamports: number,
  rpcUrl: string
): Promise<{
  success: boolean;
  transactionBase64?: string;
  error?: string;
  calculatedFeeUi?: number;
  networkFeeUi?: number;
  ataFeeUi?: number;
  platformFeeUi?: number;
}> {
  try {
    const relayer = getRelayerKeypair();
    const conn = new Connection(rpcUrl, "confirmed");
    const userPublicKey = new PublicKey(userAddress);

    const marinade = new Marinade(
      new MarinadeConfig({ connection: conn, publicKey: userPublicKey })
    );

    const state = await marinade.getMarinadeState();
    const mSolPrice = state.mSolPrice;
    const solEquivalent = Math.floor(mSolLamports * mSolPrice);

    assertSolMinFee(solEquivalent);

    const { transaction } = await marinade.liquidUnstake(new BN(mSolLamports));
    const ixs: TransactionInstruction[] = [...transaction.instructions];

    const platformFeeLamports = Math.floor(solEquivalent * PARADAPP_MARINANDE_FEE);
    const networkFeeLamports = await estimateNetworkFeeLamports(conn, 300_000, 2);
    const feeInLamports = platformFeeLamports + networkFeeLamports;
    if (feeInLamports > 0) {
      ixs.push(
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: new PublicKey(PARADAPP_FEE_VAULT_SOLANA),
          lamports: feeInLamports,
        })
      );
    }

    const txBase64 = await buildGaslessTx(conn, ixs, [relayer]);
    return {
      success: true,
      transactionBase64: txBase64,
      calculatedFeeUi: feeInLamports / LAMPORTS_PER_SOL,
      networkFeeUi: networkFeeLamports / LAMPORTS_PER_SOL,
      platformFeeUi: platformFeeLamports / LAMPORTS_PER_SOL,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function getMarinadeNativeDepositTx(
  userAddress: string,
  lamports: number,
  rpcUrl: string
): Promise<{
  success: boolean;
  transactionBase64?: string;
  stakeAccountPubkey?: string;
  extraSignerSecrets?: string[];
  error?: string;
  calculatedFeeUi?: number;
  networkFeeUi?: number;
  ataFeeUi?: number;
  platformFeeUi?: number;
}> {
  try {
    assertSolMinFee(lamports);

    const relayer = getRelayerKeypair();
    const conn = new Connection(rpcUrl, "confirmed");
    const userPublicKey = new PublicKey(userAddress);

    const { createAuthorizedStake, stakeKeypair } = getAuthNativeStakeSOLIx(
      userPublicKey,
      new BN(lamports)
    );

    const ixs: TransactionInstruction[] = createAuthorizedStake.map(
      (ix: any) =>
        new TransactionInstruction({
          programId: ix.programId,
          keys: ix.keys,
          data: ix.data,
        })
    );

    const platformFeeLamports = Math.floor(lamports * PARADAPP_MARINANDE_FEE);
    // Signed by user + relayer + the fresh stake account keypair (see buildGaslessTx call below).
    const networkFeeLamports = await estimateNetworkFeeLamports(conn, 300_000, 3);
    const feeInLamports = platformFeeLamports + networkFeeLamports;
    if (feeInLamports > 0) {
      ixs.unshift(
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: new PublicKey(PARADAPP_FEE_VAULT_SOLANA),
          lamports: feeInLamports,
        })
      );
    }

    const txBase64 = await buildGaslessTx(conn, ixs, [relayer]);
    return {
      success: true,
      transactionBase64: txBase64,
      stakeAccountPubkey: stakeKeypair.publicKey.toBase58(),
      // stakeKeypair itself has no lasting authority over the account it's creating — see
      // broadcastGaslessTx's comment — so it's safe to hand its secret back here to be
      // re-supplied once the user has signed, rather than signing with it now (which would
      // make this transaction arrive at Phantom already carrying a signature it hasn't
      // witnessed yet, same concern buildGaslessTx already avoids for the relayer).
      extraSignerSecrets: [bs58.encode(stakeKeypair.secretKey)],
      calculatedFeeUi: feeInLamports / LAMPORTS_PER_SOL,
      networkFeeUi: networkFeeLamports / LAMPORTS_PER_SOL,
      platformFeeUi: platformFeeLamports / LAMPORTS_PER_SOL,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMarinadeNativeUnstakeTx(
  userAddress: string,
  lamports: number,
  rpcUrl: string
): Promise<{
  success: boolean;
  transactionBase64?: string;
  error?: string;
  calculatedFeeUi?: number;
  networkFeeUi?: number;
  ataFeeUi?: number;
  platformFeeUi?: number;
}> {
  try {
    assertSolMinFee(lamports);

    const relayer = getRelayerKeypair();
    const conn = new Connection(rpcUrl, "confirmed");
    const userPublicKey = new PublicKey(userAddress);

    const { payFees } = await getPrepareNativeUnstakeSOLIx(
      userPublicKey,
      new BN(lamports)
    );

    const ixs: TransactionInstruction[] = payFees.map(
      (ix: any) =>
        new TransactionInstruction({
          programId: ix.programId,
          keys: ix.keys,
          data: ix.data,
        })
    );

    const platformFeeLamports = Math.floor(lamports * PARADAPP_MARINANDE_FEE);
    const networkFeeLamports = await estimateNetworkFeeLamports(conn, 300_000, 2);
    const feeInLamports = platformFeeLamports + networkFeeLamports;
    if (feeInLamports > 0) {
      ixs.unshift(
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: new PublicKey(PARADAPP_FEE_VAULT_SOLANA),
          lamports: feeInLamports,
        })
      );
    }

    const txBase64 = await buildGaslessTx(conn, ixs, [relayer]);
    return {
      success: true,
      transactionBase64: txBase64,
      calculatedFeeUi: feeInLamports / LAMPORTS_PER_SOL,
      networkFeeUi: networkFeeLamports / LAMPORTS_PER_SOL,
      platformFeeUi: platformFeeLamports / LAMPORTS_PER_SOL,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getNativeWithdrawTx(
  userAddress: string,
  stakeAccountAddress: string,
  lamports: number,
  rpcUrl: string
): Promise<{
  success: boolean;
  transactionBase64?: string;
  error?: string;
  calculatedFeeUi?: number;
  networkFeeUi?: number;
  ataFeeUi?: number;
  platformFeeUi?: number;
}> {
  try {
    assertSolMinFee(lamports);

    const relayer = getRelayerKeypair();
    const conn = new Connection(rpcUrl, "confirmed");
    const userPublicKey = new PublicKey(userAddress);
    const stakePublicKey = new PublicKey(stakeAccountAddress);

    const withdrawTx = StakeProgram.withdraw({
      stakePubkey: stakePublicKey,
      authorizedPubkey: userPublicKey,
      toPubkey: userPublicKey,
      lamports,
    });

    const ixs: TransactionInstruction[] = [...withdrawTx.instructions];
    const platformFeeLamports = Math.floor(lamports * PARADAPP_MARINANDE_FEE);
    const networkFeeLamports = await estimateNetworkFeeLamports(conn, 300_000, 2);
    const feeInLamports = platformFeeLamports + networkFeeLamports;
    if (feeInLamports > 0) {
      ixs.push(
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: new PublicKey(PARADAPP_FEE_VAULT_SOLANA),
          lamports: feeInLamports,
        })
      );
    }

    const txBase64 = await buildGaslessTx(conn, ixs, [relayer]);
    return {
      success: true,
      transactionBase64: txBase64,
      calculatedFeeUi: feeInLamports / LAMPORTS_PER_SOL,
      networkFeeUi: networkFeeLamports / LAMPORTS_PER_SOL,
      platformFeeUi: platformFeeLamports / LAMPORTS_PER_SOL,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


async function fetchVaultMetrics() {
  const res = await fetch(
    `https://api.kamino.finance/kvaults/${MARINADE_USDC_VAULT}/metrics`,
    { next: { revalidate: 30 } }
  );
  if (!res.ok) throw new Error("Kamino API error");
  return res.json();
}

/**
 * Per-user daily history for the USDC vault (distinct from fetchVaultMetrics'/the
 * `.../metrics/history` used above, both of which are vault-wide averages) — this is the
 * user's own position snapshotted once per day, so `cumulativeInterestEarnedUsd` deltas
 * between consecutive days give the actual USD interest that specific wallet earned each
 * day, not the vault's blended rate.
 */
export async function fetchMarinadeUsdcRewardHistory(userAddress: string) {
  try {
    const res = await fetch(
      `https://api.kamino.finance/kvaults/users/${userAddress}/vaults/${MARINADE_USDC_VAULT}/metrics/history`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error("Kamino API error");
    const raw = await res.json();

    let prevCumulativeUsd: number | null = null;
    let prevCumulativeUsdc: number | null = null;
    const history = (Array.isArray(raw) ? raw : []).map((entry: any) => {
      const cumulativeUsd = Number(entry.cumulativeInterestEarnedUsd || 0);
      // For a USDC vault the underlying token IS the dollar unit — this is the token-amount
      // twin of cumulativeInterestEarnedUsd (mirrors Kamino's own cumulativeInterestEarned vs
      // cumulativeInterestEarnedUsd split, e.g. cumulativeInterestEarnedSol for a SOL vault).
      const cumulativeUsdc = Number(entry.cumulativeInterestEarned || 0);
      const dailyInterestEarnedUsd =
        prevCumulativeUsd === null
          ? 0
          : Math.max(0, cumulativeUsd - prevCumulativeUsd);
      const dailyInterestEarnedUsdc =
        prevCumulativeUsdc === null
          ? 0
          : Math.max(0, cumulativeUsdc - prevCumulativeUsdc);
      prevCumulativeUsd = cumulativeUsd;
      prevCumulativeUsdc = cumulativeUsdc;

      return {
        date: entry.createdOn,
        usdAmount: Number(entry.usdAmount || 0),
        sharesAmount: Number(entry.sharesAmount || 0),
        apy: Number(entry.apy || 0) * 100,
        dailyInterestEarnedUsd,
        dailyInterestEarnedUsdc,
        cumulativeInterestEarnedUsd: cumulativeUsd,
        cumulativeInterestEarnedUsdc: cumulativeUsdc,
      };
    });

    return { success: true, data: history };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Raw on-chain deposit/withdraw events for the user, across every Kamino vault they've ever
 * touched — filtered down to just the USDC vault this feature cares about (`kvault` on each
 * entry identifies which vault it belongs to).
 */
export async function fetchMarinadeUsdcTransactionHistory(userAddress: string) {
  try {
    const res = await fetch(
      `https://api.kamino.finance/kvaults/users/${userAddress}/transactions`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error("Kamino API error");
    const raw = await res.json();

    const history = (Array.isArray(raw) ? raw : [])
      .filter((entry: any) => entry.kvault === MARINADE_USDC_VAULT)
      .map((entry: any) => ({
        date: entry.createdOn,
        instruction: entry.instruction as string,
        tokenAmount: Number(entry.tokenAmount || 0),
        usdValue: Number(entry.usdValue || 0),
        transaction: entry.transaction as string,
      }));

    return { success: true, data: history };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Build the USDC fee transfer instruction for USDC operations. Takes the pre-computed
 * total fee (platform cut + network fee + ATA rent, all converted to USDC — see
 * computeUsdcFeeBreakdown) rather than deriving it from the percentage alone, so the
 * relayer's actual on-chain costs are reimbursed on top of the platform's cut instead of
 * being assumed-covered by it.
 */
function buildUsdcFeeIx(
  userPublicKey: PublicKey,
  totalFeeUsdc: number
): TransactionInstruction | null {
  try {
    if (totalFeeUsdc <= 0) return null;

    const feeInUsdcRaw = Math.floor(totalFeeUsdc * 1_000_000);
    if (feeInUsdcRaw <= 0) return null;

    const userAta = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), userPublicKey, false, new PublicKey(TOKEN_PROGRAM_ID));
    const vaultAta = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), new PublicKey(PARADAPP_FEE_VAULT_SOLANA), true, new PublicKey(TOKEN_PROGRAM_ID));

    return createTransferInstruction(
      userAta,
      vaultAta,
      userPublicKey,
      feeInUsdcRaw,
      []
    );
  } catch {
    return null;
  }
}

// Compute-unit ceiling for the combined USDC vault transaction (Kamino deposit/withdraw CPI
// + platform-fee transfer, bundled into one transaction — see getMarinadeUsdcDepositTx). The
// Kamino CPI carries real vault/reserve logic; the fee transfer on top is a single plain SPL
// "Transfer" instruction (typically a few thousand CU), so this ceiling leaves it comfortable
// margin without needing its own separate budget.
const USDC_VAULT_TX_COMPUTE_UNIT_LIMIT = 400_000;

/**
 * Full fee breakdown for a Kamino USDC vault operation: platform cut (existing percentage,
 * kept as revenue) + network fee + ATA rent (both itemized cost-recovery, in USDC terms —
 * see the helpers above). `missingAtaAccountSizes` is the real byte size of each account
 * this operation needs (the user's USDC ATA, their vault-shares ATA) that doesn't exist
 * on-chain yet — empty if none are needed. `priorityMicroLamports` should be the same rate
 * the caller sets on the transactions' own ComputeBudget instructions (see
 * getPriorityFeeMicroLamports), so the fee charged here matches what actually gets spent.
 */
async function computeUsdcFeeBreakdown(
  conn: Connection,
  amountUsdc: number,
  missingAtaAccountSizes: number[],
  priorityMicroLamports: number
): Promise<{ platformFeeUsdc: number; networkFeeUsdc: number; ataFeeUsdc: number; totalFeeUsdc: number }> {
  const platformFeeUsdc = amountUsdc * PARADAPP_MARINANDE_FEE;

  const solPrice = await fetchSolUsdPrice();
  // One combined transaction (Kamino CPI + fee transfer, see getMarinadeUsdcDepositTx),
  // carrying 2 signatures (user + relayer).
  const networkFeeLamports = await estimateNetworkFeeLamports(
    conn,
    USDC_VAULT_TX_COMPUTE_UNIT_LIMIT,
    2,
    priorityMicroLamports
  );
  const ataRentSol = await estimateAtaRentSol(conn, missingAtaAccountSizes);

  const networkFeeUsdc = (networkFeeLamports / LAMPORTS_PER_SOL) * solPrice;
  const ataFeeUsdc = ataRentSol * solPrice;

  return {
    platformFeeUsdc,
    networkFeeUsdc,
    ataFeeUsdc,
    totalFeeUsdc: platformFeeUsdc + networkFeeUsdc + ataFeeUsdc,
  };
}

export async function getMarinadeUsdcDepositTx(
  userAddress: string,
  amountUsdc: number,
  rpcUrl: string
): Promise<{
  success: boolean;
  transactionBase64s?: string[];
  error?: string;
  calculatedFeeUi?: number;
  networkFeeUi?: number;
  ataFeeUi?: number;
  platformFeeUi?: number;
}> {
  try {
    assertUsdcMinFee(amountUsdc);

    const relayer = getRelayerKeypair();
    const conn = new Connection(rpcUrl, "confirmed");
    const userPublicKey = new PublicKey(userAddress);

    const rpc = createSolanaRpc(rpcUrl);
    const vault = new KaminoVault(rpc as any, address(MARINADE_USDC_VAULT), DEFAULT_RECENT_SLOT_DURATION_MS);
    const userSigner = createNoopSigner(address(userAddress));
    const depositAmount = new Decimal(amountUsdc);

    const vaultState = await vault.getState();
    const vaultReservesMap = await vault.client.loadVaultReserves(vaultState);

    // Deposit creates the user's vault-shares ATA if they don't already have one — check
    // so that cost gets itemized into the fee instead of silently eaten by the relayer.
    // Kamino share mints can be Token-2022 with extensions, so the account size is resolved
    // from the actual mint rather than assumed, same reasoning as send.ts.
    const sharesMint = new PublicKey(vaultState.sharesMint.toString());
    const sharesMintInfo = await conn.getAccountInfo(sharesMint);
    const sharesTokenProgramId = sharesMintInfo?.owner ?? new PublicKey(TOKEN_PROGRAM_ID);
    const userSharesAta = getAssociatedTokenAddressSync(sharesMint, userPublicKey, false, sharesTokenProgramId);
    const userSharesAtaInfo = await conn.getAccountInfo(userSharesAta);
    const missingAtaAccountSizes: number[] = [];
    if (userSharesAtaInfo === null) {
      missingAtaAccountSizes.push(await resolveTokenAccountSize(conn, sharesMint, sharesMintInfo));
    }

    // No farm/first-loss-capital staking is bundled into this transaction — reward accrual
    // for this vault is tracked and claimed separately (see getMarinadeUsdcClaimTx), hence
    // the explicit null, null.
    const bundle = await vault.depositIxs(userSigner, depositAmount, vaultReservesMap, null, null);

    // The SDK's depositIxs always includes a createIdempotent instruction for the shares ATA
    // regardless of whether it already exists — "idempotent" only describes its on-chain
    // no-op behavior (safe to include even when the account is already there), not that the
    // SDK omits it when unnecessary. Left in unconditionally, matching Kamino's own site,
    // which does the same regardless of whether the depositor's ATA already exists.
    //
    // kitIxToLegacy remaps this ATA's payer to the relayer, who fronts the rent — itemized
    // into the fee below via missingAtaAccountSizes — keeping the deposit fully gasless: the
    // depositor never needs to hold SOL, even on a first-time deposit that creates this
    // account. Kamino's own (non-gasless) site has the connecting wallet pay this directly
    // instead, which was tried here too at one point to match their transaction shape exactly
    // — it made no difference to Phantom's warning (confirmed to be about Phantom's own
    // trust/reputation scoring for this integration, not this transaction's content), so it
    // wasn't worth losing the zero-SOL guarantee over.
    const kaminoIxs = (bundle.depositIxs || []).map((ix: any) => kitIxToLegacy(ix, relayer.publicKey, userPublicKey));

    const alt = await loadVaultAlt(conn, vaultState);
    if (!alt) {
      console.warn("Kamino vault lookup table is not configured for this vault.");
    }

    // Sampled once and reused for both the ComputeBudget instructions below and the fee
    // estimate, so what we charge and what we actually submit agree (see
    // getPriorityFeeMicroLamports).
    const priorityMicroLamports = await getPriorityFeeMicroLamports(conn);

    const { totalFeeUsdc, networkFeeUsdc, ataFeeUsdc, platformFeeUsdc } = await computeUsdcFeeBreakdown(conn, amountUsdc, missingAtaAccountSizes, priorityMicroLamports);
    const feeIx = buildUsdcFeeIx(userPublicKey, totalFeeUsdc);

    // Fee transfer and Kamino CPI bundled into one transaction, same as the previously
    // committed code and the same pattern Swap/Send already use successfully. An earlier
    // version of this split them into two separate transactions while chasing Phantom's
    // "could be malicious" warning, on the theory that bundling was the trigger — it wasn't
    // (Swap and Send both bundle their own platform-fee transfer into a single transaction and
    // are never flagged, and splitting this one didn't clear the warning either; it's Phantom's
    // own trust/reputation scoring for this integration, unrelated to transaction shape).
    // Bundling back into one transaction restores the single-signature UX at no real cost.
    // ComputeBudget instructions are still set explicitly (matching Kamino's own site) rather
    // than left for the wallet to fill in with its own default guess.
    const allIxs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: USDC_VAULT_TX_COMPUTE_UNIT_LIMIT }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityMicroLamports }),
      ...(feeIx ? [feeIx] : []),
      ...kaminoIxs,
    ];

    const txBase64 = await buildGaslessTx(
      conn,
      allIxs,
      [relayer],
      alt ? [alt] : []
    );

    return {
      success: true,
      transactionBase64s: [txBase64],
      calculatedFeeUi: totalFeeUsdc,
      networkFeeUi: networkFeeUsdc,
      ataFeeUi: ataFeeUsdc,
      platformFeeUi: platformFeeUsdc,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMarinadeUsdcWithdrawTx(
  userAddress: string,
  amountUsdc: number,
  rpcUrl: string
): Promise<{
  success: boolean;
  transactionBase64s?: string[];
  error?: string;
  calculatedFeeUi?: number;
  networkFeeUi?: number;
  ataFeeUi?: number;
  platformFeeUi?: number;
}> {
  try {
    assertUsdcMinFee(amountUsdc);

    const relayer = getRelayerKeypair();
    const conn = new Connection(rpcUrl, "confirmed");
    const userPublicKey = new PublicKey(userAddress);

    const rpc = createSolanaRpc(rpcUrl);
    const vault = new KaminoVault(rpc as any, address(MARINADE_USDC_VAULT), DEFAULT_RECENT_SLOT_DURATION_MS);
    const userSigner = createNoopSigner(address(userAddress));

    const metrics = await fetchVaultMetrics();
    const tokensPerShare = new Decimal(metrics.tokensPerShare);
    const shares = usdcToShares(new Decimal(amountUsdc), tokensPerShare);

    const vaultState = await vault.getState();
    const vaultReservesMap = await vault.client.loadVaultReserves(vaultState);
    const ledgerInstant = await getCurrentLedgerInstant(rpc as any, "confirmed");

    // Withdraw sends USDC back to the user — check whether their USDC ATA still exists
    // (it can end up closed after a full withdraw elsewhere) rather than assume it does.
    // The real USDC mint is always a standard (non-Token-2022) SPL token, so ACCOUNT_SIZE
    // is correct here without needing to unpack the mint.
    const userUsdcAta = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), userPublicKey, false, new PublicKey(TOKEN_PROGRAM_ID));
    const userUsdcAtaInfo = await conn.getAccountInfo(userUsdcAta);
    const missingAtaAccountSizes: number[] = userUsdcAtaInfo === null ? [ACCOUNT_SIZE] : [];

    // No farm/first-loss-capital unstaking needed in this transaction (see the matching
    // comment in getMarinadeUsdcDepositTx), hence the explicit null, null.
    const bundle = await vault.withdrawIxs(userSigner, shares, ledgerInstant, vaultReservesMap, null, null);

    // Same reasoning as getMarinadeUsdcDepositTx — withdrawIxs always includes a
    // createIdempotent instruction for the user's USDC ATA regardless of whether it already
    // exists, left in unconditionally to match Kamino's own site. The relayer pays for it
    // (kitIxToLegacy's payer remap), itemized into the fee via missingAtaAccountSizes,
    // keeping withdraw fully gasless too.
    const kaminoIxs = [
      ...(bundle.unstakeFromFarmIfNeededIxs || []),
      ...(bundle.withdrawIxs || []),
      ...(bundle.postWithdrawIxs || []),
    ].map((ix: any) => kitIxToLegacy(ix, relayer.publicKey, userPublicKey));

    const alt = await loadVaultAlt(conn, vaultState);
    if (!alt) {
      console.warn("Kamino vault lookup table is not configured for this vault.");
    }

    // Sampled once and reused for both the ComputeBudget instructions below and the fee
    // estimate — same reasoning as getMarinadeUsdcDepositTx.
    const priorityMicroLamports = await getPriorityFeeMicroLamports(conn);

    const { totalFeeUsdc, networkFeeUsdc, ataFeeUsdc, platformFeeUsdc } = await computeUsdcFeeBreakdown(conn, amountUsdc, missingAtaAccountSizes, priorityMicroLamports);
    const feeIx = buildUsdcFeeIx(userPublicKey, totalFeeUsdc);

    // Bundled into one transaction — same reasoning as getMarinadeUsdcDepositTx (splitting
    // the fee transfer out didn't clear Phantom's warning, so there's no reason to keep
    // paying for it with a second signature).
    const allIxs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: USDC_VAULT_TX_COMPUTE_UNIT_LIMIT }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityMicroLamports }),
      ...kaminoIxs,
      ...(feeIx ? [feeIx] : []),
    ];

    const txBase64 = await buildGaslessTx(
      conn,
      allIxs,
      [relayer],
      alt ? [alt] : []
    );

    return {
      success: true,
      transactionBase64s: [txBase64],
      calculatedFeeUi: totalFeeUsdc,
      networkFeeUi: networkFeeUsdc,
      ataFeeUi: ataFeeUsdc,
      platformFeeUi: platformFeeUsdc,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMarinadeUsdcClaimTx(
  userAddress: string,
  rpcUrl: string,
  estimatedRewardUsd: number
): Promise<{ success: boolean; transactionBase64s?: string[]; error?: string }> {
  try {
    if (estimatedRewardUsd < MIN_CLAIM_REWARD_USDC) {
      throw new Error(`Reward too small. Minimum claim is $${MIN_CLAIM_REWARD_USDC} USDC.`);
    }

    const relayer = getRelayerKeypair();
    const conn = new Connection(rpcUrl, "confirmed");
    const userPublicKey = new PublicKey(userAddress);
    const userSigner = createNoopSigner(address(userAddress));

    const farmsClient = new Farms(createSolanaRpc(rpcUrl) as any);
    const userFarmStates = await farmsClient.getAllUserStatesForUser(userPublicKey as any);
    
    if (!userFarmStates?.length) {
      throw new Error("No active farms found for this user.");
    }

    const farmStates = await farmsClient.getFarmStatesFromUserStates(userFarmStates as any);
    const currentTimestamp = new Decimal(Math.floor(Date.now() / 1000));

    const alt = await loadMarinadeAlt(conn);
    const base64Txs: string[] = [];
    let currentIxs: TransactionInstruction[] = [];
    let farmsProcessed = 0;

    for (const activeUserFarm of userFarmStates) {
      const farmStateAddress = (activeUserFarm as any)?.userState?.farmState;
      if (!farmStateAddress) continue;

      const activeFarmState = farmStates.find(f => f.key?.toString() === farmStateAddress.toString());
      if (activeFarmState) {
        const pendingInfo = farmsClient.getUserPendingRewards(
          activeUserFarm.userState,
          activeFarmState.farmState,
          currentTimestamp,
          null
        );
        if (!pendingInfo?.hasReward) continue; 
      }

      const isDelegated = Boolean(
        (activeUserFarm as any)?.userState?.isFarmDelegated === 1 ||
          (activeUserFarm as any)?.userState?.isFarmDelegated === true
      );

      const rawIx = await farmsClient.claimForUserForFarmAllRewardsIx(
        userSigner as any,
        address(userAddress),
        address(farmStateAddress.toString()),
        isDelegated
      );

      const ixArray = Array.isArray(rawIx) ? rawIx : [rawIx];
      const legacyIxs = ixArray.map((i: any) => kitIxToLegacy(i, relayer.publicKey, userPublicKey));
      
      currentIxs.push(...legacyIxs);
      farmsProcessed++;

      if (farmsProcessed % 2 === 0) {
        const txBase64 = await buildGaslessTx(conn, currentIxs, [relayer], alt ? [alt] : []);
        base64Txs.push(txBase64);
        currentIxs = []; 
      }
    }


    if (currentIxs.length > 0 || base64Txs.length === 0) {
      // Reward-token accounts are expected to already exist (claiming implies the user
      // already holds a position in that farm) — no ATA-rent component here.
      const claimPriorityMicroLamports = await getPriorityFeeMicroLamports(conn);
      const { totalFeeUsdc } = await computeUsdcFeeBreakdown(conn, estimatedRewardUsd, [], claimPriorityMicroLamports);
      const feeIx = buildUsdcFeeIx(userPublicKey, totalFeeUsdc);
      if (feeIx) currentIxs.push(feeIx);
      
      if (currentIxs.length > 0) {
        const txBase64 = await buildGaslessTx(conn, currentIxs, [relayer], alt ? [alt] : []);
        base64Txs.push(txBase64);
      }
    }

    if (base64Txs.length === 0) throw new Error("No pending rewards found to claim.");

    return { success: true, transactionBase64s: base64Txs };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function fetchMarinadeUSDCData(rpcUrl: string, userAddress?: string) {
  try {
    const metrics = await fetchVaultMetrics();
    const tokensPerShare = new Decimal(metrics.tokensPerShare || 1);
    const totalShares = new Decimal(metrics.sharesIssued || 0);

    let userShares = new Decimal(0);
    let userUsdcDeposited = new Decimal(0);
    let userShareOfVault = new Decimal(0);
    let pendingFarmRewards = 0;
    let chartData = { times: [] as number[], values: [] as number[] };

    if (userAddress) {
      const conn = new Connection(rpcUrl, "confirmed");
      const vault = new KaminoVault(
        createSolanaRpc(rpcUrl) as any,
        address(MARINADE_USDC_VAULT),
        DEFAULT_RECENT_SLOT_DURATION_MS
      );
      const vaultState = await vault.getState();
      const SHARES_MINT = new PublicKey(vaultState.sharesMint.toString());

      const tokenAccounts = await conn.getParsedTokenAccountsByOwner(
        new PublicKey(userAddress),
        { mint: SHARES_MINT }
      );
      userShares = tokenAccounts.value.reduce((acc, ta) => {
        const amount =
          ta.account.data.parsed.info.tokenAmount.uiAmount || 0;
        return acc.plus(amount);
      }, new Decimal(0));

      userUsdcDeposited = sharesToUsdc(userShares, tokensPerShare);
      if (totalShares.gt(0)) {
        userShareOfVault = userShares.div(totalShares).mul(100);
      }

      try {
        const farmsClient = new Farms(createSolanaRpc(rpcUrl) as any);
        const userFarmStates = await farmsClient.getAllUserStatesForUser(
          new PublicKey(userAddress) as any
        );
        if (userFarmStates.length > 0) {
          const farmStates = await farmsClient.getFarmStatesFromUserStates(
            userFarmStates as any
          );
          const currentTimestamp = new Decimal(Math.floor(Date.now() / 1000));
          for (const activeUserFarm of userFarmStates) {
            const farmAddress = activeUserFarm?.userState?.farmState;
            if (farmAddress) {
              const activeFarmState = farmStates.find(
                (f: any) => f.key?.toString() === farmAddress.toString()
              );
              if (activeFarmState) {
                const pendingInfo = farmsClient.getUserPendingRewards(
                  activeUserFarm.userState,
                  activeFarmState.farmState,
                  currentTimestamp,
                  null
                );
                if (pendingInfo?.hasReward) {
                  pendingInfo.userPendingRewardAmounts.forEach((r: any) => {
                    pendingFarmRewards += r.toNumber() / 1e6;
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("Could not fetch Kamino Farm rewards", e);
      }
    }

    try {
      const historyRes = await fetch(
        `https://api.kamino.finance/kvaults/vaults/${MARINADE_USDC_VAULT}/metrics/history`,
        { next: { revalidate: 3600 } }
      );
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        chartData.times = historyData.map(
          (item: any) => new Date(item.timestamp).getTime() / 1000
        );
        chartData.values = historyData.map((item: any) => {
          const total =
            Number(item.apy || 0) +
            Number(item.apyReservesIncentives || 0) +
            Number(item.apyFarmRewards || 0);
          return Number((total * 100).toFixed(2));
        });
      }
    } catch (e) {
      console.warn("Kamino history fetch failed", e);
    }

    const baseApy = Number(metrics.apy || metrics.apy7d || metrics.apy24h || 0);
    const rewardApy = Number(metrics.apyReservesIncentives || 0);
    const totalApy = baseApy + rewardApy;

    return {
      success: true,
      data: {
        apy: (totalApy * 100).toFixed(2),
        apyBase: (baseApy * 100).toFixed(2),
        apyReward: (rewardApy * 100).toFixed(2),
        apy7d: (Number(metrics.apy7d || 0) * 100).toFixed(2),
        apy24h: (Number(metrics.apy24h || 0) * 100).toFixed(2),
        apy30d: (Number(metrics.apy30d || 0) * 100).toFixed(2),
        apy90d: (Number(metrics.apy90d || 0) * 100).toFixed(2),
        apy365d: (Number(metrics.apy365d || 0) * 100).toFixed(2),
        apyActual: (Number(metrics.apy || 0) * 100).toFixed(2),
        tokenPrice: Number(metrics.tokenPrice || 1),
        tokensAvailable: Number(metrics.tokensAvailable || 0),
        tokensInvested: Number(metrics.tokensInvested || 0),
        sharePrice: Number(metrics.sharePrice || 1),
        tokensPerShare: tokensPerShare.toNumber(),
        numberOfHolders: Number(metrics.numberOfHolders || 0),
        sharesIssued: totalShares.toNumber(),
        totalTVL: Number(metrics.tokensInvested || 0) + Number(metrics.tokensAvailable || 0),
        cumulativeInterestEarnedUsd: Number(metrics.cumulativeInterestEarnedUsd || 0),
        interestEarnedPerSecondUsd: Number(metrics.interestEarnedPerSecondUsd || 0),
        userShares: Number(userShares.toNumber().toFixed(6)),
        userUsdcDeposited: Number(userUsdcDeposited.toNumber().toFixed(6)),
        userShareOfVault: Number(userShareOfVault.toNumber().toFixed(6)),
        pendingFarmRewards: Number(pendingFarmRewards.toFixed(6)),
        chartData,
        minUsdcForGasless: MIN_USDC_AMOUNT, 
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}