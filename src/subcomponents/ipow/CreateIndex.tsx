"use client";

// The Create page's look, shared by every network: the poster, the token's
// identity and links on the left, its composition, the creator's fees and
// the button on the right. The pages (BetaCreate, BetaSolana) own the
// state and the chain calls; this draws it.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Poster } from "./Poster";
import poster from "@/assets/background-create-index-token.jpg";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";

import { PartLogo, type PickItem } from "./PartPicker";
import { STEP, UNITS, reconcile, setShare, type Shares } from "./shares";

export type IndexMeta = {
  name: string;
  symbol: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  image: File | null;
  /** An object URL of `image`, for the preview. */
  imagePreview: string | null;
};

export type Ingredient = {
  key: string;
  item: PickItem | null;
  /** The logo of the network the asset is from, badged on the token's. */
  network?: string | any | null;
  amount: string;
  /** The token's decimals: the amount takes no more fractional digits. */
  decimals?: number;
  /** The most digits before the point the chain can hold (18 unless told). */
  maxWhole?: number;
  onAmount: (v: string) => void;
  onRemove: () => void;
  /** Opens the picker for this ingredient. */
  onPick: () => void;
  /** What the amount is worth now, when a rate is known. */
  valueUsd: number | null;
  /** What one whole token of it is worth now, when a rate is known: lets the
   *  amount be set as a share of the index token's value. */
  priceUsd?: number | null;
  /** A part Greatwall does not list (a token by address): no price is
   *  known for it, and the creator gives one. */
  customPrice?: boolean;
  /** A line under it: the wallet's balance, or why it cannot be minted yet. */
  note?: ReactNode;
};

export const META_LIMITS = { name: 32, symbol: 10, description: 1000, link: 200 } as const;

/** The amount as typed, kept to digits, one point, the token's decimals
 *  after it and `maxWhole` digits before it, without leading zeros. */
function cleanAmount(raw: string, decimals?: number, maxWhole = 18): string {
  const v = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const dot = v.indexOf(".");
  let whole = dot >= 0 ? v.slice(0, dot) : v;
  let frac = dot >= 0 ? v.slice(dot + 1).replace(/\./g, "") : null;
  whole = whole.replace(/^0+(?=\d)/, "").slice(0, Math.max(1, maxWhole));
  if (frac !== null && decimals !== undefined) frac = frac.slice(0, Math.max(0, decimals));
  if (frac !== null && decimals === 0) frac = null;
  if (frac !== null && whole === "") whole = "0";
  return frac === null ? whole : `${whole}.${frac}`;
}

/** An amount from a value at a price, to six significant digits and the
 *  token's decimals, as the amount field takes it. */
function amountFor(valueUsd: number, priceUsd: number, decimals = 18): string {
  const n = valueUsd / priceUsd;
  if (!(n > 0) || !Number.isFinite(n)) return "";
  const digits = Math.min(decimals, 12);
  const fixed = Number(n.toPrecision(6)).toFixed(digits);
  // Trailing zeros of the fraction only: 100 stays 100.
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
}

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 8 : 2 })}`;

function Text({ id, label, value, max, placeholder, onChange, t, textarea, type }: { id: string; label: string; value: string; max: number; placeholder: string; onChange: (v: string) => void; t: (k: string, v?: any) => string; textarea?: boolean; type?: string }) {
  const cls = "w-full rounded-lg bg-black/5 px-3 py-2.5 text-sm outline-none focus:bg-black/10 transition-colors";
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      <span className="text-sm font-medium">{label}</span>
      {textarea ? (
        <textarea id={id} rows={4} maxLength={max} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={`${cls} resize-y`} />
      ) : (
        <input id={id} type={type ?? "text"} maxLength={max} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
      <span className="text-[11px] opacity-50">{t("maxChars", { n: max })}</span>
    </label>
  );
}

/** The creator's fee, one for mint and burn alike: 0.0% to 0.5% by 0.1%. */
export const FEE_MAX_BPS = 50;
export const FEE_STEP_BPS = 10;

function FeeCard({ id, title, text, label, bps, onChange, hint }: { id: string; title: string; text: string; label: string; bps: number; onChange: (bps: number) => void; hint: string }) {
  const pct = (bps / 100).toFixed(1);
  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="text-xs opacity-70">{text}</p>
      </div>
      <div className="flex items-baseline justify-between gap-3 pt-2">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <span className="font-bold text-2xl tabular-nums">{pct}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={FEE_MAX_BPS}
        step={FEE_STEP_BPS}
        value={bps}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${pct}%`}
        className="w-full accent-ink cursor-pointer"
      />
      <div className="flex justify-between text-[11px] opacity-50 tabular-nums">
        <span>0.0%</span>
        <span>{(FEE_MAX_BPS / 100).toFixed(1)}%</span>
      </div>
      <span className="text-xs opacity-70">{hint}</span>
    </div>
  );
}

