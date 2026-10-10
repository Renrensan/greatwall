// Every BETA basket made on an EVM test network, from the contract's
// BasketCreated events: the contract cannot list its baskets, so this route
// reads the events once, from the block the contract was deployed in, and
// keeps them. Each request reads at most a bounded number of new blocks, so
// a long history fills in over a few requests. Only networks whose RPC
// allows log queries over its history are listed.

import { NextResponse } from "next/server";
import { Interface, JsonRpcProvider } from "ethers";
import { ABIS, network, type NetworkName } from "@ipow/sdk";

export const runtime = "nodejs";

type Source = { env: string; from: number; chunk: number };

/** The networks indexed: their RPC, the block BetaBaskets was deployed in
 *  (read on 2026-10-03; Tempo's on 2026-10-09), and the most blocks one log
 *  query may span there. */
const SOURCES: Record<string, Source> = {
  ethereum: { env: "ETH_TESTNET_RPC_URL", from: 11_829_553, chunk: 10_000 },
  base: { env: "BASE_TESTNET_RPC_URL", from: 47_591_492, chunk: 500 },
  // BetaBaskets redeployed on 2026-10-09: the first block with its code.
  tempo: { env: "TEMPO_TESTNET_RPC_URL", from: 38_860_595, chunk: 10_000 },
};

/** Log queries one request may make, so it answers in a few seconds. */
const MAX_QUERIES = 40;

type Found = { key: string; creator: string; id: string; beta: string; block: number };
const kept = new Map<string, { to: number; baskets: Found[] }>();

export async function GET(_req: Request, { params }: { params: Promise<{ chain: string }> }) {
  const { chain } = await params;
  const source = SOURCES[chain];
  if (!source) return NextResponse.json({ supported: false, baskets: [] });
  const url = process.env[source.env];
  if (!url) return NextResponse.json({ error: `${source.env} not set` }, { status: 500 });

  const d = network(`${chain}-testnet` as NetworkName);
  const provider = new JsonRpcProvider(url, d.chainId, { staticNetwork: true });
  const iface = new Interface(ABIS.betaBaskets as any);
  const topic = iface.getEvent("BasketCreated")!.topicHash;
  const state = kept.get(chain) ?? { to: source.from - 1, baskets: [] };

  try {
    const latest = await provider.getBlockNumber();
    let queries = 0;
    while (state.to < latest && queries < MAX_QUERIES) {
      const fromBlock = state.to + 1;
      const toBlock = Math.min(latest, fromBlock + source.chunk - 1);
      const logs = await provider.getLogs({ address: d.betaBaskets, topics: [topic], fromBlock, toBlock });
      for (const log of logs) {
        const e = iface.parseLog(log)!;
        state.baskets.push({ key: e.args.key, creator: e.args.creator, id: e.args.id.toString(), beta: e.args.beta, block: log.blockNumber });
      }
      state.to = toBlock;
      queries++;
    }
    kept.set(chain, state);
    return NextResponse.json({
      supported: true,
      complete: state.to >= latest,
      scannedTo: state.to,
      latest,
      baskets: [...state.baskets].reverse(),
    });
  } catch (e: any) {
    kept.set(chain, state);
    return NextResponse.json({ error: e?.shortMessage ?? e?.message ?? String(e) }, { status: 502 });
  }
}
