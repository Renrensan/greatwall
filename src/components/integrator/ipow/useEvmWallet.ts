"use client";

// The wallet of the EVM network an app runs on, and the Bitcoin wallet. Every hook is called on each render (React's rule); the
// one for the current network is picked.

import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";

import type { EvmChain } from "./sdk";

export function useEvmWallet(chain: EvmChain | null) {
  const wallets = {
    ethereum: useEthereumWallet(),
    base: useBaseWallet(),
    robinhood: useRobinhoodWallet(),
    hyperliquid: useHyperliquidWallet(),
  };
  const bitcoin = useBitcoinWallet();
  const w = chain ? wallets[chain] : null;
  return {
    connected: Boolean(w?.connected),
    address: (w?.address as string | null) ?? null,
    currencyTicker: (w?.currencyTicker as string | undefined) ?? "",
    networkName: (w?.networkName as string | undefined) ?? "",
    networkLogo: w?.networkLogo,
    getSigner: w?.getSigner,
    bitcoin: {
      connected: Boolean(bitcoin.connected),
      address: (bitcoin.address as string | null) ?? null,
      /** Pays `btc` (in BTC) to a Bitcoin address; the txid, or null. */
      pay: (to: string, btc: number) => bitcoin.sendTokenTo(to, btc),
    },
  };
}
