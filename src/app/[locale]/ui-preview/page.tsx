"use client";

import React, { useState } from "react";

function AnimatedEllipsis() {
  return (
    <span className="inline-flex tracking-widest ml-0.5 font-normal">
      <span className="animate-pulse [animation-duration:1.4s] [animation-delay:0ms]">.</span>
      <span className="animate-pulse [animation-duration:1.4s] [animation-delay:200ms]">.</span>
      <span className="animate-pulse [animation-duration:1.4s] [animation-delay:400ms]">.</span>
    </span>
  );
}

interface StepperCardProps {
  title: string;
  subtitle?: string;
  status: "WAITING" | "PAID" | "PENDING" | "COMPLETED";
  isConverting?: boolean;
  tokenTicker?: string;
  network?: string;
  locale?: "en" | "id";
  forceAllSpinners?: boolean;
}

function StepperDemo({
  title,
  subtitle,
  status,
  isConverting = false,
  tokenTicker = "USDC",
  network = "solana",
  locale = "en",
  forceAllSpinners = false,
}: StepperCardProps) {
  const bgFlip =
    network === "hedera" || network === "polkadot"
      ? "bg-black dark:bg-white"
      : (network === "base" ? "bg-[#0052FF]" : `bg-${network}`);
  const activeStepText =
    network === "hedera" || network === "polkadot"
      ? "text-white dark:text-black"
      : "text-white";

  const getStepTitle = (step: string) => {
    if (locale === "id") {
      return step === "PAID"
        ? "Sudah Bayar"
        : step === "PENDING"
          ? "Diproses"
          : "Selesai";
    }
    return step === "PAID"
      ? "Paid"
      : step === "PENDING"
        ? "Processing"
        : "Completed";
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </p>
          )}
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
          Status: {status}
        </span>
      </div>

      {/* The Stepper Component */}
      <div className="py-2">
        <div className="flex items-start justify-between w-full max-w-md mx-auto">
          {["PAID", "PENDING", "COMPLETED"].map((step, index) => {
            const isCompleted =
              (status === "PENDING" && step === "PAID") ||
              (status === "COMPLETED" && ["PAID", "PENDING"].includes(step));
            const isCurrent = status === step || forceAllSpinners;

            const showPaidSpinner =
              (isCurrent && step === "PAID") || (forceAllSpinners && step === "PAID");
            const showPendingSpinner =
              (isCurrent && step === "PENDING") ||
              (forceAllSpinners && step === "PENDING");

            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center flex-1 min-w-0">
                  {/* Step Number Circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      isCompleted
                        ? `${bgFlip} ${activeStepText}`
                        : isCurrent
                          ? `${bgFlip} ${activeStepText} animate-pulse`
                          : "bg-gray-300 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Step Title */}
                  <div
                    className={`mt-1.5 text-[11px] sm:text-xs font-semibold text-center truncate w-full ${
                      network === "hedera" || network === "polkadot"
                        ? ""
                        : (network === "base" ? "text-[#0052FF]" : `text-${network}`)
                    }`}
                  >
                    {getStepTitle(step)}
                  </div>

                  {/* Sub-status: Step 1 (PAID) */}
                  {showPaidSpinner && (
                    <div className="mt-1 flex flex-col items-center justify-center text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 font-medium text-center w-full px-0.5 leading-tight">
                      <div className="flex items-center justify-center gap-1">
                        <div
                          className={`animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent ${
                            network === "hedera" || network === "polkadot"
                              ? ""
                              : (network === "base" ? "text-[#0052FF]" : `text-${network}`)
                          } rounded-full shrink-0`}
                        />
                        <span>
                          {isConverting
                            ? locale === "id"
                              ? "Konversi"
                              : "Converting"
                            : "Minting"}
                        </span>
                      </div>
                      <div className="flex items-center justify-center whitespace-nowrap">
                        <span>
                          {isConverting
                            ? locale === "id"
                              ? `IDRX ke ${tokenTicker}`
                              : `IDRX to ${tokenTicker}`
                            : "IDRX"}
                        </span>
                        <AnimatedEllipsis />
                      </div>
                    </div>
                  )}

                  {/* Sub-status: Step 2 (PENDING) */}
                  {showPendingSpinner && (
                    <div className="mt-1 flex flex-col items-center justify-center text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 font-medium text-center w-full px-0.5 leading-tight">
                      <div className="flex items-center justify-center gap-1">
                        <div
                          className={`animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent ${
                            network === "hedera" || network === "polkadot"
                              ? ""
                              : (network === "base" ? "text-[#0052FF]" : `text-${network}`)
                          } rounded-full shrink-0`}
                        />
                        <span>{locale === "id" ? "Mengirim" : "Sending"}</span>
                      </div>
                      <div className="flex items-center justify-center whitespace-nowrap">
                        <span>
                          {locale === "id" ? "ke wallet" : "to wallet"}
                        </span>
                        <AnimatedEllipsis />
                      </div>
                    </div>
                  )}
                </div>

                {/* Connecting Line */}
                {index < 2 && (
                  <div
                    className={`h-0.5 sm:h-1 flex-1 mx-1.5 sm:mx-2.5 mt-3.5 sm:mt-3.5 rounded-full transition-colors ${
                      ["COMPLETED", "PENDING"].includes(status) &&
                      index < (status === "COMPLETED" ? 2 : 1)
                        ? `${bgFlip}`
                        : "bg-gray-300 dark:bg-white/10"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function UIPreviewPage() {
  const [network, setNetwork] = useState<string>("solana");
  const [locale, setLocale] = useState<"en" | "id">("en");
  const [tokenTicker, setTokenTicker] = useState<string>("SOL");

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Stepper & Spinner UI Preview
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Visual showcase for progress states, connector lines, and loading spinners across all screens.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5 bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold">
              <button
                onClick={() => setLocale("en")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  locale === "en"
                    ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white"
                    : "text-neutral-500"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLocale("id")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  locale === "id"
                    ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white"
                    : "text-neutral-500"
                }`}
              >
                ID
              </button>
            </div>

            {/* Token Selector */}
            <select
              value={tokenTicker}
              onChange={(e) => setTokenTicker(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            >
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="HBAR">HBAR</option>
              <option value="DOT">DOT</option>
            </select>

            {/* Network Selector */}
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            >
              <option value="solana">Solana (Purple)</option>
              <option value="bitcoin">Bitcoin (Orange)</option>
              <option value="ethereum">Ethereum (Blue)</option>
              <option value="hedera">Hedera (Black/White)</option>
              <option value="polkadot">Polkadot (Pink/White)</option>
            </select>
          </div>
        </div>

        {/* Highlighted Showcase: All Spinners Enabled Together */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <h2 className="text-sm font-bold text-amber-700 dark:text-amber-300">
              Live Multi-Spinner Mode (All Active at Once)
            </h2>
          </div>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
            This demo activates both the <strong>PAID</strong> spinner and the <strong>PENDING</strong> spinner simultaneously so you can verify that connector lines, circle numbers, and labels remain aligned without any shifting.
          </p>
          <StepperDemo
            title="All Spinners Active Simultaneously"
            subtitle="Testing vertical baseline locking with multiple active loading states"
            status="PAID"
            isConverting={true}
            tokenTicker={tokenTicker}
            network={network}
            locale={locale}
            forceAllSpinners={true}
          />
        </div>

        {/* All Individual Step States */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Individual Lifecycle States
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {/* State 1: Paid - Minting */}
            <StepperDemo
              title="1. Paid (Minting IDRX)"
              subtitle="User paid fiat IDR; IDRX token is minting to operator wallet"
              status="PAID"
              isConverting={false}
              tokenTicker={tokenTicker}
              network={network}
              locale={locale}
            />

            {/* State 2: Paid - Converting */}
            <StepperDemo
              title={`2. Paid (Converting IDRX to ${tokenTicker})`}
              subtitle="IDRX is swapped on DEX / Jupiter into target token or USDT"
              status="PAID"
              isConverting={true}
              tokenTicker={tokenTicker}
              network={network}
              locale={locale}
            />

            {/* State 3: Pending - Sending to wallet */}
            <StepperDemo
              title="3. Processing (Sending to wallet)"
              subtitle="Transferring native crypto directly to user's destination wallet"
              status="PENDING"
              isConverting={true}
              tokenTicker={tokenTicker}
              network={network}
              locale={locale}
            />

            {/* State 4: Completed */}
            <StepperDemo
              title="4. Completed"
              subtitle="All transfers confirmed on-chain. Order finished successfully."
              status="COMPLETED"
              isConverting={false}
              tokenTicker={tokenTicker}
              network={network}
              locale={locale}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
