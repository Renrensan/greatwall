"use client";

// One basket on Solana: what one BETA holds now, the wallet's BETA, minting
// and burning it, and collecting what is owed or earned. A SOL part is
// wrapped from the wallet's SOL as it is minted; what a burn pays of it
// arrives as wrapped SOL, unwrapped here in one step.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { parseUnits } from "ethers";
import { PublicKey } from "@solana/web3.js";
import { SOLANA, WRAPPED_SOL, type SolanaBasket, type SolanaMintQuote } from "@ipow/sdk";

import { SolanaConnectButton } from "@/subcomponents/SolanaConnectButton";
import { Notice, coin, errorText } from "@/subcomponents/ipow/common";
import { IndexDetail, IndexDetailSkeleton, type DetailPart } from "@/subcomponents/ipow/IndexDetail";
import { ActivityCharts } from "@/subcomponents/ipow/ActivityCharts";
import { solanaActivity, type Activity } from "@/components/integrator/ipow/indexActivity";
import { useUsdValue } from "@/subcomponents/ipow/useUsdValue";
import { localAsset, lockLink, readMetadata, within, type IndexMetadata } from "@/components/integrator/ipow/indexMetadata";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import { EVM_CHAINS, solanaBeta, solanaConnection, solanaExplorer } from "@/components/integrator/ipow/sdk";
import { solanaToken, type SolanaToken } from "@/components/integrator/ipow/solanaTokens";
import { crossChoicesOn, type CrossChoice } from "@/components/integrator/ipow/crossAssets";
import { isSolanaBasket, rememberBasket } from "@/components/integrator/ipow/basketList";
import { useSolanaWallet } from "@/components/solana/solana-provider";

const ZERO = BigInt(0);
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
/** SOL kept back for transaction fees and new accounts' rent when SOL is
 *  wrapped for a mint. */
const SOL_RESERVE = BigInt(10_000_000);

type Mine = { beta: bigint; parts: bigint[]; sol: bigint; wrapped: bigint; owed: bigint[]; fees: bigint[] };

/** A part as shown: its own symbol, name and logo, and the network it lives on. */
type View = { symbol: string; name: string; logo: string | null; network: string; cross: CrossChoice | null; known: boolean };

const ceilFee = (x: bigint, bps: number) => (x === ZERO || bps === 0 ? ZERO : (x * BigInt(bps) - BigInt(1)) / BPS + BigInt(1));

