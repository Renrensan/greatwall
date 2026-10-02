"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import Image from "next/image";
import DappAbout from "./DappAbout";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface DappDetailProps {
  dapp: any;
  onBack?: () => void;
  onFavorite?: () => void;
  isConnected: boolean;
}

const DappDetail = ({
  dapp,
  onBack,
  onFavorite,
  isConnected,
}: DappDetailProps) => {
  const t = useTranslations("All");
  
  const router = useRouter();
  const { locale, network } = useParams<{ locale: string; network: string }>();


  const [formattedWebsite, setFormattedWebsite] = useState<string>(
    dapp.url?.startsWith("http") 
      ? dapp.url 
      : `/${locale}/${network}/dapp/${dapp.url}` 
  );


  useEffect(() => {
    if (dapp.url && !dapp.url.startsWith("http")) {
      setFormattedWebsite(`${window.location.origin}/${locale}/${network}/dapp/${dapp.url}`);
    }
  }, [dapp.url, locale, network]);

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `https://${url}`;
  };

  const displayImage = getImageUrl(dapp.logoUrl);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isConnected) return;
    onFavorite?.();
  };


  const handleOpenApp = () => {
    if (!dapp.url) return;

    if (dapp.url.startsWith("http://") || dapp.url.startsWith("https://")) {

      window.open(dapp.url, "_blank", "noopener,noreferrer");
    } else {

      router.push(`/${locale}/${network}/dapp/${dapp.url}`);
    }
  };

  return (
    <div className="2xl:container 2xl:mx-auto flex flex-col gap-5 md:gap-8 lg:max-w-[800px] lg:mx-auto pb-8 font-sans">
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          onClick={onBack}
          className="h-10 w-10 sm:h-12 sm:w-12 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center active:scale-95 transition-all"
        >
          <Icon icon="ph:arrow-left-bold" className="text-lg" />
        </button>
      </div>

      <div className="flex flex-col gap-5 mx-auto w-full px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bgBox glass-card p-4 sm:p-5 rounded-3xl border border-current/5 relative overflow-hidden"
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 relative rounded-full overflow-hidden border border-current/10 shadow-sm bg-white/10">
              {displayImage && (
                <Image
                  src={displayImage}
                  alt={dapp.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-current leading-tight">
                {dapp.name}
              </h3>
              <p className="text-[12px] sm:text-[13px] leading-relaxed opacity-70 font-medium mt-1">
                {dapp.description}
              </p>

              <div className="flex items-center gap-1.5 mt-2">
                <Icon
                  icon={
                    dapp.isFavorited ? "solar:heart-bold" : "solar:heart-linear"
                  }
                  className={
                    dapp.isFavorited
                      ? "text-red-500 text-xs"
                      : "text-gray-400 text-xs"
                  }
                />
                <span className="text-[9px] sm:text-[10px] font-bold opacity-50 uppercase tracking-wide">
                  {dapp.favoriteCount?.toLocaleString() || 0} {t("text206")}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-2.5 py-1">
          <button
            onClick={handleOpenApp}
            className="h-12 flex-1 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center gap-2.5 font-bold text-sm shadow-sm active:scale-[0.98] transition-all"
          >
            <Icon
              icon="ph:arrow-square-out-bold"
              className="text-lg font-black"
            />
            <span>{t("text207")}</span>
          </button>

          <button
            onClick={handleToggle}
            className={`h-12 w-12 rounded-2xl border flex items-center justify-center active:scale-95 transition-all ${
              dapp.isFavorited
                ? "bg-red-500/10 border-red-500/20 text-red-500"
                : "border-black/10 dark:border-white/10 text-gray-400"
            }`}
          >
            <motion.div
              key={dapp.isFavorited ? "fav" : "unfav"}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Icon
                icon={
                  dapp.isFavorited ? "solar:heart-bold" : "solar:heart-linear"
                }
                className="text-xl"
              />
            </motion.div>
          </button>

          <button
            onClick={() =>
              navigator.share?.({ title: dapp.name, url: formattedWebsite })
            }
            className="h-12 w-12 rounded-2xl border border-black/10 dark:border-white/10 flex items-center justify-center active:scale-95 transition-all"
          >
            <Icon icon="ph:share-network-bold" className="text-lg" />
          </button>
        </div>

        {/* Pass the fully formatted absolute link down to DappAbout */}
        <DappAbout content={{ ...dapp, website: formattedWebsite }} />
      </div>
      <hr className="h-6 border-none" />
    </div>
  );
};

export default DappDetail;