"use client";

// The protocol explorer: every iPoW transaction on the networks Greatwall
// runs, newest first, read straight from the chains (/api/explorer/*): what
// it did, who did it (an operator, a user, a guardian), and a link to it on
// the network's own explorer. So anyone can watch the operators work.

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

import { evmTxLink } from "./ipow/common";
import { EmptyPanel, IconPicture, ListSkeleton } from "./ipow/EmptyPanel";
import type { ExplorerTx, ExplorerView, Role } from "@/app/api/explorer/[chain]/route";

const CHAINS = ["ethereum", "solana", "base", "robinhood", "hyperliquid", "arbitrum", "tempo"] as const;
const REFRESH_MS = 30_000;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const short = (x: string) => `${x.slice(0, 6)}…${x.slice(-4)}`;

const ROLES: { id: Role; label: string; tone: string; what: string }[] = [
  { id: "operator", label: "Operator", tone: "bg-ink text-snow", what: "relays Bitcoin blocks, takes jobs, carries messages between networks" },
  { id: "user", label: "User", tone: "bg-[#3b5bdb]/12 text-[#3b5bdb]", what: "locks, unlocks, converts, mints" },
  { id: "guardian", label: "Guardian", tone: "bg-[#c92a2a]/12 text-[#c92a2a]", what: "objects to false claims and gets operators slashed" },
  { id: "protocol", label: "Protocol", tone: "bg-black/5 text-ink", what: "closes what time decided" },
];
const roleOf = (r: Role) => ROLES.find((x) => x.id === r)!;

