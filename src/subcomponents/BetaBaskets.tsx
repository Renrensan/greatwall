"use client";

// The baskets this browser knows (made or opened here), and a box to open
// one by its key.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getBasket, type Basket } from "@ipow/sdk";

import Button from "./Button";
import { Notice, accentText, coin, errorText, shortHash } from "./ipow/common";
import { deploymentOf, readProvider, type EvmChain } from "@/components/integrator/ipow/sdk";
import { tokenInfo, type TokenInfo } from "@/components/integrator/ipow/tokens";
import { isBasketKey, knownBaskets } from "@/components/integrator/ipow/basketList";

type Row = { key: string; basket: Basket | null; parts: TokenInfo[]; error?: string };

export default function BetaBaskets({ chain }: { chain: EvmChain }) {
  const t = useTranslations("Beta");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const d = useMemo(() => deploymentOf(chain)!, [chain]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState("");

  useEffect(() => {
    let live = true;
    const keys = knownBaskets(d.betaBaskets);
    Promise.all(
      keys.map(async (key): Promise<Row> => {
        try {
          const basket = await getBasket(readProvider(chain), d, key);
          const parts = await Promise.all(basket.parts.map((p) => tokenInfo(chain, p.token)));
          return { key, basket, parts };
        } catch (e) {
          return { key, basket: null, parts: [], error: errorText(e) };
        }
      })
    ).then((r) => live && setRows(r));
    return () => {
      live = false;
    };
  }, [chain, d]);

  const go = (key: string) => router.push(`/${locale}/${chain}/index/${key.trim()}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-3">
        <label htmlFor="beta-open" className="text-[11px] sm:text-xs opacity-70">
          {t("openLabel")}
        </label>
        <input
          id="beta-open"
          type="text"
          placeholder="0x…"
          value={open}
          onChange={(e) => setOpen(e.target.value)}
          className="w-full text-xs sm:text-sm font-bold bg-transparent outline-none"
        />
        <Button buttonText={isBasketKey(open) ? t("openButton") : t("openHint")} disabled={!isBasketKey(open)} onClick={() => go(open)} chain={chain} />
      </div>

      {!rows ? (
        <Notice text={t("loading")} />
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-2 text-center text-xs sm:text-sm">
          <p className="opacity-70">{t("noneKnown")}</p>
          <Link href={`/${locale}/${chain}/index/create`} className={`font-bold ${accentText(chain)}`}>
            {t("createOne")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.key}>
              <Link
                href={`/${locale}/${chain}/index/${r.key}`}
                className="glass-card rounded-2xl p-4 flex flex-col gap-1 hover:opacity-90 transition-opacity"
              >
                <span className="font-bold text-sm sm:text-base">
                  {r.basket && r.basket.name && r.basket.name !== "BETA" ? `${r.basket.name} (${r.basket.symbol})` : t("basketName", { id: r.basket ? String(r.basket.id) : "?" })} · {shortHash(r.key)}
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
