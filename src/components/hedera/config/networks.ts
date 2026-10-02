import { NetworkConfigs } from "./type";

export const networkConfig: NetworkConfigs = {
  testnet: {
    network: "testnet",
    jsonRpcUrl:
      process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL ??
      "https://testnet.hashio.io/api",
    mirrorNodeUrl:
      process.env.NEXT_PUBLIC_HEDERA_TESTNET_MIRROR_NODE_URL ??
      "https://testnet.mirrornode.hedera.com",
    networkExplorer: "https://hashscan.io/testnet",
    chainId: "0x128",
  },
  mainnet: {
    network: "mainnet",
    jsonRpcUrl:
      process.env.NEXT_PUBLIC_HEDERA_MAINNET_RPC_URL ??
      "https://mainnet.hashio.io/api",
    mirrorNodeUrl:
      process.env.NEXT_PUBLIC_HEDERA_MAINNET_MIRROR_NODE_URL ??
      "https://mainnet.mirrornode.hedera.com",
    networkExplorer: "https://hashscan.io/mainnet",
    chainId: "0x127",
  },
};

/**
 * Helper to export the currently active network based on ENV
 */
const activeNetwork = (process.env.NEXT_PUBLIC_HEDERA_NETWORK ||
  "testnet") as keyof NetworkConfigs;
export const currentNetworkConfig = networkConfig[activeNetwork];
