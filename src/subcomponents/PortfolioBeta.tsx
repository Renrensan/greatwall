"use client";

// The wallet's indexes on the connected network: every index whose token
// it holds, and every index it created (minted or not yet), laid out as the
// regular assets are (Assets.tsx): the same list, loading skeleton and
// Send / Receive pop-up, by each index's own name, symbol and image.

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { getBasket } from "@ipow/sdk";
import QRCode from "qrcode";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

import type { SupportedChain } from "@/app/network-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";
import { readMetadata, within } from "@/components/integrator/ipow/indexMetadata";
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
  /** The index token: an ERC-20 address, or a mint; its name and symbol. */
  beta: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  /** Created by this wallet. */
  mine: boolean;
  /** The index's image and description, from its metadata. */
  image: string | null;
  description: string;
  /** How many assets back it. */
  parts: number;
};

/** Every index token has 9 decimals, on EVM networks (BetaBaskets.decimals) as on Solana. */
const BETA_DECIMALS = 9;
const SOLANA_BETA_DECIMALS = 9;

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 6 });

export default function PortfolioBeta() {
  const t = useTranslations("All");
  const { network, locale } = useParams<{ network: SupportedChain; locale: string }>();
  const wallets: Record<string, any> = {
    ethereum: useEthereumWallet(),
    base: useBaseWallet(),
    robinhood: useRobinhoodWallet(),
    hyperliquid: useHyperliquidWallet(),
    arbitrum: useArbitrumWallet(),
    solana: useSolanaWallet(),
  };
  const wallet = wallets[network];
  const supported = isEvmChain(network) || network === "solana";
  const address: string | null = wallet?.address ?? null;

  const [held, setHeld] = useState<Held[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
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
          if (!index.complete) setNote("Still reading the baskets' history; more may appear.");
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
              const mine = b.creator === owner;
              if (!(balance > 0) && !mine) return null;
              const meta = await within(readMetadata(b.uri), 6_000, null);
              return { key, beta: b.beta, name: b.name, symbol: b.symbol, decimals: SOLANA_BETA_DECIMALS, balance, mine, image: meta?.image ?? null, description: meta?.description ?? "", parts: b.parts.length };
            }
            const b = await getBasket(readProvider(network as EvmChain), deploymentOf(network as EvmChain)!, key);
            const balance = fromUnits(await balanceOf(network as EvmChain, b.beta, owner), BETA_DECIMALS);
            const mine = b.creator.toLowerCase() === owner.toLowerCase();
            if (!(balance > 0) && !mine) return null;
            const meta = await within(readMetadata(b.uri), 6_000, null);
            return { key, beta: b.beta, name: b.name, symbol: b.symbol, decimals: BETA_DECIMALS, balance, mine, image: meta?.image ?? null, description: meta?.description ?? "", parts: b.parts.length };
          } catch {
            return null;
          }
        })
      );
      // Held first, by balance; then the ones created and not held.
      setHeld(found.filter((h): h is Held => h !== null).sort((a, b) => b.balance - a.balance));
    } catch (e: any) {
      setHeld([]);
      setMsg({ ok: false, text: e?.message ?? String(e) });
    }
  }, [network, supported, wallet?.connected, wallet?.address]);

  useEffect(() => {
    load();
  }, [load]);

  // The pop-up: Send or Receive, of the index picked.
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "receive">("send");
  const [modalStep, setModalStep] = useState<"form" | "selectToken">("form");
  const [selected, setSelected] = useState<Held | null>(null);
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [brokenLogoKeys, setBrokenLogoKeys] = useState<Set<string>>(new Set());
  const markLogoBroken = (k: string) => setBrokenLogoKeys((s) => new Set(s).add(k));

  useEffect(() => {
    if (!address) return;
    QRCode.toDataURL(address, { width: 480, margin: 1, color: { dark: "#000000", light: "#FFFFFF" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [address]);

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied.");
    } catch {
      toast.error("Could not copy.");
    }
  };

  const openModal = (h: Held, tab: "send" | "receive" = "send") => {
    setSelected(h);
    setActiveTab(tab);
    setModalStep("form");
    setShowModal(true);
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setSendAmount("");
    setSendAddress("");
    setModalStep("form");
  };

  const amountNum = parseFloat(sendAmount) || 0;
  const addressOk = !!sendAddress.trim() && !!wallet?.isValidAddress?.(sendAddress.trim());
  const amountError = selected && amountNum > selected.balance ? t("text108") : null;
  const addressError = sendAddress.trim() && !addressOk ? (`Not a ${network} address`) : null;
  const isValidForm = !!selected && amountNum > 0 && !amountError && addressOk;

  const handleConfirmSend = async () => {
    if (!selected || !isValidForm) return;
    setShowModal(false);
    setIsProcessing(true);
    setMsg(null);
    try {
      const to = sendAddress.trim();
      const hash = isEvmChain(network)
        ? await wallet.sendTokenTo(to, amountNum, undefined, { address: selected.beta, decimals: selected.decimals })
        : await wallet.sendTokenTo(to, amountNum, undefined, selected.beta, selected.decimals);
      if (!hash) throw new Error("The wallet did not send it");
      toast.success(t("text32"));
      setSendAmount("");
      setSendAddress("");
      await load();
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? t("text34"), { duration: 8000 });
    } finally {
      setIsProcessing(false);
    }
  };

  const logoOf = (h: Held | null, size: "row" | "pill" | "small") => {
    const k = h?.key ?? "";
    const cls = size === "row" ? "w-11 h-11" : size === "pill" ? "w-6 h-6" : "w-7 h-7";
    return (
      <div className={`${cls} rounded-full overflow-hidden shadow-sm relative flex items-center justify-center bg-black/5 shrink-0`}>
        {h?.image && !brokenLogoKeys.has(k) ? (
          <Image src={h.image} alt={h.symbol} fill unoptimized className="object-cover" onError={() => markLogoBroken(k)} />
        ) : (
          <span className={`font-bold opacity-50 ${size === "row" ? "text-lg" : "text-[10px]"}`}>{h?.symbol?.charAt(0).toUpperCase() ?? "?"}</span>
        )}
      </div>
    );
  };

  if (!supported) return <p className="text-sm text-stone">{"No index tokens on this network yet."}</p>;

  if (!wallet?.connected || !address) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <div className="bgBox glass-card">
          <div className="flex flex-col justify-center gap-5 pb-5 text-center px-4 pt-6">
            <div className="p-5 glass-card shadow-buttonNav! flex justify-center items-center mx-auto w-28 h-28 rounded-full">
              <Icon icon="iconoir:wallet-solid" className="text-6xl text-end" />
            </div>
            <h2 className="text-xl font-bold text-center">{t("text24")}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full min-w-0">
      <div className="bgBox glass-card w-full max-w-full min-w-0">
        <div className="flex flex-col gap-5">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-bold text-lg sm:text-xl">{"Index Assets"}</h2>
          </div>
          {note && <p className="text-xs text-stone px-1">{note}</p>}

          <div className="flex flex-col gap-1">
            {held === null ? (
              [...Array(4)].map((_, i) => (
                <div key={`skeleton-${i}`} className="w-full p-4 border border-transparent rounded-xl flex items-center justify-between gap-3 animate-pulse bg-black/5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-black/10 shrink-0" />
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-12 bg-black/10 rounded" />
                      <div className="h-2 w-20 bg-black/10 rounded" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="h-4 w-16 bg-black/10 rounded" />
                    <div className="h-2 w-10 bg-black/10 rounded" />
                  </div>
                </div>
              ))
            ) : held.length > 0 ? (
              held.map((h, index) => (
                <motion.div
                  key={h.key}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openModal(h)}
                  className="flex items-center justify-between p-3 rounded-2xl group/item cursor-pointer hover:bg-black/3 transition-all duration-300"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                      <div className="absolute inset-0 rounded-full border border-black/20 group-hover/item:border-black/50 transition-colors opacity-30" />
                      <div className="absolute top-0 w-3 h-1 bg-current opacity-20 rounded-full group-hover/item:opacity-80 transition-opacity" />
                      <div className="absolute bottom-0 w-3 h-1 bg-current opacity-20 rounded-full group-hover/item:opacity-80 transition-opacity" />
                      <div className="absolute left-0 h-3 w-1 bg-current opacity-20 rounded-full group-hover/item:opacity-80 transition-opacity" />
                      <div className="absolute right-0 h-3 w-1 bg-current opacity-20 rounded-full group-hover/item:opacity-80 transition-opacity" />
                      <div className="w-11 h-11 rounded-full overflow-hidden shadow-xl border border-white/10 relative z-10 flex items-center justify-center bg-black/5 transition-transform duration-500 group-hover/item:scale-110">
                        {h.image && !brokenLogoKeys.has(h.key) ? (
                          <Image src={h.image} alt={h.name || h.symbol} fill className="object-cover" unoptimized onError={() => markLogoBroken(h.key)} />
                        ) : (
                          <span className="font-bold text-lg opacity-50">{h.symbol ? h.symbol.charAt(0).toUpperCase() : "?"}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-bold text-lg sm:text-xl tracking-tight group-hover/item:text-black transition-colors">
                        {h.symbol}
                        <Link
                          href={`/${locale}/${network}/index/${h.key}`}
                          onClick={(e) => e.stopPropagation()}
                          title={"Open this index"}
                          className="ml-2 inline-flex align-middle opacity-40 hover:opacity-100"
                        >
                          <Icon icon="solar:info-circle-linear" className="text-[16px]" />
                        </Link>
                      </span>
                      <span className="text-xs opacity-60 break-words">
                        {h.name}
                        {h.mine && <span className="ml-2 text-[10px] font-semibold rounded-full bg-ink text-snow px-2 py-0.5 align-middle">{"Created by you"}</span>}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="font-black text-lg sm:text-xl tracking-tighter">
                      {fmt(h.balance)} {h.symbol}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-sm opacity-60">
                <Icon icon="solar:wallet-broken" className="text-6xl mb-4 opacity-50" />
                <p className="text-lg font-medium">{"No Index Found"}</p>
                <Link href={`/${locale}/${network}/index`} className="underline text-xs mt-2">
                  {"Explore indexes to mint one."}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      {msg && <p className={`text-xs ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}

      {held && held.length > 0 && (
        // Pinned to the bottom of the Portfolio box, as on the Assets tab.
        <div className="w-full flex gap-5 sticky bottom-0 z-10 pt-5 pb-1 bg-[var(--color-paper)] before:content-[''] before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-[var(--color-paper)] before:to-transparent before:pointer-events-none">
          <Button chain={network} onClick={() => openModal(selected ?? held[0], "send")} buttonText={isProcessing ? t("text10") : `${t("text116")} Token`} disabled={isProcessing} />
          <ButtonContrast onClick={() => openModal(selected ?? held[0], "receive")} buttonText={"Receive"} />
        </div>
      )}

      <AnimatedModal isOpen={showModal} onClose={handleCloseModal} maxWidthClass="lg:w-150">
        <div className="flex flex-col p-6 overflow-hidden flex-1 min-h-0 max-h-[80vh]">
          <AnimatePresence mode="wait">
            {modalStep === "form" && (
              <motion.div key="form-step" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="flex flex-col h-full min-h-0">
                <div className="flex flex-col gap-5 pb-3 shrink-0">
                  <div className="flex flex-col gap-0">
                    <h2 className="text-xl font-bold">{activeTab === "send" ? t("text116") : "Receive"} Token</h2>
                    <p className="text-[12px] opacity-70">
                      {activeTab === "send" ? t("text29") : "Receive index tokens at this wallet's address, or mint them on the index's page."}
                    </p>
                  </div>

                  <div className="flex justify-between glass-card bgRound border-black/5 p-1 shadow-sm">
                    {[
                      { label: t("text116"), id: "send" },
                      { label: "Receive", id: "receive" },
                    ].map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id as "send" | "receive")}
                          className={`flex items-center justify-center gap-2 w-full p-2.5 text-center rounded-full text-xs sm:text-sm transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                            isActive ? "font-bold bg-black text-white shadow-md" : "font-medium hover:bg-black/5 opacity-60"
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar -mx-1 px-1">
                  {activeTab === "receive" ? (
                    <div className="flex flex-col gap-5 py-4">
                      {/* 1. To this wallet's address. */}
                      <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{"Send to this address"}</span>
                        <div className="bgBox glass-card p-5 border border-black/5 rounded-2xl flex flex-col items-center gap-4">
                          <button type="button" onClick={() => setModalStep("selectToken")} className="flex items-center gap-2 glass-card rounded-full pl-1.5 pr-3 py-1.5 hover:bg-black/5">
                            {logoOf(selected, "small")}
                            <span className="font-bold text-sm">{selected?.symbol}</span>
                            <Icon icon="lsicon:down-filled" className="text-sm" />
                          </button>
                          {qrDataUrl ? (
                            <img src={qrDataUrl} alt={address ?? ""} className="w-44 h-44 rounded-xl border border-black/5" />
                          ) : (
                            <div className="w-44 h-44 rounded-xl bg-black/5 animate-pulse" />
                          )}
                          <button type="button" onClick={copyAddress} title={"Copy address"} className="flex items-center justify-center gap-2 max-w-full px-3 py-2 rounded-lg border border-black/10 hover:bg-black/5">
                            <span className="font-mono text-xs break-all text-center">{address}</span>
                            <Icon icon="solar:copy-linear" className="text-base shrink-0" />
                          </button>
                        </div>
                      </div>
                      {/* 2. By minting it: the index, and its page to mint on. */}
                      {selected && (
                        <div className="flex flex-col gap-3">
                          <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{"By minting"}</span>
                          <div className="bgBox glass-card p-4 border border-black/5 rounded-2xl flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden relative flex items-center justify-center bg-black/5 shrink-0">
                                {selected.image && !brokenLogoKeys.has(selected.key) ? (
                                  <Image src={selected.image} alt={selected.symbol} fill unoptimized className="object-cover" onError={() => markLogoBroken(selected.key)} />
                                ) : (
                                  <span className="font-bold text-lg opacity-50">{selected.symbol.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="flex flex-col leading-tight min-w-0">
                                <span className="font-bold text-base truncate">{selected.name}</span>
                                <span className="text-xs opacity-60">
                                  ${selected.symbol} · {`Backed by ${selected.parts} ${selected.parts === 1 ? "asset" : "assets"}`}
                                </span>
                              </div>
                            </div>
                            {selected.description && <p className="text-xs opacity-70 leading-relaxed line-clamp-3">{selected.description}</p>}
                            <p className="text-[11px] opacity-60">
                              {`Deposit the assets that back ${selected.symbol} and receive ${selected.symbol} at this address.`}
                            </p>
                            <Link
                              href={`/${locale}/${network}/index/${selected.key}`}
                              className="w-full flex items-center justify-center gap-2 rounded-lg bg-ink text-snow py-3 text-sm font-medium hover:bg-pitch transition-colors"
                            >
                              <Icon icon="solar:add-circle-bold" />
                              {`Mint ${selected.symbol}`}
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4 py-4">
                      <div className="bgBox glass-card p-4 border border-black/5 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{t("text116")}</span>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-60">
                            <Icon icon="solar:wallet-linear" />
                            <span>
                              {fmt(selected?.balance ?? 0)} {selected?.symbol}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-col w-full">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={sendAmount}
                              onChange={(e) => {
                                const val = e.target.value;
                                const regex = new RegExp(`^\\d*(\\.\\d{0,${selected?.decimals ?? 9}})?$`);
                                if (regex.test(val) || val === "") setSendAmount(val);
                              }}
                              placeholder="0"
                              className="w-full bg-transparent text-2xl sm:text-3xl font-bold outline-none tracking-tight"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setModalStep("selectToken")}
                            className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 glass-card rounded-full shadow-md bg-white/60 border border-white/20 hover:bg-white/80 active:scale-95 transition-all group"
                          >
                            {logoOf(selected, "pill")}
                            <span className="font-bold text-sm sm:text-base tracking-tight">{selected?.symbol}</span>
                            <Icon icon="solar:alt-arrow-down-linear" className="text-sm opacity-40 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>

                        <div className="flex justify-end items-center w-full mt-4">
                          <div className="flex gap-1.5 shrink-0 ml-2">
                            {[0.25, 0.5, 1].map((pct) => {
                              const dec = selected?.decimals ?? 9;
                              const factor = Math.pow(10, dec);
                              const target = Math.max(0, Math.floor((selected?.balance ?? 0) * pct * factor) / factor);
                              const targetStr = target > 0 ? target.toString() : "";
                              return (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setSendAmount(targetStr)}
                                  className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95 ${
                                    sendAmount === targetStr && target > 0 ? "bg-black text-white shadow-lg shadow-black/20" : "bg-black/5 hover:bg-black/10 opacity-60"
                                  }`}
                                >
                                  {pct === 1 ? t("text42") : `${pct * 100}%`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {amountError && <p className="text-[10px] text-red-500 -mt-2 italic px-1">{amountError}</p>}
                      <div className="flex flex-col gap-2">
                        <div className="bgBox glass-card p-3 border border-black/5 rounded-xl">
                          <input
                            type="text"
                            value={sendAddress}
                            onChange={(e) => setSendAddress(e.target.value)}
                            placeholder={t("text117")}
                            className="w-full bg-transparent lg:text-sm font-bold outline-none placeholder:text-gray-400"
                          />
                        </div>
                        {addressError && <span className="text-[10px] text-red-500 italic px-1">{addressError}</span>}
                      </div>
                      <AnimatePresence>
                        {amountNum > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-col gap-1.5 mt-2 px-3 py-3 bgBox glass-card border border-black/5 rounded-xl overflow-hidden"
                          >
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span>{"Send Amount"}</span>
                              <span className="font-mono">
                                {amountNum.toString()} {selected?.symbol}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="bgBox glass-card p-3 border border-black/5 rounded-xl mt-2">
                        <p className="text-[11px] font-medium opacity-60 leading-tight">{t("text31")}</p>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            )}

            {modalStep === "selectToken" && (
              <motion.div key="token-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="flex flex-col h-full min-h-0">
                <div className="flex flex-col gap-0 pb-5">
                  <h2 className="text-xl font-bold">{"Select Token"}</h2>
                  <p className="text-[12px] opacity-70">{"Choose an index to manage from the list below."}</p>
                </div>
                <div className="flex flex-col gap-3 pb-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar -mx-1 px-1">
                  {(held ?? []).map((h) => {
                    const isSelected = selected?.key === h.key;
                    return (
                      <button
                        key={h.key}
                        type="button"
                        onClick={() => {
                          setSelected(h);
                          setSendAmount("");
                          setModalStep("form");
                        }}
                        className={`w-full shrink-0 text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                          isSelected ? "border-ink bg-ink! text-snow! shadow-none!" : "border-black/5 hover:bg-black/5"
                        }`}
                      >
                        <span className="flex items-center gap-3.5 min-w-0">
                          {logoOf(h, "row")}
                          <span className="flex flex-col leading-tight min-w-0">
                            <span className={`font-bold lg:text-sm ${isSelected ? "" : "opacity-80"}`}>{h.symbol}</span>
                            <span className="text-[11px] opacity-60 truncate">{h.name}</span>
                          </span>
                        </span>
                        <span className="font-bold text-sm tabular-nums shrink-0">{fmt(h.balance)}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-6 py-6 border-t border-black/5 bg-white">
          {modalStep === "form" ? (
            <div className="flex flex-row justify-center gap-3 w-full">
              <div className="flex-1">
                <ButtonContrast onClick={handleCloseModal} buttonText={activeTab === "receive" ? t("text128") : t("text55")} />
              </div>
              {activeTab === "send" && (
                <div className="flex-1">
                  <Button buttonText={t("text123")} chain={network} disabled={!isValidForm || isProcessing} onClick={handleConfirmSend} />
                </div>
              )}
            </div>
          ) : (
            <ButtonContrast onClick={() => setModalStep("form")} buttonText={t("text55")} />
          )}
        </div>
      </AnimatedModal>
    </div>
  );
}
