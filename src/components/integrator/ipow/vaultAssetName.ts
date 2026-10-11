// A vault asset by its number, as the history and transfer pages name it:
// the coin by its ticker, a token by the symbol Greatwall lists it as, and
// its record decimals (amounts in locks and burns count in those).

import { homeAssets } from "@ipow/sdk";
import { ZeroAddress } from "ethers";

import { deploymentOf, readProvider, solanaVaultWith, type BasketChain } from "./sdk";
import { TICKER } from "@/subcomponents/ipow/common";
import { rwaTokensOf } from "./rwaTokens";

export type AssetName = { symbol: string; decimals: number };

const evmLists = new Map<string, ReturnType<typeof homeAssets>>();
const solanaLists = new Map<string, ReturnType<ReturnType<typeof solanaVaultWith>["assets"]>>();

/** Asset `number` of `chain`'s vault in its pair `pair` (the pair with
 *  Solana is 0). Assets are only ever added, so each list is read once. */
export async function evmAssetName(chain: BasketChain, pair: number, number: number): Promise<AssetName> {
  const key = `${chain}:${pair}`;
  if (!evmLists.has(key)) {
    const list = homeAssets(readProvider(chain), deploymentOf(chain)!, pair);
    list.catch(() => evmLists.delete(key));
    evmLists.set(key, list);
  }
  const a = (await evmLists.get(key)!).find((x) => x.number === number);
  if (!a) return { symbol: `#${number}`, decimals: 9 };
  if (a.token === ZeroAddress) return { symbol: TICKER[chain], decimals: a.recordDecimals };
  const rwa = rwaTokensOf(chain).find((r) => r.token.toLowerCase() === a.token.toLowerCase());
  return { symbol: rwa?.symbol ?? `#${number}`, decimals: a.recordDecimals };
}

/** Asset `number` of Solana's vault in its pair with `peer`. */
export async function solanaAssetName(peer: BasketChain, number: number): Promise<AssetName> {
  if (!solanaLists.has(peer)) {
    const list = solanaVaultWith(peer, null).assets();
    list.catch(() => solanaLists.delete(peer));
    solanaLists.set(peer, list);
  }
  const a = (await solanaLists.get(peer)!).find((x) => x.number === number);
  if (!a) return { symbol: `#${number}`, decimals: 9 };
  if (a.mint === null) return { symbol: "SOL", decimals: a.recordDecimals };
  const rwa = rwaTokensOf("solana").find((r) => r.token === a.mint);
  return { symbol: rwa?.symbol ?? `#${number}`, decimals: a.recordDecimals };
}

/** The pair index of `chain`'s vault with Solana. */
export const solanaPairOf = (chain: BasketChain) => (deploymentOf(chain)!.vaults as readonly { peer: number }[]).findIndex((v) => v.peer === 2);
