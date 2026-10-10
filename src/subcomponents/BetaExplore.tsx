"use client";

// Every index on the network, as cards: on Solana from the program's
// accounts, on the EVM networks from the app's index of the contract's
// events (where it has one), else the indexes this browser knows. A card
// shows the token's image and name (its metadata, E4), its creator, the
// networks its assets live on, the assets behind it, what one token holds
// is worth today, its market cap, its past year and its yield
// (performance.ts).

import { useEffect, useState } from "react";
import Image from "next/image";
import { Poster } from "./ipow/Poster";
import poster from "@/assets/background-explore.jpg";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { ZeroAddress } from "ethers";
import { getBasket } from "@ipow/sdk";
import { loadPerformance, returnText, yieldText } from "@/components/integrator/ipow/performance";

import { Notice, errorText, shortHash } from "./ipow/common";
import { useUsdValue } from "./ipow/useUsdValue";
import { deploymentOf, isBasketChain, readProvider, solanaBeta, type BasketChain } from "@/components/integrator/ipow/sdk";
import { tokenInfo } from "@/components/integrator/ipow/tokens";
import { solanaToken } from "@/components/integrator/ipow/solanaTokens";
import { knownBaskets } from "@/components/integrator/ipow/basketList";
import { crossChoicesOn, type CrossChoice } from "@/components/integrator/ipow/crossAssets";
import { localAsset, readMetadata, within } from "@/components/integrator/ipow/indexMetadata";

/** Cards on a page. */
const PAGE = 9;
/** One whole index token, in its smallest units (9 decimals on every network). */
const ONE = 1e9;

