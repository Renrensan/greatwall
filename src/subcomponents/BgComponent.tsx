"use client";

import { memo, useEffect, useState } from "react";
import { whitebg } from "@/index";

const VideoBg = memo(() => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 -z-20 pointer-events-none">
      <video
        src={whitebg}
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