
import React from 'react';
import { useTranslations } from "next-intl";

export function ZcashConnectButton({ isOpen, setIsOpen }: any) {
  const t = useTranslations("All");
  
  // Zcash does not currently support wallet connection.
  return (
    <button
      disabled
      className="text-[8px] md:text-xs flex bg-zcash/50 cursor-not-allowed text-white/50 items-center gap-1 glass-card shadow-buttonNav px-2 py-1 rounded-full"
    >
      {t("text36") || "Wallet Unavailable"}
    </button>
  );
}
