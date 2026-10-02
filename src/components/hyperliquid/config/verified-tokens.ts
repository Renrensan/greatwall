// Same rationale as Ethereum's verified-tokens.ts: a small, hand-curated allowlist rather
// than a full external list, since there's no cheap way to enumerate every ERC-20 a wallet
// holds on HyperEVM. Starts with USDT0 — the canonical USD₮0 deployment on HyperEVM and the
// dominant stablecoin there (verified live: real deployed contract, decimals()=6,
// symbol()="USD₮0" via eth_call against the mainnet RPC).
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
      address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
      symbol: "USD₮0",
      name: "USDT0",
      decimals: 6,
    },
  ],
  testnet: [],
};
