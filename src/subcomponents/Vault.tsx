"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import Assets from "./Assets";
import PortfolioBeta from "./PortfolioBeta";
import { Poster } from "./ipow/Poster";
import HoldingsSummary from "./HoldingsSummary";
import poster from "@/assets/background-portfolio.jpg";

// Portfolio: the regular assets the wallet holds (with the faucet, convert
// and send), and the BETA it holds (with the bridge and send). Moving assets
// to another network is the Bridge app's.
const VALID_SECTIONS = ["assets", "beta"] as const;
const DEFAULT_SECTION = "assets";

const vaultTabMap: Record<string, number> = {
  assets: 0,
  beta: 1,
};

const reverseVaultTabMap: Record<number, string> = {
  0: "assets",
  1: "beta",
};

export default function Vault() {
  const t = useTranslations("All");
  const router = useRouter();

  const { locale, network, section } = useParams<{
    locale: string;
    network: string;
    section: string;
  }>();

  const vaultSectionFromPath = section ?? DEFAULT_SECTION;

  const [activeComponent, setActiveComponent] = useState(() => {
    return vaultTabMap[vaultSectionFromPath] ?? 0;
  });


  useEffect(() => {
    if (!section) return;

    if (!VALID_SECTIONS.includes(section as any)) {
      router.replace(`/${locale}/${network}/vault/${DEFAULT_SECTION}`);
      return;
    }
  }, [section, locale, network, router]);


  useEffect(() => {
    setActiveComponent(vaultTabMap[vaultSectionFromPath] ?? 0);
  }, [vaultSectionFromPath]);

  const handleTabClick = (index: number) => {
    const sectionName = reverseVaultTabMap[index];
    router.push(`/${locale}/${network}/vault/${sectionName}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-8 ">
      <Poster image={poster} title={t("portfolioHeroTitle")} text={t("portfolioHeroText")} />


<div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
  {/* The tabs first on a phone, on the right on a wide screen. */}
  <div className="inset-well rounded-2xl bg-paper border border-ink/10 p-4 sm:p-5 flex flex-col gap-5 min-w-0 lg:order-2">
<div className="flex justify-between rounded-md bg-sand p-1 gap-1">
  {VALID_SECTIONS.map((sec, idx) => {
    const isActive = activeComponent === idx;
    return (
      <button
        key={sec}
        type="button"
        onClick={() => handleTabClick(idx)}
        aria-pressed={isActive}
        className={`w-full px-3 py-2.5 text-center rounded text-xs sm:text-sm transition-colors ${
          isActive ? "font-semibold bg-ink text-snow" : "font-medium text-ink/75 hover:text-ink"
        }`}
      >
        {sec === "beta" ? ("Index Asset") : t("text30")}
      </button>
    );
  })}
</div>
      {/* At most this tall: a long list scrolls inside the box, Send and Receive stay at its foot; a short one keeps the box short. */}
      <div className="max-h-[560px] sm:max-h-[640px] overflow-y-auto overscroll-contain -mr-2 pr-2 custom-scrollbar">
        {activeComponent === 0 && <Assets />}
        {activeComponent === 1 && <PortfolioBeta />}
      </div>
  </div>
  <div className="min-w-0 lg:order-1">
    <HoldingsSummary view={activeComponent === 1 ? "indexes" : "tokens"} />
  </div>
</div>
    </div>
  );
}
