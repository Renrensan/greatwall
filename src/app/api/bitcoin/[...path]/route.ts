// Bitcoin's explorer API through this app's server, so the browser never
// calls mempool.space or blockstream.info itself: a country, a network or
// an ad-blocker that blocks them no longer breaks a balance, a fee or a
// conversion. Reads go to mempool.space, then blockstream.info (same API);
// only the endpoints the app uses are passed on, to this site's own pages,
// at a per-visitor rate, so it can't become anyone's free explorer proxy
// (and get the server's address throttled for everyone). A broadcast goes
// to each explorer at most once; one that no explorer answered or refused
// is reported as "may have gone through", never as a failure.

import { NextResponse } from "next/server";
import { Transaction } from "bitcoinjs-lib";

export const runtime = "nodejs";

const EXPLORERS = ["https://mempool.space/api", "https://blockstream.info/api"];
const TIMEOUT_MS = 10_000;
// mempool.space can take 5-20 seconds to answer a broadcast from some
// networks; both explorers together stay under a 60-second proxy limit.
const BROADCAST_TIMEOUT_MS = 25_000;
const KEPT_MAX = 500;
const PER_MINUTE = 120;

/** The reads the app makes, and whether blockstream.info has them too. */
const READS: { re: RegExp; both: boolean; keepMs?: number }[] = [
  { re: /^address\/[A-Za-z0-9]{20,100}(\/(utxo|txs))?$/, both: true },
  { re: /^tx\/[0-9a-f]{64}(\/(status|hex|outspends|outspend\/\d{1,4}|merkle-proof))?$/, both: true },
  { re: /^blocks\/tip\/(height|hash)$/, both: true, keepMs: 15_000 },
  { re: /^block-height\/\d{1,8}$/, both: true, keepMs: 60_000 },
  { re: /^block\/[0-9a-f]{64}(\/(header|txids|status))?$/, both: true, keepMs: 60_000 },
  { re: /^v1\/fees\/(recommended|mempool-blocks)$/, both: false, keepMs: 15_000 },
];

const kept = new Map<string, { at: number; status: number; body: string; type: string }>();

const visits = new Map<string, { from: number; n: number }>();

/** Why a caller is refused: another site's page, or too many calls this minute. */
function refused(req: Request): NextResponse | null {
  if (req.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "For this site's pages only" }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const v = visits.get(ip);
  if (!v || now - v.from > 60_000) {
    if (visits.size > 10_000) visits.clear();
    visits.set(ip, { from: now, n: 1 });
    return null;
  }
  return ++v.n > PER_MINUTE ? NextResponse.json({ error: "Too many Bitcoin reads; try again in a minute." }, { status: 429 }) : null;
}

function keep(path: string, r: { status: number; body: string; type: string }) {
  const now = Date.now();
  if (kept.size >= KEPT_MAX) {
    // Expired answers first; then the oldest (a Map keeps insertion order).
    for (const [k, v] of kept) if (now - v.at > 60_000) kept.delete(k);
    while (kept.size >= KEPT_MAX) kept.delete(kept.keys().next().value!);
  }
  kept.delete(path);
  kept.set(path, { at: now, ...r });
}

async function get(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  return { status: r.status, body: await r.text(), type: r.headers.get("content-type") ?? "text/plain" };
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const no = refused(req);
  if (no) return no;
  const path = (await params).path.join("/");
  const read = READS.find((r) => r.re.test(path));
  // 403, not 404: the SDK reads a 404 as "no such transaction".
  if (!read) return NextResponse.json({ error: "Not a Bitcoin read this app makes" }, { status: 403 });
  const hit = kept.get(path);
  if (hit && read.keepMs && Date.now() - hit.at < read.keepMs) return new NextResponse(hit.body, { status: hit.status, headers: { "content-type": hit.type } });

  let last: { status: number; body: string; type: string } | null = null;
  for (const base of read.both ? EXPLORERS : EXPLORERS.slice(0, 1)) {
    try {
      const r = await get(`${base}/${path}`);
      // An answer about the request (200, or 400/404 for an unknown tx) is the answer; a busy or failing explorer is not.
      if (r.status < 500 && r.status !== 429) {
        if (r.status === 200 && read.keepMs) keep(path, r);
        return new NextResponse(r.body, { status: r.status, headers: { "content-type": r.type } });
      }
      last = r;
    } catch {
      // Timed out or unreachable: the next explorer.
    }
  }
  return last ? new NextResponse(last.body, { status: last.status, headers: { "content-type": last.type } }) : NextResponse.json({ error: "Bitcoin's explorers are not answering right now. Try again in a moment." }, { status: 503 });
}

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const no = refused(req);
  if (no) return no;
  const path = (await params).path.join("/");
  if (path !== "tx") return NextResponse.json({ error: "Only a transaction broadcast is accepted" }, { status: 403 });
  const hex = (await req.text()).trim();
  if (!/^[0-9a-fA-F]{20,800000}$/.test(hex)) return NextResponse.json({ error: "Not a raw transaction" }, { status: 400 });

  let txid: string;
  try {
    txid = Transaction.fromHex(hex).getId();
  } catch {
    return NextResponse.json({ error: "Not a raw transaction" }, { status: 400 });
  }

  // The same signed transaction sent to both explorers can only be paid
  // once, so an explorer that times out is followed by the other. One that
  // already has it ("already in the mempool / known / in the chain") means
  // it went. An explorer's refusal (bad signature, fee too low) is the
  // answer, passed on with its reason; only when neither explorer accepted
  // or refused it is it reported as "may have gone through".
  let rejected: { status: number; body: string } | null = null;
  for (const base of EXPLORERS) {
    try {
      const r = await fetch(`${base}/tx`, { method: "POST", body: hex, signal: AbortSignal.timeout(BROADCAST_TIMEOUT_MS) });
      const body = await r.text();
      if (r.ok || /already (in|known)|txn-already/i.test(body)) return new NextResponse(txid, { status: 200, headers: { "content-type": "text/plain" } });
      if (r.status < 500) rejected ??= { status: r.status, body };
    } catch {
      // No answer in time: it may have gone; the other explorer is tried.
    }
  }
  if (rejected) return new NextResponse(rejected.body, { status: rejected.status });
  return NextResponse.json({ error: `Bitcoin's explorers didn't confirm the broadcast in time. Transaction ${txid} may still have gone through: check it before sending again.`, txid }, { status: 504 });
}
