import { arbitrumnetwork } from "@/index";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";

export type NetworkName = "testnet";
export type ChainId = "0x66eee"; // 421614, Arbitrum Sepolia

export type NetworkConfig = {
  network: NetworkName;
  jsonRpcUrl: string;
  chainId: ChainId;
  networkExplorer: string;
};

export type NetworkConfigs = {
  [key in NetworkName]: NetworkConfig;
};

export type AppConfig = {
  networks: NetworkConfigs;
};

// Arbitrum One is a standard Optimistic Rollup EVM L2 — MetaMask is the only wallet wired up
// today (same as Base/Hyperliquid/Robinhood), could grow to WalletConnect/Coinbase Wallet
// later the same way ethereum-provider.tsx does, without rework.
export type ArbitrumWalletType = "metamask";

export interface ArbitrumWalletContextType {
  connected: boolean;
  address: string | null;
  isConnecting: boolean;
  walletType: ArbitrumWalletType | null;
  availableWallets: ArbitrumWalletType[];
  balance: {
    confirmed: number;
    unconfirmed: number;
    sendable: number;
    fetched: boolean;
    tokens: any[];
  };
  estimatedFee: {
    low: number;
    medium: number;
    high: number;
    selectedFee: "low" | "high" | "medium";
    fetched: boolean;
  };
  currencyTicker: "ETH";
  decimals: number;
  ipowDecimals: number;
  networkName: "Arbitrum";
  networkDescription: object;
  networkLogo: typeof arbitrumnetwork;
  price: object | null;
  networkExplorer: object;
  ipowConvert: "testnet" | "comingsoon";
  ipowNetworkId: number;
  connect: (wallet: ArbitrumWalletType) => Promise<void>;
  fetchETA: (
    txHash: string,
  ) => Promise<{ estimatedSeconds: number; isCongested: boolean } | null>;
  setFeeSelection: (fee: "low" | "high" | "medium") => void;
  disconnect: (hardDisconnect: boolean) => void;
  switchWallet: (wallet: ArbitrumWalletType) => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  sendTokenTo: (
    to: string,
    amount: number,
    customFee?: number,
    token?: { address: string; decimals: number },
  ) => Promise<string | null>;
  checkAddress: (address: string) => AddressCheckResult;
  isValidAddress: (address: string) => boolean;
  /** The connected wallet's signer, on this network (switched to it if needed): for the iPoW SDK. */
  getSigner: () => Promise<import("ethers").Signer>;
  estimateErc20SendFee: (
    to: string,
    amount: number,
    token: { address: string; decimals: number },
  ) => Promise<number | null>;

  // --- ipow bridge: not supported yet (ipowConvert: "comingsoon" below) ---
  commitNativeToBitcoin: (...args: any[]) => Promise<string | null>;
  commitBitcoinToNative: (...args: any[]) => Promise<string | null>;
  depositApprovedConversion: (txId: bigint) => Promise<string | null>;
  submitBitcoinMerkleProofWithTx: (...args: any[]) => Promise<string | null>;
  getMyTxIds: (...args: any[]) => Promise<bigint[]>;
  getConversion: (txId: bigint) => Promise<any>;
  refundIfNotApproved: (txId: bigint) => Promise<string | null>;
  claimNativeAfterOperatorExpired: (txId: bigint) => Promise<string | null>;
  refundAfterNoProofNativeToBitcoin: (txId: bigint) => Promise<string | null>;
  estimateBitcoinFromNative: (amount: number) => Promise<string | null>;
  estimateNativeFromBitcoin: (btcSats: string) => Promise<string | null>;
  anchorInfo: (txId: bigint) => Promise<any | null>;
  proofInfo: (txId: bigint) => Promise<any | null>;
  windowsFor: (txId: bigint) => Promise<any | null>;
  globalHeightToHashLE: (h: bigint) => Promise<any | null>;
  globalHeaders: (hashLE: any) => Promise<any | null>;
}
