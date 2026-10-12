// What the iPoW operator pays at once (its fast path), so a lock or an
// unlock is only let through when it arrives in minutes: the pair's limit
// per asset from the operator's settings (fastLimits.json, copied by
// scripts/sync-fast-limits.mjs), and what the operator holds to pay with,
// read from the chain. A lock is delivered from the receipts the operator
// holds on the destination, 1.25 times its amount locked as collateral; an
// unlock is paid from the asset the operator holds on its home network.

import { PublicKey } from "@solana/web3.js";
import { receiptTokens } from "@ipow/sdk";

import limits from "./fastLimits.json";
import { deploymentOf, readProvider, solanaConnection, solanaVaultOf, type EvmChain } from "./sdk";
import { balanceOf } from "./tokens";

export const OPERATOR = limits.operator as { evm: string; solana: string };
const SOLANA_NUMBER = 2;
/** An attest locks 1.25 times the lock's amount in receipts (design, section 11.7). */
const COLLATERAL_BPS = BigInt(12_500);

const numberOf = (chain: string) => (chain === "solana" ? SOLANA_NUMBER : deploymentOf(chain as EvmChain)!.number);

/** The operator's terms for asset `asset` of network `home` on a pair, in
 *  record units: the most it pays at once, and the least fast fee it asks. */
export type FastTerms = { max: bigint; minFee: bigint };

/** The pair's fast terms for asset `asset` of network `home`; null when the
 *  operator does not pay it at once on this pair. */
export function fastTerms(a: string, b: string, home: string, asset: number): FastTerms | null {
  const pair = (limits.pairs as Record<string, Record<string, { max: string; minFee: string }>>)[[a, b].sort().join("|")];
  const v = pair?.[`${home}:${asset}`];
  return v ? { max: BigInt(v.max), minFee: BigInt(v.minFee) } : null;
}

/** The receipts of `home`'s asset `asset` the operator holds on `dst`, in
 *  record units: what it delivers locks from. */
export async function operatorReceipts(home: string, dst: string, asset: number): Promise<bigint> {
  if (dst === "solana") {
    const mint = solanaVaultOf(home as EvmChain).receiptMint(asset);
    const accounts = await solanaConnection().getParsedTokenAccountsByOwner(new PublicKey(OPERATOR.solana), { mint });
    return accounts.value.reduce((s, a) => s + BigInt(a.account.data.parsed.info.tokenAmount.amount), BigInt(0));
  }
  const d = deploymentOf(dst as EvmChain)!;
  const pair = (d.vaults as readonly { peer: number }[]).findIndex((v) => v.peer === numberOf(home));
  if (pair < 0) return BigInt(0);
  const token = (await receiptTokens(readProvider(dst as EvmChain), d, pair, asset + 1)).get(asset);
  return token ? balanceOf(dst as EvmChain, token, OPERATOR.evm) : BigInt(0);
}

/** A lock's fast terms now, in record units: the most it can be and still be
 *  delivered at once (the pair's limit, and the receipts held over 1.25),
 *  and the least fast fee. Null: not delivered at once at all. */
export async function lockFastTerms(src: string, dst: string, asset: number): Promise<FastTerms | null> {
  const terms = fastTerms(src, dst, src, asset);
  if (terms === null) return null;
  const held = await operatorReceipts(src, dst, asset);
  const byStock = (held * BigInt(10_000)) / COLLATERAL_BPS;
  return { max: byStock < terms.max ? byStock : terms.max, minFee: terms.minFee };
}

/** An unlock's fast terms now, in record units: the pair's limit and what
 *  the operator holds of the asset on its home network (`held`, in record
 *  units, read by the caller who knows the token), and the least fast fee. */
export function unlockFastTerms(src: string, home: string, asset: number, held: bigint): FastTerms | null {
  const terms = fastTerms(src, home, home, asset);
  if (terms === null) return null;
  return { max: held < terms.max ? held : terms.max, minFee: terms.minFee };
}

