"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Button from "../../../../../subcomponents/Button";
import InformationPopUp from "@/subcomponents/InformationPopUp";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { BETA_MINT_ADDRESS, PORTFOLIO_WEIGHTS } from "./constant";
import { SOL_DATA, USDC_DATA } from "@/components/solana/config/constants";


export default function SolanaBeta({ hideHeader = false }: { hideHeader?: boolean }) {

  const {  locale } = useParams<{ network: any; locale: any }>();

  const {
    connected,
    balance,
    liveTokenPrices,
    liveBetaPrice,
    verifiedTokensData,
    fetchTokenMeta
  } = useSolanaWallet();

  const [activeTab, setActiveTab] = useState<"MINT" | "BURN">("MINT");
  
  const [sellAmount, setSellAmount] = useState(""); 
  const [buyAmount, setBuyAmount] = useState("");

  const [isZapping, setIsZapping] = useState(false);
  const [hoveredAsset, setHoveredAsset] = useState<null | { label: string; value: string; icon?: any }>(null);
  
  const [isMainInfoOpen, setIsMainInfoOpen] = useState(false);
  const [txid, setTxId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const selectedZapToken = USDC_DATA;
  const [allocationList, setAllocationList] = useState<any[]>([]);
  const [betaTokenMeta, setBetaTokenMeta] = useState<any>({ 
    symbol: "BETA", 
    icon: null, 
    mint: BETA_MINT_ADDRESS.toBase58(),
    decimals: 6
  });

  const getTokenBalance = (mint: string) => {
    if (!balance) return 0;
    if (mint === SOL_DATA.mint) return balance.confirmed;
    const token = balance.tokens?.find((t: any) => t.mint === mint);
    return token ? token.amount : 0;
  };

  const betaBalance = getTokenBalance(BETA_MINT_ADDRESS.toBase58());
  const selectedZapTokenBalance = getTokenBalance(selectedZapToken.mint);
  const activeBalance = activeTab === "MINT" ? selectedZapTokenBalance : betaBalance;

  useEffect(() => {
    const resolvePortfolioAssets = async () => {
      if (!fetchTokenMeta) return;
      const chartColors = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EAB308", "#64748B"];

      const resolvedAssets = await Promise.all(
        PORTFOLIO_WEIGHTS.map(async (asset, index) => {
          let meta = verifiedTokensData?.find((t: any) => t.mint === asset.mint);
          
          if (!meta) {
            try {
              meta = await fetchTokenMeta(asset.mint);
            } catch (e) {
              console.warn(`Could not fetch metadata for asset: ${asset.mint}`);
            }
          }

          return {
            mint: asset.mint,
            name: meta?.name || "Unknown Asset",
            symbol: meta?.symbol || "???",
            pct: asset.pct * 100,
            color: chartColors[index % chartColors.length],
            icon: meta?.icon || null,
          };
        })
      );
      setAllocationList(resolvedAssets);
    };
    resolvePortfolioAssets();
  }, [verifiedTokensData, fetchTokenMeta]);

  useEffect(() => {
    const fetchLiveBeta = async () => {
      if (fetchTokenMeta) {
        try {
          const meta = await fetchTokenMeta(BETA_MINT_ADDRESS.toBase58());
          if (meta && meta.icon) {
            setBetaTokenMeta((prev: any) => ({ ...prev, icon: meta.icon, name: meta.name }));
          }
        } catch(e) {}
      }
    };
    fetchLiveBeta();
  }, [fetchTokenMeta]);

  const extractPrice = (p: any) => {
    if (!p) return 0;
    return parseFloat(typeof p === "object" ? p.usdPrice || p.price : p) || 0;
  };

  const zapTokenPrice = extractPrice(liveTokenPrices[selectedZapToken.mint]) || extractPrice(selectedZapToken) || 1.00; 
  const betaPrice = liveBetaPrice > 0 ? liveBetaPrice : 1.00; 

  const getUsdValue = () => {
    const num = parseFloat(sellAmount) || 0;
    return activeTab === "MINT" ? (num * zapTokenPrice).toFixed(2) : (num * betaPrice).toFixed(2);
  };

  const sellToken = activeTab === "BURN" ? betaTokenMeta : selectedZapToken;
  const buyToken = activeTab === "BURN" ? selectedZapToken : betaTokenMeta;
  const usdValue = getUsdValue();
  const showAllocation = (parseFloat(sellAmount) || 0) > 0 || (parseFloat(buyAmount) || 0) > 0;

  const handleSellChange = (val: string) => {
    if (!/^[0-9]*\.?[0-9]*$/.test(val) && val !== "") return;
    setSellAmount(val);
    
    const num = parseFloat(val) || 0;
    if (num > 0) {
      if (activeTab === "MINT") {
        const expectedBeta = (num * zapTokenPrice) / betaPrice;
        setBuyAmount((expectedBeta * 1).toFixed(6).replace(/\.?0+$/, "")); 
      } else {
        const expectedUsdc = (num * betaPrice) / zapTokenPrice;
        setBuyAmount(expectedUsdc.toFixed(6).replace(/\.?0+$/, ""));
      }
    } else {
      setBuyAmount("");
    }
  };

  const handleBuyChange = (val: string) => {
    if (!/^[0-9]*\.?[0-9]*$/.test(val) && val !== "") return;
    setBuyAmount(val);
    
    const num = parseFloat(val) || 0;
    if (num > 0) {
      if (activeTab === "MINT") {
        const expectedBetaGross = num / 1;
        const requiredUsdc = (expectedBetaGross * betaPrice) / zapTokenPrice;
        setSellAmount(requiredUsdc.toFixed(6).replace(/\.?0+$/, ""));
      } else {
        const requiredBeta = (num * zapTokenPrice) / betaPrice;
        setSellAmount(requiredBeta.toFixed(6).replace(/\.?0+$/, ""));
      }
    } else {
      setSellAmount("");
    }
  };

  const handlePercentage = (pct: number) => {
    if (!connected) return;
    let targetAmount = activeBalance * pct;
    
    if (pct !== 1) {
      const factor = Math.pow(10, activeTab === "MINT" ? selectedZapToken.decimals : 6);
      targetAmount = Math.floor(targetAmount * factor) / factor;
    }
    
    handleSellChange(targetAmount > 0 ? targetAmount.toString() : "");
  };

  const handleZap = async () => {
    return; 
  };

  let buttonText = "";
  if (!connected) {
    buttonText = locale === "en" ? "Wallet Not Connected" : "Dompet Tidak Terhubung";
  } else {
    buttonText = locale === "en" ? "Minting Coming Soon" : "Minting Segera Hadir";
  }

  return (
    <>
      <div className="flex flex-col gap-5 font-sans pb-40 lg:pb-32">
        <div className="glass-card px-4 py-6 rounded-xl flex flex-col gap-5 shadow-xl backdrop-blur-md">
          {/* Header */}
          <div>
            <div className={`flex items-center px-1 ${hideHeader ? "justify-end" : "justify-between"}`}>
              {!hideHeader && (
                <h2 className="font-bold text-lg sm:text-xl text-current">
                  {locale === "id" ? "Mint Token $BETA" : "Mint $BETA Token"}
                </h2>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMainInfoOpen(true)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all active:scale-90"
                >
                  <Icon icon="mingcute:information-line" className="text-xl sm:text-2xl opacity-70" />
                </button>
              </div>
            </div>

            {/* MARKETING DESCRIPTION */}
            {!hideHeader && (
              <p className="pt-3 text-xs sm:text-sm opacity-60 leading-relaxed px-1 -mt-2">
                {locale === "en"
                  ? "Gain exposure to a diversified, institutional-grade index of US equities, Gold, Bitcoin, and Stablecoins in a single on-chain transaction. Simulate a deposit below to view the real-time index allocation!"
                  : "Dapatkan eksposur ke indeks saham AS, Emas, Bitcoin, dan Stablecoin yang terdiversifikasi dalam satu transaksi on-chain. Simulasikan deposit di bawah untuk melihat alokasi indeks secara real-time!"}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex justify-between glass-card rounded-full border-black/5 dark:border-white/10 p-1 shadow-sm mt-1">
            {[
              { label:"Mint", id: "MINT" }, 
              { label: "Burn" , id: "BURN" }
            ].map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => { 
                  setActiveTab(tab.id as any); 
                  setSellAmount(""); 
                  setBuyAmount(""); 
                }}
                className={`w-full p-2.5 text-center rounded-full text-xs sm:text-sm transition-all duration-200 cursor-pointer ${activeTab === tab.id ? 'font-bold bg-solana! text-white shadow-md' : 'font-medium hover:bg-solana/10 opacity-60'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* COMING SOON ALERT */}
          <div className="mx-2 p-4 rounded-xl bg-orange-500/10 border-l-2 border-orange-500 flex gap-3 items-start">
            <Icon icon="solar:danger-triangle-bold" className="text-orange-500 text-xl shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                {locale === "en" ? "Launch Pending" : "Menunggu Peluncuran"}
              </span>
              <p className="text-xs sm:text-sm leading-relaxed text-orange-600 dark:text-orange-400 opacity-90">
                {locale === "en"
                  ? "The $BETA index protocol will be fully activated as soon as underlying synthetic assets (e.g., VTx, IEMGx) are successfully has liquidity and settled on the Solana mainnet."
                  : "Protokol indeks $BETA akan diaktifkan secara penuh segera setelah aset sintetis yang mendasarinya (seperti VTx, IEMGx) berhasil memiliki likuiditas dan lancar di mainnet Solana."}
              </p>
            </div>
          </div>

          {/* Stacked Swap Interface */}
          <div className="flex flex-col gap-3 mt-1">
            
            {/* SELL SECTION (Top Input) */}
            <div className="relative z-10 glass-card rounded-2xl border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 shadow-sm transition-all duration-300">
              <div className="py-4 px-4 md:py-6 md:px-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                    {locale === "en" ? (activeTab === "BURN" ? "Burn Token" : "Deposit Asset") : (activeTab === "BURN" ? "Bakar Token" : "Setor Aset")}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium opacity-60">
                    <Icon icon="solar:wallet-bold" className="text-base" />
                    <span>Balance: {activeBalance} {sellToken.symbol}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex flex-col flex-1 min-w-0">
                    {/* FULLY INTERACTIVE SELL INPUT */}
                    <input 
                      type="text" 
                      inputMode="decimal"
                      value={sellAmount} 
                      onChange={(e) => handleSellChange(e.target.value)}
                      className="w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none border-none truncate text-solana transition-all focus:scale-[1.02] transform origin-left" 
                      placeholder="0" 
                    />
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 glass-card rounded-full shadow-md bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/10 cursor-default">
                    <div className="relative w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-full overflow-hidden shrink-0">
                      {sellToken.icon ? (
                        <Image src={sellToken.icon} alt={sellToken.symbol} fill className="object-cover" unoptimized />
                      ) : (
                        <span className="font-bold text-[10px] opacity-50">{sellToken.symbol.charAt(0)}</span>
                      )}
                    </div>
                    <span className="font-bold text-sm sm:text-base pr-1">{sellToken.symbol}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight">≈ ${usdValue}</span>
                  <div className="flex gap-1.5">
                    {[0.25, 0.5, 1].map((pct) => {
                      let targetAmount = activeBalance * pct;
                      if (pct !== 1) {
                        const factor = Math.pow(10, activeTab === "MINT" ? selectedZapToken.decimals : 6);
                        targetAmount = Math.floor(targetAmount * factor) / factor;
                      }

                      const isMatch = sellAmount && parseFloat(sellAmount) === parseFloat(targetAmount.toString());

                      return (
                        <button 
                          key={pct} 
                          onClick={() => handlePercentage(pct)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95 ${
                            isMatch
                              ? "bg-solana text-white shadow-lg shadow-solana/20"
                              : "bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 opacity-60"
                          }`}
                        >
                          {pct === 1 ? "MAX" : `${pct * 100}%`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

          <AnimatePresence>
              {!showAllocation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="h-0 flex items-center justify-center z-20 pointer-events-none"
                >
                  <div className="w-10 h-10 rounded-xl glass-card shadow-2xl flex items-center justify-center text-white transform scale-75 md:scale-85 bg-solana!">
                    <Icon icon="solar:arrow-down-linear" className="text-xl" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Allocation Breakdown */}
            <AnimatePresence>
              {showAllocation && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: 10 }} 
                  animate={{ opacity: 1, height: "auto", y: 0 }} 
                  exit={{ opacity: 0, height: 0, y: 10 }} 
                  transition={{ duration: 0.3 }} 
                  className="overflow-hidden"
                >
                  <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-6 border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 shadow-sm">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                        {activeTab === "MINT"
                          ? (locale === "en" ? "Real-Time Portfolio Allocation" : "Alokasi Portofolio Real-Time")
                          : (locale === "en" ? "Underlying Asset Unwrapping" : "Pembongkaran Aset Mendasar")
                        }
                      </p>
                    </div>

                    <div className="flex flex-col gap-6 py-2">
                      <div className="flex flex-col gap-4">
                        {/* Hoverable Allocation Bar */}
                        <div className="flex h-1.5 sm:h-2 w-full rounded-full overflow-hidden bg-black/5 dark:bg-white/5 border border-white/5 gap-0.5">
                          {allocationList.map((item, i) => (
                            <motion.div key={i} className="h-full cursor-pointer relative" style={{ width: `${item.pct}%`, backgroundColor: item.color }} onMouseEnter={() => setHoveredAsset({ label: item.symbol, value: `${item.pct}%`, icon: item.icon })} onMouseLeave={() => setHoveredAsset(null)} whileHover={{ scaleY: 3, filter: "brightness(1.2)", zIndex: 10 }} />
                          ))}
                        </div>

                        {/* Interactive Tooltip Card */}
                        <div className="h-16 flex items-center justify-center glass-card rounded-2xl border border-white/5 relative overflow-hidden">
                          <AnimatePresence mode="wait">
                            {hoveredAsset ? (
                              <motion.div key={hoveredAsset.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="flex items-center gap-4">
                                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white/20 bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                                  {hoveredAsset.icon ? (
                                    <Image src={hoveredAsset.icon} alt={hoveredAsset.label} fill className="object-cover" unoptimized />
                                  ) : (
                                    <span className="font-bold text-sm opacity-50">{hoveredAsset.label.charAt(0)}</span>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs sm:text-sm font-bold text-dark">{hoveredAsset.label}</span>
                                  <span className="text-xs font-black opacity-40 uppercase">{hoveredAsset.value} Portfolio Weight</span>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                                <span className="text-xs sm:text-sm font-bold opacity-40 text-center">
                                  {locale === "en" ? "Hover over the bar to inspect assets" : "Arahkan kursor ke bar untuk melihat aset"}
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Asset Grid Breakdown */}
                      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {allocationList.map((item, i) => {
                          const allocatedUsd = (parseFloat(usdValue) || 0) * (item.pct / 100);
                          return (
                            <div key={i} className="flex flex-col p-3 rounded-2xl glass-card relative overflow-hidden border border-black/5 dark:border-white/5">
                              <div className="relative z-10 flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="relative w-6 h-6 rounded-full overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                                    {item.icon ? (
                                      <Image src={item.icon} alt={item.symbol} fill className="object-cover" unoptimized />
                                    ) : (
                                      <span className="font-bold text-xs opacity-50">{item.symbol.charAt(0)}</span>
                                    )}
                                  </div>
                                  <span className="text-md sm:text-lg font-bold ">{item.symbol}</span>
                                </div>
                                <span className="text-lg font-black text-dark">{item.pct}%</span>
                              </div>
                              <div className="relative z-10 flex flex-col">
                                <span className="text-xs font-bold opacity-30 uppercase tracking-wider">{item.name}</span>
                                <span className="text-sm font-black truncate">${allocatedUsd.toFixed(2)}</span>
                              </div>
                              <motion.div initial={{ height: 0 }} animate={{ height: `${item.pct}%` }} className="absolute bottom-0 left-0 right-0 pointer-events-none opacity-[0.15]" style={{ background: `linear-gradient(to top, ${item.color}, transparent)` }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* BUY SECTION (Bottom Input) */}
            <div className="relative z-10 glass-card rounded-2xl border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 p-4 md:p-6 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                  {locale === "en" ? "You Receive" : "Kamu Terima"}
                </span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium opacity-60">
                  <Icon icon="solar:wallet-bold" className="text-base" />
                  <span>Balance: {getTokenBalance(buyToken.mint)} {buyToken.symbol}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex flex-col flex-1 min-w-0">
                  {/* FULLY INTERACTIVE BUY INPUT */}
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={buyAmount} 
                    onChange={(e) => handleBuyChange(e.target.value)}
                    className="w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none border-none truncate text-current transition-all focus:scale-[1.02] transform origin-left" 
                    placeholder="0" 
                  />
                </div>

                <div className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 glass-card rounded-full shadow-md bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/10 cursor-default">
                  <div className="relative w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-full overflow-hidden shrink-0">
                    {buyToken.icon ? (
                      <Image src={buyToken.icon} alt={buyToken.symbol} fill className="object-cover" unoptimized />
                    ) : (
                      <span className="font-bold text-[10px] opacity-50">{buyToken.symbol.charAt(0)}</span>
                    )}
                  </div>
                  <span className="font-bold text-sm sm:text-base pr-1">{buyToken.symbol}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight">≈ ${usdValue}</span>
              </div>
            </div>
          </div>

          {/* DISABLED ACTION BUTTON */}
          <Button buttonText={buttonText} onClick={handleZap} chain="solana" disabled={true} />
        </div>
      </div>

      {/* --- INFO POPUP --- */}
      <InformationPopUp
        isOpen={isMainInfoOpen}
        onClose={() => setIsMainInfoOpen(false)}
        title={locale === "id" ? "Mint Token $BETA" : "Mint $BETA Token"}
        image={null}
        description={
          locale === "en"
            ? "BETA is a tokenized portfolio asset designed to simplify long-term wealth preservation. \n\nBy minting $BETA, your deposit is seamlessly distributed into an institutional-grade index of US equities, Gold, Bitcoin, and Stablecoins, 100% on-chain."
            : "BETA adalah aset portofolio yang ditokenisasi untuk menyederhanakan penyimpanan kekayaan jangka panjang. \n\nDengan mencetak $BETA, depositmu akan otomatis didistribusikan ke dalam indeks saham AS, Emas, Bitcoin, dan Stablecoin dengan standar institusi, 100% on-chain."
        }
      />
    </>
  );
}