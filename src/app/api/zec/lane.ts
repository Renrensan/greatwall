// The ZEC lane's orders (docs/zec-lane.md): Pay with ZEC. An order is a
// quote for an index token on Solana (GREAT and the others, indexes.ts),
// paid in real, shielded ZEC on Zcash mainnet with the memo `gw1:<id>`. The
// lane's Zcash wallet (zec-lane/, beside this server) holds only a viewing
// key: it sees payments and can never send ZEC, so the lane only takes ZEC
// in, never pays any out, and nothing is refunded. Once a payment has its
// confirmations the lane's Solana key (the faucet key) mints the index from
// the parts it holds and sends it to the order's recipient: what was paid
// for, never more than was ordered. Orders are kept on disk, one file each,
// and moved on by `advance`, called on each read of an order and every 15
// seconds.
//
// Selling an index for ZEC is a demo of the other direction: the index is
// sent to the lane and checked on Solana like a real sale, then sent back
// to the seller. No ZEC is paid (the lane cannot send any), and the page
// says so before the user sells.

import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Keypair, PublicKey, Transaction, sendAndConfirmTransaction, type VersionedTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SolanaBeta } from "@ipow/sdk";

import { dataDir } from "../beta/metadata/store";
import { indexOf, solanaConnection } from "./indexes";

/** Z5: a quote holds 15 minutes. */
export const QUOTE_MS = 15 * 60_000;
/** Z5: after its quote expired, a buy still takes a payment this long: no
 *  ZEC can be refunded, so a late one is delivered rather than lost. */
export const LATE_MS = 24 * 3600_000;
/** Z6: the most one order, and the orders paid and not yet delivered, are
 *  worth: small, since real ZEC buys a test index. */
export const MAX_ORDER_USD = 20;
export const MAX_OPEN_USD = 200;
/** Z5: Zcash blocks before a payment counts (75 seconds each). */
export const confirmationsFor = (_usd: number) => 3;
const ZAT = 100_000_000;

export type OrderState =
  /** Quoted; no payment seen. */
  | "waiting"
  /** A payment with its memo is seen; waiting for its confirmations. */
  | "seen"
  /** Confirmed; the token is being sent. */
  | "delivering"
  | "delivered"
  /** Sell (demo): quoted, waiting for the index to arrive. */
  | "awaiting"
  /** Sell (demo): the index arrived and checked; being sent back. */
  | "returning"
  /** Sell (demo): the index sent back to the seller; no ZEC paid. */
  | "returned"
  /** Its quote ran out unpaid. A buy's payment that still comes within
   *  LATE_MS is delivered, at the prices when it arrives (Z5). */
  | "expired"
  /** Paid, but the token could not be sent: held, handled by hand. */
  | "failed";

export type Order = {
  id: string;
  /** Buy: ZEC in, the index out. Sell (demo): the index in and back out. */
  side?: "buy" | "sell";
  memo: string;
  /** Always "solana": the indexes are there. */
  chain: string;
  /** The index (its basket's address), its token's symbol and name. */
  token: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Whole tokens asked for, as typed. */
  amount: string;
  recipient: string;
  usd: number;
  zecUsd: number;
  zat: number;
  createdAt: number;
  expiresAt: number;
  state: OrderState;
  /** The payment matched to it: its txid, value, height and confirmations. */
  payment: { txid: string; zat: number; height: number | null; confirmations: number; seenAt: number } | null;
  /** What was delivered: as ordered, or less for a short payment, or
   *  repriced when the payment came after the quote expired (Z5). */
  delivered: { amount: string; tx: string } | null;
  error: string | null;
  /** Sell (demo): the seller's Solana address, the Zcash address ZEC would
   *  go to, the transfer the index came in with, and the one sending it back. */
  owner?: string;
  zaddr?: string;
  transfer?: string | null;
  returnTx?: string | null;
};

// ---------------------------------------------------------------- the lane's Zcash wallet

