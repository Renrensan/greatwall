"use client";

// Picking a basket's part: the network first (tabs with the networks'
// logos), then one of its assets — this network's own, or another's as the
// vault's receipt here. One component for the Create pages of every network.

import { useEffect, useState } from "react";
import Image from "next/image";

export type PickItem = {
  /** The token here (an address, a mint); empty for one that does not exist yet. */
  token: string;
  symbol: string;
  name: string;
  logo: string | any | null;
  /** False for another network's asset whose receipt is not made here yet:
   *  it can be a part (E5), and the basket mints once it is bridged. */
  exists?: boolean;
};

export type PickGroup = {
  key: string;
  /** The network's name, shown on its tab. */
  label: string;
  logo: string | any | null;
  items: PickItem[];
};

export function PartLogo({ item, size = 32 }: { item: PickItem | null; size?: number }) {
  return item?.logo ? (
    <Image src={item.logo} alt={item.symbol} width={size} height={size} unoptimized={typeof item.logo === "string"} className="rounded-full object-contain shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-full bg-black/5 flex items-center justify-center text-xs font-bold opacity-50 shrink-0" style={{ width: size, height: size }}>
      {item?.symbol?.charAt(0) ?? "?"}
    </span>
  );
}

/** The part as picked, opening the picker. */
export function PartButton({ item, placeholder, subtitle, open, onClick, chooseLabel }: { item: PickItem | null; placeholder: string; subtitle: string; open: boolean; onClick: () => void; chooseLabel: string }) {
  return (
    <button type="button" onClick={onClick} className="w-full glass-card rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-black/5 text-left">
      <div className="flex items-center gap-3 min-w-0">
        <PartLogo item={item} />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="font-bold text-sm">{item?.symbol ?? placeholder}</span>
          <span className="text-[11px] opacity-60 break-all">{item?.name ?? subtitle}</span>
        </div>
      </div>
      <span className="text-xs font-bold opacity-60 shrink-0">{open ? "▲" : chooseLabel}</span>
    </button>
  );
}

export function PartPicker({
  groups,
  selected,
  taken,
  onPick,
  onByAddress,
  labels,
  note,
}: {
  groups: PickGroup[];
  /** The token picked now, to open on its network. */
  selected: string;
  /** Tokens the other parts hold: offered greyed. */
  taken: string[];
  onPick: (token: string) => void;
  onByAddress: () => void;
  labels: { byAddress: string; notBridgedYet: string; none: string };
  /** A line under the list, e.g. why only these networks. */
  note?: string | null;
}) {
  const of = (token: string) => groups.find((g) => g.items.some((it) => it.token && it.token.toLowerCase() === token.toLowerCase()))?.key;
  const [active, setActive] = useState<string>(() => of(selected) ?? groups[0]?.key ?? "");
  useEffect(() => {
    if (!groups.some((g) => g.key === active)) setActive(groups[0]?.key ?? "");
  }, [groups, active]);
  const group = groups.find((g) => g.key === active) ?? groups[0];
  const lower = taken.map((t) => t.toLowerCase());
  return (
    <div className="flex flex-col gap-2 glass-card rounded-xl p-2">
      {/* The network. */}
      <div className="flex gap-1 overflow-x-auto! custom-scrollbar pb-1">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setActive(g.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${g.key === group?.key ? "bg-ink text-snow" : "bg-black/5 hover:bg-black/10"}`}
          >
            {g.logo ? <Image src={g.logo} alt={g.label} width={18} height={18} unoptimized={typeof g.logo === "string"} className="w-[18px] h-[18px] rounded-full object-contain" /> : null}
            {g.label}
          </button>
        ))}
      </div>
      {/* Its assets. */}
      <div className="flex flex-col gap-1 max-h-72 overflow-y-auto! custom-scrollbar">
        {group?.items.length ? (
          group.items.map((it) => {
            const off = (it.token !== "" && lower.includes(it.token.toLowerCase())) || (it.exists === false && lower.includes(`pending:${it.symbol}`.toLowerCase()));
            return (
              <button
                key={`${group.key}-${it.token || it.symbol}`}
                type="button"
                disabled={off}
                onClick={() => onPick(it.exists === false ? `pending:${it.symbol}` : it.token)}
                className={`flex items-center gap-3 p-2 rounded-lg text-left shrink-0 ${off ? "opacity-40 cursor-default" : "hover:bg-black/5"}`}
              >
                <PartLogo item={it} size={28} />
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-bold text-sm">{it.symbol}</span>
                  <span className="text-[11px] opacity-60 break-words">
                    {it.name}
                    {it.exists === false ? ` · ${labels.notBridgedYet}` : ""}
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <span className="text-xs opacity-60 p-2">{labels.none}</span>
        )}
        <button type="button" onClick={onByAddress} className="flex items-center gap-3 p-2 rounded-lg text-left hover:bg-black/5 shrink-0">
          <span className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center text-xs font-bold opacity-50">0x</span>
          <span className="text-sm font-bold">{labels.byAddress}</span>
        </button>
      </div>
      {note && <span className="text-[11px] opacity-60 px-2 pb-1">{note}</span>}
    </div>
  );
}
