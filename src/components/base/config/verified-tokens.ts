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
    // Greatwall's mock RWA tokens (iPoW repo, deployments/base-testnet-rwa.json,
    // 2026-10-05): stand-ins for real tokenized assets, with a faucet in the token itself.
    { address: "0xbc653e8dB02870f0562231BA55E6f4F182cAaF4c", symbol: "GLDY", name: "Streamex GLDY (Base Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/base/GLDY.png" },
    { address: "0x1FB8F1986E4a484d8A0E6b4F281A3066B8166a3d", symbol: "JTRSY", name: "Janus Henderson Treasury Fund (Base Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/base/JTRSY.png" },
    { address: "0x2Cb59E06223ADdb03C7565b62b37FA834809BC77", symbol: "AUDD", name: "Australian Digital Dollar (Base Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/base/AUDD.png" },
    { address: "0xD8fC94eCa1cf8b7F227d8AD0e624ACAe5e997Ad4", symbol: "JSPXA", name: "Janus Henderson S&P500 Fund (Base Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/base/JSPXA.png" },
    { address: "0x3980adc2E7D776a5e8E264Aed684c9a43E736D5e", symbol: "JSPX", name: "S&P 500 DeFi (Centrifuge) (Base Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/base/JSPX.png" },
    { address: "0xd8e8c41817760cf312559dce320b5c5E0AaFecc1", symbol: "bTSLA", name: "Backed Tesla Inc (Base Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/base/bTSLA.png" },
    { address: "0xce8DF6A9CbCE4c98c33B2ca8843cA57B8839e22d", symbol: "USTBL", name: "Spiko US T-Bills Money Market Fund (Base Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/base/USTBL.png" },
    { address: "0xbf869aa1EAb77acdAF5419CD18C3c2d0A60A019a", symbol: "wtNKE", name: "Wrapped NIKE, Inc. ST0x (Base Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/base/wtNKE.png" },
    { address: "0x763d74652203aab8341914D99C0C102640FcBb9E", symbol: "AMZN.d", name: "Amazon.com, Inc. Common Stock (Base Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/base/AMZN.d.png" },
    { address: "0x36BA462fF711C7261C4894Af40E5f0c49C98b280", symbol: "wtMCD", name: "Wrapped McDonald's Corporation ST0x (Base Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/base/wtMCD.png" },
    {
      address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  ],
};