/** "just now", "5 min ago", "3h ago", "2d ago". */
function ago(at: number | null): string {
  if (!at) return "";
  const s = Math.max(0, Date.now() / 1000 - at);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

type Tip = { height: number; hash: string; time: number };
type Loaded = { view?: ExplorerView; error?: string };
type Row = ExplorerTx & { chain: string };

export default function ProtocolExplorer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [views, setViews] = useState<Record<string, Loaded>>({});
  const [chain, setChain] = useState<string>("all");
  const [role, setRole] = useState<Role | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let live = true;
    const read = () => {
      fetch("/api/explorer/bitcoin")
        .then((r) => r.json())
        .then((t) => live && !t.error && setTip(t))
        .catch(() => {});
      for (const c of CHAINS) {
        fetch(`/api/explorer/${c}`)
          .then(async (r) => {
            const body = await r.json();
            if (live) setViews((v) => ({ ...v, [c]: r.ok ? { view: body } : { error: body.error ?? `HTTP ${r.status}` } }));
          })
          .catch((e) => live && setViews((v) => ({ ...v, [c]: v[c]?.view ? v[c] : { error: String(e) } })));
      }
    };
    read();
    const id = setInterval(read, REFRESH_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  const all = useMemo(() => {
    const rows: Row[] = [];
    for (const c of CHAINS) for (const t of views[c]?.view?.txs ?? []) rows.push({ ...t, chain: c });
    return rows.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  }, [views]);

  const q = query.trim().toLowerCase();
  const rows = all.filter(
    (t) => (chain === "all" || t.chain === chain) && (role === "all" || t.role === role) && (!q || t.tx.toLowerCase().includes(q) || (t.from ?? "").toLowerCase().includes(q)),
  );
  const loading = CHAINS.some((c) => !views[c]);
  const failed = CHAINS.filter((c) => views[c]?.error);
  const operatorTxs = all.filter((t) => t.role === "operator").length;

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl bg-ink text-snow p-6 sm:p-8 flex flex-col gap-4">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-snow/70">
          <span className="w-2 h-2 rounded-full bg-[#3ddc84] animate-pulse" aria-hidden />
          Live from the chains
        </span>
        <h1 className="font-display text-4xl sm:text-6xl leading-[1.08] pb-[0.08em]" style={{ textWrap: "balance" }}>
          Protocol explorer
        </h1>
        <p className="text-sm sm:text-base text-snow/80 max-w-2xl leading-relaxed">
          Every iPoW transaction behind Greatwall, read straight from each network: what the operators did, what users did, and who checked
          them. Open any row to see it on the network&rsquo;s own explorer.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2">
            <Icon icon="cryptocurrency:btc" className="text-xl text-[#f7931a]" />
            <span className="text-snow/70">Bitcoin tip</span>
            {tip ? (
              <a href={`https://mempool.space/block/${tip.hash}`} target="_blank" rel="noreferrer" className="font-bold tabular-nums underline underline-offset-2 decoration-snow/30 hover:decoration-snow">
                {tip.height.toLocaleString("en-US")}
              </a>
            ) : (
              <span className="inline-block h-4 w-16 rounded bg-snow/20 animate-pulse" aria-label="Loading" />
            )}
          </span>
          <span className="text-snow/70">
            <span className="font-bold text-snow tabular-nums">{all.length}</span> transactions read · <span className="font-bold text-snow tabular-nums">{operatorTxs}</span> by operators
          </span>
        </div>
      </header>

      <section aria-labelledby="txs-title" className="rounded-2xl bg-paper border border-ink/10 p-4 sm:p-5 flex flex-col gap-4">
        <h2 id="txs-title" className="sr-only">
          Transactions
        </h2>

        {/* Filters: network, who did it, and an address or hash to look for. */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Network">
            {["all", ...CHAINS].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChain(c)}
                aria-pressed={chain === c}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${chain === c ? "bg-ink text-snow" : "bg-black/5 hover:bg-black/10"}`}
              >
                {c !== "all" && <img src={`/assets/networks/${c}.png`} alt="" className="w-4 h-4 rounded-full" />}
                {c === "all" ? "All networks" : cap(c)}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Who">
              {(["all", ...ROLES.map((r) => r.id)] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  aria-pressed={role === r}
                  title={r === "all" ? undefined : roleOf(r).what}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${role === r ? "bg-ink text-snow" : "bg-black/5 hover:bg-black/10"}`}
                >
                  {r === "all" ? "Everyone" : roleOf(r).label}
                </button>
              ))}
            </div>
            <label className="relative sm:w-72">
              <span className="sr-only">Search by address or transaction hash</span>
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" aria-hidden />
              <input
                id="explorer-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Address or tx hash"
                spellCheck={false}
                className="w-full rounded-xl bg-well border border-ink/10 pl-9 pr-3 py-2 text-sm outline-none focus:border-ink/40"
              />
            </label>
          </div>
        </div>

        {failed.length > 0 && <p className="text-[11px] text-red-600">Couldn&rsquo;t read {failed.map(cap).join(", ")} right now; it is tried again in 30 seconds.</p>}

        {loading && rows.length === 0 ? (
          <ListSkeleton rows={8} />
        ) : rows.length === 0 ? (
          <EmptyPanel picture={<IconPicture icon="solar:magnifer-linear" />} title="No transactions match" text="Try another network or role, or clear the search." />
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.08em] opacity-60">
                  <th scope="col" className="px-2 py-2 font-semibold">What happened</th>
                  <th scope="col" className="px-2 py-2 font-semibold">By</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Network</th>
                  <th scope="col" className="px-2 py-2 font-semibold text-right">When</th>
                  <th scope="col" className="px-2 py-2 font-semibold text-right">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5 align-top">
                {rows.map((t) => {
                  const link = t.chain === "solana" ? `https://explorer.solana.com/tx/${t.tx}?cluster=devnet` : evmTxLink(t.chain, t.tx);
                  const r = roleOf(t.role);
                  return (
                    <tr key={`${t.chain}:${t.tx}`} className="hover:bg-black/[0.02]">
                      <td className="px-2 py-3 max-w-md">
                        <span className="font-semibold block">{t.title}</span>
                        {t.detail && <span className="text-xs opacity-70 block break-words">{t.detail}</span>}
                        {t.also.length > 0 && <span className="text-[11px] opacity-50 block pt-0.5">Also: {t.also.join(" · ")}</span>}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span className="flex flex-col items-start gap-1">
                          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${r.tone}`}>{r.label}</span>
                          {t.from && (
                            <button type="button" onClick={() => setQuery(t.from!)} title="Show only this address" className="font-mono text-[11px] opacity-70 hover:opacity-100 underline-offset-2 hover:underline">
                              {short(t.from)}
                            </button>
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <img src={`/assets/networks/${t.chain}.png`} alt="" className="w-4 h-4 rounded-full" />
                          {cap(t.chain)}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right text-xs opacity-70 tabular-nums" title={t.at ? new Date(t.at * 1000).toLocaleString() : undefined}>
                        {ago(t.at)}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        {link ? (
                          <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs underline underline-offset-2 decoration-ink/20 hover:decoration-ink">
                            {short(t.tx)}
                            <Icon icon="solar:arrow-right-up-linear" aria-hidden />
                          </a>
                        ) : (
                          <span className="font-mono text-xs opacity-60">{short(t.tx)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
