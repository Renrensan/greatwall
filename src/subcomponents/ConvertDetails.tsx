"use client";

// Everything behind a conversion, for the user who wants to see it: each
// leg's swap and job as the chain holds them, the Bitcoin blocks the
// protocol's light client accepted for the job (the anchor, the proof),
// the payment and the receipt on Bitcoin with their confirmations, and a
// link to each fact on its network's explorer. Read from the chains and
// the Bitcoin explorers; nothing here is taken from this browser's memory.

import { useEffect, useState } from "react";

import type { SupportedChain } from "@/app/network-provider";
import { bitcoinExplorer, solanaExplorer } from "@/components/integrator/ipow/sdk";

type Props = {
  /** The network of the swap shown, and its explorer (a base URL, or the
   *  wallet's {transaction, address, urlSuffix}). */
  network: SupportedChain;
  explorer: any;
  /** The swap shown and, when known, the other leg (the convert methods' records). */
  conversion: any;
  partner: any | null;
  partnerChain: SupportedChain | null;
  partnerExplorer: any;
};

const BTC = "https://mempool.space";

const at = (t: number | null | undefined) => (t ? new Date(t * 1000).toLocaleString() : "—");
const short = (s: string | null | undefined, n = 8) => (s ? `${s.slice(0, n)}…${s.slice(-6)}` : "—");

function evmLink(explorer: any, kind: "tx" | "address", id: string): string | null {
  if (!explorer || !id) return null;
  if (typeof explorer === "string") return `${explorer.replace(/\/$/, "")}/${kind}/${id}`;
  const base = kind === "tx" ? explorer.transaction : explorer.address;
  return base ? `${base}${id}${explorer.urlSuffix ?? ""}` : null;
}

function chainLink(chain: SupportedChain | null, explorer: any, kind: "tx" | "address", id: string | null | undefined): string | null {
  if (!chain || !id) return null;
  if (chain === "solana") return solanaExplorer(kind, id);
  return evmLink(explorer, kind, id);
}

