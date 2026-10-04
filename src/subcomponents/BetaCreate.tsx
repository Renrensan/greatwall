"use client";

// Create a basket: up to 8 parts, each the network's coin, the vault's vSOL,
// or any token by address, with what one whole BETA holds of it, and the
// creator's mint and burn fees (at most 1% each, fixed for good).

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ZeroAddress, isAddress, parseUnits } from "ethers";
import { createBasket, receiptTokens } from "@ipow/sdk";

import Button from "./Button";
import { ConnectNetworkButton, Field, TICKER, errorText } from "./ipow/common";
import { deploymentOf, readProvider, type EvmChain } from "@/components/integrator/ipow/sdk";
import { tokenInfo, type TokenInfo } from "@/components/integrator/ipow/tokens";
import { rememberBasket } from "@/components/integrator/ipow/basketList";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";

const MAX_PARTS = 8;
const MAX_FEE_BPS = 100;

type Part = { token: string; amount: string; info: TokenInfo | null; error: string | null };

export default function BetaCreate({ chain }: { chain: EvmChain }) {
  const t = useTranslations("Beta");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const wallet = useEvmWallet(chain);
  const d = useMemo(() => deploymentOf(chain)!, [chain]);

  const [parts, setParts] = useState<Part[]>([{ token: ZeroAddress, amount: "", info: null, error: null }]);
  const [vsol, setVsol] = useState<string | null>(null);
  const [mintFee, setMintFee] = useState("0");
  const [burnFee, setBurnFee] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    receiptTokens(readProvider(chain), d, 0, 4)
      .then((r) => setVsol(r.get(0) ?? null))
      .catch(() => setVsol(null));
  }, [chain, d]);

  // Each part's symbol and decimals, once its address is whole.
  const tokensKey = parts.map((p) => p.token).join(",");
  useEffect(() => {
    parts.forEach((p, i) => {
      if (!isAddress(p.token)) return;
      tokenInfo(chain, p.token)
        .then((info) => setParts((all) => all.map((q, j) => (j === i && q.token === p.token ? { ...q, info, error: null } : q))))
        .catch(() => setParts((all) => all.map((q, j) => (j === i && q.token === p.token ? { ...q, info: null, error: t("notAToken") } : q))));
    });
  }, [tokensKey, chain]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (i: number, change: Partial<Part>) => setParts((all) => all.map((p, j) => (j === i ? { ...p, ...change } : p)));

  const amounts = parts.map((p) => {
    if (!p.info) return null;
    try {
      const a = parseUnits(p.amount.trim() || "0", p.info.decimals);
      return a > BigInt(0) ? a : null;
    } catch {
      return null;
    }
  });
  const fee = (x: string) => (/^\d+$/.test(x.trim()) && Number(x) <= MAX_FEE_BPS ? Number(x) : null);
  const tokens = parts.map((p) => p.token.toLowerCase());
  const problem = parts.some((p) => !isAddress(p.token) || !p.info)
    ? t("pickTokens")
    : new Set(tokens).size !== tokens.length
      ? t("duplicateToken")
      : amounts.some((a) => a === null)
        ? t("enterAmounts")
        : fee(mintFee) === null || fee(burnFee) === null
          ? t("badFees")
          : null;

  async function submit() {
    if (problem || !wallet.getSigner) return;
    setBusy(true);
    setError(null);
    try {
      const signer = await wallet.getSigner();
      const onChain = (await signer.provider?.getNetwork())?.chainId;
      if (onChain !== undefined && onChain !== BigInt(d.chainId)) throw new Error(t("wrongNetwork"));
      // An id of the creator's own; the time keeps it new for each basket.
      const { key } = await createBasket(signer, d, {
        id: BigInt(Date.now()),
        parts: parts.map((p, i) => ({ token: p.token, amount: amounts[i]! })),
        mintFeeBps: fee(mintFee)!,
        burnFeeBps: fee(burnFee)!,
      });
      rememberBasket(d.betaBaskets, key);
      router.push(`/${locale}/${chain}/beta/transaction/${key}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const choices = [
    { value: ZeroAddress, label: TICKER[chain] },
    ...(vsol ? [{ value: vsol, label: "vSOL" }] : []),
    { value: "custom", label: t("otherToken") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs sm:text-sm opacity-70">{t("wallet")}</span>
        <ConnectNetworkButton chain={chain} />
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-5">
        <p className="text-xs sm:text-sm opacity-70">{t("partsExplainer")}</p>
        {parts.map((p, i) => {
          const choice = choices.some((c) => c.value !== "custom" && c.value.toLowerCase() === p.token.toLowerCase()) ? p.token : "custom";
          return (
            <div key={i} className="flex flex-col gap-3 border-b border-black/10 pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm font-bold">{t("partN", { n: i + 1 })}</span>
                {parts.length > 1 && (
                  <button type="button" onClick={() => setParts((all) => all.filter((_, j) => j !== i))} className="text-xs opacity-70 hover:opacity-100">
                    {t("remove")}
                  </button>
                )}
              </div>
              <select
                id={`beta-part-${i}-token`}
                value={choice}
                onChange={(e) => update(i, { token: e.target.value === "custom" ? "" : e.target.value, info: null, error: null })}
                className="w-full glass-card rounded-lg p-2 text-xs sm:text-sm bg-transparent"
              >
                {choices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {choice === "custom" && (
                <input
                  id={`beta-part-${i}-address`}
                  type="text"
                  placeholder={t("tokenAddress")}
                  value={p.token}
                  onChange={(e) => update(i, { token: e.target.value.trim(), info: null, error: null })}
                  className="w-full text-xs sm:text-sm font-bold bg-transparent outline-none"
                />
              )}
              {p.error && <span className="text-[11px] text-red-500">{p.error}</span>}
              <Field label={t("perWholeBeta")} suffix={p.info?.symbol ?? ""}>
                <input
                  id={`beta-part-${i}-amount`}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={p.amount}
                  onChange={(e) => update(i, { amount: e.target.value.replace(",", ".") })}
                  className="w-full text-xl font-bold bg-transparent outline-none"
                />
              </Field>
            </div>
          );
        })}
        {parts.length < MAX_PARTS && (
          <button
            type="button"
            onClick={() => setParts((all) => [...all, { token: "", amount: "", info: null, error: null }])}
            className="text-xs sm:text-sm font-bold opacity-80 hover:opacity-100 text-left"
          >
            + {t("addPart")}
          </button>
        )}
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label={t("mintFee")} suffix="bps" hint={t("feeHint")}>
          <input id="beta-mint-fee" type="text" inputMode="numeric" value={mintFee} onChange={(e) => setMintFee(e.target.value)} className="w-full text-base font-bold bg-transparent outline-none" />
        </Field>
        <Field label={t("burnFee")} suffix="bps" hint={t("feeHint")}>
          <input id="beta-burn-fee" type="text" inputMode="numeric" value={burnFee} onChange={(e) => setBurnFee(e.target.value)} className="w-full text-base font-bold bg-transparent outline-none" />
        </Field>
      </div>

      {error && <p className="text-xs sm:text-sm text-red-500 break-words">{error}</p>}

      {!wallet.connected ? (
        <Button buttonText={t("connectFirst")} disabled chain={chain} />
      ) : (
        <Button buttonText={busy ? t("confirming") : (problem ?? t("createButton"))} disabled={busy || !!problem} onClick={submit} chain={chain} />
      )}
    </div>
  );
}
