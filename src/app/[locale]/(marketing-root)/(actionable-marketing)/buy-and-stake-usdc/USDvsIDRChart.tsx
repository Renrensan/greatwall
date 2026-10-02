"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNetwork } from "@/app/network-provider";

interface USDvsIDRChartProps {
  locale: string;
}

const LABELS: Record<string, Record<string, string>> = {
  id: {
    title: "Perbandingan Investasi IDR vs USD",
    totalIdrSavings: "TOTAL TABUNGAN IDR",
    totalUsdSavings: "TOTAL TABUNGAN USD (DALAM IDR)",
    legendIdr: "Tabungan IDR",
    legendUsd: "Tabungan USD",
    yAxisLabel: "↑ Nilai (IDR)",
    initialCapital: "Modal Awal (IDR)",
    currentRate: "Kurs USD/IDR",
    idrApy: "APY IDR (%)",
    usdApy: "APY USD (%)",
    depreciation: "Depresiasi IDR vs USD (%)",
    years: "Tahun",
    yearLabel: "Tahun",
  },
  en: {
    title: "IDR vs USD Investment Comparison",
    totalIdrSavings: "TOTAL IDR SAVINGS",
    totalUsdSavings: "TOTAL USD SAVINGS (IN IDR)",
    legendIdr: "IDR Savings",
    legendUsd: "USD Savings",
    yAxisLabel: "↑ Value (IDR)",
    initialCapital: "Initial Capital (IDR)",
    currentRate: "Current USD/IDR",
    idrApy: "IDR APY (%)",
    usdApy: "USD APY (%)",
    depreciation: "IDR Depreciation vs USD (%)",
    years: "Years",
    yearLabel: "Year",
  },
};