function Row({ label, value, href, mono = true }: { label: string; value: string; href?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-black/5 last:border-0">
      <span className="text-[11px] uppercase tracking-wider text-stone shrink-0 pt-0.5">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className={`text-xs text-right underline hover:text-ink break-all ${mono ? "font-mono" : ""}`}>
          {value} ↗
        </a>
      ) : (
        <span className={`text-xs text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}

/** A swap and its job, as one network holds them. */
function Leg({ title, chain, explorer, record }: { title: string; chain: SupportedChain; explorer: any; record: any }) {
  const s = record?.swap;
  if (!s) return null;
  const job = s.job ?? s; // EVM: swap.job; Solana: the swap carries the job's fields
  const stage: string = job.stage ?? s.stage ?? "—";
  const times = job.times ?? s.times ?? {};
  const operator: string | null = job.operator ?? s.operator ?? null;
  const symbol = record.tokenSymbol ?? null;
  return (
    <Section title={title}>
      <Row label={"Swap"} value={`#${record.id} · ${s.side} · ${s.state}`} mono={false} />
      <Row label={"Amount"} value={`${s.amount?.toString?.() ?? "—"} ${symbol ? `(${symbol}, smallest units)` : "(smallest units)"}`} />
      <Row label="Sats" value={`${s.sats?.toString?.() ?? "—"}`} />
      {s.memo ? <Row label="Memo" value={s.memo} /> : null}
      <Row label={"User"} value={short(s.user, 10)} href={chainLink(chain, explorer, "address", s.user)} />
      <Row label={"Job"} value={`#${(job.id ?? s.jobId)?.toString?.() ?? "—"} · ${stage}`} mono={false} />
      <Row label={"Operator"} value={operator ? short(operator, 10) : "none yet"} href={chainLink(chain, explorer, "address", operator)} />
      <Row label={"Opened"} value={at(times.opened)} mono={false} />
      <Row label={"Auction ends"} value={at(times.auctionEnd)} mono={false} />
      {times.anchored ? <Row label={"Anchored"} value={at(times.anchored)} mono={false} /> : null}
      {times.deadline ? <Row label={"Operator's deadline"} value={at(times.deadline)} mono={false} /> : null}
      {times.proven ? <Row label={"Proven"} value={at(times.proven)} mono={false} /> : null}
      {times.lockEnd ? <Row label={"Lock ends"} value={at(times.lockEnd)} mono={false} /> : null}
      {s.address ? <Row label={s.side === "Buy" ? ("Pay to (Bitcoin)") : "Paid to (Bitcoin)"} value={s.address} href={`${BTC}/address/${s.address}`} /> : null}
      {s.userAddress ? <Row label={"User's Bitcoin address"} value={s.userAddress} href={`${BTC}/address/${s.userAddress}`} /> : null}
      {record.payBlocks ? <Row label={"Payment blocks"} value={`${record.payBlocks.first} – ${record.payBlocks.last}`} href={`${BTC}/block/${record.payBlocks.first}`} /> : null}
      {s.payWindow ? <Row label={"Payment window"} value={`${s.payWindow.first} – ${s.payWindow.last}`} href={`${BTC}/block/${s.payWindow.first}`} /> : null}
    </Section>
  );
}

export default function ConvertDetails({ network, explorer, conversion, partner, partnerChain, partnerExplorer }: Props) {
  const [open, setOpen] = useState(false);
  const [btc, setBtc] = useState<{ tip: number | null; payments: { txid: string; height: number | null; confirmations: number }[] }>({ tip: null, payments: [] });

  // The buy's Bitcoin address, whichever leg this page shows.
  const buy = conversion?.swap?.side === "Buy" ? conversion : partner?.swap?.side === "Buy" ? partner : null;
  const sell = conversion?.swap?.side === "Sell" ? conversion : partner?.swap?.side === "Sell" ? partner : null;
  const payAddress: string | null = buy?.swap?.address ?? null;

  useEffect(() => {
    if (!open) return;
    let active = true;
    const read = async () => {
      try {
        const tip = await bitcoinExplorer.tip();
        const list = payAddress ? await bitcoinExplorer.paymentsTo(payAddress) : [];
        const payments = await Promise.all(
          list.slice(0, 5).map(async (p) => {
            const mined = p.confirmed ? await bitcoinExplorer.minedIn(p.txid).catch(() => null) : null;
            return { txid: p.txid, height: mined?.height ?? null, confirmations: mined ? tip - mined.height + 1 : 0 };
          })
        );
        if (active) setBtc({ tip, payments });
      } catch {
        if (active) setBtc((b) => ({ ...b }));
      }
    };
    read();
    const i = setInterval(read, 30_000);
    return () => {
      active = false;
      clearInterval(i);
    };
  }, [open, payAddress]);

  if (!conversion?.swap) return null;

  const anchorHeight: number | null = buy?.payBlocks ? buy.payBlocks.first - 1 : null;
  const buyJob = buy?.swap?.job ?? buy?.swap;
  const sellJob = sell?.swap?.job ?? sell?.swap;
  const receipt: string | null = buyJob?.provenTxid ?? null;
  const receiptHeight: number | null = buyJob?.provenHeight ?? null;
  const sellProof: string | null = sellJob?.provenTxid ?? null;
  const sellProofHeight: number | null = sellJob?.provenHeight ?? null;
  const nameOf = (c: SupportedChain | null) => (c ? c.charAt(0).toUpperCase() + c.slice(1) : "");

  return (
    <div className="mt-6">
      <button type="button" onClick={() => setOpen(!open)} className="text-xs font-bold underline">
        {open ? ("Hide details") : "Show details: the chains, Bitcoin, the light client"}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <Leg title={`This swap, on ${nameOf(network)}`} chain={network} explorer={explorer} record={conversion} />
          {partner?.swap && partnerChain ? (
            <Leg title={`The other leg, on ${nameOf(partnerChain)}`} chain={partnerChain} explorer={partnerExplorer} record={partner} />
          ) : null}

          <Section title="Bitcoin">
            <p className="text-[11px] text-stone mb-2">
              {"Each network has a light client that keeps Bitcoin's block headers; a job is anchored to one of its blocks and proven with another. Only blocks the light client holds count, and anyone may add blocks to it."}
            </p>
            <Row label={"Bitcoin's tip now"} value={btc.tip ? `${btc.tip}` : "…"} href={btc.tip ? `${BTC}/block/${btc.tip}` : null} />
            {anchorHeight ? <Row label={"Anchor block (light client)"} value={`${anchorHeight}`} href={`${BTC}/block/${anchorHeight}`} /> : null}
            {buy?.payBlocks ? (
              <Row
                label={"Payment must be mined in"}
                value={`${buy.payBlocks.first} – ${buy.payBlocks.last}${btc.tip ? ` (${Math.max(0, buy.payBlocks.last - btc.tip)} ${"left"})` : ""}`}
                mono={false}
              />
            ) : null}
            {payAddress ? <Row label={"Pay-to address"} value={payAddress} href={`${BTC}/address/${payAddress}`} /> : null}
            {btc.payments.length === 0 && payAddress ? <Row label={"Payment"} value={"none seen yet"} mono={false} /> : null}
            {btc.payments.map((p) => (
              <Row
                key={p.txid}
                label={"Payment"}
                value={`${short(p.txid, 10)} · ${p.height ? `${"block"} ${p.height} · ${p.confirmations} ${"conf."}` : "in the mempool"}`}
                href={`${BTC}/tx/${p.txid}`}
              />
            ))}
            {sellProof ? <Row label={"Proven on the source (payment)"} value={`${short(sellProof, 10)}${sellProofHeight ? ` · ${"block"} ${sellProofHeight}` : ""}`} href={`${BTC}/tx/${sellProof}`} /> : null}
            {receipt ? <Row label={"Proven on the destination (receipt)"} value={`${short(receipt, 10)}${receiptHeight ? ` · ${"block"} ${receiptHeight}` : ""}`} href={`${BTC}/tx/${receipt}`} /> : null}
          </Section>
        </div>
      )}
    </div>
  );
}
