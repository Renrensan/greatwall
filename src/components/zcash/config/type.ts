
import { zcashnetwork } from "@/index";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";

export type NetworkName = "testnet" | "mainnet";
export type ZcashWalletType = "walletconnect" | "ywallet";

export interface ZcashWalletContextType {
  connected: boolean;
  address: string | null;
  isConnecting: boolean;
  walletType: ZcashWalletType | null;
  availableWallets: ZcashWalletType[];
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
  currencyTicker: "ZEC";
  decimals: 8;
  ipowDecimals: 8;
  networkName: "Zcash";
  networkDescription: {};
  networkLogo: any;
  price: {} | null;
  networkExplorer: {};
  ipowConvert: "comingsoon";
  ipowNetworkId: number;
  
  connect: (wallet: ZcashWalletType) => Promise<void>;
  disconnect: (hardDisconnect: boolean) => void;
  switchWallet: (wallet: ZcashWalletType) => Promise<void>;
  checkAddress: (address: string) => AddressCheckResult;
  isValidAddress: (address: string) => boolean;
  
  estimateBitcoinFromNative: (amt: number) => Promise<string | null>;
  estimateNativeFromBitcoin: (amt: string) => Promise<string | null>;
}
