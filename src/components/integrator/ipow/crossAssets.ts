// The other networks' assets as they exist on this one: the vault's
// receipts (vSOL on Ethereum for SOL, vETH on Solana for ETH, a receipt
// per RWA token once it has been bridged), shown by the original asset's
// name and logo so a basket can mix networks without the user knowing a
// receipt's address. A receipt exists here only once its asset was first
// carried over (the vault makes it then); until then it is listed but
// cannot be a part. An asset Greatwall cannot name (a test mint with no
// metadata) is left out. The vault pairs each EVM network with Solana
// only, so an EVM network's assets reach another EVM network only through
// Solana: not offered here (`pairedWith`).

import { homeAssets, receiptTokens, type HomeAsset, type SolanaAsset } from "@ipow/sdk";
import { ZeroAddress } from "ethers";

import type { SupportedChain } from "@/app/network-provider";
import { EVM_CHAINS, TICKER, deploymentOf, readProvider, solanaVaultOf, type EvmChain } from "./sdk";
import { rwaTokensOf } from "./rwaTokens";
import { tokenInfo } from "./tokens";
import { mintExists, solanaToken } from "./solanaTokens";

export type CrossChoice = {
  /** The receipt here: an ERC-20 address on an EVM network, a mint on Solana. */
  token: string;
  /** The receipt's symbol (vSOL), and the original asset's name. */
  symbol: string;
  name: string;
  decimals: number;
  logo: string | null;
  /** The network the asset lives on. */
  from: SupportedChain;
  /** Whether the receipt has been made here yet. A basket may name it
   *  before (E5); nothing can be minted until it is. */
  exists: boolean;
  /** The asset's number in its home vault, and on an EVM network the
   *  vault's receipts contract here: what a basket records for a part
   *  not made yet (E5). */
  asset: number;
  receipts: string | null;
  /** The asset on its home network: a token address, a mint, or null for the coin. */
  home: string | null;
};

const nameOf = (chain: string) => chain.charAt(0).toUpperCase() + chain.slice(1);

/** A deployment's vault pairs, loosely typed: the generated deployments
 *  type each as the readonly literal it was written with. */
const vaultsOf = (d: { vaults: unknown }) => d.vaults as readonly { peer: number; vault: string; receipts: string }[];

/** The EVM network of a protocol network number (D133), if Greatwall serves it. */
export const chainOfNumber = (n: number): EvmChain | null => EVM_CHAINS.find((c) => deploymentOf(c)?.number === n) ?? null;

/** The networks whose assets can be parts on `chain`: its vault pairs, as
 *  deployed (Solana for each EVM network; EVM pairs where they exist). */
export function pairedWith(chain: SupportedChain): SupportedChain[] {
  if (chain === "solana") return [...EVM_CHAINS];
  if (!(EVM_CHAINS as readonly string[]).includes(chain)) return [];
  const d = deploymentOf(chain);
  if (!d) return [];
  const out: SupportedChain[] = [];
  for (const v of vaultsOf(d)) {
    if (v.peer === 2) out.push("solana");
    else {
      const peer = chainOfNumber(v.peer);
      if (peer) out.push(peer);
    }
  }
  return out;
}

/** Another EVM network's assets as receipts on `chain`, through their vault pair. */
async function evmAssetsOn(chain: EvmChain, peer: EvmChain): Promise<CrossChoice[]> {
  const d = deploymentOf(chain)!;
  const dp = deploymentOf(peer)!;
  // The generated deployments type each `peer` as the literal it was written
  // with; a pair added later carries any number.
  const here = vaultsOf(d).findIndex((v) => v.peer === dp.number);
  const there = vaultsOf(dp).findIndex((v) => v.peer === d.number);
  if (here < 0 || there < 0) return [];
  let assets: HomeAsset[];
  try {
    assets = await homeAssets(readProvider(peer), dp, there);
  } catch {
    return [];
  }
  const receipts = await receiptTokens(readProvider(chain), d, here, Math.max(assets.length, 1)).catch(() => new Map<number, string>());
  const known = rwaTokensOf(peer);
  const named = assets.filter((a) => a.token === ZeroAddress || known.some((r) => r.token.toLowerCase() === a.token.toLowerCase()));
  return Promise.all(
    named.map(async (a) => {
      const receipt = receipts.get(a.number) ?? null;
      const coin = a.token === ZeroAddress;
      const rwa = coin ? null : known.find((r) => r.token.toLowerCase() === a.token.toLowerCase());
      const symbol = coin ? TICKER[peer] : rwa!.symbol;
      const name = coin ? nameOf(peer) : rwa!.name;
      let decimals = a.recordDecimals;
      if (receipt) decimals = await tokenInfo(chain, receipt).then((i) => i.decimals).catch(() => a.recordDecimals);
      return { token: receipt ?? "", symbol: `v${symbol}`, name, decimals, logo: coin ? `/assets/networks/${peer}.png` : rwa?.logo ?? null, from: peer, exists: receipt !== null, asset: a.number, receipts: vaultsOf(d)[here].receipts, home: coin ? null : a.token };
    })
  );
}

