"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";

export type RewardHistoryEntry = {
  date: string;
  usdAmount: number;
  sharesAmount: number;
  apy: number;
  dailyInterestEarnedUsd: number;
  dailyInterestEarnedUsdc: number;
  cumulativeInterestEarnedUsd: number;
  cumulativeInterestEarnedUsdc: number;
};

type DateRange = "current_month" | "last_month" | "this_year" | "last_year" | "all" | "custom";
type GroupBy = "day" | "week" | "month" | "year";
type ChartRange = "7d" | "30d" | "3m" | "all";

const DATE_RANGE_OPTIONS: { id: DateRange; enLabel: string; idLabel: string }[] = [
  { id: "current_month", enLabel: "Current month", idLabel: "Bulan Ini" },
  { id: "last_month", enLabel: "Last month", idLabel: "Bulan Lalu" },
  { id: "this_year", enLabel: "This year", idLabel: "Tahun Ini" },
  { id: "last_year", enLabel: "Last year", idLabel: "Tahun Lalu" },
  { id: "all", enLabel: "All time", idLabel: "Sepanjang Waktu" },
  { id: "custom", enLabel: "Custom", idLabel: "Kustom" },
];

const GROUP_BY_OPTIONS: { id: GroupBy; enLabel: string; idLabel: string }[] = [
  { id: "day", enLabel: "Day", idLabel: "Hari" },
  { id: "week", enLabel: "Week", idLabel: "Minggu" },
  { id: "month", enLabel: "Month", idLabel: "Bulan" },
  { id: "year", enLabel: "Year", idLabel: "Tahun" },
];

const CHART_RANGE_OPTIONS: { id: ChartRange; label: string }[] = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "3m", label: "3M" },
  { id: "all", label: "All time" },
];

function startOfUtcWeek(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diffToMonday);
  return date;
}

/** The small resolved-date hint shown to the right of each radio row (e.g. "Jul 2026" next
 * to "Current month") — purely informational, doesn't affect filtering. */
function dateRangeHint(id: DateRange, locale: string): string {
  const localeTag = locale === "en" ? "en-US" : "id-ID";
  const now = new Date();
  if (id === "current_month") return now.toLocaleDateString(localeTag, { month: "short", year: "numeric" });
  if (id === "last_month") {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return d.toLocaleDateString(localeTag, { month: "short", year: "numeric" });
  }
  if (id === "this_year") return `${now.getUTCFullYear()}`;
  if (id === "last_year") return `${now.getUTCFullYear() - 1}`;
  return "";
}

function rangeBounds(
  range: DateRange,
  customStart: string,
  customEnd: string,
): { start: Date | null; end: Date | null } {
  const now = new Date();
  switch (range) {
    case "current_month":
      return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: null };
    case "last_month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
      return { start, end };
    }
    case "this_year":
      return { start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), end: null };
    case "last_year": {
      const start = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999));
      return { start, end };
    }
    case "custom":
      return {
        start: customStart ? new Date(`${customStart}T00:00:00Z`) : null,
        end: customEnd ? new Date(`${customEnd}T23:59:59Z`) : null,
      };
    default:
      return { start: null, end: null };
  }
}

/** Rounds to at most 6 decimals (clearing floating-point summation noise like
 * 0.30000000000000004) but trims trailing zeros rather than padding to a fixed width —
 * "5" stays "5", "0.1" stays "0.1", only the genuinely long tail gets capped. */
function roundNominal(value: number): string {
  return String(Math.round(value * 1e6) / 1e6);
}

function cutoffForChartRange(range: ChartRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  if (range === "7d") d.setUTCDate(d.getUTCDate() - 7);
  else if (range === "30d") d.setUTCDate(d.getUTCDate() - 30);
  else if (range === "3m") d.setUTCMonth(d.getUTCMonth() - 3);
  return d;
}

