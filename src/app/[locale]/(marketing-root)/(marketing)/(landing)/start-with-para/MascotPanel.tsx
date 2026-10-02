"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import paramook from "@/assets/paramook.png";
import { PAGE_STRINGS } from "./content";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const MASCOT_CLASS = "w-auto h-[min(480px,70vh)] object-contain";

function MascotImage() {
  return (
    <motion.div layoutId="paramook" className="flex-shrink-0">
      <Image
        src={paramook}
        alt="Para mascot"
        width={360}
        height={480}
        className={MASCOT_CLASS}
        priority
      />
    </motion.div>
  );
}

interface MascotPanelProps {
  showBubble?: boolean;
  locale?: "en" | "id";
  className?: string;
  mascotClassName?: string;
}

export default function MascotPanel({
  showBubble = false,
  locale = "en",
  className = "hidden lg:flex",
  mascotClassName = MASCOT_CLASS,
}: MascotPanelProps) {
  const strings = PAGE_STRINGS[locale] || PAGE_STRINGS.en;

  return (
    <div className={`${className} flex-col items-center flex-shrink-0 pointer-events-none select-none`}>
      <AnimatePresence>
        {showBubble && (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="relative mb-2 -rotate-2"
          >
            <div className="relative bg-white border-[3px] border-black rounded-2xl px-6 py-3 shadow-[4px_4px_0_0_#000]">
              <p className="text-lg font-extrabold text-black tracking-tight whitespace-nowrap">
                {strings.bubble}
              </p>
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-[11px] w-0 h-0"
              style={{
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: "12px solid #000",
              }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-[8px] w-0 h-0"
              style={{
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "10px solid #fff",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div layoutId="paramook" className="flex-shrink-0">
        <Image
          src={paramook}
          alt="Para mascot"
          width={360}
          height={480}
          className={mascotClassName}
          priority
        />
      </motion.div>
    </div>
  );
}

export function CenteredMascot() {
  return (
    <div className="hidden lg:flex fixed inset-0 z-20 items-center justify-center pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <MascotImage />
      </motion.div>
    </div>
  );
}
