"use client";

// An index token's own page, as the Explore cards open it, shared by every
// network: on the left what the token is (its overview, figures and
// composition), on the right minting or redeeming it, with what each part
// takes, what the wallet holds and what is missing, and its creator. The
// pages (BasketPage, SolanaBasketPage) own the reads and the chain calls;
// this draws them.

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";

export type DetailPart = {
  key: string;
  symbol: string;
  name: string;
  logo: string | null;
  /** The network the asset lives on, for its badge. */
  network: string;
  /** What one token holds of it, formatted. */
  perToken: string;
  /** What that is worth now, when a price is known. */
  valueUsd: number | null;
  /** Minting: what the amount asked takes of it (fee included), and what
   *  the wallet holds, formatted; whether that is enough. */
  need?: string | null;
  have?: string | null;
  enough?: boolean | null;
  /** Redeeming: what the amount gives back of it, formatted. */
  out?: string | null;
  /** What is missing to mint, and its one action: lock it on its network
   *  (a link), or claim it from the faucet (a click). */
  warning?: { text: string; action?: RowAction } | null;
};

export type RowAction =
  | { kind: "lock"; label: string; href: string }
  | { kind: "faucet"; label: string; onClick: () => void; busy: boolean; busyLabel: string };

/** The bars' colours, by rank: from ink to sand, so the largest share is darkest. */
const SEGMENTS = ["#181818", "#2f2c25", "#5b5245", "#8a7a62", "#b29a74", "#cdb48a", "#e0cba4", "#efe0bf"];

const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 6 : 2 })}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function PartLogoBadged({ part, size = 36 }: { part: DetailPart; size?: number }) {
  const badge = `/assets/networks/${part.network}.png`;
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      {part.logo ? (
        <Image src={part.logo} alt="" width={size} height={size} unoptimized className="rounded-full object-cover" style={{ width: size, height: size }} />
      ) : (
        <span className="rounded-full bg-black/5 flex items-center justify-center text-xs font-bold opacity-60" style={{ width: size, height: size }}>
          {part.symbol.charAt(0)}
        </span>
      )}
      {part.logo !== badge && (
        <Image src={badge} alt={cap(part.network)} width={size * 0.4} height={size * 0.4} unoptimized className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-cream bg-cream" style={{ width: Math.round(size * 0.4), height: Math.round(size * 0.4) }} />
      )}
    </span>
  );
}

