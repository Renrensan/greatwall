"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import {
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useHederaWallet } from "@/components/hedera/hedera-provider";
import { hederastakebanner, icon_validator } from "../../../../..";

import Button from "../../../../../subcomponents/Button";
import ButtonContrast from "../../../../../subcomponents/ButtonContrast";
import InformationPopUp from "../../../../../subcomponents/InformationPopUp";
import Accordion, { AccordionItemData } from "../../../../../subcomponents/Accordion";
import { useTranslations } from "next-intl";
import { AnimatedModal } from "../../../../../subcomponents/AnimatedModal";

const HederaStaking = ({
  hideHeader = false,
}: {
  hideHeader?: boolean;
}) => {
  const t = useTranslations("All");
  const { network, locale } = useParams<{ network: any; locale: any }>();

  const colorFlip = (network === 'hedera' || network === 'polkadot') ? 'text-black dark:text-white' : (network === "base" ? "text-[#0052FF]" : `text-${network}`);
  
  const {
    getHederaNodes,
    stakeToNode,
    unstake,
    claimRewards,
    getCurrentStake,
    address,
    networkExplorer,
    walletType,
    switchWallet,
    connected,
  } = useHederaWallet();

  const networkColorClass =
    (network === "hedera" || network === "polkadot") ? "text-black dark:text-white" : (network === "base" ? "text-[#0052FF]" : `text-${network}`);

  const [validators, setValidators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMainInfoOpen, setIsMainInfoOpen] = useState(false);
  const [currentStake, setCurrentStake] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState("24h 00m 00s");

  const [txid, setTxId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isStakeProcessing, setIsStakeProcessing] = useState(false);

  const [isClaimProcessing, setIsClaimProcessing] = useState(false);

  const [popupStep, setPopupStep] = useState<"select" | "confirm" | "info">(
    "select",
  );
  const [selectedValidator, setSelectedValidator] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isMetaMask = walletType === "metamask" || walletType === 'walletconnect_evm';

  const canClaim = useMemo(() => {
    return currentStake?.pendingReward > 0;
  }, [currentStake]);

  const accordionItems: AccordionItemData[] = [
    {
      title: locale === "en" ? "Validator Reliability" : "Keandalan Validator",
      description:
        locale === "en"
          ? "Performance score of the provider. Shows uptime and reward processing activity."
          : "Skor performa provider. Menunjukkan waktu aktif (uptime) dan aktivitas reward.",
    },
    {
      title: locale === "en" ? "Rewards Policy" : "Kebijakan Reward",
      description:
        locale === "en"
          ? "Hedera staking rewards are added to your balance automatically whenever an account transaction occurs."
          : "Reward staking Hedera ditambahkan ke saldo kamu secara otomatis setiap kali terjadi transaksi akun.",
      points: [
        {
          label: locale === "en" ? "Automatic" : "Otomatis",
          text:
            locale === "en"
              ? "No manual claim required."
              : "Tidak perlu klaim manual.",
        },
        {
          label: locale === "en" ? "Manual Trigger" : "Pemicu Manual",
          text:
            locale === "en"
              ? "Use 'Claim' to deposit pending rewards immediately."
              : "Gunakan 'Klaim' untuk mendapatkan reward langsung yang tertunda.",
        },
        {
          label: locale === "en" ? "Ownership" : "Kepemilikan",
          text:
            locale === "en"
              ? "You keep 100% control of your HBAR."
              : "Kamu memegang kendali 100% atas HBAR kamu.",
        },
      ],
    },
  ];

  const loadStakingData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [nodes, stakeInfo] = await Promise.all([
        getHederaNodes(),
        address ? getCurrentStake() : Promise.resolve(null),
      ]);

      const formattedValidators = nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        staked: `${(node.totalStake / 1_000_000).toFixed(1)} ${locale == "en" ? "M HBAR" : "Juta HBAR"}`,
        apy: `${node.apy}%`,

        status: node.isFull
          ? locale === "en"
            ? "Overstaked"
            : "Kapasitas Penuh"
          : locale === "en"
            ? "Recommend"
            : "Direkomendasikan",

        isFull: node.isFull,
        raw: node,
      }));

      setValidators(formattedValidators);
      setCurrentStake(stakeInfo);
    } catch (err) {
      console.error("Failed to load staking data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!connected) {
      setCurrentStake(null);
    }
    loadStakingData(true);
  }, [address, unstake, stakeToNode, claimRewards, connected]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hours = 23 - now.getUTCHours();
      const minutes = 59 - now.getUTCMinutes();
      const seconds = 59 - now.getUTCSeconds();
      setTimeLeft(
        `${hours}${t("text223")} ${minutes}${t("text224")}  ${seconds.toString().padStart(2, "0")}${t("text225")} `,
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeValidator = useMemo(() => {
    if (
      currentStake?.stakedNodeId === null ||
      currentStake?.stakedNodeId === undefined || 
      !connected
    )
      return null;
    return validators.find(
      (v) => String(v.id) === String(currentStake.stakedNodeId),
    );
  }, [currentStake, validators, connected]);

  const filteredValidators = useMemo(() => {
    return validators.filter((v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, validators]);

  const handleStakeAction = async () => {
    if (isMetaMask || !connected) return;
    try {
      setIsStakeProcessing(true);
      const resTxId = await stakeToNode(selectedValidator.id);
      setIsDrawerOpen(false);
      if (resTxId) {
        setTxId(resTxId);
        setShowSuccessModal(true);
        setPopupStep("select");
        setTimeout(() => loadStakingData(true), 3000);
      } else {
        setShowErrorModal(true);
      }
    } catch (error) {
      setIsDrawerOpen(false);
      setShowErrorModal(true);
    } finally {
      setIsStakeProcessing(false);
    }
  };

  const handleUnstakeAction = async () => {
    if (isMetaMask || !connected) return;
    try {
      setIsStakeProcessing(true);
      const resTxId = await unstake();
      setIsDrawerOpen(false);
      if (resTxId) {
        setTxId(resTxId);
        setShowSuccessModal(true);
        setTimeout(() => loadStakingData(true), 3000);
      } else {
        setShowErrorModal(true);
      }
    } catch (error) {
      setIsDrawerOpen(false);
      setShowErrorModal(true);
    } finally {
      setIsStakeProcessing(false);
    }
  };

  const handleClaimAction = async () => {
    if (isMetaMask || !connected || !canClaim) return;
    try {
      setIsClaimProcessing(true);
      const resTxId = await claimRewards();
      if (resTxId) {
        setTxId(resTxId);
        setShowSuccessModal(true);
        setTimeout(() => loadStakingData(true), 3000);
      } else {
        setShowErrorModal(true);
      }
    } catch (error) {
      setShowErrorModal(true);
    } finally {
      setIsClaimProcessing(false);
    }
  };

  const handleCloseDrawer = () => {
    if (isStakeProcessing) return;
    setIsDrawerOpen(false);
    setTimeout(() => {
      setPopupStep("select");
      setSelectedValidator(null);
      setSearchQuery("");
    }, 300);
  };

  const isActive = !!(connected && activeValidator && !isMetaMask);

  return (
    <>
    <div className="flex flex-col gap-5 font-sans pb-40 lg:pb-32">
      {isMetaMask && (
        <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-pulse">
          <div className="flex items-start gap-3">
            <Icon
              icon="solar:danger-triangle-bold"
              className="text-red-500 text-lg shrink-0 mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                {t("text26")}
              </p>
              <p className="text-[11px] font-bold leading-relaxed">
               {locale == "en" ? "MetaMask selected. Native staking requires" : "Wallet Metamask terpilih. Staking native perlu"} <strong>{locale == "en" ? 'Native Wallet via Wallet Connect' : 'Native Wallet lewat Wallet Connect'} </strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => switchWallet('walletconnect')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-md active:scale-[0.98]"
          >
           {t("text226")}{locale == "en" ? ' Native Wallet via Wallet Connect' : ' Native Wallet lewat Wallet Connect'}
          </button>
        </div>
      )}

      <div className="glass-card px-4 py-6 rounded-xl flex flex-col gap-5">
        <div
          className={`flex items-center px-1 ${hideHeader ? "justify-end" : "justify-between"}`}
        >
          {!hideHeader && (
            <h2 className="font-bold text-lg sm:text-xl">
              {locale == "en"
                ? "Earn daily rewards from Staking"
                : "Mendapatkan reward harian dari Staking"}
            </h2>
          )}
          <button
            onClick={() => setIsMainInfoOpen(true)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <Icon
              icon="mingcute:information-line"
              className="text-xl sm:text-2xl"
            />
          </button>
        </div>

        {!hideHeader && (
          <p className="pt-3 text-xs sm:text-sm opacity-60 leading-relaxed px-1 -mt-2">
            {locale === "en"
              ? "Earn daily rewards by staking your HBAR to help secure the Hedera network. Enjoy zero lock-up periods, keeping your assets fully liquid and ready to use at any time."
              : "Dapatkan reward harian dengan staking HBAR Kamu untuk mengamankan jaringan Hedera. Nikmati tanpa masa penguncian, menjaga aset Kamu tetap likuid dan siap digunakan kapan saja."}
          </p>
        )}

        <div className="flex flex-col gap-5">
          {/* Validator Card (Unified for both Active and Inactive States) */}
          <div
            className={`bgBox glass-card px-3 py-3.5 flex items-center justify-between border ${isMetaMask ? "border-red-500/20 opacity-80" : "border-transparent"}`}
          >
            {isLoading ? (
              <div className="flex items-center gap-3 w-full animate-pulse">
                <div className="w-11 h-11 rounded-full bg-black/10 dark:bg-white/10 shrink-0" />
                <div className="flex flex-col gap-2 w-full">
                  <div className="h-4 w-24 bg-black/10 dark:bg-white/10 rounded" />
                  <div className="h-2 w-16 bg-black/10 dark:bg-white/10 rounded" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 flex justify-center items-center rounded-full overflow-hidden border border-black/10 dark:border-white/10 shadow-sm bg-black/5 dark:bg-white/5">
                    {activeValidator ? (
                      <Image
                        src={icon_validator}
                        alt="Validator"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Icon icon="solar:server-square-bold" className="text-2xl opacity-40" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-base">
                      {activeValidator ? activeValidator.name : (locale === "en" ? "No Node Selected" : "Tidak Ada Node Terpilih")}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${!activeValidator ? "text-neutral-500" : isMetaMask ? "text-red-500" : "text-green-500"}`}
                    >
                      {!activeValidator
                        ? locale === "en" ? "Inactive" : "Tidak Aktif"
                        : isMetaMask
                          ? locale === "en" ? "Viewing Mode" : "Mode Pengamatan"
                          : locale === "en" ? "Active Earning" : "Reward Aktif"}
                    </span>
                  </div>
                </div>
                
                {/* Show "Change" button ONLY when a validator is active */}
                {activeValidator && (
                  <button
                    disabled={isStakeProcessing}
                    onClick={() => {
                      setPopupStep("select");
                      setIsDrawerOpen(true);
                    }}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] ${
                        "bg-neutral-800 dark:bg-white text-white dark:text-black hover:bg-neutral-700 dark:hover:bg-neutral-200"
                    }`}
                  >
                    {locale == "en" ? "Change" : "Ganti"}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Stats Cards */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="bgBox glass-card flex-1 px-3 py-3.5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-black/20 dark:bg-white/30"}`} />
                <span className="text-[10px] opacity-80 font-bold uppercase tracking-widest">
                  {locale == "en" ? "Next Reward" : "Reward Selanjutnya"}
                </span>
              </div>
              {isLoading ? (

                 <div className="h-6 w-24 bg-black/10 dark:bg-white/10 rounded animate-pulse mt-1" />
              ) : (
                <span className={`text-lg font-bold ${networkColorClass} ${!activeValidator && "opacity-40"}`}>
                  {activeValidator ? timeLeft : "--:--:--"}
                </span>
              )}
            </div>
            
            <div className="bgBox glass-card flex-1 px-3 py-3.5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-black/20 dark:bg-white/30"}`} />
                <span className="text-[10px] opacity-80 font-bold uppercase tracking-widest">
                  {locale == "en" ? "Pending Reward" : "Reward Pending"}
                </span>
              </div>
              {isLoading ? (
                 <div className="h-6 w-32 bg-black/10 dark:bg-white/10 rounded animate-pulse mt-1" />
              ) : (
                <span className={`text-lg font-bold text-green-500 ${!activeValidator && "opacity-40"}`}>
                  {activeValidator && currentStake?.pendingReward
                    ? (currentStake.pendingReward / 100_000_000).toFixed(4)
                    : "0.0000"}{" "}
                  HBAR
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons (Conditional based on active staking) */}
          {activeValidator && !isLoading ? (
            <div className="flex gap-4 mt-1">
              <ButtonContrast
                disabled={isClaimProcessing || isStakeProcessing || isMetaMask || !connected}
                onClick={handleUnstakeAction}
                buttonText={isStakeProcessing ? `${t("text10")}` : "Unstake"}
              />

              <Button
                chain={network}
                disabled={
                  isClaimProcessing ||
                  isStakeProcessing ||
                  isMetaMask ||
                  !connected ||
                  !canClaim
                }
                onClick={handleClaimAction}
                buttonText={isClaimProcessing ? `${t("text10")}` : t("text227")}
              />
            </div>
          ) : (
            <div className="mt-1">
              {/* Main Stake Now button handles the initial selection */}
              <Button
                chain={network}
                buttonText={locale === "en" ? "Stake Now" : "Stake Sekarang"}
                disabled={isStakeProcessing || isLoading} 
                onClick={() => setIsDrawerOpen(true)}
              />
            </div>
          )}

          {/* Accordion */}
          <Accordion items={accordionItems} />
        </div>
      </div>

    </div>

    <AnimatedModal
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        disableBackdropClick={isStakeProcessing}
        maxWidthClass="lg:w-150"
        hideDragHandle={isStakeProcessing}
      >
        {/* Scrollable Content Body */}
        <div className="flex flex-col gap-4 flex-1 overflow-y-auto p-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            {popupStep === "select" && (
              <motion.div
                key="select-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {locale == "en" ? "Select Node" : "Pilih Node"}
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-white/60 px-0.5 leading-tight">
                    {locale == "en"
                      ? "Select node based on your preferences"
                      : "Pilih node berdasarkan preferensi kamu"}
                  </p>
                </div>

                <div className="flex items-center px-4 py-2.5 rounded-2xl border transition-all duration-300 bg-gray-50/80 border-black/5 focus-within:border-black/20 dark:bg-white/5 dark:border-white/10 dark:focus-within:border-white/30 backdrop-blur-md">
                  <Icon
                    icon="lucide:search"
                    className="text-xl text-gray-400 dark:text-white/30 mr-2 shrink-0"
                  />
                  <input
                    type="text"
                    placeholder={
                      locale == "en" ? "Search nodes..." : "Mencari node..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isStakeProcessing}
                    className="bg-transparent outline-none w-full font-bold text-[13px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <div key={`skeleton-node-${i}`} className="w-full p-3 border border-black/5 dark:border-white/10 rounded-xl flex items-center justify-between gap-3 animate-pulse bg-black/5 dark:bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 shrink-0" />
                          <div className="flex flex-col gap-2">
                            <div className="h-4 w-20 bg-black/10 dark:bg-white/10 rounded" />
                            <div className="h-2 w-12 bg-black/10 dark:bg-white/10 rounded" />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="h-4 w-10 bg-black/10 dark:bg-white/10 rounded" />
                          <div className="h-4 w-16 bg-black/10 dark:bg-white/10 rounded-full" />
                        </div>
                      </div>
                    ))
                  ) : (
                    filteredValidators.map((validator, index) => (
                      <button
                        key={validator.id}
                        onClick={() =>
                          !isStakeProcessing &&
                          (setSelectedValidator(validator),
                          setPopupStep("confirm"))
                        }
                        className="w-full text-left p-3 flex items-center justify-between rounded-xl border transition-all duration-200 group bg-gray-50/50 border-black/5 hover:bg-gray-100 dark:bg-white/[0.03] dark:border-white/10 dark:hover:bg-white/[0.08]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 shrink-0">
                            <Image
                              src={icon_validator}
                              alt={validator.name}
                              fill
                              className="rounded-full shadow-sm object-cover border border-black/5 dark:border-white/10"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[13px]">
                              {validator.name}
                            </span>
                            <span className="text-[10px] opacity-60 italic text-gray-500 dark:text-white/40">
                              {locale == "en" ? "Staked" : "Telah Distake"}{" "}
                              {validator.staked}{" "}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5">
                          <span
                            className={`font-bold text-[13px] ${networkColorClass}`}
                          >
                            {validator.apy}
                          </span>

                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              !validator.isFull
                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {validator.status}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {popupStep === "confirm" && (
              <motion.div
                key="confirm-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex flex-col gap-4 text-gray-900 dark:text-white"
              >
                <div className="flex justify-between items-center px-1">
                  <h2 className="font-bold text-2xl">{t("text229")}</h2>
                </div>

                <div className="flex flex-col gap-4">
                  <p className="text-sm opacity-70 leading-relaxed font-medium">
                    {locale == "en"
                      ? "Please review the validator details and staking terms before proceeding."
                      : "Mohon ulas kembali informasi detail validator and kebijakannya sebelum dilanjutkan"}
                  </p>

                  {/* Validator Details Card */}
                  <div className="w-full p-4 flex items-center justify-between rounded-2xl border transition-all duration-300 bg-gray-50/50 border-black/5 dark:bg-white/[0.03] dark:border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 shrink-0">
                        <Image
                          src={icon_validator}
                          alt={selectedValidator?.name ?? "Validator"}
                          fill
                          className="rounded-full shadow-sm object-cover border border-black/5 dark:border-white/10"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-base leading-tight">
                          {selectedValidator?.name}
                        </span>
                        <span className="text-[10px] opacity-60 italic text-gray-500 dark:text-white/40">
                          {locale == "en" ? "Staked" : "Telah Distake"}{" "}
                          {selectedValidator?.staked}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] opacity-40 leading-none font-bold uppercase tracking-tighter">
                          APY
                        </span>
                        <span
                          className={`font-bold text-base leading-none ${networkColorClass}`}
                        >
                          {selectedValidator?.apy}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          !selectedValidator?.isFull
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        }`}
                      >
                        {selectedValidator?.status}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Error State if disconnected or using MetaMask */}
                  {(!connected || isMetaMask) && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-xl mt-2">
                      <Icon icon="solar:danger-triangle-bold" className="text-red-500 text-lg shrink-0" />
                      <p className="text-[11px] font-bold text-red-500 leading-tight">
                        {locale === "en" 
                          ? (isMetaMask ? "Native staking is not supported on MetaMask. Please use a native Hedera wallet." : "Please connect your wallet to stake.") 
                          : (isMetaMask ? "Staking native tidak didukung di MetaMask. Silakan gunakan dompet native Hedera." : "Silakan hubungkan dompet kamu untuk melakukan stake.")}
                      </p>
                    </div>
                  )}

                  {/* Fee & Educational Notes */}
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-2">
                      <span className="font-bold text-base opacity-90">
                        {locale === "en"
                          ? "Please Note:"
                          : "Mohon Diperhatikan:"}
                      </span>
                      <ul className="list-disc pl-5 text-[13px] space-y-1.5 opacity-70 font-medium leading-relaxed">
                        <li>
                          {locale === "en"
                            ? "Your full balance is automatically staked"
                            : "Seluruh token kamu otomatis di-stake"}
                        </li>
                        <li>
                          {locale === "en"
                            ? "Your funds are fully available for use while staked"
                            : "Token kamu sepenuhnya tersedia untuk digunakan saat di-stake"}
                        </li>
                        <li>
                          {locale === "en"
                            ? "You can unstake or switch nodes freely"
                            : "Kamu dapat melakukan unstake atau pindah node dengan bebas"}
                        </li>
                        <li>
                          {locale === "en"
                            ? "You may need to wait up to 48 hours for staking rewards to start"
                            : "Kamu mungkin perlu menunggu hingga 48 jam hingga reward staking dimulai"}
                        </li>
                        <li>
                          {locale === "en"
                            ? "Rewards are automatically collected when doing any transaction"
                            : "Reward otomatis didepositkan saat melakukan transaksi apa pun"}
                        </li>
                      </ul>
                      <a
                         href="https://docs.hedera.com/hedera/core-concepts/staking"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-left text-sm font-bold underline mt-2 hover:opacity-70 transition-opacity w-fit block"
                      >
                        {locale === "en"
                          ? "Read more about how rewards work"
                          : "Baca selengkapnya tentang cara kerja reward"}
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
       <div className="flex flex-col-reverse justify-center gap-3 w-full">
            {popupStep === "select" ? (
              <div className="w-full sm:w-auto min-w-[50%]">
                <ButtonContrast
                  onClick={handleCloseDrawer}
                  buttonText={t("text128")}
                />
              </div>
            ) : (
              <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
                <div className="w-full sm:flex-1">
                  <ButtonContrast
                    onClick={() => !isStakeProcessing && setPopupStep("select")}
                    buttonText={t("text105")} /* Assuming this is "Back" or "Cancel" */
                  />
                </div>
                <div className="w-full sm:flex-1">
                  <Button
                    chain={network}
                    onClick={handleStakeAction}
                    buttonText={
                      isStakeProcessing ? `${t("text10")}` : t("text230")
                    }
                    disabled={isStakeProcessing || isMetaMask || !connected} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </AnimatedModal>

     
      <AnimatedModal   
         isOpen={showSuccessModal && !!txid}
        onClose={() => setShowSuccessModal(false)}
        maxWidthClass="lg:w-100"
      >
        {/* Main Content Body */}
        <div className="flex flex-col justify-center text-center p-6 overflow-y-auto custom-scrollbar">
          <div
            className={`p-5 glass-card shadow-sm flex justify-center items-center mx-auto w-24 h-24 rounded-full mb-5  ${colorFlip}`}
          >
            <FaCheckCircle className="text-6xl" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">{t("text32")}</h2>
          <p className="text-sm break-all mb-4">Hash: {txid}</p>
        </div>

        {/* Sticky Footer (Matches Staking Modal styling) */}
       
       
        {/* Sticky Footer */}
        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          {/* Changed here: Added flex-col-reverse sm:flex-row */}
          <div className="flex flex-col-reverse justify-center gap-3 w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast
                onClick={() => setShowSuccessModal(false)}
                buttonText={t("text128")}
              />
            </div>
            <div className="w-full sm:flex-1">
              <Button
                chain={network}
                buttonText={`${t("text79")}`}
                onClick={() =>
                  window.open(
                    `${(networkExplorer as any).transaction}${txid}${(networkExplorer as any).urlSuffix || ""}`,
                    "_blank"
                  )
                }
              />
            </div>
          </div>
        </div>
      </AnimatedModal>


      {/* ERROR MODAL – new bottom sheet style */}
      {/* ERROR MODAL */}
      <AnimatedModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        maxWidthClass="lg:w-100"
      >
        {/* Main Content Body */}
        <div className="flex flex-col justify-center text-center p-6 overflow-y-auto custom-scrollbar">
          <div className="p-5 glass-card shadow-sm flex justify-center items-center mx-auto w-24 h-24 rounded-full text-red-500 mb-5">
            <FaExclamationCircle className="text-6xl" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">{t("text33")}</h2>
          <p className="text-sm mb-4">{t("text34")}</p>
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#121212]">
          <div className="flex flex-col-reverse justify-center gap-3 w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast
                onClick={() => setShowErrorModal(false)}
                buttonText={t("text128")}
              />
            </div>
          </div>
        </div>
      </AnimatedModal>
      <InformationPopUp
        isOpen={isMainInfoOpen}
        onClose={() => setIsMainInfoOpen(false)}
        title={locale == "en" ? "Staking Rewards" : "Reward Staking"}
        image={hederastakebanner}
        description={
          locale === "en"
            ? "Staking secures the network and earns daily rewards. Your funds remain liquid."
            : "Staking mengamankan jaringan dan menghasilkan reward harian. Token kamu tetap likuid."
        }
      />
    </>
  );
};

export default HederaStaking;