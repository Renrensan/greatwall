// The RPC proxies' one forwarder: a page's JSON-RPC request passed on to
// the network's provider, kept within the provider's rate limits.
//
// - At most MAX_IN_FLIGHT requests go to one provider at a time; the rest
//   wait their turn here instead of being refused upstream.
// - A busy reply (429) or a provider hiccup (5xx, a timeout) is retried a
//   few times, after the provider's Retry-After or a growing pause.
// - Still busy: the network's public endpoint, where there is one.
// - Still failing: a JSON-RPC error, one per request, that says plainly the
//   network is busy, instead of the provider's raw reply.
// - A transaction send is retried only when the provider refused it (429):
//   after a timeout or a 5xx it may have landed, and sending it again would
//   come back "already known", reported as a failure. It gets an error that
//   says to check before sending again, and no other provider.

import { NextResponse } from "next/server";

const MAX_IN_FLIGHT = 20;
const TRIES = 4;
const TIMEOUT_MS = 20_000;
const BUSY_CODE = -32005;
export const BUSY_MESSAGE = "The network is busy right now. Wait a few seconds and try again.";

const queues = new Map<string, { active: number; waiting: (() => void)[] }>();

async function slot<T>(key: string, run: () => Promise<T>): Promise<T> {
  let q = queues.get(key);
  if (!q) queues.set(key, (q = { active: 0, waiting: [] }));
  if (q.active >= MAX_IN_FLIGHT) await new Promise<void>((resolve) => q!.waiting.push(resolve));
  q.active++;
  try {
    return await run();
  } finally {
    q.active--;
    q.waiting.shift()?.();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const retryable = (status: number) => status === 429 || status >= 500;

/** Methods that send a transaction: never repeated when one may have landed. */
const SENDS = new Set(["eth_sendRawTransaction", "eth_sendTransaction", "sendTransaction"]);
const sends = (request: unknown) => (Array.isArray(request) ? request : [request]).some((r: any) => SENDS.has(r?.method));
const UNSURE_MESSAGE = "The network didn't answer in time. Your transaction may still have gone through: check before sending it again.";

/** One provider: its reply, retried while busy; null when it stays busy;
 *  "unsure" when a send got no clear answer (it may have landed). */
async function tryProvider(url: string, body: string, send: boolean): Promise<{ status: number; data: unknown } | null | "unsure"> {
  for (let attempt = 0; attempt < TRIES; attempt++) {
    try {
      const response = await slot(new URL(url).host, () =>
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(TIMEOUT_MS) }),
      );
      if (response.ok) return { status: 200, data: await response.json() };
      if (!retryable(response.status)) {
        // Not about being busy (a bad request, say): the provider's own
        // JSON-RPC reply, as the proxies always passed it on.
        const text = await response.text();
        try {
          return { status: 200, data: JSON.parse(text) };
        } catch {
          return { status: response.status, data: { error: "RPC provider error", details: text } };
        }
      }
      if (send && response.status !== 429) return "unsure";
      const after = Number(response.headers.get("retry-after"));
      await sleep(Number.isFinite(after) && after > 0 ? Math.min(after * 1000, 5_000) : 300 * 2 ** attempt + Math.random() * 200);
    } catch {
      if (send) return "unsure";
      await sleep(300 * 2 ** attempt);
    }
  }
  return null;
}

/** The busy error, shaped as the request was: one, or one per request of a batch. */
function busy(request: unknown, message = BUSY_MESSAGE) {
  const one = (r: any) => ({ jsonrpc: "2.0", id: r?.id ?? null, error: { code: BUSY_CODE, message } });
  return Array.isArray(request) ? request.map(one) : one(request);
}

export async function forward(request: Request, url: string | undefined, fallbacks: string[] = []): Promise<NextResponse> {
  if (!url) return NextResponse.json({ error: "RPC URL NOT PROVIDED" }, { status: 500 });
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Not a JSON-RPC request" }, { status: 400 });
  }
  const body = JSON.stringify(parsed);
  const send = sends(parsed);
  for (const provider of [url, ...fallbacks]) {
    const reply = await tryProvider(provider, body, send);
    if (reply === "unsure") return NextResponse.json(busy(parsed, UNSURE_MESSAGE));
    if (reply) return NextResponse.json(reply.data, { status: reply.status });
  }
  console.error("RPC proxy: every provider busy", new URL(url).host);
  // 200 with JSON-RPC errors: the page's client reads the message instead
  // of retrying a 429 on its own and then showing the raw reply.
  return NextResponse.json(busy(parsed));
}
