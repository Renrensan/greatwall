// Greatwall's link to the iPoW protocol through @ipow/sdk: which network
// does what, each network's deployment, and a read-only connection to it.
// The wallet's side (its signer) comes from the network's own provider,
// `getSigner()`. Greatwall runs the test networks; Bitcoin is mainnet.

import { JsonRpcProvider, getBytes } from "ethers";
import { Connection, PublicKey } from "@solana/web3.js";
import { SolanaBeta, SolanaVault, encodeRecipient, network, type Deployment, type NetworkName, type SolanaWallet, Bitcoin } from "@ipow/sdk";

import type { SupportedChain } from "@/app/network-provider";

/**
 * The EVM networks Greatwall's iPoW apps (Convert, Bridge, BETA) know: their
 * wallet gives an ethers signer. Tempo sends its own transactions. Arbitrum
 * (network 9, D141) is known before it is deployed.
 */
export const KNOWN_EVM_CHAINS = ["ethereum", "base", "robinhood", "hyperliquid", "arbitrum"] as const;
export type EvmChain = (typeof KNOWN_EVM_CHAINS)[number];

/** Those the apps run on now: the ones with a deployment in the SDK. The
 *  others show "coming soon" until the SDK carries theirs. */
export const EVM_CHAINS: readonly EvmChain[] = KNOWN_EVM_CHAINS.filter((c) => deploymentOf(c) !== null);

export function isEvmChain(chain: string): chain is EvmChain {
  return (EVM_CHAINS as readonly string[]).includes(chain);
}

/**
 * The EVM networks with index tokens (BETA): the EVM_CHAINS, and Tempo.
 * Tempo has no coin of its own and refuses a transaction carrying value, so
 * Greatwall offers tokens only as its parts (PathUSD, its test RWA tokens,
 * the vault's receipts of Solana's assets) and a mint carries no value. The
 * contract would take a part of the zero address there, but such a basket
 * can never be minted; Greatwall shows that part as unknown. Lock and
 * Convert don't run on Tempo yet (their contracts there are the token builds).
 */
export type BasketChain = EvmChain | "tempo";
export const BASKET_CHAINS: readonly BasketChain[] = [...EVM_CHAINS, ...(deploymentOf("tempo") ? (["tempo"] as const) : [])];

export function isBasketChain(chain: string): chain is BasketChain {
  return (BASKET_CHAINS as readonly string[]).includes(chain);
}

/** Tempo's money: PathUSD, its fee token (6 decimals). */
export const PATH_USD = "0x20C0000000000000000000000000000000000000";

/** Each network's native coin on its test network (Tempo has none: its
 *  money is PathUSD, a token). */
export const TICKER: Record<BasketChain, string> = {
  ethereum: "ETH",
  base: "ETH",
  robinhood: "ETH",
  hyperliquid: "HYPE",
  arbitrum: "ETH",
  tempo: "pathUSD",
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
const RPC: Record<BasketChain, string> = {
  ethereum: "/api/rpc/eth/testnet",
  base: "/api/rpc/base/testnet",
  robinhood: "/api/rpc/robinhood/testnet",
  hyperliquid: "/api/rpc/hyperliquid/testnet",
  arbitrum: "/api/rpc/arbitrum/testnet",
  tempo: "/api/rpc/tempo/testnet",
};

const readers = new Map<BasketChain, JsonRpcProvider>();

/** A read-only connection to a network, through its proxy. One per network,
 *  reused. */
export function readProvider(chain: BasketChain): JsonRpcProvider {
  let p = readers.get(chain);
  if (!p) {
    const url = RPC[chain].startsWith("/") && typeof window !== "undefined" ? window.location.origin + RPC[chain] : RPC[chain];
    const d = deploymentOf(chain)!;
    p = new JsonRpcProvider(url, d.chainId, { staticNetwork: true });
    readers.set(chain, p);
  }
  return p;
}

let solana: Connection | null = null;

/** Where a Solana connection subscribes to a transaction's confirmation: a
 *  WebSocket, which this app's RPC proxy (HTTP only) cannot carry. Without
 *  it every send waited out web3.js's 30-second timeout (2026-10-10). */
export const SOLANA_WS = "wss://api.devnet.solana.com";

/** A read-only connection to Solana devnet, through the app's proxy. */
export function solanaConnection(): Connection {
  if (!solana) {
    const path = "/api/rpc/solana/devnet";
    solana = new Connection(typeof window !== "undefined" ? window.location.origin + path : path, { commitment: "confirmed", wsEndpoint: SOLANA_WS });
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
 *  the EVM networks and on Solana, and BETA on Tempo too. */
export function appRunsOn(app: "convert" | "bridge" | "beta", chain: string): boolean {
  if (app === "beta" && isBasketChain(chain)) return true;
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

/** Bitcoin as the explorers show it, for the convert screens: through this
 *  app's server (/api/bitcoin, which tries mempool.space then
 *  blockstream.info), so a network that blocks the explorers doesn't block
 *  the app; mempool.space directly if the server can't be reached. */
export const bitcoinExplorer = new Bitcoin(["/api/bitcoin", "https://mempool.space/api"], 22_000);
