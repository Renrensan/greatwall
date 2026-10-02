import { ethers } from "ethers";
import { VerifiedErc20Token } from "./config/verified-tokens";

// Deployed at this same address on essentially every EVM chain, including Sepolia —
// https://www.multicall3.com/deployments
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
const MULTICALL3_ABI = [
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)",
];
const ERC20_BALANCE_ABI = ["function balanceOf(address) view returns (uint256)"];

export interface HeldErc20Token {
  mint: string; // contract address — named to match the shared token-row shape used elsewhere (Solana's mint/Assets.tsx)
  symbol: string;
  name: string;
  decimals: number;
  amount: number;
  isNative: false;
  price: string;
  priceChange24h: number;
  logo: string | null;
}

/**
 * Batches a balanceOf call per candidate token into a single multicall so the cost stays
 * constant regardless of how many tokens are on the allowlist, then filters to whatever the
 * wallet actually holds a nonzero amount of.
 */
export async function fetchErc20Balances(
  provider: ethers.Provider,
  owner: string,
  candidates: VerifiedErc20Token[],
): Promise<HeldErc20Token[]> {
  if (candidates.length === 0) return [];

  const erc20Iface = new ethers.Interface(ERC20_BALANCE_ABI);
  const multicall = new ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider);

  const calls = candidates.map((token) => ({
    target: token.address,
    allowFailure: true,
    callData: erc20Iface.encodeFunctionData("balanceOf", [owner]),
  }));

  const results: { success: boolean; returnData: string }[] = await multicall.aggregate3(calls);

  const held: HeldErc20Token[] = [];
  results.forEach((result, i) => {
    const token = candidates[i];
    if (!result.success || !result.returnData || result.returnData === "0x") return;

    try {
      const [raw] = erc20Iface.decodeFunctionResult("balanceOf", result.returnData);
      const amount = Number(ethers.formatUnits(raw, token.decimals));
      if (amount > 0) {
        held.push({
          mint: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          amount,
          isNative: false,
          price: "0",
          priceChange24h: 0,
          logo: null,
        });
      }
    } catch {
      // Malformed/unexpected return data from a non-standard token — skip it rather than
      // letting one bad entry fail the whole balance fetch.
    }
  });

  return held;
}

/**
 * Live USD price + 24h change for a set of held ERC-20s, keyed by contract address, via
 * CoinGecko's token_price endpoint (the same public API this app already falls back to for
 * native ETH/BTC pricing — see ethereum-provider.tsx's fetchMarketPrices). Only meaningful on
 * mainnet: testnet tokens have no real market, so callers should skip this there rather than
 * report a real-looking price for a token that's actually worthless.
 */
export async function fetchErc20UsdPrices(
  addresses: string[],
): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  if (addresses.length === 0) return {};

  try {
    const url = `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${addresses.join(",")}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();

    // CoinGecko keys its response by lowercased contract address regardless of the casing
    // the request used.
    const normalized: Record<string, { usd: number; usd_24h_change: number }> = {};
    for (const [addr, info] of Object.entries<any>(data || {})) {
      normalized[addr.toLowerCase()] = {
        usd: info?.usd ?? 0,
        usd_24h_change: info?.usd_24h_change ?? 0,
      };
    }
    return normalized;
  } catch (err) {
    console.error("Failed to fetch ERC-20 USD prices:", err);
    return {};
  }
}

// Uniswap's default token list — the closest EVM equivalent of Jupiter's verified list for
// Solana: a maintained, machine-readable JSON of vetted ERC-20s (address, symbol, decimals,
// and a real logoURI each), adopted widely enough that MetaMask and most EVM wallets read
// this exact schema. Read logos from here instead of guessing/hardcoding a CDN URL ourselves.
const UNISWAP_TOKEN_LIST_URL = "https://tokens.uniswap.org";
const TOKEN_LIST_CACHE_TTL_MS = 30 * 60 * 1000; // the list itself changes rarely

let cachedTokenList: { address: string; logoURI?: string }[] | null = null;
let cachedTokenListAt = 0;

export async function fetchVerifiedTokenLogos(
  addresses: string[],
): Promise<Record<string, string>> {
  if (addresses.length === 0) return {};

  try {
    const now = Date.now();
    if (!cachedTokenList || now - cachedTokenListAt > TOKEN_LIST_CACHE_TTL_MS) {
      const res = await fetch(UNISWAP_TOKEN_LIST_URL);
      if (!res.ok) return {};
      const data = await res.json();
      cachedTokenList = (data?.tokens || []).filter((t: any) => t.chainId === 1);
      cachedTokenListAt = now;
    }

    const wanted = new Set(addresses.map((a) => a.toLowerCase()));
    const logos: Record<string, string> = {};
    for (const t of cachedTokenList || []) {
      const addrLower = (t.address || "").toLowerCase();
      if (wanted.has(addrLower) && t.logoURI) {
        logos[addrLower] = t.logoURI;
      }
    }
    return logos;
  } catch (err) {
    console.error("Failed to fetch verified token list logos:", err);
    return {};
  }
}
