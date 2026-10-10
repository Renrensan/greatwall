"use client";

// An index's past performance on its page, from the assets its parts stand
// for (performance.ts): its growth (the token's value, price only), its
// yield (the income its assets paid) and their sum, its total return; over
// 1, 3, 6 and 12 months, and one token's value over the year.

import { useEffect, useMemo, useState } from "react";

import { loadPerformance, returnText, yieldText, type Performance, type Returns } from "@/components/integrator/ipow/performance";

const W = 600;
const H = 120;

/** One token's past performance and yield: undefined while it loads, null
 *  when it can't be worked out. */
export function usePerformance(parts: { symbol: string; amount: number }[]): Performance | null | undefined {
  const key = parts.map((p) => `${p.symbol}:${p.amount}`).join("|");
  const [perf, setPerf] = useState<Performance | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setPerf(undefined);
    loadPerformance(parts)
      .then((p) => live && setPerf(p))
      .catch(() => live && setPerf(null));
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return perf;
}

export function PerformanceBlock({ perf }: { perf: Performance | null | undefined }) {
  const path = useMemo(() => {
    if (!perf) return null;
    const s = perf.series;
    const vs = s.map(([, v]) => v);
    const lo = Math.min(...vs);
    const hi = Math.max(...vs);
    const x = (i: number) => (i / (s.length - 1)) * W;
    const y = (v: number) => (hi === lo ? H / 2 : H - 6 - ((v - lo) / (hi - lo)) * (H - 12));
    const line = s.map(([, v], i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    return { line, area: `${line}L${W},${H}L0,${H}Z`, lo, hi, from: s[0][0], up: vs[vs.length - 1] >= vs[0] };
  }, [perf]);

  const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const loading = perf === undefined;
  const signed = (r: number | null | undefined) => (r == null ? "opacity-40" : r >= 0 ? "text-green-700" : "text-red-700");
  const cell = (r: number | null | undefined) => (loading ? <span className="inline-block h-3.5 w-10 rounded bg-black/10 animate-pulse" /> : r == null ? "—" : returnText(r));
  const PERIODS: [string, keyof Returns][] = [
    ["1M", "m1"],
    ["3M", "m3"],
    ["6M", "m6"],
    ["1Y", "y1"],
  ];
  const headline: [string, string, React.ReactNode, string][] = [
    ["Growth", "1Y, price only", cell(perf?.growth.y1), signed(perf?.growth.y1)],
    ["Yield", "APY, dividends + interest", loading ? cell(null) : perf?.apy == null ? "—" : yieldText(perf.apy), perf?.apy == null ? "opacity-40" : ""],
    ["Total return", "1Y, growth + yield", cell(perf?.returns.y1), signed(perf?.returns.y1)],
  ];

  return (
    <section className="rounded-2xl bg-paper border border-ink/10 p-4 sm:p-5 flex flex-col gap-4" aria-labelledby="performance-title">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="performance-title" className="text-sm font-bold">
          Past performance
        </h3>
        <span className="text-[11px] opacity-60">If held</span>
      </div>

      {/* Growth + yield = total return. */}
      <dl className="grid grid-cols-3 gap-2">
        {headline.map(([label, hint, value, tone]) => (
          <div key={label} className="rounded-xl bg-well px-3 py-2.5 flex flex-col gap-0.5 min-w-0">
            <dt className="text-[11px] font-semibold opacity-60 truncate">{label}</dt>
            <dd className={`text-lg font-bold tabular-nums ${tone}`}>{value}</dd>
            <dd className="text-[10px] opacity-50 truncate">{hint}</dd>
          </div>
        ))}
      </dl>

      {/* By period. */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="text-[11px] opacity-60">
              <th scope="col" className="text-left font-semibold py-1" />
              {PERIODS.map(([label]) => (
                <th key={label} scope="col" className="text-right font-semibold py-1">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Growth", perf?.growth],
                ["Total return", perf?.returns],
              ] as [string, Returns | undefined][]
            ).map(([label, r]) => (
              <tr key={label} className="border-t border-ink/5">
                <th scope="row" className="text-left font-medium py-1.5 opacity-75">
                  {label}
                </th>
                {PERIODS.map(([p, k]) => (
                  <td key={p} className={`text-right font-semibold py-1.5 ${signed(r?.[k])}`}>
                    {cell(r?.[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? (
        <div className="h-[120px] rounded-xl bg-black/5 animate-pulse" />
      ) : path ? (
        <figure className="flex flex-col gap-1">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`w-full h-[120px] ${path.up ? "text-green-700" : "text-red-700"}`} role="img" aria-label="One token's value over the past year">
            <path d={path.area} fill="currentColor" opacity={0.08} />
            <path d={path.line} fill="none" stroke="currentColor" strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
          </svg>
          <figcaption className="flex justify-between text-[11px] opacity-60 tabular-nums">
            <span>{new Date(path.from * 1000).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
            <span>
              One token&rsquo;s value · Low {usd(path.lo)} · High {usd(path.hi)}
            </span>
            <span>Today</span>
          </figcaption>
        </figure>
      ) : (
        <p className="text-xs opacity-60">No price history for one of its parts, so no past performance is shown.</p>
      )}
      <p className="text-[11px] opacity-60 leading-relaxed">
        Growth is the change in one token&rsquo;s value; yield is the dividends and interest its assets paid; total return is both, with the
        income reinvested. Past performance is not a promise.
      </p>
    </section>
  );
}
