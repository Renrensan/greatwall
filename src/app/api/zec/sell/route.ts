// Sell for ZEC (demo, docs/zec-lane.md): makes a sell order. The index is
// checked on Solana and sent back; no ZEC is paid.
//
//   POST /api/zec/sell {index, amount, owner, zaddr}
//   -> {id, zec, usd, lane, beta, units, expiresAt}: send `units` of `beta` to `lane`

import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import { refused } from "../../faucet/limits";
import { createSellOrder, laneSolana } from "../lane";
import { indexOf } from "../indexes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const no = refused(req);
  if (no) return no;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const [index, amount, owner, zaddr] = [b.index, b.amount, b.owner, b.zaddr].map((v) => (typeof v === "string" ? v.trim() : ""));
  const goodOwner = (() => {
    try {
      return PublicKey.isOnCurve(new PublicKey(owner).toBytes());
    } catch {
      return false;
    }
  })();
  if (!goodOwner) return NextResponse.json({ error: "Connect the Solana wallet that holds the index" }, { status: 400 });
  if (!/^(u1|zs)[0-9a-z]{20,}$/.test(zaddr)) return NextResponse.json({ error: "Enter a shielded Zcash address (u1… or zs…)" }, { status: 400 });
  try {
    const o = await createSellOrder({ index, amount, owner, zaddr });
    const ix = await indexOf(index);
    const zec = (o.zat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
    return NextResponse.json({ id: o.id, zec, usd: o.usd, lane: laneSolana(), beta: ix!.beta, units: String(BigInt(Math.round(Number(amount) * 1e9))), expiresAt: o.expiresAt });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
