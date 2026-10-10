// The protocol explorer's view of one EVM network: what its iPoW contracts
// hold now, and what they did lately, read from the chain itself.
//
// - Now: jobs and challenges opened on the protocol, and for each vault
//   pair its locks, burns, attests, claims, checkpoints and genesis state.
// - Lately: every event of the light client, the protocol, the vaults and
//   the applications (Conversion, BetaBaskets), newest first, each told in
//   plain words. The history is kept here and grows: each request reads the
//   blocks made since the last one, then reaches further back, a bounded
//   number of log queries in all, until KEEP_EVENTS are held. The light
//   client's latest stored Bitcoin block is the newest BlockStored held.
//
// Answers are kept 30 seconds: every visitor reads the same chain.

import { NextResponse } from "next/server";
import { Contract, Interface, JsonRpcProvider, type Log } from "ethers";
import { ABIS, getBasket, network, type NetworkName } from "@ipow/sdk";

import { SOURCES, assetsOf, cap, nameOf } from "@/components/integrator/ipow/explorer";

export const runtime = "nodejs";




/** Log queries one request may make (more on a network's first read, so
 *  its page opens full), the events held per network, and the events shown. */
const MAX_QUERIES = 16;
const FIRST_QUERIES = 48;
const KEEP_EVENTS = 200;
const SHOWN_EVENTS = 80;
const KEEP_MS = 30_000;

export type Layer = "bitcoin" | "protocol" | "vault" | "app";
export type ExplorerEvent = {
  layer: Layer;
  /** The contract's role and the event's name, e.g. "protocol.JobOpened". */
  kind: string;
  title: string;
  detail: string;
  block: number;
  tx: string;
  logIndex: number;
  /** Seconds since 1970, when the block was made. */
  at: number | null;
  /** The vault pair's peer, for vault events. */
  peer?: string;
};
/** Who an action is: an operator doing its duty, a user, a guardian keeping
 *  operators honest, or the protocol itself closing what time decided. */
export type Role = "operator" | "user" | "guardian" | "protocol";
/** One transaction: its main action, everything else it did, and its sender. */
export type ExplorerTx = {
  tx: string;
  block: number;
  at: number | null;
  from: string | null;
  role: Role;
  title: string;
  detail: string;
  /** The other things the same transaction did, in plain words. */
  also: string[];
  /** What its main action is, as `<contract or program>.<event or instruction>`:
   *  the key the page explains it by (explorerGlossary.ts). */
  kind: string;
  /** The same for each of `also`. */
  alsoKinds: string[];
};

const ROLE_OF: Record<string, Role> = {
  "lightClient.BlockStored": "operator",
  "lightClient.EpochStartRecorded": "operator",
  "lightClient.Jumped": "operator",
  "protocol.BondLocked": "operator",
  "protocol.BondWithdrawn": "operator",
  "protocol.ChainHeadSet": "operator",
  "protocol.BidPlaced": "operator",
  "protocol.JobAnchored": "operator",
  "protocol.JobProven": "operator",
  "protocol.JobSettled": "operator",
  "protocol.Attested": "operator",
  "protocol.JobSlashed": "guardian",
  "protocol.ForkChallenged": "guardian",
  "protocol.ParentAsked": "guardian",
  "protocol.ChallengeWon": "guardian",
  "protocol.ChallengeFailed": "protocol",
  "protocol.JobExpired": "protocol",
  "vault.ChainRegistered": "operator",
  "vault.BondChanged": "operator",
  "vault.DepositsChanged": "operator",
  "vault.MessageBatch": "operator",
  "vault.MessageProcessed": "operator",
  "vault.ClaimOpened": "operator",
  "vault.Answered": "operator",
  "vault.RealBlock": "operator",
  "vault.Objected": "guardian",
  "vault.Slashed": "guardian",
  "vault.ClaimDecided": "protocol",
  "vaultHome.FastPaid": "operator",
  "vaultHome.RequestPaid": "operator",
  "vaultReceipts.Attested": "operator",
  "vaultReceipts.Issued": "operator",
  "vaultReceipts.AttestLinked": "operator",
  "vaultReceipts.AttestSettled": "operator",
  "vaultReceipts.GenesisIssued": "operator",
  "vaultReceipts.GenesisReceipt": "operator",
  "vaultReceipts.GenesisFinalized": "operator",
  "vaultReceipts.ReceiptMade": "operator",
  "conversion.Funded": "operator",
};
/** The rank of a role when one transaction does several things: what it's for. */
const RANK: Record<Role, number> = { guardian: 0, user: 1, operator: 2, protocol: 3 };
const senders = new Map<string, string | null>();

