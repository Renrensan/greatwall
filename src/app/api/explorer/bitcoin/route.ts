// Real Bitcoin's tip, for the explorer to compare each light client with:
// its height, hash and time, from mempool.space. Kept 30 seconds.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const KEEP_MS = 30_000;
let kept: { at: number; tip: { height: number; hash: string; time: number } } | null = null;

export async function GET() {
  if (kept && Date.now() - kept.at < KEEP_MS) return NextResponse.json(kept.tip);
  try {
    const hash = (await (await fetch("https://mempool.space/api/blocks/tip/hash", { cache: "no-store" })).text()).trim();
    const block = await (await fetch(`https://mempool.space/api/block/${hash}`, { cache: "no-store" })).json();
    const tip = { height: Number(block.height), hash, time: Number(block.timestamp) };
    kept = { at: Date.now(), tip };
    return NextResponse.json(tip);
  } catch (e: any) {
    if (kept) return NextResponse.json(kept.tip);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 502 });
  }
}
