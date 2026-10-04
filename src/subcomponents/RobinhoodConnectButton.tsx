"use client";

import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { robinhood } from "..";
import { METAMASK_INSTALL_LINKS } from "./wallet-connect/wallet-install-links";
import { METAMASK_BROWSE_LINK } from "./wallet-connect/wallet-browse-links";
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
import { ROBINHOOD_WALLET_ICONS } from "./wallet-connect/wallet-icons";
import { detectEvmWallets } from "./wallet-connect/evm-wallet-detection";
import { useNetwork } from "@/app/network-provider";

interface RobinhoodConnectButtonProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export function RobinhoodConnectButton({ isOpen, setIsOpen }: RobinhoodConnectButtonProps) {
  const t = useTranslations("All");
  const { robinhoodMainnet, setRobinhoodMainnet } = useNetwork();

  const { connected, isConnecting, address, connect, disconnect, walletType } = useRobinhoodWallet();

  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [detected, setDetected] = useState(false);

  const settingsOpen = isOpen ?? internalOpen;
  const toggleSettings = () => {
    if (setIsOpen) setIsOpen(!settingsOpen);
    else setInternalOpen((prev) => !prev);
  };

  useEffect(() => {
    let cancelled = false;
    detectEvmWallets().then((result) => {
      if (!cancelled) setDetected(result.metamask);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnect = async () => {
    setWalletSheetOpen(false);
    await connect("metamask");
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
        className="gw-wallet-btn"
      />
    );
  }

  return (
    <>
      {!connected && (
        <button
          onClick={() => setWalletSheetOpen(true)}
          className="gw-wallet-btn"
        >
          {t("text2")}
        </button>
      )}

      {connected && (
        <ConnectedWalletPill
          icon={walletType ? ROBINHOOD_WALLET_ICONS[walletType] : robinhood}
          alt="icon"
          label={ellipsifyAddress(address!)}
          isMainnet={robinhoodMainnet}
          className="gw-wallet-pill"
          onClick={toggleSettings}
        />
      )}

      <RobinhoodSettingsSheet
        isOpen={settingsOpen && connected}
        isMainnet={robinhoodMainnet}
        address={address!}
        onCopy={handleCopy}
        onDisconnect={handleDisconnect}
        onClose={toggleSettings}
      />

      <RobinhoodWalletSheet
        isOpen={walletSheetOpen}
        title={t("text35")}
        subtitle={t("text36")}
        detected={detected}
        isMainnet={robinhoodMainnet}
        setIsMainnet={setRobinhoodMainnet}
        onSelect={handleConnect}
        onClose={() => setWalletSheetOpen(false)}
      />
    </>
  );
}

function RobinhoodWalletSheet({
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
          testnetLabel="Testnet"
        />

        <hr className="border-black/5 mb-6" />

        <div className="flex flex-col gap-3 py-2">
          {detected ? (
            <WalletListItem icon={ROBINHOOD_WALLET_ICONS.metamask} name="MetaMask" detected detectedLabel={t("text39")} onClick={onSelect} />
          ) : (
            <WalletInstallItem icon={ROBINHOOD_WALLET_ICONS.metamask} name="MetaMask" links={METAMASK_INSTALL_LINKS} browseLink={METAMASK_BROWSE_LINK} />
          )}
        </div>
      </div>

      <div className="px-6 py-5 border-t border-black/5 bg-white block lg:hidden">
        <ButtonContrast onClick={onClose} buttonText={t("text55")} />
      </div>
    </AnimatedModalNavbar>
  );
}

function RobinhoodSettingsSheet({ isOpen, isMainnet, onCopy, onDisconnect, onClose }: any) {
  const t = useTranslations("All");

  return (
    <AnimatedModalNavbar isOpen={isOpen} onClose={onClose} maxWidthClass="lg:w-[300px]">
      <div className="flex flex-col p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
        <div className="flex flex-col gap-1 pb-4">
          <h2 className="text-xl font-bold">{t("text40")}</h2>
          <p className="text-[12px] opacity-70">{t("text150")}</p>
        </div>

        <div className="flex flex-col gap-3 py-2">
          <NetworkStatusCard label={t("text151")} isMainnet={isMainnet} borderClassName="border-black/20" />

          <hr className="border-black/5 my-2" />

          <SettingsRow icon={<IoCopyOutline className="text-[16px]" />} label={t("text5")} onClick={onCopy} />
          <SettingsRow icon={<VscDebugDisconnect className="text-[16px]" />} label={t("text4")} onClick={onDisconnect} />
        </div>
      </div>

      <div className="px-6 py-5 border-t border-black/5 bg-white block lg:hidden">
        <ButtonContrast buttonText={t("text22")} onClick={onClose} />
      </div>
    </AnimatedModalNavbar>
  );
}
