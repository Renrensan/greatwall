// The protocol explorer's view of Solana devnet: the latest transactions of
// iPoW's programs (light client, protocol, vault, Conversion, BETA), each
// told in plain words. Solana's vault and applications record their state
// in accounts and emit few events, so each transaction is read by the
// instruction it calls, decoded with the program's IDL, and named by its
// fee payer. Answers are kept 30 seconds; a transaction read once is kept.

import { NextResponse } from "next/server";
import { BorshInstructionCoder, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, type VersionedTransactionResponse } from "@solana/web3.js";
import { IDLS, SOLANA, SolanaVault, network, type NetworkName } from "@ipow/sdk";

import { NETWORK_OF, assetsOf, cap, evmReader, nameOf } from "@/components/integrator/ipow/explorer";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import type { ExplorerTx, Role } from "../[chain]/route";

export const runtime = "nodejs";

const PER_PROGRAM = 40;
const SHOWN = 80;
const KEEP_MS = 30_000;

type Program = keyof typeof SOLANA.programs;
const PROGRAMS = Object.entries(SOLANA.programs) as [Program, string][];
const coders = new Map<Program, BorshInstructionCoder>(PROGRAMS.map(([role]) => [role, new BorshInstructionCoder((IDLS as Record<string, Idl>)[role])]));

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
  const found: { role: Program; name: string; data: Record<string, any>; peer: number | null }[] = [];
  for (const ix of tx.transaction.message.compiledInstructions) {
    const program = keys.get(ix.programIdIndex)?.toBase58();
    const role = PROGRAMS.find(([, id]) => id === program)?.[0];
    if (!role) continue;
    const decoded = coders.get(role)!.decode(Buffer.from(ix.data));
    if (!decoded) continue;
    const peer = ix.accountKeyIndexes.map((i) => CONFIGS.get(keys.get(i)?.toBase58() ?? "")).find((p) => p !== undefined) ?? null;
    found.push({ role, name: decoded.name, data: decoded.data as Record<string, any>, peer });
  }
  if (!found.length || found.every((f) => f.peer !== null && LEFT_OUT.has(f.peer))) return null;
  const said = await Promise.all(found.map((f) => say(connection, f)));
  const order: Record<Role, number> = { guardian: 0, user: 1, operator: 2, protocol: 3 };
  const ranked = said.map((s, i) => ({ ...s, i })).sort((a, b) => order[a.role] - order[b.role] || a.i - b.i);
  return {
    tx: tx.transaction.signatures[0],
    block: tx.slot,
    at: tx.blockTime ?? null,
    from: signer,
    role: ranked[0].role,
    title: ranked[0].title,
    detail: ranked[0].detail,
    also: ranked.slice(1).map((r) => r.title),
  };
}

async function say(connection: Connection, f: { role: Program; name: string; data: Record<string, any>; peer: number | null }): Promise<{ role: Role; title: string; detail: string }> {
  const a = f.data;
  const peer = f.peer !== null ? cap(nameOf(f.peer)) : "its pair";
  const op = (title: string, detail = "") => ({ role: "operator" as Role, title, detail });
  const user = (title: string, detail = "") => ({ role: "user" as Role, title, detail });
  const guard = (title: string, detail = "") => ({ role: "guardian" as Role, title, detail });
  switch (`${f.role}.${f.name}`) {
    // The light client: Bitcoin blocks, checked on Solana.
    case "lightClient.extend":
      return op(`${a.headers?.length ?? "Several"} Bitcoin blocks stored`, "Their proof of work checked on Solana");
    case "lightClient.extend_back":
      return op("Bitcoin block stored (going back)", "Linked to a block already stored");
    case "lightClient.jump":
      return op(`Light client jumped to Bitcoin ${Number(a.height).toLocaleString("en-US")}`, "Linked to a known difficulty epoch");
    case "lightClient.add_epoch_start":
      return op(`Bitcoin difficulty epoch recorded`, `From block ${Number(a.height).toLocaleString("en-US")}`);
    case "lightClient.begin_walk":
    case "lightClient.walk_step":
      return op("Walking back through Bitcoin blocks", "Checking one block descends from another");
    // The protocol: operators and jobs.
    case "protocol.lock_bond":
      return op("Operator bond locked", `${fmt(big(a.amount), 9)} SOL as stake`);
    case "protocol.withdraw_bond":
      return op("Operator bond withdrawn", `${fmt(big(a.amount), 9)} SOL`);
    case "protocol.register_chain_head":
    case "protocol.advance_chain_head":
      return op("Operator chain head set", "Its Bitcoin coin registered");
    case "protocol.open_job":
      return user("Job opened", `An application asked for an operator, ${a.confirmations} Bitcoin confirmations`);
    case "protocol.bid":
      return op("Bid on a job", `${fmt(big(a.amount), 9)} SOL`);
    case "protocol.anchor_job":
      return op("Job anchored to Bitcoin", "The operator's Bitcoin transaction must follow it");
    case "protocol.prove_job":
      return op("Job proven", "Its Bitcoin transaction shown in a stored block");
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
    case "betaBasket.mint":
      return user("Index tokens minted", `${fmt(big(a.amount), 9)}`);
    case "betaBasket.burn":
      return user("Index tokens burned", `${fmt(big(a.amount), 9)}`);
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
