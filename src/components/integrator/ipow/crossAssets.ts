// The other networks' assets as they exist on this one: the vault's
// receipts (vSOL on Ethereum for SOL, vETH on Solana for ETH, a receipt
// per RWA token once some is locked), shown by the original asset's
// symbol, name and logo (ETH, not vETH: it is ETH locked on its own
// network, usable here; the on-chain symbol keeps the v for wallets) so a basket can mix networks without the user knowing a
// receipt's address. A receipt exists here only once its asset was first
// carried over (the vault makes it then); until then it is listed but
// cannot be a part. An asset Greatwall cannot name (a test mint with no
// metadata) is left out. The vault pairs each EVM network with Solana
// only, so an EVM network's assets reach another EVM network only through
// Solana: not offered here (`pairedWith`).

import { SolanaVault, homeAssets, receiptTokens, type HomeAsset, type SolanaAsset } from "@ipow/sdk";
import { ZeroAddress } from "ethers";

import type { SupportedChain } from "@/app/network-provider";
import { BASKET_CHAINS, EVM_CHAINS, PATH_USD, TICKER, deploymentOf, readProvider, solanaConnection, type BasketChain, type EvmChain } from "./sdk";
import { rwaTokensOf } from "./rwaTokens";
import { tokenInfo } from "./tokens";
import { PublicKey } from "@solana/web3.js";

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

/** Solana's peers whose assets can be parts of a basket there: every EVM
 *  network Greatwall runs, and Tempo, whose vault pairs with Solana only
 *  (a Tempo asset can be a part on Solana and nowhere else). */
function solanaPeers(): SupportedChain[] {
  return deploymentOf("tempo") ? [...EVM_CHAINS, "tempo"] : [...EVM_CHAINS];
}

/** A read-only connection to an EVM network, Tempo included, through the app's proxy. */
const readerOf = (chain: SupportedChain) => readProvider(chain as BasketChain);

/** The networks whose assets can be parts on `chain`: its vault pairs, as
 *  deployed (Solana for each EVM network and for Tempo; EVM pairs where
 *  they exist). */
export function pairedWith(chain: SupportedChain): SupportedChain[] {
  if (chain === "solana") return solanaPeers();
  if (!(BASKET_CHAINS as readonly string[]).includes(chain)) return [];
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
async function evmAssetsOn(chain: BasketChain, peer: EvmChain): Promise<CrossChoice[]> {
  const d = deploymentOf(chain)!;
  const dp = deploymentOf(peer)!;
  // The generated deployments type each `peer` as the literal it was written
  // with; a pair added later carries any number.
  const here = vaultsOf(d).findIndex((v) => v.peer === dp.number);
  const there = vaultsOf(dp).findIndex((v) => v.peer === d.number);
  if (here < 0 || there < 0) return [];
  // A failed read throws: the caller marks the list partial, not cached.
  const assets: HomeAsset[] = await homeAssets(readProvider(peer), dp, there);
  const receipts = await receiptTokens(readProvider(chain), d, here, Math.max(assets.length, 1));
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
      return { token: receipt ?? "", symbol, name, decimals, logo: coin ? `/assets/networks/${peer}.png` : rwa?.logo ?? null, from: peer, exists: receipt !== null, asset: a.number, receipts: vaultsOf(d)[here].receipts, home: coin ? null : a.token };
    })
  );
}

/** Solana's assets as receipts on `chain`. */
async function solanaAssetsOn(chain: BasketChain): Promise<CrossChoice[]> {
  const d = deploymentOf(chain)!;
  const pair = vaultsOf(d).findIndex((v) => v.peer === 2);
  if (pair < 0) return [];
  const assets: SolanaAsset[] = await new SolanaVault(solanaConnection(), d.number).assets();
  const receipts = await receiptTokens(readProvider(chain), d, pair, Math.max(assets.length, 1));
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
      return { token: receipt ?? "", symbol, name, decimals, logo: a.mint === null ? "/assets/networks/solana.png" : rwa?.logo ?? null, from: "solana", exists: receipt !== null, asset: a.number, receipts: vaultsOf(d)[pair].receipts, home: a.mint };
    })
  );
}

/** The data of several Solana accounts, null where one does not exist,
 *  read in batches of 100 (getMultipleAccounts' limit). A failed read
 *  throws: "not made" must not stand in for "not known". */
async function mintAccounts(keys: PublicKey[]): Promise<(Uint8Array | null)[]> {
  const out: (Uint8Array | null)[] = [];
  for (let i = 0; i < keys.length; i += 100) {
    const batch = keys.slice(i, i + 100);
    const infos = await solanaConnection().getMultipleAccountsInfo(batch);
    out.push(...infos.map((x) => (x ? new Uint8Array(x.data) : null)));
  }
  return out;
}

