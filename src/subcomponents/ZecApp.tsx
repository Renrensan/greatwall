"use client";

// The ZEC page (docs/zec-lane.md), laid out as Convert and Lock are: the
// poster, then the wallet's orders still moving on the left and a panel with
// its tabs on the right: Buy with ZEC, Sell for ZEC (a demo) and History.
// The tab and the order followed are kept in the URL.

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { Poster } from "./ipow/Poster";
import PayWithZec, { ZecOrders } from "./PayWithZec";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import poster from "@/assets/background-explore.jpg";
import { zcash } from "@/index";

const TABS = [
  { id: "buy", label: "Buy with ZEC" },
  { id: "sell", label: "Sell for ZEC" },
  { id: "history", label: "History" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function ZecApp() {
  const router = useRouter();
  const query = useSearchParams();
  const sol = useSolanaWallet() as { address?: string | null };
  const asked = query.get("tab");
  const tab: Tab = asked === "sell" || asked === "history" ? asked : "buy";
  const go = (t: Tab) => router.replace(t === "buy" ? "?" : `?tab=${t}`, { scroll: false });
  const open = (id: string) => router.replace(`?order=${id}`, { scroll: false });
  const following = query.has("order");

  return (
    <div className="flex flex-col gap-6">
      <Poster
        image={poster}
        title="Pay with ZEC"
        text="Buy any index privately: pay shielded ZEC from your phone, and receive it in your Solana wallet in a few minutes."
        corner={
          <span className="rounded-full bg-white/90 text-ink px-3 py-1.5 flex items-center gap-2 shadow-sm">
            <Image src={zcash} alt="" width={24} height={24} className="w-6 h-6 rounded-full" />
            <span className="flex flex-col leading-tight pr-1">
              <span className="text-[9px] uppercase tracking-wide">Private payments</span>
              <span className="text-xs font-bold whitespace-nowrap">Shielded Zcash</span>
            </span>
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
        {/* The tabs first on a phone, on the right on a wide screen. */}
        <div className="inset-well rounded-2xl bg-paper border border-ink/10 p-4 sm:p-5 flex flex-col gap-5 min-w-0 lg:order-2">
          {!following && (
            <div className="flex justify-between rounded-md bg-sand p-1 gap-1" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => go(t.id)}
                  className={`w-full px-3 py-2.5 text-center rounded text-xs sm:text-sm transition-colors ${tab === t.id ? "font-semibold bg-ink text-snow" : "font-medium text-ink/75 hover:text-ink"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {following || tab !== "history" ? (
            <PayWithZec key={tab} embedded onPage only={tab === "sell" ? "sell" : "buy"} />
          ) : sol.address ? (
            <ZecOrders address={sol.address} onOpen={open} />
          ) : (
            <p className="text-sm opacity-70">Connect your Solana wallet to see your ZEC orders: the ones bought to it and sold from it.</p>
          )}
        </div>

        <section className="min-w-0 lg:order-1 rounded-2xl bg-paper border border-ink/10 p-5 flex flex-col gap-4" aria-labelledby="zec-moving">
          <div className="flex flex-col gap-1">
            <h2 id="zec-moving" className="text-lg font-bold">In progress</h2>
            <p className="text-xs opacity-70">Your ZEC orders still moving, newest first.</p>
          </div>
          {sol.address ? <ZecOrders address={sol.address} onOpen={open} inProgress /> : <p className="text-xs opacity-60">Connect your Solana wallet to see them.</p>}
        </section>
      </div>
    </div>
  );
}
