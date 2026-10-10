"use client";

// One basket: what one BETA holds now, the user's BETA, and minting and
// burning it. Burned BETA pays each part back, less the creator's burn fee;
// what a burner deferred, and the creator's fees, are collected here too.

import { trackTx } from "@/components/ui/txToast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Contract, ZeroAddress, parseUnits, formatUnits } from "ethers";
import { ABIS, burnBeta, collectFees, collectOwed, getBasket, mintBeta, quoteMint, type Basket, type MintQuote } from "@ipow/sdk";

import { ComingSoon, ConnectNetworkButton, Notice, coin, errorText, evmAddressLink } from "@/subcomponents/ipow/common";
import { IndexDetail, IndexDetailSkeleton, type CollectItem, type DetailPart } from "@/subcomponents/ipow/IndexDetail";
import { ActivityCharts } from "@/subcomponents/ipow/ActivityCharts";
import { evmActivity, type Activity } from "@/components/integrator/ipow/indexActivity";
import { useUsdValue } from "@/subcomponents/ipow/useUsdValue";
import { EVM_CHAINS, PATH_USD, TICKER, deploymentOf, isBasketChain, readProvider, type BasketChain } from "@/components/integrator/ipow/sdk";
import { localAsset, lockLink, readMetadata, within, type IndexMetadata } from "@/components/integrator/ipow/indexMetadata";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import { balanceOf, tokenInfo, type TokenInfo } from "@/components/integrator/ipow/tokens";
import { crossChoicesOn, type CrossChoice } from "@/components/integrator/ipow/crossAssets";
import { isBasketKey, rememberBasket } from "@/components/integrator/ipow/basketList";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";
import SolanaBasketPage from "./SolanaBasketPage";
import { serverFaucet } from "@/subcomponents/ipow/Faucet";

const ZERO = BigInt(0);
/** One whole BETA in its smallest units (BetaBaskets.ONE). */
const ONE = BigInt(1_000_000_000);
const BPS = BigInt(10_000);
/** What minting `amount` (smallest units of the index token) takes of a
 *  part one whole token holds `perToken` of: rounded up, then the creator's
 *  fee on top, rounded up (BetaBaskets and beta-basket price a mint so). */
const mintTakes = (amount: bigint, perToken: bigint, feeBps: number) => {
  const up = (x: bigint, d: bigint) => (x === BigInt(0) ? BigInt(0) : (x - BigInt(1)) / d + BigInt(1));
  const base = up(amount * perToken, ONE);
  return base + up(base * BigInt(feeBps), BPS);
};

export default function BasketPage() {
  const { network } = useParams<{ network: string }>();
  if (network === "solana") return <SolanaBasketPage />;
  if (!isBasketChain(network)) return <ComingSoon network={network} app="beta" />;
  return <BasketView chain={network} />;
}

type Mine = { beta: bigint; parts: bigint[]; owed: bigint[]; fees: bigint[]; coin: bigint };
/** A part as shown: its own symbol, name and logo, and the network it lives on. */
type View = { symbol: string; name: string; logo: string | null; network: string; cross: CrossChoice | null; known: boolean };
/** Below this much of the coin, a mint may not pay its network fee. */
const LOW_COIN = BigInt(500_000_000_000_000);
/** Tempo pays fees in PathUSD (6 decimals): 0.05, a few transactions' worth. Its
 *  eth_getBalance answers one huge number for every address, so it isn't read. */
const LOW_PATH_USD = BigInt(50_000);

