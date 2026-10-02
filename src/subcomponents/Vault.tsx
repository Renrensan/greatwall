"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import Assets from "./Assets";
import HeadlineVault from "./HeadlineVault";
import BuyToken from "./BuyToken";
import BuyHistory from "./History";

const VALID_SECTIONS = ["buy", "assets", "history"] as const;
const DEFAULT_SECTION = "buy";

const vaultTabMap: Record<string, number> = {
  buy: 0,
  assets: 1,
  history: 2,
};

const reverseVaultTabMap: Record<number, string> = {
  0: "buy",
  1: "assets",
  2: "history",
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
      <HeadlineVault/>


<div className="flex justify-between glass-card bgRound border-black/5 dark:border-white/10">
  {VALID_SECTIONS.map((sec, idx) => {
    const isActive = activeComponent === idx;
    

    const activeBgClass = (network === 'hedera' || network === 'polkadot')
      ? 'bg-black dark:bg-white'
      : network === 'base'
        ? 'bg-[#0052FF]'
        : `bg-${network}`;
      
    const activeTextClass = (network === 'hedera' || network === 'polkadot')
      ? 'text-white dark:text-black'
      : network === 'robinhood'
        ? 'text-black'
        : 'text-white';

    return (
      <button
        key={sec}
        type="button"
        onClick={() => handleTabClick(idx)}
        className={`w-full p-3 text-center rounded-full text-xs sm:text-sm transition-all duration-200 ${
          isActive
            ? `font-bold ${activeBgClass} ${activeTextClass}`
            : network === 'base'
              ? 'font-medium hover:bg-[#0052FF]/10'
              : `font-medium  hover:bg-${network}/10`
        }`}
      >
        {sec === "buy" ? t("text249") : sec === "assets" ? t("text30") : t("text11")}
      </button>
    );
  })}
</div>

      <div>
        {activeComponent === 0 && <BuyToken />}
        {activeComponent === 1 && <Assets />}
        {activeComponent === 2 && <BuyHistory />}
      </div>
    </div>
  );
}
