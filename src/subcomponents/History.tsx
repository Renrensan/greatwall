"use client";

import { useEffect, useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { SupportedChain, useNetwork } from "@/app/network-provider";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useHederaWallet } from "@/components/hedera/hedera-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { usePolkadotWallet } from "@/components/polkadot/polkadot-provider";
import { FaCheckCircle } from "react-icons/fa";
import ButtonContrast from "@/subcomponents/ButtonContrast";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnimatedModal } from "./AnimatedModal";

const BuyHistory = () => {
  const t = useTranslations("All");

  const { locale, network } = useParams<{
    locale: string;
    network: SupportedChain;
  }>();
  const router = useRouter();

  const timeAgo = (iso: string) => {
    const now = new Date();
    const updated = new Date(iso);
    const seconds = Math.floor((now.getTime() - updated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}${t("text58")}`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}${t("text59")}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}${t("text60")}`;
    const days = Math.floor(hours / 24);
    return `${days}${t("text61")}`;
  };

  const bitcoinNetwork = useBitcoinWallet();
  const hederaNetwork = useHederaWallet();
  const ethereumNetwork = useEthereumWallet();
  const solanaNetwork = useSolanaWallet();
  const polkadotNetwork = usePolkadotWallet();

  const activeProvider = useMemo(() => {
    switch (network) {
      case "bitcoin":
        return bitcoinNetwork;
      case "hedera":
        return hederaNetwork;
      case "ethereum":
        return ethereumNetwork;
      case "solana":
        return solanaNetwork;
      case "polkadot":
        return polkadotNetwork;
      default:
        return bitcoinNetwork;
    }
  }, [
    network,
    bitcoinNetwork,
    hederaNetwork,
    ethereumNetwork,
    solanaNetwork,
    polkadotNetwork,
  ]);

  const {
    connected,
    address,
    currencyTicker,
    networkExplorer,
    resolvedAddress,
  } = activeProvider as any;

  const [transactions, setTransactions] = useState<any[]>([]);
  const [estimations, setEstimations] = useState<
    Record<string, number | string>
  >({});
  const [filter, setFilter] = useState<
    "ALL" | "DEPOSIT" | "WITHDRAWAL" | "REFERRAL"
  >("ALL");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const txsNeedingEstimation = useMemo(() => {
    const currentAddress = network === "hedera" ? resolvedAddress : address;
    return transactions.filter((tx) => {
      const isReferralTx =
        tx.type === "REFERRAL" ||
        (tx.walletAddress && tx.walletAddress !== currentAddress);
      return (
        tx.status !== "COMPLETED" && tx.status !== "EXPIRED" && !isReferralTx
      );
    });
  }, [transactions, network, address, resolvedAddress]);

  const {
    bitcoinMainnet,
    setBitcoinMainnet,
    hederaMainnet,
    setHederaMainnet,
    ethereumMainnet,
    setEthereumMainnet,
    solanaMainnet,
    setSolanaMainnet,
    polkadotMainnet,
    setPolkadotMainnet,
  } = useNetwork();

  const networkState = useMemo(() => {
    const allChecks = [
      {
        key: "bitcoin",
        isMainnet: bitcoinMainnet,
        params: bitcoinNetwork.selfCustodyParameter as any,
        setter: setBitcoinMainnet,
      },
      {
        key: "hedera",
        isMainnet: hederaMainnet,
        params: hederaNetwork.selfCustodyParameter as any,
        setter: setHederaMainnet,
      },
      {
        key: "ethereum",
        isMainnet: ethereumMainnet,
        params: ethereumNetwork.selfCustodyParameter as any,
        setter: setEthereumMainnet,
      },
      {
        key: "solana",
        isMainnet: solanaMainnet,
        params: solanaNetwork.selfCustodyParameter as any,
        setter: setSolanaMainnet,
      },
      {
        key: "polkadot",
        isMainnet: polkadotMainnet,
        params: polkadotNetwork.selfCustodyParameter as any,
        setter: setPolkadotMainnet,
      },
    ];

    const active = allChecks.find((c) => c.key === network)!;
    if (!active.isMainnet) return { type: "TESTNET_CAUTION" as const, active };

    return { type: "OK" as const, active };
  }, [
    network,
    bitcoinMainnet,
    hederaMainnet,
    ethereumMainnet,
    solanaMainnet,
    polkadotMainnet,
    bitcoinNetwork,
    hederaNetwork,
    ethereumNetwork,
    solanaNetwork,
    polkadotNetwork,
  ]);

  const hasTestnetCaution = networkState.type === "TESTNET_CAUTION";

  const dynamicMessageText = useMemo(() => {
    if (networkState.type === "TESTNET_CAUTION") {
      return locale == "id"
        ? "Perhatian: Kamu sedang menggunakan testnet. Token di jaringan ini hanya untuk uji coba dan tidak memiliki nilai nyata."
        : "Caution: You are currently on testnet. Tokens on this network are for testing only and have no real value.";
    }
    return "";
  }, [networkState, locale]);

  const fetchTransactions = async (showLoader: boolean) => {
    if (
      !address ||
      !networkState ||
      !networkState.active
    )
      return;

    if (showLoader) setIsLoading(true);

    // Determine the exact environment the user is currently viewing
    const currentEnv = networkState.active.isMainnet ? "MAINNET" : "TESTNET";

    try {
      const [userRes] = await Promise.all([
        fetch(
          `/api/transaction/address/${network == "hedera" ? resolvedAddress : address}`,
        ),
      ]);

      const responseData = await userRes.json();
      let allTxs: any[] = [];

      // Extract normal transactions from 'data'
      if (responseData.data && responseData.data.success) {
        allTxs = [...allTxs, ...(responseData.data.transactions || [])];
      }

      // Extract referral transactions from 'refData'
      if (responseData.refData && responseData.refData.success) {
        allTxs = [...allTxs, ...(responseData.refData.transactions || [])];
      }

      // Filter by network and environment
      allTxs = allTxs.filter(
        (tx: any) =>
          tx.network === network.toUpperCase() && tx.networkEnv === currentEnv,
      );

      // Deduplicate transactions just in case a transaction appears in both data and refData
      const uniqueTxs = Array.from(
        new Map(allTxs.map((tx) => [tx.id, tx])).values(),
      );

      uniqueTxs.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setTransactions(uniqueTxs);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
      setTransactions([]);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (txsNeedingEstimation.length === 0) return;

    const controller = new AbortController();
    const signal = controller.signal;
    let isFetching = false;

    const fetchLiveEstimates = async () => {
      if (isFetching || signal.aborted) return;
      isFetching = true;

      const newlyFetched: Record<string, number | string> = {};
      let hasChanges = false;

      const promises = txsNeedingEstimation.map(async (tx) => {
        const tokenAmt = Number(tx.tokenAmount ?? 0);
        const idrAmt = Number(tx.idrAmount ?? 0);
        const isDeposit = tx.type === "DEPOSIT";
        const isWithdrawal = tx.type === "WITHDRAWAL";
        const txEnv = tx.networkEnv;

        if (isDeposit && tokenAmt === 0 && idrAmt > 0) {
          try {
            const params = new URLSearchParams({
              network: network.toUpperCase(),
              token: tx.tokenType.toUpperCase(),
              idr: idrAmt.toString(),
              paymentMethod: tx.paymentDetails?.method,
              env: txEnv,
            });
            const res = await fetch(
              `/api/estimate-deposit?${params.toString()}`,
              { signal },
            );
            const data = await res.json();

            if (data.token) {
              newlyFetched[tx.id] = data.token;
              hasChanges = true;
            }
          } catch (e: any) {
            if (e.name !== "AbortError")
              console.error("History Deposit Estimate Error:", e);
          }
        } else if (isWithdrawal && idrAmt === 0 && tokenAmt > 0) {
          try {
            const params = new URLSearchParams({
              network: network.toUpperCase(),
              token: tx.tokenType.toUpperCase(),
              amount: tokenAmt.toString(),
              env: txEnv,
            });
            const res = await fetch(
              `/api/estimate-withdraw?${params.toString()}`,
              { signal },
            );
            const result = await res.json();

            if (result?.data?.netIdr) {
              newlyFetched[tx.id] = parseFloat(result.data.netIdr);
              hasChanges = true;
            }
          } catch (e: any) {
            if (e.name !== "AbortError")
              console.error("History Withdraw Estimate Error:", e);
          }
        }
      });

      await Promise.all(promises);

      //  THE FIX: Use Functional State Update to bypass stale closures!
      if (!signal.aborted && hasChanges) {
        setEstimations((prev) => {
          // Deep compare the new objects to see if an update is actually needed
          let requiresRender = false;
          for (const key in newlyFetched) {
            if (prev[key] !== newlyFetched[key]) {
              requiresRender = true;
              break;
            }
          }

          if (requiresRender) {
            return { ...prev, ...newlyFetched };
          }
          return prev; // Return the exact same object to prevent a re-render
        });
      }

      isFetching = false;
    };

    fetchLiveEstimates();

    const intervalId = setInterval(fetchLiveEstimates, 30000);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [txsNeedingEstimation, network]);

  useEffect(() => {
    if (connected && address) {
      (async () => {
        await fetchTransactions(true);
        setHasLoadedOnce(true);
      })();

      const interval = setInterval(() => {
        fetchTransactions(false);
      }, 30000);

      return () => clearInterval(interval);
    } else {
      setTransactions([]);
      setHasLoadedOnce(false);
    }
  }, [connected, address, network, networkState]);

  const filtered =
    filter === "ALL"
      ? transactions
      : transactions.filter((tx) => {
          const currentAddress =
            network === "hedera" ? resolvedAddress : address;
          const isReferralTx =
            tx.type === "REFERRAL" ||
            (tx.walletAddress && tx.walletAddress !== currentAddress);

          if (filter === "REFERRAL") return isReferralTx;
          if (filter === "DEPOSIT")
            return tx.type === "DEPOSIT" && !isReferralTx;
          if (filter === "WITHDRAWAL")
            return tx.type === "WITHDRAWAL" && !isReferralTx;
          return tx.type === filter;
        });

  const filterOptions: {
    key: "ALL" | "DEPOSIT" | "WITHDRAWAL" | "REFERRAL";
    label: string;
  }[] = [
    { key: "ALL", label: t("text231") },
    { key: "DEPOSIT", label: t("text232") },
    { key: "WITHDRAWAL", label: t("text233") },
    { key: "REFERRAL", label: t("text234") },
  ];

  if (!connected || !address) {
    return (
      <div className="flex flex-col gap-3 py-4 mb-4  pb-40 lg:pb-32">
        <div className="bgBox glass-card">
          <div className="flex flex-col justify-center gap-5 pb-5 text-center px-4 pt-6">
            <div className="p-5 glass-card shadow-buttonNav! flex justify-center items-center mx-auto w-28 h-28 rounded-full">
              <Icon
                icon="iconoir:wallet-solid"
                className={`text-6xl text-end`}
              />
            </div>
            <h2 className="text-xl font-bold text-center">{t("text235")}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 pb-40 lg:pb-32">
        {/* Testnet Caution Warning (Orange Banner) */}
        {hasTestnetCaution && connected && (
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-start gap-3">
              <Icon
                icon="solar:info-circle-bold"
                className="text-orange-500 text-xl shrink-0 mt-0.5"
              />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                  {t("text292")}
                </p>
                <p className="text-[11px] font-bold leading-relaxed text-orange-700">
                  {dynamicMessageText}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={`flex gap-1 glass-card cursor-pointer hover:bg-secondary/10 p-3 shadow-buttonNav rounded-full w-fit items-center`}
            onClick={() => setShowFilterModal(true)}
          >
            <Icon
              icon="basil:filter-outline"
              className={`text-2xl`}
            />
            <span className="sm:text-sm text-[10px]">Filter</span>
          </button>
        </div>

        {isLoading && !hasLoadedOnce ? (
          <div className="bgBox glass-card">
            <div className="flex flex-col justify-center gap-4 pb-6 text-center px-4 pt-6">
              <h2 className="text-xl font-bold">{t("text186")}...</h2>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bgBox glass-card">
            <div className="flex flex-col justify-center gap-4 pb-6 text-center px-4 pt-6">
              <h2 className="text-xl font-bold">{t("text236")}</h2>
              <p className="text-sm ">{t("text237")}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((tx) => {
              const currentAddress =
                network === "hedera" ? resolvedAddress : address;
              const isReferralTx =
                tx.type === "REFERRAL" ||
                (tx.walletAddress && tx.walletAddress !== currentAddress);

              let methodLabel = tx.type;
              if (isReferralTx)
                methodLabel =
                  locale == "en" ? "Referral Bonus" : "Bonus Referal";
              else if (tx.type === "DEPOSIT") methodLabel = "Deposit";
              else if (tx.type === "WITHDRAWAL")
                methodLabel = locale == "en" ? "Withdraw" : "Penarikan";

              const statusClass =
                tx.status == "COMPLETED"
                  ? "text-success"
                  : tx.status == "PENDING"
                    ? "text-pending"
                    : tx.status == "EXPIRED"
                      ? "text-expired"
                      : ``;

              const isDeposit = tx.type === "DEPOSIT" && !isReferralTx;
              const isWithdrawal = tx.type === "WITHDRAWAL" && !isReferralTx;
              const isReferral = isReferralTx;
              const isExpired = tx.status === "EXPIRED";

              let tokenAmt = Number(tx.tokenAmount ?? 0);
              if (isReferral && tx.refAmount) {
                tokenAmt = Number(tx.refAmount); // Uses the refAmount for the display
              }
              let idrAmt = Number(tx.idrAmount ?? 0);

              let isEstimated =
                tx.status != "COMPLETED" && tx.status != "PENDING";
              // null (not "...") is the "no value yet" sentinel — whether the per-tx
              // estimation fetch is still in flight or never resolved, so the render below
              // can show a skeleton instead of a literal "..." that just sits there
              // indefinitely if the estimate never arrives.
              let receivedValue: string | null = "-";
              let rightSideLabel = "-";

              if (isDeposit) {
                const displayToken =
                  tokenAmt > 0 ? tokenAmt : (estimations[tx.id] ?? null);

                receivedValue =
                  displayToken !== null
                    ? `${displayToken} ${tx.tokenType || currencyTicker}`
                    : null;
                rightSideLabel = `${idrAmt.toLocaleString("id-ID")} IDR`;

                if (tokenAmt === 0) isEstimated = true;
              } else if (isWithdrawal) {
                const displayIdr =
                  idrAmt > 0 ? idrAmt : (estimations[tx.id] ?? null);

                receivedValue =
                  displayIdr !== null
                    ? `${Math.floor(Number(displayIdr)).toLocaleString("id-ID")} IDR`
                    : null;

                rightSideLabel = `${tokenAmt} ${tx.tokenType || currencyTicker}`;

                if (idrAmt === 0) isEstimated = true;
              } else if (isReferral) {
                const symbol = tx.tokenType || currencyTicker;
                receivedValue = `${tokenAmt} ${symbol}`;
                rightSideLabel = `+${tokenAmt} ${symbol}`;
              }

              if (isExpired && isDeposit) {
                rightSideLabel = `${idrAmt.toLocaleString("id-ID")} IDR`;
              }

              const handleClick = () => {
                if (isReferral && tx.refTxHash) {
                  window.open(
                    `${(networkExplorer as any).transaction}${tx.refTxHash}${(networkExplorer as any).urlSuffix || ""}`,
                    "_blank",
                  );
                } else {
                  router.push(`/${network}/vault/transaction/${tx.id}`);
                }
              };

              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={handleClick}
                  className="w-full text-left bgBox glass-card hover:bg-secondary/5 cursor-pointer px-3 py-3 rounded-lg border border-transparent hover:border-gray-100 transition-all"
                >
                  <div className="flex items-center justify-between pb-2">
                    <p className="font-bold text-base sm:text-sm">
                      {methodLabel}
                    </p>
                    <span className="sm:text-xs text-[8px] ">
                      {timeAgo(tx.createdAt)}
                    </span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 sm:text-sm text-[10px]">
                      <p className="">
                        {t("text187")}: {tx.id.slice(0, 6)}...{tx.id.slice(-4)}
                      </p>
                      <p>
                        Status:{" "}
                        <span className={`${statusClass} font-bold`}>
                          {tx.status}
                        </span>
                      </p>

                      {!isExpired && (
                        <p>
                          {isEstimated ? `${t("text93")}:` : `${t("text67")}:`}{" "}
                          <span
                            className={` font-bold inline-flex items-center`}
                          >
                            {receivedValue === null ? (
                              <span className="inline-block h-3 w-16 bg-black/10 rounded animate-pulse align-middle" />
                            ) : (
                              receivedValue
                            )}
                          </span>
                        </p>
                      )}
                    </div>

                    <span
                      className={` font-bold sm:text-base text-[10px]`}
                    >
                      {rightSideLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FILTER MODAL */}
      <AnimatedModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        maxWidthClass="lg:w-150"
      >
        {/* Main Content Body */}
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">Filter</h2>
            <p className="text-[12px] opacity-70">{t("text190")}</p>
          </div>

          <div className="flex flex-col gap-3 pb-2">
            {filterOptions.map((opt) => {
              const active = filter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setFilter(opt.key);
                    setShowFilterModal(false);
                  }}
                  className={`w-full text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                    active
                      ? "border-black/20 bg-black/5" // Active state styling
                      : "border-black/5 hover:bg-black/5" // Inactive state styling
                  }`}
                >
                  <span
                    className={`font-bold lg:text-sm ${active ? "" : "opacity-80"}`}
                  >
                    {opt.label}
                  </span>
                  {active && (
                    <FaCheckCircle className="text-[18px] text-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-6 border-t border-black/5 bg-white">
          <div className="flex flex-col-reverse justify-center gap-3 w-full">
            <div className="w-full sm:w-auto min-w-[50%]">
              <ButtonContrast
                onClick={() => setShowFilterModal(false)}
                buttonText={t("text22")}
              />
            </div>
          </div>
        </div>
      </AnimatedModal>
    </>
  );
};

export default BuyHistory;
