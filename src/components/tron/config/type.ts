import { tronnetwork } from "@/index";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";

export type NetworkName = "testnet" | "mainnet";

export type NetworkConfig = {
  network: NetworkName;
  fullHost: string; // TronGrid-compatible full node URL (TronWeb's constructor option)
  networkExplorer: string;
};

export type NetworkConfigs = {
  [key in NetworkName]: NetworkConfig;
};

export type AppConfig = {
  networks: NetworkConfigs;
};

// TronLink is the dominant Tron wallet (same role MetaMask/Phantom play elsewhere) and is
// what this starts with — no WalletConnect support yet, unlike the EVM/Hedera providers.
export type TronWalletType = "tronlink";

export interface TronWalletContextType {
  connected: boolean;
  address: string | null;
  isConnecting: boolean;
  walletType: TronWalletType | null;
  availableWallets: TronWalletType[];
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
  currencyTicker: "TRX";
  decimals: number;
  ipowDecimals: number;
  networkName: "Tron";
  networkDescription: {};
  selfCustodyParameter: {};
  networkLogo: typeof tronnetwork;
  price: {} | null;
  networkExplorer: {};
  // "comingsoon" — the ipow Bitcoin-conversion bridge isn't implemented for Tron yet, but it
  // stays selectable in the convert UI (ConvertToken.tsx already disables/labels anything
  // marked this way rather than hiding it).
  ipowConvert: "testnet" | "mainnet" | "comingsoon";
  ipowNetworkId: number;
  dappList: any[] | null;
  toggleFavoriteDapp: (dappId: number) => void;
  connect: (wallet: TronWalletType) => Promise<void>;
  fetchETA: (
    txHash: string,
  ) => Promise<{ estimatedSeconds: number; isCongested: boolean } | null>;
  setFeeSelection: (fee: "low" | "high" | "medium") => void;
  disconnect: (hardDisconnect: boolean) => void;
  switchWallet: (wallet: TronWalletType) => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  sendTokenTo: (
    to: string,
    amount: number,
    customFee?: number,
    token?: { address: string; decimals: number },
  ) => Promise<string | null>;
  checkAddress: (address: string) => AddressCheckResult;
  isValidAddress: (address: string) => boolean;

  // --- ipow bridge: not supported yet (ipowConvert: "comingsoon") — these exist only to
  // satisfy the shared provider shape every chain implements; ConvertToken.tsx never calls
  // them for a "comingsoon" chain, so they're safe no-ops rather than real implementations.
  commitNativeToBitcoin: (
    userProgram: string,
    tronAmount: number,
    bitcoinAmountSats: number,
    destination?: { networkId: number; networkAddress: string },
  ) => Promise<string | null>;
  commitBitcoinToNative: (
    btcSats: string | number,
    tronAmount: number,
    userProgram: string,
  ) => Promise<string | null>;
  depositApprovedConversion: (txId: bigint) => Promise<string | null>;
  submitBitcoinMerkleProofWithTx: (
    txId: bigint,
    txRaw: unknown,
    voutIndex: bigint,
    blockHashLE: unknown,
    blockHeight: bigint,
    branch: unknown[],
    index: bigint,
  ) => Promise<string | null>;
  getMyTxIds: (
    phase: number,
    typeFilter?: number,
    bitcoinProgramFilter?: string,
    isUserBitcoinProgramFilter?: boolean,
  ) => Promise<bigint[]>;
  getConversion: (txId: bigint) => Promise<any>;
  refundIfNotApproved: (txId: bigint) => Promise<string | null>;
  claimNativeAfterOperatorExpired: (txId: bigint) => Promise<string | null>;
  refundAfterNoProofNativeToBitcoin: (txId: bigint) => Promise<string | null>;
  estimateBitcoinFromNative: (tronAmount: number) => Promise<string | null>;
  estimateNativeFromBitcoin: (btcSats: string) => Promise<string | null>;
  anchorInfo: (txId: bigint) => Promise<any | null>;
  proofInfo: (txId: bigint) => Promise<any | null>;
  windowsFor: (txId: bigint) => Promise<any | null>;
  globalHeightToHashLE: (h: bigint) => Promise<any | null>;
  globalHeaders: (hashLE: any) => Promise<any | null>;
}
