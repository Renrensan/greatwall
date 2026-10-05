'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from "@iconify/react";
import { 
    FaCheckCircle, FaArrowRight, FaExclamationCircle, FaClock, FaLink, 
    FaChevronLeft,
    FaChevronRight,
    FaExclamationTriangle,
    FaWallet
} from 'react-icons/fa';
import Image from "next/image";

import { useEthereumWallet } from '@/components/ethereum/ethereum-provider';
import { useBitcoinWallet } from '@/components/bitcoin/bitcoin-provider';
import { useSolanaWallet } from '@/components/solana/solana-provider';
import { useBaseWallet } from '@/components/base/base-provider';
import { useRobinhoodWallet } from '@/components/robinhood/robinhood-provider';
import { useHyperliquidWallet } from '@/components/hyperliquid/hyperliquid-provider';
import { SupportedChain, useNetwork } from '@/app/network-provider';
import ButtonContrast from "@/subcomponents/ButtonContrast";
import Button from "@/subcomponents/Button"; 
import { color } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { AnimatedModal } from './AnimatedModal';
import { TxPhase, TypeFilter } from '@/components/integrator/ipow/evm/type';
import { tunnelStatus } from '@/components/integrator/ipow/convertStatus';




const ITEMS_PER_PAGE = 10;




