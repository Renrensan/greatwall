"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

interface KtpCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onFallbackToFile?: () => void;
  isId?: boolean;
}

export default function KtpCameraModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFile,
  isId = false,
}: KtpCameraModalProps) {
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (mode: "environment" | "user") => {
    stopStream();
    setIsLoading(true);
    setCameraError(null);

    try {
      // Try ideal resolution first
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback to basic video constraint if high-res fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.play().catch((playErr) => {
          console.warn("KtpCameraModal video play warning:", playErr);
        });
      }
      setIsLoading(false);
    } catch (err: any) {
      console.error("KTP camera error:", err);
      setIsLoading(false);
      const isDenied =
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError";
      setCameraError(
        isDenied
          ? isId
            ? "Izin akses kamera ditolak. Harap izinkan kamera di browser atau pilih file dari galeri."
            : "Camera permission denied. Please allow camera access in browser or choose from gallery."
          : isId
          ? "Tidak dapat mengakses kamera. Silakan pilih file dari galeri."
          : "Unable to access device camera. Please choose a file from gallery."
      );
    }
  }, [stopStream, isId]);

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, startCamera, stopStream]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error(isId ? "Kamera belum siap." : "Camera is not ready yet.");
      return;
    }

    // Flash visual feedback
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw full video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error(isId ? "Gagal mengambil foto." : "Failed to capture photo.");
          return;
        }
        const file = new File([blob], `ktp_${Date.now()}.jpg`, { type: "image/jpeg" });
        stopStream();
        onCapture(file);
      },
      "image/jpeg",
      0.95
    );
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-sm select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-lg bg-[#141414] text-white rounded-2xl sm:rounded-3xl border border-white/10 p-3.5 sm:p-4 flex flex-col gap-3 shadow-2xl relative max-h-[92vh]"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between w-full shrink-0 pb-1.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/10 text-white shrink-0">
                  <Icon icon="solar:camera-minimalistic-bold" className="text-lg" />
                </div>
                <div className="flex flex-col text-left">
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    {isId ? "Foto Kartu Identitas" : "Take ID Card Photo"}
                  </h3>
                  <p className="text-[10px] text-neutral-400">
                    {isId ? "Posisikan kartu identitas di dalam kotak." : "Position your ID card inside the frame."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  disabled={isLoading || Boolean(cameraError)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors disabled:opacity-40 cursor-pointer"
                  title={isId ? "Putar Kamera" : "Flip Camera"}
                >
                  <Icon icon="solar:camera-rotate-bold" className="text-base" />
                  <span className="hidden sm:inline text-[11px]">{isId ? "Putar" : "Flip"}</span>
                </button>

                {/* Close / Quit button */}
                <button
                  type="button"
                  onClick={() => {
                    stopStream();
                    onClose();
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <Icon icon="solar:close-circle-bold" className="text-xl" />
                </button>
              </div>
            </div>

            {/* Viewfinder Container */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[44vh] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-white/10 shadow-inner shrink-0">
              {/* Flash overlay */}
              {isFlashing && (
                <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
              )}

              {/* Video Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${facingMode === "user" ? "-scale-x-100" : ""}`}
              />

              {/* Loading Spinner */}
              {isLoading && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 gap-2 text-white">
                  <span className="loading loading-spinner loading-md"></span>
                  <p className="text-xs font-medium text-neutral-300 animate-pulse">
                    {isId ? "Menghubungkan kamera..." : "Connecting camera..."}
                  </p>
                </div>
              )}

              {/* Camera Error / Fallback */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-5 bg-black/90 z-20 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                    <Icon icon="solar:camera-broken" className="text-2xl" />
                  </div>
                  <p className="text-xs text-neutral-300 max-w-xs leading-relaxed">
                    {cameraError}
                  </p>
                  {onFallbackToFile && (
                    <button
                      type="button"
                      onClick={() => {
                        stopStream();
                        onClose();
                        onFallbackToFile();
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer shadow-md"
                    >
                      <Icon icon="solar:gallery-bold" className="text-sm" />
                      <span>{isId ? "Pilih dari Galeri" : "Choose from Gallery"}</span>
                    </button>
                  )}
                </div>
              )}

              {/* ID Card Target Overlay Frame */}
              {!isLoading && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-3 z-10">
                  {/* Clean open card guide bounded within viewport */}
                  <div className="relative w-[75%] sm:w-[70%] max-w-[270px] sm:max-w-[290px] aspect-[1.586/1] border-2 border-white/80 border-dashed rounded-xl flex flex-col items-center justify-between p-2.5 sm:p-3 transition-all duration-300 shadow-sm">
                    {/* Corner guide brackets */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-white rounded-tl-lg shadow-xs" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-white rounded-tr-lg shadow-xs" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-white rounded-bl-lg shadow-xs" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-white rounded-br-lg shadow-xs" />

                    {/* Subtitle helper badge inside frame */}
                    <span className="text-[10px] font-semibold text-white/95 bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-sm">
                      {isId ? "Posisikan Kartu Identitas di Sini" : "Position ID Card Here"}
                    </span>

                    <span className="text-[9px] sm:text-[10px] font-medium text-white/80 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      {isId ? "Pastikan teks terbaca jelas" : "Ensure text is clearly readable"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-between w-full pt-1 shrink-0 px-1">
              {/* Choose from Gallery / File */}
              {onFallbackToFile ? (
                <button
                  type="button"
                  onClick={() => {
                    stopStream();
                    onClose();
                    onFallbackToFile();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  <Icon icon="solar:gallery-bold" className="text-base" />
                  <span className="hidden sm:inline">{isId ? "Pilih File" : "Choose File"}</span>
                </button>
              ) : (
                <div className="w-16" />
              )}

              {/* Shutter Button (Capture) */}
              <button
                type="button"
                onClick={handleCapture}
                disabled={isLoading || Boolean(cameraError)}
                className="w-14 h-14 rounded-full border-4 border-white/30 flex items-center justify-center p-1 hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 cursor-pointer shadow-xl bg-white/10 shrink-0"
                aria-label="Capture Photo"
              >
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-black shadow-md">
                  <Icon icon="solar:camera-minimalistic-bold" className="text-xl" />
                </div>
              </button>

              {/* Cancel / Quit */}
              <button
                type="button"
                onClick={() => {
                  stopStream();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <span>{isId ? "Batal" : "Cancel"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
