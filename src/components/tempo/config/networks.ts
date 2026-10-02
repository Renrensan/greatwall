import { NetworkConfigs } from "./type";

export const networkConfig: NetworkConfigs = {
  testnet: {
    
    network: "testnet",
    jsonRpcUrl: "/api/rpc/tempo/testnet",
    networkExplorer: "https://explore-testnet.tempo.xyz",
    chainId: "0xa5bf",
  },
  mainnet: {
    network: "mainnet",
    jsonRpcUrl: "/api/rpc/tempo/mainnet",
    networkExplorer: "https://explore.tempo.xyz",
    chainId: "0x1079",
  },
};
