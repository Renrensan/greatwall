// An IPFS file through this server, fetched once and kept: an index token's
// metadata and image (E4), which the public gateways serve in about 5
// seconds each, or refuse. A file is named by the hash of its content, so it
// never changes and is kept for good.
//
//   GET /api/ipfs/<cid>  -> the file (JSON or an image), cacheable forever
//
// Only JSON and images, at most 5 MB, from the configured gateway
// (IPFS_GATEWAY) or Pinata's public one.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

import { dataDir } from "../../beta/metadata/store";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 25_000;
/** A CID as IPFS writes one: version 1 in base32, or version 0 in base58. */
const CID = /^(baf[a-z2-7]{50,100}|Qm[1-9A-HJ-NP-Za-km-z]{44})$/;
const ALLOWED = /^(application\/json|text\/plain|image\/(png|jpeg|gif|webp|avif|svg\+xml))\b/i;

const dir = () => join(dataDir(), "ipfs");
const gateways = () => [...new Set([process.env.IPFS_GATEWAY, "https://gateway.pinata.cloud/ipfs"].filter((g): g is string => !!g).map((g) => g.replace(/\/+$/, "")))];

type Kept = { type: string; bytes: Buffer };

async function kept(cid: string): Promise<Kept | null> {
  try {
    const [bytes, type] = await Promise.all([readFile(join(dir(), cid)), readFile(join(dir(), `${cid}.type`), "utf8")]);
    return { type: type.trim(), bytes };
  } catch {
    return null;
  }
}

async function fetchOnce(cid: string): Promise<Kept> {
  let last: unknown = new Error("no gateway");
  for (const g of gateways()) {
    try {
      const r = await fetch(`${g}/${cid}`, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow" });
      if (!r.ok) throw new Error(`the gateway answered ${r.status}`);
      const type = (r.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!ALLOWED.test(type)) throw new Error(`not a JSON file or an image (${type || "no type"})`);
      const bytes = Buffer.from(await r.arrayBuffer());
      if (bytes.length > MAX_BYTES) throw new Error("larger than 5 MB");
      // Written whole, then moved into place: a reader never sees half a file.
      await mkdir(dir(), { recursive: true });
      const tmp = join(dir(), `${cid}.${process.pid}.tmp`);
      await writeFile(tmp, bytes);
      await writeFile(join(dir(), `${cid}.type`), type);
      await rename(tmp, join(dir(), cid));
      return { type, bytes };
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

/** One fetch per file at a time: visitors asking for the same one wait for it. */
const inFlight = ((globalThis as unknown as { __gwIpfs?: Map<string, Promise<Kept>> }).__gwIpfs ??= new Map());

export async function GET(_req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  if (!CID.test(cid)) return NextResponse.json({ error: "Not an IPFS content id" }, { status: 400 });
  let file: Kept;
  const had = await kept(cid);
  if (had) {
    file = had;
  } else {
    let job = inFlight.get(cid);
    if (!job) {
      job = fetchOnce(cid).finally(() => inFlight.delete(cid));
      inFlight.set(cid, job);
    }
    try {
      file = await job;
    } catch (e) {
      return NextResponse.json({ error: `The file could not be read from IPFS: ${(e as Error).message}` }, { status: 502, headers: { "cache-control": "no-store" } });
    }
  }
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "content-type": file.type,
      // Its name is the hash of its content: it never changes.
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      // An SVG opened on its own runs no script and loads nothing.
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
