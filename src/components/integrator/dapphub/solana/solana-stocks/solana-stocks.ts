'use server'

import { formatMarketCap } from "./helper";

// Mirrors jupiter-swap.ts's fetchJupiterWithRetry: without a timeout, a slow/unresponsive
// datapi.jup.ag left this loop's await hanging forever, which kept isLoadingStocks (and its
// skeleton loader) stuck on the initial page load with no way out. The retry-on-429 also
// protects the pagination loop below, which can otherwise fire several requests back to back.
async function fetchStocksWithRetry(url: string, init: RequestInit = {}, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    if (res.status !== 429 || attempt >= maxRetries) return res;
    const backoffMs = 500 * Math.pow(2, attempt); // 500ms, 1s, 2s
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }
}

export async function getStockAssets() {
  try {
    let allAssets: any[] = [];
    let currentOffset = 0;
    let hasMore = true;

    while (hasMore && currentOffset < 500) {
      const res = await fetchStocksWithRetry(
        `https://datapi.jup.ag/v2/assets/stocks/24h?sortBy=volume&sortDir=desc&offset=${currentOffset}&includeOndoStatus=true`,
        { next: { revalidate: 15 } }
      );

      if (!res.ok) throw new Error(`Failed to fetch stock data: ${res.status}`);

      const responseData = await res.json();
      const assets = responseData.assets;

      if (!assets || !Array.isArray(assets)) {
        break; // Stop if the format is unexpected
      }

      allAssets = [...allAssets, ...assets];

      if (responseData.next !== undefined && responseData.next !== null) {
        currentOffset = responseData.next;
      } else {
        hasMore = false;
      }
    }
    
    const formattedStocks = allAssets.map((asset: any) => ({
      id: asset.id,
      mint: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      icon: asset.icon,
      decimals: asset.decimals,
      
      price: asset.usdPrice || 0,
      formattedPrice: `$${(asset.usdPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`,
      
      change24h: asset.stats24h?.priceChange || 0,
      formattedChange: `${(asset.stats24h?.priceChange || 0) > 0 ? "+" : ""}${(asset.stats24h?.priceChange || 0).toFixed(2)}%`,
      
      marketCap: asset.mcap || 0,
      formattedMcap: formatMarketCap(asset.mcap || 0),
    }));

    return { success: true, stocks: formattedStocks };
  } catch (err: any) {
    console.error("Failed to fetch stock data:", err.message);
    return { success: false, stocks: [], error: err.message };
  }
}