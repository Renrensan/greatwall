import type { SupportedChain } from "@/app/network-provider";

/** The convert screens' own numbers for networks (their `ipowNetworkId`). */
export const UI_NETWORK_IDS: Partial<Record<SupportedChain, number>> = {
  bitcoin: 0,
  hedera: 1,
  ethereum: 2,
  solana: 3,
  polkadot: 4,
  base: 5,
  robinhood: 6,
  hyperliquid: 7,
  tempo: 9,
};
