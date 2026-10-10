"use client";

// BETA: baskets of tokens with one token for the whole basket. Mint by
// depositing the parts, burn for them back. The parts are usually the
// vault's receipts (vSOL) next to the network's own coin.

import { useParams } from "next/navigation";

import BetaBaskets from "./BetaBaskets";
import BetaCreate from "./BetaCreate";
import BetaExplore from "./BetaExplore";
import { SolanaBaskets, SolanaBetaCreate } from "./BetaSolana";
import { ComingSoon } from "./ipow/common";
import { SettlementPanel } from "./ipow/SettlementPanel";
import { useTranslations } from "next-intl";
import { appRunsOn, isBasketChain } from "@/components/integrator/ipow/sdk";

// The navbar (Explore, Create, Portfolio) chooses the section; there is no
// heading or tab row of this page's own.
export default function Beta() {
  const { locale, network, section } = useParams<{ locale: string; network: string; section?: string }>();
  const t = useTranslations("Beta");
  // Bitcoin runs no programs: the page on a programmable network instead.
  if (network === "bitcoin") return <SettlementPanel feature={t("settlementIndexes")} hrefOn={(n) => `/${locale}/${n}/index${section === "create" ? "/create" : ""}`} />;
  if (!appRunsOn("beta", network)) return <ComingSoon network={network} app="beta" />;
  const create = section === "create";
  const explore = section === "explore";
  return (
    <div className="flex flex-col gap-8">
      {explore ? (
        <BetaExplore />
      ) : isBasketChain(network) ? (
        create ? <BetaCreate chain={network} /> : <BetaBaskets chain={network} />
      ) : create ? (
        <SolanaBetaCreate />
      ) : (
        <SolanaBaskets />
      )}
    </div>
  );
}
