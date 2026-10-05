// Empty for now — Robinhood Chain's main use case (tokenized equities/ETFs) involves
// RWA-issuance contracts specific to Robinhood's own registry, unlike a simple dominant
// stablecoin (USDT0 on Hyperliquid, USDT on Tron). Rather than guess at a tokenized-stock
// contract address, this starts native-ETH-only; add entries here once specific tokens are
// verified live (contract code + symbol()/decimals() via eth_call), same process used for
// every other chain's allowlist.
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
    // Greatwall's mock RWA tokens (iPoW repo, deployments/robinhood-testnet-rwa.json,
    // 2026-10-05): stand-ins for real tokenized assets, with a faucet in the token itself.
    { address: "0x01BE560A22e91201C9414b634f0a61085F84dD08", symbol: "USDG", name: "Global Dollar (Robinhood Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/robinhood/USDG.png" },
    { address: "0xCA39c4e5d4f938A380E61475bF4CeF8D1B7d6190", symbol: "SPYr", name: "SPDR S&P 500 ETF Trust Robinhood Token (Robinhood Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/robinhood/SPYr.png" },
    { address: "0x07eFF65A853f36cBA8FEFbC495eb6A0D98d26a75", symbol: "NVDAr", name: "NVIDIA Robinhood Token (Robinhood Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/robinhood/NVDAr.png" },
    { address: "0x6c692BEdCa89292D0FEfc6e86b82f451E371f11D", symbol: "SPCXr", name: "SpaceX Class A Common Stock Robinhood Token (Robinhood Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/robinhood/SPCXr.png" },
    { address: "0xB75ABD27218B2b31ABb5B0F61F11a107377bEA06", symbol: "METAr", name: "Meta Platforms Robinhood Token (Robinhood Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/robinhood/METAr.png" },
    { address: "0x525D70BBc90149345a171F5E308C923A4B8b109A", symbol: "COINr", name: "Coinbase Robinhood Token (Robinhood Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/robinhood/COINr.png" },
    { address: "0xeF3A9120a087cf5795a60BB2e9FfF15b8E35c69e", symbol: "USOr", name: "United States Oil Fund Robinhood Token (Robinhood Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/robinhood/USOr.png" },
    { address: "0x1bF2c8784e5e801BeAb042791fE161156e771B66", symbol: "GMEr", name: "GameStop Robinhood Token (Robinhood Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/robinhood/GMEr.png" },
    { address: "0x3Fc561125a24C7Bb02f1edd1f8F773e16185799f", symbol: "PLTRr", name: "Palantir Technologies Robinhood Token (Robinhood Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/robinhood/PLTRr.png" },
    { address: "0xdfB626fA52Ef04EAf2DfC4fA30e9B3d7E5fA90DC", symbol: "SGOVr", name: "iShares 0-3 Month Treasury Bond Robinhood Token (Robinhood Testnet Greatwall)", decimals: 18, logo: "/assets/rwa/robinhood/SGOVr.png" },
  ],
};
