"use client";

import { usePolkadotWallet } from "@/components/polkadot/polkadot-provider";
import { POLKADOT_WALLETS } from "@/components/polkadot/config/constants";
import type { PolkadotWalletType } from "@/components/polkadot/config/type";
import { useNetwork } from "@/app/network-provider";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { IoCheckmarkCircle, IoCopyOutline, IoPersonOutline, IoWalletOutline } from "react-icons/io5";
import { VscDebugDisconnect } from "react-icons/vsc";
import { AnimatedModalNavbar } from "./AnimatedModalNavbar";
import ButtonContrast from "./ButtonContrast";
import { ellipsifyAddress } from "./wallet-connect/ellipsify";
import { POLKADOT_WALLET_ICONS } from "./wallet-connect/wallet-icons";
import { resolveWalletInstallTarget } from "@/components/polkadot/config/wallet-links";
import { SUBWALLET_BROWSE_LINK, isMobileUserAgent } from "./wallet-connect/wallet-browse-links";
import { ConnectingButton } from "./wallet-connect/ConnectingButton";
import { ConnectedWalletPill } from "./wallet-connect/ConnectedWalletPill";
import { WalletListItem } from "./wallet-connect/WalletListItem";
import { MainnetToggleRow } from "./wallet-connect/MainnetToggleRow";
import { NetworkStatusCard, SettingsRow } from "./wallet-connect/WalletSettingsRows";

interface PolkadotConnectButtonProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export function PolkadotConnectButton({ isOpen, setIsOpen }: PolkadotConnectButtonProps) {
  const t = useTranslations("All");
  const { polkadotMainnet, setPolkadotMainnet } = useNetwork();

  const {
    connected,
    isConnecting,
    address,
    walletType,
    networkLogo,
    connect,
    disconnect,
    switchWallet,
    detectedWallets,
    accounts,
    selectedAccount,
    setSelectedAccount,
  } = usePolkadotWallet();

  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const settingsOpen = isOpen ?? internalOpen;

  const toggleSettings = () => {
    if (setIsOpen) setIsOpen(!settingsOpen);
    else setInternalOpen((prev) => !prev);
  };

  const detected = detectedWallets.length > 0;

  const handleConnect = async (wallet: PolkadotWalletType) => {
    setWalletSheetOpen(false);
    await connect(wallet);
  };

  const handleSwitchWallet = async (wallet: PolkadotWalletType) => {
    setWalletSheetOpen(false);
    await switchWallet(wallet);
    if (settingsOpen) toggleSettings();
  };

  const handleCopy = () => {
    if (address) navigator.clipboard.writeText(address);
    if (settingsOpen) toggleSettings();
  };

  const handleDisconnect = async () => {
    disconnect(true);
    if (settingsOpen) toggleSettings();
  };

  const handleSelectAccount = (acc: NonNullable<typeof accounts>[number]) => {
    setSelectedAccount(acc);
    setAccountSheetOpen(false);
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
      {!connected ? (
        <button
          onClick={() => setWalletSheetOpen(true)}
          className="gw-wallet-btn"
        >
          {t("text2")}
        </button>
      ) : (
        <ConnectedWalletPill
          icon={walletType ? POLKADOT_WALLET_ICONS[walletType] : networkLogo}
          alt={walletType ?? "Polkadot"}
          label={ellipsifyAddress(address!, 6)}
          isMainnet={polkadotMainnet}
          className="gw-wallet-pill"
          onClick={toggleSettings}
        />
      )}

      <PolkadotSettingsSheet
        isOpen={settingsOpen && connected}
        isMainnet={polkadotMainnet}
        onCopy={handleCopy}
        onDisconnect={handleDisconnect}
        canSwitch={detected}
        canSwitchAccount={accounts.length > 1}
        onChangeWallet={() => {
          toggleSettings();
          setWalletSheetOpen(true);
        }}
        onChangeAccount={() => {
          toggleSettings();
          setAccountSheetOpen(true);
        }}
        onClose={toggleSettings}
      />

      <PolkadotWalletSheet
        isOpen={walletSheetOpen}
        title={t("text35")}
        subtitle={connected ? t("text220") : t("text36")}
        detectedWallets={detectedWallets}
        isMainnet={polkadotMainnet}
        setIsMainnet={setPolkadotMainnet}
        onSelect={connected ? handleSwitchWallet : handleConnect}
        onClose={() => setWalletSheetOpen(false)}
      />

      <PolkadotAccountSheet
        isOpen={accountSheetOpen}
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelect={handleSelectAccount}
        onClose={() => setAccountSheetOpen(false)}
      />
    </>
  );
}

