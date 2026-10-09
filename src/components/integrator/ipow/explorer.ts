// What the protocol explorer's readers share (/api/explorer/*): each EVM
// network's RPC and log limits, the protocol's network numbers, and the
// names of a vault pair's assets.

import { JsonRpcProvider as JsonRpcProviderClass, ZeroAddress, type JsonRpcProvider } from "ethers";
import { homeAssets, network, type NetworkName } from "@ipow/sdk";

import { rwaTokensOf } from "./rwaTokens";

export type Source = { env: string; chunk: number; coin: string };

/** Each network: its RPC, the most blocks one log query may span there
 *  (measured 2026-10-09: Robinhood, HyperEVM and Tempo refuse 50,000; the
 *  others took 500,000), and its coin's name. */
export const SOURCES: Record<string, Source> = {
  ethereum: { env: "ETH_TESTNET_RPC_URL", chunk: 100_000, coin: "ETH" },
  base: { env: "BASE_TESTNET_RPC_URL", chunk: 100_000, coin: "ETH" },
  robinhood: { env: "ROBINHOOD_TESTNET_RPC_URL", chunk: 10_000, coin: "ETH" },
  hyperliquid: { env: "HYPERLIQUID_TESTNET_RPC_URL", chunk: 10_000, coin: "HYPE" },
  arbitrum: { env: "ARBITRUM_TESTNET_RPC_URL", chunk: 500_000, coin: "ETH" },
  tempo: { env: "TEMPO_TESTNET_RPC_URL", chunk: 10_000, coin: "pathUSD" },
};

/** Protocol network numbers (D133), by name. */
export const NETWORK_OF: Record<number, string> = { 1: "ethereum", 2: "solana", 3: "base", 4: "robinhood", 5: "polkadot", 6: "hedera", 7: "hyperliquid", 8: "tempo", 9: "arbitrum" };
export const nameOf = (n: number) => NETWORK_OF[n] ?? `network ${n}`;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const assetNames = new Map<string, Map<number, { symbol: string; decimals: number }>>();

/** The assets of a vault pair's home side, by number: the coin, then each registered token. */
export async function assetsOf(chain: string, provider: JsonRpcProvider, d: ReturnType<typeof network>, pair: number) {
  const key = `${chain}:${pair}`;
  const known = assetNames.get(key);
  if (known) return known;
  const out = new Map<number, { symbol: string; decimals: number }>();
  const rwa = rwaTokensOf(chain as never);
  try {
    for (const a of await homeAssets(provider, d, pair)) {
      const token = String(a.token);
      const listed = rwa.find((r) => r.token.toLowerCase() === token.toLowerCase());
      out.set(a.number, { symbol: token === ZeroAddress ? SOURCES[chain].coin : listed?.symbol ?? `asset ${a.number}`, decimals: a.recordDecimals });
    }
    assetNames.set(key, out);
  } catch {
    // Unnamed this time; the feed shows asset numbers instead.
  }
  return out;
}

/** A JSON-RPC reader of an EVM network, on the server, by its name. */
export function evmReader(chain: string): JsonRpcProvider | null {
  const source = SOURCES[chain];
  const url = source && process.env[source.env];
  if (!url) return null;
  const d = network(`${chain}-testnet` as NetworkName);
  return new JsonRpcProviderClass(url, d.chainId, { staticNetwork: true });
}
