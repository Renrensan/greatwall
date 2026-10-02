import { robinhoodnetwork } from "@/index";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";

export type NetworkName = "testnet" | "mainnet";
export type ChainId = "0x1237" | "0xb626"; // 4663 mainnet, 46630 testnet

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

// Robinhood Chain is a standard Arbitrum Orbit EVM L2 — MetaMask is the only wallet wired up
// today (same rationale as Hyperliquid's HyperEVM: genuinely EVM, no signing-compatibility
// caveats, so WalletConnect/Phantom could be added later the same way ethereum-provider.tsx
// does, without rework).
export type RobinhoodWalletType = "metamask";

export interface RobinhoodWalletContextType {
  connected: boolean;
  address: string | null;
  isConnecting: boolean;
  walletType: RobinhoodWalletType | null;
  availableWallets: RobinhoodWalletType[];
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
  networkName: "Robinhood";
  networkDescription: {};
  selfCustodyParameter: {};
  networkLogo: typeof robinhoodnetwork;
  price: {} | null;
  networkExplorer: {};
  ipowConvert: "testnet" | "mainnet" | "comingsoon";
  ipowNetworkId: number;
  dappList: any[] | null;
  toggleFavoriteDapp: (dappId: number) => void;
  connect: (wallet: RobinhoodWalletType) => Promise<void>;
  fetchETA: (
    txHash: string,
  ) => Promise<{ estimatedSeconds: number; isCongested: boolean } | null>;
  setFeeSelection: (fee: "low" | "high" | "medium") => void;
  disconnect: (hardDisconnect: boolean) => void;
  switchWallet: (wallet: RobinhoodWalletType) => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  sendTokenTo: (
    to: string,
    amount: number,
    customFee?: number,
    token?: { address: string; decimals: number },
  ) => Promise<string | null>;
  checkAddress: (address: string) => AddressCheckResult;
  isValidAddress: (address: string) => boolean;
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
