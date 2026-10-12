// The index tokens Pay with ZEC sells (docs/zec-lane.md): the BETA baskets on
// Solana devnet and on the EVM test networks, each with its name, image and
// parts, and its price per token in dollars.
//
// - Solana: every basket (the program lists them). A part is a Solana token
//   or a receipt of another network's asset; a receipt's mint is worked out
//   from its network and asset number, and the asset's token read from that
//   network's vault, as the index page does.
// - EVM: the baskets the app indexes (../baskets/scan.ts: Ethereum, Base,
//   Tempo) are listed; any basket on any EVM network can be bought from its
//   own page (`indexOf`). A part is the network's coin, a test token, or a
//   receipt of this network's vaults, named by the asset it stands for (its
//   symbol without the receipt's "v").
//
// Prices: the test tokens' reference prices, the coins' market prices. Kept
// five minutes.

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Contract, ZeroAddress, type JsonRpcProvider } from "ethers";
import { SolanaBeta, SolanaVault, WRAPPED_SOL, getBasket, homeAssets, metadataAddress, network, parseMetadata, type NetworkName } from "@ipow/sdk";

import { RWA_TOKENS } from "@/components/integrator/ipow/rwaTokens";
import { REFERENCE_USD } from "@/components/integrator/ipow/referencePrices";
import { BUILT_IN } from "@/components/integrator/ipow/builtInIndexes";
import { CHAINS, provider } from "../faucet/evmWallet";
import { scanBaskets } from "../baskets/scan";

export type IndexPart = { mint: string; symbol: string; perToken: string; decimals: number; usd: number };
export type IndexInfo = {
  /** "solana", or the EVM network the basket is on. */
  chain: string;
  /** The basket: its address on Solana, its key on an EVM network. */
  address: string;
  /** The index token: its mint on Solana, its ERC-20 on an EVM network. */
  beta: string;
  decimals: number;
  symbol: string;
  name: string;
  image: string | null;
  usdPerToken: number;
  mintFeeBps: number;
  parts: IndexPart[];
};

const PEERS = ["ethereum", "base", "arbitrum", "robinhood", "hyperliquid", "tempo"] as const;
export const EVM_CHAINS: readonly string[] = PEERS;
const COIN: Record<string, string> = { ethereum: "ETH", base: "ETH", arbitrum: "ETH", robinhood: "ETH", hyperliquid: "HYPE" };
const ONE = BigInt(1_000_000_000);

export const solanaConnection = () => new Connection(process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
const READ_ONLY = { publicKey: Keypair.generate().publicKey, signTransaction: async () => { throw new Error("read only"); }, signAllTransactions: async () => { throw new Error("read only"); } };

/** The coins' market prices in dollars (CoinGecko), kept a minute. */
let coins: { at: number; usd: Record<string, number> } | null = null;
async function coinPrices(): Promise<Record<string, number>> {
  if (coins && Date.now() - coins.at < 60_000) return coins.usd;
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,hyperliquid&vs_currencies=usd", { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    const b: any = await r.json();
    const usd = { BTC: b?.bitcoin?.usd, ETH: b?.ethereum?.usd, SOL: b?.solana?.usd, HYPE: b?.hyperliquid?.usd };
    coins = { at: Date.now(), usd: Object.fromEntries(Object.entries(usd).filter(([, v]) => Number(v) > 0)) as Record<string, number> };
  } catch {
    coins = coins ?? { at: 0, usd: {} };
  }
  return coins.usd;
}

/** Receipt mint on Solana -> the symbol of the asset it stands for. */
let receipts: { at: number; symbols: Map<string, string> } | null = null;
async function receiptSymbols(): Promise<Map<string, string>> {
  if (receipts && Date.now() - receipts.at < 3600_000) return receipts.symbols;
  const symbols = new Map<string, string>();
  const conn = solanaConnection();
  await Promise.all(
    PEERS.map(async (chain) => {
      const c = CHAINS[chain];
      const rpc = c?.rpc();
      if (!c || !rpc) return;
      const d: any = network(`${chain}-testnet` as any);
      const pair = (d.vaults as { peer: number }[]).findIndex((v) => v.peer === 2);
      if (pair < 0) return;
      const assets: { number: number; token: string }[] = await homeAssets(provider(rpc, c.chainId) as JsonRpcProvider, d, pair).catch(() => []);
      const vault = new SolanaVault(conn, d.number);
      for (const a of assets) {
        const coin = /^0x0+$/.test(a.token);
        const sym = coin ? COIN[chain] : (RWA_TOKENS[chain]?.find((t) => t.token.toLowerCase() === a.token.toLowerCase())?.symbol ?? null);
        if (sym) symbols.set(vault.receiptMint(a.number).toBase58(), sym);
      }
    })
  );
  for (const t of RWA_TOKENS.solana ?? []) symbols.set(t.token, t.symbol);
  symbols.set(WRAPPED_SOL, "SOL");
  receipts = { at: Date.now(), symbols };
  return symbols;
}

