"use client";

// Create a basket: up to 8 parts, each the network's coin, a vault receipt
// (vSOL), one of the RWA tokens Greatwall lists, or any token by address,
// with what one whole BETA holds of it; and the creator's mint and burn
// fees (at most 1% each, fixed for good). The wallet's balance of each
// part is shown, since the first mint deposits exactly this mix. The
// creator names the token and describes it (E4): the name and symbol are
// the token's own; the description and image go in a metadata URI, written
// here as a data URI so that nothing is hosted.

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { ZeroAddress, isAddress, parseUnits } from "ethers";
import { BASKET_NAMING, createBasket } from "@ipow/sdk";

import Button from "./Button";
import { ConnectNetworkButton, Field, TICKER, errorText, evmTxLink } from "./ipow/common";
import { deploymentOf, readProvider, type EvmChain } from "@/components/integrator/ipow/sdk";
import { balanceOf, tokenInfo, type TokenInfo } from "@/components/integrator/ipow/tokens";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import { crossChoicesOn, pairedWith, type CrossChoice } from "@/components/integrator/ipow/crossAssets";
import { PartButton, PartLogo, PartPicker, type PickGroup } from "./ipow/PartPicker";
import { fromUnits } from "@/components/integrator/ipow/tunnel";
import { rememberBasket } from "@/components/integrator/ipow/basketList";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";

const MAX_PARTS = 8;
const MAX_FEE_BPS = 100;
const FEE_PRESETS = ["0", "0.25", "0.5", "1"];

/** A token the picker offers. */
type Choice = { token: string; symbol: string; name: string; decimals: number; logo: string | any | null; about?: string; from?: string; exists?: boolean };
type Part = {
  /** The token here; "" while being typed; "pending:<symbol>" for a receipt not made yet (E5). */
  token: string;
  amount: string;
  info: TokenInfo | null;
  error: string | null;
  balance: number | null;
  /** For a part that is another network's asset: the vault's receipts contract and the asset's number (E5). */
  receipts?: string;
  asset?: number;
};

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });
/** A fee typed as a percentage (0 to 1, two decimals) in basis points, or null. */
const bps = (pct: string): number | null => {
  const s = pct.trim();
  if (!/^\d*\.?\d{0,2}$/.test(s) || s === "" || s === ".") return null;
  const n = Math.round(Number(s) * 100);
  return n >= 0 && n <= MAX_FEE_BPS ? n : null;
};

