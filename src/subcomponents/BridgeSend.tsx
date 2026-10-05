"use client";

// Send across the vault pair with Solana: lock the network's coin for its
// receipt on Solana, or burn Solana's receipts (vSOL) here for SOL there.
// Amounts are typed in the coin's units; a vault counts in record units
// (9 decimals), so a finer amount is refused before it reaches the wallet.

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Contract, parseUnits } from "ethers";
import { burn, homeAssets, lock, quoteLock, receiptTokens, type HomeAsset } from "@ipow/sdk";

import Button from "./Button";
import { ConnectNetworkButton, Field, Row, TICKER, accentText, coin, errorText } from "./ipow/common";
import { PublicKey } from "@solana/web3.js";
import { deploymentOf, isSolanaAddress, readProvider, solanaConnection, solanaVaultOf, type EvmChain } from "@/components/integrator/ipow/sdk";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";

type Direction = "out" | "back";

const ERC20 = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)", "function symbol() view returns (string)"];
const ZERO = BigInt(0);

/** Solana's assets are numbered there; SOL is asset 0. */
const SOL_ASSET = 0;

type Receipt = { token: string; symbol: string; decimals: number; balance: bigint };

export default function BridgeSend({ chain }: { chain: EvmChain }) {
  const t = useTranslations("Bridge");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const wallet = useEvmWallet(chain);
  const d = useMemo(() => deploymentOf(chain)!, [chain]);
  const provider = readProvider(chain);
  const ticker = TICKER[chain];

  const [direction, setDirection] = useState<Direction>("out");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [fee, setFee] = useState("");
  const [fastFee, setFastFee] = useState("");
  const [asset, setAsset] = useState<HomeAsset | null>(null);
  const tokenParam = useSearchParams().get("token");
  const en = (useParams<{ locale: string }>().locale ?? "en") === "en";
  const [notCarried, setNotCarried] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null | "none">(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Whether Solana has made this coin's receipt yet: a first lock waits for
   *  an operator to carry the asset itself across, with no way back before. */
  const [receiptOnSolana, setReceiptOnSolana] = useState<boolean | null>(null);
  const [understood, setUnderstood] = useState(false);
  /** For SOL paid to a Solana account that does not exist yet: the least it
   *  can be, Solana's rent-exempt minimum; null when it exists. */
  const [rentFloor, setRentFloor] = useState<bigint | null>(null);

  // The coin's vault asset, and vSOL here if Solana's SOL was ever carried.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [assets, receipts] = await Promise.all([homeAssets(provider, d), receiptTokens(provider, d, 0, 4)]);
        if (!live) return;
        // A token asked for (`?token=`, as the Portfolio links here): the
        // vault's asset for it, when the vault carries it.
        const wanted = tokenParam?.toLowerCase();
        const picked = wanted ? assets.find((a) => a.token.toLowerCase() === wanted) : undefined;
        setAsset(picked ?? assets[0] ?? null);
        if (wanted && !picked) setNotCarried(true);
        const token = receipts.get(SOL_ASSET);
        if (!token) return setReceipt("none");
        const c = new Contract(token, ERC20, provider);
        const [symbol, decimals, held] = await Promise.all([
          c.symbol() as Promise<string>,
          c.decimals() as Promise<bigint>,
          wallet.address ? (c.balanceOf(wallet.address) as Promise<bigint>) : Promise.resolve(ZERO),
        ]);
        if (live) setReceipt({ token, symbol, decimals: Number(decimals), balance: held });
      } catch (e) {
        if (live) setLoadError(errorText(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [provider, d, wallet.address]);

  // Whether Solana has made this asset's receipt yet (the coin's, or a token's).
  useEffect(() => {
    if (!asset) return;
    const conn = solanaConnection();
    conn
      .getAccountInfo(solanaVaultOf(chain).receiptMint(asset.number))
      .then((info) => setReceiptOnSolana(info !== null))
      .catch(() => setReceiptOnSolana(null));
  }, [chain, asset]);

  useEffect(() => {
    setRentFloor(null);
    if (direction !== "back" || !isSolanaAddress(recipient)) return;
    let live = true;
    const conn = solanaConnection();
    Promise.all([conn.getAccountInfo(new PublicKey(recipient.trim())), conn.getMinimumBalanceForRentExemption(0)])
      .then(([info, min]) => {
        if (live) setRentFloor(info ? null : BigInt(min));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [direction, recipient]);

  useEffect(() => {
    if (!wallet.address) return setBalance(null);
    provider.getBalance(wallet.address).then(setBalance).catch(() => setBalance(null));
  }, [provider, wallet.address]);

  // Amounts in the units of what is sent: the coin out, vSOL back.
  const decimals = direction === "out" ? (asset?.decimals ?? 18) : receipt && receipt !== "none" ? receipt.decimals : 9;
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
  // A lock counts in record units: whole multiples of the asset's unit.
  const whole = (x: bigint | null) => x !== null && (direction === "back" || !asset || x % asset.unit === ZERO);
  const total = amountUnits !== null && feeUnits !== null && fastUnits !== null ? amountUnits + feeUnits + fastUnits : null;
  const have = direction === "out" ? balance : receipt && receipt !== "none" ? receipt.balance : null;
  const symbol = direction === "out" ? ticker : receipt && receipt !== "none" ? receipt.symbol : "vSOL";

  const problem = !asset
    ? t("loading")
    : direction === "back" && receipt === null
      ? t("loading")
      : direction === "back" && receipt === "none"
      ? t("noReceiptYet")
      : !amountUnits || amountUnits === ZERO
        ? t("enterAmount")
        : feeUnits === null || fastUnits === null
          ? t("badFee")
          : !whole(amountUnits) || !whole(feeUnits) || !whole(fastUnits)
            ? t("tooFine")
            : !isSolanaAddress(recipient)
              ? t("badRecipient")
              : have !== null && total !== null && total > have
                ? t("notEnough", { symbol })
                : direction === "back" && rentFloor !== null && amountUnits < rentFloor
                  ? t("belowRent", { min: coin(rentFloor, 9) })
                  : direction === "out" && receiptOnSolana !== true && !understood
                    ? t("confirmFirstLock")
                    : null;

  async function submit() {
    if (problem || amountUnits === null || feeUnits === null || fastUnits === null || !wallet.getSigner) return;
    setBusy(true);
    setError(null);
    try {
      const signer = await wallet.getSigner();
      const onChain = (await signer.provider?.getNetwork())?.chainId;
      if (onChain !== undefined && onChain !== BigInt(d.chainId)) throw new Error(t("wrongNetwork"));
      if (direction === "out") {
        const quote = await quoteLock(provider, d, { asset: asset?.number ?? 0, amount: amountUnits, fee: feeUnits, fastFee: fastUnits });
        const { lockId } = await lock(signer, d, quote, recipient.trim());
        router.push(`/${locale}/${chain}/bridge/transaction/lock-${lockId}`);
      } else {
        const { requestId } = await burn(signer, d, { asset: SOL_ASSET, to: recipient.trim(), amount: amountUnits, fee: feeUnits, fastFee: fastUnits });
        router.push(`/${locale}/${chain}/bridge/transaction/burn-${requestId}`);
      }
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const accent = accentText(chain);
  const networkName = chain.charAt(0).toUpperCase() + chain.slice(1);

  return (
    <div className="flex flex-col gap-4">
      {notCarried && (
        <p className="text-xs text-stone">{en ? "This token is not carried by the vault on this network yet, so it cannot be bridged; the vault's own assets are below." : "Token ini belum dibawa vault di jaringan ini, jadi belum bisa dijembatani; aset vault sendiri ada di bawah."}</p>
      )}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs sm:text-sm opacity-70">{t("wallet")}</span>
        <ConnectNetworkButton chain={chain} />
      </div>

      <div className="flex glass-card bgRound border-black/5">
        {(["out", "back"] as const).map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => setDirection(x)}
            className={`w-full p-3 rounded-full text-xs sm:text-sm transition-all ${direction === x ? `font-bold ${accent} bg-black/5` : "font-medium opacity-70"}`}
          >
            {x === "out" ? t("toSolana", { ticker }) : t("fromSolana")}
          </button>
        ))}
      </div>

      {loadError && <p className="text-xs sm:text-sm text-red-500 break-words">{loadError}</p>}

      {direction === "back" && receipt === "none" ? (
        <div className="glass-card rounded-2xl p-4 sm:p-6 text-xs sm:text-sm opacity-80">{t("noReceiptBody", { network: networkName })}</div>
      ) : (
        <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-5">
          <Field
            label={direction === "out" ? t("youSend") : t("youBurn")}
            suffix={symbol}
            hint={have !== null ? t("balance", { amount: coin(have, decimals), symbol }) : undefined}
          >
            <input
              id="bridge-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(",", "."))}
              className={`w-full text-2xl sm:text-3xl font-bold bg-transparent outline-none ${accent}`}
            />
          </Field>

          <Field label={t("recipient")} hint={recipient && !isSolanaAddress(recipient) ? t("badRecipient") : t("recipientHint")}>
            <input
              id="bridge-recipient"
              type="text"
              placeholder={t("recipientPlaceholder")}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full text-xs sm:text-sm font-bold bg-transparent outline-none"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label={t("operatorFee")} suffix={symbol} hint={t("operatorFeeHint")}>
              <input
                id="bridge-fee"
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
                id="bridge-fast-fee"
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

      {direction === "out" && receiptOnSolana !== true && (
        <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-3 text-xs sm:text-sm border border-red-500/40">
          <p className="font-bold text-red-500">{t("firstLockTitle")}</p>
          <p className="opacity-80">{t("firstLockBody", { ticker })}</p>
          <label htmlFor="bridge-understood" className="flex items-start gap-2 cursor-pointer">
            <input id="bridge-understood" type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5" />
            <span>{t("firstLockAck")}</span>
          </label>
        </div>
      )}

      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-2 text-xs sm:text-sm">
        <Row
          label={t("youGet")}
          value={
            amountUnits
              ? `${coin(amountUnits, decimals)} ${direction === "out" ? `v${ticker}` : "SOL"} ${t("onSolana")}`
              : "—"
          }
        />
        {total !== null && <Row label={t("totalTaken")} value={`${coin(total, decimals)} ${symbol}`} bold />}
        <p className="opacity-70 pt-1">{t("timing")}</p>
      </div>

      {error && <p className="text-xs sm:text-sm text-red-500 break-words">{error}</p>}

      {!wallet.connected ? (
        <Button buttonText={t("connectFirst", { network: networkName })} disabled chain={chain} />
      ) : (
        <Button
          buttonText={busy ? t("confirming") : (problem ?? (direction === "out" ? t("sendButton", { ticker }) : t("burnButton", { symbol })))}
          disabled={busy || !!problem}
          onClick={submit}
          chain={chain}
        />
      )}
    </div>
  );
}

