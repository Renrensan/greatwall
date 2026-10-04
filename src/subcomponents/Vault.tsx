"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import Assets from "./Assets";
import HeadlineVault from "./HeadlineVault";
import BuyToken from "./BuyToken";
import BuyHistory from "./History";
import Link from "next/link";
import BridgeSend from "./BridgeSend";
import { BridgeSendSolana } from "./BridgeSolana";
import { ComingSoon } from "./ipow/common";
import { isEvmChain } from "@/components/integrator/ipow/sdk";

// Portfolio: what the wallet holds, buying, moving it to another network
// (the vault's bridge), and history.
const VALID_SECTIONS = ["assets", "buy", "move", "history"] as const;
const DEFAULT_SECTION = "assets";

const vaultTabMap: Record<string, number> = {
  assets: 0,
  buy: 1,
  move: 2,
  history: 3,
};

const reverseVaultTabMap: Record<number, string> = {
  0: "assets",
  1: "buy",
  2: "move",
  3: "history",
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
        {sec === "buy" ? t("text249") : sec === "assets" ? t("text30") : sec === "move" ? t("navMove") : t("text11")}
      </button>
    );
  })}
</div>
      <div>
        {activeComponent === 0 && <Assets />}
        {activeComponent === 1 && <BuyToken />}
        {activeComponent === 2 && (
          <div className="flex flex-col gap-4">
            {isEvmChain(network) ? <BridgeSend chain={network} /> : network === "solana" ? <BridgeSendSolana /> : <ComingSoon network={network} app="bridge" />}
            <Link href={`/${locale}/${network}/bridge/history`} className="text-xs sm:text-sm text-stone hover:text-ink text-right">
              {t("navTransfers")} →
            </Link>
          </div>
        )}
        {activeComponent === 3 && <BuyHistory />}
      </div>
    </div>
  );
}