/** An EVM network's assets (Tempo's too) as receipts on Solana. */
async function evmAssetsOnSolana(peer: SupportedChain): Promise<CrossChoice[]> {
  const d = deploymentOf(peer);
  if (!d?.vaults?.length) return [];
  // The vault paired with Solana.
  const pair = vaultsOf(d).findIndex((v) => v.peer === 2);
  if (pair < 0) return [];
  const assets: HomeAsset[] = await homeAssets(readerOf(peer), d, pair);
  const vault = new SolanaVault(solanaConnection(), d.number);
  const known = rwaTokensOf(peer);
  // Tempo's coin is a token, PathUSD: its vault's asset 0, named as a coin.
  const isCoin = (token: string) => token === ZeroAddress || (peer === "tempo" && token.toLowerCase() === PATH_USD.toLowerCase());
  const named = assets.filter((a) => isCoin(a.token) || known.some((r) => r.token.toLowerCase() === a.token.toLowerCase()));
  // Every receipt mint read at once: whether the vault made it yet, and its
  // decimals (a mint's byte 44, Token and Token-2022 alike). One request per
  // network, not two per asset, so a busy RPC still answers in time.
  const mints = named.map((a) => vault.receiptMint(a.number));
  const accounts = await mintAccounts(mints);
  return Promise.all(
    named.map(async (a, i) => {
      const mint = mints[i].toBase58();
      const account = accounts[i];
      const exists = account !== null;
      const coin = isCoin(a.token);
      const rwa = coin ? null : known.find((r) => r.token.toLowerCase() === a.token.toLowerCase());
      const symbol = coin ? TICKER[peer as BasketChain] : rwa!.symbol;
      const name = coin ? (peer === "tempo" ? "PathUSD" : nameOf(peer)) : rwa!.name;
      const decimals = account && account.length > 44 ? account[44] : a.recordDecimals;
      // `home` is the token on its own network; null only for a real coin (PathUSD is a token).
      return { token: mint, symbol, name, decimals, logo: coin ? `/assets/networks/${peer}.png` : rwa?.logo ?? null, from: peer, exists, asset: a.number, receipts: null, home: a.token === ZeroAddress ? null : a.token };
    })
  );
}

/** Each network's list for a few minutes, so a page opened again (or
 *  another page) reuses it instead of reading every network again. Only a
 *  complete read is kept: one where every network answered. A receipt the
 *  vault makes meanwhile shows once the list is read again; a page that
 *  needs it now (Unlock) forgets the list first (`forgetCrossChoices`). */
const CACHE_MS = 5 * 60_000;
const cache = new Map<string, { at: number; read: Promise<{ list: CrossChoice[]; complete: boolean }> }>();

/** The other networks' assets available on `chain`, those bridged first,
 *  and whether every network answered: a list that is not complete may lack
 *  assets that exist, so nothing can be concluded from one missing in it. */
export function crossChoicesRead(chain: SupportedChain): Promise<{ list: CrossChoice[]; complete: boolean }> {
  const hit = cache.get(chain);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.read;
  const read = readCrossChoices(chain);
  cache.set(chain, { at: Date.now(), read });
  read.then((r) => !r.complete && cache.delete(chain)).catch(() => cache.delete(chain));
  return read;
}

/** The other networks' assets available on `chain`, those bridged first. */
export function crossChoicesOn(chain: SupportedChain): Promise<CrossChoice[]> {
  return crossChoicesRead(chain).then((r) => r.list);
}

/** Drops `chain`'s list, so the next read is fresh. */
export function forgetCrossChoices(chain: SupportedChain) {
  cache.delete(chain);
}

async function readCrossChoices(chain: SupportedChain): Promise<{ list: CrossChoice[]; complete: boolean }> {
  let complete = true;
  // A network that fails is left out of this read, and the read not cached.
  const settle = (p: Promise<CrossChoice[]>) =>
    p.catch(() => {
      complete = false;
      return [] as CrossChoice[];
    });
  let all: CrossChoice[] = [];
  if (chain === "solana") {
    const lists = await Promise.all(solanaPeers().map((peer) => settle(evmAssetsOnSolana(peer))));
    all = lists.flat();
  } else if ((BASKET_CHAINS as readonly string[]).includes(chain)) {
    const lists = await Promise.all(pairedWith(chain).map((peer) => settle(peer === "solana" ? solanaAssetsOn(chain as BasketChain) : evmAssetsOn(chain as BasketChain, peer as EvmChain))));
    all = lists.flat();
  }
  return { list: all.sort((a, b) => Number(b.exists) - Number(a.exists)), complete };
}
