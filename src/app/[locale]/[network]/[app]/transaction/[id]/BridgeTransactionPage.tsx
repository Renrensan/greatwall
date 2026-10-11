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

import { ComingSoon, Notice, Row, StateChip, coin, errorText, shortHash } from "@/subcomponents/ipow/common";
import {
  BASKET_CHAINS,
  appRunsOn,
  deploymentOf,
  isBasketChain,
  readProvider,
  solanaAddress,
  solanaExplorer,
  solanaVaultOf,
  solanaVaultWith,
  type BasketChain,
} from "@/components/integrator/ipow/sdk";
import { evmAssetName, solanaAssetName, solanaPairOf } from "@/components/integrator/ipow/vaultAssetName";
import { lockPath } from "@/components/integrator/ipow/lockPaths";

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
  /** The settlement behind a fast delivery, between operators: shown, not waited for. */
  settled: boolean | null;
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
  return isBasketChain(network) ? <EvmTransfer chain={network} /> : <SolanaTransfer />;
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

function EvmTransfer({ chain }: { chain: BasketChain }) {
  const t = useTranslations("Bridge");
  const { id } = useParams<{ id: string }>();

  const read = useMemo(() => {
    const match = /^(lock|burn)-(\d+)$/.exec(id);
    if (!match) return null;
    const kind = match[1];
    const number = BigInt(match[2]);
    const d = deploymentOf(chain)!;
    return async (): Promise<View> => {
      const provider = readProvider(chain);
      if (kind === "lock") {
        const j = await followLock(provider, d, number, solanaVaultOf(chain));
        const to = solanaAddress(j.lock.recipient);
        const a = await evmAssetName(chain, solanaPairOf(chain), j.lock.asset);
        return {
          title: t("lockTitle", { ticker: a.symbol }),
          // Given up is not yet returned: the coin is back only once that is
          // carried here and the lock is returned.
          ...lockStatus(t, {
            stage: j.stage,
            attests: j.attests,
            carried: j.lock.stage === "Carried",
            from: nameOf(chain),
            to: "Solana",
            amount: `${coin(j.lock.amount, a.decimals)} ${a.symbol}`,
            recipient: to,
            at: j.lock.lockedAt,
          }),
          amount: `${coin(j.lock.amount, a.decimals)} ${a.symbol}`,
          fee: j.lock.fee,
          fastFee: j.lock.fastFee,
          feeSymbol: a.symbol,
          recipient: to ? { text: to, link: solanaExplorer("address", to) } : null,
          from: j.lock.owner,
          at: j.lock.lockedAt,
        };
      }
      const [b, paid] = await Promise.all([getBurn(provider, d, number), solanaVaultOf(chain).evmBurnPaid(number)]);
      const to = solanaAddress(b.to);
      const a = await solanaAssetName(chain, b.asset);
      return {
        title: t("receiptBack", { ticker: a.symbol }),
        ...burnStatus(t, {
          paid,
          carried: b.stage === "Carried",
          from: nameOf(chain),
          to: "Solana",
          amount: `${coin(b.amount, a.decimals)} ${a.symbol}`,
          recipient: to,
          at: b.at,
        }),
        amount: `${coin(b.amount, a.decimals)} ${a.symbol}`,
        fee: b.fee,
        fastFee: b.fastFee,
        feeSymbol: a.symbol,
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
    if (!match || !(BASKET_CHAINS as readonly string[]).includes(match[1])) return null;
    const peer = match[1] as BasketChain;
    const kind = match[2];
    const number = BigInt(match[3]);
    const d = deploymentOf(peer)!;
    const vault = solanaVaultWith(peer, null);
    const onPeer = (address: string) => ({ text: address, link: evmAddressLink(peer, address) });
    return async (): Promise<View> => {
      const provider = readProvider(peer);
      if (kind === "lock") {
        const [l, mark] = await Promise.all([vault.getLock(number), receiptMark(provider, d, number)]);
        const a = await solanaAssetName(peer, l.asset);
        const stage = l.stage === "Returned" ? "Returned" : mark?.givenUp ? "GivenUp" : mark?.issued ? "Issued" : l.stage;
        return {
          title: t("lockAssetFor", { symbol: a.symbol, network: nameOf(peer) }),
          ...lockStatus(t, {
            stage,
            attests: mark?.attests ?? 0,
            carried: l.stage === "Carried",
            from: "Solana",
            to: nameOf(peer),
            amount: `${coin(l.amount, a.decimals)} ${a.symbol}`,
            recipient: l.recipient,
            at: l.lockedAt,
          }),
          amount: `${coin(l.amount, a.decimals)} ${a.symbol}`,
          fee: l.fee,
          fastFee: l.fastFee,
          feeSymbol: a.symbol,
          recipient: onPeer(l.recipient),
          from: l.owner,
          at: l.lockedAt,
        };
      }
      const [b, paid] = await Promise.all([getSolanaBurn(vault, number), requestPaid(provider, d, number)]);
      const a = await evmAssetName(peer, solanaPairOf(peer), b.asset);
      return {
        title: t("receiptBack", { ticker: a.symbol }),
        ...burnStatus(t, {
          paid,
          carried: b.stage === "Carried",
          from: "Solana",
          to: nameOf(peer),
          amount: `${coin(b.amount, a.decimals)} ${a.symbol}`,
          recipient: b.to,
          at: b.at,
          stepSent: t("stepBurnedHere", { symbol: a.symbol }),
        }),
        amount: `${coin(b.amount, a.decimals)} ${a.symbol}`,
        fee: b.fee,
        fastFee: b.fastFee,
        feeSymbol: a.symbol,
        recipient: onPeer(b.to),
        from: b.owner,
        at: b.at,
      };
    };
  }, [id, t]);

  return <TransferView chain="solana" read={read} />;
}

type T = (key: string, values?: Record<string, string | number>) => string;
/** Past this, a transfer still on its way says it is slow, and why it is safe. */
const SLOW_AFTER_S = 30 * 60;
const short = (a: string | null) => (a ? shortHash(a) : "—");

/**
 * A lock as its user reads it: locked here, then received there. A fast
 * delivery (an operator's attest, section 11.7 of the design) puts the
 * receipt in the recipient's wallet at once, before the lock is settled
 * between operators: received is either, and the settlement is shown
 * apart, as nothing the user waits for.
 */
function lockStatus(
  t: T,
  x: { stage: string; attests: number; carried: boolean; from: string; to: string; amount: string; recipient: string | null; at: number }
): Pick<View, "chip" | "stage" | "steps" | "note" | "settled"> {
  if (x.stage === "Returned") return { chip: "Refunded", stage: "Returned", steps: [{ label: t("stepLocked", { network: x.from }), done: true }], note: t("noteReturned"), settled: null };
  if (x.stage === "GivenUp") return { chip: "Open", stage: "GivenUp", steps: [{ label: t("stepLocked", { network: x.from }), done: true }], note: t("noteGivenUp"), settled: null };
  const received = x.stage === "Issued" || x.attests > 0;
  const slow = !received && Date.now() / 1000 - x.at > SLOW_AFTER_S;
  return {
    chip: received ? "Done" : "Open",
    stage: received ? "Received" : "OnItsWay",
    steps: [
      { label: t("stepLocked", { network: x.from }), done: true },
      { label: t("stepReceivedOn", { network: x.to }), done: received },
    ],
    note: received ? t("noteReceived", { amount: x.amount, to: short(x.recipient), network: x.to }) : t(slow ? "noteSlow" : "noteOnItsWay", { network: slow ? x.from : x.to }),
    // Only a fast delivery has a settlement still to come.
    settled: received && x.stage !== "Issued" ? x.carried : null,
  };
}

/** A return (a burn of a receipt): sent back here, then received there. */
function burnStatus(
  t: T,
  x: { paid: boolean; carried: boolean; from: string; to: string; amount: string; recipient: string | null; at: number; stepSent?: string }
): Pick<View, "chip" | "stage" | "steps" | "note" | "settled"> {
  const slow = !x.paid && Date.now() / 1000 - x.at > SLOW_AFTER_S;
  return {
    chip: x.paid ? "Done" : "Open",
    stage: x.paid ? "PaidOut" : "BackOnItsWay",
    steps: [
      { label: x.stepSent ?? t("stepBurned"), done: true },
      { label: t("stepReceivedOn", { network: x.to }), done: x.paid },
    ],
    note: x.paid ? t("noteReceived", { amount: x.amount, to: short(x.recipient), network: x.to }) : t(slow ? "noteSlow" : "noteOnItsWay", { network: slow ? x.from : x.to }),
    settled: x.paid ? x.carried : null,
  };
}

/** "3 min ago", "2 h ago", "4 days ago". */
function ago(at: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - at));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

function evmAddressLink(chain: BasketChain, address: string): string {
  const base: Record<BasketChain, string> = {
    ethereum: "https://sepolia.etherscan.io/address/",
    base: "https://sepolia.basescan.org/address/",
    robinhood: "https://explorer.testnet.chain.robinhood.com/address/",
    hyperliquid: "https://testnet.purrsec.com/address/",
    arbitrum: "https://sepolia.arbiscan.io/address/",
    tempo: "https://explore-testnet.tempo.xyz/address/",
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
      <Link href={lockPath(locale, chain, "history")} className="text-xs sm:text-sm opacity-70 hover:opacity-100">
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
        {view.settled !== null && (
          <p className="flex items-center gap-1.5 text-[11px] opacity-60">
            <span className="font-semibold">{t("settlement")}:</span>
            {view.settled ? t("settlementDone") : t("settlementPending")}
          </p>
        )}

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
          <Row label={t("when")} value={`${new Date(view.at * 1000).toLocaleString(locale)} · ${t("sentAgo", { ago: ago(view.at) })}`} />
        </div>
      </div>
    </div>
  );
}
