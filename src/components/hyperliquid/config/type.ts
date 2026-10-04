import type { ConvertMethods } from "@/components/integrator/ipow/convertMethods";
import { hyperliquidnetwork } from "@/index";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";

export type NetworkName = "testnet" | "mainnet";
export type ChainId = "0x3e7" | "0x3e6"; // 999 mainnet, 998 testnet

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

// HyperEVM is a standard EVM chain reachable only through an injected wallet today —
// MetaMask is the only wallet wired up (see the Tron-vs-MetaMask research: unlike Tron,
// HyperEVM has no signing-compatibility caveats since it's genuinely EVM, so this can grow
// to WalletConnect/Phantom later the same way ethereum-provider.tsx does, without rework).
export type HyperliquidWalletType = "metamask";

export interface HyperliquidWalletContextType extends ConvertMethods {
  connected: boolean;
  address: string | null;
  isConnecting: boolean;
  walletType: HyperliquidWalletType | null;
  availableWallets: HyperliquidWalletType[];
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
  currencyTicker: "HYPE";
  decimals: number;
  ipowDecimals: number;
  networkName: "Hyperliquid";
  networkDescription: {};
  selfCustodyParameter: {};
  networkLogo: typeof hyperliquidnetwork;
  price: {} | null;
  networkExplorer: {};
  ipowConvert: "testnet" | "mainnet" | "comingsoon";
  ipowNetworkId: number;
  connect: (wallet: HyperliquidWalletType) => Promise<void>;
  fetchETA: (
    txHash: string,
  ) => Promise<{ estimatedSeconds: number; isCongested: boolean } | null>;
  setFeeSelection: (fee: "low" | "high" | "medium") => void;
  disconnect: (hardDisconnect: boolean) => void;
  switchWallet: (wallet: HyperliquidWalletType) => Promise<void>;
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
