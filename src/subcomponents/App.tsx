"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const DappHub = dynamic(() => import("./DappHub"), { ssr: false });
const Vault = dynamic(() => import("./Vault"), { ssr: false });
const Convert = dynamic(() => import("./Convert"), { ssr: false });
const DappHolder = dynamic(() => import("./DappHolder"), { ssr: false });
import { BsSafe2 } from "react-icons/bs";
import { RiTokenSwapLine, RiAppsLine, RiChatAiLine } from "react-icons/ri";
import { useTranslations } from "next-intl";
import { useChatbotContext } from "@/components/integrator/para-ai/chatbot-context";

const sectionMap: Record<string, number> = {
  vault: 0,
  convert: 1,
  dapphub: 2,
  dapp: 3,
};

const reverseSectionMap: Record<number, string> = {
  0: "vault",
  1: "convert",
  2: "dapphub",
  3: "dapp",
};

const defaultSectionByApp: Record<string, string> = {
  vault: "buy",
  convert: "create",
  dapphub: "trending",
};

function App() {
  const router = useRouter();
  const t = useTranslations("All");

  const { locale, network: chain, app, section } = useParams<{
    locale: string;
    network: string;
    app: string;
    section: string; 
  }>();

  const [isReady, setIsReady] = useState(false);

  const activeComponent = useMemo(() => {
    return sectionMap[app] ?? 0;
  }, [app]);

  useEffect(() => {
    if (chain && app) {
      setIsReady(true);
    }
  }, [chain, app]);

  const chatbotCtx = useChatbotContext();
  const isNavVisible = activeComponent !== 3;

  // Suppress Chatbot's own floating pill while this nav's own "Ask AI" tab is visible, so
  // there's only ever one trigger on screen — restore it the moment the nav itself isn't
  // rendered (activeComponent === 3) or this page unmounts.
  useEffect(() => {
    if (!chatbotCtx) return;
    chatbotCtx.setHideFloatingTrigger(isNavVisible);
    return () => chatbotCtx.setHideFloatingTrigger(false);
  }, [isNavVisible, chatbotCtx?.setHideFloatingTrigger]);


  const handleTabClick = (index: number) => {
    const appName = reverseSectionMap[index];
    const defaultSection =
      defaultSectionByApp[appName] ?? defaultSectionByApp["vault"];

    router.push(`/${locale}/${chain}/${appName}/${defaultSection}`, {
      scroll: false,
    });
  };

  return (
    <div className="2xl:container 2xl:mx-auto flex flex-col gap-7.5 md:gap-15 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 w-full max-w-full lg:max-w-170 mx-auto">
        <div className="flex flex-col gap-12 rounded-xl py-7.5 justify-between w-full max-w-full">
          <div className="">
            {isReady ? (
              <div className="flex flex-col gap-8">
                {activeComponent === 0 && <Vault />}
                {activeComponent === 1 && <Convert />}
                {activeComponent === 2 && <DappHub />}
                {activeComponent === 3 && <DappHolder slug={section} />} 
              </div>
            ) : (
              <div className="px-5 py-6 xl:px-8 rounded-xl shadow-faqBoxShadow animate-pulse h-150" />
            )}

            {activeComponent != 3 && (
              <nav className="fixed w-full px-5 -translate-x-1/2 bottom-4 lg:bottom-1 lg:max-w-2xl left-1/2 lg:mb-10 z-10">
                <div className="px-10 glass-card shadow rounded-full border-black/10 dark:border-white/10 border">
                  <div className="flex justify-between py-3 rounded-full">
                    {[
                      { label: t("text8"), id: 0, icon: BsSafe2 },
                      { label: t("text25"), id: 1, icon: RiTokenSwapLine },
                      { label: "dApp Hub", id: 2, icon: RiAppsLine },
                    ].map((tab) => {
                      const isActive = activeComponent === tab.id || (tab.id === 2 && activeComponent === 3);
                      const Icon = tab.icon;

                      const activeBgClass =
                        (chain === "hedera" || chain === "polkadot")
                          ? "bg-black dark:bg-white"
                          : chain === "base"
                            ? "bg-[#0052FF]"
                            : `bg-${chain}`;

                      const activeIconClass =
                        (chain === "hedera" || chain === "polkadot")
                          ? "text-white dark:text-black"
                          : chain === "robinhood"
                            ? "text-black"
                            : "text-white";

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleTabClick(tab.id)}
                          className="flex flex-col items-center w-auto group"
                        >
                          <div
                            className={`p-3 rounded-full transition-all duration-200 ${
                              isActive ? activeBgClass : chain === "base" ? "hover:bg-[#0052FF]/10" : `hover:bg-${chain}/10`
                            }`}
                          >
                            <Icon
                              className={`text-xl transition-colors ${
                                isActive ? activeIconClass : ""
                              }`}
                            />
                          </div>
                          <span className=" text-xs mt-1 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                            {tab.label}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => chatbotCtx?.setIsOpen(true)}
                      className="flex flex-col items-center w-auto group"
                    >
                      <div className={`p-3 rounded-full transition-all duration-200 ${chain === "base" ? "hover:bg-[#0052FF]/10" : `hover:bg-${chain}/10`}`}>
                        <RiChatAiLine className="text-xl transition-colors" />
                      </div>
                      <span className=" text-xs mt-1 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                        ParaAI
                      </span>
                    </button>
                  </div>
                </div>
              </nav>
            )}
          
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
