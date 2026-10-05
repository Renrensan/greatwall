// A conversion between two programmable networks is a tunnel (iPoW repo,
// docs/drafts/ipow-conversion-tunnel.md). The SDK has the client of the
// operator's tunnel API, the buy's memo that names the sale, and the
// estimates' arithmetic; this file adds what is this app's: the names its
// networks have at the node, the server route that holds the node's key,
// and the record in this browser that links a buy to its source network.

import {
  NATIVE,
  TunnelApi,
  coinFor as coinForAsset,
  fromUnits,
  satsFor as satsForAsset,
  toUnits,
  tunnelMemo,
  type TunnelAsset as SdkTunnelAsset,
} from "@ipow/sdk";

import type { SupportedChain } from "@/app/network-provider";

export { NATIVE, fromUnits, toUnits };

/** This app's way to the operator node's tunnel API: its server adds the key. */
const api = new TunnelApi("/api/tunnel", { timeoutMs: 60_000 });

/** The node's names for the networks it serves (its settings' `networks`). */
const NODE_NETWORK: Partial<Record<SupportedChain, string>> = {
  ethereum: process.env.NEXT_PUBLIC_TUNNEL_NETWORK_ETHEREUM ?? "ethereum-sepolia",
  solana: process.env.NEXT_PUBLIC_TUNNEL_NETWORK_SOLANA ?? "solana-devnet",
  base: process.env.NEXT_PUBLIC_TUNNEL_NETWORK_BASE ?? "base-sepolia",
  robinhood: process.env.NEXT_PUBLIC_TUNNEL_NETWORK_ROBINHOOD ?? "robinhood-testnet",
  hyperliquid: process.env.NEXT_PUBLIC_TUNNEL_NETWORK_HYPERLIQUID ?? "hyperliquid-testnet",
};

function nodeName(chain: SupportedChain): string {
  const n = NODE_NETWORK[chain];
  if (!n) throw new Error(`No tunnel to or from ${chain} yet`);
  return n;
}

/** An asset the operator trades, with the app's chain it is on. */
export type TunnelAsset = SdkTunnelAsset & { chain: SupportedChain };

export type TunnelAssets = {
  /** By network; a network the operator does not serve is absent. */
  byChain: Partial<Record<SupportedChain, TunnelAsset[]>>;
  /** The most sats one tunnel moves. */
  maxSats: bigint;
};

let assets: { at: number; value: Promise<TunnelAssets> } | null = null;

/** What the operator trades, kept a minute. Empty when it does not answer. */
export function tunnelAssets(): Promise<TunnelAssets> {
  if (!assets || Date.now() - assets.at > 60_000) {
    const value = api
      .assets()
      .then((r) => {
        const byChain: TunnelAssets["byChain"] = {};
        for (const [name, list] of Object.entries(r.networks)) {
          const chain = (Object.keys(NODE_NETWORK) as SupportedChain[]).find((c) => NODE_NETWORK[c] === name);
          if (chain) byChain[chain] = list.map((a) => ({ ...a, chain }));
        }
        return { byChain, maxSats: r.maxSats };
      })
      .catch((e) => {
        assets = null;
        console.warn("The operator's assets were not read:", e);
        return { byChain: {}, maxSats: BigInt(0) };
      });
    assets = { at: Date.now(), value };
  }
  return assets.value;
}

/** The operator's price of `token` on `chain`, or null when it does not trade it. */
export async function assetOf(chain: SupportedChain, token = NATIVE): Promise<TunnelAsset | null> {
  const list = (await tunnelAssets()).byChain[chain] ?? [];
  const want = token.toLowerCase();
  return list.find((a) => a.token.toLowerCase() === want) ?? null;
}

/** Sats the operator pays for `amount` (a decimal string) of `token` on `chain`. */
export async function satsFor(chain: SupportedChain, token: string, amount: string): Promise<string | null> {
  const a = await assetOf(chain, token);
  return a ? satsForAsset(a, amount).toString() : null;
}

/** `token` on `chain` the operator gives for `sats`, as a decimal number. */
export async function coinFor(chain: SupportedChain, token: string, sats: number): Promise<number | null> {
  const a = await assetOf(chain, token);
  return a ? coinForAsset(a, sats) : null;
}

/** What the operator gives for `amountIn` (smallest units) of `fromToken`
 *  on `from`: the sats between the two networks, the destination's amount
 *  of `token` (smallest units), and whether it could take the tunnel now. */
export function tunnelQuote(from: SupportedChain, fromToken: string, amountIn: bigint, to: SupportedChain, token = NATIVE) {
  return api.quote(nodeName(from), fromToken, amountIn, nodeName(to), token);
}

/** The memo a tunnel's buy carries, naming the sale that will pay it, for
 *  the operator to read from the chain. */
export function tunnelMemoFor(from: SupportedChain, fromToken: string, amountIn: bigint): string {
  return tunnelMemo(nodeName(from), fromToken, amountIn);
}

export type Tunnel = {
  fromChain: SupportedChain;
  /** The coin sold on the source: `native` or a token's address, with how
   *  it is shown, and the wallet that will sell it (when connected). */
  fromToken: string;
  fromSymbol?: string;
  fromDecimals?: number;
  sender?: string | null;
  toChain: SupportedChain;
  /** The coin bought on the destination, with how it is shown. */
  token: string;
  toSymbol?: string;
  toDecimals?: number;
  /** The buy on the destination, opened by the user. */
  buyId: string;
  /** The amount sold on the source, in its smallest units. */
  amountIn: string;
  sats: string;
  /** What the buy must give, and to whom: checked before the user signs. */
  amountOut: string;
  recipient: string;
  /** The sell on the source, once the user made it. */
  sellId: string | null;
  at: number;
};

const KEY = "greatwall:convert:tunnels";

function all(): Tunnel[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list: Tunnel[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  } catch {}
}

export function saveTunnel(t: Omit<Tunnel, "at" | "sellId">) {
  save([{ ...t, sellId: null, at: Date.now() }, ...all().filter((x) => !(x.toChain === t.toChain && x.buyId === t.buyId))]);
}

/** Forgets a buy the operator did not take as a tunnel's. */
export function removeTunnel(toChain: SupportedChain, buyId: string) {
  save(all().filter((x) => !(x.toChain === toChain && x.buyId === buyId)));
}

export function setTunnelSell(toChain: SupportedChain, buyId: string, sellId: string) {
  save(all().map((x) => (x.toChain === toChain && x.buyId === buyId ? { ...x, sellId } : x)));
}

/** The tunnel a swap is part of, and which leg it is. */
export function tunnelOf(chain: SupportedChain, id: string): { tunnel: Tunnel; leg: "sell" | "buy" } | null {
  for (const t of all()) {
    if (t.toChain === chain && t.buyId === id) return { tunnel: t, leg: "buy" };
    if (t.fromChain === chain && t.sellId === id) return { tunnel: t, leg: "sell" };
  }
  return null;
}
