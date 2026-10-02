"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useRouter, useParams } from "next/navigation"; 

import { SupportedChain } from '@/app/network-provider';

import ButtonIcon from "./ButtonIcon";
import DappList from "./DappList";
import Button from "./Button";

import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import { useHederaWallet } from "@/components/hedera/hedera-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { usePolkadotWallet } from "@/components/polkadot/polkadot-provider";
import { useTranslations } from "next-intl";

const DappFavorite = () => {

  const t = useTranslations ("All");
  const router = useRouter();
  const { locale, network } = useParams<{ locale: string; network: SupportedChain }>();

  const bitcoinNetwork = useBitcoinWallet();
  const hederaNetwork = useHederaWallet();
  const ethereumNetwork = useEthereumWallet();
  const solanaNetwork = useSolanaWallet();
  const polkadotNetwork = usePolkadotWallet();

  let dappList: any[] | null = null;
  let toggleFavoriteDapp: (id: number) => void = () => {};
  let isConnected = false;

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
  } else {
    dappList = solanaNetwork.dappList;
    toggleFavoriteDapp = solanaNetwork.toggleFavoriteDapp;
    isConnected = solanaNetwork.connected;
  }

  const favoritedDapps = useMemo(() => {
    if (dappList === null) return null; 
    return dappList.filter((dapp) => dapp.isFavorited);
  }, [dappList]);

  const [isEditing, setIsEditing] = useState(false);
  

  const handleLaunchDapp = (dapp: any) => {
    if (!dapp.url) return;

    if (dapp.url.startsWith("http://") || dapp.url.startsWith("https://")) {

      window.open(dapp.url, "_blank", "noopener,noreferrer");
    } else {

      router.push(`/${locale}/${network}/dapp/${dapp.url}`);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-3 py-4 mb-4 pb-40 lg:pb-32">
        <div className="bgBox glass-card">
          <div className="flex flex-col justify-center gap-5 pb-5 text-center px-4 pt-6">
            <div className="p-5 glass-card shadow-buttonNav! flex justify-center items-center mx-auto w-28 h-28 rounded-full">
              <Icon icon="iconoir:wallet-solid" className={`text-6xl ${ (network == "hedera" || network == "polkadot") ? `` : (network === "base" ? "text-[#0052FF]" : `text-${network}`)} text-end`}/>
            </div>
            <h2 className="text-xl font-bold text-center">{t("text208")}</h2>
          </div>
        </div>
      </div>
    );
  }

  if (favoritedDapps === null) {
    return (
      <div className="bgBox glass-card">
        <div className="flex flex-col justify-center gap-4 pb-6 text-center px-4 pt-6">
          <h2 className="text-xl font-bold">{t("text186")}...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen font-sans pb-40 lg:pb-32">
      <AnimatePresence mode="wait">
        <motion.div
          key="FavoriteList"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-10"
        >
          <div className="glass-card px-4 py-6 rounded-2xl border border-current/5 flex flex-col gap-6">
            <div className="flex justify-between items-center ">
              <div className="flex flex-col">
                <h2 className="font-bold text-xl sm:text-2xl tracking-tight text-gray-900 dark:text-white">
                  {t("text209")}
                </h2>
              </div>
              {favoritedDapps.length > 0 && (
                <ButtonIcon
                  onClick={() => setIsEditing(!isEditing)}
                  className={`p-2 rounded-full transition-colors ${isEditing ? "bg-black/10 dark:bg-white/10" : ""}`}
                >
                  <Icon
                    icon={isEditing ? "material-symbols:close-rounded" : "solar:settings-bold"}
                    className="text-2xl text-current"
                  />
                </ButtonIcon>
              )}
            </div>

            <div className="flex flex-col gap-6">
              
              {favoritedDapps.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {favoritedDapps.map((dapp) => (
                    <DappList 
                      key={dapp.id} 
                      dapp={dapp} 
                      isEditing={isEditing}
                      onDelete={() => toggleFavoriteDapp(dapp.id)} 
                      onOpen={() => handleLaunchDapp(dapp)} 
                      isStoreView={false}
                    />
                  ))}
                </AnimatePresence>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-40">
                  <Icon icon="solar:bookmark-opened-bold-duotone" className="text-5xl" />
                  <p className="text-[13px] font-medium italic">{t("text210")}</p>
                </div>
              )}
            </div>
          </div>

          <hr className="h-6 border-none" />
          
          <Button 
            onClick={() => router.push(`/${locale}/${network}/dapphub/dappstore`)} 
            buttonText={t("text211")}
            chain={network}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DappFavorite;