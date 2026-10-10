// The protocol explorer's view of Solana devnet: the latest transactions of
// iPoW's programs (light client, protocol, vault, Conversion, BETA), each
// told in plain words. Solana's vault and applications record their state
// in accounts and emit few events, so each transaction is read by the
// instruction it calls, decoded with the program's IDL, and named by its
// fee payer. Answers are kept 30 seconds; a transaction read once is kept.

import { NextResponse } from "next/server";
import { BorshAccountsCoder, BorshInstructionCoder, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, type VersionedTransactionResponse } from "@solana/web3.js";
import { IDLS, SOLANA, SolanaVault, metadataAddress, network, parseMetadata, type NetworkName } from "@ipow/sdk";

import { NETWORK_OF, assetsOf, cap, evmReader, nameOf } from "@/components/integrator/ipow/explorer";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import type { ExplorerTx, Role } from "../[chain]/route";

export const runtime = "nodejs";

const PER_PROGRAM = 40;
const SHOWN = 80;
const KEEP_MS = 30_000;

type Program = keyof typeof SOLANA.programs;
const PROGRAMS = Object.entries(SOLANA.programs) as [Program, string][];
const coders = new Map<Program, BorshInstructionCoder>(PROGRAMS.map(([role]) => [role, new BorshInstructionCoder((IDLS as unknown as Record<string, Idl>)[role])]));

const basketCoder = new BorshAccountsCoder((IDLS as unknown as Record<string, Idl>).betaBasket);
const basketInfo = new Map<string, Promise<{ symbol: string; parts: number } | null>>();
/** An index's symbol (its token's metadata) and number of parts, read once. */
function indexOf(connection: Connection, address: string | null): Promise<{ symbol: string; parts: number } | null> {
  if (!address) return Promise.resolve(null);
  let info = basketInfo.get(address);
  if (!info) {
    info = (async () => {
      const account = await connection.getAccountInfo(new PublicKey(address));
      if (!account) return null;
      const b = basketCoder.decode("Basket", account.data);
      const meta = await connection.getAccountInfo(metadataAddress(b.beta));
      return { symbol: meta ? parseMetadata(meta.data).symbol || "BETA" : "BETA", parts: b.parts.length };
    })().catch(() => null);
    basketInfo.set(address, info);
  }
  return info;
}

/** Pairs Greatwall leaves out (Hedera, Polkadot): their transactions aren't listed. */
const LEFT_OUT = new Set([5, 6]);

/** The vault's configuration account of each pair, by peer number. */
const CONFIGS = new Map<string, number>(
  Object.keys(NETWORK_OF)
    .map(Number)
    .filter((n) => n !== 2)
    .map((peer) => [PublicKey.findProgramAddressSync([Buffer.from("config"), Buffer.from([peer])], new PublicKey(SOLANA.programs.vault))[0].toBase58(), peer]),
);

let kept: { at: number; txs: ExplorerTx[] } | null = null;
const read = new Map<string, ExplorerTx | null>();

const fmt = (raw: bigint, decimals: number) => (Number(raw) / 10 ** decimals).toLocaleString("en-US", { maximumFractionDigits: 6 });
const big = (v: unknown) => BigInt(String(v ?? 0));

/** An asset locked on Solana: its symbol and record decimals. */
async function solanaAsset(connection: Connection, peer: number, n: number) {
  try {
    const a = (await new SolanaVault(connection, peer).assets())[n];
    if (!a) return null;
    const symbol = a.mint ? (rwaTokensOf("solana").find((r) => r.token === a.mint)?.symbol ?? `asset ${n}`) : "SOL";
    return { symbol, decimals: a.recordDecimals };
  } catch {
    return null;
  }
}

/** An asset of the EVM peer (a receipt on Solana stands for it): its symbol and record decimals. */
async function peerAsset(peer: number, n: number) {
  const chain = NETWORK_OF[peer];
  const provider = chain && evmReader(chain);
  if (!provider) return null;
  try {
    const d = network(`${chain}-testnet` as NetworkName);
    const pair = (d.vaults as readonly { peer: number }[]).findIndex((v) => v.peer === 2);
    if (pair < 0) return null;
    return (await assetsOf(chain, provider, d, pair)).get(n) ?? null;
  } catch {
    return null;
  }
}

