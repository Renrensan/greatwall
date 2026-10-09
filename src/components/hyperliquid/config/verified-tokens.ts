// Same rationale as Ethereum's verified-tokens.ts: a small, hand-curated allowlist rather
// than a full external list, since there's no cheap way to enumerate every ERC-20 a wallet
// holds on HyperEVM: Greatwall's mock RWA tokens on the HyperEVM testnet.
export interface VerifiedErc20Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}

export const VERIFIED_ERC20_TOKENS: Record<"testnet", VerifiedErc20Token[]> = {
  testnet: [
    // Greatwall's mock RWA tokens (iPoW repo, deployments/hyperliquid-testnet-rwa.json,
    // 2026-10-05): stand-ins for real tokenized assets, with a faucet in the token itself.
    { address: "0xbc653e8dB02870f0562231BA55E6f4F182cAaF4c", symbol: "thBILL", name: "Theo Short Duration US Treasury Fund (HyperEVM Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/hyperliquid/thBILL.png" },
    { address: "0xDaB99518afF82db3c16ad748B56884238bb2C5C5", symbol: "USDH", name: "USDH (HyperEVM Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/hyperliquid/USDH.png" },
    { address: "0xC034e3Fc38E88D12922A285D09470510d320a200", symbol: "GMEx", name: "Gamestop xStock (HyperEVM Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/hyperliquid/GMEx.png" },
    { address: "0xCeee90F921AA994B837B97B4886c1A2AE56b2550", symbol: "MUx", name: "Micron Technology xStock (HyperEVM Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/hyperliquid/MUx.png" },
    { address: "0x8965958BC61220d8add02E227437Fa363E21D96f", symbol: "USDHL", name: "Hyper USD (HyperEVM Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/hyperliquid/USDHL.png" },
    { address: "0xE101001bD62451c6f3337f44EF2cC4F166dd891D", symbol: "SKHYx", name: "SK hynix xStock (HyperEVM Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/hyperliquid/SKHYx.png" },
    { address: "0xFcbF76B91dDebbee0c21d808B26a9Fb8fcC0ca94", symbol: "NBISx", name: "Nebius xStock (HyperEVM Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/hyperliquid/NBISx.png" },
    { address: "0x1E5da6001764bB4e76321FD90Dfaf626cA1f3A83", symbol: "IWMx", name: "Russell 2000 xStock (HyperEVM Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/hyperliquid/IWMx.png" },
    { address: "0xda238E5F844d01554b1A9F2342F733A8205d0586", symbol: "CRWVx", name: "CoreWeave xStock (HyperEVM Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/hyperliquid/CRWVx.png" },
  ],
};
