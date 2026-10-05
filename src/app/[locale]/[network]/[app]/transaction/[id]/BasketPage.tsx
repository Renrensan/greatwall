"use client";

// One basket: what one BETA holds now, the user's BETA, and minting and
// burning it. Burned BETA pays each part back, less the creator's burn fee;
// what a burner deferred, and the creator's fees, are collected here too.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Contract, parseUnits } from "ethers";
import { ABIS, burnBeta, collectFees, collectOwed, getBasket, mintBeta, quoteMint, type Basket, type MintQuote } from "@ipow/sdk";

import Button from "@/subcomponents/Button";
import { ComingSoon, ConnectNetworkButton, Field, Notice, Row, accentText, coin, errorText, evmTxLink, shortHash } from "@/subcomponents/ipow/common";
import { deploymentOf, isEvmChain, readProvider, type EvmChain } from "@/components/integrator/ipow/sdk";
import { balanceOf, tokenInfo, type TokenInfo } from "@/components/integrator/ipow/tokens";
import { crossChoicesOn, type CrossChoice } from "@/components/integrator/ipow/crossAssets";
import { isBasketKey, rememberBasket } from "@/components/integrator/ipow/basketList";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";
import SolanaBasketPage from "./SolanaBasketPage";

const ZERO = BigInt(0);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
/** One whole BETA in its smallest units (BetaBaskets.ONE). */
const ONE = BigInt(1_000_000_000);
const BPS = BigInt(10_000);

export default function BasketPage() {
  const { network } = useParams<{ network: string }>();
  if (network === "solana") return <SolanaBasketPage />;
  if (!isEvmChain(network)) return <ComingSoon network={network} app="beta" />;
  return <BasketView chain={network} />;
}

type Mine = { beta: bigint; parts: bigint[]; owed: bigint[]; fees: bigint[] };

