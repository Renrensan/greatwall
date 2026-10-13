// An index token's metadata (E4) and its parts' names, as the Explore cards
// and an index's own page show them.

import { ZeroAddress } from "ethers";
import { WRAPPED_SOL } from "@ipow/sdk";

import { PATH_USD, TICKER, type EvmChain } from "./sdk";
import { rwaTokensOf } from "./rwaTokens";
import { lockPath } from "@/components/integrator/ipow/lockPaths";
import { BUILT_IN } from "./builtInIndexes";

export type IndexMetadata = { image: string | null; description: string; website: string | null; twitter: string | null; telegram: string | null };

/** A link to metadata or an image Greatwall hosts (/api/beta/…, or an
 *  index's files in public/assets/index/), read from this site whatever
 *  origin it was written with: a link written while the server had no
 *  public origin (http://0.0.0.0:3001/…, 2026-10-07) cannot be fetched as it
 *  stands, but the files are this site's. A built-in index's link goes to
 *  its copy in public/. */
export function ownHosted(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/^\/api\/beta\/(metadata|image)\/([0-9a-f]{24})/);
    if (m && BUILT_IN[m[2]]) return m[1] === "metadata" ? BUILT_IN[m[2]].metadata : BUILT_IN[m[2]].image;
    if (/^\/api\/beta\/(metadata|image)\//.test(u.pathname) || /^\/assets\/index\//.test(u.pathname)) return u.pathname;
    return null;
  } catch {
    return null;
  }
}

/** An IPFS gateway's link as this site's own (/api/ipfs/<cid>), which
 *  fetches the file once and keeps it: the public gateways take about 5
 *  seconds a file, or refuse. Null for a link that is not one. */
export function viaOwnIpfs(url: string): string | null {
  const m = /^https:\/\/[^/]+\/ipfs\/(baf[a-z2-7]{50,100}|Qm[1-9A-HJ-NP-Za-km-z]{44})\/?$/.exec(url);
  return m ? `/api/ipfs/${m[1]}` : null;
}

const httpsOrNull = (v: unknown) => (typeof v === "string" && /^https:\/\/\S+$/.test(v) ? v : null);

/** The metadata at `uri`, or nothing known when it cannot be read. A file
 *  on IPFS is read through this site, which may be fetching it for the
 *  first time: half a minute at most. */
export async function readMetadata(uri: string): Promise<IndexMetadata> {
  const none: IndexMetadata = { image: null, description: "", website: null, twitter: null, telegram: null };
  if (!uri) return none;
  try {
    const own = viaOwnIpfs(uri);
    const r = await fetch(ownHosted(uri) ?? own ?? uri, { signal: AbortSignal.timeout(own ? 30_000 : 5_000) });
    if (!r.ok) return none;
    const meta = await r.json();
    let image: string | null = null;
    if (typeof meta?.image === "string") image = ownHosted(meta.image) ?? viaOwnIpfs(meta.image) ?? (/^(https:|data:image\/)/.test(meta.image) ? meta.image : null);
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
  if (network === "tempo") {
    // Tempo's money is PathUSD, a token; it has no coin, so a part of the
    // zero address can't be minted there (Tempo refuses value): not known.
    if (token.toLowerCase() === PATH_USD.toLowerCase()) return { symbol: "pathUSD", name: "PathUSD", logo: "/assets/networks/tempo.png", known: true };
    if (token === ZeroAddress) return { symbol: "?", name: "No coin on Tempo", logo: null, known: false };
  }
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
