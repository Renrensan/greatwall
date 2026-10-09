"use client";

// Bridge: Lock (any listed asset, any network, toward any paired network
// and recipient), Unlock (a receipt held here burned, its asset released on
// its home network) and History, under the poster on the right; on the left
// the tokens the user holds locked, where they are used (LockedHoldings).
//
// "send" is Unlock's old address, still served so links to it work.

import { Poster } from "./ipow/Poster";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import poster from "@/assets/background-lock-token-mint.jpg";
import LockToken from "./LockToken";
import UnlockToken from "./UnlockToken";
import LockedHoldings from "./LockedHoldings";
import BridgeHistory from "./BridgeHistory";
import { BridgeHistorySolana } from "./BridgeSolana";
import { ComingSoon, SectionTabs } from "./ipow/common";
import { appRunsOn, isEvmChain, type EvmChain } from "@/components/integrator/ipow/sdk";

export default function Bridge() {
  const t = useTranslations("Bridge");
  const { network, section } = useParams<{ network: string; section?: string }>();
  if (!appRunsOn("bridge", network)) return <ComingSoon network={network} app="bridge" />;
  const locking = section === "lock";
  const unlocking = section === "unlock" || section === "send";
  return (
    <div className="flex flex-col gap-6">
      <Poster image={poster} title={t("lockHeroTitle")} text={t("lockSubtitle")} />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
        {/* The tabs first on a phone, on the right on a wide screen. */}
        <div className="inset-well rounded-2xl bg-paper border border-ink/10 p-4 sm:p-5 flex flex-col gap-5 min-w-0 lg:order-2">
          <SectionTabs
            chain={network}
            app="bridge"
            sections={[
              { id: "lock", label: t("tabLock") },
              { id: "unlock", label: t("tabUnlock") },
              { id: "history", label: t("tabHistory") },
            ]}
          />
          {locking ? (
            <LockToken initial={network as EvmChain | "solana"} />
          ) : unlocking ? (
            <UnlockToken initial={network as EvmChain | "solana"} />
          ) : isEvmChain(network) ? (
            <BridgeHistory chain={network} />
          ) : (
            <BridgeHistorySolana />
          )}
        </div>
        <div className="min-w-0 lg:order-1">
          <LockedHoldings />
        </div>
      </div>
    </div>
  );
}
