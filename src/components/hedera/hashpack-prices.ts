// HashPack's own token/price feed — verified live (via the user's browser; every attempt from
// this environment got a Cloudflare 403 regardless of method/headers, so this can only safely
// be called client-side, never proxied through our own backend). One bulk POST returns every
// token HashPack tracks: real USD price, its own icon CDN URL, and a `dueDiligenceComplete`
// flag — effectively HashPack's own "verified" signal, which we don't currently filter on but
// could layer in later without any more plumbing.
const HASHPACK_PRICES_URL = "https://api.hashpack.app/prices";

export interface HashPackTokenInfo {
  id: string;
  icon: string | null;
  name: string;
  decimals: number;
  price: string;
  priceUsd: number;
  symbol: string;
  dueDiligenceComplete: boolean;
}

let cache: { byId: Map<string, HashPackTokenInfo>; fetchedAt: number; netKey: string } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // prices move, unlike Ethereum's mostly-static token list

export async function fetchHashPackTokenInfo(
  netKey: "mainnet" | "testnet",
): Promise<Map<string, HashPackTokenInfo>> {
  const now = Date.now();
  if (cache && cache.netKey === netKey && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.byId;
  }

  const res = await fetch(HASHPACK_PRICES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ network: netKey }),
  });
  if (!res.ok) throw new Error(`HashPack prices ${res.status}`);

  const list: HashPackTokenInfo[] = await res.json();
  const byId = new Map<string, HashPackTokenInfo>();
  for (const t of list) byId.set(t.id, t);

  cache = { byId, fetchedAt: now, netKey };
  return byId;
}
