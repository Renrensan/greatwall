// Sell for ZEC (demo): records the Solana transfer the index was sent with.
//
//   POST /api/zec/sell/<id> {signature}

import { NextResponse } from "next/server";

import { markSent, validOrderId } from "../../lane";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validOrderId(id)) return NextResponse.json({ error: "No such order" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { signature?: unknown };
  if (typeof b.signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(b.signature)) return NextResponse.json({ error: "signature" }, { status: 400 });
  const o = await markSent(id, b.signature);
  return o ? NextResponse.json({ id: o.id, state: o.state }) : NextResponse.json({ error: "No such order" }, { status: 404 });
}
