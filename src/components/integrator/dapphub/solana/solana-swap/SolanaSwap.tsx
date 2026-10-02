"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { AnimatedModal } from "../../../../../subcomponents/AnimatedModal";
import ButtonContrast from "../../../../../subcomponents/ButtonContrast";
import Button from "../../../../../subcomponents/Button";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useTranslations } from "next-intl";
import InformationPopUp from "@/subcomponents/InformationPopUp";
import { SOL_DATA, USDC_DATA } from "@/components/solana/config/constants";
import { getClampedPercentage } from "@/components/solana/config/helpers";
import { PARADAPP_JUPITER_FEE } from "./constant";

export default function SolanaSwap({ hideHeader = false }: { hideHeader?: boolean }) {
  const t = useTranslations("All");
  const { network, locale } = useParams<{ network: any; locale: any }>();

  const colorFlip = (network === "hedera" || network === "polkadot") ? "text-black dark:text-white" : (network === "base" ? "text-[#0052FF]" : `text-${network}`);

  const { connected, balance, fetchSwapQuote, executeSwap, fetchTokenMeta, networkExplorer, verifiedTokensData, liveTokenPrices, isUltraFast, setIsUltraFast } = useSolanaWallet();

  const [activeInput, setActiveInput] = useState<"sell" | "buy">("sell");
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [isMainInfoOpen, setIsMainInfoOpen] = useState(false);
  const [sellToken, setSellToken] = useState<any>(SOL_DATA);
  const [buyToken, setBuyToken] = useState<any>(USDC_DATA);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null); //  NEW: Track backend errors
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSelect, setActiveSelect] = useState<"sell" | "buy" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customToken, setCustomToken] = useState<any>(null);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);

  const [txid, setTxId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const verifiedTokens = useMemo(() => {
    if (verifiedTokensData && verifiedTokensData.length > 0) {
      const normalizedList = verifiedTokensData.map((t: any) => ({
        ...t,
        mint: t.mint || t.address || t.id,
        icon: t.icon || t.logoURI || t.image,
        price: t.price || t.usdPrice || 0,
      }));

      const sol = normalizedList.find((t: any) => t.mint === SOL_DATA.mint) || SOL_DATA;
      const usdc = normalizedList.find((t: any) => t.mint === USDC_DATA.mint) || USDC_DATA;
      const others = normalizedList.filter((t: any) => t.mint !== SOL_DATA.mint && t.mint !== USDC_DATA.mint);

      return [sol, usdc, ...others.slice(0, 150)];
    }
    return [SOL_DATA, USDC_DATA];
  }, [verifiedTokensData]);

  useEffect(() => {
    if (verifiedTokens.length > 2) {
      const solFull = verifiedTokens.find((t: any) => t.mint === SOL_DATA.mint);
      const usdcFull = verifiedTokens.find((t: any) => t.mint === USDC_DATA.mint);

      if (solFull && sellToken.mint === SOL_DATA.mint && (!sellToken.price || !sellToken.id)) setSellToken(solFull);
      if (usdcFull && buyToken.mint === USDC_DATA.mint && (!buyToken.price || !buyToken.id)) setBuyToken(usdcFull);
    }
  }, [verifiedTokens, sellToken.mint, buyToken.mint]);

  const isLoadingTokens = verifiedTokensData.length === 0;

  const getTokenBalance = (mint: string, swapable?: boolean) => {
    if (!balance) return 0;
    if (mint === SOL_DATA.mint) {
      const val = swapable ? balance.swapable : balance.confirmed;
      return val && !isNaN(val) ? val : 0;
    }
    const token = balance.tokens?.find((t: any) => t.mint === mint);
    return token && !isNaN(token.amount) ? token.amount : 0;
  };

  const sellBalance = getTokenBalance(sellToken.mint, true);
  const isInsufficientBalance = connected && sellAmount && parseFloat(sellAmount) > sellBalance;

  // Shared by handlePercentage (which actually sets the amount) and the percentage buttons'
  // own "is this one currently selected" check further down — extracted into one function so
  // those two can't drift out of sync the way SolanaStake.tsx's equivalent used to.
  const computeSellTargetForPercentage = (pct: number): number => {
    if (!sellToken || isNaN(sellBalance)) return 0;

    const decimals = sellToken.decimals ?? 9;

    // Total deducted for a p% click is p% of the sell-token balance, not the full balance —
    // network fee and ATA rent (both fixed, from the most recently fetched quote) are
    // subtracted from that scaled amount, and the platform fee (proportional to the sell
    // amount, PARADAPP_JUPITER_FEE) is solved out the same way Stake/Send do: sellAmount +
    // sellAmount*rate + networkFee + ataFee = balance*pct, so sellAmount = netAvailable /
    // (1 + rate). Previously pct === 1 (Max) returned the raw, unadjusted balance — since the
    // fee for ANY sell token here is paid out of that same balance (unlike Send, where a
    // token's own network fee is paid in the chain's native currency instead), Max always
    // proposed an amount that couldn't actually cover its own fees.
    const networkFee = quoteData?.networkFeeUi ?? 0;
    const ataFee = quoteData?.ataFeeUi ?? 0;
    const scaledBalance = sellBalance * pct;
    const netAvailable = Math.max(0, scaledBalance - networkFee - ataFee);
    const rawTarget = netAvailable / (1 + PARADAPP_JUPITER_FEE);
    return getClampedPercentage(rawTarget, 1, decimals);
  };

  const handlePercentage = (pct: number) => {
    if (!connected || !sellToken || isNaN(sellBalance)) return;

    const targetAmount = computeSellTargetForPercentage(pct);

    setActiveInput("sell");
    if (!isNaN(targetAmount) && targetAmount > 0) {
      setSellAmount(targetAmount.toString());
    } else {
      setSellAmount("");
      setQuoteError(null);
    }
  };

  const getUsdValue = (mint: string, amount: string | number) => {
    const parsedAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) return "0.00";

    let tokenPriceUsd = 0;

    const extractPrice = (p: any) => {
      if (!p) return 0;
      const val = typeof p === "object" ? p.usdPrice || p.price : p;
      return parseFloat(val) || 0;
    };

    tokenPriceUsd = extractPrice(liveTokenPrices[mint]);

    if (tokenPriceUsd === 0) {
      const vToken = verifiedTokens.find((t: any) => t.mint === mint);
      tokenPriceUsd = extractPrice(vToken);
    }

    if (tokenPriceUsd === 0) {
      const activeToken = mint === sellToken?.mint ? sellToken : buyToken;
      tokenPriceUsd = extractPrice(activeToken);
    }

    if (tokenPriceUsd === 0 && quoteData && sellToken && buyToken) {
      const exactIn = Number(quoteData.inAmount) / Math.pow(10, sellToken.decimals);
      const exactOut = Number(quoteData.outAmount) / Math.pow(10, buyToken.decimals);

      if (exactIn > 0 && exactOut > 0) {
        if (mint === sellToken.mint) {
          const buyTokenPrice = extractPrice(liveTokenPrices[buyToken.mint]) || extractPrice(buyToken);

          if (buyTokenPrice > 0) {
            tokenPriceUsd = (exactOut * buyTokenPrice) / exactIn;
          }
        } else if (mint === buyToken.mint) {
          const sellTokenPrice = extractPrice(liveTokenPrices[sellToken.mint]) || extractPrice(sellToken);

          if (sellTokenPrice > 0) {
            tokenPriceUsd = (exactIn * sellTokenPrice) / exactOut;
          }
        }
      }
    }

    if (tokenPriceUsd > 0) {
      return Number((parsedAmount * tokenPriceUsd).toFixed(2)).toLocaleString(locale == "id" ? "id-ID" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      if (activeInput === "sell") {
        const amountNum = parseFloat(sellAmount);
        if (isNaN(amountNum) || amountNum <= 0 || sellToken.mint === buyToken.mint) {
          setBuyAmount("");
          setQuoteData(null);
          setQuoteError(null);
          // A fetch could already be in flight (isFetchingQuote true) when the input is
          // cleared/zeroed before it resolves — without this, that fetch's own `finally`
          // never runs (it checks the abort signal and bails), so the button was stuck on
          // "Finding Route..." forever with nothing left to fetch.
          setIsFetchingQuote(false);
          return;
        }

        setIsFetchingQuote(true);
        setQuoteError(null); // Clear old errors

        try {
          const inDecimals = sellToken?.decimals ?? 9;
          const amountInSmallestUnit = Math.floor(amountNum * Math.pow(10, inDecimals));
          const quote = await fetchSwapQuote(sellToken.mint, buyToken.mint, amountInSmallestUnit, amountNum, "ExactIn", inDecimals, controller.signal);

          if (controller.signal.aborted) return;

          if (quote && quote.success && quote.quote) {
            setQuoteData(quote.quote);

            const outDecimals = buyToken?.decimals ?? 6;
            const outUi = Number(quote.quote.outAmount) / Math.pow(10, outDecimals);

            if (!isNaN(outUi)) {
              setBuyAmount(outUi.toString());
            } else {
              setBuyAmount("");
              setQuoteData(null);
            }
          } else {
            //  Display why it failed (e.g. "Input too small to cover fees")
            setBuyAmount("");
            setQuoteData(null);
            setQuoteError(quote?.error || "No Route Found");
          }
        } catch (e) {
          console.error("Quote error", e);
          if (!controller.signal.aborted) {
            setBuyAmount("");
            setQuoteData(null);
            setQuoteError("Failed to fetch route");
          }
        } finally {
          if (!controller.signal.aborted) setIsFetchingQuote(false);
        }
      } else if (activeInput === "buy") {
        const amountNum = parseFloat(buyAmount);
        if (isNaN(amountNum) || amountNum <= 0 || sellToken.mint === buyToken.mint) {
          setSellAmount("");
          setQuoteData(null);
          setQuoteError(null);
          setIsFetchingQuote(false);
          return;
        }

        setIsFetchingQuote(true);
        setQuoteError(null); // Clear old errors

        try {
          const outDecimals = buyToken?.decimals ?? 6;
          const amountInSmallestUnit = Math.floor(amountNum * Math.pow(10, outDecimals));
          // inputDecimals must be the SELL token's decimals here, not outDecimals above —
          // outDecimals only sizes the ExactOut "amount" param Jupiter expects; the fee/rent
          // math inside getGaslessQuoteAndFee needs the actual input mint's decimal scale.
          const quote = await fetchSwapQuote(sellToken.mint, buyToken.mint, amountInSmallestUnit, amountNum, "ExactOut", sellToken?.decimals ?? 9, controller.signal);

          if (controller.signal.aborted) return;

          if (quote && quote.success && quote.quote) {
            setQuoteData(quote.quote);

            const inDecimals = sellToken?.decimals ?? 9;
            const totalRequiredInput = Number(quote.quote.inAmount) + (quote.quote.appliedFee || 0);
            const inUi = totalRequiredInput / Math.pow(10, inDecimals);

            if (!isNaN(inUi)) {
              setSellAmount(inUi.toString());
            } else {
              setSellAmount("");
              setQuoteData(null);
            }
          } else {
            //  Display why it failed
            setSellAmount("");
            setQuoteData(null);
            setQuoteError(quote?.error || "No Route Found");
          }
        } catch (e) {
          console.error("Quote error", e);
          if (!controller.signal.aborted) {
            setSellAmount("");
            setQuoteData(null);
            setQuoteError("Failed to fetch route");
          }
        } finally {
          if (!controller.signal.aborted) setIsFetchingQuote(false);
        }
      }
    };

    //  Reduced debounce from 500ms to 300ms for a snappier feel
    const delayDebounceFn = setTimeout(fetchQuote, 300);
    return () => {
      controller.abort();
      clearTimeout(delayDebounceFn);
    };
  }, [activeInput === "sell" ? sellAmount : buyAmount, activeInput, sellToken.mint, buyToken.mint, sellToken.decimals, buyToken.decimals, fetchSwapQuote]);

  const handleSwap = async () => {
    if (!quoteData || !sellAmount || isInsufficientBalance) return;

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
        setQuoteError(null);
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

  const flipTokens = () => {
    const tempToken = sellToken;
    const tempAmount = sellAmount;

    setSellToken(buyToken);
    setBuyToken(tempToken);
    setSellAmount(buyAmount);
    setBuyAmount(tempAmount);
    setActiveInput(activeInput === "sell" ? "buy" : "sell");
    setQuoteData(null);
    setQuoteError(null);
  };

  const openTokenModal = (type: "sell" | "buy") => {
    setActiveSelect(type);
    setIsModalOpen(true);
  };

  const handleSelectToken = (token: any) => {
    if (activeSelect === "sell") {
      if (token.mint === buyToken.mint) flipTokens();
      else setSellToken(token);
    } else {
      if (token.mint === sellToken.mint) flipTokens();
      else setBuyToken(token);
    }
    setIsModalOpen(false);
    setSearchQuery("");
    setCustomToken(null);
  };

  useEffect(() => {
    const fetchCustomMeta = async () => {
      const cleanQuery = searchQuery.trim();

      if (cleanQuery.length >= 32 && fetchTokenMeta) {
        setIsFetchingMeta(true);
        try {
          const meta = await fetchTokenMeta(cleanQuery);

          if (meta && meta.mint) {
            setCustomToken({
              id: cleanQuery,
              symbol: meta.symbol || cleanQuery.slice(0, 4).toUpperCase(),
              name: meta.name,
              icon: meta.icon,
              mint: meta.mint,
              decimals: meta.decimals,
            });
          } else {
            setCustomToken(null);
          }
        } catch (e) {
          setCustomToken(null);
        } finally {
          setIsFetchingMeta(false);
        }
      } else {
        setCustomToken(null);
      }
    };

    const delay = setTimeout(fetchCustomMeta, 500);
    return () => clearTimeout(delay);
  }, [searchQuery, fetchTokenMeta]);

  const filteredTokens = verifiedTokens
    .filter((t) => t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const balA = getTokenBalance(a.mint);
      const balB = getTokenBalance(b.mint);
      return balB - balA;
    });

  const exchangeRate = useMemo(() => {
    const sAmt = parseFloat(sellAmount);
    const bAmt = parseFloat(buyAmount);

    if (isNaN(sAmt) || isNaN(bAmt) || sAmt <= 0 || bAmt <= 0 || !sellToken || !buyToken) {
      return null;
    }

    if (quoteData && quoteData.inAmount && quoteData.outAmount) {
      const inDecimals = sellToken?.decimals ?? 9;
      const outDecimals = buyToken?.decimals ?? 6;

      const exactIn = Number(quoteData.inAmount) / Math.pow(10, inDecimals);
      const exactOut = Number(quoteData.outAmount) / Math.pow(10, outDecimals);

      if (exactIn > 0 && exactOut > 0) {
        const rate = exactOut / exactIn;
        if (!isNaN(rate) && isFinite(rate)) {
          return `1 ${sellToken.symbol} ≈ ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${buyToken.symbol}`;
        }
      }
    }

    const rate = bAmt / sAmt;
    if (!isNaN(rate) && isFinite(rate)) {
      return `1 ${sellToken.symbol} ≈ ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${buyToken.symbol}`;
    }
    return null;
  }, [sellAmount, buyAmount, sellToken, buyToken, quoteData]);

  const isAmountEntered = (sellAmount && parseFloat(sellAmount) > 0) || (buyAmount && parseFloat(buyAmount) > 0);

  let buttonText = "";
  let isButtonDisabled = true;

  if (!connected) {
    buttonText = locale === "en" ? "Wallet Not Connected" : "Dompet Tidak Terhubung";
  } else if (isSwapping) {
    buttonText = locale === "en" ? "Confirming Swap..." : "Memproses Tukar...";
  } else if (isFetchingQuote) {
    buttonText = locale === "en" ? "Finding Route..." : "Mencari Rute...";
  } else if (!isAmountEntered) {
    buttonText = locale === "en" ? "Enter Amount" : "Masukkan Jumlah";
  } else if (isInsufficientBalance) {
    buttonText = locale === "en" ? "Insufficient Balance" : "Saldo Tidak Cukup";
  } else if (quoteError) {
    //  Reveal the server error directly on the button!
    buttonText = quoteError;
  } else if (!quoteData) {
    buttonText = locale === "en" ? "No Route Found" : "Tidak Ada Rute";
  } else {
    buttonText = locale === "en" ? "Confirm Swap" : "Konfirmasi Tukar";
    isButtonDisabled = false;
  }

  return (
    <>
      <div className="flex flex-col gap-5 font-sans">
        <div className="glass-card px-4 py-6 rounded-xl flex flex-col gap-5 shadow-xl backdrop-blur-md">
          {/* Header & Description */}
          <div>
            <div className={`flex items-center px-1 ${hideHeader ? "justify-end" : "justify-between"}`}>
              {!hideHeader && <h2 className="font-bold text-lg sm:text-xl text-current">{locale === "en" ? "Swap Token on Solana" : "Tukar Token di Solana"}</h2>}

              <div className="flex items-center gap-2">
                <button onClick={() => setIsMainInfoOpen(true)} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all active:scale-90">
                  <Icon icon="mingcute:information-line" className="text-xl sm:text-2xl opacity-70" />
                </button>
              </div>
            </div>
          </div>

          {!hideHeader && <p className="pt-3 text-xs sm:text-sm opacity-60 leading-relaxed px-1 -mt-2">{locale === "en" ? "Trade tokens instantly across the Solana ecosystem. Get the best market rates with lightning-fast execution and automated priority routing." : "Perdagangkan token secara instan di seluruh ekosistem Solana. Dapatkan harga pasar terbaik dengan eksekusi secepat kilat dan rute prioritas otomatis."}</p>}

          {/* Speed Selector */}
          <div className="flex justify-end items-center gap-2.5 px-2">
            <div className="flex items-center gap-1.5">
              <Icon icon="solar:bolt-circle-linear" className={isUltraFast ? "text-solana" : ""} />
              <span className="text-[10px] font-black uppercase tracking-widest">{locale === "en" ? "Ultra Fast" : "Sangat Cepat"}</span>
            </div>
            <button onClick={() => setIsUltraFast(!isUltraFast)} className={`relative w-10 h-5.5 rounded-full transition-all focus:outline-none p-1 ${isUltraFast ? "bg-solana" : "bg-gray-300 dark:bg-white/10"}`}>
              <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${isUltraFast ? "translate-x-4.5" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Swap Inputs Wrapper */}
          <div className="relative flex flex-col gap-2 mt-1">
            {/* SELL SECTION */}
            <div className={`glass-card rounded-2xl transition-all duration-300 shadow-sm ${isFetchingQuote && activeInput === "sell" ? "border-solana/30 bg-solana/5" : "border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5"}`}>
              <div className="py-4 px-4 md:py-6 md:px-6 flex flex-col gap-3">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{locale === "en" ? "You Pay" : "Kamu Bayar"}</p>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium opacity-60 group relative">
                    <Icon icon="solar:wallet-bold" className="text-base" />
                    <span>
                      {connected && sellToken ? sellBalance.toString() : "0"} {sellToken?.symbol || ""}
                    </span>
                  </div>
                </div>

                {/* Input Row */}
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex flex-col flex-1 min-w-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={sellAmount}
                      onChange={(e) => {
                        setActiveInput("sell");
                        const val = e.target.value;
                        if (/^[0-9]*\.?[0-9]*$/.test(val) || val === "") {
                          setSellAmount(val);
                          if (val === "") {
                            setQuoteError(null);
                            setQuoteData(null);
                          }
                        }
                      }}
                      disabled={isSwapping || !sellToken}
                      className={`w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none border-none truncate transition-all ${isFetchingQuote && activeInput === "buy" ? "opacity-30 animate-pulse text-solana" : "text-solana"}`}
                      placeholder="0"
                    />
                  </div>

                  <button onClick={() => openTokenModal("sell")} disabled={!sellToken} className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 glass-card rounded-full shadow-md bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 active:scale-95 transition-all group">
                    {sellToken ? (
                      <>
                        <div className="relative w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-full overflow-hidden shrink-0">{sellToken.icon ? <Image src={sellToken.icon} alt={sellToken.symbol} fill className="object-cover" unoptimized /> : <span className="font-bold text-[10px] opacity-50">{sellToken.symbol?.charAt(0)}</span>}</div>
                        <span className="font-bold text-sm sm:text-base pr-1">{sellToken.symbol}</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 pr-1">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/10 dark:bg-white/10 animate-pulse"></div>
                        <span className="font-bold text-sm sm:text-base opacity-50">Loading...</span>
                      </div>
                    )}
                    <Icon icon="solar:alt-arrow-down-linear" className="text-sm opacity-40 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                {/* Footer Row (USD Value + Percentage Buttons) */}
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight">≈ ${getUsdValue(sellToken?.mint, sellAmount)}</span>
                  <div className="flex gap-1.5">
                    {[0.25, 0.5, 1].map((pct) => {
                      const targetAmount = computeSellTargetForPercentage(pct);

                      const isMatch = sellAmount && parseFloat(sellAmount) === parseFloat(targetAmount.toString());

                      return (
                        <button key={pct} onClick={() => handlePercentage(pct)} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95 ${isMatch ? "bg-solana text-white shadow-lg shadow-solana/20" : "bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 opacity-60"}`}>
                          {pct === 1 ? t("text42") : `${pct * 100}%`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* SWITCH BUTTON */}
            <div className="relative sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-10 flex justify-center sm:my-0">
              <button onClick={flipTokens} disabled={isSwapping || !sellToken || !buyToken} className="w-9 h-9 rounded-xl glass-card shadow-xl flex items-center justify-center bg-solana! text-white active:scale-95 transition-all cursor-pointer disabled:opacity-50">
                <Icon icon="iconamoon:swap-light" className="text-xl" />
              </button>
            </div>

            {/* BUY SECTION */}
            <div className={`glass-card rounded-2xl transition-all duration-300 shadow-sm ${isFetchingQuote && activeInput === "buy" ? "border-solana/30 bg-solana/5" : "border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5"}`}>
              <div className="py-4 px-4 md:py-6 md:px-6 flex flex-col gap-3">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{locale === "en" ? "You Receive" : "Kamu Terima"}</p>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium opacity-60">
                    <Icon icon="solar:wallet-bold" className="text-base" />
                    <span>
                      {connected && buyToken ? getTokenBalance(buyToken.mint, false) : "0"} {buyToken?.symbol || ""}
                    </span>
                  </div>
                </div>

                {/* Input Row */}
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex flex-col flex-1 min-w-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={buyAmount}
                      onChange={(e) => {
                        setActiveInput("buy");
                        const val = e.target.value;
                        if (/^[0-9]*\.?[0-9]*$/.test(val) || val === "") {
                          setBuyAmount(val);
                          if (val === "") {
                            setQuoteError(null);
                            setQuoteData(null);
                          }
                        }
                      }}
                      disabled={isSwapping || !buyToken}
                      className={`w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none border-none truncate transition-all ${isFetchingQuote && activeInput === "sell" ? "opacity-30 animate-pulse text-current" : "text-current"}`}
                      placeholder="0"
                    />
                  </div>

                  <button onClick={() => openTokenModal("buy")} disabled={!buyToken} className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 glass-card rounded-full shadow-md bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 active:scale-95 transition-all group">
                    {buyToken ? (
                      <>
                        <div className="relative w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-full overflow-hidden shrink-0">{buyToken.icon ? <Image src={buyToken.icon} alt={buyToken.symbol} fill className="object-cover" unoptimized /> : <span className="font-bold text-[10px] opacity-50">{buyToken.symbol?.charAt(0)}</span>}</div>
                        <span className="font-bold text-sm sm:text-base pr-1">{buyToken.symbol}</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 pr-1">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/10 dark:bg-white/10 animate-pulse"></div>
                        <span className="font-bold text-sm sm:text-base opacity-50">Loading...</span>
                      </div>
                    )}
                    <Icon icon="solar:alt-arrow-down-linear" className="text-sm opacity-40 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                {/* Footer Exchange Rate & USD Value */}
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight">≈ ${getUsdValue(buyToken?.mint, buyAmount)}</span>

                  <span className="text-[10px] sm:text-xs font-black opacity-30 italic h-4">{exchangeRate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Fee Breakdown Receipt — same format as staking (SolanaStake.tsx):
              itemized sell amount, network fee, ATA rent (only if a new account is actually
              needed), platform fee, and a Total Deducted line that sums the sell amount plus
              every fee, all sourced from the live quote rather than a local approximation. */}
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

          <Button buttonText={buttonText} onClick={handleSwap} chain="solana" disabled={isButtonDisabled} />
        </div>
      </div>

      {/* --- TOKEN SELECTION MODAL --- */}
      <AnimatedModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidthClass="lg:w-150">
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 max-h-[80vh]">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">{locale === "en" ? "Select Token" : "Pilih Token"}</h2>
            <p className="text-[12px] opacity-70">{locale === "en" ? "Search for a token or paste a mint address." : "Cari token atau tempel alamat mint."}</p>
          </div>

          {/* Search Bar */}
          <div className="relative group mb-5">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">{isFetchingMeta ? <Icon icon="eos-icons:loading" className="text-xl text-solana animate-spin" /> : <Icon icon="solar:magnifer-linear" className="text-xl opacity-40 group-focus-within:opacity-100 group-focus-within:text-solana transition-all" />}</div>
            <input type="text" placeholder={locale === "en" ? "Search symbol or paste address" : "Cari simbol atau tempel alamat"} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-solana/50 focus:bg-solana/5 transition-all" />
          </div>

          <div className="flex flex-col gap-3 pb-2">
            {/* Show Custom Pasted Token if found */}
            {customToken && (
              <button type="button" onClick={() => handleSelectToken(customToken)} className="w-full text-left cursor-pointer transition-all duration-200 p-4 border border-solana/50 rounded-xl flex items-center justify-between gap-2 bg-solana/5">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm relative shrink-0 flex items-center justify-center bg-black/10 dark:bg-white/10">{typeof customToken.icon === "string" ? <Image src={customToken.icon} alt={customToken.symbol} fill className="object-cover rounded-full" unoptimized /> : <span className="font-bold text-sm opacity-50">{customToken.symbol?.charAt(0)}</span>}</div>
                  <div className="flex flex-col leading-tight">
                    <span className={`font-bold lg:text-sm`}>{customToken.symbol}</span>
                    <span className="text-[10px] font-black tracking-wide opacity-40">{customToken.name}</span>
                  </div>
                </div>
              </button>
            )}

            {isLoadingTokens
              ? [...Array(6)].map((_, i) => (
                  <div key={`skeleton-${i}`} className="w-full p-4 border border-black/5 dark:border-white/10 rounded-xl flex items-center justify-between gap-3 animate-pulse bg-black/5 dark:bg-white/5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 shrink-0" />
                      <div className="flex flex-col gap-2">
                        <div className="h-4 w-12 bg-black/10 dark:bg-white/10 rounded" />
                        <div className="h-2 w-20 bg-black/10 dark:bg-white/10 rounded" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="h-4 w-16 bg-black/10 dark:bg-white/10 rounded" />
                      <div className="h-2 w-10 bg-black/10 dark:bg-white/10 rounded" />
                    </div>
                  </div>
                ))
              : filteredTokens.length > 0
                ? filteredTokens.map((token) => {
                    const isSelected = activeSelect === "sell" ? sellToken.symbol === token.symbol : buyToken.symbol === token.symbol;
                    const userBal = getTokenBalance(token.mint);

                    return (
                      <button key={token.id} type="button" onClick={() => handleSelectToken(token)} className={`w-full text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${isSelected ? "border-black/20 dark:border-white/30 bg-black/5 dark:bg-white/10" : "border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"}`}>
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm relative shrink-0 bg-black/5 dark:bg-white/5 flex items-center justify-center">{token.icon ? <Image src={token.icon} alt={token.symbol} fill className="object-cover rounded-full" unoptimized /> : <span className="font-bold text-sm opacity-50">{token.symbol?.charAt(0)}</span>}</div>
                          <div className="flex flex-col leading-tight">
                            <span className={`font-bold lg:text-sm ${isSelected ? "" : "opacity-80"}`}>{token.symbol}</span>
                            <span className="text-[10px] font-black tracking-wide opacity-40">{token.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {userBal > 0 && (
                            <div className="flex flex-col items-end leading-tight">
                              <span className="font-bold text-sm tracking-tight text-solana">{userBal}</span>
                              <span className="text-[10px] font-bold opacity-40">≈${getUsdValue(token.mint, userBal.toString())}</span>
                            </div>
                          )}
                          {isSelected && <FaCheckCircle className="text-[18px] text-green-500 dark:text-green-400 shrink-0" />}
                        </div>
                      </button>
                    );
                  })
                : !customToken && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40 gap-3">
                      <Icon icon="solar:box-minimalistic-linear" className="text-5xl" />
                      <p className="text-sm font-bold uppercase tracking-widest text-center px-4">{locale === "en" ? "No tokens found" : "Token tidak ditemukan"}</p>
                    </div>
                  )}
          </div>
        </div>

        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          <div className="flex justify-center w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast buttonText={locale === "en" ? "Close" : "Tutup"} onClick={() => setIsModalOpen(false)} />
            </div>
          </div>
        </div>
      </AnimatedModal>

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
              <Button chain={network} buttonText={`${t("text79")}`} onClick={() => window.open(`${(networkExplorer as any).transaction}${txid}${(networkExplorer as any).urlSuffix || ""}`, "_blank")} />
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

      <InformationPopUp isOpen={isMainInfoOpen} onClose={() => setIsMainInfoOpen(false)} title={locale === "en" ? "Token Swap on Solana" : "Tukar Token di Solana"} image={null} description={locale === "en" ? "Your trades are routed through our optimized trading engine, ensuring you always get the best price across all Solana decentralized exchanges. \n\nWe utilize dynamic compute units and automated priority fees to guarantee your transaction completed safely and quickly, even during network congestion." : "Perdagangan kamu dirutekan melalui mesin perdagangan yang dioptimalkan, memastikan kamu selalu mendapatkan harga terbaik di seluruh pertukaran terdesentralisasi Solana. \n\nKami menggunakan unit komputasi dinamis dan biaya prioritas otomatis untuk menjamin transaksi kamu selesai dengan aman dan cepat, bahkan selama kemacetan jaringan."} />
    </>
  );
}
