import { NetworkConfigs } from "./type";

// Mainnet is proxied through our own backend route (keyed Alchemy RPC, same pattern as
// ETH_MAINNET_RPC_URL — see src/app/api/rpc/robinhood/mainnet/route.ts) so the API key never
// reaches the client. Verified live: eth_chainId returns 0x1237 (4663), a real advancing
// block number, and Multicall3 deployed at the canonical address.
// Testnet uses Robinhood's own public RPC directly (no key needed, same as Tron/Hyperliquid's
// public endpoints) — documented at chainlist.org/chain/46630, not independently verified
// live from this environment (its domain was intercepted by local ISP filtering).
export const networkConfig: NetworkConfigs = {
  testnet: {
    network: "testnet",
    jsonRpcUrl: "https://rpc.testnet.chain.robinhood.com",
    networkExplorer: "https://explorer.testnet.chain.robinhood.com",
    chainId: "0xb626",
  },
  mainnet: {
    network: "mainnet",
    jsonRpcUrl: "/api/rpc/robinhood/mainnet",
    networkExplorer: "https://robinhoodchain.blockscout.com",
    chainId: "0x1237",
  },
};
