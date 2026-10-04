"use client";

// Bridge: move a network's coin to Solana through the iPoW vault (its
// receipt, e.g. vETH, is issued there), and burn Solana's receipts here
// (vSOL) for SOL back.

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import BridgeSend from "./BridgeSend";
import BridgeHistory from "./BridgeHistory";
import { BridgeHistorySolana, BridgeSendSolana } from "./BridgeSolana";
import { ComingSoon, SectionTabs } from "./ipow/common";
import { appRunsOn, isEvmChain } from "@/components/integrator/ipow/sdk";

export default function Bridge() {
  const t = useTranslations("Bridge");
  const { network, section } = useParams<{ network: string; section?: string }>();
  if (!appRunsOn("bridge", network)) return <ComingSoon network={network} app="bridge" />;
  const history = section === "history";
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-lg sm:text-2xl">{t("title")}</h1>
        <p className="text-xs sm:text-sm opacity-70">{network === "solana" ? t("subtitleSolana") : t("subtitle")}</p>
      </div>
      <SectionTabs
        chain={network}
        app="bridge"
        sections={[
          { id: "send", label: t("tabSend") },
          { id: "history", label: t("tabHistory") },
        ]}
      />
      {isEvmChain(network) ? (
        history ? <BridgeHistory chain={network} /> : <BridgeSend chain={network} />
      ) : history ? (
        <BridgeHistorySolana />
      ) : (
        <BridgeSendSolana />
      )}
    </div>
  );
}
