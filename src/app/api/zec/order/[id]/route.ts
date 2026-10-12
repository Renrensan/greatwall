// An order of Pay with ZEC, moved on and read (docs/zec-lane.md).
//
//   GET /api/zec/order/<id> -> the order

import { NextResponse } from "next/server";

import { advanceAll, confirmationsFor, laneInfo, load, validOrderId } from "../../lane";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validOrderId(id)) return NextResponse.json({ error: "No such order" }, { status: 404 });
  await advanceAll().catch(() => {});
  const o = await load(id);
  if (!o) return NextResponse.json({ error: "No such order" }, { status: 404 });
  // Orders from before buy-only may carry a refund address: not shown.
  const { refund: _refund, ...shown } = o as typeof o & { refund?: unknown };
  // The payment request again, so a reloaded page shows its QR code.
  const address = await laneInfo().then((i) => i.address).catch(() => null);
  const zec = (o.zat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  const memo = Buffer.from(o.memo, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const uri = address ? `zcash:${address}?amount=${zec}&memo=${memo}` : null;
  return NextResponse.json({ ...shown, confirmationsNeeded: confirmationsFor(o.usd), address, zec, uri }, { headers: { "cache-control": "no-store" } });
}
