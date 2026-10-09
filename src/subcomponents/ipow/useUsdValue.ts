"use client";

// What an amount of an asset is worth in dollars, as the Create page shows
// it beside each part: a network coin at its market price (CoinGecko,
// through /api/prices), a mock RWA token at its reference price
// (referencePrices.ts). Looked up by the asset's own symbol, so another
// network's asset (ETH from Ethereum, GLDx from Base) is priced as itself.
// Null for an asset with no price, or an amount that is not a plain decimal.

import { useEffect, useState } from "react";

import { coinPrices } from "@/components/integrator/ipow/coinPrices";
import { REFERENCE_USD } from "@/components/integrator/ipow/referencePrices";

export function useUsdValue() {
  const [market, setMarket] = useState<Record<string, number>>({});
  useEffect(() => {
    let live = true;
    // Until the coins' prices come (CoinGecko can be slow or refuse a while).
    const read = () =>
      coinPrices().then((p) => {
        if (!live) return;
        setMarket(p ?? {});
        if (!p || !Object.keys(p).length) setTimeout(read, 6_000);
      });
    read();
    return () => {
      live = false;
    };
  }, []);

  /** One whole `symbol` in dollars, or null. */
  const priceOf = (symbol: string | undefined | null): number | null => {
    if (!symbol) return null;
    const p = market[symbol] ?? REFERENCE_USD[symbol];
    return p > 0 ? p : null;
  };
  /** `amount` (a decimal string) of `symbol` in dollars, or null. */
  const valueOf = (symbol: string | undefined | null, amount: string): number | null => {
    const a = amount.trim();
    // A plain decimal, as parseUnits takes it; not 1e3 or 0x10.
    if (!/^\d*\.?\d*$/.test(a) || a === "" || a === ".") return null;
    const p = priceOf(symbol);
    return p === null ? null : Number(a) * p;
  };
  return { priceOf, valueOf };
}
