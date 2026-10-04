import { hederanetwork } from "@/index";
import { TxPhase, TypeFilter } from "@/components/integrator/ipow/evm/type";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";



export interface ContractFunctionParameterBuilderParam {
  type: string;
  name: string;
  value: any;
}

export type NetworkName = "testnet" | "mainnet" 
export type ChainId = '0x128' | '0x127' ; 

export type NetworkConfig = {
  network: NetworkName,
  jsonRpcUrl: string,
  mirrorNodeUrl: string,
  chainId: ChainId,
  networkExplorer: string,
}

export type NetworkConfigs = {
  [key in NetworkName]: {
    network: NetworkName,
    jsonRpcUrl: string,
    mirrorNodeUrl: string,
    chainId: ChainId,
      networkExplorer: string,
  }
};

export type AppConfig = {
  networks: NetworkConfigs,
}

export type HederaWalletType =
  | "metamask"
  | "walletconnect"
  | "walletconnect_evm";


export interface HederaWalletContextType {
  connected: boolean;
  isConnecting: boolean;
  address: string | null;
  resolvedAddress: string | null;
  walletType: HederaWalletType | null;
  availableWallets: HederaWalletType[];
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
    selectedFee: "low" | "medium" | "high";
    fetched: boolean;
  };
  price: {} | null;
  networkExplorer: {};
  currencyTicker: "HBAR";
  decimals: number;
  /** Decimal scale of the ipow contract's own on-chain amounts. On Hedera this is the
   * same 8 as `decimals` above (raw tinybars — Hashio's EVM-compat relay scales the
   * nominal wei you send down by 10^10 before the contract sees `msg.value`) — kept as
   * a distinct field so callers reading contract amounts don't rely on that coincidence
   * (Ethereum and Polkadot's EVM-compat layers scale differently, so their two numbers
   * diverge from each other). */
  ipowDecimals: number;
  networkName: "Hedera";
  networkDescription: {};
  networkLogo: typeof hederanetwork;
  selfCustodyParameter: {};
  ipowConvert: "testnet" | "mainnet" | "comingsoon";
  ipowNetworkId: number;
  connect: (wallet: HederaWalletType) => Promise<void>;
  disconnect: (hardDisconnect: boolean) => void;
  switchWallet: (wallet: HederaWalletType) => Promise<void>;
  sendTokenTo: (
    toAddress: string,
    amountHBAR: number,
    customFee?: number,
    token?: { tokenId: string; decimals: number },
  ) => Promise<string | null>;
  /** The single address-check entry point: whether it's valid, and if not, which
   * specific rule it failed (so forms can show a specific, actionable message). */
  checkAddress: (address: string) => AddressCheckResult;
  isValidAddress: (address: string) => boolean;
  setFeeSelection: (f: "low" | "medium" | "high") => void;
  fetchETA: (
    txHash: string,
  ) => Promise<{ estimatedSeconds: number; isCongested: boolean } | null>;
  getEvmAddress: (accountId: string) => Promise<string | null>;

  submitBitcoinMerkleProofWithTx: (
    txId: bigint,
    txRaw: any,
    voutIndex: bigint,
    blockHashLE: any,
    blockHeight: bigint,
    branch: any,
    index: bigint,
  ) => Promise<string | null>;

  // --- OFF-CHAIN ORACLE ESTIMATIONS ---
  estimateBitcoinFromNative: (hbarAmount: number) => Promise<string | null>;
  estimateNativeFromBitcoin: (btcSats: string) => Promise<string | null>;

  // --- EVM & NATIVE RFQ FUNCTIONS ---
  commitNativeToBitcoin: (
    userProgram: string,
    hbarAmount: number,
    bitcoinAmountSats: number, // Explicit RFQ amount
    destination?: { networkId: number; networkAddress: string },
  ) => Promise<string | null>;
  
  commitBitcoinToNative: (
    btcSats: string | number,
    hbarAmount: number, // Explicit RFQ amount
    userProgram: string,
  ) => Promise<string | null>;

  depositApprovedConversion: (txId: bigint) => Promise<string | null>;

  getMyTxIds: (
    phase: TxPhase,
    typeFilter?: TypeFilter,
    bitcoinProgramFilter?: string,
    isUserBitcoinProgramFilter?: boolean,
  ) => Promise<bigint[]>;

  getConversion: (txId: bigint) => Promise<any>;

  refundIfNotApproved: (txId: bigint) => Promise<string | null>;
  claimNativeAfterOperatorExpired: (txId: bigint) => Promise<string | null>;
  refundAfterNoProofNativeToBitcoin: (txId: bigint) => Promise<string | null>;
  anchorInfo: (txId: bigint) => Promise<any | null>;
  proofInfo: (txId: bigint) => Promise<any | null>;
  windowsFor: (txId: bigint) => Promise<any | null>;
  globalHeightToHashLE: (h: bigint) => Promise<any | null>;
  globalHeaders: (hashLE: any) => Promise<any | null>;

  getHederaNodes: () => Promise<any | null>;

  stakeToNode: (nodeId: number) => Promise<string | null>;
  claimRewards: () => Promise<string | null>;
  unstake: () => Promise<string | null>;
  getCurrentStake: () => Promise<any | null>;
  bonzoIntelligenceData: any | null;

  depositToLending: (
    assetAddress: string,
    amountHBAR: number,
  ) => Promise<string | null>;
  depositToVault: (
    vaultAddress: string,
    amountHBAR: number,
  ) => Promise<string | null>;
  repayDebt: (assetAddress: string, amount: number) => Promise<string | null>;
  withdrawFromVault: (
    vaultAddress: string,
    amountHBAR: number,
    isFullWithdraw?: boolean,
  ) => Promise<string | null>;
  withdrawFromLending: (
    assetAddress: string,
    amountHBAR: number,
    isFullWithdraw?: boolean,
  ) => Promise<string | null>;
}