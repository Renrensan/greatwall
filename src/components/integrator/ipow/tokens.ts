// What a token is, for showing amounts: its symbol and decimals, the zero
// address being the network's own coin. Read once per token and kept.

import { Contract, ZeroAddress } from "ethers";

import { TICKER, readProvider, type EvmChain } from "./sdk";

export type TokenInfo = { address: string; symbol: string; decimals: number };

const ERC20 = ["function symbol() view returns (string)", "function decimals() view returns (uint8)", "function balanceOf(address) view returns (uint256)"];
const known = new Map<string, Promise<TokenInfo>>();

export function tokenInfo(chain: EvmChain, address: string): Promise<TokenInfo> {
  if (address === ZeroAddress) return Promise.resolve({ address, symbol: TICKER[chain], decimals: 18 });
  const key = `${chain}:${address.toLowerCase()}`;
  let info = known.get(key);
  if (!info) {
    const c = new Contract(address, ERC20, readProvider(chain));
    info = Promise.all([c.symbol() as Promise<string>, c.decimals() as Promise<bigint>]).then(([symbol, decimals]) => ({
      address,
      symbol,
      decimals: Number(decimals),
    }));
    info.catch(() => known.delete(key));
    known.set(key, info);
  }
  return info;
}

/** What `owner` holds of a token, or of the coin for the zero address. */
export function balanceOf(chain: EvmChain, token: string, owner: string): Promise<bigint> {
  const p = readProvider(chain);
  return token === ZeroAddress ? p.getBalance(owner) : new Contract(token, ERC20, p).balanceOf(owner);
}