export default function SolanaBasketPage() {
  const t = useTranslations("Beta");
  const { locale, id: address } = useParams<{ locale: string; id: string }>();
  const sol = useSolanaWallet();
  const valid = isSolanaBasket(address);

  const [basket, setBasket] = useState<SolanaBasket | null>(null);
  const [infos, setInfos] = useState<SolanaToken[]>([]);
  const [mine, setMine] = useState<Mine | null>(null);
  const [views, setViews] = useState<View[]>([]);
  const [meta, setMeta] = useState<IndexMetadata | null>(null);
  const [history, setHistory] = useState<{ status: "loading" | "ready" | "unsupported" | "error"; events: Activity[] }>({ status: "loading", events: [] });
  const prices = useUsdValue();
  const [faucetBusy, setFaucetBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [side, setSide] = useState<"mint" | "burn">("mint");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<SolanaMintQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const reader = useMemo(() => solanaBeta(null), []);

  const load = useCallback(async () => {
    if (!valid) return;
    try {
      const b = await reader.getBasket(address);
      setBasket(b);
      // A receipt part not made yet (E5) is named from the vaults' assets.
      // Another network's asset is named by its source: ETH · Ethereum,
      // GLDx · Base, not the receipt's vETH or its mint.
      const cross = await within(crossChoicesOn("solana"), 20_000, [] as CrossChoice[]);
      const label = (c: CrossChoice) => `${c.symbol} · ${c.from.charAt(0).toUpperCase() + c.from.slice(1)}`;
      setInfos(
        await Promise.all(
          b.parts.map(async (p) => {
            const c = cross.find((x) => x.token === p.mint);
            if (p.made) {
              const info = await solanaToken(p.mint);
              return c ? { ...info, symbol: label(c) } : info;
            }
            return { mint: p.mint, symbol: c ? label(c) : "?", decimals: c?.decimals ?? 9 };
          })
        )
      );
      // Each part as the index shows it: another network's by its source.
      setViews(
        await Promise.all(
          b.parts.map(async (p): Promise<View> => {
            const c = cross.find((x) => x.token === p.mint) ?? null;
            if (c) return { symbol: c.symbol, name: c.name, logo: c.logo, network: c.from, cross: c, known: true };
            const info = await solanaToken(p.mint).catch(() => null);
            return { ...localAsset("solana", p.mint, info?.symbol ?? "?"), network: "solana", cross: null };
          })
        )
      );
      readMetadata(b.uri).then(setMeta);
      solanaActivity(address, b.beta)
        .then((r) => setHistory(r === "unsupported" ? { status: "unsupported", events: [] } : { status: "ready", events: r.events }))
        .catch(() => setHistory({ status: "error", events: [] }));
      setLoadError(null);
      rememberBasket(SOLANA.programs.betaBasket, address);
      if (sol.address) {
        const me = new PublicKey(sol.address);
        const [beta, parts, lamports, wrapped, owed, fees] = await Promise.all([
          reader.betaBalance(address, me),
          Promise.all(b.parts.map((p) => (p.made ? reader.tokenBalance(me, new PublicKey(p.mint)) : Promise.resolve(ZERO)))),
          solanaConnection().getBalance(me),
          reader.tokenBalance(me, new PublicKey(WRAPPED_SOL)),
          Promise.all(b.parts.map((_, i) => reader.owed(address, i, me))),
          reader.feesOf(address, me),
        ]);
        setMine({ beta, parts, sol: BigInt(lamports), wrapped, owed, fees });
      } else setMine(null);
    } catch (e) {
      setLoadError(errorText(e));
    }
  }, [valid, reader, address, sol.address]);

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

  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    if (side !== "mint" || !amountUnits || !valid) return;
    let live = true;
    const timer = setTimeout(() => {
      reader
        .quoteMint(address, amountUnits)
        .then((q) => live && setQuote(q))
        .catch((e) => live && setQuoteError(errorText(e)));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [side, amountUnits, reader, address, valid, basket?.supply]);

  if (!valid) return <Notice text={t("notFound")} />;
  if (loadError && (!basket || views.length !== basket.parts.length)) return <Notice text={loadError} error />;
  if (!basket || infos.length !== basket.parts.length || views.length !== basket.parts.length) return <IndexDetailSkeleton />;

  // The token's own symbol in every text (an index of the program's first
  // build, with no name of its own, is BETA on chain).
  const sym = basket.name && basket.name !== "BETA" ? basket.symbol : "BETA";
  const supply = basket.supply;
  const firstMint = supply === ZERO;
  const perBeta = basket.parts.map((p) => (firstMint ? p.amount : (p.held * ONE) / supply));
  const burnOut =
    side === "burn" && amountUnits && supply > ZERO
      ? basket.parts.map((p) => {
          const out = (p.held * amountUnits) / supply;
          return out - ceilFee(out, basket.burnFeeBps);
        })
      : null;
  // What the wallet can give of each part: SOL counts its plain SOL too,
  // less a reserve, since the mint wraps it.
  const canGive = (i: number) =>
    mine ? (basket.parts[i].mint === WRAPPED_SOL ? mine.parts[i] + (mine.sol > SOL_RESERVE ? mine.sol - SOL_RESERVE : ZERO) : mine.parts[i]) : null;

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
            : mine && quote.need.some((n, i) => n + quote.fee[i] > (canGive(i) ?? ZERO))
              ? t("notEnoughParts")
              : null
      : firstMint
        ? t("nothingMinted")
        : mine && amountUnits > mine.beta
          ? t("notEnoughBeta", { symbol: sym })
          : burnOut && burnOut.some((o, i) => o === ZERO && basket.parts[i].held > ZERO)
            ? t("burnTooSmall", { symbol: sym })
            : null;

  async function act(name: string, run: (beta: ReturnType<typeof solanaBeta>) => Promise<{ signature: string }>) {
    const wallet = sol.getAnchorWallet();
    if (!wallet) return;
    setBusy(name);
    setError(null);
    setDone(null);
    try {
      const { signature } = await run(solanaBeta(wallet));
      setDone(signature);
      setAmount("");
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  const collectable = mine
    ? basket.parts.flatMap((_, i) => [
        ...(mine.owed[i] > ZERO ? [{ kind: "owed" as const, i, amount: mine.owed[i] }] : []),
        ...((mine.fees[i] ?? ZERO) > ZERO ? [{ kind: "fees" as const, i, amount: mine.fees[i] }] : []),
      ])
    : [];

  // What each part is worth, at the prices Greatwall knows.
  const whole = (units: bigint, decimals: number) => Number(units) / 10 ** decimals;
  const worth = basket.parts.map((_, i) => {
    const price = views[i].known ? prices.priceOf(views[i].symbol) : null;
    return price === null ? null : whole(perBeta[i], infos[i].decimals) * price;
  });
  const valuePerToken = worth.every((w) => w !== null) ? worth.reduce((a, w) => a + (w ?? 0), 0) : null;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const parts: DetailPart[] = basket.parts.map((p, i) => {
    const v = views[i];
    // What the amount typed takes of it, as the chain prices a mint: its
    // share of one token, rounded up, the creator's fee on top, rounded up
    // too. The chain's own quote when there is one (it refuses while a part
    // is not usable here yet, so the page works it out the same way).
    const need = quote ? quote.need[i] + quote.fee[i] : amountUnits ? mintTakes(amountUnits, perBeta[i], basket.mintFeeBps) : null;
    const have = canGive(i);
    const enough = need !== null && have !== null ? need <= have : null;
    let warning: DetailPart["warning"] = null;
    if (side === "mint" && sol.connected) {
      const from = v.cross?.from ?? null;
      const lockHref = lockLink(locale, "solana", from, v.cross?.home ?? null, EVM_CHAINS);
      const lock = lockHref ? { kind: "lock" as const, label: t("lockNow"), href: lockHref } : undefined;
      // A test token of Solana: its faucet, one click.
      const testToken = !v.cross && p.mint !== WRAPPED_SOL && rwaTokensOf("solana").some((r) => r.token === p.mint);
      const faucet = testToken ? { kind: "faucet" as const, label: t("faucetClaim"), busyLabel: t("faucetBusy"), busy: faucetBusy === p.mint, onClick: () => claim(p.mint, v.symbol) } : undefined;
      const held = have ?? ZERO;
      // Short: less than the amount asks, or none at all before one is asked.
      const short = !p.made || enough === false || (need === null && held === ZERO);
      if (short) {
        if (v.cross) warning = { text: !p.made ? t("partNotLockedYet", { symbol: v.symbol, network: cap(from ?? "solana") }) : t("notEnoughLocked", { symbol: v.symbol, network: cap(from ?? "solana") }), action: lock };
        else if (faucet) warning = { text: t("notEnoughToken", { symbol: v.symbol }), action: faucet };
        else warning = { text: t("notEnoughToken", { symbol: v.symbol }), action: { kind: "lock" as const, label: t("getSome"), href: `/${locale}/solana/convert/create` } };
      }
    }
    return {
      key: p.mint,
      symbol: v.symbol,
      name: v.cross ? `${v.name} · ${cap(v.network)}` : v.name,
      logo: v.logo,
      network: v.network,
      perToken: coin(perBeta[i], infos[i].decimals),
      valueUsd: worth[i],
      need: need !== null ? coin(need, infos[i].decimals) : null,
      have: have !== null ? coin(have, infos[i].decimals) : null,
      enough: !p.made ? false : enough,
      // Nothing minted yet: nothing to give back.
      out: burnOut ? coin(burnOut[i], infos[i].decimals) : side === "burn" && amountUnits ? "0" : null,
      warning,
    };
  });

  /** The Solana faucet of Greatwall's server (it holds the mint authority). */
  async function claim(mint: string, symbol: string) {
    if (!sol.address) return;
    setFaucetBusy(mint);
    try {
      const r = await fetch("/api/faucet/solana", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: sol.address, mint }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error ?? `The faucet refused (${r.status})`);
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
  const extras =
    collectable.length > 0 || (mine && mine.wrapped > ZERO) ? (
      <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
        <p className="font-semibold text-sm">{t("toCollect")}</p>
        {collectable.map((c) => (
          <button
            key={`${c.kind}-${c.i}`}
            type="button"
            className={black}
            disabled={!!busy}
            onClick={() => act(`${c.kind}-${c.i}`, (b) => (c.kind === "owed" ? b.collectOwed(address, c.i) : b.collectFees(address, c.i)))}
          >
            {busy === `${c.kind}-${c.i}` ? t("confirming") : t(c.kind === "owed" ? "collectOwed" : "collectFees", { amount: coin(c.amount, infos[c.i].decimals), symbol: views[c.i].symbol })}
          </button>
        ))}
        {mine && mine.wrapped > ZERO && (
          <button type="button" className={black} disabled={!!busy} onClick={() => act("unwrap", (b) => b.unwrapSol())}>
            {busy === "unwrap" ? t("confirming") : t("unwrap", { amount: coin(mine.wrapped, 9) })}
          </button>
        )}
      </div>
    ) : null;

  return (
    <IndexDetail
      name={named ? basket.name : t("basketName", { id: String(basket.id) })}
      symbol={named ? basket.symbol : "BETA"}
      image={meta?.image ?? null}
      description={meta?.description ?? ""}
      links={{ website: meta?.website ?? null, twitter: meta?.twitter ?? null, telegram: meta?.telegram ?? null }}
      creator={basket.creator}
      creatorHref={solanaExplorer("address", basket.creator)}
      details={[
        { label: t("tokenLabel"), value: basket.beta, href: solanaExplorer("address", basket.beta) },
        { label: t("indexAddress"), value: address, href: solanaExplorer("address", address) },
        { label: t("creator"), value: basket.creator, href: solanaExplorer("address", basket.creator) },
        { label: t("network"), value: "Solana", href: null },
      ]}
      network="solana"
      networkName="Solana"
      networkLogo="/assets/networks/solana.png"
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
      backHref={`/${locale}/solana/index`}
      history={<ActivityCharts events={history.events} supply={supply} symbol={named ? basket.symbol : "BETA"} status={history.status} />}
      error={error}
      doneHref={done ? solanaExplorer("tx", done) : null}
      connected={sol.connected}
      connectButton={<SolanaConnectButton />}
      onSubmit={() => act(side, (b) => (side === "mint" ? b.mint(address, amountUnits!) : b.burn(address, amountUnits!)))}
      // SOL for the fees and the new accounts a mint opens.
      feeWarning={side === "mint" && mine && mine.sol < SOL_RESERVE ? { text: t("lowCoinForFees", { symbol: "SOL" }), action: { label: t("faucetNow"), href: `/${locale}/solana/vault/assets` } } : null}
      extras={extras}
    />
  );
}
