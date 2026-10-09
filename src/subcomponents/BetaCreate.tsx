"use client";

// Create a basket: up to 8 parts, each the network's coin, a vault receipt
// (vSOL), one of the RWA tokens Greatwall lists, another network's asset
// whose receipt is not made yet (E5), or any token by address, with what
// one whole BETA holds of it; and the creator's fee, on mint and burn alike
// (0 to 0.5%, fixed for good). The wallet's balance of each part is shown,
// since the first mint deposits exactly this mix. The creator names the
// token and describes it (E4): the name and symbol are the token's own;
// the description, links and image are stored by this site and the chain
// keeps their URL (/api/beta/metadata). The look is CreateIndex's.

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { ZeroAddress, isAddress, parseUnits } from "ethers";
import { BASKET_NAMING, createBasket } from "@ipow/sdk";

import { ConnectNetworkButton, TICKER, errorText, evmTxLink } from "./ipow/common";
import { deploymentOf, readProvider, type EvmChain } from "@/components/integrator/ipow/sdk";
import { balanceOf, tokenInfo, type TokenInfo } from "@/components/integrator/ipow/tokens";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import { crossChoicesOn, pairedWith, type CrossChoice } from "@/components/integrator/ipow/crossAssets";
import { PartPicker, pendingKey, type PickGroup, type PickItem } from "./ipow/PartPicker";
import { CreateIndex, FEE_MAX_BPS, limitsFor, storeMetadata, type IndexMeta, type Ingredient } from "./ipow/CreateIndex";
import { useUsdValue } from "./ipow/useUsdValue";
import { fromUnits } from "@/components/integrator/ipow/tunnel";
import { rememberBasket } from "@/components/integrator/ipow/basketList";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";

const MAX_PARTS = 8;