export type Part = { symbol: string; logo: string | null; network: string; amount: number; known: boolean };
export type Card = {
  key: string;
  name: string;
  symbol: string;
  image: string | null;
  creator: string;
  supply: number;
  parts: Part[];
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const usd = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(2)}K` : `$${n.toFixed(2)}`;

/** The image named by a token's metadata, if any. */
const imageOf = async (uri: string) => (await readMetadata(uri)).image;

/** An EVM index as a card (also read by the Portfolio's summary). */
export async function evmCard(chain: BasketChain, key: string, cross: CrossChoice[]): Promise<Card> {
  const b = await getBasket(readProvider(chain), deploymentOf(chain)!, key);
  const parts = await Promise.all(
    b.parts.map(async (p): Promise<Part> => {
      // Another network's asset, by its source (made here or not yet, E5).
      const c = p.receipts && p.receipts !== ZeroAddress ? cross.find((x) => x.asset === p.asset && x.receipts?.toLowerCase() === p.receipts.toLowerCase()) : undefined;
      const info = p.made ? await tokenInfo(chain, p.token) : null;
      const amount = Number(p.amount) / 10 ** (info?.decimals ?? c?.decimals ?? 18);
      const ours = c && deploymentOf(chain)!.vaults.some((v) => v.receipts.toLowerCase() === p.receipts.toLowerCase());
      if (c && ours) return { symbol: c.symbol, logo: c.logo, network: c.from, amount, known: true };
      const local = localAsset(chain, p.token, info?.symbol ?? "?");
      // A part claimed as another contract's receipt is not priced.
      return { symbol: local.symbol, logo: local.logo, network: chain, amount, known: local.known && !(p.receipts && p.receipts !== ZeroAddress) };
    })
  );
  return { key, name: b.name, symbol: b.symbol, image: await imageOf(b.uri), creator: b.creator, supply: Number(b.supply) / ONE, parts };
}

/** A Solana index as a card (also read by the Portfolio's summary). */
export async function solanaCard(address: string, cross: CrossChoice[]): Promise<Card> {
  const b = await solanaBeta(null).getBasket(address);
  const parts = await Promise.all(
    b.parts.map(async (p): Promise<Part> => {
      const c = cross.find((x) => x.token === p.mint);
      const amount = Number(p.amount) / 10 ** (p.made ? p.decimals : (c?.decimals ?? 9));
      if (c) return { symbol: c.symbol, logo: c.logo, network: c.from, amount, known: true };
      const info = await solanaToken(p.mint).catch(() => ({ symbol: "?" }));
      const local = localAsset("solana", p.mint, info.symbol);
      return { symbol: local.symbol, logo: local.logo, network: "solana", amount, known: local.known };
    })
  );
  return { key: address, name: b.name, symbol: b.symbol, image: await imageOf(b.uri), creator: b.creator, supply: Number(b.supply) / ONE, parts };
}

/** Logos overlapping in a row, a "+n" for the rest. */
function Stack({ items, size = 20, max = 5 }: { items: { key: string; logo: string | null; label: string }[]; size?: number; max?: number }) {
  const shown = items.slice(0, max);
  return (
    <span className="flex items-center">
      {shown.map((it, i) => (
        <span key={it.key} title={it.label} className="rounded-full border-2 border-paper bg-paper overflow-hidden flex items-center justify-center shrink-0" style={{ width: size, height: size, marginLeft: i ? -size / 3 : 0 }}>
          {it.logo ? (
            <Image src={it.logo} alt={it.label} width={size} height={size} unoptimized className="w-full h-full object-cover" />
          ) : (
            <span className="text-[9px] font-bold opacity-60">{it.label.charAt(0)}</span>
          )}
        </span>
      ))}
      {items.length > max && <span className="text-[10px] font-semibold opacity-60 ml-1">+{items.length - max}</span>}
    </span>
  );
}

export default function BetaExplore() {
  const t = useTranslations("Beta");
  const { locale, network } = useParams<{ locale: string; network: string }>();
  const prices = useUsdValue();
  const [keys, setKeys] = useState<string[] | null>(null);
  const [cross, setCross] = useState<CrossChoice[]>([]);
  const [page, setPage] = useState(0);
  const [cards, setCards] = useState<Card[] | null>(null);
  // Indexes made with assets Greatwall can no longer name (e.g. receipts of
  // a retired vault): still on chain, and reachable by their own page, but
  // not listed, since nothing about them can be shown or priced.
  const [retired, setRetired] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Every index's address on the network.
  useEffect(() => {
    let live = true;
    setKeys(null);
    setNote(null);
    setError(null);
    setPage(0);
    (async () => {
      let found: string[];
      if (network === "solana") {
        found = await solanaBeta(null).allBaskets();
      } else if (isBasketChain(network)) {
        // The app's index reads history in steps: ask again until it has all.
        let index: any = null;
        for (let i = 0; i < 20; i++) {
          const r = await fetch(`/api/baskets/${network}`);
          index = await r.json();
          if (!r.ok) throw new Error(index?.error ?? `index: ${r.status}`);
          if (!index.supported || index.complete) break;
          if (live) setNote(t("exploreReading"));
        }
        if (index?.supported) {
          found = index.baskets.map((b: { key: string }) => b.key);
          if (live) setNote(index.complete ? null : t("exploreReading"));
        } else {
          found = knownBaskets(deploymentOf(network)!.betaBaskets);
          if (live) setNote(t("exploreKnownOnly"));
        }
      } else {
        found = [];
        if (live) setNote(t("exploreNotHere"));
      }
      const c = found.length ? await within(crossChoicesOn(network as any), 20_000, [] as CrossChoice[]) : [];
      if (live) {
        setCross(c);
        setKeys(found);
      }
    })().catch((e) => live && setError(errorText(e)));
    return () => {
      live = false;
    };
  }, [network, t]);

  // The cards of the page shown.
  useEffect(() => {
    if (!keys) return;
    let live = true;
    setCards(null);
    setRetired(0);
    const shown = keys.slice(page * PAGE, page * PAGE + PAGE);
    Promise.all(shown.map((k) => (network === "solana" ? solanaCard(k, cross) : evmCard(network as BasketChain, k, cross)).catch(() => null))).then((found) => {
      if (!live) return;
      const read = found.filter((c): c is Card => c !== null);
      const listed = read.filter((c) => c.parts.every((p) => p.known));
      setCards(listed);
      setRetired(read.length - listed.length);
    });
    return () => {
      live = false;
    };
  }, [keys, page, cross, network]);

  // Each card's past year and yield (performance.ts), from its mix.
  const [yearOf, setYearOf] = useState<Record<string, { y1: number | null; apy: number | null }>>({});
  useEffect(() => {
    let live = true;
    for (const c of cards ?? []) {
      if (c.parts.some((p) => !p.known)) continue;
      loadPerformance(c.parts.map((p) => ({ symbol: p.symbol, amount: p.amount })))
        .then((perf) => live && setYearOf((y) => ({ ...y, [c.key]: { y1: perf?.growth.y1 ?? null, apy: perf?.apy ?? null } })))
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, [cards]);

  const pages = keys ? Math.max(1, Math.ceil(keys.length / PAGE)) : 1;
  /** What one token's assets are worth now, when every part has a price. */
  const valueOf = (c: Card): number | null => {
    let total = 0;
    for (const p of c.parts) {
      // Only an asset Greatwall knows: any token can call itself ETH.
      const price = p.known ? prices.priceOf(p.symbol) : null;
      if (price === null) return null;
      total += p.amount * price;
    }
    return total;
  };

  return (
    <div className="flex flex-col gap-6">
      <Poster image={poster} title={t("exploreTitle")} text={t("exploreText")} />

      {error && <Notice text={error} error />}
      {note && <p className="text-xs sm:text-sm text-stone">{note}</p>}
      {retired > 0 && <p className="text-xs sm:text-sm text-stone">{t("exploreRetired", { count: retired })}</p>}

      {!error && (!keys || !cards) ? (
        // Skeleton cards while reading, not an empty page.
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-paper border border-ink/10 p-5 h-[220px] animate-pulse flex flex-col gap-3">
              <div className="flex justify-between">
                <div className="flex flex-col gap-2">
                  <div className="h-2 w-12 bg-black/10 rounded" />
                  <div className="h-5 w-40 bg-black/10 rounded" />
                </div>
                <div className="w-16 h-16 rounded-full bg-black/10" />
              </div>
              <div className="h-3 w-24 bg-black/10 rounded mt-4" />
              <div className="h-px bg-black/10 mt-auto" />
              <div className="h-4 w-full bg-black/10 rounded" />
            </div>
          ))}
        </div>
      ) : !error && cards && cards.length === 0 ? (
        <EmptyExplore href={`/${locale}/${network}/index/create`} />
      ) : (
        cards && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c) => {
              const value = valueOf(c);
              const y1 = yearOf[c.key]?.y1 ?? null;
              const apy = yearOf[c.key]?.apy ?? null;
              const networks = [...new Set(c.parts.map((p) => p.network))];
              const named = c.name && c.name !== "BETA";
              return (
                <Link
                  key={c.key}
                  href={`/${locale}/${network}/index/${c.key}`}
                  className="rounded-2xl bg-paper border border-ink/10 p-5 flex flex-col gap-4 hover:border-ink/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-medium opacity-70 truncate">${named ? c.symbol : "BETA"}</span>
                      <span className="text-xl font-bold leading-tight truncate">{named ? c.name : t("basketName", { id: shortHash(c.key) })}</span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {y1 !== null && (
                          <span
                            className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${y1 >= 0 ? "bg-green-600/10 text-green-700" : "bg-red-600/10 text-red-700"}`}
                            title="Growth over the past year: the change in one token's value. Past performance is not a promise."
                          >
                            1Y {returnText(y1)}
                          </span>
                        )}
                        {apy !== null && apy > 0 && (
                          <span className="w-fit rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold tabular-nums" title={t("apyHint")}>
                            {t("apyChip", { apy: yieldText(apy) })}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="w-16 h-16 rounded-full overflow-hidden border border-ink/10 bg-black/5 flex items-center justify-center shrink-0">
                      {c.image ? (
                        <img src={c.image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold opacity-50">{(named ? c.symbol : "B").charAt(0)}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold">{t("networkSupport")}</span>
                      <Stack items={networks.map((n) => ({ key: n, logo: `/assets/networks/${n}.png`, label: cap(n) }))} size={18} max={7} />
                    </div>
                    <div className="flex flex-col items-end gap-1 min-w-0">
                      <span className="text-[11px] font-semibold">{t("creator")}</span>
                      <span className="flex items-center gap-1 text-[11px] opacity-80">
                        <Icon icon="solar:user-bold" className="text-xs" />
                        {shortHash(c.creator)}
                      </span>
                    </div>
                  </div>
                  <div className="h-px bg-ink/10" />
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{t("valuePerToken")}</span>
                      <span className="text-sm font-semibold tabular-nums">{value === null ? "—" : usd(value)}</span>
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-sm">{t("marketCap")}</span>
                      <span className="text-sm font-semibold tabular-nums">{value === null ? "—" : usd(value * c.supply)}</span>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-sm">{t("backedBy")}</span>
                      <Stack items={c.parts.map((p, i) => ({ key: `${p.network}-${p.symbol}-${i}`, logo: p.logo, label: `${p.symbol} · ${cap(p.network)}` }))} size={18} max={5} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}

      {keys && keys.length > PAGE && (
        <div className="flex items-center justify-center gap-4">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="flex items-center gap-1 rounded-md bg-paper border border-ink/10 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40">
            <Icon icon="solar:alt-arrow-left-linear" />
            {t("previousPage")}
          </button>
          <span className="text-sm tabular-nums">{t("pageOf", { page: page + 1, pages })}</span>
          <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="flex items-center gap-1 rounded-md bg-paper border border-ink/10 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40">
            {t("nextPage")}
            <Icon icon="solar:alt-arrow-right-linear" />
          </button>
        </div>
      )}
    </div>
  );
}

/** No index on this network yet: what one looks like, and the way to make the first. */
function EmptyExplore({ href }: { href: string }) {
  const t = useTranslations("Beta");
  const nets = ["ethereum", "solana", "base", "arbitrum", "hyperliquid", "robinhood", "tempo"];
  return (
    <div className="rounded-2xl bg-paper border border-ink/10 p-6 sm:p-10 flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
      <div className="flex flex-col gap-4 md:flex-1 min-w-0">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-60">{t("exploreEmptyEyebrow")}</span>
        <h2 className="font-display text-3xl sm:text-4xl leading-[1.05]" style={{ textWrap: "balance" }}>
          {t("exploreEmptyTitle")}
        </h2>
        <p className="text-sm sm:text-base opacity-75 max-w-md">{t("exploreEmptyText")}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-xl bg-ink text-snow px-5 py-3 text-sm font-semibold hover:bg-pitch transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Icon icon="solar:add-circle-bold" className="text-lg" />
            {t("createOne")}
          </Link>
        </div>
      </div>

      {/* A sample card, faded: the shape an index takes once it exists. */}
      <div aria-hidden className="relative md:w-[320px] shrink-0 h-[190px] select-none">
        <div className="absolute inset-x-6 top-0 h-full rounded-2xl border border-dashed border-ink/15 bg-black/[0.02] rotate-[-4deg]" />
        <div className="absolute inset-x-0 top-3 rounded-2xl bg-snow border border-ink/10 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium opacity-50">$INDEX</span>
              <span className="text-lg font-bold leading-tight opacity-80">{t("exploreEmptySample")}</span>
            </div>
            <span className="w-12 h-12 rounded-full border border-dashed border-ink/25 flex items-center justify-center">
              <Icon icon="solar:add-circle-linear" className="text-xl opacity-40" />
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold opacity-70">{t("networkSupport")}</span>
            <Stack items={nets.map((n) => ({ key: n, logo: `/assets/networks/${n}.png`, label: cap(n) }))} size={18} max={7} />
          </div>
          <div className="h-px bg-ink/10" />
          <div className="flex justify-between text-[11px] opacity-50">
            <span>{t("perBeta")}</span>
            <span className="h-3 w-16 rounded bg-black/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
