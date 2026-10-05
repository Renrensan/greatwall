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
  locale: string;
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
function Leg({ title, chain, explorer, record, en }: { title: string; chain: SupportedChain; explorer: any; record: any; en: boolean }) {
  const s = record?.swap;
  if (!s) return null;
  const job = s.job ?? s; // EVM: swap.job; Solana: the swap carries the job's fields
  const stage: string = job.stage ?? s.stage ?? "—";
  const times = job.times ?? s.times ?? {};
  const operator: string | null = job.operator ?? s.operator ?? null;
  const symbol = record.tokenSymbol ?? null;
  return (
    <Section title={title}>
      <Row label={en ? "Swap" : "Swap"} value={`#${record.id} · ${s.side} · ${s.state}`} mono={false} />
      <Row label={en ? "Amount" : "Jumlah"} value={`${s.amount?.toString?.() ?? "—"} ${symbol ? `(${symbol}, smallest units)` : en ? "(smallest units)" : "(satuan terkecil)"}`} />
      <Row label="Sats" value={`${s.sats?.toString?.() ?? "—"}`} />
      {s.memo ? <Row label="Memo" value={s.memo} /> : null}
      <Row label={en ? "User" : "Pengguna"} value={short(s.user, 10)} href={chainLink(chain, explorer, "address", s.user)} />
      <Row label={en ? "Job" : "Job"} value={`#${(job.id ?? s.jobId)?.toString?.() ?? "—"} · ${stage}`} mono={false} />
      <Row label={en ? "Operator" : "Operator"} value={operator ? short(operator, 10) : en ? "none yet" : "belum ada"} href={chainLink(chain, explorer, "address", operator)} />
      <Row label={en ? "Opened" : "Dibuka"} value={at(times.opened)} mono={false} />
      <Row label={en ? "Auction ends" : "Lelang berakhir"} value={at(times.auctionEnd)} mono={false} />
      {times.anchored ? <Row label={en ? "Anchored" : "Dijangkarkan"} value={at(times.anchored)} mono={false} /> : null}
      {times.deadline ? <Row label={en ? "Operator's deadline" : "Tenggat operator"} value={at(times.deadline)} mono={false} /> : null}
      {times.proven ? <Row label={en ? "Proven" : "Terbukti"} value={at(times.proven)} mono={false} /> : null}
      {times.lockEnd ? <Row label={en ? "Lock ends" : "Kunci berakhir"} value={at(times.lockEnd)} mono={false} /> : null}
      {s.address ? <Row label={s.side === "Buy" ? (en ? "Pay to (Bitcoin)" : "Bayar ke (Bitcoin)") : en ? "Paid to (Bitcoin)" : "Dibayar ke (Bitcoin)"} value={s.address} href={`${BTC}/address/${s.address}`} /> : null}
      {s.userAddress ? <Row label={en ? "User's Bitcoin address" : "Alamat Bitcoin pengguna"} value={s.userAddress} href={`${BTC}/address/${s.userAddress}`} /> : null}
      {record.payBlocks ? <Row label={en ? "Payment blocks" : "Blok pembayaran"} value={`${record.payBlocks.first} – ${record.payBlocks.last}`} href={`${BTC}/block/${record.payBlocks.first}`} /> : null}
      {s.payWindow ? <Row label={en ? "Payment window" : "Jendela pembayaran"} value={`${s.payWindow.first} – ${s.payWindow.last}`} href={`${BTC}/block/${s.payWindow.first}`} /> : null}
    </Section>
  );
}

export default function ConvertDetails({ network, explorer, conversion, partner, partnerChain, partnerExplorer, locale }: Props) {
  const en = locale === "en";
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
        {open ? (en ? "Hide details" : "Sembunyikan rincian") : en ? "Show details: the chains, Bitcoin, the light client" : "Tampilkan rincian: jaringan, Bitcoin, light client"}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <Leg title={en ? `This swap, on ${nameOf(network)}` : `Swap ini, di ${nameOf(network)}`} chain={network} explorer={explorer} record={conversion} en={en} />
          {partner?.swap && partnerChain ? (
            <Leg title={en ? `The other leg, on ${nameOf(partnerChain)}` : `Sisi lainnya, di ${nameOf(partnerChain)}`} chain={partnerChain} explorer={partnerExplorer} record={partner} en={en} />
          ) : null}

          <Section title="Bitcoin">
            <p className="text-[11px] text-stone mb-2">
              {en
                ? "Each network has a light client that keeps Bitcoin's block headers; a job is anchored to one of its blocks and proven with another. Only blocks the light client holds count, and anyone may add blocks to it."
                : "Tiap jaringan punya light client yang menyimpan header blok Bitcoin; sebuah job dijangkarkan ke salah satu bloknya dan dibuktikan dengan blok lain. Hanya blok yang dipegang light client yang dihitung, dan siapa pun dapat menambahkannya."}
            </p>
            <Row label={en ? "Bitcoin's tip now" : "Puncak Bitcoin kini"} value={btc.tip ? `${btc.tip}` : "…"} href={btc.tip ? `${BTC}/block/${btc.tip}` : null} />
            {anchorHeight ? <Row label={en ? "Anchor block (light client)" : "Blok jangkar (light client)"} value={`${anchorHeight}`} href={`${BTC}/block/${anchorHeight}`} /> : null}
            {buy?.payBlocks ? (
              <Row
                label={en ? "Payment must be mined in" : "Pembayaran harus ditambang di"}
                value={`${buy.payBlocks.first} – ${buy.payBlocks.last}${btc.tip ? ` (${Math.max(0, buy.payBlocks.last - btc.tip)} ${en ? "left" : "tersisa"})` : ""}`}
                mono={false}
              />
            ) : null}
            {payAddress ? <Row label={en ? "Pay-to address" : "Alamat tujuan"} value={payAddress} href={`${BTC}/address/${payAddress}`} /> : null}
            {btc.payments.length === 0 && payAddress ? <Row label={en ? "Payment" : "Pembayaran"} value={en ? "none seen yet" : "belum terlihat"} mono={false} /> : null}
            {btc.payments.map((p) => (
              <Row
                key={p.txid}
                label={en ? "Payment" : "Pembayaran"}
                value={`${short(p.txid, 10)} · ${p.height ? `${en ? "block" : "blok"} ${p.height} · ${p.confirmations} ${en ? "conf." : "konf."}` : en ? "in the mempool" : "di mempool"}`}
                href={`${BTC}/tx/${p.txid}`}
              />
            ))}
            {sellProof ? <Row label={en ? "Proven on the source (payment)" : "Terbukti di sumber (pembayaran)"} value={`${short(sellProof, 10)}${sellProofHeight ? ` · ${en ? "block" : "blok"} ${sellProofHeight}` : ""}`} href={`${BTC}/tx/${sellProof}`} /> : null}
            {receipt ? <Row label={en ? "Proven on the destination (receipt)" : "Terbukti di tujuan (tanda terima)"} value={`${short(receipt, 10)}${receiptHeight ? ` · ${en ? "block" : "blok"} ${receiptHeight}` : ""}`} href={`${BTC}/tx/${receipt}`} /> : null}
          </Section>
        </div>
      )}
    </div>
  );
}