/** An index's image from its metadata URI: GREAT's from the copy shipped with
 *  the app, else the JSON's image when both are HTTPS. */
async function imageOf(uri: string): Promise<string | null> {
  const id = uri.match(/\/api\/beta\/metadata\/([0-9a-f]{24})/)?.[1];
  if (id && BUILT_IN[id]) return BUILT_IN[id].image;
  if (!/^https:\/\//.test(uri)) return null;
  return fetch(uri, { signal: AbortSignal.timeout(5_000) })
    .then((r) => r.json())
    .then((j) => (typeof j?.image === "string" && /^https:\/\//.test(j.image) ? j.image : null))
    .catch(() => null);
}

/** A part's price per whole token: a test token's reference price, else the coin's market price. */
const priceOf = (symbol: string, prices: Record<string, number>) => REFERENCE_USD[symbol] ?? prices[symbol === "cbBTC" ? "BTC" : symbol] ?? NaN;

let cache: { at: number; list: IndexInfo[] } | null = null;

/** Every index that can be bought now, with its price per token: Solana's,
 *  then the EVM networks' the app indexes. GREAT first, then by price. */
export async function listIndexes(): Promise<IndexInfo[]> {
  if (cache && Date.now() - cache.at < 300_000) return cache.list;
  const [solana, evm] = await Promise.all([listSolana(), Promise.all(EVM_CHAINS.map((c) => listEvm(c).catch(() => [] as IndexInfo[])))]);
  const list = [...solana, ...evm.flat()];
  list.sort((a, b) => (a.symbol === "GREAT" ? -1 : b.symbol === "GREAT" ? 1 : b.usdPerToken - a.usdPerToken));
  cache = { at: Date.now(), list };
  return list;
}

/** The indexes on Solana that can be minted now. */
async function listSolana(): Promise<IndexInfo[]> {
  const conn = solanaConnection();
  const sb = new SolanaBeta(conn, READ_ONLY as any);
  const [addresses, symbols, prices] = await Promise.all([sb.allBaskets(), receiptSymbols(), coinPrices()]);
  const list: IndexInfo[] = [];
  for (const address of addresses) {
    try {
      const b: any = await sb.getBasket(address);
      if (b.parts.some((p: any) => !p.made) || b.supply === BigInt(0)) continue;
      const parts: IndexPart[] = b.parts.map((p: any) => {
        const symbol = symbols.get(p.mint) ?? "?";
        // Per whole token of the index, in the part's smallest units: what
        // minting one takes now (its share of what the basket holds).
        const per = (BigInt(p.held) * ONE) / BigInt(b.supply);
        const price = priceOf(symbol, prices);
        return { mint: p.mint, symbol, perToken: per.toString(), decimals: p.decimals, usd: (Number(per) / 10 ** p.decimals) * price };
      });
      const usdPerToken = parts.reduce((s, p) => s + p.usd, 0) * (1 + b.mintFeeBps / 10_000);
      if (!Number.isFinite(usdPerToken) || usdPerToken <= 0) continue;
      // Its name and image: the token's metadata, GREAT's from the copy shipped with the app.
      const meta = await conn.getAccountInfo(new PublicKey(metadataAddress(new PublicKey(b.beta)) as any)).then((a) => (a ? (parseMetadata(a.data) as any) : null)).catch(() => null);
      const image = await imageOf(String(meta?.uri ?? ""));
      list.push({ chain: "solana", address, beta: b.beta, decimals: 9, symbol: meta?.symbol || b.symbol || "BETA", name: meta?.name || b.name || "Index", image, usdPerToken, mintFeeBps: b.mintFeeBps, parts });
    } catch {
      // A basket that cannot be read is left out this time.
    }
  }
  return list;
}

// ---------------------------------------------------------------- the EVM networks

const ERC20_META = ["function symbol() view returns (string)", "function decimals() view returns (uint8)"];
/** A token's symbol and decimals, kept: they never change. */
const tokenMeta = new Map<string, Promise<{ symbol: string; decimals: number }>>();
function metaOf(chain: string, token: string, p: JsonRpcProvider) {
  const id = `${chain}:${token.toLowerCase()}`;
  if (!tokenMeta.has(id)) {
    const c = new Contract(token, ERC20_META, p);
    const read = Promise.all([c.symbol(), c.decimals()]).then(([symbol, decimals]) => ({ symbol: String(symbol), decimals: Number(decimals) }));
    read.catch(() => tokenMeta.delete(id));
    tokenMeta.set(id, read);
  }
  return tokenMeta.get(id)!;
}

/** A read-only provider of an EVM network, through its RPC on this server. */
export function evmProvider(chain: string): JsonRpcProvider {
  const c = CHAINS[chain];
  const rpc = c?.rpc();
  if (!c || !rpc) throw new Error(`${chain} is not set up on this server`);
  return provider(rpc, c.chainId) as JsonRpcProvider;
}

/** EVM basket `key` on `chain`, priced, or null when it cannot be minted now
 *  (a part not made, nothing minted yet, a part Greatwall cannot name or price). */
export async function evmIndex(chain: string, key: string, prices?: Record<string, number>): Promise<IndexInfo | null> {
  const p = evmProvider(chain);
  const d: any = network(`${chain}-testnet` as NetworkName);
  const b = await getBasket(p as any, d, key);
  if (b.parts.some((x) => !x.made) || b.supply === BigInt(0)) return null;
  const usd = prices ?? (await coinPrices());
  const vaults = new Set(((d.vaults ?? []) as { receipts: string }[]).map((v) => v.receipts.toLowerCase()));
  const parts: IndexPart[] = [];
  for (const x of b.parts) {
    let symbol: string | null;
    let decimals = 18;
    if (x.receipts !== ZeroAddress) {
      // A receipt counts only from one of this network's own vaults.
      if (!vaults.has(x.receipts.toLowerCase())) return null;
      const m = await metaOf(chain, x.token, p);
      symbol = m.symbol.replace(/^v/, "");
      decimals = m.decimals;
    } else if (x.token === ZeroAddress) {
      symbol = COIN[chain] ?? null;
    } else {
      const rwa = RWA_TOKENS[chain as keyof typeof RWA_TOKENS]?.find((t) => t.token.toLowerCase() === x.token.toLowerCase());
      symbol = rwa?.symbol ?? null;
      decimals = rwa?.decimals ?? (await metaOf(chain, x.token, p)).decimals;
    }
    if (!symbol) return null;
    const per = (BigInt(x.held) * ONE) / BigInt(b.supply);
    parts.push({ mint: x.token, symbol, perToken: per.toString(), decimals, usd: (Number(per) / 10 ** decimals) * priceOf(symbol, usd) });
  }
  const usdPerToken = parts.reduce((s, x) => s + x.usd, 0) * (1 + b.mintFeeBps / 10_000);
  if (!Number.isFinite(usdPerToken) || usdPerToken <= 0) return null;
  const decimals = (await metaOf(chain, b.beta, p)).decimals;
  return { chain, address: key, beta: b.beta, decimals, symbol: b.symbol || "BETA", name: b.name || "Index", image: await imageOf(b.uri), usdPerToken, mintFeeBps: b.mintFeeBps, parts };
}

/** The indexes on `chain` the app indexes (Ethereum, Base, Tempo) that can be minted now. */
async function listEvm(chain: string): Promise<IndexInfo[]> {
  const scan = await scanBaskets(chain).catch(() => ({ supported: false as const }));
  if (!scan.supported) return [];
  const prices = await coinPrices();
  const found = await Promise.all(scan.baskets.map((f) => evmIndex(chain, f.key, prices).catch(() => null)));
  return found.filter((i): i is IndexInfo => i !== null);
}

/** One index by its network and address (Solana) or key (EVM): from the list,
 *  else, for an EVM basket the app does not index, read directly. */
export async function indexOf(address: string, chain = "solana"): Promise<IndexInfo | null> {
  const listed = (await listIndexes()).find((i) => i.chain === chain && i.address.toLowerCase() === address.toLowerCase());
  if (listed || chain === "solana" || !EVM_CHAINS.includes(chain)) return listed ?? null;
  return evmIndex(chain, address).catch(() => null);
}