/** One transaction: the iPoW instruction it calls, in plain words. */
async function describeTx(connection: Connection, tx: VersionedTransactionResponse): Promise<ExplorerTx | null> {
  const keys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses });
  const signer = keys.get(0)?.toBase58() ?? null;
  const found: { role: Program; name: string; data: Record<string, any>; peer: number | null; first: string | null }[] = [];
  for (const ix of tx.transaction.message.compiledInstructions) {
    const program = keys.get(ix.programIdIndex)?.toBase58();
    const role = PROGRAMS.find(([, id]) => id === program)?.[0];
    if (!role) continue;
    const decoded = coders.get(role)!.decode(Buffer.from(ix.data));
    if (!decoded) continue;
    const peer = ix.accountKeyIndexes.map((i) => CONFIGS.get(keys.get(i)?.toBase58() ?? "")).find((p) => p !== undefined) ?? null;
    found.push({ role, name: decoded.name, data: decoded.data as Record<string, any>, peer, first: keys.get(ix.accountKeyIndexes[0])?.toBase58() ?? null });
  }
  if (!found.length || found.every((f) => f.peer !== null && LEFT_OUT.has(f.peer))) return null;
  const said = await Promise.all(found.map((f) => say(connection, f)));
  const order: Record<Role, number> = { guardian: 0, user: 1, operator: 2, protocol: 3 };
  const ranked = said.map((s, i) => ({ ...s, i, kind: `${found[i].role}.${found[i].name}` })).sort((a, b) => order[a.role] - order[b.role] || a.i - b.i);
  return {
    tx: tx.transaction.signatures[0],
    block: tx.slot,
    at: tx.blockTime ?? null,
    from: signer,
    role: ranked[0].role,
    title: ranked[0].title,
    detail: ranked[0].detail,
    also: ranked.slice(1).map((r) => r.title),
    kind: ranked[0].kind,
    alsoKinds: ranked.slice(1).map((r) => r.kind),
  };
}

