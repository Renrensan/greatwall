"use client";

// Every basket on the network: on Solana from the program's accounts, on
// Ethereum and Base from the app's index of the contract's events. Where
// neither is possible yet, the baskets this browser knows.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getBasket } from "@ipow/sdk";

import { Notice, coin, errorText, shortHash } from "./ipow/common";
import { deploymentOf, isEvmChain, readProvider, solanaBeta, type EvmChain } from "@/components/integrator/ipow/sdk";
import { tokenInfo } from "@/components/integrator/ipow/tokens";
import { solanaToken } from "@/components/integrator/ipow/solanaTokens";
import { knownBaskets } from "@/components/integrator/ipow/basketList";

/** Baskets shown, newest first. */
const SHOWN = 30;

type Card = { key: string; id: string; name: string | null; mix: string; supply: bigint };
/** A basket's title: the creator's name and symbol (E4), or its number. */
const titleOf = (c: Card, t: (k: string, v: any) => string) => (c.name ? c.name : t("basketName", { id: c.id }));

async function evmCard(chain: EvmChain, key: string): Promise<Card> {
  const b = await getBasket(readProvider(chain), deploymentOf(chain)!, key);
  const parts = await Promise.all(b.parts.map((p) => tokenInfo(chain, p.token)));
  return { key, id: String(b.id), name: b.name && b.name !== "BETA" ? `${b.name} (${b.symbol})` : null, supply: b.supply, mix: b.parts.map((p, i) => `${coin(p.amount, parts[i].decimals)} ${parts[i].symbol}`).join(" + ") };
}

async function solanaCard(address: string): Promise<Card> {
  const b = await solanaBeta(null).getBasket(address);
  const parts = await Promise.all(b.parts.map((p) => solanaToken(p.mint)));
  return { key: address, id: String(b.id), name: b.name && b.name !== "BETA" ? `${b.name} (${b.symbol})` : null, supply: b.supply, mix: b.parts.map((p, i) => `${coin(p.amount, parts[i].decimals)} ${parts[i].symbol}`).join(" + ") };
}

export default function BetaExplore() {
  const t = useTranslations("Beta");
  const { locale, network } = useParams<{ locale: string; network: string }>();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setCards(null);
    setNote(null);
    setError(null);
    (async () => {
      let keys: string[];
      if (network === "solana") {
        keys = await solanaBeta(null).allBaskets();
      } else if (isEvmChain(network)) {
        // The index reads history in steps: ask again until it has all of it.
        let index: any = null;
        for (let i = 0; i < 20; i++) {
          const r = await fetch(`/api/baskets/${network}`);
          index = await r.json();
          if (!r.ok) throw new Error(index?.error ?? `index: ${r.status}`);
          if (!index.supported || index.complete) break;
          if (live) setNote(t("exploreReading"));
        }
        if (index?.supported) {
          keys = index.baskets.map((b: { key: string }) => b.key);
          if (!index.complete && live) setNote(t("exploreReading"));
          else if (live) setNote(null);
        } else {
          keys = knownBaskets(deploymentOf(network)!.betaBaskets);
          if (live) setNote(t("exploreKnownOnly"));
        }
      } else {
        keys = [];
        if (live) setNote(t("exploreNotHere"));
      }
      const shown = keys.slice(0, SHOWN);
      const found = await Promise.all(
        shown.map((k) => (network === "solana" ? solanaCard(k) : evmCard(network as EvmChain, k)).catch(() => null))
      );
      if (live) setCards(found.filter((c): c is Card => c !== null));
    })().catch((e) => live && setError(errorText(e)));
    return () => {
      live = false;
    };
  }, [network, t]);

  if (error) return <Notice text={error} error />;
  if (!cards) return <Notice text={note ?? t("loading")} />;

  return (
    <div className="flex flex-col gap-3">
      {note && <p className="text-xs sm:text-sm text-stone">{note}</p>}
      {cards.length === 0 ? (
        <Notice text={t("exploreNone")} />
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map((c) => (
            <li key={c.key}>
              <Link
                href={`/${locale}/${network}/beta/transaction/${c.key}`}
                className="glass-card rounded-md p-4 flex flex-col gap-1 hover:border-stone transition-colors"
              >
                <span className="font-display font-bold text-sm sm:text-base">
                  {titleOf(c, t)} · {shortHash(c.key)}
                </span>
                <span className="text-[11px] sm:text-xs text-stone tabular-nums">
                  {c.mix} {t("perBeta")} · {t("supply", { amount: coin(c.supply, 9) })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

