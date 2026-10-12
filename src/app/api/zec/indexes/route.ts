// The indexes Pay with ZEC sells, with their price per token (indexes.ts).
//
//   GET /api/zec/indexes -> [{chain, address, symbol, name, image, usdPerToken, parts}]
//   GET /api/zec/indexes?chain=<network>&index=<address or key> -> that one, in a list
//     (an EVM basket the app does not index included); [] when it can't be bought now

import { NextResponse } from "next/server";

import { indexOf, listIndexes } from "../indexes";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const index = q.get("index");
  try {
    if (index) {
      const one = await indexOf(index, q.get("chain") ?? "solana");
      return NextResponse.json(one ? [one] : [], { headers: { "cache-control": "public, max-age=60" } });
    }
    return NextResponse.json(await listIndexes(), { headers: { "cache-control": "public, max-age=60" } });
  } catch (e) {
    console.error("[zec] listing the indexes failed:", (e as Error).message);
    return NextResponse.json({ error: "The indexes could not be read right now" }, { status: 502 });
  }
}
