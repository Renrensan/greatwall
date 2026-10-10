"use client";

// Every on-chain action's progress as one toast, bottom right: confirm in
// the wallet, then confirmed (with a link to the network's explorer) or
// failed (with why). A Solana send whose confirmation the client stopped
// waiting for ("not confirmed in 30 seconds") is not a failure: it was sent,
// so its signature is followed here until Solana says how it ended.

import toast from "react-hot-toast";
import { Icon } from "@iconify/react";

import { errorText, evmTxLink } from "@/subcomponents/ipow/common";
import { solanaConnection } from "@/components/integrator/ipow/sdk";

/** A transaction on its network's explorer, or null where there is none. */
export function txLink(network: string, hash: string): string | null {
  return network === "solana" ? `https://explorer.solana.com/tx/${hash}?cluster=devnet` : evmTxLink(network, hash);
}

/** The signature of a Solana send the client stopped waiting for, if `e` is one. */
export function unconfirmedSignature(e: unknown): string | null {
  const any = e as { signature?: unknown; message?: string };
  const message = any?.message ?? "";
  if (!/not confirmed in|block height exceeded|has expired/i.test(message)) return null;
  if (typeof any.signature === "string") return any.signature;
  return message.match(/signature ([1-9A-HJ-NP-Za-km-z]{64,90})/)?.[1] ?? null;
}

/** How a sent Solana transaction ended, read for up to `ms`. */
async function settle(signature: string, ms = 90_000): Promise<"ok" | "failed" | "unknown"> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const s = (await solanaConnection().getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
      if (s?.err) return "failed";
      if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") return "ok";
    } catch {
      // A busy RPC: read again.
    }
    await new Promise((r) => setTimeout(r, 3_000));
  }
  return "unknown";
}

function Body({ title, text, link }: { title: string; text?: string; link?: string | null }) {
  return (
    <span className="flex flex-col gap-0.5 text-sm max-w-[280px]">
      <span className="font-semibold">{title}</span>
      {text && <span className="text-xs opacity-75 break-words">{text}</span>}
      {link && (
        <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2">
          View on the explorer
          <Icon icon="solar:arrow-right-up-linear" aria-hidden />
        </a>
      )}
    </span>
  );
}

export type Tracked<T> = { ok: true; result: T | null; hash: string | null } | { ok: false; error: string };

/** What a caller can say beyond the defaults. */
export type TrackOptions = {
  /** While it runs, instead of "Confirm it in your wallet…" (a send no wallet signs). */
  pending?: string;
  /** Under "confirmed": what happens next ("Usable in about 9 days"). */
  done?: string;
  /** The explorer page of a hash, where `txLink` doesn't know the network's. */
  linkOf?: (hash: string) => string | null;
};

/**
 * Runs `run` (a send that resolves once its transaction is confirmed) with
 * its toast. `label` names the action ("Mint GREAT"); `hashOf` reads the
 * transaction's hash or signature from what `run` returns. Never throws:
 * the outcome says whether it went through, and the error text if not.
 * Every on-chain action reports here, and only here: no inline "done" link
 * or result modal beside it.
 */
export async function trackTx<T>(
  network: string,
  label: string,
  run: () => Promise<T>,
  hashOf: (r: T) => string | null | undefined,
  options: TrackOptions = {},
): Promise<Tracked<T>> {
  const linkOf = options.linkOf ?? ((hash: string) => txLink(network, hash));
  const id = toast.loading(<Body title={label} text={options.pending ?? "Confirm it in your wallet, then it is sent."} />);
  try {
    const result = await run();
    const hash = hashOf(result) ?? null;
    toast.success(<Body title={`${label}: confirmed`} text={options.done} link={hash ? linkOf(hash) : null} />, { id, duration: options.done ? 15_000 : 10_000 });
    return { ok: true, result, hash };
  } catch (e) {
    const signature = network === "solana" ? unconfirmedSignature(e) : null;
    if (signature) {
      const link = txLink("solana", signature);
      toast.loading(<Body title={`${label}: sent`} text="Waiting for Solana to confirm it." link={link} />, { id });
      const end = await settle(signature);
      if (end === "ok") {
        toast.success(<Body title={`${label}: confirmed`} text={options.done} link={link} />, { id, duration: options.done ? 15_000 : 10_000 });
        return { ok: true, result: null, hash: signature };
      }
      if (end === "failed") {
        const error = "It reached Solana but failed there. Open it on the explorer to see why.";
        toast.error(<Body title={`${label}: failed`} text={error} link={link} />, { id, duration: 15_000 });
        return { ok: false, error };
      }
      const error = "Sent, but Solana hasn't confirmed it yet. Check it on the explorer before trying again.";
      toast(<Body title={`${label}: still confirming`} text={error} link={link} />, { id, duration: 20_000, icon: "⏳" });
      return { ok: false, error };
    }
    const error = errorText(e);
    toast.error(<Body title={`${label}: not done`} text={error} />, { id, duration: 12_000 });
    return { ok: false, error };
  }
}
