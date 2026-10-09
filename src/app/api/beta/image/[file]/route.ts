// A basket's image, as its metadata names it (see ../../metadata/route.ts).

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";

import { dataDir, validId } from "../../metadata/store";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = file.match(/^([0-9a-f]{24})\.(png|jpg|webp)$/);
  if (!m || !validId(m[1])) return NextResponse.json({ error: "no such image" }, { status: 404 });
  try {
    const bytes = await readFile(`${dataDir()}/${file}`);
    return new NextResponse(new Uint8Array(bytes), { headers: { "content-type": TYPES[m[2]], "cache-control": "public, max-age=31536000, immutable", "access-control-allow-origin": "*", "x-content-type-options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "no such image" }, { status: 404 });
  }
}
