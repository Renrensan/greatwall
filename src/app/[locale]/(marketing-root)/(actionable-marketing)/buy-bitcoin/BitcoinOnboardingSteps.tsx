"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheck, FaLock, FaChevronDown } from "react-icons/fa";
import { isProviderInstalled } from "sats-connect";
import { useBitcoinWallet, XVERSE_PROVIDER_ID } from "@/components/bitcoin/bitcoin-provider";
import { useNetwork } from "@/app/network-provider";
import { xverse } from "@/index";
import BuyToken from "@/subcomponents/BuyToken";

interface BitcoinOnboardingStepsProps {
  locale: string;
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  id: {
    title: "Hanya Butuh 2 Langkah Untuk Beli Bitcoin",
    subtitle:
      "Amankan aset saat Rupiah melemah dengan 2 langkah mudah: hubungkan wallet, lalu beli Bitcoin.",
    step1: "Langkah 1: Instal & Hubungkan Wallet",
    step1Desc: "Instal Xverse Wallet dan hubungkan ke Paradapp.",
    step2: "Langkah 2: Beli Bitcoin",
    step2Desc: "Beli Bitcoin dengan Rupiah (IDR) menggunakan QRIS atau Virtual Account.",
    completedBadge: "Selesai",
    walletConnected: "Wallet Terhubung",
    installTitle: "Instal Xverse Wallet",
    installDesc:
      "Xverse adalah dompet Web3 terbaik dan teraman untuk menyimpan Bitcoin. Silakan instal dompet terlebih dahulu.",
    downloadWallet: "Unduh Xverse",
    detectedTitle: "Xverse Wallet Terdeteksi!",
    detectedDesc:
      "Xverse Wallet terdeteksi siap digunakan. Sekarang hubungkan dompet kamu untuk mulai bertransaksi.",
    proceedToBuy: "Lanjutkan ke Beli Bitcoin",
    connectWallet: "Hubungkan Dompet",
  },
  en: {
    title: "Just 2 Steps to Buy Bitcoin",
    subtitle:
      "Protect your savings from a weakening Rupiah in 2 easy steps: connect your wallet, then buy Bitcoin.",
    step1: "Step 1: Install & Connect Wallet",
    step1Desc: "Install Xverse Wallet and connect it to Paradapp.",
    step2: "Step 2: Buy Bitcoin",
    step2Desc: "Buy Bitcoin with Rupiah (IDR) using QRIS or Virtual Account.",
    completedBadge: "Completed",
    walletConnected: "Wallet Connected",
    installTitle: "Install Xverse Wallet",
    installDesc:
      "Xverse is the best and most secure Web3 wallet to store Bitcoin. Please install the wallet first.",
    downloadWallet: "Download Xverse",
    detectedTitle: "Xverse Wallet Detected!",
    detectedDesc:
      "Xverse wallet is detected and ready. Now connect your wallet to start transacting.",
    proceedToBuy: "Proceed to Buy Bitcoin",
    connectWallet: "Connect Wallet",
  },
};

