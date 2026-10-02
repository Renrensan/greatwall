import { NetworkConfigs } from "./type";

export const networkConfig: NetworkConfigs = {
  testnet: {
    
    network: "testnet",
    jsonRpcUrl: "/api/rpc/eth/testnet",
    networkExplorer: "https://sepolia.etherscan.io",
    chainId: "0xaa36a7",
  },
  mainnet: {
    network: "mainnet",
    jsonRpcUrl: "/api/rpc/eth/mainnet",
    networkExplorer: "https://etherscan.io",
    chainId: "0x1",
  },
};
