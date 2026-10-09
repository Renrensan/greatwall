// A basket's metadata JSON, as wallets and apps read it (see ../route.ts).

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";

import { dataDir, validId } from "../store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "no such metadata" }, { status: 404 });
  try {
    const json = await readFile(`${dataDir()}/${id}.json`, "utf8");
    return new NextResponse(json, { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600", "access-control-allow-origin": "*", "x-content-type-options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "no such metadata" }, { status: 404 });
  }
}