export function CreateIndex({
  meta,
  setMeta,
  ingredients,
  onAdd,
  canAdd,
  fees,
  problem,
  busy,
  error,
  connected,
  connectButton,
  onSubmit,
}: {
  meta: IndexMeta;
  setMeta: (change: Partial<IndexMeta>) => void;
  ingredients: Ingredient[];
  onAdd: () => void;
  canAdd: boolean;
  /** The creator's fee in basis points, for mint and burn alike. */
  fees: { bps: number; setBps: (bps: number) => void };
  problem: string | null;
  busy: boolean;
  error: string | null;
  connected: boolean;
  connectButton: ReactNode;
  onSubmit: () => void;
}) {
  const t = useTranslations("Beta");
  // The composition is set as shares of what one token is worth, in 5%
  // steps that always add up to 100% (shares.ts); each part's amount follows
  // from that value and its price, and the amounts are all the chain keeps
  // (the shares drift with prices afterwards). Keyed by the part's token.
  const [indexValue, setIndexValue] = useState("100");
  const [shares, setShares] = useState<Shares>(() => reconcile({}, ingredients.map((i) => i.item?.token || `row-${i.key}`), new Set()));
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  // A price typed in for a part with none known (a token by address).
  const [manualPrice, setManualPrice] = useState<Record<string, string>>({});
  const value = Number(indexValue) > 0 ? Number(indexValue) : null;
  const rowId = (ing: Ingredient) => ing.item?.token || `row-${ing.key}`;
  const lockedSet = () => new Set(Object.keys(locked).filter((k) => locked[k]));
  const priceOf = (ing: Ingredient): number | null => {
    if (ing.customPrice) {
      const m = Number(manualPrice[rowId(ing)]);
      return m > 0 ? m : null;
    }
    return ing.priceUsd != null && ing.priceUsd > 0 ? ing.priceUsd : null;
  };
  // Parts added, removed or re-picked: their shares rebalanced; a part
  // re-picked in place keeps its lock and price, a part gone loses them.
  const ids = ingredients.map(rowId);
  const idsKey = ids.join(",");
  const lastIds = useRef<string[]>(ids);
  useEffect(() => {
    const before = lastIds.current;
    lastIds.current = ids;
    const gone = before.filter((id) => !ids.includes(id));
    const added = ids.filter((id) => !before.includes(id));
    const carry = <T,>(m: Record<string, T>) => {
      const next = { ...m };
      if (gone.length === 1 && added.length === 1 && gone[0] in next) next[added[0]] = next[gone[0]];
      for (const id of gone) delete next[id];
      return next;
    };
    const nextLocked = carry(locked);
    setLocked(nextLocked);
    setManualPrice((m) => carry(m));
    setShares((prev) => reconcile(prev, ids, new Set(Object.keys(nextLocked).filter((k) => nextLocked[k]))));
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const unitsOf = (ing: Ingredient) => shares[rowId(ing)] ?? 0;
  const move = (ing: Ingredient, units: number) => setShares((prev) => setShare(prev, rowId(ing), units, lockedSet()));
  /** What a part is worth in one token, in dollars. */
  const partUsd = (ing: Ingredient) => (value ? (value * unitsOf(ing) * STEP) / 100 : 0);
  // Each part's amount, from its share, the token's value and its price.
  const amountKey = ingredients.map((i) => `${rowId(i)}:${unitsOf(i)}:${priceOf(i) ?? ""}:${i.amount}`).join(",");
  useEffect(() => {
    for (const ing of ingredients) {
      const price = priceOf(ing);
      let amount = "";
      if (price && value && unitsOf(ing) > 0) {
        amount = amountFor(partUsd(ing), price, ing.decimals);
        // An amount past what the chain holds (Solana's 64 bits: 19 -
        // decimals whole digits) is left out, rather than cut to a wrong one.
        if (amount.includes("e") || amount.split(".")[0].length > (ing.maxWhole ?? 18)) amount = "";
      }
      if (amount !== ing.amount) ing.onAmount(amount);
    }
  }, [amountKey, indexValue]); // eslint-disable-line react-hooks/exhaustive-deps
  const noPrice = ingredients.find((i) => i.item && !priceOf(i));
  // Priced, but the share at this value is below the token's smallest unit
  // or above what the chain holds.
  const unfit = ingredients.find((i) => i.item && priceOf(i) && value && (!i.amount || Number(i.amount) === 0));
  const shareProblem = !value
    ? t("enterValue")
    : noPrice
      ? noPrice.customPrice
        ? t("needPrice", { symbol: noPrice.item?.symbol ?? "" })
        : t("loadingPrices")
      : unfit
        ? t("shareUnfit", { symbol: unfit.item?.symbol ?? "" })
        : null;
  /** The most a part's share can be: what the locked parts and one step for
   *  each other unlocked part leave. */
  const maxUnits = (ing: Ingredient) => {
    const others = ingredients.filter((i) => rowId(i) !== rowId(ing));
    const open = others.filter((i) => !locked[rowId(i)]);
    if (!open.length) return unitsOf(ing);
    return UNITS - others.filter((i) => locked[rowId(i)]).reduce((a, i) => a + unitsOf(i), 0) - open.length;
  };
  const preview = meta.imagePreview;
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  const pickImage = (file: File | null) => {
    // A cancelled file dialog gives no file: the chosen image stays.
    if (!file) return;
    setMeta({ image: file, imagePreview: URL.createObjectURL(file) });
  };

  return (
    <div className="flex flex-col gap-6">
      <Poster image={poster} title={t("heroTitle")} text={t("heroText")} />

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-start">
        {/* The token. */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Text id="idx-name" label={t("tokenName")} value={meta.name} max={META_LIMITS.name} placeholder="e.g. NVDA Combination" onChange={(v) => setMeta({ name: v })} t={t} />
            <Text id="idx-symbol" label={t("tokenSymbol")} value={meta.symbol} max={META_LIMITS.symbol} placeholder="e.g. CNVDA" onChange={(v) => setMeta({ symbol: v.toUpperCase().replace(/\s+/g, "") })} t={t} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t("imageLabel")}</span>
            <label htmlFor="idx-image" className="flex items-center gap-4 rounded-xl border border-dashed border-ink/20 p-4 cursor-pointer hover:bg-black/5 transition-colors">
              {meta.imagePreview ? (
                <img src={meta.imagePreview} alt="" className="w-14 h-14 rounded-xl object-cover border border-ink/10 shrink-0" />
              ) : (
                <span className="w-14 h-14 rounded-xl border border-ink/15 bg-black/5 flex items-center justify-center shrink-0">
                  <Icon icon="solar:gallery-linear" className="text-2xl opacity-60" />
                </span>
              )}
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-sm font-semibold truncate">{meta.image ? meta.image.name : t("chooseImage")}</span>
                <span className="text-xs opacity-60">{t("imageHint")}</span>
              </div>
              <input id="idx-image" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickImage(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <Text id="idx-description" label={t("tokenDescription")} value={meta.description} max={META_LIMITS.description} placeholder={t("tokenDescriptionPlaceholder")} onChange={(v) => setMeta({ description: v })} t={t} textarea />
          <Text id="idx-website" label={t("website")} value={meta.website} max={META_LIMITS.link} placeholder="https://greatwall.finance/" onChange={(v) => setMeta({ website: v.trim() })} t={t} type="url" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Text id="idx-twitter" label={t("twitter")} value={meta.twitter} max={META_LIMITS.link} placeholder="https://x.com/project" onChange={(v) => setMeta({ twitter: v.trim() })} t={t} type="url" />
            <Text id="idx-telegram" label={t("telegram")} value={meta.telegram} max={META_LIMITS.link} placeholder="https://t.me/project" onChange={(v) => setMeta({ telegram: v.trim() })} t={t} type="url" />
          </div>
        </div>

        {/* The composition, the fees, the button. */}
        <div className="flex flex-col gap-4">
          <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-2xl">{t("composition")}</h2>
              <p className="text-xs opacity-70">{t("compositionText")}</p>
            </div>
            {ingredients.length === 0 && <p className="text-xs opacity-60">{t("noIngredients")}</p>}
            {/* What one token is worth: what each share is of. */}
            <label htmlFor="idx-value" className="flex items-center justify-between gap-3 rounded-xl bg-black/5 px-3 py-2">
              <span className="text-xs opacity-70">{t("indexValue")}</span>
              <span className="flex items-baseline gap-1 font-bold tabular-nums">
                $
                <input
                  id="idx-value"
                  type="text"
                  inputMode="decimal"
                  value={indexValue}
                  onChange={(e) => setIndexValue(cleanAmount(e.target.value, 2, 9))}
                  style={{ width: `${Math.max(2, indexValue.length)}ch` }}
                  className="bg-transparent outline-none text-right"
                />
              </span>
            </label>
            <p className="text-[11px] opacity-60 px-1">{t("sharesDrift")}</p>
            {ingredients.map((ing) => {
              const id = rowId(ing);
              const units = unitsOf(ing);
              const isLocked = !!locked[id];
              const price = priceOf(ing);
              return (
                <div key={ing.key} className="rounded-2xl bg-cream border border-ink/10 p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={ing.onPick} title={t("chooseLabel")} className="relative shrink-0">
                      <PartLogo item={ing.item} size={32} />
                      {ing.network && ing.network !== ing.item?.logo && (
                        <Image src={ing.network} alt="" width={14} height={14} unoptimized={typeof ing.network === "string"} className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-cream bg-cream" style={{ width: 14, height: 14 }} />
                      )}
                    </button>
                    <div className="flex flex-col leading-tight min-w-0 flex-1">
                      <button type="button" onClick={ing.onPick} className="text-xs opacity-70 truncate text-left hover:underline hover:opacity-100">
                        {ing.item?.name ?? t("pickToken")}
                      </button>
                      <span className="font-bold text-lg sm:text-xl truncate">{ing.item ? `$${ing.item.symbol}` : ""}</span>
                      <span className="text-[11px] opacity-60 tabular-nums truncate">
                        {ing.amount && Number(ing.amount) > 0 ? `${ing.amount} ${ing.item?.symbol ?? ""} · ${money(partUsd(ing))}` : !price && ing.customPrice ? t("needPriceShort") : !price ? t("loadingPrices") : ""}
                      </span>
                    </div>
                    {/* The share, in 5% steps; locked, it keeps while the others move. */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => move(ing, units - 1)} disabled={units <= 1 || ingredients.every((i) => i === ing || locked[rowId(i)])} aria-label={t("decreaseShare", { symbol: ing.item?.symbol ?? "" })} className="w-7 h-7 rounded-md bg-black/5 hover:bg-black/10 disabled:opacity-30 font-bold">
                        −
                      </button>
                      <span className="w-12 text-center font-bold text-lg tabular-nums">{units * STEP}%</span>
                      <button type="button" onClick={() => move(ing, units + 1)} disabled={units >= maxUnits(ing)} aria-label={t("increaseShare", { symbol: ing.item?.symbol ?? "" })} className="w-7 h-7 rounded-md bg-black/5 hover:bg-black/10 disabled:opacity-30 font-bold">
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocked((l) => ({ ...l, [id]: !l[id] }))}
                        aria-pressed={isLocked}
                        title={isLocked ? t("unlockShare") : t("lockShare")}
                        aria-label={t("lockShareOf", { symbol: ing.item?.symbol ?? "" })}
                        className={`w-7 h-7 rounded-md flex items-center justify-center ${isLocked ? "bg-ink text-snow" : "bg-black/5 hover:bg-black/10 opacity-70"}`}
                      >
                        <Icon icon={isLocked ? "solar:lock-keyhole-bold" : "solar:lock-keyhole-unlocked-linear"} className="text-sm" />
                      </button>
                    </div>
                    <span className="w-px self-stretch bg-ink/15 shrink-0" aria-hidden />
                    <button type="button" onClick={ing.onRemove} title={t("removeIngredient")} aria-label={t("removeIngredient")} className="w-6 h-6 rounded-md bg-[#8f1d13] text-white flex items-center justify-center shrink-0 hover:bg-[#6f150e] transition-colors">
                      <svg width="9" height="9" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                  {/* A part with no price known: its price, typed in. */}
                  {ing.item && ing.customPrice && (
                    <label className="flex items-center justify-between gap-3 text-xs" htmlFor={`idx-price-${ing.key}`}>
                      <span className="opacity-70">{t("pricePerToken")}</span>
                      <span className="flex items-baseline gap-1 font-semibold tabular-nums">
                        $
                        <input
                          id={`idx-price-${ing.key}`}
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={manualPrice[id] ?? ""}
                          onChange={(e) => setManualPrice((m) => ({ ...m, [id]: cleanAmount(e.target.value, 8, 12) }))}
                          className="w-24 bg-black/5 rounded px-2 py-1 outline-none text-right"
                        />
                      </span>
                    </label>
                  )}
                  {ing.note && <div className="text-[11px] opacity-70">{ing.note}</div>}
                </div>
              );
            })}
            {ingredients.length > 0 && <p className="text-[11px] opacity-60">{t("sharesNote")}</p>}
            <p className="sr-only" aria-live="polite">
              {ingredients.map((i) => `${i.item?.symbol ?? ""} ${unitsOf(i) * STEP}%`).join(", ")}
            </p>
            <button type="button" disabled={!canAdd} onClick={onAdd} className="w-full rounded-lg bg-ink text-snow py-3 text-sm font-medium hover:bg-pitch disabled:opacity-40 transition-colors">
              + {t("addIngredient")}
            </button>
          </div>
          <FeeCard id="idx-fee" title={t("feesTitle")} text={t("feesText")} label={t("creatorFee")} bps={fees.bps} onChange={fees.setBps} hint={t("feeSliderHint")} />
          {error && <p className="text-xs sm:text-sm text-red-500 break-words">{error}</p>}
          {!connected ? (
            <div className="gw-wallet-full">
              {connectButton}
            </div>
          ) : (
            <button type="button" disabled={busy || !!shareProblem || !!problem} onClick={onSubmit} className="w-full rounded-lg bg-ink text-snow py-3.5 text-sm font-medium hover:bg-pitch disabled:opacity-40 transition-colors">
              {busy ? t("confirming") : (shareProblem ?? problem ?? t("createIndex"))}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** The limits a network's contract puts on the token's name and symbol, the stricter of its and the form's. */
export const limitsFor = (chain: { name: number; symbol: number }) => ({ name: Math.min(chain.name, META_LIMITS.name), symbol: Math.min(chain.symbol, META_LIMITS.symbol) });

/** Stores the metadata and image with this server; the URI the chain keeps. */
export async function storeMetadata(meta: IndexMeta): Promise<{ uri: string; image: string | null }> {
  const form = new FormData();
  form.set("meta", JSON.stringify({ name: meta.name.trim(), symbol: meta.symbol.trim(), description: meta.description.trim(), external_url: meta.website.trim(), twitter: meta.twitter.trim(), telegram: meta.telegram.trim() }));
  if (meta.image) form.set("image", meta.image);
  const r = await fetch("/api/beta/metadata", { method: "POST", body: form });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error ?? `the metadata could not be stored (${r.status})`);
  return { uri: body.uri, image: body.image ?? null };
}
