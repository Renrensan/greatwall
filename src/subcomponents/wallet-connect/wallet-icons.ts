import type { StaticImageData } from "next/image";
import { phantom, xverse, metamask, walletconnect, polkadot, talisman, subwallet, tronlink } from "@/index";
import type { BitcoinWalletType } from "@/components/bitcoin/config/type";
import type { EthereumWalletType } from "@/components/ethereum/config/type";
import type { HederaWalletType } from "@/components/hedera/config/type";
import type { PolkadotWalletType } from "@/components/polkadot/config/type";
import type { TronWalletType } from "@/components/tron/config/type";
import type { HyperliquidWalletType } from "@/components/hyperliquid/config/type";
import type { RobinhoodWalletType } from "@/components/robinhood/config/type";
import type { BaseWalletType } from "@/components/base/config/type";
import type { ArbitrumWalletType } from "@/components/arbitrum/config/type";

/**
 * Universal rule across every chain: an injected/expected wallet shows its own
 * bundled icon; anything connected via WalletConnect shows the generic WalletConnect
 * icon, regardless of which wallet the user picked inside that modal. Polkadot has no
 * WalletConnect path today, so all three of its wallet types get their own icon.
 */
export const BITCOIN_WALLET_ICONS: Record<BitcoinWalletType, StaticImageData> = {
  phantom,
  xverse,
  walletconnect,
};

export const ETHEREUM_WALLET_ICONS: Record<EthereumWalletType, StaticImageData> = {
  phantom,
  metamask,
  walletconnect,
};

export const HEDERA_WALLET_ICONS: Record<HederaWalletType, StaticImageData> = {
  metamask,
  walletconnect,
  walletconnect_evm: walletconnect,
};

export const POLKADOT_WALLET_ICONS: Record<PolkadotWalletType, StaticImageData> = {
  "polkadot-js": polkadot,
  talisman,
  "subwallet-js": subwallet,
};

export const TRON_WALLET_ICONS: Record<TronWalletType, StaticImageData> = {
  tronlink,
};

export const HYPERLIQUID_WALLET_ICONS: Record<HyperliquidWalletType, StaticImageData> = {
  metamask,
};

export const ROBINHOOD_WALLET_ICONS: Record<RobinhoodWalletType, StaticImageData> = {
  metamask,
};

export const BASE_WALLET_ICONS: Record<BaseWalletType, StaticImageData> = {
  metamask,
};

export const ARBITRUM_WALLET_ICONS: Record<ArbitrumWalletType, StaticImageData> = {
  metamask,
};

/** Solana's wallet list is dynamic (Wallet Standard), not a fixed union, so it resolves by name instead of a lookup table. */
export function getSolanaWalletIcon(name: string | null | undefined): StaticImageData {
  const lower = name?.toLowerCase() ?? "";
  if (lower.includes("walletconnect")) return walletconnect;
  return phantom;
}
