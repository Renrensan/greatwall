"use client";

import Link from "next/link";
import { SupportedChain, savePreferredChain } from "@/app/network-provider";
import { NETWORK_CONFIGS, PAGE_STRINGS } from "./content";
import { Icon } from "@iconify/react";

interface StartWithParaCTAProps {
  selectedKey: string;
  locale: "en" | "id";
}

export default function StartWithParaCTA({
  selectedKey,
  locale,
}: StartWithParaCTAProps) {
  const strings = PAGE_STRINGS[locale] || PAGE_STRINGS.en;
  const config =
    NETWORK_CONFIGS.find((c) => c.key === selectedKey) || NETWORK_CONFIGS[0];

  const targetHref = `/${locale}/${selectedKey}/vault/buy`;

  const handleClick = () => {
    savePreferredChain(selectedKey as SupportedChain);
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-1.5">
      <Link
        href={targetHref}
        onClick={handleClick}
        className="w-full py-3.5 px-6 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-bold text-sm sm:text-base shadow-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
      >
        <span>
          {strings.cta} {config.name}
        </span>
        <Icon
          icon="solar:arrow-right-linear"
          className="text-lg group-hover:translate-x-1 transition-transform"
        />
      </Link>

      <span className="text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500 font-medium tracking-wide pt-4">
        {strings.subCta}
      </span>
    </div>
  );
}
