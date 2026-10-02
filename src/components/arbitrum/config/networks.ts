import { NetworkConfigs } from "./type";

// Both public, no-key-needed RPCs (Arbitrum's own) — verified live via eth_chainId: mainnet
// returns 0xa4b1 (42161), testnet (Arbitrum Sepolia) returns 0x66eee (421614). Multicall3
// confirmed deployed at the canonical address on mainnet.
export const networkConfig: NetworkConfigs = {
  testnet: {
    network: "testnet",
    jsonRpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    networkExplorer: "https://sepolia.arbiscan.io",
    chainId: "0x66eee",
  },
  mainnet: {
    network: "mainnet",
    jsonRpcUrl: "https://arb1.arbitrum.io/rpc",
    networkExplorer: "https://arbiscan.io",
    chainId: "0xa4b1",
  },
};
