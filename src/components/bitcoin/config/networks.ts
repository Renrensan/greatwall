import { NetworkConfigs } from "./type";

export const networkConfig: NetworkConfigs = {
  mainnet: { 
    network: "mainnet",
    jsonRpcUrl: "/api/bitcoin", // this app's server, which asks mempool.space or blockstream.info
    websocketUrl: "wss://mempool.space/api/v1/ws",
    networkExplorer: "https://mempool.space"
  },
};


