import { NetworkConfigs } from "./type";

// TronGrid's public endpoints — unlike Ethereum/Solana here, these are called directly
// rather than proxied through a private paid RPC, matching how Hedera's mirror node and
// Polkadot's public RPCs are already used directly elsewhere in this app.
export const networkConfig: NetworkConfigs = {
  mainnet: {
    network: "mainnet",
    fullHost: "https://api.trongrid.io",
    networkExplorer: "https://tronscan.org",
  },
  testnet: {
    // Shasta — the standard public Tron testnet.
    network: "testnet",
    fullHost: "https://api.shasta.trongrid.io",
    networkExplorer: "https://shasta.tronscan.org",
  },
};
