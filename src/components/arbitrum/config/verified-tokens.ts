// A small, hand-curated allowlist rather than a full external list, mirroring Base's
// verified-tokens.ts. Starts with native USDC (Circle's canonical Arbitrum deployment —
// verified live: real deployed contract, decimals()=6, symbol()="USDC", both mainnet and
// testnet).
export interface VerifiedErc20Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}

export const VERIFIED_ERC20_TOKENS: Record<"mainnet" | "testnet", VerifiedErc20Token[]> = {
  mainnet: [
    {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  ],
  testnet: [
    {
      address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  ],
};
