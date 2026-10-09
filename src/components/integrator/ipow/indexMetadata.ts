// An index token's metadata (E4) and its parts' names, as the Explore cards
// and an index's own page show them.

import { ZeroAddress } from "ethers";
import { WRAPPED_SOL } from "@ipow/sdk";

import { TICKER, type EvmChain } from "./sdk";
import { rwaTokensOf } from "./rwaTokens";
import { lockPath } from "@/components/integrator/ipow/lockPaths";

export type IndexMetadata = { image: string | null; description: string; website: string | null; twitter: string | null; telegram: string | null };

/** A link to metadata or an image Greatwall hosts (/api/beta/…), read from
 *  this site whatever origin it was written with: a link written while the
 *  server had no public origin (http://0.0.0.0:3001/…, 2026-10-07) cannot be
 *  fetched as it stands, but the files are this server's. */
export function ownHosted(url: string): string | null {
  try {
    const u = new URL(url);
    return /^\/api\/beta\/(metadata|image)\//.test(u.pathname) ? u.pathname : null;
  } catch {
    return null;
  }
}

const httpsOrNull = (v: unknown) => (typeof v === "string" && /^https:\/\/\S+$/.test(v) ? v : null);

/** The metadata at `uri`, or nothing known when it cannot be read (a few
 *  seconds at most). */
export async function readMetadata(uri: string): Promise<IndexMetadata> {
  const none: IndexMetadata = { image: null, description: "", website: null, twitter: null, telegram: null };
  if (!uri) return none;
  try {
    const r = await fetch(ownHosted(uri) ?? uri, { signal: AbortSignal.timeout(5_000) });
    const meta = await r.json();
    let image: string | null = null;
    if (typeof meta?.image === "string") image = ownHosted(meta.image) ?? (/^(https:|data:image\/)/.test(meta.image) ? meta.image : null);
    return {
      image,
      description: typeof meta?.description === "string" ? meta.description : "",
      website: httpsOrNull(meta?.external_url),
      twitter: httpsOrNull(meta?.twitter),
      telegram: httpsOrNull(meta?.telegram),
    };
  } catch {
    return none;
  }
}

/** An asset of the index's own network: its symbol, name and logo, and
 *  whether Greatwall knows it (the coin, or a token it lists). Only a known
 *  asset is priced: any token can call itself ETH. */
export function localAsset(network: string, token: string, fallbackSymbol: string): { symbol: string; name: string; logo: string | null; known: boolean } {
  if (token === ZeroAddress || token === WRAPPED_SOL) {
    const symbol = network === "solana" ? "SOL" : (TICKER[network as EvmChain] ?? fallbackSymbol);
    return { symbol, name: network.charAt(0).toUpperCase() + network.slice(1), logo: `/assets/networks/${network}.png`, known: true };
  }
  const rwa = rwaTokensOf(network as any).find((r) => r.token.toLowerCase() === token.toLowerCase());
  return { symbol: rwa?.symbol ?? fallbackSymbol, name: rwa?.name ?? token, logo: rwa?.logo ?? null, known: !!rwa };
}

/** Where a part not usable here yet can be locked from: the Lock page, on
 *  the asset's own network, with the asset and this network picked. Null
 *  where the Lock page does not serve that network (Tempo). */
export function lockLink(locale: string, indexNetwork: string, from: string | null, home: string | null, evmNetworks: readonly string[]): string | null {
  if (!from || from === indexNetwork) return null;
  if (from !== "solana" && !evmNetworks.includes(from)) return null;
  const q = new URLSearchParams({ to: indexNetwork });
  if (home) q.set("token", home);
  return `${lockPath(locale, from)}?${q}`;
}

/** `p`, or `fallback` after `ms`: a slow network does not hold a page. */
export const within = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
