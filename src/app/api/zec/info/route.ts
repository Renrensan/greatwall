// The ZEC lane's public face (docs/zec-lane.md, Z7): its address and its full
// viewing key, with which anyone can list every payment it received and sent
// and match each to its delivery.
//
//   GET /api/zec/info -> {address, viewingKey, height}

import { NextResponse } from "next/server";

import { laneInfo } from "../lane";

export const runtime = "nodejs";

export async function GET() {
  try {
    const i = await laneInfo();
    return NextResponse.json({ address: i.address, viewingKey: i.ufvk, height: i.height }, { headers: { "cache-control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ error: "The ZEC lane is not reachable right now" }, { status: 503 });
  }
}
