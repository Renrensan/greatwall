"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface SlideItem {
  title: string;
  description: string;
  buttonText: string;
  onClick?: () => void;
}

interface BannerSliderProps {
  slides: SlideItem[];
  bgImage: string;
}

const bannerVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    scale: 0.98, 
    opacity: 0,
  }),
  center: {
    zIndex: 0,
    x: 0,
    scale: 1,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    scale: 0.98,
    opacity: 0,
  }),
};

const BannerSlider = ({ slides, bgImage }: BannerSliderProps) => {
  const [[page, direction], setPage] = useState([0, 0]);
  const currentIndex = ((page % slides.length) + slides.length) % slides.length;

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      paginate(1);
    }, 5000);
    return () => clearInterval(timer);
  }, [page]);

  return (
    <div className="relative z-0 w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-2xl mx-auto">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 transition-opacity duration-700" />

      {/* Subtle overlay to pull the background further back visually */}
      <div className="absolute inset-0 bg-black/10" />

      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{
          maskImage: "linear-gradient(to top, black 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 100%)",
        }}
      />

      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={page}
          custom={direction}
          variants={bannerVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 120, damping: 20 },
            scale: { duration: 0.4 },
            opacity: { duration: 0.3 },
          }}
          className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 gap-3"
        >
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h3 className="text-white font-bold text-2xl md:text-4xl tracking-tight drop-shadow-lg">
              {slides[currentIndex].title}
            </h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <p className="text-white/80 text-xs md:text-sm max-w-sm leading-relaxed drop-shadow-md">
              {slides[currentIndex].description}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex items-center gap-4 mt-2"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => slides[currentIndex].onClick?.()}
              className="bg-white/20 backdrop-blur-xl border border-white/30 text-white text-[10px] md:text-xs px-6 py-3 rounded-xl font-black tracking-widest uppercase hover:bg-white/30 transition-all w-fit shadow-xl"
            >
              {slides[currentIndex].buttonText}
            </motion.button>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-6 right-6 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setPage([i, i > currentIndex ? 1 : -1])}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default BannerSlider;