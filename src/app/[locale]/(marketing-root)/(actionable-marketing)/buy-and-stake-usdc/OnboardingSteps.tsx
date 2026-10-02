"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { phantom, bca, bri, bni, mandiri, permata, qris, usdc } from "@/index";
import { AnimatedModal } from "@/subcomponents/AnimatedModal";
import Button from "@/subcomponents/Button";
import ButtonContrast from "@/subcomponents/ButtonContrast";
import {
  FaCheck,
  FaLock,
  FaChevronDown,
  FaWallet,
  FaSpinner,
  FaExclamationCircle,
} from "react-icons/fa";
import { useNetwork } from "@/app/network-provider";
import SolanaStake from "@/components/integrator/dapphub/solana/solana-staking/SolanaStake";
import { Icon } from "@iconify/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOnboarding } from "@/components/providers/onboarding-provider";
import {
  savePendingTransaction,
  getPendingTransaction,
  clearPendingTransaction,
} from "@/lib/onboarding-storage";

interface OnboardingStepsProps {
  locale: string;
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

const TRANSLATIONS: Record<string, Record<string, string>> = {
  id: {
    title: "Hanya Butuh 3 Step Untuk Beli dan Staking USDC",
    subtitle:
      "Lindungi aset saat rupiah melemah dengan 3 langkah mudah: Install Phantom Wallet, beli USDC, lalu aktifkan Staking.",
    step1: "Langkah 1: Instal & Hubungkan Dompet",
    step1Desc: "Instal Phantom Wallet dan hubungkan ke Paradapp.",
    step2: "Langkah 2: Beli USDC",
    step2Desc:
      "Simulasikan pembelian USDC dengan mata uang Rupiah (IDR) menggunakan QRIS atau Virtual Account.",
    step3: "Langkah 3: Staking USDC",
    step3Desc:
      "Deposito USDC-mu di Vault dengan APY tinggi dan pantau hasilnya tumbuh setiap detik.", // Diubah dari "USDC Anda"
    completedBadge: "Selesai",
    paymentMethod: "Metode Pembayaran",
    createTransaction: "Beli USDC",
    transferBefore: "Transfer sebelum",
    destinationAddress: "Alamat Tujuan",
    buyAmount: "Jumlah Pembelian",
    estimatedReceive: "Estimasi Token yang akan diterima",
    simulatePaid: "Simulasikan Pembayaran",
    simulatePaidDesc:
      "*Klik tombol ini untuk mensimulasikan transfer agar sistem dapat segera memverifikasi dan mengirim token.", // Diubah dari "mendapatkan token" agar lebih pas dari sisi sistem
    transactionPaid: "Pembayaran telah terverifikasi.",
    transactionPending: "Transaksi sedang diproses...",
    transactionCompleted: "Transaksi telah terkonfirmasi di blockchain.",
    viewExplorer: "Lihat di network explorer",
    proceedStake: "Mulai Staking USDC-mu", // Diubah dari "USDC Anda"
    expired: "Transaksi kadaluarsa",
    backToBuy: "Kembali ke Pembelian",
    copy: "Salin",
    copied: "Tersalin!",
    downloadQris: "Unduh QRIS",
    scanQris: "Pindai ini untuk membayar atau unduh QR",
    vaNumber: "Nomor Virtual Account",
    processing: "Memproses",
    paid: "Dibayar",
    completed: "Selesai",
    waitingPayment: "Menunggu pembayaran",
    finishRestart: "Selesai & Ulangi Tutorial",
    mainnetOnly:
      "Fitur ini hanya tersedia di Mainnet. Silakan ganti ke Mainnet terlebih dahulu.",
    minAmount: "Jumlah minimal adalah {min} IDR.",
    maxAmountQRIS: "Jumlah maksimal untuk QRIS adalah {max} IDR.",
    maxAmountVA: "Jumlah maksimal untuk Virtual Account adalah {max} IDR.",
  },
  en: {
    title: "Interactive Guide: 3 Easy Steps", // Diubah ke "3 Easy Steps" agar lebih ramah dibaca
    subtitle:
      "Learn and practice how to secure your digital Dollars in real-time.",
    step1: "Step 1: Install & Connect Wallet",
    step1Desc: "Install Phantom Wallet and connect it to Paradapp.",
    step2: "Step 2: Buy USDC",
    step2Desc:
      "Simulate buying USDC with Rupiah (IDR) using QRIS or Virtual Account.",
    step3: "Step 3: Stake USDC", // Menggunakan "Stake" lebih umum dan simpel dibanding "Staking" untuk menu aksi
    step3Desc:
      "Grow your USDC in the Vault with high APY and watch your rewards grow every second.", // "Watch your yield tick up" diganti ke "rewards grow" agar jauh lebih mudah dipahami pasar non-english
    completedBadge: "Completed",
    paymentMethod: "Payment Method",
    createTransaction: "Buy USDC",
    transferBefore: "Transfer before",
    destinationAddress: "Destination Address",
    buyAmount: "Buy Amount",
    estimatedReceive: "Estimated tokens you will receive", // Diperbaiki dari "Estimated token will be received" agar tata bahasanya lebih natural
    simulatePaid: "Simulate Payment", // "Simulate Paid" diubah ke "Payment" agar secara gramatikal lebih tepat
    simulatePaidDesc:
      "*Click this button to simulate the transfer so the system can verify and send your tokens immediately.",
    transactionPaid: "Payment verified.", // Dipersingkat agar padat dan jelas
    transactionPending: "Processing transaction...",
    transactionCompleted: "Transaction confirmed on the blockchain.",
    viewExplorer: "View on network explorer",
    proceedStake: "Start Staking Your USDC", // Diubah dari "Proceed to Stake" menjadi "Start Staking" agar lebih kasual dan interaktif
    expired: "Transaction expired",
    backToBuy: "Back to Buy",
    copy: "Copy",
    copied: "Copied!",
    downloadQris: "Download QR Code",
    scanQris: "Scan here to pay or download QR",
    vaNumber: "Virtual Account Number",
    processing: "Processing",
    paid: "Paid",
    completed: "Completed",
    waitingPayment: "Waiting for payment",
    finishRestart: "Finish & Restart Guide",
    mainnetOnly:
      "This feature is only available on Mainnet. Please switch to Mainnet first.",
    minAmount: "Minimum amount is {min} IDR.",
    maxAmountQRIS: "Maximum amount for QRIS is {max} IDR.",
    maxAmountVA: "Maximum amount for Virtual Account is {max} IDR.",
  },
};

// Known VA channel codes mapped to their bank logos. The channel list itself comes live
// from /api/payment-channels (same as BuyToken.tsx) — this is only a display lookup, so an
// unrecognized code just falls back to a generic card icon instead of breaking.
const VA_BANK_LOGOS: Record<string, any> = {
  BCA: bca,
  MANDIRI: mandiri,
  BRI: bri,
  BNI: bni,
  PERMATA: permata,
};

export default function OnboardingSteps({ locale }: OnboardingStepsProps) {
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  const {
    connected: walletConnected,
    address: walletAddress,
    connect,
    availableWallets,
    selfCustodyParameter,
  } = useSolanaWallet();

  const { solanaMainnet, setSolanaMainnet } = useNetwork();
  const isMainnet = solanaMainnet;
  const { startOnboarding } = useOnboarding();

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTxId = searchParams.get("txId");

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>(
    {
      1: false,
      2: false,
      3: false,
    },
  );

  const [step1Sub, setStep1Sub] = useState<1 | 2>(1);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  const [step2Sub, setStep2Sub] = useState<1 | 2 | 3 | 4>(1);
  const [payAmountIdr, setPayAmountIdr] = useState("1000000");
  const [selectedMethod, setSelectedMethod] = useState<"QRIS" | "VA">("QRIS");
  const [selectedVaBank, setSelectedVaBank] = useState<string>("INA");
  const [vaChannels, setVaChannels] = useState<
    { name: string; detailName: string; code: string; logo: any; fee: number }[]
  >([
    {
      name: "Bank INA",
      detailName: "Bank INA Virtual Account",
      code: "INA",
      logo: null,
      fee: 3000,
    },
  ]);
  const [copiedText, setCopiedText] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const [transaction, setTransaction] = useState<any>(null);
  const [isCreatingTx, setIsCreatingTx] = useState(false);
  const [txError, setTxError] = useState("");
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(600);
  const [estimatedToken, setEstimatedToken] = useState<number | null>(null);

  const [amountError, setAmountError] = useState("");

  // Restoration state to avoid flash of input form on page refresh
  const [isRestoringTx, setIsRestoringTx] = useState(!!initialTxId);

  const activeAddress = useMemo(() => {
    if (walletConnected && walletAddress) {
      return walletAddress;
    }
    return "";
  }, [walletConnected, walletAddress]);

  // Live VA channel list (same source and shape as BuyToken.tsx) instead of a hardcoded
  // bank list — so the banks offered here, and their transfer fees, match what the backend
  // actually supports rather than a guessed static set.
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch("/api/payment-channels");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          const vaList = data
            .filter((c: any) => c.method?.toLowerCase() === "va")
            .map((c: any) => ({
              name: c.name,
              detailName: `${c.name} Virtual Account`,
              code: c.code,
              logo: VA_BANK_LOGOS[(c.code || "").toUpperCase()] || null,
              fee: c.feeValue || 3000,
            }));
          if (vaList.length > 0) {
            setVaChannels(vaList);
            setSelectedVaBank((prev) =>
              vaList.some((v) => v.code === prev) ? prev : vaList[0].code,
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch payment channels:", err);
      }
    };
    fetchChannels();
  }, []);

  const currentVaChannel = useMemo(
    () =>
      vaChannels.find((channel) => channel.code === selectedVaBank) ||
      vaChannels[0],
    [selectedVaBank, vaChannels],
  );

  // USDC deposit constraints
  const currentTokenConstraints = useMemo(() => {
    if (!selfCustodyParameter || !(selfCustodyParameter as any).tokens)
      return null;
    const tokens = (selfCustodyParameter as any).tokens;
    return (
      tokens.find((t: any) => {
        const backendToken = (t.token || "").trim().toUpperCase();
        return backendToken === "USDC" || t.token === "USDC_MINT";
      }) || null
    );
  }, [selfCustodyParameter]);

  // Validate amount against deposit limits
  useEffect(() => {
    if (!currentTokenConstraints) {
      setAmountError("");
      return;
    }

    const minAmount = currentTokenConstraints.deposit?.min || 0;
    const maxAmount =
      selectedMethod === "QRIS"
        ? currentTokenConstraints.deposit?.maxQRIS || 0
        : currentTokenConstraints.deposit?.maxVA || 0;

    const numeric = parseFloat(payAmountIdr.replace(/,/g, ""));

    if (isNaN(numeric) || numeric <= 0) {
      setAmountError("");
      return;
    }

    if (numeric < minAmount) {
      setAmountError(
        t.minAmount.replace("{min}", minAmount.toLocaleString("id-ID")),
      );
    } else if (maxAmount > 0 && numeric > maxAmount) {
      setAmountError(
        selectedMethod === "QRIS"
          ? t.maxAmountQRIS.replace("{max}", maxAmount.toLocaleString("id-ID"))
          : t.maxAmountVA.replace("{max}", maxAmount.toLocaleString("id-ID")),
      );
    } else {
      setAmountError("");
    }
  }, [payAmountIdr, selectedMethod, currentTokenConstraints, t]);

  // Restore transaction on mount if txId exists
  useEffect(() => {
    if (!initialTxId) {
      setIsRestoringTx(false);
      return;
    }

    const restoreTx = async () => {
      try {
        const res = await fetch(`/api/transaction/${initialTxId}`);
        if (!res.ok) throw new Error("Transaction not found");
        const data = await res.json();
        if (data.transaction) {
          setTransaction(data.transaction);
          // Unlock Step 1 and Step 2 (wallet was presumably connected when TX was created)
          setCompletedSteps((prev) => ({
            ...prev,
            1: true,
            2: data.transaction.status === "COMPLETED" ? true : false,
          }));
          setActiveStep(2);

          // Determine substep based on status
          const status = data.transaction.status;
          if (status === "WAITING" || status === "EXPIRED") {
            setStep2Sub(2);
          } else if (status === "PENDING" || status === "PAID") {
            setStep2Sub(3);
          } else if (status === "COMPLETED") {
            setStep2Sub(4);
          } else {
            setStep2Sub(2);
          }
        } else {
          // Transaction not valid, clear URL param
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("txId");
          router.replace(newUrl.pathname + newUrl.search, { scroll: false });
        }
      } catch (err) {
        console.error("Failed to restore transaction:", err);
        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("txId");
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      } finally {
        setIsRestoringTx(false);
      }
    };

    restoreTx();
  }, [initialTxId, router]);

  // Auto-detect Phantom
  useEffect(() => {
    if (typeof window !== "undefined" && !hasAutoDetected) {
      const isPhantomInstalled = !!(window as any).phantom?.solana;
      if (isPhantomInstalled) {
        setStep1Sub(2);
        setHasAutoDetected(true);
      }
    }
  }, [hasAutoDetected]);

  // Sync wallet connection – now preserves ongoing transaction details
  useEffect(() => {
    if (walletConnected && activeStep === 1 && step1Sub === 2) {
      setCompletedSteps((prev) => ({ ...prev, 1: true }));
      setActiveStep(2);

      // If we already have a transaction, jump to the correct substep
      if (transaction) {
        const status = transaction.status;
        if (status === "WAITING" || status === "EXPIRED") {
          setStep2Sub(2);
        } else if (status === "PENDING" || status === "PAID") {
          setStep2Sub(3);
        } else if (status === "COMPLETED") {
          setStep2Sub(4);
          setCompletedSteps((prev) => ({ ...prev, 2: true }));
        } else {
          setStep2Sub(2);
        }
      } else {
        setStep2Sub(1);
      }
    }
  }, [walletConnected, activeStep, step1Sub, transaction]);

  useEffect(() => {
    if (!walletConnected) {
      setCompletedSteps((prev) => {
        if (prev[1]) {
          setActiveStep(1);
          setStep1Sub(2);
          return { ...prev, 1: false, 2: false, 3: false };
        }
        return prev;
      });
    }
  }, [walletConnected]);

  const handleRealConnect = async () => {
    try {
      if (availableWallets && availableWallets.length > 0) {
        const phantomWallet =
          availableWallets.find((w) =>
            w.name.toLowerCase().includes("phantom"),
          ) || availableWallets[0];
        await connect(phantomWallet);
      } else {
        await connect("walletconnect");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  // Live "you'll receive" preview, sourced the same way BuyToken.tsx computes it — a
  // debounced call to /api/estimate-deposit — instead of a hardcoded IDR/USDC rate, so the
  // number shown here reflects the real live price and real fee deduction.
  const [calculatedUsdc, setCalculatedUsdc] = useState(0);

  useEffect(() => {
    const numeric = parseFloat(payAmountIdr.replace(/,/g, "")) || 0;
    if (numeric <= 0) {
      setCalculatedUsdc(0);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          network: "SOLANA",
          token: "USDC",
          idr: numeric.toString(),
          env: isMainnet ? "MAINNET" : "TESTNET",
          paymentMethod: selectedMethod,
          channelId: selectedMethod === "QRIS" ? "QR" : selectedVaBank,
        });
        const res = await fetch(`/api/estimate-deposit?${params.toString()}`);
        const data = await res.json();

        let finalToken = 0;
        if (data.token) {
          finalToken = data.token;
        } else if (data.qris || data.va) {
          const selectedData =
            selectedMethod === "QRIS" ? data.qris || data.va : data.va || data.qris;
          finalToken = selectedData?.token || 0;
        }
        setCalculatedUsdc(finalToken > 0 ? finalToken : 0);
      } catch (err) {
        console.error("Failed to fetch estimate:", err);
        setCalculatedUsdc(0);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [payAmountIdr, selectedMethod, selectedVaBank, isMainnet]);

  // `isRetry` marks the automatic call the verify_success effect below makes right after a
  // KYC/email verification redirect. If that silent attempt itself fails, it most likely
  // means IDRX-side KYC review hasn't actually finished propagating yet even though our own
  // email/wallet verification just completed — logged, not shown as a scary generic error
  // right after the user just successfully verified (mirrors the same fix in BuyToken.tsx).
  const handleCreateTransaction = async (isRetry = false) => {
    const idrAmount = parseFloat(payAmountIdr);
    if (idrAmount <= 0 || !activeAddress) return;
    if (amountError) return;

    setIsCreatingTx(true);
    setTxError("");
    try {
      const isQris = selectedMethod === "QRIS";
      const paymentDetails: any = {
        method: "IDRX",
        paymentMethod: isQris ? "qris" : "va",
        channelId: isQris ? "QR" : selectedVaBank,
        channelName: isQris ? "QRIS" : currentVaChannel?.detailName,
        returnUrl:
          typeof window !== "undefined"
            ? `${window.location.origin}/payment-return`
            : "https://paradapp.io/payment-return",
      };

      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DEPOSIT",
          walletAddress: activeAddress,
          tokenType: "USDC",
          network: "SOLANA",
          networkEnv: isMainnet ? "MAINNET" : "TESTNET",
          idrAmount,
          paymentDetails,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.tx?.id) {
        setTransaction(data.tx);
        setStep2Sub(2);
        // persist transaction ID in URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("txId", data.tx.id);
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      } else if (
        res.status === 429 ||
        (data?.error &&
          (data.error.toLowerCase().includes("too many on progress") ||
            data.error.toLowerCase().includes("limit")))
      ) {
        setShowLimitModal(true);
      } else if (
        data?.errorCode === "ERR_IDRX_REKYC_REQUIRED" ||
        data?.error_code === "ERR_IDRX_REKYC_REQUIRED"
      ) {
        savePendingTransaction({
          type: "DEPOSIT",
          walletAddress: activeAddress,
          tokenType: "USDC",
          network: "SOLANA",
          networkEnv: isMainnet ? "MAINNET" : "TESTNET",
          idrAmount,
          paymentDetails,
        });
        startOnboarding(
          activeAddress,
          "SOLANA",
          data?.lastEmail || data?.last_email,
          true,
        );
      } else if (
        res.status === 400 &&
        (() => {
          const msg = data.error?.toLowerCase() || "";
          // Backend wording differs by endpoint — deposit says "not onboarded with
          // IDRX", withdrawal says "not onboarded to IDRX" — match on both key phrases
          // independently instead of one exact string, verified against the live backend.
          return msg.includes("not onboarded") && msg.includes("idrx");
        })()
      ) {
        savePendingTransaction({
          type: "DEPOSIT",
          walletAddress: activeAddress,
          tokenType: "USDC",
          network: "SOLANA",
          networkEnv: isMainnet ? "MAINNET" : "TESTNET",
          idrAmount,
          paymentDetails,
        });
        startOnboarding(activeAddress, "SOLANA");
      } else {
        console.error("Transaction creation failed:", data?.error);
        if (!isRetry) {
          setTxError(
            locale === "id"
              ? "Gagal membuat transaksi. Silakan coba lagi."
              : "Failed to create transaction. Please try again.",
          );
        }
      }
    } catch (err) {
      if (!isRetry) {
        setTxError(
          locale === "id"
            ? "Terjadi kesalahan jaringan."
            : "Network error occurred.",
        );
      }
    } finally {
      setIsCreatingTx(false);
    }
  };

  // Mirrors BuyToken.tsx: after the onboarding modal's email/KYC verification succeeds, the
  // verify page redirects to the canonical vault page with ?verify_success=true — it has no
  // way to know this landing page's guided flow is where the user actually started, so a
  // visitor who onboards from here currently finishes on the standard vault page instead of
  // back in this wizard. This effect at least lets a same-page reload/return with that param
  // resume cleanly rather than losing the in-progress amount/payment method.
  useEffect(() => {
    const verifySuccess = searchParams.get("verify_success");
    if (verifySuccess !== "true") return;

    const pendingTx = getPendingTransaction();
    if (
      pendingTx &&
      pendingTx.type === "DEPOSIT" &&
      pendingTx.walletAddress === activeAddress
    ) {
      if (pendingTx.idrAmount) {
        setPayAmountIdr(pendingTx.idrAmount.toString());
      }
      if (pendingTx.paymentDetails) {
        if (pendingTx.paymentDetails.paymentMethod === "qris") {
          setSelectedMethod("QRIS");
        } else {
          setSelectedMethod("VA");
          if (pendingTx.paymentDetails.channelId) {
            setSelectedVaBank(pendingTx.paymentDetails.channelId);
          }
        }
      }

      clearPendingTransaction();

      const newParams = new URLSearchParams(window.location.search);
      newParams.delete("verify_success");
      const path = window.location.pathname;
      const search = newParams.toString();
      router.replace(`${path}${search ? `?${search}` : ""}`, { scroll: false });

      // A short delay so the just-completed verification has a moment to actually
      // propagate on the backend before this fires — hitting it immediately risked a
      // transient "not onboarded" response right after the user had just verified.
      setTimeout(() => {
        handleCreateTransaction(true);
      }, 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, activeAddress]);

  // Poll transaction
  useEffect(() => {
    if (!transaction?.id) return;
    const fetchTransaction = async () => {
      try {
        const res = await fetch(`/api/transaction/${transaction.id}`);
        if (!res.ok) return;
        const data = await res.json();
        setTransaction(data.transaction);
      } catch (e) {
        console.error("Polling error:", e);
      }
    };
    const interval = setInterval(fetchTransaction, 5000);
    return () => clearInterval(interval);
  }, [transaction?.id]);

  // Estimate token while waiting
  useEffect(() => {
    if (!transaction || transaction.type !== "DEPOSIT") return;
    if (transaction.tokenAmount > 0 || transaction.idrAmount <= 0) {
      return;
    }

    let cancelled = false;
    const fetchEstimate = async () => {
      try {
        const params = new URLSearchParams({
          network: "SOLANA",
          token: "USDC",
          idr: transaction.idrAmount.toString(),
          paymentMethod: transaction.paymentDetails?.method || "",
          env: isMainnet ? "MAINNET" : "TESTNET",
        });
        const res = await fetch(`/api/estimate-deposit?${params.toString()}`);
        const data = await res.json();
        if (!cancelled && data.token) {
          setEstimatedToken(data.token);
        }
      } catch (e) {
        console.error("Estimate error:", e);
      }
    };
    fetchEstimate();
    return () => {
      cancelled = true;
    };
  }, [transaction, isMainnet]);

  // Advance substep based on tx status
  useEffect(() => {
    if (!transaction) return;
    const status = transaction.status;
    if (status === "WAITING" || status === "EXPIRED") {
      setStep2Sub(2);
    } else if (status === "PENDING" || status === "PAID") {
      setStep2Sub(3);
    } else if (status === "COMPLETED") {
      setStep2Sub(4);
      setCompletedSteps((prev) => ({ ...prev, 2: true }));
    }
  }, [transaction?.status]);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isOwner = useMemo(() => {
    if (!activeAddress || !transaction?.walletAddress) return false;
    return activeAddress.toLowerCase() === transaction.walletAddress.toLowerCase();
  }, [activeAddress, transaction?.walletAddress]);

  // Countdown
  useEffect(() => {
    if (!transaction?.createdAt || step2Sub < 2) return;
    const created = new Date(transaction.createdAt);
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
    const timerInterval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(
        0,
        Math.floor((expiry.getTime() - now.getTime()) / 1000),
      );
      setTimeLeftSeconds(remaining);
      if (remaining <= 0) clearInterval(timerInterval);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [
    transaction?.createdAt,
    transaction?.expiresAt,
    transaction?.paymentDetails,
    step2Sub,
  ]);

  const formattedTime = useMemo(() => {
    const hours = Math.floor(timeLeftSeconds / 3600);
    const mins = Math.floor((timeLeftSeconds % 3600) / 60);
    const secs = timeLeftSeconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [timeLeftSeconds]);

  const handleConfirmCancel = async () => {
    if (!transaction?.id) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/transaction/${transaction.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: activeAddress || transaction?.walletAddress,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCancelModal(false);
        handleRestartOnboarding();
      } else {
        alert(data.error || "Failed to cancel transaction");
      }
    } catch (err) {
      console.error("Cancel transaction error:", err);
      alert("Failed to cancel transaction.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!transaction?.id) return;
    try {
      const res = await fetch(`/api/transaction/${transaction.id}/mark-paid`, {
        method: "PATCH",
      });
      if (res.ok) {
        // Polling will update
      }
    } catch (err) {
      console.error("Mark as paid error:", err);
    }
  };

  const handleRestartOnboarding = () => {
    setActiveStep(1);
    setStep1Sub(1);
    setStep2Sub(1);
    setCompletedSteps({ 1: false, 2: false, 3: false });
    setHasAutoDetected(false);
    setTransaction(null);
    setPayAmountIdr("1000000");
    setSelectedMethod("QRIS");
    setSelectedVaBank("BCA");
    // Clear txId from URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("txId");
    router.replace(newUrl.pathname + newUrl.search, { scroll: false });
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const displayTokenAmount = () => {
    if (transaction?.tokenAmount > 0) return transaction.tokenAmount;
    if (estimatedToken !== null) return estimatedToken;
    return "...";
  };

  // ---------- Mainnet guard ----------
  if (isMainnet === undefined) {
    return (
      <div className="w-full h-40 flex items-center justify-center">
        <FaSpinner className="animate-spin text-neutral-400 text-2xl" />
      </div>
    );
  }

  if (!isMainnet) {
    return (
      <div className="w-full mt-16 md:mt-24 font-grotesk flex items-center justify-center px-4">
        <div className="glass-card rounded-3xl p-10 max-w-md w-full text-center">
          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 dark:bg-white flex items-center justify-center shadow-md">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white dark:text-neutral-900"
                />
                <path
                  d="M12 8V12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="text-white dark:text-neutral-900"
                />
                <circle
                  cx="12"
                  cy="16"
                  r="1.2"
                  fill="currentColor"
                  className="text-white dark:text-neutral-900"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">
            {locale === "id" ? "Mainnet Diperlukan" : "Mainnet Required"}
          </h3>

          {/* Message */}
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
            {t.mainnetOnly}
          </p>

          {/* Switch button */}
          <button
            id="switch-to-mainnet-btn"
            onClick={() => setSolanaMainnet(true)}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white dark:text-neutral-900 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-md"
          >
            {locale === "id" ? "Pindah ke Mainnet" : "Switch to Mainnet"}
          </button>

          {/* Badge */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600"></span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
              {locale === "id" ? "Saat ini: Devnet" : "Currently on: Devnet"}
            </span>
          </div>
        </div>
      </div>
    );
  }
  // ----------------------------------

  const renderTransactionDetails = () => {
    if (!transaction) return null;
    const status = transaction.status;
    const isTestnet = !isMainnet;
    const paymentDetails = transaction.paymentDetails || {};
    const tokenReceived = displayTokenAmount();
    const steps = ["PAID", "PENDING", "COMPLETED"];
    const currentStepIndex = steps.indexOf(status);

    // paymentDetails.method is always "IDRX" now (see handleCreateTransaction's request
    // payload) — it never equals "QRIS", and channelCode/vaNumber aren't fields the backend
    // actually returns for this shape either. Benchmarked against VaultTransactionPage.tsx,
    // which reads this same transaction shape correctly in production.
    const isQrisPayment =
      paymentDetails.paymentMethod === "qris" ||
      paymentDetails.method === "QRIS" ||
      Boolean(paymentDetails.qrContent || paymentDetails.qrString);
    const qrString =
      paymentDetails.qrContent ||
      paymentDetails.qrString ||
      transaction.idrxDetails?.qrContent ||
      transaction.idrx_details?.qrContent ||
      "";
    const vaNumber =
      paymentDetails.virtualAccountNo || paymentDetails.vaNumber || "";
    const vaChannelKey = (
      paymentDetails.channelId ||
      paymentDetails.channelCode ||
      paymentDetails.paymentMethod ||
      paymentDetails.channelName ||
      ""
    ).toUpperCase();
    const vaBankDisplayName = (() => {
      if (vaChannelKey.includes("INA")) return "Bank INA";
      if (vaChannelKey.includes("MANDIRI")) return "Bank Mandiri";
      if (vaChannelKey.includes("BRI")) return "Bank BRI";
      if (vaChannelKey.includes("BCA")) return "Bank Central Asia (BCA)";
      if (vaChannelKey.includes("BNI")) return "Bank BNI";
      if (vaChannelKey.includes("PERMATA")) return "Bank Permata";
      return paymentDetails.channelName || "Bank INA";
    })();

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="space-y-4 max-w-2xl mx-auto"
      >
        {status === "WAITING" && (
          <div className="sm:text-sm text-[10px] mb-4 flex items-center justify-between text-left">
            <p>
              {t.transferBefore}{" "}
              <span className="font-semibold text-neutral-900 dark:text-white">
                {formattedTime}
              </span>
            </p>
            {isOwner && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={isCancelling}
                className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-white underline cursor-pointer disabled:opacity-50 transition-colors"
              >
                {locale === "id" ? "Batalkan Transaksi" : "Cancel Transaction"}
              </button>
            )}
          </div>
        )}

        {["PAID", "PENDING", "COMPLETED"].includes(status) && (
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-start justify-between w-full max-w-sm sm:max-w-md mx-auto">
              {steps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center w-10 sm:w-12 shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCompleted || isCurrent
                            ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                            : "bg-gray-300 text-gray-600 dark:text-gray-400"
                        } ${isCurrent ? "animate-pulse" : ""}`}
                      >
                        {index + 1}
                      </div>
                      <div
                        className={`mt-1 text-xs font-semibold text-center whitespace-nowrap ${
                          isCompleted || isCurrent
                            ? "text-neutral-900 dark:text-white"
                            : "text-neutral-400 dark:text-neutral-500"
                        }`}
                      >
                        {step === "PENDING"
                          ? t.processing
                          : step === "PAID"
                            ? t.paid
                            : t.completed}
                      </div>

                      {/* Sub-status: Stacked on mobile (<sm), Single-line on desktop (sm+) */}
                      {isCurrent && step === "PAID" && (
                        <div className="mt-1 flex items-center justify-center text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">
                          {/* Mobile (<sm) */}
                          <div className="flex flex-col items-center justify-center leading-tight text-center sm:hidden">
                            <div className="flex items-center gap-1">
                              <div className="animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full shrink-0" />
                              <span>
                                {transaction.paymentDetails?.depositTxHash
                                  ? locale === "id"
                                    ? "Konversi IDRX"
                                    : "Converting IDRX"
                                  : "Minting"}
                              </span>
                            </div>
                            <span>
                              {transaction.paymentDetails?.depositTxHash
                                  ? locale === "id"
                                    ? "ke USDC"
                                    : "to USDC"
                                  : "IDRX"}
                              <AnimatedEllipsis />
                            </span>
                          </div>

                          {/* Desktop (>=sm) */}
                          <div className="hidden sm:flex items-center justify-center gap-1">
                            <div className="animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full shrink-0" />
                            <span>
                              {transaction.paymentDetails?.depositTxHash
                                ? locale === "id"
                                  ? "Konversi IDRX ke USDC"
                                  : "Converting IDRX to USDC"
                                : "Minting IDRX"}
                              <AnimatedEllipsis />
                            </span>
                          </div>
                        </div>
                      )}

                      {isCurrent && step === "PENDING" && (
                        <div className="mt-1 flex items-center justify-center text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">
                          {/* Mobile (<sm) */}
                          <div className="flex flex-col items-center justify-center leading-tight text-center sm:hidden">
                            <div className="flex items-center gap-1">
                              <div className="animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full shrink-0" />
                              <span>
                                {locale === "id"
                                  ? "Mengirim"
                                  : "Sending"}
                              </span>
                            </div>
                            <span>
                              {locale === "id"
                                ? "ke wallet"
                                : "to wallet"}
                              <AnimatedEllipsis />
                            </span>
                          </div>

                          {/* Desktop (>=sm) */}
                          <div className="hidden sm:flex items-center justify-center gap-1">
                            <div className="animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full shrink-0" />
                            <span>
                              {locale === "id"
                                ? "Mengirim ke wallet"
                                : "Sending to wallet"}
                              <AnimatedEllipsis />
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {index < 2 && (
                      <div
                        className={`h-0.5 sm:h-1 flex-1 mx-0.5 sm:mx-1 self-start mt-3.5 rounded-full ${
                          index < currentStepIndex
                            ? "bg-neutral-900 dark:bg-white"
                            : "bg-gray-300 dark:bg-white/10"
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {status === "WAITING" && (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 sm:text-sm text-[10px] px-4 py-3 mb-4 rounded-md">
            {t.waitingPayment}
          </div>
        )}

        {status === "EXPIRED" && (
          <div className="bg-red-100 text-red-700 sm:text-sm text-[10px] rounded-md px-4 py-3 mb-4">
            {t.expired}
          </div>
        )}

        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 mb-4 sm:text-sm text-[10px] text-left">
          <p className="font-semibold mb-1">{t.destinationAddress}:</p>
          <p className="break-all">
            <span className="text-neutral-900 dark:text-white font-semibold">
              {transaction.walletAddress}
            </span>
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 mb-4 sm:text-sm text-[10px] text-left">
          <p className="font-semibold mb-1">{t.buyAmount}:</p>
          <p>
            <span className="text-neutral-900 dark:text-white font-semibold">
              {Number(transaction.idrAmount).toLocaleString(
                locale === "id" ? "id-ID" : "en-US",
              )}{" "}
              IDR
            </span>
          </p>
          <div className="h-2.5"></div>
          <p className="font-semibold mb-1">
            {status === "COMPLETED"
              ? locale === "id"
                ? "Token yang kamu terima: "
                : "Token you received: "
              : t.estimatedReceive}
          </p>
          <p>
            <span className="text-neutral-900 dark:text-white font-bold">
              {status === "COMPLETED" && transaction.tokenAmount
                ? `${transaction.tokenAmount} USDC`
                : tokenReceived
                  ? `${tokenReceived} USDC`
                  : "..."}
            </span>
          </p>
        </div>

        {status === "WAITING" && paymentDetails && (
          <>
            {isQrisPayment ? (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-4 space-y-4">
                <div className="flex flex-col items-center space-y-2">
                  <img
                    id="qris-image"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrString)}`}
                    alt="QR Code"
                    className="w-40 h-40 rounded-lg object-contain"
                  />
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrString)}`;
                      link.download = "paradapp-qris.png";
                      link.click();
                    }}
                    className="sm:text-xs text-[10px] text-neutral-900 dark:text-white font-semibold hover:underline"
                  >
                    {t.downloadQris}
                  </button>
                </div>
                <p className="sm:text-sm text-[10px] text-center text-neutral-500 dark:text-neutral-400">
                  {t.scanQris}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-4 space-y-2 text-left">
                <p className="sm:text-sm text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                  {t.vaNumber}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold sm:text-lg text-[14px] break-all text-neutral-900 dark:text-white">
                    {vaNumber}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(vaNumber);
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 2000);
                    }}
                    className="sm:text-xs text-[10px] text-neutral-900 dark:text-white font-semibold hover:underline whitespace-nowrap"
                  >
                    {copiedText ? t.copied : t.copy}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 mb-4 sm:text-sm text-[10px] space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {locale === "id" ? "Metode Transfer" : "Transfer method"}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {isQrisPayment ? "QRIS" : `${vaBankDisplayName} Virtual Account`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {locale === "id" ? "Jumlah transfer" : "Transfer amount"}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {Number(transaction.idrAmount).toLocaleString(
                    locale === "id" ? "id-ID" : "en-US",
                  )}{" "}
                  IDR
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-white/10 pt-2 flex justify-between font-semibold text-neutral-900 dark:text-white">
                <span>Total</span>
                <span>
                  {Number(transaction.idrAmount).toLocaleString(
                    locale === "id" ? "id-ID" : "en-US",
                  )}{" "}
                  IDR
                </span>
              </div>
            </div>

            {isTestnet && (
              <div className="mb-4">
                <button
                  onClick={handleMarkAsPaid}
                  className="w-full py-3 font-bold text-white dark:text-neutral-900 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 rounded-lg text-xs sm:text-sm px-8 transition-all hover:scale-[1.01] active:scale-95 shadow-md"
                >
                  {t.simulatePaid}
                </button>
              </div>
            )}
          </>
        )}

        {status === "COMPLETED" && (
          <div className="pt-2 w-full">
            <button
              onClick={() => {
                setCompletedSteps((prev) => ({ ...prev, 2: true }));
                setActiveStep(3);
              }}
              className="w-full py-3 font-bold text-white dark:text-neutral-900 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 rounded-lg text-xs sm:text-sm px-8 transition-all hover:scale-[1.01] active:scale-95 shadow-md"
            >
              {t.proceedStake}
            </button>
          </div>
        )}

        {status === "EXPIRED" && (
          <div className="pt-2 w-full">
            <button
              onClick={() => {
                setStep2Sub(1);
                setTransaction(null);
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete("txId");
                router.replace(newUrl.pathname + newUrl.search, {
                  scroll: false,
                });
              }}
              className="w-full py-3 font-bold text-white dark:text-neutral-900 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 rounded-lg text-xs sm:text-sm px-8 transition-all hover:scale-[1.01] active:scale-95 shadow-md"
            >
              {t.backToBuy}
            </button>
          </div>
        )}
      </motion.div>
    );
  };

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
                  completedSteps[1]
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md"
                    : activeStep === 1
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                }`}
              >
                {completedSteps[1] ? (
                  <FaCheck className="text-sm md:text-base" />
                ) : (
                  "1"
                )}
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
                    ? `Wallet Connected: ${formatAddress(activeAddress)}`
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
                        step1Sub === 1
                          ? "w-10 bg-neutral-900 dark:bg-white"
                          : "w-5 bg-neutral-300 dark:bg-neutral-700"
                      }`}
                    />
                    <span
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        step1Sub === 2
                          ? "w-10 bg-neutral-900 dark:bg-white"
                          : "w-5 bg-neutral-300 dark:bg-neutral-700"
                      }`}
                    />
                    <span className="text-xs font-bold text-neutral-400 ml-2 uppercase">
                      Substep {step1Sub} of 2
                    </span>
                  </div>

                  {step1Sub === 1 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex flex-col items-center text-center space-y-6 max-w-md mx-auto p-4">
                        <div className="relative w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-white/5 p-3 flex items-center justify-center border border-neutral-200 dark:border-white/10 shadow-sm">
                          <Image
                            src={phantom}
                            alt="Phantom Wallet"
                            width={48}
                            height={48}
                            className="object-contain"
                          />
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-bold text-lg text-neutral-900 dark:text-white">
                            {locale === "id"
                              ? "Instal Phantom Wallet"
                              : "Install Phantom Wallet"}
                          </h4>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                            {locale === "id"
                              ? "Phantom adalah dompet Web3 terbaik dan teraman untuk menyimpan USDC di Solana. Silakan instal dompet terlebih dahulu."
                              : "Phantom is the best and most secure Web3 wallet to store USDC on Solana. Please install the wallet first."}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                          <a
                            href="https://phantom.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                          >
                            {locale === "id"
                              ? "Unduh Phantom"
                              : "Download Phantom"}
                          </a>
                          <a
                            href="https://youtu.be/1s4f666Ccgo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-4 py-3 bg-white/10 text-neutral-800 dark:text-white border border-black/10 dark:border-white/10 font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-sm transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                          >
                            {locale === "id"
                              ? "Tonton Tutorial"
                              : "Watch Tutorial"}
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step1Sub === 2 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex flex-col items-center text-center space-y-6 max-w-md mx-auto p-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-white/5 p-3 flex items-center justify-center border border-neutral-200 dark:border-white/10 shadow-sm">
                            <Image
                              src={phantom}
                              alt="Phantom Wallet"
                              width={48}
                              height={48}
                              className="object-contain"
                            />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-2 border-white dark:border-neutral-900 flex items-center justify-center shadow-md">
                            <FaCheck className="text-[10px]" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-bold text-lg text-neutral-900 dark:text-white">
                            {locale === "id"
                              ? "Phantom Wallet Terdeteksi!"
                              : "Phantom Wallet Detected!"}
                          </h4>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                            {locale === "id"
                              ? "Phantom Wallet terdeteksi siap digunakan. Sekarang hubungkan dompet Anda untuk mulai bertransaksi."
                              : "Phantom wallet is detected and ready. Now connect your wallet to start transacting."}
                          </p>
                        </div>

                        {activeAddress ? (
                          <div className="w-full p-4 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl text-sm space-y-3 shadow-sm">
                            <p className="text-neutral-900 dark:text-white font-extrabold flex items-center justify-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white inline-block animate-ping" />
                              {locale === "id"
                                ? "Dompet Terhubung"
                                : "Wallet Connected"}
                            </p>
                            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400 select-all p-2 bg-neutral-900/5 dark:bg-neutral-950/30 rounded-lg">
                              {activeAddress}
                            </p>
                            <button
                              onClick={() => {
                                setCompletedSteps((prev) => ({
                                  ...prev,
                                  1: true,
                                }));
                                setActiveStep(2);
                                setStep2Sub(1);
                              }}
                              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold rounded-xl text-xs md:text-sm transition-all"
                            >
                              {locale === "id"
                                ? "Lanjutkan ke Beli USDC"
                                : "Proceed to Buy USDC"}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleRealConnect}
                            className="w-full px-4 py-3.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold rounded-xl text-xs md:text-sm transition-all hover:scale-[1.01] active:scale-95 shadow-md cursor-pointer"
                          >
                            {locale === "id"
                              ? "Hubungkan Dompet"
                              : "Connect Wallet"}
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
        {/* STEP 2 (buy USDC – with restoration loading state) */}
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
                  completedSteps[2]
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md"
                    : activeStep === 2
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                }`}
              >
                {completedSteps[2] ? (
                  <FaCheck className="text-sm md:text-base" />
                ) : !completedSteps[1] ? (
                  <FaLock className="text-sm" />
                ) : (
                  "2"
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex md:flex-row flex-col md:items-center md:gap-4">
                  <h3 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white leading-tight">
                    {t.step2}
                  </h3>
                  {completedSteps[2] && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-neutral-900/10 dark:bg-white/10 text-neutral-900 dark:text-white text-xs px-2.5 py-1 rounded-full font-bold w-fit">
                        {t.completedBadge}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {completedSteps[2]
                    ? `Bought ${
                        transaction?.tokenAmount
                          ? Number(transaction.tokenAmount).toFixed(2)
                          : calculatedUsdc.toFixed(2)
                      } USDC (${parseFloat(payAmountIdr).toLocaleString(
                        "id-ID",
                      )} IDR)`
                    : t.step2Desc}
                </p>
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
                <div className="p-6 md:p-8 space-y-6">
                  {isRestoringTx ? (
                    <div className="flex items-center justify-center py-20">
                      <FaSpinner className="animate-spin text-neutral-400 text-2xl" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4].map((idx) => (
                            <span
                              key={idx}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                step2Sub === idx
                                  ? "w-10 bg-neutral-900 dark:bg-white"
                                  : "w-5 bg-neutral-300 dark:bg-neutral-700"
                              }`}
                            />
                          ))}
                          <span className="text-xs font-bold text-neutral-400 ml-2 uppercase">
                            {locale === "id"
                              ? `Sublangkah ${step2Sub} dari 4`
                              : `Substep ${step2Sub} of 4`}
                          </span>
                        </div>
                      </div>

                      {step2Sub === 1 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-6"
                        >
                          <div className="relative flex flex-col gap-1 z-0">
                            <div className="glass-card rounded-2xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 transition-all duration-300 shadow-sm">
                              <div className="py-4 px-4 md:py-6 md:px-6 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                                    {locale === "id" ? "Kamu Bayar" : "You Pay"}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between gap-3 w-full">
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      pattern="[0-9]*"
                                      value={
                                        payAmountIdr
                                          ? Number(payAmountIdr).toLocaleString(
                                              "id-ID",
                                            )
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value.replace(
                                          /[^0-9]/g,
                                          "",
                                        );
                                        setPayAmountIdr(val);
                                      }}
                                      className="w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none border-none truncate transition-all text-neutral-900 dark:text-white"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="shrink-0 flex items-center gap-2 px-3 py-2 glass-card rounded-full shadow-md bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/10 opacity-90 cursor-default">
                                    <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
                                      <span className="font-bold text-[10px] text-neutral-900 dark:text-white">
                                        Rp
                                      </span>
                                    </div>
                                    <span className="font-bold text-sm sm:text-base pr-1 text-neutral-800 dark:text-white">
                                      IDR
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="h-0 flex items-center justify-center z-10 pointer-events-none">
                              <div className="w-10 h-10 rounded-xl glass-card shadow-2xl flex items-center justify-center text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 transform scale-75 md:scale-85 border border-neutral-200 dark:border-white/10">
                                <Icon
                                  icon="solar:arrow-down-linear"
                                  className="text-xl"
                                />
                              </div>
                            </div>

                            <div className="glass-card rounded-2xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 transition-all duration-300 shadow-sm">
                              <div className="py-4 px-4 md:py-6 md:px-6 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                                    {locale === "id"
                                      ? "Kamu Terima"
                                      : "You Receive"}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold opacity-40 text-neutral-800 dark:text-white">
                                    <FaWallet />
                                    <span>
                                      {locale === "id"
                                        ? "Saldo: "
                                        : "Balance: "}{" "}
                                      0.00 USDC
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-3 w-full">
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <input
                                      type="text"
                                      readOnly
                                      value={
                                        calculatedUsdc > 0
                                          ? calculatedUsdc.toLocaleString(
                                              "en-US",
                                              {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              },
                                            )
                                          : ""
                                      }
                                      className="w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none border-none truncate transition-all opacity-70 text-neutral-800 dark:text-white"
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div className="shrink-0 flex items-center gap-2 px-3 py-2 glass-card rounded-full shadow-md bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/10 opacity-90 cursor-default">
                                    <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full overflow-hidden shrink-0">
                                      <Image
                                        src={usdc}
                                        alt="USDC Logo"
                                        width={24}
                                        height={24}
                                        className="object-cover"
                                      />
                                    </div>
                                    <span className="font-bold text-sm sm:text-base pr-1 text-neutral-800 dark:text-white">
                                      USDC
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-end items-center mt-1">
                                  <span className="text-[10px] sm:text-xs font-black opacity-30 italic">
                                    {calculatedUsdc > 0 && parseFloat(payAmountIdr) > 0
                                      ? `1 USDC ≈ Rp ${Math.round(
                                          parseFloat(payAmountIdr.replace(/,/g, "")) /
                                            calculatedUsdc,
                                        ).toLocaleString("id-ID")}`
                                      : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {amountError && (
                            <p className="text-sm text-red-500 italic px-1">
                              {amountError}
                            </p>
                          )}

                          <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                            {parseFloat(payAmountIdr) >= 600000
                              ? locale === "id"
                                ? "💡 Rekomendasi: Gunakan Virtual Account untuk transaksi di atas Rp 600.000 agar fee transfer lebih hemat."
                                : "💡 Tip: For transactions above 600,000 IDR, Virtual Account is recommended for optimal network routing."
                              : locale === "id"
                                ? "💡 Rekomendasi: Gunakan QRIS untuk transaksi di bawah Rp 600.000 agar proses pembayaran lebih instan."
                                : "💡 Tip: For transactions below 600,000 IDR, QRIS is recommended for instant checkout."}
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider opacity-40 px-1 text-neutral-800 dark:text-white">
                              {t.paymentMethod}
                            </label>

                            <div className="h-2 border-0" />

                            <button
                              type="button"
                              onClick={() => setShowPaymentModal(true)}
                              className="w-full bg-white/40 dark:bg-white/5 glass-card cursor-pointer p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl transition-all shadow-sm group active:scale-[0.99]"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white dark:bg-neutral-800 rounded-xl p-1.5 flex items-center justify-center shadow-sm">
                                  {selectedMethod === "QRIS" ? (
                                    <Image
                                      src={qris}
                                      alt="QRIS"
                                      width={24}
                                      height={24}
                                      className="object-contain"
                                    />
                                  ) : currentVaChannel?.logo ? (
                                    <Image
                                      src={currentVaChannel.logo}
                                      alt={currentVaChannel.name}
                                      width={24}
                                      height={24}
                                      className="object-contain"
                                    />
                                  ) : (
                                    <Icon
                                      icon="solar:card-2-bold"
                                      className="text-lg text-neutral-500 dark:text-neutral-300"
                                    />
                                  )}
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className="font-extrabold text-sm text-neutral-800 dark:text-white font-grotesk">
                                    {selectedMethod === "QRIS"
                                      ? "QRIS"
                                      : currentVaChannel?.detailName ||
                                        `${selectedVaBank} Virtual Account`}
                                  </span>
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                    {selectedMethod === "QRIS"
                                      ? locale === "id"
                                        ? "Potongan biaya 0.7%"
                                        : "0.7% fee deducted"
                                      : `+Rp ${(currentVaChannel?.fee || 3000).toLocaleString("id-ID")} ${
                                          locale === "id" ? "biaya transfer" : "transfer fee"
                                        }`}
                                  </span>
                                </div>
                              </div>
                              <FaChevronDown className="text-neutral-400 text-xs transition-transform group-hover:translate-y-0.5" />
                            </button>
                          </div>

                          {txError && (
                            <p className="text-sm text-red-500 italic px-1">
                              {txError}
                            </p>
                          )}
                          <button
                            onClick={() => handleCreateTransaction()}
                            disabled={
                              !payAmountIdr ||
                              parseFloat(payAmountIdr) <= 0 ||
                              isCreatingTx ||
                              !!amountError
                            }
                            className={`w-full py-4 rounded-2xl text-white dark:text-neutral-900 font-extrabold text-sm md:text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              !payAmountIdr ||
                              parseFloat(payAmountIdr) <= 0 ||
                              isCreatingTx ||
                              !!amountError
                                ? "bg-white text-neutral-400 cursor-not-allowed shadow-none"
                                : "bg-white hover:scale-[1.01] active:scale-95 shadow-md"
                            }`}
                          >
                            {isCreatingTx ? (
                              <>
                                <FaSpinner className="animate-spin text-xs" />
                                {locale === "id"
                                  ? "Membuat Transaksi..."
                                  : "Creating Transaction..."}
                              </>
                            ) : (
                              <>{t.createTransaction}</>
                            )}
                          </button>
                        </motion.div>
                      )}

                      {step2Sub >= 2 &&
                        transaction &&
                        renderTransactionDetails()}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ============================================================ */}
        {/* STEP 3 – USDC‑only staking (real SolanaStake component) */}
        {/* ============================================================ */}
        <div
          className={`glass-card rounded-3xl overflow-hidden border transition-all duration-500 shadow-xl ${
            activeStep === 3
              ? "bg-linear-to-br from-neutral-500/5 to-neutral-500/5 dark:from-neutral-950/10 dark:to-neutral-950/10 border-neutral-500/20 dark:border-white/10 ring-1 ring-neutral-500/5"
              : completedSteps[3]
                ? "bg-white/5! border-neutral-500/20 dark:bg-neutral-900/50"
                : "bg-white/5! border-black/5 dark:border-white/5 opacity-60"
          }`}
        >
          <button
            onClick={() => completedSteps[2] && setActiveStep(3)}
            disabled={!completedSteps[2]}
            className={`w-full p-6 md:p-8 flex items-start md:items-center justify-between text-left transition-colors gap-4 ${
              completedSteps[2] ? "cursor-pointer" : "cursor-not-allowed"
            }`}
          >
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div
                className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold text-lg md:text-xl transition-all shrink-0 ${
                  completedSteps[3]
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md"
                    : activeStep === 3
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                }`}
              >
                {completedSteps[3] ? (
                  <FaCheck className="text-sm md:text-base" />
                ) : !completedSteps[2] ? (
                  <FaLock className="text-sm" />
                ) : (
                  "3"
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex md:flex-row flex-col md:items-center md:gap-4">
                  <h3 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white leading-tight">
                    {t.step3}
                  </h3>
                  {completedSteps[3] && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-neutral-900/10 dark:bg-white/10 text-neutral-900 dark:text-white text-xs px-2.5 py-1 rounded-full font-bold w-fit">
                        Active
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {completedSteps[3]
                    ? `Staking is now active. Manage your position below.`
                    : t.step3Desc}
                </p>
              </div>
            </div>
            {completedSteps[2] && (
              <FaChevronDown
                className={`text-neutral-400 text-sm md:text-base transition-transform duration-300 shrink-0 ${
                  activeStep === 3 ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          <AnimatePresence initial={false}>
            {activeStep === 3 && completedSteps[2] && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="overflow-hidden border-t border-black/5 dark:border-white/5"
              >
                <div className="p-6 md:p-8 space-y-6">
                  <SolanaStake hideHeader showOnlyUSDC />
                  <div className="pt-4">
                    <button
                      onClick={handleRestartOnboarding}
                      className="w-full py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-extrabold rounded-2xl text-xs sm:text-sm hover:scale-[1.01] active:scale-95 transition-all shadow-md cursor-pointer"
                    >
                      {t.finishRestart}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Payment Method Modal */}
      <AnimatedModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        maxWidthClass="lg:w-150"
      >
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 font-grotesk">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              {locale === "id" ? "Pilih Pembayaran" : "Select Payment"}
            </h2>
            <p className="text-[12px] opacity-70 text-neutral-500 dark:text-neutral-400">
              {locale === "id"
                ? "Pilih metode pembayaran di bawah ini"
                : "Select payment method below"}
            </p>
          </div>

          <div className="flex flex-col gap-6 pb-2">
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 px-1 text-neutral-400">
                Virtual Account
              </p>
              <div className="flex flex-col gap-2">
                {vaChannels.map((va) => (
                  <button
                    key={va.code}
                    type="button"
                    onClick={() => {
                      setSelectedMethod("VA");
                      setSelectedVaBank(va.code);
                      setShowPaymentModal(false);
                    }}
                    className="w-full text-left cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/10 glass-card p-3 border border-black/5 dark:border-white/10 rounded-xl flex items-center justify-start gap-3 bg-white/40 dark:bg-white/5"
                  >
                    {va.logo ? (
                      <Image
                        src={va.logo}
                        alt={va.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <Icon
                          icon="solar:card-2-bold"
                          className="text-xl text-neutral-500 dark:text-neutral-300"
                        />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-bold lg:text-sm text-neutral-800 dark:text-white">
                        {va.detailName}
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        +Rp {va.fee.toLocaleString("id-ID")}{" "}
                        {locale === "id" ? "biaya transfer" : "transfer fee"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 px-1 text-neutral-400">
                QRIS
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod("QRIS");
                    setShowPaymentModal(false);
                  }}
                  className="w-full text-left cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/10 glass-card p-3 border border-black/5 dark:border-white/10 rounded-xl flex items-center justify-start gap-3 bg-white/40 dark:bg-white/5"
                >
                  <Image
                    src={qris}
                    alt="QRIS"
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold lg:text-sm text-neutral-800 dark:text-white">
                      QRIS (OVO, DANA, GoPay, LinkAja, ShopeePay, dsb.)
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      {locale === "id" ? "Potongan biaya 0.7%" : "0.7% fee deducted"}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </AnimatedModal>

      {/* Cancel Confirmation Modal */}
      <AnimatedModal
        isOpen={showCancelModal}
        onClose={() => !isCancelling && setShowCancelModal(false)}
        maxWidthClass="lg:w-100"
      >
        <div className="p-6 flex flex-col gap-4 text-black dark:text-white font-grotesk">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              {locale === "id" ? "Batalkan Transaksi" : "Cancel Transaction"}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
              {locale === "id"
                ? "Apakah Anda yakin ingin membatalkan transaksi ini?"
                : "Are you sure you want to cancel this transaction?"}
            </p>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4 border-t border-black/5 dark:border-white/10">
            <button
              onClick={() => setShowCancelModal(false)}
              disabled={isCancelling}
              className="px-5 py-2.5 rounded-xl border border-black/10 dark:border-white/15 text-xs sm:text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer min-w-[70px]"
            >
              {locale === "id" ? "Tidak" : "No"}
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer min-w-[110px]"
            >
              {isCancelling ? (
                <>
                  <div className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full shrink-0" />
                  <span className="whitespace-nowrap">{locale === "id" ? "Memproses..." : "Processing..."}</span>
                </>
              ) : (
                <span>{locale === "id" ? "Ya, Batalkan" : "Yes, Cancel"}</span>
              )}
            </button>
          </div>
        </div>
      </AnimatedModal>

      {/* Transaction Limit Modal */}
      <AnimatedModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        maxWidthClass="lg:w-105"
      >
        <div className="p-6 flex flex-col gap-4 text-black dark:text-white">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
              <Icon icon="solar:danger-circle-bold" className="text-2xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {locale === "id"
                  ? "Batas Transaksi Beli Tercapai"
                  : "Buy Limit Reached"}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                {locale === "id"
                  ? "Anda telah mencapai batas maksimal 3 transaksi beli yang sedang berjalan. Silakan selesaikan pembayaran atau batalkan transaksi yang ada untuk membuat transaksi baru."
                  : "You have reached the maximum limit of 3 active buy orders. Please complete your existing payment or cancel an ongoing transaction to start a new one."}
              </p>
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 pt-3 border-t border-black/5 dark:border-white/10">
            <button
              onClick={() => setShowLimitModal(false)}
              className="px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/15 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
            >
              {locale === "id" ? "Tutup" : "Close"}
            </button>
          </div>
        </div>
      </AnimatedModal>
    </section>
  );
}
