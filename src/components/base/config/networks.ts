import { NetworkConfigs } from "./type";

// Both public, no-key-needed RPCs (Coinbase's own) — verified live via eth_chainId: mainnet
// returns 0x2105 (8453), testnet (Base Sepolia) returns 0x14a34 (84532). Multicall3 confirmed
// deployed at the canonical address on mainnet.
export const networkConfig: NetworkConfigs = {
  testnet: {
    network: "testnet",
    jsonRpcUrl: "https://sepolia.base.org",
    networkExplorer: "https://sepolia.basescan.org",
    chainId: "0x14a34",
  },
  mainnet: {
    network: "mainnet",
    jsonRpcUrl: "https://mainnet.base.org",
    networkExplorer: "https://basescan.org",
    chainId: "0x2105",
  },
};
