"use client";

// Picking a basket's part, in a modal like Convert's token list: the network
// first (chips with the networks' logos), then one of its assets — this
// network's own, or another's as the vault's receipt here. One component
// for the Create pages of every network.

import { useEffect, useState } from "react";
import Image from "next/image";
import { FaCheckCircle } from "react-icons/fa";
import { Icon } from "@iconify/react";

import { AnimatedModal } from "../AnimatedModal";
import ButtonContrast from "../ButtonContrast";

export type PickItem = {
  /** The token here (an address, a mint); empty for one that does not exist yet. */
  token: string;
  symbol: string;
  name: string;
  logo: string | any | null;
  /** False for another network's asset whose receipt is not made here yet:
   *  it can be a part (E5), and the basket mints once it is bridged. */
  exists?: boolean;
  /** For an RWA token: its page on rwa.xyz, and a line on what it is. */
  about?: string;
  description?: string;
  /** For another network's asset: that network and the asset's number in
   *  its vault, which name a receipt not made yet (two networks can hold
   *  assets of one symbol, vGLDx from Base and from Solana). */
  from?: string;
  asset?: number;
};

/** How a receipt not made yet is picked: by its network and asset number. */
export const pendingKey = (from: string | undefined, asset: number | undefined) => `pending:${from}:${asset}`;
const pendingOfItem = (it: PickItem) => pendingKey(it.from, it.asset);

