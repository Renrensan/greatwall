"use client";

// The bridge's history from Solana's side: SOL locked for its receipt (vSOL)
// on one of the EVM networks, and that network's receipts burned here (e.g.
// vETH) for its coin back there. Solana's vault has one pair per EVM network.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { type SolanaBurnState, type SolanaLockState } from "@ipow/sdk";

import { SolanaConnectButton } from "./SolanaConnectButton";
import { Notice, TICKER, coin, errorText } from "./ipow/common";
import { EmptyPanel, IconPicture, ListSkeleton, emptyAction } from "./ipow/EmptyPanel";
import { HistoryList } from "./ipow/HistoryList";
import { evmAssetName, solanaAssetName, solanaPairOf, type AssetName } from "@/components/integrator/ipow/vaultAssetName";
import { EVM_CHAINS, solanaVaultWith, type EvmChain } from "@/components/integrator/ipow/sdk";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { lockPath, lockTxPath } from "@/components/integrator/ipow/lockPaths";

/** A transfer, with the asset it moved named (`name`). */
type Item = (
  | { kind: "lock"; peer: EvmChain; at: number; x: SolanaLockState }
  | { kind: "burn"; peer: EvmChain; at: number; x: SolanaBurnState }
) & { name?: AssetName };

export function BridgeHistorySolana() {
  const t = useTranslations("Bridge");
  const { locale, network } = useParams<{ locale: string; network: string }>();
  const sol = useSolanaWallet();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sol.address) return;
    let live = true;
    const me = sol.address;
    setItems(null);
    setError(null);
    Promise.all(
      EVM_CHAINS.map(async (peer) => {
        const v = solanaVaultWith(peer, null);
        const [locks, burns] = await Promise.all([v.locksOf(me), v.burnsOf(me)]);
        return [
          ...locks.map((x): Item => ({ kind: "lock", peer, at: x.lockedAt, x })),
          ...burns.map((x): Item => ({ kind: "burn", peer, at: x.at, x })),
        ];
      })
    )
      // Each named by its asset: a lock moves SOL or a Solana token, a burn the EVM network's asset.
      .then((all) =>
        Promise.all(
          all.flat().map(async (it): Promise<Item> => ({
            ...it,
            name: await (it.kind === "lock" ? solanaAssetName(it.peer, it.x.asset) : evmAssetName(it.peer, solanaPairOf(it.peer), it.x.asset)).catch(() => undefined),
          }))
        )
      )
      .then((all) => live && setItems(all.sort((a, b) => b.at - a.at)))
      .catch((e) => live && setError(errorText(e)));
    return () => {
      live = false;
    };
  }, [sol.address]);

  if (!sol.connected || !sol.address) {
    return (
      <EmptyPanel picture={<IconPicture icon="solar:wallet-linear" />} title={t("historyConnectTitle")} text={t("historyConnect")}>
        <SolanaConnectButton />
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
        const symbol = it.name?.symbol ?? (it.kind === "lock" ? "SOL" : TICKER[it.peer]);
        return {
          key: `${it.peer}-${it.kind}-${id}`,
          href: lockTxPath(locale, "solana", `${it.peer}-${it.kind}-${id}`),
          kind: it.kind === "lock" ? "lock" : "unlock",
          amount: `${coin(it.x.amount, it.name?.decimals ?? 9)} ${symbol}`,
          // A lock here is used on the peer; an unlock burns here what is released there.
          from: "solana",
          to: it.peer,
          id,
          at: it.at,
          state: it.x.stage === "Returned" ? "Refunded" : it.x.stage,
          stateLabel: t(`stage${it.x.stage}`),
          chain: "solana",
        };
      })}
    />
  );
}
