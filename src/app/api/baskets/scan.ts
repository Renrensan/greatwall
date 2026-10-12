// Every BETA basket made on an EVM test network, from the contract's
// BasketCreated events: the contract cannot list its baskets, so they are
// read once, from the block the contract was deployed in, and kept. Each call
// reads at most a bounded number of new blocks, so a long history fills in
// over a few calls. Only networks whose RPC allows log queries over its
// history are listed. Used by /api/baskets/[chain] and the ZEC lane.

import { Interface, JsonRpcProvider } from "ethers";
import { ABIS, network, type NetworkName } from "@ipow/sdk";

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

export type Found = { key: string; creator: string; id: string; beta: string; block: number };
const kept = new Map<string, { to: number; baskets: Found[] }>();


export type Scan = { supported: false } | { supported: true; complete: boolean; scannedTo: number; latest: number; baskets: Found[] };

/** The baskets found on `chain` so far, newest first. Throws when its RPC is
 *  not set or fails; what was read before the failure is kept. */
export async function scanBaskets(chain: string): Promise<Scan> {
  const source = SOURCES[chain];
  if (!source) return { supported: false };
  const url = process.env[source.env];
  if (!url) throw new Error(`${source.env} not set`);
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
    return { supported: true, complete: state.to >= latest, scannedTo: state.to, latest, baskets: [...state.baskets].reverse() };
  } finally {
    kept.set(chain, state);
  }
}
