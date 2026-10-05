// The way to the operator node's tunnel API (conversions between two
// networks). This server holds the node's key; browsers reach the node only
// through here.
//
//   GET  /api/tunnel/assets
//   GET  /api/tunnel/quote?from&fromToken&amount&to&token

import { NextResponse } from "next/server";

export const runtime = "nodejs";

function node(): { url: string; key: string | undefined } | null {
  const url = process.env.TUNNEL_API_URL;
  return url ? { url: url.replace(/\/$/, ""), key: process.env.TUNNEL_API_KEY } : null;
}

async function forward(path: string, init: RequestInit = {}) {
  const n = node();
  if (!n) return NextResponse.json({ error: "Conversions between networks are not set up on this server" }, { status: 503 });
  try {
    const r = await fetch(`${n.url}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), ...(n.key ? { "x-tunnel-key": n.key } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    const body = await r.json().catch(() => ({ error: "The operator answered with something unreadable" }));
    return NextResponse.json(body, { status: r.status });
  } catch {
    return NextResponse.json({ error: "The operator did not answer: try again in a moment" }, { status: 502 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action === "assets") return forward("/assets");
  if (action !== "quote") return NextResponse.json({ error: "No such route" }, { status: 404 });
  const q = new URL(req.url).searchParams;
  const out = new URLSearchParams();
  for (const k of ["from", "fromToken", "amount", "to", "token"]) {
    const v = q.get(k);
    if (v) out.set(k, v);
  }
  return forward(`/quote?${out}`);
}
