"use client";

// One basket: what one BETA holds now, the user's BETA, and minting and
// burning it. Burned BETA pays each part back, less the creator's burn fee;
// what a burner deferred, and the creator's fees, are collected here too.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Contract, ZeroAddress, parseUnits } from "ethers";
import { ABIS, burnBeta, collectFees, collectOwed, getBasket, mintBeta, quoteMint, type Basket, type MintQuote } from "@ipow/sdk";

import { ComingSoon, ConnectNetworkButton, Notice, coin, errorText, evmAddressLink, evmTxLink } from "@/subcomponents/ipow/common";
import { IndexDetail, IndexDetailSkeleton, type DetailPart } from "@/subcomponents/ipow/IndexDetail";
import { ActivityCharts } from "@/subcomponents/ipow/ActivityCharts";
import { evmActivity, type Activity } from "@/components/integrator/ipow/indexActivity";
import { useUsdValue } from "@/subcomponents/ipow/useUsdValue";
import { EVM_CHAINS, TICKER, deploymentOf, isEvmChain, readProvider, type EvmChain } from "@/components/integrator/ipow/sdk";
import { localAsset, lockLink, readMetadata, within, type IndexMetadata } from "@/components/integrator/ipow/indexMetadata";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import { balanceOf, tokenInfo, type TokenInfo } from "@/components/integrator/ipow/tokens";
import { crossChoicesOn, type CrossChoice } from "@/components/integrator/ipow/crossAssets";
import { isBasketKey, rememberBasket } from "@/components/integrator/ipow/basketList";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";
import SolanaBasketPage from "./SolanaBasketPage";

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
  if (!isEvmChain(network)) return <ComingSoon network={network} app="beta" />;
  return <BasketView chain={network} />;
}

type Mine = { beta: bigint; parts: bigint[]; owed: bigint[]; fees: bigint[]; coin: bigint };
/** A part as shown: its own symbol, name and logo, and the network it lives on. */
type View = { symbol: string; name: string; logo: string | null; network: string; cross: CrossChoice | null; known: boolean };
/** Below this much of the coin, a mint may not pay its network fee. */
const LOW_COIN = BigInt(500_000_000_000_000);

function BasketView({ chain }: { chain: EvmChain }) {
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
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

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
          Promise.all(b.parts.map((p) => (!p.made ? Promise.resolve(ZERO) : p.token === ZeroAddress ? provider.getBalance(who) : balanceOf(chain, p.token, who)))),
          Promise.all(b.parts.map((_, i) => c.owed(key, who, i) as Promise<bigint>)),
          Promise.all(b.parts.map((_, i) => c.fees(key, who, i) as Promise<bigint>)),
          provider.getBalance(who),
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

  async function act(name: string, run: () => Promise<{ txHash: string }>) {
    if (!wallet.getSigner) return;
    setBusy(name);
    setError(null);
    setDone(null);
    try {
      setDone((await run()).txHash);
      setAmount("");
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
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
      const lockHref = lockLink(locale, chain, from, v.cross?.home ?? null, EVM_CHAINS);
      const lock = lockHref ? { kind: "lock" as const, label: t("lockNow"), href: lockHref } : undefined;
      // A test token of this network: its faucet, one click.
      const testToken = !v.cross && rwaTokensOf(chain).some((r) => r.token.toLowerCase() === p.token.toLowerCase());
      const faucet = testToken && wallet.faucet ? { kind: "faucet" as const, label: t("faucetClaim"), busyLabel: t("faucetBusy"), busy: faucetBusy === p.token, onClick: () => claim(p.token, v.symbol) } : undefined;
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
    if (!wallet.faucet) return;
    setFaucetBusy(token);
    try {
      await wallet.faucet(token);
      toast.success(t("faucetSent", { symbol }));
      await load();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setFaucetBusy(null);
    }
  }

  const black = "w-full rounded-lg bg-ink text-snow py-3 text-sm font-medium hover:bg-pitch disabled:opacity-40 transition-colors";
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
      error={error}
      doneHref={done ? evmTxLink(chain, done) : null}
      connected={wallet.connected}
      connectButton={<ConnectNetworkButton chain={chain} />}
      onSubmit={() =>
        act(side, async () => (side === "mint" ? mintBeta(await signer(), d, await quoteMint(provider, d, key, amountUnits!)) : burnBeta(await signer(), d, key, amountUnits!)))
      }
      feeWarning={side === "mint" && mine && mine.coin < LOW_COIN ? { text: t("lowCoinForFees", { symbol: ticker }), action: { label: t("faucetNow"), href: `/${locale}/${chain}/vault/assets` } } : null}
      extras={
        collectable.length > 0 ? (
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
            <p className="font-semibold text-sm">{t("toCollect")}</p>
            {collectable.map((c) => (
              <button
                key={`${c.kind}-${c.i}`}
                type="button"
                className={black}
                disabled={!!busy}
                onClick={() => act(`${c.kind}-${c.i}`, async () => (c.kind === "owed" ? collectOwed(await signer(), d, key, c.i) : collectFees(await signer(), d, key, c.i)))}
              >
                {busy === `${c.kind}-${c.i}` ? t("confirming") : t(c.kind === "owed" ? "collectOwed" : "collectFees", { amount: coin(c.amount, infos[c.i].decimals), symbol: views[c.i].symbol })}
              </button>
            ))}
          </div>
        ) : null
      }
    />
  );
}