const LANE = () => (process.env.ZEC_LANE_URL ?? "http://127.0.0.1:8790").replace(/\/$/, "");
async function lane<T>(path: string): Promise<T> {
  const key = process.env.ZEC_LANE_API_KEY;
  if (!key) throw new Error("the ZEC lane is not set up on this server");
  const r = await fetch(`${LANE()}${path}`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!r.ok) throw new Error(`the ZEC lane answered ${r.status}`);
  return (await r.json()) as T;
}
export const laneInfo = () => lane<{ address: string; ufvk: string; height: number | null; spendableZat: number }>("/info");
type Received = { tip: number | null; payments: { txid: string; output: string; height: number | null; confirmations: number; zat: number; memo: string }[] };

// ---------------------------------------------------------------- prices

let zecPrice: { at: number; usd: number } | null = null;
/** ZEC's price in dollars, from CoinGecko, kept a minute. */
export async function zecUsd(): Promise<number> {
  if (zecPrice && Date.now() - zecPrice.at < 60_000) return zecPrice.usd;
  const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd", { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  const usd = Number((await r.json())?.zcash?.usd);
  if (!(usd > 0)) {
    if (zecPrice) return zecPrice.usd;
    throw new Error("ZEC's price is not known right now");
  }
  zecPrice = { at: Date.now(), usd };
  return usd;
}

// ---------------------------------------------------------------- the order book, on disk

const DIR = () => join(dataDir(), "zec");
const fileOf = (id: string) => join(DIR(), `${id}.json`);
export const validOrderId = (id: string) => /^[0-9a-f]{10}$/.test(id);

async function save(o: Order) {
  await mkdir(DIR(), { recursive: true });
  const tmp = `${fileOf(o.id)}.tmp`;
  await writeFile(tmp, JSON.stringify(o, null, 2));
  await rename(tmp, fileOf(o.id));
}
export async function load(id: string): Promise<Order | null> {
  if (!validOrderId(id)) return null;
  try {
    return JSON.parse(await readFile(fileOf(id), "utf8")) as Order;
  } catch {
    return null;
  }
}
async function all(): Promise<Order[]> {
  try {
    const names = (await readdir(DIR())).filter((n) => n.endsWith(".json"));
    return (await Promise.all(names.map((n) => load(n.slice(0, -5))))).filter((o): o is Order => o !== null);
  } catch {
    return [];
  }
}
const OPEN: OrderState[] = ["waiting", "seen", "delivering", "awaiting", "returning"];

/** The lane's Solana key (the faucet key on testnet), as a wallet the SDK signs with. */
function laneKey(): Keypair {
  const raw = process.env.FAUCET_SOLANA_KEY;
  if (!raw) throw new Error("the lane has no Solana key on this server");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}
const asWallet = (k: Keypair) => ({
  publicKey: k.publicKey,
  signTransaction: async <T extends Transaction | VersionedTransaction>(t: T) => {
    if (t instanceof Transaction) t.partialSign(k);
    else t.sign([k]);
    return t;
  },
  signAllTransactions: async <T extends Transaction | VersionedTransaction>(ts: T[]) => {
    for (const t of ts) {
      if (t instanceof Transaction) t.partialSign(k);
      else t.sign([k]);
    }
    return ts;
  },
});

/** Whole tokens as the index's smallest units (9 decimals). */
const unitsOf = (whole: number) => BigInt(Math.round(whole * 1e9));

/** Makes an order for `amount` of index `index`: checked against the caps
 *  (Z6) and the parts the lane holds to mint it (Z8). */
