"use client";

import Button from "@/subcomponents/Button";
import { useTranslations } from "next-intl";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";

import { format, toZonedTime } from "date-fns-tz";
import QRCode from "qrcode";
import { logos, mandiri, bri, bca, bni, permata, qris, gopay, ovo, dana, shopeepay, linkaja } from "@/index";
import Image from "next/image";
import { SupportedChain } from "@/app/network-provider";
import { useHederaWallet } from "@/components/hedera/hedera-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { usePolkadotWallet } from "@/components/polkadot/polkadot-provider";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";

import { useNetwork } from "@/app/network-provider";
import { Icon } from "@iconify/react";
import { FaCheckCircle, FaExclamationCircle, FaLink } from "react-icons/fa";
import { BitcoinConnectButton } from "@/subcomponents/BitcoinConnectButton";
import { HederaConnectButton } from "@/subcomponents/HederaConnectButton";
import { EthereumConnectButton } from "@/subcomponents/EthereumConnectButton";
import { SolanaConnectButton } from "@/subcomponents/SolanaConnectButton";
import { PolkadotConnectButton } from "@/subcomponents/PolkadotConnectButton";
import { TempoConnectButton } from "@/subcomponents/TempoConnectButton";
import { HyperliquidConnectButton } from "@/subcomponents/HyperliquidConnectButton";
import { RobinhoodConnectButton } from "@/subcomponents/RobinhoodConnectButton";
import { BaseConnectButton } from "@/subcomponents/BaseConnectButton";
import { ArbitrumConnectButton } from "@/subcomponents/ArbitrumConnectButton";
import ButtonContrast from "@/subcomponents/ButtonContrast";
import { AnimatedModal } from "@/subcomponents/AnimatedModal";
import {
  SOLANA_NATIVE_MINT,
  USDC_MINT_DEVNET,
} from "@/components/solana/config/constants";
import {
  subscribeOnChainTransfer,
  DetectedTransfer,
} from "@/lib/onchain-transfer-subscriber";

type PayoutNote = {
  etaLocal: string;
  reason: string;
  note: {
    id: string;
    en: string;
  };
};

function formatETA(totalSeconds: number, locale: string): string {
  if (totalSeconds <= 0) {
    return locale === "id" ? "selesai sesaat lagi" : "finalizing soon";
  }

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const parts = [];

  if (h > 0) parts.push(`${h}${locale === "id" ? "j" : "h"}`);

  if (m > 0) parts.push(`${m}m`);

  if (s > 0 && h === 0) parts.push(`${s}${locale === "id" ? "d" : "s"}`);

  return parts.join(" ");
}

function AnimatedEllipsis() {
  return (
    <span className="inline-flex tracking-widest ml-0.5 font-normal">
      <span className="animate-pulse [animation-duration:1.4s] [animation-delay:0ms]">.</span>
      <span className="animate-pulse [animation-duration:1.4s] [animation-delay:200ms]">.</span>
      <span className="animate-pulse [animation-duration:1.4s] [animation-delay:400ms]">.</span>
    </span>
  );
}

function getPayoutETA(
  bankCode: string,
  amountIDR: number,
  requestTime: Date,
  userTimezone: string,
): PayoutNote {
  const BANK_RULES = [
    {
      code: "ID_BCA",
      numericCode: "014",
      maxAmount: 250_000_000,
      delayedHours: 4,
      inactiveRange: [[23, 3]],
      reason: {
        id: "Maintenance Bank BCA",
        en: "BCA System Maintenance",
      },
    },
    {
      code: "ID_MANDIRI",
      numericCode: "008",
      delayedHours: 4,
      inactiveRange: [[23, 3]],
      reason: {
        id: "Maintenance Bank Mandiri",
        en: "Mandiri System Maintenance",
      },
    },
    {
      code: "ID_BRI",
      numericCode: "002",
      delayedHours: 4,
      inactiveRange: [[23, 3]],
      reason: {
        id: "Maintenance Bank BRI",
        en: "BRI System Maintenance",
      },
    },
    {
      code: "ID_BNI",
      numericCode: "009",
      delayedHours: 3,
      inactiveRange: [[23, 2]],
      reason: {
        id: "Maintenance Bank BNI",
        en: "BNI System Maintenance",
      },
    },
    {
      code: "ID_PERMATA",
      numericCode: "087",
      delayedHours: 1,
      inactiveRange: [[23, 0]],
      reason: {
        id: "Maintenance Bank Permata",
        en: "Permata System Maintenance",
      },
    },
  ];

  const jakartaTZ = "Asia/Jakarta";
  const localTZ = userTimezone;

  const jakartaTime = toZonedTime(requestTime, jakartaTZ);
  const currentHour = jakartaTime.getHours();

  const rule = BANK_RULES.find((r) => {
    if (r.code !== bankCode && r.numericCode !== bankCode) return false;
    if (r.maxAmount !== undefined && amountIDR > r.maxAmount) return false;
    return true;
  });

  const isHourInRange = (hour: number, start: number, end: number): boolean => {
    if (start <= end) {
      return hour >= start && hour < end;
    } else {
      return hour >= start || hour < end;
    }
  };

  if (rule) {
    const isInactive = rule.inactiveRange.some(([start, end]) =>
      isHourInRange(currentHour, start, end),
    );

    if (isInactive) {
      const [inactiveStartHour, inactiveEndHour] = rule.inactiveRange[0];

      const endTime = new Date(jakartaTime);
      if (inactiveEndHour <= inactiveStartHour) {
        if (currentHour >= inactiveStartHour) {
          endTime.setDate(endTime.getDate() + 1);
        } else if (currentHour < inactiveEndHour) {
        }
      } else if (currentHour >= inactiveEndHour) {
        endTime.setDate(endTime.getDate() + 1);
      }

      endTime.setHours(inactiveEndHour, 0, 0, 0);

      const processTime = new Date(endTime.getTime() + 15 * 60 * 1000);
      const etaLocal = format(toZonedTime(processTime, localTZ), "HH:mm", {
        timeZone: localTZ,
      });

      return {
        etaLocal,
        reason: rule.reason.en,
        note: {
          id: `Dana kamu akan diproses setelah maintenance karena ${rule.reason.id.toLowerCase()}. Estimasi dana diterima sekitar pukul ${etaLocal} waktu kamu.`,
          en: `Your payout will be processed after maintenance due to ${rule.reason.en.toLowerCase()}. Expected to arrive around ${etaLocal} your time.`,
        },
      };
    }
  }

  const etaDate = new Date(requestTime.getTime() + 15 * 60 * 1000);
  const etaLocal = format(toZonedTime(etaDate, localTZ), "HH:mm", {
    timeZone: localTZ,
  });

  return {
    etaLocal,
    reason: "Normal Processing",
    note: {
      id: `Dana kamu diperkirakan akan tiba sekitar 15 menit setelah token yang kamu kirim telah dikonfirmasi.`,
      en: `Your fund is expected to arrive around 15 minutes after the token you transfer has confirmed.`,
    },
  };
}

