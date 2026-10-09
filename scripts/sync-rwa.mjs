#!/usr/bin/env node
// Fills in the addresses of src/components/integrator/ipow/rwaTokens.ts
// from the iPoW repo's deployment records, for a token listed there ahead
// of its deployment (its `token: ""`). A token's address already filled is
// checked against the record and never changed; a mismatch stops the run.
// Run after deploying the tokens, from the Greatwall repo:
//
//   node scripts/sync-rwa.mjs [--ipow ../ipow] [--dry]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const ipow = resolve(root, args.includes("--ipow") ? args[args.indexOf("--ipow") + 1] : "../ipow");
const dry = args.includes("--dry");
const FILE = join(root, "src", "components", "integrator", "ipow", "rwaTokens.ts");

/** Each network's record of its deployed tokens: symbol -> address. */
function records() {
  const out = {};
  const evm = join(ipow, "evm", "deployments");
  for (const chain of ["ethereum", "base", "robinhood", "hyperliquid", "tempo", "arbitrum"]) {
    const f = join(evm, `${chain}-testnet-rwa.json`);
    if (!existsSync(f)) continue;
    out[chain] = Object.fromEntries(Object.entries(JSON.parse(readFileSync(f, "utf8")).tokens).map(([s, t]) => [s, t.address]));
  }
  const sol = join(ipow, "solana", "testnet-rwa.json");
  if (existsSync(sol)) out.solana = Object.fromEntries(Object.entries(JSON.parse(readFileSync(sol, "utf8")).tokens).map(([s, t]) => [s, t.mint]));
  return out;
}

const known = records();
let ts = readFileSync(FILE, "utf8");
const filled = [];
const waiting = [];
ts = ts.replace(/\{ chain: "([a-z]+)", symbol: "([^"]+)",([^\n]*?) token: "([^"]*)",/g, (line, chain, symbol, mid, token) => {
  const deployed = known[chain]?.[symbol];
  if (token) {
    if (deployed && deployed.toLowerCase() !== token.toLowerCase()) throw new Error(`${chain} ${symbol}: listed at ${token}, recorded at ${deployed}`);
    return line;
  }
  if (!deployed) {
    waiting.push(`${chain} ${symbol}`);
    return line;
  }
  filled.push(`${chain} ${symbol}: ${deployed}`);
  return `{ chain: "${chain}", symbol: "${symbol}",${mid} token: "${deployed}",`;
});

for (const f of filled) console.log((dry ? "would fill " : "filled ") + f);
for (const w of waiting) console.log(`not deployed yet: ${w}`);
if (!filled.length) console.log("nothing to fill");
if (filled.length && !dry) writeFileSync(FILE, ts);