export default function ConvertHistory() {

  const t = useTranslations("All");
  const router = useRouter();
  const params = useParams();
  const network = params.network as SupportedChain;

  const locale = params.locale as string;

  const ethereumWallet = useEthereumWallet();
  const bitcoinWallet = useBitcoinWallet();
  const solanaWallet = useSolanaWallet();
  const baseWallet = useBaseWallet();
  const robinhoodWallet = useRobinhoodWallet();
  const hyperliquidWallet = useHyperliquidWallet();

  // nativeToken.decimals formats the ipow *contract's* on-chain amounts, so every entry
  // here reads ipowDecimals — not each chain's own `.decimals` (wallet balance/transfer
  // display precision, which only coincidentally matches for ethereum/solana; see
  // each provider's ipowDecimals doc comment for why they can diverge). Bitcoin is the one exception: it's the settlement side, not an ipow
  // caller, and its `bitcoinAmount` field is always raw satoshis regardless of the
  // paired native chain, which its own `.decimals` already correctly represents.
  const networkConfigs = useMemo(() => [
      { id:  bitcoinWallet.ipowNetworkId, key: "bitcoin", name: bitcoinWallet.networkName, logo: bitcoinWallet.networkLogo, nativeToken: { symbol: bitcoinWallet.currencyTicker, decimals: bitcoinWallet.decimals, logo: bitcoinWallet.networkLogo } },
      { id: ethereumWallet.ipowNetworkId, key: "ethereum", name: ethereumWallet.networkName, logo: ethereumWallet.networkLogo, nativeToken: { symbol: ethereumWallet.currencyTicker, decimals: ethereumWallet.ipowDecimals, logo: ethereumWallet.networkLogo } },
      { id: solanaWallet.ipowNetworkId, key: "solana", name: solanaWallet.networkName, logo: solanaWallet.networkLogo, nativeToken: { symbol: solanaWallet.currencyTicker, decimals: solanaWallet.ipowDecimals, logo: solanaWallet.networkLogo } },
      { id: baseWallet.ipowNetworkId, key: "base", name: baseWallet.networkName, logo: baseWallet.networkLogo, nativeToken: { symbol: baseWallet.currencyTicker, decimals: 18, logo: baseWallet.networkLogo } },
      { id: robinhoodWallet.ipowNetworkId, key: "robinhood", name: robinhoodWallet.networkName, logo: robinhoodWallet.networkLogo, nativeToken: { symbol: robinhoodWallet.currencyTicker, decimals: 18, logo: robinhoodWallet.networkLogo } },
      { id: hyperliquidWallet.ipowNetworkId, key: "hyperliquid", name: hyperliquidWallet.networkName, logo: hyperliquidWallet.networkLogo, nativeToken: { symbol: hyperliquidWallet.currencyTicker, decimals: 18, logo: hyperliquidWallet.networkLogo } },
    ], [bitcoinWallet, ethereumWallet, solanaWallet, baseWallet, robinhoodWallet, hyperliquidWallet]
  );



const timeAgo = (timestamp: any) => {
  if (!timestamp || timestamp.toString() === '0') return t("text154");
  const tsNum = Number(timestamp.toString());
  const now = new Date();
  const seconds = Math.floor((now.getTime() - (tsNum < 10000000000 ? tsNum * 1000 : tsNum)) / 1000);
  return seconds < 60 ? `${seconds}${t("text58")}` : seconds < 3600 ? `${Math.floor(seconds/60)}${t("text59")}` : seconds < 86400 ? `${Math.floor(seconds/3600)}${t("text60")}` : `${Math.floor(seconds/86400)}${t("text61")}`;
};


const {
  bitcoinMainnet, setBitcoinMainnet,
  ethereumMainnet, setEthereumMainnet,
  solanaMainnet, setSolanaMainnet
} = useNetwork();


const mismatches = useMemo(() => {
  const checks = [
    {
        name: bitcoinWallet.networkName,
        current: bitcoinMainnet,
        required: bitcoinWallet.ipowConvert,
        setter: setBitcoinMainnet
    },
    {
        name: ethereumWallet.networkName,
        current: ethereumMainnet,
        required: ethereumWallet.ipowConvert,
        setter: setEthereumMainnet
    },
    {
        name: solanaWallet.networkName,
        current: solanaMainnet,
        required: solanaWallet.ipowConvert,
        setter: setSolanaMainnet
    },
  ];


  return checks.filter(c => {
    if (c.required === 'comingsoon') return false;
    const isRequiredMainnet = c.required === 'mainnet';
    return c.current !== isRequiredMainnet;
  });
}, [
    bitcoinMainnet, ethereumMainnet, solanaMainnet,
    bitcoinWallet, ethereumWallet, solanaWallet,
    setBitcoinMainnet, setEthereumMainnet, setSolanaMainnet
]);


const isAllFulfilled = mismatches.length === 0;



const dynamicMismatchText = useMemo(() => {
  if (mismatches.length === 0) return "";


  const phrases = mismatches.map(m => `${m.required} wallet in ${m.name}`);
  if (phrases.length === 1) {
    return locale == "en" ?`Please select ${phrases[0]} in the wallet settings to see Convert History.` : `Mohon pilih wallet ${phrases[0]} di pengaturan wallet untuk melihat Riwayat Konversi`;
  }

  if (phrases.length === 2) {
    return locale == "en" ? `Please select ${phrases[0]} and ${phrases[1]} in the wallet settings to see Convert History.` : `Mohon pilih wallet ${phrases[0]} dan ${phrases[1]} di pengaturan wallet untuk melihat Riwayat Konversi`;
  }

  const lastPhrase = phrases.pop();
  return locale == "en" ? `Please select ${phrases.join(', ')}, and ${lastPhrase} in the wallet settings to see Convert History.` :  `Mohon pilih wallet  ${phrases.join(', ')}, dan ${lastPhrase} di pengaturan wallet untuk melihat Riwayat Konversi`;
}, [mismatches]);


const handleSwitchAll = () => {
  mismatches.forEach(m => m.setter(m.required === 'mainnet'));
};

  const activeProvider: any = useMemo(() => {
      switch (network) {
          case 'ethereum': return ethereumWallet;
          case 'solana': return solanaWallet;
          case 'bitcoin': return bitcoinWallet;
          case 'base': return baseWallet;
          case 'robinhood': return robinhoodWallet;
          case 'hyperliquid': return hyperliquidWallet;
          default: return ethereumWallet;
      }
  }, [network, ethereumWallet, solanaWallet, bitcoinWallet, baseWallet, robinhoodWallet, hyperliquidWallet]);

  // The fees of the user's untaken jobs, held by the protocol: withdrawn in
  // one transaction, apart from any refund.
  const [feeCredit, setFeeCredit] = useState<bigint>(BigInt(0));
  const [withdrawing, setWithdrawing] = useState(false);
  const readFeeCredit = useCallback(async () => {
      try { setFeeCredit(activeProvider?.feeCredit ? await activeProvider.feeCredit() : BigInt(0)); } catch { setFeeCredit(BigInt(0)); }
  }, [activeProvider]);
  useEffect(() => { readFeeCredit(); }, [readFeeCredit]);
  const withdrawFeeCredit = async () => {
      setWithdrawing(true);
      try { await activeProvider.withdrawFeeCredit(); await readFeeCredit(); } catch (e) { console.error(e); } finally { setWithdrawing(false); }
  };

  const { connected, networkName } = activeProvider;

  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'FROM_NATIVE' | 'TO_NATIVE'>('ALL'); 
  const [currentPage, setCurrentPage] = useState(1);
  const lastFetchId = React.useRef(0);
  

  useEffect(() => { setCurrentPage(1); }, [filterMode, network]);

const fetchHistory = useCallback(async (showLoader = false) => {
      if (!connected) return;
      const requestId = ++lastFetchId.current;

      if (showLoader) setIsLoading(true);

      try {
          let allTxs: any[] = [];

          if (network === 'bitcoin') {
              if (bitcoinWallet.address) {
                  let btcScript = "";
                  try { btcScript = bitcoinWallet.addressToScriptPubKeyHex(bitcoinWallet.address); } catch(e) {}
                  if (btcScript) {
                      const programmableProviders: { key: string; wallet: any }[] = [
                          // The networks whose Convert runs on the new protocol.
                          { key: 'ethereum', wallet: ethereumWallet },
                          { key: 'base', wallet: baseWallet },
                          { key: 'robinhood', wallet: robinhoodWallet },
                          { key: 'hyperliquid', wallet: hyperliquidWallet },
                      ];
                      const promises = programmableProviders.map(async ({ key, wallet: p }) => {
                          if (!p.getMyTxIds) return [];
                          const ids = await p.getMyTxIds(TxPhase.NONE, TypeFilter.ANY, btcScript);
                          if (ids && ids.length > 0) {

                              if (requestId !== lastFetchId.current) return [];

                            const txs = await Promise.all(ids.map((id: any) => p.getConversion(id as any)));
                              return txs.filter(t => t !== null).map(t => ({ ...t, providerKey: key, contractChainId: p.ipowNetworkId, uniqueId: `${p.ipowNetworkId}-${t.id}` }));
                          }
                          return [];
                      });
                      const results = await Promise.all(promises);
                      allTxs = results.flat();
                  }
              }
          } 
          else if (activeProvider.getMyTxIds) {
              const ids = await activeProvider.getMyTxIds(TxPhase.NONE, TypeFilter.ANY);
              if (ids && ids.length > 0) {
                
                  if (requestId !== lastFetchId.current) return;

                  const results = await Promise.all(ids.map((id: any)  => activeProvider.getConversion(id)));
                  allTxs = results.filter(t => t !== null).map(t => ({ ...t, providerKey: network, contractChainId: activeProvider.ipowNetworkId, uniqueId: `${activeProvider.ipowNetworkId}-${t.id}` }));
              }
          }

        
          if (requestId !== lastFetchId.current) return;

         
          const linkedTxs = await Promise.all(allTxs.map(async (tx) => {
              if (requestId !== lastFetchId.current) return tx;

              const currentTx = { ...tx }; 
              
              const getProviderById = (id: number) => {
                  if (id === ethereumWallet.ipowNetworkId) return ethereumWallet;
                  if (id === solanaWallet.ipowNetworkId) return solanaWallet;
                  if (id === baseWallet.ipowNetworkId) return baseWallet;
                  if (id === robinhoodWallet.ipowNetworkId) return robinhoodWallet;
                  if (id === hyperliquidWallet.ipowNetworkId) return hyperliquidWallet;
                  return null;
              };

              const hasValidUserProgram = 
                  currentTx.userProgram && 
                  currentTx.userProgram !== "0x" && 
                  currentTx.userProgram.length > 2; 

              if (currentTx.partnerTxId && currentTx.networkId !== 0) {
                  const other = getProviderById(currentTx.networkId);
                  try {
                      const otherTx = other ? await other.getConversion(BigInt(currentTx.partnerTxId)) : null;
                      if (otherTx) {
                          if (currentTx.isNativeToBitcoin) currentTx.destinationTx = otherTx;
                          else currentTx.originTx = otherTx;
                      }
                  } catch(e) {}
                  return currentTx;
              }

              if (currentTx.tunnel) return currentTx;

              if (currentTx.isNativeToBitcoin && currentTx.networkId !== 0) {
                  const destProvider = getProviderById(currentTx.networkId);
                  
                  if (hasValidUserProgram && destProvider && destProvider.getMyTxIds) {
                      try {
                          const destIds = await destProvider.getMyTxIds(TxPhase.NONE, TypeFilter.ANY, currentTx.userProgram, false);
                          
                          if (destIds && destIds.length > 0) {
                              const destTx = await destProvider.getConversion(destIds[0] as any);
                              if (destTx) currentTx.destinationTx = destTx; 
                          }
                      } catch(e) {}
                  }
              }

              if (!currentTx.isNativeToBitcoin && currentTx.networkId !== 0) {
                  const srcProvider = getProviderById(currentTx.networkId);
                  
                  const hasValidReceiveProgram = 
                      currentTx.ipowReceiveProgram && 
                      currentTx.ipowReceiveProgram !== "0x" && 
                      currentTx.ipowReceiveProgram.length > 2;

                  if (hasValidReceiveProgram && srcProvider && srcProvider.getMyTxIds) {
                      try {
                          const sourceIds = await srcProvider.getMyTxIds(TxPhase.NONE, TypeFilter.ANY, currentTx.ipowReceiveProgram, true);
                          if (sourceIds && sourceIds.length > 0) {
                              const sourceTx = await srcProvider.getConversion(sourceIds[0] as any);
                              if (sourceTx) currentTx.originTx = sourceTx; 
                          }
                      } catch(e) {}
                  }
              }
              return currentTx;
          }));

        
          if (requestId !== lastFetchId.current) return;
          const processedTxs = await Promise.all(linkedTxs.map(async (tx) => {
               if (requestId !== lastFetchId.current) return tx;
              const getProviderById = (id: number) => {
                  if (id === ethereumWallet.ipowNetworkId) return ethereumWallet;
                  if (id === solanaWallet.ipowNetworkId) return solanaWallet;
                  if (id === baseWallet.ipowNetworkId) return baseWallet;
                  if (id === robinhoodWallet.ipowNetworkId) return robinhoodWallet;
                  if (id === hyperliquidWallet.ipowNetworkId) return hyperliquidWallet;
                  return null;
              };

              const isOutbound = tx.isNativeToBitcoin;
              const isNativeToNative = tx.networkId !== 0; 

              let sourceTxObj = null;
              let destTxObj = null;

              if (isNativeToNative) {
                  if (isOutbound) { 
                      sourceTxObj = tx; 
                      destTxObj = tx.destinationTx; 
                  } else { 
                      sourceTxObj = tx.originTx; 
                      destTxObj = tx; 
                  }
              } else {
                  if (isOutbound) sourceTxObj = tx; 
                  else destTxObj = tx;
              }
              let estimatedVal = "0";
              try {
                  let btcSatsStr = "0";

                  if (destTxObj && destTxObj.bitcoinAmount && destTxObj.bitcoinAmount !== "0") {
                      btcSatsStr = destTxObj.bitcoinAmount;
                  }
                  else if (sourceTxObj && sourceTxObj.bitcoinAmount && sourceTxObj.bitcoinAmount !== "0") {
                      btcSatsStr = sourceTxObj.bitcoinAmount;
                  }

                  if (btcSatsStr === "0" && sourceTxObj && sourceTxObj.nativeAmount && sourceTxObj.nativeAmount !== "0") {
                      const srcChainId = isOutbound ? tx.contractChainId : tx.networkId;
                      const srcProvider = getProviderById(srcChainId);
                      
                      if (srcProvider?.estimateBitcoinFromNative) {


                          const dec = srcProvider.ipowDecimals

                          btcSatsStr = await srcProvider.estimateBitcoinFromNative(Number(sourceTxObj.nativeAmount)/(10**dec)) ?? "0";
                      }
                  }

                  if (btcSatsStr && btcSatsStr !== "0") {
                      let destId = 0;
                      if (isNativeToNative) destId = isOutbound ? tx.networkId : tx.contractChainId;
                      else if (!isOutbound) destId = tx.contractChainId;

                      if (destId !== 0) {
                          const destProvider = getProviderById(destId);
                          
                          if (destProvider?.estimateNativeFromBitcoin) {
                              const rawNative = await destProvider.estimateNativeFromBitcoin(btcSatsStr);
                              
                              if (rawNative) {


                                  const dec = destProvider.ipowDecimals
                                  const rawEst = Number(rawNative) * (10**dec);
                                  
                                  let reserved = 0;
                                  let hasReserved = false;
                                  
                                  const targetObj = isOutbound ? tx.destinationTx : tx;

                                  if (targetObj) {
                                      if (targetObj.reservedNative && targetObj.reservedNative !== "0") { 
                                          reserved = Number(targetObj.reservedNative); hasReserved = true; 
                                      } else if (targetObj.nativeAmount && targetObj.nativeAmount !== "0" && targetObj.phase !== TxPhase.COMPLETED) { 
                                          reserved = Number(targetObj.nativeAmount); hasReserved = true; 
                                      }
                                  }
                                  
                                  if (hasReserved && reserved > 0) estimatedVal = (rawEst < reserved) ? rawEst.toString() : reserved.toString();
                                  else estimatedVal = rawEst.toString();
                              }
                          }
                      } else { 
                          estimatedVal = btcSatsStr; 
                      }
                  }
              } catch (e) { console.warn("Est Error", e); }

              tx.estimatedOutput = estimatedVal;
              return tx;
          }));

          if (requestId === lastFetchId.current) {
              setTransactions(processedTxs.sort((a, b) => Number(b.createdAt) - Number(a.createdAt)));
          }

      } catch (e) { 
          if (requestId === lastFetchId.current) console.error("History error", e); 
      } finally { 
          if (requestId === lastFetchId.current && showLoader) setIsLoading(false); 
      }
  }, [activeProvider, connected, network, bitcoinWallet, ethereumWallet, solanaWallet]);
  
useEffect(() => {

  
  if (connected && isAllFulfilled) {
    fetchHistory(true);
    const i = setInterval(() => fetchHistory(false), 15000);
    return () => clearInterval(i);
  } else {
    setIsLoading(false);
  }
}, [
  connected, 
  network, 
  isAllFulfilled,
  fetchHistory
]);

  const filteredTransactions = useMemo(() => {
      if (filterMode === 'ALL') return transactions;
      return transactions.filter(tx => {
          if (filterMode === 'FROM_NATIVE') {
              if (network === 'bitcoin') return tx.isNativeToBitcoin === false;
              return tx.isNativeToBitcoin === true;
          }
          if (filterMode === 'TO_NATIVE') {
              if (network === 'bitcoin') return tx.isNativeToBitcoin === true;
              return tx.isNativeToBitcoin === false;
          }
          return true;
      });
  }, [transactions, filterMode, network]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      return filteredTransactions.slice(start, end);
  }, [filteredTransactions, currentPage]);

  const filterOptions = [
      { key: 'ALL', label: t("text191") },
      { key: 'FROM_NATIVE', label: `${t("text194")} ${networkName}` },
      { key: 'TO_NATIVE', label: `${t("text193")}  ${networkName}` },
  ];

