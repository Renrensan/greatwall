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
    // Greatwall's mock RWA tokens (iPoW repo, deployments/ethereum-testnet-rwa.json,
    // 2026-10-05): stand-ins for real tokenized assets, with a faucet in the token itself.
    { address: "0x1a7bd06F30b7ED12f6C698b0B3a289eBB379aaC9", symbol: "XAUT", name: "Tether Gold (Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/XAUT.png" },
    { address: "0xB364813e60dB761FCF7FebFa9b1caD062797a9D6", symbol: "STRCx", name: "Strategy PP Variable xStock (Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/STRCx.png" },
    { address: "0x866D9360E35c3DaE8B1ad98aeCC729647C093852", symbol: "IVVon", name: "iShares Core S&P 500 ETF (Ondo) (Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/IVVon.png" },
    { address: "0x6c472F0404179BE1985D92C759Fd9293252Ab858", symbol: "QQQon", name: "Invesco QQQ (Ondo) (Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/QQQon.png" },
    { address: "0xE8F52D763CF87154DC443fa36F9f6D65f44CCaE0", symbol: "NVDAon", name: "NVIDIA (Ondo) (Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/NVDAon.png" },
    { address: "0xc22Ca2B75825cE64a3937F155698C968848d9645", symbol: "SLVon", name: "iShares Silver Trust (Ondo) (Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/SLVon.png" },
    { address: "0x3baaC1a56A8431fea5d0ee0636f285d4F996Bc4C", symbol: "IEFAon", name: "iShares Core MSCI EAFE ETF (Ondo) (Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/IEFAon.png" },
    { address: "0x04b4Cfe08b2C79fFeBc083E5e7091CfAC142c201", symbol: "AMDon", name: "AMD (Ondo) (Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/AMDon.png" },
    { address: "0xA83EE721F0f398A920f4c35Eb04aa244d2c5d1fC", symbol: "SOFIon", name: "SoFi Technologies (Ondo) (Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/SOFIon.png" },
    { address: "0x2c8b859ff059554ff363dED4a484062E247E03BC", symbol: "HIMSon", name: "Hims & Hers Health (Ondo) (Sepolia Greatwall)", decimals: 18, logo: "/assets/rwa/HIMSon.png" },
    // Circle's official Sepolia USDC — the one testnet ERC-20 a dev is actually likely to hold.
    {
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  ],
};
