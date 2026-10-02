import type { SupportedChain } from "@/app/network-provider";

/**
 * Fixed order for the convert app's chain pickers. Single source of truth so
 * ConvertToken.tsx and the provider composer can't drift apart.
 */
export const CONVERT_NETWORK_ORDER: readonly SupportedChain[] = [
  "bitcoin",
  "hedera",
  "ethereum",
  "solana",
  "polkadot",
  "tron",
  "hyperliquid",
  "robinhood",
  "base",
];

/**
 * Resolves convert's effective `toChain` given the current `fromChain` and the
 * raw `?to=` query param: use `to` if it's a valid, distinct chain, otherwise
 * fall back to the first entry in CONVERT_NETWORK_ORDER that isn't fromChain.
 */
export function resolveToChain(
  fromChain: SupportedChain,
  rawTo: string | null,
): SupportedChain {
  if (
    rawTo &&
    CONVERT_NETWORK_ORDER.includes(rawTo as SupportedChain) &&
    rawTo !== fromChain
  ) {
    return rawTo as SupportedChain;
  }
  return CONVERT_NETWORK_ORDER.find((c) => c !== fromChain)!;
}
