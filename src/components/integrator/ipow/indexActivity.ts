// An index's mint and burn history, for the charts of its page: on EVM
// networks from the contract's events (the app's server reads them, see
// /api/baskets/<chain>/activity), on Solana from the index's transactions,
// each counted by how much of the index token it made or destroyed (the
// program emits no events).

import { PublicKey } from "@solana/web3.js";

import { solanaConnection } from "./sdk";

export type Activity = { t: number; kind: "mint" | "burn"; amount: bigint };
/** The history, or "unsupported" where this network's history cannot be read yet. */
export type ActivityResult = { events: Activity[] } | "unsupported";

export async function evmActivity(chain: string, key: string): Promise<ActivityResult> {
  for (let i = 0; i < 15; i++) {
    const r = await fetch(`/api/baskets/${chain}/activity?key=${key}`);
    const body = await r.json();
    if (!r.ok) throw new Error(body?.error ?? `activity: ${r.status}`);
    if (!body.supported) return "unsupported";
    if (body.complete) return { events: body.events.map((e: any) => ({ t: e.t, kind: e.kind, amount: BigInt(e.amount) })) };
  }
  throw new Error("the history is still being read: try again in a moment");
}

/** Up to the last 1,000 transactions of the index (its account is in every
 *  mint and burn), each by the change of the index token's total in it. */
export async function solanaActivity(basket: string, beta: string): Promise<ActivityResult> {
  const conn = solanaConnection();
  const sigs = (await conn.getSignaturesForAddress(new PublicKey(basket), { limit: 1000 })).filter((s) => !s.err);
  const out: Activity[] = [];
  for (let i = 0; i < sigs.length; i += 50) {
    const txs = await conn.getTransactions(
      sigs.slice(i, i + 50).map((s) => s.signature),
      { maxSupportedTransactionVersion: 0, commitment: "confirmed" }
    );
    txs.forEach((tx, j) => {
      if (!tx?.meta) return;
      const sum = (list: typeof tx.meta.preTokenBalances) => (list ?? []).filter((b) => b.mint === beta).reduce((a, b) => a + BigInt(b.uiTokenAmount.amount), BigInt(0));
      const delta = sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);
      if (delta !== BigInt(0)) out.push({ t: tx.blockTime ?? sigs[i + j].blockTime ?? 0, kind: delta > BigInt(0) ? "mint" : "burn", amount: delta > BigInt(0) ? delta : -delta });
    });
  }
  return { events: out.sort((a, b) => a.t - b.t) };
}
