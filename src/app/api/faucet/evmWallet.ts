// The faucet wallet on the EVM test networks (FAUCET_EVM_KEY), shared by
// what sends from it: the faucet (/api/faucet/[chain]) and the ZEC lane's
// deliveries (/api/zec). One send at a time per network and a nonce kept
// here, on globalThis, so the two never take the same nonce: Next may load
// this module once per route, but the process is one.

import { Contract, FetchRequest, JsonRpcProvider, Wallet, type TransactionResponse } from "ethers";

import { PATH_USD } from "@/components/integrator/ipow/sdk";

export type Gas = {
  symbol: string;
  decimals: number;
  /** What one drip sends, and the balance under which an address gets one. */
  drip: string;
  below: string;
  /** The gas token, on a network whose gas is a token (Tempo's PathUSD). */
  token?: string;
};
export type Chain = { rpc: () => string | undefined; send?: string; chainId: number; gas: Gas };

// Drips sized on 2026-10-12 for 100 test users from each faucet's stock: room
// for a Sepolia gas spike, and for locking or converting a little of the coin.
const ETH_L2: Gas = { symbol: "ETH", decimals: 18, drip: "0.003", below: "0.0005" };
export const CHAINS: Record<string, Chain> = {
  ethereum: { rpc: () => process.env.ETH_TESTNET_RPC_URL, chainId: 11155111, gas: { symbol: "ETH", decimals: 18, drip: "0.004", below: "0.001" } },
  base: { rpc: () => process.env.BASE_TESTNET_RPC_URL, chainId: 84532, gas: ETH_L2 },
  arbitrum: { rpc: () => process.env.ARBITRUM_TESTNET_RPC_URL, chainId: 421614, gas: { ...ETH_L2, drip: "0.005" } },
  robinhood: { rpc: () => process.env.ROBINHOOD_TESTNET_RPC_URL, chainId: 46630, gas: ETH_L2 },
  // Its provider refuses sends: they go to the network's own endpoint.
  hyperliquid: { rpc: () => process.env.HYPERLIQUID_TESTNET_RPC_URL, send: "https://rpc.hyperliquid-testnet.xyz/evm", chainId: 998, gas: { symbol: "HYPE", decimals: 18, drip: "0.0025", below: "0.001" } },
  // Fees are paid in PathUSD (6 decimals); there is no native coin to send.
  tempo: { rpc: () => process.env.TEMPO_TESTNET_RPC_URL, chainId: 42431, gas: { symbol: "PathUSD", decimals: 6, drip: "20", below: "5", token: PATH_USD } },
};

export const ERC20 = ["function balanceOf(address) view returns (uint256)", "function transfer(address to, uint256 amount) returns (bool)"];
/** How long the server waits for a send to be mined before answering. */
export const WAIT_MS = 90_000;

export function provider(url: string, chainId: number) {
  const r = new FetchRequest(url);
  r.timeout = 20_000;
  return new JsonRpcProvider(r, chainId, { staticNetwork: true });
}

const shared = globalThis as unknown as { __gwEvmTurns?: Map<string, Promise<unknown>>; __gwEvmNonces?: Map<string, number> };
/** One send at a time per network, so two sends never take the same nonce. */
const turns = (shared.__gwEvmTurns ??= new Map<string, Promise<unknown>>());
export function inTurn<T>(chain: string, run: () => Promise<T>): Promise<T> {
  const next = (turns.get(chain) ?? Promise.resolve()).catch(() => {}).then(run);
  turns.set(chain, next);
  return next;
}
/** The next nonce per network, kept here: a load-balanced RPC's "pending"
 *  count can trail a send made a moment ago. Forgotten after a failed send. */
export const nonces = (shared.__gwEvmNonces ??= new Map<string, number>());


/** Sends `amount` (the token's smallest units) of `token` to `to` on `chain`
 *  from the faucet wallet, in turn; answers once it is mined, or after
 *  WAIT_MS with its hash. Throws when the key or the network is missing. */
export async function sendToken(chain: string, token: string, to: string, amount: bigint): Promise<string> {
  const c = CHAINS[chain];
  const key = process.env.FAUCET_EVM_KEY;
  const rpc = c?.rpc();
  if (!c || !key || !rpc) throw new Error(`no faucet wallet on ${chain}`);
  const wallet = new Wallet(key, c.send ? provider(c.send, c.chainId) : provider(rpc, c.chainId));
  const tx: TransactionResponse = await inTurn(chain, async () => {
    const nonce = Math.max(nonces.get(chain) ?? 0, await wallet.getNonce("pending"));
    try {
      const sent: TransactionResponse = await (new Contract(token, ERC20, wallet) as Contract).transfer(to, amount, { nonce });
      nonces.set(chain, nonce + 1);
      return sent;
    } catch (e) {
      nonces.delete(chain);
      throw e;
    }
  });
  await Promise.race([tx.wait(), new Promise((r) => setTimeout(r, WAIT_MS))]);
  return tx.hash;
}

/** The faucet wallet's balance of `token` on `chain`. */
export async function stockOf(chain: string, token: string): Promise<bigint> {
  const c = CHAINS[chain];
  const key = process.env.FAUCET_EVM_KEY;
  const rpc = c?.rpc();
  if (!c || !key || !rpc) return BigInt(0);
  return new Contract(token, ERC20, provider(rpc, c.chainId)).balanceOf(new Wallet(key).address);
}