async function say(connection: Connection, f: { role: Program; name: string; data: Record<string, any>; peer: number | null; first: string | null }): Promise<{ role: Role; title: string; detail: string }> {
  const a = f.data;
  const peer = f.peer !== null ? cap(nameOf(f.peer)) : "its pair";
  const op = (title: string, detail = "") => ({ role: "operator" as Role, title, detail });
  const user = (title: string, detail = "") => ({ role: "user" as Role, title, detail });
  const guard = (title: string, detail = "") => ({ role: "guardian" as Role, title, detail });
  switch (`${f.role}.${f.name}`) {
    // The light client: Bitcoin blocks, checked on Solana.
    case "lightClient.extend":
      return op(`${a.headers?.length ?? "New"} Bitcoin blocks added`, "Solana checked their proof of work and saved them");
    case "lightClient.extend_back":
      return op("Older Bitcoin block added", "Fills a gap in Solana's copy of Bitcoin's chain");
    case "lightClient.jump":
      return op(`Caught up with Bitcoin at block ${Number(a.height).toLocaleString("en-US")}`, "Solana's copy of Bitcoin starts again from a recent block");
    case "lightClient.add_epoch_start":
      return op("Bitcoin difficulty period recorded", `Starting at block ${Number(a.height).toLocaleString("en-US")}`);
    case "lightClient.begin_walk":
      return op("Started verifying a Bitcoin block", "Checking it is part of Bitcoin's chain, step by step");
    case "lightClient.walk_step":
      return op("Verifying a Bitcoin block", "One more step back along Bitcoin's chain");
    case "lightClient.close_walk":
      return op("Bitcoin block verified", "Confirmed it is part of Bitcoin's chain");
    // The protocol: operators and jobs.
    case "protocol.lock_bond":
      return op("Operator bond locked", `${fmt(big(a.amount), 9)} SOL as stake`);
    case "protocol.withdraw_bond":
      return op("Operator bond withdrawn", `${fmt(big(a.amount), 9)} SOL`);
    case "protocol.register_chain_head":
    case "protocol.advance_chain_head":
      return op("Operator's Bitcoin marker set", "Its Bitcoin coin, which its jobs' transactions spend in turn");
    case "protocol.open_job":
      return user("Checkpoint requested", `A job for an operator to prove a recent Bitcoin block, ${a.confirmations} confirmations`);
    case "protocol.bid":
      return op("Operator took a job", `Bid ${fmt(big(a.amount), 9)} SOL to do it`);
    case "protocol.anchor_job":
      return op("Job started", "Anchored at a Bitcoin block: the operator now writes a Bitcoin transaction after it");
    case "protocol.prove_job":
      return op("Job proven", "Its Bitcoin transaction shown in a real block; anyone can challenge it for 36 hours");
    case "protocol.settle":
      return op("Job settled", "The operator was paid");
    case "protocol.expire":
      return { role: "protocol", title: "Job expired", detail: "No operator took it in time" };
    case "protocol.attest":
      return op("Attester backed a job", "With its own money");
    case "protocol.report_missed_duty":
      return guard("Missed duty reported", "An operator is slashed");
    case "protocol.challenge_fork":
    case "protocol.ask_parent":
      return guard("Proof challenged", "A guardian disputes the operator's Bitcoin block");
    // The vault: locks here, receipts of the peer's.
    case "vault.lock": {
      const x = await solanaAsset(connection, f.peer ?? 1, Number(a.asset));
      return user(`${x ? `${fmt(big(a.amount), x.decimals)} ${x.symbol}` : `Asset ${a.asset}`} locked for ${peer}`, `Its receipt is issued on ${peer}`);
    }
    case "vault.make_request": {
      const x = f.peer !== null ? await peerAsset(f.peer, Number(a.asset)) : null;
      return user(`${x ? `${fmt(big(a.amount), x.decimals)} ${x.symbol}` : `Asset ${a.asset}`} unlocking to ${peer}`, "Its receipt burned on Solana");
    }
    case "vault.genesis_issue": {
      const x = f.peer !== null ? await peerAsset(f.peer, Number(a.asset)) : null;
      return op("Genesis receipt issued", `${x ? `${fmt(big(a.value), x.decimals)} ${x.symbol}` : `Asset ${a.asset}`} from ${peer}'s lock #${a.lockId ?? a.lock_id}`);
    }
    case "vault.genesis_make_receipt":
      return op("Genesis: receipt made", `For ${peer}'s asset ${a.asset}`);
    case "vault.finalize_genesis":
      return op("Genesis finalized", "No more genesis receipts can ever be made here");
    case "vault.issue":
      return op(`Receipt issued from ${peer}`, `For ${peer}'s lock #${a.lockId ?? a.lock_id}, after claim #${a.claimId ?? a.claim_id}`);
    case "vault.make_receipt":
      return op("Receipt token made", `For ${peer}'s asset ${a.asset}`);
    case "vault.attest_lock":
      return op("Receipt paid at once (fast path)", `An attester backed a lock from ${peer}`);
    case "vault.fast_pay":
      return op("Paid at once (fast path)", `Request #${a.requestId ?? a.request_id} from ${peer}`);
    case "vault.pay_request":
      return op("Unlock paid", `Request #${a.requestId ?? a.request_id} from ${peer}`);
    case "vault.submit_message":
      return op(`Message carried from ${peer}`, "An operator brought the pair's records, anchored on Bitcoin");
    case "vault.decide":
      return { role: "protocol", title: "Claim decided", detail: `Claim #${a.claimId ?? a.claim_id}: its objection window closed` };
    case "vault.object":
      return guard("Claim objected to", `Claim #${a.claimId ?? a.claim_id}`);
    case "vault.answer":
      return op("Objection answered", `Claim #${a.claimId ?? a.claim_id}`);
    case "vault.register_chain":
      return op(`Operator joined the pair with ${peer}`, "Its Bitcoin chain registered");
    case "vault.add_bond_home":
    case "vault.add_bond_receipt":
      return op("Vault bond added", `Pair with ${peer}`);
    case "vault.add_deposits":
      return op("Vault deposits added", `Pair with ${peer}`);
    case "vault.register_asset":
      return user("Asset registered", `It can now be locked for ${peer}`);
    case "vault.give_up":
      return op("Lock given up", `Lock #${a.lockId ?? a.lock_id}: no receipt`);
    case "vault.return_lock":
      return op("Lock returned", `Lock #${a.lockId ?? a.lock_id}`);
    case "vault.open_checkpoint":
      return op("Checkpoint opened", `Pair with ${peer}`);
    // Applications.
    case "conversion.sell":
    case "conversion.sell_in_window":
      return user("Conversion: sell", `For ${Number(a.sats).toLocaleString("en-US")} sats on Bitcoin`);
    case "conversion.buy":
    case "conversion.buy_for":
      return user("Conversion: buy", `With ${Number(a.sats).toLocaleString("en-US")} sats`);
    case "conversion.fund":
      return op("Conversion funded", "An operator took it");
    case "conversion.complete_buy":
    case "conversion.complete_sell":
      return op("Conversion completed", "Proven by its Bitcoin payment");
    case "conversion.refund_sell":
    case "conversion.reclaim":
    case "conversion.cancel":
      return user("Conversion refunded", "");
    case "betaBasket.create_basket":
      return user(`Index ${String(a.symbol) || "token"} created`, `"${String(a.name)}"`);
    // An index's own actions, named by the index (its first account).
    case "betaBasket.mint":
    case "betaBasket.burn":
    case "betaBasket.collect_fees":
    case "betaBasket.collect_owed": {
      const index = await indexOf(connection, f.first);
      const sym = index?.symbol ?? "index";
      if (f.name === "mint") return user(`${fmt(big(a.amount), 9)} ${sym} minted`, "Its parts deposited into the index");
      if (f.name === "burn") return user(`${fmt(big(a.amount), 9)} ${sym} burned`, "Its parts paid back from the index");
      const part = `Part ${Number(a.index) + 1}${index ? ` of ${index.parts}` : ""}`;
      return f.name === "collect_fees" ? user(`${sym} creator fees collected`, part) : user(`${sym} owed part collected`, part);
    }
    default:
      return { role: "operator", title: f.name.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), detail: cap(String(f.role)) };
  }
}

