"use client";

// The connected wallet's locks (sent to Solana) and burns (vSOL back to
// SOL) on this network, newest first.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { burnsOf, locksOf, type BurnState, type LockState } from "@ipow/sdk";

import { ConnectNetworkButton, Notice, TICKER, coin, errorText } from "./ipow/common";
import { EmptyPanel, IconPicture, ListSkeleton, emptyAction } from "./ipow/EmptyPanel";
import { HistoryList } from "./ipow/HistoryList";
import { deploymentOf, readProvider, solanaVaultOf, type BasketChain } from "@/components/integrator/ipow/sdk";
import { evmAssetName, solanaAssetName, solanaPairOf, type AssetName } from "@/components/integrator/ipow/vaultAssetName";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";
import { lockPath, lockTxPath } from "@/components/integrator/ipow/lockPaths";

/** A transfer, with the asset it moved named (`name`). */
type Item = ({ kind: "lock"; at: number; x: LockState } | { kind: "burn"; at: number; x: BurnState }) & {
  name?: AssetName;
  /** In the recipient's wallet on Solana: a lock issued or delivered at once
   *  (attested), a burn paid. Undefined when it could not be read. */
  received?: boolean;
};

export default function BridgeHistory({ chain }: { chain: BasketChain }) {
  const t = useTranslations("Bridge");
  const { locale, network } = useParams<{ locale: string; network: string }>();
  const wallet = useEvmWallet(chain);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet.address) return;
    let live = true;
    setItems(null);
    setError(null);
    const d = deploymentOf(chain)!;
    const p = readProvider(chain);
    Promise.all([locksOf(p, d, wallet.address), burnsOf(p, d, wallet.address)])
      .then(([locks, burns]) => {
        if (!live) return;
        const all: Item[] = [
          ...locks.map((x): Item => ({ kind: "lock", at: x.lockedAt, x })),
          ...burns.map((x): Item => ({ kind: "burn", at: x.at, x })),
        ];
        // Each named by its asset: a lock moves this network's asset, a burn a Solana asset's receipt.
        return Promise.all(
          all.map(async (it): Promise<Item> => {
            const vault = solanaVaultOf(chain);
            const [name, received] = await Promise.all([
              (it.kind === "lock" ? evmAssetName(chain, solanaPairOf(chain), it.x.asset) : solanaAssetName(chain, it.x.asset)).catch(() => undefined),
              (it.kind === "lock"
                ? vault.evmLockMark(it.x.lockId).then((m) => !!m && (m.issued || m.attests > 0))
                : vault.evmBurnPaid(it.x.requestId)
              ).catch(() => undefined),
            ]);
            return { ...it, name, received };
          })
        ).then((named) => live && setItems(named.sort((a, b) => b.at - a.at)));
      })
      .catch((e) => live && setError(errorText(e)));
    return () => {
      live = false;
    };
  }, [chain, wallet.address]);

  if (!wallet.connected || !wallet.address) {
    return (
      <EmptyPanel picture={<IconPicture icon="solar:wallet-linear" />} title={t("historyConnectTitle")} text={t("historyConnect")}>
        <ConnectNetworkButton chain={chain} />
      </EmptyPanel>
    );
  }
  if (error) return <Notice text={error} error />;
  if (!items) return <ListSkeleton />;
  if (items.length === 0)
    return (
      <EmptyPanel picture={<IconPicture icon="solar:history-linear" />} title={t("historyNoneTitle")} text={t("historyNone")}>
        <Link href={lockPath(locale, network)} className={emptyAction}>
          <Icon icon="solar:lock-keyhole-minimalistic-bold" className="text-base" />
          {t("lockedLockOne")}
        </Link>
      </EmptyPanel>
    );

  return (
    <HistoryList
      locale={locale}
      lockLabel={t("tabLock")}
      unlockLabel={t("tabUnlock")}
      entries={items.map((it) => {
        const id = String(it.kind === "lock" ? it.x.lockId : it.x.requestId);
        // Vault records count in 9 decimals: ETH in gwei, SOL in lamports.
        const symbol = it.name?.symbol ?? (it.kind === "lock" ? TICKER[chain] : "SOL");
        return {
          key: `${it.kind}-${id}`,
          href: lockTxPath(locale, chain, `${it.kind}-${id}`),
          kind: it.kind === "lock" ? "lock" : "unlock",
          amount: `${coin(it.x.amount, it.name?.decimals ?? 9)} ${symbol}`,
          // A lock here is used on Solana; an unlock burns here what is released there.
          from: chain,
          to: "solana",
          id,
          at: it.at,
          // Received once it is in the wallet on Solana, as the transfer's own page says.
          state: it.x.stage === "Returned" ? "Refunded" : it.received ? "Done" : "Open",
          stateLabel:
            it.x.stage === "Returned"
              ? t("stageReturned")
              : it.received
                ? t(it.kind === "lock" ? "stageReceived" : "stagePaidOut")
                : t(it.kind === "lock" ? "stageOnItsWay" : "stageBackOnItsWay"),
          chain,
        };
      })}
    />
  );
}
