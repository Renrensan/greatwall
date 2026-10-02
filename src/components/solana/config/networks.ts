import { NetworkConfigs } from "./type";

export const networkConfig: NetworkConfigs = {
  mainnet: { 
    network: "mainnet",
    jsonRpcUrl: "/api/rpc/solana/mainnet",
    networkExplorer: {
        address: "https://solscan.io/account/",
        transaction: "https://solscan.io/tx/",
        urlSuffix: "?cluster=mainnet"
    }
  },
   devnet: { 
    network: "devnet",
   jsonRpcUrl: "/api/rpc/solana/devnet",
    networkExplorer: {
        address: "https://solscan.io/account/",
        transaction: "https://solscan.io/tx/",
        urlSuffix: "?cluster=devnet"
    }
  },
};

