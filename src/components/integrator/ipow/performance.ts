// An index's past performance and yield: what its fixed mix (the amounts one
// token holds, as the chain keeps them) of the real assets its parts stand
// for was worth each day of the past year, its return over 1, 3, 6 and 12
// months, and its yield: each asset's income over the last 12 months,
// weighted by what it is worth in one token today. Total return: stocks and
// funds at dividend-adjusted prices, dollar tokens growing at their
// reference yield.

import { REFERENCE_TICKER, fxKey, sourceKey } from "./referenceTickers";
import { REFERENCE_APY } from "./referenceYields";

const DAY = 86_400;
const YEAR = 365 * DAY;
/** A history: [day, dividend-adjusted price, close], oldest first (/api/history). */
type History = [number, number, number][];
/** One token's value by day, oldest first. */
type Series = [number, number][];

const cache = new Map<string, Promise<History | null>>();

/** The daily prices of each source key, read once per page load. */
async function histories(keys: string[]): Promise<Map<string, History | null>> {
  const missing = keys.filter((k) => !cache.has(k));
  if (missing.length) {
    const all = fetch(`/api/history?keys=${encodeURIComponent(missing.join(","))}`)
      .then((r) => r.json() as Promise<Record<string, History | null>>)
      .catch(() => ({}) as Record<string, History | null>);
    for (const k of missing) cache.set(k, all.then((a) => a[k] ?? null));
    // A failed read is not kept: tried again on the next page.
    for (const k of missing) cache.get(k)!.then((s) => s === null && cache.delete(k));
  }
  return new Map(await Promise.all(keys.map(async (k) => [k, await cache.get(k)!] as const)));
}

/** Returns over 1, 3, 6 and 12 months, as fractions (0.1 is +10%); null
 *  where the history is shorter. */
export type Returns = { m1: number | null; m3: number | null; m6: number | null; y1: number | null };

export type Performance = {
  /** One token's value each day, oldest first, in dollars: its price, with
   *  no income added (what the token itself is worth). */
  series: Series;
  /** Growth: the change in that value, price only. */
  growth: Returns;
  /** Total return: growth with the income (dividends, interest) reinvested. */
  returns: Returns;
  /** The yearly yield, as a fraction: dividends and interest of the last 12
   *  months, weighted by value today. Null when a part's year is too short. */
  apy: number | null;
  /** Set when a part was listed less than a year ago: the day the history
   *  starts, which 1Y is measured from instead of a year back (unix seconds). */
  since: number | null;
};

/** A series may start this much after the day asked for: its first price
 *  stands in (CoinGecko's free year starts a day short of 365 days back). */
const GRACE = 3 * DAY;

/** Column `col` of a dated series on day `t`: the last point on or before
 *  it, or the first within GRACE after. */
function at(s: [number, ...number[]][], t: number, col = 1): number | null {
  let lo = 0;
  let hi = s.length - 1;
  if (hi < 0 || s[0][0] > t + GRACE) return null;
  if (s[0][0] > t) return s[0][col];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s[mid][0] <= t) lo = mid;
    else hi = mid - 1;
  }
  return s[lo][col];
}

/** A history shorter than this gives no yield: too little to annualize. */
const MIN_YIELD_SPAN = 90 * DAY;

/** An asset's income over the year to `today`: its total return beyond its
 *  price's (dividend-adjusted against plain close). An asset listed less
 *  than a year ago: over its history, annualized. Null when that history is
 *  shorter than MIN_YIELD_SPAN. */
function trailingYield(h: History, today: number): number | null {
  const from = Math.max(today - YEAR, h[0][0]);
  if (today - from < MIN_YIELD_SPAN) return null;
  const [a0, c0, a1, c1] = [at(h, from, 1), at(h, from, 2), at(h, today, 1), at(h, today, 2)];
  if (!a0 || !c0 || !a1 || !c1) return null;
  const income = Math.max(0, a1 / a0 / (c1 / c0) - 1);
  return Math.pow(1 + income, YEAR / (today - from)) - 1;
}

/** A history priced in another currency, in dollars: each day divided by
 *  that day's rate (units per dollar). Days with no rate are left out. */
function inDollars(h: History | null | undefined, rate: History | null | undefined): History | null {
  if (!h?.length || !rate?.length) return null;
  const out: History = [];
  for (const [t, adj, close] of h) {
    const r = at(rate, t, 2);
    if (r && r > 0) out.push([t, adj / r, close / r]);
  }
  return out.length ? out : null;
}

