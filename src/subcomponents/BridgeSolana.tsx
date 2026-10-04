"use client";

// The bridge from Solana's side: lock SOL for its receipt (vSOL) on one of
// the EVM networks, or burn that network's receipt here (e.g. vETH) for its
// coin back there. Solana's vault has one pair per EVM network.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getAddress, isAddress, parseUnits, ZeroAddress } from "ethers";
import { PublicKey } from "@solana/web3.js";
import { receiptTokens, type SolanaBurnState, type SolanaLockState } from "@ipow/sdk";

import Button from "./Button";
import { SolanaConnectButton } from "./SolanaConnectButton";
import { Field, Notice, Row, StateChip, TICKER, coin, errorText } from "./ipow/common";
import { EVM_CHAINS, deploymentOf, readProvider, solanaConnection, solanaVaultWith, type EvmChain } from "@/components/integrator/ipow/sdk";
import { useSolanaWallet } from "@/components/solana/solana-provider";

type Direction = "out" | "back";
const ZERO = BigInt(0);
const SOL_DECIMALS = 9;
/** The EVM networks' coin is their asset 0; its receipt here counts in 9 decimals. */
const RECEIPT_DECIMALS = 9;

const nameOf = (chain: string) => chain.charAt(0).toUpperCase() + chain.slice(1);

/** The EVM address a payment there goes to: a real address, not zero. */
const isEvmRecipient = (a: string) => isAddress(a.trim()) && getAddress(a.trim()) !== ZeroAddress;

