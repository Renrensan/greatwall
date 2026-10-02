"use client";

import { useState, useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { AnimatedModal } from "../../../../../subcomponents/AnimatedModal";
import ButtonContrast from "../../../../../subcomponents/ButtonContrast";
import Button from "../../../../../subcomponents/Button";
import InformationPopUp from "@/subcomponents/InformationPopUp";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useTranslations } from "next-intl";

import {  SOL_DATA, SOLANA_NATIVE_MINT, USDC_DATA } from "@/components/solana/config/constants";
import { getClampedPercentage } from "@/components/solana/config/helpers";
// This feature trades through the identical fetchSwapQuote/jupiter-swap backend as
// SolanaSwap.tsx (see the comment near its quote-fetching effect below), so it's charged the
// same platform fee rate — reused from there rather than duplicated as a second constant.
import { PARADAPP_JUPITER_FEE } from "../solana-swap/constant";



export default function SolanaStocks({ hideHeader = false }: { hideHeader?: boolean }) {
  const t = useTranslations("All");
  const { network, locale } = useParams<{ network: any; locale: any }>();

  const colorFlip = (network === 'hedera' || network === 'polkadot') ? 'text-black dark:text-white' : (network === "base" ? "text-[#0052FF]" : `text-${network}`);
  
  const { 
    connected, balance, fetchSwapQuote, executeSwap, 
    fetchStockAssets, liveTokenPrices, verifiedTokensData, networkExplorer , setIsUltraFast, isUltraFast
  } = useSolanaWallet();

  const [searchQueryStock, setSearchQueryStock] = useState("");
  const [stocksData, setStocksData] = useState<any[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [isMainInfoOpen, setIsMainInfoOpen] = useState(false);

const [isMainModalOpen, setIsMainModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"form" | "selectToken">("form");
  const [activeSelect, setActiveSelect] = useState<"sell" | "buy" | null>(null);
  const [searchQueryToken, setSearchQueryToken] = useState("");
  
  const [activeInput, setActiveInput] = useState<"sell" | "buy">("sell");
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");


  const [sellToken, setSellToken] = useState<any>(null);
  const [buyToken, setBuyToken] = useState<any>(null);


  const [quoteData, setQuoteData] = useState<any>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [txid, setTxId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingStocks(true);
      if (fetchStockAssets) {
        const stocks = await fetchStockAssets();
        setStocksData(stocks);
      }
      

     
      
      setIsLoadingStocks(false);
    };
    loadInitialData();
    
    const interval = setInterval(() => {
      if (fetchStockAssets) {
        fetchStockAssets().then(setStocksData);
      }
    }, 60000); 
    return () => clearInterval(interval);
  }, []);

  const filteredStocks = useMemo(() => {
    if (!searchQueryStock) return stocksData;
    const query = searchQueryStock.toLowerCase();
    
    return stocksData.filter((stock) =>
      (stock?.symbol?.toLowerCase() || "").includes(query) ||
      (stock?.name?.toLowerCase() || "").includes(query)
    );
  }, [searchQueryStock, stocksData]);

const combinedTokenList = useMemo(() => {
    const tokenMap = new Map();
    
    tokenMap.set(USDC_DATA.mint, USDC_DATA);
    tokenMap.set(SOL_DATA.mint, SOL_DATA);

    if (balance?.tokens && verifiedTokensData && verifiedTokensData.length > 0) {
      balance.tokens.forEach((userToken: any) => {
        if (userToken.amount > 0 && !tokenMap.has(userToken.mint)) {
          const meta = verifiedTokensData.find((vt: any) => vt.mint === userToken.mint);
          if (meta) {
            tokenMap.set(meta.mint, meta);
          }
        }
      });
    }

    stocksData.forEach(stock => {
      if (!tokenMap.has(stock.mint)) {
        tokenMap.set(stock.mint, stock);
      }
    });

    const allTokens = Array.from(tokenMap.values());

    if (!searchQueryToken) return allTokens;
    const query = searchQueryToken.toLowerCase();
    
    return allTokens.filter((t) => 
      (t?.symbol?.toLowerCase() || "").includes(query) ||
      (t?.name?.toLowerCase() || "").includes(query)
    );
  }, [stocksData, verifiedTokensData, balance?.tokens, searchQueryToken]);
  const getTokenBalance = (mint: string, swapable?: boolean) => {
    if (!balance) return 0;
    if (mint === SOL_DATA.mint) return swapable ? balance.swapable || 0 :  balance.confirmed;
    const token = balance.tokens?.find((t: any) => t.mint === mint);
    return token ? token.amount : 0;
  };

  const sellBalance = getTokenBalance(sellToken?.mint, false);
  const isInsufficientBalance = connected && sellAmount && parseFloat(sellAmount) > sellBalance;

  // Shared by handlePercentage (which actually sets the amount) and the percentage buttons'
  // own "is this one currently selected" check further down — extracted into one function so
  // those two can't drift out of sync the way SolanaStake.tsx's equivalent used to.
  const computeSellTargetForPercentage = (pct: number): number => {
    if (!sellToken || isNaN(sellBalance)) return 0;

    // Total deducted for a p% click is p% of the sell-token balance, not the full balance —
    // network fee and ATA rent (both fixed, from the most recently fetched quote) are
    // subtracted from that scaled amount, and the platform fee (proportional to the sell
    // amount, PARADAPP_JUPITER_FEE) is solved out the same way Stake/Send do: sellAmount +
    // sellAmount*rate + networkFee + ataFee = balance*pct, so sellAmount = netAvailable /
    // (1 + rate). Previously pct === 1 (Max) returned the raw, unadjusted balance — since the
    // fee for ANY sell token here is paid out of that same balance, Max always proposed an
    // amount that couldn't actually cover its own fees.
    const networkFee = quoteData?.networkFeeUi ?? 0;
    const ataFee = quoteData?.ataFeeUi ?? 0;
    const scaledBalance = sellBalance * pct;
    const netAvailable = Math.max(0, scaledBalance - networkFee - ataFee);
    const rawTarget = netAvailable / (1 + PARADAPP_JUPITER_FEE);
    return getClampedPercentage(rawTarget, 1, sellToken.decimals);
  };

  const handlePercentage = (pct: number) => {
    if (!connected || !sellToken) return;

    const targetAmount = computeSellTargetForPercentage(pct);

    setActiveInput("sell");
    setSellAmount(targetAmount > 0 ? targetAmount.toString() : "");
  };

const getUsdValue = (mint: string, amount: string) => {
    if (!amount || isNaN(parseFloat(amount))) return "0.00";
    
    let tokenPriceUsd = liveTokenPrices[mint]?.usdPrice || liveTokenPrices[mint]?.price;
    if (!tokenPriceUsd) {
      const activeToken = mint === sellToken?.mint ? sellToken : buyToken;
      tokenPriceUsd = activeToken?.usdPrice || activeToken?.price || 0;
    }
    
    if (tokenPriceUsd > 0) {
      return Number((parseFloat(amount) * tokenPriceUsd).toFixed(2)).toLocaleString(
        locale == "id" ? "id-ID" : "en-US"
      );
    }
    return "0.00"; 
  };

  useEffect(() => {
    // An AbortController instead of a bare boolean flag: besides gating which result gets
    // applied, its signal is threaded all the way down to the Jupiter fetch calls
    // (fetchSwapQuote -> getGaslessQuoteAndFee -> fetchJupiterWithRetry), so changing the
    // input again actually cancels the in-flight request instead of just letting it finish
    // in the background and discarding the result.
    const controller = new AbortController();

    const fetchQuote = async () => {
      if (!sellToken || !buyToken) return;

      if (activeInput === "sell") {
        const amountNum = parseFloat(sellAmount);
        if (isNaN(amountNum) || amountNum <= 0 || sellToken.mint === buyToken.mint) {
          setBuyAmount("");
          setQuoteData(null);
          // A fetch could already be in flight (isFetchingQuote true) when the input is
          // cleared/zeroed before it resolves — without this, that fetch's own `finally`
          // never runs (it checks the abort signal and bails), so the button was stuck on
          // "Finding Best Price..." forever with nothing left to fetch.
          setIsFetchingQuote(false);
          return;
        }

        setIsFetchingQuote(true);
        try {
          const amountInSmallestUnit = Math.floor(amountNum * Math.pow(10, sellToken.decimals));
          const quote = await fetchSwapQuote(sellToken.mint, buyToken.mint, amountInSmallestUnit, amountNum, "ExactIn", sellToken.decimals, controller.signal);

          if (controller.signal.aborted) return;

          if (quote && quote.success && quote.quote) {
            setQuoteData(quote.quote);
            const outUi = Number(quote.quote.outAmount) / Math.pow(10, buyToken.decimals);
            setBuyAmount(outUi.toString());
          } else {
            setBuyAmount("");
            setQuoteData(null);
          }
        } catch (e) {
          console.error("Quote error", e);
        } finally {
          if (!controller.signal.aborted) setIsFetchingQuote(false);
        }
      } else if (activeInput === "buy") {
        const amountNum = parseFloat(buyAmount);
        if (isNaN(amountNum) || amountNum <= 0 || sellToken.mint === buyToken.mint) {
          setSellAmount("");
          setQuoteData(null);
          setIsFetchingQuote(false);
          return;
        }

        setIsFetchingQuote(true);
        try {
          const amountInSmallestUnit = Math.floor(amountNum * Math.pow(10, buyToken.decimals));
          // inputDecimals must be the SELL token's decimals, not buyToken.decimals above —
          // that one only sizes the ExactOut "amount" param Jupiter expects; the fee/rent
          // math inside getGaslessQuoteAndFee needs the actual input mint's decimal scale.
          const quote = await fetchSwapQuote(sellToken.mint, buyToken.mint, amountInSmallestUnit, amountNum, "ExactOut", sellToken.decimals, controller.signal);

          if (controller.signal.aborted) return;

          if (quote && quote.success && quote.quote) {
            setQuoteData(quote.quote);
            const inUi = Number(quote.quote.inAmount) / Math.pow(10, sellToken.decimals);
            setSellAmount(inUi.toString());
          } else {
            setSellAmount("");
            setQuoteData(null);
          }
        } catch (e) {
          console.error("Quote error", e);
        } finally {
          if (!controller.signal.aborted) setIsFetchingQuote(false);
        }
      }
    };

    const delayDebounceFn = setTimeout(fetchQuote, 500);
    return () => {
      controller.abort();
      clearTimeout(delayDebounceFn);
    };

  }, [activeInput === "sell" ? sellAmount : buyAmount, activeInput, sellToken?.mint, buyToken?.mint, sellToken?.decimals, buyToken?.decimals, fetchSwapQuote]);

  const handleSwap = async () => {
    if (!quoteData || !sellAmount || isInsufficientBalance || !sellToken) return;
    
    setIsSwapping(true);
    try {
      const txSignature = await executeSwap(quoteData, sellToken.mint, isUltraFast);
      
      if (txSignature) {
        setTxId(txSignature); 
        setShowSuccessModal(true);
        setSellAmount("");
        setBuyAmount("");
        setActiveInput("sell");
        setQuoteData(null);
       setIsMainModalOpen(false)
      } else {
        setShowErrorModal(true);
      }
    } catch (e) {
      console.error(e);
      setShowErrorModal(true);
    } finally {
      setIsSwapping(false);
    }
  };

const handleOpenBuyModal = (stock?: any) => {
    setSellToken(SOL_DATA); 
    if (stock) {
      setBuyToken(stock);
    } else if (stocksData.length > 0) {
      setBuyToken(stocksData[0]);
    }
    setSellAmount("");
    setBuyAmount("");
    
    setModalStep("form");
    setIsMainModalOpen(true);
  };

  const flipTokens = () => {
    const tempToken = sellToken;
    const tempAmount = sellAmount;
    setSellToken(buyToken);
    setBuyToken(tempToken);
    setSellAmount(buyAmount);
    setBuyAmount(tempAmount);
    setActiveInput(activeInput === "sell" ? "buy" : "sell");
    setQuoteData(null);
  };

const selectToken = (token: any) => {
    if (activeSelect === "sell") {
      if (token.mint === buyToken?.mint) flipTokens();
      else setSellToken(token);
    } else {
      if (token.mint === sellToken?.mint) flipTokens();
      else setBuyToken(token);
    }
    setSearchQueryToken("");
    setModalStep("form"); 
  };

  const exchangeRate = useMemo(() => {
    if (!sellAmount || !buyAmount || parseFloat(buyAmount) <= 0 || !sellToken || !buyToken) return null;
    const rate = parseFloat(buyAmount) / parseFloat(sellAmount);
    return `1 ${sellToken.symbol} ≈ ${rate.toFixed(6)} ${buyToken.symbol}`;
  }, [sellAmount, buyAmount, sellToken?.symbol, buyToken?.symbol]);

  const isAmountEntered = (sellAmount && parseFloat(sellAmount) > 0) || (buyAmount && parseFloat(buyAmount) > 0);
  let buttonText = "";
  let isButtonDisabled = true;

  if (!connected) {
    buttonText = locale === "en" ? "Wallet Not Connected" : "Dompet Tidak Terhubung";
  } else if (isSwapping) {
    buttonText = locale === "en" ? "Processing..." : "Memproses...";
  } else if (isFetchingQuote) {
    buttonText = locale === "en" ? "Finding Best Price..." : "Mencari Harga Terbaik...";
  } else if (!isAmountEntered) {
    buttonText = locale === "en" ? "Enter Amount" : "Masukkan Jumlah";
  } else if (isInsufficientBalance) {
    buttonText = locale === "en" ? "Insufficient Balance" : "Saldo Tidak Cukup";
  } else if (!quoteData) {
    buttonText = locale === "en" ? "No Route Found" : "Tidak Ada Rute";
  } else {
    buttonText = locale === "en" ? "Confirm Trade" : "Konfirmasi Perdagangan";
    isButtonDisabled = false; 
  }

  return (
    <>
      <div className="glass-card px-4 py-6 rounded-xl flex flex-col gap-5 shadow-xl backdrop-blur-md mb-32">
        
   {/* Dynamic Headline & Description */}
        <div>
          <div className={`flex items-center px-1 ${hideHeader ? 'justify-end' : 'justify-between'}`}>
            {!hideHeader && (
              <h2 className="font-bold text-lg sm:text-xl">
                {locale === "en" ? "Tokenized US Stocks" : "Tokenisasi Saham AS"}
              </h2>
            )}
            <button onClick={() => setIsMainInfoOpen(true)} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all active:scale-90">
              <Icon icon="mingcute:information-line" className="text-xl sm:text-2xl" />
            </button>
          </div>
        </div>
        
        {!hideHeader && (
          <p className="pt-3 text-xs sm:text-sm opacity-60 leading-relaxed px-1 -mt-2">
            {locale === "en"
              ? "Access the US stock market directly on Solana. Tokenize your favorite stocks and trade them 24/7 with instant settlement and fractional ownership."
              : "Akses pasar saham AS langsung di Solana. Tokenisasi saham favorit Anda dan perdagangkan 24/7 dengan penyelesaian instan dan kepemilikan fraksional."}
          </p>
        )}
        

        {/* Search Component */}
        <div className="relative group/search mt-4">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Icon icon="solar:magnifer-linear" className="text-xl opacity-40 group-focus-within/search:opacity-100 group-focus-within/search:text-solana transition-all" />
          </div>
          <input
            type="text"
            value={searchQueryStock}
            onChange={(e) => setSearchQueryStock(e.target.value)}
            placeholder={locale === "en" ? "Search stocks..." : "Cari saham..."}
            className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium outline-none focus:border-solana/50 focus:bg-solana/5 transition-all backdrop-blur-sm"
          />
          {searchQueryStock && (
            <button
              onClick={() => setSearchQueryStock("")}
              className="absolute inset-y-0 right-4 flex items-center opacity-40 hover:opacity-100 transition-opacity"
            >
              <Icon icon="solar:close-circle-linear" className="text-xl" />
            </button>
          )}
        </div>

        {/* Tokenized Stocks Section - Max Height Container acts as scroll window */}
        <div className="flex flex-col gap-6 rounded-2xl relative overflow-hidden group/card mt-4">
          <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            
            {/* SKELETON LOADER: Shows while fetching data */}
            {isLoadingStocks ? (
              [...Array(5)].map((_, i) => (
                <div key={`skeleton-${i}`} className="flex items-center justify-between p-3 rounded-2xl animate-pulse">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="w-14 h-14 rounded-full bg-black/10 dark:bg-white/10 shrink-0" />
                    <div className="flex flex-col items-start gap-2">
                      <div className="h-5 w-16 bg-black/10 dark:bg-white/10 rounded" />
                      <div className="h-3 w-28 bg-black/10 dark:bg-white/10 rounded" />
                      <div className="h-2 w-12 bg-black/10 dark:bg-white/10 rounded" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="h-5 w-20 bg-black/10 dark:bg-white/10 rounded" />
                    <div className="h-4 w-14 bg-black/10 dark:bg-white/10 rounded-full" />
                  </div>
                </div>
              ))
            ) : filteredStocks.length > 0 ? (
              filteredStocks.map((stock, index) => {
                const isNegative = stock.change24h < 0;
                
                return (
                <motion.div
                  // stocksData refetches every 60s; an index key would tie row identity to
                  // position instead of the stock itself, replaying this entrance animation
                  // if the fetched order ever shifts between polls.
                  key={stock.mint || stock.symbol}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 > 0.5 ? 0.1 : index * 0.1, duration: 0.4 }}
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenBuyModal(stock)}
                  className="flex items-center justify-between p-3 rounded-2xl group/item cursor-pointer hover:bg-black/3 dark:hover:bg-white/3 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 sm:gap-5">
                    {/* Technical Logo Frame with Cardinal Notches */}
                    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                      <div className="absolute inset-0 rounded-full border border-solana/20 group-hover/item:border-solana/50 transition-colors opacity-30" />
                      <div className="absolute top-0 w-3 h-1 bg-current opacity-20 dark:opacity-40 rounded-full group-hover/item:opacity-80 transition-opacity" />
                      <div className="absolute bottom-0 w-3 h-1 bg-current opacity-20 dark:opacity-40 rounded-full group-hover/item:opacity-80 transition-opacity" />
                      <div className="absolute left-0 h-3 w-1 bg-current opacity-20 dark:opacity-40 rounded-full group-hover/item:opacity-80 transition-opacity" />
                      <div className="absolute right-0 h-3 w-1 bg-current opacity-20 dark:opacity-40 rounded-full group-hover/item:opacity-80 transition-opacity" />

                      <div className="w-11 h-11 rounded-full overflow-hidden shadow-xl border border-white/10 relative z-10 flex items-center justify-center bg-black/5 dark:bg-white/5 transition-transform duration-500 group-hover/item:scale-110">
                        {stock.icon ? (
                           <Image src={stock.icon} alt={stock.name} fill className="object-cover" unoptimized />
                        ) : (
                           <span className="font-bold text-lg opacity-50">
                             {stock.symbol ? stock.symbol.charAt(0).toUpperCase() : "?"}
                           </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-bold text-lg sm:text-xl tracking-tight group-hover/item:text-solana transition-colors leading-none">
                        {stock.symbol}
                      </span>
                      <span className="text-xs sm:text-sm font-medium opacity-60 truncate max-w-[100px] sm:max-w-[400px] leading-tight">
                        {stock.name}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40 leading-none mt-0.5">
                        CAP {stock.formattedMcap}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="font-black text-lg sm:text-xl tracking-tighter">
                      {stock.formattedPrice}
                    </span>
                    <div
                      className={`flex items-center gap-1 text-xs sm:text-sm font-black px-2 py-0.5 rounded-full ${
                        isNegative ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-400"
                      }`}
                    >
                      <Icon
                        icon={isNegative ? "solar:graph-down-bold" : "solar:graph-up-bold"}
                        className="text-[10px]"
                      />
                      {stock.formattedChange}
                    </div>
                  </div>
                </motion.div>
              )})
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-40 gap-3">
                <Icon icon="solar:box-minimalistic-linear" className="text-5xl" />
                <p className="text-sm font-bold uppercase tracking-widest">
                  {locale === "en" ? "No stocks found" : "Saham tidak ditemukan"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button chain="solana" buttonText={locale === "en" ? "Trade US Stock" : "Perdagangkan Saham AS"} onClick={() => handleOpenBuyModal()} />
     
      </div>

      {/* --- UNIFIED MULTI-STEP MODAL --- */}
      <AnimatedModal
        isOpen={isMainModalOpen}
        onClose={() => setIsMainModalOpen(false)}
        maxWidthClass="lg:w-150"
      >
        <div className="flex flex-col p-6 overflow-x-hidden overflow-y-auto custom-scrollbar flex-1 max-h-[80vh] min-h-[60vh]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: MAIN TRADING ENGINE */}
            {modalStep === "form" && (
              <motion.div
                key="form-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full gap-5"
              >
                <div className="flex flex-col gap-0">
                  <h2 className="text-xl font-bold">
                    {locale === "en" ? "Trade Tokenized Stock" : "Perdagangkan Saham Tokenisasi"}
                  </h2>
                  <p className="text-[12px] opacity-70">
                    {locale === "en"
                      ? "Seamlessly trade US stocks on-chain with instant settlement."
                      : "Perdagangkan saham AS secara on-chain dengan penyelesaian instan."}
                  </p>
                </div>

                {/* Speed Toggle */}
                <div className="flex justify-end items-center gap-2.5">
                  <div className="flex items-center gap-1.5 opacity-50">
                    <Icon icon="solar:bolt-circle-linear" className={isUltraFast ? "text-solana" : ""} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {locale === "en" ? "Ultra Fast" : "Sangat Cepat"}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsUltraFast(!isUltraFast)}
                    className={`relative w-10 h-5.5 rounded-full transition-all focus:outline-none p-1 ${
                      isUltraFast ? "bg-solana" : "bg-gray-300 dark:bg-white/10"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${isUltraFast ? "translate-x-4.5" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="relative flex flex-col gap-2">
                  
                  {/* Sell Section */}
                  <div className={`glass-card rounded-2xl p-4 border shadow-sm transition-all ${isFetchingQuote && activeInput === 'sell' ? 'border-solana/30 bg-solana/5' : 'border-black/5 dark:border-white/5 bg-black/3 dark:bg-white/5'}`}>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                          {locale === "en" ? "You Pay" : "Kamu Bayar"}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold opacity-60 group relative">
                          <Icon icon="solar:wallet-linear" />
                          <span>{connected && sellToken ? sellBalance.toString() : "0"} {sellToken?.symbol || ""}</span>
                          
                        
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center gap-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`bg-transparent border-none outline-none text-2xl font-bold w-full transition-all ${isFetchingQuote && activeInput === 'buy' ? 'opacity-30 animate-pulse text-solana' : 'text-solana'}`}
                          value={sellAmount}
                          placeholder="0"
                          onChange={(e) => {
                         

                             setActiveInput("sell");
                         const val = e.target.value;
                  if (/^[0-9]*\.?[0-9]*$/.test(val) || val === "")
                    setSellAmount(val);

                          }}
                          disabled={isSwapping || !sellToken}
                        />
                        
                        {/*  Opens Token Selector Step */}
                        <button
                          onClick={() => { setActiveSelect("sell"); setModalStep("selectToken"); }}
                          disabled={!sellToken}
                          className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 glass-card rounded-full border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                        >
                          {sellToken ? (
                            <>
                              <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-black/5 dark:bg-white/5">
                                 {sellToken.icon ? (
                                   <Image src={sellToken.icon} alt={sellToken.symbol} width={24} height={24} className="object-cover" unoptimized />
                                 ) : (
                                   <span className="text-[10px] font-bold">{sellToken.symbol?.charAt(0)}</span>
                                 )}
                              </div>
                              <span className="font-bold text-sm tracking-tight">{sellToken.symbol}</span>
                            </>
                          ) : (
                            <span className="font-bold text-sm opacity-50">...</span>
                          )}
                          <Icon icon="solar:alt-arrow-down-linear" className="text-sm opacity-40" />
                        </button>
                      </div>

                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight">
                          ≈ ${getUsdValue(sellToken?.mint, sellAmount)}
                        </span>
                        <div className="flex gap-1.5">
                          {[0.25, 0.5, 1].map((pct) => {
                            const targetAmount = computeSellTargetForPercentage(pct);
                            const isMatch = sellAmount && parseFloat(sellAmount) === parseFloat(targetAmount.toString());
                            
                            return (
                              <button
                                key={pct}
                                onClick={() => handlePercentage(pct)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95 ${
                                  isMatch ? "bg-solana text-white shadow-lg" : "bg-black/5 dark:bg-white/10 hover:bg-black/10 opacity-60"
                                }`}
                              >
                                {pct === 1 ? t("text42") : `${pct * 100}%`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Switch Button */}
                  <div className="relative sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-10 flex justify-center sm:my-0">
                    <button
                      onClick={flipTokens}
                      disabled={isSwapping || !sellToken || !buyToken}
                      className="w-9 h-9 rounded-xl glass-card shadow-xl flex items-center justify-center bg-solana! text-white active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Icon icon="iconamoon:swap-light" className="text-xl" />
                    </button>
                  </div>

                  {/* Buy Section */}
                  <div className={`glass-card rounded-2xl p-4 border shadow-sm transition-all ${isFetchingQuote && activeInput === 'buy' ? 'border-solana/30 bg-solana/5' : 'border-black/5 dark:border-white/5 bg-black/3 dark:bg-white/5'}`}>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                          {locale === "en" ? "You Receive" : "Kamu Terima"}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold opacity-40">
                          <Icon icon="solar:wallet-linear" />
                          <span>{connected && buyToken ? getTokenBalance(buyToken.mint, true).toString() : "0"} {buyToken?.symbol || ""}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center gap-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`bg-transparent border-none outline-none text-2xl font-bold w-full transition-all ${isFetchingQuote && activeInput === 'sell' ? 'opacity-30 animate-pulse text-current' : 'text-current'}`}
                          value={buyAmount}
                          placeholder="0"
                          onChange={(e) => {
                             setActiveInput("buy");
                         const val = e.target.value;
                  if (/^[0-9]*\.?[0-9]*$/.test(val) || val === "")
                    setBuyAmount(val);
                          }}
                          disabled={isSwapping || !buyToken}
                        />
                        
                        {/*  Opens Token Selector Step */}
                        <button
                          onClick={() => { setActiveSelect("buy"); setModalStep("selectToken"); }}
                          disabled={!buyToken}
                          className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 glass-card rounded-full border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                        >
                          {buyToken ? (
                            <>
                              <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-black/5 dark:bg-white/5">
                                 {buyToken.icon ? (
                                   <Image src={buyToken.icon} alt={buyToken.symbol} width={24} height={24} className="object-cover" unoptimized />
                                 ) : (
                                   <span className="text-[10px] font-bold">{buyToken.symbol?.charAt(0)}</span>
                                 )}
                              </div>
                              <span className="font-bold text-sm tracking-tight">{buyToken.symbol}</span>
                            </>
                          ) : (
                            <span className="font-bold text-sm opacity-50">...</span>
                          )}
                          <Icon icon="solar:alt-arrow-down-linear" className="text-sm opacity-40" />
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight">
                          ≈ ${getUsdValue(buyToken?.mint, buyAmount)}
                        </span>
                        <span className="text-[10px] sm:text-xs font-black opacity-30 italic h-4">
                          {exchangeRate}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transparent Fee Breakdown Receipt — same format as staking
                    (SolanaStake.tsx): itemized sell amount, network fee, ATA rent (only if a
                    new account is actually needed), platform fee, and a Total Deducted line
                    that sums the sell amount plus every fee. This feature trades tokenized
                    stocks through the identical fetchSwapQuote/executeSwap (Jupiter) path as
                    SolanaSwap.tsx, so the network/ATA/platform fee fields are already present
                    on quoteData with no backend changes needed. */}
                <AnimatePresence>
                  {parseFloat(sellAmount) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-1.5 mt-2 px-1 border-t border-black/5 dark:border-white/10 pt-3 overflow-hidden"
                    >
                      <div className="flex justify-between items-center text-xs opacity-60">
                        <span>{locale === "en" ? "Sell Amount" : "Jumlah Jual"}</span>
                        <span className="font-mono">
                          {parseFloat(sellAmount).toFixed(sellToken?.decimals || 8)} {sellToken?.symbol || ""}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs opacity-60">
                        <span>{locale === "en" ? "Network Fee" : "Biaya Jaringan"}</span>
                        <span className="font-mono">
                          {isFetchingQuote
                            ? "..."
                            : quoteData
                              ? `${parseFloat((quoteData.networkFeeUi ?? 0).toFixed(sellToken?.decimals || 8))} ${sellToken?.symbol || ""}`
                              : "0"}
                        </span>
                      </div>
                      {!isFetchingQuote && quoteData && (quoteData.ataFeeUi || 0) > 0 && (
                        <div className="flex justify-between items-center text-xs opacity-60">
                          <span>{locale === "en" ? "New Account Fee (ATA)" : "Biaya Akun Baru (ATA)"}</span>
                          <span className="font-mono">
                            {parseFloat(quoteData.ataFeeUi.toFixed(sellToken?.decimals || 8))} {sellToken?.symbol || ""}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-xs opacity-60">
                        <span>{locale === "en" ? "Platform Fee" : "Biaya Platform"}</span>
                        <span className="font-mono">
                          {isFetchingQuote
                            ? "..."
                            : quoteData
                              ? `${parseFloat((quoteData.platformFeeUi ?? 0).toFixed(sellToken?.decimals || 8))} ${sellToken?.symbol || ""}`
                              : "0"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold mt-1">
                        <span>{locale === "en" ? "Total Deducted" : "Total Dipotong"}</span>
                        <span className="font-mono text-solana">
                          {isFetchingQuote
                            ? "..."
                            : quoteData
                              ? `${parseFloat((parseFloat(sellAmount) + quoteData.appliedFee / Math.pow(10, sellToken?.decimals || 9)).toFixed(sellToken?.decimals || 8))} ${sellToken?.symbol || ""}`
                              : `${parseFloat(sellAmount).toFixed(sellToken?.decimals || 8)} ${sellToken?.symbol || ""}`}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* STEP 2: TOKEN SELECTION */}
            {modalStep === "selectToken" && (
              <motion.div
                key="token-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                <div className="flex flex-col gap-0 pb-5">
                  <h2 className="text-xl font-bold">
                    {locale === "en" ? "Select Token" : "Pilih Token"}
                  </h2>
                  <p className="text-[12px] opacity-70">
                    {locale === "en" ? "Search symbol or company name" : "Cari simbol atau nama perusahaan"}
                  </p>
                </div>

                <div className="relative group mb-5">
                  <Icon icon="solar:magnifer-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-xl opacity-40" />
                  <input
                    type="text"
                    placeholder={locale === "en" ? "Search..." : "Cari..."}
                    value={searchQueryToken}
                    onChange={(e) => setSearchQueryToken(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2 pb-2">
                  {(() => {
                    const userBalanceMap = new Map<string, number>();
                    if (balance?.tokens) {
                      balance.tokens.forEach((t: any) => userBalanceMap.set(t.mint, t.amount || 0));
                    }
                    userBalanceMap.set(SOLANA_NATIVE_MINT, balance?.swapable || 0);
                    userBalanceMap.set(SOL_DATA.mint, balance?.swapable || 0);

                    return combinedTokenList.map((t) => {
                      const isSelected = activeSelect === "sell" ? sellToken?.symbol === t.symbol : buyToken?.symbol === t.symbol;
                      const userBal = userBalanceMap.get(t.mint) || 0;
                      const tokenPriceUsd = parseFloat(liveTokenPrices[t.mint]?.usdPrice || liveTokenPrices[t.mint]?.price || t.usdPrice || t.price || "0");
                      const totalUSD = userBal * tokenPriceUsd;

                      return (
                        <button
                          key={t.id || t.mint}
                          onClick={() => selectToken(t)}
                          className={`w-full text-left p-3.5 border rounded-xl flex items-center justify-between gap-3 bgBox glass-card transition-all ${
                            isSelected ? "border-solana/40 bg-solana/10" : "border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-black/5 dark:bg-white/5">
                              {t.icon ? (
                                <Image src={t.icon} alt={t.symbol} fill className="object-cover" unoptimized />
                              ) : (
                                <span className="font-bold text-sm opacity-50">{t.symbol?.charAt(0)}</span>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-start leading-tight gap-0.5">
                              <span className="font-bold text-sm">{t.symbol}</span>
                              <span className="text-[11px] font-medium opacity-60 truncate max-w-[130px]">
                                {t.name}
                              </span>
                              {t.formattedMcap && (
                                <span className="text-[9px] opacity-40 uppercase tracking-widest mt-0.5">
                                  CAP {t.formattedMcap}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0">
                            {userBal > 0 && (
                               <div className="flex flex-col items-end leading-tight">
                                 <span className={`font-bold text-sm tracking-tight ${(network === 'hedera' || network === 'polkadot') ? 'text-black dark:text-white' : (network === "base" ? "text-[#0052FF]" : `text-${network}`)}`}>
                                   {userBal}
                                 </span>
                                 {totalUSD > 0 && (
                                   <span className="text-[10px] font-bold opacity-40">
                                     ≈${totalUSD.toFixed(2)}
                                   </span>
                                 )}
                               </div>
                            )}
                            {isSelected && <FaCheckCircle className="text-lg text-green-500" />}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/*  DYNAMIC STICKY FOOTER */}
        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          {modalStep === "form" ? (
            <div className="grid grid-cols-2 gap-3 w-full">
              <ButtonContrast onClick={() => setIsMainModalOpen(false)} buttonText={locale === "en" ? "Cancel" : "Batal"} />
              <Button buttonText={buttonText} onClick={handleSwap} chain="solana" disabled={isButtonDisabled} />
            </div>
          ) : (
            <div className="flex justify-center w-full">
              <div className="w-full sm:flex-1">
                <ButtonContrast
                  buttonText={locale === "en" ? "Back" : "Kembali"}
                  onClick={() => setModalStep("form")}
                />
              </div>
            </div>
          )}
        </div>
      </AnimatedModal>

      {/* Transaction Status Modals */}
      <AnimatedModal isOpen={showSuccessModal && !!txid} onClose={() => setShowSuccessModal(false)} maxWidthClass="lg:w-100">
        <div className="flex flex-col justify-center text-center p-6 overflow-y-auto custom-scrollbar">
          <div className={`p-5 glass-card shadow-sm flex justify-center items-center mx-auto w-24 h-24 rounded-full mb-5 ${colorFlip}`}>
            <FaCheckCircle className="text-6xl" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("text32")}</h2>
          <p className="text-sm break-all mb-4">Hash: {txid}</p>
        </div>
        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          <div className="flex flex-col-reverse justify-center gap-3 w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast onClick={() => setShowSuccessModal(false)} buttonText={t("text128")} />
            </div>
            <div className="w-full sm:flex-1">
              <Button chain={network} buttonText={t("text79")} onClick={() => window.open(`${(networkExplorer as any).transaction}${txid}${(networkExplorer as any).urlSuffix || ""}`, "_blank")} />
            </div>
          </div>
        </div>
      </AnimatedModal>
    
      <AnimatedModal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)} maxWidthClass="lg:w-100">
        <div className="flex flex-col justify-center text-center p-6 overflow-y-auto custom-scrollbar">
          <div className="p-5 glass-card shadow-sm flex justify-center items-center mx-auto w-24 h-24 rounded-full text-red-500 mb-5">
            <FaExclamationCircle className="text-6xl" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("text33")}</h2>
          <p className="text-sm mb-4">{t("text34")}</p>
        </div>
        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          <div className="flex flex-col-reverse justify-center gap-3 w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast onClick={() => setShowErrorModal(false)} buttonText={t("text128")} />
            </div>
          </div>
        </div>
      </AnimatedModal>

      <InformationPopUp
        isOpen={isMainInfoOpen}
        onClose={() => setIsMainInfoOpen(false)}
        title={locale === "en" ? "Tokenized US Stocks" : "Tokenisasi Saham AS"}
        image={null} 
        description={locale === "en"
            ? "Your trades are routed through our optimized trading engine, ensuring you always get the best price. Tokenized assets are standard SPL tokens that track the real-world asset."
            : "Perdagangan kamu dirutekan melalui mesin perdagangan yang dioptimalkan, memastikan kamu selalu mendapatkan harga terbaik. Aset yang ditokenisasi adalah token standar SPL yang melacak aset dunia nyata."}
      />
    </>
  );
}