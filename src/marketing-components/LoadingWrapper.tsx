"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MultiStepLoader } from "@/marketing-components/MultiStepLoader";
import VideoBgFixed from "@/marketing-components/VideoBgFixed";

const aboutLoadingStates = [
  { text: "Opening Paradapp..." },
  { text: "Preparing parallel networks..." },
  { text: "Connecting cross-chain bridges..." },
  { text: "Initializing Para AI..." },
  { text: "Almost ready..." },
  { text: "Welcome to Paradapp!" },
];

const startWithParaLoadingStates = [
  { text: "Opening Paradapp..." },
  { text: "Preparing your networks..." },
  { text: "Almost ready..." },
  { text: "Welcome!" },
];

export default function LoadingWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isStartWithPara = pathname?.includes("/start-with-para");

  const storageKey = isStartWithPara
    ? "paradapp_start_with_para_visited"
    : "paradapp_about_visited";
  const loadingStates = isStartWithPara
    ? startWithParaLoadingStates
    : aboutLoadingStates;
  const minDuration = isStartWithPara ? 2400 : 4000;

  const [loading, setLoading] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [videoReady, setVideoReady] = useState(!isStartWithPara);
  const videoReadyRef = useRef(false);

  const handleVideoReady = useCallback(() => {
    if (videoReadyRef.current) return;
    videoReadyRef.current = true;
    setVideoReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasVisited = localStorage.getItem(storageKey);
    if (hasVisited) {
      setLoading(false);
      setMinTimeElapsed(true);
      setVideoReady(true);
      return;
    }

    setLoading(true);
    setMinTimeElapsed(false);
    if (isStartWithPara) {
      videoReadyRef.current = false;
      setVideoReady(false);
    }

    const timer = setTimeout(() => setMinTimeElapsed(true), minDuration);
    return () => clearTimeout(timer);
  }, [storageKey, minDuration, isStartWithPara]);

  useEffect(() => {
    if (!loading) return;
    if (minTimeElapsed && videoReady) {
      setLoading(false);
      localStorage.setItem(storageKey, "true");
    }
  }, [minTimeElapsed, videoReady, loading, storageKey]);

  // Don't block forever if video fails to load
  useEffect(() => {
    if (!isStartWithPara || !loading) return;
    const fallback = setTimeout(handleVideoReady, 6000);
    return () => clearTimeout(fallback);
  }, [isStartWithPara, loading, handleVideoReady]);

  return (
    <>
      <MultiStepLoader
        loadingStates={loadingStates}
        loading={loading}
        duration={600}
        loop={false}
      />

      {isStartWithPara && <VideoBgFixed onReady={handleVideoReady} />}

      <div
        className={`transition-opacity duration-1000 ${
          loading ? "opacity-0 invisible" : "opacity-100 visible"
        }`}
      >
        {isStartWithPara ? !loading && children : children}
      </div>
    </>
  );
}
