#!/usr/bin/env node
// Copies the iPoW operator's fast-path limits into Greatwall, so the Lock and
// Unlock pages only let through what the operator pays at once: each pair's
// `fast.max` and `fast.min_fee` per asset (in record units, 9 decimals), as
// `{max, minFee}`, from the node's
// settings (ipow/node/node.testnet.yml), and the operator's addresses from
// the deployment records. Run after the node's settings change:
//
//   node scripts/sync-fast-limits.mjs [--ipow ../ipow]
//
// Writes src/components/integrator/ipow/fastLimits.json.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const ipow = resolve(root, args.includes("--ipow") ? args[args.indexOf("--ipow") + 1] : "../ipow");
const OUT = join(root, "src", "components", "integrator", "ipow", "fastLimits.json");

/** The node's network names, as Greatwall names them. */
const CHAIN = {
  "ethereum-sepolia": "ethereum",
  "base-sepolia": "base",
  "arbitrum-sepolia": "arbitrum",
  "robinhood-testnet": "robinhood",
  "hyperliquid-testnet": "hyperliquid",
  "tempo-testnet": "tempo",
  "solana-devnet": "solana",
};
const chain = (n) => {
  if (!CHAIN[n]) throw new Error(`unknown network ${n} in the node's settings`);
  return CHAIN[n];
};

// The settings' vault pairs, read line by line: a pair starts at
// `- networks: [a, b]`; its assets are `- { home: x, asset: n, fast: { ... max: m } }`
// on one line, or `- home: x` with `asset:` and `fast:` on the lines after.
// An asset with no `asset:` is the network's coin, asset 0.
const text = readFileSync(join(ipow, "node", "node.testnet.yml"), "utf8");
const pairs = {};
let pair = null;
let entry = null;
const close = () => {
  if (pair && entry && entry.max !== undefined) pair[`${entry.home}:${entry.asset ?? 0}`] = { max: entry.max, minFee: entry.minFee };
  entry = null;
};
for (const raw of text.split("\n")) {
  const line = raw.replace(/#.*$/, "");
  const nets = line.match(/^\s*- networks:\s*\[([\w-]+),\s*([\w-]+)\]/);
  if (nets) {
    close();
    const key = [chain(nets[1]), chain(nets[2])].sort().join("|");
    pair = pairs[key] = {};
    continue;
  }
  if (!pair) continue;
  const inline = line.match(/^\s*- \{\s*home:\s*([\w-]+)(?:,\s*asset:\s*(\d+))?.*fast:\s*\{\s*min_fee:\s*(\d+),\s*max:\s*(\d+)/);
  if (inline) {
    close();
    pair[`${chain(inline[1])}:${inline[2] ?? 0}`] = { max: inline[4], minFee: inline[3] };
    continue;
  }
  const home = line.match(/^\s*- home:\s*([\w-]+)/);
  if (home) {
    close();
    entry = { home: chain(home[1]) };
    continue;
  }
  if (entry) {
    const asset = line.match(/^\s*asset:\s*(\d+)/);
    if (asset) entry.asset = Number(asset[1]);
    const fast = line.match(/fast:\s*\{\s*min_fee:\s*(\d+),\s*max:\s*(\d+)/);
    if (fast) {
      entry.minFee = fast[1];
      entry.max = fast[2];
    }
  }
}
close();

// The operator's Bitcoin address: public, but kept only in the node's
// git-ignored env file beside its key; only that one variable is read.
const btcEnv = readFileSync(join(ipow, "node", ".env.operator-btc"), "utf8").match(/^OPERATOR_BTC_WALLET_ADDRESS=["']?(bc1[0-9a-z]+)/m);
const operator = {
  evm: JSON.parse(readFileSync(join(ipow, "evm", "deployments", "ethereum-testnet-rwa.json"), "utf8")).operator,
  solana: JSON.parse(readFileSync(join(ipow, "solana", "testnet-rwa.json"), "utf8")).operator,
  bitcoin: btcEnv ? btcEnv[1] : null,
};
const count = Object.values(pairs).reduce((n, p) => n + Object.keys(p).length, 0);
writeFileSync(OUT, JSON.stringify({ source: "ipow/node/node.testnet.yml", operator, pairs }, null, 2) + "\n");
console.log(`wrote ${OUT}: ${Object.keys(pairs).length} pairs, ${count} fast limits, operator ${operator.evm} / ${operator.solana} / ${operator.bitcoin}`);