const handleTxClick = (tx: any) => {
    const contractChainId = tx.contractChainId;
    const partnerChainId = tx.networkId;

    const contractKey = networkConfigs.find(n => n.id === contractChainId)?.key;
    const partnerKey = networkConfigs.find(n => n.id === partnerChainId)?.key;


    const linkedKey = (network === contractKey) ? partnerKey : contractKey;

    const queryParam = `?linked=${linkedKey}`;
    
    router.push(`/${locale}/${network}/convert/transaction/${tx.id}${queryParam}`);
};

  // A token swap is shown as its token (the swap's tokenSymbol), not the
  // network's coin.
  const getAssetInfo = (netId: number, swap?: any) => {
      const config = networkConfigs.find(n => n.id === netId);
      if (config) {
          return {
              tokenSymbol: swap?.tokenSymbol ?? config.nativeToken.symbol,
              tokenDecimals: swap?.tokenDecimals ?? config.nativeToken.decimals,
              tokenLogo: swap?.tokenSymbol ? null : config.nativeToken.logo,
              networkName: config.name,
              networkLogo: config.logo,
              providerKey: config.key
          };
      }
    
  };

  

  const colorFlip = 'text-black';
const bgFlip = 'bg-black/10';
const borderFlip = 'border-black';



const getUnifiedStatusConfig = (localTx: any, partnerTx: any) => {
    
    const isBitcoin = localTx.networkId === 0;
    const isOutbound = localTx.isNativeToBitcoin;
    
    const sourceTx = isOutbound ? localTx : (partnerTx || {});
    const destTx = isOutbound ? (partnerTx || {}) : localTx;

    const isBtcInbound = !isOutbound && isBitcoin;

     const destinationId = isOutbound ? localTx.networkId : localTx.contractChainId;
     const destinationNetworkName = networkConfigs.find((n) => n.id === destinationId)?.name ?? "";

    // A tunnel's swap: the shared words (convertStatus.ts), styled here.
    const sourceNetworkName = networkConfigs.find((n) => n.id === (isOutbound ? localTx.contractChainId : localTx.networkId))?.name ?? "";
    const tunnel = tunnelStatus(localTx, partnerTx, { source: sourceNetworkName, destination: destinationNetworkName }, t, locale);
    if (tunnel) {
        const style = {
            wait: { color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`, icon: <FaClock className="animate-pulse"/> },
            action: { color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`, icon: <FaLink className="animate-pulse"/> },
            progress: { color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`, icon: <FaClock className="animate-spin"/> },
            ok: { color: "text-green-600", bg: "bg-green-50", border: "border-green-100", icon: <FaCheckCircle/> },
            fail: { color: "text-red-500", bg: "bg-red-50", border: "border-red-100", icon: <FaExclamationCircle/> },
            closed: { color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-100", icon: <FaWallet /> },
        }[tunnel.kind];
        return { label: tunnel.label, desc: tunnel.desc, ...style };
    }
    

    if (sourceTx.phase === TxPhase.WAITING_OPERATOR_APPROVAL || (isBtcInbound && destTx.phase === TxPhase.WAITING_OPERATOR_APPROVAL)) {
        return { 
            label:  `${t("text155")} ${destinationNetworkName}`, 
            desc: `${t("text156")}`, 
             color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`,
            icon: <FaClock className="animate-pulse"/> 
        };
    }

    if (sourceTx.phase === TxPhase.OPERATOR_APPROVAL_EXPIRED || (isBtcInbound && destTx.phase === TxPhase.OPERATOR_APPROVAL_EXPIRED)) {
        return { 
            label: t("text157"), 
            desc: t("text158"), 
            color:"text-red-500", bg: "bg-red-50", border: "border-red-100", 
            icon: <FaExclamationCircle/> 
        };
    }

    if (sourceTx.phase === TxPhase.WAITING_USER_ACTION || (isBtcInbound && destTx.phase === TxPhase.WAITING_USER_ACTION )) {
        if (!destTx.id && isOutbound && !isBitcoin && !isBtcInbound) {
            return { 
                label: t("text159"), 
                desc: `${t("text160")} ${destinationNetworkName}...`, 
                 color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`,
                icon: <FaLink className="animate-pulse"/> 
            };
        }
        return { 
            label: t("text161"), 
            desc:  isBtcInbound ? t("text162") : !isOutbound ? t("text163") : t("text164"), 
            color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`,
            icon: <FaLink/> 
        };
    }

    if (sourceTx.phase === TxPhase.USER_ACTION_EXPIRED ) {
        return { 
            label: t("text165"), 
            desc: t("text166"), 
            color:"text-red-500", bg: "bg-red-50", border: "border-red-100", 
            icon: <FaExclamationCircle/> 
        };
    }

     if (isBtcInbound && destTx.phase === TxPhase.USER_ACTION_EXPIRED) {
        return { 
            label: t("text167"), 
            desc: t("text168"), 
            color: "text-red-500", bg: "bg-red-50", border: "border-red-100", 
            icon: <FaExclamationCircle/> 
        };
    }



    if (sourceTx.phase === TxPhase.ACTIVE_WAITING_PROOF || (isBtcInbound && destTx.phase === TxPhase.ACTIVE_WAITING_PROOF) ) {
        return { 
            label: t("text169"), 
            desc: t("text170"), 
            color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`,
            icon: <FaClock className="animate-spin"/> 
        };
    }

    if (sourceTx.phase === TxPhase.OPERATOR_DUTY_EXPIRED || (isBtcInbound && destTx.phase === TxPhase.OPERATOR_DUTY_EXPIRED)) {
        return { 
            label: t("text167"), 
            desc: t("text171"), 
            color: "text-red-500", bg: "bg-red-50", border: "border-red-100", 
            icon: <FaExclamationTriangle/> 
        };
    }

    if (sourceTx.phase === TxPhase.COMPLETED || (isBtcInbound && destTx.phase === TxPhase.COMPLETED)) {
        if (isOutbound && isBitcoin) {
            return { 
                label: t("text172"), 
                desc: t("text173"),
                color: "text-green-600", bg: "bg-green-50", border: "border-green-100", 
                icon: <FaCheckCircle/> 
            };
        }

        if (!destTx.id || destTx.phase !== TxPhase.COMPLETED) {
            if (destTx.phase === TxPhase.OPERATOR_DUTY_EXPIRED ) {
                return { 
                    label: t("text174"), 
                    desc: t("text175"), 
                    color: "text-red-500", bg: "bg-red-50", border: "border-red-100", 
                    icon: <FaExclamationTriangle/> 
                };
            }

             else  if ( destTx.phase === TxPhase.USER_ACTION_EXPIRED) {
                return { 
                    label: t("text167"), 
                    desc: t("text168"), 
                    color: "text-red-500", bg: "bg-red-50", border: "border-red-100", 
                    icon: <FaExclamationTriangle/> 
                };
            }   else  if ( destTx.phase === TxPhase.REFUNDED) {
                             return { label: t("text180"), desc: t("text181"), color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-100", icon: <FaWallet /> };
                        }
                      
            return { 
                label: t("text176"), 
                desc: isOutbound ? `${t("text177")} ${destinationNetworkName} ${t("text178")}` : t("text179"),    
                color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`, 
                icon: <FaClock className="animate-spin"/> 
            };
        }

        return { 
            label: t("text172"), 
            desc: t("text173"), 
            color: "text-green-600", bg: "bg-green-50", border: "border-green-100", 
            icon: <FaCheckCircle/> 
        };
    }

    if (sourceTx.phase === TxPhase.REFUNDED  || (isBtcInbound && destTx.phase === TxPhase.REFUNDED)) {
        return { 
            label: t("text180"), 
            desc: t("text181"), 
            color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-100", 
            icon: <FaWallet/> 
        };
    }

    return { 
        label: t("text182"), 
        desc: t("text183"), 
        color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-100", 
        icon: null 
    };
};


  if (!connected) {
     return (
        <div className="flex flex-col gap-3 py-4 mb-4 pb-40 lg:pb-32">
          <div className="bgBox glass-card">
            <div className="flex flex-col justify-center gap-5 pb-5 text-center px-4 pt-6">
              <div className="p-5 glass-card shadow-buttonNav! flex justify-center items-center mx-auto w-28 h-28 rounded-full">
                <Icon
                  icon="iconoir:wallet-solid"
                  className={`text-6xl ${colorFlip} text-end`}/>
         
              </div>
              <h2 className="text-xl font-bold text-center">
              {t("text184")}
              </h2>
             
            </div>
          </div>
        </div>
      );
  }

  return (
    <>
      <div className="flex flex-col gap-6  pb-40 lg:pb-32">
    
     {!isAllFulfilled && (
       <div className="flex flex-col gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-pulse">
    
    <div className="flex items-start gap-3">
          <Icon icon="solar:danger-triangle-bold" className="text-red-500 text-xl shrink-0 mt-0.5" />
               <div className="flex flex-col gap-0.5">
                 <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{t("text26")}</p>
                 <p className="text-[11px] font-bold leading-relaxed">
                    {dynamicMismatchText}
                 </p>
          </div>
        </div>

        <button
          onClick={handleSwitchAll}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-lg active:scale-[0.98]"
        >
          {mismatches.length > 1 ? `${t("text185")}` : `${t("text153")}`}
        </button>
      </div>
    )}

      {feeCredit > BigInt(0) && (
        <div className="p-4 rounded-xl border border-black/10 bg-white flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{locale === "en" ? "Refund available" : "Pengembalian tersedia"}</p>
            <p className="text-sm">{(Number(feeCredit) / 10 ** (activeProvider?.ipowDecimals ?? 18)).toLocaleString(undefined, { maximumFractionDigits: 8 })} {activeProvider?.currencyTicker}</p>
            <p className="text-[11px] opacity-70">{locale === "en" ? "The fees of your conversions that nobody took, in one claim." : "Biaya konversi Anda yang tidak diambil siapa pun, dalam satu klaim."}</p>
          </div>
          <Button chain={network} buttonText={withdrawing ? t("text10") : (locale === "en" ? "Claim refund" : "Klaim pengembalian")} onClick={() => withdrawFeeCredit()} disabled={withdrawing} />
        </div>
      )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={`flex gap-1 glass-card cursor-pointer hover:bg-secondary/10 p-3 shadow-buttonNav rounded-full w-fit items-center`}
            onClick={() => setShowFilterModal(true)}
          >
            <Icon icon="basil:filter-outline" className={`text-2xl ${color}}`} />
            <span className="sm:text-sm text-[10px]">Filter</span>
          </button>
        </div>

      
        {isLoading && transactions.length === 0 ? (
             <div className="bgBox glass-card p-6 text-center"><h2 className="text-xl font-bold animate-pulse">{t("text186")}...</h2></div>
        ) : filteredTransactions.length === 0 ? (
             <div className="bgBox glass-card p-6 text-center"><h2 className="text-xl font-bold">{t("text66")}</h2></div>
        ) : (
            <>
                <div className="space-y-3">
                    {paginatedTransactions.map((tx) => {
                        const key =  tx.networkId+"-"+tx.id;
                        const isOutbound = tx.isNativeToBitcoin;
                        const partnerId = tx.networkId; 
                       

    const sourceAsset = getAssetInfo(isOutbound ? tx.contractChainId : partnerId, isOutbound ? tx : (tx.originTx ?? undefined))!;
    const destAsset = getAssetInfo(isOutbound ? partnerId : tx.contractChainId, isOutbound ? (tx.destinationTx ?? undefined) : tx)!;

    const partnerTx = isOutbound ? tx.destinationTx : tx.originTx;

    const unifiedStatus = getUnifiedStatusConfig(
        tx, 
        partnerTx,        
    );

    let sourceTxObj = isOutbound ? tx : partnerTx;
    let destTxObj = isOutbound ? partnerTx : tx;

    let inputRaw = isOutbound ? tx.nativeAmount : (partnerTx?.nativeAmount || tx.bitcoinAmount || "0");
    let outputRaw = "0";
    let isEstimated = false;

    // A tunnel's swap: what is sold and what is bought are both fixed on
    // chain (the buy's amount, the sale's or the tunnel's record), not
    // estimates.
    const tn = tx.tunnel?.tunnel;
    if (tn && tx.tunnel.leg === "buy") {
        inputRaw = partnerTx?.nativeAmount ?? tn.amountIn;
        if (!partnerTx) { sourceAsset.tokenSymbol = tn.fromSymbol ?? sourceAsset.tokenSymbol; sourceAsset.tokenDecimals = tn.fromDecimals ?? sourceAsset.tokenDecimals; }
        outputRaw = tx.nativeAmount;
    } else if (tn) {
        inputRaw = tx.nativeAmount;
        outputRaw = partnerTx?.nativeAmount ?? tn.amountOut;
        if (!partnerTx) { destAsset.tokenSymbol = tn.toSymbol ?? destAsset.tokenSymbol; destAsset.tokenDecimals = tn.toDecimals ?? destAsset.tokenDecimals; }
    }

    const isDestCompleted = isOutbound 
        ? (partnerTx && partnerTx.phase === TxPhase.COMPLETED)
        : (tx.phase === TxPhase.COMPLETED);

    if (tn) {
        // Set above.
    } else if (isDestCompleted) {
        outputRaw = isOutbound ? partnerTx.nativeAmount : tx.nativeAmount;
    } else {
        let btcSats = "0";
        if (destTxObj?.bitcoinAmount && destTxObj.bitcoinAmount !== "0") btcSats = destTxObj.bitcoinAmount;
        else if (sourceTxObj?.bitcoinAmount && sourceTxObj.bitcoinAmount !== "0") btcSats = sourceTxObj.bitcoinAmount;

        if (btcSats !== "0") {
            outputRaw = tx.estimatedOutput && tx.estimatedOutput !== "0" ? tx.estimatedOutput : btcSats;
            isEstimated = true;
        } else {
            outputRaw = tx.estimatedOutput || "0";
            isEstimated = true;
        }
    }

  
    const inputFormatted = (Number(inputRaw) / (10 ** sourceAsset.tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 8 });
    const sourceAmountStr = `- ${inputFormatted} ${sourceAsset.tokenSymbol}`;
    
    let destAmountStr = "...";
    if (outputRaw && outputRaw !== "0") {
        const formatted = (Number(outputRaw) / (10 ** destAsset.tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 8 });
        destAmountStr = `${isEstimated ? "≈ +" : "+"} ${formatted} ${destAsset.tokenSymbol}`;
    }
                      
                        return (
                         <div key={key} className="flex flex-col gap-1">
                         <button onClick={() => handleTxClick(tx)} className="w-full text-left bgBox glass-card hover:bg-secondary/5 cursor-pointer px-3 py-3 rounded-lg border border-transparent hover:border-gray-100 transition-all">
    

    <div className="flex items-center justify-between pb-2 border-b border-gray-50/50 mb-2">
        <div className="flex items-center gap-2">
            <p className="font-bold text-xs sm:text-sm ">{t("text25")}</p>           

             <span className="text-[10px] font-bold tracking-widest">• {t("text187")}: {tx.id}</span>
        </div>
        <span className="text-[9px] sm:text-xs ">{timeAgo(tx.createdAt)}</span>
    </div>


    <div className="flex justify-between items-center gap-2">
        

        <div className="flex items-center gap-2 md:gap-4 min-w-0 overflow-hidden">
            
            
            <div className="flex items-center shrink-0">
          
                <div className="relative w-6 h-6 md:w-8 md:h-8">
                    <div className="absolute inset-0 rounded-full bg-white overflow-hidden shadow-sm z-10 border border-gray-50">
                        {sourceAsset.tokenLogo && <Image src={sourceAsset.tokenLogo} alt={sourceAsset.tokenSymbol} fill className="object-cover" />}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 rounded-full border border-white bg-white overflow-hidden z-20 shadow-sm">
                        {sourceAsset.networkLogo && <Image src={sourceAsset.networkLogo} alt={sourceAsset.networkName} fill className="object-cover" />}
                    </div>
                </div>

       
                <div className="flex items-center mx-1 md:mx-2">
                    <FaArrowRight className=" text-[10px] md:text-xs" />
                </div>

      
                <div className="relative w-6 h-6 md:w-8 md:h-8">
                    <div className="absolute inset-0 rounded-full bg-white overflow-hidden shadow-sm z-10 border border-gray-50">
                        {destAsset.tokenLogo && <Image src={destAsset.tokenLogo} alt={destAsset.tokenSymbol} fill className="object-cover" />}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 rounded-full border border-white bg-white overflow-hidden z-20 shadow-sm">
                        {destAsset.networkLogo && <Image src={destAsset.networkLogo} alt={destAsset.networkName} fill className="object-cover" />}
                    </div>
                </div>
            </div>

   
            <div className="flex flex-col min-w-0 justify-center">
                <span className="font-bold  text-xs sm:text-sm truncate">
                    {sourceAsset.tokenSymbol} <span>→</span> {destAsset.tokenSymbol}
                </span>
                
              
                <div className="flex flex-col gap-0.5 mt-1">
                    <div className={`flex items-center w-fit gap-1 text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap ${unifiedStatus.bg} ${unifiedStatus.color}`}>
                        {unifiedStatus.icon}
                        <span>{unifiedStatus.label}</span>
                    </div>
                </div>
            </div>
        </div>

  
        <div className="text-right flex flex-col justify-center shrink-0">
            <p className="font-medium text-[10px] sm:text-xs whitespace-nowrap">{sourceAmountStr}</p>
            <p className={`text-xs sm:text-sm font-bold whitespace-nowrap`}>{destAmountStr}</p>
        </div>

    </div>
</button>
                         {/* A closed conversion whose fee waits in the user's credit: its refund, claimed here. */}
                         {(feeCredit > BigInt(0) && (tx.phase === TxPhase.REFUNDED || tx.phase === TxPhase.OPERATOR_APPROVAL_EXPIRED) && tx.swap?.job?.stage === "Expired") && (
                           <div className="flex justify-end px-3">
                             <button type="button" disabled={withdrawing} onClick={() => withdrawFeeCredit()} className="text-[11px] font-bold underline disabled:opacity-50">
                               {withdrawing ? t("text10") : (locale === "en" ? "Claim refund" : "Klaim pengembalian")}
                             </button>
                           </div>
                         )}
                         </div>
                        )
                    })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={`p-2 rounded-full border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-300 shadow-sm'}`}
                        >
                            <FaChevronLeft className="text-xs" />
                        </button>
                        <span className="text-xs font-semibold ">{t("text188")} {currentPage} {t("text189")} {totalPages}</span>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={`p-2 rounded-full border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-300 shadow-sm'}`}
                        >
                            <FaChevronRight className="text-xs" />
                        </button>
                    </div>
                )}
            </>
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
              const isActive = filterMode === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setFilterMode(opt.key as any);
                    setShowFilterModal(false);
                  }}
                  className={`w-full text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                    isActive
                      ? "border-black/20 bg-black/5"
                      : "border-black/5 hover:bg-black/5"
                  }`}
                >
                  <span className={`font-bold lg:text-sm ${isActive ? '' : 'opacity-80'}`}>
                    {opt.label}
                  </span>
                  {isActive && <FaCheckCircle className="text-[18px] text-green-500" />}
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
}