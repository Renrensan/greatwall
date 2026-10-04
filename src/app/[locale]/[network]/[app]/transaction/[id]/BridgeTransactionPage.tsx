"use client";

// One transfer across a vault pair, followed on both sides and read again
// every 20 seconds:
// - on an EVM network's page, `lock-N` (its coin to Solana) or `burn-N`
//   (vSOL back to SOL);
// - on Solana's page, `<network>-lock-N` (SOL to that network) or
//   `<network>-burn-N` (its receipt back to its coin).

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { followLock, getBurn, getSolanaBurn, receiptMark, requestPaid } from "@ipow/sdk";

import { ComingSoon, Notice, Row, StateChip, TICKER, coin, errorText, shortHash } from "@/subcomponents/ipow/common";
import {
  EVM_CHAINS,
  appRunsOn,
  deploymentOf,
  isEvmChain,
  readProvider,
  solanaAddress,
  solanaExplorer,
  solanaVaultOf,
  solanaVaultWith,
  type EvmChain,
} from "@/components/integrator/ipow/sdk";

const REFRESH_MS = 20_000;
const ZERO = BigInt(0);
const nameOf = (chain: string) => chain.charAt(0).toUpperCase() + chain.slice(1);

/** What the page shows of a transfer, whichever side it started on. */
type View = {
  title: string;
  /** For the chip's colour: Done, Refunded or Open. */
  chip: string;
  stage: string;
  steps: { label: string; done: boolean }[];
  note: string | null;
  amount: string;
  fee: bigint;
  fastFee: bigint;
  feeSymbol: string;
  recipient: { text: string; link: string | null } | null;
  from: string;
  at: number;
};

export default function BridgeTransactionPage() {
  const { network } = useParams<{ network: string }>();
  if (!appRunsOn("bridge", network)) return <ComingSoon network={network} app="bridge" />;
  return isEvmChain(network) ? <EvmTransfer chain={network} /> : <SolanaTransfer />;
}

/** Reads `read` now and every 20 seconds; its last view, or its error. */
function useFollow(read: (() => Promise<View>) | null) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!read) return;
    try {
      setView(await read());
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  }, [read]);
  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);
  return { view, error };
}

function EvmTransfer({ chain }: { chain: EvmChain }) {
  const t = useTranslations("Bridge");
  const { id } = useParams<{ id: string }>();

  const read = useMemo(() => {
    const match = /^(lock|burn)-(\d+)$/.exec(id);
    if (!match) return null;
    const kind = match[1];
    const number = BigInt(match[2]);
    const d = deploymentOf(chain)!;
    const ticker = TICKER[chain];
    return async (): Promise<View> => {
      const provider = readProvider(chain);
      if (kind === "lock") {
        const j = await followLock(provider, d, number, solanaVaultOf(chain));
        const to = solanaAddress(j.lock.recipient);
        return {
          title: t("lockTitle", { ticker }),
          // Given up is not yet returned: the coin is back only once that is
          // carried here and the lock is returned.
          chip: j.stage === "Issued" ? "Done" : j.stage === "Returned" ? "Refunded" : "Open",
          stage: j.stage,
          steps: [
            { label: t("stepLocked", { network: nameOf(chain) }), done: true },
            { label: t("stepIssued"), done: j.stage === "Issued" },
            { label: t("stepCarried"), done: j.lock.stage === "Carried" },
          ],
          note: lockNote(t, j.stage, j.attests),
          amount: `${coin(j.lock.amount, 9)} ${ticker}`,
          fee: j.lock.fee,
          fastFee: j.lock.fastFee,
          feeSymbol: ticker,
          recipient: to ? { text: to, link: solanaExplorer("address", to) } : null,
          from: j.lock.owner,
          at: j.lock.lockedAt,
        };
      }
      const [b, paid] = await Promise.all([getBurn(provider, d, number), solanaVaultOf(chain).evmBurnPaid(number)]);
      const to = solanaAddress(b.to);
      return {
        title: t("burnTitle"),
        chip: paid ? "Done" : "Open",
        stage: paid ? "Paid" : b.stage,
        steps: [
          { label: t("stepBurned"), done: true },
          { label: t("stepBurnCarried"), done: b.stage === "Carried" },
          { label: t("stepPaidOn", { network: "Solana" }), done: paid },
        ],
        note: paid ? null : b.stage === "Carried" ? t("noteBurnCarried") : t("noteWaitingBurn"),
        amount: `${coin(b.amount, 9)} vSOL`,
        fee: b.fee,
        fastFee: b.fastFee,
        feeSymbol: "vSOL",
        recipient: to ? { text: to, link: solanaExplorer("address", to) } : null,
        from: b.owner,
        at: b.at,
      };
    };
  }, [chain, id, t]);

  return <TransferView chain={chain} read={read} />;
}

