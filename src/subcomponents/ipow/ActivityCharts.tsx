"use client";

// An index's history as two charts: its minted supply over time, and its
// mint and burn activity by day, each over the last month, three, six or
// all of it. Drawn in SVG, from the events the page reads (indexActivity.ts).

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { Activity } from "@/components/integrator/ipow/indexActivity";

const RANGES = [
  { key: "1M", days: 30 },
  { key: "3M", days: 90 },
  { key: "6M", days: 180 },
  { key: "All", days: 0 },
] as const;
type Range = (typeof RANGES)[number]["key"];

const DAY = 86_400;
const W = 640;
const H = 240;
const PAD = { left: 48, right: 12, top: 12, bottom: 28 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

const tokens = (units: bigint) => Number(units) / 1e9;
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n >= 10 ? n.toFixed(0) : n.toFixed(n >= 1 ? 1 : 2));

/** Tick values from 0 to a round top above `max`. */
function ticks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const n = 4;
  return Array.from({ length: n + 1 }, (_, i) => (top * i) / n);
}

/** Labels along the time axis: months for long ranges, days for short, and
 *  the time too within two days, so no two labels read the same. */
function timeLabels(from: number, to: number): { t: number; label: string }[] {
  const span = to - from;
  const count = 4;
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = from + (span * i) / count;
    const d = new Date(t * 1000);
    const label =
      span > 60 * DAY
        ? d.toLocaleDateString("en-US", { month: "short" })
        : span > 2 * DAY
          ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
    return { t, label };
  });
}

/** An axis value: whole numbers plain, others with at most 2 decimals. */
const axisFmt = (n: number) => (n >= 1e3 ? fmt(n) : Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

function RangeTabs({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex rounded-lg bg-cream p-1 text-xs font-semibold" role="group">
      {RANGES.map((r) => (
        <button key={r.key} type="button" aria-pressed={value === r.key} onClick={() => onChange(r.key)} className={`px-2.5 py-1 rounded-md ${value === r.key ? "bg-paper shadow-sm" : "opacity-70 hover:opacity-100"}`}>
          {r.key}
        </button>
      ))}
    </div>
  );
}

function Frame({ title, value, range, onRange, children }: { title: string; value: string; range: Range; onRange: (r: Range) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-ink/10 bg-paper p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm opacity-70">{title}</span>
          <span className="font-bold tabular-nums">{value}</span>
        </div>
        <RangeTabs value={range} onChange={onRange} />
      </div>
      {children}
    </div>
  );
}

/** The grid, the y labels and the time labels, shared by both charts. */
function Axes({ ys, scaleY, from, to, scaleX }: { ys: number[]; scaleY: (v: number) => number; from: number; to: number; scaleX: (t: number) => number }) {
  return (
    <g className="text-[10px]" fill="currentColor">
      {ys.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={scaleY(v)} y2={scaleY(v)} stroke="currentColor" strokeOpacity={0.1} />
          <text x={PAD.left - 8} y={scaleY(v) + 3} textAnchor="end" opacity={0.5}>
            {axisFmt(v)}
          </text>
        </g>
      ))}
      <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="currentColor" strokeOpacity={0.4} />
      {timeLabels(from, to).map((l, i) => (
        <text key={i} x={scaleX(l.t)} y={H - 8} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} opacity={0.5}>
          {l.label}
        </text>
      ))}
    </g>
  );
}

