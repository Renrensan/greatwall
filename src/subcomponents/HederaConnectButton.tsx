"use client";

import { useHederaWallet } from "@/components/hedera/hedera-provider";
import { useNetwork } from "@/app/network-provider";
import { metamask, walletconnect } from "..";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { IoCopyOutline, IoWalletOutline } from "react-icons/io5";
import { VscDebugDisconnect } from "react-icons/vsc";
import { AnimatedModalNavbar } from "./AnimatedModalNavbar";
import ButtonContrast from "./ButtonContrast";
import { HederaWalletType } from "@/components/hedera/config/type";
import { ellipsifyAddress } from "./wallet-connect/ellipsify";
import { HEDERA_WALLET_ICONS } from "./wallet-connect/wallet-icons";
import { ConnectingButton } from "./wallet-connect/ConnectingButton";
import { ConnectedWalletPill } from "./wallet-connect/ConnectedWalletPill";
import { WalletListItem } from "./wallet-connect/WalletListItem";
import { MainnetToggleRow } from "./wallet-connect/MainnetToggleRow";
import { NetworkStatusCard, SettingsRow } from "./wallet-connect/WalletSettingsRows";
import { detectEvmWallets } from "./wallet-connect/evm-wallet-detection";
import { METAMASK_INSTALL_LINKS } from "./wallet-connect/wallet-install-links";
import { METAMASK_BROWSE_LINK } from "./wallet-connect/wallet-browse-links";
import { WalletInstallItem } from "./wallet-connect/WalletInstallItem";

interface HederaConnectButtonProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export function HederaConnectButton({
  isOpen,
  setIsOpen,
}: HederaConnectButtonProps) {
  const t = useTranslations("All");
  const { hederaMainnet, setHederaMainnet } = useNetwork();

  const {
    connected,
    isConnecting,
    address,
    walletType,
    availableWallets,
    connect,
    disconnect,
    switchWallet,
  } = useHederaWallet();

  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const settingsOpen = isOpen ?? internalOpen;

  const toggleSettings = () => {
    if (setIsOpen) setIsOpen(!settingsOpen);
    else setInternalOpen((prev) => !prev);
  };

  const [detected, setDetected] = useState<{ metamask: boolean }>({
    metamask: false,
  });

  useEffect(() => {
    let cancelled = false;
    detectEvmWallets().then(({ metamask }) => {
      if (!cancelled) setDetected({ metamask });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnect = async (wallet: HederaWalletType) => {
    setWalletSheetOpen(false);
    await connect(wallet);
  };

  const handleSwitchWallet = async (wallet: HederaWalletType) => {
    setWalletSheetOpen(false);
    await switchWallet(wallet);
    if (settingsOpen) toggleSettings();
  };

  const handleCopy = () => {
    if (address) navigator.clipboard.writeText(address);
    if (settingsOpen) toggleSettings();
  };

  const handleDisconnect = async () => {
    await disconnect(true);
    if (settingsOpen) toggleSettings();
  };

  if (isConnecting) {
    return (
      <ConnectingButton
        label={t("text3")}
        className="text-[8px] md:text-xs flex bg-hedera! hover:bg-hedera/80 cursor-pointer text-white items-center gap-1 glass-card shadow-buttonNav px-2 py-1 rounded-full"
      />
    );
  }

  const addressLabel =
    walletType === "metamask" || address?.startsWith("0x")
      ? ellipsifyAddress(address!)
      : address!;

  return (
    <>
      {!connected ? (
        <button
          onClick={() => setWalletSheetOpen(true)}
          className="text-[8px] md:text-xs flex bg-hedera! hover:bg-hedera/80! cursor-pointer text-white items-center gap-1 glass-card shadow-buttonNav px-2 py-1 rounded-full"
        >
          {t("text2")}
        </button>
      ) : (
        <ConnectedWalletPill
          icon={walletType ? HEDERA_WALLET_ICONS[walletType] : walletconnect}
          alt={walletType ?? "wallet"}
          label={addressLabel}
          isMainnet={hederaMainnet}
          className="text-[8px] md:text-xs flex items-center hover:bg-hedera/10 cursor-pointer gap-1 glass-card shadow-buttonNav px-2 py-1 rounded-full"
          onClick={toggleSettings}
        />
      )}

      <HederaSettingsSheet
        isOpen={settingsOpen && connected}
        address={address!}
        isMainnet={hederaMainnet}
        onCopy={handleCopy}
        onDisconnect={handleDisconnect}
        canSwitch={true}
        onChangeWallet={() => {
          toggleSettings();
          setWalletSheetOpen(true);
        }}
        onClose={toggleSettings}
      />

      <HederaWalletSheet
        isOpen={walletSheetOpen}
        title={t("text35")}
        subtitle={connected ? t("text220") : t("text36")}
        detected={detected}
        availableWallets={availableWallets}
        isMainnet={hederaMainnet}
        setIsMainnet={setHederaMainnet}
        onSelect={connected ? handleSwitchWallet : handleConnect}
        onClose={() => setWalletSheetOpen(false)}
      />
    </>
  );
}

function HederaWalletSheet({ isOpen, title, subtitle, detected, availableWallets, isMainnet, setIsMainnet, onSelect, onClose }: any) {
  const t = useTranslations("All");

  return (
    <AnimatedModalNavbar isOpen={isOpen} onClose={onClose} maxWidthClass="lg:w-[320px]">
      <div className="flex flex-col p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
        <div className="flex flex-col gap-1 pb-5">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-[12px] opacity-70">{subtitle}</p>
        </div>

        <MainnetToggleRow
          heading={t("text221")}
          isMainnet={isMainnet}
          onChange={setIsMainnet}
          testnetLabel="Testnet"
        />

        <hr className="border-black/5 dark:border-white/5 mb-6" />

        <div className="flex flex-col gap-3 py-2">
          {detected.metamask && (
            <WalletListItem
              icon={metamask}
              name="MetaMask"
              detected
              detectedLabel={t("text39")}
              onClick={() => onSelect("metamask")}
            />
          )}
          {!detected.metamask && (
            <WalletInstallItem icon={metamask} name="MetaMask" links={METAMASK_INSTALL_LINKS} browseLink={METAMASK_BROWSE_LINK} />
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

      <div className="px-6 py-5 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212] block lg:hidden">
        <ButtonContrast onClick={onClose} buttonText={t("text22")} />
      </div>
    </AnimatedModalNavbar>
  );
}

function HederaSettingsSheet({ isOpen, isMainnet, onCopy, onDisconnect, canSwitch, onChangeWallet, onClose }: any) {
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
            label={`${t("text293")} ${isMainnet ? "Mainnet" : "Testnet"}`}
            isMainnet={isMainnet}
            borderClassName="border-hedera/20"
          />

          <hr className="border-black/5 dark:border-white/5 my-2" />

          <SettingsRow icon={<IoCopyOutline className="text-[16px]" />} label={t("text5")} onClick={onCopy} />

          {canSwitch && (
            <SettingsRow icon={<IoWalletOutline className="text-[16px]" />} label={t("text35")} onClick={onChangeWallet} />
          )}

          <SettingsRow icon={<VscDebugDisconnect className="text-[16px]" />} label={t("text4")} onClick={onDisconnect} />
        </div>
      </div>

      <div className="px-6 py-5 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212] block lg:hidden">
        <ButtonContrast buttonText={t("text22")} onClick={onClose} />
      </div>
    </AnimatedModalNavbar>
  );
}