/** A token the picker offers. */
type Choice = {
  token: string;
  symbol: string;
  name: string;
  decimals: number;
  logo: string | any | null;
  about?: string;
  description?: string;
  from?: string;
  exists?: boolean;
};
type Part = {
  /** The token here; "" while being typed; "pending:<network>:<asset>" for a receipt not made yet (E5). */
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
/** A fee typed in basis points, 0 to 100, or null. */
const feeOk = (bps: number) => Number.isInteger(bps) && bps >= 0 && bps <= FEE_MAX_BPS;
const bytes = (v: string) => new TextEncoder().encode(v).length;
const EMPTY_META: IndexMeta = {
  name: "",
  symbol: "",
  description: "",
  website: "",
  twitter: "",
  telegram: "",
  image: null,
  imagePreview: null,
};
const linkOk = (v: string) => v === "" || /^https:\/\/\S+$/.test(v);

export default function BetaCreate({ chain }: { chain: EvmChain }) {
  const t = useTranslations("Beta");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const wallet = useEvmWallet(chain);
  const d = useMemo(() => deploymentOf(chain)!, [chain]);
  const prices = useUsdValue();
  const limits = limitsFor(BASKET_NAMING);

  const [parts, setParts] = useState<Part[]>([{ token: ZeroAddress, amount: "", info: null, error: null, balance: null }]);
  /** The row being chosen for; "new" for one made once a token is picked. */
  const [picking, setPicking] = useState<number | "new" | null>(null);
  const [cross, setCross] = useState<CrossChoice[]>([]);
  const [crossLoading, setCrossLoading] = useState(true);
  const [meta, setMetaState] = useState<IndexMeta>(EMPTY_META);
  const setMeta = (change: Partial<IndexMeta>) => setMetaState((m) => ({ ...m, ...change }));
  /** The creator's fee in basis points, on mint and burn alike. */
  const [feeBps, setFeeBps] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The other networks' assets as their receipts here (vSOL…), by the
  // original asset's name and logo; those not bridged yet are parts that
  // mint once bridged (E5).
  useEffect(() => {
    let live = true;
    setCrossLoading(true);
    crossChoicesOn(chain)
      .then((list) => live && setCross(list))
      .catch(() => live && setCross([]))
      .finally(() => live && setCrossLoading(false));
    return () => {
      live = false;
    };
  }, [chain]);

  const here: Choice[] = useMemo(
    () => [
      {
        token: ZeroAddress,
        symbol: TICKER[chain],
        name: wallet.networkName || chain,
        decimals: 18,
        logo: wallet.networkLogo ?? null,
      },
      ...rwaTokensOf(chain).map((r) => ({
        token: r.token,
        symbol: r.symbol,
        name: r.name,
        decimals: r.decimals,
        logo: r.logo ?? null,
        about: r.about,
        description: r.description,
      })),
    ],
    [chain, wallet.networkName, wallet.networkLogo],
  );
  const choices: Choice[] = useMemo(
    () => [
      ...here,
      ...cross
        .filter((c) => c.exists)
        .map((c) => ({
          token: c.token,
          symbol: c.symbol,
          name: c.name,
          decimals: c.decimals,
          logo: c.logo,
          from: c.from,
          exists: true,
        })),
    ],
    [here, cross],
  );
  /** The picker's networks: this one, then each paired one with its assets. */
  const nameOfChain = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
  const groups: PickGroup[] = useMemo(
    () => [
      {
        key: chain,
        label: wallet.networkName || nameOfChain(chain),
        logo: wallet.networkLogo ?? `/assets/networks/${chain}.png`,
        items: here,
      },
      ...pairedWith(chain).map((from) => ({
        key: from,
        label: nameOfChain(from),
        logo: `/assets/networks/${from}.png`,
        loading: crossLoading,
        items: cross
          .filter((c) => c.from === from)
          .map((c) => ({
            token: c.token,
            symbol: c.symbol,
            name: c.name,
            logo: c.logo,
            exists: c.exists,
            from: c.from,
            asset: c.asset,
          })),
      })),
    ],
    [here, cross, crossLoading, chain, wallet.networkName, wallet.networkLogo],
  );
  const choiceOf = (token: string) => choices.find((c) => c.token.toLowerCase() === token.toLowerCase()) ?? null;
  const pendingOf = (token: string): CrossChoice | null => (token.startsWith("pending:") ? (cross.find((c) => !c.exists && pendingKey(c.from, c.asset) === token) ?? null) : null);
  const itemOf = (p: Part): PickItem | null => {
    const pending = pendingOf(p.token);
    if (pending)
      return {
        token: p.token,
        symbol: pending.symbol,
        name: pending.name,
        logo: pending.logo,
        exists: false,
      };
    const c = choiceOf(p.token);
    if (c)
      return {
        token: c.token,
        symbol: c.symbol,
        name: c.from ? `${c.name} · ${nameOfChain(c.from)}` : c.name,
        logo: c.logo,
      };
    return p.info ? { token: p.token, symbol: p.info.symbol, name: p.token, logo: null } : null;
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
        ? Promise.resolve({
            address: p.token,
            symbol: known.symbol,
            decimals: known.decimals,
          })
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
  const pick = (i: number | "new", token: string) => {
    const pending = pendingOf(token);
    const made = cross.find((c) => c.exists && c.token.toLowerCase() === token.toLowerCase());
    const via = pending ?? made;
    // A receipt, made or not, is recorded by its asset (E5); its symbol and
    // decimals are known from the vault, so it needs no reading.
    const change = {
      token,
      info: via ? { address: token, symbol: via.symbol, decimals: via.decimals } : null,
      error: null,
      balance: null,
      receipts: via?.receipts ?? undefined,
      asset: via?.asset,
    };
    if (i === "new") setParts((all) => (all.length < MAX_PARTS ? [...all, { amount: "", ...change }] : all));
    else update(i, change);
    setPicking(null);
  };
  const remove = (i: number) => {
    setParts((all) => all.filter((_, j) => j !== i));
    setPicking((p) => (p === null || p === "new" ? p : p === i ? null : p > i ? p - 1 : p));
  };
  /** Opens the picker; the row appears once a token is picked. */
  const add = () => parts.length < MAX_PARTS && setPicking("new");

  const amounts = parts.map((p) => {
    if (!p.info) return null;
    try {
      const a = parseUnits(p.amount.trim() || "0", p.info.decimals);
      return a > BigInt(0) ? a : null;
    } catch {
      return null;
    }
  });
  const nameOk = bytes(meta.name.trim()) >= 1 && bytes(meta.name.trim()) <= limits.name;
  const symbolOk = bytes(meta.symbol.trim()) >= 1 && bytes(meta.symbol.trim()) <= limits.symbol;
  const linksOk = [meta.website, meta.twitter, meta.telegram].every(linkOk);
  const tokens = parts.map((p) => p.token.toLowerCase());
  const isPending = (p: Part) => p.token.startsWith("pending:");
  const problem =
    !nameOk || !symbolOk
      ? t("enterName")
      : !linksOk
        ? t("linkHttps")
        : parts.length === 0
          ? t("noIngredients")
          : parts.some((p) => (!isAddress(p.token) && !isPending(p)) || !p.info)
            ? t("pickTokens")
            : new Set(tokens).size !== tokens.length
              ? t("duplicateToken")
              : amounts.some((a) => a === null)
                ? t("enterAmounts")
                : !feeOk(feeBps)
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
      // The metadata and image, hosted here; the chain keeps the URL (E4).
      const { uri } = await storeMetadata(meta).catch((e) => {
        throw new Error(`${t("uploadFailed")}: ${errorText(e)}`);
      });
      // An id of the creator's own; the time keeps it new for each basket.
      const { key, txHash } = await createBasket(signer, d, {
        id: BigInt(Date.now()),
        name: meta.name.trim(),
        symbol: meta.symbol.trim(),
        uri,
        parts: parts.map((p, i) => (p.receipts ? { receipts: p.receipts, asset: p.asset, amount: amounts[i]! } : { token: p.token, amount: amounts[i]! })),
        mintFeeBps: feeBps,
        burnFeeBps: feeBps,
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
        { duration: 8000 },
      );
      router.push(`/${locale}/${chain}/index/${key}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const ingredients: Ingredient[] = parts.map((p, i) => {
    const from = pendingOf(p.token)?.from ?? choiceOf(p.token)?.from ?? null;
    // An asset Greatwall lists is priced by its symbol; one by address is not.
    const listed = !!(pendingOf(p.token) ?? choiceOf(p.token));
    return {
      key: String(i),
      item: itemOf(p),
      network: from ? `/assets/networks/${from}.png` : (wallet.networkLogo ?? `/assets/networks/${chain}.png`),
      amount: p.amount,
      decimals: p.info?.decimals,
      onAmount: (v) => update(i, { amount: v }),
      onRemove: () => remove(i),
      onPick: () => setPicking(i),
      // Priced by the asset's own symbol: ETH from Ethereum as ETH.
      valueUsd: listed && p.info && p.amount.trim() ? prices.valueOf(itemOf(p)?.symbol, p.amount) : null,
      priceUsd: listed && p.info ? prices.priceOf(itemOf(p)?.symbol) : null,
      customPrice: !listed,
      note: (
        <div className="flex flex-col gap-1">
          {p.error && <span className="text-red-500">{p.error}</span>}
          {p.info && owner && !isPending(p) && (
            <span className={p.balance === 0 ? "text-red-500" : ""}>
              {t("balanceLabel")}: {p.balance === null ? "…" : `${fmt(p.balance)} ${p.info.symbol}`}
              {p.balance === 0 ? ` — ${t("noBalance")}` : ""}
            </span>
          )}
        </div>
      ),
    };
  });
  const picker = picking === "new" || (picking !== null && parts[picking]) ? picking : null;
  const pickingPart = typeof picker === "number" ? parts[picker] : null;

  return (
    <>
      <PartPicker
        open={picker !== null}
        onClose={() => setPicking(null)}
        groups={groups}
        selected={pickingPart?.token ?? ""}
        taken={parts.filter((_, j) => j !== picker).map((q) => q.token)}
        onPick={(token) => picker !== null && pick(picker, token)}
        onByAddress={(address) => picker !== null && pick(picker, address)}
        labels={{
          title: t("pickToken"),
          subtitle: t("pickTokenText"),
          search: t("searchToken"),
          noneFound: t("noTokensFound"),
          byAddress: t("byAddress"),
          addressPlaceholder: t("tokenAddress"),
          add: t("addIngredient"),
          none: t("noneBridged"),
          about: t("aboutRwa"),
          close: t("closePicker"),
        }}
        note={t("pairNote", {
          network: wallet.networkName || nameOfChain(chain),
        })}
      />
      <CreateIndex
        meta={meta}
        setMeta={setMeta}
        ingredients={ingredients}
        onAdd={add}
        canAdd={parts.length < MAX_PARTS}
        fees={{ bps: feeBps, setBps: setFeeBps }}
        problem={problem}
        busy={busy}
        error={error}
        connected={wallet.connected}
        connectButton={<ConnectNetworkButton chain={chain} />}
        onSubmit={submit}
      />
    </>
  );
}
