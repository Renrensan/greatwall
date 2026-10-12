// The index tokens Pay with ZEC sells (docs/zec-lane.md): the BETA baskets on
// Solana devnet, each with its name, image and parts, and its price per
// token in dollars. A part is a Solana token or a receipt of another
// network's asset; a receipt's mint is worked out from its network and asset
// number, and the asset's token read from that network's vault, as the index
// page does. Prices: the test tokens' reference prices, the coins' market
// prices. Kept five minutes.

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import type { JsonRpcProvider } from "ethers";
import { SolanaBeta, SolanaVault, WRAPPED_SOL, homeAssets, metadataAddress, network, parseMetadata } from "@ipow/sdk";

import { RWA_TOKENS } from "@/components/integrator/ipow/rwaTokens";
import { REFERENCE_USD } from "@/components/integrator/ipow/referencePrices";
import { BUILT_IN } from "@/components/integrator/ipow/builtInIndexes";
import { CHAINS, provider } from "../faucet/evmWallet";

export type IndexPart = { mint: string; symbol: string; perToken: string; decimals: number; usd: number };
export type IndexInfo = { address: string; beta: string; symbol: string; name: string; image: string | null; usdPerToken: number; mintFeeBps: number; parts: IndexPart[] };

const PEERS = ["ethereum", "base", "arbitrum", "robinhood", "hyperliquid", "tempo"] as const;
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

let cache: { at: number; list: IndexInfo[] } | null = null;

/** The indexes on Solana that can be minted now, their price per token. */
export async function listIndexes(): Promise<IndexInfo[]> {
  if (cache && Date.now() - cache.at < 300_000) return cache.list;
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
        const price = REFERENCE_USD[symbol] ?? prices[symbol === "cbBTC" ? "BTC" : symbol] ?? NaN;
        return { mint: p.mint, symbol, perToken: per.toString(), decimals: p.decimals, usd: (Number(per) / 10 ** p.decimals) * price };
      });
      const usdPerToken = parts.reduce((s, p) => s + p.usd, 0) * (1 + b.mintFeeBps / 10_000);
      if (!Number.isFinite(usdPerToken) || usdPerToken <= 0) continue;
      // Its name and image: the token's metadata, GREAT's from the copy shipped with the app.
      const meta = await conn.getAccountInfo(new PublicKey(metadataAddress(new PublicKey(b.beta)) as any)).then((a) => (a ? (parseMetadata(a.data) as any) : null)).catch(() => null);
      const id = String(meta?.uri ?? "").match(/\/api\/beta\/metadata\/([0-9a-f]{24})/)?.[1];
      let image: string | null = id && BUILT_IN[id] ? BUILT_IN[id].image : null;
      if (!image && /^https:\/\//.test(meta?.uri ?? "")) {
        image = await fetch(meta.uri, { signal: AbortSignal.timeout(5_000) }).then((r) => r.json()).then((j) => (typeof j?.image === "string" && /^https:\/\//.test(j.image) ? j.image : null)).catch(() => null);
      }
      list.push({ address, beta: b.beta, symbol: meta?.symbol || b.symbol || "BETA", name: meta?.name || b.name || "Index", image, usdPerToken, mintFeeBps: b.mintFeeBps, parts });
    } catch {
      // A basket that cannot be read is left out this time.
    }
  }
  // GREAT first, then by price.
  list.sort((a, b) => (a.symbol === "GREAT" ? -1 : b.symbol === "GREAT" ? 1 : b.usdPerToken - a.usdPerToken));
  cache = { at: Date.now(), list };
  return list;
}

export const indexOf = async (address: string) => (await listIndexes()).find((i) => i.address === address) ?? null;