export async function createOrder(input: { index: string; amount: string; recipient: string }): Promise<Order> {
  const ix = await indexOf(input.index);
  if (!ix) throw new Error("Not one of the indexes the lane sells");
  const amount = Number(input.amount);
  if (!(amount > 0) || !/^\d+(\.\d+)?$/.test(input.amount)) throw new Error("Enter an amount above zero");
  const usd = amount * ix.usdPerToken;
  if (usd > MAX_ORDER_USD) throw new Error(`At most $${MAX_ORDER_USD} an order: ${(MAX_ORDER_USD / ix.usdPerToken).toFixed(4)} ${ix.symbol}`);
  const open = (await all()).filter((o) => o.side !== "sell" && OPEN.includes(o.state) && o.state !== "waiting");
  if (open.reduce((s, o) => s + o.usd, 0) + usd > MAX_OPEN_USD) throw new Error("The lane is busy right now: try again in a few minutes");
  // Every part, with the creator's fee, held by the lane now.
  const key = laneKey();
  const sb = new SolanaBeta(solanaConnection(), asWallet(key) as any);
  const q = await sb.quoteMint(input.index, unitsOf(amount));
  const basket: any = await sb.getBasket(input.index);
  for (let i = 0; i < basket.parts.length; i++) {
    const have = await sb.tokenBalance(key.publicKey, new PublicKey(basket.parts[i].mint)).catch(() => BigInt(0));
    if (have < q.need[i] + q.fee[i]) throw new Error(`The lane is short of ${ix.parts[i]?.symbol ?? "a part"} for this much ${ix.symbol} right now`);
  }
  const zecUsdNow = await zecUsd();
  const id = randomBytes(5).toString("hex");
  const now = Date.now();
  const o: Order = {
    id,
    memo: `gw1:${id}`,
    chain: "solana",
    token: ix.address,
    symbol: ix.symbol,
    name: ix.name,
    decimals: 9,
    amount: input.amount,
    recipient: input.recipient,
    usd,
    zecUsd: zecUsdNow,
    // Rounded up to whole zatoshis.
    zat: Math.ceil((usd / zecUsdNow) * ZAT),
    createdAt: now,
    expiresAt: now + QUOTE_MS,
    state: "waiting",
    payment: null,
    delivered: null,
    error: null,
  };
  await save(o);
  return o;
}

// ---------------------------------------------------------------- moving orders on

/** Mints `amountWhole` of the order's index with the lane's key, from the
 *  parts it holds, and sends it to the order's recipient. */
async function deliver(o: Order, amountWhole: number): Promise<string> {
  const key = laneKey();
  const conn = solanaConnection();
  const sb = new SolanaBeta(conn, asWallet(key) as any);
  const units = unitsOf(amountWhole);
  const basket: any = await sb.getBasket(o.token);
  const beta = new PublicKey(basket.beta);
  const before = await sb.tokenBalance(key.publicKey, beta).catch(() => BigInt(0));
  // Minted only when what it holds of the index is short: a retry after a
  // mint that went through sends, it does not mint again.
  if (before < units) await sb.mint(o.token, units - before);
  const owner = new PublicKey(o.recipient);
  const from = getAssociatedTokenAddressSync(beta, key.publicKey);
  const to = getAssociatedTokenAddressSync(beta, owner);
  const tx = new Transaction().add(createAssociatedTokenAccountIdempotentInstruction(key.publicKey, to, owner, beta), createTransferInstruction(from, to, key.publicKey, units));
  return sendAndConfirmTransaction(conn, tx, [key], { commitment: "confirmed" });
}

/** One order at a time is moved on: two reads never deliver it twice. */
const busy = ((globalThis as unknown as { __gwZecBusy?: Set<string> }).__gwZecBusy ??= new Set<string>());

/** Moves the open orders on from the lane's payments: matched by memo, a
 *  payment is used by one order only. */
export async function advanceAll(): Promise<void> {
  const orders = await all();
  const now = Date.now();
  const open = orders.filter((o) => OPEN.includes(o.state) || (o.state === "expired" && o.side !== "sell" && !o.payment && now < o.expiresAt + LATE_MS));
  if (!open.length) return;
  const used = new Set(orders.flatMap((o) => (o.payment ? [o.payment.txid] : [])));
  let received: Received;
  try {
    received = await lane<Received>("/received");
  } catch (e) {
    console.error("[zec] reading the lane failed:", (e as Error).message);
    return;
  }
  for (const o of open) {
    if (busy.has(o.id)) continue;
    busy.add(o.id);
    try {
      if (o.side === "sell") await advanceSell(o);
      else await advance(o, received, used);
    } catch (e) {
      console.error(`[zec ${o.id}]`, (e as Error).message);
    } finally {
      busy.delete(o.id);
    }
  }
}