export default function USDvsIDRChart({ locale }: USDvsIDRChartProps) {
  const t = LABELS[locale] || LABELS.en;
  const { solanaMainnet } = useNetwork();

  // State
  const [initialCapital, setInitialCapital] = useState<number>(10000000);
  // Starts at a plain guess, then gets replaced by a real rate derived from the same
  // /api/estimate-deposit endpoint the buy widget uses (see effect below) — this field
  // stays a user-editable "what-if" input for the projection, it just no longer *starts*
  // from a stale hardcoded number.
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number>(18000);
  const hasUserEditedRateRef = useRef(false);
  const [idrApy, setIdrApy] = useState<number>(5);
  const [usdApy, setUsdApy] = useState<number>(5);
  const [idrDepreciation, setIdrDepreciation] = useState<number>(4);
  const [years, setYears] = useState<number>(10);

  useEffect(() => {
    const fetchLiveRate = async () => {
      try {
        const idrAmount = 1000000;
        const params = new URLSearchParams({
          network: "SOLANA",
          token: "USDC",
          idr: idrAmount.toString(),
          env: solanaMainnet ? "MAINNET" : "TESTNET",
          paymentMethod: "QRIS",
        });
        const res = await fetch(`/api/estimate-deposit?${params.toString()}`);
        const data = await res.json();
        const token = data.token || data.qris?.token || data.va?.token || 0;
        if (token > 0 && !hasUserEditedRateRef.current) {
          setCurrentExchangeRate(Math.round(idrAmount / token));
        }
      } catch (err) {
        console.error("Failed to fetch live USD/IDR rate:", err);
      }
    };
    fetchLiveRate();
  }, [solanaMainnet]);

  // Tooltip & Hover interaction state
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Calculate year-by-year values
  const points = useMemo(() => {
    const list = [];
    const cap = isNaN(initialCapital) ? 0 : initialCapital;
    const rIdr = isNaN(idrApy) ? 0 : idrApy / 100;
    const rUsd = isNaN(usdApy) ? 0 : usdApy / 100;
    const dep = isNaN(idrDepreciation) ? 0 : idrDepreciation / 100;

    for (let i = 0; i <= years; i++) {
      const idrVal = cap * Math.pow(1 + rIdr, i);
      const usdVal = cap * Math.pow(1 + rUsd, i) * Math.pow(1 + dep, i);
      list.push({ year: i, idr: idrVal, usd: usdVal });
    }
    return list;
  }, [initialCapital, idrApy, usdApy, idrDepreciation, years]);

  // Totals at the target year
  const totalIdrSavings = points[points.length - 1]?.idr || 0;
  const totalUsdSavings = points[points.length - 1]?.usd || 0;

  // SVG parameters
  const svgWidth = 500;
  const svgHeight = 280;
  const paddingLeft = 65;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Max value to scale Y axis
  const maxVal = useMemo(() => {
    const maxValFound = Math.max(...points.map((p) => Math.max(p.idr, p.usd)));
    return maxValFound > 0 ? maxValFound : 1000;
  }, [points]);

  const yMaxLimit = maxVal * 1.1; // 10% padding on top

  // Helpers
  const formatCurrency = (val: number) => {
    const numberFormat = new Intl.NumberFormat(
      locale === "id" ? "id-ID" : "en-US",
      {
        maximumFractionDigits: 0,
      },
    );
    return "Rp " + numberFormat.format(Math.round(val));
  };

  const formatYAxis = (val: number) => {
    if (val >= 1000000) {
      const millions = val / 1000000;
      return `Rp ${millions.toFixed(1)}${locale === "id" ? " Jt" : "M"}`;
    }
    if (val >= 1000) {
      return `Rp ${(val / 1000).toFixed(0)}k`;
    }
    return `Rp ${val}`;
  };

  // Convert points to SVG coordinates
  const svgPoints = useMemo(() => {
    return points.map((p) => {
      const x = paddingLeft + (p.year / years) * chartWidth;
      const y = svgHeight - paddingBottom - (p.idr / yMaxLimit) * chartHeight;
      const yUsd =
        svgHeight - paddingBottom - (p.usd / yMaxLimit) * chartHeight;
      return { x, yIdr: y, yUsd };
    });
  }, [
    points,
    years,
    chartWidth,
    chartHeight,
    yMaxLimit,
    svgHeight,
    paddingBottom,
  ]);

  // Construct line path strings
  const idrLinePath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    return svgPoints
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.yIdr}`)
      .join(" ");
  }, [svgPoints]);

  const usdLinePath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    return svgPoints
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.yUsd}`)
      .join(" ");
  }, [svgPoints]);

  // Construct area path strings
  const idrAreaPath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    const linePath = idrLinePath;
    const startX = svgPoints[0].x;
    const endX = svgPoints[svgPoints.length - 1].x;
    const bottomY = svgHeight - paddingBottom;
    return `${linePath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
  }, [svgPoints, idrLinePath, svgHeight, paddingBottom]);

  const usdAreaPath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    const linePath = usdLinePath;
    const startX = svgPoints[0].x;
    const endX = svgPoints[svgPoints.length - 1].x;
    const bottomY = svgHeight - paddingBottom;
    return `${linePath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
  }, [svgPoints, usdLinePath, svgHeight, paddingBottom]);

  // Handle SVG Mouse Move to set tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouseX to SVG coordinate scale
    const svgX = (mouseX / rect.width) * svgWidth;
    const relativeX = svgX - paddingLeft;
    const yearPercent = relativeX / chartWidth;
    const currentYearIndex = Math.max(
      0,
      Math.min(years, Math.round(yearPercent * years)),
    );

    setHoveredIndex(currentYearIndex);
    setTooltipPos({ x: mouseX, y: mouseY });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTooltipPos(null);
  };

  // Generate Y-axis grid ticks
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      ticks.push((yMaxLimit / count) * i);
    }
    return ticks;
  }, [yMaxLimit]);

  // Current values at hovered index (if any)
  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const currentUsdRateAtHoveredYear = useMemo(() => {
    if (hoveredPoint === null) return currentExchangeRate;
    const dep = isNaN(idrDepreciation) ? 0 : idrDepreciation / 100;
    return currentExchangeRate * Math.pow(1 + dep, hoveredPoint.year);
  }, [hoveredPoint, currentExchangeRate, idrDepreciation]);

  const usdValInOriginalCurrencyAtHover = hoveredPoint
    ? hoveredPoint.usd / currentUsdRateAtHoveredYear
    : 0;

  return (
    <div className="glass-card bg-white/10! border border-white/10! dark:bg-white/10! dark:border-white/10! rounded-3xl p-6 sm:p-8 text-neutral-900 dark:text-white w-full max-w-2xl font-grotesk shadow-2xl backdrop-blur-xl relative z-30">
      {/* Top Section: Title and Metrics */}
      <div className="flex flex-col   sm:justify-between gap-4 mb-6">
        <h3 className="text-xl font-bold tracking-tight text-left leading-snug text-neutral-900 dark:text-white">
          {t.title}
        </h3>
        <div>
          {/* Legend */}
          {/* <div className="flex items-center gap-4 mt-3 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-[#3b82f6] inline-block"></span>
              <span>{t.legendIdr}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-[#f43f5e] inline-block"></span>
              <span>{t.legendUsd}</span>
            </div>
          </div> */}
        </div>

        {/* Dynamic total indicators */}
        <div className="flex flex-col md:justify-between lg:flex-row w-full gap-3 sm:gap-1.5 text-left lg:text-right">
          <div>
            <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium tracking-wider uppercase">
              {t.totalIdrSavings}
            </p>
            <p className="text-base sm:text-lg font-extrabold text-[#3b82f6]">
              {formatCurrency(totalIdrSavings)}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium tracking-wider uppercase">
              {t.totalUsdSavings}
            </p>
            <p className="text-base sm:text-lg font-extrabold text-[#f43f5e]">
              {formatCurrency(totalUsdSavings)}
            </p>
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full aspect-500/280 mb-6 select-none bg-neutral-900/5 dark:bg-neutral-900/30 rounded-2xl border border-black/5 dark:border-white/5 p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Gradients */}
          <defs>
            {/* For Dark Vibes (dark mode page) */}
            <linearGradient id="idr-gradient-dark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="usd-gradient-dark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.01" />
            </linearGradient>

            {/* For Light Vibes (light mode page) */}
            <linearGradient id="idr-gradient-light" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="usd-gradient-light" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines (Horizontal) */}
          {yTicks.map((tickVal, i) => {
            const y =
              svgHeight - paddingBottom - (tickVal / yMaxLimit) * chartHeight;
            return (
              <g key={i} className="opacity-70">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-black/8 dark:text-white/8"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="9.5"
                  className="font-medium fill-neutral-500 dark:fill-neutral-400"
                >
                  {formatYAxis(tickVal)}
                </text>
              </g>
            );
          })}

          {/* Y Axis Label */}
          <text
            x={paddingLeft}
            y={paddingTop - 6}
            fontSize="9"
            fontWeight="bold"
            textAnchor="start"
            className="fill-neutral-600 dark:fill-neutral-500"
          >
            {t.yAxisLabel}
          </text>

          {/* Grid lines & labels (Vertical / Years) */}
          {points.map((pt, i) => {
            // Label every couple of years on smaller grids or all on standard sizes
            const showLabel =
              years <= 12 || i % Math.ceil(years / 10) === 0 || i === years;
            const x = paddingLeft + (pt.year / years) * chartWidth;
            return (
              <g key={i}>
                {showLabel && (
                  <>
                    <line
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={svgHeight - paddingBottom}
                      stroke="currentColor"
                      className="text-black/4 dark:text-white/4"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={svgHeight - paddingBottom + 16}
                      textAnchor="middle"
                      fontSize="9.5"
                      className="font-medium fill-neutral-500 dark:fill-neutral-400"
                    >
                      {locale === "id" ? `Th ${pt.year}` : `Yr ${pt.year}`}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Shaded Areas */}
          <path
            d={idrAreaPath}
            className="fill-[url(#idr-gradient-light)] dark:fill-[url(#idr-gradient-dark)]"
          />
          <path
            d={usdAreaPath}
            className="fill-[url(#usd-gradient-light)] dark:fill-[url(#usd-gradient-dark)]"
          />

          {/* Lines */}
          <path
            d={idrLinePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={usdLinePath}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Value points (circles) */}
          {svgPoints.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.yIdr}
                  r={isHovered ? 5 : 3.5}
                  fill="#3b82f6"
                  stroke="#ffffff"
                  className="stroke-white dark:stroke-neutral-950 transition-all duration-100 ease-out"
                  strokeWidth={isHovered ? 2 : 1.5}
                />
                <circle
                  cx={pt.x}
                  cy={pt.yUsd}
                  r={isHovered ? 5 : 3.5}
                  fill="#f43f5e"
                  stroke="#ffffff"
                  className="stroke-white dark:stroke-neutral-950 transition-all duration-100 ease-out"
                  strokeWidth={isHovered ? 2 : 1.5}
                />
              </g>
            );
          })}

          {/* Hover Vertical Guide Line */}
          {hoveredIndex !== null && svgPoints[hoveredIndex] && (
            <line
              x1={svgPoints[hoveredIndex].x}
              y1={paddingTop}
              x2={svgPoints[hoveredIndex].x}
              y2={svgHeight - paddingBottom}
              stroke="currentColor"
              className="text-black/40 dark:text-white/40"
              strokeDasharray="3,3"
              strokeWidth="1.5"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* HTML Floating Tooltip */}
        {hoveredIndex !== null && tooltipPos && hoveredPoint && (
          <div
            className="absolute z-40 bg-white/95 dark:bg-neutral-950/95 border border-black/10 dark:border-white/10 p-3 rounded-xl shadow-xl pointer-events-none text-xs flex flex-col gap-1.5 transition-all duration-75 ease-out backdrop-blur-md min-w-[170px]"
            style={{
              left: `${Math.min(tooltipPos.x + 12, svgRef.current ? svgRef.current.clientWidth - 182 : 300)}px`,
              top: `${Math.min(tooltipPos.y - 12, svgRef.current ? svgRef.current.clientHeight - 110 : 200)}px`,
            }}
          >
            <div className="font-extrabold text-neutral-600 dark:text-neutral-300 pb-0.5 border-b border-black/10 dark:border-white/10">
              {t.yearLabel} {hoveredPoint.year}
            </div>
            <div className="flex items-center justify-between gap-4 mt-0.5">
              <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
                IDR:
              </span>
              <span className="font-bold text-black dark:text-white">
                {formatCurrency(hoveredPoint.idr)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
                USD:
              </span>
              <span className="font-bold text-black dark:text-white flex flex-col items-end">
                <span>{formatCurrency(hoveredPoint.usd)}</span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal">
                  ($
                  {usdValInOriginalCurrencyAtHover.toLocaleString(
                    locale === "id" ? "id-ID" : "en-US",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                  )
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls Form Grid */}
      <div className="flex flex-col gap-4 text-xs sm:text-sm">
        {/* Row 1: Capital & Exchange rate */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-neutral-500 dark:text-neutral-400 font-semibol text-left">
              {t.initialCapital}
            </label>
            <input
              type="number"
              value={initialCapital === 0 ? "" : initialCapital}
              onChange={(e) =>
                setInitialCapital(Math.max(0, parseInt(e.target.value) || 0))
              }
              className="bg-black/5 border border-black/15 focus:border-[#3b82f6] dark:bg-white/5 dark:border-white/15 dark:focus:border-[#3b82f6] rounded-xl px-3.5 py-2.5 outline-none font-bold text-black dark:text-white transition-all text-sm"
              placeholder="e.g. 10000000"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-neutral-500 dark:text-neutral-400 font-semibold text-left">
              {t.currentRate}
            </label>
            <input
              type="number"
              value={currentExchangeRate === 0 ? "" : currentExchangeRate}
              onChange={(e) => {
                hasUserEditedRateRef.current = true;
                setCurrentExchangeRate(
                  Math.max(0, parseInt(e.target.value) || 0),
                );
              }}
              className="bg-black/5 border border-black/15 focus:border-[#f43f5e] dark:bg-white/5 dark:border-white/15 dark:focus:border-[#f43f5e] rounded-xl px-3.5 py-2.5 outline-none font-bold text-black dark:text-white transition-all text-sm"
              placeholder="e.g. 16000"
            />
          </div>
        </div>

        {/* Row 2: IDR APY & USD APY sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* IDR APY */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400 font-semibold">
              <span>{t.idrApy}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={idrApy}
                onChange={(e) => setIdrApy(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#3b82f6] outline-none"
              />
              <input
                type="number"
                min="0"
                max="25"
                step="0.1"
                value={idrApy}
                onChange={(e) =>
                  setIdrApy(
                    Math.max(0, Math.min(25, parseFloat(e.target.value) || 0)),
                  )
                }
                className="bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10 rounded-xl px-2 py-1.5 w-14 text-center font-bold text-black dark:text-white outline-none"
              />
            </div>
          </div>

          {/* USD APY */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400 font-semibold">
              <span>{t.usdApy}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={usdApy}
                onChange={(e) => setUsdApy(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#f43f5e] outline-none"
              />
              <input
                type="number"
                min="0"
                max="25"
                step="0.1"
                value={usdApy}
                onChange={(e) =>
                  setUsdApy(
                    Math.max(0, Math.min(25, parseFloat(e.target.value) || 0)),
                  )
                }
                className="bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10 rounded-xl px-2 py-1.5 w-14 text-center font-bold text-black dark:text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Depreciation & Years sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Depreciation */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400 font-semibold">
              <span>{t.depreciation}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={idrDepreciation}
                onChange={(e) => setIdrDepreciation(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white outline-none"
              />
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={idrDepreciation}
                onChange={(e) =>
                  setIdrDepreciation(
                    Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)),
                  )
                }
                className="bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10 rounded-xl px-2 py-1.5 w-14 text-center font-bold text-black dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Years */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400 font-semibold">
              <span>{t.years}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={years}
                onChange={(e) => setYears(parseInt(e.target.value) || 1)}
                className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white outline-none"
              />
              <input
                type="number"
                min="1"
                max="30"
                step="1"
                value={years}
                onChange={(e) =>
                  setYears(
                    Math.max(1, Math.min(30, parseInt(e.target.value) || 1)),
                  )
                }
                className="bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10 rounded-xl px-2 py-1.5 w-14 text-center font-bold text-black dark:text-white outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
