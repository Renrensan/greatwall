// A small, hand-curated allowlist rather than a full external list, mirroring Ethereum's
// verified-tokens.ts. Starts with native USDC (Circle's canonical Base deployment — verified
// live: real deployed contract, decimals()=6, symbol()="USDC", both mainnet and testnet).
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
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  ],
  testnet: [
    {
      address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  ],
};
