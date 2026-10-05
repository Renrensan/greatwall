"use client";

import Image from "next/image";
import VideoBg from "@/marketing-components/VideoBg";
import { useEffect, useState, Suspense, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { getPendingTransaction } from "@/lib/onboarding-storage";
import { AllDappProviders } from "@/components/providers/dapp-providers";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import { SolanaConnectButton } from "@/subcomponents/SolanaConnectButton";
import { EthereumConnectButton } from "@/subcomponents/EthereumConnectButton";
import { BitcoinConnectButton } from "@/subcomponents/BitcoinConnectButton";
import Button from "@/subcomponents/Button";
import toast from "react-hot-toast";
import bs58 from "bs58";
import { Icon } from "@iconify/react";
import { logos } from "@/index";
import { compressImageFile } from "@/lib/imageCompression";
import KtpCropModal, { type CropState } from "@/subcomponents/KtpCropModal";
import KtpCameraModal from "@/subcomponents/KtpCameraModal";
import LiveFaceScanner from "@/subcomponents/LiveFaceScanner";

type VerifyStep =
  | "init"
  | "wallet_connect"
  | "signing"
  | "kyc_upload"
  | "kyc_scanning"
  | "kyc_face_scan"
  | "kyc_review"
  | "submitting"
  | "success"
  | "error";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function safeBs58Encode(source: Uint8Array | number[]): string {
  if (!source || source.length === 0) return "";
  try {
    if (typeof (bs58 as any)?.encode === "function") {
      return (bs58 as any).encode(source);
    }
    if (typeof (bs58 as any)?.default?.encode === "function") {
      return (bs58 as any).default.encode(source);
    }
  } catch {}

  // Fail-safe Base58 encoding implementation
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = new Uint8Array(source);
  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += bytes[i];
    let carry = 0;
    for (let j = 0; j < digits.length; ++j) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let i = 0;
  while (i < bytes.length && bytes[i] === 0) i++;
  let str = "";
  for (let k = 0; k < i; k++) str += "1";
  for (let j = digits.length - 1; j >= 0; j--) str += ALPHABET[digits[j]];
  return str;
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useParams<{ locale: string }>();
  const token = searchParams.get("token");
  const urlOnboardingToken = searchParams.get("onboardingToken");
  const currentLocale = locale && ["en", "id"].includes(locale) ? locale : "id";
  const isId = currentLocale === "id";

  // Per-network wallet hooks from existing providers
  const solanaWallet = useSolanaWallet();
  const ethWallet = useEthereumWallet();
  const btcWallet = useBitcoinWallet();

  const [step, setStep] = useState<VerifyStep>("init");
  const [errorMessage, setErrorMessage] = useState("");
  const [onboardingToken, setOnboardingToken] = useState("");
  const [serverSignMessage, setServerSignMessage] = useState("");
  const [signedSignature, setSignedSignature] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const verifiedEmailTokenRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // KYC Form fields
  const [fullname, setFullname] = useState("");
  const [addressField, setAddressField] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idFileName, setIdFileName] = useState("");
  const [idFilePreviewUrl, setIdFilePreviewUrl] = useState<string | null>(null);
  const [rawOriginalUrl, setRawOriginalUrl] = useState<string | null>(null);
  const [ktpCropState, setKtpCropState] = useState<CropState | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isIdValidated, setIsIdValidated] = useState(false);

  // Live Selfie Verification fields
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [faceMatchSimilarity, setFaceMatchSimilarity] = useState<number | null>(null);

  const [requiredNetwork, setRequiredNetwork] = useState<string | null>(null);
  const [requiredWalletAddress, setRequiredWalletAddress] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);
  const [serverCooldownSeconds, setServerCooldownSeconds] = useState<number>(0);
  const [serverAttemptsCount, setServerAttemptsCount] = useState<number>(0);

  // Determine active target network parameter for onboarding/linking
  const networkParam = searchParams.get("network");

  const activeNetwork = useMemo(() => {
    if (requiredNetwork) return requiredNetwork.toUpperCase();
    if (networkParam) return networkParam.toUpperCase();
    const pendingTx = getPendingTransaction();
    if (pendingTx?.network) return pendingTx.network.toUpperCase();
    return "SOLANA";
  }, [networkParam, requiredNetwork]);

  const getConnectedAddressForNetwork = useCallback(
    (net: string): string | null => {
      const upperNet = net.toUpperCase();
      if (upperNet === "SOLANA") {
        return solanaWallet.connected && solanaWallet.address
          ? solanaWallet.address
          : null;
      }
      if (upperNet === "ETHEREUM" || upperNet === "EVM") {
        return ethWallet.connected && ethWallet.address
          ? ethWallet.address
          : null;
      }
      if (upperNet === "BITCOIN") {
        return btcWallet.connected && btcWallet.address
          ? btcWallet.address
          : null;
      }
      return null;
    },
    [
      solanaWallet.connected,
      solanaWallet.address,
      ethWallet.connected,
      ethWallet.address,
      btcWallet.connected,
      btcWallet.address,
    ]
  );

  const connectedAddress = getConnectedAddressForNetwork(activeNetwork);
  const isTargetWalletConnected = Boolean(connectedAddress);

  const isAddressMatched = useMemo(() => {
    if (!requiredWalletAddress) return true;
    if (!connectedAddress) return false;
    return (
      requiredWalletAddress.trim().toLowerCase() ===
      connectedAddress.trim().toLowerCase()
    );
  }, [requiredWalletAddress, connectedAddress]);

  const isAuthorized = useMemo(() => {
    return isTargetWalletConnected && isAddressMatched;
  }, [isTargetWalletConnected, isAddressMatched]);

  const currentNetworkSlug = activeNetwork.toLowerCase();
  const colorFlip = "text-black";
  const bgFlip = "bg-black/10";
  const borderFlip = "border-black";

  // While a magic-link token is present but the server hasn't told us its network yet,
  // activeNetwork falls back to "SOLANA" (see the memo above) purely for lack of a better
  // default — rendering that as a real connect button paints a purple Solana button that
  // then flips to the correct chain once verify-link resolves (or never flips, if that
  // fetch is slow). Show a neutral skeleton instead of a guess for that window.
  const isNetworkPending = Boolean(token) && !requiredNetwork && !networkParam;

  // Render ONLY the connect button corresponding to activeNetwork
  const renderTargetWalletConnectButton = useCallback(() => {
    if (isNetworkPending) {
      return (
        <div className="h-[22px] md:h-[26px] w-[90px] md:w-[104px] rounded-full bg-black/10 animate-pulse" />
      );
    }

    const net = activeNetwork;
    if (net === "SOLANA") return <SolanaConnectButton />;
    if (net === "ETHEREUM" || net === "EVM") return <EthereumConnectButton />;
    if (net === "BITCOIN") return <BitcoinConnectButton />;

    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <SolanaConnectButton />
        <EthereumConnectButton />
        <BitcoinConnectButton />
      </div>
    );
  }, [isNetworkPending, activeNetwork]);

  const handleRedirect = useCallback(() => {
    const pendingTx = getPendingTransaction();
    const network = pendingTx?.network?.toLowerCase() || activeNetwork.toLowerCase() || "solana";
    const appTab = pendingTx?.type === "WITHDRAWAL" ? "assets" : "buy";

    toast.success(
      isId
        ? "Identitas terverifikasi! Mengarahkan..."
        : "Identity verified! Redirecting..."
    );

    setTimeout(() => {
      router.push(`/${currentLocale}/${network}/vault/${appTab}?verify_success=true`);
    }, 1500);
  }, [activeNetwork, currentLocale, isId, router]);

  // Execute cryptographic signature using the connected network wallet provider
  const executeWalletSignature = useCallback(
    async (messageString: string): Promise<string> => {
      const net = activeNetwork;

      // 1. Solana Target Network
      if (net === "SOLANA") {
        const solProvider =
          typeof window !== "undefined"
            ? (window as any).phantom?.solana ||
              (window as any).solana ||
              (window as any).solflare ||
              (window as any).backpack
            : null;

        if (solanaWallet?.connected || solProvider) {
          let sigResult: string | null = null;
          let lastError: any = null;

          // Try solanaWallet provider hook first if connected
          if (solanaWallet?.connected && solanaWallet?.signMessage) {
            try {
              const res = await solanaWallet.signMessage(messageString);
              if (res && res.length > 0) {
                if (/^[0-9a-fA-F]+$/.test(res)) {
                  const bytes = hexToBytes(res);
                  if (bytes.length > 0) {
                    sigResult = safeBs58Encode(bytes);
                  }
                } else {
                  sigResult = res;
                }
              }
            } catch (err: any) {
              console.warn("[onboarding verify] solanaWallet.signMessage failed, checking direct injected provider", err);
              lastError = err;
            }
          }

          // Direct injected extension fallback (Phantom, Solflare, Backpack)
          if (!sigResult && solProvider && typeof solProvider.signMessage === "function") {
            try {
              if (typeof solProvider.connect === "function" && !solProvider.isConnected && !solProvider.publicKey) {
                await solProvider.connect();
              }
              const encoded = new TextEncoder().encode(messageString);
              const res = await solProvider.signMessage(encoded, "utf8");
              const sigBytes = res?.signature || res;
              if (sigBytes) {
                if (typeof sigBytes === "string") {
                  sigResult = sigBytes;
                } else if (sigBytes instanceof Uint8Array || Array.isArray(sigBytes)) {
                  sigResult = safeBs58Encode(sigBytes);
                }
              }
            } catch (err: any) {
              console.error("[onboarding verify] direct solProvider signMessage error:", err);
              lastError = err;
            }
          }

          if (sigResult) {
            return sigResult;
          }

          const rawErr = lastError?.message || lastError?.toString?.();
          throw new Error(
            rawErr ||
              (isId
                ? "Tanda tangan dompet Solana dibatalkan atau gagal."
                : "Solana wallet signature request failed or was cancelled.")
          );
        }

        throw new Error(
          isId
            ? "Dompet Solana tidak terhubung. Harap hubungkan dompet Solana Anda."
            : "Solana wallet not connected. Please connect your Solana wallet."
        );
      }

      // 2. Ethereum / EVM Target Network
      if (net === "ETHEREUM" || net === "EVM") {
        if (ethWallet?.connected && ethWallet?.signMessage) {
          const sig = await ethWallet.signMessage(messageString);
          if (!sig) {
            throw new Error(
              isId
                ? "Tanda tangan dompet EVM dibatalkan."
                : "EVM wallet signature request was cancelled."
            );
          }
          return sig;
        }
        throw new Error(
          isId
            ? `Dompet ${net} tidak terhubung. Harap hubungkan dompet ${net} Anda.`
            : `${net} wallet not connected. Please connect your ${net} wallet.`
        );
      }

      // 3. Bitcoin Target Network
      if (net === "BITCOIN") {
        if (btcWallet?.connected && btcWallet?.signMessage) {
          const sig = await btcWallet.signMessage(messageString);
          if (!sig) {
            throw new Error(
              isId
                ? "Tanda tangan dompet Bitcoin dibatalkan."
                : "Bitcoin wallet signature request was cancelled."
            );
          }
          return sig.trim();
        }
        throw new Error(
          isId
            ? "Dompet Bitcoin tidak terhubung. Harap hubungkan dompet Bitcoin Anda."
            : "Bitcoin wallet not connected. Please connect your Bitcoin wallet."
        );
      }

      // General fallback
      if (ethWallet?.connected && ethWallet?.signMessage) {
        const sig = await ethWallet.signMessage(messageString);
        if (sig) return sig;
      }
      if (btcWallet?.connected && btcWallet?.signMessage) {
        const sig = await btcWallet.signMessage(messageString);
        if (sig) return sig.trim();
      }

      throw new Error(
        isId
          ? "Dompet tidak terhubung. Harap hubungkan dompet Anda terlebih dahulu."
          : "No wallet connected. Please connect your wallet first."
      );
    },
    [activeNetwork, solanaWallet, ethWallet, btcWallet, isId]
  );

  // Handle signing wallet authorization first (Step 1 for intent "new")
  const handleSignAuthorizationFirst = useCallback(async () => {
    if (!isTargetWalletConnected) {
      toast.error(
        isId
          ? `Harap hubungkan dompet ${activeNetwork} Anda terlebih dahulu.`
          : `Please connect your ${activeNetwork} wallet first.`
      );
      setStep("wallet_connect");
      return;
    }

    const activeToken = onboardingToken || urlOnboardingToken;
    if (!activeToken) {
      toast.error(
        isId
          ? "Token sesi verifikasi tidak ditemukan."
          : "Verification session token missing."
      );
      setStep("error");
      return;
    }

    try {
      setStep("signing");
      const messageToSign =
        serverSignMessage || `Paradapp onboarding authorization.\nToken: ${activeToken}`;
      const sig = await executeWalletSignature(messageToSign);
      setSignedSignature(sig);
      toast.success(
        isId
          ? "Tanda tangan dompet berhasil diverifikasi!"
          : "Wallet signature verified successfully!"
      );
      setStep("kyc_upload");
    } catch (err: any) {
      console.error("Wallet signature error:", err);
      toast.error(
        err.message ||
          (isId
            ? "Gagal melakukan tanda tangan dompet."
            : "Failed to sign wallet message.")
      );
      setStep("wallet_connect");
    }
  }, [
    isTargetWalletConnected,
    activeNetwork,
    onboardingToken,
    urlOnboardingToken,
    serverSignMessage,
    executeWalletSignature,
    isId,
  ]);

  const handleWalletLinkingVerification = useCallback(
    async (emailToken: string) => {
      if (!isTargetWalletConnected) {
        toast.error(
          isId
            ? `Harap hubungkan dompet ${activeNetwork} Anda terlebih dahulu.`
            : `Please connect your ${activeNetwork} wallet first.`
        );
        setStep("wallet_connect");
        return;
      }

      try {
        setStep("signing");
        const signMessageString = `Paradapp wallet linking authorization.\nToken: ${emailToken}`;
        const signature = await executeWalletSignature(signMessageString);

        setStep("submitting");
        const res = await fetch("/api/auth/onboarding/verify-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: emailToken,
            signature,
            network: activeNetwork,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setStep("success");
          handleRedirect();
        } else {
          setStep("error");
          setErrorMessage(
            data.error ||
              (isId ? "Verifikasi dompet gagal." : "Wallet linking verification failed.")
          );
        }
      } catch (err: any) {
        console.error("Wallet linking signature error:", err);
        setStep("error");
        setErrorMessage(
          err.message ||
            (isId ? "Gagal melakukan tanda tangan dompet." : "Failed to sign wallet message.")
        );
      }
    },
    [isTargetWalletConnected, executeWalletSignature, isId, handleRedirect]
  );

  useEffect(() => {
    if (!isMounted) return;

    // 1. If URL contains magic link token (?token=...), verify it with server (only ONCE per email token)
    if (token && verifiedEmailTokenRef.current !== token) {
      const verifyLinkAndGetSession = async () => {
        try {
          verifiedEmailTokenRef.current = token;
          setStep("init");
          const res = await fetch("/api/auth/onboarding/verify-link", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token,
            }),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            if (data.network) {
              setRequiredNetwork(data.network);
            }
            const targetWallet = data.walletAddress || data.wallet_address;
            if (targetWallet) {
              setRequiredWalletAddress(targetWallet);
            }
            if (data.email) {
              setRegisteredEmail(data.email);
            }
            if (data.intent) {
              setIntent(data.intent);
            }
            if (data.cooldown_seconds || data.cooldownSeconds) {
              setServerCooldownSeconds(data.cooldown_seconds || data.cooldownSeconds);
            }
            if (data.failed_face_attempts || data.failedFaceAttempts) {
              setServerAttemptsCount(data.failed_face_attempts || data.failedFaceAttempts);
            }
            if (data.onboardingToken) {
              // Intent "new": Server returned onboardingToken & signMessage for KYC
              setOnboardingToken(data.onboardingToken);
              if (data.signMessage) {
                setServerSignMessage(data.signMessage);
              } else {
                setServerSignMessage(
                  `Paradapp onboarding authorization.\nToken: ${data.onboardingToken}`
                );
              }
              setStep("wallet_connect");
            } else {
              setStep("success");
              handleRedirect();
            }
          } else if (
            res.status === 403 &&
            (data.error === "Signature required for wallet linking" || data.intent === "link")
          ) {
            if (data.network) {
              setRequiredNetwork(data.network);
            }
            const targetWallet = data.walletAddress || data.wallet_address;
            if (targetWallet) {
              setRequiredWalletAddress(targetWallet);
            }
            if (data.email) {
              setRegisteredEmail(data.email);
            }
            if (data.intent) {
              setIntent(data.intent);
            } else {
              setIntent("link");
            }
            setStep("wallet_connect");
          } else {
            setStep("error");
            setErrorMessage(
              data.error ||
                (isId
                  ? "Verifikasi gagal. Token mungkin sudah kadaluarsa atau tidak valid."
                  : "Verification failed. The token may be expired or invalid.")
            );
          }
        } catch (err) {
          console.error("Error during verification:", err);
          setStep("error");
          setErrorMessage(
            isId
              ? "Terjadi kesalahan koneksi. Silakan coba lagi."
              : "A connection error occurred. Please try again."
          );
        }
      };

      verifyLinkAndGetSession();
      return;
    }

    // 2. If this token was already verified during this component session, skip redundant API call
    if (token && verifiedEmailTokenRef.current === token) {
      return;
    }

    // 3. If no ?token= in URL, check urlOnboardingToken
    const existingOnboardingToken = urlOnboardingToken;
    if (existingOnboardingToken) {
      setOnboardingToken(existingOnboardingToken);
      setServerSignMessage(
        `Paradapp onboarding authorization.\nToken: ${existingOnboardingToken}`
      );
      if (signedSignature) {
        setStep("kyc_upload");
      } else {
        setStep("wallet_connect");
      }
      return;
    }

    // 4. Neither email token nor onboardingToken is present
    setStep("error");
    setErrorMessage(
      isId
        ? "Token verifikasi tidak ditemukan. Periksa link atau minta link baru."
        : "Verification token is missing. Please check your link or request a new one."
    );
  }, [
    isMounted,
    token,
    urlOnboardingToken,
    isId,
    handleRedirect,
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFileName(file.name);
      setIdFile(file);
      if (rawOriginalUrl) URL.revokeObjectURL(rawOriginalUrl);
      if (idFilePreviewUrl) URL.revokeObjectURL(idFilePreviewUrl);

      const objectUrl = URL.createObjectURL(file);
      setRawOriginalUrl(objectUrl);
      setIdFilePreviewUrl(objectUrl);
      setKtpCropState(null); // Brand new image starts fresh
      setIsIdValidated(false); // Reset validation state for new file
      setKycError(null);

      // Immediately launch KTP alignment and crop modal (0ms latency)
      setIsCropModalOpen(true);
    }
  };

  const handleCameraCapture = (file: File) => {
    setIsCameraModalOpen(false);
    setIdFileName(file.name);
    setIdFile(file);
    if (rawOriginalUrl) URL.revokeObjectURL(rawOriginalUrl);
    if (idFilePreviewUrl) URL.revokeObjectURL(idFilePreviewUrl);

    const objectUrl = URL.createObjectURL(file);
    setRawOriginalUrl(objectUrl);
    setIdFilePreviewUrl(objectUrl);
    setKtpCropState(null);
    setIsIdValidated(false);
    setKycError(null);
  };

  const handleOpenCamera = () => {
    const isMobile =
      typeof window !== "undefined" &&
      (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (typeof window.matchMedia === "function" &&
          window.matchMedia("(pointer: coarse)").matches));

    if (isMobile && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else {
      setIsCameraModalOpen(true);
    }
  };

  const handleCropComplete = (croppedFile: File, previewUrl: string, state: CropState) => {
    setIdFile(croppedFile);
    if (idFilePreviewUrl && idFilePreviewUrl !== rawOriginalUrl) {
      URL.revokeObjectURL(idFilePreviewUrl);
    }
    setIdFilePreviewUrl(previewUrl);
    setKtpCropState(state); // Persist user's custom zoom, rotation & pan for re-editing
    setIsIdValidated(false); // Reset validated state so user validates the cropped image
    setKycError(null);
    setIsCropModalOpen(false);

    toast.success(
      isId
        ? "Foto kartu identitas siap! Silakan klik Validasi."
        : "ID card ready! Please click Validate."
    );
  };

  const handleFaceCaptureComplete = (capturedFile: File, previewUrl: string, similarity?: number) => {
    setSelfieFile(capturedFile);
    if (selfiePreviewUrl) {
      URL.revokeObjectURL(selfiePreviewUrl);
    }
    setSelfiePreviewUrl(previewUrl);
    if (typeof similarity === "number") {
      setFaceMatchSimilarity(similarity);
    }
    setIsFaceModalOpen(false);
    setKycError(null);
    setStep("kyc_review");
    toast.success(
      isId
        ? "Wajah terverifikasi! Silakan periksa data Anda."
        : "Face verified! Please review your details."
    );
  };

  const handleScanKtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const activeToken = onboardingToken || urlOnboardingToken;
    if (!activeToken) {
      toast.error(
        isId
          ? "Token sesi verifikasi tidak ditemukan. Silakan minta link baru."
          : "Verification session token missing. Please request a new link."
      );
      setStep("error");
      return;
    }

    if (!idFile) {
      toast.error(isId ? "Harap pilih atau unggah foto kartu identitas Anda." : "Please select or upload your ID card photo.");
      return;
    }

    let sigToUse = signedSignature;

    if (!sigToUse) {
      if (!isTargetWalletConnected) {
        toast.error(
          isId
            ? `Harap hubungkan dompet ${activeNetwork} Anda terlebih dahulu.`
            : `Please connect your ${activeNetwork} wallet first.`
        );
        setStep("wallet_connect");
        return;
      }

      try {
        setStep("signing");
        const messageToSign =
          serverSignMessage || `Paradapp onboarding authorization.\nToken: ${activeToken}`;
        sigToUse = await executeWalletSignature(messageToSign);
        setSignedSignature(sigToUse);
      } catch (err: any) {
        console.error("KYC signature error:", err);
        toast.error(
          err.message ||
            (isId ? "Gagal melakukan tanda tangan dompet." : "Failed to sign wallet message.")
        );
        setStep("wallet_connect");
        return;
      }
    }

    try {
      setStep("kyc_scanning");

      // Ensure file is compressed before sending to avoid payload limits & slow uploads
      let fileToUpload = idFile;
      if (fileToUpload.size > 600 * 1024 || !fileToUpload.type.includes("jpeg")) {
        try {
          fileToUpload = await compressImageFile(fileToUpload, {
            maxDimension: 1600,
            quality: 0.82,
            outputFileName: "ktp.jpg",
          });
        } catch (_) {}
      }

      const formData = new FormData();
      formData.append("onboardingToken", activeToken);
      formData.append("signature", sigToUse);
      formData.append("network", activeNetwork);
      formData.append("idFile", fileToUpload);

      const res = await fetch("/api/auth/onboarding/extract-ktp", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({
        success: false,
        message:
          res.status === 413
            ? (isId ? "Ukuran foto kartu identitas terlalu besar. Silakan pilih foto dengan ukuran lebih kecil." : "ID card photo size is too large. Please select a smaller photo.")
            : res.status === 504 || res.status === 502
            ? (isId ? "Waktu verifikasi habis, silakan coba lagi dengan foto yang jelas." : "Verification timed out. Please try again with a clear photo.")
            : (isId
                ? "Gagal menghubungi server verifikasi (Waktu habis / Server tidak merespon)."
                : "Failed to reach verification server (Timeout / Server non-responsive)."),
      }));

      if (res.ok && data.success && data.data) {
        setFullname(data.data.fullname || "");
        setIdNumber(data.data.idNumber || "");
        setAddressField(data.data.address || "");
        setIsIdValidated(true);
        setKycError(null);

        // Stay on Step 2 to allow user to review and edit name/address before continuing to face scan
        setStep("kyc_upload");
        toast.success(
          isId
            ? "Kartu identitas valid! Silakan periksa data Anda."
            : "ID card valid! Please review your details."
        );
      } else {
        const errorMsg =
          data.message ||
          data.error ||
          (isId
            ? "Waktu verifikasi habis atau ditolak, silakan coba lagi dengan foto yang jelas."
            : "Verification timed out or rejected. Please try again with a clear photo.");

        if (res.status === 403 || res.status === 401 || data.error_code === "ERR_SESSION_EXPIRED") {
          setOnboardingToken("");
          setStep("error");
          setErrorMessage(errorMsg);
        } else {
          setKycError(errorMsg);
          setStep("kyc_upload");
          toast.error(errorMsg);
        }
      }
    } catch (err: any) {
      console.error("KYC extraction error:", err);
      const catchMsg =
        err.message ||
        (isId
          ? "Waktu verifikasi habis, silakan coba lagi dengan foto yang jelas."
          : "Verification timed out. Please try again with a clear photo.");
      setKycError(catchMsg);
      setStep("kyc_upload");
      toast.error(catchMsg);
    }
  };

  const handleBackToUpload = () => {
    setKycError(null);
    setStep("kyc_upload");
  };

  const handleRestartFromStep1 = () => {
    if (idFilePreviewUrl && idFilePreviewUrl !== rawOriginalUrl) {
      URL.revokeObjectURL(idFilePreviewUrl);
    }
    if (rawOriginalUrl) {
      URL.revokeObjectURL(rawOriginalUrl);
    }
    if (selfiePreviewUrl) {
      URL.revokeObjectURL(selfiePreviewUrl);
    }

    setIdFile(null);
    setIdFileName("");
    setIdFilePreviewUrl(null);
    setRawOriginalUrl(null);
    setKtpCropState(null);
    setIsIdValidated(false);
    setSelfieFile(null);
    setSelfiePreviewUrl(null);
    setFaceMatchSimilarity(null);
    setFullname("");
    setIdNumber("");
    setAddressField("");
    setKycError(null);

    setStep("wallet_connect");
    toast(
      isId
        ? "Memulai ulang proses verifikasi dari Langkah 1."
        : "Restarting verification process from Step 1.",
      { icon: "🔄" }
    );
  };

  const handleFinalKycSubmit = async (e?: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();

    const activeToken = onboardingToken || urlOnboardingToken;
    if (!activeToken) {
      toast.error(
        isId
          ? "Token sesi verifikasi tidak ditemukan. Silakan minta link baru."
          : "Verification session token missing. Please request a new link."
      );
      setStep("error");
      return;
    }

    if (!idFile) {
      toast.error(isId ? "Harap unggah foto kartu identitas Anda." : "Please upload your ID card photo.");
      setStep("kyc_upload");
      return;
    }

    if (!fullname.trim()) {
      toast.error(isId ? "Nama lengkap tidak boleh kosong." : "Full legal name is required.");
      return;
    }

    const cleanIdNumber = idNumber.replace(/\D/g, "").trim();
    if (cleanIdNumber.length !== 16) {
      toast.error(
        isId
          ? "NIK harus tepat 16 digit angka."
          : "NIK must be exactly 16 numeric digits."
      );
      return;
    }

    if (!addressField.trim()) {
      toast.error(isId ? "Alamat tidak boleh kosong." : "Address is required.");
      return;
    }

    const sigToUse = signedSignature;
    if (!sigToUse) {
      setStep("wallet_connect");
      return;
    }

    try {
      setStep("submitting");
      const formData = new FormData();
      formData.append("onboardingToken", activeToken);
      formData.append("signature", sigToUse);
      formData.append("network", activeNetwork);
      formData.append("fullname", fullname.trim());
      formData.append("address", addressField.trim());
      formData.append("idNumber", cleanIdNumber);
      formData.append("idFile", idFile);
      if (selfieFile) {
        formData.append("selfieFile", selfieFile);
      }

      const res = await fetch("/api/auth/onboarding/submit-kyc", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({
        success: false,
        message: isId
          ? "Gagal menghubungi server pendaftaran IDRX."
          : "Failed to reach IDRX onboarding server.",
      }));

      if (res.ok && data.success) {
        setKycError(null);
        setStep("success");
        handleRedirect();
      } else {
        const errorMsg =
          data.message ||
          data.error ||
          (isId
            ? "Pendaftaran IDRX gagal. Silakan periksa kembali data Anda."
            : "IDRX registration failed. Please review your details and try again.");

        if (res.status === 403 || res.status === 401 || data.error_code === "ERR_SESSION_EXPIRED") {
          setOnboardingToken("");
          setStep("error");
          setErrorMessage(errorMsg);
        } else {
          setKycError(errorMsg);
          setStep("kyc_review");
          toast.error(errorMsg);
        }
      }
    } catch (err: any) {
      console.error("KYC final submission error:", err);
      const catchMsg =
        err.message ||
        (isId
          ? "Terjadi kesalahan saat pendaftaran. Silakan coba lagi."
          : "An error occurred during registration. Please try again.");
      setKycError(catchMsg);
      setStep("kyc_review");
      toast.error(catchMsg);
    }
  };

  return (
    <div className="relative min-h-screen py-6 sm:py-10 px-3 sm:px-4 flex flex-col justify-center text-black">
      {/* No bg-color here on purpose: this div doesn't establish its own stacking context
          (relative with no z-index), so VideoBg's absolute/-z-20 wrapper escapes past it to
          paint within the parent (body) stacking context instead — an opaque bg-color here
          would then paint as normal content *above* the escaped video, not behind it, same
          root cause as the earlier CryptosiastDAO Bali fix, one level higher up this time. */}
      <VideoBg />
      {/* ── TOP HEADER BAR (Logo + Target Wallet Button) ── */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Image src={logos} alt="logo" className="w-6 h-6" />
          <span className="text-sm font-bold tracking-tight">Paradapp</span>
        </div>
        <div>{renderTargetWalletConnectButton()}</div>
      </div>

      {/* ── DANGER / MISMATCH WARNING BANNER (Matching ConvertTransactionPage) ── */}
      {!isAuthorized && step !== "init" && step !== "success" && step !== "error" && (
        <div className="max-w-2xl mx-auto w-full mb-6">
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-pulse text-left">
            <div className="flex items-start gap-3">
              <Icon icon="solar:danger-triangle-bold" className="text-red-500 text-xl shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest">
                  {isId ? "PERHATIAN" : "ATTENTION"}
                </p>
                <p className="text-[11px] font-bold leading-relaxed text-red-700">
                  {!isTargetWalletConnected
                    ? isId
                      ? `Mohon hubungkan dompet ${activeNetwork} di pengaturan dompet untuk melanjutkan verifikasi.`
                      : `Please connect a ${activeNetwork} wallet in the wallet settings to proceed with verification.`
                    : isId
                    ? `Alamat dompet terhubung (${connectedAddress?.slice(0, 6)}...${connectedAddress?.slice(-4)}) tidak sesuai dengan alamat terdaftar (${requiredWalletAddress?.slice(0, 6)}...${requiredWalletAddress?.slice(-4)}).`
                    : `Connected wallet address (${connectedAddress?.slice(0, 6)}...${connectedAddress?.slice(-4)}) does not match the registered address (${requiredWalletAddress?.slice(0, 6)}...${requiredWalletAddress?.slice(-4)}).`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN GLASS CARD CONTAINER ── */}
      <div className="bgBox glass-card p-5 sm:p-7 shadow-lg max-w-2xl mx-auto w-full rounded-2xl sm:rounded-3xl border border-white/10 relative z-10 text-black">
        {/* ── INIT spinner ── */}
        {step === "init" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <span className="loading loading-spinner loading-lg text-black"></span>
            <p className="text-xs sm:text-sm font-semibold tracking-wide text-neutral-500 animate-pulse">
              {isId ? "Memverifikasi sesi magic link..." : "Verifying magic link session..."}
            </p>
          </div>
        )}

        {/* ── GUARD VIEW (WHEN NOT AUTHORIZED / DISCONNECTED) ── */}
        {!isAuthorized && step !== "init" && step !== "success" && step !== "error" && (
          <div className="flex flex-col items-center text-center py-1">
            <div className={`p-4 glass-card shadow-buttonNav! flex justify-center items-center mx-auto w-20 h-20 rounded-full mb-3 ${bgFlip}`}>
              <Icon icon="iconoir:wallet-solid" className={`text-4xl ${colorFlip}`} />
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-center">
              {!isTargetWalletConnected
                ? isId
                  ? "Dompet Belum Dihubungkan"
                  : "Wallet Disconnected"
                : isId
                ? "Dompet Tidak Sesuai"
                : "Wallet Mismatch"}
            </h2>
            <p className="text-xs text-neutral-500 mb-4 leading-relaxed px-2 text-center mt-1">
              {isId ? (
                <>
                  Untuk melihat dan melanjutkan sesi verifikasi ini, harap hubungkan dompet dan mode jaringan
                  <span className={`font-bold ${colorFlip}`}> {activeNetwork} </span>
                  yang benar ({requiredWalletAddress ? `${requiredWalletAddress.slice(0, 6)}...${requiredWalletAddress.slice(-4)}` : "terdaftar"}).
                </>
              ) : (
                <>
                  To view and proceed with this verification session, please connect the correct
                  <span className={`font-bold ${colorFlip}`}> {activeNetwork} </span>
                  wallet ({requiredWalletAddress ? `${requiredWalletAddress.slice(0, 6)}...${requiredWalletAddress.slice(-4)}` : "registered"}) and network mode.
                </>
              )}
            </p>

            <div className="w-full flex flex-col gap-2 p-3 rounded-xl bg-black/5 font-mono text-xs text-left">
              {registeredEmail && (
                <div className="flex justify-between items-center pb-1.5 border-b border-black/5">
                  <span className="text-neutral-500 font-sans text-xs">{isId ? "Email Terdaftar:" : "Registered Email:"}</span>
                  <span className="font-bold text-neutral-800">{registeredEmail}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-sans text-xs">{isId ? "Alamat Terdaftar:" : "Required Address:"}</span>
                <span className="font-bold text-neutral-800">{requiredWalletAddress ? `${requiredWalletAddress.slice(0, 10)}...${requiredWalletAddress.slice(-6)}` : "N/A"}</span>
              </div>
              <div className={`flex justify-between items-center ${colorFlip} font-bold pt-1.5 border-t border-black/5`}>
                <span className="font-sans text-xs">{isId ? "Alamat Terhubung:" : "Connected Address:"}</span>
                <span>{connectedAddress ? `${connectedAddress.slice(0, 10)}...${connectedAddress.slice(-6)}` : (isId ? "Belum Terhubung" : "Not Connected")}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── AUTHORIZED VIEW (STEP 1: WALLET SIGNATURE) ── */}
        {step === "wallet_connect" && isAuthorized && (
          <div className="flex flex-col items-center justify-center text-center py-3 gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                {intent === "link"
                  ? isId
                    ? `Hubungkan Dompet ${activeNetwork}`
                    : `Link Your ${activeNetwork} Wallet`
                  : isId
                  ? `Langkah 1: Buktikan Kepemilikan Alamat`
                  : `Step 1: Proof Address Ownership`}
              </h3>
              <p className="text-xs text-neutral-500 mt-1 px-2 leading-relaxed">
                {intent === "link"
                  ? isId
                    ? `Tanda tangan kriptografis dompet diperlukan untuk menghubungkan dompet ${activeNetwork} Anda dengan akun ini.`
                    : `A cryptographic wallet signature is required to link your ${activeNetwork} wallet to your registered email account.`
                  : isId
                  ? `Sebelum melanjutkan, silakan lakukan tanda tangan untuk membuktikan kepemilikan alamat dompet ${activeNetwork} Anda.`
                  : `Before proceeding, please sign to proof ownership of your ${activeNetwork} wallet address.`}
              </p>
            </div>

            {/* Onboarding Session Details Box */}
            <div className="w-full flex flex-col gap-2 p-3 rounded-xl bg-black/5 font-mono text-xs text-left my-0.5">
              {registeredEmail && (
                <div className="flex justify-between items-center pb-1.5 border-b border-black/5">
                  <span className="text-neutral-500 font-sans text-xs">{isId ? "Email Terdaftar:" : "Registered Email:"}</span>
                  <span className="font-bold text-neutral-800">{registeredEmail}</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-1.5 border-b border-black/5">
                <span className="text-neutral-500 font-sans text-xs">{isId ? "Alamat Dompet:" : "Wallet Address:"}</span>
                <span className="font-bold text-neutral-800 font-mono">
                  {connectedAddress ? `${connectedAddress.slice(0, 8)}...${connectedAddress.slice(-6)}` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-sans text-xs">{isId ? "Jaringan:" : "Network:"}</span>
                <span className={`font-bold ${colorFlip}`}>{activeNetwork}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full mt-1">
              <Button
                buttonText={
                  intent === "link"
                    ? isId
                      ? "Tanda Tangani & Hubungkan"
                      : "Sign & Link"
                    : isId
                    ? "Tanda Tangani & Lanjutkan"
                    : "Sign & Continue"
                }
                onClick={() => {
                  if (intent === "link") {
                    if (token) {
                      handleWalletLinkingVerification(token);
                    }
                  } else {
                    handleSignAuthorizationFirst();
                  }
                }}
                className="w-full py-3 font-bold text-xs sm:text-sm shadow-md"
              />
            </div>
          </div>
        )}

        {/* ── SIGNING POPUP SPINNER ── */}
        {step === "signing" && isAuthorized && (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <span className="loading loading-spinner loading-lg text-black"></span>
            <h3 className="text-lg font-bold">
              {isId ? "Menunggu Tanda Tangan Dompet..." : "Awaiting Wallet Signature..."}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-xs">
              {isId
                ? "Harap konfirmasi permintaan tanda tangan pada ekstensi dompet Anda."
                : "Please confirm the signature prompt in your wallet extension."}
            </p>
          </div>
        )}

        {/* ── STEP 2: KYC UPLOAD & VALIDATE ── */}
        {step === "kyc_upload" && isAuthorized && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight bg-linear-to-r from-neutral-900 to-neutral-500 bg-clip-text text-transparent">
                {!isIdValidated
                  ? (isId ? "Langkah 2: Unggah Foto Kartu Identitas" : "Step 2: Upload ID Card")
                  : (isId ? "Langkah 2: Periksa Data Kartu Identitas" : "Step 2: Verify ID Details")}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {!isIdValidated
                  ? (isId
                      ? "Pastikan foto kartu identitas berada di dalam kotak dan terlihat jelas."
                      : "Ensure your ID card photo is inside the box and clearly visible.")
                  : (isId
                      ? "Periksa data kartu identitas Anda sebelum melanjutkan ke verifikasi wajah."
                      : "Review your ID card details before proceeding to live face verification.")}
              </p>
            </div>

            {/* Hidden input elements triggered via direct ref clicks - always mounted */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                handleFileChange(e);
                e.target.value = "";
              }}
              className="sr-only"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,image/jpeg,image/png,image/webp"
              onChange={(e) => {
                handleFileChange(e);
                e.target.value = "";
              }}
              className="sr-only"
            />

            {!isIdValidated ? (
              /* ── Upload & Validate View ── */
              <form noValidate onSubmit={handleScanKtp} className="flex flex-col gap-3.5">
                {/* ID Photo Upload Container */}
                <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-neutral-50 border border-black/10">
                  {/* Image preview */}
                  {idFilePreviewUrl ? (
                    <div className="flex flex-col gap-2.5">
                      <div className="relative group rounded-xl overflow-hidden border border-black/10 bg-neutral-950 min-h-[200px] sm:min-h-[240px] flex items-center justify-center shadow-md p-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={idFilePreviewUrl}
                          alt="ID Card Preview"
                          className="w-full h-auto max-h-[260px] sm:max-h-[300px] object-contain rounded-lg"
                        />
                      </div>

                      {/* Action buttons for preview */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCropModalOpen(true)}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-black/5 hover:bg-black/10 border border-black/10 text-xs font-semibold text-neutral-800 transition-colors cursor-pointer"
                        >
                          <Icon icon="solar:crop-minimalistic-bold" className="text-base text-neutral-600" />
                          <span>{isId ? "Sesuaikan / Potong" : "Adjust / Crop"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenCamera}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-black/5 hover:bg-black/10 border border-black/10 text-xs font-semibold text-neutral-800 transition-colors shadow-xs cursor-pointer"
                        >
                          <Icon icon="solar:camera-minimalistic-bold" className="text-base text-neutral-500" />
                          <span>{isId ? "Foto Ulang" : "Retake Photo"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-black/5 hover:bg-black/10 border border-black/10 text-xs font-semibold text-neutral-800 transition-colors shadow-xs cursor-pointer"
                        >
                          <Icon icon="solar:gallery-bold" className="text-base text-neutral-500" />
                          <span>{isId ? "Ganti File" : "Change File"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-black/15 rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center bg-white min-h-[180px] gap-3.5">
                      <div className="flex flex-col items-center text-center gap-1">
                        <span className="text-xs sm:text-sm text-neutral-700 font-bold">
                          {isId
                            ? "Pilih atau Ambil Foto Kartu Identitas"
                            : "Choose or Take ID Photo"}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {isId ? "Format: PNG, JPG, WEBP" : "Formats: PNG, JPG, WEBP"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-sm">
                        {/* Option 1: Take Photo with In-App Camera */}
                        <button
                          type="button"
                          onClick={handleOpenCamera}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-black/5 hover:bg-black/10 border border-black/10 text-xs font-semibold text-neutral-800 transition-colors text-center shadow-xs cursor-pointer"
                        >
                          <Icon icon="solar:camera-minimalistic-bold" className="text-base text-neutral-600 shrink-0" />
                          <span>{isId ? "Ambil Foto" : "Take Photo"}</span>
                        </button>

                        {/* Option 2: Choose from File / Gallery */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-black/5 hover:bg-black/10 border border-black/10 text-xs font-semibold text-neutral-800 transition-colors text-center shadow-xs cursor-pointer"
                        >
                          <Icon icon="solar:gallery-bold" className="text-base text-neutral-600 shrink-0" />
                          <span>{isId ? "Pilih File" : "Choose File"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {kycError && (
                    <div className="flex flex-col gap-1 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-left mt-1.5">
                      <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs">
                        <Icon icon="solar:danger-triangle-bold" className="text-sm shrink-0" />
                        <span>{isId ? "Verifikasi Ditolak / Waktu Habis" : "Verification Rejected / Timed Out"}</span>
                      </div>
                      <p className="text-[11px] font-medium text-red-700 leading-relaxed pl-5">
                        {kycError}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!idFile}
                  buttonText={isId ? "Validasi" : "Validate"}
                  className="w-full py-3 mt-1.5 font-bold text-xs sm:text-sm shadow-md"
                />
              </form>
            ) : (
              /* ── Validated Review & Edit View ── */
              <div className="flex flex-col gap-3.5 text-left">
                {/* ID Card Status Thumbnail */}
                {idFilePreviewUrl && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 border border-black/10">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={idFilePreviewUrl}
                        alt="ID Card Thumbnail"
                        className="w-12 h-9 object-cover rounded-lg shrink-0 border border-black/10"
                      />
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        <span className="text-xs font-bold truncate text-neutral-800">
                          {isId ? "Kartu Identitas" : "ID Card"}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <Icon icon="solar:check-circle-bold" className="text-xs shrink-0" />
                          {isId ? "Valid" : "Valid"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsIdValidated(false);
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-xs font-semibold text-neutral-700 transition-colors cursor-pointer"
                    >
                      <Icon icon="solar:camera-minimalistic-bold" className="text-sm" />
                      <span>{isId ? "Ganti Foto" : "Change Photo"}</span>
                    </button>
                  </div>
                )}

                {/* Informational Hint regarding ID card matching */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
                  <Icon icon="solar:info-circle-bold" className="text-amber-500 text-sm shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {isId
                      ? "Jika nomor kartu identitas tidak sesuai dengan kartu Anda, silakan ganti foto dan unggah foto yang lebih jelas."
                      : "If the ID card number does not match your card, please change photo and upload a clearer one."}
                  </p>
                </div>

                {/* Form Fields: Full Name (editable), ID Number (locked), Address (editable) */}
                <div className="flex flex-col gap-3">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-neutral-600">
                      {isId ? "Nama Lengkap" : "Full Name"}
                    </label>
                    <input
                      type="text"
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value.toUpperCase())}
                      placeholder={isId ? "Contoh: BUDI SANTOSO" : "e.g. BUDI SANTOSO"}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 border border-black/10 focus:outline-none focus:border-black/30 text-xs sm:text-sm font-semibold uppercase tracking-wide"
                    />
                  </div>

                  {/* NIK 16 Digit (Read-Only) */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-600">
                        {isId ? "Nomor Induk Kependudukan (NIK)" : "ID Card Number (NIK)"}
                      </label>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {isId ? "Sesuai Kartu Identitas" : "As per ID Card"}
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      disabled
                      maxLength={16}
                      value={idNumber}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 border border-black/10 text-xs sm:text-sm font-mono font-semibold tracking-wider opacity-75 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Address */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-neutral-600">
                      {isId ? "Alamat Kartu Identitas" : "ID Card Address"}
                    </label>
                    <textarea
                      rows={2}
                      value={addressField}
                      onChange={(e) => setAddressField(e.target.value)}
                      placeholder={isId ? "Alamat lengkap sesuai kartu identitas..." : "Full address as per ID card..."}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 border border-black/10 focus:outline-none focus:border-black/30 text-xs sm:text-sm font-normal resize-none"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={!fullname || !idNumber}
                  onClick={() => {
                    if (!fullname.trim()) {
                      toast.error(isId ? "Nama lengkap tidak boleh kosong." : "Full legal name is required.");
                      return;
                    }
                    setStep("kyc_face_scan");
                  }}
                  buttonText={isId ? "Lanjutkan" : "Continue"}
                  className="w-full py-3 mt-1 font-bold text-xs sm:text-sm shadow-md"
                />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2 (cont.): SCANNING SPINNER ── */}
        {step === "kyc_scanning" && isAuthorized && (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <span className="loading loading-spinner loading-lg text-black"></span>
            <h3 className="text-base sm:text-lg font-bold tracking-tight">
              {isId ? "Memvalidasi Kartu Identitas" : "Validating ID Card"}
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs">
              {isId
                ? "Memvalidasi kartu identitas Anda secara aman..."
                : "Securely validating your ID card..."}
            </p>
          </div>
        )}

        {/* ── STEP 3: LIVE FACE SCANNER (INLINE FULL-CARD VIEW) ── */}
        {step === "kyc_face_scan" && isAuthorized && (
          <LiveFaceScanner
            isId={isId}
            ktpFile={idFile}
            onboardingToken={onboardingToken || urlOnboardingToken || ""}
            signature={signedSignature || ""}
            network={activeNetwork}
            initialCooldownSeconds={serverCooldownSeconds}
            initialAttemptsCount={serverAttemptsCount}
            onCaptureComplete={handleFaceCaptureComplete}
            onBackToUpload={handleBackToUpload}
          />
        )}

        {/* ── STEP 4: REVIEW & ONBOARD ── */}
        {step === "kyc_review" && isAuthorized && (
          <div className="flex flex-col gap-4 text-left">
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight bg-linear-to-r from-neutral-900 to-neutral-500 bg-clip-text text-transparent">
                {isId ? "Langkah 4: Periksa & Konfirmasi" : "Step 4: Review & Confirm"}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {isId
                  ? "Periksa seluruh data Anda sebelum menyelesaikan pendaftaran."
                  : "Review your verified details before completing onboarding."}
              </p>
            </div>

            {/* Dual Status Card: ID Card + Live Face Verification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {idFilePreviewUrl && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/5 border border-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={idFilePreviewUrl}
                    alt="ID Card Thumbnail"
                    className="w-12 h-9 object-cover rounded-lg shrink-0 border border-black/10"
                  />
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-xs font-bold truncate text-neutral-800">
                      {isId ? "Kartu Identitas" : "ID Card"}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Icon icon="solar:check-circle-bold" className="text-xs shrink-0" />
                      {isId ? "Valid" : "Valid"}
                    </span>
                  </div>
                </div>
              )}

              {selfieFile && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/5 border border-black/10">
                  {selfiePreviewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selfiePreviewUrl}
                      alt="Live Test Thumbnail"
                      className="w-12 h-9 object-cover rounded-lg shrink-0 border border-black/10"
                    />
                  ) : (
                    <div className="w-12 h-9 rounded-lg bg-black/5 border border-black/10 flex items-center justify-center text-neutral-600 shrink-0">
                      <Icon icon="solar:camera-minimalistic-bold" className="text-base" />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-xs font-bold truncate text-neutral-800">
                      {isId ? "Tes Langsung" : "Live Test"}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Icon icon="solar:check-circle-bold" className="text-xs shrink-0" />
                      {isId ? "Terverifikasi" : "Verified"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmed Details Summary Box */}
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-black/5 border border-black/10 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-black/5">
                <span className="text-neutral-500">{isId ? "Nama Lengkap:" : "Full Name:"}</span>
                <span className="font-bold text-neutral-900 uppercase">{fullname || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-black/5">
                <span className="text-neutral-500">{isId ? "Nomor Identitas (NIK):" : "ID Card Number (NIK):"}</span>
                <span className="font-mono font-bold text-neutral-900">{idNumber || "N/A"}</span>
              </div>
              {addressField && (
                <div className="flex justify-between items-start pb-2 border-b border-black/5 gap-2">
                  <span className="text-neutral-500 shrink-0">{isId ? "Alamat:" : "Address:"}</span>
                  <span className="font-medium text-neutral-800 text-right">{addressField}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">{isId ? "Dompet:" : "Wallet:"}</span>
                <span className="font-mono font-bold text-neutral-800">
                  {connectedAddress ? `${connectedAddress.slice(0, 8)}...${connectedAddress.slice(-6)}` : "N/A"} ({activeNetwork})
                </span>
              </div>
            </div>

            {kycError && (
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-left">
                <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs">
                  <Icon icon="solar:danger-triangle-bold" className="text-sm shrink-0" />
                  <span>{isId ? "Pengajuan Ditolak" : "Submission Rejected"}</span>
                </div>
                <p className="text-[11px] font-medium text-red-700 leading-relaxed pl-5">
                  {kycError}
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full mt-1">
              <button
                type="button"
                onClick={handleRestartFromStep1}
                className="w-full sm:w-auto px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold text-neutral-500 hover:text-neutral-800 hover:bg-black/5 border border-black/10 transition-colors cursor-pointer"
              >
                {isId ? "Ulangi" : "Retry"}
              </button>
              <Button
                type="button"
                disabled={!fullname || !idNumber}
                onClick={handleFinalKycSubmit}
                buttonText={isId ? "Konfirmasi" : "Onboard"}
                className="w-full sm:flex-1 py-3 font-bold text-xs sm:text-sm shadow-md"
              />
            </div>
          </div>
        )}

        {/* ── SUBMITTING spinner ── */}
        {step === "submitting" && isAuthorized && (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <span className="loading loading-spinner loading-lg text-black"></span>
            <h3 className="text-lg font-bold">
              {isId ? "Mendaftarkan Akun..." : "Registering Account..."}
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs">
              {isId
                ? "Menyelesaikan verifikasi akun dan menghubungkan dompet Anda..."
                : "Finalizing account registration and linking your wallet..."}
            </p>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
            <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center animate-bounce">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
                className="w-7 h-7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                {isId ? "Verifikasi Berhasil" : "Verification Successful"}
              </h3>
              <p className="text-xs text-neutral-500 mt-1 px-4 leading-relaxed">
                {isId
                  ? "Email & dompet Anda telah berhasil diverifikasi. Mengarahkan..."
                  : "Your email & wallet have been securely verified. Redirecting..."}
              </p>
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === "error" && (
          <div className="flex flex-col items-center justify-center text-center py-4 gap-3">
            <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-7 h-7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                {isId ? "Verifikasi Gagal" : "Verification Failed"}
              </h3>
              <p className="text-xs text-neutral-500 mt-1 px-4 leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full mt-1">
              <Button
                buttonText={isId ? "Coba Lagi" : "Try Again"}
                onClick={() => {
                  if (token && isTargetWalletConnected) {
                    handleWalletLinkingVerification(token);
                  } else if (onboardingToken || urlOnboardingToken) {
                    setStep("kyc_upload");
                  } else {
                    setStep("wallet_connect");
                  }
                }}
                className="w-full py-2.5 sm:py-3 font-semibold text-xs sm:text-sm rounded-xl"
              />
              <Button
                buttonText={isId ? "Kembali ke Aplikasi" : "Back to App"}
                onClick={() => {
                  const pendingTx = getPendingTransaction();
                  const network = pendingTx?.network?.toLowerCase() || activeNetwork.toLowerCase() || "solana";
                  const appTab = pendingTx?.type === "WITHDRAWAL" ? "assets" : "buy";
                  router.push(`/${locale}/${network}/vault/${appTab}`);
                }}
                className="w-full py-2.5 sm:py-3 font-semibold text-xs sm:text-sm rounded-xl opacity-80"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── KTP IN-APP CAMERA MODAL ── */}
      <KtpCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        onFallbackToFile={() => fileInputRef.current?.click()}
        isId={isId}
      />

      {/* ── KTP CROP & ADJUST MODAL ── */}
      {rawOriginalUrl && (
        <KtpCropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          imageSrc={rawOriginalUrl}
          isId={isId}
          initialCropState={ktpCropState}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* ── ZERO STORAGE PRIVACY NOTICE ── */}
      <div className="max-w-2xl mx-auto w-full mt-4 p-3.5 sm:p-4 rounded-2xl bg-black/5 border border-black/10 flex items-start gap-3 text-left">
        <Icon icon="solar:shield-minimalistic-bold" className="text-neutral-600 text-lg shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <h4 className="text-xs sm:text-sm font-bold text-neutral-800">
            {isId ? "Paradapp Tidak Pernah Menyimpan Informasi Anda" : "Paradapp Never Stores Your Information"}
          </h4>
          <p className="text-[11px] sm:text-xs text-neutral-500 leading-relaxed">
            {isId
              ? "Kami tidak menyimpan kartu identitas, foto, atau data pribadi Anda di server kami."
              : "We do not store your ID card, photos, or personal data on our servers."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <AllDappProviders>
      <Suspense
        fallback={
          <div className="relative min-h-screen flex items-center justify-center text-black">
            <VideoBg />
            <span className="loading loading-spinner loading-lg text-black"></span>
          </div>
        }
      >
        <VerifyContent />
      </Suspense>
    </AllDappProviders>
  );
}