export type PairView = { peer: string; locks: number; burns: number; attests: number; claims: number; checkpoints: number; genesisOpen: boolean; genesisEnd: number };
export type ExplorerView = {
  chain: string;
  number: number;
  latestBlock: number;
  scannedFrom: number;
  lightClient: { height: number; hash: string; at: number | null } | null;
  jobs: number;
  challenges: number;
  pairs: PairView[];
  events: ExplorerEvent[];
  txs: ExplorerTx[];
};

const kept = new Map<string, { at: number; view: ExplorerView }>();
/** The logs read so far per network: blocks bottom..top, newest first. */
const history = new Map<string, { top: number; bottom: number; logs: Log[] }>();
const blockTimes = new Map<string, number | null>();

const fmt = (raw: bigint, decimals: number) => {
  const s = (Number(raw) / 10 ** decimals).toLocaleString("en-US", { maximumFractionDigits: 6 });
  return s;
};
/** Each index's symbol, by network and key, read once. */
const indexSymbols = new Map<string, Promise<string>>();

/** A Bitcoin hash as Bitcoin shows it: the contracts keep a block hash or a
 *  txid in Bitcoin's internal byte order, which reads backwards (a block's
 *  zeros last); shown reversed, without 0x, a block hash starts with its zeros. */
const btcHash = (x: string) => {
  const hex = x.replace(/^0x/, "");
  return /^[0-9a-fA-F]{64}$/.test(hex) ? (hex.match(/../g) ?? []).reverse().join("") : hex;
};
/** The same, shortened: its first 8 and last 6 characters. */
const btcShort = (x: string) => {
  const h = btcHash(x);
  return h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h;
};

const short = (x: string) => (x && x.length > 12 ? `${x.slice(0, 6)}…${x.slice(-4)}` : x);

