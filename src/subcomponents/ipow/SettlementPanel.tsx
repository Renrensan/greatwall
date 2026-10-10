"use client";

// Bitcoin selected on a page that only programmable networks run (index
// tokens, Lock): Bitcoin runs no programs. It is the record every network
// checks for itself, not a place apps live. The panel says so, offers the
// same page on a programmable network, and points to what Bitcoin is for
// here: converting BTC.

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";

import { bitcoin } from "@/index";
import { emptyAction } from "./EmptyPanel";

/** The programmable networks offered, in the order people use them most. */
const OFFERED = ["solana", "ethereum", "base", "arbitrum", "robinhood", "hyperliquid"] as const;
const cap = (s: string) => (s === "hyperliquid" ? "HyperEVM" : s.charAt(0).toUpperCase() + s.slice(1));

/** `feature`: what the page does, e.g. "Index tokens"; `hrefOn`: the same page on another network. */
export function SettlementPanel({ feature, hrefOn }: { feature: string; hrefOn: (network: string) => string }) {
  const t = useTranslations("Beta");
  const { locale } = useParams<{ locale: string }>();
  return (
    <section className="rounded-2xl bg-paper border border-ink/10 p-6 sm:p-10 flex flex-col md:flex-row md:items-center gap-8 md:gap-12" aria-labelledby="settlement-title">
      <div className="flex flex-col gap-4 md:flex-1 min-w-0">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] opacity-60">
          <Image src={bitcoin} alt="" className="w-4 h-4 rounded-full" />
          {t("settlementEyebrow")}
        </span>
        <h2 id="settlement-title" className="font-display text-3xl sm:text-4xl leading-[1.08] pb-[0.08em]" style={{ textWrap: "balance" }}>
          {t("settlementTitle", { feature })}
        </h2>
        <p className="text-sm sm:text-base opacity-75 max-w-xl leading-relaxed">{t("settlementText", { feature })}</p>
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-xs font-semibold opacity-70">{t("settlementOpenOn")}</span>
          <div className="flex flex-wrap gap-2">
            {OFFERED.map((n) => (
              <Link
                key={n}
                href={hrefOn(n)}
                className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-snow/60 px-3 py-2 text-sm font-semibold hover:border-ink/40 hover:bg-snow transition-colors"
              >
                <img src={`/assets/networks/${n}.png`} alt="" className="w-5 h-5 rounded-full" />
                {cap(n)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* What Bitcoin is for on Greatwall. */}
      <div className="md:w-[300px] shrink-0 rounded-2xl bg-well border border-ink/10 p-5 flex flex-col gap-3">
        <span className="w-11 h-11 rounded-full bg-[#f7931a]/15 flex items-center justify-center" aria-hidden>
          <Icon icon="cryptocurrency:btc" className="text-2xl text-[#f7931a]" />
        </span>
        <h3 className="text-base font-bold">{t("settlementConvertTitle")}</h3>
        <p className="text-xs opacity-70 leading-relaxed">{t("settlementConvertText")}</p>
        <Link href={`/${locale}/bitcoin/convert/create`} className={`${emptyAction} justify-center`}>
          <Icon icon="solar:transfer-horizontal-bold" className="text-base" />
          {t("settlementConvert")}
        </Link>
      </div>
    </section>
  );
}
