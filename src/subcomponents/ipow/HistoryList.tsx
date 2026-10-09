"use client";

// Lock's History, on every network: the wallet's locks and unlocks grouped
// by day, each a row with what moved, from which network to which, its
// state, and when. At most so tall: a long history scrolls inside.

import Link from "next/link";
import { Icon } from "@iconify/react";

import { StateChip } from "./common";

export type HistoryEntry = {
  key: string;
  href: string;
  kind: "lock" | "unlock";
  /** "2 SOL". */
  amount: string;
  from: string;
  to: string;
  id: string;
  /** Seconds since 1970. */
  at: number;
  state: string;
  stateLabel: string;
  /** The network whose accent colours the state chip. */
  chain: string;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "just now", "5 min ago", "3h ago", "2d ago", or the date. */
function ago(at: number, locale: string): string {
  const s = Math.max(0, Date.now() / 1000 - at);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(at * 1000).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

/** The day a time falls on, as a heading. */
function dayOf(at: number, locale: string): string {
  const d = new Date(at * 1000);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

function Net({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <img src={`/assets/networks/${name}.png`} alt="" className="w-3.5 h-3.5 rounded-full shrink-0" />
      <span className="truncate">{cap(name)}</span>
    </span>
  );
}

export function HistoryList({ entries, locale, lockLabel, unlockLabel }: { entries: HistoryEntry[]; locale: string; lockLabel: string; unlockLabel: string }) {
  // Newest first, under one heading per day.
  const groups: { day: string; rows: HistoryEntry[] }[] = [];
  for (const e of [...entries].sort((a, b) => b.at - a.at)) {
    const day = dayOf(e.at, locale);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.rows.push(e);
    else groups.push({ day, rows: [e] });
  }

  return (
    <div className="flex flex-col gap-4 max-h-[560px] overflow-y-auto overscroll-contain pr-1">
      {groups.map((g) => (
        <section key={g.day} className="flex flex-col gap-2" aria-label={g.day}>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] opacity-60 px-1">{g.day}</h3>
          <ul className="rounded-2xl bg-sand border border-ink/10 divide-y divide-ink/5 overflow-hidden">
            {g.rows.map((e) => (
              <li key={e.key}>
                <Link href={e.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.04] focus-visible:bg-black/[0.04] outline-none">
                  <span className="w-10 h-10 rounded-full bg-paper border border-ink/10 flex items-center justify-center shrink-0" aria-hidden>
                    <Icon icon={e.kind === "lock" ? "solar:lock-keyhole-minimalistic-bold" : "solar:lock-keyhole-minimalistic-unlocked-bold"} className="text-lg opacity-70" />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="flex items-baseline gap-2 min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-60 shrink-0">{e.kind === "lock" ? lockLabel : unlockLabel}</span>
                      <span className="text-sm sm:text-base font-bold tabular-nums truncate">{e.amount}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] sm:text-xs opacity-70 min-w-0">
                      <Net name={e.from} />
                      <Icon icon="solar:arrow-right-linear" className="text-xs opacity-60 shrink-0" />
                      <Net name={e.to} />
                      <span className="opacity-60 shrink-0">· #{e.id}</span>
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1 shrink-0">
                    <StateChip state={e.state} chain={e.chain} label={e.stateLabel} />
                    <time dateTime={new Date(e.at * 1000).toISOString()} title={new Date(e.at * 1000).toLocaleString(locale)} className="text-[11px] opacity-60 tabular-nums">
                      {ago(e.at, locale)}
                    </time>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
