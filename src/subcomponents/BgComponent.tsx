"use client";

import { memo, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { blackbg, whitebg } from "@/index";

const VideoBg = memo(() => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 -z-20 pointer-events-none">
      <video
        key={resolvedTheme}
        src={resolvedTheme === "light" ? whitebg : blackbg}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover"
      />
    </div>
  );
});

export default VideoBg;