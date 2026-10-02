// Subscan's public asset registry for Asset Hub — the active, maintained repo (not
// subscan-explorer/assets-info, which is archived and redirects here). Verified live: real
// entries for USDC (asset id 1337) and USDT (asset id 1984) matching what's actually on-chain,
// each with a logo file and, usefully, a CoinGecko coin id — which sidesteps the problem
// CoinGecko's contract-address pricing has for Asset Hub (plain numeric asset ids, not
// contract addresses). Mainnet only; this repo has no Paseo/testnet coverage.
const REGISTRY_URL =
  "https://raw.githubusercontent.com/subscan-explorer/chain-asset/main/assets/assethub-polkadot.json";
const LOGO_BASE_URL = "https://raw.githubusercontent.com/subscan-explorer/chain-asset/main/logos/";

interface RegistryEntry {
  TokenID: string; // e.g. "standard_assets/1337"
  TokenSymbol: string;
  Logo?: string; // e.g. "../logos/assethub-polkadot_asset_USDC.svg"
  "Coingecko API ID"?: string;
}

export interface AssetHubRegistryInfo {
  logo: string | null;
  coingeckoId: string | null;
}

let cachedRegistry: Map<number, AssetHubRegistryInfo> | null = null;
let cachedAt = 0;
const REGISTRY_CACHE_TTL_MS = 30 * 60 * 1000; // this list changes rarely

export async function fetchAssetHubRegistry(): Promise<Map<number, AssetHubRegistryInfo>> {
  const now = Date.now();
  if (cachedRegistry && now - cachedAt < REGISTRY_CACHE_TTL_MS) return cachedRegistry;

  const res = await fetch(REGISTRY_URL);
  if (!res.ok) throw new Error(`Asset Hub registry ${res.status}`);
  const entries: RegistryEntry[] = await res.json();

  const byAssetId = new Map<number, AssetHubRegistryInfo>();
  for (const entry of entries) {
    // Only "standard_assets/<id>" maps onto the plain `Assets` pallet this app currently reads
    // (see asset-hub-tokens.ts) — "pool_assets/"/"foreign_assets/" entries, if any, use a
    // different pallet/key shape we don't discover yet.
    const match = entry.TokenID.match(/^standard_assets\/(\d+)$/);
    if (!match) continue;
    const assetId = Number(match[1]);

    const logoFile = entry.Logo?.split("/").pop();
    byAssetId.set(assetId, {
      logo: logoFile ? `${LOGO_BASE_URL}${logoFile}` : null,
      coingeckoId: entry["Coingecko API ID"] || null,
    });
  }

  cachedRegistry = byAssetId;
  cachedAt = now;
  return byAssetId;
}

let cachedPrices: { byCoingeckoId: Record<string, number>; fetchedAt: number } | null = null;
const PRICE_CACHE_TTL_MS = 2 * 60 * 1000;

export async function fetchAssetHubPrices(
  coingeckoIds: string[],
): Promise<Record<string, number>> {
  if (coingeckoIds.length === 0) return {};

  const now = Date.now();
  if (cachedPrices && now - cachedPrices.fetchedAt < PRICE_CACHE_TTL_MS) {
    return cachedPrices.byCoingeckoId;
  }

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds.join(",")}&vs_currencies=usd`,
  );
  if (!res.ok) throw new Error(`CoinGecko price ${res.status}`);
  const data = await res.json();

  const byCoingeckoId: Record<string, number> = {};
  for (const id of coingeckoIds) {
    if (data[id]?.usd != null) byCoingeckoId[id] = data[id].usd;
  }

  cachedPrices = { byCoingeckoId, fetchedAt: now };
  return byCoingeckoId;
}
