"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { NetworkConfig } from "./content";

interface NetworkIndicatorsProps {
  configs: NetworkConfig[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
}

export default function NetworkIndicators({
  configs,
  selectedKey,
  onSelectKey,
}: NetworkIndicatorsProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedKey]);

  return (
    <div
      className="flex overflow-x-auto snap-x snap-mandatory gap-2.5 w-full px-1 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      role="tablist"
      aria-label="Select network"
    >
      {configs.map((config) => {
        const isSelected = config.key === selectedKey;
        return (
          <button
            key={config.key}
            ref={isSelected ? selectedRef : null}
            role="tab"
            aria-selected={isSelected}
            aria-label={config.name}
            onClick={() => onSelectKey(config.key)}
            className={`relative flex-none snap-center inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer select-none shadow-md glass-card ${
              isSelected
                ? "border-2 border-black/40 dark:border-white/60 ring-2 ring-black/10 dark:ring-white/20 bg-black/10 dark:bg-white/15"
                : "border border-black/10 dark:border-white/10 opacity-70 hover:opacity-100"
            }`}
            style={{ width: 40, height: 40 }}
          >
            {config.icon ? (
              <Icon
                icon={config.icon}
                className={`text-xl transition-all ${
                  isSelected ? `scale-110 opacity-100 ${config.colorClass}` : `${config.colorClass} opacity-60 hover:opacity-90`
                }`}
              />
            ) : (
              <Image
                src={config.image}
                alt={config.name}
                width={20}
                height={20}
                className={`transition-all object-contain ${isSelected ? "scale-110 opacity-100" : "opacity-60 hover:opacity-90"}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
