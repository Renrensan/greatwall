"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatedModal } from "./AnimatedModal";
import { Icon } from "@iconify/react";
import Button from "./Button";
import toast from "react-hot-toast";

interface LiveFaceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isId?: boolean;
  ktpFile?: File | null;
  onboardingToken?: string;
  signature?: string;
  network?: string;
  initialCooldownSeconds?: number;
  initialAttemptsCount?: number;
  onCaptureComplete: (selfieFile: File, previewUrl: string, similarity?: number) => void;
}

type ScanStatus =
  | "requesting_permission"
  | "searching"
  | "holding_steady"
  | "verifying_aws"
  | "verified"
  | "mismatch"
  | "error";

export default function LiveFaceScannerModal({
  isOpen,
  onClose,
  isId = false,
  ktpFile,
  onboardingToken,
  signature,
  network,
  initialCooldownSeconds = 0,
  initialAttemptsCount = 0,
  onCaptureComplete,
}: LiveFaceScannerModalProps) {
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
    return initialCooldownSeconds > 0 ? "mismatch" : "requesting_permission";
  });

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdownProgress, setCountdownProgress] = useState(0); // 0 to 100%
  const [matchSimilarity, setMatchSimilarity] = useState<number | null>(null);
  const [mismatchError, setMismatchError] = useState<string | null>(null);
  const [isFramingError, setIsFramingError] = useState<boolean>(false);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
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
          console.warn("LiveFaceScannerModal video play warning:", playErr);
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

  // Stop camera media tracks cleanly
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

  // Capture current video frame to JPEG file & verify against KTP
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
                const sim = Math.round((resData.data.similarity || 90) * 10) / 10;
                setMatchSimilarity(sim);
                setScanStatus("verified");
                stopCamera();
                if (typeof window !== "undefined") {
                  sessionStorage.removeItem(`face_cooldown_${onboardingToken || "active"}`);
                  sessionStorage.removeItem(`face_attempts_${onboardingToken || "active"}`);
                }
                toast.success(
                  isId
                    ? "Wajah terverifikasi!"
                    : "Face verified!"
                );

                setTimeout(() => {
                  onCaptureComplete(selfieFile, previewUrl, sim);
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
                  setMismatchError(resData.message || resData.framing_error || null);

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
            toast.success(
              isId
                ? "Wajah berhasil dipindai!"
                : "Face captured successfully!"
            );
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

  // Start front camera stream
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
    setMismatchError(null);
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

      // Give user 3.0 seconds to comfortably align face before steady check triggers
      timerRef.current = setTimeout(() => {
        setScanStatus("holding_steady");

        // 3.0 second deliberate countdown progress for steady auto-capture
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
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidthClass="w-full max-w-xl">
      <div className="flex flex-col gap-4 text-left p-1">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Icon icon="solar:face-scan-bold" className="text-xl" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {isId ? "Verifikasi Wajah Langsung" : "Live Face Verification"}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isId
                  ? "Posisikan wajah Anda di dalam bingkai oval"
                  : "Position your face inside the oval frame"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <Icon icon="solar:close-circle-bold" className="text-xl" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative w-full h-[380px] sm:h-[420px] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 flex items-center justify-center shadow-lg">
          {/* Live Video Feed */}
          <video
            ref={setVideoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              video.play().catch((playErr) => {
                console.warn("LiveFaceScannerModal onLoadedMetadata play warning:", playErr);
              });
            }}
            className="w-full h-full object-cover scale-x-[-1] absolute inset-0"
          />

          {/* Oval Biometric Guide Frame Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Dark Mask around the Oval */}
            <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[1px]" />

            {/* Glowing Oval Cutout */}
            <div
              className={`relative z-10 w-[240px] h-[320px] rounded-[50%] border-2 transition-all duration-500 shadow-[0_0_50px_rgba(0,0,0,0.8)] ${
                scanStatus === "verified"
                  ? "border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                  : scanStatus === "mismatch"
                  ? "border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)]"
                  : scanStatus === "verifying_aws"
                  ? "border-emerald-400/80 animate-pulse"
                  : "border-white/60 border-dashed"
              }`}
            >
              {/* Corner Biometric Crosshairs */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/40 rounded-full" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/40 rounded-full" />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/40 rounded-full" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/40 rounded-full" />
            </div>
          </div>

          {/* Verifying Overlay */}
          {scanStatus === "verifying_aws" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/90 text-white gap-3.5 z-20 backdrop-blur-md">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-3 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                <Icon icon="solar:face-scan-bold" className="w-7 h-7 text-emerald-400 absolute" />
              </div>
              <div className="text-center px-4">
                <p className="text-sm font-bold text-neutral-100">
                  {isId ? "Memverifikasi Kemiripan Wajah..." : "Verifying Face Match..."}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {isId
                    ? "Mencocokkan wajah dengan foto pada kartu identitas..."
                    : "Comparing face with ID card photo..."}
                </p>
              </div>
            </div>
          )}

          {/* Verified Success Overlay */}
          {scanStatus === "verified" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/90 text-white gap-3.5 z-20 backdrop-blur-md animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <Icon icon="solar:check-circle-bold" className="w-10 h-10" />
              </div>
              <div className="text-center px-4">
                <p className="text-base font-bold text-emerald-400">
                  {isId ? "Wajah Terverifikasi!" : "Face Verified!"}
                </p>
                <p className="text-xs text-neutral-300 mt-1">
                  {isId ? "Verifikasi wajah berhasil." : "Face verification successful."}
                </p>
              </div>
            </div>
          )}

          {/* Face Mismatch Overlay */}
          {scanStatus === "mismatch" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/95 text-white p-6 sm:p-8 text-center gap-4 z-20 backdrop-blur-md">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
                <Icon icon="solar:danger-triangle-bold" className="w-9 h-9" />
              </div>
              <div className="flex flex-col gap-1.5 max-w-md">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-base sm:text-lg font-bold text-rose-400">
                    {isFramingError
                      ? isId
                        ? "Posisi Wajah Kurang Tepat"
                        : "Face Positioning Error"
                      : isId
                      ? "Wajah Tidak Cocok"
                      : "Face Did Not Match"}
                  </p>
                  {attemptsCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono font-semibold">
                      {isId ? `Percobaan ${attemptsCount}/5` : `Attempt ${attemptsCount}/5`}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  {mismatchError && !mismatchError.includes("fetch failed")
                    ? mismatchError
                    : isId
                    ? "Foto wajah tidak cocok dengan foto pada kartu identitas Anda. Pastikan pencahayaan cukup terang, tatap lurus ke kamera, dan coba lagi."
                    : "The live face photo did not match your ID card photo. Ensure good lighting, look straight into the camera, and try again."}
                </p>
              </div>
              <Button
                buttonText={
                  cooldownRemaining > 0
                    ? isId
                      ? `Pindai Ulang (${cooldownRemaining}s)`
                      : `Try Again (${cooldownRemaining}s)`
                    : isId
                    ? "Pindai Ulang Sekarang"
                    : "Retry Scan Now"
                }
                disabled={cooldownRemaining > 0}
                onClick={startCamera}
                className={`text-sm py-3 px-8 mt-2 font-bold rounded-2xl shadow-xl ${
                  cooldownRemaining > 0
                    ? "bg-neutral-800 text-neutral-400 opacity-60 cursor-not-allowed"
                    : "bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                }`}
              />
            </div>
          )}

          {/* Account Lockout Overlay (5/5 Failures / 24h Lock) */}
          {isLockedOut && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/98 text-white p-6 sm:p-8 text-center gap-4 z-30 backdrop-blur-md">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
                <Icon icon="solar:lock-bold" className="w-9 h-9" />
              </div>
              <div className="flex flex-col gap-1.5 max-w-md">
                <p className="text-base sm:text-lg font-bold text-rose-400">
                  {isId ? "Batas Percobaan Tercapai" : "Maximum Attempts Reached"}
                </p>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/90 text-white gap-2.5 z-10">
              <Icon icon="solar:camera-minimalistic-bold" className="w-10 h-10 animate-bounce text-neutral-400" />
              <p className="text-xs text-neutral-300 font-medium">
                {isId ? "Mengaktifkan kamera..." : "Starting high-resolution camera..."}
              </p>
            </div>
          )}

          {scanStatus === "error" && !isLockedOut && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/95 text-white p-6 text-center gap-3.5 z-10">
              <Icon icon="solar:danger-triangle-bold" className="w-12 h-12 text-rose-500" />
              <p className="text-xs text-rose-300 max-w-sm">{cameraError}</p>
              <Button
                buttonText={isId ? "Coba Lagi" : "Retry Camera"}
                onClick={startCamera}
                className="text-xs py-2.5 px-5 mt-2"
              />
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end w-full mt-2">
          {/* Cancel / Close */}
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            {isId ? "Batal" : "Cancel"}
          </button>
        </div>
      </div>
    </AnimatedModal>
  );
}
