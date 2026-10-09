// The network coins' market prices in dollars (BTC, ETH, SOL, HYPE), from the
// app's own /api/prices route (CoinGecko, kept a minute there). One read is
// shared by every caller and kept a minute here too, or 5 seconds when
// nothing came.

let coins: Promise<Record<string, number>> | null = null;

export const coinPrices = (): Promise<Record<string, number>> => {
  if (!coins) {
    coins = fetch("/api/prices")
      .then((r) => r.json())
      .catch(() => ({}));
    coins.then((p) => setTimeout(() => (coins = null), p && Object.keys(p).length ? 60_000 : 5_000));
  }
  return coins;
};

/** A network's native coin at its market price, as the wallet providers
 *  publish it (`price.usd`); null when there is no price for `symbol`. */
export async function nativeUsdPrice(symbol: string): Promise<{ usd: number } | null> {
  const usd = (await coinPrices())?.[symbol];
  return usd > 0 ? { usd } : null;
}
