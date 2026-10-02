"use client";

import { useBitcoinWallet, XVERSE_PROVIDER_ID } from "@/components/bitcoin/bitcoin-provider";
import Image from "next/image";
import { xverse, walletconnect } from "..";
import { isProviderInstalled } from "sats-connect";
import { XVERSE_INSTALL_LINKS } from "./wallet-connect/wallet-install-links";
import { XVERSE_BROWSE_LINK } from "./wallet-connect/wallet-browse-links";
import { WalletInstallItem } from "./wallet-connect/WalletInstallItem";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { VscDebugDisconnect } from "react-icons/vsc";
import { MdOutlineChangeCircle } from "react-icons/md";
import { IoCopyOutline, IoWalletOutline } from "react-icons/io5";
import ButtonContrast from "./ButtonContrast";
import { useNetwork } from "@/app/network-provider";
import { AnimatedModalNavbar } from "./AnimatedModalNavbar";
import { BitcoinWalletType } from "@/components/bitcoin/config";
import { ellipsifyAddress } from "./wallet-connect/ellipsify";
import { BITCOIN_WALLET_ICONS } from "./wallet-connect/wallet-icons";
import { ConnectingButton } from "./wallet-connect/ConnectingButton";
import { ConnectedWalletPill } from "./wallet-connect/ConnectedWalletPill";
import { WalletListItem } from "./wallet-connect/WalletListItem";
import { MainnetToggleRow } from "./wallet-connect/MainnetToggleRow";
import { NetworkStatusCard, SettingsRow } from "./wallet-connect/WalletSettingsRows";

interface BitcoinConnectButtonProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export function BitcoinConnectButton({
  isOpen,
  setIsOpen,
}: BitcoinConnectButtonProps) {
  const t = useTranslations("All");
  const { bitcoinMainnet, setBitcoinMainnet } = useNetwork();

  const {
    connected,
    isConnecting,
    address,
    connect,
    disconnect,
    accounts,
    setSelectedAccount,
    walletType,
    switchWallet,
  } = useBitcoinWallet();

  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [detected, setDetected] = useState({ xverse: false });

  const settingsOpen = isOpen ?? internalOpen;

  const toggleSettings = () => {
    if (setIsOpen) setIsOpen(!settingsOpen);
    else setInternalOpen((prev) => !prev);
  };

  useEffect(() => {
    setDetected({
      xverse: typeof window !== "undefined" && isProviderInstalled(XVERSE_PROVIDER_ID),
    });
  }, []);

  const handleConnect = async (wallet: BitcoinWalletType) => {
    setWalletSheetOpen(false);
    await connect(wallet);
  };

  const handleSwitchWallet = async (wallet: BitcoinWalletType) => {
    setWalletSheetOpen(false);
    if (switchWallet) {
      await switchWallet(wallet);
    } else {
      await connect(wallet);
    }
    if (settingsOpen) toggleSettings();
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
        className="text-[8px] md:text-xs flex bg-bitcoin! hover:bg-bitcoin/80 cursor-pointer text-white items-center gap-1 glass-card shadow-buttonNav px-2 py-1 rounded-full"
      />
    );
  }

  return (
    <>
      {!connected && (
        <button
          onClick={() => setWalletSheetOpen(true)}
          className="text-[8px] md:text-xs flex bg-bitcoin! hover:bg-bitcoin/80! cursor-pointer text-white items-center gap-1 glass-card shadow-buttonNav px-2 py-1 rounded-full"
        >
          {t("text2")}
        </button>
      )}

      {connected && (
        <ConnectedWalletPill
          icon={walletType ? BITCOIN_WALLET_ICONS[walletType] : walletconnect}
          alt="icon"
          label={ellipsifyAddress(address!)}
          isMainnet={bitcoinMainnet}
          className="text-[8px] md:text-xs flex items-center hover:bg-bitcoin/10 cursor-pointer gap-1 glass-card shadow-buttonNav px-2 py-1 rounded-full"
          onClick={toggleSettings}
        />
      )}

      <BitcoinSettingsSheet
        isOpen={settingsOpen && connected}
        isMainnet={bitcoinMainnet}
        address={address!}
        accounts={accounts}
        onCopy={handleCopy}
        onDisconnect={handleDisconnect}
        setSelectedAccount={setSelectedAccount}
        onChangeWallet={() => {
          toggleSettings();
          setWalletSheetOpen(true);
        }}
        onClose={toggleSettings}
      />

      <BitcoinWalletSheet
        isOpen={walletSheetOpen}
        title={t("text35")}
        subtitle={connected ? t("text220") : t("text36")}
        detected={detected}
        isMainnet={bitcoinMainnet}
        setIsMainnet={setBitcoinMainnet}
        onSelect={connected ? handleSwitchWallet : handleConnect}
        onClose={() => setWalletSheetOpen(false)}
      />
    </>
  );
}

