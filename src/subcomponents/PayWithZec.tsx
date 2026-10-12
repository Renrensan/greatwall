"use client";

// Pay with ZEC (docs/zec-lane.md): buy an index token on Solana, GREAT and
// the others, with real shielded ZEC (Zcash mainnet) from a phone. The lane
// takes ZEC in and never pays it out: "Sell for ZEC" is a demo, the index is
// checked on Solana and sent back, with no ZEC paid. Laid out as Convert is: what
// you get on top, what you pay tucked under it, the ZEC worked out as you
// type. Paying shows the payment request as a QR code for a Zcash wallet
// (Zashi, Ywallet) and follows the order to "Received". The order's id is
// kept in the URL, so a reload keeps following it.
//
// Embedded (`embedded`), for one index (`indexAddress`) and one side
// (`only`): the "ZEC" tab of an index's Mint panel buys it, and Portfolio's
// index dialog sells it; there the order is followed in place, not in the URL.
// On the ZEC page (`onPage`), ZecApp holds the tabs and the order stays in the URL.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { solananetwork, zcash, zcashnetwork } from "@/index";
import { SolanaConnectButton } from "./SolanaConnectButton";
import QRCode from "qrcode";

import { PublicKey, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";

import { AnimatedModal } from "./AnimatedModal";
import { solanaConnection } from "@/components/integrator/ipow/sdk";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { txLink } from "@/components/ui/txToast";

type Index = { address: string; beta: string; symbol: string; name: string; image: string | null; usdPerToken: number; parts: { symbol: string }[] };
type Order = {
  id: string;
  side?: "buy" | "sell";
  transfer?: string | null;
  returnTx?: string | null;
  memo: string;
  token: string;
  symbol: string;
  name: string;
  amount: string;
  recipient: string;
  zat: number;
  usd: number;
  expiresAt: number;
  state: "waiting" | "seen" | "delivering" | "delivered" | "expired" | "failed" | "awaiting" | "returning" | "returned";
  payment: { txid: string; zat: number; confirmations: number } | null;
  delivered: { amount: string; tx: string } | null;
  error: string | null;
  confirmationsNeeded: number;
  address: string | null;
  zec: string;
  uri: string | null;
};

const MAX_USD = 20;
const short = (s: string) => (s.length > 18 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s);
const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const usdText = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PayWithZec({ indexAddress, only, embedded = false, onPage = false }: { indexAddress?: string; only?: "buy" | "sell"; embedded?: boolean; onPage?: boolean } = {}) {
  // Followed in place, and linking to the ZEC page: away from that page.
  const away = embedded && !onPage;
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const query = useSearchParams();

  // The indexes on sale, and ZEC's price: the ZEC is worked out as you type.
  const [indexes, setIndexes] = useState<Index[] | null>(null);
  const [zecUsd, setZecUsd] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/zec/indexes")
      .then((r) => r.json())
      .then((l) => setIndexes(Array.isArray(l) ? l : []))
      .catch(() => setIndexes([]));
    fetch("/api/prices")
      .then((r) => r.json())
      .then((p) => setZecUsd(Number(p?.ZEC) > 0 ? Number(p.ZEC) : null))
      .catch(() => setZecUsd(null));
  }, []);
  const [pick, setPick] = useState<string | null>(indexAddress ?? null);
  const index = useMemo(
    () => (indexAddress ? (indexes?.find((i) => i.address === indexAddress) ?? null) : (indexes?.find((i) => i.address === pick) ?? indexes?.[0] ?? null)),
    [indexes, pick, indexAddress]
  );
  /** This index can't be had for ZEC (not minted yet, or the lane lacks a part). */
  const unavailable = !!indexAddress && indexes !== null && !index;

  const [side, setSide] = useState<"buy" | "sell">(only ?? (query.get("sell") ? "sell" : "buy"));
  const [amount, setAmount] = useState("");
  // The standalone page's third tab: the wallet's ZEC orders.
  const [history, setHistory] = useState(!embedded && query.has("history"));
  const [zaddr, setZaddr] = useState("");
  const usd = index && Number(amount) > 0 ? Number(amount) * index.usdPerToken : 0;
  const zec = zecUsd && usd > 0 ? usd / zecUsd : 0;
  const overCap = usd > MAX_USD;
  const maxAmount = index ? Math.floor((MAX_USD / index.usdPerToken) * 10_000) / 10_000 : 0;

  // Where it arrives: the connected Solana wallet, until another is typed.
  const sol = useSolanaWallet() as { address?: string | null; getAnchorWallet: () => any };
  // Selling: what the connected wallet holds of the index.
  const [held, setHeld] = useState<bigint | null>(null);
  useEffect(() => {
    setHeld(null);
    if (side !== "sell" || !sol.address || !index?.beta) return;
    let live = true;
    solanaConnection()
      .getParsedTokenAccountsByOwner(new PublicKey(sol.address), { mint: new PublicKey(index.beta) })
      .then((r) => live && setHeld(r.value.reduce((t, a) => t + BigInt(a.account.data.parsed.info.tokenAmount.amount), BigInt(0))))
      .catch(() => live && setHeld(BigInt(0)));
    return () => {
      live = false;
    };
  }, [side, sol.address, index?.beta]);
  // Where a bought index goes: the connected Solana wallet, as on Convert.
  const recipient = sol.address ?? "";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An order in the URL is followed every 5 seconds.
  const [localOrder, setLocalOrder] = useState<string | null>(null);
  const orderId = away ? localOrder : query.get("order");
  const follow = (id: string) => (away ? setLocalOrder(id) : router.replace(`?order=${id}`, { scroll: false }));
  const startOver = () => (away ? setLocalOrder(null) : router.replace(onPage && only === "sell" ? "?tab=sell" : "?", { scroll: false }));
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => {
    setOrder(null);
    if (!orderId) return;
    let live = true;
    const read = async () => {
      const r = await fetch(`/api/zec/order/${orderId}`, { cache: "no-store" }).catch(() => null);
      if (live && r?.ok) setOrder(await r.json());
    };
    read();
    const t = setInterval(read, 5_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [orderId]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!order?.uri) return setQr(null);
    QRCode.toDataURL(order.uri, { margin: 1, width: 360, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(null));
  }, [order?.uri]);

  const pay = async () => {
    if (!index) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/zec/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ index: index.address, amount: amount.trim(), recipient: recipient.trim() }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error ?? `The lane refused (${r.status})`);
      follow(body.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  /** Sells (demo): the order, then one transfer of the index to the lane,
   *  signed by the wallet. The lane checks it and sends it back. */
  const sell = async () => {
    if (!index || !sol.address) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/zec/sell", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ index: index.address, amount: amount.trim(), owner: sol.address, zaddr: zaddr.trim() }),
      });
      const q = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(q?.error ?? `The lane refused (${r.status})`);
      const wallet = sol.getAnchorWallet();
      if (!wallet) throw new Error("Connect your Solana wallet");
      const conn = solanaConnection();
      const me = new PublicKey(sol.address);
      const beta = new PublicKey(q.beta);
      const lane = new PublicKey(q.lane);
      const tx = new Transaction().add(
        createAssociatedTokenAccountIdempotentInstruction(me, getAssociatedTokenAddressSync(beta, lane), lane, beta),
        createTransferInstruction(getAssociatedTokenAddressSync(beta, me), getAssociatedTokenAddressSync(beta, lane), me, BigInt(q.units))
      );
      tx.feePayer = me;
      tx.recentBlockhash = (await conn.getLatestBlockhash("confirmed")).blockhash;
      const signed = await wallet.signTransaction(tx);
      const signature = await conn.sendRawTransaction(signed.serialize());
      await fetch(`/api/zec/sell/${q.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signature }) });
      follow(q.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const copy = (s: string) => void navigator.clipboard?.writeText(s);

  const problem = !index
    ? null
    : !(Number(amount) > 0)
      ? "Enter an amount"
      : overCap
        ? `Up to $${MAX_USD} an order: ${maxAmount} ${index.symbol}`
        : side === "sell" && !sol.address
          ? "Connect the Solana wallet that holds the index"
          : side === "sell" && held !== null && BigInt(Math.round(Number(amount) * 1e9)) > held
            ? `You hold ${(Number(held) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${index.symbol}`
            : side === "sell" && !/^(u1|zs)[0-9a-z]{20,}$/.test(zaddr.trim())
              ? "Enter a shielded Zcash address (u1… or zs…)"
              : side === "buy" && !recipient
          ? "Connect your Solana wallet to receive it"
          : !zecUsd
            ? "Reading ZEC's price…"
            : null;

  /** A grey bar standing in for text while it loads. */
  const bar = (w: string, h = "h-3.5") => <span className={`inline-block ${w} ${h} rounded bg-black/10 animate-pulse align-middle`} aria-hidden />;

  const indexPill = (i: Index | null) =>
    i ? (
      <button type="button" disabled={!!indexAddress} onClick={() => setPickerOpen(true)} className="shrink-0 flex glass-card pr-3 rounded-full items-center gap-2 enabled:hover:bg-black/10 transition-all">
        {i.image ? <img src={i.image} alt="" className="w-9 h-9 rounded-full object-cover" /> : <span className="w-9 h-9 rounded-full bg-black/10" />}
        <span className="font-bold">{i.symbol}</span>
        {!indexAddress && <Icon icon="solar:alt-arrow-down-linear" className="opacity-60" />}
      </button>
    ) : (
      <span className="shrink-0 flex glass-card pr-3 rounded-full items-center gap-2" aria-label="Loading the indexes">
        <span className="w-9 h-9 rounded-full bg-black/10 animate-pulse" />
        {bar("w-14", "h-4")}
      </span>
    );

  // ------------------------------------------------------------- following an order
  if (orderId) {
    const left = (order?.expiresAt ?? 0) - now;
    // A quote that ran out shows as expired at once, before the server's next round.
    const o = order && order.state === "waiting" && left <= 0 ? { ...order, state: "expired" as const } : order;
    const selling = o?.side === "sell";
    const steps: [string, boolean][] = o && selling
      ? [
          [`${o.amount} ${o.symbol} sent from your wallet`, !!o.transfer],
          ["Received and checked by Greatwall (final on Solana)", ["returning", "returned"].includes(o.state)],
          [`No ZEC paid (demo): ${o.symbol} sent back to your wallet`, o.state === "returned"],
        ]
      : o
      ? [
          ["ZEC payment seen", o.state !== "waiting" && o.state !== "expired"],
          [`Confirmed on Zcash (${Math.min(o.payment?.confirmations ?? 0, o.confirmationsNeeded)} of ${o.confirmationsNeeded})`, ["delivering", "delivered"].includes(o.state)],
          [`${o.symbol} in your Solana wallet`, o.state === "delivered"],
        ]
      : [];
    const title = !o
      ? "Loading your order…"
      : selling
        ? o.state === "returned"
          ? `Your ${o.symbol} is back in your wallet`
          : o.state === "failed"
            ? "This sale needs a hand"
            : o.state === "expired"
              ? "No index came for this quote"
              : `Selling ${o.amount} ${o.symbol} (demo)`
      : o.state === "delivered"
        ? `Received ${o.delivered?.amount ?? o.amount} ${o.symbol}`
        : o.state === "waiting"
          ? "Scan to pay with Zashi"
          : o.state === "failed"
              ? "Paid; sending is delayed"
              : o.state === "expired"
                ? "This order expired"
                : `Paid: your ${o.symbol} is on its way`;
    return (
      <div className={embedded ? "w-full flex flex-col gap-4" : "w-full max-w-lg mx-auto flex flex-col gap-4"}>
        <div className="rounded-2xl border border-ink bg-paper shadow-sm p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg sm:text-xl font-bold">{title}</h1>
            {o && <span className="text-xs font-semibold rounded-full bg-black/5 px-2.5 py-1">#{o.id}</span>}
          </div>
          {selling && <DemoNote />}
          {!selling && o?.state === "waiting" && o.uri && o.address && (
            <div className="flex flex-col items-center gap-3">
              {qr ? <img src={qr} alt="Payment request for a Zcash wallet" className="w-60 h-60 rounded-xl bg-white p-2 border border-black/10" /> : <div className="w-60 h-60 rounded-xl bg-black/5 animate-pulse" />}
              <p className="flex items-center gap-2 text-3xl font-bold tabular-nums">
                <Image src={zcash} alt="" width={30} height={30} className="size-7.5 rounded-full" />
                {o.zec} ZEC
              </p>
              <p className="text-xs opacity-70 text-center">
                for {o.amount} {o.symbol} (${usdText(o.usd)}) · pay within <b className="tabular-nums">{mmss(left)}</b>
              </p>
              <a href={o.uri} className="text-xs font-semibold underline">
                Open in a Zcash wallet on this device
              </a>
              <div className="w-full flex flex-col gap-2 text-xs">
                {[
                  ["Send to", o.address],
                  ["Memo (keep it)", o.memo],
                ].map(([k, v]) => (
                  <button key={k} type="button" onClick={() => copy(v)} className="flex items-center justify-between gap-3 rounded-lg bg-black/5 hover:bg-black/10 px-3 py-2 text-left" title="Copy">
                    <span className="opacity-60 shrink-0">{k}</span>
                    <span className="font-mono truncate flex items-center gap-1.5">
                      {short(v)} <Icon icon="solar:copy-linear" className="shrink-0" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {o?.state === "expired" && !selling && (
            <p className="text-sm opacity-80 rounded-xl bg-black/5 px-4 py-3">
              Its 15 minutes ran out with no payment, so this order is closed. Start a new order for a fresh price. A payment sent to it anyway within a day
              still arrives as {o.symbol}, at the prices when it comes, since ZEC can&rsquo;t be sent back.
            </p>
          )}
          {o && o.state !== "expired" && (
            <ol className="flex flex-col gap-2.5 text-sm border-t border-black/10 pt-4">
              {steps.map(([label, done]) => (
                <li key={label} className="flex items-center gap-2.5">
                  <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-green-500/15 text-green-600" : "bg-black/5 opacity-60"}`}>{done ? "✓" : "…"}</span>
                  <span className={done ? "" : "opacity-70"}>{label}</span>
                </li>
              ))}
            </ol>
          )}
          {o?.error && <p className="text-xs opacity-80">{o.error}. {selling ? "Anything that reached Greatwall is sent back to you." : "Your order is kept, and the index is sent by hand."}</p>}
          {selling && o?.returnTx && txLink("solana", o.returnTx) && (
            <a href={txLink("solana", o.returnTx)!} target="_blank" rel="noreferrer" className="self-start text-xs font-semibold underline">
              See it sent back on Solana
            </a>
          )}
          {o?.state === "delivered" && o.delivered && Number(o.delivered.amount) < Number(o.amount) && (
            <p className="text-xs opacity-80">You paid {(o.payment?.zat ?? 0) / 1e8} ZEC of {o.zec}: you got the {o.symbol} it pays for.</p>
          )}
          {o?.state === "delivered" && (
            <div className="flex flex-wrap gap-3 text-xs font-semibold">
              {o.delivered?.tx && txLink("solana", o.delivered.tx) && (
                <a href={txLink("solana", o.delivered.tx)!} target="_blank" rel="noreferrer" className="underline">
                  See the delivery on Solana
                </a>
              )}
              <Link href={`/${locale}/solana/index/${o.token}`} className="underline">
                Open {o.symbol}
              </Link>
            </div>
          )}
          <button type="button" onClick={startOver} className="self-start text-xs opacity-70 hover:opacity-100 underline">
            {o?.state === "delivered" || o?.state === "returned" || o?.state === "expired" ? "New order" : "Start over"}
          </button>
        </div>
        {away && o && (
          <a href={`/${locale}/solana/zec?order=${o.id}`} className="self-start text-xs font-semibold underline px-1">
            Keep following it on the ZEC page, with all your ZEC orders
          </a>
        )}
        <Footnote />
      </div>
    );
  }

  // ------------------------------------------------------------- the form
  if (unavailable)
    return (
      <p className="text-sm opacity-70 rounded-xl bg-black/5 px-4 py-3">
        {side === "buy"
          ? "This index can't be bought with ZEC yet: it is offered once it has been minted, and while Greatwall holds every asset it needs."
          : "None of this index has been minted yet, so there is none to sell. Mint some on its page first, then you can sell it for ZEC here."}
      </p>
    );
  return (
    <div className={embedded ? "w-full flex flex-col gap-4" : "w-full max-w-lg mx-auto flex flex-col gap-4"}>
      <div className="flex flex-col gap-3 px-1">
        {!embedded && <h1 className="text-2xl sm:text-3xl font-bold">Pay with ZEC</h1>}
        {!only && <div className="flex rounded-full bg-black/5 p-1 self-start text-sm font-semibold" role="tablist">
          {(["buy", "sell"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={!history && side === k} onClick={() => { setSide(k); setHistory(false); setError(null); }} className={`rounded-full px-4 py-1.5 transition-colors ${!history && side === k ? "bg-ink text-snow" : "opacity-70 hover:opacity-100"}`}>
              {k === "buy" ? "Buy with ZEC" : "Sell for ZEC"}
            </button>
          ))}
          {!embedded && (
            <button type="button" role="tab" aria-selected={history} onClick={() => setHistory(true)} className={`rounded-full px-4 py-1.5 transition-colors ${history ? "bg-ink text-snow" : "opacity-70 hover:opacity-100"}`}>
              History
            </button>
          )}
        </div>}
        {history ? (
          sol.address ? null : <p className="text-sm opacity-70">Connect your Solana wallet to see your ZEC orders: the ones bought to it and sold from it.</p>
        ) : side === "buy" ? (
          <>
            <p className="text-sm opacity-70">Buy an index privately: pay shielded ZEC from your phone, receive the index in your Solana wallet in a few minutes. {embedded ? "" : "Every index made of assets from all of Greatwall's networks is here."}</p>
            <p className="text-xs rounded-lg bg-amber-500/10 border border-amber-600/30 px-3 py-2">
              <b>Real ZEC.</b> You pay real ZEC on Zcash mainnet, and the index you get is on Solana devnet, holding test tokens with no value. Greatwall never sends ZEC back: nothing is refunded.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm opacity-70">Sell an index for shielded ZEC: send it from your Solana wallet, and the ZEC would arrive privately at your Zcash address.</p>
            <DemoNote />
          </>
        )}
      </div>

      {history ? (
        sol.address && <ZecOrders address={sol.address} onOpen={follow} />
      ) : (<>
      {/* The two networks, as Convert shows them: ZEC on Zcash, the index on Solana, its wallet connected. */}
      <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2">
        {side === "buy" ? (
          <>
            <NetworkCard logo={zcashnetwork} label="Pay from" name="Zcash" right={<ScanChip />} />
            <ArrowBadge />
            <NetworkCard logo={solananetwork} label="Receive on" name="Solana" right={<SolanaConnectButton />} />
          </>
        ) : (
          <>
            <NetworkCard logo={solananetwork} label="Sell from" name="Solana" right={<SolanaConnectButton />} />
            <ArrowBadge />
            <NetworkCard logo={zcashnetwork} label="Receive on" name="Zcash" right={<ScanChip text="Demo · not paid" />} />
          </>
        )}
      </div>
      <div className="flex flex-col">
        {/* What you get. */}
        <div className="relative z-10 rounded-2xl border border-ink bg-paper shadow-sm py-4 px-4 md:py-5 md:px-6 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs md:text-sm">
            <span className="opacity-60">{side === "buy" ? "You get" : "You sell"}</span>
            {side === "sell" && held !== null && index ? (
              <span className="opacity-60 tabular-nums">Balance {(Number(held) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 6 })} {index.symbol}</span>
            ) : index ? (
              <span className="opacity-60 truncate">{index.name}</span>
            ) : (
              bar("w-24")
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <input
              id="zec-amount"
              type="text"
              inputMode="decimal"
              aria-label="Amount of the index"
              placeholder="0"
              value={amount}
              onChange={(e) => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setAmount(e.target.value)}
              className="flex-1 min-w-0 text-4xl md:text-5xl font-bold bg-transparent outline-none truncate"
            />
            {indexPill(index)}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm opacity-60 tabular-nums">{index ? `$${usdText(index.usdPerToken)} each` : bar("w-20")}</span>
            {index && (
              <button type="button" onClick={() => setAmount(String(side === "sell" && held !== null ? Math.min(maxAmount, Math.floor(Number(held) / 1e5) / 1e4) : maxAmount))} className="text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-ink hover:text-snow transition-colors">
                Max ${MAX_USD}
              </button>
            )}
          </div>
        </div>

        {/* What you pay, tucked under it. */}
        <div className="-mt-4 mx-1 rounded-b-2xl border border-dashed border-ink/25 border-t-0 bg-sand px-4 md:px-6 pt-7 pb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs md:text-sm">
            <span className="opacity-60">{side === "buy" ? "You pay" : "You would get (demo: not paid)"}</span>
            <span className="opacity-60">{side === "buy" ? "shielded, from any Zcash wallet" : "shielded, to your Zcash wallet"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Image src={zcash} alt="ZEC" width={36} height={36} className="size-9 rounded-full shrink-0" />
            <span className={`text-2xl md:text-3xl font-bold tabular-nums truncate ${zec > 0 ? "" : "opacity-40"}`}>{zec > 0 ? zec.toFixed(6) : "0"} ZEC</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm opacity-60">
            <span className="tabular-nums">${usdText(usd)}</span>
            <span>{zecUsd ? `1 ZEC = $${usdText(zecUsd)}` : bar("w-24")}</span>
          </div>
          {side === "sell" ? (
            <label className="flex flex-col gap-1.5 text-xs md:text-sm border-t border-ink/10 pt-3">
              <span className="opacity-60">To your Zcash address</span>
              <input id="zec-zaddr" value={zaddr} onChange={(e) => setZaddr(e.target.value)} placeholder="u1… (shielded)" className="rounded-md bg-paper px-2 py-1.5 font-mono text-xs outline-none border border-ink/20" />
            </label>
          ) : null}
        </div>
      </div>

      {problem && Number(amount) > 0 && <p className="text-xs text-red-700 px-1">{problem}</p>}
      {error && <p className="text-xs text-red-700 px-1">{error}</p>}
      <button type="button" onClick={side === "buy" ? pay : sell} disabled={busy || !!problem} className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink text-snow py-4 text-base font-semibold hover:bg-pitch disabled:opacity-40 transition-colors">
        <Image src={zcash} alt="" width={20} height={20} className="size-5 rounded-full" />
        {busy ? (side === "buy" ? "Making your order…" : "Confirm in your wallet…") : side === "buy" ? "Pay with ZEC" : `Sell ${index?.symbol ?? ""} for ZEC (demo)`}
      </button>

      {!away ? null : (
        <a href={`/${locale}/solana/zec?tab=history`} className="self-start text-xs font-semibold underline px-1">
          Your ZEC orders
        </a>
      )}
      </>)}
      <Footnote />

      <AnimatedModal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} maxWidthClass="lg:w-120">
        <div className="p-6 flex flex-col gap-3">
          <h2 className="text-lg font-bold">Choose an index</h2>
          {(indexes ?? []).map((i) => (
            <button
              key={i.address}
              type="button"
              onClick={() => {
                setPick(i.address);
                setPickerOpen(false);
              }}
              className={`w-full text-left p-4 border rounded-xl flex items-center gap-3 bgBox glass-card transition-all ${index?.address === i.address ? "border-ink" : "border-black/5 hover:border-ink/40"}`}
            >
              {i.image ? <img src={i.image} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" /> : <span className="w-11 h-11 rounded-full bg-black/10 shrink-0" />}
              <span className="flex flex-col min-w-0 flex-1">
                <span className="font-bold">
                  {i.symbol} <span className="font-normal opacity-60">· {i.name}</span>
                </span>
                <span className="text-[11px] opacity-60 truncate">{i.parts.map((p) => p.symbol).join(" · ")}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums">${usdText(i.usdPerToken)}</span>
            </button>
          ))}
          {indexes === null &&
            [0, 1].map((k) => (
              <div key={k} className="w-full p-4 border border-black/5 rounded-xl flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-black/10 animate-pulse shrink-0" />
                <span className="flex flex-col gap-2 flex-1">{bar("w-32", "h-4")}{bar("w-48", "h-3")}</span>
                {bar("w-12", "h-4")}
              </div>
            ))}
          {indexes && indexes.length === 0 && <p className="text-sm opacity-70">No index can be bought right now.</p>}
        </div>
      </AnimatedModal>
    </div>
  );
}

type Listed = { id: string; side: "buy" | "sell"; symbol: string; image: string | null; amount: string; zec: string; usd: number; state: Order["state"]; createdAt: number; expiresAt: number; tx: string | null };

const STATE_TEXT: Record<Order["state"], [string, "ok" | "wait" | "off"]> = {
  waiting: ["Waiting for payment", "wait"],
  seen: ["Payment seen", "wait"],
  delivering: ["Sending", "wait"],
  delivered: ["Received", "ok"],
  awaiting: ["Waiting for your transfer", "wait"],
  returning: ["Sending back", "wait"],
  returned: ["Sent back (demo)", "ok"],
  expired: ["Expired", "off"],
  failed: ["Needs a hand", "off"],
};
const TONE = { ok: "bg-green-600/10 text-green-700", wait: "bg-amber-500/15 text-amber-800", off: "bg-black/10 text-ink/70" };

const OPEN_STATES: Order["state"][] = ["waiting", "seen", "delivering", "awaiting", "returning"];

/** "just now", "5m ago", "3h ago", "2d ago". */
const ago = (t: number, now: number) => {
  const s = Math.max(0, Math.floor((now - t) / 1000));
  return s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86_400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86_400)}d ago`;
};

/** A round logo: an image, or the symbol's first letter. */
function Coin({ src, label, size = 32 }: { src: string | null | typeof zcash; label: string; size?: number }) {
  return (
    <span className="rounded-full overflow-hidden bg-black/5 border border-ink/10 flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      {src ? (
        typeof src === "string" ? <img src={src} alt="" className="w-full h-full object-cover" /> : <Image src={src} alt="" width={size} height={size} className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-bold opacity-60">{label.charAt(0)}</span>
      )}
    </span>
  );
}

/** A wallet's ZEC orders, newest first, as Convert's history shows its
 *  conversions; each opens its details. `inProgress`: only those still moving. */
export function ZecOrders({ address, onOpen, inProgress = false }: { address: string; onOpen: (id: string) => void; inProgress?: boolean }) {
  const [list, setList] = useState<Listed[] | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    let live = true;
    const read = () =>
      fetch(`/api/zec/orders?address=${address}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((l) => live && setList(Array.isArray(l) ? l : []))
        .catch(() => live && setList([]));
    read();
    const t = setInterval(read, 15_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [address]);
  // A quote that ran out shows as expired at once, before the server's next round.
  const stateOf = (o: Listed): Order["state"] => (o.state === "waiting" && now > o.expiresAt ? "expired" : o.state);
  const shown = (list ?? []).filter((o) => !inProgress || OPEN_STATES.includes(stateOf(o)));

  if (list === null)
    return (
      <div className="flex flex-col gap-2">
        {[0, 1].map((k) => (
          <div key={k} className="h-[84px] rounded-xl bg-black/5 animate-pulse" />
        ))}
      </div>
    );
  if (shown.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-ink/15 px-4 py-6 flex flex-col items-center gap-1 text-center">
        <Icon icon="solar:clipboard-list-linear" className="text-2xl opacity-40" />
        <p className="text-sm font-semibold">{inProgress ? "Nothing moving right now" : "No ZEC orders yet"}</p>
        <p className="text-xs opacity-60">{inProgress ? "An order shows here until it is done." : "Orders this wallet makes show here, bought or sold."}</p>
      </div>
    );
  return (
    <div className="flex flex-col gap-2">
      {shown.map((o) => {
        const state = stateOf(o);
        const [text, tone] = STATE_TEXT[state] ?? [state, "off"];
        const buy = o.side === "buy";
        const left = o.expiresAt - now;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onOpen(o.id)}
            className="w-full text-left rounded-xl bg-cream border border-ink/10 hover:border-ink/30 px-3 py-3 flex flex-col gap-2.5 transition-colors"
          >
            <span className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate">
                <b>{buy ? "Buy with ZEC" : "Sell for ZEC (demo)"}</b>
                <span className="opacity-60"> · #{o.id}</span>
              </span>
              <span className="opacity-60 shrink-0">{ago(o.createdAt, now)}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center shrink-0">
                <Coin src={buy ? zcash : o.image} label={buy ? "ZEC" : o.symbol} />
                <Icon icon="solar:arrow-right-linear" className="mx-1.5 text-xs opacity-60" />
                <Coin src={buy ? o.image : zcash} label={buy ? o.symbol : "ZEC"} />
              </span>
              <span className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-sm font-bold truncate tabular-nums">
                  {o.amount} {o.symbol}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className={`w-fit text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 ${TONE[tone]}`}>{text}</span>
                  {state === "waiting" && left > 0 && <span className="text-[10px] opacity-70 tabular-nums">pay within {mmss(left)}</span>}
                </span>
              </span>
              <span className="flex flex-col items-end shrink-0">
                <span className="text-[10px] opacity-60">{buy ? "You pay" : "Quoted"}</span>
                <span className="text-sm font-bold tabular-nums">{o.zec} ZEC</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** One side's network, as Convert's cards: its logo, a label and its name, and its wallet. */
function NetworkCard({ logo, label, name, right }: { logo: typeof zcash; label: string; name: string; right: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2 rounded-2xl glass-card px-4 py-3">
      <span className="flex items-center gap-3 min-w-0">
        <Image src={logo} alt={name} width={40} height={40} className="w-9 h-9 md:w-10 md:h-10 rounded-full object-contain shrink-0" />
        <span className="flex flex-col min-w-0 leading-tight">
          <span className="text-[11px] md:text-xs opacity-60">{label}</span>
          <span className="text-sm md:text-lg font-bold truncate">{name}</span>
        </span>
      </span>
      <span className="shrink-0">{right}</span>
    </div>
  );
}

/** Between the two cards. */
function ArrowBadge() {
  return (
    <span className="hidden sm:flex items-center shrink-0">
      <span className="w-8 h-8 rounded-lg border border-ink/10 bg-paper flex items-center justify-center">
        <Icon icon="solar:arrow-right-linear" className="text-sm" />
      </span>
    </span>
  );
}

/** Zcash has no wallet to connect: it pays by a QR code any Zcash wallet reads. */
function ScanChip({ text = "Any Zcash wallet" }: { text?: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg bg-ink text-snow px-3 py-2 text-xs font-semibold whitespace-nowrap">
      <Icon icon="solar:qr-code-linear" className="text-sm" />
      {text}
    </span>
  );
}

/** The caution on selling: a demo, no ZEC is paid, the index comes back. */
function DemoNote() {
  return (
    <p className="text-xs rounded-lg bg-amber-500/10 border border-amber-600/30 px-3 py-2">
      <b>Demo: no ZEC is paid.</b> Selling for ZEC shows the flow only. Your index goes to Greatwall, is checked on Solana, and is sent back to
      your wallet in a minute or so. Greatwall does not send real ZEC, so nothing arrives at your Zcash address.
    </p>
  );
}

function Footnote() {
  return (
    <p className="text-[11px] opacity-60 px-1 leading-relaxed">
      Up to ${MAX_USD} an order · 3 Zcash confirmations (about 4 minutes) · Paid less than the quote: you get the part you paid for. Paid more: you get what you ordered.
      Your payment is private on Zcash; Greatwall publishes its Zcash viewing key (
      <a href="/api/zec/info" className="underline">
        here
      </a>
      ), so anyone can match every payment to the index it delivered.
    </p>
  );
}
