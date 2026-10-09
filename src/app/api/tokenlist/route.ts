// Greatwall's token list (the Uniswap token-list format wallets and
// explorers read): the mock RWA tokens of each EVM test network, with their
// logos served by this app. An ERC-20 carries no image on chain, so this is
// where a token's metadata lives.
//
//   GET /api/tokenlist

import { NextResponse } from "next/server";

import { RWA_TOKENS } from "@/components/integrator/ipow/rwaTokens";

export const runtime = "nodejs";

const CHAIN_IDS: Record<string, number> = { ethereum: 11155111, base: 84532, robinhood: 46630, hyperliquid: 998, tempo: 42431, arbitrum: 421614 };

export function GET(req: Request) {
  // Behind a proxy the request's origin may be an internal host; the public
  // one is PUBLIC_ORIGIN when set (the Solana metadata names greatwall.finance).
  const origin = process.env.PUBLIC_ORIGIN ?? new URL(req.url).origin;
  const tokens = Object.entries(RWA_TOKENS).flatMap(([chain, list]) =>
    CHAIN_IDS[chain]
      ? (list ?? []).filter((t) => t.token !== "").map((t) => ({
          chainId: CHAIN_IDS[chain],
          address: t.token,
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
          ...(t.logo ? { logoURI: `${origin}${t.logo}` } : {}),
          ...(t.about ? { extensions: { about: t.about } } : {}),
        }))
      : []
  );
  return NextResponse.json({
    name: "Greatwall testnet RWA",
    timestamp: "2026-10-05T00:00:00.000Z",
    version: { major: 1, minor: 0, patch: 0 },
    keywords: ["greatwall", "testnet", "rwa"],
    tokens,
  });
}
