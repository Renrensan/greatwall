"use client";

// "Launch App" on the About page: the app lives under a network
// (/en/<network>/…), and the About page has none, so every way into the app
// from it asks which network to start on first. The choice is remembered
// (savePreferredChain) and marked the next time; it can be changed any time
// from the app's own network menu.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

import { AnimatedModal } from "@/subcomponents/AnimatedModal";
import { getPreferredChain, savePreferredChain, type SupportedChain } from "@/app/network-provider";
import { arbitrumnetwork, basenetwork, bitcoinnetwork, ethereumnetwork, hyperliquidnetwork, robinhoodnetwork, solananetwork, temponetwork, zcashnetwork } from "@/index";

const PROGRAMMABLE: { key: SupportedChain; name: string; logo: StaticImageData; line: string }[] = [
  { key: "ethereum", name: "Ethereum", logo: ethereumnetwork, line: "Index tokens, lock and convert" },
  { key: "solana", name: "Solana", logo: solananetwork, line: "Index tokens, lock and convert" },
  { key: "base", name: "Base", logo: basenetwork, line: "Index tokens, lock and convert" },
  { key: "robinhood", name: "Robinhood Chain", logo: robinhoodnetwork, line: "Index tokens, lock and convert" },
  { key: "hyperliquid", name: "Hyperliquid", logo: hyperliquidnetwork, line: "Index tokens, lock and convert" },
  { key: "arbitrum", name: "Arbitrum", logo: arbitrumnetwork, line: "Index tokens, lock and convert" },
  { key: "tempo", name: "Tempo", logo: temponetwork, line: "Index tokens, lock and convert" },
];
const SETTLEMENT = { key: "bitcoin" as SupportedChain, name: "Bitcoin", logo: bitcoinnetwork, line: "Convert BTC; the record the others check" };

type Launch = (path: string) => void;
const LaunchContext = createContext<Launch>(() => {});

/** Opens the network chooser, then goes to `path` (e.g. "/index") on the network picked. */

export const useLaunch = () => useContext(LaunchContext);

export function LaunchProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<string | null>(null);
  const launch = useCallback<Launch>((path) => setTarget(path.startsWith("/") ? path : `/${path}`), []);
  return (
    <LaunchContext.Provider value={launch}>
      {children}
      <NetworkChooser target={target} onClose={() => setTarget(null)} />
    </LaunchContext.Provider>
  );
}

function NetworkChooser({ target, onClose }: { target: string | null; onClose: () => void }) {
  const router = useRouter();
  const { locale = "en" } = useParams<{ locale?: string }>();
  // Read after mount: the remembered network lives in this browser only.
  const [last, setLast] = useState<SupportedChain | null>(null);
  useEffect(() => {
    if (target !== null) setLast(localStorage.getItem("preferred-default-chain") ? getPreferredChain() : null);
  }, [target]);

  const go = (key: SupportedChain) => {
    savePreferredChain(key);
    onClose();
    router.push(`/${locale}/${key}${target ?? "/index"}`);
  };
  const row = (n: { key: SupportedChain; name: string; logo: StaticImageData; line: string }) => (
    <button key={n.key} type="button" onClick={() => go(n.key)} className="group flex w-full items-center gap-3 rounded-xl border border-ink/10 bg-paper px-3 py-2.5 text-left transition-colors hover:border-ink/40 hover:bg-snow">
      <Image src={n.logo} alt="" width={36} height={36} className="size-9 shrink-0 rounded-lg" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          {n.name}
          {last === n.key && <span className="rounded-full bg-sand px-1.5 py-0.5 text-[10px] font-medium text-stone">Last used</span>}
        </span>
        <span className="truncate text-xs text-stone">{n.line}</span>
      </span>
      <Icon icon="solar:arrow-right-linear" className="shrink-0 text-lg text-stone transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
    </button>
  );

  return (
    <AnimatedModal isOpen={target !== null} onClose={onClose} maxWidthClass="lg:w-[560px]">
      <div className="flex flex-col gap-5 overflow-y-auto p-6 custom-scrollbar">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-3xl leading-none text-ink">Choose a network</h2>
          <p className="text-sm text-stone">Where to start. You can switch any time from the app&rsquo;s network menu.</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone">Programmable networks</p>
          <div className="grid gap-2 sm:grid-cols-2">{PROGRAMMABLE.map(row)}</div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone">Bitcoin · settlement</p>
          {row(SETTLEMENT)}
        </div>
        {/* Zcash: its own page, every index in one place, bought with ZEC (and the sell demo). */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone">Zcash · private</p>
          <button
            type="button"
            onClick={() => {
              savePreferredChain("solana");
              onClose();
              router.push(`/${locale}/solana/zec`);
            }}
            className="group flex w-full items-center gap-3 rounded-xl border border-ink/10 bg-paper px-3 py-2.5 text-left transition-colors hover:border-ink/40 hover:bg-snow"
          >
            <Image src={zcashnetwork} alt="" width={36} height={36} className="size-9 shrink-0 rounded-lg" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold text-ink">Zcash</span>
              <span className="truncate text-xs text-stone">Buy any index privately with shielded ZEC</span>
            </span>
            <Icon icon="solar:arrow-right-linear" className="shrink-0 text-lg text-stone transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
          </button>
        </div>
      </div>
    </AnimatedModal>
  );
}

/** A link into the app (a path under a network, e.g. "/lock") from a page that has no network: asks which network first. */
export function AppLink({ path, children, className }: { path: string; children: ReactNode; className?: string }) {
  const launch = useLaunch();
  return (
    <button type="button" onClick={() => launch(path)} className={`cursor-pointer ${className ?? ""}`}>
      {children}
    </button>
  );
}
