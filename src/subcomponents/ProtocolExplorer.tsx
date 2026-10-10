"use client";

// The protocol explorer: every iPoW transaction on the networks Greatwall
// runs, newest first, read straight from the chains (/api/explorer/*): what
// it did, who did it (an operator, a user, a guardian), and a link to it on
// the network's own explorer. So anyone can watch the operators work.

import { Fragment, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

import { evmTxLink } from "./ipow/common";
import { explain } from "@/components/integrator/ipow/explorerGlossary";
import { EmptyPanel, IconPicture, ListSkeleton } from "./ipow/EmptyPanel";
import { Poster } from "./ipow/Poster";
import poster from "@/assets/background-explorer.jpg";
import type { ExplorerTx, ExplorerView, Role } from "@/app/api/explorer/[chain]/route";

const CHAINS = ["ethereum", "solana", "base", "robinhood", "hyperliquid", "arbitrum", "tempo"] as const;
const REFRESH_MS = 30_000;
/** Rows on one page of the table. */
const PAGE_SIZE = 25;

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
  const [page, setPage] = useState(0);
  /** The row whose details are open, by network and transaction. */
  const [opened, setOpened] = useState<string | null>(null);
  // A new filter or search starts again from the first page; a refresh keeps the page.
  useEffect(() => setPage(0), [chain, role, query]);

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
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // Rows can shrink under the page (a filter, a refresh): the last page then.
  const at = Math.min(page, pages - 1);
  const shown = rows.slice(at * PAGE_SIZE, (at + 1) * PAGE_SIZE);
  const loading = CHAINS.some((c) => !views[c]);
  const failed = CHAINS.filter((c) => views[c]?.error);
  const operatorTxs = all.filter((t) => t.role === "operator").length;

  return (
    <div className="flex flex-col gap-6">
      <Poster
        image={poster}
        title="Explorer"
        text="Every iPoW transaction behind Greatwall, read straight from each network: what the operators did, what users did, and who checked them."
        corner={
          <span className="inline-flex items-center gap-2 rounded-full bg-black/45 backdrop-blur px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
            <span className="w-2 h-2 rounded-full bg-[#3ddc84] animate-pulse" aria-hidden />
            Live from the chains
          </span>
        }
      />

      {/* The Bitcoin tip every network checks against, and what was read. */}
      <div className="rounded-2xl bg-paper border border-ink/10 px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2">
          <Icon icon="cryptocurrency:btc" className="text-xl text-[#f7931a]" />
          <span className="opacity-70">Bitcoin tip</span>
          {tip ? (
            <a href={`https://mempool.space/block/${tip.hash}`} target="_blank" rel="noreferrer" className="font-bold tabular-nums underline underline-offset-2 decoration-ink/20 hover:decoration-ink">
              {tip.height.toLocaleString("en-US")}
            </a>
          ) : (
            <span className="inline-block h-4 w-16 rounded bg-black/10 animate-pulse" aria-label="Loading" />
          )}
        </span>
        <span className="opacity-70">
          <span className="font-bold opacity-100 tabular-nums">{all.length}</span> transactions read · <span className="font-bold tabular-nums">{operatorTxs}</span> by operators
        </span>
        <span className="text-xs opacity-60 sm:ml-auto">Open any row to see it on the network&rsquo;s own explorer.</span>
      </div>

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
                {shown.map((t) => {
                  const link = t.chain === "solana" ? `https://explorer.solana.com/tx/${t.tx}?cluster=devnet` : evmTxLink(t.chain, t.tx);
                  const r = roleOf(t.role);
                  const id = `${t.chain}:${t.tx}`;
                  const isOpen = opened === id;
                  return (
                    <Fragment key={id}>
                    <tr
                      className={`cursor-pointer transition-colors ${isOpen ? "bg-ink/[0.035] !border-b-0" : "hover:bg-ink/[0.02]"}`}
                      onClick={(e) => {
                        // Links and buttons inside the row keep their own action.
                        if ((e.target as HTMLElement).closest("a,button")) return;
                        setOpened(isOpen ? null : id);
                      }}
                    >
                      <td className="px-2 py-3 max-w-md">
                        <button
                          type="button"
                          onClick={() => setOpened(isOpen ? null : id)}
                          aria-expanded={isOpen}
                          aria-controls={`details-${id}`}
                          className="font-semibold text-left inline-flex items-start gap-1.5 hover:underline underline-offset-2"
                        >
                          <Icon icon="solar:alt-arrow-right-linear" className={`mt-1 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden />
                          {t.title}
                        </button>
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
                    {isOpen && (
                      // The same block as its row: one background, no line between.
                      <tr id={`details-${id}`} className="bg-ink/[0.035] !border-t-0">
                        <td colSpan={5} className="pl-7 pr-2 pt-0 pb-4">
                          <Details t={t} link={link} />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > PAGE_SIZE && <Pager at={at} pages={pages} total={rows.length} onPage={setPage} />}
      </section>
    </div>
  );
}

/** Page numbers around the current one, with the first and last, and gaps between. */
function pageList(at: number, pages: number): (number | "gap")[] {
  const keep = new Set([0, pages - 1, at - 1, at, at + 1].filter((n) => n >= 0 && n < pages));
  const out: (number | "gap")[] = [];
  [...keep].sort((a, b) => a - b).forEach((n, i, all) => {
    if (i > 0 && n - all[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

function Pager({ at, pages, total, onPage }: { at: number; pages: number; total: number; onPage: (n: number) => void }) {
  const step = "inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:pointer-events-none";
  return (
    <nav aria-label="Pages" className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
      <span className="text-xs opacity-60 tabular-nums">
        {(at * PAGE_SIZE + 1).toLocaleString("en-US")}–{Math.min(total, (at + 1) * PAGE_SIZE).toLocaleString("en-US")} of {total.toLocaleString("en-US")}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onPage(at - 1)} disabled={at === 0} aria-label="Previous page" className={`${step} bg-black/5 hover:bg-black/10`}>
          <Icon icon="solar:alt-arrow-left-linear" aria-hidden />
        </button>
        {pageList(at, pages).map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} className="px-1 text-xs opacity-40" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-current={n === at ? "page" : undefined}
              className={`${step} tabular-nums ${n === at ? "bg-ink text-snow" : "bg-black/5 hover:bg-black/10"}`}
            >
              {n + 1}
            </button>
          ),
        )}
        <button type="button" onClick={() => onPage(at + 1)} disabled={at === pages - 1} aria-label="Next page" className={`${step} bg-black/5 hover:bg-black/10`}>
          <Icon icon="solar:alt-arrow-right-linear" aria-hidden />
        </button>
      </div>
    </nav>
  );
}

/** A transaction's details, beyond what its row shows: what it means, why
 *  the protocol does it, and its full facts. */
function Details({ t, link }: { t: Row; link: string | null }) {
  const e = explain(t.kind);
  const label = "text-[11px] font-semibold uppercase tracking-[0.08em] opacity-55";
  const facts: [string, React.ReactNode][] = [
    ["Time", t.at ? new Date(t.at * 1000).toLocaleString() : "Unknown"],
    [t.chain === "solana" ? "Slot" : "Block", t.block.toLocaleString("en-US")],
    ["From", <span key="from" className="font-mono break-all">{t.from ?? "Unknown"}</span>],
    [
      "Transaction",
      link ? (
        <a key="tx" href={link} target="_blank" rel="noreferrer" className="font-mono break-all underline underline-offset-2 decoration-ink/20 hover:decoration-ink">
          {t.tx}
        </a>
      ) : (
        <span key="tx" className="font-mono break-all">{t.tx}</span>
      ),
    ],
  ];
  return (
    <div className="border-t border-ink/10 pt-3 grid gap-x-10 gap-y-3 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] text-[13px] leading-relaxed">
      <div className="flex flex-col gap-2.5 min-w-0">
        {e ? (
          <>
            <p>{e.what}</p>
            <p className="opacity-75">
              <span className={label}>Why · </span>
              {e.why}
            </p>
          </>
        ) : (
          <p className="opacity-75">No further explanation for this action yet.</p>
        )}
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 self-start text-xs">
        {facts.map(([k, v]) => (
          <Fragment key={k}>
            <dt className="opacity-55">{k}</dt>
            <dd className="min-w-0">{v}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}
