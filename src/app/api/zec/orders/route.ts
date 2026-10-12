// A Solana wallet's ZEC orders (docs/zec-lane.md): buys delivered to it and
// sales sent from it, newest first.
//
//   GET /api/zec/orders?address=<solana address> -> [{id, side, symbol, image, amount, zec, usd, state, createdAt, expiresAt, tx}]
//
// Nothing here is private beyond what is public already: each delivery is
// on Solana, and the published viewing key matches each ZEC payment to its
// order.

import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import { advanceAll, ordersOf } from "../lane";
import { listIndexes } from "../indexes";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address") ?? "";
  try {
    new PublicKey(address);
  } catch {
    return NextResponse.json({ error: "address" }, { status: 400 });
  }
  await advanceAll().catch(() => {});
  const images = new Map((await listIndexes().catch(() => [])).map((i) => [i.address, i.image]));
  const list = (await ordersOf(address)).map((o) => ({
    id: o.id,
    side: o.side ?? "buy",
    symbol: o.symbol,
    token: o.token,
    image: images.get(o.token) ?? null,
    expiresAt: o.expiresAt,
    amount: o.delivered?.amount ?? o.amount,
    zec: (o.zat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, ""),
    usd: o.usd,
    state: o.state,
    createdAt: o.createdAt,
    tx: o.delivered?.tx || o.returnTx || null,
  }));
  return NextResponse.json(list, { headers: { "cache-control": "no-store" } });
}
