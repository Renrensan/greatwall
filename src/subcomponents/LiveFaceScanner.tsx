"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import Button from "./Button";
import toast from "react-hot-toast";

interface LiveFaceScannerProps {
  isId?: boolean;
  ktpFile: File | null;
  onboardingToken: string;
  signature?: string;
  network?: string;
  initialCooldownSeconds?: number;
  initialAttemptsCount?: number;
  onCaptureComplete: (selfieFile: File, previewUrl: string, similarity?: number) => void;
  onBackToUpload?: () => void;
}

type ScanStatus =
  | "idle"
  | "requesting_permission"
  | "searching"
  | "holding_steady"
  | "verifying_aws"
  | "verified"
  | "mismatch"
  | "error";

export default function LiveFaceScanner({
  isId = false,
  ktpFile,
  onboardingToken,
  signature,
  network,
  initialCooldownSeconds = 0,
  initialAttemptsCount = 0,
  onCaptureComplete,
  onBackToUpload,
}: LiveFaceScannerProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`face_cooldown_${onboardingToken || "active"}`);
      if (stored) {
        const targetTs = parseInt(stored, 10);
        const now = Math.floor(Date.now() / 1000);
        if (targetTs > now) {
          return targetTs - now;
        }
      }
    }
    return initialCooldownSeconds;
  });

  const [isLockedOut, setIsLockedOut] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(`face_lockout_${onboardingToken || "active"}`) === "true";
    }
    return false;
  });

  const [scanStatus, setScanStatus] = useState<ScanStatus>(() => {
    if (typeof window !== "undefined") {
      const isLocked = sessionStorage.getItem(`face_lockout_${onboardingToken || "active"}`) === "true";
      if (isLocked) return "error";
      const stored = sessionStorage.getItem(`face_cooldown_${onboardingToken || "active"}`);
      if (stored) {
        const targetTs = parseInt(stored, 10);
        const now = Math.floor(Date.now() / 1000);
        if (targetTs > now) return "mismatch";
      }
    }
    return initialCooldownSeconds > 0 ? "mismatch" : "idle";
  });

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdownProgress, setCountdownProgress] = useState(0);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [mismatchMessage, setMismatchMessage] = useState<string | null>(null);
  const [isFramingError, setIsFramingError] = useState<boolean>(false);
  const [attemptsCount, setAttemptsCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`face_attempts_${onboardingToken || "active"}`);
      if (stored) return parseInt(stored, 10) || initialAttemptsCount;
    }
    return initialAttemptsCount;
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const attachStreamToVideo = useCallback((video: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!video || !stream) return;
    try {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.muted = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((playErr) => {
          console.warn("LiveFaceScanner video play warning:", playErr);
        });
      }
    } catch (e) {
      console.warn("Error attaching stream to video:", e);
    }
  }, []);

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      attachStreamToVideo(node, streamRef.current);
    }
  }, [attachStreamToVideo]);

  // Live countdown timer for backend cooldown (persistent across reloads)
  useEffect(() => {
    if (cooldownRemaining <= 0) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`face_cooldown_${onboardingToken || "active"}`);
      }
      return;
    }

    if (typeof window !== "undefined") {
      const existing = sessionStorage.getItem(`face_cooldown_${onboardingToken || "active"}`);
      if (!existing) {
        sessionStorage.setItem(
          `face_cooldown_${onboardingToken || "active"}`,
          (Math.floor(Date.now() / 1000) + cooldownRemaining).toString()
        );
      }
    }

    const interval = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(`face_cooldown_${onboardingToken || "active"}`);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining, onboardingToken]);

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const captureFrame = useCallback(async () => {
    if (isLockedOut) return;
    if (cooldownRemaining > 0) {
      toast.error(
        isId
          ? `Harap tunggu ${cooldownRemaining} detik sebelum mencoba lagi.`
          : `Please wait ${cooldownRemaining} seconds before trying again.`
      );
      return;
    }

    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      toast.error(isId ? "Kamera belum siap, silakan tunggu sejenak." : "Camera not ready, please wait a moment.");
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Mirror horizontally to match the selfie preview
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        async (blob) => {
          if (!blob) return;
          const selfieFile = new File([blob], "selfie.jpg", { type: "image/jpeg" });
          const previewUrl = URL.createObjectURL(blob);

          if (ktpFile && onboardingToken) {
            setScanStatus("verifying_aws");

            try {
              const formData = new FormData();
              formData.append("onboardingToken", onboardingToken);
              if (signature) formData.append("signature", signature);
              if (network) formData.append("network", network);
              formData.append("idFile", ktpFile);
              formData.append("selfieFile", selfieFile);

              const res = await fetch("/api/auth/onboarding/compare-faces", {
                method: "POST",
                body: formData,
              });

              const resData = await res.json().catch(() => ({ success: false }));

              if (res.ok && resData.success && resData.data?.is_match) {
                setScanStatus("verified");
                stopCamera();
                if (typeof window !== "undefined") {
                  sessionStorage.removeItem(`face_cooldown_${onboardingToken || "active"}`);
                  sessionStorage.removeItem(`face_attempts_${onboardingToken || "active"}`);
                }
                toast.success(
                  isId
                    ? "Wajah berhasil terverifikasi!"
                    : "Face verified successfully!"
                );

                setTimeout(() => {
                  onCaptureComplete(selfieFile, previewUrl);
                }, 900);
              } else {
                stopCamera();
                if (resData.error_code === "ERR_MAX_ATTEMPTS_EXCEEDED" || resData.error_code === "ERR_EMAIL_LOCKED_OUT") {
                  setIsLockedOut(true);
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(`face_lockout_${onboardingToken || "active"}`, "true");
                    sessionStorage.removeItem(`face_cooldown_${onboardingToken || "active"}`);
                  }
                  setLockoutMessage(
                    resData.message ||
                      (isId
                        ? "Batas percobaan verifikasi wajah tercapai untuk akun ini. Silakan coba mendaftar ulang besok."
                        : "Face verification attempt limit reached for this account. Please try again tomorrow.")
                  );
                  setScanStatus("error");
                } else {
                  const cd = resData.cooldown_seconds || 30;
                  setCooldownRemaining(cd);
                  const attempts = resData.attempts || attemptsCount + 1;
                  setAttemptsCount(attempts);
                  const isFraming = resData.error_code === "ERR_FACE_FRAMING_INVALID" || resData.framing_valid === false;
                  setIsFramingError(isFraming);
                  setMismatchMessage(resData.message || resData.framing_error || null);

                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(
                      `face_cooldown_${onboardingToken || "active"}`,
                      (Math.floor(Date.now() / 1000) + cd).toString()
                    );
                    sessionStorage.setItem(`face_attempts_${onboardingToken || "active"}`, attempts.toString());
                  }
                  setScanStatus("mismatch");
                }
              }
            } catch (err: any) {
              console.error("Face comparison API error:", err);
              stopCamera();
              setCooldownRemaining(30);
              if (typeof window !== "undefined") {
                sessionStorage.setItem(
                  `face_cooldown_${onboardingToken || "active"}`,
                  (Math.floor(Date.now() / 1000) + 30).toString()
                );
              }
              setScanStatus("mismatch");
            }
          } else {
            setScanStatus("verified");
            stopCamera();
            toast.success(isId ? "Wajah berhasil dipindai!" : "Face captured successfully!");
            onCaptureComplete(selfieFile, previewUrl);
          }
        },
        "image/jpeg",
        0.90
      );
    } catch (err: any) {
      console.error("Frame capture error:", err);
      toast.error(isId ? "Gagal memproses foto wajah." : "Failed to process face photo.");
    }
  }, [attemptsCount, cooldownRemaining, isId, isLockedOut, ktpFile, network, onCaptureComplete, onboardingToken, signature, stopCamera]);

  const startCamera = useCallback(async () => {
    if (isLockedOut) {
      toast.error(
        isId
          ? "Batas percobaan verifikasi wajah tercapai. Silakan coba lagi besok."
          : "Maximum attempts reached. Please try again tomorrow."
      );
      return;
    }
    if (cooldownRemaining > 0) {
      toast.error(
        isId
          ? `Harap tunggu ${cooldownRemaining} detik sebelum membuka kamera.`
          : `Please wait ${cooldownRemaining} seconds before opening the camera.`
      );
      return;
    }

    stopCamera();
    setCameraError(null);
    setScanStatus("requesting_permission");
    setCountdownProgress(0);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setScanStatus("error");
      setCameraError(
        isId
          ? "Akses kamera tidak didukung di browser ini. Harap buka di Safari atau browser bawaan."
          : "Camera access is not supported in this browser. Please open in Safari or standard browser."
      );
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Tier 1: Ideal front camera with standard mobile resolution
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        try {
          // Tier 2: Front camera without resolution constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "user" } },
            audio: false,
          });
        } catch {
          // Tier 3: Any video device fallback
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        attachStreamToVideo(videoRef.current, stream);
      }

      setScanStatus("searching");

      // Give 3.0 seconds to comfortably align face before steady check begins
      timerRef.current = setTimeout(() => {
        setScanStatus("holding_steady");

        const startTime = Date.now();
        const duration = 3000;

        progressIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, Math.round((elapsed / duration) * 100));
          setCountdownProgress(progress);

          if (elapsed >= duration) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            captureFrame();
          }
        }, 50);
      }, 3000);
    } catch (err: any) {
      console.error("getUserMedia error:", err);
      setScanStatus("error");
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? isId
            ? "Izin akses kamera ditolak. Harap aktifkan izin kamera pada browser Anda."
            : "Camera permission denied. Please allow camera access in your browser."
          : isId
          ? "Tidak dapat mengakses kamera perangkat. Harap pastikan kamera tersedia."
          : "Unable to access device camera. Please make sure a camera is connected."
      );
    }
  }, [attachStreamToVideo, captureFrame, cooldownRemaining, isId, isLockedOut, stopCamera]);

  useEffect(() => {
    // Only cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ── IDLE / PREPARATION SCREEN ──
  if (scanStatus === "idle") {
    return (
      <div className="flex flex-col gap-4 text-left w-full">
        {/* Header */}
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight bg-linear-to-r from-neutral-900 to-neutral-500 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
            {isId ? "Langkah 3: Tes Liveness" : "Step 3: Liveness Test"}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {isId
              ? "Siapkan diri Anda sebelum kamera dibuka untuk verifikasi wajah langsung."
              : "Get ready before opening the camera for live face verification."}
          </p>
        </div>

        {/* Central Preparation Card */}
        <div className="flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-black/10 dark:border-white/10 text-center gap-3.5 shadow-sm">
          {/* Simple Clean Camera Icon */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <Icon icon="solar:camera-minimalistic-bold" className="text-2xl sm:text-3xl" />
          </div>

          <div className="flex flex-col gap-0.5 max-w-sm">
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
              {isId ? "Pencocokan Wajah dengan Kartu Identitas" : "Face Match with ID Card"}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {isId
                ? "Kamera akan memindai wajah Anda secara langsung untuk dicocokkan dengan foto pada kartu identitas."
                : "The camera will scan your live face to match against your ID photo."}
            </p>
          </div>

          {/* 3 Guidelines Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-lg mt-0.5">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-black/5 dark:border-white/5 text-left">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                <Icon icon="solar:sun-bold" className="text-base" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                  {isId ? "Pencahayaan" : "Good Lighting"}
                </span>
                <span className="text-[10px] text-neutral-400 leading-tight">
                  {isId ? "Hindari bayangan" : "Avoid shadows"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-black/5 dark:border-white/5 text-left">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
                <Icon icon="solar:glasses-bold" className="text-base" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                  {isId ? "Lepas Aksesoris" : "Remove Gear"}
                </span>
                <span className="text-[10px] text-neutral-400 leading-tight">
                  {isId ? "Tanpa masker/topi" : "No hats/masks"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-black/5 dark:border-white/5 text-left">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                <Icon icon="solar:user-bold" className="text-base" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                  {isId ? "Tatap Lurus" : "Look Straight"}
                </span>
                <span className="text-[10px] text-neutral-400 leading-tight">
                  {isId ? "Sejajar kamera" : "Align to camera"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2 pt-1">
          <Button
            type="button"
            onClick={startCamera}
            buttonText={isId ? "Saya Siap" : "I'm Ready"}
            className="w-full sm:w-auto flex-1 py-3 font-bold text-xs sm:text-sm shadow-md"
          />

          {onBackToUpload && (
            <button
              type="button"
              onClick={onBackToUpload}
              className="w-full sm:w-auto px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              {isId ? "Kembali" : "Back"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── ACTIVE CAMERA VIEWPORT ──
  return (
    <div className="flex flex-col gap-3.5 text-left w-full">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-lg font-bold tracking-tight bg-linear-to-r from-neutral-900 to-neutral-500 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
          {isId ? "Langkah 3: Tes Liveness" : "Step 3: Liveness Test"}
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {isId
            ? "Posisikan wajah Anda di dalam bingkai oval untuk verifikasi wajah langsung."
            : "Position your face inside the oval frame for live face verification."}
        </p>
      </div>

      {/* Main Balanced Camera Viewport */}
      <div className="relative w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 flex items-center justify-center shadow-lg">
        {/* Live Video Feed (100% centered in container) */}
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            video.play().catch((playErr) => {
              console.warn("LiveFaceScanner onLoadedMetadata play warning:", playErr);
            });
          }}
          className="w-full h-full object-cover scale-x-[-1] absolute inset-0"
        />

        {/* Large Oval Guide Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-[200px] h-[270px] sm:w-[240px] sm:h-[320px] rounded-[50%] border-2 transition-all duration-300 flex flex-col items-center justify-between p-3 ${
              scanStatus === "holding_steady"
                ? "border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.4)] ring-4 ring-emerald-500/25"
                : scanStatus === "searching"
                ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)] ring-2 ring-amber-400/20"
                : scanStatus === "verified"
                ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_35px_rgba(16,185,129,0.5)]"
                : scanStatus === "mismatch"
                ? "border-rose-500 bg-rose-500/10 shadow-[0_0_25px_rgba(244,63,94,0.35)]"
                : "border-white/50 border-dashed"
            }`}
          >
            {/* Top status indicator pill */}
            <div className="mt-1.5">
              {scanStatus === "holding_steady" ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/95 border border-emerald-500/70 text-emerald-400 text-xs font-bold backdrop-blur-md animate-pulse shadow-lg">
                  <Icon icon="mdi:check-circle" className="w-3.5 h-3.5" />
                  <span>
                    {isId
                      ? `Tahan Posisi (${Math.max(1, Math.ceil((100 - countdownProgress) / 33.3))}s)...`
                      : `Hold Still (${Math.max(1, Math.ceil((100 - countdownProgress) / 33.3))}s)...`}
                  </span>
                </div>
              ) : scanStatus === "searching" ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/95 border border-amber-500/70 text-amber-300 text-xs font-bold backdrop-blur-md shadow-lg">
                  <Icon icon="solar:face-scan-bold" className="w-3.5 h-3.5 animate-spin" />
                  <span>{isId ? "Arahkan Wajah ke Oval" : "Align Face in Oval"}</span>
                </div>
              ) : null}
            </div>

            {/* Progress bar inside oval when holding steady */}
            {scanStatus === "holding_steady" && (
              <div className="w-28 sm:w-36 h-2 bg-neutral-900/90 rounded-full overflow-hidden mb-1.5 border border-white/30 shadow-inner">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  style={{ width: `${countdownProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Verifying Face Match Overlay */}
        {scanStatus === "verifying_aws" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/90 text-white gap-3 z-20 backdrop-blur-md">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <Icon icon="solar:face-scan-bold" className="w-5 h-5 text-emerald-400 absolute" />
            </div>
            <div className="text-center px-4">
              <p className="text-xs sm:text-sm font-bold text-neutral-100">
                {isId ? "Memverifikasi Wajah..." : "Verifying Face..."}
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {isId
                  ? "Mencocokkan wajah dengan foto kartu identitas..."
                  : "Comparing face with ID card photo..."}
              </p>
            </div>
          </div>
        )}

        {/* Verified Success Overlay */}
        {scanStatus === "verified" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/90 text-white gap-3 z-20 backdrop-blur-md animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
              <Icon icon="solar:check-circle-bold" className="w-7 h-7" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm sm:text-base font-bold text-emerald-400">
                {isId ? "Wajah Terverifikasi!" : "Face Verified!"}
              </p>
              <p className="text-[11px] text-neutral-300 mt-0.5">
                {isId ? "Verifikasi wajah langsung berhasil." : "Live face verification successful."}
              </p>
            </div>
          </div>
        )}

        {/* Face Mismatch Overlay */}
        {scanStatus === "mismatch" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/95 text-white p-5 sm:p-6 text-center gap-3 z-20 backdrop-blur-md overflow-y-auto">
            <div className="w-11 h-11 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-sm shrink-0">
              <Icon icon="solar:danger-triangle-bold" className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1 max-w-sm">
              <div className="flex items-center justify-center gap-1.5">
                <h4 className="text-sm sm:text-base font-bold text-rose-400">
                  {isFramingError
                    ? isId
                      ? "Posisi Wajah Kurang Tepat"
                      : "Face Positioning Error"
                    : isId
                    ? "Wajah Tidak Cocok"
                    : "Face Did Not Match"}
                </h4>
                {attemptsCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono font-semibold">
                    {isId ? `Percobaan ${attemptsCount}/5` : `Attempt ${attemptsCount}/5`}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-xs px-2">
                {mismatchMessage ||
                  (isId
                    ? "Foto wajah tidak cocok dengan foto pada kartu identitas Anda. Pastikan pencahayaan cukup terang, tatap lurus ke kamera, dan coba lagi."
                    : "The live face photo did not match your ID card photo. Ensure good lighting, look straight into the camera, and try again.")}
              </p>
            </div>

            <Button
              buttonText={
                cooldownRemaining > 0
                  ? isId
                    ? `Pindai Ulang (${cooldownRemaining}s)`
                    : `Try Again (${cooldownRemaining}s)`
                  : isId
                  ? "Pindai Ulang"
                  : "Try Again"
              }
              disabled={cooldownRemaining > 0}
              onClick={startCamera}
              className={`text-xs py-2.5 px-6 mt-1 font-bold rounded-xl shadow-md ${
                cooldownRemaining > 0
                  ? "bg-neutral-800 text-neutral-400 opacity-60 cursor-not-allowed"
                  : "bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              }`}
            />
          </div>
        )}

        {/* Account Lockout Overlay (5/5 Failures / 24h Lock) */}
        {isLockedOut && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/98 text-white p-5 sm:p-6 text-center gap-3 z-30 backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-md shrink-0">
              <Icon icon="solar:lock-bold" className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1 max-w-sm">
              <h4 className="text-sm sm:text-base font-bold text-rose-400">
                {isId ? "Batas Percobaan Tercapai" : "Maximum Attempts Reached"}
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-xs px-2">
                {lockoutMessage ||
                  (isId
                    ? "Batas percobaan verifikasi wajah tercapai untuk akun ini. Silakan coba mendaftar ulang besok."
                    : "Face verification attempt limit reached for this account. Please try again tomorrow.")}
              </p>
            </div>
          </div>
        )}

        {/* Camera Loading / Error Overlay */}
        {scanStatus === "requesting_permission" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/90 text-white gap-2 z-10">
            <Icon icon="solar:camera-minimalistic-bold" className="w-8 h-8 animate-bounce text-neutral-400" />
            <p className="text-xs text-neutral-300 font-medium">
              {isId ? "Mengaktifkan kamera..." : "Starting high-resolution camera..."}
            </p>
          </div>
        )}

        {scanStatus === "error" && !isLockedOut && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/95 text-white p-5 text-center gap-3 z-10">
            <Icon icon="solar:danger-triangle-bold" className="w-10 h-10 text-rose-500" />
            <p className="text-xs text-rose-300 max-w-sm">{cameraError}</p>
            <Button
              buttonText={isId ? "Coba Lagi" : "Retry Camera"}
              onClick={startCamera}
              className="text-xs py-2 px-4 mt-1"
            />
          </div>
        )}
      </div>

      {/* Action Controls */}
      {onBackToUpload && (
        <div className="flex items-center justify-start w-full pt-0.5">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onBackToUpload();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
          >
            <Icon icon="solar:arrow-left-linear" className="text-sm" />
            <span>{isId ? "Ganti Foto Kartu Identitas" : "Change ID Photo"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
