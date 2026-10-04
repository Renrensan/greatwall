"use client";

// BETA on Solana: the baskets this browser knows, and creating one. A part
// is an SPL token: SOL (wrapped as it is minted), a vault receipt of an EVM
// network's coin (vETH…), or any token by its mint.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseUnits } from "ethers";
import { SOLANA, WRAPPED_SOL, type SolanaBasket } from "@ipow/sdk";

import Button from "./Button";
import { SolanaConnectButton } from "./SolanaConnectButton";
import { Field, Notice, coin, errorText, shortHash } from "./ipow/common";
import { solanaBeta } from "@/components/integrator/ipow/sdk";
import { mintExists, receiptMints, solanaToken, type SolanaToken } from "@/components/integrator/ipow/solanaTokens";
import { isSolanaBasket, knownBaskets, rememberBasket } from "@/components/integrator/ipow/basketList";
import { useSolanaWallet } from "@/components/solana/solana-provider";

const MAX_PARTS = 8;
const MAX_FEE_BPS = 100;
const PROGRAM = SOLANA.programs.betaBasket;

type Row = { address: string; basket: SolanaBasket | null; parts: SolanaToken[]; error?: string };

export function SolanaBaskets() {
  const t = useTranslations("Beta");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState("");

  useEffect(() => {
    let live = true;
    const reader = solanaBeta(null);
    Promise.all(
      knownBaskets(PROGRAM).map(async (address): Promise<Row> => {
        try {
          const basket = await reader.getBasket(address);
          return { address, basket, parts: await Promise.all(basket.parts.map((p) => solanaToken(p.mint))) };
        } catch (e) {
          return { address, basket: null, parts: [], error: errorText(e) };
        }
      })
    ).then((r) => live && setRows(r));
    return () => {
      live = false;
    };
  }, []);

  const valid = isSolanaBasket(open);
  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-3">
        <label htmlFor="beta-sol-open" className="text-[11px] sm:text-xs opacity-70">
          {t("openLabelSolana")}
        </label>
        <input
          id="beta-sol-open"
          type="text"
          placeholder={t("basketAddress")}
          value={open}
          onChange={(e) => setOpen(e.target.value)}
          className="w-full text-xs sm:text-sm font-bold bg-transparent outline-none"
        />
        <Button
          buttonText={valid ? t("openButton") : t("openHintSolana")}
          disabled={!valid}
          onClick={() => router.push(`/${locale}/solana/beta/transaction/${open.trim()}`)}
          chain="solana"
        />
      </div>

      {!rows ? (
        <Notice text={t("loading")} />
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-2 text-center text-xs sm:text-sm">
          <p className="opacity-70">{t("noneKnown")}</p>
          <Link href={`/${locale}/solana/beta/create`} className="font-bold underline">
            {t("createOne")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.address}>
              <Link
                href={`/${locale}/solana/beta/transaction/${r.address}`}
                className="glass-card rounded-2xl p-4 flex flex-col gap-1 hover:opacity-90 transition-opacity"
              >
                <span className="font-bold text-sm sm:text-base">
                  {t("basketName", { id: r.basket ? String(r.basket.id) : "?" })} · {shortHash(r.address)}
                </span>
                {r.basket ? (
                  <span className="text-[11px] sm:text-xs opacity-70 tabular-nums">
                    {r.basket.parts.map((p, i) => `${coin(p.amount, r.parts[i].decimals)} ${r.parts[i].symbol}`).join(" + ")} {t("perBeta")} ·{" "}
                    {t("supply", { amount: coin(r.basket.supply, 9) })}
                  </span>
                ) : (
                  <span className="text-[11px] sm:text-xs text-red-500 break-words">{r.error}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Part = { mint: string; amount: string; info: SolanaToken | null; error: string | null };

export function SolanaBetaCreate() {
  const t = useTranslations("Beta");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const sol = useSolanaWallet();
  const [parts, setParts] = useState<Part[]>([{ mint: WRAPPED_SOL, amount: "", info: null, error: null }]);
  const [receipts, setReceipts] = useState<{ mint: string; symbol: string }[]>([]);
  const [mintFee, setMintFee] = useState("0");
  const [burnFee, setBurnFee] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The vault receipts made here so far: those can be parts.
  useEffect(() => {
    let live = true;
    Promise.all(receiptMints().map(async (r) => ((await mintExists(r.mint)) ? r : null)))
      .then((found) => live && setReceipts(found.filter((r): r is NonNullable<typeof r> => r !== null)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const mintsKey = parts.map((p) => p.mint).join(",");
  useEffect(() => {
    parts.forEach((p, i) => {
      if (!isSolanaBasket(p.mint)) return;
      solanaToken(p.mint)
        .then((info) => setParts((all) => all.map((q, j) => (j === i && q.mint === p.mint ? { ...q, info, error: null } : q))))
        .catch(() => setParts((all) => all.map((q, j) => (j === i && q.mint === p.mint ? { ...q, info: null, error: t("notATokenSolana") } : q))));
    });
  }, [mintsKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const problem = parts.some((p) => !p.info)
    ? t("pickTokens")
    : new Set(parts.map((p) => p.mint)).size !== parts.length
      ? t("duplicateToken")
      : amounts.some((a) => a === null)
        ? t("enterAmounts")
        : fee(mintFee) === null || fee(burnFee) === null
          ? t("badFees")
          : null;

  async function submit() {
    const wallet = sol.getAnchorWallet();
    if (problem || !wallet) return;
    setBusy(true);
    setError(null);
    try {
      // An id of the creator's own; the time keeps it new for each basket.
      const { basket } = await solanaBeta(wallet).createBasket({
        id: BigInt(Date.now()),
        parts: parts.map((p, i) => ({ mint: p.mint, amount: amounts[i]! })),
        mintFeeBps: fee(mintFee)!,
        burnFeeBps: fee(burnFee)!,
      });
      rememberBasket(PROGRAM, basket);
      router.push(`/${locale}/solana/beta/transaction/${basket}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const choices = [{ value: WRAPPED_SOL, label: "SOL" }, ...receipts.map((r) => ({ value: r.mint, label: r.symbol })), { value: "custom", label: t("otherToken") }];

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs sm:text-sm opacity-70">{t("wallet")}</span>
        <SolanaConnectButton />
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-5">
        <p className="text-xs sm:text-sm opacity-70">{t("partsExplainerSolana")}</p>
        {parts.map((p, i) => {
          const choice = choices.some((c) => c.value !== "custom" && c.value === p.mint) ? p.mint : "custom";
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
                id={`beta-sol-part-${i}-token`}
                value={choice}
                onChange={(e) => update(i, { mint: e.target.value === "custom" ? "" : e.target.value, info: null, error: null })}
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
                  id={`beta-sol-part-${i}-mint`}
                  type="text"
                  placeholder={t("tokenMint")}
                  value={p.mint}
                  onChange={(e) => update(i, { mint: e.target.value.trim(), info: null, error: null })}
                  className="w-full text-xs sm:text-sm font-bold bg-transparent outline-none"
                />
              )}
              {p.error && <span className="text-[11px] text-red-500">{p.error}</span>}
              <Field label={t("perWholeBeta")} suffix={p.info?.symbol ?? ""}>
                <input
                  id={`beta-sol-part-${i}-amount`}
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
            onClick={() => setParts((all) => [...all, { mint: "", amount: "", info: null, error: null }])}
            className="text-xs sm:text-sm font-bold opacity-80 hover:opacity-100 text-left"
          >
            + {t("addPart")}
          </button>
        )}
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label={t("mintFee")} suffix="bps" hint={t("feeHint")}>
          <input id="beta-sol-mint-fee" type="text" inputMode="numeric" value={mintFee} onChange={(e) => setMintFee(e.target.value)} className="w-full text-base font-bold bg-transparent outline-none" />
        </Field>
        <Field label={t("burnFee")} suffix="bps" hint={t("feeHint")}>
          <input id="beta-sol-burn-fee" type="text" inputMode="numeric" value={burnFee} onChange={(e) => setBurnFee(e.target.value)} className="w-full text-base font-bold bg-transparent outline-none" />
        </Field>
      </div>

      {error && <p className="text-xs sm:text-sm text-red-500 break-words">{error}</p>}
      {!sol.connected ? (
        <Button buttonText={t("connectFirst")} disabled chain="solana" />
      ) : (
        <Button buttonText={busy ? t("confirming") : (problem ?? t("createButton"))} disabled={busy || !!problem} onClick={submit} chain="solana" />
      )}
    </div>
  );
}