function FeeField({ label, value, onChange, id }: { label: string; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Field label={label} suffix="%">
        <input id={id} type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(",", "."))} className="w-full text-xl font-bold bg-transparent outline-none" />
      </Field>
      <div className="flex gap-2">
        {FEE_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${value === p ? "bg-ink text-snow" : "bg-black/5 hover:bg-black/10"}`}
          >
            {p}%
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BetaCreate({ chain }: { chain: EvmChain }) {
  const t = useTranslations("Beta");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const wallet = useEvmWallet(chain);
  const d = useMemo(() => deploymentOf(chain)!, [chain]);

  const [parts, setParts] = useState<Part[]>([{ token: ZeroAddress, amount: "", info: null, error: null, balance: null }]);
  const [picking, setPicking] = useState<number | null>(null);
  const [cross, setCross] = useState<CrossChoice[]>([]);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [mintFee, setMintFee] = useState("0");
  const [burnFee, setBurnFee] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The other networks' assets as their receipts here (vSOL…), by the
  // original asset's name and logo; those not bridged yet cannot be parts.
  useEffect(() => {
    let live = true;
    crossChoicesOn(chain)
      .then((list) => live && setCross(list))
      .catch(() => live && setCross([]));
    return () => {
      live = false;
    };
  }, [chain]);

  const here: Choice[] = useMemo(
    () => [
      { token: ZeroAddress, symbol: TICKER[chain], name: wallet.networkName || chain, decimals: 18, logo: wallet.networkLogo ?? null },
      ...rwaTokensOf(chain).map((r) => ({ token: r.token, symbol: r.symbol, name: r.name, decimals: r.decimals, logo: r.logo ?? null, about: r.about })),
    ],
    [chain, wallet.networkName, wallet.networkLogo]
  );
  const choices: Choice[] = useMemo(
    () => [...here, ...cross.filter((c) => c.exists).map((c) => ({ token: c.token, symbol: c.symbol, name: c.name, decimals: c.decimals, logo: c.logo, from: c.from, exists: true }))],
    [here, cross]
  );
  /** The picker's networks: this one, then each paired one with its assets. */
  const nameOfChain = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
  const groups: PickGroup[] = useMemo(
    () => [
      { key: chain, label: wallet.networkName || nameOfChain(chain), logo: wallet.networkLogo ?? `/assets/networks/${chain}.png`, items: here },
      ...pairedWith(chain).map((from) => ({
        key: from,
        label: nameOfChain(from),
        logo: `/assets/networks/${from}.png`,
        items: cross.filter((c) => c.from === from).map((c) => ({ token: c.token, symbol: c.symbol, name: c.name, logo: c.logo, exists: c.exists })),
      })),
    ],
    [here, cross, chain, wallet.networkName, wallet.networkLogo]
  );
  const choiceOf = (token: string) => choices.find((c) => c.token.toLowerCase() === token.toLowerCase()) ?? null;
  const pendingOf = (token: string): CrossChoice | null => (token.startsWith("pending:") ? cross.find((c) => !c.exists && `pending:${c.symbol}` === token) ?? null : null);
  const asChoice = (p: Part): Choice | null => {
    const pending = pendingOf(p.token);
    if (pending) return { token: p.token, symbol: pending.symbol, name: `${pending.name} · ${t("notBridgedYet")}`, decimals: pending.decimals, logo: pending.logo, from: pending.from, exists: false };
    return choiceOf(p.token) ?? (p.info ? { token: p.token, symbol: p.info.symbol, name: p.token, decimals: p.info.decimals, logo: null } : null);
  };

  // Each part's symbol and decimals once its address is whole, and the
  // wallet's balance of it.
  const tokensKey = parts.map((p) => p.token).join(",");
  const owner = wallet.connected ? wallet.address : null;
  useEffect(() => {
    parts.forEach((p, i) => {
      if (!isAddress(p.token)) return;
      const known = choiceOf(p.token);
      const infoP: Promise<TokenInfo> = known
        ? Promise.resolve({ address: p.token, symbol: known.symbol, decimals: known.decimals })
        : tokenInfo(chain, p.token);
      infoP
        .then(async (info) => {
          let balance: number | null = null;
          if (owner) {
            try {
              const units = p.token === ZeroAddress ? await readProvider(chain).getBalance(owner) : await balanceOf(chain, p.token, owner);
              balance = fromUnits(units, info.decimals);
            } catch {
              balance = null;
            }
          }
          setParts((all) => all.map((q, j) => (j === i && q.token === p.token ? { ...q, info, error: null, balance } : q)));
        })
        .catch(() => setParts((all) => all.map((q, j) => (j === i && q.token === p.token ? { ...q, info: null, error: t("notAToken"), balance: null } : q))));
    });
  }, [tokensKey, chain, owner]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (i: number, change: Partial<Part>) => setParts((all) => all.map((p, j) => (j === i ? { ...p, ...change } : p)));
  const pick = (i: number, token: string) => {
    const pending = pendingOf(token);
    const made = cross.find((c) => c.exists && c.token.toLowerCase() === token.toLowerCase());
    const via = pending ?? made;
    // A receipt, made or not, is recorded by its asset (E5); its symbol and
    // decimals are known from the vault, so it needs no reading.
    update(i, {
      token,
      info: via ? { address: token, symbol: via.symbol, decimals: via.decimals } : null,
      error: null,
      balance: null,
      receipts: via?.receipts ?? undefined,
      asset: via?.asset,
    });
    setPicking(null);
  };

  const amounts = parts.map((p) => {
    if (!p.info) return null;
    try {
      const a = parseUnits(p.amount.trim() || "0", p.info.decimals);
      return a > BigInt(0) ? a : null;
    } catch {
      return null;
    }
  });
  /** The token's metadata (E4), as token metadata JSON is read, in a data URI. */
  const metadataUri = useMemo(() => {
    const meta: Record<string, string> = { name: name.trim(), symbol: symbol.trim() };
    if (description.trim()) meta.description = description.trim();
    if (image.trim()) meta.image = image.trim();
    return `data:application/json;base64,${btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(meta))))}`;
  }, [name, symbol, description, image]);
  const bytes = (v: string) => new TextEncoder().encode(v).length;
  const nameOk = bytes(name.trim()) >= 1 && bytes(name.trim()) <= BASKET_NAMING.name;
  const symbolOk = bytes(symbol.trim()) >= 1 && bytes(symbol.trim()) <= BASKET_NAMING.symbol;
  const uriOk = bytes(metadataUri) <= BASKET_NAMING.uri;
  const tokens = parts.map((p) => p.token.toLowerCase());
  const isPending = (p: Part) => p.token.startsWith("pending:");
  const problem = !nameOk || !symbolOk
    ? t("enterName")
    : !uriOk
      ? t("descriptionTooLong")
      : parts.some((p) => (!isAddress(p.token) && !isPending(p)) || !p.info)
    ? t("pickTokens")
    : new Set(tokens).size !== tokens.length
      ? t("duplicateToken")
      : amounts.some((a) => a === null)
        ? t("enterAmounts")
        : bps(mintFee) === null || bps(burnFee) === null
          ? t("badFees")
          : null;

  async function submit() {
    if (problem || !wallet.getSigner) return;
    setBusy(true);
    setError(null);
    try {
      const signer = await wallet.getSigner();
      const onChain = (await signer.provider?.getNetwork())?.chainId;
      if (onChain !== undefined && onChain !== BigInt(d.chainId)) throw new Error(t("wrongNetwork"));
      // An id of the creator's own; the time keeps it new for each basket.
      const { key, txHash } = await createBasket(signer, d, {
        id: BigInt(Date.now()),
        name: name.trim(),
        symbol: symbol.trim(),
        uri: metadataUri,
        parts: parts.map((p, i) => (p.receipts ? { receipts: p.receipts, asset: p.asset, amount: amounts[i]! } : { token: p.token, amount: amounts[i]! })),
        mintFeeBps: bps(mintFee)!,
        burnFeeBps: bps(burnFee)!,
      });
      rememberBasket(d.betaBaskets, key);
      const url = evmTxLink(chain, txHash);
      toast.success(
        <span>
          {t("createdToast")}
          {url && (
            <>
              {" · "}
              <a href={url} target="_blank" rel="noreferrer" className="underline font-semibold">
                {t("viewTx")}
              </a>
            </>
          )}
        </span>,
        { duration: 8000 }
      );
      router.push(`/${locale}/${chain}/beta/transaction/${key}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs sm:text-sm opacity-70">{t("wallet")}</span>
        <ConnectNetworkButton chain={chain} />
      </div>

      {/* The token's name and what it is. */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
        <p className="text-xs sm:text-sm opacity-70">{t("namingExplainer")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(0,160px)] gap-4">
          <Field label={t("tokenName")} hint={`${bytes(name)}/${BASKET_NAMING.name}`}>
            <input id="beta-name" type="text" maxLength={BASKET_NAMING.name} placeholder={t("tokenNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} className="w-full text-base font-bold bg-transparent outline-none" />
          </Field>
          <Field label={t("tokenSymbol")} hint={`${bytes(symbol)}/${BASKET_NAMING.symbol}`}>
            <input id="beta-symbol" type="text" maxLength={BASKET_NAMING.symbol} placeholder="GTB" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/\s+/g, ""))} className="w-full text-base font-bold bg-transparent outline-none uppercase" />
          </Field>
        </div>
        <Field label={t("tokenDescription")} hint={t("tokenDescriptionHint")}>
          <textarea id="beta-description" rows={3} placeholder={t("tokenDescriptionPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full text-sm bg-transparent outline-none resize-y" />
        </Field>
        <Field label={t("tokenImage")} hint={t("tokenImageHint")}>
          <input id="beta-image" type="url" placeholder="https://…/logo.png" value={image} onChange={(e) => setImage(e.target.value.trim())} className="w-full text-sm bg-transparent outline-none font-mono" />
        </Field>
      </div>

      {/* The parts. */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-5">
        <p className="text-xs sm:text-sm opacity-70">{t("partsExplainer")}</p>
        {parts.map((p, i) => {
          const c = choiceOf(p.token);
          const custom = isAddress(p.token) ? !c : p.token !== "";
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

              {/* The token: a picker over what Greatwall knows, or an address. */}
              <PartButton
                item={asChoice(p)}
                placeholder={t("pickToken")}
                subtitle={isAddress(p.token) ? p.token : t("byAddress")}
                open={picking === i}
                onClick={() => setPicking(picking === i ? null : i)}
                chooseLabel={t("chooseLabel")}
              />
              {picking === i && (
                <PartPicker
                  groups={groups}
                  selected={p.token}
                  taken={parts.filter((_, j) => j !== i).map((q) => q.token)}
                  onPick={(token) => pick(i, token)}
                  onByAddress={() => pick(i, "")}
                  labels={{ byAddress: t("byAddress"), notBridgedYet: t("notBridgedYet"), none: t("noneBridged") }}
                  note={t("pairNote", { network: wallet.networkName || nameOfChain(chain) })}
                />
              )}
              {custom && (
                <input
                  id={`beta-part-${i}-address`}
                  type="text"
                  placeholder={t("tokenAddress")}
                  value={p.token}
                  onChange={(e) => update(i, { token: e.target.value.trim(), info: null, error: null, balance: null })}
                  className="w-full text-xs sm:text-sm font-bold bg-transparent outline-none font-mono"
                />
              )}
              {p.error && <span className="text-[11px] text-red-500">{p.error}</span>}

              {/* What one BETA holds of it, and what the wallet has. */}
              <Field label={t("perWholeBeta")} suffix={p.info?.symbol ?? ""}>
                <input
                  id={`beta-part-${i}-amount`}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={p.amount}
                  onChange={(e) => update(i, { amount: e.target.value.replace(",", ".") })}
                  className="w-full text-xl font-bold bg-transparent outline-none"
                />
              </Field>
              {p.info && owner && isPending(p) && <span className="text-[11px] opacity-60">{t("pendingPartHint")}</span>}
              {p.info && owner && !isPending(p) && (
                <span className={`text-[11px] ${p.balance === 0 ? "text-red-500" : "opacity-60"}`}>
                  {t("balanceLabel")}: {p.balance === null ? "…" : `${fmt(p.balance)} ${p.info.symbol}`}
                  {p.balance === 0 ? ` — ${t("noBalance")}` : ""}
                </span>
              )}
            </div>
          );
        })}
        {parts.length < MAX_PARTS && (
          <button
            type="button"
            onClick={() => setParts((all) => [...all, { token: "", amount: "", info: null, error: null, balance: null }])}
            className="text-xs sm:text-sm font-bold opacity-80 hover:opacity-100 text-left"
          >
            + {t("addPart")}
          </button>
        )}
      </div>

      {/* The creator's fees. */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FeeField id="beta-mint-fee" label={t("mintFee")} value={mintFee} onChange={setMintFee} />
          <FeeField id="beta-burn-fee" label={t("burnFee")} value={burnFee} onChange={setBurnFee} />
        </div>
        <span className="text-[10px] sm:text-xs opacity-60">{t("feePercentHint")}</span>
      </div>

      {/* What is being made. */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {image.trim() ? <img src={image.trim()} alt="" className="w-10 h-10 rounded-full object-cover border border-black/10" /> : <span className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-sm font-bold opacity-50">{symbol.trim().charAt(0) || "?"}</span>}
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-bold">{name.trim() || t("tokenNamePlaceholder")}{symbol.trim() ? ` (${symbol.trim()})` : ""}</span>
            {description.trim() && <span className="text-[11px] opacity-60 break-words">{description.trim()}</span>}
          </div>
        </div>
        <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{t("previewTitle")}</span>
        {parts.some((p, i) => p.info && amounts[i]) ? (
          <div className="flex flex-col gap-2">
            {parts.map((p, i) =>
              p.info && amounts[i] ? (
                <div key={i} className="flex items-center gap-3">
                  <PartLogo item={asChoice(p)} size={24} />
                  <span className="font-bold tabular-nums">
                    {fmt(fromUnits(amounts[i]!, p.info.decimals))} {p.info.symbol}
                  </span>
                  <span className="text-[11px] opacity-50 truncate">{choiceOf(p.token)?.name ?? ""}</span>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <span className="text-xs opacity-60">{t("previewEmpty")}</span>
        )}
        <div className="flex justify-between text-xs pt-2 border-t border-black/10">
          <span className="opacity-70">{t("previewFees")}</span>
          <span className="tabular-nums">
            {t("mintFee")} {bps(mintFee) === null ? "?" : `${(bps(mintFee)! / 100).toFixed(2)}%`} · {t("burnFee")} {bps(burnFee) === null ? "?" : `${(bps(burnFee)! / 100).toFixed(2)}%`}
          </span>
        </div>
      </div>

      {error && <p className="text-xs sm:text-sm text-red-500 break-words">{error}</p>}

      {!wallet.connected ? (
        <Button buttonText={t("connectFirst")} disabled chain={chain} />
      ) : (
        <Button buttonText={busy ? t("confirming") : (problem ?? t("createButton"))} disabled={busy || !!problem} onClick={submit} chain={chain} />
      )}
    </div>
  );
}
