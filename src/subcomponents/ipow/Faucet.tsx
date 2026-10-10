"use client";

// The faucet of a test RWA token, as the index page's mint panel shows it:
// one black Faucet button (click, sign, done) and one amber caution line.
// Shared by Lock and Convert so the three look and behave the same.

import { trackTx } from "@/components/ui/txToast";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";

import { rwaTokensOf, type RwaToken } from "@/components/integrator/ipow/rwaTokens";

/** The mint panel's row action. */
export const ROW_ACTION = "shrink-0 inline-flex items-center gap-1 rounded-md bg-ink text-snow px-2.5 py-1.5 text-xs font-medium hover:bg-pitch disabled:opacity-50 transition-colors";

/** The test RWA token `token` of `chain`, when Greatwall lists one. */
export function rwaOf(chain: string, token: string | null | undefined): RwaToken | null {
  if (!token || token === "native") return null;
  return rwaTokensOf(chain as never).find((r) => r.token.toLowerCase() === token.toLowerCase()) ?? null;
}

/** Claims a test RWA token: on EVM the token's own faucet, signed by the
 *  wallet (`evmFaucet`); on Solana Greatwall's server, which holds the mint. */
export function useRwaFaucet(chain: string, address: string | null | undefined, evmFaucet: ((token: string) => Promise<string>) | undefined, onClaimed?: () => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const available = (rwa: RwaToken | null) => !!rwa && !!address && (chain === "solana" || !!evmFaucet);
  async function claim(rwa: RwaToken) {
    if (!address) return;
    setBusy(rwa.token);
    // The claim, as one step for its toast: it resolves with its hash.
    const send = async (): Promise<string | null> => {
      if (chain === "solana") {
        const r = await fetch("/api/faucet/solana", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, mint: rwa.token }) });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error ?? `The faucet refused (${r.status})`);
        return body?.signature ?? null;
      }
      return evmFaucet ? evmFaucet(rwa.token) : null;
    };
    try {
      const r = await trackTx(chain, `Faucet: ${rwa.symbol}`, send, (h) => h);
      // The app reads through its own RPC, which can trail the wallet's by a
      // block or two: read again now, and a few times over the next half
      // minute, so the new balance shows once that RPC has it.
      if (r.ok) for (const ms of [0, 3_000, 8_000, 15_000, 25_000]) setTimeout(() => onClaimed?.(), ms);
    } finally {
      setBusy(null);
    }
  }
  return { busy, available, claim };
}

export function FaucetButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  const t = useTranslations("Beta");
  return (
    <button type="button" onClick={onClick} disabled={busy} className={ROW_ACTION}>
      <Icon icon="solar:water-drop-bold" />
      {busy ? t("faucetBusy") : t("faucetClaim")}
    </button>
  );
}

/** The mint panel's caution line: one amber icon and its text. */
export function Caution({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-amber-800">
      <Icon icon="solar:danger-circle-bold" className="text-amber-500 shrink-0" />
      {text}
    </span>
  );
}

/** "You don't have enough X", as the mint panel says it. */
export function useNotEnoughText() {
  const t = useTranslations("Beta");
  return (symbol: string) => t("notEnoughToken", { symbol });
}
