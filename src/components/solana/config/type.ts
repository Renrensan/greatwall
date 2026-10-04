import type { ConvertMethods } from "@/components/integrator/ipow/convertMethods";
import { solananetwork } from "@/index";
import { Wallet, WalletAccount } from "@wallet-standard/core";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";


export type SolanaWalletType = "phantom" | "walletconnect";

export interface SolanaWalletContextType extends ConvertMethods {
  connected: boolean;
  address: string | null;
  walletName: string | null;
  walletType: SolanaWalletType | null; 
  availableWallets: Wallet[];
  balance: {
    confirmed: number;
    unconfirmed: number;
    sendable: number;
    stakeable: number;
    swapable: number;
    fetched: boolean;
    tokens: any[]
  };
  estimatedFee: {
    low: number;
    medium: number;
    high: number;
    selectedFee: "low" | "medium" | "high";
    fetched: boolean;
  };
  currencyTicker: "SOL";
  decimals: number;
  /** Decimal scale of the ipow contract's own on-chain amounts. On Solana this is the
   * same 9 as `decimals` above — the ipow program isn't EVM at all (a native Anchor
   * program), so it just takes lamports directly with no cross-VM value-scaling layer
   * in between, unlike Ethereum/Hedera/Polkadot. Kept as a distinct field purely for a
   * uniform field name across every chain's context. */
  ipowDecimals: number;
  networkName: "Solana";
  networkDescription: {};
  networkLogo: typeof solananetwork;
  price: {} | null;
  networkExplorer: {};
  selfCustodyParameter: {};
  ipowConvert: "testnet" | "mainnet" | "comingsoon";
  ipowNetworkId: number;
  
  verifiedTokensData: any[]; 
  liveTokenPrices: Record<string, any>; 

  checkAtaRequired: (destinationAddress: string, mintAddress: string | null | undefined) => Promise<boolean>;

  connect: (wallet: Wallet | "walletconnect", isAutoConnect?: boolean) => Promise<void>; 
  isConnecting: boolean;
  disconnect: (hardDisconnect?: boolean) => void; 
  signMessage: (message: string) => Promise<string | null>;
  /** The connected wallet as @ipow/sdk signs with it; null when none is. */
  getAnchorWallet: () => import("@ipow/sdk").SolanaWallet | null;
  switchWallet: (wallet: Wallet | "walletconnect") => Promise<void>; 
  sendTokenTo: (
    toAddress: string,
    amountSol: number,
    customFee?: number,
    mintAddress?: string,
    decimals?: number
  ) => Promise<string | null>;
  /** The single address-check entry point: whether it's valid, and if not, which
   * specific rule it failed (so forms can show a specific, actionable message). */
  checkAddress: (address: string) => AddressCheckResult;
  isValidAddress: (address: string) => boolean;

  // --- NEW GASLESS SEND METHODS ---
  
  // --------------------------------
  

  // Quote-only variants — build the tx and return its fee breakdown (networkFeeUi,
  // ataFeeUi, platformFeeUi, calculatedFeeUi) without prompting the wallet to sign, for a
  // live "you'll pay X" preview as the user types.
  

  setFeeSelection: (f: "low" | "medium" | "high") => void;
  fetchETA: (txHash: string) => Promise<{ estimatedSeconds: number; isCongested: boolean } | null>;

  // Convert's methods: ConvertMethods (solanaConvertMethods.ts).
  initializeProtocol: () => Promise<void>;
  addSupportedNetwork: (networkName: string, networkId: number, minAddrLen: number, maxAddrLen: number) => Promise<void>; 
}


export type ConnectFeature = {
  connect(): Promise<{ accounts: WalletAccount[] }>;
};
export type EventsFeature = {
  on(
    event: "change",
    listener: (args: { accounts: WalletAccount[] }) => void,
  ): void;
  off(event: "change", listener: () => void): void;
};
export type SignMessageFeature = {
  signMessage(args: {
    message: Uint8Array;
    account: WalletAccount;
  }): Promise<{ signature: Uint8Array }>;
};

export type NetworkName = "devnet" | "mainnet" 

export type NetworkConfig = {
  network: NetworkName,
  jsonRpcUrl: string,
  mirrorNodeUrl: string,
  networkExplorer: string,
}

export type NetworkConfigs = {
  [key in NetworkName]: {
    network: NetworkName,
    jsonRpcUrl: string,
      networkExplorer: {
        address: string,
        transaction: string,
        urlSuffix: string,
      },
  }
}
    

export type AppConfig = {
  networks: NetworkConfigs,
}

