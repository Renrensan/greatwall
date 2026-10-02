// A small, hand-curated TRC-20 allowlist — same rationale as Ethereum's verified-tokens.ts:
// there's no cheap way to enumerate every TRC-20 a wallet holds (TronGrid's account endpoint
// does list held TRC-20 balances, but with no symbol/name/decimals — a separate lookup per
// contract either way), so this starts with the one token that actually matters on Tron: USDT,
// which settles the overwhelming majority of real TRC-20 volume.
export interface VerifiedTrc20Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const VERIFIED_TRC20_TOKENS: Record<"mainnet" | "testnet", VerifiedTrc20Token[]> = {
  mainnet: [
    {
      address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
  ],
  testnet: [],
};
