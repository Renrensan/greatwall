"use client";

// BETA on Solana: the baskets this browser knows, and creating one. A part
// is an SPL token: SOL (wrapped as it is minted), a vault receipt of an EVM
// network's coin (vETH…), or any token by its mint.

import { trackTx } from "@/components/ui/txToast";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseUnits } from "ethers";
import { SOLANA, SOLANA_BASKET_NAMING, WRAPPED_SOL, type SolanaBasket } from "@ipow/sdk";

import Button from "./Button";
import { SolanaConnectButton } from "./SolanaConnectButton";
import { Notice, coin, errorText, shortHash } from "./ipow/common";
import { solanaBeta } from "@/components/integrator/ipow/sdk";
import { solanaToken, type SolanaToken } from "@/components/integrator/ipow/solanaTokens";
import { rwaTokensOf, starterTokenOf } from "@/components/integrator/ipow/rwaTokens";
import { crossChoicesOn, pairedWith, type CrossChoice } from "@/components/integrator/ipow/crossAssets";
import { PartPicker, pendingKey, type PickGroup, type PickItem } from "./ipow/PartPicker";
import { CreateIndex, FEE_MAX_BPS, limitsFor, storeMetadata, type IndexMeta, type Ingredient } from "./ipow/CreateIndex";
import { useUsdValue } from "./ipow/useUsdValue";
import { isSolanaBasket, knownBaskets, rememberBasket } from "@/components/integrator/ipow/basketList";
import { useSolanaWallet } from "@/components/solana/solana-provider";

const MAX_PARTS = 8;
const PROGRAM = SOLANA.programs.betaBasket;

type Row = { address: string; basket: SolanaBasket | null; parts: SolanaToken[]; error?: string };

