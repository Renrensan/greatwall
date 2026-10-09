import { NetworkConfigs } from "./type";

// Arbitrum Sepolia, through Arbitrum's own public RPC (no key needed): eth_chainId returns
// 0x66eee (421614).
export const networkConfig: NetworkConfigs = {
  testnet: {
    network: "testnet",
    jsonRpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    networkExplorer: "https://sepolia.arbiscan.io",
    chainId: "0x66eee",
  },
};
