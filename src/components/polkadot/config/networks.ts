import { NetworkConfigs } from "./type";

// Balances, staking, and governance moved from the Relay Chain to Asset Hub in the
// Nov 2025 Asset Hub Migration, so we talk to Asset Hub directly rather than the
// Relay Chain. Multiple endpoints per network give WsProvider automatic failover.
export const networkConfig: NetworkConfigs = {
  mainnet: {
    network: "mainnet",
    rpcEndpoints: [
      "wss://polkadot-asset-hub-rpc.polkadot.io",
      "wss://asset-hub-polkadot-rpc.n.dwellir.com",
      "wss://sys.ibp.network/asset-hub-polkadot",
    ],
    networkExplorer: "https://assethub-polkadot.subscan.io",
  },
  testnet: {
    network: "testnet",
    rpcEndpoints: [
      "wss://asset-hub-paseo-rpc.n.dwellir.com",
      "wss://asset-hub-paseo.dotters.network",
    ],
    networkExplorer: "https://assethub-paseo.subscan.io",
  },
};
