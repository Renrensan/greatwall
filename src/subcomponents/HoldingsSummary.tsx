"use client";

// Beside the Portfolio's tabs: what the connected wallets hold on every
// network Greatwall runs, in dollars: the network's coin and its listed
// tokens (one EVM address serves every EVM network, Tempo included). Every
// network has a row: held, nothing held, not read, or its wallet not
// connected. A row opens that network's Portfolio. On the Index Asset tab, the index tokens held on any
// network instead, each worth what its parts are worth now (priced as
// Explore prices them).
// Tokens with no price count as held, not as value.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Contract, JsonRpcProvider, formatUnits } from "ethers";
import { PublicKey } from "@solana/web3.js";

import { EVM_CHAINS, TICKER, deploymentOf, readProvider, solanaBeta, solanaConnection, type EvmChain } from "@/components/integrator/ipow/sdk";
import { knownBaskets } from "@/components/integrator/ipow/basketList";
import { crossChoicesOn, type CrossChoice } from "@/components/integrator/ipow/crossAssets";
import { within } from "@/components/integrator/ipow/indexMetadata";
import { getBasket } from "@ipow/sdk";
import { evmCard, solanaCard, type Card } from "./BetaExplore";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import { balanceOf } from "@/components/integrator/ipow/tokens";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import { solanaBalances } from "./LockedHoldings";
import { EmptyPanel, IconPicture, ListSkeleton, emptyAction } from "./ipow/EmptyPanel";
import { useUsdValue } from "./ipow/useUsdValue";

type Net = EvmChain | "solana";
type TokenNet = Net | "tempo";
type Holding = { symbol: string; amount: string };
type Row = { net: TokenNet; held: Holding[]; state: "read" | "failed" | "connect" };

/** Every network Greatwall runs, in the order the navbar lists them. */
const TOKEN_NETS: TokenNet[] = [...EVM_CHAINS, ...(deploymentOf("tempo") ? (["tempo"] as const) : []), "solana"];

let tempoReader: JsonRpcProvider | null = null;
/** Tempo, read through the app's proxy (its own network, not one of EVM_CHAINS). */
function tempo(): JsonRpcProvider {
  if (!tempoReader) tempoReader = new JsonRpcProvider(window.location.origin + "/api/rpc/tempo/testnet", deploymentOf("tempo")!.chainId, { staticNetwork: true });
  return tempoReader;
}
/** Tempo's fee token, PathUSD: its balance is the network's "coin" (6 decimals). */
const PATHUSD = "0x20C0000000000000000000000000000000000000";
const ERC20 = ["function balanceOf(address) view returns (uint256)"];
type Index = { net: Net; card: Card; balance: number };

/** One whole index token, in its smallest units (9 decimals on every network). */
const ONE = 1e9;

/** Every index's key (EVM) or address (Solana) on a network. */
async function indexKeysOn(net: Net): Promise<string[]> {
  if (net === "solana") return solanaBeta(null).allBaskets();
  const r = await fetch(`/api/baskets/${net}`);
  const index = await r.json().catch(() => null);
  if (r.ok && index?.supported) return index.baskets.map((b: { key: string }) => b.key);
  return knownBaskets(deploymentOf(net)!.betaBaskets);
}

