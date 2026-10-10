// One index's mint and burn history on an EVM test network, from the
// contract's Minted and Burned events (filtered by the index's key), each
// with its block's time. Read from the block the contract was deployed in,
// a bounded number of blocks per request and kept, so a long history fills
// in over a few requests (the caller asks again until `complete`). Only the
// networks of ../route.ts, whose RPC allows log queries over history.
//
//   GET /api/baskets/<chain>/activity?key=0x…
//   -> { supported, complete, events: [{ t, kind: "mint" | "burn", amount }] }

import { NextResponse } from "next/server";
import { Interface, JsonRpcProvider } from "ethers";
import { ABIS, network, type NetworkName } from "@ipow/sdk";

export const runtime = "nodejs";

const SOURCES: Record<string, { env: string; from: number; chunk: number }> = {
  ethereum: { env: "ETH_TESTNET_RPC_URL", from: 11_829_553, chunk: 10_000 },
  base: { env: "BASE_TESTNET_RPC_URL", from: 47_591_492, chunk: 500 },
  // BetaBaskets redeployed on 2026-10-09: the first block with its code.
  tempo: { env: "TEMPO_TESTNET_RPC_URL", from: 38_860_595, chunk: 10_000 },
};
const MAX_QUERIES = 40;

type Event = { t: number; kind: "mint" | "burn"; amount: string };
const kept = new Map<string, { to: number; events: Event[] }>();
const blockTime = new Map<string, number>();

export async function GET(req: Request, { params }: { params: Promise<{ chain: string }> }) {
  const { chain } = await params;
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) return NextResponse.json({ error: "key is 0x and 64 hex digits" }, { status: 400 });
  const source = SOURCES[chain];
  if (!source) return NextResponse.json({ supported: false, complete: true, events: [] });
  const url = process.env[source.env];
  if (!url) return NextResponse.json({ error: `${source.env} not set` }, { status: 500 });

  const d = network(`${chain}-testnet` as NetworkName);
  const provider = new JsonRpcProvider(url, d.chainId, { staticNetwork: true });
  const iface = new Interface(ABIS.betaBaskets as any);
  const minted = iface.getEvent("Minted")!.topicHash;
  const burned = iface.getEvent("Burned")!.topicHash;
  const id = `${chain}:${key.toLowerCase()}`;
  const state = kept.get(id) ?? { to: source.from - 1, events: [] };

  try {
    const latest = await provider.getBlockNumber();
    let queries = 0;
    while (state.to < latest && queries < MAX_QUERIES) {
      const fromBlock = state.to + 1;
      const toBlock = Math.min(latest, fromBlock + source.chunk - 1);
      // Either event, of this index only (its key is the first indexed topic).
      const logs = await provider.getLogs({ address: d.betaBaskets, topics: [[minted, burned], key], fromBlock, toBlock });
      for (const log of logs) {
        const e = iface.parseLog(log)!;
        const b = `${chain}:${log.blockNumber}`;
        if (!blockTime.has(b)) blockTime.set(b, (await provider.getBlock(log.blockNumber))!.timestamp);
        state.events.push({ t: blockTime.get(b)!, kind: e.name === "Minted" ? "mint" : "burn", amount: e.args.amount.toString() });
      }
      state.to = toBlock;
      queries++;
    }
    kept.set(id, state);
    return NextResponse.json({ supported: true, complete: state.to >= latest, events: state.events });
  } catch (e: any) {
    kept.set(id, state);
    return NextResponse.json({ error: e?.shortMessage ?? e?.message ?? String(e) }, { status: 502 });
  }
}
