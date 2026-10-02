"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import paramokLookUp from "@/assets/paramok-look-up.png";
import { PAGE_STRINGS } from "./content";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

type MobileIntroPhase = "idle" | "mascot" | "bubble";

function MobileSpeechBubble({ locale = "en" }: { locale?: "en" | "id" }) {
  const strings = PAGE_STRINGS[locale] || PAGE_STRINGS.en;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="relative"
    >
      <div className="relative bg-white border-[2.5px] border-black rounded-xl px-4 py-2 shadow-[3px_3px_0_0_#000]">
        <p className="text-sm font-extrabold text-black tracking-tight whitespace-nowrap">
          {strings.bubble}
        </p>
      </div>
      <div
        className="absolute left-0 -bottom-[9px] w-0 h-0"
        style={{
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "10px solid #000",
        }}
      />
      <div
        className="absolute left-0 -bottom-[6px] w-0 h-0"
        style={{
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "8px solid #fff",
        }}
      />
    </motion.div>
  );
}

interface MobileMascotProps {
  locale?: "en" | "id";
  className?: string;
}

export default function MobileMascot({
  locale = "en",
  className = "left-[-10px] -top-20",
}: MobileMascotProps) {
  const prefersReduced = useReducedMotion();
  const [phase, setPhase] = useState<MobileIntroPhase>("idle");

  useEffect(() => {
    if (prefersReduced) {
      setPhase("bubble");
      return;
    }

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobile) return;

    const t1 = setTimeout(() => setPhase("mascot"), 500);
    const t2 = setTimeout(() => setPhase("bubble"), 1100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [prefersReduced]);

  if (phase === "idle") return null;

  return (
    <div className={`lg:hidden absolute ${className} scale-200 z-30 pointer-events-none select-none`}>
      <motion.div
        initial={{ opacity: 0, x: -24, scale: 0.4, rotate: 30 }}
        animate={{ opacity: 1, x: 0, scale: 0.5, rotate: 60 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="relative origin-bottom-left"
      >
        {/* <AnimatePresence>
          {phase === "bubble" && (
            <div
              key="bubble"
              className="absolute bottom-[100%] left-[50%] z-10"
            >
              <MobileSpeechBubble locale={locale} />
            </div>
          )}
        </AnimatePresence> */}

        <Image
          src={paramokLookUp}
          alt="Para mascot"
          width={280}
          height={360}
          className="w-auto h-44 object-contain"
          priority
        />
      </motion.div>
    </div>
  );
}