async function advance(o: Order, received: Received, used: Set<string>) {
  const now = Date.now();
  if (o.state === "waiting" || o.state === "seen" || o.state === "expired") {
    const p = received.payments.find((x) => x.memo.trim() === o.memo && (o.payment?.txid === x.txid || !used.has(x.txid)));
    if (!p) {
      // Unpaid when its quote runs out: expired (a late payment still counts).
      if (o.state === "waiting" && now > o.expiresAt) {
        o.state = "expired";
        await save(o);
      }
      return;
    }
    const seenAt = o.payment?.seenAt ?? now;
    o.payment = { txid: p.txid, zat: p.zat, height: p.height, confirmations: p.confirmations, seenAt };
    used.add(p.txid);
    o.state = p.confirmations >= confirmationsFor(o.usd) ? "delivering" : "seen";
    await save(o);
    if (o.state !== "delivering") return;
  }
  if (o.state === "delivering") {
    // Nothing is refunded, so a payment gets what it paid for, never more
    // than was ordered. On time: at the quote, less for a short payment.
    // Late: the ZEC paid, at the prices now (Z5).
    const ordered = Number(o.amount);
    const paid = o.payment!.zat;
    let amount = ordered * Math.min(1, paid / o.zat);
    if (o.payment!.seenAt > o.expiresAt) {
      const price = (await indexOf(o.token))?.usdPerToken ?? o.usd / ordered;
      amount = Math.min(ordered, ((paid / ZAT) * (await zecUsd())) / price);
    }
    amount = Math.floor(amount * 1e9) / 1e9;
    try {
      const tx = await deliver(o, amount);
      o.delivered = { amount: String(Number(amount.toFixed(9))), tx };
      o.state = "delivered";
      o.error = null;
    } catch (e) {
      o.state = "failed";
      o.error = `The token could not be sent: ${(e as Error).message.slice(0, 160)}`;
    }
    await save(o);
  }
}

// Every 15 seconds, once per server process.
const timer = globalThis as unknown as { __gwZecTimer?: ReturnType<typeof setInterval> };
if (!timer.__gwZecTimer && process.env.ZEC_LANE_API_KEY) {
  timer.__gwZecTimer = setInterval(() => void advanceAll().catch(() => {}), 15_000);
}

// ---------------------------------------------------------------- selling an index for ZEC (demo)

/** The lane's Solana address: where a seller sends the index. */
export const laneSolana = () => laneKey().publicKey.toBase58();

/** Makes a sell order (demo): `amount` of index `index`, quoted in ZEC to
 *  `zaddr`. The index is checked and sent back; no ZEC is paid. */
export async function createSellOrder(input: { index: string; amount: string; owner: string; zaddr: string }): Promise<Order> {
  const ix = await indexOf(input.index);
  if (!ix) throw new Error("Not one of the indexes the lane takes");
  const amount = Number(input.amount);
  if (!(amount > 0) || !/^\d+(\.\d+)?$/.test(input.amount)) throw new Error("Enter an amount above zero");
  const usd = amount * ix.usdPerToken;
  if (usd > MAX_ORDER_USD) throw new Error(`At most $${MAX_ORDER_USD} an order: ${(MAX_ORDER_USD / ix.usdPerToken).toFixed(4)} ${ix.symbol}`);
  const zecUsdNow = await zecUsd();
  const id = randomBytes(5).toString("hex");
  const now = Date.now();
  const o: Order = {
    id,
    side: "sell",
    memo: `gw1:${id}`,
    chain: "solana",
    token: ix.address,
    symbol: ix.symbol,
    name: ix.name,
    decimals: 9,
    amount: input.amount,
    recipient: input.owner,
    usd,
    zecUsd: zecUsdNow,
    zat: Math.floor((usd / zecUsdNow) * ZAT),
    createdAt: now,
    expiresAt: now + QUOTE_MS,
    state: "awaiting",
    payment: null,
    delivered: null,
    error: null,
    owner: input.owner,
    zaddr: input.zaddr,
    transfer: null,
    returnTx: null,
  };
  await save(o);
  return o;
}

