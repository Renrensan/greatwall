"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BannerSlider, { SlideItem } from "./BannerSlider";
import DappList from "./DappList";
import DappDetail from "./DappDetail";
import DappHubComingSoon from "./DappHubComingSoon";
import DappLabComingSoon from "./DappLabComingSoon";


import { SupportedChain, useNetwork } from "@/app/network-provider";
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
import { useTranslations } from "next-intl";
import { bgdAppEthereum, bgdAppHedera, bgdAppSolana } from "..";

const DappStore = () => {
  const t = useTranslations("All");
  const { network, locale } = useParams<{
    network: SupportedChain;
    locale: string;
  }>();

  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDappId = searchParams.get("id")
    ? Number(searchParams.get("id"))
    : null;

  const setSelectedDappId = (id: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("id", id.toString());
    } else {
      params.delete("id");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const {
    bitcoinMainnet,
    hederaMainnet,
    ethereumMainnet,
    solanaMainnet,
    polkadotMainnet,
    tronMainnet,
    hyperliquidMainnet,
    robinhoodMainnet,
    baseMainnet,
    arbitrumMainnet,
  } = useNetwork();

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

  const getNetworkBg = () => {
    switch (network) {
      case "ethereum": return bgdAppEthereum;
      case "hedera": return bgdAppHedera;
      case "solana":
      default: return bgdAppSolana;
    }
  };

  let dappList: any[] | null,
    toggleFavoriteDapp: (id: number) => void,
    isConnected: boolean;

  if (network === "bitcoin") {
    dappList = bitcoinNetwork.dappList;
    toggleFavoriteDapp = bitcoinNetwork.toggleFavoriteDapp;
    isConnected = bitcoinNetwork.connected;
  } else if (network === "hedera") {
    dappList = hederaNetwork.dappList;
    toggleFavoriteDapp = hederaNetwork.toggleFavoriteDapp;
    isConnected = hederaNetwork.connected;
  } else if (network === "ethereum") {
    dappList = ethereumNetwork.dappList;
    toggleFavoriteDapp = ethereumNetwork.toggleFavoriteDapp;
    isConnected = ethereumNetwork.connected;
  } else if (network === "polkadot") {
    dappList = polkadotNetwork.dappList;
    toggleFavoriteDapp = polkadotNetwork.toggleFavoriteDapp;
    isConnected = polkadotNetwork.connected;
  } else if (network === "tron") {
    dappList = tronNetwork.dappList;
    toggleFavoriteDapp = tronNetwork.toggleFavoriteDapp;
    isConnected = tronNetwork.connected;
  } else if (network === "hyperliquid") {
    dappList = hyperliquidNetwork.dappList;
    toggleFavoriteDapp = hyperliquidNetwork.toggleFavoriteDapp;
    isConnected = hyperliquidNetwork.connected;
  } else if (network === "robinhood") {
    dappList = robinhoodNetwork.dappList;
    toggleFavoriteDapp = robinhoodNetwork.toggleFavoriteDapp;
    isConnected = robinhoodNetwork.connected;
  } else if (network === "base") {
    dappList = baseNetwork.dappList;
    toggleFavoriteDapp = baseNetwork.toggleFavoriteDapp;
    isConnected = baseNetwork.connected;
  } else if (network === "arbitrum") {
    dappList = arbitrumNetwork.dappList;
    toggleFavoriteDapp = arbitrumNetwork.toggleFavoriteDapp;
    isConnected = arbitrumNetwork.connected;
  } else {
    dappList = solanaNetwork.dappList;
    toggleFavoriteDapp = solanaNetwork.toggleFavoriteDapp;
    isConnected = solanaNetwork.connected;
  }

  const [searchQuery, setSearchQuery] = useState("");


  const isMainnet = useMemo(() => {
    switch (network) {
      case "bitcoin": return bitcoinMainnet;
      case "hedera": return hederaMainnet;
      case "ethereum": return ethereumMainnet;
      case "solana": return solanaMainnet;
      case "polkadot": return polkadotMainnet;
      case "tron": return tronMainnet;
      case "hyperliquid": return hyperliquidMainnet;
      case "robinhood": return robinhoodMainnet;
      case "base": return baseMainnet;
      case "arbitrum": return arbitrumMainnet;
      default: return false;
    }
  }, [
    network,
    bitcoinMainnet,
    hederaMainnet,
    ethereumMainnet,
    solanaMainnet,
    polkadotMainnet,
    tronMainnet,
    hyperliquidMainnet,
    robinhoodMainnet,
    baseMainnet,
    arbitrumMainnet,
  ]);

  const liveSelectedDapp = useMemo(() => {
    if (!dappList || selectedDappId === null) return null;
    const dapp = dappList.find((d: any) => d.id === selectedDappId);
    if (!dapp) return null;

    return {
      ...dapp,
      name: locale === "id" && dapp.name_idn ? dapp.name_idn : dapp.name,
      description:
        locale === "id" && dapp.description_idn
          ? dapp.description_idn
          : dapp.description,
      sections: dapp.sections?.map((s: any) => ({
        ...s,
        title: locale === "id" && s.title_idn ? s.title_idn : s.title,
        description:
          locale === "id" && s.description_idn
            ? s.description_idn
            : s.description,
      })),
      features: dapp.features?.map((f: any) => ({
        ...f,
        title: locale === "id" && f.title_idn ? f.title_idn : f.title,
        description:
          locale === "id" && f.description_idn
            ? f.description_idn
            : f.description,
      })),
    };
  }, [dappList, selectedDappId, locale]);


  if (!isMainnet) {
    return <DappLabComingSoon />;
  }

  if (dappList === null) {
    return (
      <div className="bgBox glass-card">
        <div className="flex flex-col justify-center gap-4 pb-6 text-center px-4 pt-6">
          <h2 className="text-xl font-bold">{t("text186")}...</h2>
        </div>
      </div>
    );
  }

  // 4. Fallback if the array is specifically empty on Mainnet
  if (!dappList || dappList.length === 0) {
    return <DappHubComingSoon />;
  }

  const filteredDapps = dappList.filter((dapp: any) => {
    const name = locale === "id" && dapp.name_idn ? dapp.name_idn : dapp.name;
    const description =
      locale === "id" && dapp.description_idn
        ? dapp.description_idn
        : dapp.description;

    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const slideData: SlideItem[] = dappList.slice(0, 2).map((dapp: any) => {
    const name = locale === "id" && dapp.name_idn ? dapp.name_idn : dapp.name;
    const description =
      locale === "id" && dapp.description_idn
        ? dapp.description_idn
        : dapp.description;

    return {
      title: name,
      description: description,
      buttonText: `${t("text215")} ${name}`,
      onClick: () => setSelectedDappId(dapp.id),
    };
  });

  return (
    <div className="relative min-h-screen pb-40 lg:pb-32">
      <AnimatePresence mode="wait">
        {!liveSelectedDapp ? (
          <motion.div
            key="store"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
          >
          <BannerSlider slides={slideData} bgImage={getNetworkBg().src} />

            <hr className="h-6 border-none" />

            <div className="flex items-center justify-between w-full px-4 py-4 rounded-full glass-card border border-black/5 dark:border-white/10 focus-within:border-black/20 dark:focus-within:border-white/20 transition-colors">
              <input
                type="text"
                placeholder={t("text216")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none text-base font-medium placeholder:text-current/50"
              />
              <Icon
                icon="mingcute:search-line"
                className="text-2xl text-current pointer-events-none opacity-40"
              />
            </div>

            <hr className="h-6 border-none" />

            <div className="flex flex-col gap-6">
              <div className="glass-card py-6 rounded-xl flex flex-col gap-6">
                <div className="mx-4 flex flex-col gap-6">
                  <h2 className="font-bold text-xl md:text-2xl">
                    {searchQuery
                      ? `${t("text217")} (${filteredDapps.length})`
                      : t("text218")}
                  </h2>

                  <div className="flex flex-col gap-6">
                    {filteredDapps.length > 0 ? (
                      filteredDapps.map((dapp: any) => {
                        const localizedDapp = {
                          ...dapp,
                          name:
                            locale === "id" && dapp.name_idn
                              ? dapp.name_idn
                              : dapp.name,
                          description:
                            locale === "id" && dapp.description_idn
                              ? dapp.description_idn
                              : dapp.description,
                        };
                        return (
                          <DappList
                            key={dapp.id}
                            dapp={localizedDapp}
                            isEditing={false}
                            onDelete={() => toggleFavoriteDapp(dapp.id)}
                            onOpen={() => setSelectedDappId(dapp.id)}
                              isStoreView={true}
                          />
                        );
                      })
                    ) : (
                      <div className="py-10 text-center opacity-50">
                        <Icon
                          icon="ph:magnifying-glass-light"
                          className="text-4xl mx-auto mb-2"
                        />
                        <p>
                          {t("text219")} "{searchQuery}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <DappDetail
              dapp={liveSelectedDapp}
              onFavorite={() => toggleFavoriteDapp(liveSelectedDapp.id)}
              onBack={() => setSelectedDappId(null)}
              isConnected={isConnected}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DappStore;