// Hosting a basket's metadata (E4): the creator's description, links and
// image, as token metadata JSON, at a URL short enough for the chains
// (Ethereum keeps 2,048 bytes of URI, Solana 200). Pinned on IPFS when a
// key is set, else kept in this server's data directory; see store.ts.
//
//   POST /api/beta/metadata   multipart: meta (JSON), image (optional file)
//   -> { id, uri, image, store }

import { NextResponse } from "next/server";

import { allow, clientIp, imageKind, publicOrigin, store } from "./store";

export const runtime = "nodejs";

const IMAGE_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
const MAX_IMAGE = 2 * 1024 * 1024;
const LIMITS = { name: 64, symbol: 16, description: 1000, link: 200 };
/** The most a request may carry: the image, the JSON and multipart framing. */
const MAX_BODY = MAX_IMAGE + 64 * 1024;

export async function POST(req: Request) {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (!(length > 0) || length > MAX_BODY) return NextResponse.json({ error: "the request is at most 2 MB" }, { status: 413 });
  if (!allow(clientIp(req))) return NextResponse.json({ error: "too many uploads from here: try again in an hour" }, { status: 429 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "multipart form data is needed" }, { status: 400 });
  let meta: any;
  try {
    meta = JSON.parse(String(form.get("meta") ?? ""));
  } catch {
    return NextResponse.json({ error: "meta is JSON" }, { status: 400 });
  }
  const str = (k: string, max: number) => {
    const v = typeof meta?.[k] === "string" ? meta[k].trim() : "";
    if (v.length > max) throw new Error(`${k} is over ${max} characters`);
    return v;
  };
  let out: Record<string, string>;
  try {
    out = { name: str("name", LIMITS.name), symbol: str("symbol", LIMITS.symbol) };
    if (!out.name || !out.symbol) throw new Error("a name and a symbol are needed");
    for (const k of ["description", "external_url", "twitter", "telegram"] as const) {
      const v = str(k, k === "description" ? LIMITS.description : LIMITS.link);
      if (v) out[k] = v;
    }
    for (const k of ["external_url", "twitter", "telegram"] as const) {
      if (out[k] && !/^https:\/\//.test(out[k])) throw new Error(`${k} is an https link`);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  const file = form.get("image");
  let image: { bytes: Buffer; ext: "png" | "jpg" | "webp"; type: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE) return NextResponse.json({ error: "the image is at most 2 MB" }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    // The kind from the bytes themselves, whatever the upload claims.
    const ext = imageKind(bytes);
    if (!ext) return NextResponse.json({ error: "the image is a PNG, JPEG or WebP" }, { status: 400 });
    image = { bytes, ext, type: IMAGE_TYPES[ext] };
  }
  try {
    const stored = await store(out, image, publicOrigin(req));
    return NextResponse.json(stored);
  } catch (e: any) {
    console.error("[beta/metadata] not stored:", e);
    return NextResponse.json({ error: e?.message ?? "the metadata could not be stored" }, { status: 502 });
  }
}
