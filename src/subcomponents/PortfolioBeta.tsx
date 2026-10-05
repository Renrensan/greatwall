"use client";

// The BETA the wallet holds on the connected network: every basket's BETA
// token with a balance here, with what can be done with it: see the
// basket, move it to another network (the vault's bridge, where the token
// is carried), send it to anyone.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { getBasket } from "@ipow/sdk";

import type { SupportedChain } from "@/app/network-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { deploymentOf, isEvmChain, readProvider, solanaBeta, solanaConnection, type EvmChain } from "@/components/integrator/ipow/sdk";
import { balanceOf } from "@/components/integrator/ipow/tokens";
import { knownBaskets } from "@/components/integrator/ipow/basketList";
import { fromUnits } from "@/components/integrator/ipow/tunnel";
import { AnimatedModal } from "./AnimatedModal";
import Button from "./Button";
import ButtonContrast from "./ButtonContrast";

type Held = {
  /** The basket's key (EVM) or address (Solana). */
  key: string;
  /** The BETA token: an ERC-20 address, or a mint. */
  beta: string;
  decimals: number;
  balance: number;
};

const BETA_DECIMALS = 18;
const SOLANA_BETA_DECIMALS = 9;

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 6 });

export default function PortfolioBeta() {
  const { network, locale } = useParams<{ network: SupportedChain; locale: string }>();
  const router = useRouter();
  const en = locale === "en";
  const wallets: Record<string, any> = {
    ethereum: useEthereumWallet(),
    base: useBaseWallet(),
    robinhood: useRobinhoodWallet(),
    hyperliquid: useHyperliquidWallet(),
    solana: useSolanaWallet(),
  };
  const wallet = wallets[network];
  const supported = isEvmChain(network) || network === "solana";

  const [held, setHeld] = useState<Held[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!supported || !wallet?.connected || !wallet.address) {
      setHeld([]);
      return;
    }
    setNote(null);
    try {
      let keys: string[] = [];
      if (network === "solana") {
        keys = await solanaBeta(null).allBaskets();
      } else {
        const r = await fetch(`/api/baskets/${network}`);
        const index = await r.json();
        if (r.ok && index?.supported) {
          keys = index.baskets.map((b: { key: string }) => b.key);
          if (!index.complete) setNote(en ? "Still reading the baskets' history; more may appear." : "Masih membaca riwayat basket; mungkin bertambah.");
        } else {
          keys = knownBaskets(deploymentOf(network as EvmChain)!.betaBaskets);
        }
      }
      const owner = wallet.address;
      const found = await Promise.all(
        keys.map(async (key): Promise<Held | null> => {
          try {
            if (network === "solana") {
              const b = await solanaBeta(null).getBasket(key);
              const accounts = await solanaConnection().getParsedTokenAccountsByOwner(new PublicKey(owner), { mint: new PublicKey(b.beta) });
              const balance = accounts.value.reduce((sum, a) => sum + Number(a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
              return balance > 0 ? { key, beta: b.beta, decimals: SOLANA_BETA_DECIMALS, balance } : null;
            }
            const b = await getBasket(readProvider(network as EvmChain), deploymentOf(network as EvmChain)!, key);
            const balance = fromUnits(await balanceOf(network as EvmChain, b.beta, owner), BETA_DECIMALS);
            return balance > 0 ? { key, beta: b.beta, decimals: BETA_DECIMALS, balance } : null;
          } catch {
            return null;
          }
        })
      );
      setHeld(found.filter((h): h is Held => h !== null));
    } catch (e: any) {
      setHeld([]);
      setMsg({ ok: false, text: e?.message ?? String(e) });
    }
  }, [network, supported, wallet?.connected, wallet?.address, en]);

  useEffect(() => {
    load();
  }, [load]);

  const [sending, setSending] = useState<Held | null>(null);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const send = async () => {
    if (!sending) return;
    setBusy(true);
    setMsg(null);
    try {
      const n = Number(amount);
      if (!(n > 0)) throw new Error(en ? "Enter an amount" : "Masukkan jumlah");
      if (!wallet.isValidAddress?.(to.trim())) throw new Error(en ? `Not a ${network} address` : `Bukan alamat ${network}`);
      const hash = isEvmChain(network)
        ? await wallet.sendTokenTo(to.trim(), n, undefined, { address: sending.beta, decimals: sending.decimals })
        : await wallet.sendTokenTo(to.trim(), n, undefined, sending.beta);
      if (!hash) throw new Error(en ? "The wallet did not send it" : "Dompet tidak mengirimnya");
      setMsg({ ok: true, text: en ? `Sent ${amount} BETA.` : `Terkirim ${amount} BETA.` });
      setSending(null);
      setTo("");
      setAmount("");
      await load();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.shortMessage ?? e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return <p className="text-sm text-stone">{en ? "No BETA on this network yet." : "Belum ada BETA di jaringan ini."}</p>;
  if (!wallet?.connected) return <p className="text-xs text-stone">{en ? "Connect your wallet to see the BETA you hold." : "Hubungkan dompet untuk melihat BETA Anda."}</p>;

  return (
    <div className="flex flex-col gap-3">
      {note && <p className="text-xs text-stone">{note}</p>}
      {held === null && <p className="text-xs text-stone">{en ? "Reading your BETA…" : "Membaca BETA Anda…"}</p>}
      {held?.length === 0 && (
        <p className="text-sm text-stone">
          {en ? "You hold no BETA on this network. " : "Anda tidak memegang BETA di jaringan ini. "}
          <Link href={`/${locale}/${network}/beta/explore`} className="underline">{en ? "Explore baskets to mint." : "Jelajahi basket untuk mint."}</Link>
        </p>
      )}
      {held?.map((h) => (
        <div key={h.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-black/10 bg-white">
          <div>
            <p className="text-sm font-semibold">BETA · {h.key.slice(0, 8)}…{h.key.slice(-4)}</p>
            <p className="text-lg font-mono">{fmt(h.balance)}</p>
            <p className="text-[11px] text-stone font-mono">{h.beta.slice(0, 10)}…{h.beta.slice(-6)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${locale}/${network}/beta/transaction/${h.key}`} className="text-xs font-bold underline self-center">
              {en ? "Basket" : "Basket"}
            </Link>
            <Button chain={network} buttonText={en ? "Bridge" : "Bridge"} onClick={() => router.push(`/${locale}/${network}/bridge/send?token=${encodeURIComponent(h.beta)}`)} />
            <ButtonContrast buttonText={en ? "Send" : "Kirim"} onClick={() => { setSending(h); setMsg(null); }} />
          </div>
        </div>
      ))}
      {msg && <p className={`text-xs ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}

      <AnimatedModal isOpen={sending !== null} onClose={() => setSending(null)} maxWidthClass="lg:w-100">
        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold">{en ? "Send BETA" : "Kirim BETA"}</h2>
          <label className="flex flex-col gap-1 text-xs">
            {en ? "To" : "Ke"}
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder={en ? `${network} address` : `alamat ${network}`} className="border border-black/10 rounded-lg px-3 py-2 font-mono text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {en ? "Amount" : "Jumlah"}
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.0" className="border border-black/10 rounded-lg px-3 py-2 font-mono text-sm" />
          </label>
          <p className="text-[11px] text-stone">{en ? `Balance: ${fmt(sending?.balance ?? 0)} BETA` : `Saldo: ${fmt(sending?.balance ?? 0)} BETA`}</p>
          <div className="flex gap-3">
            <ButtonContrast buttonText={en ? "Cancel" : "Batal"} onClick={() => setSending(null)} />
            <Button chain={network} buttonText={busy ? "…" : en ? "Send" : "Kirim"} onClick={send} disabled={busy} />
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
