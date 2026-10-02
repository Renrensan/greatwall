"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import { NetworkConfig } from "./content";

interface NetworkHeroProps {
  config: NetworkConfig;
  locale: "en" | "id";
}

export default function NetworkHero({ config, locale }: NetworkHeroProps) {
  const hook = config.hooks[locale] || config.hooks.en;

  return (
    <div className="relative flex flex-col items-center justify-center text-center px-2 max-w-sm mx-auto select-none">
      {/* Per-network background glow */}
      <div
        className={`absolute inset-0 -z-10 rounded-full blur-3xl pointer-events-none opacity-70`}
      />

      <div className="flex flex-col items-center gap-3">
        {/* Network Large Icon */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          {config.icon ? (
            <Icon
              icon={config.icon}
              width="100%"
              height="100%"
              className={`${config.colorClass} glass-card rounded-full p-4 shadow-lg`}
            />
          ) : (
            <Image
              src={config.image}
              alt={config.name}
              width={112}
              height={112}
              className={`${config.colorClass} glass-card rounded-full p-4 shadow-lg w-full h-full object-contain`}
            />
          )}
        </div>

        {/* Title & Ticker */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {config.name}
          </h1>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded bg-black/5 dark:bg-neutral-800/80 ${config.colorClass}`}
          >
            {config.ticker}
          </span>
        </div>

        {/* Subline */}
        <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 max-w-xs leading-tight">
          {hook.subline}
        </p>
      </div>
    </div>
  );
}