export function SolanaBaskets() {
  const t = useTranslations("Beta");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState("");

  useEffect(() => {
    let live = true;
    const reader = solanaBeta(null);
    Promise.all(
      knownBaskets(PROGRAM).map(async (address): Promise<Row> => {
        try {
          const basket = await reader.getBasket(address);
          return { address, basket, parts: await Promise.all(basket.parts.map((p) => solanaToken(p.mint))) };
        } catch (e) {
          return { address, basket: null, parts: [], error: errorText(e) };
        }
      })
    ).then((r) => live && setRows(r));
    return () => {
      live = false;
    };
  }, []);

  const valid = isSolanaBasket(open);
  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-3">
        <label htmlFor="beta-sol-open" className="text-[11px] sm:text-xs opacity-70">
          {t("openLabelSolana")}
        </label>
        <input
          id="beta-sol-open"
          type="text"
          placeholder={t("basketAddress")}
          value={open}
          onChange={(e) => setOpen(e.target.value)}
          className="w-full text-xs sm:text-sm font-bold bg-transparent outline-none"
        />
        <Button
          buttonText={valid ? t("openButton") : t("openHintSolana")}
          disabled={!valid}
          onClick={() => router.push(`/${locale}/solana/index/${open.trim()}`)}
          chain="solana"
        />
      </div>

      {!rows ? (
        <Notice text={t("loading")} />
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-2 text-center text-xs sm:text-sm">
          <p className="opacity-70">{t("noneKnown")}</p>
          <Link href={`/${locale}/solana/index/create`} className="font-bold underline">
            {t("createOne")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.address}>
              <Link
                href={`/${locale}/solana/index/${r.address}`}
                className="glass-card rounded-2xl p-4 flex flex-col gap-1 hover:opacity-90 transition-opacity"
              >
                <span className="font-bold text-sm sm:text-base">
                  {t("basketName", { id: r.basket ? String(r.basket.id) : "?" })} · {shortHash(r.address)}
                </span>
                {r.basket ? (
                  <span className="text-[11px] sm:text-xs opacity-70 tabular-nums">
                    {r.basket.parts.map((p, i) => `${coin(p.amount, r.parts[i].decimals)} ${r.parts[i].symbol}`).join(" + ")} {t("perBeta")} ·{" "}
                    {t("supply", { amount: coin(r.basket.supply, 9) })}
                  </span>
                ) : (
                  <span className="text-[11px] sm:text-xs text-red-500 break-words">{r.error}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Part = { mint: string; amount: string; info: SolanaToken | null; error: string | null };

export function SolanaBetaCreate() {
  const t = useTranslations("Beta");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const sol = useSolanaWallet();
  const prices = useUsdValue();
  const limits = limitsFor(SOLANA_BASKET_NAMING);
  // A new index starts with a test stock token, not SOL (starterTokenOf).
  const [parts, setParts] = useState<Part[]>([{ mint: starterTokenOf("solana")?.token ?? WRAPPED_SOL, amount: "", info: null, error: null }]);
  const [cross, setCross] = useState<CrossChoice[]>([]);
  const [crossLoading, setCrossLoading] = useState(true);
  /** The row being chosen for; "new" for one made once a token is picked. */
  const [picking, setPicking] = useState<number | "new" | null>(null);
  const [meta, setMetaState] = useState<IndexMeta>({
    name: "",
    symbol: "",
    description: "",
    website: "",
    twitter: "",
    telegram: "",
    image: null,
    imagePreview: null,
  });
  const setMeta = (change: Partial<IndexMeta>) => setMetaState((m) => ({ ...m, ...change }));
  /** The creator's fee in basis points, on mint and burn alike. */
  const [feeBps, setFeeBps] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The EVM networks' assets as their receipts here (vETH…), by the
  // original asset's name; those not bridged yet are parts that mint once
  // bridged (E5).
  useEffect(() => {
    let live = true;
    crossChoicesOn("solana")
      .then((list) => live && setCross(list))
      .catch(() => {})
      .finally(() => live && setCrossLoading(false));
    return () => {
      live = false;
    };
  }, []);

  const isPending = (mint: string) => cross.some((c) => !c.exists && c.token === mint);
  const mintsKey = parts.map((p) => p.mint).join(",");
  useEffect(() => {
    parts.forEach((p, i) => {
      if (!isSolanaBasket(p.mint) || isPending(p.mint)) return;
      solanaToken(p.mint)
        .then((info) => setParts((all) => all.map((q, j) => (j === i && q.mint === p.mint ? { ...q, info, error: null } : q))))
        .catch(() => setParts((all) => all.map((q, j) => (j === i && q.mint === p.mint ? { ...q, info: null, error: t("notATokenSolana") } : q))));
    });
  }, [mintsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (i: number, change: Partial<Part>) => setParts((all) => all.map((p, j) => (j === i ? { ...p, ...change } : p)));
  const amounts = parts.map((p) => {
    if (!p.info) return null;
    try {
      const a = parseUnits(p.amount.trim() || "0", p.info.decimals);
      return a > BigInt(0) ? a : null;
    } catch {
      return null;
    }
  });
  const feeOk = (bps: number) => Number.isInteger(bps) && bps >= 0 && bps <= FEE_MAX_BPS;
  const bytes = (v: string) => new TextEncoder().encode(v).length;
  const linkOk = (v: string) => v === "" || /^https:\/\/\S+$/.test(v);
  const nameOk = bytes(meta.name.trim()) >= 1 && bytes(meta.name.trim()) <= limits.name;
  const symbolOk = bytes(meta.symbol.trim()) >= 1 && bytes(meta.symbol.trim()) <= limits.symbol;
  const linksOk = [meta.website, meta.twitter, meta.telegram].every(linkOk);
  const problem =
    !nameOk || !symbolOk
      ? t("enterName")
      : !linksOk
        ? t("linkHttps")
        : parts.length === 0
          ? t("noIngredients")
          : parts.some((p) => !p.info)
            ? t("pickTokens")
            : new Set(parts.map((p) => p.mint)).size !== parts.length
              ? t("duplicateToken")
              : amounts.some((a) => a === null)
                ? t("enterAmounts")
                : !feeOk(feeBps)
                  ? t("badFees")
                  : null;

  async function submit() {
    const wallet = sol.getAnchorWallet();
    if (problem || !wallet) return;
    setBusy(true);
    setError(null);
    const send = async () => {
      // The metadata and image, hosted here; Token Metadata keeps the URL
      // (E4; 200 bytes at most, which the site's URLs are well within).
      const { uri } = await storeMetadata(meta).catch((e) => {
        throw new Error(`${t("uploadFailed")}: ${errorText(e)}`);
      });
      // An id of the creator's own; the time keeps it new for each basket.
      return solanaBeta(wallet).createBasket({
        id: BigInt(Date.now()),
        name: meta.name.trim(),
        symbol: meta.symbol.trim(),
        uri,
        parts: parts.map((p, i) => ({
          mint: p.mint,
          amount: amounts[i]!,
          pending: isPending(p.mint),
        })),
        mintFeeBps: feeBps,
        burnFeeBps: feeBps,
      });
    };
    const r = await trackTx("solana", `Create ${meta.symbol.trim() || "index"}`, send, (x) => x.signature);
    // A creation Solana confirmed after the client stopped waiting gives no
    // basket address here: the Explore page lists it.
    if (r.ok && !r.result) return router.push(`/${locale}/solana/index`);
    if (!r.ok || !r.result) {
      setError(r.ok ? null : r.error);
      setBusy(false);
      return;
    }
    rememberBasket(PROGRAM, r.result.basket);
    router.push(`/${locale}/solana/index/${r.result.basket}`);
  }

  const nameOfChain = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
  const here: PickItem[] = [
    {
      token: WRAPPED_SOL,
      symbol: "SOL",
      name: "Solana",
      logo: "/assets/networks/solana.png",
    },
    ...rwaTokensOf("solana").map((r) => ({
      token: r.token,
      symbol: r.symbol,
      name: r.name,
      logo: r.logo ?? null,
      about: r.about,
      description: r.description,
    })),
  ];
  const groups: PickGroup[] = [
    {
      key: "solana",
      label: "Solana",
      logo: "/assets/networks/solana.png",
      items: here,
    },
    ...pairedWith("solana").map((from) => ({
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
  ];
  const itemOf = (mint: string): PickItem | null => groups.flatMap((g) => g.items).find((it) => it.token === mint) ?? null;
  const pick = (i: number | "new", mint: string) => {
    // A receipt not made yet (E5): its mint is the vault's address for it,
    // its symbol and decimals known from the vault; the program records it
    // pending and reads it at the first mint.
    const pending = mint.startsWith("pending:") ? (cross.find((c) => !c.exists && pendingKey(c.from, c.asset) === mint) ?? null) : null;
    const change = pending
      ? { mint: pending.token, info: { mint: pending.token, symbol: pending.symbol, decimals: pending.decimals }, error: null }
      : { mint, info: null, error: null };
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

  const ingredients: Ingredient[] = parts.map((p, i) => {
    const known = itemOf(p.mint);
    const pendingItem = isPending(p.mint) ? (cross.find((c) => c.token === p.mint) ?? null) : null;
    const item: PickItem | null = known
      ? known
      : pendingItem
        ? {
            token: p.mint,
            symbol: pendingItem.symbol,
            name: pendingItem.name,
            logo: pendingItem.logo,
            exists: false,
          }
        : p.info
          ? { token: p.mint, symbol: p.info.symbol, name: p.mint, logo: null }
          : null;
    const from = cross.find((c) => c.token === p.mint)?.from ?? null;
    return {
      key: String(i),
      item,
      network: from ? `/assets/networks/${from}.png` : "/assets/networks/solana.png",
      amount: p.amount,
      decimals: p.info?.decimals,
      maxWhole: p.info ? Math.max(1, 19 - p.info.decimals) : 10,
      onAmount: (v) => update(i, { amount: v }),
      onRemove: () => remove(i),
      onPick: () => setPicking(i),
      // Priced by the asset's own symbol: ETH from Ethereum as ETH.
      // An asset Greatwall lists is priced by its symbol; one by mint is not.
      valueUsd: (known || pendingItem) && p.info && p.amount.trim() ? prices.valueOf(item?.symbol, p.amount) : null,
      priceUsd: (known || pendingItem) && p.info ? prices.priceOf(item?.symbol) : null,
      customPrice: !(known || pendingItem),
      note: (
        <div className="flex flex-col gap-1">
          {p.error && <span className="text-red-500">{p.error}</span>}
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
        selected={pickingPart?.mint ?? ""}
        taken={parts.filter((_, j) => j !== picker).map((q) => q.mint)}
        onPick={(mint) => picker !== null && pick(picker, mint)}
        onByAddress={(address) => picker !== null && pick(picker, address)}
        labels={{
          title: t("pickToken"),
          subtitle: t("pickTokenText"),
          search: t("searchToken"),
          noneFound: t("noTokensFound"),
          byAddress: t("byAddress"),
          addressPlaceholder: t("tokenMint"),
          add: t("addIngredient"),
          none: t("noneBridged"),
          about: t("aboutRwa"),
          close: t("closePicker"),
        }}
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
        connected={sol.connected}
        connectButton={<SolanaConnectButton />}
        onSubmit={submit}
      />
    </>
  );
}