/** The index tokens a wallet holds on one network, with what backs each. */
async function indexesOn(net: Net, owner: string, solanaHeld?: Map<string, bigint>): Promise<Index[]> {
  const keys = await indexKeysOn(net);
  if (!keys.length) return [];
  const balances = await Promise.all(
    keys.map(async (key) => {
      if (net === "solana") {
        const b = await solanaBeta(null).getBasket(key);
        return Number(solanaHeld?.get(b.beta) ?? BigInt(0)) / ONE;
      }
      const b = await getBasket(readProvider(net), deploymentOf(net)!, key);
      return Number(await balanceOf(net, b.beta, owner)) / ONE;
    })
  );
  const held = keys.flatMap((key, i) => (balances[i] > 0 ? [{ key, balance: balances[i] }] : []));
  if (!held.length) return [];
  const cross = await within(crossChoicesOn(net), 20_000, [] as CrossChoice[]);
  return Promise.all(held.map(async (h) => ({ net, balance: h.balance, card: net === "solana" ? await solanaCard(h.key, cross) : await evmCard(net, h.key, cross) })));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** What a wallet holds on one network: the coin and every listed token above zero. */
async function holdingsOn(net: TokenNet, owner: string): Promise<Row> {
  const held: Holding[] = [];
  if (net === "tempo") {
    const read = (token: string) => new Contract(token, ERC20, tempo()).balanceOf(owner).catch(() => BigInt(0)) as Promise<bigint>;
    const rwa = rwaTokensOf("tempo");
    const [coin, ...amounts] = await Promise.all([read(PATHUSD), ...rwa.map((r) => read(r.token))]);
    if (coin > BigInt(0)) held.push({ symbol: "pathUSD", amount: formatUnits(coin, 6) });
    rwa.forEach((r, i) => amounts[i] > BigInt(0) && held.push({ symbol: r.symbol, amount: formatUnits(amounts[i], r.decimals) }));
    return { net, held, state: "read" };
  }
  if (net === "solana") {
    const [lamports, tokens] = await Promise.all([solanaConnection().getBalance(new PublicKey(owner)), solanaBalances(owner)]);
    if (lamports > 0) held.push({ symbol: "SOL", amount: formatUnits(BigInt(lamports), 9) });
    for (const r of rwaTokensOf("solana")) {
      const v = tokens.get(r.token) ?? BigInt(0);
      if (v > BigInt(0)) held.push({ symbol: r.symbol, amount: formatUnits(v, r.decimals) });
    }
    return { net, held, state: "read" };
  }
  const rwa = rwaTokensOf(net);
  const [coin, ...amounts] = await Promise.all([readProvider(net).getBalance(owner), ...rwa.map((r) => balanceOf(net, r.token, owner).catch(() => BigInt(0)))]);
  if (coin > BigInt(0)) held.push({ symbol: TICKER[net], amount: formatUnits(coin, 18) });
  rwa.forEach((r, i) => amounts[i] > BigInt(0) && held.push({ symbol: r.symbol, amount: formatUnits(amounts[i], r.decimals) }));
  return { net, held, state: "read" };
}

/** `view` follows the Portfolio's tab: the tokens by network, or the index tokens. */
export default function HoldingsSummary({ view = "tokens" }: { view?: "tokens" | "indexes" }) {
  const t = useTranslations("All");
  const { locale, network } = useParams<{ locale: string; network: string }>();
  const { valueOf, priceOf } = useUsdValue();
  const evm = [useEvmWallet("ethereum"), useEvmWallet("base"), useEvmWallet("robinhood"), useEvmWallet("hyperliquid"), useEvmWallet("arbitrum")];
  // Tempo's wallet is an EVM address too: connected on Tempo alone, it serves every EVM network.
  const tempoWallet = useTempoWallet();
  const evmAddress = evm.find((w) => w.connected && w.address)?.address ?? (tempoWallet.connected ? ((tempoWallet.address as string | null) ?? null) : null);
  const solanaWallet = useSolanaWallet();
  const solanaAddress = solanaWallet.connected ? ((solanaWallet.address as string | null) ?? null) : null;

  const [rows, setRows] = useState<Row[] | null>(null);
  const [indexes, setIndexes] = useState<Index[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [again, setAgain] = useState(0);

  useEffect(() => {
    if (!evmAddress && !solanaAddress) return;
    let live = true;
    setRows(null);
    setIndexes(null);
    setFailed(false);
    // A row for every network: read where its wallet is connected.
    const reads = TOKEN_NETS.map((net): Promise<Row> => {
      const owner = net === "solana" ? solanaAddress : evmAddress;
      if (!owner) return Promise.resolve({ net, held: [], state: "connect" });
      return holdingsOn(net, owner).catch(() => ({ net, held: [], state: "failed" as const }));
    });
    Promise.all(reads).then((rs) => {
      if (!live) return;
      setRows(rs);
      setFailed(rs.some((r) => r.state === "failed"));
    });
    // The index tokens, read apart: they take longer, and the coins show first.
    (async () => {
      const solanaHeld = solanaAddress ? await solanaBalances(solanaAddress).catch(() => new Map<string, bigint>()) : undefined;
      const idx: Promise<Index[]>[] = [];
      if (evmAddress) for (const c of EVM_CHAINS) idx.push(indexesOn(c, evmAddress));
      if (solanaAddress) idx.push(indexesOn("solana", solanaAddress, solanaHeld));
      const rs = await Promise.allSettled(idx);
      if (!live) return;
      setIndexes(rs.flatMap((r) => (r.status === "fulfilled" ? r.value : [])));
      if (rs.some((r) => r.status === "rejected")) setFailed(true);
    })();
    return () => {
      live = false;
    };
  }, [evmAddress, solanaAddress, again]);

  const worth = (r: Row) => r.held.reduce((s, h) => s + (valueOf(h.symbol, h.amount) ?? 0), 0);
  // Held first, by value; then nothing held; then not read; then not connected.
  const rank = (r: Row) => (r.held.length ? 0 : r.state === "read" ? 1 : r.state === "failed" ? 2 : 3);
  const shown = (rows ?? []).slice().sort((a, b) => rank(a) - rank(b) || worth(b) - worth(a));
  /** One index token's worth: its parts at their prices, when every part has one. */
  const perToken = (c: Card): number | null => {
    let v = 0;
    for (const p of c.parts) {
      const price = p.known ? priceOf(p.symbol) : null;
      if (price === null) return null;
      v += p.amount * price;
    }
    return v;
  };
  const indexWorth = (i: Index) => (perToken(i.card) ?? 0) * i.balance;
  const heldIndexes = (indexes ?? []).slice().sort((a, b) => indexWorth(b) - indexWorth(a));
  const tokensTotal = shown.reduce((s, r) => s + worth(r), 0);
  const indexesTotal = heldIndexes.reduce((s, i) => s + indexWorth(i), 0);
  const indexView = view === "indexes";
  const row = "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-black/[0.04]";
  const total = indexView ? indexesTotal : tokensTotal;
  // One decimal; a share too small to show as 0.1% says so, and nothing is 0%.
  const share = (v: number) => {
    if (!(total > 0) || v <= 0) return "0%";
    const pct = (v / total) * 100;
    return pct < 0.1 ? "<0.1%" : `${pct.toFixed(1)}%`;
  };
  const count = indexView ? heldIndexes.length : shown.length;
  const list = "flex flex-col gap-0.5 max-h-[480px] overflow-y-auto overscroll-contain -mx-2 px-2";
  const loading = indexView ? indexes === null : rows === null;
  const empty = indexView ? heldIndexes.length === 0 : false;

  return (
    <section className="rounded-2xl bg-paper border border-ink/10 p-5 flex flex-col gap-4" aria-labelledby="holdings-title">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 id="holdings-title" className="text-lg font-bold">
            {indexView ? t("holdingsIndexesTitle") : t("holdingsTitle")}
          </h2>
          {rows !== null && !empty && (
            <span className="text-[11px] font-semibold rounded-full bg-well px-2.5 py-1 tabular-nums">{indexView ? t("holdingsIndexCount", { count }) : t("holdingsNetworkCount", { count })}</span>
          )}
        </div>
        <p className="text-xs opacity-70">{indexView ? t("holdingsIndexesText") : t("holdingsText")}</p>
      </header>

      {!evmAddress && !solanaAddress ? (
        <EmptyPanel picture={<IconPicture icon="solar:wallet-linear" />} title={t("holdingsConnectTitle")} text={t("holdingsConnect")} />
      ) : loading ? (
        <ListSkeleton rows={4} />
      ) : empty ? (
        failed ? (
          <EmptyPanel picture={<IconPicture icon="solar:cloud-cross-linear" />} title={t("holdingsFailedTitle")} text={t("holdingsFailed")}>
            <button type="button" onClick={() => setAgain((n) => n + 1)} className={emptyAction}>
              {t("holdingsRetry")}
            </button>
          </EmptyPanel>
        ) : indexView ? (
          <EmptyPanel picture={<IconPicture icon="solar:layers-minimalistic-linear" />} title={t("holdingsNoIndexesTitle")} text={t("holdingsNoIndexes")}>
            <Link href={`/${locale}/${network}/index`} className={emptyAction}>
              {t("holdingsExplore")}
            </Link>
          </EmptyPanel>
        ) : (
          <EmptyPanel picture={<IconPicture icon="solar:wallet-money-linear" />} title={t("holdingsNoneTitle")} text={t("holdingsNone")} />
        )
      ) : (
        <>
          <div className="rounded-xl bg-well p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] opacity-60">{t("holdingsTotal")}</span>
              <span className="text-3xl font-bold tabular-nums leading-tight">{usd(total)}</span>
            </div>
            {/* Each row's share of the total, in the order of the list below. */}
            {total > 0 && (
              <div className="flex h-1.5 rounded-full overflow-hidden bg-ink/10 gap-px" aria-hidden>
                {(indexView ? heldIndexes.map(indexWorth) : shown.map(worth))
                  .filter((v) => v > 0)
                  .map((v, i) => (
                    <span key={i} className="h-full bg-ink" style={{ width: `${(v / total) * 100}%`, opacity: Math.max(0.25, 1 - i * 0.18) }} />
                  ))}
              </div>
            )}
          </div>
          {!indexView ? (
            <ul className={list}>
              {shown.map((r) => (
                <li key={r.net}>
                  <Link href={`/${locale}/${r.net}/vault/assets`} aria-current={r.net === network ? "page" : undefined} className={`${row} ${r.net === network ? "bg-black/[0.04] ring-1 ring-inset ring-ink/10" : ""} ${r.held.length ? "" : "[&_img]:opacity-60"}`}>
                    <img src={`/assets/networks/${r.net}.png`} alt="" className="w-9 h-9 rounded-full border border-ink/10 shrink-0" />
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="text-sm font-semibold">{cap(r.net)}</span>
                      <span className="text-[11px] opacity-60 truncate">
                        {r.held.length ? (
                          <>
                            {t("holdingsCount", { count: r.held.length })} · {r.held.slice(0, 3).map((h) => h.symbol).join(", ")}
                            {r.held.length > 3 ? "…" : ""}
                          </>
                        ) : r.state === "connect" ? (
                          t("holdingsRowConnect", { network: cap(r.net) })
                        ) : r.state === "failed" ? (
                          t("holdingsRowFailed")
                        ) : (
                          t("holdingsRowNone")
                        )}
                      </span>
                    </span>
                    {r.state === "read" ? (
                      <span className={`flex flex-col items-end shrink-0 ${r.held.length ? "" : "opacity-50"}`}>
                        <span className="text-sm font-semibold tabular-nums">{usd(worth(r))}</span>
                        <span className="text-[11px] opacity-60 tabular-nums">{share(worth(r))}</span>
                      </span>
                    ) : (
                      <span className="text-sm opacity-40 shrink-0">—</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={list}>
              {heldIndexes.map((i) => {
                const named = i.card.name && i.card.name !== "BETA";
                const each = perToken(i.card);
                return (
                  <li key={`${i.net}:${i.card.key}`}>
                    <Link href={`/${locale}/${i.net}/index/${i.card.key}`} className={row}>
                      <span className="relative w-9 h-9 shrink-0">
                        {i.card.image ? (
                          <img src={i.card.image} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover border border-ink/10" />
                        ) : (
                          <span className="w-9 h-9 rounded-full bg-black/10 flex items-center justify-center text-xs font-bold">{(named ? i.card.symbol : "B").charAt(0)}</span>
                        )}
                        <img src={`/assets/networks/${i.net}.png`} alt="" className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-paper" />
                      </span>
                      <span className="flex-1 min-w-0 flex flex-col">
                        <span className="text-sm font-semibold truncate">
                          {i.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })} {named ? i.card.symbol : "BETA"}
                        </span>
                        <span className="text-[11px] opacity-60 truncate">{t("holdingsIndexOn", { network: cap(i.net), parts: i.card.parts.length })}</span>
                      </span>
                      <span className="flex flex-col items-end shrink-0">
                        <span className="text-sm font-semibold tabular-nums">{each === null ? "—" : usd(each * i.balance)}</span>
                        <span className="text-[11px] opacity-60 tabular-nums">{each === null ? t("holdingsNoPrice") : share(each * i.balance)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {failed && <p className="text-[11px] opacity-60">{t("holdingsPartial")}</p>}
        </>
      )}
    </section>
  );
}
