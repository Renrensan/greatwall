"use client";

// One basket on Solana: what one BETA holds now, the wallet's BETA, minting
// and burning it, and collecting what is owed or earned. A SOL part is
// wrapped from the wallet's SOL as it is minted; what a burn pays of it
// arrives as wrapped SOL, unwrapped here in one step.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseUnits } from "ethers";
import { PublicKey } from "@solana/web3.js";
import { SOLANA, WRAPPED_SOL, type SolanaBasket, type SolanaMintQuote } from "@ipow/sdk";

import Button from "@/subcomponents/Button";
import { SolanaConnectButton } from "@/subcomponents/SolanaConnectButton";
import { Field, Notice, Row, coin, errorText, shortHash } from "@/subcomponents/ipow/common";
import { solanaBeta, solanaConnection, solanaExplorer } from "@/components/integrator/ipow/sdk";
import { solanaToken, type SolanaToken } from "@/components/integrator/ipow/solanaTokens";
import { isSolanaBasket, rememberBasket } from "@/components/integrator/ipow/basketList";
import { useSolanaWallet } from "@/components/solana/solana-provider";

const ZERO = BigInt(0);
const ONE = BigInt(1_000_000_000);
const BPS = BigInt(10_000);
/** SOL kept back for transaction fees and new accounts' rent when SOL is
 *  wrapped for a mint. */
const SOL_RESERVE = BigInt(10_000_000);

type Mine = { beta: bigint; parts: bigint[]; sol: bigint; wrapped: bigint; owed: bigint[]; fees: bigint[] };

const ceilFee = (x: bigint, bps: number) => (x === ZERO || bps === 0 ? ZERO : (x * BigInt(bps) - BigInt(1)) / BPS + BigInt(1));