/** Records the transfer a seller sent the index with: checked by advanceSell. */
export async function markSent(id: string, signature: string): Promise<Order | null> {
  const o = await load(id);
  if (!o || o.side !== "sell" || o.state !== "awaiting" || o.transfer) return o;
  // One transfer, one order: else it would be sent back twice.
  if ((await all()).some((x) => x.transfer === signature)) return o;
  o.transfer = signature;
  await save(o);
  return o;
}

/** A sell order on: its transfer read on Solana once finalized (the index,
 *  at least the amount, from the seller to the lane), then what arrived
 *  sent back to the seller. */
async function advanceSell(o: Order) {
  const conn = solanaConnection();
  const key = laneKey();
  const basket: any = await new SolanaBeta(conn, asWallet(key) as any).getBasket(o.token);
  const beta = new PublicKey(basket.beta);
  if (o.state === "awaiting") {
    if (!o.transfer) {
      if (Date.now() > o.expiresAt) {
        o.state = "expired";
        await save(o);
      }
      return;
    }
    const tx = await conn.getParsedTransaction(o.transfer, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
    if (!tx) return; // not finalized yet
    if (tx.meta?.err) {
      o.state = "failed";
      o.error = "The transfer of the index failed on Solana, so nothing left your wallet";
      await save(o);
      return;
    }
    const lane = key.publicKey.toBase58();
    const bal = (list: any[] | null | undefined) => BigInt((list ?? []).find((b) => b.mint === basket.beta && b.owner === lane)?.uiTokenAmount?.amount ?? "0");
    const into = bal(tx.meta?.postTokenBalances) - bal(tx.meta?.preTokenBalances);
    const signer = tx.transaction.message.accountKeys.find((k: any) => k.signer)?.pubkey?.toBase58();
    if (signer !== o.owner || into <= BigInt(0)) {
      o.state = "failed";
      o.error = "That transfer doesn't match the order (wrong sender or token)";
      await save(o);
      return;
    }
    // A transfer another order already took (two requests at once): not twice.
    if ((await all()).some((x) => x.id !== o.id && x.transfer === o.transfer && (x.state === "returning" || x.state === "returned"))) {
      o.state = "failed";
      o.error = "That transfer belongs to another order";
      await save(o);
      return;
    }
    // What arrived goes back, even when it is not the amount ordered.
    o.delivered = { amount: String(Number(into) / 1e9), tx: "" };
    o.state = "returning";
    await save(o);
  }
  if (o.state === "returning") {
    const units = BigInt(Math.round(Number(o.delivered!.amount) * 1e9));
    const owner = new PublicKey(o.owner!);
    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(key.publicKey, getAssociatedTokenAddressSync(beta, owner), owner, beta),
      createTransferInstruction(getAssociatedTokenAddressSync(beta, key.publicKey), getAssociatedTokenAddressSync(beta, owner), key.publicKey, units)
    );
    try {
      o.returnTx = await sendAndConfirmTransaction(conn, tx, [key], { commitment: "confirmed" });
      o.delivered = { amount: o.delivered!.amount, tx: o.returnTx };
      o.state = "returned";
      o.error = null;
    } catch (e) {
      // Left "returning": tried again on the next round.
      o.error = `Sending it back is delayed: ${(e as Error).message.slice(0, 120)}`;
    }
    await save(o);
  }
}

// ---------------------------------------------------------------- a wallet's orders

/** The orders of a Solana address, newest first: buys delivered to it and
 *  sales sent from it. */
export async function ordersOf(address: string, limit = 50): Promise<Order[]> {
  return (await all())
    .filter((o) => o.recipient === address || o.owner === address)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}
