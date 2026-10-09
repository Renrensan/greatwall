import { NetworkConfigs } from "./type";

// Robinhood Chain testnet, through Robinhood's own public RPC directly (no key needed, same
// as Hyperliquid's public endpoint) — documented at chainlist.org/chain/46630.
export const networkConfig: NetworkConfigs = {
  testnet: {
    network: "testnet",
    jsonRpcUrl: "https://rpc.testnet.chain.robinhood.com",
    networkExplorer: "https://explorer.testnet.chain.robinhood.com",
    chainId: "0xb626",
  },
};
