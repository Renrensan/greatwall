"use client";

import { useSolanaWallet } from "@/components/solana/solana-provider";
import { walletconnect, phantom } from "..";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { IoCopyOutline, IoWalletOutline } from "react-icons/io5";
import { VscDebugDisconnect } from "react-icons/vsc";
import type { Wallet } from "@wallet-standard/core";
import ButtonContrast from "./ButtonContrast";
import { AnimatedModalNavbar } from "./AnimatedModalNavbar";
import { ellipsifyAddress } from "./wallet-connect/ellipsify";
import { getSolanaWalletIcon } from "./wallet-connect/wallet-icons";
import { PHANTOM_INSTALL_LINKS } from "./wallet-connect/wallet-install-links";
import { PHANTOM_BROWSE_LINK } from "./wallet-connect/wallet-browse-links";
import { WalletInstallItem } from "./wallet-connect/WalletInstallItem";
import { ConnectingButton } from "./wallet-connect/ConnectingButton";
import { ConnectedWalletPill } from "./wallet-connect/ConnectedWalletPill";
import { WalletListItem } from "./wallet-connect/WalletListItem";
import { NetworkStatusCard, SettingsRow } from "./wallet-connect/WalletSettingsRows";

interface SolanaConnectButtonProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export function SolanaConnectButton({
  isOpen,
  setIsOpen,
}: SolanaConnectButtonProps) {
  const t = useTranslations("All");

  const {
    connected,
    isConnecting,
    address,
    walletName,
    availableWallets,
    connect,
    disconnect,
    switchWallet,
  } = useSolanaWallet();

  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const settingsOpen = isOpen ?? internalOpen;

  const toggleSettings = () => {
    if (setIsOpen) setIsOpen(!settingsOpen);
    else setInternalOpen((prev) => !prev);
  };

  const [detected, setDetected] = useState<{ phantom: boolean }>({
    phantom: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDetected({
      phantom: !!(window as any).phantom?.solana,
    });
  }, []);

  const handleConnect = async (wallet: Wallet | "walletconnect") => {
    setWalletSheetOpen(false);
    await connect(wallet);
  };

  const handleSwitchWallet = async (wallet: Wallet | "walletconnect") => {
    setWalletSheetOpen(false);
    await switchWallet(wallet);
    if (settingsOpen) toggleSettings();
  };

  const handleCopy = () => {
    if (address) navigator.clipboard.writeText(address);
    if (settingsOpen) toggleSettings();
  };

  const handleDisconnect = () => {
    disconnect();
    if (settingsOpen) toggleSettings();
  };

  if (isConnecting) {
    return (
      <ConnectingButton
        label={t("text3")}
        className="gw-wallet-btn"
      />
    );
  }

  const currentWalletIcon = getSolanaWalletIcon(walletName);

  return (
    <>
      {!connected ? (
        <button
          onClick={() => setWalletSheetOpen(true)}
          className="gw-wallet-btn"
        >
          {t("text2")}
        </button>
      ) : (
        <ConnectedWalletPill
          icon={currentWalletIcon}
          alt={walletName ?? "Solana Wallet"}
          label={ellipsifyAddress(address!)}
          className="gw-wallet-pill"
          onClick={toggleSettings}
        />
      )}

      <SolanaSettingsSheet
        isOpen={settingsOpen && connected}
        address={address!}
        onCopy={handleCopy}
        onDisconnect={handleDisconnect}
        canSwitch={true}
        onChangeWallet={() => {
          toggleSettings();
          setWalletSheetOpen(true);
        }}
        onClose={toggleSettings}
      />

      <SolanaWalletSheet
        isOpen={walletSheetOpen}
        title={t("text35")}
        subtitle={connected ? t("text220") : t("text36")}
        detected={detected}
        availableWallets={availableWallets}
        onSelect={connected ? handleSwitchWallet : handleConnect}
        onClose={() => setWalletSheetOpen(false)}
      />
    </>
  );
}

function SolanaWalletSheet({ isOpen, title, subtitle, detected, availableWallets, onSelect, onClose }: any) {
  const t = useTranslations("All");
  const hasWallets = availableWallets && availableWallets.length > 0;

  return (
    <AnimatedModalNavbar isOpen={isOpen} onClose={onClose} maxWidthClass="lg:w-[320px]">
      <div className="flex flex-col p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
        <div className="flex flex-col gap-1 pb-5">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-[12px] opacity-70">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-3">
          {hasWallets &&
            availableWallets.map((wallet: Wallet) => {
              const icon = getSolanaWalletIcon(wallet.name);
              const lower = wallet.name.toLowerCase();
              const isPhantom = lower.includes("phantom");
              const isDetected = isPhantom && detected.phantom;

              return (
                <WalletListItem
                  key={wallet.name}
                  icon={icon}
                  name={wallet.name}
                  detected={isDetected}
                  detectedLabel={t("text39")}
                  onClick={() => onSelect(wallet)}
                />
              );
            })}

          {!detected.phantom && (
            <WalletInstallItem icon={phantom} name="Phantom" links={PHANTOM_INSTALL_LINKS} browseLink={PHANTOM_BROWSE_LINK} />
          )}

          <WalletListItem
            icon={walletconnect}
            name="WalletConnect"
            detected
            detectedLabel={t("text290")}
            onClick={() => onSelect("walletconnect")}
          />
        </div>
      </div>

      <div className="px-6 py-5 border-t border-black/5 bg-white block lg:hidden">
        <ButtonContrast onClick={onClose} buttonText={t("text22")} />
      </div>
    </AnimatedModalNavbar>
  );
}

function SolanaSettingsSheet({ isOpen, onCopy, onDisconnect, canSwitch, onChangeWallet, onClose }: any) {
  const t = useTranslations("All");

  return (
    <AnimatedModalNavbar isOpen={isOpen} onClose={onClose} maxWidthClass="lg:w-[300px]">
      <div className="flex flex-col p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
        <div className="flex flex-col gap-1 pb-4">
          <h2 className="text-xl font-bold">{t("text40")}</h2>
          <p className="text-[12px] opacity-70">{t("text248")}</p>
        </div>

        <div className="flex flex-col gap-3 py-2">
          <NetworkStatusCard
            label={`${t("text293")} Devnet`}
           
          />

          <hr className="border-black/5 my-2" />

          <SettingsRow icon={<IoCopyOutline className="text-[16px]" />} label={t("text5")} onClick={onCopy} />

          {canSwitch && (
            <SettingsRow icon={<IoWalletOutline className="text-[16px]" />} label={t("text35")} onClick={onChangeWallet} />
          )}

          <SettingsRow icon={<VscDebugDisconnect className="text-[16px]" />} label={t("text4")} onClick={onDisconnect} />
        </div>
      </div>

      <div className="px-6 py-5 border-t border-black/5 bg-white block lg:hidden">
        <ButtonContrast onClick={onClose} buttonText={t("text22")} />
      </div>
    </AnimatedModalNavbar>
  );
}