function BitcoinWalletSheet({
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
    <AnimatedModalNavbar
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="lg:w-[320px]"
    >
      <div className="flex flex-col p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
        <div className="flex flex-col gap-1 pb-5">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-[12px] opacity-70">{subtitle}</p>
        </div>

        <MainnetToggleRow
          heading={t("text37")}
          isMainnet={isMainnet}
          onChange={setIsMainnet}
        />

        <hr className="border-black/5 dark:border-white/5 mb-6" />

        <div className="flex flex-col gap-3 py-2">
          {detected.xverse && (
            <WalletListItem
              icon={xverse}
              name="Xverse"
              detected
              detectedLabel={t("text39")}
              onClick={() => onSelect("xverse")}
            />
          )}
          {!detected.xverse && (
            <WalletInstallItem icon={xverse} name="Xverse" links={XVERSE_INSTALL_LINKS} browseLink={XVERSE_BROWSE_LINK} />
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
        <ButtonContrast onClick={onClose} buttonText={t("text55")} />
      </div>
    </AnimatedModalNavbar>
  );
}

function BitcoinSettingsSheet({
  isOpen,
  isMainnet,
  onCopy,
  onDisconnect,
  onChangeWallet,
  onClose,
  accounts,
  address,
  setSelectedAccount,
}: any) {
  const t = useTranslations("All");
  const altAccount = accounts?.find(
    (acc: any) =>
      acc.address !== address &&
      (acc.addressType === "p2wpkh" || acc.addressType === "p2tr"),
  );

  return (
    <AnimatedModalNavbar
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="lg:w-[300px]"
    >
      <div className="flex flex-col p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
        <div className="flex flex-col gap-1 pb-4">
          <h2 className="text-xl font-bold">{t("text40")}</h2>
          <p className="text-[12px] opacity-70">{t("text150")}</p>
        </div>

        <div className="flex flex-col gap-3 py-2">
          <NetworkStatusCard
            label={t("text151")}
            isMainnet={isMainnet}
            borderClassName="border-bitcoin/20"
            pulse={false}
          />

          <hr className="border-black/5 dark:border-white/5 my-2" />

          <SettingsRow
            icon={<IoCopyOutline className="text-[16px]" />}
            label={t("text5")}
            onClick={onCopy}
          />

          {altAccount && (
            <SettingsRow
              icon={<MdOutlineChangeCircle className="text-[16px]" />}
              label={altAccount.addressType === "p2tr" ? t("text7") : t("text6")}
              onClick={() => {
                setSelectedAccount?.(altAccount);
                onClose();
              }}
            />
          )}

          <SettingsRow
            icon={<IoWalletOutline className="text-[16px]" />}
            label={t("text35")}
            onClick={onChangeWallet}
          />

          <SettingsRow
            icon={<VscDebugDisconnect className="text-[16px]" />}
            label={t("text4")}
            onClick={onDisconnect}
          />
        </div>
      </div>

      <div className="px-6 py-5 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212] block lg:hidden">
        <ButtonContrast buttonText={t("text22")} onClick={onClose} />
      </div>
    </AnimatedModalNavbar>
  );
}