export type PickGroup = {
  key: string;
  /** The network's name, shown on its tab. */
  label: string;
  logo: string | any | null;
  items: PickItem[];
  /** True while the network's assets are still being read: skeleton rows, not an empty list. */
  loading?: boolean;
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

export function PartPicker({
  open,
  onClose,
  groups,
  selected,
  taken,
  onPick,
  onByAddress,
  labels,
  note,
}: {
  open: boolean;
  onClose: () => void;
  groups: PickGroup[];
  /** The token picked now, to open on its network and mark it. */
  selected: string;
  /** Tokens the other parts hold: offered greyed. */
  taken: string[];
  onPick: (token: string) => void;
  /** A token typed by its address or mint. */
  onByAddress: (address: string) => void;
  labels: { title: string; subtitle: string; search: string; noneFound: string; byAddress: string; addressPlaceholder: string; add: string; none: string; about: string; close: string };
  /** A line under the list, e.g. why only these networks. */
  note?: string | null;
}) {
  const of = (token: string) => groups.find((g) => g.items.some((it) => it.token && it.token.toLowerCase() === token.toLowerCase()))?.key;
  const [active, setActive] = useState<string>(() => of(selected) ?? groups[0]?.key ?? "");
  const [query, setQuery] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  // Opens on the picked token's network, with no search.
  useEffect(() => {
    if (open) {
      setActive(of(selected) ?? groups[0]?.key ?? "");
      setQuery("");
      setAddress(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!groups.some((g) => g.key === active)) setActive(groups[0]?.key ?? "");
  }, [groups, active]);
  const group = groups.find((g) => g.key === active) ?? groups[0];
  const lower = taken.map((t) => t.toLowerCase());
  const picked = selected.toLowerCase();
  const isPicked = (it: PickItem) => (it.exists === false ? pendingOfItem(it).toLowerCase() === picked : it.token !== "" && it.token.toLowerCase() === picked);
  const q = query.trim().toLowerCase();
  const items = (group?.items ?? []).filter((it) => !q || it.symbol.toLowerCase().includes(q) || it.name.toLowerCase().includes(q));
  return (
    <AnimatedModal isOpen={open} onClose={onClose} maxWidthClass="lg:w-150">
      <div className="flex flex-col p-6 overflow-hidden flex-1 min-h-0 max-h-[80vh]">
        <div className="flex flex-col h-full min-h-0">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">{labels.title}</h2>
            <p className="text-[12px] opacity-70">{labels.subtitle}</p>
          </div>

          {/* The network. */}
          {groups.length > 1 && (
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-4 -mx-1 px-1 shrink-0">
              {groups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActive(g.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold shrink-0 border transition-colors ${g.key === group?.key ? "bg-ink text-snow border-ink" : "border-black/10 hover:bg-black/5"}`}
                >
                  {g.logo ? <Image src={g.logo} alt={g.label} width={18} height={18} unoptimized={typeof g.logo === "string"} className="w-[18px] h-[18px] rounded-full object-contain" /> : null}
                  {g.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative group mb-5 shrink-0">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Icon icon="solar:magnifer-linear" className="text-xl opacity-40 group-focus-within:opacity-100 transition-all" />
            </div>
            <input
              type="text"
              placeholder={labels.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-black/5 border border-black/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-black/50 focus:bg-black/10 transition-all"
            />
          </div>

          <div className="flex flex-col gap-3 pb-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar -mx-1 px-1">
            {group?.loading ? (
              [...Array(4)].map((_, i) => (
                <div key={`skeleton-${i}`} className="w-full shrink-0 p-4 border border-transparent rounded-xl flex items-center justify-between gap-3 animate-pulse bg-black/5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-black/10 shrink-0" />
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-12 bg-black/10 rounded" />
                      <div className="h-2 w-20 bg-black/10 rounded" />
                    </div>
                  </div>
                </div>
              ))
            ) : items.length > 0 ? (
              items.map((it) => {
                const isSelected = isPicked(it);
                const off = !isSelected && ((it.token !== "" && lower.includes(it.token.toLowerCase())) || (it.exists === false && lower.includes(pendingOfItem(it).toLowerCase())));
                return (
                  <button
                    key={`${group?.key}-${it.token || it.symbol}`}
                    type="button"
                    disabled={off}
                    onClick={() => onPick(it.exists === false ? pendingOfItem(it) : it.token)}
                    className={`w-full shrink-0 text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                      isSelected ? "border-ink bg-ink! text-snow! shadow-none!" : off ? "border-black/5 opacity-40 cursor-default" : "border-black/5 hover:bg-black/5"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm relative shrink-0 flex items-center justify-center bg-black/5">
                        {it.logo ? <Image src={it.logo} alt={it.symbol} fill className="object-cover" unoptimized={typeof it.logo === "string"} /> : <span className="font-bold text-sm opacity-50">{it.symbol.charAt(0)}</span>}
                      </div>
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className={`font-bold lg:text-sm ${isSelected ? "" : "opacity-80"}`}>
                          {it.symbol}
                          {it.about && (
                            <a href={it.about} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={labels.about} className="ml-1.5 inline-flex align-middle opacity-40 hover:opacity-100">
                              <Icon icon="solar:info-circle-linear" className="text-[14px]" />
                            </a>
                          )}
                        </span>
                        <span className="text-[11px] opacity-60 break-words">
                          {it.name}
                        </span>
                        {it.description && <span className="text-[11px] opacity-45 break-words">{it.description}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">{isSelected && <FaCheckCircle className="text-[18px] text-snow shrink-0" />}</div>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-40 gap-3">
                <Icon icon="solar:box-minimalistic-linear" className="text-5xl" />
                <p className="text-sm font-bold uppercase tracking-widest text-center px-4">{group?.items.length ? labels.noneFound : labels.none}</p>
              </div>
            )}
            {!q && !group?.loading && address === null && (
              <button type="button" onClick={() => setAddress("")} className="w-full shrink-0 text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card border-black/5 hover:bg-black/5">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-black/5">
                    <span className="font-bold text-sm opacity-50">0x</span>
                  </div>
                  <span className="font-bold lg:text-sm opacity-80">{labels.byAddress}</span>
                </div>
              </button>
            )}
            {!q && address !== null && (
              <div className="w-full shrink-0 p-4 border rounded-xl flex flex-col gap-3 glass-card border-black/5">
                <span className="font-bold lg:text-sm opacity-80">{labels.byAddress}</span>
                <input
                  type="text"
                  autoFocus
                  placeholder={labels.addressPlaceholder}
                  value={address}
                  onChange={(e) => setAddress(e.target.value.trim())}
                  onKeyDown={(e) => e.key === "Enter" && address && onByAddress(address)}
                  className="w-full bg-black/5 border border-black/5 rounded-2xl py-3 px-4 text-sm font-mono outline-none focus:border-black/50 focus:bg-black/10 transition-all"
                />
                <button type="button" disabled={!address} onClick={() => address && onByAddress(address)} className="w-full rounded-md bg-ink text-snow py-3 text-xs sm:text-sm font-bold hover:bg-pitch disabled:opacity-40 transition-colors">
                  {labels.add}
                </button>
              </div>
            )}
            {note && <span className="text-[11px] opacity-60 px-1 pt-1">{note}</span>}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 border-t border-black/5 bg-white">
        <div className="flex flex-row justify-center gap-3 w-full">
          <div className="flex-1">
            <ButtonContrast onClick={onClose} buttonText={labels.close} />
          </div>
        </div>
      </div>
    </AnimatedModal>
  );
}
