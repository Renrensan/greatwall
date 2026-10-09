// A small, hand-curated allowlist rather than a full external list, mirroring Base's
// verified-tokens.ts: Circle's USDC on Arbitrum Sepolia.
export interface VerifiedErc20Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}

export const VERIFIED_ERC20_TOKENS: Record<"testnet", VerifiedErc20Token[]> = {
  testnet: [
    {
      address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  ],
};