function BasketView({ chain }: { chain: BasketChain }) {
  const t = useTranslations("Beta");
  const { locale, id: key } = useParams<{ locale: string; id: string }>();
  const wallet = useEvmWallet(chain);
  const d = useMemo(() => deploymentOf(chain)!, [chain]);
  const provider = readProvider(chain);

  const [basket, setBasket] = useState<Basket | null>(null);
  const [infos, setInfos] = useState<TokenInfo[]>([]);
  const [mine, setMine] = useState<Mine | null>(null);
  const [views, setViews] = useState<View[]>([]);
  const [meta, setMeta] = useState<IndexMetadata | null>(null);
  const [history, setHistory] = useState<{ status: "loading" | "ready" | "unsupported" | "error"; events: Activity[] }>({ status: "loading", events: [] });
  const prices = useUsdValue();
  const [faucetBusy, setFaucetBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [side, setSide] = useState<"mint" | "burn">("mint");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<MintQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const valid = isBasketKey(key);

  const load = useCallback(async () => {
    if (!valid) return;
    try {
      const b = await getBasket(provider, d, key);
      setBasket(b);
      // A receipt part not made yet (E5) is named from the vault's assets.
      // Another network's asset is named by its source: ETH · Ethereum,
      // not the receipt's vETH.
      const isCross = (p: Basket["parts"][number]) => !!p.receipts && p.receipts !== ZeroAddress;
      const cross = b.parts.some(isCross) ? await within(crossChoicesOn(chain), 20_000, [] as CrossChoice[]) : [];
      const sourceOf = (p: Basket["parts"][number]) => (isCross(p) ? cross.find((x) => x.asset === p.asset && x.receipts?.toLowerCase() === p.receipts.toLowerCase()) : undefined);
      const label = (c: CrossChoice) => `${c.symbol} · ${c.from.charAt(0).toUpperCase() + c.from.slice(1)}`;
      setInfos(
        await Promise.all(
          b.parts.map(async (p) => {
            const c = sourceOf(p);
            if (p.made) {
              const info = await tokenInfo(chain, p.token);
              return c ? { ...info, symbol: label(c) } : info;
            }
            return { address: "", symbol: c ? label(c) : `#${p.asset}`, decimals: c?.decimals ?? 9 };
          })
        )
      );
      // Each part as the index shows it: another network's by its source.
      setViews(
        await Promise.all(
          b.parts.map(async (p): Promise<View> => {
            const c = sourceOf(p) ?? null;
            // A receipt of this network's own vaults, by its source.
            const ours = isCross(p) && d.vaults.some((v) => v.receipts.toLowerCase() === p.receipts.toLowerCase());
            if (c && ours) return { symbol: c.symbol, name: c.name, logo: c.logo, network: c.from, cross: c, known: true };
            const info = p.made ? await tokenInfo(chain, p.token).catch(() => null) : null;
            const local = localAsset(chain, p.token, info?.symbol ?? "?");
            // Claimed as a receipt of a contract that is not a vault here:
            // shown as it calls itself, unpriced, and flagged.
            if (isCross(p) && !ours) return { ...local, name: `${local.name} · ${t("receiptsNotVault")}`, network: chain, cross: null, known: false };
            return { ...local, network: chain, cross: null };
          })
        )
      );
      readMetadata(b.uri).then(setMeta);
      evmActivity(chain, key)
        .then((r) => setHistory(r === "unsupported" ? { status: "unsupported", events: [] } : { status: "ready", events: r.events }))
        .catch(() => setHistory({ status: "error", events: [] }));
      setLoadError(null);
      rememberBasket(d.betaBaskets, key);
      if (wallet.address) {
        const c = new Contract(d.betaBaskets, ABIS.betaBaskets, provider);
        const who = wallet.address;
        const [beta, parts, owed, fees, coinBal] = await Promise.all([
          balanceOf(chain, b.beta, who),
          Promise.all(b.parts.map((p) => (!p.made ? Promise.resolve(ZERO) : p.token === ZeroAddress ? (chain === "tempo" ? Promise.resolve(ZERO) : provider.getBalance(who)) : balanceOf(chain, p.token, who)))),
          Promise.all(b.parts.map((_, i) => c.owed(key, who, i) as Promise<bigint>)),
          Promise.all(b.parts.map((_, i) => c.fees(key, who, i) as Promise<bigint>)),
          chain === "tempo" ? balanceOf(chain, PATH_USD, who) : provider.getBalance(who),
        ]);
        setMine({ beta, parts, owed, fees, coin: coinBal });
      } else setMine(null);
    } catch (e) {
      setLoadError(errorText(e));
    }
  }, [valid, provider, d, key, chain, wallet.address]);

  useEffect(() => {
    load();
  }, [load]);

  const amountUnits = useMemo(() => {
    try {
      const a = parseUnits(amount.trim() || "0", 9);
      return a > ZERO ? a : null;
    } catch {
      return null;
    }
  }, [amount]);

  // What minting takes now, by part.
  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    if (side !== "mint" || !amountUnits || !valid) return;
    let live = true;
    const timer = setTimeout(() => {
      quoteMint(provider, d, key, amountUnits)
        .then((q) => live && setQuote(q))
        .catch((e) => {
          if (!live) return;
          setQuote(null);
          // A part the basket holds none of: no one can mint until it has some.
          setQuoteError(/PartEmpty/.test(String(e?.message ?? e)) ? t("partEmpty") : errorText(e));
        });
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [side, amountUnits, provider, d, key, valid, basket?.supply]);

  if (!valid) return <Notice text={t("notFound")} />;
  if (loadError && (!basket || views.length !== basket.parts.length)) return <Notice text={loadError} error />;
  if (!basket || infos.length !== basket.parts.length || views.length !== basket.parts.length) return <IndexDetailSkeleton />;

  // The token's own symbol in every text (an index of the program's first
  // build, with no name of its own, is BETA on chain).
  const sym = basket.name && basket.name !== "BETA" ? basket.symbol : "BETA";
  const supply = basket.supply;
  const firstMint = supply === ZERO;
  // What one whole BETA holds of each part now (the basket's mix at first).
  const perBeta = basket.parts.map((p) => (firstMint ? p.amount : (p.held * ONE) / supply));
  // What a burn of the amount pays back of each part, after the burn fee.
  const burnOut =
    side === "burn" && amountUnits && supply > ZERO
      ? basket.parts.map((p) => {
          const out = (p.held * amountUnits) / supply;
          // The contract rounds the fee up.
          const fee = out === ZERO ? ZERO : (out * BigInt(basket.burnFeeBps) - BigInt(1)) / BPS + BigInt(1);
          return out - (basket.burnFeeBps === 0 ? ZERO : fee);
        })
      : null;

  const unmade = basket.parts.some((p) => !p.made);
  const problem = !amountUnits
    ? t("enterBeta", { symbol: sym })
    : side === "mint"
      ? unmade
        ? t("partNotMadeYet")
        : firstMint && amountUnits % ONE !== ZERO
        ? t("firstMintWhole")
        : quoteError
          ? quoteError
          : !quote
          ? t("quoting")
          : mine && quote.need.some((n, i) => n + quote.fee[i] > mine.parts[i])
            ? t("notEnoughParts")
            : null
      : supply === ZERO
        ? t("nothingMinted")
        : mine && amountUnits > mine.beta
          ? t("notEnoughBeta", { symbol: sym })
          : burnOut && burnOut.some((o, i) => o === ZERO && basket.parts[i].held > ZERO)
            ? t("burnTooSmall", { symbol: sym })
            : null;

  /** One transaction with its toast; whether it went through. `hold` keeps
   *  the page busy afterwards (collecting all, one after another). */
  async function act(name: string, run: () => Promise<{ txHash: string }>, busyAs = name, hold = false): Promise<boolean> {
    if (!wallet.getSigner) return false;
    setBusy(busyAs);
    // What the toast calls it: "Mint 1 GREAT", "Collect VTIon fees".
    const part = Number(name.split("-")[1]);
    const label =
      name === "mint" || name === "burn"
        ? `${name === "mint" ? "Mint" : "Burn"} ${amount} ${sym}`
        : name === "unwrap"
          ? "Unwrap SOL"
          : `Collect ${views[part]?.symbol ?? "part"} ${name.startsWith("fees") ? "fees" : "owed"}`;
    try {
      const r = await trackTx(chain, label, run, (x) => x.txHash);
      if (!r.ok) return false;
      if (name === "mint" || name === "burn") setAmount("");
      await load();
      return true;
    } finally {
      if (!hold) setBusy(null);
    }
  }
  const signer = async () => {
    const s = await wallet.getSigner!();
    const onChain = (await s.provider?.getNetwork())?.chainId;
    if (onChain !== undefined && onChain !== BigInt(d.chainId)) throw new Error(t("wrongNetwork"));
    return s;
  };

  const collectable = mine
    ? basket.parts.flatMap((_, i) => [
        ...(mine.owed[i] > ZERO ? [{ kind: "owed" as const, i, amount: mine.owed[i] }] : []),
        ...(mine.fees[i] > ZERO ? [{ kind: "fees" as const, i, amount: mine.fees[i] }] : []),
      ])
    : [];

  const collectItems: CollectItem[] = collectable.map((c) => ({
    id: `${c.kind}-${c.i}`,
    kind: c.kind,
    part: c.i,
    symbol: views[c.i].symbol,
    amount: coin(c.amount, infos[c.i].decimals),
  }));
  const collectRun = (id: string) => {
    const [kind, i] = [id.split("-")[0], Number(id.split("-")[1])];
    return async () => (kind === "owed" ? collectOwed(await signer(), d, key, i) : collectFees(await signer(), d, key, i));
  };
  const collect = (item: CollectItem, busyAs = item.id, hold = false) => act(item.id, collectRun(item.id), busyAs, hold);
  /** Every amount, one transaction after another; stops at the first not done. */
  async function collectAll() {
    try {
      for (const item of collectItems) if (!(await collect(item, "all", true))) break;
    } finally {
      setBusy(null);
    }
  }

  // What each part is worth, at the prices Greatwall knows.
  const whole = (units: bigint, decimals: number) => Number(units) / 10 ** decimals;
  const worth = basket.parts.map((_, i) => {
    const price = views[i].known ? prices.priceOf(views[i].symbol) : null;
    return price === null ? null : whole(perBeta[i], infos[i].decimals) * price;
  });
  const valuePerToken = worth.every((w) => w !== null) ? worth.reduce((a, w) => a + (w ?? 0), 0) : null;
  const ticker = TICKER[chain];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const parts: DetailPart[] = basket.parts.map((p, i) => {
    const v = views[i];
    // What the amount typed takes of it, as the chain prices a mint: its
    // share of one token, rounded up, the creator's fee on top, rounded up
    // too. The chain's own quote when there is one (it refuses while a part
    // is not usable here yet, so the page works it out the same way).
    const need = quote ? quote.need[i] + quote.fee[i] : amountUnits ? mintTakes(amountUnits, perBeta[i], basket.mintFeeBps) : null;
    const enough = need !== null && mine ? need <= mine.parts[i] : null;
    let warning: DetailPart["warning"] = null;
    if (side === "mint" && wallet.connected) {
      const from = v.cross?.from ?? null;
      // The Lock page doesn't lock to Tempo yet: no link to it from a Tempo index.
      const lockHref = chain === "tempo" ? null : lockLink(locale, chain, from, v.cross?.home ?? null, EVM_CHAINS);
      const lock = lockHref ? { kind: "lock" as const, label: t("lockNow"), href: lockHref } : undefined;
      // A test token of this network: its faucet, one click.
      const testToken = !v.cross && rwaTokensOf(chain).some((r) => r.token.toLowerCase() === p.token.toLowerCase());
      const faucet = testToken && wallet.address ? { kind: "faucet" as const, label: t("faucetClaim"), busyLabel: t("faucetBusy"), busy: faucetBusy === p.token, onClick: () => claim(p.token, v.symbol) } : undefined;
      const held = mine && p.made ? mine.parts[i] : ZERO;
      // Short: less than the amount asks, or none at all before one is asked.
      const short = !p.made || enough === false || (need === null && held === ZERO);
      if (short) {
        if (v.cross) warning = { text: !p.made ? t("partNotLockedYet", { symbol: v.symbol, network: cap(from ?? chain) }) : t("notEnoughLocked", { symbol: v.symbol, network: cap(from ?? chain) }), action: lock };
        else if (faucet) warning = { text: t("notEnoughToken", { symbol: v.symbol }), action: faucet };
        else warning = { text: t("notEnoughToken", { symbol: v.symbol }), action: { kind: "lock" as const, label: t("getSome"), href: `/${locale}/${chain}/convert/create` } };
      }
    }
    return {
      key: `${p.token}-${i}`,
      symbol: v.symbol,
      name: v.cross ? `${v.name} · ${cap(v.network)}` : v.name,
      logo: v.logo,
      network: v.network,
      perToken: coin(perBeta[i], infos[i].decimals),
      perTokenExact: Number(formatUnits(perBeta[i], infos[i].decimals)),
      valueUsd: worth[i],
      need: need !== null ? coin(need, infos[i].decimals) : null,
      have: mine && p.made ? coin(mine.parts[i], infos[i].decimals) : mine ? "0" : null,
      enough: !p.made ? false : enough,
      // Nothing minted yet: nothing to give back.
      out: burnOut ? coin(burnOut[i], infos[i].decimals) : side === "burn" && amountUnits ? "0" : null,
      warning,
    };
  });

  async function claim(token: string, symbol: string) {
    const who = wallet.address;
    if (!who) return;
    setFaucetBusy(token);
    try {
      let done: string | undefined;
      // Greatwall's server faucet, which pays the fee; the token's own faucet
      // (signed by the wallet) when the server is out of it.
      const send = async (): Promise<string | null> => {
        try {
          const sent = await serverFaucet(chain, who, token);
          done = sent.text;
          return sent.hash;
        } catch (e: any) {
          if (e?.dry === "token" && wallet.faucet) return wallet.faucet(token);
          throw e;
        }
      };
      const r = await trackTx(chain, `Faucet: ${symbol}`, send, (h) => h, {
        pending: "Greatwall's faucet is sending it. If it is out of this token, your wallet asks you to confirm the token's own faucet.",
        get done() {
          return done;
        },
      });
      if (r.ok) await load();
    } finally {
      setFaucetBusy(null);
    }
  }

  const named = basket.name && basket.name !== "BETA";
  return (
    <IndexDetail
      name={named ? basket.name : t("basketName", { id: String(basket.id) })}
      symbol={named ? basket.symbol : "BETA"}
      image={meta?.image ?? null}
      description={meta?.description ?? ""}
      links={{ website: meta?.website ?? null, twitter: meta?.twitter ?? null, telegram: meta?.telegram ?? null }}
      creator={basket.creator}
      creatorHref={evmAddressLink(chain, basket.creator)}
      details={[
        { label: t("tokenLabel"), value: basket.beta, href: evmAddressLink(chain, basket.beta) },
        { label: t("indexAddress"), value: key, href: null },
        { label: t("creator"), value: basket.creator, href: evmAddressLink(chain, basket.creator) },
        { label: t("network"), value: wallet.networkName || cap(chain), href: null },
      ]}
      network={chain}
      networkName={wallet.networkName || cap(chain)}
      networkLogo={`/assets/networks/${chain}.png`}
      parts={parts}
      valuePerToken={valuePerToken}
      marketCap={valuePerToken === null ? null : valuePerToken * whole(supply, 9)}
      supply={coin(supply, 9)}
      feePct={Math.max(basket.mintFeeBps, basket.burnFeeBps) / 100}
      yourBalance={mine ? coin(mine.beta, 9) : null}
      side={side}
      setSide={setSide}
      amount={amount}
      setAmount={setAmount}
      amountUsd={valuePerToken !== null && amountUnits ? valuePerToken * whole(amountUnits, 9) : null}
      firstMintHint={firstMint && side === "mint" ? t("firstMintHint", { symbol: sym }) : null}
      includesFee={basket.mintFeeBps > 0 && quote ? t("includesFee", { pct: basket.mintFeeBps / 100 }) : null}
      problem={problem}
      busy={busy === side}
      anyBusy={!!busy}
      compositionNote={firstMint ? t("compositionWillHold", { symbol: named ? basket.symbol : "BETA" }) : t("compositionHoldsOf", { symbol: named ? basket.symbol : "BETA" })}
      backHref={`/${locale}/${chain}/index`}
      history={<ActivityCharts events={history.events} supply={supply} symbol={named ? basket.symbol : "BETA"} status={history.status} />}
      connected={wallet.connected}
      connectButton={<ConnectNetworkButton chain={chain} />}
      onSubmit={() =>
        act(side, async () => (side === "mint" ? mintBeta(await signer(), d, await quoteMint(provider, d, key, amountUnits!)) : burnBeta(await signer(), d, key, amountUnits!)))
      }
      feeWarning={side === "mint" && mine && mine.coin < (chain === "tempo" ? LOW_PATH_USD : LOW_COIN) ? { text: t("lowCoinForFees", { symbol: ticker }), action: { label: t("faucetNow"), href: `/${locale}/${chain}/vault/assets` } } : null}
      collect={{ items: collectItems, busy, onCollect: (item) => collect(item), onCollectAll: collectAll }}
    />
  );
}
