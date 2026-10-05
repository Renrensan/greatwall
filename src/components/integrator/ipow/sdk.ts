// Greatwall's link to the iPoW protocol through @ipow/sdk: which network
// does what, each network's deployment, and a read-only connection to it.
// The wallet's side (its signer) comes from the network's own provider,
// `getSigner()`. Greatwall runs the test networks; Bitcoin is mainnet.

import { JsonRpcProvider, getBytes } from "ethers";
import { Connection, PublicKey } from "@solana/web3.js";
import { SolanaBeta, SolanaVault, encodeRecipient, network, type Deployment, type NetworkName, type SolanaWallet, Bitcoin } from "@ipow/sdk";

import type { SupportedChain } from "@/app/network-provider";

/**
 * The networks Greatwall's iPoW apps (Convert, Bridge, BETA) run on now: EVM
 * networks whose wallet gives an ethers signer. Tempo sends its own
 * transactions; Solana signs with its own wallet, not wired yet. They show
 * "coming soon".
 */
export const EVM_CHAINS = ["ethereum", "base", "robinhood", "hyperliquid"] as const;
export type EvmChain = (typeof EVM_CHAINS)[number];

export function isEvmChain(chain: string): chain is EvmChain {
  return (EVM_CHAINS as readonly string[]).includes(chain);
}

/** Each network's native coin on its test network. */
export const TICKER: Record<EvmChain, string> = {
  ethereum: "ETH",
  base: "ETH",
  robinhood: "ETH",
  hyperliquid: "HYPE",
};

/** The iPoW deployment of a network, or null where there is none. */
export function deploymentOf(chain: SupportedChain): Deployment | null {
  const name = `${chain}-testnet` as NetworkName;
  try {
    return network(name);
  } catch {
    return null;
  }
}

// Reads go through the app's own /api/rpc proxies, which hold the endpoints
// (the same ones ipow's deployments use) server-side.
const RPC: Record<EvmChain, string> = {
  ethereum: "/api/rpc/eth/testnet",
  base: "/api/rpc/base/testnet",
  robinhood: "/api/rpc/robinhood/testnet",
  hyperliquid: "/api/rpc/hyperliquid/testnet",
};

const readers = new Map<EvmChain, JsonRpcProvider>();

/** A read-only connection to a network, through its proxy. One per network,
 *  reused. */
export function readProvider(chain: EvmChain): JsonRpcProvider {
  let p = readers.get(chain);
  if (!p) {
    const url = RPC[chain].startsWith("/") && typeof window !== "undefined" ? window.location.origin + RPC[chain] : RPC[chain];
    const d = deploymentOf(chain)!;
    p = new JsonRpcProvider(url, d.chainId, { staticNetwork: true });
    readers.set(chain, p);
  }
  return p;
}

/** A mempool.space link for a Bitcoin transaction. */
export const bitcoinTxLink = (txid: string) => `https://mempool.space/tx/${txid}`;

/** The decimals of a network's native coin, as its contracts count it. The
 *  convert networks all trade their native coin. */
export function coinDecimals(d: Deployment): number {
  if (d.coin.kind !== "native") throw new Error(`${d.name} trades a token, not its native coin`);
  return d.coin.decimals;
}

let solana: Connection | null = null;

/** A read-only connection to Solana devnet, through the app's proxy. */
export function solanaConnection(): Connection {
  if (!solana) {
    const path = "/api/rpc/solana/devnet";
    solana = new Connection(typeof window !== "undefined" ? window.location.origin + path : path, "confirmed");
  }
  return solana;
}

/** Solana's side of a network's vault pair, for reading. */
export const solanaVaultOf = (chain: EvmChain) => new SolanaVault(solanaConnection(), deploymentOf(chain)!.number);

/** A Solana address from the 32 bytes a vault stores, or null if not one. */
export function solanaAddress(bytes32: string): string | null {
  try {
    return new PublicKey(getBytes(bytes32)).toBase58();
  } catch {
    return null;
  }
}

/**
 * Whether `address` is a Solana wallet address, fit to receive from the
 * vault. A token account or a program's account (off the curve) is refused:
 * the vault pays receipts to a token account its owner signs for, and an
 * account no key signs for would hold them for good.
 */
export function isSolanaAddress(address: string): boolean {
  try {
    encodeRecipient(2, address.trim());
    return PublicKey.isOnCurve(new PublicKey(address.trim()).toBytes());
  } catch {
    return false;
  }
}

/** Which apps run on which networks now: Convert, the Bridge and BETA on
 *  the EVM networks and on Solana. */
export function appRunsOn(_app: "convert" | "bridge" | "beta", chain: string): boolean {
  return isEvmChain(chain) || chain === "solana";
}

/** A wallet that only reads: what the SDK's Solana classes take before a
 *  wallet is connected. */
export const READ_ONLY_SOLANA: SolanaWallet = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("Connect your Solana wallet first");
  },
  signAllTransactions: async () => {
    throw new Error("Connect your Solana wallet first");
  },
};

/** Solana's side of the pair with EVM network `peer`, signing with `wallet`. */
export const solanaVaultWith = (peer: EvmChain, wallet: SolanaWallet | null) =>
  new SolanaVault(solanaConnection(), deploymentOf(peer)!.number, wallet ?? READ_ONLY_SOLANA);

/** BETA on Solana, signing with `wallet`. */
export const solanaBeta = (wallet: SolanaWallet | null) => new SolanaBeta(solanaConnection(), wallet ?? READ_ONLY_SOLANA);

/** A link to a Solana devnet transaction or account. */
export const solanaExplorer = (kind: "tx" | "address", id: string) => `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;

/** Bitcoin as the explorers show it, for the convert screens: blockstream
 *  first (mempool.space hangs from some networks), each call given 8
 *  seconds before the next explorer is tried. */
export const bitcoinExplorer = new Bitcoin(["https://blockstream.info/api", "https://mempool.space/api"], 8_000);
