"use client";

// BETA: baskets of tokens with one token for the whole basket. Mint by
// depositing the parts, burn for them back. The parts are usually the
// vault's receipts (vSOL) next to the network's own coin.

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import BetaBaskets from "./BetaBaskets";
import BetaCreate from "./BetaCreate";
import BetaExplore from "./BetaExplore";
import { SolanaBaskets, SolanaBetaCreate } from "./BetaSolana";
import { ComingSoon, SectionTabs } from "./ipow/common";
import { appRunsOn, isEvmChain } from "@/components/integrator/ipow/sdk";

export default function Beta() {
  const t = useTranslations("Beta");
  const { network, section } = useParams<{ network: string; section?: string }>();
  if (!appRunsOn("beta", network)) return <ComingSoon network={network} app="beta" />;
  const create = section === "create";
  const explore = section === "explore";
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-lg sm:text-2xl">{t("title")}</h1>
        <p className="text-xs sm:text-sm opacity-70">{t("subtitle")}</p>
      </div>
      <SectionTabs
        chain={network}
        app="beta"
        sections={[
          { id: "baskets", label: t("tabBaskets") },
          { id: "create", label: t("tabCreate") },
          { id: "explore", label: t("tabExplore") },
        ]}
      />
      {explore ? (
        <BetaExplore />
      ) : isEvmChain(network) ? (
        create ? <BetaCreate chain={network} /> : <BetaBaskets chain={network} />
      ) : create ? (
        <SolanaBetaCreate />
      ) : (
        <SolanaBaskets />
      )}
    </div>
  );
}
