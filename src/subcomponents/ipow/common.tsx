"use client";

// Small pieces Greatwall's iPoW apps (Convert, Bridge, BETA) share: the
// network's accent, its connect button, the coin's ticker, amounts in words,
// a state chip, form rows, and the coming-soon card.

import { Interface, formatUnits } from "ethers";
import { ABIS } from "@ipow/sdk";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";

import type { EvmChain } from "@/components/integrator/ipow/sdk";
import { EthereumConnectButton } from "../EthereumConnectButton";
import { BaseConnectButton } from "../BaseConnectButton";
import { ArbitrumConnectButton } from "../ArbitrumConnectButton";
import { RobinhoodConnectButton } from "../RobinhoodConnectButton";
import { HyperliquidConnectButton } from "../HyperliquidConnectButton";
import { lockPath } from "@/components/integrator/ipow/lockPaths";

export { TICKER } from "@/components/integrator/ipow/sdk";

export function ConnectNetworkButton({ chain }: { chain: EvmChain }) {
  if (chain === "ethereum") return <EthereumConnectButton />;
  if (chain === "base") return <BaseConnectButton />;
  if (chain === "robinhood") return <RobinhoodConnectButton />;
  if (chain === "arbitrum") return <ArbitrumConnectButton />;
  return <HyperliquidConnectButton />;
}

// Greatwall's accent is its ink on every network (`chain` kept for callers).
export const accentText = (_chain: string) => "text-ink";
/** A faint wash of the accent. */
export const accentSoft = (_chain: string) => "bg-sand";

/** A coin amount for people: at most 6 decimals, no trailing zeros. */
export function coin(amount: bigint, decimals: number): string {
  const [whole, frac = ""] = formatUnits(amount, decimals).split(".");
  const cut = frac.slice(0, 6).replace(/0+$/, "");
  return cut ? `${whole}.${cut}` : whole;
}

export const sats = (n: bigint | number) => `${Number(n).toLocaleString("en-US")} sats`;

export const shortHash = (h: string) => (h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h);

/** A swap's state as a chip: green when done, red when it ended without
 *  trading, the network's accent while it is under way. */