export default function SolanaBasketPage() {
  const t = useTranslations("Beta");
  const { locale, id: address } = useParams<{ locale: string; id: string }>();
  const sol = useSolanaWallet();
  const valid = isSolanaBasket(address);

  const [basket, setBasket] = useState<SolanaBasket | null>(null);
  const [infos, setInfos] = useState<SolanaToken[]>([]);
  const [mine, setMine] = useState<Mine | null>(null);
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
      setInfos(await Promise.all(b.parts.map((p) => solanaToken(p.mint))));
      setLoadError(null);
      rememberBasket(SOLANA.programs.betaBasket, address);
      if (sol.address) {
        const me = new PublicKey(sol.address);
        const [beta, parts, lamports, wrapped, owed, fees] = await Promise.all([
          reader.betaBalance(address, me),
          Promise.all(b.parts.map((p) => reader.tokenBalance(me, new PublicKey(p.mint)))),
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
  if (loadError && !basket) return <Notice text={loadError} error />;
  if (!basket || infos.length !== basket.parts.length) return <Notice text={t("loading")} />;

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

  const problem = !amountUnits
    ? t("enterBeta")
    : side === "mint"
      ? firstMint && amountUnits % ONE !== ZERO
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
          ? t("notEnoughBeta")
          : burnOut && burnOut.some((o, i) => o === ZERO && basket.parts[i].held > ZERO)
            ? t("burnTooSmall")
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

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      <Link href={`/${locale}/solana/beta/baskets`} className="text-xs sm:text-sm opacity-70 hover:opacity-100">
        ← {t("backToBaskets")}
      </Link>

      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
        <p className="font-bold text-base sm:text-lg">
          {t("basketName", { id: String(basket.id) })} · {shortHash(address)}
        </p>
        <div className="flex flex-col gap-2 text-xs sm:text-sm">
          <p className="font-bold">{firstMint ? t("mixAtFirst") : t("oneBetaHolds")}</p>
          {basket.parts.map((p, i) => (
            <Row key={p.mint} label={infos[i].symbol} value={coin(perBeta[i], infos[i].decimals)} />
          ))}
        </div>
        <div className="flex flex-col gap-2 text-xs sm:text-sm border-t border-black/10 pt-3">
          <Row label={t("supplyLabel")} value={`${coin(supply, 9)} BETA`} />
          {mine && <Row label={t("yourBeta")} value={`${coin(mine.beta, 9)} BETA`} bold />}
          <Row label={t("fees")} value={t("feesValue", { mint: basket.mintFeeBps / 100, burn: basket.burnFeeBps / 100 })} />
          <Row label={t("creator")} value={shortHash(basket.creator)} />
          <Row
            label={t("token")}
            value={
              <a href={solanaExplorer("address", basket.beta)} target="_blank" rel="noreferrer" className="underline">
                {shortHash(basket.beta)}
              </a>
            }
          />
          <Row label={t("address")} value={<span className="break-all">{address}</span>} />
        </div>
      </div>

      <div className="flex glass-card bgRound border-black/5">
        {(["mint", "burn"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`w-full p-3 rounded-full text-xs sm:text-sm transition-all ${side === s ? "font-bold bg-black/5" : "font-medium opacity-70"}`}
          >
            {s === "mint" ? t("mintTab") : t("burnTab")}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex justify-end">
          <SolanaConnectButton />
        </div>
        <Field label={side === "mint" ? t("youMint") : t("youBurn")} suffix="BETA" hint={firstMint && side === "mint" ? t("firstMintHint") : undefined}>
          <input
            id="beta-sol-amount"
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            className="w-full text-2xl sm:text-3xl font-bold bg-transparent outline-none"
          />
        </Field>

        {side === "mint" && quote && (
          <div className="flex flex-col gap-2 text-xs sm:text-sm">
            <p className="font-bold">{t("mintTakes")}</p>
            {quote.need.map((n, i) => {
              const have = canGive(i);
              return (
                <Row
                  key={i}
                  label={infos[i].symbol}
                  value={`${coin(n + quote.fee[i], infos[i].decimals)}${have !== null ? ` / ${coin(have, infos[i].decimals)}` : ""}`}
                />
              );
            })}
            {basket.parts.some((p) => p.mint === WRAPPED_SOL) && <p className="opacity-70">{t("solWrapped")}</p>}
            {basket.mintFeeBps > 0 && <p className="opacity-70">{t("includesFee", { pct: basket.mintFeeBps / 100 })}</p>}
          </div>
        )}
        {burnOut && (
          <div className="flex flex-col gap-2 text-xs sm:text-sm">
            <p className="font-bold">{t("burnPays")}</p>
            {burnOut.map((o, i) => (
              <Row key={i} label={infos[i].symbol} value={coin(o, infos[i].decimals)} />
            ))}
          </div>
        )}

        {error && <p className="text-xs sm:text-sm text-red-500 break-words">{error}</p>}
        {done && (
          <a href={solanaExplorer("tx", done)} target="_blank" rel="noreferrer" className="text-xs sm:text-sm underline opacity-80">
            {t("doneTx")}
          </a>
        )}
        {!sol.connected ? (
          <Button buttonText={t("connectFirst")} disabled chain="solana" />
        ) : (
          <Button
            buttonText={busy === side ? t("confirming") : (problem ?? (side === "mint" ? t("mintButton") : t("burnButton")))}
            disabled={!!busy || !!problem}
            onClick={() => act(side, (b) => (side === "mint" ? b.mint(address, amountUnits!) : b.burn(address, amountUnits!)))}
            chain="solana"
          />
        )}
      </div>

      {(collectable.length > 0 || (mine && mine.wrapped > ZERO)) && (
        <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-3">
          <p className="font-bold text-xs sm:text-sm">{t("toCollect")}</p>
          {collectable.map((c) => (
            <Button
              key={`${c.kind}-${c.i}`}
              buttonText={
                busy === `${c.kind}-${c.i}`
                  ? t("confirming")
                  : t(c.kind === "owed" ? "collectOwed" : "collectFees", { amount: coin(c.amount, infos[c.i].decimals), symbol: infos[c.i].symbol })
              }
              disabled={!!busy}
              onClick={() => act(`${c.kind}-${c.i}`, (b) => (c.kind === "owed" ? b.collectOwed(address, c.i) : b.collectFees(address, c.i)))}
              chain="solana"
            />
          ))}
          {mine && mine.wrapped > ZERO && (
            <Button
              buttonText={busy === "unwrap" ? t("confirming") : t("unwrap", { amount: coin(mine.wrapped, 9) })}
              disabled={!!busy}
              onClick={() => act("unwrap", (b) => b.unwrapSol())}
              chain="solana"
            />
          )}
        </div>
      )}
    </div>
  );
}
