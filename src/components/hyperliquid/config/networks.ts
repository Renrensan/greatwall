import { NetworkConfigs } from "./type";

// Both are TronGrid-style public RPCs (no API key required) — verified live via
// eth_chainId: mainnet returns 0x3e7 (999), testnet returns 0x3e6 (998).
export const networkConfig: NetworkConfigs = {
  testnet: {
    network: "testnet",
    jsonRpcUrl: "https://rpc.hyperliquid-testnet.xyz/evm",
    networkExplorer: "https://testnet.purrsec.com",
    chainId: "0x3e6",
  },
  mainnet: {
    network: "mainnet",
    jsonRpcUrl: "https://rpc.hyperliquid.xyz/evm",
    networkExplorer: "https://hyperevmscan.io",
    chainId: "0x3e7",
  },
};
