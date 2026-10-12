// Every BETA basket made on an EVM test network, newest first, read from the
// contract's events a bounded number of blocks per request (../scan.ts).

import { NextResponse } from "next/server";
import { scanBaskets } from "../scan";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ chain: string }> }) {
  const { chain } = await params;
  try {
    const scan = await scanBaskets(chain);
    return NextResponse.json(scan.supported ? scan : { supported: false, baskets: [] });
  } catch (e: any) {
    const message = e?.shortMessage ?? e?.message ?? String(e);
    return NextResponse.json({ error: message }, { status: / not set$/.test(message) ? 500 : 502 });
  }
}
