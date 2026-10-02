"use client";

// Dynamic per-network classes (`` `bg-${network}` `` etc. in Assets.tsx/BuyToken.tsx/
// Navbar.tsx) are generated for "tron" via the @source inline(...) directives in
// globals.css, not by literal occurrence here — see that file.

import { useTronWallet } from "@/components/tron/tron-provider";
import { tron } from "..";
import { TRONLINK_INSTALL_LINKS } from "./wallet-connect/wallet-install-links";
import { WalletInstallItem } from "./wallet-connect/WalletInstallItem";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { VscDebugDisconnect } from "react-icons/vsc";
import { IoCopyOutline, IoWalletOutline } from "react-icons/io5";
import ButtonContrast from "./ButtonContrast";
import { AnimatedModalNavbar } from "./AnimatedModalNavbar";
import { ellipsifyAddress } from "./wallet-connect/ellipsify";
import { ConnectingButton } from "./wallet-connect/ConnectingButton";
import { ConnectedWalletPill } from "./wallet-connect/ConnectedWalletPill";
import { WalletListItem } from "./wallet-connect/WalletListItem";
import { NetworkStatusCard, SettingsRow } from "./wallet-connect/WalletSettingsRows";
import { MainnetToggleRow } from "./wallet-connect/MainnetToggleRow";
import { TRON_WALLET_ICONS } from "./wallet-connect/wallet-icons";
import { useNetwork } from "@/app/network-provider";

interface TronConnectButtonProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export function TronConnectButton({ isOpen, setIsOpen }: TronConnectButtonProps) {
  const t = useTranslations("All");
  const { tronMainnet, setTronMainnet } = useNetwork();

  const { connected, isConnecting, address, connect, disconnect, walletType, availableWallets } = useTronWallet();

  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [detected, setDetected] = useState(false);

  const settingsOpen = isOpen ?? internalOpen;
  const toggleSettings = () => {
    if (setIsOpen) setIsOpen(!settingsOpen);
    else setInternalOpen((prev) => !prev);
  };

  useEffect(() => {
    setDetected(availableWallets.includes("tronlink"));
  }, [availableWallets]);

  const handleConnect = async () => {
    setWalletSheetOpen(false);
    await connect("tronlink");
  };

  const handleCopy = () => {
    if (address) navigator.clipboard.writeText(address);
    if (settingsOpen) toggleSettings();
  };

  const handleDisconnect = () => {
    disconnect(true);
    if (settingsOpen) toggleSettings();
  };

  if (isConnecting) {
    return (
      <ConnectingButton
        label={t("text3")}
        className="text-[8px] md:text-xs flex bg-tron! hover:bg-tron/80 cursor-pointer text-white items-center gap-1 glass-card shadow-buttonNav px-2 py-1 rounded-full"
      />
    );
  }

  return (
    <>
      {!connected && (
        <button
          onClick={() => setWalletSheetOpen(true)}
          className="text-[8px] md:text-xs flex bg-tron! hover:bg-tron/80! cursor-pointer text-white items-center gap-1 glass-card shadow-buttonNav px-2 py-1 rounded-full"
        >
          {t("text2")}
        </button>
      )}

      {connected && (
        <ConnectedWalletPill
          icon={walletType ? TRON_WALLET_ICONS[walletType] : tron}
          alt="icon"
          label={ellipsifyAddress(address!)}
          isMainnet={tronMainnet}
          className="text-[8px] md:text-xs flex items-center hover:bg-tron/10 cursor-pointer gap-1 glass-card shadow-buttonNav px-2 py-1 rounded-full"
          onClick={toggleSettings}
        />
      )}

      <TronSettingsSheet
        isOpen={settingsOpen && connected}
        isMainnet={tronMainnet}
        address={address!}
        onCopy={handleCopy}
        onDisconnect={handleDisconnect}
        onClose={toggleSettings}
      />

      <TronWalletSheet
        isOpen={walletSheetOpen}
        title={t("text35")}
        subtitle={t("text36")}
        detected={detected}
        isMainnet={tronMainnet}
        setIsMainnet={setTronMainnet}
        onSelect={handleConnect}
        onClose={() => setWalletSheetOpen(false)}
      />
    </>
  );
}

function TronWalletSheet({
  isOpen,
  title,
  subtitle,
  detected,
  isMainnet,
  setIsMainnet,
  onSelect,
  onClose,
}: any) {
  const t = useTranslations("All");

  return (
    <AnimatedModalNavbar isOpen={isOpen} onClose={onClose} maxWidthClass="lg:w-[320px]">
      <div className="flex flex-col p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
        <div className="flex flex-col gap-1 pb-5">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-[12px] opacity-70">{subtitle}</p>
        </div>

        <MainnetToggleRow
          heading={t("text37")}
          isMainnet={isMainnet}
          onChange={setIsMainnet}
          testnetLabel="Shasta"
        />

        <hr className="border-black/5 dark:border-white/5 mb-6" />

        <div className="flex flex-col gap-3 py-2">
          {detected ? (
            <WalletListItem icon={TRON_WALLET_ICONS.tronlink} name="TronLink" detected detectedLabel={t("text39")} onClick={onSelect} />
          ) : (
            <WalletInstallItem icon={TRON_WALLET_ICONS.tronlink} name="TronLink" links={TRONLINK_INSTALL_LINKS} />
          )}
        </div>
      </div>

      <div className="px-6 py-5 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212] block lg:hidden">
        <ButtonContrast onClick={onClose} buttonText={t("text55")} />
      </div>
    </AnimatedModalNavbar>
  );
}

function TronSettingsSheet({ isOpen, isMainnet, onCopy, onDisconnect, onClose }: any) {
  const t = useTranslations("All");

  return (
    <AnimatedModalNavbar isOpen={isOpen} onClose={onClose} maxWidthClass="lg:w-[300px]">
      <div className="flex flex-col p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
        <div className="flex flex-col gap-1 pb-4">
          <h2 className="text-xl font-bold">{t("text40")}</h2>
          <p className="text-[12px] opacity-70">{t("text150")}</p>
        </div>

        <div className="flex flex-col gap-3 py-2">
          <NetworkStatusCard label={t("text151")} isMainnet={isMainnet} borderClassName="border-tron/20" pulse={false} />

          <hr className="border-black/5 dark:border-white/5 my-2" />

          <SettingsRow icon={<IoCopyOutline className="text-[16px]" />} label={t("text5")} onClick={onCopy} />
          <SettingsRow icon={<VscDebugDisconnect className="text-[16px]" />} label={t("text4")} onClick={onDisconnect} />
        </div>
      </div>

      <div className="px-6 py-5 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212] block lg:hidden">
        <ButtonContrast buttonText={t("text22")} onClick={onClose} />
      </div>
    </AnimatedModalNavbar>
  );
}
