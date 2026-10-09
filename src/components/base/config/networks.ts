import { NetworkConfigs } from "./type";

// Base Sepolia, through Coinbase's own public RPC (no key needed): eth_chainId returns
// 0x14a34 (84532).
export const networkConfig: NetworkConfigs = {
  testnet: {
    network: "testnet",
    jsonRpcUrl: "https://sepolia.base.org",
    networkExplorer: "https://sepolia.basescan.org",
    chainId: "0x14a34",
  },
};