export function BridgeSendSolana() {
  const t = useTranslations("Bridge");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const sol = useSolanaWallet();
  const [peer, setPeer] = useState<EvmChain>("ethereum");
  const [direction, setDirection] = useState<Direction>("out");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [fee, setFee] = useState("");
  const [fastFee, setFastFee] = useState("");
  const [solBalance, setSolBalance] = useState<bigint | null>(null);
  /** The peer's receipt held here, e.g. vETH; null while unknown. */
  const [receipt, setReceipt] = useState<{ exists: boolean; balance: bigint } | null>(null);
  /** Whether the peer has made SOL's receipt (vSOL) yet. */
  const [receiptThere, setReceiptThere] = useState<boolean | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ticker = TICKER[peer];
  const vault = useMemo(() => solanaVaultWith(peer, null), [peer]);

  useEffect(() => {
    let live = true;
    setReceipt(null);
    setReceiptThere(null);
    setUnderstood(false);
    const conn = solanaConnection();
    (async () => {
      const exists = (await conn.getAccountInfo(vault.receiptMint(0))) !== null;
      const balance = exists && sol.address ? await vault.receiptBalance(sol.address, 0) : ZERO;
      if (live) setReceipt({ exists, balance });
    })().catch(() => {});
    receiptTokens(readProvider(peer), deploymentOf(peer)!, 0, 1)
      .then((r) => live && setReceiptThere(r.has(0)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [peer, vault, sol.address]);

  useEffect(() => {
    if (!sol.address) return setSolBalance(null);
    solanaConnection()
      .getBalance(new PublicKey(sol.address))
      .then((b) => setSolBalance(BigInt(b)))
      .catch(() => setSolBalance(null));
  }, [sol.address]);

  const decimals = direction === "out" ? SOL_DECIMALS : RECEIPT_DECIMALS;
  const parse = (x: string): bigint | null => {
    try {
      return parseUnits(x.trim() || "0", decimals);
    } catch {
      return null;
    }
  };
  const amountUnits = parse(amount);
  const feeUnits = parse(fee);
  const fastUnits = parse(fastFee);
  const total = amountUnits !== null && feeUnits !== null && fastUnits !== null ? amountUnits + feeUnits + fastUnits : null;
  const have = direction === "out" ? solBalance : receipt?.exists ? receipt.balance : null;
  const symbol = direction === "out" ? "SOL" : `v${ticker}`;

  const problem =
    direction === "back" && receipt === null
      ? t("loading")
      : direction === "back" && !receipt?.exists
        ? t("noReceiptYetSolana", { symbol })
        : !amountUnits || amountUnits === ZERO
          ? t("enterAmount")
          : feeUnits === null || fastUnits === null
            ? t("badFee")
            : !isEvmRecipient(recipient)
              ? t("badEvmRecipient")
              : have !== null && total !== null && total > have
                ? t("notEnough", { symbol })
                : direction === "out" && receiptThere !== true && !understood
                  ? t("confirmFirstLock")
                  : null;

  async function submit() {
    if (problem || amountUnits === null || feeUnits === null || fastUnits === null) return;
    const wallet = sol.getAnchorWallet();
    if (!wallet) return;
    setBusy(true);
    setError(null);
    try {
      const signing = solanaVaultWith(peer, wallet);
      const to = getAddress(recipient.trim());
      if (direction === "out") {
        const { lockId } = await signing.lock({ recipient: to, amount: amountUnits, fee: feeUnits, fastFee: fastUnits });
        router.push(`/${locale}/solana/bridge/transaction/${peer}-lock-${lockId}`);
      } else {
        const { requestId } = await signing.burn({ asset: 0, to, amount: amountUnits, fee: feeUnits, fastFee: fastUnits });
        router.push(`/${locale}/solana/bridge/transaction/${peer}-burn-${requestId}`);
      }
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs sm:text-sm opacity-70">{t("wallet")}</span>
        <SolanaConnectButton />
      </div>

      <div className="glass-card rounded-2xl p-4 flex flex-col gap-2">
        <label htmlFor="bridge-peer" className="text-[11px] sm:text-xs opacity-70">
          {t("otherNetwork")}
        </label>
        <select
          id="bridge-peer"
          value={peer}
          onChange={(e) => setPeer(e.target.value as EvmChain)}
          className="w-full glass-card rounded-lg p-2 text-xs sm:text-sm bg-transparent"
        >
          {EVM_CHAINS.map((c) => (
            <option key={c} value={c}>
              {nameOf(c)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex glass-card bgRound border-black/5">
        {(["out", "back"] as const).map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => setDirection(x)}
            className={`w-full p-3 rounded-full text-xs sm:text-sm transition-all ${direction === x ? "font-bold bg-black/5" : "font-medium opacity-70"}`}
          >
            {x === "out" ? t("solTo", { network: nameOf(peer) }) : t("receiptBack", { ticker })}
          </button>
        ))}
      </div>

      {direction === "back" && receipt && !receipt.exists ? (
        <div className="glass-card rounded-2xl p-4 sm:p-6 text-xs sm:text-sm opacity-80">{t("noReceiptBodySolana", { symbol, network: nameOf(peer) })}</div>
      ) : (
        <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-5">
          <Field
            label={direction === "out" ? t("youSend") : t("youBurn")}
            suffix={symbol}
            hint={have !== null ? t("balance", { amount: coin(have, decimals), symbol }) : undefined}
          >
            <input
              id="bridge-sol-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(",", "."))}
              className="w-full text-2xl sm:text-3xl font-bold bg-transparent outline-none"
            />
          </Field>
          <Field
            label={t("recipientOn", { network: nameOf(peer) })}
            hint={recipient && !isEvmRecipient(recipient) ? t("badEvmRecipient") : t("recipientEvmHint")}
          >
            <input
              id="bridge-sol-recipient"
              type="text"
              placeholder="0x…"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full text-xs sm:text-sm font-bold bg-transparent outline-none"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label={t("operatorFee")} suffix={symbol} hint={t("operatorFeeHint")}>
              <input
                id="bridge-sol-fee"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={fee}
                onChange={(e) => setFee(e.target.value.replace(",", "."))}
                className="w-full text-base font-bold bg-transparent outline-none"
              />
            </Field>
            <Field label={t("fastFee")} suffix={symbol} hint={t("fastFeeHint")}>
              <input
                id="bridge-sol-fast-fee"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={fastFee}
                onChange={(e) => setFastFee(e.target.value.replace(",", "."))}
                className="w-full text-base font-bold bg-transparent outline-none"
              />
            </Field>
          </div>
        </div>
      )}

      {direction === "out" && receiptThere !== true && (
        <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-3 text-xs sm:text-sm border border-red-500/40">
          <p className="font-bold text-red-500">{t("firstLockTitleSolana", { network: nameOf(peer) })}</p>
          <p className="opacity-80">{t("firstLockBodySolana", { network: nameOf(peer) })}</p>
          <label htmlFor="bridge-sol-understood" className="flex items-start gap-2 cursor-pointer">
            <input id="bridge-sol-understood" type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5" />
            <span>{t("firstLockAck")}</span>
          </label>
        </div>
      )}

      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-2 text-xs sm:text-sm">
        <Row
          label={t("youGet")}
          value={amountUnits ? `${coin(amountUnits, decimals)} ${direction === "out" ? "vSOL" : ticker} ${t("onNetwork", { network: nameOf(peer) })}` : "—"}
        />
        {total !== null && <Row label={t("totalTaken")} value={`${coin(total, decimals)} ${symbol}`} bold />}
        <p className="opacity-70 pt-1">{t("timing")}</p>
      </div>

      {error && <p className="text-xs sm:text-sm text-red-500 break-words">{error}</p>}
      {!sol.connected ? (
        <Button buttonText={t("connectFirst", { network: "Solana" })} disabled chain="solana" />
      ) : (
        <Button
          buttonText={busy ? t("confirming") : (problem ?? (direction === "out" ? t("sendButton", { ticker: "SOL" }) : t("burnButton", { symbol })))}
          disabled={busy || !!problem}
          onClick={submit}
          chain="solana"
        />
      )}
    </div>
  );
}

type Item =
  | { kind: "lock"; peer: EvmChain; at: number; x: SolanaLockState }
  | { kind: "burn"; peer: EvmChain; at: number; x: SolanaBurnState };

export function BridgeHistorySolana() {
  const t = useTranslations("Bridge");
  const { locale } = useParams<{ locale: string }>();
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
      .then((all) => live && setItems(all.flat().sort((a, b) => b.at - a.at)))
      .catch((e) => live && setError(errorText(e)));
    return () => {
      live = false;
    };
  }, [sol.address]);

  if (!sol.connected || !sol.address) {
    return (
      <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <p className="text-xs sm:text-sm opacity-70">{t("historyConnect")}</p>
        <SolanaConnectButton />
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
        const amount = `${coin(it.x.amount, 9)} ${it.kind === "lock" ? "SOL" : `v${TICKER[it.peer]}`}`;
        return (
          <li key={`${it.peer}-${it.kind}-${id}`}>
            <Link
              href={`/${locale}/solana/bridge/transaction/${it.peer}-${it.kind}-${id}`}
              className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3 hover:opacity-90 transition-opacity"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-bold text-sm sm:text-base">
                  {it.kind === "lock" ? t("solTo", { network: nameOf(it.peer) }) : t("receiptBack", { ticker: TICKER[it.peer] })} · #{String(id)}
                </span>
                <span className="text-[11px] sm:text-xs opacity-70 tabular-nums">
                  {amount} · {new Date(it.at * 1000).toLocaleString(locale)}
                </span>
              </div>
              <StateChip state={it.x.stage === "Returned" ? "Refunded" : it.x.stage} chain="solana" label={t(`stage${it.x.stage}`)} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