export function ActivityCharts({ events, supply, symbol, status }: { events: Activity[]; supply: bigint; symbol: string; status: "loading" | "ready" | "unsupported" | "error" }) {
  const t = useTranslations("Beta");
  const [supplyRange, setSupplyRange] = useState<Range>("All");
  const [activityRange, setActivityRange] = useState<Range>("1M");
  // The charts run to the time they are drawn.
  // eslint-disable-next-line react-hooks/purity
  const now = Math.floor(Date.now() / 1000);

  /** The window of a range: from its start (or the first event) to now. */
  const windowOf = (r: Range) => {
    const days = RANGES.find((x) => x.key === r)!.days;
    const first = events.length ? events[0].t : now - 30 * DAY;
    return { from: days ? now - days * DAY : Math.min(first, now - DAY), to: now };
  };

  // Supply over time: every mint up, every burn down, held between events.
  const supplyChart = useMemo(() => {
    const { from, to } = windowOf(supplyRange);
    let level = BigInt(0);
    const points: [number, number][] = [];
    for (const e of events) {
      if (e.t < from) {
        level += e.kind === "mint" ? e.amount : -e.amount;
        continue;
      }
      if (!points.length) points.push([from, tokens(level)]);
      points.push([e.t, tokens(level)]);
      level += e.kind === "mint" ? e.amount : -e.amount;
      points.push([e.t, tokens(level)]);
    }
    if (!points.length) points.push([from, tokens(level)]);
    points.push([to, tokens(level)]);
    const ys = ticks(Math.max(...points.map((p) => p[1])));
    const top = ys[ys.length - 1] || 1;
    const scaleX = (x: number) => PAD.left + ((x - from) / Math.max(1, to - from)) * plotW;
    const scaleY = (v: number) => PAD.top + plotH - (v / top) * plotH;
    const line = points.map(([x, y], i) => `${i ? "L" : "M"}${scaleX(x).toFixed(1)},${scaleY(y).toFixed(1)}`).join(" ");
    const area = `${line} L${scaleX(to).toFixed(1)},${scaleY(0)} L${scaleX(from).toFixed(1)},${scaleY(0)} Z`;
    return { from, to, ys, scaleX, scaleY, line, area };
  }, [events, supplyRange, now]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mint and burn by day: mints above the line, burns below.
  const activityChart = useMemo(() => {
    const { from, to } = windowOf(activityRange);
    const days = new Map<number, { mint: number; burn: number }>();
    for (const e of events) {
      if (e.t < from) continue;
      const d = Math.floor(e.t / DAY) * DAY;
      const v = days.get(d) ?? { mint: 0, burn: 0 };
      v[e.kind] += tokens(e.amount);
      days.set(d, v);
    }
    const max = Math.max(0, ...[...days.values()].flatMap((v) => [v.mint, v.burn]));
    const ys = ticks(max);
    const top = ys[ys.length - 1] || 1;
    const scaleX = (x: number) => PAD.left + ((x - from) / Math.max(1, to - from)) * plotW;
    const mid = PAD.top + plotH / 2;
    const half = plotH / 2;
    const bar = Math.max(2, (plotW / Math.max(1, (to - from) / DAY)) * 0.7);
    const totals = [...days.values()].reduce((a, v) => ({ mint: a.mint + v.mint, burn: a.burn + v.burn }), { mint: 0, burn: 0 });
    return { from, to, top, scaleX, mid, half, bar, days: [...days.entries()], totals };
  }, [events, activityRange, now]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status !== "ready") {
    return (
      <div className="rounded-3xl border border-ink/10 bg-paper p-5 flex flex-col gap-3">
        {status === "loading" ? (
          <>
            <div className="h-3 w-24 bg-black/10 rounded animate-pulse" />
            <div className="h-4 w-40 bg-black/10 rounded animate-pulse" />
            <div className="h-48 w-full bg-black/5 rounded-xl animate-pulse" />
          </>
        ) : (
          <p className="text-sm opacity-70">{status === "unsupported" ? t("historyNotHere") : t("historyUnread")}</p>
        )}
      </div>
    );
  }

  const s = supplyChart;
  const a = activityChart;
  return (
    <div className="flex flex-col gap-5">
      <Frame title={t("supplyChartTitle")} value={`${fmt(tokens(supply))} $${symbol}`} range={supplyRange} onRange={setSupplyRange}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-ink" role="img" aria-label={t("mintedChart")}>
          <Axes ys={s.ys} scaleY={s.scaleY} from={s.from} to={s.to} scaleX={s.scaleX} />
          <path d={s.area} fill="#f6e7c8" fillOpacity={0.7} />
          <path d={s.line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
        </svg>
      </Frame>

      <Frame
        title={t("mintBurnActivity")}
        value={`+${fmt(a.totals.mint)} / −${fmt(a.totals.burn)} $${symbol}`}
        range={activityRange}
        onRange={setActivityRange}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-ink" role="img" aria-label={t("mintBurnChart")}>
          <g className="text-[10px]" fill="currentColor">
            {[1, 0.5, 0, -0.5, -1].map((f) => (
              <g key={f}>
                <line x1={PAD.left} x2={W - PAD.right} y1={a.mid - f * a.half} y2={a.mid - f * a.half} stroke="currentColor" strokeOpacity={f === 0 ? 0.4 : 0.1} />
                <text x={PAD.left - 8} y={a.mid - f * a.half + 3} textAnchor="end" opacity={0.5}>
                  {f === 0 ? "0" : `${f > 0 ? "+" : "−"}${fmt(Math.abs(f) * a.top)}`}
                </text>
              </g>
            ))}
            {timeLabels(a.from, a.to).map((l, i) => (
              <text key={i} x={a.scaleX(l.t)} y={H - 8} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} opacity={0.5}>
                {l.label}
              </text>
            ))}
          </g>
          {a.days.map(([d, v]) => (
            <g key={d}>
              {v.mint > 0 && <rect x={a.scaleX(d) - a.bar / 2} width={a.bar} y={a.mid - (v.mint / a.top) * a.half} height={(v.mint / a.top) * a.half} rx={1.5} fill="currentColor" />}
              {v.burn > 0 && <rect x={a.scaleX(d) - a.bar / 2} width={a.bar} y={a.mid} height={(v.burn / a.top) * a.half} rx={1.5} fill="#8f1d13" />}
            </g>
          ))}
        </svg>
        <div className="flex items-center gap-4 text-xs opacity-70">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-ink" /> {t("mintedLegend")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#8f1d13" }} /> {t("burnedLegend")}
          </span>
          {!events.length && <span>{t("noActivityYet")}</span>}
        </div>
      </Frame>
    </div>
  );
}
