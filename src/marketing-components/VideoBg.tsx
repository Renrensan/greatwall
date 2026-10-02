"use client";

import { memo, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { blackVideo, whiteVideo } from "@/index";

const VideoBg = memo(() => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 -z-20 pointer-events-none">
      <video key={resolvedTheme} src={resolvedTheme === "light" ? whiteVideo : blackVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" />
    </div>
  );
});

VideoBg.displayName = "VideoBg";

export default VideoBg;
