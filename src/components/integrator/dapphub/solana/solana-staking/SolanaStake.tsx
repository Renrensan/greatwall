"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";

import {
  solana,
  solanaToken,
  usdc,
  usdcToken,
  marinadesol,
  msoltoken,
  solanastakebanner,
  usdcstakebanner,
  marinadesolanastakebanner,
} from "@/index";
import Button from "../../../../../subcomponents/Button";
import ButtonContrast from "../../../../../subcomponents/ButtonContrast";
import { AnimatedModal } from "../../../../../subcomponents/AnimatedModal";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import {
  PARADAPP_MARINANDE_FEE,
  SOL_TOKEN_ICON,
  USDC_TOKEN_ICON,
  MIN_SOL_LAMPORTS,
  MIN_USDC_AMOUNT,
  MIN_CLAIM_REWARD_USDC,
  MSOL_MINT,
} from "./constant";
import InformationPopUp from "@/subcomponents/InformationPopUp";
import {
  TOKEN_ATA_RENT,
  USDC_MINT,
} from "@/components/solana/config/constants";
import UsdcRewardReport, { RewardHistoryEntry } from "./UsdcRewardReport";
import UsdcTransactionHistory, { TransactionHistoryEntry } from "./UsdcTransactionHistory";

// None of the RPC/Kamino calls behind fetchMarinade*Quote have their own timeout — a slow
// or unresponsive RPC node means that await just hangs indefinitely, the debounced fee-
// quote effect's `finally` block never runs, and the Stake/Unstake button stays stuck on
// "Calculating Fee..." forever with no way out. This forces it to fail visibly instead.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// Fallback network-fee estimate, used only when no live feeQuote is available yet to read
// the real figure from (handlePercentage prefers feeQuote.networkFeeUi when one exists) —
// sized close to the actual network fees observed in practice (~0.00002-0.00005 SOL), not
// an arbitrary guess.
const FEE_ESTIMATION_DRIFT_MARGIN_SOL = 0.0001;

// Solana's rent-exempt minimum for a plain 0-byte System account (the user's own wallet).
// Draining the wallet to EXACTLY 0 SOL is valid on-chain, but our own calculation can't
// reliably land on exactly 0 — floating-point rounding plus the small gap between the fee
// estimate used to compute "Max" and the real fee at submission time mean the actual
// leftover is only ever approximately zero, not precisely zero. Anything strictly between 0
// and this minimum is invalid and the whole transaction is rejected, so "Max" targets
// leaving at least this much rather than gambling on hitting the forbidden gap.
const WALLET_RENT_EXEMPT_MINIMUM_SOL = 0.00089088;

const SparklineChart = ({
  data,
  colorClass,
  gradientFrom,
  gradientTo,
}: {
  data: any;
  colorClass: string;
  gradientFrom: string;
  gradientTo: string;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || !data.values || data.values.length === 0) {
    return <div className="h-16 w-full mt-4" />;
  }

  const values = data.values;
  const times = data.times;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || 0.1;
  const adjustedMin = min - padding;
  const adjustedMax = max + padding;
  const range = adjustedMax - adjustedMin;

  const getCoordinates = (index: number, val: number) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 100 - ((val - adjustedMin) / range) * 100;
    return { x, y };
  };

  const points = values
    .map((val: number, i: number) => {
      const { x, y } = getCoordinates(i, val);
      return `${x},${y}`;
    })
    .join(" ");

  const fillPoints = `0,100 ${points} 100,100`;

  const handleMouseMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = clientX - rect.left;
    const percentageX = x / rect.width;
    const index = Math.round(percentageX * (values.length - 1));
    const safeIndex = Math.max(0, Math.min(values.length - 1, index));
    setHoveredIndex(safeIndex);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className="relative w-full h-16 mt-4 -mb-2 overflow-visible group">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="absolute w-full h-full overflow-visible cursor-crosshair"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseLeave}
      >
        <defs>
          <linearGradient id="gradient-sparkline" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={gradientFrom} stopOpacity="0.25" />
            <stop offset="100%" stopColor={gradientTo} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <polygon points={fillPoints} fill="url(#gradient-sparkline)" />
        <polyline
          fill="none"
          stroke="currentColor"
          className={colorClass}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {hoveredIndex !== null && (
          <>
            <line
              x1={getCoordinates(hoveredIndex, values[hoveredIndex]).x}
              y1="0"
              x2={getCoordinates(hoveredIndex, values[hoveredIndex]).x}
              y2="100"
              stroke="currentColor"
              className="opacity-30"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <circle
              cx={getCoordinates(hoveredIndex, values[hoveredIndex]).x}
              cy={getCoordinates(hoveredIndex, values[hoveredIndex]).y}
              r="2.5"
              fill="currentColor"
              className={`${colorClass} drop-shadow-md`}
            />
          </>
        )}
      </svg>

      {hoveredIndex !== null && (
        <div
          className="absolute z-50 bottom-[80%] mb-1 -translate-x-1/2 whitespace-nowrap bg-black dark:bg-white text-white dark:text-black text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none flex flex-col items-center gap-0.5 font-medium transition-all duration-75"
          style={{ left: `${(hoveredIndex / (values.length - 1)) * 100}%` }}
        >
          <span className="font-bold">{values[hoveredIndex]}% APY</span>
          {times && times[hoveredIndex] && (
            <span className="opacity-70 text-[9px]">
              {new Date(times[hoveredIndex] * 1000).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" },
              )}
            </span>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-black dark:border-t-white" />
        </div>
      )}
    </div>
  );
};

