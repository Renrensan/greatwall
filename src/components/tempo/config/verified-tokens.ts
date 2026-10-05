// Same rationale as Ethereum's verified-tokens.ts: a small, hand-curated allowlist rather
// than a full external list. Tempo's fee token, PathUSD, is the "native" balance the
// provider already shows, so it is not listed here.
export interface VerifiedErc20Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}

export const VERIFIED_ERC20_TOKENS: Record<"mainnet" | "testnet", VerifiedErc20Token[]> = {
  mainnet: [],
  testnet: [
    // Greatwall's mock RWA tokens (iPoW repo, deployments/tempo-testnet-rwa.json,
    // 2026-10-05): stand-ins for real tokenized assets, with a faucet in the token itself.
    { address: "0x15390C4901e11D3732489825c2FBa33A2E3e5b37", symbol: "EURC", name: "EURC (Tempo Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/tempo/EURC.png" },
    { address: "0xf35A1C4A9dE7B7FffF62c7cEfda2ac91a71cB6cc", symbol: "USDY", name: "Ondo U.S. Dollar Yield (Tempo Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/tempo/USDY.png" },
    { address: "0x4cFD981522F31A4dc12Aeb433907ebc3CBD37A55", symbol: "syrupUSDC", name: "Syrup USDC (Tempo Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/tempo/syrupUSDC.png" },
  ],
};