/**
 * The performance of one token holding `amount` of each part, from daily
 * histories by source key. Pure, so it can be checked on its own. Null when
 * a part has no known real asset or no history.
 */
export function performanceOf(parts: { symbol: string; amount: number }[], prices: Map<string, History | null>, today = Math.floor(Date.now() / 1000 / DAY) * DAY): Performance | null {
  if (!parts.length) return null;
  const legs = parts.map((p) => {
    const ticker = REFERENCE_TICKER[p.symbol];
    if (!ticker) return null;
    if ("dollar" in ticker) {
      // $1 today, compounding at its yield: worth less the further back.
      const apy = (REFERENCE_APY[p.symbol] ?? 0) / 100;
      // Its price stays $1; its income makes its total return.
      return { amount: p.amount, price: (t: number, col = 1) => (col === 1 ? Math.pow(1 + apy, (t - today) / YEAR) : 1), first: 0, yield: apy as number | null };
    }
    const own = prices.get(sourceKey(ticker));
    const fx = fxKey(ticker);
    const h = fx ? inDollars(own, prices.get(fx)) : own;
    if (!h || !h.length) return null;
    // A currency pair earns nothing in itself.
    const income = "euro" in ticker || ("yahoo" in ticker && ticker.yahoo.endsWith("=X")) ? 0 : trailingYield(h, today);
    return { amount: p.amount, price: (t: number, col = 1) => at(h, t, col), first: h[0][0] - GRACE, yield: income };
  });
  if (legs.some((l) => l === null)) return null;
  const ls = legs as NonNullable<(typeof legs)[number]>[];
  const start = Math.max(today - YEAR, ...ls.map((l) => l.first));
  /** One token's value by day, from total-return prices (col 1) or plain closes (col 2). */
  const valueSeries = (col: number): Series => {
    const out: Series = [];
    for (let t = start; t <= today; t += DAY) {
      let v = 0;
      for (const l of ls) {
        const p = l.price(t, col);
        if (p === null) {
          v = NaN;
          break;
        }
        v += l.amount * p;
      }
      if (Number.isFinite(v) && v > 0) out.push([t, v]);
    }
    return out;
  };
  const total = valueSeries(1);
  const series = valueSeries(2);
  if (series.length < 2 || total.length < 2) return null;
  const returnsOf = (s: Series): Returns => {
    const now = s[s.length - 1][1];
    const back = (days: number) => {
      const t = today - days * DAY;
      if (s[0][0] > t + GRACE) return null;
      const then = at(s, t);
      return then ? now / then - 1 : null;
    };
    // 1Y: a year back, or, when a part was listed less than a year ago,
    // since the history starts (`since` says when).
    const first = s[0][1];
    return { m1: back(30), m3: back(91), m6: back(182), y1: back(365) ?? (first ? now / first - 1 : null) };
  };
  // Each part's yield weighted by what it is worth in one token today.
  let worth = 0;
  let earning = 0;
  let apy: number | null = 0;
  for (const l of ls) {
    const v = l.amount * (l.price(today) ?? 0);
    worth += v;
    if (l.yield === null) apy = null;
    else earning += v * l.yield;
  }
  if (apy !== null) apy = worth > 0 ? earning / worth : null;
  // When 1Y covers less than a year: the day the history starts.
  const since = series[0][0] > today - YEAR + GRACE ? series[0][0] : null;
  return { series, growth: returnsOf(series), returns: returnsOf(total), apy, since };
}

/** The performance of one token holding `parts`, read and worked out. */
export async function loadPerformance(parts: { symbol: string; amount: number }[]): Promise<Performance | null> {
  if (parts.some((p) => !REFERENCE_TICKER[p.symbol])) return null;
  const keys = [...new Set(parts.flatMap((p) => [sourceKey(REFERENCE_TICKER[p.symbol]), fxKey(REFERENCE_TICKER[p.symbol])]).filter((k): k is string => !!k && k !== "dollar"))];
  return performanceOf(parts, await histories(keys));
}

/** A return as shown: "+18.4%", "−2.1%". */
export const returnText = (r: number) => `${r >= 0 ? "+" : "−"}${Math.abs(r * 100).toFixed(1)}%`;

/** A yield as shown: "0.62%", two decimals. */
export const yieldText = (r: number) => `${(r * 100).toFixed(2)}%`;