function SolanaTransfer() {
  const t = useTranslations("Bridge");
  const { id } = useParams<{ id: string }>();

  const read = useMemo(() => {
    const match = /^([a-z]+)-(lock|burn)-(\d+)$/.exec(id);
    if (!match || !(EVM_CHAINS as readonly string[]).includes(match[1])) return null;
    const peer = match[1] as EvmChain;
    const kind = match[2];
    const number = BigInt(match[3]);
    const d = deploymentOf(peer)!;
    const vault = solanaVaultWith(peer, null);
    const ticker = TICKER[peer];
    const onPeer = (address: string) => ({ text: address, link: evmAddressLink(peer, address) });
    return async (): Promise<View> => {
      const provider = readProvider(peer);
      if (kind === "lock") {
        const [l, mark] = await Promise.all([vault.getLock(number), receiptMark(provider, d, number)]);
        const stage = l.stage === "Returned" ? "Returned" : mark?.givenUp ? "GivenUp" : mark?.issued ? "Issued" : l.stage;
        return {
          title: t("solTo", { network: nameOf(peer) }),
          chip: stage === "Issued" ? "Done" : stage === "Returned" ? "Refunded" : "Open",
          stage,
          steps: [
            { label: t("stepLocked", { network: "Solana" }), done: true },
            { label: t("stepIssuedOn", { network: nameOf(peer) }), done: stage === "Issued" },
            { label: t("stepCarried"), done: l.stage === "Carried" },
          ],
          note: lockNote(t, stage, mark?.attests ?? 0),
          amount: `${coin(l.amount, 9)} SOL`,
          fee: l.fee,
          fastFee: l.fastFee,
          feeSymbol: "SOL",
          recipient: onPeer(l.recipient),
          from: l.owner,
          at: l.lockedAt,
        };
      }
      const [b, paid] = await Promise.all([getSolanaBurn(vault, number), requestPaid(provider, d, number)]);
      return {
        title: t("receiptBack", { ticker }),
        chip: paid ? "Done" : "Open",
        stage: paid ? "Paid" : b.stage,
        steps: [
          { label: t("stepBurnedHere", { symbol: `v${ticker}` }), done: true },
          { label: t("stepBurnCarried"), done: b.stage === "Carried" },
          { label: t("stepPaidOn", { network: nameOf(peer) }), done: paid },
        ],
        note: paid
          ? null
          : b.stage === "Carried"
            ? t("noteBurnCarriedEvm", { network: nameOf(peer), ticker })
            : t("noteWaitingBurnEvm", { network: nameOf(peer) }),
        amount: `${coin(b.amount, 9)} v${ticker}`,
        fee: b.fee,
        fastFee: b.fastFee,
        feeSymbol: `v${ticker}`,
        recipient: onPeer(b.to),
        from: b.owner,
        at: b.at,
      };
    };
  }, [id, t]);

  return <TransferView chain="solana" read={read} />;
}

function lockNote(t: (key: string, values?: Record<string, string | number>) => string, stage: string, attests: number): string | null {
  if (stage === "GivenUp") return t("noteGivenUp");
  if (stage === "Returned") return t("noteReturned");
  if (stage === "Issued") return null;
  return attests > 0 ? t("noteAttested", { n: attests }) : t("noteWaitingLock");
}

function evmAddressLink(chain: EvmChain, address: string): string {
  const base: Record<EvmChain, string> = {
    ethereum: "https://sepolia.etherscan.io/address/",
    base: "https://sepolia.basescan.org/address/",
    robinhood: "https://explorer.testnet.chain.robinhood.com/address/",
    hyperliquid: "https://testnet.purrsec.com/address/",
  };
  return base[chain] + address;
}

function TransferView({ chain, read }: { chain: string; read: (() => Promise<View>) | null }) {
  const t = useTranslations("Bridge");
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const { view, error } = useFollow(read);

  if (!read) return <Notice text={t("notFound")} />;
  if (error && !view) return <Notice text={error} error />;
  if (!view) return <Notice text={t("loading")} />;

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      <Link href={`/${locale}/${chain}/bridge/history`} className="text-xs sm:text-sm opacity-70 hover:opacity-100">
        ← {t("backToHistory")}
      </Link>

      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-base sm:text-lg">
            {view.title} · #{id.split("-").pop()}
          </p>
          <StateChip state={view.chip} chain={chain} label={t(`stage${view.stage}`)} />
        </div>

        <ol className="flex flex-col gap-2 text-xs sm:text-sm">
          {view.steps.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  s.done ? "bg-green-500/15 text-green-600" : "bg-black/5 opacity-60"
                }`}
              >
                {s.done ? "✓" : "…"}
              </span>
              <span className={s.done ? "" : "opacity-70"}>{s.label}</span>
            </li>
          ))}
        </ol>
        {view.note && <p className="text-xs sm:text-sm opacity-80">{view.note}</p>}

        <div className="flex flex-col gap-2 text-xs sm:text-sm border-t border-black/10 pt-3">
          <Row label={t("amount")} value={view.amount} />
          {view.fee > ZERO && <Row label={t("operatorFee")} value={`${coin(view.fee, 9)} ${view.feeSymbol}`} />}
          {view.fastFee > ZERO && <Row label={t("fastFee")} value={`${coin(view.fastFee, 9)} ${view.feeSymbol}`} />}
          <Row
            label={t("recipient")}
            value={
              view.recipient ? (
                view.recipient.link ? (
                  <a href={view.recipient.link} target="_blank" rel="noreferrer" className="underline">
                    {shortHash(view.recipient.text)}
                  </a>
                ) : (
                  shortHash(view.recipient.text)
                )
              ) : (
                "—"
              )
            }
          />
          <Row label={t("from")} value={shortHash(view.from)} />
          <Row label={t("when")} value={new Date(view.at * 1000).toLocaleString(locale)} />
        </div>
      </div>
    </div>
  );
}