export async function GET(_req: Request, { params }: { params: Promise<{ chain: string }> }) {
  const { chain } = await params;
  const source = SOURCES[chain];
  if (!source) return NextResponse.json({ error: `${chain} has no explorer` }, { status: 404 });
  const hit = kept.get(chain);
  if (hit && Date.now() - hit.at < KEEP_MS) return NextResponse.json(hit.view);
  const url = process.env[source.env];
  if (!url) return NextResponse.json({ error: `${source.env} not set` }, { status: 500 });

  let d: ReturnType<typeof network>;
  try {
    d = network(`${chain}-testnet` as NetworkName);
  } catch {
    return NextResponse.json({ error: `${chain} is not deployed` }, { status: 404 });
  }
  const provider = new JsonRpcProvider(url, d.chainId, { staticNetwork: true });

  // Every contract of the network, its role, and the interface to read its logs.
  const vaults = d.vaults as readonly { peer: number; vault: string; home: string; receipts: string }[];
  const roles: { address: string; role: keyof typeof ABIS; layer: Layer; peer?: number; pair?: number }[] = [
    { address: d.lightClient, role: "lightClient", layer: "bitcoin" },
    { address: d.protocol, role: "protocol", layer: "protocol" },
    ...(d.conversion ? [{ address: d.conversion, role: "conversion" as const, layer: "app" as const }] : []),
    ...(d.betaBaskets ? [{ address: d.betaBaskets, role: "betaBaskets" as const, layer: "app" as const }] : []),
    ...vaults.flatMap((v, pair) => [
      { address: v.vault, role: "vault" as const, layer: "vault" as const, peer: v.peer, pair },
      { address: v.home, role: "vaultHome" as const, layer: "vault" as const, peer: v.peer, pair },
      { address: v.receipts, role: "vaultReceipts" as const, layer: "vault" as const, peer: v.peer, pair },
    ]),
  ];
  const byAddress = new Map(roles.map((r) => [r.address.toLowerCase(), r]));
  const ifaces = new Map<string, Interface>();
  const ifaceOf = (role: keyof typeof ABIS) => {
    let i = ifaces.get(role);
    if (!i) ifaces.set(role, (i = new Interface(ABIS[role] as never)));
    return i;
  };

  try {
    const latest = await provider.getBlockNumber();

    // Now: the counts each contract keeps.
    const protocol = new Contract(d.protocol, ABIS.protocol as never, provider);
    const [jobs, challenges, pairs] = await Promise.all([
      protocol.jobCount().then(Number).catch(() => 0),
      protocol.challengeCount().then(Number).catch(() => 0),
      Promise.all(
        vaults.map(async (v): Promise<PairView> => {
          const core = new Contract(v.vault, ABIS.vault as never, provider);
          const home = new Contract(v.home, ABIS.vaultHome as never, provider);
          const receipts = new Contract(v.receipts, ABIS.vaultReceipts as never, provider);
          const n = (p: Promise<unknown>) => p.then(Number).catch(() => 0);
          const [locks, burns, attests, claims, checkpoints, genesisOpen, genesisEnd] = await Promise.all([
            n(home.lockCount()),
            n(receipts.burnCount()),
            n(receipts.attestCount()),
            n(core.claimCount()),
            n(core.checkpointCount()),
            receipts.genesisOpen().catch(() => false),
            n(receipts.genesisEnd()),
          ]);
          return { peer: nameOf(v.peer), locks, burns, attests, claims, checkpoints, genesisOpen: Boolean(genesisOpen), genesisEnd };
        }),
      ),
    ]);

    // Lately: the blocks made since the last read, then further back.
    const addresses = roles.map((r) => r.address);
    const h = history.get(chain) ?? { top: latest, bottom: latest + 1, logs: [] as Log[] };
    let chunk = source.chunk;
    let queries = 0;
    const budget = h.logs.length ? MAX_QUERIES : FIRST_QUERIES;
    /** Logs of blocks from..to, or of a shorter span from `from` when the
     *  provider refuses the whole: the logs, and the span actually read. */
    const read = async (from: number, to: number): Promise<{ logs: Log[]; from: number; to: number }> => {
      for (;;) {
        try {
          queries++;
          return { logs: await provider.getLogs({ address: addresses, fromBlock: from, toBlock: to }), from, to };
        } catch (e) {
          // A provider that refuses the span: half of it, while it is above 100 blocks.
          if (chunk <= 100 || queries >= budget) throw e;
          chunk = Math.floor(chunk / 2);
          if (to - from + 1 > chunk) to = from + chunk - 1;
        }
      }
    };
    const newest = (logs: Log[]) => logs.sort((a, b) => b.blockNumber - a.blockNumber || b.index - a.index);
    // Newer blocks first (the latest are what a visitor came for).
    let from = h.top + 1;
    if (h.logs.length || h.bottom <= h.top) {
      while (from <= latest && queries < budget) {
        const to = Math.min(latest, from + chunk - 1);
        const got = await read(from, to);
        h.logs.unshift(...newest(got.logs));
        h.top = got.to;
        from = got.to + 1;
      }
    } else {
      h.top = latest;
    }
    // Then back in time, until enough are held.
    while (h.logs.length < KEEP_EVENTS && h.bottom > 1 && queries < budget) {
      const to = h.bottom - 1;
      const start = Math.max(1, to - chunk + 1);
      const got = await read(start, to);
      // Shortened (the provider refused the span): it would leave a gap
      // below the history, so it is read again at the smaller span.
      if (got.to < to) continue;
      h.logs.push(...newest(got.logs));
      h.bottom = got.from;
    }
    h.logs = h.logs.slice(0, KEEP_EVENTS);
    history.set(chain, h);
    const scannedFrom = h.bottom;
    const shown = h.logs.slice(0, SHOWN_EVENTS);

    // When each block was made, for the events shown (kept: blocks don't change).
    await Promise.all(
      [...new Set(shown.map((l) => l.blockNumber))]
        .filter((b) => !blockTimes.has(`${chain}:${b}`))
        .map(async (b) => {
          const blk = await provider.getBlock(b).catch(() => null);
          if (blk) blockTimes.set(`${chain}:${b}`, Number(blk.timestamp));
        }),
    );
    const times = new Map(shown.map((l) => [l.blockNumber, blockTimes.get(`${chain}:${l.blockNumber}`) ?? null]));

    const events: ExplorerEvent[] = [];
    let lightClient: ExplorerView["lightClient"] = null;
    const lcIface = ifaceOf("lightClient");
    const newestStored = h.logs.find((l) => l.address.toLowerCase() === d.lightClient.toLowerCase() && l.topics[0] === lcIface.getEvent("BlockStored")!.topicHash);
    if (newestStored) {
      const a = lcIface.parseLog(newestStored)!.args;
      lightClient = { height: Number(a.height), hash: btcHash(String(a.blockHash)), at: blockTimes.get(`${chain}:${newestStored.blockNumber}`) ?? null };
    }
    // An index's own events, named by the index once its symbol is read.
    const indexEvents: { i: number; key: string; name: string; a: Record<string, any> }[] = [];
    for (const log of shown) {
      const r = byAddress.get(log.address.toLowerCase());
      if (!r) continue;
      let parsed;
      try {
        parsed = ifaceOf(r.role).parseLog(log);
      } catch {
        continue;
      }
      if (!parsed) continue;
      const a = parsed.args as unknown as Record<string, any>;
      const assets = r.pair !== undefined ? await assetsOf(chain, provider, d, r.pair) : null;
      const asset = (n: unknown) => assets?.get(Number(n));
      const peer = r.peer !== undefined ? cap(nameOf(r.peer)) : "";
      const [title, detail] = describe(r.role, parsed.name, a, { asset, peer, here: cap(chain), coin: source.coin });
      events.push({
        layer: r.layer,
        kind: `${r.role}.${parsed.name}`,
        title,
        detail,
        block: log.blockNumber,
        tx: log.transactionHash,
        logIndex: log.index,
        at: times.get(log.blockNumber) ?? null,
        ...(r.peer !== undefined ? { peer: nameOf(r.peer) } : {}),
      });
      if (r.role === "betaBaskets" && a.key && parsed.name !== "BasketCreated") indexEvents.push({ i: events.length - 1, key: String(a.key), name: parsed.name, a });
    }
    await Promise.all(
      indexEvents.map(async ({ i, key, name, a }) => {
        const id = `${chain}:${key}`;
        if (!indexSymbols.has(id)) indexSymbols.set(id, getBasket(provider, d, key).then((b) => b.symbol || "BETA").catch(() => "index"));
        const sym = await indexSymbols.get(id)!;
        const by = short(String(a.user ?? a.receiver ?? ""));
        if (name === "Minted") events[i].title = `${fmt(BigInt(a.amount), 9)} ${sym} minted`;
        else if (name === "Burned") events[i].title = `${fmt(BigInt(a.amount), 9)} ${sym} burned`;
        else if (name === "FeesCollected") [events[i].title, events[i].detail] = [`${sym} creator fees collected`, `Part ${Number(a.index) + 1}, by ${by}`];
        else if (name === "Collected") [events[i].title, events[i].detail] = [`${sym} owed part collected`, `Part ${Number(a.index) + 1}, by ${by}`];
      }),
    );

    // One row per transaction: its main action first, and who sent it.
    const byTx = new Map<string, ExplorerEvent[]>();
    for (const e of events) byTx.set(e.tx, [...(byTx.get(e.tx) ?? []), e]);
    await Promise.all(
      [...byTx.keys()]
        .filter((t) => !senders.has(t))
        .map(async (t) => {
          const tx = await provider.getTransaction(t).catch(() => null);
          senders.set(t, tx?.from ?? null);
        }),
    );
    const txs: ExplorerTx[] = [...byTx.entries()].map(([tx, es]) => {
      const ranked = [...es].sort((a, b) => RANK[ROLE_OF[a.kind] ?? "user"] - RANK[ROLE_OF[b.kind] ?? "user"]);
      const main = ranked[0];
      return {
        tx,
        block: main.block,
        at: main.at,
        from: senders.get(tx) ?? null,
        role: ROLE_OF[main.kind] ?? "user",
        title: main.title,
        detail: main.detail,
        also: ranked.slice(1).map((e) => e.title),
        kind: main.kind,
        alsoKinds: ranked.slice(1).map((e) => e.kind),
      };
    });
    txs.sort((a, b) => b.block - a.block);

    const view: ExplorerView = { chain, number: d.number, latestBlock: latest, scannedFrom, lightClient, jobs, challenges, pairs, events, txs };
    kept.set(chain, { at: Date.now(), view });
    return NextResponse.json(view);
  } catch (e: any) {
    if (hit) return NextResponse.json(hit.view);
    return NextResponse.json({ error: e?.shortMessage ?? e?.message ?? String(e) }, { status: 502 });
  }
}

