// The ZEC lane's Zcash side (docs/zec-lane.md): a small service beside
// Greatwall's server that keeps the lane's Zcash wallet in sync, lists the
// payments it received with their memos. The wallet is watch-only: made
// from the full viewing key alone (`wallet init-fvk`), on Zcash mainnet, so
// this server can see payments and can never spend them; the seed stays with
// its owner, off the server. The wallet itself is Zcash's own: the official
// libraries, through the `zcash-devtool` binary and its SQLite wallet, which
// this service drives and reads; it holds no Zcash code of its own.
// Greatwall's server keeps the orders and calls this, never the browser.
//
//   GET  /info                 address, viewing keys, synced height, balance
//   GET  /received?since=<h>   payments received: txid, height, confirmations, value, memo
//
// Every call needs `authorization: Bearer <ZEC_LANE_API_KEY>`. It listens
// on 127.0.0.1 (ZEC_LANE_LISTEN), never on a public address.
//
// Settings (env): ZEC_DEVTOOL (the binary), ZEC_WALLET_DIR,
// ZEC_LANE_API_KEY, ZEC_LANE_LISTEN (default 127.0.0.1:8790),
// ZEC_SERVER (default zecrocks: its server for the wallet's network),
// ZEC_SYNC_SECONDS (default 15).

import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { timingSafeEqual } from "node:crypto";

const env = (k, d) => {
  const v = process.env[k] ?? d;
  if (v === undefined) throw new Error(`${k} is not set`);
  return v;
};
const DEVTOOL = env("ZEC_DEVTOOL");
const WALLET = env("ZEC_WALLET_DIR");
const KEY = env("ZEC_LANE_API_KEY");
const SERVER = env("ZEC_SERVER", "zecrocks");
const [HOST, PORT] = env("ZEC_LANE_LISTEN", "127.0.0.1:8790").split(":");
const SYNC_MS = Number(env("ZEC_SYNC_SECONDS", "15")) * 1000;

// ---------------------------------------------------------------- devtool

/** One devtool command at a time: two never touch the wallet together. */
let queue = Promise.resolve();
function devtool(args) {
  const run = () =>
    new Promise((resolve, reject) => {
      execFile(DEVTOOL, ["wallet", "-w", WALLET, ...args], { timeout: 300_000, maxBuffer: 16 << 20 }, (err, stdout, stderr) =>
        err ? reject(new Error(`${args[0]} failed: ${String(stderr || err.message).trim().split("\n").pop()}`)) : resolve(String(stdout))
      );
    });
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

// ---------------------------------------------------------------- the wallet's own database

const db = () => new DatabaseSync(join(WALLET, "data.sqlite"), { readOnly: true });

/** The memo as text: Zcash memo bytes up to the first zero; 0xF6 starts "no memo". */
function memoText(bytes) {
  if (!bytes || !bytes.length || bytes[0] === 0xf6 || bytes[0] > 0xf4) return "";
  const end = bytes.indexOf(0);
  return Buffer.from(end < 0 ? bytes : bytes.subarray(0, end)).toString("utf8");
}

const hexTxid = (b) => Buffer.from(b).reverse().toString("hex");

function syncedHeight(d) {
  const r = d.prepare("SELECT MAX(height) AS h FROM blocks").get();
  return r?.h ?? null;
}

// ---------------------------------------------------------------- sync loop

let lastSync = { at: 0, ok: false, error: null };
async function syncOnce() {
  try {
    await devtool(["sync", "-s", SERVER]);
    // A synced wallet has each payment's value but not its memo (compact
    // blocks carry none): the full transactions are fetched to read them.
    await devtool(["enhance", "-s", SERVER]);
    lastSync = { at: Date.now(), ok: true, error: null };
  } catch (e) {
    lastSync = { at: Date.now(), ok: false, error: e.message };
  }
}
(async function loop() {
  await syncOnce();
  setTimeout(loop, SYNC_MS);
})();

// ---------------------------------------------------------------- the API

let accountCache = null;
async function account() {
  if (accountCache) return accountCache;
  const out = await devtool(["list-accounts"]);
  const uivk = out.match(/UIVK:\s*(\S+)/)?.[1];
  const ufvk = out.match(/UFVK:\s*(\S+)/)?.[1];
  const addrOut = await devtool(["list-addresses"]);
  const address = addrOut.match(/Default Address:\s*(\S+)/)?.[1];
  if (!address || !ufvk) throw new Error("the wallet has no account yet");
  return (accountCache = { address, uivk, ufvk });
}

function received(since) {
  const d = db();
  try {
    const tip = syncedHeight(d);
    const rows = d
      .prepare(
        `SELECT txid, tx_mined_height AS height, output_pool AS pool, output_index AS idx, value, memo
         FROM v_tx_outputs
         WHERE to_account_uuid IS NOT NULL AND is_change = 0 AND (from_account_uuid IS NULL OR from_account_uuid != to_account_uuid)
           AND (tx_mined_height IS NULL OR tx_mined_height >= ?)
         ORDER BY tx_mined_height`
      )
      .all(since);
    return {
      tip,
      payments: rows.map((r) => ({
        txid: hexTxid(r.txid),
        output: `${r.pool}:${r.idx}`,
        height: r.height,
        confirmations: r.height == null || tip == null ? 0 : tip - r.height + 1,
        zat: Number(r.value),
        memo: memoText(r.memo),
      })),
    };
  } finally {
    d.close();
  }
}

function authorized(req) {
  const got = Buffer.from(String(req.headers.authorization ?? ""));
  const want = Buffer.from(`Bearer ${KEY}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  if (!authorized(req)) return json(res, 401, { error: "unauthorized" });
  const url = new URL(req.url, "http://lane");
  try {
    if (req.method === "GET" && url.pathname === "/info") {
      const a = await account();
      const d = db();
      const height = syncedHeight(d);
      d.close();
      const balance = (await devtool(["balance"])).match(/spendable_value:\s*Zatoshis\(\s*(\d+)/g)?.map((m) => Number(m.match(/(\d+)$/)[1])) ?? [];
      return json(res, 200, { ...a, height, spendableZat: balance.reduce((s, v) => s + v, 0), sync: lastSync });
    }
    if (req.method === "GET" && url.pathname === "/received") {
      return json(res, 200, received(Number(url.searchParams.get("since") ?? 0)));
    }
    return json(res, 404, { error: "not found" });
  } catch (e) {
    console.error(`[zec-lane] ${req.method} ${url.pathname}:`, e.message);
    return json(res, 502, { error: e.message });
  }
}).listen(Number(PORT), HOST, () => console.log(`zec-lane on ${HOST}:${PORT}, wallet ${WALLET}, server ${SERVER}`));
