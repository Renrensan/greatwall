"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { blackVideo, whiteVideo } from "@/index";

interface VideoBgFixedProps {
  onReady?: () => void;
}

const VideoBgFixed = memo(({ onReady }: VideoBgFixedProps) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const readyFired = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fireReady = () => {
    if (readyFired.current) return;
    readyFired.current = true;
    onReady?.();
  };

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 -z-20 pointer-events-none">
      <video
        key={resolvedTheme}
        src={resolvedTheme === "light" ? whiteVideo : blackVideo}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlayThrough={fireReady}
        onLoadedData={fireReady}
        className="w-full h-full object-cover"
      />
    </div>
  );
});

VideoBgFixed.displayName = "VideoBgFixed";

export default VideoBgFixed;
