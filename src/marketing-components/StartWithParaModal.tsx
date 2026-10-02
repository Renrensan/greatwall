"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { AnimatedModal } from "@/subcomponents/AnimatedModal";
import { SupportedChain, savePreferredChain } from "@/app/network-provider";
import { NETWORK_CONFIGS, PAGE_STRINGS } from "@/app/[locale]/(marketing-root)/(marketing)/(landing)/start-with-para/content";
import NetworkCarousel from "@/app/[locale]/(marketing-root)/(marketing)/(landing)/start-with-para/NetworkCarousel";
import NetworkIndicators from "@/app/[locale]/(marketing-root)/(marketing)/(landing)/start-with-para/NetworkIndicators";
import MascotPanel from "@/app/[locale]/(marketing-root)/(marketing)/(landing)/start-with-para/MascotPanel";
import MobileMascot from "@/app/[locale]/(marketing-root)/(marketing)/(landing)/start-with-para/MobileMascot";

interface StartWithParaModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: "en" | "id";
  targetPath?: string;
}

export default function StartWithParaModal({
  isOpen,
  onClose,
  locale = "en",
  targetPath = "/vault/buy",
}: StartWithParaModalProps) {
  const [selectedKey, setSelectedKey] = useState<string>("solana");

  const strings = PAGE_STRINGS[locale] || PAGE_STRINGS.en;
  const config =
    NETWORK_CONFIGS.find((c) => c.key === selectedKey) || NETWORK_CONFIGS[0];
  const activeIndex = NETWORK_CONFIGS.findIndex((c) => c.key === selectedKey);

  const cleanPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  const targetHref = `/${locale}/${selectedKey}${cleanPath}`;

  const handleClick = () => {
    savePreferredChain(selectedKey as SupportedChain);
    onClose();
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidthClass="lg:max-w-3xl lg:w-auto" overflowVisible={true}>
      <>
        {/* Mobile mascot: exact same mascot as in start-with-para page */}
        <MobileMascot locale={locale} className="left-[-10px] -top-20" />

        <div className="p-6 sm:p-8 flex flex-col items-center relative text-black dark:text-white pb-8 sm:pb-8">
          <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
            {/* Network Selection Column */}
            <div className="w-full max-w-sm flex flex-col items-center gap-4">
              <div className="text-center pt-2 flex flex-col items-center">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {strings.welcome}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {strings.subtitle}
                </p>
              </div>

              <NetworkCarousel
                configs={NETWORK_CONFIGS}
                activeIndex={activeIndex >= 0 ? activeIndex : 0}
                onIndexChange={(index) => setSelectedKey(NETWORK_CONFIGS[index].key)}
                locale={locale}
              />

              <NetworkIndicators
                configs={NETWORK_CONFIGS}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
              />

              <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-1.5 mt-2">
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
              </div>
            </div>

            {/* Desktop Mascot Column */}
            <MascotPanel
              showBubble={true}
              locale={locale}
              className="hidden lg:flex"
              mascotClassName="w-auto h-72 object-contain"
            />
          </div>
        </div>
      </>
    </AnimatedModal>
  );
}
