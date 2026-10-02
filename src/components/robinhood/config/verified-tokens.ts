// Empty for now — Robinhood Chain's main use case (tokenized equities/ETFs) involves
// RWA-issuance contracts specific to Robinhood's own registry, unlike a simple dominant
// stablecoin (USDT0 on Hyperliquid, USDT on Tron). Rather than guess at a tokenized-stock
// contract address, this starts native-ETH-only; add entries here once specific tokens are
// verified live (contract code + symbol()/decimals() via eth_call), same process used for
// every other chain's allowlist.
export interface VerifiedErc20Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}

export const VERIFIED_ERC20_TOKENS: Record<"mainnet" | "testnet", VerifiedErc20Token[]> = {
  mainnet: [],
  testnet: [],
};
