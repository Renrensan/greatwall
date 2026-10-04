import { bitcoinnetwork } from "@/index";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";


export type NetworkName =  "mainnet" 

export type NetworkConfig = {
  network: NetworkName,
  jsonRpcUrl: string,
  networkExplorer: string,
}

export type NetworkConfigs = {
  [key in NetworkName]: {
    network: NetworkName,
    jsonRpcUrl: string,
    websocketUrl: string,
      networkExplorer: string,
  }
};

export type AppConfig = {
  networks: NetworkConfigs,
}


export type BtcAccount = {
  address: string;
  addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
  publicKey: string;
  purpose: "payment" | "ordinals";
};

export type BitcoinWalletType = "phantom" | "xverse" | "walletconnect";


export interface BitcoinWalletContextType {
  connected: boolean;
  isConnecting: boolean;
  walletType: BitcoinWalletType | null;
  address: string | null;
  accounts: BtcAccount[];
  balance: {
    confirmed: number;
    unconfirmed: number;
    sendable: number;
    fetched: boolean;
  };

  estimatedFee: {
    low: number;
    medium: number;
    high: number;
    selectedFee: "low" | "high" | "medium";
    fetched: boolean;
  };
  selectedAccount: BtcAccount | null;
  currencyTicker: "BTC";
  decimals: number;
  networkName: "Bitcoin";
  networkDescription: {};
  networkLogo: typeof bitcoinnetwork;
  selfCustodyParameter: {};
  price: {} | null;
  networkExplorer: {};
  ipowConvert: "testnet" | "mainnet" | "comingsoon";
  ipowNetworkId: number;
  setFeeSelection: (fee: "low" | "high" | "medium") => void;
  setSelectedAccount: (acc: BtcAccount) => void;
  switchWallet: (wallet: BitcoinWalletType) => Promise<void>;

  connect: (wallet: BitcoinWalletType) => Promise<void>;
  disconnect: (hardDisconnect: boolean) => void;
  signMessage: (message: string) => Promise<string | null>;
  sendTokenTo: (to: string, amount: number, feeLevel?: "low" | "medium" | "high") => Promise<string | null>;
  fetchETA: (
    txHash: string,
  ) => Promise<{ estimatedSeconds: number; isCongested: boolean } | null>;
  addressToScriptPubKeyHex: (address: string) => string;
  scriptPubKeyHexToAddress: (scriptPubKeyHex: string) => string;
  /** The single address-check entry point: whether it's valid, and if not, which
   * specific rule it failed (so forms can show a specific, actionable message). */
  checkAddress: (address: string) => AddressCheckResult;
  isValidAddress: (address: string) => boolean;
}


