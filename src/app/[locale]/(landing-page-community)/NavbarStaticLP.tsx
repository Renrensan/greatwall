"use client";

import { useEffect, useRef, useState } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import cryptosiastLogoBlack from "@/assets/cryptosiast-logo-black.png";
import cryptosiastLogoWhite from "@/assets/cryptosiast-logo-white.png";
import Image from "next/image";
import Link from "next/link";
import { FiMenu } from "react-icons/fi";
import { FaCheckCircle } from "react-icons/fa";
import { DynamicConnectButton, useNetwork, SupportedChain, SUPPORTED_CHAINS } from "@/app/network-provider";
import { Icon } from "@iconify/react";
import ButtonContrast from "@/subcomponents/ButtonContrast";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import { useHederaWallet } from "@/components/hedera/hedera-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { usePolkadotWallet } from "@/components/polkadot/polkadot-provider";
import { useTronWallet } from "@/components/tron/tron-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { AnimatedModalNavbar } from "@/subcomponents/AnimatedModalNavbar";

interface NavbarStaticLPProps {
  forceShow?: boolean;
}

function NavbarStaticLP({ forceShow = false }: NavbarStaticLPProps = {}) {
  const t = useTranslations("All");
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const { locale, app } = useParams<{
    locale: string;
    network: string;
    app: string;
  }>();

  const pathname = usePathname();
  const params = useSearchParams();
  const [globalPreferencesOpen, setGlobalPreferencesOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const globalPreferenceRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<HTMLDivElement>(null);

  const { selectedChain, setSelectedChain } = useNetwork();

  const bitcoinNetwork = useBitcoinWallet();
  const hederaNetwork = useHederaWallet();
  const ethereumNetwork = useEthereumWallet();
  const solanaNetwork = useSolanaWallet();
  const polkadotNetwork = usePolkadotWallet();
  const tronNetwork = useTronWallet();
  const hyperliquidNetwork = useHyperliquidWallet();
  const robinhoodNetwork = useRobinhoodWallet();
  const baseNetwork = useBaseWallet();
  const arbitrumNetwork = useArbitrumWallet();

  const networkOptions: { key: SupportedChain; name: string; value: any }[] = [
    { key: "polkadot", name: polkadotNetwork.networkName, value: polkadotNetwork.networkLogo },
    { key: "bitcoin", name: bitcoinNetwork.networkName, value: bitcoinNetwork.networkLogo },
    { key: "hedera", name: hederaNetwork.networkName, value: hederaNetwork.networkLogo },
    { key: "ethereum", name: ethereumNetwork.networkName, value: ethereumNetwork.networkLogo },
    { key: "solana", name: solanaNetwork.networkName, value: solanaNetwork.networkLogo },
    { key: "tron", name: tronNetwork.networkName, value: tronNetwork.networkLogo },
    { key: "hyperliquid", name: hyperliquidNetwork.networkName, value: hyperliquidNetwork.networkLogo },
    { key: "robinhood", name: robinhoodNetwork.networkName, value: robinhoodNetwork.networkLogo },
    { key: "base", name: baseNetwork.networkName, value: baseNetwork.networkLogo },
    { key: "arbitrum", name: arbitrumNetwork.networkName, value: arbitrumNetwork.networkLogo },
  ];

  useEffect(() => {
    if (!app) return;

    const segments = pathname.split("/");
    const chainFromPath = segments[2] as SupportedChain;

    if (SUPPORTED_CHAINS.includes(chainFromPath)) {
      setSelectedChain(chainFromPath);
    }
  }, [pathname, setSelectedChain, app]);

  function handleLocaleChange(newLocale: string) {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    const newPath = segments.join("/") + (params ? `?${params}` : "");
    router.push(newPath, { scroll: false });
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        (!langRef.current || !langRef.current.contains(target)) &&
        (!walletRef.current || !walletRef.current.contains(target)) &&
        (!globalPreferenceRef.current ||
          !globalPreferenceRef.current.contains(target)) &&
        (!networkRef.current || !networkRef.current.contains(target))
      ) {
        setWalletOpen(false);
        setGlobalPreferencesOpen(false);
        setNetworkOpen(false);
        setLanguageOpen(false);
        setThemeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAbout= () => {
   router.push(`/${locale}/about`)
  };

  const handleNetworkChange = (chain: SupportedChain) => {
    setSelectedChain(chain);
    const segments = pathname.split("/");
    if (app) {
      if (segments.length >= 3) {
        segments[2] = chain;
        const newPath = segments.join("/") + (params ? `?${params}` : "");
        router.push(newPath, { scroll: false });
      }
    }

    setNetworkOpen(false);
  };

  const isTransactionDetailsPage =
    pathname.includes("/convert/transaction/") ||
    pathname.includes("/vault/transaction/");

  if (isTransactionDetailsPage) {
    return null;
  }

  return (
    <>
      {!app && !forceShow ? null : (
        <nav className="fixed z-20 w-full mt-5 left-0  px-4">
          <div className="flex items-center justify-between py-4">
            <Link 
              href={selectedChain ? `/${locale}/${selectedChain}/vault/buy` : `/${locale}`} 
              className="flex justify-start"
            >
        
              <div className="flex gap-2 justify-start items-center">
                <Image
                  src={cryptosiastLogoBlack}
                  alt="CryptosiastDAO"
                  className="w-auto h-7 sm:h-8 block dark:hidden object-contain"
                />
                <Image
                  src={cryptosiastLogoWhite}
                  alt="CryptosiastDAO"
                  className="w-auto h-7 sm:h-8 hidden dark:block object-contain"
                />
                <p className="text-lg font-black sm:text-lg">CryptosiastDAO Bali</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <>
                <div ref={walletRef} className="flex items-center">
                  <DynamicConnectButton
                    isOpen={walletOpen}
                    setIsOpen={(open: boolean) => {
                      setWalletOpen(open);
                      if (open) {
                        setGlobalPreferencesOpen(false);
                        setNetworkOpen(false);
                      }
                    }}
                  />
                </div>

                <div ref={networkRef} className="relative">
                  <button
                    onClick={() => {
                      setNetworkOpen(!networkOpen);
                      setGlobalPreferencesOpen(false);

                      setWalletOpen(false);
                    }}
                    className={`p-2 cursor-pointer shadow-buttonNav ${selectedChain === "base" ? "hover:bg-[#0052FF]/10" : `hover:bg-${selectedChain}/10`} rounded-full glass-card text-base`}
                  >
                    <Image
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                      src={
                        networkOptions.find(
                          (a) => a.key === selectedChain,
                        )?.value!
                      }
                      alt={selectedChain}
                    />
                  </button>


      <AnimatedModalNavbar
        isOpen={networkOpen}
        onClose={() => setNetworkOpen(false)}
        maxWidthClass="lg:w-[300px]" 
      >
        {/* Main Content Body */}
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">{t("text240")}</h2>
            <p className="text-[12px] opacity-70">{t("text241")}</p>
          </div>

          <div className="flex flex-col gap-3 pb-2">
            {networkOptions.map((network) => {
              const networkKey = network.key;
              const isSelected = selectedChain === networkKey;

              return (
                <button
                  key={networkKey}
                  type="button"
                  onClick={() => {
                    handleNetworkChange(networkKey);
                    setNetworkOpen(false); 
                  }}
                  className={`w-full text-left cursor-pointer transition-all duration-200 p-3 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                    isSelected
                      ? "border-black/20 dark:border-white/30 bg-black/5 dark:bg-white/10"
                      : "border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={network.value}
                      alt={network.name}
                      className="w-8 h-8 object-contain shrink-0"
                    />
                    <span className={`font-bold lg:text-sm ${isSelected ? "" : "opacity-80"}`}>
                      {network.name}
                    </span>
                  </div>
                  {isSelected && (
                    <FaCheckCircle className="text-[18px] text-green-500 dark:text-green-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile-Only Close Button Footer */}
        <div className="px-6 py-5 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212] block lg:hidden">
          <div className="flex justify-center w-full">
             <div className="w-full">
               <ButtonContrast
                 buttonText={t("text22")}
                 onClick={() => setNetworkOpen(false)}
               />
             </div>
          </div>
        </div>
      </AnimatedModalNavbar>
                </div>

               <div ref={globalPreferenceRef} className="relative">
  {/* Trigger Button */}
  <button
    onClick={() => {
      setGlobalPreferencesOpen(!globalPreferencesOpen);
      setWalletOpen(false);
      setNetworkOpen(false);
    }}
    className={`p-2 cursor-pointer shadow-buttonNav ${selectedChain === "base" ? "hover:bg-[#0052FF]/10" : `hover:bg-${selectedChain}/10`} rounded-full glass-card text-base`}
  >
    <FiMenu
      className={`text-sm sm:text-lg ${
        selectedChain == "hedera" ? "text-black dark:text-white" : (selectedChain === "base" ? "text-[#0052FF]" : `text-${selectedChain}`)
      }`}
    />
  </button>

  {/* --- GLOBAL PREFERENCES MODAL --- */}
  <AnimatedModalNavbar
    isOpen={globalPreferencesOpen}
    onClose={() => setGlobalPreferencesOpen(false)}
    maxWidthClass="lg:w-[280px]"
  >
    <div className="flex flex-col p-6 overflow-y-auto flex-1">
      <div className="flex flex-col gap-1 pb-5">
        <h2 className="text-xl font-bold">{t("text242")}</h2>
        <p className="text-[12px] opacity-70">{t("text243")}</p>
      </div>

      <div className="flex flex-col gap-3 py-2">
        <button
          onClick={() => {
            setGlobalPreferencesOpen(false);
            setLanguageOpen(true);
          }}
          className="w-full text-left cursor-pointer p-3 border border-black/5 dark:border-white/10 rounded-xl bgBox glass-card hover:bg-black/5 dark:hover:bg-white/10"
        >
          <p className="font-bold lg:text-sm">{t("text244")}</p>
        </button>

        <button
          onClick={() => {
            setGlobalPreferencesOpen(false);
            setThemeOpen(true);
          }}
          className="w-full text-left cursor-pointer p-3 border border-black/5 dark:border-white/10 rounded-xl bgBox glass-card hover:bg-black/5 dark:hover:bg-white/10"
        >
          <p className="font-bold lg:text-sm">{t("text245")}</p>
        </button>

        <button
          onClick={() => {
            handleAbout();
            setGlobalPreferencesOpen(false);
          }}
          className="w-full text-left cursor-pointer p-3 border border-black/5 dark:border-white/10 rounded-xl bgBox glass-card hover:bg-black/5 dark:hover:bg-white/10"
        >
          <p className="font-bold lg:text-sm">{t("text204")}</p>
        </button>
      </div>
    </div>

    {/* Mobile-Only Footer */}
    <div className="px-6 py-5 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212] block lg:hidden">
      <ButtonContrast buttonText={t("text22")} onClick={() => setGlobalPreferencesOpen(false)} />
    </div>
  </AnimatedModalNavbar>

  {/* --- LANGUAGE SELECTION MODAL --- */}
  <AnimatedModalNavbar
    isOpen={languageOpen}
    onClose={() => setLanguageOpen(false)}
    maxWidthClass="lg:w-[280px]"
  >
    <div className="flex flex-col p-6 overflow-y-auto flex-1">
      <div className="flex flex-col gap-1 pb-5">
        <h2 className="text-xl font-bold">{t("text244")}</h2>
        <p className="text-[12px] opacity-70">{t("text246")}</p>
      </div>

      <div className="flex flex-col gap-3 py-2">
        {[
          { id: "id", label: "Bahasa", icon: "emojione:flag-for-indonesia" },
          { id: "en", label: "English", icon: "emojione:flag-for-us-outlying-islands" },
        ].map((lang) => {
          const isActive = locale === lang.id;
          return (
            <button
              key={lang.id}
              type="button"
              onClick={() => {
                handleLocaleChange(lang.id);
                setLanguageOpen(false);
              }}
              className={`w-full text-left cursor-pointer p-3 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card transition-all ${
                isActive
                  ? "border-black/20 dark:border-white/30 bg-black/5 dark:bg-white/10"
                  : "border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon icon={lang.icon} className="text-2xl shrink-0" />
                <span className="font-bold lg:text-sm">{lang.label}</span>
              </div>
              {isActive && <FaCheckCircle className="text-[18px] text-green-500 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>

    <div className="px-6 py-5 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212] block lg:hidden">
      <ButtonContrast buttonText={t("text22")} onClick={() => setLanguageOpen(false)} />
    </div>
  </AnimatedModalNavbar>

  {/* --- THEME SELECTION MODAL --- */}
  <AnimatedModalNavbar
    isOpen={themeOpen}
    onClose={() => setThemeOpen(false)}
    maxWidthClass="lg:w-[280px]"
  >
    <div className="flex flex-col p-6 overflow-y-auto flex-1">
      <div className="flex flex-col gap-1 pb-5">
        <h2 className="text-xl font-bold">{t("text245")}</h2>
        <p className="text-[12px] opacity-70">{t("text247")}</p>
      </div>

      <div className="flex flex-col gap-3 py-2">
        {["light", "dark", "system"].map((mode) => {
          const isActive = theme === mode;
          return (
            <button
              key={mode}
              onClick={() => {
                setTheme(mode);
                setThemeOpen(false);
              }}
              className={`w-full text-left cursor-pointer p-3 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card capitalize transition-all ${
                isActive
                  ? "border-black/20 dark:border-white/30 bg-black/5 dark:bg-white/10"
                  : "border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              <span className="font-bold lg:text-sm">{mode}</span>
              {isActive && <FaCheckCircle className="text-[18px] text-green-500 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>

    <div className="px-6 py-5 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212] block lg:hidden">
      <ButtonContrast buttonText={t("text22")} onClick={() => setThemeOpen(false)} />
    </div>
  </AnimatedModalNavbar>
</div>
              </>
            </div>
          </div>
        </nav>
      )}
    </>
  );
}

export default NavbarStaticLP;
