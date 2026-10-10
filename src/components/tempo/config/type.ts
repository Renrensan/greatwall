import { temponetwork } from "@/index";
import { TxPhase, TypeFilter } from "@/components/integrator/ipow/evm/type";
import { BytesLike } from "ethers";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";

export type NetworkName = "testnet"
export type ChainId = '0xa5bf'; // Tempo testnet

export type NetworkConfig = {
  network: NetworkName,
  jsonRpcUrl: string,
  chainId: ChainId,
  networkExplorer: string,
}


export type NetworkConfigs = {
  [key in NetworkName]: {
    network: NetworkName,
    jsonRpcUrl: string,
    chainId: ChainId,
      networkExplorer: string,
  }
};

export type AppConfig = {
  networks: NetworkConfigs,
}


export type TempoWalletType = "metamask" | "phantom" | "walletconnect";

export interface TempoWalletContextType {
  connected: boolean;
  address: string | null;
  isConnecting: boolean;
  walletType: TempoWalletType | null;
  availableWallets: TempoWalletType[];
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
  currencyTicker: "USD";
  decimals: number;
  /** Decimal scale of the ipow contract's own on-chain amounts. On Ethereum this is the
   * same 18 as `decimals` above (real wei, no EVM-compat scaling) — kept as a distinct
   * field so callers reading contract amounts don't rely on that coincidence (Hedera and
   * Polkadot's EVM-compat layers each scale `msg.value` differently, so their two
   * numbers diverge). */
  ipowDecimals: number;
  networkName: "Tempo";
  networkDescription: object;
  networkLogo: typeof temponetwork;
  price: object | null;
  networkExplorer: object;
  ipowConvert: "testnet" | "comingsoon";
  ipowNetworkId: number;
  connect: (wallet: TempoWalletType) => Promise<void>;
  fetchETA: (
    txHash: string,
  ) => Promise<{ estimatedSeconds: number; isCongested: boolean } | null>;
  setFeeSelection: (fee: "low" | "high" | "medium") => void;
  disconnect: (hardDisconnect: boolean) => void;
  switchWallet: (wallet: TempoWalletType) => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  /** A token transfer: PathUSD (Tempo's "USD"), or `token` when given. */
  sendTokenTo: (
    to: string,
    amount: number,
    _unused?: unknown,
    token?: { address: string; decimals: number },
  ) => Promise<string | null>;
  /** The test RWA tokens' faucet: a claim from the token at `token`. */
  faucet?: (token: string) => Promise<string>;
  /** The connected wallet's signer, on Tempo (switched to it if needed): for the iPoW SDK's index tokens. */
  getSigner?: () => Promise<import("ethers").Signer>;
  /** The single address-check entry point: whether it's valid, and if not, which
   * specific rule it failed (so forms can show a specific, actionable message). */
  checkAddress: (address: string) => AddressCheckResult;
  isValidAddress: (address: string) => boolean;

  // --- EVM RFQ FUNCTIONS ---
  // Notice: estimateBitcoinFromNative and estimateNativeFromBitcoin are REMOVED.
  
  commitNativeToBitcoin: (
    userProgram: string,
    ethAmount: number,
    bitcoinAmountSats: number, // Explicit RFQ amount
    destination?: { networkId: number; networkAddress: string }
  ) => Promise<string | null>;
  
  commitBitcoinToNative: (
    btcSats: string | number,
    ethAmount: number, // Explicit RFQ amount
    userProgram: string,
  ) => Promise<string | null>;
  
  depositApprovedConversion: (txId: bigint) => Promise<string | null>;
  
  submitBitcoinMerkleProofWithTx: (
    txId: bigint,
    txRaw: BytesLike,
    voutIndex: bigint,
    blockHashLE: BytesLike,
    blockHeight: bigint,
    branch: BytesLike[],
    index: bigint,
  ) => Promise<string | null>;

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
  estimateBitcoinFromNative: (ethAmount: number) => Promise<string | null>;
  estimateNativeFromBitcoin: (btcSats: string) => Promise<string | null>;
  anchorInfo: (txId: bigint) => Promise<any | null>;
  proofInfo: (txId: bigint) => Promise<any | null>;
  windowsFor: (txId: bigint) => Promise<any | null>;
  globalHeightToHashLE: (h: bigint) => Promise<any | null>;
  globalHeaders: (hashLE: any) => Promise<any | null>;
}

