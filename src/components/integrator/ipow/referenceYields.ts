// Reference yields, as a yearly percentage, of the real assets Greatwall's
// mock RWA tokens stand in for: each asset's 30-day APY on rwa.xyz (the
// page its `about` links to), read 2026-10-10. Only assets rwa.xyz shows a
// yield for are listed; any other part (a stock, gold, a plain stablecoin)
// counts as 0%. The test tokens themselves accrue nothing: these say what
// the real assets earn. Keyed by symbol, like REFERENCE_USD.

export const REFERENCE_APY: Record<string, number> = {
  // Base
  JTRSY: 3.27, USTBL: 3.42, GLDY: 3.5,
  // Hyperliquid
  thBILL: 2.25,
  // Solana
  ONyc: 10.64,
  // Tempo
  USDY: 3.59, syrupUSDC: 4.16,
};

export const YIELDS_AS_OF = "Oct 10, 2026";

/**
 * An index's yearly yield: its parts' reference yields weighted by what each
 * is worth in one token. Null when a part has no value (it can't be weighed),
 * or the token is worth nothing.
 */
export function weightedApy(parts: { symbol: string; valueUsd: number | null }[]): number | null {
  let total = 0;
  let earning = 0;
  for (const p of parts) {
    if (p.valueUsd === null) return null;
    total += p.valueUsd;
    earning += p.valueUsd * (REFERENCE_APY[p.symbol] ?? 0);
  }
  return total > 0 ? earning / total : null;
}

/** A yield as shown: two decimals, "0%" when none. */
export const apyText = (apy: number) => (apy === 0 ? "0%" : `${apy.toFixed(2)}%`);
