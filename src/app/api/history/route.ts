// A year of daily prices of the real assets Greatwall's tokens stand for
// (referenceTickers.ts; Yahoo's two years, CoinGecko's free 365 days), for the indexes' past performance: Yahoo Finance's
// dividend-adjusted closes for stocks, ETFs, gold and currencies, CoinGecko's
// daily prices for coins. Read on this server, so the browser calls neither,
// and kept six hours. Only the sources the app knows are served.
//
//   GET /api/history?keys=y:SPY,c:bitcoin -> { [key]: [[unix day, adjusted usd, close usd], …] | null }
//
// The adjusted price counts dividends (total return); the close does not, so
// the gap between them over a year is the asset's dividend yield. A coin's
// two are the same.

import { NextResponse } from "next/server";

import { SOURCE_KEYS } from "@/components/integrator/ipow/referenceTickers";

export const runtime = "nodejs";

const KEEP_MS = 6 * 3600_000;
type Point = [number, number, number];
const kept = new Map<string, { at: number; series: Point[] }>();
/** After a failed read, a source is not asked again for this long. */
const BACKOFF_MS = 5 * 60_000;
const PER_MINUTE = 30;
const failedAt = new Map<string, number>();
/** One upstream read per key at a time, shared by every request asking. */
const inFlight = new Map<string, Promise<Point[] | null>>();
const visits = new Map<string, { from: number; n: number }>();

/** Why a caller is refused: another site's page, or too many calls this minute. */
function refused(req: Request): NextResponse | null {
  if (req.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "For this site's pages only" }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const v = visits.get(ip);
  if (!v || now - v.from > 60_000) {
    if (visits.size > 10_000) visits.clear();
    visits.set(ip, { from: now, n: 1 });
    return null;
  }
  return ++v.n > PER_MINUTE ? NextResponse.json({ error: "Too many requests; try again in a minute." }, { status: 429 }) : null;
}
const DAY = 86_400;

async function yahoo(ticker: string): Promise<Point[]> {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=2y&interval=1d`, {
    headers: { "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Yahoo ${r.status}`);
  const res = (await r.json())?.chart?.result?.[0];
  const times: number[] = res?.timestamp ?? [];
  const closes: (number | null)[] = res?.indicators?.quote?.[0]?.close ?? [];
  // Dividend-adjusted where Yahoo has it (total return), else the close.
  const adjusted: (number | null)[] = res?.indicators?.adjclose?.[0]?.adjclose ?? closes;
  return times.flatMap((t, i) => {
    const a = adjusted[i];
    const c = closes[i];
    return a != null && a > 0 && c != null && c > 0 ? [[Math.floor(t / DAY) * DAY, a, c] as Point] : [];
  });
}

async function coingecko(id: string): Promise<Point[]> {
  const r = await fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=365&interval=daily`, {
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
  const prices: [number, number][] = (await r.json())?.prices ?? [];
  return prices.map(([ms, p]) => [Math.floor(ms / 1000 / DAY) * DAY, p, p] as Point);
}

async function series(key: string): Promise<Point[] | null> {
  const hit = kept.get(key);
  if (hit && Date.now() - hit.at < KEEP_MS) return hit.series;
  // Failed a moment ago: the last read (or nothing), without asking again.
  if (Date.now() - (failedAt.get(key) ?? 0) < BACKOFF_MS) return hit?.series ?? null;
  let read = inFlight.get(key);
  if (!read) {
    read = (async () => {
      try {
        const s = key.startsWith("y:") ? await yahoo(key.slice(2)) : await coingecko(key.slice(2));
        if (!s.length) throw new Error("no prices");
        kept.set(key, { at: Date.now(), series: s });
        failedAt.delete(key);
        return s;
      } catch {
        failedAt.set(key, Date.now());
        // The last read, when the source does not answer now.
        return hit?.series ?? null;
      } finally {
        inFlight.delete(key);
      }
    })();
    inFlight.set(key, read);
  }
  return read;
}

export async function GET(req: Request) {
  const no = refused(req);
  if (no) return no;
  const keys = [...new Set((new URL(req.url).searchParams.get("keys") ?? "").split(",").filter((k) => SOURCE_KEYS.has(k)))].slice(0, 40);
  const out: Record<string, Point[] | null> = {};
  // A few at a time: the sources rate-limit bursts.
  for (let i = 0; i < keys.length; i += 4) {
    const batch = keys.slice(i, i + 4);
    const got = await Promise.all(batch.map(series));
    batch.forEach((k, j) => (out[k] = got[j]));
  }
  return NextResponse.json(out, { headers: { "cache-control": "public, max-age=600" } });
}
