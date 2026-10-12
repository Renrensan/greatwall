// The indexes Pay with ZEC sells, with their price per token (indexes.ts).
//
//   GET /api/zec/indexes -> [{address, symbol, name, image, usdPerToken, parts}]

import { NextResponse } from "next/server";

import { listIndexes } from "../indexes";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await listIndexes(), { headers: { "cache-control": "public, max-age=60" } });
  } catch (e) {
    console.error("[zec] listing the indexes failed:", (e as Error).message);
    return NextResponse.json({ error: "The indexes could not be read right now" }, { status: 502 });
  }
}
