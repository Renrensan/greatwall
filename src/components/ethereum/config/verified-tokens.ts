// A small, hand-curated allowlist rather than a full external token list (e.g. Uniswap's,
// which has thousands of entries) — there's no ERC-20 equivalent of Solana's
// getTokenAccountsByOwner that returns only what a wallet actually holds, so checking a
// large generic list would mean one balanceOf call per candidate token. Keeping this list
// small keeps the multicall batch (see fetchErc20Balances in ethereum-provider.tsx) cheap
// and means every entry here is one we've deliberately vetted, mirroring what Jupiter's
// verified list gives Solana for free.
export interface VerifiedErc20Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  // No bundled local asset for these yet (unlike solana/native icons) — leave unset and let
  // the UI fall back to its existing letter-avatar rather than assuming a remote logo source.
  logo?: string;
}

export const VERIFIED_ERC20_TOKENS: Record<"mainnet" | "testnet", VerifiedErc20Token[]> = {
  mainnet: [
    {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
    {
      address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
    },
    {
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      symbol: "WBTC",
      name: "Wrapped BTC",
      decimals: 8,
    },
    {
      address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      symbol: "LINK",
      name: "Chainlink",
      decimals: 18,
    },
  ],
  testnet: [
    // Circle's official Sepolia USDC — the one testnet ERC-20 a dev is actually likely to hold.
    {
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  ],
};