type Ctx = { asset: (n: unknown) => { symbol: string; decimals: number } | undefined; peer: string; here: string; coin: string };

/** An event in plain words: a title, and one line of detail. */
function describe(role: string, name: string, a: Record<string, any>, c: Ctx): [string, string] {
  const amount = (n: unknown, v: unknown) => {
    const x = c.asset(n);
    return x ? `${fmt(BigInt(v as bigint), x.decimals)} ${x.symbol}` : `${String(v)} units of asset ${String(n)}`;
  };
  const coin = (v: unknown) => `${fmt(BigInt(v as bigint), 18)} ${c.coin}`;
  switch (`${role}.${name}`) {
    // Bitcoin, as the light client keeps it.
    case "lightClient.BlockStored":
      return [`Bitcoin block ${Number(a.height).toLocaleString("en-US")} added`, `${c.here} checked its proof of work and saved it: hash ${btcShort(String(a.blockHash))}`];
    case "lightClient.EpochStartRecorded":
      return [`Bitcoin difficulty period recorded`, `Starting at block ${Number(a.height).toLocaleString("en-US")}: every block of the period must meet its difficulty`];
    case "lightClient.Jumped":
      return [`Caught up with Bitcoin`, `${c.here}'s copy of Bitcoin starts again from a recent block, linked to a known difficulty period`];
    // The protocol: operators and jobs.
    case "protocol.ApplicationRegistered":
      return [`Application registered`, `${short(String(a.application))} can now open jobs`];
    case "protocol.BondLocked":
      return [`Operator bond locked`, `${short(String(a.operator))} locked ${coin(a.amount)} as stake`];
    case "protocol.BondWithdrawn":
      return [`Operator bond withdrawn`, `${short(String(a.operator))} withdrew ${coin(a.amount)}`];
    case "protocol.ChainHeadSet":
      return [`Operator's Bitcoin marker set`, `${short(String(a.operator))} named its Bitcoin coin ${btcShort(String(a.txid))}:${a.vout}, which its jobs' transactions spend in turn`];
    case "protocol.JobOpened":
      return [`Checkpoint #${a.jobId} requested`, `A job for an operator to prove a recent Bitcoin block: stake ${coin(a.escrow)}, ${a.confirmations} confirmations`];
    case "protocol.BidPlaced":
      return [`Operator took job #${a.jobId}`, `${short(String(a.operator))} bid ${coin(a.amount)} to do it`];
    case "protocol.JobAnchored":
      return [`Job #${a.jobId} started`, `Anchored at Bitcoin block ${Number(a.height).toLocaleString("en-US")}: the operator now writes a Bitcoin transaction after it`];
    case "protocol.JobProven":
      return [`Job #${a.jobId} proven`, `Its Bitcoin transaction ${btcShort(String(a.txid))} shown in a real block; anyone can challenge it for 36 hours`];
    case "protocol.JobSettled":
      return [`Job #${a.jobId} settled`, `${short(String(a.operator))} was paid ${coin(a.paid)}`];
    case "protocol.JobExpired":
      return [`Job #${a.jobId} expired`, `No operator took it in time`];
    case "protocol.JobSlashed":
      return [`Operator slashed on job #${a.jobId}`, `${short(String(a.operator))} missed its duty; ${short(String(a.guardian))} proved it`];
    case "protocol.Attested":
      return [`Attester backed job #${a.jobId}`, `${short(String(a.attester))} put up ${coin(a.amount)} of its own`];
    case "protocol.ForkChallenged":
      return [`Proof challenged`, `${short(String(a.guardian))} challenged job #${a.jobId}'s Bitcoin block`];
    case "protocol.ChallengeWon":
      return [`Challenge won`, `Guardian ${short(String(a.guardian))} was right`];
    case "protocol.ChallengeFailed":
      return [`Challenge failed`, `The operator's proof stood`];
    case "protocol.Credited":
      return [`Credit`, `${short(String(a.to))} credited ${coin(a.amount)}`];
    case "protocol.CreditWithdrawn":
      return [`Credit withdrawn`, `${short(String(a.to))} withdrew ${coin(a.amount)}`];
    // The vault: locks here, receipts of the peer's, and the claims between them.
    case "vaultHome.Locked":
      return [`${amount(a.asset, a.amount)} locked for ${c.peer}`, `Lock #${a.lockId} by ${short(String(a.owner))}; its receipt is issued on ${c.peer}`];
    case "vaultHome.FastPaid":
      return [`Paid at once (fast path)`, `${amount(a.asset, a.amount)} to ${short(String(a.to))}, backed by attester ${short(String(a.attester))}`];
    case "vaultHome.RequestPaid":
      return [`Unlock paid`, `Request #${a.requestId} paid ${short(String(a.to))} after claim #${a.claimId}`];
    case "vaultHome.LockReturned":
      return [`Lock #${a.lockId} returned`, `Given back to ${short(String(a.owner))}`];
    case "vaultHome.AssetRegistered":
      return [`Asset registered`, `Token ${short(String(a.token))} can now be locked for ${c.peer}`];
    case "vaultReceipts.Issued":
      return [`Receipt issued from ${c.peer}`, `For ${c.peer}'s lock #${a.lockId}, to ${short(String(a.to))}, after claim #${a.claimId}`];
    case "vaultReceipts.Attested":
      return [`Receipt paid at once (fast path)`, `Attester ${short(String(a.attester))} backed lock #${a.lockId} from ${c.peer}`];
    case "vaultReceipts.Burned":
      return [`${amount(a.asset, a.amount)} unlocking to ${c.peer}`, `Burn #${a.requestId} by ${short(String(a.owner))}`];
    case "vaultReceipts.GenesisIssued":
      return [`Genesis receipt issued`, `${amount(a.asset, a.value)} from ${c.peer}'s lock #${a.lockId}`];
    case "vaultReceipts.GenesisReceipt":
      return [`Genesis: receipt made`, `For ${c.peer}'s asset ${a.asset}`];
    case "vaultReceipts.GenesisFinalized":
      return [`Genesis finalized`, `No more genesis receipts can ever be made here`];
    case "vaultReceipts.ReceiptMade":
      return [`Receipt token made`, `For ${c.peer}'s asset ${a.asset}: ${short(String(a.receipt))}`];
    case "vaultReceipts.GivenUp":
      return [`Lock #${a.lockId} given up`, `No receipt will be issued`];
    case "vault.MessageBatch":
      return [`Message batch ${a.index} carried`, `Operator ${short(String(a.operator))} brought records from ${c.peer}`];
    case "vault.MessageProcessed":
      return [a.truthful ? `Message ${a.index} judged true` : `Message ${a.index} judged false`, `Bitcoin transaction ${btcShort(String(a.txid))} checked against ${c.peer}'s records`];
    case "vault.ClaimOpened":
      return [`Claim #${a.claimId} opened`, `Operator ${short(String(a.operator))} states a fact about ${c.peer}`];
    case "vault.ClaimDecided":
      return [a.accepted ? `Claim #${a.claimId} accepted` : `Claim #${a.claimId} rejected`, `The objection window closed`];
    case "vault.Objected":
      return [`Claim #${a.claimId} objected to`, `By ${short(String(a.by))}`];
    case "vault.Answered":
      return [`Objection answered`, `Claim #${a.claimId}, by ${short(String(a.by))}`];
    case "vault.Slashed":
      return [`Vault operator slashed`, `${short(String(a.operator))}, proven by ${short(String(a.submitter))}`];
    case "vault.ChainRegistered":
      return [`Operator joined the pair with ${c.peer}`, `${short(String(a.operator))} registered its Bitcoin chain`];
    case "vault.BondChanged":
      return [`Vault bond changed`, `${short(String(a.operator))} now bonds ${String(a.bond)} on asset ${a.asset}`];
    case "vault.DepositsChanged":
      return [`Vault deposits changed`, `${short(String(a.operator))}: ${coin(a.deposits)}`];
    case "vault.RealBlock":
      return [`Bitcoin block certified`, `Counts as real for the pair with ${c.peer}: messages below it can be accepted`];
    // Applications on top.
    case "conversion.Sold":
      return [`Conversion: sell #${a.swapId}`, `${short(String(a.user))} sells for ${Number(a.sats).toLocaleString("en-US")} sats on Bitcoin (job #${a.jobId})`];
    case "conversion.Bought":
      return [`Conversion: buy #${a.swapId}`, `${short(String(a.user))} buys with ${Number(a.sats).toLocaleString("en-US")} sats (job #${a.jobId})`];
    case "conversion.Funded":
      return [`Conversion #${a.swapId} funded`, `Operator ${short(String(a.operator))} took it`];
    case "conversion.Completed":
      return [`Conversion #${a.swapId} completed`, `Paid to ${short(String(a.to))}`];
    case "conversion.Refunded":
      return [`Conversion #${a.swapId} refunded`, `Returned to its owner`];
    case "conversion.Cancelled":
      return [`Conversion #${a.swapId} cancelled`, ``];
    case "conversion.Reclaimed":
      return [`Conversion #${a.swapId} reclaimed`, ``];
    case "conversion.PaymentWindow":
      return [`Conversion #${a.swapId}: payment window`, `Bitcoin blocks ${Number(a.payFrom).toLocaleString("en-US")} to ${Number(a.payTo).toLocaleString("en-US")}`];
    case "betaBaskets.BasketCreated":
      return [`Index ${String(a.symbol) || "token"} created`, `"${String(a.name)}" by ${short(String(a.creator))}`];
    case "betaBaskets.Minted":
      return [`Index tokens minted`, `${fmt(BigInt(a.amount), 9)} by ${short(String(a.user))}`];
    case "betaBaskets.Burned":
      return [`Index tokens burned`, `${fmt(BigInt(a.amount), 9)} by ${short(String(a.user))}`];
    default:
      return [name.replace(/([a-z])([A-Z])/g, "$1 $2"), ``];
  }
}
