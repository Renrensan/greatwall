"use client";

import { useState } from "react";
import { SidePanel } from "@/marketing-components/SidePanel";
import { cn } from "@/lib/utils";
import DecryptedText from "@/marketing-components/DecryptedText";

export function AboutVideoPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const handleIsOpen = () => {
    setIsOpen(!isOpen);
  };

  const renderOpenButton = (handleToggle: () => void) => (
    <div
      className={cn(
        "flex items-center w-full justify-start pr-4 md:pl-4 py-1 md:py-1",
        isOpen ? "pr-3" : "",
      )}
    >
      <p className="text-xl font-black tracking-tight text-gray-900 sm:text-3xl">
        <span className="bg-linear-to-t from-neutral-200 to-stone-300 bg-clip-text font-bold text-transparent sm:text-6xl">
          {isOpen ? "Paradapp" : "Intro"}
        </span>
      </p>
      <button
        className="rounded-full bg-white text-black ml-4 font-bold transition-all hover:bg-neutral-200"
        onClick={handleToggle}
      >
        <DecryptedText
          text={isOpen ? "Close Panel" : "Open"}
          animateOn="hover"
          revealDirection="center"
          speed={50}
          maxIterations={10}
          sequential={true}
          parentClassName="px-6 py-2 block cursor-pointer"
        />
      </button>
    </div>
  );

  return (
    <div className="fixed bottom-8 left-0 z-40 w-full max-w-[95vw] md:max-w-xl pointer-events-none">
      <div className="pointer-events-auto">
        <SidePanel
          panelOpen={isOpen}
          handlePanelOpen={handleIsOpen}
          renderButton={renderOpenButton}
          className="shadow-2xl border border-neutral-800/50 backdrop-blur-xl"
        >
          <div className="p-4 md:p-6 w-full">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-neutral-800 bg-black shadow-inner">
              <iframe
                src="https://www.youtube.com/embed/GmQoQEoSa_A?start=6"
                title="Paradapp Overview"
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="mt-4 px-2">
              <h3 className="text-xl font-bold text-white">
                Hedera Official: Deep Dive
              </h3>
              <p className="text-neutral-400 text-sm mt-1">
                Learn how Paradapp leverages the fastest network for your dApps.
              </p>
            </div>
          </div>
        </SidePanel>
      </div>
    </div>
  );
}
