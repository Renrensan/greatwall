"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { NETWORK_CONFIGS } from "./content";
import NetworkCarousel from "./NetworkCarousel";
import NetworkIndicators from "./NetworkIndicators";
import StartWithParaCTA from "./StartWithParaCTA";
import MascotPanel, { CenteredMascot } from "./MascotPanel";
import MobileMascot from "./MobileMascot";

const VALID_KEYS = NETWORK_CONFIGS.map((c) => c.key);
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

type IntroPhase = "mascot" | "layout" | "bubble" | "done";

export default function StartWithParaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = ((params?.locale as string) || "en") as "en" | "id";
  const prefersReduced = useReducedMotion();

  const [selectedKey, setSelectedKey] = useState<string>("solana");
  const [introPhase, setIntroPhase] = useState<IntroPhase>(() => {
    if (typeof window === "undefined") return "done";
    if (window.matchMedia("(max-width: 1023px)").matches) return "done";
    return "mascot";
  });

  const activeIndex = NETWORK_CONFIGS.findIndex((c) => c.key === selectedKey);

  useEffect(() => {
    const networkQuery = searchParams.get("network")?.toLowerCase();
    if (networkQuery && VALID_KEYS.includes(networkQuery)) {
      setSelectedKey(networkQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (prefersReduced) {
      setIntroPhase("done");
      return;
    }

    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) return;

    setIntroPhase("mascot");
    const t1 = setTimeout(() => setIntroPhase("layout"), 600);
    const t2 = setTimeout(() => setIntroPhase("bubble"), 1200);
    const t3 = setTimeout(() => setIntroPhase("done"), 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [prefersReduced]);

  const handleIndexChange = (index: number) => {
    setSelectedKey(NETWORK_CONFIGS[index].key);
  };

  const showCard = introPhase !== "mascot";
  const showMascotPanel = introPhase !== "mascot";
  const showBubble = introPhase === "bubble" || introPhase === "done";

  return (
    <div className="relative min-h-[calc(100dvh-8rem)] flex flex-col items-center justify-center px-4 pt-32 pb-8 overflow-hidden">
      <LayoutGroup>
        {introPhase === "mascot" && <CenteredMascot />}

        <div className="relative z-10 w-full max-w-md lg:max-w-5xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="relative w-full max-w-md">
            <MobileMascot locale={locale} className="left-[-10px] -top-20" />
            <motion.div
              className="w-full max-w-md glass-card rounded-3xl px-4 py-6 flex flex-col items-center gap-5"
              initial={{ opacity: 0, y: 12 }}
              animate={
                showCard
                  ? { opacity: 1, x: 0, y: 0 }
                  : { opacity: 0, x: -32, y: 0 }
              }
              transition={{ duration: 0.55, ease: EASE_OUT }}
            >
              <NetworkCarousel
                configs={NETWORK_CONFIGS}
                activeIndex={activeIndex >= 0 ? activeIndex : 0}
                onIndexChange={handleIndexChange}
                locale={locale}
              />
              <NetworkIndicators
                configs={NETWORK_CONFIGS}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
              />
              <StartWithParaCTA selectedKey={selectedKey} locale={locale} />
            </motion.div>
          </div>

          {showMascotPanel ? (
            <MascotPanel showBubble={showBubble} locale={locale} />
          ) : (
            <div className="hidden lg:block w-[360px] flex-shrink-0" aria-hidden />
          )}
        </div>
      </LayoutGroup>
    </div>
  );
}
