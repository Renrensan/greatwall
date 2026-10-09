// Where a basket's metadata and image are kept, and the URL the chains keep
// for good. Two stores:
//
//   - IPFS, pinned through Pinata (PINATA_JWT set): the content is addressed
//     by its hash, so the URL cannot change meaning and the files outlive
//     this server. This is the store for production.
//   - This server's data directory (GREATWALL_DATA_DIR, default ./data/beta),
//     served by /api/beta/metadata/<id> and /api/beta/image/<file>: for
//     development, or until a key is set.
//
// PUBLIC_ORIGIN is the origin of the local store's URLs (the chains keep
// them, so behind a proxy it must be the site's, not the request's).

import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Where the files are kept: GREATWALL_DATA_DIR, or the project's data/beta.
 *  The production server runs from .next/standalone (it changes into that
 *  folder), which every build replaces: files kept there were lost on the
 *  next build (2026-10-07), so the default climbs back to the project. */
export const dataDir = () => {
  if (process.env.GREATWALL_DATA_DIR) return process.env.GREATWALL_DATA_DIR;
  const cwd = process.cwd();
  const project = /[\\/]\.next[\\/]standalone$/.test(cwd) ? join(cwd, "..", "..") : cwd;
  return join(project, "data", "beta");
};

export const publicOrigin = (req: Request) => process.env.PUBLIC_ORIGIN ?? new URL(req.url).origin;

/** An id as the local store makes them: hex, so a path cannot escape the directory. */
export const validId = (id: string) => /^[0-9a-f]{24}$/.test(id);

export type Stored = { id: string; uri: string; image: string | null; store: "ipfs" | "local" };

type Image = { bytes: Buffer; ext: "png" | "jpg" | "webp"; type: string };

/** The image's kind from its first bytes, not the client's say-so. */
export function imageKind(bytes: Buffer): Image["ext"] | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

export const ipfsEnabled = () => Boolean(process.env.PINATA_JWT);

/** Stores `meta` (token metadata JSON, without its image link) and the image, if any. */
export async function store(meta: Record<string, string>, image: Image | null, origin: string): Promise<Stored> {
  return ipfsEnabled() ? storeOnIpfs(meta, image) : storeLocally(meta, image, origin);
}

// IPFS through Pinata: https://docs.pinata.cloud/api-reference (pinFileToIPFS,
// pinJSONToIPFS; a bearer JWT). The URL is a gateway's, which any HTTPS
// client reads; the CID in it is what makes the content immutable.
const PINATA = "https://api.pinata.cloud/pinning";
const gateway = () => (process.env.IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs").replace(/\/+$/, "");

async function pinata(path: string, body: BodyInit, headers: Record<string, string> = {}): Promise<string> {
  const r = await fetch(`${PINATA}/${path}`, { method: "POST", headers: { Authorization: `Bearer ${process.env.PINATA_JWT}`, ...headers }, body, signal: AbortSignal.timeout(60_000) });
  const out: any = await r.json().catch(() => ({}));
  if (!r.ok || !out?.IpfsHash) throw new Error(`IPFS pinning failed (${r.status}): ${out?.error?.details ?? out?.error ?? r.statusText}`);
  return out.IpfsHash as string;
}

async function storeOnIpfs(meta: Record<string, string>, image: Image | null): Promise<Stored> {
  const out = { ...meta };
  let imageUrl: string | null = null;
  if (image) {
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(image.bytes)], { type: image.type }), `${meta.symbol.toLowerCase()}.${image.ext}`);
    form.set("pinataMetadata", JSON.stringify({ name: `${meta.symbol} image` }));
    form.set("pinataOptions", JSON.stringify({ cidVersion: 1 }));
    const cid = await pinata("pinFileToIPFS", form);
    imageUrl = `${gateway()}/${cid}`;
    out.image = imageUrl;
  }
  const cid = await pinata(
    "pinJSONToIPFS",
    JSON.stringify({ pinataContent: out, pinataMetadata: { name: `${meta.symbol} metadata` }, pinataOptions: { cidVersion: 1 } }),
    { "content-type": "application/json" }
  );
  return { id: cid, uri: `${gateway()}/${cid}`, image: imageUrl, store: "ipfs" };
}

async function storeLocally(meta: Record<string, string>, image: Image | null, origin: string): Promise<Stored> {
  const out = { ...meta };
  // The id: a hash of the content and a few random bytes, so that an id
  // cannot be guessed from the content.
  const id = createHash("sha256").update(JSON.stringify(out)).update(image?.bytes ?? Buffer.alloc(0)).update(randomBytes(8)).digest("hex").slice(0, 24);
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  let imageUrl: string | null = null;
  if (image) {
    await writeFile(`${dir}/${id}.${image.ext}`, image.bytes);
    imageUrl = `${origin}/api/beta/image/${id}.${image.ext}`;
    out.image = imageUrl;
  }
  await writeFile(`${dir}/${id}.json`, JSON.stringify(out, null, 2));
  return { id, uri: `${origin}/api/beta/metadata/${id}`, image: imageUrl, store: "local" };
}

// A per-address limit on uploads, since the route is open: enough for anyone
// creating baskets, too few to fill a disk or a pinning quota.
const WINDOW_MS = 60 * 60 * 1000;
const PER_WINDOW = 20;
const recent = new Map<string, number[]>();

/** True when `ip` may upload now; counts the upload. */
export function allow(ip: string): boolean {
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= PER_WINDOW) {
    recent.set(ip, times);
    return false;
  }
  times.push(now);
  recent.set(ip, times);
  if (recent.size > 10_000) for (const [k, v] of recent) if (!v.some((t) => now - t < WINDOW_MS)) recent.delete(k);
  return true;
}

export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