const SolanaStake = ({
  hideHeader = false,
  showOnlyUSDC = false,
}: {
  hideHeader?: boolean;
  showOnlyUSDC?: boolean;
}) => {
  const t = useTranslations("All");
  const { network, locale } = useParams<{ network: any; locale: any }>();

  const colorFlip =
    (network === "hedera" || network === "polkadot") ? "text-black dark:text-white" : (network === "base" ? "text-[#0052FF]" : `text-${network}`);

  const {
    address,
    networkExplorer,
    connected,
    balance,
    stakeToMarinade,
    unstakeFromMarinade,
    stakeNativeToMarinade,
    unstakeNativeFromMarinade,
    withdrawNativeStake,
    getMarinadeSOLData,
    getMarinadeUSDCData,
    depositUsdcToMarinade,
    withdrawUsdcFromMarinade,
    claimUsdcFromMarinade,
    fetchMarinadeDepositQuote,
    fetchMarinadeUnstakeQuote,
    fetchMarinadeNativeDepositQuote,
    fetchMarinadeNativeUnstakeQuote,
    fetchMarinadeUsdcDepositQuote,
    fetchMarinadeUsdcWithdrawQuote,
    getMarinadeUsdcRewardHistory,
    getMarinadeUsdcTransactionHistory,
    price,
    checkAtaRequired,
  } = useSolanaWallet();

  const [isAtaNeeded, setIsAtaNeeded] = useState(false);
  const [isMainInfoOpen, setIsMainInfoOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManageUsdcOpen, setIsManageUsdcOpen] = useState(false);
  const [isRewardReportOpen, setIsRewardReportOpen] = useState(false);
  const [rewardHistory, setRewardHistory] = useState<RewardHistoryEntry[]>([]);
  const [isRewardHistoryLoading, setIsRewardHistoryLoading] = useState(false);
  const [isTransactionHistoryOpen, setIsTransactionHistoryOpen] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryEntry[]>([]);
  const [isTransactionHistoryLoading, setIsTransactionHistoryLoading] = useState(false);
  const [txid, setTxId] = useState<string | null>(null);
  const [isManageStakesOpen, setIsManageStakesOpen] = useState(false);
  const [manageStep, setManageStep] = useState<"list" | "confirm">("list");
  const [selectedNativeAcc, setSelectedNativeAcc] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stakingData, setStakingData] = useState<any>(null);
  const [usdcData, setUsdcData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [selectedAsset, setSelectedAsset] = useState<0 | 1>(0);
  const [stakingMode, setStakingMode] = useState<"liquid" | "native">("native");
  const [amount, setAmount] = useState<string>("");
  // Tracks whether the current amount came from clicking "Max" vs. being typed manually —
  // the "Remaining in wallet" receipt line only makes sense for a Max-selected amount
  // (explaining why it isn't your literal full balance), not for an arbitrary typed amount.
  const [isMaxSelected, setIsMaxSelected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveUsdcBalance, setLiveUsdcBalance] = useState<number>(0);

  // Live fee breakdown (network fee, ATA rent if a new account is needed, platform fee),
  // fetched from the same server action that builds the actual transaction — mirrors the
  // debounced quote pattern already used for gasless sends (see Assets.tsx). Reset whenever
  // the amount/mode changes so a stale quote from a previous input never lingers on screen.
  const [feeQuote, setFeeQuote] = useState<any>(null);
  const [isFetchingFeeQuote, setIsFetchingFeeQuote] = useState(false);

  useEffect(() => {
    if (showOnlyUSDC) {
      setSelectedAsset(1);
    }
  }, [showOnlyUSDC]);

  const loadAllData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [solData, stableData] = await Promise.all([
        getMarinadeSOLData(),
        getMarinadeUSDCData(),
      ]);

      if (solData) setStakingData(solData);
      if (stableData) {
        setUsdcData(stableData);
        setLiveUsdcBalance(stableData.userUsdcDeposited || 0);
      }
    } catch (err) {
      console.error("Failed to load staking data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!connected) {
      setAmount("");
      setLiveUsdcBalance(0);
    }
    loadAllData(true);
    const interval = setInterval(() => loadAllData(true), 60000);
    return () => clearInterval(interval);
  }, [connected]);

  useEffect(() => {
    if (
      !connected ||
      !usdcData?.userShareOfVault ||
      !usdcData?.interestPerSecondUsd
    )
      return;
    const userEarningsPerMs =
      (usdcData.userShareOfVault / 100) *
      (usdcData.interestPerSecondUsd / 1000);
    const ticker = setInterval(() => {
      setLiveUsdcBalance((prev) => prev + userEarningsPerMs * 100);
    }, 3000);
    return () => clearInterval(ticker);
  }, [usdcData, connected]);

  const currentApy = useMemo(() => {
    if (selectedAsset === 1) return usdcData?.apy || "0.00";
    if (!stakingData?.apys) return "0.00";
    if (stakingMode === "liquid") {
      return stakingData.apys.liquid || "0.00";
    } else {
      return stakingData.apys.native || "0.00";
    }
  }, [selectedAsset, stakingMode, stakingData, usdcData]);

  const usdValue = useMemo(() => {
    const val = parseFloat(amount) || 0;
    if (selectedAsset === 1) return val.toFixed(2);
    const solPrice = (price as any)?.usd || 0;
    if (stakingMode === "liquid" && activeTab == 1) {
      return (val * solPrice * (stakingData?.mSolPrice || 1)).toFixed(2);
    } else {
      return (val * solPrice).toFixed(2);
    }
  }, [amount, selectedAsset, price, activeTab, stakingData]);

  const filteredNativeAccounts = useMemo(() => {
    if (!stakingData?.nativeAccounts) return [];
    return stakingData.nativeAccounts.filter((acc: any) =>
      acc.pubkey.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, stakingData]);

  const getDisplayBalance = () => {
    if (!connected) return 0;
    if (activeTab === 0) {
      return selectedAsset === 0
        ? balance?.confirmed || 0
        : balance?.tokens?.find((t: any) => t.mint === USDC_MINT)?.amount || 0;
    } else {
      return selectedAsset === 1
        ? usdcData?.userUsdcDeposited || 0
        : stakingMode === "liquid"
          ? stakingData?.mSolBalance || 0
          : stakingData?.nativeStakeBalance || 0;
    }
  };

  const getMathBalance = () => {
    if (!connected) return 0;

    // 1. Handle USDC (Asset 1)
    if (selectedAsset === 1) {
      return activeTab === 0
        ? balance?.tokens?.find((t: any) => t.mint === USDC_MINT)?.amount || 0
        : usdcData?.userUsdcDeposited || 0;
    }

    // 2. Handle SOL (Asset 0)
    if (activeTab === 0) {
      let stakeable = balance?.stakeable || 0;

      // Only apply rent deduction if Liquid Staking + ATA is needed
      if (stakingMode === "liquid" && isAtaNeeded) {
        stakeable -= TOKEN_ATA_RENT;
      }

      return Math.max(0, stakeable);
    } else {
      // Unstaking SOL
      return stakingMode === "liquid"
        ? stakingData?.mSolBalance || 0
        : stakingData?.nativeStakeBalance || 0;
    }
  };

  const displayBalance = getDisplayBalance();
  const maxStakeableBalance = getMathBalance();

  useEffect(() => {
    if (connected && selectedAsset === 0 && stakingMode === "liquid") {
      checkAtaRequired(address!, MSOL_MINT).then((required: boolean) => {
        setIsAtaNeeded(required);
      });
    } else {
      setIsAtaNeeded(false);
    }
  }, [connected, address, stakingMode, selectedAsset, checkAtaRequired]);

  const amountNum = parseFloat(amount) || 0;

  const feeCurrency = selectedAsset === 0 ? "SOL" : "USDC";
  const inputCurrency =
    selectedAsset === 0
      ? activeTab === 1 && stakingMode === "liquid"
        ? "mSOL"
        : "SOL"
      : "USDC";
  const receiveCurrency =
    selectedAsset === 0
      ? activeTab === 0 && stakingMode === "liquid"
        ? "mSOL"
        : "SOL"
      : "USDC";

  const solPriceRatio = stakingData?.mSolPrice || 1;
  const solEquivalent =
    selectedAsset === 0 && activeTab === 1 && stakingMode === "liquid"
      ? amountNum * solPriceRatio
      : amountNum;

  const minStakeVolume =
    selectedAsset === 0 ? MIN_SOL_LAMPORTS / 1e9 : MIN_USDC_AMOUNT;
  const isBelowMinimum = amountNum > 0 && solEquivalent < minStakeVolume;

  let estimatedFee = 0;
  let totalDeducted = 0;
  let estimatedReceive = 0;
  let isInsufficientBalance = false;
  let needsSolForNativeUnstakeFee = false;

  if (amountNum > 0) {
    if (selectedAsset === 0) {
      if (activeTab === 0) {
        estimatedFee = amountNum * PARADAPP_MARINANDE_FEE;
        // ATA rent only applies to liquid staking's mSOL account, and only when it doesn't
        // already exist — native staking never creates a token account (a stake account
        // isn't an ATA), so it never incurs this cost at all.
        const ataRentIfNeeded =
          stakingMode === "liquid" && isAtaNeeded ? TOKEN_ATA_RENT : 0;
        totalDeducted = amountNum + estimatedFee + ataRentIfNeeded;
        estimatedReceive =
          stakingMode === "liquid" ? amountNum / solPriceRatio : amountNum;
        // Compared against balance.confirmed directly, NOT maxStakeableBalance — the latter
        // (via getMathBalance) already subtracts ataRentIfNeeded once for liquid staking, so
        // comparing totalDeducted (which also includes ataRentIfNeeded) against it would
        // double-count that cost, wrongly flagging balances as insufficient. totalDeducted
        // doesn't include network fee, so the margin here covers that real cost too — prefer
        // the live feeQuote for the current amount over the flat fallback (see
        // FEE_ESTIMATION_DRIFT_MARGIN_SOL), plus WALLET_RENT_EXEMPT_MINIMUM_SOL since our
        // calculation can't reliably land on exactly 0 remaining (see that constant's comment).
        const depositNetworkFeeMargin =
          (feeQuote?.networkFeeUi ?? FEE_ESTIMATION_DRIFT_MARGIN_SOL) +
          WALLET_RENT_EXEMPT_MINIMUM_SOL;
        isInsufficientBalance =
          connected &&
          totalDeducted > (balance?.confirmed || 0) - depositNetworkFeeMargin;
      } else {
        if (stakingMode === "liquid") {
          estimatedFee = solEquivalent * PARADAPP_MARINANDE_FEE;
          totalDeducted = amountNum;
          estimatedReceive = Math.max(0, solEquivalent - estimatedFee);
          isInsufficientBalance = connected && amountNum > maxStakeableBalance;
        } else {
          estimatedFee = amountNum * PARADAPP_MARINANDE_FEE;
          totalDeducted = amountNum;
          estimatedReceive = Math.max(0, amountNum - estimatedFee);
          isInsufficientBalance = connected && amountNum > maxStakeableBalance;

          // Native unstake only *deactivates* the stake — no funds return in this same
          // transaction (that's a separate withdraw once the deactivation cooldown clears),
          // so unlike liquid unstake, this fee must be paid from the wallet's existing SOL
          // right now. Uses the live feeQuote (network fee + platform fee) when available
          // rather than the local platform-fee-only estimate. Also reserves
          // WALLET_RENT_EXEMPT_MINIMUM_SOL — paying this fee down to a sub-rent-exempt
          // dust balance is just as invalid on-chain as it is for a deposit.
          const nativeUnstakeFee = feeQuote?.calculatedFeeUi ?? estimatedFee;
          if (
            connected &&
            nativeUnstakeFee >
              (balance?.confirmed || 0) -
                FEE_ESTIMATION_DRIFT_MARGIN_SOL -
                WALLET_RENT_EXEMPT_MINIMUM_SOL
          ) {
            isInsufficientBalance = true;
            needsSolForNativeUnstakeFee = true;
          }
        }
      }
    } else {
      estimatedFee = amountNum * PARADAPP_MARINANDE_FEE;
      if (activeTab === 0) {
        totalDeducted = amountNum + estimatedFee;
        estimatedReceive = amountNum;
        isInsufficientBalance =
          connected && totalDeducted > maxStakeableBalance;
      } else {
        totalDeducted = amountNum;
        estimatedReceive = Math.max(0, amountNum - estimatedFee);
        isInsufficientBalance = connected && amountNum > maxStakeableBalance;
      }
    }
  }

  // Live fee breakdown — debounced the same way Assets.tsx debounces gasless send quotes
  // (500ms), calling the same server action that will actually build the transaction so
  // the numbers shown here are exactly what gets charged, not a locally-approximated guess.
  useEffect(() => {
    if (!connected || amountNum <= 0 || isBelowMinimum) {
      setFeeQuote(null);
      setIsFetchingFeeQuote(false);
      return;
    }

    // `cancelled` guards against this specific fetch's result landing after a newer one
    // has already started (or superseded state) — without it, a slow response for an amount
    // the user has since changed could overwrite a fresher quote, or flip isFetchingFeeQuote
    // back to false right as the next debounced fetch is trying to set it true.
    let cancelled = false;
    setIsFetchingFeeQuote(true);
    const timeoutId = setTimeout(async () => {
      try {
        let quote: any = null;
        if (selectedAsset === 1) {
          quote = activeTab === 0
            ? await withTimeout(fetchMarinadeUsdcDepositQuote(amountNum), 15000)
            : await withTimeout(fetchMarinadeUsdcWithdrawQuote(amountNum), 15000);
        } else if (stakingMode === "liquid") {
          quote = activeTab === 0
            ? await withTimeout(fetchMarinadeDepositQuote(amountNum), 15000)
            : await withTimeout(fetchMarinadeUnstakeQuote(amountNum), 15000);
        } else {
          quote = activeTab === 0
            ? await withTimeout(fetchMarinadeNativeDepositQuote(amountNum), 15000)
            : await withTimeout(fetchMarinadeNativeUnstakeQuote(amountNum), 15000);
        }
        if (!cancelled) setFeeQuote(quote);
      } catch (err) {
        console.error("[SolanaStake] fee quote error:", err);
        if (!cancelled) setFeeQuote(null);
      } finally {
        if (!cancelled) setIsFetchingFeeQuote(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, amountNum, isBelowMinimum, selectedAsset, activeTab, stakingMode]);

  // Shared by handlePercentage (which actually sets the amount) and the percentage buttons'
  // own "is this one currently selected" check below — extracted into one function
  // specifically so those two can't drift out of sync the way they previously did (the
  // buttons' old duplicate copy of this formula never got updated when this one changed,
  // so the "selected" highlight silently stopped matching reality).
  const computeTargetAmountForPercentage = (pct: number): number => {
    const decimals = selectedAsset === 0 ? 9 : 6;

    // NOTE: no separate ATA-rent deduction here — getMathBalance() (maxStakeableBalance)
    // already subtracts TOKEN_ATA_RENT when isAtaNeeded for liquid staking. Subtracting it
    // again here double-counted it, which is exactly what was leaving ~0.002 SOL more
    // unstaked than intended on every "Max" click.

    // Prefer the real, live network fee from the most recently fetched quote over the
    // hardcoded fallback — network fee is driven by compute units + the priority-fee market,
    // not by the staked amount, so a quote fetched moments ago for a similar amount is an
    // accurate estimate of what the actual transaction will cost, not a guess. Combined with
    // WALLET_RENT_EXEMPT_MINIMUM_SOL so "Max" reliably lands above the forbidden dust gap
    // instead of gambling on hitting exactly 0.
    //
    // The USDC deposit's own network fee — and, for a first-time depositor, the ATA-rent
    // fee for creating their vault-shares account (both paid in USDC, shown in the receipt
    // below) — have to be reserved here too. Leaving them out meant "Max" only left room
    // for the platform fee, so Total Deducted ended up higher than the wallet's actual
    // balance by exactly whatever non-proportional fees were missing.
    // Same fallback network-fee estimate as the SOL side (FEE_ESTIMATION_DRIFT_MARGIN_SOL),
    // just converted to USDC via the live SOL price — covers a Max click before any USDC
    // fee quote has ever been fetched (feeQuote still null), so that first click reserves a
    // sane buffer too instead of assuming the network fee is zero.
    const usdcNetworkFeeFallback = FEE_ESTIMATION_DRIFT_MARGIN_SOL * ((price as any)?.usd || 0);

    const networkFeeBuffer =
      selectedAsset === 0
        ? (feeQuote?.networkFeeUi ?? FEE_ESTIMATION_DRIFT_MARGIN_SOL) +
          WALLET_RENT_EXEMPT_MINIMUM_SOL
        : (feeQuote?.networkFeeUi ?? usdcNetworkFeeFallback) + (feeQuote?.ataFeeUi ?? 0);

    let targetAmount = 0;

    if (activeTab === 0) {
      // Total deducted for a p% click is p% of the balance — not the full balance — so
      // networkFeeBuffer (network + ATA, both fixed regardless of stake size) is subtracted
      // from the *scaled* amount, not the full balance before scaling. Scaling the buffer out
      // first and multiplying by pct afterward (the previous approach) reserved the full fixed
      // fee even for a 25%/50% click, understating the staked amount relative to what "p% of
      // balance" should mean. Platform fee is proportional to the staked amount itself
      // (staked * rate), so solving staked + staked*rate = scaledBalance - networkFeeBuffer
      // gives staked = netAvailable / (1 + rate) — same shape as before, just reordered.
      const scaledBalance = maxStakeableBalance * pct;
      const netAvailable = Math.max(0, scaledBalance - networkFeeBuffer);

      targetAmount = netAvailable / (1 + PARADAPP_MARINANDE_FEE);
    } else {
      targetAmount = maxStakeableBalance * pct;
    }

    if (targetAmount < 0) targetAmount = 0;

    const factor = Math.pow(10, decimals);
    return Math.floor(targetAmount * factor) / factor;
  };

  const handlePercentage = (pct: number) => {
    if (!connected) return;
    const targetAmount = computeTargetAmountForPercentage(pct);
    setIsMaxSelected(pct === 1);
    setAmount(targetAmount > 0 ? targetAmount.toString() : "");
  };

  const handleAction = async (
    forcedAccountPubkey?: string,
    forcedLamports?: number,
  ) => {
    try {
      setIsProcessing(true);
      let resTxId;

      if (forcedAccountPubkey && forcedLamports !== undefined) {
        resTxId = await withdrawNativeStake(
          forcedAccountPubkey,
          forcedLamports,
        );
        setIsManageStakesOpen(false);
      } else {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0)
          throw new Error("Invalid amount");

        if (selectedAsset === 1) {
          resTxId =
            activeTab === 0
              ? await depositUsdcToMarinade(amountNum)
              : await withdrawUsdcFromMarinade(amountNum);
        } else {
          if (stakingMode === "liquid") {
            resTxId =
              activeTab === 0
                ? await stakeToMarinade(amountNum)
                : await unstakeFromMarinade(amountNum);
          } else {
            resTxId =
              activeTab === 0
                ? await stakeNativeToMarinade(amountNum)
                : await unstakeNativeFromMarinade(amountNum);
          }
        }
      }

      if (resTxId) {
        setTxId(resTxId);
        setShowSuccessModal(true);
        setAmount("");
        if (forcedAccountPubkey) setManageStep("list");
        setTimeout(() => {
          loadAllData(true);
          // Re-verify against current on-chain state — the useEffect above only checks
          // once per connect/mode-switch, so without this, isAtaNeeded stays stuck at
          // whatever it was before this transaction even if it just created the mSOL ATA.
          // Every subsequent "Max" click would then keep reserving TOKEN_ATA_RENT for an
          // account that already exists, silently under-using the wallet each time.
          if (selectedAsset === 0 && stakingMode === "liquid" && address) {
            checkAtaRequired(address, MSOL_MINT).then((required: boolean) => {
              setIsAtaNeeded(required);
            });
          }
        }, 3000);
      } else {
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error(error);
      setShowErrorModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUsdcRewards = async () => {
    try {
      setIsProcessing(true);
      const rewardsToClaim = usdcData?.pendingFarmRewards || 0;

      if (rewardsToClaim < MIN_CLAIM_REWARD_USDC) {
        throw new Error(`Minimum claim is ${MIN_CLAIM_REWARD_USDC} USDC.`);
      }

      const claimTxId = await claimUsdcFromMarinade(rewardsToClaim);
      if (!claimTxId)
        throw new Error("Claim transaction failed or was rejected.");

      setTxId(claimTxId);
      setShowSuccessModal(true);
      setIsManageUsdcOpen(false);

      setTimeout(() => loadAllData(true), 3000);
    } catch (error) {
      console.error("Farm Reward Error:", error);
      setShowErrorModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenRewardReport = async () => {
    setIsRewardReportOpen(true);
    if (!connected) return;

    setIsRewardHistoryLoading(true);
    try {
      const history = await getMarinadeUsdcRewardHistory();
      setRewardHistory(history || []);
    } catch (err) {
      console.error("Failed to load USDC reward history", err);
      setRewardHistory([]);
    } finally {
      setIsRewardHistoryLoading(false);
    }
  };

  const handleOpenTransactionHistory = async () => {
    setIsTransactionHistoryOpen(true);
    if (!connected) return;

    setIsTransactionHistoryLoading(true);
    try {
      const history = await getMarinadeUsdcTransactionHistory();
      setTransactionHistory(history || []);
    } catch (err) {
      console.error("Failed to load USDC transaction history", err);
      setTransactionHistory([]);
    } finally {
      setIsTransactionHistoryLoading(false);
    }
  };

  const handleCloseManageDrawer = () => {
    if (isProcessing) return;
    setIsManageStakesOpen(false);
    setTimeout(() => {
      setManageStep("list");
      setSelectedNativeAcc(null);
      setSearchQuery("");
    }, 300);
  };

  const isActive =
    connected &&
    (selectedAsset === 1
      ? liveUsdcBalance > 0
      : stakingMode === "liquid"
        ? (stakingData?.mSolBalance || 0) > 0
        : (stakingData?.nativeStakeBalance || 0) > 0);

  const bgImageSource =
    selectedAsset === 1
      ? usdcToken
      : stakingMode === "liquid"
        ? msoltoken
        : solanaToken;

  return (
    <div className="flex flex-col gap-5 font-sans">
      <div className="glass-card px-4 py-6 rounded-xl flex flex-col gap-5 shadow-xl backdrop-blur-md">
        <div>
          <div
            className={`flex items-center px-1 ${hideHeader ? "justify-end" : "justify-between"}`}
          >
            {!hideHeader && (
              <h2 className="font-bold text-lg sm:text-xl">
                {selectedAsset === 0
                  ? locale === "en"
                    ? "Earn rewards from Solana Stake"
                    : "Dapatkan reward dari Solana Stake"
                  : locale === "en"
                    ? "Earn rewards from USDC Stake"
                    : "Dapatkan reward dari USDC Stake"}
              </h2>
            )}

            <button
              onClick={() => setIsMainInfoOpen(true)}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <Icon
                icon="mingcute:information-line"
                className="text-xl sm:text-2xl"
              />
            </button>
          </div>
        </div>

        {!hideHeader && (
          <p className="pt-3 text-xs sm:text-sm opacity-60 leading-relaxed px-1 -mt-2">
            {locale === "en"
              ? "Put your crypto to work and earn passive income directly on Solana. Choose between stable USDC yields, secure native staking, or flexible liquid staking to maximize your returns."
              : "Tumbuhkan aset Anda dengan mendapatkan penghasilan pasif langsung di Solana. Pilih antara yield USDC yang stabil, staking native yang aman, atau liquid staking yang fleksibel untuk memaksimalkan keuntungan Anda."}
          </p>
        )}

        {/* --- Asset Switcher Tabs --- */}
        {!showOnlyUSDC && (
          <div className="flex justify-between glass-card bgRound border-black/5 dark:border-white/10 p-1 shadow-sm">
            {[
              { label: "SOLANA", id: 0, icon: SOL_TOKEN_ICON },
              { label: "USDC", id: 1, icon: USDC_TOKEN_ICON },
            ].map((tab) => {
              const isActiveTab = selectedAsset === tab.id;
              const activeBgClass =
                (network === "hedera" || network === "polkadot") ? "bg-black dark:bg-white" : `bg-solana`;
              const activeTextClass =
                network === "hedera"
                  ? "text-white dark:text-black"
                  : "text-white";

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedAsset(tab.id as any);
                    setAmount("");
                  }}
                  className={`flex items-center justify-center gap-2 w-full p-2.5 text-center rounded-full text-xs sm:text-sm transition-all duration-200 cursor-pointer ${isActiveTab ? `font-bold ${activeBgClass} ${activeTextClass} shadow-md` : `font-medium hover:bg-solana/10 opacity-60`}`}
                >
                  <Icon icon={tab.icon} className="text-lg" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between gap-4 mb-2">
          <div className="glass-card relative flex-1 h-32 py-4 rounded-xl overflow-hidden flex items-center px-6 border border-white/10 bg-gradient-to-br from-white/10 to-transparent shadow-2xl">
            <div
              className="absolute z-0 pointer-events-none opacity-20"
              style={{
                width: "120px",
                height: "120px",
                right: "-24px",
                bottom: "-24px",
              }}
            >
              <Image
                src={bgImageSource}
                alt="Token"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative z-10 flex flex-col gap-1 w-full">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${isActive ? "bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-white/30"}`}
                  />
                  <span className="text-current opacity-90 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
                    {isActive
                      ? locale === "en"
                        ? "Your Position"
                        : "Posisi Kamu"
                      : locale === "en"
                        ? "Ready to Earn"
                        : "Siap Dapat Reward"}
                  </span>
                </div>
                {selectedAsset === 1 && connected && (
                  <button
                    type="button"
                    onClick={handleOpenTransactionHistory}
                    className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <Icon icon="mingcute:history-line" className="text-sm" />
                    {locale === "en" ? "History" : "Riwayat"}
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {isLoading ? (
                  <>
                    <div className="h-7 w-32 bg-black/10 dark:bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-black/10 dark:bg-white/10 rounded animate-pulse" />
                  </>
                ) : (
                  <>
                    <span
                      className={`text-current font-black text-xl sm:text-2xl tracking-tight leading-none ${!isActive && "opacity-40"}`}
                    >
                      {selectedAsset === 1
                        ? `${(connected ? liveUsdcBalance || 0 : 0).toFixed(6)} USDC`
                        : stakingMode === "liquid"
                          ? `${(connected ? stakingData?.mSolBalance || 0 : 0).toFixed(9)} mSOL`
                          : `${(connected ? stakingData?.nativeStakeBalance || 0 : 0).toFixed(9)} SOL`}
                    </span>
                    <span className="text-xs sm:text-sm opacity-60 leading-none">
                      ≈ $
                      {selectedAsset === 1
                        ? (connected ? liveUsdcBalance || 0 : 0).toFixed(2)
                        : stakingMode === "liquid"
                          ? (connected
                              ? (stakingData?.mSolBalance || 0) *
                                (stakingData?.mSolPrice || 1) *
                                ((price as any)?.usd || 0)
                              : 0
                            ).toFixed(2)
                          : (connected
                              ? (stakingData?.nativeStakeBalance || 0) *
                                ((price as any)?.usd || 0)
                              : 0
                            ).toFixed(2)}
                    </span>
                  </>
                )}
              </div>
              {!isActive && !isLoading && (
                <span className="text-[9px] sm:text-[10px] font-medium italic mt-1">
                  {locale === "en"
                    ? "No active stake found"
                    : "Tidak ada stake aktif"}
                </span>
              )}
            </div>
          </div>

          {/* --- PENDING / FARM REWARDS BOX --- */}
          <div className="glass-card relative flex-1 h-32 py-4 rounded-xl overflow-hidden flex items-center px-6 border border-white/10 bg-gradient-to-br from-white/10 to-transparent shadow-2xl">
            <div
              className="absolute z-0 pointer-events-none opacity-20"
              style={{
                width: "120px",
                height: "120px",
                right: "-24px",
                bottom: "-24px",
              }}
            >
              <Image
                src={bgImageSource}
                alt="Token"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative z-10 flex flex-col gap-1 w-full">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${isActive ? "bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-white/30"}`}
                  />
                  <span className="text-current opacity-90 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
                    {locale === "en" ? "Rewards" : "Reward"}
                  </span>
                </div>
                {selectedAsset === 1 && connected && (
                  <button
                    type="button"
                    onClick={handleOpenRewardReport}
                    className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <Icon icon="mingcute:chart-line-line" className="text-sm" />
                    {locale === "en" ? "Report" : "Laporan"}
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {isLoading ? (
                  <>
                    <div className="h-6 w-36 bg-black/10 dark:bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-black/10 dark:bg-white/10 rounded animate-pulse" />
                  </>
                ) : (
                  <>
                    <span
                      className={`text-green-400 font-black tracking-tight leading-none ${!isActive && "opacity-40"} ${selectedAsset === 1 || stakingMode === "liquid" || (selectedAsset === 0 && stakingMode === "native" && !(connected && stakingData?.pendingRewards > 0)) ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"}`}
                    >
                      {selectedAsset === 1
                        ? locale === "en"
                          ? "Auto-compounding"
                          : "Bunga Majemuk Otomatis"
                        : stakingMode === "liquid"
                          ? locale === "en"
                            ? "Auto-compounding"
                            : "Bunga Majemuk Otomatis"
                          : connected && stakingData?.pendingRewards > 0
                            ? `+${stakingData.pendingRewards.toFixed(6)} SOL`
                            : locale === "en"
                              ? "Auto-compounding"
                              : "Bunga Majemuk Otomatis"}
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-bold drop-shadow-sm leading-none ${selectedAsset === 1 ? "mt-1.5" : ""} ${!isActive && "opacity-40"}`}
                    >
                      {selectedAsset === 0 &&
                        stakingMode === "liquid" &&
                        `1 mSOL = ${(stakingData?.mSolPrice || 1.0).toFixed(4)} SOL`}
                      {selectedAsset === 1 &&
                        isActive &&
                        connected &&
                        usdcData?.pendingFarmRewards > 0 && (
                          <div className="inline-flex items-center gap-1.5 bg-green-500/20 text-green-400 px-2 py-0.5 rounded-md border border-green-500/20 shadow-sm mt-0.5">
                            <span className="text-[10px] sm:text-xs leading-none">
                              + Bonus
                            </span>
                          </div>
                        )}
                    </span>
                  </>
                )}
              </div>
              {!isActive && !isLoading && (
                <span className=" text-[9px] sm:text-[10px] font-medium italic mt-1">
                  {locale === "en" ? "No rewards yet" : "Belum ada reward"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* --- Manage Native Accounts Banner --- */}
        {selectedAsset === 0 &&
          stakingMode === "native" &&
          connected &&
          stakingData?.nativeAccounts?.length > 0 && (
            <div className="flex flex-col gap-5 mt-2">
              <div className="glass-card px-4 py-4 flex items-center justify-between border border-transparent shadow-sm rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-black/10 dark:border-white/10 shadow-sm flex justify-center items-center bg-black/5 dark:bg-white/5">
                    <div className="relative w-6 h-6 sm:w-8 sm:h-8">
                      <Image
                        src={solana}
                        alt="SOL"
                        fill
                        className="rounded-full object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm sm:text-base leading-tight">
                      {locale === "en"
                        ? "Native Staking Accounts"
                        : "Akun Native Staking"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-500">
                        {
                          stakingData.nativeAccounts.filter(
                            (acc: any) => acc.status === "active",
                          ).length
                        }{" "}
                        / {stakingData.nativeAccounts.length}{" "}
                        {locale === "en" ? "Active" : "Aktif"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  disabled={isProcessing}
                  onClick={() => setIsManageStakesOpen(true)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] bg-neutral-800 dark:bg-white text-white dark:text-black hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-50"
                >
                  {locale === "en" ? "Manage" : "Kelola"}
                </button>
              </div>
            </div>
          )}

        {/* --- Manage USDC Farm Rewards Banner --- */}
        {selectedAsset === 1 &&
          isActive &&
          connected &&
          (usdcData?.pendingFarmRewards || 0) > 0 && (
            <div className="flex flex-col gap-5 mt-2">
              <div className="glass-card px-4 py-4 flex items-center justify-between border border-transparent shadow-sm rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-black/10 dark:border-white/10 shadow-sm flex justify-center items-center bg-black/5 dark:bg-white/5">
                    <div className="relative w-6 h-6 sm:w-8 sm:h-8">
                      <Image
                        src={usdc}
                        alt="USDC"
                        fill
                        className="rounded-full object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm sm:text-base leading-tight">
                      {locale === "en"
                        ? "Bonus Rewards Available"
                        : "Reward Bonus Tersedia"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-500">
                        +{(usdcData?.pendingFarmRewards || 0).toFixed(6)} USDC
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  disabled={isProcessing}
                  onClick={() => setIsManageUsdcOpen(true)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] bg-neutral-800 dark:bg-white text-white dark:text-black hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-50"
                >
                  {locale === "en" ? "Claim" : "Klaim"}
                </button>
              </div>
            </div>
          )}

        {/* --- Toggle Stake or Unstake --- */}
        <div className="flex justify-between glass-card bgRound border-black/5 dark:border-white/10 shadow-sm mt-2">
          {[
            { label: locale === "en" ? "Stake" : "Stake", id: 0 },
            { label: locale === "en" ? "Unstake" : "Unstake", id: 1 },
          ].map((tab) => {
            const isActiveTab = activeTab === tab.id;
            const activeBgClass =
              (network === "hedera" || network === "polkadot") ? "bg-black dark:bg-white" : `bg-solana`;
            const activeTextClass =
              network === "hedera"
                ? "text-white dark:text-black"
                : "text-white";

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setAmount("");
                }}
                className={`w-full p-3 text-center rounded-full text-xs sm:text-sm transition-all duration-200 cursor-pointer ${isActiveTab ? `font-bold ${activeBgClass} ${activeTextClass}` : `font-medium hover:bg-solana/10`}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* --- Input Section --- */}
        <div className="glass-card rounded-2xl">
          <div className="py-4 px-4 md:py-6 md:px-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium opacity-60">
                {activeTab === 0
                  ? locale === "en"
                    ? "Stake"
                    : "Stake"
                  : locale === "en"
                    ? "Unstake"
                    : "Unstake"}
              </p>

              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium opacity-60">
                <Icon
                  icon={
                    activeTab === 0
                      ? "solar:wallet-bold"
                      : "solar:safe-square-bold"
                  }
                  className="text-base"
                />
                <span>
                  {displayBalance
                    ? displayBalance.toFixed(selectedAsset === 0 ? 9 : 6)
                    : "0"}{" "}
                  {activeTab === 0
                    ? selectedAsset === 0
                      ? "SOL"
                      : "USDC"
                    : selectedAsset === 1
                      ? "USDC"
                      : stakingMode === "liquid"
                        ? "mSOL"
                        : "SOL"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex flex-col flex-1 min-w-0">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none border-none truncate text-solana"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9]*\.?[0-9]*$/.test(val) || val === "") {
                      setIsMaxSelected(false);
                      setAmount(val);
                    }
                  }}
                  disabled={isProcessing}
                />
              </div>

              <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 glass-card rounded-full shadow-sm bg-white/5 dark:bg-white/5">
                {selectedAsset === 0 ? (
                  <>
                    <div className="relative w-6 h-6 sm:w-8 sm:h-8">
                      <Image
                        src={
                          activeTab === 1 && stakingMode === "liquid"
                            ? marinadesol
                            : solana
                        }
                        alt={
                          activeTab === 1 && stakingMode === "liquid"
                            ? "mSOL"
                            : "SOL"
                        }
                        fill
                        className="rounded-full object-contain"
                      />
                    </div>
                    <span className="font-bold text-sm sm:text-base pr-1">
                      {activeTab === 1 && stakingMode === "liquid"
                        ? "mSOL"
                        : "SOL"}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="relative w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                      <Image
                        src={usdc}
                        alt="USDC"
                        fill
                        className="rounded-full object-contain"
                      />
                    </div>
                    <span className="font-bold text-sm sm:text-base pr-1">
                      USDC
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Percentage Buttons & USD Value */}
            {/* Percentage Buttons & USD Value */}
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight">
                ≈ ${usdValue}
              </span>
              <div className="flex gap-1.5">
                {[0.25, 0.5, 1].map((pct) => {
                  // Same calculation handlePercentage actually uses to set the amount — kept
                  // as one shared function specifically so this "is it selected" check can't
                  // silently drift out of sync with it again.
                  const expectedAmount = computeTargetAmountForPercentage(pct);

                  const isMatch =
                    amount &&
                    parseFloat(amount) === expectedAmount &&
                    expectedAmount > 0;

                  return (
                    <button
                      key={pct}
                      onClick={() => handlePercentage(pct)}
                      disabled={isProcessing}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95 disabled:opacity-30 ${isMatch ? "bg-solana text-white shadow-lg shadow-solana/20" : "bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 opacity-60"}`}
                    >
                      {pct === 1 ? t("text42") : `${pct * 100}%`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transparent Fee Breakdown Receipt — hidden below the minimum stake volume
                entirely, since there's nothing meaningful to show (the amount can't be
                submitted anyway) and it previously showed fee numbers for an amount that
                was never going to be valid. */}
            <AnimatePresence>
              {amountNum > 0 && !isBelowMinimum && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-1.5 mt-2 px-1 border-t border-black/5 dark:border-white/10 pt-3 overflow-hidden"
                >
                  {activeTab === 0 ? (
                    <>
                      <div className="flex justify-between items-center text-xs opacity-60">
                        <span>
                          {locale === "en" ? "Stake Amount" : "Jumlah Stake"}
                        </span>
                        <span className="font-mono">
                          {amountNum.toFixed(selectedAsset === 0 ? 9 : 6)}{" "}
                          {inputCurrency}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs opacity-60">
                        <span>
                          {locale === "en" ? "Network Fee" : "Biaya Jaringan"}
                        </span>
                        <span className="font-mono">
                          {feeQuote
                            ? `${(feeQuote.networkFeeUi ?? 0).toFixed(selectedAsset === 0 ? 9 : 6)} ${feeCurrency}`
                            : "..."}
                        </span>
                      </div>

                      {feeQuote && (feeQuote.ataFeeUi || 0) > 0 && (
                        <div className="flex justify-between items-center text-xs opacity-60">
                          <span>
                            {locale === "en" ? "New Account Fee (ATA)" : "Biaya Akun Baru (ATA)"}
                          </span>
                          <span className="font-mono">
                            {feeQuote.ataFeeUi.toFixed(selectedAsset === 0 ? 9 : 6)} {feeCurrency}
                          </span>
                        </div>
                      )}

                      {isAtaNeeded &&
                        selectedAsset === 0 &&
                        stakingMode === "liquid" &&
                        !(feeQuote && (feeQuote.ataFeeUi || 0) > 0) && (
                          <div className="flex justify-between items-center text-xs opacity-60">
                            <span>
                              {locale === "en"
                                ? "mSOL Token Account Rent"
                                : "Rent Akun Token mSOL"}
                            </span>
                            <span className="font-mono">
                              {TOKEN_ATA_RENT} SOL
                            </span>
                          </div>
                        )}

                      <div className="flex justify-between items-center text-xs opacity-60">
                        <span>
                          {locale === "en" ? "Platform Fee" : "Biaya Platform"}
                        </span>
                        <span className="font-mono">
                          {(feeQuote?.platformFeeUi ?? amountNum * PARADAPP_MARINANDE_FEE).toFixed(selectedAsset === 0 ? 9 : 6)}{" "}
                          {feeCurrency}
                        </span>
                      </div>

                      {(() => {
                        // feeQuote.calculatedFeeUi is network fee + platform fee only — ATA
                        // rent is paid directly to Solana via Marinade's own instruction (see
                        // marinade.js's getOrCreateAssociatedTokenAccount call), not through
                        // our fee-collection instruction, so it has to be added in separately
                        // here for this to reflect everything that actually leaves the wallet.
                        //
                        // Total Deducted only renders once feeQuote has actually loaded —
                        // network fee and ATA rent aren't knowable locally (they depend on live
                        // network conditions), so showing a number built from estimatedFee's
                        // platform-fee-only guess meant the total quietly jumped upward the
                        // moment the real quote landed, sometimes past the wallet's balance
                        // right after the user had just looked at a total that fit.
                        //
                        // calculatedFeeUi is each flow's full non-stake-amount cost, and for the
                        // USDC/Kamino vault it already folds in ataFeeUi (see
                        // computeUsdcFeeBreakdown in marinade-stake.ts) — adding ataFeeUi again
                        // here double-counted it, so Total Deducted came out higher than the
                        // wallet's actual balance even when Max had reserved for it correctly.
                        // SOL deposits never populate feeQuote.ataFeeUi (Marinade's own
                        // instruction covers that ATA separately, shown via the static "mSOL
                        // Token Account Rent" line instead), so this only changes the USDC number.
                        const fees = feeQuote?.calculatedFeeUi ?? 0;
                        const totalDeductedAllIn = amountNum + fees;
                        // Only shown for a Max-selected SOL amount — this line explains why
                        // Max doesn't use your literal full balance (balance.confirmed is the
                        // wallet's native SOL balance; not relevant to a manually-typed amount
                        // or to a USDC deposit's leftover USDC).
                        const remainingInWallet =
                          feeQuote && selectedAsset === 0 && isMaxSelected
                            ? Math.max(0, (balance?.confirmed || 0) - totalDeductedAllIn)
                            : null;
                        return (
                          <>
                            <div className="flex justify-between items-center text-xs font-bold mt-1">
                              <span>
                                {locale === "en"
                                  ? "Total Deducted"
                                  : "Total Dipotong"}
                              </span>
                              <span className={`font-mono text-solana`}>
                                {feeQuote
                                  ? `${totalDeductedAllIn.toFixed(selectedAsset === 0 ? 9 : 6)} ${inputCurrency}`
                                  : "..."}
                              </span>
                            </div>
                            {remainingInWallet !== null && (
                              <div className="flex justify-between items-center text-[11px] opacity-50 mt-0.5">
                                <span>
                                  {locale === "en" ? "Rent Fee" : "Biaya Sewa"}
                                </span>
                                <span className="font-mono">
                                  {`${remainingInWallet.toFixed(9)} SOL`}
                                  {locale === "en"
                                    ? " (to keep account alive)"
                                    : " (untuk menjaga akun tetap aktif)"}
                                </span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      {selectedAsset === 0 && stakingMode === "liquid" && (
                        <div className="flex justify-between items-center text-xs font-bold mt-0.5">
                          <span>
                            {locale === "en" ? "Receive" : "Diterima"}
                          </span>
                          <span className="font-mono text-green-500">
                            {estimatedReceive.toFixed(9)} mSOL
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-xs opacity-60">
                        <span>
                          {locale === "en"
                            ? "Unstake Amount"
                            : "Jumlah Unstake"}
                        </span>
                        <span className="font-mono">
                          {amountNum.toFixed(selectedAsset === 0 ? 9 : 6)}{" "}
                          {inputCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs opacity-60">
                        <span>
                          {locale === "en" ? "Network Fee" : "Biaya Jaringan"}
                        </span>
                        <span className="font-mono">
                          {feeQuote
                            ? `${(feeQuote.networkFeeUi ?? 0).toFixed(selectedAsset === 0 ? 9 : 6)} ${feeCurrency}`
                            : "..."}
                        </span>
                      </div>

                      {feeQuote && (feeQuote.ataFeeUi || 0) > 0 && (
                        <div className="flex justify-between items-center text-xs opacity-60">
                          <span>
                            {locale === "en" ? "New Account Fee (ATA)" : "Biaya Akun Baru (ATA)"}
                          </span>
                          <span className="font-mono">
                            {feeQuote.ataFeeUi.toFixed(selectedAsset === 0 ? 9 : 6)} {feeCurrency}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs opacity-60">
                        <span>
                          {locale === "en" ? "Platform Fee" : "Biaya Platform"}
                        </span>
                        <span className="font-mono">
                          {(feeQuote?.platformFeeUi ?? estimatedFee).toFixed(selectedAsset === 0 ? 9 : 6)}{" "}
                          {feeCurrency}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold mt-1">
                        <span>
                          {locale === "en"
                            ? "Esimate Receive"
                            : "Estimasi Diterima"}
                        </span>
                        <span className="font-mono text-green-500">
                          {/* Same reasoning as Total Deducted above — network fee isn't
                              knowable locally, so this waits for the real quote rather than
                              showing a platform-fee-only guess that then jumps. */}
                          {feeQuote
                            ? `${Math.max(0, solEquivalent - (feeQuote.calculatedFeeUi ?? 0)).toFixed(selectedAsset === 0 ? 9 : 6)} ${receiveCurrency}`
                            : "..."}
                        </span>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- Button Select Strategy (SOL ONLY) --- */}
        {selectedAsset === 0 && (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full glass-card border-black/5 dark:border-white/10 rounded-2xl px-4 py-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <p className="text-sm sm:text-base font-medium opacity-80">
                {stakingMode === "native"
                  ? locale === "en"
                    ? "Native staking • Rewards in SOL"
                    : "Native staking • Reward dalam SOL"
                  : locale === "en"
                    ? "Liquid staking • Rewards in mSOL"
                    : "Liquid staking • Reward dalam mSOL"}
              </p>
            </div>

            <Icon
              icon="solar:settings-linear"
              className="text-xl sm:text-2xl opacity-60"
            />
          </button>
        )}
        <div className="glass-card p-5 rounded-2xl flex flex-col mt-2 border border-black/5 dark:border-white/10 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start z-10 relative">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest opacity-60">
                {selectedAsset === 1
                  ? locale === "en"
                    ? "Total Estimated APY"
                    : "Estimasi Total APY"
                  : locale === "en"
                    ? "Estimated APY"
                    : "Estimasi APY"}
              </span>
              <div className="flex items-end gap-2 mt-1">
                {isLoading ? (
                  <div className="h-10 w-24 bg-black/10 dark:bg-white/10 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-3xl sm:text-4xl font-black text-green-400 tracking-tight drop-shadow-sm leading-none">
                      {currentApy}%
                    </span>

                    {selectedAsset === 1 &&
                      usdcData?.apyReward &&
                      parseFloat(usdcData.apyReward) > 0 && (
                        <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-md border border-green-500/20 shadow-sm mb-1 sm:mb-1.5">
                          <span className="text-[10px] sm:text-xs font-bold leading-none">
                            +{usdcData.apyReward}%{" "}
                            {locale === "en" ? "Bonus" : "Bonus"}
                          </span>
                        </span>
                      )}
                  </>
                )}
              </div>

              {/* USDC Base Text Breakdown */}
              {selectedAsset === 1 && usdcData?.apyBase && !isLoading && (
                <span className="text-[10px] opacity-60 font-medium mt-1">
                  {locale === "en" ? "Base Yield:" : "Yield Dasar:"}{" "}
                  {usdcData.apyBase}%
                </span>
              )}
            </div>

            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest opacity-60">
                {locale === "en" ? "1 year Est. Reward" : "Estimasi 1 tahun"}
              </span>
              {isLoading ? (
                <>
                  <div className="h-6 w-20 bg-black/10 dark:bg-white/10 rounded animate-pulse mt-1" />
                  <div className="h-3 w-12 bg-black/10 dark:bg-white/10 rounded animate-pulse mt-1" />
                </>
              ) : (
                <>
                  <span className="text-base sm:text-lg font-bold tracking-tight leading-none mt-1">
                    +{" "}
                    {(
                      (parseFloat(amount) || 0) *
                      (parseFloat(currentApy) / 100)
                    ).toFixed(selectedAsset === 0 ? 9 : 6)}{" "}
                    {selectedAsset === 0 ? "SOL" : "USDC"}
                  </span>
                  <span className="text-xs opacity-40 font-medium leading-none mt-1">
                    ≈ $
                    {(
                      (parseFloat(usdValue) || 0) *
                      (parseFloat(currentApy) / 100)
                    ).toFixed(2)}
                  </span>
                </>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="h-16 w-full mt-4 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
          ) : (
            ((selectedAsset === 0 && stakingData?.chartData) ||
              (selectedAsset === 1 && usdcData?.chartData)) && (
              <SparklineChart
                data={
                  selectedAsset === 0
                    ? stakingMode === "native"
                      ? stakingData.chartData.native
                      : stakingData.chartData.liquid
                    : usdcData.chartData
                }
                colorClass="text-green-400"
                gradientFrom="#4ade80"
                gradientTo="#4ade80"
              />
            )
          )}
        </div>

        <Button
          buttonText={
            isProcessing
              ? t("text10")
              : isFetchingFeeQuote
                ? (locale === "en" ? "Calculating Fee..." : "Menghitung Biaya...")
                : isInsufficientBalance
                ? needsSolForNativeUnstakeFee
                  ? locale === "en"
                    ? "Need SOL for Fee"
                    : "Butuh SOL untuk Biaya"
                  : locale === "en"
                    ? "Insufficient Balance"
                    : "Saldo Tidak Cukup"
                : isBelowMinimum
                  ? locale === "en"
                    ? `Min ${minStakeVolume} ${feeCurrency}`
                    : `Min ${minStakeVolume} ${feeCurrency}`
                  : activeTab === 0
                    ? locale === "en"
                      ? `Stake ${inputCurrency}`
                      : `Stake ${inputCurrency}`
                    : locale === "en"
                      ? `Unstake ${inputCurrency}`
                      : `Unstake ${inputCurrency}`
          }
          chain="solana"
          onClick={() => handleAction()}
          disabled={
            isLoading ||
            !connected ||
            !amount ||
            parseFloat(amount) <= 0 ||
            isInsufficientBalance ||
            isBelowMinimum ||
            isProcessing ||
            isFetchingFeeQuote
          }
        />
      </div>

      {/* --- Settings Modal --- */}
      <AnimatedModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        maxWidthClass="lg:w-150"
      >
        <div className="flex flex-col gap-8 p-8">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">
              {locale === "en" ? "Stake settings" : "Pengaturan Stake"}
            </h2>
            <p className="text-[12px] opacity-70">
              {locale === "en"
                ? "Select native staking or liquid staking based on your preferences."
                : "Pilih native staking atau liquid staking berdasarkan preferensi kamu."}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setStakingMode("native");
                  setIsSettingsOpen(false);
                }}
                className={`p-5 rounded-2xl border-2 transition-all text-left flex items-center justify-between group ${stakingMode === "native" ? "border-solana bg-solana/5" : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"}`}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[17px] text-gray-900 dark:text-white">
                    {locale === "en" ? "Native" : "Native"}
                  </span>
                  <span className="text-[13px] text-gray-500 dark:text-white/50 font-medium">
                    {locale === "en"
                      ? "Native self-custody staking"
                      : "Staking self-custody native"}
                  </span>
                </div>
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${stakingMode === "native" ? "border-solana" : "border-gray-200 dark:border-white/20"}`}
                >
                  {stakingMode === "native" && (
                    <div className="w-3.5 h-3.5 rounded-full bg-solana" />
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  setStakingMode("liquid");
                  setIsSettingsOpen(false);
                }}
                className={`p-5 rounded-2xl border-2 transition-all text-left flex items-center justify-between group ${stakingMode === "liquid" ? "border-solana bg-solana/5" : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"}`}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[17px] text-gray-900 dark:text-white">
                    {locale === "en" ? "Liquid" : "Likuid"}
                  </span>
                  <span className="text-[13px] text-gray-500 dark:text-white/50 font-medium">
                    {locale === "en"
                      ? "Use mSOL across DeFi"
                      : "Gunakan mSOL di seluruh DeFi"}
                  </span>
                </div>
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${stakingMode === "liquid" ? "border-solana" : "border-gray-200 dark:border-white/20"}`}
                >
                  {stakingMode === "liquid" && (
                    <div className="w-3.5 h-3.5 rounded-full bg-solana" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          <div className="flex flex-col-reverse justify-center gap-3 w-full">
            <div className="w-full sm:w-auto min-w-[50%]">
              <ButtonContrast
                onClick={() => setIsSettingsOpen(false)}
                buttonText={t("text128")}
              />
            </div>
          </div>
        </div>
      </AnimatedModal>

      {/* --- Hedera-Style HOC Drawer for Managing Native Accounts --- */}
      <AnimatedModal
        isOpen={isManageStakesOpen}
        onClose={handleCloseManageDrawer}
        disableBackdropClick={isProcessing}
        maxWidthClass="lg:w-150"
        hideDragHandle={isProcessing}
      >
        <div className="flex flex-col gap-4 flex-1 overflow-y-auto p-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            {manageStep === "list" && (
              <motion.div
                key="list-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {locale === "en"
                      ? "Manage Native Stakes"
                      : "Kelola Stake Native"}
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-white/60 px-0.5 leading-tight mt-1">
                    {locale === "en"
                      ? "View and withdraw from your native staking accounts."
                      : "Lihat dan tarik saldo dari akun staking native kamu."}
                  </p>
                </div>

                <div className="flex items-center px-4 py-2.5 rounded-2xl border transition-all duration-300 bg-gray-50/80 border-black/5 focus-within:border-black/20 dark:bg-white/5 dark:border-white/10 dark:focus-within:border-white/30 backdrop-blur-md">
                  <Icon
                    icon="lucide:search"
                    className="text-xl text-gray-400 dark:text-white/30 mr-2 shrink-0"
                  />
                  <input
                    type="text"
                    placeholder={
                      locale === "en"
                        ? "Search by pubkey..."
                        : "Cari berdasarkan pubkey..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isProcessing}
                    className="bg-transparent outline-none w-full font-bold text-[13px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {filteredNativeAccounts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                        {locale === "en"
                          ? "No accounts found"
                          : "Tidak ada akun"}
                      </span>
                    </div>
                  ) : (
                    [...filteredNativeAccounts]
                      .sort((a: any, b: any) => {
                        if (
                          a.status === "deactivated" &&
                          b.status !== "deactivated"
                        )
                          return -1;
                        if (
                          a.status !== "deactivated" &&
                          b.status === "deactivated"
                        )
                          return 1;
                        return 0;
                      })
                      .map((acc: any) => (
                        <button
                          key={acc.pubkey}
                          disabled={acc.status !== "deactivated"}
                          onClick={() => {
                            if (!isProcessing && acc.status === "deactivated") {
                              setSelectedNativeAcc(acc);
                              setManageStep("confirm");
                            }
                          }}
                          className={`w-full text-left p-3 flex items-center justify-between rounded-xl border transition-all duration-200 group bg-gray-50/50 border-black/5 dark:bg-white/[0.03] dark:border-white/10 ${acc.status === "deactivated" ? "hover:bg-gray-100 dark:hover:bg-white/[0.08] cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-9 h-9 shrink-0 flex items-center justify-center rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                              <Icon
                                icon="token:sol"
                                className="text-lg opacity-80"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[13px] font-mono">
                                {acc.pubkey.slice(0, 6)}...
                                {acc.pubkey.slice(-6)}
                              </span>
                              <span className="text-[10px] opacity-60 italic text-gray-500 dark:text-white/40">
                                {acc.lamports / 1e9} SOL
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${acc.status === "active" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"}`}
                            >
                              {acc.status}
                            </span>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              </motion.div>
            )}

            {manageStep === "confirm" && selectedNativeAcc && (
              <motion.div
                key="confirm-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex flex-col gap-4 text-gray-900 dark:text-white"
              >
                <div className="flex justify-between items-center px-1">
                  <h2 className="font-bold text-2xl">
                    {locale === "en"
                      ? "Confirm Withdrawal"
                      : "Konfirmasi Penarikan"}
                  </h2>
                </div>

                <div className="flex flex-col gap-4">
                  <p className="text-sm opacity-70 leading-relaxed font-medium">
                    {locale === "en"
                      ? "You are about to withdraw your deactivated stake back to your main wallet balance."
                      : "Kamu akan menarik saldo stake yang telah dinonaktifkan kembali ke dompet utama kamu."}
                  </p>

                  <div className="w-full p-4 flex items-center justify-between rounded-2xl border transition-all duration-300 bg-gray-50/50 border-black/5 dark:bg-white/[0.03] dark:border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 shrink-0 flex items-center justify-center rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                        <Icon
                          icon="token:sol"
                          className="text-2xl text-solana opacity-80"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm sm:text-base leading-tight font-mono">
                          {selectedNativeAcc.pubkey.slice(0, 6)}...
                          {selectedNativeAcc.pubkey.slice(-6)}
                        </span>
                        <span className="text-[10px] opacity-60 italic text-gray-500 dark:text-white/40 mt-0.5">
                          {locale === "en"
                            ? "Status: Deactivated"
                            : "Status: Dinonaktifkan"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] opacity-40 leading-none font-bold uppercase tracking-tighter">
                          {locale === "en" ? "Available" : "Tersedia"}
                        </span>
                        <span className="font-bold text-base leading-none text-solana mt-1">
                          {selectedNativeAcc.lamports / 1e9} SOL
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          <div className="flex flex-col-reverse justify-center gap-3 w-full">
            {manageStep === "list" ? (
              <div className="w-full sm:w-auto min-w-[50%]">
                <ButtonContrast
                  onClick={handleCloseManageDrawer}
                  buttonText={t("text128")}
                />
              </div>
            ) : (
              <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
                <div className="w-full sm:flex-1">
                  <ButtonContrast
                    onClick={() => !isProcessing && setManageStep("list")}
                    buttonText={locale === "en" ? "Back" : "Kembali"}
                  />
                </div>
                <div className="w-full sm:flex-1">
                  <Button
                    chain={network}
                    onClick={() =>
                      handleAction(
                        selectedNativeAcc.pubkey,
                        selectedNativeAcc.lamports,
                      )
                    }
                    buttonText={
                      isProcessing
                        ? `${t("text10")}`
                        : locale === "en"
                          ? "Confirm Withdraw"
                          : "Konfirmasi Tarik"
                    }
                    disabled={isProcessing}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </AnimatedModal>

      {/* --- USDC Manage Farm Rewards Modal --- */}
      <AnimatedModal
        isOpen={isManageUsdcOpen}
        onClose={() => {
          if (!isProcessing) setIsManageUsdcOpen(false);
        }}
        maxWidthClass="lg:w-150"
        disableBackdropClick={isProcessing}
      >
        <div className="flex flex-col gap-8 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {locale === "en" ? "Claim Bonus Rewards" : "Klaim Reward Bonus"}
          </h2>
          <div className="flex flex-col gap-6">
            <p className="text-sm opacity-70 font-medium leading-relaxed">
              {locale === "en"
                ? "Your main position auto-compounds seamlessly. These are additional promotional incentives from the farm. You can claim these directly to your wallet."
                : "Posisi utama kamu otomatis mendapatkan bunga majemuk. Ini adalah insentif promosi tambahan dari farm. Kamu bisa mengklaimnya langsung ke dompet kamu."}
            </p>
            <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center gap-2 border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
              <span className="text-sm font-bold uppercase tracking-wider opacity-60">
                {locale === "en" ? "Claimable Rewards" : "Reward Dapat Diklaim"}
              </span>
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <Image
                    src={usdc}
                    alt="USDC"
                    fill
                    className="rounded-full object-contain"
                  />
                </div>
                <span className="text-3xl font-black text-green-500">
                  {(usdcData?.pendingFarmRewards || 0).toFixed(6)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast
                onClick={() => setIsManageUsdcOpen(false)}
                buttonText={locale === "en" ? "Cancel" : "Batal"}
                disabled={isProcessing}
              />
            </div>
            <div className="w-full sm:flex-1">
              <Button
                chain={network}
                onClick={handleUsdcRewards}
                buttonText={
                  isProcessing
                    ? t("text10")
                    : (usdcData?.pendingFarmRewards || 0) > 0 &&
                        (usdcData?.pendingFarmRewards || 0) <
                          MIN_CLAIM_REWARD_USDC
                      ? locale === "en"
                        ? `Min Claim ${MIN_CLAIM_REWARD_USDC} USDC`
                        : `Min Klaim ${MIN_CLAIM_REWARD_USDC} USDC`
                      : locale === "en"
                        ? "Claim to Wallet"
                        : "Klaim ke Dompet"
                }
                disabled={
                  isProcessing ||
                  (usdcData?.pendingFarmRewards || 0) < MIN_CLAIM_REWARD_USDC
                }
              />
            </div>
          </div>
        </div>
      </AnimatedModal>

      <AnimatedModal
        isOpen={isRewardReportOpen}
        onClose={() => setIsRewardReportOpen(false)}
        maxWidthClass="lg:w-150"
      >
        <div className="flex flex-col gap-4 p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <UsdcRewardReport
            history={rewardHistory}
            isLoading={isRewardHistoryLoading}
            locale={locale}
          />
        </div>
        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          <div className="flex justify-center w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast
                buttonText={locale === "en" ? "Close" : "Tutup"}
                onClick={() => setIsRewardReportOpen(false)}
              />
            </div>
          </div>
        </div>
      </AnimatedModal>

      <AnimatedModal
        isOpen={isTransactionHistoryOpen}
        onClose={() => setIsTransactionHistoryOpen(false)}
        maxWidthClass="lg:w-150"
      >
        <div className="flex flex-col gap-4 p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <UsdcTransactionHistory
            history={transactionHistory}
            isLoading={isTransactionHistoryLoading}
            locale={locale}
            networkExplorer={networkExplorer}
          />
        </div>
        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          <div className="flex justify-center w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast
                buttonText={locale === "en" ? "Close" : "Tutup"}
                onClick={() => setIsTransactionHistoryOpen(false)}
              />
            </div>
          </div>
        </div>
      </AnimatedModal>

      <AnimatedModal
        isOpen={showSuccessModal && !!txid}
        onClose={() => setShowSuccessModal(false)}
        maxWidthClass="lg:w-100"
      >
        <div className="flex flex-col justify-center text-center p-6 overflow-y-auto custom-scrollbar">
          <div
            className={`p-5 glass-card shadow-sm flex justify-center items-center mx-auto w-24 h-24 rounded-full mb-5 ${colorFlip}`}
          >
            <FaCheckCircle className="text-6xl" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("text32")}</h2>
          <p className="text-sm break-all mb-4">Hash: {txid}</p>
        </div>
        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          <div className="flex flex-col-reverse justify-center gap-3 w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast
                onClick={() => setShowSuccessModal(false)}
                buttonText={t("text128")}
              />
            </div>
            <div className="w-full sm:flex-1">
              <Button
                chain={network}
                buttonText={`${t("text79")}`}
                onClick={() =>
                  window.open(
                    `${(networkExplorer as any).transaction}${txid}${(networkExplorer as any).urlSuffix || ""}`,
                    "_blank",
                  )
                }
              />
            </div>
          </div>
        </div>
      </AnimatedModal>

      <AnimatedModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        maxWidthClass="lg:w-100"
      >
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
              <ButtonContrast
                onClick={() => setShowErrorModal(false)}
                buttonText={t("text128")}
              />
            </div>
          </div>
        </div>
      </AnimatedModal>

      <InformationPopUp
        isOpen={isMainInfoOpen}
        onClose={() => setIsMainInfoOpen(false)}
        title={locale === "en" ? "Staking Rewards" : "Reward Staking"}
        image={
          selectedAsset === 1
            ? usdcstakebanner
            : stakingMode === "native"
              ? solanastakebanner
              : marinadesolanastakebanner
        }
        description={
          selectedAsset === 1
            ? locale === "en"
              ? "Earn a stable yield on your USDC without exposure to price volatility. Your assets are deployed into trusted Solana DeFi protocols automatically."
              : "Dapatkan yield stabil pada USDC kamu tanpa terpapar volatilitas harga. Aset kamu dialokasikan ke protokol DeFi Solana tepercaya secara otomatis."
            : stakingMode === "native"
              ? locale === "en"
                ? "Stake your SOL directly to a validator to help decentralize the network and earn native rewards. Your funds remain entirely in your custody."
                : "Stake SOL kamu langsung ke validator untuk membantu desentralisasi jaringan dan dapatkan reward native. Dana kamu tetap sepenuhnya dalam kendali kamu."
              : locale === "en"
                ? "Liquid stake your SOL to receive mSOL. Earn staking rewards while maintaining the flexibility to use your assets across Solana DeFi protocols."
                : "Liquid stake SOL kamu untuk menerima mSOL. Dapatkan reward staking sambil mempertahankan fleksibilitas untuk menggunakan aset kamu di berbagai protokol DeFi Solana."
        }
      />
    </div>
  );
};

export default SolanaStake;
