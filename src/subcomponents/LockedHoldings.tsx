"use client";

// Beside the bridge's tabs: the tokens the user holds locked, on the
// networks they are used on. A token locked on its own network is held
// elsewhere as that vault pair's receipt; this lists every receipt the
// connected wallets hold (one EVM address serves every EVM network), with
// the network it is used on, the network it is locked on, and the way back
// (Unlock, where it is held, with the token chosen).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { PublicKey } from "@solana/web3.js";
import { formatUnits } from "ethers";

import { EVM_CHAINS, solanaConnection, type EvmChain } from "@/components/integrator/ipow/sdk";
import { crossChoicesOn, type CrossChoice } from "@/components/integrator/ipow/crossAssets";
import { balanceOf } from "@/components/integrator/ipow/tokens";
import { EmptyPanel, ListSkeleton, LockPicture, emptyAction as action } from "./ipow/EmptyPanel";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import { lockPath } from "@/components/integrator/ipow/lockPaths";

type Net = EvmChain | "solana";
type Held = { on: Net; choice: CrossChoice; amount: bigint };

const TOKEN_PROGRAMS = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (v: bigint, decimals: number) => {
  const n = Number(formatUnits(v, decimals));
  return n >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : n.toLocaleString("en-US", { maximumFractionDigits: 6 });
};

/** Every SPL balance of a wallet, by mint, in one read per token program. */
export async function solanaBalances(owner: string): Promise<Map<string, bigint>> {
  const conn = solanaConnection();
  const out = new Map<string, bigint>();
  for (const program of TOKEN_PROGRAMS) {
    const r = await conn.getParsedTokenAccountsByOwner(new PublicKey(owner), { programId: new PublicKey(program) });
    for (const a of r.value) {
      const info = (a.account.data as any).parsed?.info;
      if (!info) continue;
      out.set(info.mint, (out.get(info.mint) ?? BigInt(0)) + BigInt(info.tokenAmount.amount));
    }
  }
  return out;
}

/** The receipts a wallet holds on one network. */
async function heldOn(on: Net, owner: string): Promise<Held[]> {
  const choices = (await crossChoicesOn(on)).filter((c) => c.exists);
  if (on === "solana") {
    const balances = await solanaBalances(owner);
    return choices.flatMap((c) => {
      const amount = balances.get(c.token) ?? BigInt(0);
      return amount > BigInt(0) ? [{ on, choice: c, amount }] : [];
    });
  }
  const amounts = await Promise.all(choices.map((c) => balanceOf(on, c.token, owner).catch(() => BigInt(0))));
  return choices.flatMap((c, i) => (amounts[i] > BigInt(0) ? [{ on, choice: c, amount: amounts[i] }] : []));
}

export default function LockedHoldings() {
  const t = useTranslations("Bridge");
  const { locale, network } = useParams<{ locale: string; network: string }>();
  const evm = [useEvmWallet("ethereum"), useEvmWallet("base"), useEvmWallet("robinhood"), useEvmWallet("hyperliquid"), useEvmWallet("arbitrum")];
  // Tempo's wallet is an EVM address too: connected on Tempo alone, it serves every EVM network.
  const tempoWallet = useTempoWallet();
  const evmAddress = evm.find((w) => w.connected && w.address)?.address ?? (tempoWallet.connected ? ((tempoWallet.address as string | null) ?? null) : null);
  const solanaWallet = useSolanaWallet();
  const solanaAddress = solanaWallet.connected ? ((solanaWallet.address as string | null) ?? null) : null;

  const [held, setHeld] = useState<Held[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [again, setAgain] = useState(0);

  useEffect(() => {
    if (!evmAddress && !solanaAddress) return;
    let live = true;
    setHeld(null);
    setFailed(false);
    const reads: Promise<Held[]>[] = [];
    if (evmAddress) for (const c of EVM_CHAINS) reads.push(heldOn(c, evmAddress));
    if (solanaAddress) reads.push(heldOn("solana", solanaAddress));
    Promise.allSettled(reads).then((rs) => {
      if (!live) return;
      setHeld(rs.flatMap((r) => (r.status === "fulfilled" ? r.value : [])));
      setFailed(rs.some((r) => r.status === "rejected"));
    });
    return () => {
      live = false;
    };
  }, [evmAddress, solanaAddress, again]);

  const connected = Boolean(evmAddress || solanaAddress);

  return (
    <section className="rounded-2xl bg-paper border border-ink/10 p-5 flex flex-col gap-4" aria-labelledby="locked-title">
      <div className="flex flex-col gap-1">
        <h2 id="locked-title" className="text-lg font-bold">
          {t("lockedTitle")}
        </h2>
        <p className="text-xs opacity-70">{t("lockedText")}</p>
      </div>

      {!connected ? (
        <EmptyPanel picture={<LockPicture />} title={t("lockedConnectTitle")} text={t("lockedConnect")} />
      ) : held === null ? (
        <ListSkeleton />
      ) : held.length === 0 ? (
        failed ? (
          <EmptyPanel picture={<LockPicture />} title={t("lockedFailedTitle")} text={t("lockedFailed")}>
            <button type="button" onClick={() => setAgain((n) => n + 1)} className={action}>
              <Icon icon="solar:refresh-linear" className="text-base" />
              {t("lockedRetry")}
            </button>
          </EmptyPanel>
        ) : (
          <EmptyPanel picture={<LockPicture />} title={t("lockedNoneTitle")} text={t("lockedNone")}>
            <Link href={lockPath(locale, network)} className={action}>
              <Icon icon="solar:lock-keyhole-minimalistic-bold" className="text-base" />
              {t("lockedLockOne")}
            </Link>
          </EmptyPanel>
        )
      ) : (
        <ul className="flex flex-col divide-y divide-ink/5 max-h-[420px] sm:max-h-[480px] overflow-y-auto overscroll-contain pr-1">
          {held.map((h) => (
            <li key={`${h.on}:${h.choice.token}`} className="flex items-center gap-3 py-2.5">
              <span className="relative w-9 h-9 shrink-0">
                {h.choice.logo ? (
                  <img src={h.choice.logo} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover border border-ink/10" />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-black/10 flex items-center justify-center text-xs font-bold">{h.choice.symbol.charAt(0)}</span>
                )}
                <img src={`/assets/networks/${h.on}.png`} alt="" className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-paper" />
              </span>
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-sm font-semibold truncate">
                  {fmt(h.amount, h.choice.decimals)} {h.choice.symbol}
                </span>
                <span className="text-[11px] opacity-60 truncate">{t("lockedWhere", { on: cap(h.on), from: cap(h.choice.from) })}</span>
              </span>
              <Link href={`${lockPath(locale, h.on, "unlock")}?home=${h.choice.from}${h.choice.home ? `&token=${h.choice.home}` : ""}`} className="text-xs font-semibold rounded-lg border border-ink/15 px-2.5 py-1.5 hover:bg-black/5 transition-colors shrink-0">
                {t("tabUnlock")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {held && held.length > 0 && failed && <p className="text-[11px] opacity-60">{t("lockedPartial")}</p>}
    </section>
  );
}