/** Solana's assets as receipts on `chain`. */
async function solanaAssetsOn(chain: EvmChain): Promise<CrossChoice[]> {
  const d = deploymentOf(chain)!;
  const pair = vaultsOf(d).findIndex((v) => v.peer === 2);
  if (pair < 0) return [];
  let assets: SolanaAsset[];
  try {
    assets = await solanaVaultOf(chain).assets();
  } catch {
    return [];
  }
  const receipts = await receiptTokens(readProvider(chain), d, pair, Math.max(assets.length, 1)).catch(() => new Map<number, string>());
  const known = rwaTokensOf("solana");
  const named = assets.filter((a) => a.mint === null || known.some((r) => r.token === a.mint));
  return Promise.all(
    named.map(async (a) => {
      const receipt = receipts.get(a.number) ?? null;
      const rwa = a.mint ? known.find((r) => r.token === a.mint) : null;
      const symbol = a.mint === null ? "SOL" : rwa!.symbol;
      const name = a.mint === null ? "Solana" : rwa!.name;
      let decimals = a.recordDecimals;
      if (receipt) decimals = await tokenInfo(chain, receipt).then((i) => i.decimals).catch(() => a.recordDecimals);
      return { token: receipt ?? "", symbol: `v${symbol}`, name, decimals, logo: a.mint === null ? "/assets/networks/solana.png" : rwa?.logo ?? null, from: "solana", exists: receipt !== null, asset: a.number, receipts: vaultsOf(d)[pair].receipts, home: a.mint };
    })
  );
}

/** An EVM network's assets as receipts on Solana. */
async function evmAssetsOnSolana(peer: EvmChain): Promise<CrossChoice[]> {
  const d = deploymentOf(peer);
  if (!d?.vaults?.length) return [];
  let assets: HomeAsset[];
  try {
    assets = await homeAssets(readProvider(peer), d, 0);
  } catch {
    return [];
  }
  const vault = solanaVaultOf(peer);
  const known = rwaTokensOf(peer);
  const named = assets.filter((a) => a.token === ZeroAddress || known.some((r) => r.token.toLowerCase() === a.token.toLowerCase()));
  return Promise.all(
    named.map(async (a) => {
      const mint = vault.receiptMint(a.number).toBase58();
      const exists = await mintExists(mint).catch(() => false);
      const coin = a.token === ZeroAddress;
      const rwa = coin ? null : known.find((r) => r.token.toLowerCase() === a.token.toLowerCase());
      const symbol = coin ? TICKER[peer] : rwa!.symbol;
      const name = coin ? nameOf(peer) : rwa!.name;
      let decimals = a.recordDecimals;
      if (exists) decimals = await solanaToken(mint).then((i) => i.decimals).catch(() => a.recordDecimals);
      return { token: mint, symbol: `v${symbol}`, name, decimals, logo: coin ? `/assets/networks/${peer}.png` : rwa?.logo ?? null, from: peer, exists, asset: a.number, receipts: null, home: coin ? null : a.token };
    })
  );
}

/** The other networks' assets available on `chain`, those bridged first. */
export async function crossChoicesOn(chain: SupportedChain): Promise<CrossChoice[]> {
  let all: CrossChoice[] = [];
  if (chain === "solana") {
    const lists = await Promise.all(EVM_CHAINS.map((peer) => evmAssetsOnSolana(peer).catch(() => [])));
    all = lists.flat();
  } else if ((EVM_CHAINS as readonly string[]).includes(chain)) {
    const lists = await Promise.all(
      pairedWith(chain).map((peer) => (peer === "solana" ? solanaAssetsOn(chain as EvmChain) : evmAssetsOn(chain as EvmChain, peer as EvmChain)).catch(() => []))
    );
    all = lists.flat();
  }
  return all.sort((a, b) => Number(b.exists) - Number(a.exists));
}
