import { NetworkConfigs } from "./type";

export const networkConfig: NetworkConfigs = {
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

