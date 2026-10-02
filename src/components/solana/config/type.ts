import { MarinadeSOLData, MarinadeUSDCData } from "@/components/integrator/dapphub/solana/solana-staking/type";
import { solananetwork } from "@/index";
import { Wallet, WalletAccount } from "@wallet-standard/core";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";


export type SolanaWalletType = "phantom" | "walletconnect";

export interface SolanaWalletContextType {
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
  dappList: any[] | null;
  
  verifiedTokensData: any[]; 
  liveTokenPrices: Record<string, any>; 

  isUltraFast: boolean;
  setIsUltraFast: (value: boolean) => void;
  checkAtaRequired: (destinationAddress: string, mintAddress: string | null | undefined) => Promise<boolean>;

  toggleFavoriteDapp: (dappId: number) => void;
  connect: (wallet: Wallet | "walletconnect", isAutoConnect?: boolean) => Promise<void>; 
  isConnecting: boolean;
  disconnect: (hardDisconnect?: boolean) => void; 
  signMessage: (message: string) => Promise<string | null>;
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
  fetchGaslessSendQuote: (
    recipientAddress: string, 
    mintAddress: string, 
    amountUi: number, 
    decimals: number
  ) => Promise<any | null>;
  
  executeGaslessSend: (transactionBase64: string) => Promise<string | null>;
  // --------------------------------
  
  stakeToMarinade: (amountSol: number) => Promise<string | null>;
  unstakeFromMarinade: (amountSol: number) => Promise<string | null>;
  getMarinadeSOLData: () => Promise<any | null>;
  getMarinadeUSDCData: () => Promise<any | null>;
  getMarinadeUsdcRewardHistory: () => Promise<any | null>;
  getMarinadeUsdcTransactionHistory: () => Promise<any | null>;
  stakeNativeToMarinade: (amountSol: number) => Promise<string | null>;
  unstakeNativeFromMarinade: (amountSol: number) => Promise<string | null>;
  withdrawNativeStake: (stakeAccountAddress: string, lamports: number) => Promise<string | null>;
  depositUsdcToMarinade: (amountUsdc: number) => Promise<string | null>;
  withdrawUsdcFromMarinade: (amountUsdc: number) => Promise<string | null>;
  claimUsdcFromMarinade: (estimatedRewardUsd: number) => Promise<string | null>;

  // Quote-only variants — build the tx and return its fee breakdown (networkFeeUi,
  // ataFeeUi, platformFeeUi, calculatedFeeUi) without prompting the wallet to sign, for a
  // live "you'll pay X" preview as the user types.
  fetchMarinadeDepositQuote: (amountSol: number) => Promise<any | null>;
  fetchMarinadeUnstakeQuote: (amountMSol: number) => Promise<any | null>;
  fetchMarinadeNativeDepositQuote: (amountSol: number) => Promise<any | null>;
  fetchMarinadeNativeUnstakeQuote: (amountSol: number) => Promise<any | null>;
  fetchMarinadeUsdcDepositQuote: (amountUsdc: number) => Promise<any | null>;
  fetchMarinadeUsdcWithdrawQuote: (amountUsdc: number) => Promise<any | null>;
  
  fetchSwapQuote: (inputMint: string, outputMint: string, amountInSmallestUnit: number, inputAmountUi: number, swapMode?: "ExactIn" | "ExactOut", inputDecimals?: number, signal?: AbortSignal) => Promise<any | null>;
  executeSwap: (quoteResponse: any, inputMint: string, isUltraFast?: boolean) => Promise<string | null>;
  fetchTokenMeta: (query: string) => Promise<any | null>;
  fetchStockAssets: ()=> Promise<any[]>;

  liveBetaPrice: number;
  setFeeSelection: (f: "low" | "medium" | "high") => void;
  fetchETA: (txHash: string) => Promise<{ estimatedSeconds: number; isCongested: boolean } | null>;

  estimateBitcoinFromNative: (solAmount: number) => Promise<string | null>;
  estimateNativeFromBitcoin: (btcSats: string) => Promise<string | null>;

  commitNativeToBitcoin: (
    userProgram: string,
    solAmount: number,
    bitcoinAmountSats: number, 
    destination?: { networkId: number; networkAddress: string }
  ) => Promise<string | null>;

  commitBitcoinToNative: (
    btcSats: string | number,
    solAmount: number, 
    userProgram: string,
  ) => Promise<string | null>;

  depositApprovedConversion: (txId: number | string | bigint) => Promise<string | null>;

  getMyTxIds: (
    phase: number, 
    typeFilter?: number,
    bitcoinProgramFilter?: string,
    isUserBitcoinProgramFilter?: boolean,
  ) => Promise<string[]>; 

  getConversion: (txId: number | string | bigint) => Promise<any>;

  refundIfNotApproved: (txId: number | string | bigint) => Promise<string | null>;
  claimNativeAfterOperatorExpired: (txId: number | string | bigint) => Promise<string | null>;
  refundAfterNoProofNativeToBitcoin: (txId: number | string | bigint) => Promise<string | null>;
  initializeProtocol: () => Promise<void>; 

  anchorInfo: (txIdNum: number | string | bigint) => Promise<any[] | null>;
  windowsFor: (txIdNum: number | string | bigint) => Promise<any[] | null>;
  proofInfo: (txIdNum: number | string | bigint) => Promise<any[] | null>;
  globalHeightToHashLE: (height: bigint | number) => Promise<string>;
  submitBitcoinMerkleProofWithTx: (
    txIdNum: number | string | bigint,
    rawTx: Uint8Array,
    voutIndex: number,
    blockHashLE: Uint8Array,
    blockHeight: number,
    branch: Uint8Array[],
    index: number
  ) => Promise<string | null>;

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