export default function BitcoinOnboardingSteps({ locale }: BitcoinOnboardingStepsProps) {
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  const { connected: walletConnected, address: walletAddress, connect } = useBitcoinWallet();
  const { bitcoinMainnet, setBitcoinMainnet } = useNetwork();
  const isMainnet = bitcoinMainnet;

  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    1: false,
    2: false,
  });
  const [step1Sub, setStep1Sub] = useState<1 | 2>(1);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  const activeAddress = walletConnected && walletAddress ? walletAddress : "";

  // Auto-detect Xverse
  useEffect(() => {
    if (typeof window !== "undefined" && !hasAutoDetected) {
      const isXverseInstalled = isProviderInstalled(XVERSE_PROVIDER_ID);
      if (isXverseInstalled) {
        setStep1Sub(2);
        setHasAutoDetected(true);
      }
    }
  }, [hasAutoDetected]);

  // Sync wallet connection
  useEffect(() => {
    if (walletConnected && activeStep === 1 && step1Sub === 2) {
      setCompletedSteps((prev) => ({ ...prev, 1: true }));
      setActiveStep(2);
    }
  }, [walletConnected, activeStep, step1Sub]);

  useEffect(() => {
    if (!walletConnected) {
      setCompletedSteps((prev) => {
        if (prev[1]) {
          setActiveStep(1);
          setStep1Sub(2);
          return { ...prev, 1: false, 2: false };
        }
        return prev;
      });
    }
  }, [walletConnected]);

  const handleConnect = async () => {
    try {
      await connect("xverse");
    } catch (error) {
      console.error("Error connecting Bitcoin wallet:", error);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // ---------- Mainnet guard ----------
  if (isMainnet === undefined) {
    return (
      <div className="w-full h-40 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isMainnet) {
    return (
      <div className="w-full mt-16 md:mt-24 font-grotesk flex items-center justify-center px-4">
        <div className="glass-card rounded-3xl p-10 max-w-md w-full text-center">
          <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">
            {locale === "id" ? "Mainnet Diperlukan" : "Mainnet Required"}
          </h3>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
            {locale === "id"
              ? "Fitur ini hanya tersedia di Mainnet. Silakan ganti ke Mainnet terlebih dahulu."
              : "This feature is only available on Mainnet. Please switch to Mainnet first."}
          </p>
          <button
            onClick={() => setBitcoinMainnet(true)}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white dark:text-neutral-900 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-md"
          >
            {locale === "id" ? "Pindah ke Mainnet" : "Switch to Mainnet"}
          </button>
        </div>
      </div>
    );
  }
  // ----------------------------------

  return (
    <section className="w-full mt-16 md:mt-24 font-grotesk">
      {/* Title Header */}
      <div className="text-left md:text-center max-w-3xl mx-auto mb-10">
        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-neutral-900 dark:text-white mb-4">
          {t.title}
        </h2>
        <p className="text-base md:text-lg font-medium text-neutral-600 dark:text-neutral-400">
          {t.subtitle}
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-4xl mx-auto z-20 relative">
        {/* ============================================================ */}
        {/* STEP 1 */}
        {/* ============================================================ */}
        <div
          className={`glass-card rounded-3xl overflow-hidden border transition-all duration-500 shadow-xl ${
            activeStep === 1
              ? "bg-linear-to-br from-neutral-500/5 to-neutral-500/5 dark:from-neutral-950/10 dark:to-neutral-950/10 border-neutral-500/20 dark:border-white/10 ring-1 ring-neutral-500/5"
              : completedSteps[1]
                ? "bg-white/5! border-neutral-500/20 dark:bg-neutral-900/50"
                : "bg-white/5! border-black/5 dark:border-white/5 opacity-60"
          }`}
        >
          <button
            onClick={() => setActiveStep(1)}
            className="w-full p-6 md:p-8 flex items-start md:items-center justify-between text-left cursor-pointer transition-colors gap-4"
          >
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div
                className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold text-lg md:text-xl transition-all shrink-0 ${
                  completedSteps[1] || activeStep === 1
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md"
                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                }`}
              >
                {completedSteps[1] ? <FaCheck className="text-sm md:text-base" /> : "1"}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex md:flex-row flex-col md:items-center md:gap-4">
                  <h3 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white leading-tight">
                    {t.step1}
                  </h3>
                  {completedSteps[1] && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-neutral-900/10 dark:bg-white/10 text-neutral-900 dark:text-white text-xs px-2.5 py-1 rounded-full font-bold w-fit">
                        {t.completedBadge}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1 break-all">
                  {completedSteps[1]
                    ? `${t.walletConnected}: ${formatAddress(activeAddress)}`
                    : t.step1Desc}
                </p>
              </div>
            </div>
            <FaChevronDown
              className={`text-neutral-400 text-sm md:text-base transition-transform duration-300 shrink-0 ${
                activeStep === 1 ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence initial={false}>
            {activeStep === 1 && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="overflow-hidden border-t border-black/5 dark:border-white/5"
              >
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        step1Sub === 1 ? "w-10 bg-neutral-900 dark:bg-white" : "w-5 bg-neutral-300 dark:bg-neutral-700"
                      }`}
                    />
                    <span
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        step1Sub === 2 ? "w-10 bg-neutral-900 dark:bg-white" : "w-5 bg-neutral-300 dark:bg-neutral-700"
                      }`}
                    />
                    <span className="text-xs font-bold text-neutral-400 ml-2 uppercase">
                      {locale === "id" ? `Sublangkah ${step1Sub} dari 2` : `Substep ${step1Sub} of 2`}
                    </span>
                  </div>

                  {step1Sub === 1 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="flex flex-col items-center text-center space-y-6 max-w-md mx-auto p-4">
                        <div className="relative w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-white/5 p-3 flex items-center justify-center border border-neutral-200 dark:border-white/10 shadow-sm">
                          <Image src={xverse} alt="Xverse Wallet" width={48} height={48} className="object-contain" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-bold text-lg text-neutral-900 dark:text-white">{t.installTitle}</h4>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                            {t.installDesc}
                          </p>
                        </div>
                        <a
                          href="https://www.xverse.app/download"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-4 py-3.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                        >
                          {t.downloadWallet}
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {step1Sub === 2 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="flex flex-col items-center text-center space-y-6 max-w-md mx-auto p-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-white/5 p-3 flex items-center justify-center border border-neutral-200 dark:border-white/10 shadow-sm">
                            <Image src={xverse} alt="Xverse Wallet" width={48} height={48} className="object-contain" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-2 border-white dark:border-neutral-900 flex items-center justify-center shadow-md">
                            <FaCheck className="text-[10px]" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-bold text-lg text-neutral-900 dark:text-white">{t.detectedTitle}</h4>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                            {t.detectedDesc}
                          </p>
                        </div>

                        {activeAddress ? (
                          <div className="w-full p-4 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl text-sm space-y-3 shadow-sm">
                            <p className="text-neutral-900 dark:text-white font-extrabold flex items-center justify-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white inline-block animate-ping" />
                              {t.walletConnected}
                            </p>
                            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400 select-all p-2 bg-neutral-900/5 dark:bg-neutral-950/30 rounded-lg">
                              {activeAddress}
                            </p>
                            <button
                              onClick={() => {
                                setCompletedSteps((prev) => ({ ...prev, 1: true }));
                                setActiveStep(2);
                              }}
                              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold rounded-xl text-xs md:text-sm transition-all"
                            >
                              {t.proceedToBuy}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleConnect}
                            className="w-full px-4 py-3.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold rounded-xl text-xs md:text-sm transition-all hover:scale-[1.01] active:scale-95 shadow-md cursor-pointer"
                          >
                            {t.connectWallet}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ============================================================ */}
        {/* STEP 2 (buy Bitcoin — real BuyToken component, not a rebuilt copy) */}
        {/* ============================================================ */}
        <div
          className={`glass-card rounded-3xl overflow-hidden border transition-all duration-500 shadow-xl ${
            activeStep === 2
              ? "bg-linear-to-br from-neutral-500/5 to-neutral-500/5 dark:from-neutral-950/10 dark:to-neutral-950/10 border-neutral-500/20 dark:border-white/10 ring-1 ring-neutral-500/5"
              : completedSteps[2]
                ? "bg-white/5! border-neutral-500/20 dark:bg-neutral-900/50"
                : "bg-white/5! border-black/5 dark:border-white/5 opacity-60"
          }`}
        >
          <button
            onClick={() => completedSteps[1] && setActiveStep(2)}
            disabled={!completedSteps[1]}
            className={`w-full p-6 md:p-8 flex items-start md:items-center justify-between text-left transition-colors gap-4 ${
              completedSteps[1] ? "cursor-pointer" : "cursor-not-allowed"
            }`}
          >
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div
                className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold text-lg md:text-xl transition-all shrink-0 ${
                  activeStep === 2
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md"
                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                }`}
              >
                {!completedSteps[1] ? <FaLock className="text-sm" /> : "2"}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <h3 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white leading-tight">
                  {t.step2}
                </h3>
                <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t.step2Desc}</p>
              </div>
            </div>
            {completedSteps[1] && (
              <FaChevronDown
                className={`text-neutral-400 text-sm md:text-base transition-transform duration-300 shrink-0 ${
                  activeStep === 2 ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          <AnimatePresence initial={false}>
            {activeStep === 2 && completedSteps[1] && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="overflow-hidden border-t border-black/5 dark:border-white/5"
              >
                <div className="p-6 md:p-8 [&>div]:max-w-full [&_hr]:hidden">
                  <BuyToken networkOverride="bitcoin" lockToken="BTC" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
