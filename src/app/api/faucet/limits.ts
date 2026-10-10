// The faucets' limits, shared by /api/faucet/solana and /api/faucet/[chain]:
// this site's pages only, a few claims an hour per visitor, and each address
// once a day per token (and once a day for gas). Kept in this server's
// memory: a restart forgets them, which on test networks is fine.

import { NextResponse } from "next/server";

/** How long a claim locks an address and token. */
export const COOLDOWN_MS = 24 * 3600_000;
const PER_HOUR = 10;

const claimed = new Map<string, number>();
const visits = new Map<string, { from: number; n: number }>();

/** Why a caller is refused before anything is read: another site's page, or
 *  too many claims from one visitor this hour. */
export function refused(req: Request): NextResponse | null {
  if (req.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "For this site's pages only" }, { status: 403 });
  // The entry the nearest proxy appended: the first is whatever the client
  // wrote. Without a proxy in front it can still be made up, which is why
  // takeDrip's daily budget, not this, is what guards the gas.
  const ip = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || req.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const v = visits.get(ip);
  if (!v || now - v.from > 3600_000) {
    if (visits.size > 10_000) for (const [k, o] of visits) if (now - o.from > 3600_000) visits.delete(k);
    // Still full of visitors from this hour: refuse new ones rather than
    // forget everyone's count.
    if (!v && visits.size > 10_000) return NextResponse.json({ error: "The faucet is busy; try again later." }, { status: 429 });
    visits.set(ip, { from: now, n: 1 });
    return null;
  }
  return ++v.n > PER_HOUR ? NextResponse.json({ error: "Too many faucet claims; try again in an hour." }, { status: 429 }) : null;
}

export type Hold = { release: () => void };

/** Claims `key` (chain:address:token, the address in its canonical form) in
 *  one step, before anything is awaited, so two requests at once can't both
 *  pass: a hold to release if the send fails, or when it may claim again. */
export function take(key: string): Hold | { until: string } {
  const now = Date.now();
  const last = claimed.get(key) ?? 0;
  if (now - last < COOLDOWN_MS) return { until: new Date(last + COOLDOWN_MS).toISOString() };
  for (const [o, t] of claimed) if (now - t >= COOLDOWN_MS) claimed.delete(o);
  claimed.set(key, now);
  return { release: () => claimed.delete(key) };
}

/** Gas drips each network gives a day, whoever asks: fresh addresses cost
 *  nothing, so this, not the per-address limit, keeps the gas from draining. */
const GAS_PER_DAY = 150;
const drips = new Map<string, { day: number; n: number }>();

/** Counts one gas drip on `chain` if today's budget has room; false when not. */
export function takeDrip(chain: string): Hold | null {
  const day = Math.floor(Date.now() / 86_400_000);
  let d = drips.get(chain);
  if (!d || d.day !== day) drips.set(chain, (d = { day, n: 0 }));
  if (d.n >= GAS_PER_DAY) return null;
  d.n++;
  const counted = d;
  return { release: () => void (counted.day === day && counted.n--) };
}

/** Where to get a network's gas coin when this faucet has none left. */
export const PUBLIC_FAUCET: Record<string, string> = {
  ethereum: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
  base: "https://www.alchemy.com/faucets/base-sepolia",
  arbitrum: "https://www.alchemy.com/faucets/arbitrum-sepolia",
  hyperliquid: "https://app.hyperliquid-testnet.xyz/drip",
  tempo: "https://docs.tempo.xyz/quickstart/faucet",
  solana: "https://faucet.solana.com",
};