export default function VaultTransactionPage() {
  const { locale, network, id } = useParams<{
    locale: string;
    network: SupportedChain;
    id: string;
  }>();

  const colorFlip = "text-black";
  const bgFlip = "bg-black";
  const activeStepText = "text-white";

  const router = useRouter();

  const bitcoinNetwork = useBitcoinWallet();
  const hederaNetwork = useHederaWallet();
  const ethereumNetwork = useEthereumWallet();
  const solanaNetwork = useSolanaWallet();
  const polkadotNetwork = usePolkadotWallet();
  const tempoNetwork = useTempoWallet();
  const hyperliquidNetwork = useHyperliquidWallet();
  const robinhoodNetwork = useRobinhoodWallet();
  const baseNetwork = useBaseWallet();
  const arbitrumNetwork = useArbitrumWallet();

  const {
    bitcoinMainnet,
    setBitcoinMainnet,
    hederaMainnet,
    setHederaMainnet,
    ethereumMainnet,
    setEthereumMainnet,
    solanaMainnet,
    setSolanaMainnet,
    polkadotMainnet,
    setPolkadotMainnet,
    tempoMainnet,
    setTempoMainnet,
    hyperliquidMainnet,
    setHyperliquidMainnet,
    robinhoodMainnet,
    setRobinhoodMainnet,
    baseMainnet,
    setBaseMainnet,
    arbitrumMainnet,
    setArbitrumMainnet,
  } = useNetwork();

  const [gaslessQuote, setGaslessQuote] = useState<any>(null);
  const [isFetchingGasless, setIsFetchingGasless] = useState(false);
  const [isSendProcessing, setIsSendProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [txid, setTxid] = useState<string | null>(null);
  const [onChainDetectedTx, setOnChainDetectedTx] =
    useState<DetectedTransfer | null>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [estimatedValue, setEstimatedValue] = useState<number | string | null>(
    null,
  );

  const activeNetworkConfig = useMemo(() => {
    const configs = {
      bitcoin: {
        isMainnet: bitcoinMainnet,
        setter: setBitcoinMainnet,
        name: bitcoinNetwork?.networkName,
      },
      hedera: {
        isMainnet: hederaMainnet,
        setter: setHederaMainnet,
        name: hederaNetwork?.networkName,
      },
      ethereum: {
        isMainnet: ethereumMainnet,
        setter: setEthereumMainnet,
        name: ethereumNetwork?.networkName,
      },
      solana: {
        isMainnet: solanaMainnet,
        setter: setSolanaMainnet,
        name: solanaNetwork?.networkName,
      },
      polkadot: {
        isMainnet: polkadotMainnet,
        setter: setPolkadotMainnet,
        name: polkadotNetwork?.networkName,
      },
      tempo: {
        isMainnet: tempoMainnet,
        setter: setTempoMainnet,
        name: tempoNetwork?.networkName,
      },
      hyperliquid: {
        isMainnet: hyperliquidMainnet,
        setter: setHyperliquidMainnet,
        name: hyperliquidNetwork?.networkName,
      },
      robinhood: {
        isMainnet: robinhoodMainnet,
        setter: setRobinhoodMainnet,
        name: robinhoodNetwork?.networkName,
      },
      base: {
        isMainnet: baseMainnet,
        setter: setBaseMainnet,
        name: baseNetwork?.networkName,
      },
      arbitrum: {
        isMainnet: arbitrumMainnet,
        setter: setArbitrumMainnet,
        name: arbitrumNetwork?.networkName,
      },
    };
    return configs[network as keyof typeof configs];
  }, [
    network,
    bitcoinMainnet,
    hederaMainnet,
    ethereumMainnet,
    solanaMainnet,
    polkadotMainnet,
    tempoMainnet,
    hyperliquidMainnet,
    robinhoodMainnet,
    baseMainnet,
    arbitrumMainnet,
    bitcoinNetwork,
    hederaNetwork,
    ethereumNetwork,
    solanaNetwork,
    polkadotNetwork,
    tempoNetwork,
    hyperliquidNetwork,
    robinhoodNetwork,
    baseNetwork,
    arbitrumNetwork,
  ]);

  const txNetworkMismatch = useMemo(() => {
    if (!transaction || !transaction.networkEnv || !activeNetworkConfig)
      return null;

    const currentMode = activeNetworkConfig.isMainnet ? "MAINNET" : "TESTNET";

    if (currentMode !== transaction.networkEnv) {
      return {
        ...activeNetworkConfig,
        requiredEnv: transaction.networkEnv,
      };
    }
    return null;
  }, [transaction, activeNetworkConfig]);

  const hasActiveMismatch = !!txNetworkMismatch;

  const handleSwitchCurrent = () => {
    if (txNetworkMismatch) {
      txNetworkMismatch.setter(txNetworkMismatch.requiredEnv === "MAINNET");
    }
  };

  const dynamicMismatchText = useMemo(() => {
    if (!txNetworkMismatch) return "";
    return locale === "id"
      ? `Mohon ganti ke mode ${txNetworkMismatch.requiredEnv} di pengaturan wallet ${txNetworkMismatch.name} untuk melihat transaksi ini.`
      : `Please switch to ${txNetworkMismatch.requiredEnv.toLowerCase()} mode in ${txNetworkMismatch.name} wallet settings to view this transaction.`;
  }, [txNetworkMismatch, locale]);
const handleConfirmSend = async (toAddress: string, amountToken: number) => {
    try {
      setIsSendProcessing(true);

      let resultTxid;

      if (network === "solana") {
        // Signed by the wallet (paradapp's relayer was removed).
        resultTxid = await activeProvider.sendTokenTo(toAddress, amountToken, undefined, txTokenDetails?.isNative === false ? txTokenDetails?.mint : undefined, txTokenDetails?.decimals);
      } else {
    
        resultTxid = await activeProvider.sendTokenTo(toAddress, amountToken);
      }

      if (resultTxid) {
        setTxid(resultTxid);
        setShowSuccessModal(true);
      } else {
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error("Transaction Error:", error);
      setShowErrorModal(true);
    } finally {
      setIsSendProcessing(false);
    }
  };

  let fetchETA: any;
  let networkExplorer;

  if (network == "bitcoin") {
    fetchETA = bitcoinNetwork.fetchETA;
    networkExplorer = bitcoinNetwork.networkExplorer;
  } else if (network == "hedera") {
    fetchETA = hederaNetwork.fetchETA;
    networkExplorer = hederaNetwork.networkExplorer;
  } else if (network == "ethereum") {
    fetchETA = ethereumNetwork.fetchETA;
    networkExplorer = ethereumNetwork.networkExplorer;
  } else if (network == "polkadot") {
    fetchETA = polkadotNetwork.fetchETA;
    networkExplorer = polkadotNetwork.networkExplorer;
  } else if (network == "tempo") {
    fetchETA = tempoNetwork.fetchETA;
    networkExplorer = tempoNetwork.networkExplorer;
  } else if (network == "hyperliquid") {
    fetchETA = hyperliquidNetwork.fetchETA;
    networkExplorer = hyperliquidNetwork.networkExplorer;
  } else if (network == "robinhood") {
    fetchETA = robinhoodNetwork.fetchETA;
    networkExplorer = robinhoodNetwork.networkExplorer;
  } else if (network == "base") {
    fetchETA = baseNetwork.fetchETA;
    networkExplorer = baseNetwork.networkExplorer;
  } else if (network == "arbitrum") {
    fetchETA = arbitrumNetwork.fetchETA;
    networkExplorer = arbitrumNetwork.networkExplorer;
  } else {
    fetchETA = solanaNetwork.fetchETA;
    networkExplorer = solanaNetwork.networkExplorer;
  }

  const withdrawDestinationSelection = [
    { code: "ID_BCA", name: "Bank BCA", type: "BANK" },
    { code: "ID_BRI", name: "Bank BRI", type: "BANK" },
    { code: "ID_BNI", name: "Bank BNI", type: "BANK" },
    { code: "ID_MANDIRI", name: "Bank Mandiri", type: "BANK" },
    { code: "ID_PERMATA", name: "Bank Permata", type: "BANK" },
  ];

  const t = useTranslations("All");
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("--:--");
  const [isExpired, setIsExpired] = useState(false);

  const [tokenConfirmETA, setTokenConfirmETA] = useState<{
    estimatedSeconds: number;
    isCongested: boolean;
  } | null>(null);

  const [payoutNote, setPayoutNote] = useState<PayoutNote | null>(null);
  const [sendMode, setSendMode] = useState<"AUTO" | "MANUAL">("AUTO");

let connected, address;

  if (network === "bitcoin") {
    connected = bitcoinNetwork.connected;
    address = bitcoinNetwork.address;
  } else if (network === "hedera") {
    connected = hederaNetwork.connected;
    address = hederaNetwork.address;
  } else if (network === "ethereum") {
    connected = ethereumNetwork.connected;
    address = ethereumNetwork.address;
  } else if (network === "polkadot") {
    connected = polkadotNetwork.connected;
    address = polkadotNetwork.address;
  } else if (network === "tempo") {
    connected = tempoNetwork.connected;
    address = tempoNetwork.address;
  } else if (network === "hyperliquid") {
    connected = hyperliquidNetwork.connected;
    address = hyperliquidNetwork.address;
  } else if (network === "robinhood") {
    connected = robinhoodNetwork.connected;
    address = robinhoodNetwork.address;
  } else if (network === "base") {
    connected = baseNetwork.connected;
    address = baseNetwork.address;
  } else if (network === "arbitrum") {
    connected = arbitrumNetwork.connected;
    address = arbitrumNetwork.address;
  } else {
    connected = solanaNetwork.connected;
    address = solanaNetwork.address;
  }

  const activeProvider: any = useMemo(() => {
    switch (network) {
      case "bitcoin":
        return bitcoinNetwork;
      case "hedera":
        return hederaNetwork;
      case "ethereum":
        return ethereumNetwork;
      case "solana":
        return solanaNetwork;
      case "polkadot":
        return polkadotNetwork;
      case "tempo":
        return tempoNetwork;
      case "hyperliquid":
        return hyperliquidNetwork;
      case "robinhood":
        return robinhoodNetwork;
      case "base":
        return baseNetwork;
      case "arbitrum":
        return arbitrumNetwork;
      default:
        return null;
    }
  }, [network, bitcoinNetwork, hederaNetwork, ethereumNetwork, solanaNetwork, polkadotNetwork, tempoNetwork, hyperliquidNetwork, robinhoodNetwork, baseNetwork, arbitrumNetwork]);

  const isAuthorized = useMemo(() => {
    if (!transaction || !activeProvider || !activeProvider.connected)
      return false;

    const connectedAddress =
      network === "hedera" && activeProvider.resolvedAddress
        ? activeProvider.resolvedAddress.toLowerCase()
        : activeProvider.address?.toLowerCase();

    const txAddress = transaction.walletAddress?.toLowerCase();

    return connectedAddress === txAddress;
  }, [transaction, activeProvider, network]);

  const txTokenDetails = useMemo(() => {
    if (!transaction || !transaction.tokenType) return null;
    const tokenSymbolOrMint = transaction.tokenType.trim();
    const upperSymbolOrMint = tokenSymbolOrMint.toUpperCase();
    const isTxMainnet = transaction.networkEnv === "MAINNET";

    if (network === "solana") {
      const isNative =
        upperSymbolOrMint === "SOL" ||
        tokenSymbolOrMint === SOLANA_NATIVE_MINT ||
        !!transaction.isNative;
      let mint = isNative ? SOLANA_NATIVE_MINT : tokenSymbolOrMint;
      let symbol = upperSymbolOrMint;
      let decimals = isNative ? 9 : 6;

      const meta = solanaNetwork?.verifiedTokensData?.find(
        (v: any) =>
          v.mint === tokenSymbolOrMint ||
          v.symbol?.toUpperCase() === upperSymbolOrMint ||
          (isNative &&
            (v.mint === SOLANA_NATIVE_MINT ||
              v.symbol?.toUpperCase() === "SOL")),
      );

      if (meta) {
        mint = meta.mint;
        symbol = meta.symbol;
        decimals = meta.decimals;
      }

      if (!isTxMainnet && !isNative) {
        if (symbol === "USDC" || mint === USDC_MINT_DEVNET) {
          mint = USDC_MINT_DEVNET;
        }
      }

      return { mint, symbol, decimals, isNative };
    }

    return {
      mint: null,
      symbol: transaction.tokenType,
      decimals: activeProvider?.decimals || 18,
      isNative: true,
    };
  }, [transaction, network, solanaNetwork?.verifiedTokensData, activeProvider]);

  const txTokenTicker = useMemo(() => {
    return txTokenDetails?.symbol || transaction?.tokenType || "";
  }, [txTokenDetails, transaction]);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copiedVa, setCopiedVa] = useState(false);
  const [copiedAmt, setCopiedAmt] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedTokenAmt, setCopiedTokenAmt] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [openGuide, setOpenGuide] = useState<string | null>("mbanking");

  const isOwner = useMemo(() => {
    if (!address || !transaction?.walletAddress) return false;
    return address.toLowerCase() === transaction.walletAddress.toLowerCase();
  }, [address, transaction?.walletAddress]);

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/transaction/${id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address || transaction?.walletAddress,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsExpired(true);
        setTimeLeft("00:00");
        setShowCancelModal(false);
        await fetchTransaction();
      } else {
        alert(data.error || "Failed to cancel transaction");
      }
    } catch (err) {
      console.error("Cancel transaction error:", err);
      alert("Failed to cancel transaction. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setIsMarkingPaid(true);
    try {
      const res = await fetch(`/api/transaction/${id}/mark-paid`, {
        method: "PATCH",
      });

      const data = await res.json();

      if (data.success) {
        await fetchTransaction();
      }
    } catch (err) {
      console.error("Payment confirmation error:", err);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const fetchTransaction = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/transaction/${id}`);
      if (!res.ok) throw new Error("Failed to fetch transaction");
      const data = await res.json();
      if (data.transaction) {
        setTransaction(data.transaction);
        if (data.transaction.status !== "EXPIRED" && data.transaction.status !== "WAITING") {
          setIsExpired(false);
        } else if (data.transaction.status === "EXPIRED") {
          setIsExpired(true);
        }
      }

      if (
        data.transaction?.type === "WITHDRAWAL" &&
        (data.transaction?.paymentDetails?.bankCode || data.transaction?.paymentDetails?.method)
      ) {
        const note = getPayoutETA(
          data.transaction.paymentDetails.bankCode || data.transaction.paymentDetails.method,
          data.transaction.idrAmount ?? 0,
          new Date(data.transaction.updatedAt),
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        );
        setPayoutNote(note);
      }
    } catch (err) {
      console.error("Error fetching transaction:", err);
    } finally {
      setIsLoading(false);
    }
  };

// Solana sends are signed by the wallet (paradapp's relayer was removed): no relayer quote.
  useEffect(() => {
    fetchTransaction();
    const txInterval = setInterval(fetchTransaction, 10000);
    return () => {
      clearInterval(txInterval);
    };
  }, []);

  useEffect(() => {
    if (
      !transaction ||
      transaction.type !== "WITHDRAWAL" ||
      transaction.status !== "WAITING"
    ) {
      return;
    }

    const operatorAddress = transaction.paymentDetails?.paradappAddress;
    const userAddress = transaction.walletAddress;
    const expectedAmount = Number(transaction.tokenAmount || 0);
    const tokenType = transaction.tokenType;
    const isMainnet = transaction.networkEnv
      ? transaction.networkEnv === "MAINNET"
      : (activeNetworkConfig?.isMainnet ?? false);
    const txCreatedAt = transaction.createdAt;

    if (!operatorAddress || !userAddress || !expectedAmount) return;

    const unsubscribe = subscribeOnChainTransfer({
      network,
      userAddress,
      operatorAddress,
      expectedAmount,
      tokenType,
      isMainnet,
      txCreatedAt,
      onDetected: (detected) => {
        setOnChainDetectedTx(detected);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [
    transaction?.type,
    transaction?.status,
    transaction?.walletAddress,
    transaction?.paymentDetails?.paradappAddress,
    transaction?.tokenAmount,
    transaction?.tokenType,
    transaction?.networkEnv,
    transaction?.createdAt,
    network,
    activeNetworkConfig?.isMainnet,
  ]);

  useEffect(() => {
    if (!transaction || transaction.status == "COMPLETED") return;

    const fetchEstimate = async () => {
      const tokenAmt = Number(transaction.tokenAmount ?? 0);
      const idrAmt = Number(transaction.idrAmount ?? 0);
      const isDeposit = transaction.type === "DEPOSIT";
      const isWithdrawal = transaction.type === "WITHDRAWAL";
      const txEnv =
        transaction.networkEnv ||
        (activeNetworkConfig?.isMainnet ? "MAINNET" : "TESTNET");
      const tokenSymbol = transaction.tokenType.toUpperCase();

      if (isDeposit && tokenAmt === 0 && idrAmt > 0) {
        try {
          const params = new URLSearchParams({
            network: network.toUpperCase(),
            token: tokenSymbol,
            idr: idrAmt.toString(),
            paymentMethod: transaction.paymentDetails?.method,
            env: txEnv,
          });
          const res = await fetch(`/api/estimate-deposit?${params.toString()}`);
          const data = await res.json();
          if (data.token) setEstimatedValue(data.token);
        } catch (e) {
          console.error("Deposit Estimate Error:", e);
        }
      } else if (isWithdrawal && idrAmt === 0 && tokenAmt > 0) {
        try {
          const params = new URLSearchParams({
            network: network.toUpperCase(),
            token: tokenSymbol,
            amount: tokenAmt.toString(),
            env: txEnv,
          });
          const res = await fetch(
            `/api/estimate-withdraw?${params.toString()}`,
          );
          const result = await res.json();
          if (result?.data?.netIdr)
            setEstimatedValue(parseFloat(result.data.netIdr));
        } catch (e) {
          console.error("Withdraw Estimate Error:", e);
        }
      }
    };

    fetchEstimate();
  }, [transaction]);

  useEffect(() => {
    if (!transaction?.createdAt) return;

    if (transaction.status !== "WAITING" && transaction.status !== "EXPIRED") {
      setIsExpired(false);
      return;
    }

    if (transaction.status === "EXPIRED") {
      setIsExpired(true);
      setTimeLeft("00:00");
      return;
    }

    const interval = setInterval(() => {
      const created = new Date(transaction.createdAt);
      const now = new Date();
      const expiry = transaction.expiresAt
        ? new Date(transaction.expiresAt)
        : transaction.paymentDetails?.expiresAt
          ? new Date(transaction.paymentDetails.expiresAt)
          : new Date(
              created.getTime() +
                (transaction.paymentDetails?.expiryPeriodMinutes ?? 120) *
                  60 *
                  1000,
            );
      const remaining = expiry.getTime() - now.getTime();

      if (remaining <= 0) {
        setIsExpired(true);
        setTimeLeft("00:00");
        clearInterval(interval);
        return;
      }

      const totalSec = Math.floor(remaining / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      if (hours > 0) {
        setTimeLeft(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
        );
      } else {
        setTimeLeft(
          `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [transaction]);

  useEffect(() => {
    const fetchEstimate = async () => {
      const res = await fetchETA(transaction?.txHash);
      setTokenConfirmETA(res);
    };

    fetchEstimate();
    const etaInterval = setInterval(fetchEstimate, 60000);

    return () => {
      clearInterval(etaInterval);
    };
  }, [transaction?.txHash, transaction?.status]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Continuously poll transaction status while waiting for confirmation
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      fetchTransaction();
    }, 4000);

    return () => clearInterval(interval);
  }, [id]);

  // Listen for payment return messages to trigger live transaction refetch
  useEffect(() => {
    const handlePaymentMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "PARADAPP_RELOAD_PAYMENT_URL" ||
        event.data?.type === "PARADAPP_NAVIGATED_AWAY" ||
        event.data?.type === "PARADAPP_CLOSE_PAYMENT_POPUP" ||
        event.data?.type === "PARADAPP_PAYMENT_RETURN"
      ) {
        fetchTransaction();
      }
    };

    window.addEventListener("message", handlePaymentMessage);
    return () => window.removeEventListener("message", handlePaymentMessage);
  }, []);

  const qrString =
    transaction?.paymentDetails?.qrContent ||
    transaction?.paymentDetails?.qrString ||
    transaction?.idrxDetails?.qrContent ||
    transaction?.idrx_details?.qrContent ||
    "";

  useEffect(() => {
    if (qrString) {
      QRCode.toDataURL(qrString, {
        width: 360,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then(setQrDataUrl)
        .catch((err) => {
          console.error("Failed to generate QR code data URL", err);
        });
    }
  }, [qrString]);

  if (isLoading && !transaction) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center space-y-3">
          <div
            className={`animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full`}
          ></div>
          <p className="text-sm ">{t("text74")}</p>
        </div>
      </div>
    );
  }

  if (!transaction)
    return <p className="text-center text-sm mt-10">{t("text66")}</p>;

  if (hasActiveMismatch) {
    const handleShareLink = () => {
      navigator.clipboard.writeText(window.location.href);
    };

    return (
      <div className="pb-40 lg:pb-32">
        <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Image src={logos} alt="logo" className="w-6 h-6" />
            <span className="text-sm font-bold">Paradapp</span>
          </div>
          {network === "bitcoin" ? (
            <BitcoinConnectButton />
          ) : network === "hedera" ? (
            <HederaConnectButton />
          ) : network === "ethereum" ? (
            <EthereumConnectButton />
          ) : network === "solana" ? (
            <SolanaConnectButton />
          ) : network === "polkadot" ? (
            <PolkadotConnectButton />
          ) : network === "tempo" ? (
            <TempoConnectButton />
          ) : network === "hyperliquid" ? (
            <HyperliquidConnectButton />
          ) : network === "robinhood" ? (
            <RobinhoodConnectButton />
          ) : network === "base" ? (
            <BaseConnectButton />
          ) : network === "arbitrum" ? (
            <ArbitrumConnectButton />
          ) : null}
        </div>

        <div className="max-w-2xl mx-auto mt-4">
          {hasActiveMismatch && (
            <div className="flex flex-col gap-4 p-4 mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-pulse">
              <div className="flex items-start gap-3">
                <Icon
                  icon="solar:danger-triangle-bold"
                  className="text-red-500 text-xl shrink-0 mt-0.5"
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-bold text-red-500 uppercase tracking-widest">
                    {t("text26")}
                  </p>
                  <p className="text-[11px] font-bold leading-relaxed text-red-700">
                    {dynamicMismatchText}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSwitchCurrent}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-lg active:scale-[0.98]"
              >
                {t("text153")}
              </button>
            </div>
          )}
        </div>

        <div
          className={`bgBox glass-card p-6 shadow-lg max-w-2xl mx-auto mt-8 `}
        >
          <div className="p-5 glass-card shadow-buttonNav! flex justify-center items-center mx-auto w-28 h-28 rounded-full">
            <Icon
              icon="iconoir:wallet-solid"
              className={`text-6xl  ${colorFlip} text-end`}
            />
          </div>

          <h2 className="text-xl font-bold text-center pt-3">{t("text250")}</h2>

          <p className="text-sm mb-10 leading-relaxed px-4 justify-center">
            {locale === "en" ? (
              <>
                To view and manage this transaction, please connect the correct
                <span className={`font-bold ${colorFlip}`}>
                  {" "}
                  {activeProvider.networkName}{" "}
                </span>
                wallet and network mode used for this Transaction.
              </>
            ) : (
              <>
                Untuk melihat dan mengelola transaksi ini, harap hubungkan
                dompet dan mode jaringan
                <span className={`font-bold ${colorFlip}`}>
                  {" "}
                  {activeProvider.networkName}{" "}
                </span>
                yang benar yang digunakan untuk transaksi ini.
              </>
            )}
          </p>

          {/* Share Section */}
          <div className="pt-8 border-t">
            <button
              onClick={handleShareLink}
              className={`flex items-center justify-center gap-2 mx-auto ${colorFlip} hover:underline text-xs font-bold uppercase tracking-widest`}
            >
              <FaLink className="text-[10px]" />
              {t("text251")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isWithdrawal = transaction?.type === "WITHDRAWAL";
  const status = transaction.status;
  const detectedHash =
    transaction?.txHash ||
    onChainDetectedTx?.txHash ||
    txid;
  const effectiveStatus =
    isWithdrawal && status === "WAITING" && detectedHash
      ? "PENDING"
      : status;
  const effectiveTxHash = detectedHash;
  const idrAmount = transaction.idrAmount || 0;
  const tokenAmount = transaction.tokenAmount || 0;
  const paymentInstruction = transaction.paymentDetails || {};
  const redirectUrl =
    paymentInstruction.redirectUrl ||
    transaction.idrxDetails?.redirectUrl ||
    transaction.idrx_details?.redirectUrl ||
    "";
  const isQrisPayment =
    paymentInstruction.paymentMethod === "qris" ||
    paymentInstruction.method === "QRIS" ||
    Boolean(qrString);
  const hasDirectVA = Boolean(
    (paymentInstruction.virtualAccountNo || paymentInstruction.vaNumber) &&
      !isQrisPayment
  );
  const vaNumber =
    paymentInstruction.virtualAccountNo || paymentInstruction.vaNumber || "";
  const vaName =
    paymentInstruction.virtualAccountName ||
    paymentInstruction.vaName ||
    paymentInstruction.accountHolderName ||
    paymentInstruction.accountName ||
    transaction.idrxDetails?.virtualAccountName ||
    transaction.idrx_details?.virtualAccountName ||
    "";
  const customerName =
    paymentInstruction.customerName ||
    transaction.idrxDetails?.customerName ||
    transaction.idrx_details?.customerName ||
    paymentInstruction.accountHolderName ||
    "";
  const totalPayableAmount =
    paymentInstruction.amount || transaction.idrAmount || 0;
  const baseAmount =
    paymentInstruction.baseAmount || transaction.idrAmount || 0;
  const feeItems = paymentInstruction.fees || [];

  const channelKey = (
    paymentInstruction.channelId ||
    paymentInstruction.channelCode ||
    paymentInstruction.paymentMethod ||
    paymentInstruction.channelName ||
    ""
  ).toUpperCase();

  const bankDisplayName = (() => {
    if (channelKey.includes("INA")) return "Bank INA";
    if (channelKey.includes("MANDIRI")) return "Bank Mandiri";
    if (channelKey.includes("BRI")) return "Bank BRI";
    if (channelKey.includes("BCA")) return "Bank Central Asia (BCA)";
    if (channelKey.includes("BNI")) return "Bank BNI";
    if (channelKey.includes("PERMATA")) return "Bank Permata";
    return paymentInstruction.channelName || "Bank INA";
  })();

  const bankLogo = (() => {
    if (channelKey.includes("MANDIRI")) return mandiri;
    if (channelKey.includes("BRI")) return bri;
    if (channelKey.includes("BCA") && !channelKey.includes("INA")) return bca;
    if (channelKey.includes("BNI")) return bni;
    if (channelKey.includes("PERMATA")) return permata;
    return null;
  })();

  // E-wallet destinations (GoPay/OVO/DANA/ShopeePay/LinkAja) are a real withdrawal option
  // (see Assets.tsx's EWALLET_NAMES/isEwallet) but this card only ever matched bank keywords
  // and always labeled itself "Destination Bank Account" — an e-wallet withdrawal showed up
  // as a raw code or the generic "Bank Transfer" fallback, with no logo. bankName is the
  // authoritative field the withdraw flow sends (see Assets.tsx's payload); method/channelName
  // are still checked for older transactions that may not carry it.
  const EWALLET_DISPLAY: Record<string, { name: string; logo: any }> = {
    OVO: { name: "OVO", logo: ovo },
    GOPAY: { name: "GoPay", logo: gopay },
    DANA: { name: "DANA", logo: dana },
    SHOPEEPAY: { name: "ShopeePay", logo: shopeepay },
    LINKAJA: { name: "LinkAja", logo: linkaja },
    "LINKAJA DIRECT": { name: "LinkAja", logo: linkaja },
  };

  const destinationMethodKey = (
    paymentInstruction.bankName ||
    paymentInstruction.method ||
    paymentInstruction.channelName ||
    ""
  ).trim().toUpperCase();

  const matchedEwallet = EWALLET_DISPLAY[destinationMethodKey];
  const isEwalletDestination = !!matchedEwallet;

  // The raw bank code (e.g. "542"), shown alongside the resolved name below — kept separate
  // from the name itself so a bank the fallback logic doesn't recognize still shows something
  // concrete rather than nothing.
  const withdrawBankCode = paymentInstruction.bankCode || paymentInstruction.method || "";

  const withdrawBankDisplayName = (() => {
    if (matchedEwallet) return matchedEwallet.name;
    // bankName is the authoritative, already-resolved name the withdraw flow saves at
    // creation time (see Assets.tsx's payload, sourced from /api/transaction/method's live
    // bank list) — prefer it outright instead of re-deriving a name from the raw code through
    // the small hardcoded list below, which only covers 5 major banks (not e.g. Jago/542).
    if (paymentInstruction.bankName) return paymentInstruction.bankName;
    const m = (paymentInstruction.method || paymentInstruction.channelName || "").toUpperCase();
    if (m.includes("MANDIRI") || m.includes("008")) return "Bank Mandiri";
    if (m.includes("BRI") || m.includes("002")) return "Bank BRI";
    if (m.includes("BCA") || m.includes("014")) return "Bank Central Asia (BCA)";
    if (m.includes("BNI") || m.includes("009")) return "Bank BNI";
    if (m.includes("PERMATA") || m.includes("087")) return "Bank Permata";
    return (
      withdrawDestinationSelection.find(
        (a) => a.code == paymentInstruction.method,
      )?.name ||
      paymentInstruction.method ||
      "Bank Transfer"
    );
  })();

  const withdrawBankLogo = (() => {
    if (matchedEwallet) return matchedEwallet.logo;
    const m = (paymentInstruction.method || paymentInstruction.channelName || "").toUpperCase();
    if (m.includes("MANDIRI") || m.includes("008")) return mandiri;
    if (m.includes("BRI") || m.includes("002")) return bri;
    if (m.includes("BCA") || m.includes("014")) return bca;
    if (m.includes("BNI") || m.includes("009")) return bni;
    if (m.includes("PERMATA") || m.includes("087")) return permata;
    return null;
  })();

  const formatFeeName = (feeName: string) => {
    if (!feeName) {
      return locale === "id" ? "Biaya Layanan" : "Service Fee";
    }
    const upper = feeName.toUpperCase();
    if (upper.includes("INA")) {
      return locale === "id" ? "Biaya Virtual Account (Bank INA)" : "Virtual Account Fee (Bank INA)";
    }
    if (upper.startsWith("VA") || upper.includes("VIRTUAL")) {
      const bank = feeName.replace(/^VA\s*/i, "").trim();
      return locale === "id"
        ? `Biaya Virtual Account${bank ? ` (${bank})` : ""}`
        : `Virtual Account Fee${bank ? ` (${bank})` : ""}`;
    }
    if (upper.includes("QRIS")) {
      return locale === "id" ? "Biaya Layanan QRIS" : "QRIS Service Fee";
    }
    return feeName;
  };

  // null (not "...") is the "not ready yet" sentinel here — keeping it a real non-number
  // value instead of a placeholder string means nothing downstream can accidentally run it
  // through Number()/toLocaleString() and silently render "NaN" instead of a loading state.
  const displayEstimatedToken =
    !isWithdrawal && estimatedValue !== null ? estimatedValue : null;

  const displayEstimatedIdr =
    isWithdrawal && estimatedValue !== null
      ? Math.floor(Number(estimatedValue))
      : null;

  const showProgressBar = ["PAID", "PENDING", "COMPLETED"].includes(effectiveStatus);

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString(locale == "id" ? "id-ID" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadQr = () => {
    const downloadSrc =
      qrDataUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
    const link = document.createElement("a");
    link.href = downloadSrc;
    link.download = `qris-${transaction?.id || "paradapp"}.png`;
    link.click();
  };

  return (
    <div className="pb-28 sm:pb-36 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Image src={logos} alt="logo" className="w-6 h-6" />
          <span className="text-sm font-bold">Paradapp</span>
        </div>

        {network === "bitcoin" ? (
          <BitcoinConnectButton />
        ) : network === "hedera" ? (
          <HederaConnectButton />
        ) : network === "ethereum" ? (
          <EthereumConnectButton />
        ) : network === "solana" ? (
          <SolanaConnectButton />
        ) : network === "polkadot" ? (
          <PolkadotConnectButton />
        ) : network === "tempo" ? (
          <TempoConnectButton />
        ) : network === "hyperliquid" ? (
          <HyperliquidConnectButton />
        ) : network === "robinhood" ? (
          <RobinhoodConnectButton />
        ) : network === "base" ? (
          <BaseConnectButton />
        ) : network === "arbitrum" ? (
          <ArbitrumConnectButton />
        ) : null}
      </div>

      {isWithdrawal ? (
        <div
          className="bgBox glass-card p-4 sm:p-6 shadow-lg max-w-2xl mx-auto mt-4 sm:mt-8 w-full"
        >
          <h3 className={`sm:text-xl text-[14px] font-bold ${colorFlip} mb-1`}>
            {effectiveStatus == "WAITING" || effectiveStatus == "EXPIRED"
              ? (locale === "id" ? "Transaksi: Tarik Token" : "Transaction: Withdraw Token")
              : effectiveStatus == "COMPLETED"
                ? t("text83")
                : t("text84")}
          </h3>

          {isExpired ? (
            <div>
              <div className="bg-red-100 text-red-700 sm:text-sm text-[10px] rounded-md px-4 py-3 mb-4">
                ⚠️ {t("text75")}
              </div>
            </div>
          ) : !showProgressBar ? (
            <div className="sm:text-sm text-[10px] mb-4 flex items-center justify-between">
              <p>
                {t("text76")}{" "}
                <span
                  className={`font-semibold`}
                >
                  {timeLeft}
                </span>
              </p>
              {effectiveStatus === "WAITING" && !isExpired && isOwner && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={isCancelling}
                  className="text-xs text-neutral-400 hover:text-neutral-700 underline cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {locale === "id" ? "Batalkan Transaksi" : "Cancel Transaction"}
                </button>
              )}
            </div>
          ) : null}

          {!isExpired && showProgressBar && (
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="flex items-start justify-between w-full max-w-md mx-auto">
                  {["PENDING", "PAID", "COMPLETED"].map((step, index, steps) => {
                    const stepIndex = steps.indexOf(effectiveStatus);
                    const isCompleted = index < stepIndex;
                    const isCurrent = index === stepIndex;

                    return (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center flex-1 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isCompleted
                                ? `${bgFlip} ${activeStepText}`
                                : isCurrent
                                  ? `${bgFlip} ${activeStepText} animate-pulse`
                                  : "bg-gray-300 text-gray-600"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div
                            className={`mt-1.5 text-[10px] sm:text-xs font-semibold text-center whitespace-nowrap`}
                          >
                            {step === "PENDING"
                              ? t("text70")
                              : step === "PAID"
                                ? t("text71")
                                : t("text72")}
                          </div>
                        </div>
                        {index < steps.length - 1 && (
                          <div
                            className={`h-0.5 sm:h-1 flex-1 mx-1.5 sm:mx-2.5 mt-3.5 rounded-full ${
                              index < stepIndex
                                ? `${bgFlip}`
                                : "bg-gray-300"
                            }`}
                          ></div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Updated Withdrawal Pending UI */}
              {effectiveStatus === "PENDING" && (
                <div className="bg-white border border-gray-200 sm:text-sm text-[10px] px-4 py-3 mb-4 rounded-md">
                  ⏳ {t("text77")}
                  {effectiveTxHash && (
                    <>
                      <br />
                      {t("text78")}{" "}
                      {tokenConfirmETA !== null ? (
                        <span className="font-bold">
                          {locale == "id"
                            ? `Estimasi waktu konfirmasi sekitar ${formatETA(tokenConfirmETA.estimatedSeconds, locale)}.`
                            : `Estimated confirmation time is around ${formatETA(tokenConfirmETA.estimatedSeconds, locale)}.`}
                        </span>
                      ) : (
                        <span>
                          {locale == "id"
                            ? "Sedang menghitung estimasi waktu konfirmasi..."
                            : "Calculating confirmation time estimate..."}
                        </span>
                      )}
                      {tokenConfirmETA?.isCongested && (
                        <p className="text-red-500 mt-1">
                          {locale == "id"
                            ? "⚠️ Jaringan sedang padat, konfirmasi mungkin memakan waktu lebih lama dari biasanya."
                            : "⚠️ The network is currently congested. Confirmation may take longer than usual."}
                        </p>
                      )}
                      <a
                        href={`${(networkExplorer as any).transaction}${effectiveTxHash}${(networkExplorer as any).urlSuffix || ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium text-yellow-900 block mt-1"
                      >
                        {t("text79") + " "}
                      </a>
                    </>
                  )}
                </div>
              )}

              {(effectiveStatus === "PAID" || effectiveStatus === "COMPLETED") && (
                <div className="bg-green-50 text-green-800 sm:text-sm text-[10px] px-4 py-3 mb-4 rounded-md">
                  {t("text80")}
                  {effectiveTxHash && (
                    <>
                      <br />
                      {t("text81")}{" "}
                      <a
                        href={`${(networkExplorer as any).transaction}${effectiveTxHash}${(networkExplorer as any).urlSuffix || ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium text-green-900"
                      >
                        {t("text79") + " "}
                      </a>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Destination Summary Card (Same style as Buy) — labeled by the actual
              destination type (e-wallet vs bank) instead of always assuming "Bank Account". */}
          <div className="bg-white border-gray-200 rounded-xl px-4 py-3 mb-4 sm:text-sm text-[10px]">
            <p className="font-semibold mb-1">
              {isEwalletDestination
                ? locale === "id"
                  ? "E-Wallet Tujuan:"
                  : "Destination E-Wallet:"
                : locale === "id"
                  ? "Rekening Bank Tujuan:"
                  : "Destination Bank Account:"}
            </p>
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between items-center py-0.5">
                <span className="opacity-60">
                  {isEwalletDestination
                    ? locale === "id"
                      ? "Tujuan E-Wallet"
                      : "E-Wallet Destination"
                    : t("text89")}
                </span>
                <div className="flex items-center gap-2">
                  {withdrawBankLogo && (
                    <div className="w-5 h-5 rounded bg-white border border-black/5 flex items-center justify-center p-0.5 overflow-hidden shrink-0">
                      <Image src={withdrawBankLogo} alt={withdrawBankDisplayName} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <span className="font-semibold">
                    {withdrawBankDisplayName}
                    {!isEwalletDestination && withdrawBankCode && (
                      <span className="font-normal opacity-50 ml-1">({withdrawBankCode})</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="opacity-60">{t("text90")}</span>
                <span className="font-medium">{paymentInstruction.accountHolderName}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="opacity-60">
                  {isEwalletDestination
                    ? locale === "id"
                      ? "Nomor Telepon"
                      : "Phone Number"
                    : t("text91")}
                </span>
                <span className="font-medium font-mono">{paymentInstruction.accountNumber}</span>
              </div>
            </div>
          </div>

          {/* Amount Summary Card (Same style as Buy) */}
          <div className="bg-white border-gray-200 rounded-xl px-4 py-3 mb-4 sm:text-sm text-[10px]">
            <p className="font-semibold mb-1">{t("text88")}:</p>
            <p>
              <span className="font-semibold">
                {tokenAmount} {txTokenTicker}
              </span>
            </p>
            <div className="h-2.5"></div>
            <p className="font-semibold mb-1">
              {status === "COMPLETED" ? `${t("text92")}:` : `${t("text93")}:`}
            </p>
            <p>
              <span className="font-bold">
                {status === "COMPLETED" || transaction.idrAmount ? (
                  <>
                    {locale == "id" ? "Rp " : ""}
                    {Number((transaction.idrAmount || 0).toFixed(0)).toLocaleString(
                      locale == "id" ? "id-ID" : "en-US",
                    )}
                    {locale == "id" ? "" : " IDR"}
                  </>
                ) : displayEstimatedIdr === null ? (
                  <span className="inline-block h-4 w-20 bg-black/10 rounded animate-pulse align-middle" />
                ) : (
                  <>
                    {locale == "id" ? "Rp " : ""}
                    {Number(displayEstimatedIdr).toLocaleString(
                      locale == "id" ? "id-ID" : "en-US",
                    )}
                    {locale == "id" ? "" : " IDR"}
                  </>
                )}
              </span>
            </p>

            {(status === "WAITING" ||
              status === "PENDING" ||
              status === "PAID") &&
              payoutNote && (
                <div className="bg-white/80 border border-black/5 sm:text-xs text-[10px] rounded-lg px-3 py-2.5 mt-3 opacity-90 leading-relaxed">
                  {locale == "id" ? payoutNote.note.id : payoutNote.note.en}
                </div>
              )}

            {isExpired ? (
              <div className="w-full mt-5">
                <Button
                  chain={network}
                  buttonText={t("text98")}
                  onClick={() => router.replace(`/${network}/vault/assets`)}
                ></Button>
              </div>
            ) : null}
          </div>

          {!isExpired && effectiveStatus === "WAITING" && (
            /* MAIN WITHDRAWAL TRANSFER CARD (Same style format as Buy) */
            <div className="bg-white/40 border border-black/5 rounded-2xl p-3.5 sm:p-5 mb-4 space-y-4 glass-card shadow-sm">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-black/5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-black/5 text-neutral-700 border border-black/5 flex items-center justify-center shrink-0 shadow-sm">
                    <Icon icon="solar:card-send-bold" className="text-lg" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm sm:text-base leading-tight truncate">
                      {locale === "id" ? `Kirim ${txTokenTicker}` : `Send ${txTokenTicker}`}
                    </span>
                    <span className="text-[10px] font-medium opacity-50 truncate">
                      {locale === "id"
                        ? "Transfer ke Alamat Paradapp"
                        : "Transfer to Paradapp Wallet"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {connected && (
                    <button
                      type="button"
                      onClick={() => setSendMode(sendMode === "AUTO" ? "MANUAL" : "AUTO")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 hover:bg-black/10 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      <span>{sendMode === "AUTO" ? (locale === "id" ? "Mode Otomatis" : "Auto Mode") : (locale === "id" ? "Mode Manual" : "Manual Mode")}</span>
                      <Icon
                        icon="solar:refresh-circle-linear"
                        className="text-xs"
                      />
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>{locale === "id" ? "Menunggu Pengiriman" : "Awaiting Transfer"}</span>
                  </div>
                </div>
              </div>

              {/* Destination Address Section */}
              <div className="flex flex-col gap-1.5 bg-black/3 rounded-xl p-3.5 border border-black/5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {t("text86")}
                </span>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono font-bold text-xs sm:text-sm tracking-wide select-all break-all">
                    {paymentInstruction.paradappAddress}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentInstruction.paradappAddress);
                      setCopiedAddress(true);
                      setTimeout(() => setCopiedAddress(false), 2000);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                      copiedAddress
                        ? "bg-green-500/15 text-green-600"
                        : "bg-black/5 hover:bg-black/10 text-black/80"
                    }`}
                  >
                    <Icon icon={copiedAddress ? "solar:check-circle-bold" : "solar:copy-linear"} className="text-sm" />
                    <span>{copiedAddress ? (locale === "id" ? "Tersalin!" : "Copied!") : (locale === "id" ? "Salin Alamat" : "Copy Address")}</span>
                  </button>
                </div>
              </div>

              {/* Exact Token Amount Section */}
              <div className="flex flex-col gap-1.5 bg-black/3 rounded-xl p-3.5 border border-black/5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {t("text88")}
                </span>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-lg sm:text-2xl">
                    {tokenAmount} {txTokenTicker}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(String(tokenAmount));
                      setCopiedTokenAmt(true);
                      setTimeout(() => setCopiedTokenAmt(false), 2000);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                      copiedTokenAmt
                        ? "bg-green-500/15 text-green-600"
                        : "bg-black/5 hover:bg-black/10 text-black/80"
                    }`}
                  >
                    <Icon icon={copiedTokenAmt ? "solar:check-circle-bold" : "solar:copy-linear"} className="text-sm" />
                    <span>{copiedTokenAmt ? (locale === "id" ? "Tersalin!" : "Copied!") : (locale === "id" ? "Salin Jumlah" : "Copy Amount")}</span>
                  </button>
                </div>
              </div>

              {/* Important Warning Notice */}
              <div className="rounded-2xl p-4 bg-orange-500/10 border border-orange-500/20 text-orange-700 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 uppercase tracking-widest pb-0.5">
                  <Icon icon="solar:danger-circle-bold" className="text-base text-orange-500" />
                  <span>{locale === "id" ? "Penting" : "Important"}</span>
                </div>
                <ol className="list-decimal pl-4 space-y-2 text-[11px] font-medium leading-relaxed">
                  <li>
                    <span className="font-bold">{locale === "id" ? "Jaringan yang Sesuai: " : "Correct Network: "}</span>
                    {locale === "id"
                      ? `Pastikan Anda mengirim token melalui jaringan ${network.toUpperCase()}.`
                      : `Ensure that you send the token via ${network.toUpperCase()} network.`}
                  </li>
                  <li>
                    <span className="font-bold">{locale === "id" ? "Jumlah Transfer Tepat: " : "Exact Transfer Amount: "}</span>
                    {locale === "id"
                      ? `Kirim tepat ${tokenAmount} ${txTokenTicker} (jangan dibulatkan atau dikurangi) ke alamat di atas.`
                      : `Transfer exactly ${tokenAmount} ${txTokenTicker} (do not round or deduct) to the address above.`}
                  </li>
                </ol>
              </div>

              {/* Auto Send Action & Gasless Breakdown */}
              {connected && sendMode === "AUTO" && (
                <div className="flex flex-col gap-3 pt-1">
                  {/* Solana Gasless Breakdown */}
                  {network === "solana" && (
                    <div className="flex flex-col gap-1.5 p-3 bgBox glass-card border border-black/5 rounded-xl text-xs">
                      <div className="flex justify-between items-center opacity-60">
                        <span>{locale === "en" ? "Send Amount" : "Jumlah Kirim"}</span>
                        <span className="font-mono">{tokenAmount} {txTokenTicker}</span>
                      </div>
                      <div className="flex justify-between items-center opacity-60">
                        <span className="flex items-center gap-1">
                          {locale === "en" ? "Network Fee" : "Biaya Jaringan"}
                        </span>
                        <span className="font-mono">
                          {isFetchingGasless
                            ? "..."
                            : gaslessQuote
                              ? `${(gaslessQuote.networkFeeUi ?? gaslessQuote.calculatedFeeUi ?? gaslessQuote.feeDeductedUi ?? 0).toFixed(6)} ${txTokenTicker}`
                              : "0.00"}
                        </span>
                      </div>
                      {!isFetchingGasless && gaslessQuote && (gaslessQuote.ataFeeUi || 0) > 0 && (
                        <div className="flex justify-between items-center opacity-60">
                          <span className="flex items-center gap-1">
                            {locale === "en" ? "New Account Fee (ATA)" : "Biaya Akun Baru (ATA)"}
                          </span>
                          <span className="font-mono">
                            {`${gaslessQuote.ataFeeUi.toFixed(6)} ${txTokenTicker}`}
                          </span>
                        </div>
                      )}
                      <div className="w-full h-[1px] bg-black/5 my-0.5" />
                      <div className="flex justify-between items-center font-bold">
                        <span>{locale === "en" ? "Total Deducted" : "Total Dipotong"}</span>
                        <span className="font-mono">
                          {isFetchingGasless 
                            ? "..." 
                            : gaslessQuote 
                              ? `${(parseFloat(tokenAmount) + (gaslessQuote.calculatedFeeUi || gaslessQuote.feeDeductedUi || 0)).toFixed(6)} ${txTokenTicker}` 
                              : `${tokenAmount} ${txTokenTicker}`}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="justify-end flex">
                    <Button
                      buttonText={
                        isSendProcessing
                          ? `Processing...`
                          : isFetchingGasless
                            ? `Calculating Fee...`
                            : `Send ${tokenAmount} ${transaction.tokenType || txTokenTicker}`
                      }
                      onClick={() => {
                        handleConfirmSend(
                          paymentInstruction.paradappAddress,
                          tokenAmount,
                        );
                      }}
                      disabled={isSendProcessing || isFetchingGasless || (network === "solana" && !gaslessQuote)}
                      chain={network}
                    />
                  </div>
                </div>
              )}

              {/* Step-by-Step Withdrawal Instructions Accordion at the BOTTOM (Same format as Buy) */}
              <div className="pt-2 border-t border-black/5 space-y-2">
                <div className="rounded-xl border border-black/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenGuide(openGuide === "withdraw_guide" ? null : "withdraw_guide")}
                    className="w-full flex items-center justify-between p-3 bg-white/60 text-left text-xs font-bold hover:bg-white/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon icon="solar:wallet-money-linear" className="text-base opacity-60" />
                      <span>{t("text82")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSendMode(sendMode === "AUTO" ? "MANUAL" : "AUTO"); }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/5 text-[10px] font-bold"
                      >
                        {sendMode === "AUTO" ? t("text131") : t("text132")}
                      </button>
                      <Icon icon="solar:alt-arrow-down-linear" className={`transition-transform duration-200 ${openGuide === "withdraw_guide" ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {openGuide === "withdraw_guide" && (
                    <div className="p-3.5 bg-black/2 text-[11px] opacity-80 leading-relaxed border-t border-black/5 whitespace-pre-line">
                      {sendMode === "AUTO" ? t("text130") : t("text85")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-3 border-t border-black/5">
            <div className="w-28">
              <Button
                chain={network}
                buttonText={t("text105")}
                onClick={() => {
                  router.replace(`/${network}/vault/assets`);
                }}
              />
            </div>
            <div className="text-right text-[11px] sm:text-xs text-neutral-400 font-medium">
              <p>{t("text94")}:</p>
              <p>{formatDateTime(transaction.createdAt)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="bgBox glass-card p-4 sm:p-6 shadow-lg max-w-2xl mx-auto mt-4 sm:mt-8 w-full"
        >
          <h3 className={`sm:text-xl text-[14px] font-bold ${colorFlip} mb-1`}>
            {status == "WAITING" || status == "EXPIRED"
              ? "Transaction: Buy Token"
              : status == "COMPLETED"
                ? t("text83")
                : t("text84")}
          </h3>

          {isExpired ? (
            <div>
              <div className="bg-red-100 text-red-700 sm:text-sm text-[10px] rounded-md px-4 py-3 mb-4">
                ⚠️ {t("text75")}
              </div>
            </div>
          ) : !showProgressBar ? (
            <div className="sm:text-sm text-[10px] mb-4 flex items-center justify-between">
              <p>
                {t("text76")}{" "}
                <span
                  className={`font-semibold`}
                >
                  {timeLeft}
                </span>
              </p>
              {status === "WAITING" && !isExpired && isOwner && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={isCancelling}
                  className="text-xs text-neutral-400 hover:text-neutral-700 underline cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {locale === "id" ? "Batalkan Transaksi" : "Cancel Transaction"}
                </button>
              )}
            </div>
          ) : null}

          {!isExpired && showProgressBar && (
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="flex items-start justify-between w-full max-w-md mx-auto">
                  {["PAID", "PENDING", "COMPLETED"].map((step, index) => {
                    const isCompleted =
                      (status === "PENDING" && step === "PAID") ||
                      (status === "COMPLETED" &&
                        ["PAID", "PENDING"].includes(step));
                    const isCurrent = status === step;

                    return (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center flex-1 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isCompleted
                                ? `${bgFlip} ${activeStepText}`
                                : isCurrent
                                  ? `${bgFlip} ${activeStepText} animate-pulse`
                                  : "bg-gray-300 text-gray-600"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div
                            className={`mt-1.5 text-[10px] sm:text-xs font-semibold text-center whitespace-nowrap`}
                          >
                            {step === "PENDING"
                              ? t("text70")
                              : step === "PAID"
                                ? t("text71")
                                : t("text72")}
                          </div>

                          {/* Sub-status: Clean 2-line stacked layout (no truncate clipping) */}
                          {isCurrent && step === "PAID" && (
                            <div className="mt-1 flex flex-col items-center justify-center text-[9px] sm:text-[10px] text-neutral-500 font-medium text-center w-full px-0.5 leading-tight">
                              <div className="flex items-center justify-center gap-1">
                                <div
                                  className={`animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full shrink-0`}
                                />
                                <span>
                                  {transaction.paymentDetails?.depositTxHash
                                    ? locale === "id"
                                       ? "Konversi"
                                       : "Converting"
                                     : "Minting"}
                                </span>
                              </div>
                              <div className="flex items-center justify-center whitespace-nowrap">
                                <span>
                                  {transaction.paymentDetails?.depositTxHash
                                    ? locale === "id"
                                      ? `IDRX ke ${txTokenTicker}`
                                      : `IDRX to ${txTokenTicker}`
                                    : "IDRX"}
                                </span>
                                <AnimatedEllipsis />
                              </div>
                            </div>
                          )}

                          {isCurrent && step === "PENDING" && (
                            <div className="mt-1 flex flex-col items-center justify-center text-[9px] sm:text-[10px] text-neutral-500 font-medium text-center w-full px-0.5 leading-tight">
                              <div className="flex items-center justify-center gap-1">
                                <div
                                  className={`animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full shrink-0`}
                                />
                                <span>
                                  {locale === "id"
                                    ? "Mengirim"
                                    : "Sending"}
                                </span>
                              </div>
                              <div className="flex items-center justify-center whitespace-nowrap">
                                <span>
                                  {locale === "id"
                                    ? "ke wallet"
                                    : "to wallet"}
                                </span>
                                <AnimatedEllipsis />
                              </div>
                            </div>
                          )}
                        </div>
                        {index < 2 && (
                          <div
                            className={`h-0.5 sm:h-1 flex-1 mx-1.5 sm:mx-2.5 mt-3.5 sm:mt-3.5 rounded-full transition-colors ${
                              ["COMPLETED", "PENDING"].includes(status) &&
                              index < (status === "COMPLETED" ? 2 : 1)
                                ? `${bgFlip}`
                                : "bg-gray-300"
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Deposit Pending UI */}
          {status === "PENDING" && (
            <div className="bg-white border border-gray-200 sm:text-sm text-[10px] px-4 py-3 mb-4 rounded-md">
              ⏳ {t("text95")}
              {transaction.txHash && (
                <>
                  <br />
                  {t("text78")}{" "}
                  {tokenConfirmETA !== null ? (
                    <span className="font-bold">
                      {locale == "id"
                        ? `Estimasi waktu konfirmasi sekitar ${formatETA(tokenConfirmETA.estimatedSeconds, locale)}.`
                        : `Estimated confirmation time is around ${formatETA(tokenConfirmETA.estimatedSeconds, locale)}.`}
                    </span>
                  ) : (
                    <span>
                      {locale == "id"
                        ? "Sedang menghitung estimasi waktu konfirmasi..."
                        : "Calculating confirmation time estimate..."}
                    </span>
                  )}
                  {tokenConfirmETA?.isCongested && (
                    <p className="text-red-500 mt-1">
                      {locale == "id"
                        ? "⚠️ Jaringan sedang padat, konfirmasi mungkin memakan waktu lebih lama dari biasanya."
                        : "⚠️ The network is currently congested. Confirmation may take longer than usual."}
                    </p>
                  )}
                  <a
                    href={`${(networkExplorer as any).transaction}${transaction.txHash}${(networkExplorer as any).urlSuffix || ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium text-yellow-900 block mt-1"
                  >
                    {t("text79") + " "}
                  </a>
                </>
              )}
            </div>
          )}

          {/* Deposit Completed UI */}
          {status === "COMPLETED" && (
            <div className="bg-green-50 text-green-800 sm:text-sm text-[10px] px-4 py-3 mb-4 rounded-md">
              {t("text96")}
              {transaction.txHash && (
                <>
                  <br />
                  {t("text81")}{" "}
                  <a
                    href={`${(networkExplorer as any).transaction}${transaction.txHash}${(networkExplorer as any).urlSuffix || ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium text-green-900"
                  >
                    {t("text79") + " "}
                  </a>
                </>
              )}
            </div>
          )}

          <div className="bg-white border-gray-200 rounded-xl px-4 py-3 mb-4 sm:text-sm text-[10px]">
            <p className="font-semibold  mb-1">{"Destination Address:"}</p>
            <p>
              <span className="font-semibold break-all">
                {transaction.walletAddress}
              </span>
            </p>
          </div>

          <div className="bg-white border-gray-200 rounded-xl px-4 py-3 mb-4 sm:text-sm text-[10px]">
            <p className="font-semibold mb-1">{t("text97")}:</p>
            <p>
              <span className="font-semibold">
                {idrAmount.toLocaleString()} IDR
              </span>
            </p>
            <div className="h-2.5"></div>
            <p className="font-semibold mb-1">
              {tokenAmount == 0 ? `${t("text93")}:` : `${t("text92")}:`}
            </p>
            <p>
              <span className="font-bold">
                {tokenAmount == 0 && displayEstimatedToken === null ? (
                  <span className="inline-block h-4 w-16 bg-black/10 rounded animate-pulse align-middle" />
                ) : (
                  <>
                    {tokenAmount == 0 ? displayEstimatedToken : tokenAmount}{" "}
                    {txTokenTicker}
                  </>
                )}
              </span>
            </p>

            {isExpired ? (
              <div className="w-full mt-5">
                <Button
                  chain={network}
                  buttonText={t("text98")}
                  onClick={() => router.replace(`/${network}/vault/buy`)}
                ></Button>
              </div>
            ) : null}
          </div>

          {!isExpired && status === "WAITING" && (
            <>
              {isQrisPayment ? (
                /* NATIVE DIRECT QRIS CARD */
                <div className="bg-white/40 border border-black/5 rounded-2xl p-3.5 sm:p-5 mb-4 space-y-4 glass-card shadow-sm">
                  {/* Card Header: QRIS Badge + Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-black/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white border border-black/5 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-sm">
                        <Image src={qris} alt="QRIS" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm sm:text-base leading-tight truncate">
                          QRIS
                        </span>
                        <span className="text-[10px] font-medium opacity-50 truncate">
                          {locale === "id"
                            ? "Pindai kode QR untuk membayar"
                            : "Scan QR code to pay"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold self-start sm:self-auto shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>{locale === "id" ? "Menunggu Pembayaran" : "Awaiting Payment"}</span>
                    </div>
                  </div>

                  {/* QR Code Display */}
                  <div className="flex flex-col items-center justify-center py-1 space-y-2.5">
                    <div className="p-2.5 bg-white rounded-2xl border border-black/10 shadow-sm">
                      {qrDataUrl ? (
                        <img
                          id="qris-image"
                          src={qrDataUrl}
                          alt="QRIS Code"
                          className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-lg"
                        />
                      ) : (
                        <img
                          id="qris-image"
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`}
                          alt="QRIS Code"
                          className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-lg"
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-black/5 hover:bg-black/10 text-black/80 transition-all cursor-pointer shadow-sm"
                    >
                      <Icon icon="solar:download-square-bold" className="text-sm" />
                      <span>{locale === "id" ? "Unduh Gambar QR" : "Download QR Code"}</span>
                    </button>
                  </div>

                  {/* Important Warning */}
                  <div className="rounded-2xl p-4 bg-orange-500/10 border border-orange-500/20 text-orange-700 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 uppercase tracking-widest pb-0.5">
                      <Icon icon="solar:danger-circle-bold" className="text-base text-orange-500" />
                      <span>{locale === "id" ? "Penting" : "Important"}</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-2 text-[11px] font-medium leading-relaxed">
                      <li>
                        <span className="font-bold">{locale === "id" ? "Nama Merchant: " : "Merchant Name: "}</span>
                        {locale === "id"
                          ? 'Pastikan nama merchant pada aplikasi pembayaran Anda adalah "IDRX".'
                          : 'Ensure that the merchant name on your payment app is "IDRX".'}
                      </li>
                      <li>
                        <span className="font-bold">{locale === "id" ? "Kesesuaian Nominal: " : "Nominal Verification: "}</span>
                        {locale === "id"
                          ? `Pastikan nominal yang muncul setelah scan sesuai (Rp ${Number(totalPayableAmount).toLocaleString("id-ID")}) sebelum mengonfirmasi pembayaran.`
                          : `Ensure that the amount displayed after scanning is correct (Rp ${Number(totalPayableAmount).toLocaleString("id-ID")}) before confirming payment.`}
                      </li>
                    </ol>
                  </div>

                  {/* Fee Breakdown (if fees present) */}
                  {feeItems && feeItems.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-black/[0.03] border border-black/5 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500 font-medium">
                          {locale === "id" ? "Nominal Pembelian IDRX" : "IDRX Purchase Amount"}
                        </span>
                        <span className="font-semibold">
                          Rp {Number(baseAmount || transaction.idrAmount).toLocaleString("id-ID")}
                        </span>
                      </div>
                      {feeItems.map((fee: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-neutral-500 font-medium">
                            {formatFeeName(fee.name)}
                          </span>
                          <span className="font-semibold">
                            Rp {Number(fee.amount || 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                      ))}
                      <div className="w-full h-px bg-black/5 my-1" />
                      <div className="flex justify-between items-center font-bold text-xs sm:text-sm">
                        <span>{locale === "id" ? "Total Pembayaran" : "Total Payment"}</span>
                        <span className="font-bold">
                          Rp {Number(totalPayableAmount).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Step-by-Step QRIS Instructions Accordion (Same format as VA) */}
                  <div className="pt-2 border-t border-black/5 space-y-2">
                    <span className="text-[11px] font-bold opacity-60 uppercase tracking-wider block">
                      {locale === "id" ? "Panduan Pembayaran" : "Payment Guide"}
                    </span>

                    <div className="rounded-xl border border-black/5 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenGuide(openGuide === "qris" ? null : "qris")}
                        className="w-full flex items-center justify-between p-3 bg-white/60 text-left text-xs font-bold hover:bg-white/80 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Icon icon="solar:qr-code-linear" className="text-base opacity-60" />
                          <span>{locale === "id" ? "Cara Pembayaran QRIS" : "QRIS Payment Guide"}</span>
                        </div>
                        <Icon icon="solar:alt-arrow-down-linear" className={`transition-transform duration-200 ${openGuide === "qris" ? "rotate-180" : ""}`} />
                      </button>
                      {openGuide === "qris" && (
                        <div className="p-3.5 bg-black/2 text-[11px] space-y-2 opacity-80 leading-relaxed border-t border-black/5">
                          <ol className="list-decimal pl-4 space-y-1">
                            <li>{locale === "id" ? "Buka aplikasi pembayaran Anda." : "Open your payment app."}</li>
                            <li>{locale === "id" ? "Pilih menu 'Scan' atau 'Bayar QRIS', lalu arahkan kamera ke kode QR di atas atau unggah gambar QR dari galeri." : "Select 'Scan' or 'Pay QRIS', then scan the QR code above or upload the QR image from gallery."}</li>
                            <li>{locale === "id" ? 'Pastikan nama merchant adalah "IDRX" dan periksa nominal pembayaran.' : 'Ensure the merchant name is "IDRX" and verify the payment amount.'}</li>
                            <li>{locale === "id" ? "Konfirmasi dan selesaikan pembayaran. Transaksi akan terdeteksi otomatis." : "Confirm and complete payment. The transaction will be automatically detected."}</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : hasDirectVA ? (
                /* NATIVE DIRECT VIRTUAL ACCOUNT CARD */
                <div className="bg-white/40 border border-black/5 rounded-2xl p-3.5 sm:p-5 mb-4 space-y-4 glass-card shadow-sm">
                  {/* Card Header: Bank Badge + Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-black/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {bankLogo ? (
                        <div className="w-8 h-8 rounded-lg bg-white border border-black/5 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-sm">
                          <Image src={bankLogo} alt={bankDisplayName} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-black/5 text-neutral-700 border border-black/5 flex items-center justify-center shrink-0 shadow-sm">
                          <Icon icon="solar:card-2-bold" className="text-lg" />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm sm:text-base leading-tight truncate">
                          {bankDisplayName}
                        </span>
                        <span className="text-[10px] font-medium opacity-50 truncate">
                          {locale === "id"
                            ? "Virtual Account (Transfer Antar Bank)"
                            : "Virtual Account (Bank Transfer)"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold self-start sm:self-auto shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>{locale === "id" ? "Menunggu Pembayaran" : "Awaiting Payment"}</span>
                    </div>
                  </div>

                  {/* VA Number Section */}
                  <div className="flex flex-col gap-1.5 bg-black/3 rounded-xl p-3.5 border border-black/5">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      {locale === "id" ? "Nomor Virtual Account" : "Virtual Account Number"}
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono font-bold text-base sm:text-xl tracking-wide select-all break-all">
                        {vaNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(vaNumber);
                          setCopiedVa(true);
                          setTimeout(() => setCopiedVa(false), 2000);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                          copiedVa
                            ? "bg-green-500/15 text-green-600"
                            : "bg-black/5 hover:bg-black/10 text-black/80"
                        }`}
                      >
                        <Icon icon={copiedVa ? "solar:check-circle-bold" : "solar:copy-linear"} className="text-sm" />
                        <span>{copiedVa ? (locale === "id" ? "Tersalin!" : "Copied!") : (locale === "id" ? "Salin No VA" : "Copy VA")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Account Holder / Beneficiary Name */}
                  {vaName && (
                    <div className="flex flex-col gap-1 bg-black/3 rounded-xl p-3.5 border border-black/5">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        {locale === "id" ? "Nama Penerima (A/N)" : "Beneficiary Name"}
                      </span>
                      <span className="font-bold text-sm sm:text-base tracking-wide">
                        {vaName}
                      </span>
                    </div>
                  )}

                  {/* Exact Amount Section */}
                  <div className="flex flex-col gap-1.5 bg-black/3 rounded-xl p-3.5 border border-black/5">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      {locale === "id" ? "Total Jumlah Transfer" : "Total Transfer Amount"}
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-lg sm:text-2xl">
                        Rp {Number(totalPayableAmount).toLocaleString("id-ID")}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(String(totalPayableAmount));
                          setCopiedAmt(true);
                          setTimeout(() => setCopiedAmt(false), 2000);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                          copiedAmt
                            ? "bg-green-500/15 text-green-600"
                            : "bg-black/5 hover:bg-black/10 text-black/80"
                        }`}
                      >
                        <Icon icon={copiedAmt ? "solar:check-circle-bold" : "solar:copy-linear"} className="text-sm" />
                        <span>{copiedAmt ? (locale === "id" ? "Tersalin!" : "Copied!") : (locale === "id" ? "Salin Jumlah" : "Copy Amount")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Paradapp Important Warning */}
                  <div className="rounded-2xl p-4 bg-orange-500/10 border border-orange-500/20 text-orange-700 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 uppercase tracking-widest pb-0.5">
                      <Icon icon="solar:danger-circle-bold" className="text-base text-orange-500" />
                      <span>{locale === "id" ? "Penting" : "Important"}</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-2 text-[11px] font-medium leading-relaxed">
                      <li>
                        <span className="font-bold">{locale === "id" ? "Nominal Pas: " : "Exact Nominal: "}</span>
                        {locale === "id"
                          ? `Transfer harus persis sebesar Rp ${Number(totalPayableAmount).toLocaleString("id-ID")} (jangan dibulatkan).`
                          : `Transfer exactly Rp ${Number(totalPayableAmount).toLocaleString("id-ID")} (do not round).`}
                      </li>
                      <li>
                        <span className="font-bold">{locale === "id" ? "Nama Penerima: " : "Beneficiary Name: "}</span>
                        {locale === "id"
                          ? vaName
                            ? `Pastikan nama penerima VA pada aplikasi bank Anda adalah "${vaName}".`
                            : "Pastikan nama penerima VA pada aplikasi bank Anda sesuai dengan nama akun Anda."
                          : vaName
                            ? `Ensure that the VA beneficiary name on your bank app matches "${vaName}".`
                            : "Ensure that the VA beneficiary name matches your account name."}
                      </li>
                      <li>
                        <span className="font-bold">{locale === "id" ? "Rekening Pengirim: " : "Sender Account: "}</span>
                        {locale === "id"
                          ? customerName
                            ? `Rekening bank yang digunakan untuk transfer harus atas nama yang sama (${customerName}). Transfer dari rekening pihak ketiga tidak diperbolehkan.`
                            : "Rekening bank yang digunakan untuk transfer harus atas nama yang sama dengan akun KYC Anda. Transfer dari rekening pihak ketiga tidak diperbolehkan."
                          : customerName
                            ? `The sending bank account must be under the exact same name (${customerName}). Third-party transfers are not permitted.`
                            : "The sending bank account must match your registered KYC name. Third-party transfers are not permitted."}
                      </li>
                    </ol>
                  </div>

                  {/* Fee Breakdown (if fees present) */}
                  {feeItems && feeItems.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-black/[0.03] border border-black/5 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500 font-medium">
                          {locale === "id" ? "Nominal Pembelian IDRX" : "IDRX Purchase Amount"}
                        </span>
                        <span className="font-semibold">
                          Rp {Number(baseAmount || transaction.idrAmount).toLocaleString("id-ID")}
                        </span>
                      </div>
                      {feeItems.map((fee: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-neutral-500 font-medium">
                            {formatFeeName(fee.name)}
                          </span>
                          <span className="font-semibold">
                            Rp {Number(fee.amount || 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                      ))}
                      <div className="w-full h-px bg-black/5 my-1" />
                      <div className="flex justify-between items-center font-bold text-xs sm:text-sm">
                        <span>{locale === "id" ? "Total Pembayaran" : "Total Payment"}</span>
                        <span className="font-bold">
                          Rp {Number(totalPayableAmount).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Step-by-Step Mobile Banking Instructions Accordion */}
                  <div className="pt-2 border-t border-black/5 space-y-2">
                    <span className="text-[11px] font-bold opacity-60 uppercase tracking-wider block">
                      {locale === "id" ? "Panduan Transfer Bank" : "Bank Transfer Guide"}
                    </span>

                    <div className="space-y-1.5">
                      {/* BCA Guide */}
                      <div className="rounded-xl border border-black/5 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenGuide(openGuide === "bca" ? null : "bca")}
                          className="w-full flex items-center justify-between p-3 bg-white/60 text-left text-xs font-bold hover:bg-white/80 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Icon icon="solar:smartphone-linear" className="text-base opacity-60" />
                            <span>BCA (BCA Mobile / myBCA)</span>
                          </div>
                          <Icon icon="solar:alt-arrow-down-linear" className={`transition-transform duration-200 ${openGuide === "bca" ? "rotate-180" : ""}`} />
                        </button>
                        {openGuide === "bca" && (
                          <div className="p-3.5 bg-black/2 text-[11px] space-y-2 opacity-80 leading-relaxed border-t border-black/5">
                            <ol className="list-decimal pl-4 space-y-1">
                              <li>{locale === "id" ? "Buka aplikasi BCA Mobile / myBCA dan pilih menu m-Transfer." : "Open BCA Mobile / myBCA and select m-Transfer."}</li>
                              <li>{locale === "id" ? "Pilih Transfer Antar Bank > Pilih Layanan BI-FAST." : "Select Transfer to Other Bank > Choose BI-FAST service."}</li>
                              <li>{locale === "id" ? "Pilih Bank Tujuan: BANK INA (Kode 513)." : "Select Destination Bank: BANK INA (Code 513)."}</li>
                              <li>{locale === "id" ? `Masukkan Nomor Rekening Tujuan: ${vaNumber}.` : `Enter Destination Account Number: ${vaNumber}.`}</li>
                              <li>{locale === "id" ? `Masukkan nominal transfer tepat Rp ${Number(totalPayableAmount).toLocaleString("id-ID")}.` : `Enter exact transfer amount Rp ${Number(totalPayableAmount).toLocaleString("id-ID")}.`}</li>
                              <li>{locale === "id" ? "Konfirmasi nama penerima dan selesaikan transfer." : "Confirm recipient name and complete transfer."}</li>
                            </ol>
                          </div>
                        )}
                      </div>

                      {/* Mandiri Guide */}
                      <div className="rounded-xl border border-black/5 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenGuide(openGuide === "mandiri" ? null : "mandiri")}
                          className="w-full flex items-center justify-between p-3 bg-white/60 text-left text-xs font-bold hover:bg-white/80 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Icon icon="solar:smartphone-linear" className="text-base opacity-60" />
                            <span>Mandiri (Livin' by Mandiri)</span>
                          </div>
                          <Icon icon="solar:alt-arrow-down-linear" className={`transition-transform duration-200 ${openGuide === "mandiri" ? "rotate-180" : ""}`} />
                        </button>
                        {openGuide === "mandiri" && (
                          <div className="p-3.5 bg-black/2 text-[11px] space-y-2 opacity-80 leading-relaxed border-t border-black/5">
                            <ol className="list-decimal pl-4 space-y-1">
                              <li>{locale === "id" ? "Buka Livin' by Mandiri dan pilih menu Transfer Rupiah." : "Open Livin' by Mandiri and select Transfer Rupiah."}</li>
                              <li>{locale === "id" ? "Pilih Transfer ke Penerima Baru > Cari Bank: BANK INA." : "Select Transfer to New Recipient > Search Bank: BANK INA."}</li>
                              <li>{locale === "id" ? `Masukkan Nomor Rekening: ${vaNumber} lalu tekan Lanjutkan.` : `Enter Account Number: ${vaNumber} then press Continue.`}</li>
                              <li>{locale === "id" ? `Masukkan nominal pas Rp ${Number(totalPayableAmount).toLocaleString("id-ID")} dan pilih metode BI-FAST.` : `Enter exact nominal Rp ${Number(totalPayableAmount).toLocaleString("id-ID")} and choose BI-FAST.`}</li>
                              <li>{locale === "id" ? "Konfirmasi transaksi dan masukkan PIN Livin'." : "Confirm transaction and enter Livin' PIN."}</li>
                            </ol>
                          </div>
                        )}
                      </div>

                      {/* BRI Guide */}
                      <div className="rounded-xl border border-black/5 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenGuide(openGuide === "bri" ? null : "bri")}
                          className="w-full flex items-center justify-between p-3 bg-white/60 text-left text-xs font-bold hover:bg-white/80 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Icon icon="solar:smartphone-linear" className="text-base opacity-60" />
                            <span>BRI (BRImo)</span>
                          </div>
                          <Icon icon="solar:alt-arrow-down-linear" className={`transition-transform duration-200 ${openGuide === "bri" ? "rotate-180" : ""}`} />
                        </button>
                        {openGuide === "bri" && (
                          <div className="p-3.5 bg-black/2 text-[11px] space-y-2 opacity-80 leading-relaxed border-t border-black/5">
                            <ol className="list-decimal pl-4 space-y-1">
                              <li>{locale === "id" ? "Buka aplikasi BRImo dan pilih menu Transfer." : "Open BRImo app and select Transfer menu."}</li>
                              <li>{locale === "id" ? "Pilih Tambah Penerima Baru > Bank Tujuan: BANK INA." : "Select Add New Recipient > Destination Bank: BANK INA."}</li>
                              <li>{locale === "id" ? "Pilih Metode Transfer: BI-FAST." : "Select Transfer Method: BI-FAST."}</li>
                              <li>{locale === "id" ? `Masukkan Nomor Rekening ${vaNumber}.` : `Enter Account Number ${vaNumber}.`}</li>
                              <li>{locale === "id" ? `Masukkan nominal transfer tepat Rp ${Number(totalPayableAmount).toLocaleString("id-ID")}.` : `Enter exact transfer nominal Rp ${Number(totalPayableAmount).toLocaleString("id-ID")}.`}</li>
                              <li>{locale === "id" ? "Konfirmasi detail dan selesaikan pembayaran." : "Confirm details and complete payment."}</li>
                            </ol>
                          </div>
                        )}
                      </div>

                      {/* BNI & Bank Lainnya */}
                      <div className="rounded-xl border border-black/5 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenGuide(openGuide === "other" ? null : "other")}
                          className="w-full flex items-center justify-between p-3 bg-white/60 text-left text-xs font-bold hover:bg-white/80 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Icon icon="solar:card-linear" className="text-base opacity-60" />
                            <span>{locale === "id" ? "BNI, Permata & Bank Lainnya / ATM" : "BNI, Permata & Other Banks / ATM"}</span>
                          </div>
                          <Icon icon="solar:alt-arrow-down-linear" className={`transition-transform duration-200 ${openGuide === "other" ? "rotate-180" : ""}`} />
                        </button>
                        {openGuide === "other" && (
                          <div className="p-3.5 bg-black/2 text-[11px] space-y-2 opacity-80 leading-relaxed border-t border-black/5">
                            <ol className="list-decimal pl-4 space-y-1">
                              <li>{locale === "id" ? "Buka Mobile Banking atau kunjungi ATM bank Anda." : "Open your Mobile Banking or visit an ATM."}</li>
                              <li>{locale === "id" ? "Pilih Transfer Antar Bank (pilih BI-FAST atau Online Real-time)." : "Select Interbank Transfer (choose BI-FAST or Real-time Online)."}</li>
                              <li>{locale === "id" ? "Pilih Bank Tujuan: BANK INA (Kode Bank: 513)." : "Select Destination Bank: BANK INA (Bank Code: 513)."}</li>
                              <li>{locale === "id" ? `Masukkan Nomor Rekening / VA: ${vaNumber}.` : `Enter Account Number / VA: ${vaNumber}.`}</li>
                              <li>{locale === "id" ? `Transfer nominal pas Rp ${Number(totalPayableAmount).toLocaleString("id-ID")}.` : `Transfer exact nominal Rp ${Number(totalPayableAmount).toLocaleString("id-ID")}.`}</li>
                              <li>{locale === "id" ? "Simpan bukti transaksi setelah selesai." : "Keep transaction receipt upon completion."}</li>
                            </ol>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {transaction.networkEnv == "TESTNET" && (
                <div className="mb-4">
                  <Button
                    chain={network}
                    disabled={isMarkingPaid}
                    onClick={handleMarkAsPaid}
                    buttonText={
                      isMarkingPaid
                        ? t("text74")
                        : locale === "id"
                          ? "Simulasikan Pembayaran"
                          : "Simulate Paid"
                    }
                  />
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between mt-2 pt-3 border-t border-black/5">
            <div className="w-28">
              <Button
                chain={network}
                buttonText={t("text105")}
                onClick={() => {
                  router.replace(`/${network}/vault/buy`);
                }}
              />
            </div>
            <div className="text-right text-[11px] sm:text-xs text-neutral-400 font-medium">
              <p>{t("text94")}:</p>
              <p>{formatDateTime(transaction.createdAt)}</p>
            </div>
          </div>
        </div>
      )}

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

        <div className="px-6 py-6 border-t border-black/5 bg-white">
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

        <div className="px-6 py-6 border-t border-black/5 bg-white">
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

      <AnimatedModal
        isOpen={showCancelModal}
        onClose={() => !isCancelling && setShowCancelModal(false)}
        maxWidthClass="lg:w-100"
      >
        <div className="p-6 flex flex-col gap-4 text-black">
          <div>
            <h2 className="text-xl font-bold">
              {locale === "id" ? "Batalkan Transaksi" : "Cancel Transaction"}
            </h2>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {locale === "id"
                ? "Apakah Anda yakin ingin membatalkan transaksi ini? Pastikan Anda belum melakukan pembayaran."
                : "Are you sure you want to cancel this transaction? Please make sure you have not made any payment."}
            </p>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4 border-t border-black/5">
            <button
              onClick={() => setShowCancelModal(false)}
              disabled={isCancelling}
              className="px-5 py-2.5 rounded-xl bg-black text-white text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer min-w-[80px]"
            >
              {locale === "id" ? "Tidak" : "No"}
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-black/10 text-neutral-600 hover:bg-black/5 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer min-w-[100px]"
            >
              {isCancelling ? (
                <>
                  <div className="animate-spin inline-block w-3.5 h-3.5 border-2 border-neutral-500 border-t-transparent rounded-full shrink-0" />
                  <span className="whitespace-nowrap">{locale === "id" ? "Memproses..." : "Processing..."}</span>
                </>
              ) : (
                <span>{locale === "id" ? "Ya, Batalkan" : "Yes, Cancel"}</span>
              )}
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
