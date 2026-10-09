import { NetworkConfigs } from "./type";

// Hyperliquid's testnet HyperEVM, through its public RPC (no API key required):
// eth_chainId returns 0x3e6 (998).
export const networkConfig: NetworkConfigs = {
  testnet: {
    network: "testnet",
    jsonRpcUrl: "https://rpc.hyperliquid-testnet.xyz/evm",
    networkExplorer: "https://testnet.purrsec.com",
    chainId: "0x3e6",
  },
};
