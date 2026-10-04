"use client";

// The connected wallet's locks (sent to Solana) and burns (vSOL back to
// SOL) on this network, newest first.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { burnsOf, locksOf, type BurnState, type LockState } from "@ipow/sdk";

import { ConnectNetworkButton, Notice, StateChip, TICKER, coin, errorText } from "./ipow/common";
import { deploymentOf, readProvider, type EvmChain } from "@/components/integrator/ipow/sdk";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";

type Item = { kind: "lock"; at: number; x: LockState } | { kind: "burn"; at: number; x: BurnState };

export default function BridgeHistory({ chain }: { chain: EvmChain }) {
  const t = useTranslations("Bridge");
  const { locale } = useParams<{ locale: string }>();
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
        setItems(all.sort((a, b) => b.at - a.at));
      })
      .catch((e) => live && setError(errorText(e)));
    return () => {
      live = false;
    };
  }, [chain, wallet.address]);

  if (!wallet.connected || !wallet.address) {
    return (
      <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <p className="text-xs sm:text-sm opacity-70">{t("historyConnect")}</p>
        <ConnectNetworkButton chain={chain} />
      </div>
    );
  }
  if (error) return <Notice text={error} error />;
  if (!items) return <Notice text={t("loading")} />;
  if (items.length === 0) return <Notice text={t("nothingYet")} />;

  return (
    <ul className="flex flex-col gap-3">
      {items.map((it) => {
        const id = it.kind === "lock" ? it.x.lockId : it.x.requestId;
        // Vault records count in 9 decimals: ETH in gwei, SOL in lamports.
        const amount = `${coin(it.x.amount, 9)} ${it.kind === "lock" ? TICKER[chain] : "vSOL"}`;
        return (
          <li key={`${it.kind}-${id}`}>
            <Link
              href={`/${locale}/${chain}/bridge/transaction/${it.kind}-${id}`}
              className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3 hover:opacity-90 transition-opacity"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-bold text-sm sm:text-base">
                  {it.kind === "lock" ? t("lockTitle", { ticker: TICKER[chain] }) : t("burnTitle")} · #{String(id)}
                </span>
                <span className="text-[11px] sm:text-xs opacity-70 tabular-nums">
                  {amount} · {new Date(it.at * 1000).toLocaleString(locale)}
                </span>
              </div>
              <StateChip state={it.x.stage === "Returned" ? "Refunded" : it.x.stage} chain={chain} label={t(`stage${it.x.stage}`)} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
