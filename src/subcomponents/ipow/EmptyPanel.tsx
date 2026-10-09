"use client";

// A list with nothing to show (no locked tokens, no history yet): a small
// picture of what belongs there, why it is empty, and what to do next.

import { Icon } from "@iconify/react";

/** The look of a panel's one action (a link or a button). */
export const emptyAction =
  "inline-flex items-center gap-2 rounded-xl bg-ink text-snow px-4 py-2.5 text-sm font-semibold hover:bg-pitch transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** A token on its home network, then the same token held on another: what locking does. */
export function LockPicture() {
  const coin = (badge: string, faded?: boolean) => (
    <span className={`relative w-12 h-12 shrink-0 ${faded ? "opacity-60" : ""}`}>
      <img src="/assets/networks/ethereum.png" alt="" className="w-12 h-12 rounded-full object-cover border border-ink/10 bg-snow" />
      <img src={badge} alt="" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-paper" />
    </span>
  );
  return (
    <div aria-hidden className="flex items-center gap-3">
      {coin("/assets/networks/ethereum.png")}
      <Icon icon="solar:arrow-right-linear" className="text-xl opacity-40" />
      {coin("/assets/networks/solana.png", true)}
    </div>
  );
}

/** An icon in a soft circle, for panels that are not about one token. */
export function IconPicture({ icon }: { icon: string }) {
  return (
    <span aria-hidden className="w-14 h-14 rounded-full bg-black/5 border border-ink/10 flex items-center justify-center">
      <Icon icon={icon} className="text-2xl opacity-60" />
    </span>
  );
}

export function EmptyPanel({ picture, title, text, children }: { picture: React.ReactNode; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-ink/15 bg-black/[0.015] px-5 py-8 flex flex-col items-center text-center gap-4">
      {picture}
      <div className="flex flex-col gap-1.5 max-w-xs">
        <h3 className="text-base font-bold" style={{ textWrap: "balance" }}>
          {title}
        </h3>
        <p className="text-xs opacity-70 leading-relaxed">{text}</p>
      </div>
      {children}
    </div>
  );
}

/** Rows of a list still being read. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-2" aria-busy="true">
      {[...Array(rows)].map((_, i) => (
        <li key={i} className="flex items-center gap-3 p-2 animate-pulse">
          <span className="w-9 h-9 rounded-full bg-black/10" />
          <span className="flex-1 flex flex-col gap-1.5">
            <span className="h-3 w-20 bg-black/10 rounded" />
            <span className="h-2.5 w-32 bg-black/10 rounded" />
          </span>
          <span className="h-3 w-14 bg-black/10 rounded" />
        </li>
      ))}
    </ul>
  );
}