export async function GET() {
  if (kept && Date.now() - kept.at < KEEP_MS) return NextResponse.json(view(kept.txs));
  const url = process.env.SOLANA_DEVNET_RPC_URL;
  if (!url) return NextResponse.json({ error: "SOLANA_DEVNET_RPC_URL not set" }, { status: 500 });
  const connection = new Connection(url, "confirmed");
  try {
    // The newest transactions of every program, once each.
    const pages = await Promise.all(PROGRAMS.map(([, id]) => connection.getSignaturesForAddress(new PublicKey(id), { limit: PER_PROGRAM }).catch(() => [])));
    const sigs = [...new Map(pages.flat().filter((s) => !s.err).map((s) => [s.signature, s])).values()]
      .sort((a, b) => (b.blockTime ?? 0) - (a.blockTime ?? 0) || b.slot - a.slot)
      .slice(0, SHOWN);
    const unread = sigs.map((s) => s.signature).filter((s) => !read.has(s));
    for (let i = 0; i < unread.length; i += 20) {
      const batch = unread.slice(i, i + 20);
      const txs = await connection.getTransactions(batch, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
      await Promise.all(
        txs.map(async (tx, j) => {
          read.set(batch[j], tx ? await describeTx(connection, tx).catch(() => null) : null);
        }),
      );
    }
    const txs = sigs.map((s) => read.get(s.signature)).filter((t): t is ExplorerTx => !!t);
    kept = { at: Date.now(), txs };
    return NextResponse.json(view(txs));
  } catch (e: any) {
    if (kept) return NextResponse.json(view(kept.txs));
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 502 });
  }
}

/** The answer, shaped as an EVM network's (the page reads `txs`). */
const view = (txs: ExplorerTx[]) => ({ chain: "solana", number: 2, latestBlock: txs[0]?.block ?? 0, scannedFrom: txs.at(-1)?.block ?? 0, lightClient: null, jobs: 0, challenges: 0, pairs: [], events: [], txs });
