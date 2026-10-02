"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { motion, AnimatePresence, PanInfo } from "motion/react";
import { NetworkConfig } from "./content";
import NetworkHero from "./NetworkHero";

interface NetworkCarouselProps {
  configs: NetworkConfig[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  locale: "en" | "id";
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "60%" : "-60%",
    opacity: 0,
    scale: 0.92,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-60%" : "60%",
    opacity: 0,
    scale: 0.92,
  }),
};

export default function NetworkCarousel({
  configs,
  activeIndex,
  onIndexChange,
  locale,
}: NetworkCarouselProps) {
  const prefersReduced = useReducedMotion();
  const [direction, setDirection] = useState(1);
  const [prevIndex, setPrevIndex] = useState(activeIndex);

  // Detect external index changes (e.g. indicator tap) and set direction
  if (activeIndex !== prevIndex) {
    setDirection(activeIndex > prevIndex ? 1 : -1);
    setPrevIndex(activeIndex);
  }

  const navigate = (newIndex: number) => {
    setDirection(newIndex > activeIndex ? 1 : -1);
    setPrevIndex(activeIndex);
    onIndexChange(newIndex);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x < -50 || velocity.x < -400) {
      navigate(Math.min(activeIndex + 1, configs.length - 1));
    } else if (offset.x > 50 || velocity.x > 400) {
      navigate(Math.max(activeIndex - 1, 0));
    }
  };

  const config = configs[activeIndex];

  return (
    <div className="relative w-full overflow-hidden py-4">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={config.key}
          custom={direction}
          variants={prefersReduced ? undefined : slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          drag={prefersReduced ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          className="w-full cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: "pan-y" }}
        >
          <NetworkHero config={config} locale={locale} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
