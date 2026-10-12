// The network coins' market prices in dollars, from CoinGecko's public API,
// kept a minute: what the wallet providers show a native coin's value with,
// and what the Create page values a coin with (coinPrices.ts reads it).
//
//   GET /api/prices -> { BTC, ETH, SOL, HYPE, ZEC } (a missing one is left out)

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const IDS: Record<string, string> = { bitcoin: "BTC", ethereum: "ETH", solana: "SOL", hyperliquid: "HYPE", zcash: "ZEC" };
let cached: { at: number; prices: Record<string, number> } | null = null;
let failedAt = 0;

export async function GET() {
  if (cached && Date.now() - cached.at < 60_000) return NextResponse.json(cached.prices);
  // CoinGecko refused within the last 10 seconds: not asked again yet.
  if (Date.now() - failedAt < 10_000) return NextResponse.json(cached?.prices ?? {}, { status: cached ? 200 : 502 });
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${Object.keys(IDS).join(",")}&vs_currencies=usd`, {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
    const body: any = await r.json();
    const prices: Record<string, number> = {};
    for (const [id, symbol] of Object.entries(IDS)) {
      const usd = Number(body?.[id]?.usd);
      if (usd > 0) prices[symbol] = usd;
    }
    if (!Object.keys(prices).length) throw new Error("CoinGecko gave no prices");
    cached = { at: Date.now(), prices };
    return NextResponse.json(prices);
  } catch {
    failedAt = Date.now();
    // The last prices read, when CoinGecko does not answer.
    return NextResponse.json(cached?.prices ?? {}, { status: cached ? 200 : 502 });
  }
}
