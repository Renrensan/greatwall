"use client";

import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import Image from "next/image";
import ButtonMini from "./ButtonMini";
import ButtonIcon from "./ButtonIcon";
import { useTranslations } from "next-intl";


export interface Dapp {
  id: number;
  name: string;
  description: string;
  icon: any; 
  logoUrl?: string; 
  favoriteCount: number;
  isFavorited?: boolean;
}

interface DappListProps {
  dapp: Dapp;
  isEditing?: boolean;
  isStoreView?: boolean;
  onDelete?: (id: number) => void; 
  onOpen?: (dapp: Dapp) => void;
}

const DappList = ({ dapp, isEditing, isStoreView, onDelete, onOpen }: DappListProps) => {

  const t = useTranslations("All");


  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `https://${url}`;
  };

  const displayIcon = getImageUrl(dapp.logoUrl) || dapp.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.2 },
      }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-2"
    >
      <div className="flex items-center gap-4 w-full flex-1">
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 shadow-sm border border-black/5 dark:border-white/5 rounded-full overflow-hidden bg-white/5">
          {displayIcon ? (
            <Image
              src={displayIcon}
              alt={`${dapp.name} icon`}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-current/10">
              <Icon icon="solar:globus-bold" className="text-xl opacity-20" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base sm:text-lg truncate tracking-tight text-current">
            {dapp.name}
          </h3>
          <p className="text-[12px] sm:text-sm opacity-60 line-clamp-2 leading-tight mt-0.5">
            {dapp.description}
          </p>
        </div>
      </div>

      <div className="w-full sm:w-auto flex justify-end mt-1 sm:mt-0">
        {isEditing ? (
          <ButtonIcon
            onClick={() => onDelete?.(dapp.id)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 transition-colors"
          >
            <Icon icon="material-symbols:delete-rounded" className="text-xl" />
          </ButtonIcon>
        ) : (
          <ButtonMini 
            onClick={() => onOpen?.(dapp)}
            className="w-full sm:w-auto px-8 py-3 sm:py-2 font-black text-[10px] tracking-[0.2em] uppercase"
          >
            {isStoreView 
              ? t("text298")
              : t("text214")
            }
          </ButtonMini>
        )}
      </div>
    </motion.div>
  );
};

export default DappList;