export function StateChip({ state, chain, label }: { state: string; chain: string; label: string }) {
  const tone =
    state === "Done"
      ? "bg-green-500/15 text-green-600"
      : state === "Refunded" || state === "Cancelled" || state === "Reclaimed"
        ? "bg-red-500/15 text-red-600"
        : `${accentSoft(chain)} ${accentText(chain)}`;
  return <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap ${tone}`}>{label}</span>;
}

/** The message of an error a wallet or a contract call threw, short. */
export function errorText(e: unknown): string {
  const any = e as {
    shortMessage?: string;
    reason?: string;
    message?: string;
    code?: string | number;
    data?: string;
    revert?: { name?: string };
    error?: { errorMessage?: string; errorCode?: { code?: string } };
  };
  if (any?.code === "ACTION_REJECTED" || any?.code === 4001) return "You rejected the request in your wallet.";
  if (/User rejected|rejected the request/i.test(any?.message ?? "")) return "You rejected the request in your wallet.";
  // A provider's rate limit, however it surfaced (the RPC proxy's busy
  // error, or a raw 429 from a client that called a provider directly).
  if (/\b429\b|Too Many Requests|rate limit|network is busy/i.test(`${any?.message ?? ""} ${any?.shortMessage ?? ""}`)) return "The network is busy right now. Wait a few seconds and try again.";
  // A Solana program's error, as Anchor gives it.
  if (any?.error?.errorMessage) return `${any.error.errorMessage} (${any.error.errorCode?.code ?? "program error"})`;
  // A contract's own error, named by its ABI.
  const custom = any?.revert?.name ?? (any?.data ? customError(any.data) : null);
  if (custom) return `The contract refused it: ${custom}.`;
  if (/insufficient funds/i.test(any?.message ?? "")) return "Not enough coin in your wallet for this and its network fee.";
  // A JSON-RPC error ethers couldn't name ("could not coalesce error"):
  // the provider's own message is inside.
  const rpc = (any as { error?: { message?: string } })?.error?.message;
  if (rpc && /could not coalesce/i.test(any?.shortMessage ?? "")) return rpc;
  return any?.reason ?? any?.shortMessage ?? any?.message ?? String(e);
}

/** The name of a contract error from its revert data, by every iPoW ABI. */
function customError(data: string): string | null {
  for (const abi of Object.values(ABIS)) {
    try {
      const parsed = new Interface(abi as any).parseError(data);
      if (parsed) return parsed.name;
    } catch {}
  }
  return null;
}

/** For a network an app does not run on yet. */
export function ComingSoon({ network, app }: { network: string; app: "convert" | "bridge" | "beta" }) {
  const t = useTranslations("Convert");
  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col gap-2 text-center">
      <p className="font-bold text-base sm:text-lg">{t("comingSoonTitle")}</p>
      <p className="text-xs sm:text-sm opacity-70">{t(app === "convert" ? "comingSoonBody" : app === "bridge" ? "comingSoonBridge" : "comingSoonBeta", { network: network.charAt(0).toUpperCase() + network.slice(1) })}</p>
    </div>
  );
}

export function Field({ label, suffix, hint, children }: { label: string; suffix?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] sm:text-xs opacity-70">{label}</span>
      <div className="flex items-center gap-3">
        {children}
        {suffix && <span className="font-bold text-sm sm:text-base shrink-0">{suffix}</span>}
      </div>
      {hint && <span className="text-[10px] sm:text-xs opacity-60">{hint}</span>}
    </div>
  );
}

export function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? "font-bold" : ""}`}>
      <span className="opacity-70">{label}</span>
      <span className="tabular-nums text-right break-all">{value}</span>
    </div>
  );
}

/** An app's section tabs (e.g. Send / History), each its own route. */
export function SectionTabs({ chain, app, sections }: { chain: string; app: string; sections: { id: string; label: string }[] }) {
  const router = useRouter();
  const { locale, section } = useParams<{ locale: string; section?: string }>();
  // "send" is the bridge's Unlock under its old address.
  const active = app === "bridge" && section === "send" ? "unlock" : (section ?? sections[0].id);
  return (
    <div className="flex justify-between rounded-md bg-sand p-1 gap-1">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={active === s.id}
          onClick={() => router.push(app === "bridge" ? lockPath(locale, chain, s.id) : `/${locale}/${chain}/${app}/${s.id}`, { scroll: false })}
          className={`w-full px-3 py-2.5 text-center rounded text-xs sm:text-sm transition-colors ${
            active === s.id ? "font-semibold bg-ink text-snow" : "font-medium text-ink/75 hover:text-ink"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** A page's notice: loading, an error, or nothing to show. */
export function Notice({ text, error }: { text: string; error?: boolean }) {
  return <p className={`glass-card rounded-2xl p-6 text-xs sm:text-sm break-words ${error ? "text-red-500" : "opacity-70"}`}>{text}</p>;
}

/** A link to a transaction on the network's explorer. */
export function evmTxLink(chain: string, hash: string): string | null {
  const base: Record<string, string> = {
    ethereum: "https://sepolia.etherscan.io/tx/",
    base: "https://sepolia.basescan.org/tx/",
    robinhood: "https://explorer.testnet.chain.robinhood.com/tx/",
    hyperliquid: "https://testnet.purrsec.com/tx/",
    arbitrum: "https://sepolia.arbiscan.io/tx/",
  };
  return base[chain] ? base[chain] + hash : null;
}

/** An address on an EVM network's explorer, or null. */
export function evmAddressLink(chain: string, address: string): string | null {
  const tx = evmTxLink(chain, "");
  return tx ? tx.replace(/\/tx\/$/, "/address/") + address : null;
}