function BasketView({ chain }: { chain: EvmChain }) {
  const t = useTranslations("Beta");
  const { locale, id: key } = useParams<{ locale: string; id: string }>();
  const wallet = useEvmWallet(chain);
  const d = useMemo(() => deploymentOf(chain)!, [chain]);
  const provider = readProvider(chain);

  const [basket, setBasket] = useState<Basket | null>(null);
  const [infos, setInfos] = useState<TokenInfo[]>([]);
  const [pending, setPending] = useState<CrossChoice[]>([]);
  const [mine, setMine] = useState<Mine | null>(null);
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
      const cross = b.parts.some((p) => !p.made) ? await crossChoicesOn(chain).catch(() => [] as CrossChoice[]) : [];
      setPending(cross);
      setInfos(
        await Promise.all(
          b.parts.map((p) => {
            if (p.made) return tokenInfo(chain, p.token);
            const c = cross.find((x) => x.asset === p.asset && x.receipts?.toLowerCase() === p.receipts.toLowerCase());
            return Promise.resolve({ address: "", symbol: c?.symbol ?? `v#${p.asset}`, decimals: c?.decimals ?? 9 });
          })
        )
      );
      setLoadError(null);
      rememberBasket(d.betaBaskets, key);
      if (wallet.address) {
        const c = new Contract(d.betaBaskets, ABIS.betaBaskets, provider);
        const who = wallet.address;
        const [beta, parts, owed, fees] = await Promise.all([
          balanceOf(chain, b.beta, who),
          Promise.all(b.parts.map((p) => (p.made ? balanceOf(chain, p.token, who) : Promise.resolve(ZERO)))),
          Promise.all(b.parts.map((_, i) => c.owed(key, who, i) as Promise<bigint>)),
          Promise.all(b.parts.map((_, i) => c.fees(key, who, i) as Promise<bigint>)),
        ]);
        setMine({ beta, parts, owed, fees });
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
  if (loadError && !basket) return <Notice text={loadError} error />;
  if (!basket || infos.length !== basket.parts.length) return <Notice text={t("loading")} />;

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
    ? t("enterBeta")
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
          ? t("notEnoughBeta")
          : burnOut && burnOut.some((o, i) => o === ZERO && basket.parts[i].held > ZERO)
            ? t("burnTooSmall")
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

  const accent = accentText(chain);
  const collectable = mine
    ? basket.parts.flatMap((_, i) => [
        ...(mine.owed[i] > ZERO ? [{ kind: "owed" as const, i, amount: mine.owed[i] }] : []),
        ...(mine.fees[i] > ZERO ? [{ kind: "fees" as const, i, amount: mine.fees[i] }] : []),
      ])
    : [];

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      <Link href={`/${locale}/${chain}/beta/baskets`} className="text-xs sm:text-sm opacity-70 hover:opacity-100">
        ← {t("backToBaskets")}
      </Link>

      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
        <p className="font-bold text-base sm:text-lg">
          {basket.name && basket.name !== "BETA" ? `${basket.name} (${basket.symbol})` : t("basketName", { id: String(basket.id) })} · {shortHash(key)}
        </p>
        <div className="flex flex-col gap-2 text-xs sm:text-sm">
          <p className="font-bold">{firstMint ? t("mixAtFirst") : t("oneBetaHolds")}</p>
          {basket.parts.map((p, i) => (
            <Row key={`${p.token}-${i}`} label={infos[i].symbol} value={coin(perBeta[i], infos[i].decimals)} />
          ))}
        </div>
        {basket.parts.some((p) => p.receipts !== ZERO_ADDRESS) && (
          <div className="flex flex-col gap-1 text-[11px] sm:text-xs opacity-70 border-t border-black/10 pt-3">
            {basket.parts.map((p, i) => {
              if (p.receipts === ZERO_ADDRESS) return null;
              const c = pending.find((x) => x.asset === p.asset && x.receipts?.toLowerCase() === p.receipts.toLowerCase());
              const from = c?.from ?? "solana";
              const fromName = from.charAt(0).toUpperCase() + from.slice(1);
              const vaults = d.vaults.some((v) => v.receipts.toLowerCase() === p.receipts.toLowerCase());
              // The Bridge app on Solana locks SOL only so far: a token's
              // receipt waits for that to be built.
              const canBridge = from !== "solana" || !c?.home;
              return (
                <p key={i} className={vaults ? "" : "text-red-600"}>
                  {t("receiptVia", { symbol: infos[i].symbol, network: fromName, n: p.asset })} {shortHash(p.receipts)} · {vaults ? t("receiptsIsVault") : t("receiptsNotVault")}
                  {!p.made && (
                    <>
                      {" · "}
                      {t("waitingBridge", { network: fromName })}
                      {canBridge ? (
                        <>
                          {" "}
                          <Link href={`/${locale}/${from}/bridge/send${c?.home ? `?token=${c.home}` : ""}`} className="underline">
                            {t("bridgeIt")}
                          </Link>
                        </>
                      ) : (
                        ` (${t("tokenBridgeSoon", { network: fromName })})`
                      )}
                    </>
                  )}
                </p>
              );
            })}
          </div>
        )}
        <div className="flex flex-col gap-2 text-xs sm:text-sm border-t border-black/10 pt-3">
          <Row label={t("supplyLabel")} value={`${coin(supply, 9)} BETA`} />
          {mine && <Row label={t("yourBeta")} value={`${coin(mine.beta, 9)} BETA`} bold />}
          <Row label={t("fees")} value={t("feesValue", { mint: basket.mintFeeBps / 100, burn: basket.burnFeeBps / 100 })} />
          <Row label={t("creator")} value={shortHash(basket.creator)} />
          <Row label={t("token")} value={shortHash(basket.beta)} />
          <Row label={t("key")} value={<span className="break-all">{key}</span>} />
        </div>
      </div>

      <div className="flex glass-card bgRound border-black/5">
        {(["mint", "burn"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`w-full p-3 rounded-full text-xs sm:text-sm transition-all ${side === s ? `font-bold ${accent} bg-black/5` : "font-medium opacity-70"}`}
          >
            {s === "mint" ? t("mintTab") : t("burnTab")}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex justify-end">
          <ConnectNetworkButton chain={chain} />
        </div>
        <Field label={side === "mint" ? t("youMint") : t("youBurn")} suffix="BETA" hint={firstMint && side === "mint" ? t("firstMintHint") : undefined}>
          <input
            id="beta-amount"
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            className={`w-full text-2xl sm:text-3xl font-bold bg-transparent outline-none ${accent}`}
          />
        </Field>

        {side === "mint" && quote && (
          <div className="flex flex-col gap-2 text-xs sm:text-sm">
            <p className="font-bold">{t("mintTakes")}</p>
            {quote.need.map((n, i) => (
              <Row
                key={i}
                label={infos[i].symbol}
                value={`${coin(n + quote.fee[i], infos[i].decimals)}${mine ? ` / ${coin(mine.parts[i], infos[i].decimals)}` : ""}`}
              />
            ))}
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
        {done && evmTxLink(chain, done) && (
          <a href={evmTxLink(chain, done)!} target="_blank" rel="noreferrer" className="text-xs sm:text-sm underline opacity-80">
            {t("doneTx")}
          </a>
        )}
        {!wallet.connected ? (
          <Button buttonText={t("connectFirst")} disabled chain={chain} />
        ) : (
          <Button
            buttonText={busy === side ? t("confirming") : (problem ?? (side === "mint" ? t("mintButton") : t("burnButton")))}
            disabled={!!busy || !!problem}
            onClick={() =>
              act(side, async () =>
                side === "mint" ? mintBeta(await signer(), d, await quoteMint(provider, d, key, amountUnits!)) : burnBeta(await signer(), d, key, amountUnits!)
              )
            }
            chain={chain}
          />
        )}
      </div>

      {collectable.length > 0 && (
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
              onClick={() =>
                act(`${c.kind}-${c.i}`, async () => (c.kind === "owed" ? collectOwed(await signer(), d, key, c.i) : collectFees(await signer(), d, key, c.i)))
              }
              chain={chain}
            />
          ))}
        </div>
      )}
    </div>
  );
}
