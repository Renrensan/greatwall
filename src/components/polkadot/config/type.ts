import { BytesLike } from "ethers";
import { polkadotnetwork } from "@/index";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";
import { TxPhase, TypeFilter } from "@/components/integrator/ipow/evm/type";

export type NetworkName = "mainnet" | "testnet";

export type NetworkConfig = {
  network: NetworkName;
  /** Asset Hub RPC endpoints (native balances/staking live here since the Nov 2025 Asset Hub Migration). */
  rpcEndpoints: string[];
  networkExplorer: string;
};

export type NetworkConfigs = {
  [key in NetworkName]: NetworkConfig;
};

export type AppConfig = {
  networks: NetworkConfigs;
};

export type PolkadotAccount = {
  address: string;
  name: string;
  source: string;
};

export type PolkadotWalletType = "polkadot-js" | "talisman" | "subwallet-js";

export interface PolkadotWalletContextType {
  connected: boolean;
  isConnecting: boolean;
  walletType: PolkadotWalletType | null;
  address: string | null;
  /** The connected account's pallet-revive fallback EVM address (lowercased), kept in
   * sync automatically — mirrors Hedera's `resolvedAddress`, for spots that need to
   * compare against an on-chain `0x...` identity (e.g. `conversion.user`) synchronously,
   * without awaiting `getEvmAddress` at the point of use. */
  resolvedAddress: string | null;
  accounts: PolkadotAccount[];
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
  selectedAccount: PolkadotAccount | null;
  currencyTicker: string;
  decimals: number;
  /** Decimal scale of the ipow contract's own on-chain amounts (always 18 here — see
   * IPOW_AMOUNT_DECIMALS) — distinct from `decimals` above, which is DOT's real
   * 10-decimal precision for wallet balance/transfer display. */
  ipowDecimals: number;
  networkName: "Polkadot";
  networkDescription: {};
  networkLogo: typeof polkadotnetwork;
  selfCustodyParameter: {};
  price: {} | null;
  networkExplorer: {};
  ipowConvert: "testnet" | "mainnet" | "comingsoon";
  ipowNetworkId: number;
  dappList: any[] | null;
  detectedWallets: PolkadotWalletType[];
  setFeeSelection: (fee: "low" | "high" | "medium") => void;
  setSelectedAccount: (acc: PolkadotAccount) => void;
  switchWallet: (wallet: PolkadotWalletType) => Promise<void>;
  connect: (wallet: PolkadotWalletType) => Promise<void>;
  disconnect: (hardDisconnect: boolean) => void;
  signMessage: (message: string) => Promise<string | null>;
  sendTokenTo: (
    to: string,
    amount: number,
    customFee?: number,
    token?: { assetId: number; decimals: number },
  ) => Promise<string | null>;
  /** The single address-check entry point: whether it's valid, and if not, which
   * specific rule it failed (so forms can show a specific, actionable message).
   * Accepts both SS58 (Substrate) and `0x...` (EVM) addresses — a manually-entered
   * convert destination may be given in either form (see getEvmAddress below). */
  checkAddress: (address: string) => AddressCheckResult;
  isValidAddress: (address: string) => boolean;
  fetchETA: (
    txHash: string,
  ) => Promise<{ estimatedSeconds: number; isCongested: boolean } | null>;
  toggleFavoriteDapp: (dappId: number) => void;

  // --- ipow convert (signed via the Substrate wallet through pallet-revive's
  // Revive.call — see polkadot-provider.tsx for how that maps to an EVM call) ---
  /** Resolves a Substrate (SS58) account's deterministic pallet-revive fallback EVM
   * address — the identity the ipow contract actually sees for that account. */
  getEvmAddress: (ss58: string) => Promise<string | null>;
  commitNativeToBitcoin: (
    userProgram: string,
    dotAmount: number,
    bitcoinAmountSats: number,
    destination?: { networkId: number; networkAddress: string },
  ) => Promise<string | null>;
  commitBitcoinToNative: (
    btcSats: string | number,
    dotAmount: number,
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
  estimateBitcoinFromNative: (dotAmount: number) => Promise<string | null>;
  estimateNativeFromBitcoin: (btcSats: string) => Promise<string | null>;
  anchorInfo: (txId: bigint) => Promise<any | null>;
  proofInfo: (txId: bigint) => Promise<any | null>;
  windowsFor: (txId: bigint) => Promise<any | null>;
  globalHeightToHashLE: (h: bigint) => Promise<any | null>;
  globalHeaders: (hashLE: any) => Promise<any | null>;
}