function groupKey(dateStr: string, groupBy: GroupBy): string {
  const d = new Date(dateStr);
  if (groupBy === "day") return d.toISOString().slice(0, 10);
  if (groupBy === "week") return startOfUtcWeek(d).toISOString().slice(0, 10);
  if (groupBy === "month")
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${d.getUTCFullYear()}`;
}

function groupLabel(key: string, groupBy: GroupBy, locale: string): string {
  const localeTag = locale === "en" ? "en-US" : "id-ID";
  if (groupBy === "year") return key;
  if (groupBy === "month") {
    const [y, m] = key.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(localeTag, {
      month: "long",
      year: "numeric",
    });
  }
  if (groupBy === "week") {
    const start = new Date(key);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const fmt = (dt: Date) => dt.toLocaleDateString(localeTag, { month: "short", day: "numeric" });
    return `${fmt(start)} - ${fmt(end)}, ${end.getUTCFullYear()}`;
  }
  return new Date(key).toLocaleDateString(localeTag, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Self-contained area chart — same SVG-viewBox-100x100 approach as SolanaStake's
 * SparklineChart, but plotting a dollar value curve (with its own tooltip format)
 * instead of an APY percentage. Kept separate rather than generalizing the existing
 * one since the two have different value domains, tooltip content, and color language. */
function RewardAreaChart({
  points,
  locale,
}: {
  points: { date: string; value: number }[];
  locale: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length === 0) {
    return (
      <div className="h-40 w-full flex items-center justify-center text-xs opacity-40">
        {locale === "en" ? "No data yet" : "Belum ada data"}
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values);
  const padding = (max - min) * 0.15 || 0.1;
  const adjustedMin = min - padding;
  const adjustedMax = max + padding;
  const range = adjustedMax - adjustedMin || 1;

  const coords = (index: number, val: number) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
    const y = 100 - ((val - adjustedMin) / range) * 100;
    return { x, y };
  };

  const linePoints = values.map((v, i) => {
    const { x, y } = coords(i, v);
    return `${x},${y}`;
  }).join(" ");
  const fillPoints = `0,100 ${linePoints} 100,100`;

  const handleMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = clientX - rect.left;
    const pct = x / rect.width;
    const index = Math.round(pct * (points.length - 1));
    setHoveredIndex(Math.max(0, Math.min(points.length - 1, index)));
  };

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  const hoveredCoords = hoveredIndex !== null ? coords(hoveredIndex, values[hoveredIndex]) : null;

  return (
    <div className="relative w-full h-40 mt-2 overflow-visible group">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="absolute w-full h-full overflow-visible cursor-crosshair"
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoveredIndex(null)}
        onTouchMove={handleMove}
        onTouchEnd={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="gradient-reward-chart" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill="url(#gradient-reward-chart)" className="text-green-500" />
        <polyline
          fill="none"
          stroke="currentColor"
          className="text-green-500"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
        />
        {hoveredCoords && (
          <>
            <line
              x1={hoveredCoords.x}
              y1="0"
              x2={hoveredCoords.x}
              y2="100"
              stroke="currentColor"
              className="opacity-30"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <circle
              cx={hoveredCoords.x}
              cy={hoveredCoords.y}
              r="2.5"
              fill="currentColor"
              className="text-green-500 drop-shadow-md"
            />
          </>
        )}
      </svg>

      {hovered && hoveredCoords && (
        <div
          className="absolute z-50 bottom-[85%] mb-1 -translate-x-1/2 whitespace-nowrap bg-black dark:bg-white text-white dark:text-black text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none flex flex-col items-center gap-0.5 font-medium"
          style={{ left: `${hoveredCoords.x}%` }}
        >
          <span className="font-bold">{hovered.value.toFixed(4)} USDC</span>
          <span className="opacity-70 text-[9px]">
            {new Date(hovered.date).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-black dark:border-t-white" />
        </div>
      )}

      <div className="flex justify-between text-[10px] opacity-40 mt-1">
        <span>
          {new Date(points[0].date).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span>
          {new Date(points[points.length - 1].date).toLocaleDateString(
            locale === "en" ? "en-US" : "id-ID",
            { month: "short", day: "numeric" },
          )}
        </span>
      </div>
    </div>
  );
}

/** Radio-list dropdown that only commits its selection when "Apply" is pressed — matches
 * the two-step filter pattern (pick, then confirm) rather than applying on every click. */
function FilterDropdown<T extends string>({
  label,
  appliedLabel,
  isOpen,
  onOpen,
  pendingValue,
  onPendingChange,
  options,
  hint,
  locale,
  onApply,
  extra,
}: {
  label: string;
  appliedLabel: string;
  isOpen: boolean;
  onOpen: () => void;
  pendingValue: T;
  onPendingChange: (v: T) => void;
  options: { id: T; enLabel: string; idLabel: string }[];
  hint?: (id: T) => string;
  locale: string;
  onApply: () => void;
  extra?: React.ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  // Position is measured off the real trigger button and the panel is portaled straight to
  // <body> as `position: fixed` — so it can never be mistaken for part of the card behind it
  // (both previously shared the same white/rounded/bordered styling, making an in-flow
  // `position: absolute` panel look like the card had simply grown taller) and can never
  // affect that card's layout, since it no longer lives inside its DOM subtree at all.
  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) {
      setCoords(null);
      return;
    }
    const measure = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      // Matches the trigger pill's own width (with a small floor so text/hints don't wrap
      // too aggressively) rather than stretching to a fixed 288px / near-full-viewport panel.
      const width = Math.min(Math.max(rect.width, 200), window.innerWidth - 32);
      const left = Math.min(Math.max(rect.left, 16), window.innerWidth - width - 16);
      setCoords({ top: rect.bottom + 6, left, width });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isOpen]);

  return (
    <div className="w-full sm:w-auto">
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span className="opacity-60">{label}</span>
          <span className="text-green-500">{appliedLabel}</span>
        </span>
        <Icon icon={isOpen ? "mingcute:up-line" : "mingcute:down-line"} className="text-sm opacity-60" />
      </button>
      {isOpen && coords && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
            className="z-[60] glass-card rounded-2xl shadow-xl border border-black/5 dark:border-white/10 p-3 bg-white dark:bg-[#1a1a1a] flex flex-col gap-0.5"
          >
            {options.map((opt) => {
              const hintText = hint?.(opt.id);
              const selected = pendingValue === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onPendingChange(opt.id)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selected ? "border-green-500" : "border-black/20 dark:border-white/20"
                      }`}
                    >
                      {selected && <span className="w-2 h-2 rounded-full bg-green-500" />}
                    </span>
                    <span className="text-sm font-bold">
                      {locale === "en" ? opt.enLabel : opt.idLabel}
                    </span>
                  </span>
                  {hintText && <span className="text-xs opacity-40">{hintText}</span>}
                </button>
              );
            })}

            {extra}

            <button
              type="button"
              onClick={onApply}
              className="mt-2 w-full py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors"
            >
              {locale === "en" ? "Apply" : "Terapkan"}
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function UsdcRewardReport({
  history,
  isLoading,
  locale,
}: {
  history: RewardHistoryEntry[];
  isLoading: boolean;
  locale: string;
}) {
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("month");
  const [chartRange, setChartRange] = useState<ChartRange>("all");

  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [pendingDateRange, setPendingDateRange] = useState<DateRange>(dateRange);
  const [pendingCustomStart, setPendingCustomStart] = useState(customStart);
  const [pendingCustomEnd, setPendingCustomEnd] = useState(customEnd);

  const [groupByOpen, setGroupByOpen] = useState(false);
  const [pendingGroupBy, setPendingGroupBy] = useState<GroupBy>(groupBy);

  const openDateRangeDropdown = () => {
    setPendingDateRange(dateRange);
    setPendingCustomStart(customStart);
    setPendingCustomEnd(customEnd);
    setGroupByOpen(false);
    setDateRangeOpen((v) => !v);
  };

  const openGroupByDropdown = () => {
    setPendingGroupBy(groupBy);
    setDateRangeOpen(false);
    setGroupByOpen((v) => !v);
  };

  const applyDateRange = () => {
    setDateRange(pendingDateRange);
    setCustomStart(pendingCustomStart);
    setCustomEnd(pendingCustomEnd);
    setDateRangeOpen(false);
  };

  const applyGroupBy = () => {
    setGroupBy(pendingGroupBy);
    setGroupByOpen(false);
  };

  const sorted = useMemo(
    () => [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [history],
  );

  const filteredForTable = useMemo(() => {
    const { start, end } = rangeBounds(dateRange, customStart, customEnd);
    return sorted.filter((e) => {
      const t = new Date(e.date).getTime();
      if (start && t < start.getTime()) return false;
      if (end && t > end.getTime()) return false;
      return true;
    });
  }, [sorted, dateRange, customStart, customEnd]);

  const groupedRows = useMemo(() => {
    const buckets = new Map<string, { usdc: number; usd: number }>();
    for (const entry of filteredForTable) {
      const key = groupKey(entry.date, groupBy);
      const bucket = buckets.get(key) ?? { usdc: 0, usd: 0 };
      bucket.usdc += entry.dailyInterestEarnedUsdc;
      bucket.usd += entry.dailyInterestEarnedUsd;
      buckets.set(key, bucket);
    }
    return Array.from(buckets.entries())
      .map(([key, sums]) => ({
        key,
        label: groupLabel(key, groupBy, locale),
        balanceUsdc: sums.usdc,
        estValueUsd: sums.usd,
      }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [filteredForTable, groupBy, locale]);

  const totalForTable = useMemo(
    () => filteredForTable.reduce((sum, e) => sum + e.dailyInterestEarnedUsd, 0),
    [filteredForTable],
  );

  const chartPoints = useMemo(() => {
    const cutoff = cutoffForChartRange(chartRange);
    const filtered = cutoff ? sorted.filter((e) => new Date(e.date) >= cutoff) : sorted;
    return filtered.map((e) => ({ date: e.date, value: e.cumulativeInterestEarnedUsdc }));
  }, [sorted, chartRange]);

  const totalForChart = useMemo(() => {
    if (chartPoints.length === 0) return 0;
    const cutoff = cutoffForChartRange(chartRange);
    if (!cutoff) return chartPoints[chartPoints.length - 1].value;
    return chartPoints[chartPoints.length - 1].value - chartPoints[0].value;
  }, [chartPoints, chartRange]);

  const dateRangeLabel = DATE_RANGE_OPTIONS.find((o) => o.id === dateRange)!;
  const groupByLabel = GROUP_BY_OPTIONS.find((o) => o.id === groupBy)!;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
          <div className="h-5 w-40 bg-black/10 dark:bg-white/10 rounded animate-pulse" />
          <div className="h-24 w-full bg-black/5 dark:bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* --- Rewards report (grouped table) --- */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base sm:text-lg">
            {locale === "en" ? "Rewards Report" : "Laporan Reward"}
          </h3>
          <span className="font-black text-green-500 text-lg sm:text-xl whitespace-nowrap">
            ${roundNominal(totalForTable)}
          </span>
        </div>

        {(dateRangeOpen || groupByOpen) && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setDateRangeOpen(false);
              setGroupByOpen(false);
            }}
          />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <FilterDropdown
            label={locale === "en" ? "Date range" : "Rentang Tanggal"}
            appliedLabel={locale === "en" ? dateRangeLabel.enLabel : dateRangeLabel.idLabel}
            isOpen={dateRangeOpen}
            onOpen={openDateRangeDropdown}
            pendingValue={pendingDateRange}
            onPendingChange={setPendingDateRange}
            options={DATE_RANGE_OPTIONS}
            hint={(id) => dateRangeHint(id, locale)}
            locale={locale}
            onApply={applyDateRange}
            extra={
              pendingDateRange === "custom" ? (
                <div className="flex items-center gap-2 px-2 py-2">
                  <input
                    type="date"
                    value={pendingCustomStart}
                    onChange={(e) => setPendingCustomStart(e.target.value)}
                    className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
                  />
                  <span className="text-xs opacity-40">-</span>
                  <input
                    type="date"
                    value={pendingCustomEnd}
                    onChange={(e) => setPendingCustomEnd(e.target.value)}
                    className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
                  />
                </div>
              ) : undefined
            }
          />

          <FilterDropdown
            label={locale === "en" ? "Group by" : "Kelompokkan"}
            appliedLabel={locale === "en" ? groupByLabel.enLabel : groupByLabel.idLabel}
            isOpen={groupByOpen}
            onOpen={openGroupByDropdown}
            pendingValue={pendingGroupBy}
            onPendingChange={setPendingGroupBy}
            options={GROUP_BY_OPTIONS}
            locale={locale}
            onApply={applyGroupBy}
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide opacity-40 border-b border-black/5 dark:border-white/10 pb-2">
            <span className="flex-1">{locale === "en" ? "Date" : "Tanggal"}</span>
            <span className="flex-1 text-right sm:text-left sm:flex-[1.2]">
              {locale === "en" ? "Balance (USDC)" : "Saldo (USDC)"}
            </span>
            <span className="flex-1 text-right hidden sm:block">
              {locale === "en" ? "Est. value" : "Est. Nilai"}
            </span>
          </div>

          {groupedRows.length === 0 ? (
            <p className="text-xs opacity-40 py-6 text-center">
              {locale === "en" ? "No rewards recorded yet" : "Belum ada reward tercatat"}
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto custom-scrollbar">
              {groupedRows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between text-sm py-3 border-b border-black/5 dark:border-white/5 last:border-none"
                >
                  <span className="flex-1 font-bold">{row.label}</span>
                  <span className="flex-1 text-right sm:text-left sm:flex-[1.2] font-mono">
                    {roundNominal(row.balanceUsdc)}
                  </span>
                  <span className="flex-1 text-right font-mono hidden sm:block">
                    ${roundNominal(row.estValueUsd)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- Total rewards (chart) --- */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wide opacity-50">
              {locale === "en" ? "Total Rewards" : "Total Reward"}
            </span>
            <span className="font-black text-green-500 text-xl sm:text-2xl">
              {roundNominal(totalForChart)} USDC
            </span>
          </div>

          <div className="flex gap-1 glass-card p-1 rounded-full shadow-sm">
            {CHART_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChartRange(opt.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  chartRange === opt.id
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                    : "opacity-50 hover:opacity-80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <RewardAreaChart points={chartPoints} locale={locale} />
      </div>
    </div>
  );
}
