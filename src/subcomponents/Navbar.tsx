"use client";

import { useEffect, useRef, useState } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { greatwallLogo } from "..";
import Image from "next/image";
import Link from "next/link";
import { FiMoreVertical } from "react-icons/fi";
import { FaCheckCircle } from "react-icons/fa";
import { DynamicConnectButton, useNetwork, SupportedChain, SUPPORTED_CHAINS } from "@/app/network-provider";
import { Icon } from "@iconify/react";
import ButtonContrast from "./ButtonContrast";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useTranslations } from "next-intl";
import { AnimatedModalNavbar } from "./AnimatedModalNavbar";
import { lockPath } from "@/components/integrator/ipow/lockPaths";

interface NavbarProps {
  forceShow?: boolean;
}

function Navbar({ forceShow = false }: NavbarProps = {}) {
  const t = useTranslations("All");
  const router = useRouter();

  const { locale, app, section } = useParams<{
    locale: string;
    network: string;
    app: string;
    section?: string;
  }>();

  const pathname = usePathname();
  const params = useSearchParams();
  const [globalPreferencesOpen, setGlobalPreferencesOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [defaultNetworkOpen, setDefaultNetworkOpen] = useState(false);
  const [networkSearchQuery, setNetworkSearchQuery] = useState("");

  const globalPreferenceRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<HTMLDivElement>(null);

  const { selectedChain, setSelectedChain, preferredChain, setPreferredChain } = useNetwork();

  const bitcoinNetwork = useBitcoinWallet();
  const ethereumNetwork = useEthereumWallet();
  const solanaNetwork = useSolanaWallet();
  const tempoNetwork = useTempoWallet();
  const hyperliquidNetwork = useHyperliquidWallet();
  const robinhoodNetwork = useRobinhoodWallet();
  const baseNetwork = useBaseWallet();
  const arbitrumNetwork = useArbitrumWallet();

  const networkOptions: { key: SupportedChain; name: string; value: any }[] = [
    { key: "bitcoin", name: bitcoinNetwork.networkName, value: bitcoinNetwork.networkLogo },
    { key: "ethereum", name: ethereumNetwork.networkName, value: ethereumNetwork.networkLogo },
    { key: "solana", name: solanaNetwork.networkName, value: solanaNetwork.networkLogo },
    { key: "tempo", name: tempoNetwork.networkName, value: tempoNetwork.networkLogo },
    { key: "hyperliquid", name: hyperliquidNetwork.networkName, value: hyperliquidNetwork.networkLogo },
    { key: "robinhood", name: robinhoodNetwork.networkName, value: robinhoodNetwork.networkLogo },
    { key: "base", name: baseNetwork.networkName, value: baseNetwork.networkLogo },
    { key: "arbitrum", name: arbitrumNetwork.networkName, value: arbitrumNetwork.networkLogo },
  ];

  const filteredNetworkOptions = networkOptions.filter((network) =>
    network.name.toLowerCase().includes(networkSearchQuery.toLowerCase()),
  );

  useEffect(() => {
    if (!app) return;

    const segments = pathname.split("/");
    const chainFromPath = segments[2] as SupportedChain;

    if (SUPPORTED_CHAINS.includes(chainFromPath)) {
      setSelectedChain(chainFromPath);
    }
  }, [pathname, setSelectedChain, app]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        (!walletRef.current || !walletRef.current.contains(target)) &&
        (!globalPreferenceRef.current ||
          !globalPreferenceRef.current.contains(target)) &&
        (!networkRef.current || !networkRef.current.contains(target))
      ) {
        setWalletOpen(false);
        setGlobalPreferencesOpen(false);
        setNetworkOpen(false);
        setDefaultNetworkOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAbout= () => {
   router.push(`/${locale}`)
  };

  const handleNetworkChange = (chain: SupportedChain) => {
    setSelectedChain(chain);
    const segments = pathname.split("/");
    if (app && app !== "dapp") {
      if (segments.length >= 3) {
        segments[2] = chain;
        // `token` names a symbol from the PREVIOUS chain's own token namespace — carrying it
        // across a network switch means the new page tries to resolve a symbol (e.g. "SOL")
        // that's essentially never valid on the destination chain, which left the buy widget
        // stuck looking for a token that could never be found there.
        const carriedParams = new URLSearchParams(params.toString());
        carriedParams.delete("token");
        const query = carriedParams.toString();
        const newPath = segments.join("/") + (query ? `?${query}` : "");
        router.push(newPath, { scroll: false });
      }
    } else {
      router.push(`/${locale}/${chain}/vault/assets`);
    }

    setNetworkOpen(false);
  };

  // Greatwall's sections, by the app and section each opens.
  const chain = selectedChain || "ethereum";
  const navItems: { key: string; label: string; href: string; active: boolean; icon: string }[] = [
    // Minting lives under Explore: a basket is picked there, previewed, and
    // minted on its own page.
    { key: "explore", label: t("navExplore"), href: `/${locale}/${chain}/index`, active: app === "beta" && section !== "create", icon: "solar:layers-minimalistic-bold" },
    { key: "create", label: t("navCreate"), href: `/${locale}/${chain}/index/create`, active: app === "beta" && section === "create", icon: "solar:add-circle-bold" },
    { key: "portfolio", label: t("navPortfolio"), href: `/${locale}/${chain}/vault/assets`, active: app === "vault" || (app === "bridge" && !["lock", "unlock", "send"].includes(section ?? "")), icon: "solar:wallet-bold" },
    { key: "lock", label: t("navLock"), href: lockPath(locale, chain), active: app === "bridge" && ["lock", "unlock", "send"].includes(section ?? ""), icon: "solar:lock-keyhole-bold" },
    { key: "convert", label: t("navConvert"), href: `/${locale}/${chain}/convert/create`, active: app === "convert", icon: "solar:transfer-horizontal-bold" },
    { key: "protocol", label: t("navProtocol"), href: `/${locale}/${chain}/protocol`, active: pathname?.endsWith("/protocol") ?? false, icon: "solar:shield-network-bold" },
  ];

  const navLink = (item: (typeof navItems)[number]) => (
    <Link
      key={item.key}
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      className={`whitespace-nowrap text-[15px] transition-colors ${
        item.active ? "font-semibold text-ink" : "font-normal text-ink/80 hover:text-ink"
      }`}
    >
      {item.label}
    </Link>
  );

  return (
    <>
      {!app && !forceShow ? null : (
        <header className="gw-nav fixed top-0 left-0 z-20 w-full bg-cream border-b border-ink/10">
          <div className="mx-auto flex h-[58px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 md:px-16">
            <div className="flex items-center gap-8 lg:gap-10 min-w-0">
              <Link href={`/${locale}/${chain}/vault/assets`} className="flex items-center gap-2 shrink-0" aria-label="Greatwall">
                <Image src={greatwallLogo} alt="" className="h-[22px] w-auto" priority />
                <span className="hidden md:inline font-wordmark text-[22px] font-semibold leading-none tracking-tight text-ink">Greatwall</span>
              </Link>
              <nav className="hidden md:flex items-center gap-7" aria-label="Main">
                {navItems.map(navLink)}
              </nav>
            </div>

            <div className="flex items-center gap-2">
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
                  type="button"
                  aria-label={t("text240")}
                  onClick={() => {
                    setNetworkOpen(!networkOpen);
                    setGlobalPreferencesOpen(false);
                    setWalletOpen(false);
                  }}
                  className="gw-icon-btn"
                >
                  <Image
                    className="h-[18px] w-[18px] rounded-full"
                    src={networkOptions.find((a) => a.key === selectedChain)?.value ?? networkOptions[1].value}
                    alt={selectedChain}
                  />
                </button>

      <AnimatedModalNavbar
        isOpen={networkOpen}
        onClose={() => {
          setNetworkOpen(false);
          setNetworkSearchQuery("");
        }}
        maxWidthClass="lg:w-[300px]"
      >
        {/* Static header: title, subtitle, search — never scrolls */}
        <div className="flex flex-col gap-3 px-6 pt-6 pb-4">
          <div className="flex flex-col gap-0">
            <h2 className="text-xl font-bold">{t("text240")}</h2>
            <p className="text-[12px] opacity-70">{t("text241")}</p>
          </div>
          <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-md bg-snow border border-sand focus-within:border-stone transition-colors">
            <input
              type="text"
              placeholder={t("text348")}
              value={networkSearchQuery}
              onChange={(e) => setNetworkSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none text-sm font-medium placeholder:text-current/50"
            />
            <Icon icon="mingcute:search-line" className="text-xl text-current pointer-events-none opacity-40 shrink-0" />
          </div>
        </div>

        {/* Only the network list scrolls */}
        <div className="flex flex-col gap-3 px-6 pb-6 max-h-105 overflow-y-auto overscroll-contain custom-scrollbar">
          {filteredNetworkOptions.length === 0 && (
            <p className="text-center text-sm opacity-60 py-4">{t("text349")}</p>
          )}
          {filteredNetworkOptions.map((network) => {
            const networkKey = network.key;
            const isSelected = selectedChain === networkKey;

            return (
              <button
                key={networkKey}
                type="button"
                onClick={() => {
                  handleNetworkChange(networkKey);
                  setNetworkOpen(false);
                  setNetworkSearchQuery("");
                }}
                className="gw-row justify-between"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={network.value}
                    alt={network.name}
                    className="w-6 h-6 object-contain shrink-0 rounded"
                  />
                  <span>
                    {network.name}
                  </span>
                </div>
                {isSelected && (
                  <FaCheckCircle className="text-[18px] text-snow shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile-Only Close Button Footer */}
        <div className="px-6 py-5 border-t border-black/5 bg-white block lg:hidden">
          <div className="flex justify-center w-full">
             <div className="w-full">
               <ButtonContrast
                 buttonText={t("text22")}
                 onClick={() => {
                   setNetworkOpen(false);
                   setNetworkSearchQuery("");
                 }}
               />
             </div>
          </div>
        </div>
      </AnimatedModalNavbar>
              </div>

              <div ref={globalPreferenceRef} className="relative">
                <button
                  type="button"
                  aria-label={t("text242")}
                  onClick={() => {
                    setGlobalPreferencesOpen(!globalPreferencesOpen);
                    setWalletOpen(false);
                    setNetworkOpen(false);
                  }}
                  className="gw-icon-btn"
                >
                  <FiMoreVertical className="text-lg" />
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
            setDefaultNetworkOpen(true);
          }}
          className="gw-row"
        >
          <p>{t("text302")}</p>
        </button>

        <button
          onClick={() => {
            handleAbout();
            setGlobalPreferencesOpen(false);
          }}
          className="gw-row"
        >
          <p>{t("text204")}</p>
        </button>
      </div>
    </div>

    {/* Mobile-Only Footer */}
    <div className="px-6 py-5 border-t border-black/5 bg-white block lg:hidden">
      <ButtonContrast buttonText={t("text22")} onClick={() => setGlobalPreferencesOpen(false)} />
    </div>
  </AnimatedModalNavbar>

  {/* --- DEFAULT NETWORK (SELECT PREFERENCES) MODAL --- */}
  <AnimatedModalNavbar
    isOpen={defaultNetworkOpen}
    onClose={() => setDefaultNetworkOpen(false)}
    maxWidthClass="lg:w-[300px]"
  >
    <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1">
      <div className="flex flex-col gap-0 pb-5">
        <h2 className="text-xl font-bold">{t("text303")}</h2>
        <p className="text-[12px] opacity-70">{t("text304")}</p>
      </div>

      <div className="flex flex-col gap-3 pb-2">
        {networkOptions.map((network) => {
          const networkKey = network.key;
          const isSelected = preferredChain === networkKey;

          return (
            <button
              key={networkKey}
              type="button"
              onClick={() => {
                setPreferredChain(networkKey);
                setDefaultNetworkOpen(false);
              }}
              className="gw-row justify-between"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={network.value}
                  alt={network.name}
                  className="w-6 h-6 object-contain shrink-0 rounded"
                />
                <span>
                  {network.name}
                </span>
              </div>
              {isSelected && (
                <FaCheckCircle className="text-[18px] text-snow shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>

    <div className="px-6 py-5 border-t border-black/5 bg-white block lg:hidden">
      <ButtonContrast buttonText={t("text22")} onClick={() => setDefaultNetworkOpen(false)} />
    </div>
  </AnimatedModalNavbar>
              </div>
            </div>
          </div>
        </header>
      )}
      {(app || forceShow) && (
        // On phones the sections are a floating bar at the bottom, as the
        // desktop's menu; the preferences stay under the header's dots.
        <nav
          className="md:hidden fixed inset-x-0 bottom-0 z-30 px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
          aria-label="Main"
        >
          <div className="gw-glass mx-auto max-w-md flex items-center justify-between gap-1 rounded-2xl p-1.5">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                aria-label={item.label}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-12 rounded-xl transition-colors ${item.active ? "bg-ink text-snow" : "text-ink/80 hover:bg-black/5"}`}
              >
                <Icon icon={item.icon} className="text-[22px]" />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}

export default Navbar;