export function IndexDetail(props: {
  name: string;
  symbol: string;
  image: string | null;
  description: string;
  links: { website: string | null; twitter: string | null; telegram: string | null };
  creator: string;
  creatorHref: string | null;
  /** The token's addresses on its network, each with its explorer page. */
  details: { label: string; value: string; href: string | null }[];
  network: string;
  networkName: string;
  networkLogo: string;
  parts: DetailPart[];
  valuePerToken: number | null;
  marketCap: number | null;
  supply: string;
  /** The creator's fee on every mint and burn, in percent (the Create page
   *  sets one for both). */
  feePct: number;
  yourBalance: string | null;
  side: "mint" | "burn";
  setSide: (s: "mint" | "burn") => void;
  amount: string;
  setAmount: (v: string) => void;
  amountUsd: number | null;
  firstMintHint: string | null;
  includesFee: string | null;
  problem: string | null;
  busy: boolean;
  /** Any action of the page under way: nothing else starts meanwhile. */
  anyBusy: boolean;
  error: string | null;
  doneHref: string | null;
  connected: boolean;
  connectButton: ReactNode;
  onSubmit: () => void;
  /** Network fees: when the wallet's coin runs low. */
  feeWarning: { text: string; action?: { label: string; href: string } } | null;
  /** What the wallet can collect (owed parts, creator's fees, wrapped SOL). */
  extras: ReactNode;
  /** "What one token holds now", or before any mint "the mix it starts with". */
  compositionNote: string;
  backHref: string;
  /** The charts of its history. */
  history: ReactNode;
}) {
  const t = useTranslations("Beta");
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1_500);
    } catch {
      // The clipboard refused (an insecure page): nothing to do.
    }
  };
  /** A row's action (faucet, lock): one look for both. */
  const rowAction = "shrink-0 inline-flex items-center gap-1 rounded-md bg-ink text-snow px-2.5 py-1.5 text-xs font-medium hover:bg-pitch disabled:opacity-50 transition-colors";
  const square = "w-9 h-9 rounded-md bg-ink text-snow flex items-center justify-center shrink-0 hover:bg-pitch transition-colors";
  // The device's share sheet where there is one; else the link, copied.
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) await navigator.share({ title: `${props.name} ($${props.symbol})`, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2_000);
      }
    } catch {
      // Closed without sharing.
    }
  };
  const total = props.parts.every((p) => p.valueUsd !== null) ? props.parts.reduce((s, p) => s + (p.valueUsd ?? 0), 0) : null;
  const short = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

  const warning = (w: { text: string; action?: { label: string; href: string } }) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px]">
      <span className="flex items-center gap-2 min-w-0">
        <Icon icon="solar:danger-circle-bold" className="text-amber-500 text-base shrink-0" />
        <span className="underline-offset-2">{w.text}</span>
      </span>
      {w.action && (
        <a href={w.action.href} className="font-semibold underline shrink-0">
          {w.action.label}
        </a>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 pb-32 md:pb-20">
    <header className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <a href={props.backHref} aria-label={t("backToBaskets")} title={t("backToBaskets")} className={square}>
          <Icon icon="solar:alt-arrow-left-linear" className="text-lg" />
        </a>
        <span className="w-10 h-10 rounded-full overflow-hidden border border-ink/10 bg-black/5 flex items-center justify-center shrink-0">
          {props.image ? <img src={props.image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <span className="text-lg font-bold opacity-50">{props.symbol.charAt(0)}</span>}
        </span>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[11px] font-medium opacity-70">${props.symbol}</span>
          <h1 className="text-xl sm:text-2xl font-bold truncate">{props.name}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={share} aria-label={t("shareIndex")} title={shared ? t("linkCopied") : t("shareIndex")} className={square}>
          <Icon icon={shared ? "solar:check-read-linear" : "solar:share-bold"} className="text-lg" />
        </button>
        {props.links.website && (
          <a href={props.links.website} target="_blank" rel="noreferrer" aria-label={t("website")} title={t("website")} className={square}>
            <Icon icon="solar:global-linear" className="text-lg" />
          </a>
        )}
        {props.links.twitter && (
          <a href={props.links.twitter} target="_blank" rel="noreferrer" aria-label="X" title="X" className={square}>
            <Icon icon="ri:twitter-x-line" className="text-lg" />
          </a>
        )}
        {props.links.telegram && (
          <a href={props.links.telegram} target="_blank" rel="noreferrer" aria-label={t("telegram")} title={t("telegram")} className={square}>
            <Icon icon="ri:telegram-line" className="text-lg" />
          </a>
        )}
      </div>
    </header>
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">
      {/* What the token is. */}
      <div className="glass-card rounded-2xl p-5 sm:p-8 flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-4xl leading-none">{t("overview")}</h2>
          <p className="text-base leading-relaxed whitespace-pre-line">{props.description || t("noDescription")}</p>
        </section>

        {/* Its figures now. */}
        <dl className="grid grid-cols-3 divide-x divide-ink/10 rounded-2xl bg-cream border border-ink/10">
          {[
            [t("valuePerToken"), props.valuePerToken === null ? "—" : money(props.valuePerToken)],
            [t("marketCap"), props.marketCap === null ? "—" : money(props.marketCap)],
            [t("creatorFeeLabel"), `${props.feePct}%`],
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-3 flex flex-col gap-1 min-w-0">
              <dt className="text-xs opacity-60 truncate">{label}</dt>
              <dd className="text-base font-semibold tabular-nums truncate">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-4xl leading-none">{t("composition")}</h2>
            <p className="text-sm opacity-80">{props.compositionNote}</p>
          </div>
          {(() => {
            // Each part's share of the token's value, largest first; a part
            // without a price keeps its place at the end, with no bar.
            const ranked = props.parts
              .map((p, i) => ({ p, i, share: total && p.valueUsd !== null && total > 0 ? (p.valueUsd / total) * 100 : null }))
              .sort((a, b) => (b.share ?? -1) - (a.share ?? -1));
            const colour = (rank: number) => SEGMENTS[rank % SEGMENTS.length];
            // Each row's bar is measured against the largest share, which
            // fills its track, so the differences stand out.
            const largest = Math.max(0, ...ranked.map((r) => r.share ?? 0));
            return (
              <div className="flex flex-col gap-4">
                {/* The whole token, split left to right by share. */}
                {total !== null && (
                  <div className="flex h-4 w-full overflow-hidden rounded-full bg-black/5" role="img" aria-label={ranked.map((r) => `${r.p.symbol} ${r.share?.toFixed(1)}%`).join(", ")}>
                    {ranked.map((r, rank) =>
                      r.share ? <span key={r.p.key} title={`${r.p.symbol} ${r.share.toFixed(1)}%`} style={{ width: `${r.share}%`, background: colour(rank) }} className="h-full border-r border-paper last:border-r-0" /> : null
                    )}
                  </div>
                )}
                {/* One row each, its bar as long as its share. */}
                <div className="flex flex-col gap-2.5">
                  {ranked.map((r, rank) => (
                    <div key={r.p.key} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] sm:grid-cols-[minmax(0,13rem)_1fr_auto] items-center gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PartLogoBadged part={r.p} size={32} />
                        <div className="flex flex-col leading-tight min-w-0">
                          <span className="font-bold text-sm truncate">${r.p.symbol}</span>
                          <span className="text-[11px] opacity-60 truncate tabular-nums" title={r.p.name}>
                            {r.p.perToken} · {r.p.name}
                          </span>
                        </div>
                      </div>
                      <div className="h-3 rounded-full bg-black/5 overflow-hidden">
                        {r.share !== null && largest > 0 && <div className="h-full rounded-full" style={{ width: `${Math.max((r.share / largest) * 100, 2)}%`, background: colour(rank) }} />}
                      </div>
                      <div className="flex flex-col items-end leading-tight tabular-nums w-16">
                        <span className="font-bold text-sm">{r.share === null ? "—" : `${Math.round(r.share * 10) / 10}%`}</span>
                        {r.p.valueUsd !== null && <span className="text-[11px] opacity-60">{money(r.p.valueUsd)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </section>

        {/* Its history: supply, and mint and burn activity. */}
        {props.history}

        {/* Where it lives: its addresses, copied or opened on the explorer. */}
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-4xl leading-none">{t("details")}</h2>
          <dl className="rounded-2xl bg-cream border border-ink/10 divide-y divide-ink/10">
            {props.details.map((d) => (
              <div key={d.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-sm opacity-70">{d.label}</dt>
                <dd className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-sm truncate" title={d.value}>
                    {d.value.length > 16 ? `${d.value.slice(0, 6)}…${d.value.slice(-6)}` : d.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(d.value)}
                    aria-label={t("copyOf", { label: d.label })}
                    title={copied === d.value ? t("copied") : t("copyOf", { label: d.label })}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 shrink-0"
                  >
                    <Icon icon={copied === d.value ? "solar:check-read-linear" : "solar:copy-linear"} />
                  </button>
                  {d.href && (
                    <a href={d.href} target="_blank" rel="noreferrer" aria-label={t("openOnExplorer", { label: d.label })} title={t("openOnExplorer", { label: d.label })} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 shrink-0">
                      <Icon icon="solar:square-top-down-linear" />
                    </a>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* Minting or redeeming it, and its creator: in view while the
          information beside it scrolls. */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-20 min-w-0">
        <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-2xl">
                {props.side === "mint" ? t("mintTitle", { symbol: props.symbol }) : t("redeemTitle", { symbol: props.symbol })}
              </h2>
              <span className="flex items-center gap-1.5 text-xs opacity-70">
                <Image src={props.networkLogo} alt="" width={14} height={14} unoptimized className="rounded-full" style={{ width: 14, height: 14 }} />
                {t("onNetworkLabel", { network: props.networkName })}
              </span>
            </div>
            <span className="inline-flex rounded-full bg-black/5 p-0.5 text-xs font-semibold shrink-0" role="group">
              {(["mint", "burn"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={props.side === s} onClick={() => props.setSide(s)} className={`px-3 py-1 rounded-full transition-colors ${props.side === s ? "bg-ink text-snow" : "opacity-60 hover:opacity-100"}`}>
                  {s === "mint" ? t("mintTab") : t("burnTab")}
                </button>
              ))}
            </span>
          </div>

          {/* How much, as the Create page's value field. */}
          <label htmlFor="index-amount" className="flex flex-col gap-1 rounded-xl bg-black/5 px-3 py-2.5">
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs opacity-70">{props.side === "mint" ? t("youMint") : t("youBurn")}</span>
              <span className="flex items-baseline gap-1.5 font-bold text-lg tabular-nums">
                <input
                  id="index-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={props.amount}
                  onChange={(e) => props.setAmount(e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""))}
                  style={{ width: `${Math.max(1, props.amount.length)}ch` }}
                  className="max-w-[14ch] bg-transparent outline-none text-right placeholder:opacity-30"
                />
                <span>${props.symbol}</span>
              </span>
            </span>
            {/* What it is worth: $0.00 before an amount, a dash only when
                a part has no price. */}
            <span className="text-right text-[11px] opacity-60 tabular-nums">
              ≈ {props.amountUsd !== null ? money(props.amountUsd) : props.amount.trim() && Number(props.amount) > 0 ? "—" : money(0)}
            </span>
          </label>
          {props.firstMintHint && <span className="text-[11px] opacity-70 -mt-2">{props.firstMintHint}</span>}

          <div className="flex flex-col gap-1">
            <span className="font-display text-xl">{props.side === "mint" ? t("youDeposit") : t("youReceive")}</span>
            <span className="text-xs opacity-70">{props.side === "mint" ? t("mintNeedsText") : t("redeemGivesText")}</span>
          </div>
          {props.parts.map((p) => (
            <div key={p.key} className="rounded-2xl bg-cream border border-ink/10 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <PartLogoBadged part={p} size={32} />
                <div className="flex flex-col leading-tight min-w-0 flex-1">
                  <span className="text-xs opacity-70 truncate">{p.name}</span>
                  <span className="font-bold text-lg truncate tabular-nums">
                    {(props.side === "mint" ? p.need : p.out) ?? p.perToken} ${p.symbol}
                  </span>
                  {props.side === "mint" && p.have != null && (
                    <span className="flex items-center gap-1 text-[11px] tabular-nums opacity-80">
                      <Icon icon="solar:wallet-bold" className="opacity-60" />
                      {p.have} ${p.symbol}
                      {p.enough === true && <Icon icon="solar:check-circle-bold" className="text-green-600 text-sm" role="img" aria-label={t("enoughLabel")} />}
                    </span>
                  )}
                </div>
                {/* What gets the part: its faucet (a test token held none
                    of), or its lock on the network it lives on; one button. */}
                {props.side === "mint" && p.warning?.action?.kind === "faucet" ? (
                  <button type="button" onClick={p.warning.action.onClick} disabled={p.warning.action.busy} className={rowAction}>
                    <Icon icon="solar:water-drop-bold" />
                    {p.warning.action.busy ? p.warning.action.busyLabel : p.warning.action.label}
                  </button>
                ) : props.side === "mint" && p.warning?.action?.kind === "lock" ? (
                  <a href={p.warning.action.href} className={rowAction}>
                    <Icon icon="solar:lock-keyhole-bold" />
                    {p.warning.action.label}
                  </a>
                ) : null}
              </div>
              {props.side === "mint" && p.warning && (
                <span className="flex items-center gap-1.5 text-[11px] text-amber-800">
                  <Icon icon="solar:danger-circle-bold" className="text-amber-500 shrink-0" />
                  {p.warning.text}
                </span>
              )}
            </div>
          ))}
          {props.side === "mint" && props.feeWarning && warning(props.feeWarning)}
          {props.side === "mint" && props.includesFee && <span className="text-[11px] opacity-60">{props.includesFee}</span>}

          {props.error && <p className="text-xs text-red-600 break-words">{props.error}</p>}
          {props.doneHref && (
            <a href={props.doneHref} target="_blank" rel="noreferrer" className="text-xs underline opacity-80">
              {t("doneTx")}
            </a>
          )}
          {!props.connected ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs opacity-70">{t("connectFirst")}</span>
              {props.connectButton}
            </div>
          ) : (
            <button type="button" disabled={props.anyBusy || !!props.problem} onClick={props.onSubmit} className="w-full rounded-lg bg-ink text-snow py-3.5 text-sm font-medium hover:bg-pitch disabled:opacity-40 transition-colors">
              {props.busy ? t("confirming") : (props.problem ?? (props.side === "mint" ? t("mintButtonOf", { symbol: props.symbol }) : t("redeemButtonOf", { symbol: props.symbol })))}
            </button>
          )}
        </div>

        {props.extras}

        <div className="glass-card rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
          <span className="font-display text-2xl">{t("creator")}</span>
          {props.creatorHref ? (
            <a href={props.creatorHref} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm underline">
              <Icon icon="solar:user-circle-bold" className="text-lg opacity-70" />
              {short(props.creator)}
            </a>
          ) : (
            <span className="text-sm">{short(props.creator)}</span>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

/** The page while it is read: its shape, not a line of text. */
export function IndexDetailSkeleton() {
  const bar = "bg-black/10 rounded animate-pulse";
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 pb-32 md:pb-20" aria-busy="true">
      <div className="flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-black/10 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-black/10 animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <div className={`h-2.5 w-14 ${bar}`} />
            <div className={`h-5 w-48 ${bar}`} />
          </div>
        </div>
        {/* Share, website and X. */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-9 h-9 rounded-md bg-black/10 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">
        <div className="glass-card rounded-2xl p-5 sm:p-8 flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <div className={`h-8 w-40 ${bar}`} />
            <div className={`h-3 w-full ${bar}`} />
            <div className={`h-3 w-11/12 ${bar}`} />
            <div className={`h-3 w-2/3 ${bar}`} />
          </div>
          <div className="h-16 rounded-2xl bg-black/5 animate-pulse" />
          <div className="flex flex-col gap-4">
            <div className={`h-8 w-48 ${bar}`} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-cream border border-ink/10 px-5 py-4 flex items-center gap-4">
                <div className="w-13 h-13 rounded-full bg-black/10 animate-pulse shrink-0" style={{ width: 52, height: 52 }} />
                <div className="flex flex-col gap-2 flex-1">
                  <div className={`h-3 w-24 ${bar}`} />
                  <div className={`h-6 w-40 ${bar}`} />
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className={`h-6 w-16 ${bar}`} />
                  <div className={`h-3 w-12 ${bar}`} />
                </div>
              </div>
            ))}
          </div>
          <div className="h-64 rounded-3xl bg-black/5 animate-pulse" />
        </div>
        <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
          <div className={`h-8 w-40 ${bar}`} />
          <div className="h-20 rounded-xl bg-black/5 animate-pulse" />
          <div className="h-14 rounded-xl bg-black/5 animate-pulse" />
          <div className="h-48 rounded-xl bg-black/5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