function PolkadotWalletSheet({ isOpen, title, subtitle, detectedWallets, isMainnet, setIsMainnet, onSelect, onClose }: any) {
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
          testnetLabel="Paseo"
        />

        <hr className="border-black/5 mb-6" />

        <div className="flex flex-col gap-3 py-2">
          {POLKADOT_WALLETS.map((w) => {
            const isDetected = detectedWallets.includes(w.id);
            if (isDetected) {
              return (
                <WalletListItem
                  key={w.id}
                  icon={POLKADOT_WALLET_ICONS[w.id as PolkadotWalletType]}
                  name={w.name}
                  detected
                  detectedLabel={t("text39")}
                  onClick={() => onSelect(w.id)}
                />
              );
            }

            const install = resolveWalletInstallTarget(w.id as PolkadotWalletType);
            if (install.kind === "desktop-only") {
              return (
                <WalletListItem
                  key={w.id}
                  icon={POLKADOT_WALLET_ICONS[w.id as PolkadotWalletType]}
                  name={w.name}
                  actionLabel={t("text313")}
                  disabled
                  onClick={() => {}}
                />
              );
            }

            // SubWallet publishes an official "open in my in-app browser" Universal Link
            // (see wallet-browse-links.ts) — on mobile, one tap either opens the already-
            // installed app straight to this page, or (if it isn't installed) lands on
            // SubWallet's own site, which shows its install page itself. Either way there's
            // nothing for us to label in advance, so this row shows no action text at all,
            // same as a detected wallet.
            if (w.id === "subwallet-js" && install.target === "mobile-app" && isMobileUserAgent()) {
              return (
                <WalletListItem
                  key={w.id}
                  icon={POLKADOT_WALLET_ICONS[w.id as PolkadotWalletType]}
                  name={w.name}
                  onClick={() => {
                    window.location.href = SUBWALLET_BROWSE_LINK(window.location.href);
                  }}
                />
              );
            }

            return (
              <WalletListItem
                key={w.id}
                icon={POLKADOT_WALLET_ICONS[w.id as PolkadotWalletType]}
                name={w.name}
                actionLabel={install.target === "mobile-app" ? t("text312") : t("text311")}
                onClick={() => window.open(install.url, "_blank", "noopener,noreferrer")}
              />
            );
          })}
        </div>
      </div>

      <div className="px-6 py-5 border-t border-black/5 bg-white block lg:hidden">
        <ButtonContrast onClick={onClose} buttonText={t("text22")} />
      </div>
    </AnimatedModalNavbar>
  );
}

function PolkadotSettingsSheet({
  isOpen,
  isMainnet,
  onCopy,
  onDisconnect,
  canSwitch,
  canSwitchAccount,
  onChangeWallet,
  onChangeAccount,
  onClose,
}: any) {
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
            label={`${t("text293")} ${isMainnet ? "Mainnet" : "Paseo"}`}
            isMainnet={isMainnet}
            borderClassName="border-black/20"
          />

          <hr className="border-black/5 my-2" />

          <SettingsRow icon={<IoCopyOutline className="text-[16px]" />} label={t("text5")} onClick={onCopy} />

          {canSwitchAccount && (
            <SettingsRow icon={<IoPersonOutline className="text-[16px]" />} label={t("text299")} onClick={onChangeAccount} />
          )}

          {canSwitch && (
            <SettingsRow icon={<IoWalletOutline className="text-[16px]" />} label={t("text35")} onClick={onChangeWallet} />
          )}

          <SettingsRow icon={<VscDebugDisconnect className="text-[16px]" />} label={t("text4")} onClick={onDisconnect} />
        </div>
      </div>

      <div className="px-6 py-5 border-t border-black/5 bg-white block lg:hidden">
        <ButtonContrast buttonText={t("text22")} onClick={onClose} />
      </div>
    </AnimatedModalNavbar>
  );
}

function PolkadotAccountSheet({ isOpen, accounts, selectedAccount, onSelect, onClose }: any) {
  const t = useTranslations("All");

  return (
    <AnimatedModalNavbar isOpen={isOpen} onClose={onClose} maxWidthClass="lg:w-[320px]">
      <div className="flex flex-col p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
        <div className="flex flex-col gap-1 pb-5">
          <h2 className="text-xl font-bold">{t("text299")}</h2>
          <p className="text-[12px] opacity-70">{t("text300")}</p>
        </div>

        <div className="flex flex-col gap-3 py-2">
          {(accounts ?? []).map((acc: any) => {
            const isSelected = acc.address === selectedAccount?.address;
            return (
              <button
                key={acc.address}
                onClick={() => onSelect(acc)}
                className="w-full cursor-pointer p-3 border border-black/5 rounded-xl bgBox glass-card hover:bg-black/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-start min-w-0">
                    <p className="font-bold text-sm truncate w-full">{acc.name}</p>
                    <p className="text-[11px] opacity-60">{ellipsifyAddress(acc.address, 6)}</p>
                  </div>
                  {isSelected && (
                    <IoCheckmarkCircle className="text-[18px] text-black ml-auto shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-5 border-t border-black/5 bg-white block lg:hidden">
        <ButtonContrast onClick={onClose} buttonText={t("text22")} />
      </div>
    </AnimatedModalNavbar>
  );
}
