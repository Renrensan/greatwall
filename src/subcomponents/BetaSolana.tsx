"use client";

// BETA on Solana: the baskets this browser knows, and creating one. A part
// is an SPL token: SOL (wrapped as it is minted), a vault receipt of an EVM
// network's coin (vETH…), or any token by its mint.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseUnits } from "ethers";
import { SOLANA, SOLANA_BASKET_NAMING, WRAPPED_SOL, type SolanaBasket } from "@ipow/sdk";

import Button from "./Button";
import { SolanaConnectButton } from "./SolanaConnectButton";
import { Field, Notice, coin, errorText, shortHash } from "./ipow/common";
import { solanaBeta } from "@/components/integrator/ipow/sdk";
import { solanaToken, type SolanaToken } from "@/components/integrator/ipow/solanaTokens";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import { crossChoicesOn, pairedWith, type CrossChoice } from "@/components/integrator/ipow/crossAssets";
import { PartButton, PartPicker, type PickGroup, type PickItem } from "./ipow/PartPicker";
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
  const [cross, setCross] = useState<CrossChoice[]>([]);
  const [picking, setPicking] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [mintFee, setMintFee] = useState("0");
  const [burnFee, setBurnFee] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The EVM networks' assets as their receipts here (vETH…), by the
  // original asset's name; those not bridged yet cannot be parts.
  useEffect(() => {
    let live = true;
    crossChoicesOn("solana")
      .then((list) => live && setCross(list))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const mintsKey = parts.map((p) => p.mint).join(",");
  useEffect(() => {
    parts.forEach((p, i) => {
      if (!isSolanaBasket(p.mint) || isPending(p.mint)) return;
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
  // The token's metadata (E4) as a data URI: Token Metadata keeps 200 bytes
  // of URI, so the description must be short.
  const metadataUri = useMemo(() => {
    const meta: Record<string, string> = { name: name.trim(), symbol: symbol.trim() };
    if (description.trim()) meta.description = description.trim();
    if (image.trim()) meta.image = image.trim();
    return `data:application/json;base64,${btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(meta))))}`;
  }, [name, symbol, description, image]);
  const bytes = (v: string) => new TextEncoder().encode(v).length;
  const nameOk = bytes(name.trim()) >= 1 && bytes(name.trim()) <= SOLANA_BASKET_NAMING.name;
  const symbolOk = bytes(symbol.trim()) >= 1 && bytes(symbol.trim()) <= SOLANA_BASKET_NAMING.symbol;
  const uriOk = bytes(metadataUri) <= SOLANA_BASKET_NAMING.uri;
  const problem = !nameOk || !symbolOk
    ? t("enterName")
    : !uriOk
      ? t("descriptionTooLong")
      : parts.some((p) => !p.info)
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
        name: name.trim(),
        symbol: symbol.trim(),
        uri: metadataUri,
        parts: parts.map((p, i) => ({ mint: p.mint, amount: amounts[i]!, pending: isPending(p.mint) })),
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

  const nameOfChain = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
  const here: PickItem[] = [
    { token: WRAPPED_SOL, symbol: "SOL", name: "Solana", logo: "/assets/networks/solana.png" },
    ...rwaTokensOf("solana").map((r) => ({ token: r.token, symbol: r.symbol, name: r.name, logo: r.logo ?? null })),
  ];
  const groups: PickGroup[] = [
    { key: "solana", label: "Solana", logo: "/assets/networks/solana.png", items: here },
    ...pairedWith("solana").map((from) => ({
      key: from,
      label: nameOfChain(from),
      logo: `/assets/networks/${from}.png`,
      items: cross.filter((c) => c.from === from).map((c) => ({ token: c.token, symbol: c.symbol, name: c.name, logo: c.logo, exists: c.exists })),
    })),
  ];
  const itemOf = (mint: string): PickItem | null => groups.flatMap((g) => g.items).find((it) => it.token === mint) ?? null;
  const pick = (i: number, mint: string) => {
    // A receipt not made yet (E5): its mint is the vault's address for it,
    // its symbol and decimals known from the vault; the program records it
    // pending and reads it at the first mint.
    const pending = mint.startsWith("pending:") ? cross.find((c) => !c.exists && `pending:${c.symbol}` === mint) ?? null : null;
    if (pending) {
      update(i, { mint: pending.token, info: { mint: pending.token, symbol: pending.symbol, decimals: pending.decimals }, error: null });
    } else {
      update(i, { mint, info: null, error: null });
    }
    setPicking(null);
  };
  const isPending = (mint: string) => cross.some((c) => !c.exists && c.token === mint);

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs sm:text-sm opacity-70">{t("wallet")}</span>
        <SolanaConnectButton />
      </div>

      {/* The token's name and what it is (E4). */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
        <p className="text-xs sm:text-sm opacity-70">{t("namingExplainer")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(0,160px)] gap-4">
          <Field label={t("tokenName")} hint={`${bytes(name)}/${SOLANA_BASKET_NAMING.name}`}>
            <input id="beta-sol-name" type="text" maxLength={SOLANA_BASKET_NAMING.name} placeholder={t("tokenNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} className="w-full text-base font-bold bg-transparent outline-none" />
          </Field>
          <Field label={t("tokenSymbol")} hint={`${bytes(symbol)}/${SOLANA_BASKET_NAMING.symbol}`}>
            <input id="beta-sol-symbol" type="text" maxLength={SOLANA_BASKET_NAMING.symbol} placeholder="GTB" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/\s+/g, ""))} className="w-full text-base font-bold bg-transparent outline-none uppercase" />
          </Field>
        </div>
        <Field label={t("tokenDescription")} hint={`${bytes(metadataUri)}/${SOLANA_BASKET_NAMING.uri} · ${t("tokenDescriptionHintSolana")}`}>
          <textarea id="beta-sol-description" rows={2} placeholder={t("tokenDescriptionPlaceholderSolana")} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full text-sm bg-transparent outline-none resize-y" />
        </Field>
        <Field label={t("tokenImage")} hint={t("tokenImageHint")}>
          <input id="beta-sol-image" type="url" placeholder="https://…/logo.png" value={image} onChange={(e) => setImage(e.target.value.trim())} className="w-full text-sm bg-transparent outline-none font-mono" />
        </Field>
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-5">
        <p className="text-xs sm:text-sm opacity-70">{t("partsExplainerSolana")}</p>
        {parts.map((p, i) => {
          const known = itemOf(p.mint);
          const custom = !known && p.mint !== "";
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
              <PartButton
                item={known ?? (isPending(p.mint) ? { token: p.mint, symbol: p.info?.symbol ?? "", name: `${cross.find((c) => c.token === p.mint)?.name ?? ""} · ${t("notBridgedYet")}`, logo: cross.find((c) => c.token === p.mint)?.logo ?? null } : p.info ? { token: p.mint, symbol: p.info.symbol, name: p.mint, logo: null } : null)}
                placeholder={t("pickToken")}
                subtitle={p.mint || t("byAddress")}
                open={picking === i}
                onClick={() => setPicking(picking === i ? null : i)}
                chooseLabel={t("chooseLabel")}
              />
              {picking === i && (
                <PartPicker
                  groups={groups}
                  selected={p.mint}
                  taken={parts.filter((_, j) => j !== i).map((q) => q.mint)}
                  onPick={(mint) => pick(i, mint)}
                  onByAddress={() => pick(i, "")}
                  labels={{ byAddress: t("byAddress"), notBridgedYet: t("notBridgedYet"), none: t("noneBridged") }}
                />
              )}
              {custom && (
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

