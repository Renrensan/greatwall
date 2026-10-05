'use client';

import { getAddress, isAddress } from 'ethers';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import bs58 from 'bs58';

import Image from "next/image";
import greatwallLogo from "@/assets/greatwall-logo.png";
import { 
    FaCheckCircle, FaClock, FaExclamationTriangle, 
    FaCube, FaCopy, FaLink,
    FaExclamationCircle, FaWallet, FaExchangeAlt,
   FaArrowRight,
   FaInfoCircle,
} from 'react-icons/fa';

import { useEthereumWallet } from '@/components/ethereum/ethereum-provider';
import { useBitcoinWallet } from '@/components/bitcoin/bitcoin-provider';
import { useSolanaWallet } from '@/components/solana/solana-provider';
import { useBaseWallet } from '@/components/base/base-provider';
import { useRobinhoodWallet } from '@/components/robinhood/robinhood-provider';
import { useHyperliquidWallet } from '@/components/hyperliquid/hyperliquid-provider';
import { setTunnelSell } from '@/components/integrator/ipow/tunnel';
import { TUNNEL_MARGIN_BLOCKS } from '@/components/integrator/ipow/convertMethods';
import { bitcoinExplorer } from '@/components/integrator/ipow/sdk';
import { tunnelStatus } from '@/components/integrator/ipow/convertStatus';
import ConvertDetails from '@/subcomponents/ConvertDetails';
import { Bitcoin } from '@ipow/sdk';

const bitcoinChain = bitcoinExplorer;
import { SupportedChain, useNetwork } from '@/app/network-provider';

import Button from "@/subcomponents/Button"; 
import { BitcoinConnectButton } from '@/subcomponents/BitcoinConnectButton';
import { EthereumConnectButton } from '@/subcomponents/EthereumConnectButton';
import { SolanaConnectButton } from '@/subcomponents/SolanaConnectButton';
import { BaseConnectButton } from '@/subcomponents/BaseConnectButton';
import { RobinhoodConnectButton } from '@/subcomponents/RobinhoodConnectButton';
import { HyperliquidConnectButton } from '@/subcomponents/HyperliquidConnectButton';
import { Icon } from '@iconify/react';
import ButtonContrast from '@/subcomponents/ButtonContrast';
import { useTranslations } from 'next-intl';
import { AnimatedModal } from '@/subcomponents/AnimatedModal';
import InformationPopUp from '@/subcomponents/InformationPopUp';
import { TxPhase, TypeFilter } from '@/components/integrator/ipow/evm/type';

const PROTOCOL_TERMS = {
  epochStart: { en: { title: "First Epoch", description: "The first block of every 2016 Bitcoin block cycle (estimated ~2 weeks). It dictates the minimum mining difficulty used to ensure the trustless security of your transaction." }, id: { title: "First Epoch", description: "Blok pertama dari setiap siklus 2016 blok Bitcoin (estimasi ~2 minggu). Ini menentukan kesulitan penambangan minimum untuk memastikan keamanan transaksi secara trustless." } },
  anchor: { en: { title: "Anchor Block", description: "A highly finalized recent Bitcoin block (~6 confirmations) used as the cryptographic key and starting point to securely verify your transaction." }, id: { title: "Anchor Block", description: "Blok Bitcoin terbaru dengan finalitas tinggi (~6 konfirmasi) yang digunakan sebagai kunci kriptografis dan titik awal untuk memverifikasi transaksi secara aman." } },
  depositEnd: { en: { title: "Deposit End", description: "The final deposit block deadline. Once this block is reached, you can no longer make a deposit to continue the conversion." }, id: { title: "Deposit End", description: "Batas waktu deposit blok terakhir. Setelah blok ini tercapai, kamu tidak dapat lagi melakukan deposit untuk melanjutkan konversi." } },
  pendingProof: { en: { title: "Pending Proof", description: "Cryptographic evidence has been submitted and is currently waiting to be verified by block streaming the highly finalized blocks (~6 confirmations) until the height of the proof. If valid, the pending proof will be marked as verified proof." }, id: { title: "Pending Proof", description: "Bukti kriptografis telah dikirim dan saat ini sedang menunggu verifikasi dengan menyiarkan blok dengan finalitas tinggi (~6 konfirmasi) sampai blok dari proof tercapai. Jika valid, pending proof akan ditandai menjadi proof yang valid." } },
  incorrectProof: { en: { title: "Incorrect Proof", description: "The submitted cryptographic proof was invalid. A valid proof must be resubmitted." }, id: { title: "Incorrect Proof", description: "Bukti kriptografis yang dikirimkan tidak valid. Bukti yang valid harus dikirim ulang." } },
  verifiedProof: { en: { title: "Verified Proof", description: "The cryptographic proof has been successfully verified on-chain, and the proof can be used to finalize the transaction." }, id: { title: "Verified Proof", description: "Bukti kriptografis telah berhasil diverifikasi secara on-chain, dan proof dapat menyelesaikan transaksi." } },
  proofEnd: { en: { title: "Proof End", description: "The final send proof block deadline. If a valid proof is not submitted by this block, the transaction is closed by the protocol rules." }, id: { title: "Proof End", description: "Batas waktu proof dikirim. Jika bukti yang valid tidak dikirimkan pada blok ini, transaksi ditutup oleh aturan protokol." } }
};

const MAX_HEADERS_PER_TX = 40;
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

const toBigIntSafe = (v: any) => { try { return BigInt(v.toString()); } catch { return null; }};

const swapEndian = (hex0x: string) => {
    if (!hex0x) return '';
    const from0x = (h: string) => (h.startsWith('0x') ? h.slice(2) : h);
    const s = from0x(hex0x);
    if (s.length !== 64) return hex0x; 
    return s.match(/.{2}/g)!.reverse().join('');
}

const formatAmt = (amt: any, decimals: number) => {
    if(!amt || amt === "0" || amt === 0) return "0";
    return (Number(amt) / (10 ** decimals)).toLocaleString(undefined, { maximumFractionDigits: 8 });
};

const getUnixTsFromField = (v: any): number | null => {
  if (!v && v !== 0) return null;
  try {
    if (typeof v === 'bigint') return Number(v);
    if (typeof v === 'number') return v;
    if (typeof v.toString === 'function') {
      const n = Number(v.toString());
      return Number.isNaN(n) ? null : n;
    }
    return Number(v) || null;
  } catch { return null; }
};

const decodeNetworkAddress = (hex: string | any, networkKey?: string): string => {
    if (!hex || hex === "0x" || typeof hex !== 'string') return "Unknown";

   
    if (isAddress(hex)) {
        return getAddress(hex); 
    }


    const safeHex = String(hex);


    if (networkKey === 'solana') {
        try {
            const cleanHex = safeHex.replace(/^0x/, '');
            return bs58.encode(Buffer.from(cleanHex, 'hex'));
        } catch (e) { console.warn("Base58 Decode Error", e); }
    }

    try {
        const cleanHex = safeHex.replace(/^0x/, '');
        let str = '';
        for (let i = 0; i < cleanHex.length; i += 2) {
            str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
        }
        
        if (/^[a-zA-Z0-9\.\-_]+$/.test(str)) return str;
    } catch (e) {}

    return safeHex; 
};
const truncateAddr = (addr: string) => {
    if (!addr) return '---';
    if (addr.includes(' ')) return addr; 
    if (addr.length < 15) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

export default function ConvertTransactionPage() {
  const t = useTranslations("All");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const network = params.network as SupportedChain; 
  const linkedParam = searchParams.get('linked');
  const txIdStr = params.id as string;

  const colorFlip = 'text-black';
  const bgFlip = 'bg-black/10';
  const borderFlip = 'border-black';

  const [isShowDetails, setIsShowDetails] = useState(false);
  const [mempoolDetectedTx, setMempoolDetectedTx] = useState<{txid: string, vout: number, height: number} | null>(null);
  const [isScanningMempool, setIsScanningMempool] = useState(false);
  const [activeInfoTerm, setActiveInfoTerm] = useState<keyof typeof PROTOCOL_TERMS | null>(null);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [txid, setTxid] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null); 
  
  const ethereumWallet = useEthereumWallet();
  const bitcoinWallet = useBitcoinWallet();
  const solanaWallet = useSolanaWallet();
  const baseWallet = useBaseWallet();
  const robinhoodWallet = useRobinhoodWallet();
  const hyperliquidWallet = useHyperliquidWallet();
  const { scriptPubKeyHexToAddress } = useBitcoinWallet();

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

  const activeProvider: any = useMemo(() => {
    const effectiveNetwork = (network === 'bitcoin' && linkedParam)
        ? linkedParam
        : network;

    switch(effectiveNetwork) {
        case 'ethereum': return ethereumWallet;
        case 'solana': return solanaWallet;
        case 'base': return baseWallet;
        case 'robinhood': return robinhoodWallet;
        case 'hyperliquid': return hyperliquidWallet;
        default: return ethereumWallet;
    }
  }, [network, linkedParam, ethereumWallet, solanaWallet, baseWallet, robinhoodWallet, hyperliquidWallet]);

  const [conversion, setConversion] = useState<any>(null);
  const [partnerConversion, setPartnerConversion] = useState<any>(null); 
  const [estimatedOutput, setEstimatedOutput] = useState<string | null>(null);
  const [extraData, setExtraData] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  
  const [selectedBlockHeight, setSelectedBlockHeight] = useState<string | null>(null);
  const headerCache = useRef<Record<string, string>>({});

  const {
    bitcoinMainnet, setBitcoinMainnet,
    ethereumMainnet, setEthereumMainnet,
    solanaMainnet, setSolanaMainnet
  } = useNetwork();

  const mismatches = useMemo(() => {
    const checks = [
      { name: bitcoinWallet.networkName, current: bitcoinMainnet, required: bitcoinWallet.ipowConvert, setter: setBitcoinMainnet },
      { name: ethereumWallet.networkName, current: ethereumMainnet, required: ethereumWallet.ipowConvert, setter: setEthereumMainnet },
      { name: solanaWallet.networkName, current: solanaMainnet, required: solanaWallet.ipowConvert, setter: setSolanaMainnet },
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

    if (phrases.length === 1) return locale == "en" ? `Please select ${phrases[0]} in the wallet settings to use Convert.` :  `Mohon pilih wallet ${phrases[0]} di pengaturan wallet untuk menggunakan Konversi`;
    if (phrases.length === 2) return locale == "en" ? `Please select ${phrases[0]} and ${phrases[1]} in the wallet settings to use Convert.` : `Mohon pilih wallet ${phrases[0]} dan ${phrases[1]} di pengaturan wallet untuk menggunakan Konversi`;
    
    const lastPhrase = phrases.pop();
    return locale == "en" ? `Please select ${phrases.join(', ')}, and ${lastPhrase} in the wallet settings to use Convert.` :  `Mohon pilih wallet  ${phrases.join(', ')}, dan ${lastPhrase} di pengaturan wallet untuk  untuk menggunakan Konversi`;
  }, [mismatches]);

  const handleSwitchAll = () => {
    mismatches.forEach(m => m.setter(m.required === 'mainnet'));
  };

  const isAuthorized = useMemo(() => {
    if (!conversion || !activeProvider) return false;

    const nativeOwner = conversion.user?.toLowerCase();
    const partnerId = conversion.networkId; 
    const contractId = activeProvider.ipowNetworkId;
    
    let isMatch = false;

    if (network === 'bitcoin') {
        if (partnerId === 0 && bitcoinWallet.connected && bitcoinWallet.address) {
            try {
                const btcParticipant = btcAddressOf(conversion.userProgram);
                isMatch = !!btcParticipant && bitcoinWallet.address.toLowerCase() === btcParticipant.toLowerCase();
            } catch (e) { isMatch = false; }
        }
    } else {
        const activeAddress = activeProvider.address?.toLowerCase();
        const activeConnected = activeProvider.connected;

        if (activeConnected && activeAddress) {
            if (activeProvider.ipowNetworkId === contractId) {
                isMatch = activeAddress === nativeOwner;
            } else if (activeProvider.ipowNetworkId === partnerId) {
                const partnerDecoded = conversion.networkAddress && conversion.networkAddress !== "0x"
                    ? decodeNetworkAddress(conversion.networkAddress, networkConfigs.find((n) => n.id === partnerId)?.key).toLowerCase()
                    : null;
                isMatch = activeAddress === partnerDecoded;
            }
        }
    }

    return isMatch;

  }, [
    conversion, 
    network,
    activeProvider,
    ethereumWallet.address, ethereumWallet.connected,
    bitcoinWallet.address, bitcoinWallet.connected
  ]);

  const getUnifiedStatusConfig = (localTx: any, partnerTx: any) => {
    const isBitcoin = localTx.networkId === 0;
    const isOutbound = localTx.isNativeToBitcoin;
    
    const sourceTx = isOutbound ? localTx : (partnerTx || {});
    const destTx = isOutbound ? (partnerTx || {}) : localTx;
    const isBtcInbound = !isOutbound && isBitcoin;

    const targetChainId = isOutbound ? localTx.networkId : (localTx.contractChainId ?? activeProvider.ipowNetworkId);
    const destinationNetworkName = networkConfigs.find((n) => n.id === targetChainId)?.name ?? "";

    // A tunnel's swap: the shared words (convertStatus.ts), styled here.
    const sourceNetworkName = networkConfigs.find((n) => n.id === (isOutbound ? (localTx.contractChainId ?? activeProvider.ipowNetworkId) : localTx.networkId))?.name ?? "";
    const tunnel = tunnelStatus(localTx, partnerTx, { source: sourceNetworkName, destination: destinationNetworkName }, t, locale);
    if (tunnel) {
        const style = {
            wait: { color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`, icon: <FaClock className="animate-pulse"/> },
            action: { color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`, icon: <FaLink className="animate-pulse"/> },
            progress: { color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`, icon: <FaClock className="animate-spin"/> },
            ok: { color: "text-green-600", bg: "bg-green-50", border: "border-green-100", icon: <FaCheckCircle/> },
            fail: { color: "text-red-600", bg: "bg-red-50", border: "border-red-100", icon: <FaExclamationTriangle/> },
            closed: { color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-100", icon: <FaWallet /> },
        }[tunnel.kind];
        return { label: tunnel.label, desc: tunnel.desc, ...style };
    }
    
    if (sourceTx.phase === TxPhase.WAITING_OPERATOR_APPROVAL || (isBtcInbound && destTx.phase === TxPhase.WAITING_OPERATOR_APPROVAL)) {
        return { 
            label:  `${t("text155")} ${destinationNetworkName}`, 
            desc: t("text156"), 
            color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`,
            icon: <FaClock className="animate-pulse"/> 
        };
    }

    if (sourceTx.phase === TxPhase.OPERATOR_APPROVAL_EXPIRED || (isBtcInbound && destTx.phase === TxPhase.OPERATOR_APPROVAL_EXPIRED)) {
        return { 
            label: t("text157"), 
            desc:  t("text158"), 
            color:"text-red-600", bg: "bg-red-50", border: "border-red-100", 
            icon: <FaExclamationCircle/> 
        };
    }

    if (sourceTx.phase === TxPhase.WAITING_USER_ACTION || (isBtcInbound && destTx.phase === TxPhase.WAITING_USER_ACTION)) {
        if (isBtcInbound) {
            const isCurrentlyOnBtcView = network === 'bitcoin';
            return {
                label: t("text161"),
                desc:  isCurrentlyOnBtcView ? t("text162") : t("text289"),
                color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`,
                icon: <FaLink className="animate-pulse"/>
            };
        }
        if (!destTx.id && isOutbound && !isBitcoin) {
            return { 
                label: t("text159"), 
                desc: `${t("text160")} ${destinationNetworkName}...`, 
                 color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`,
                icon: <FaLink className="animate-pulse"/> 
            };
        }
        return { 
            label: t("text161"), 
            desc: isOutbound ?  t("text164") : t("text163"), 
            color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`,
            icon: <FaLink/> 
        };
    }

    if (sourceTx.phase === TxPhase.USER_ACTION_EXPIRED ) {
        return { 
            label: t("text165"),
            desc:  t("text166"),
            color:"text-red-600", bg: "bg-red-50", border: "border-red-100", 
            icon: <FaExclamationCircle/> 
        };
    }

     if (isBtcInbound && destTx.phase === TxPhase.USER_ACTION_EXPIRED) {
        return { 
            label:t("text167"),
            desc: t("text168"),
            color: "text-red-600", bg: "bg-red-50", border: "border-red-100", 
            icon: <FaExclamationCircle/> 
        };
    }

    if (sourceTx.phase === TxPhase.ACTIVE_WAITING_PROOF || (isBtcInbound && destTx.phase === TxPhase.ACTIVE_WAITING_PROOF) ) {
        return { 
            label:  t("text169"),
            desc:  t("text170"),
            color: `${colorFlip}`, bg: `${bgFlip}/10`, border: `${borderFlip}`,
            icon: <FaClock className="animate-spin"/> 
        };
    }

    if (sourceTx.phase === TxPhase.OPERATOR_DUTY_EXPIRED || (isBtcInbound && destTx.phase === TxPhase.OPERATOR_DUTY_EXPIRED)) {
        return { 
            label: t("text167"),
            desc: t("text171"),
            color: "text-red-600", bg: "bg-red-50", border: "border-red-100", 
            icon: <FaExclamationTriangle/> 
        };
    }

    if (sourceTx.phase === TxPhase.COMPLETED || (isBtcInbound && destTx.phase === TxPhase.COMPLETED)) {
        if (isOutbound && isBitcoin) {
            return { 
                label:t("text72"),
                desc: t("text173"),
                color: "text-green-600", bg: "bg-green-50", border: "border-green-100", 
                icon: <FaCheckCircle/> 
            };
        }

        if (!destTx.id || destTx.phase !== TxPhase.COMPLETED ) {
            if (destTx.phase === TxPhase.OPERATOR_DUTY_EXPIRED ) {
                return { label:  t("text174"), desc:  t("text171"), color: "text-red-600", bg: "bg-red-50", border: "border-red-100", icon: <FaExclamationTriangle/> };
            }
             else  if ( destTx.phase === TxPhase.USER_ACTION_EXPIRED) {
                return { label: t("text167"), desc: t("text168"), color: "text-red-600", bg: "bg-red-50", border: "border-red-100", icon: <FaExclamationTriangle/> };
            }
              else  if ( destTx.phase === TxPhase.REFUNDED) {
                 return { label: t("text180"), desc: t("text181"), color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-100", icon: <FaWallet /> };
            }
            return { label:  t("text176"), desc: isOutbound ? `${t("text177")} ${destinationNetworkName} ${t("text178")}.` : t("text179"),    color: `${colorFlip}`, bg: `${bgFlip}`, border: `${borderFlip}`, icon: <FaClock className="animate-spin"/> };
        }

        return { 
            label: t("text72"), 
            desc:  t("text173"), 
            color: "text-green-600", bg: "bg-green-50", border: "border-green-100", 
            icon: <FaCheckCircle/> 
        };
    }

    if (sourceTx.phase === TxPhase.REFUNDED  || (isBtcInbound && destTx.phase === TxPhase.REFUNDED)) {
        return { label: t("text180"), desc: t("text181"), color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-100", icon: <FaWallet /> };
    }

    return { label:  t("text182"), desc:  t("text183"), color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-100", icon: null };
  };

  /** A Bitcoin address from an output script, or null: the new protocol does
   *  not keep a buy's user script (it is "0x"), and a script the wallet
   *  cannot name is no address. */
  const btcAddressOf = (hex: string | null | undefined): string | null => {
      if (!hex || hex === "0x") return null;
      try { return scriptPubKeyHexToAddress(hex) || null; } catch { return null; }
  };

  const fetchData = useCallback(async (firstLoad = false) => {
    if (!txIdStr || !activeProvider) return;
    if (firstLoad) setLoading(true);

    try {
        const txId = BigInt(txIdStr);


        const localData = await activeProvider.getConversion(txId);
        if (!localData) {
            setLoading(false);
            return;
        }

        const isOutbound = localData.isNativeToBitcoin;
        const partnerId = localData.networkId || 0;
        const isNativeToNative = partnerId !== 0;

        const getProviderById = (id: number) => {
            if (id === ethereumWallet.ipowNetworkId) return ethereumWallet;
            if (id === solanaWallet.ipowNetworkId) return solanaWallet;
            if (id === baseWallet.ipowNetworkId) return baseWallet;
            if (id === robinhoodWallet.ipowNetworkId) return robinhoodWallet;
            if (id === hyperliquidWallet.ipowNetworkId) return hyperliquidWallet;
            return null;
        };


        let partnerData = null;
        let partnerProvider = getProviderById(partnerId);

        if (isNativeToNative && partnerProvider) {
            try {
                const hasValidProgram = localData.userProgram && localData.userProgram !== "0x" && localData.userProgram.length > 2;
                const hasValidReceive = localData.ipowReceiveProgram && localData.ipowReceiveProgram !== "0x" && localData.ipowReceiveProgram.length > 2;

                let ids: bigint[] = [];
                if (localData.partnerTxId) {
                    ids = [BigInt(localData.partnerTxId)];
                } else if (localData.tunnel) {
                    ids = [];
                } else if (isOutbound && hasValidProgram) {
                    ids = await partnerProvider.getMyTxIds(TxPhase.NONE, TypeFilter.ANY, localData.userProgram, false) as any;
                } else if (!isOutbound && hasValidReceive) {
                    ids = await partnerProvider.getMyTxIds(TxPhase.NONE, TypeFilter.ANY, localData.ipowReceiveProgram, true) as any;
                }

                if (ids && ids.length > 0) {
                    partnerData = await partnerProvider.getConversion(ids[0]);
                    if (partnerData && (partnerData.phase === TxPhase.COMPLETED || partnerData.phase == TxPhase.ACTIVE_WAITING_PROOF) && partnerProvider.proofInfo) {
                        const pProofRes = await partnerProvider.proofInfo(ids[0]).catch(() => null);
                        if (pProofRes) {
                            partnerData.proof = {
                                txidLE: pProofRes[4]?.toString(),
                                blockHeight: pProofRes[6]?.toString(),
                                voutIndex: "0"
                            };
                        }
                    }
                }
            } catch (e) { console.warn("Partner fetch error", e); }
        }


        let estimatedVal = "0";
        let sourceTxObj = isOutbound ? localData : partnerData;
        let destTxObj = isOutbound ? partnerData : localData;

        try {
            let btcSatsStr = "0";
            if (destTxObj?.bitcoinAmount && destTxObj.bitcoinAmount !== "0") {
                btcSatsStr = destTxObj.bitcoinAmount;
            } else if (sourceTxObj?.bitcoinAmount && sourceTxObj.bitcoinAmount !== "0") {
                btcSatsStr = sourceTxObj.bitcoinAmount;
            }

            if (btcSatsStr === "0" && sourceTxObj?.nativeAmount && sourceTxObj.nativeAmount !== "0") {
                const finalSrcProvider = isOutbound ? activeProvider : partnerProvider;
                if (finalSrcProvider?.estimateBitcoinFromNative) {
                    // A token swap: its token's decimals and price.
                    const dec = sourceTxObj.tokenDecimals ?? finalSrcProvider.ipowDecimals;
                    btcSatsStr = await finalSrcProvider.estimateBitcoinFromNative(Number(sourceTxObj.nativeAmount) / (10 ** dec), sourceTxObj.token ?? "native") ?? "0";
                }
            }

            if (btcSatsStr && btcSatsStr !== "0") {
                const destId = isOutbound ? partnerId : activeProvider.ipowNetworkId;
                const finalDestProvider = isOutbound ? partnerProvider : activeProvider;
                if (destId !== 0 && finalDestProvider?.estimateNativeFromBitcoin) {
                    const rawNative = await finalDestProvider.estimateNativeFromBitcoin(btcSatsStr, destTxObj?.token ?? "native");
                    if (rawNative) {
                        const dec = destTxObj?.tokenDecimals ?? finalDestProvider.ipowDecimals;
                        const rawEst = Number(rawNative) * (10 ** dec);
                        let reserved = 0;
                        let hasReserved = false;
                        if (destTxObj) {
                            if (destTxObj.reservedNative && destTxObj.reservedNative !== "0") {
                                reserved = Number(destTxObj.reservedNative);
                                hasReserved = true;
                            } else if (destTxObj.nativeAmount && destTxObj.nativeAmount !== "0" && destTxObj.phase !== TxPhase.COMPLETED) {
                                reserved = Number(destTxObj.nativeAmount);
                                hasReserved = true;
                            }
                        }
                        estimatedVal = (hasReserved && reserved > 0 && rawEst > reserved) ? reserved.toString() : rawEst.toString();
                    }
                } else {
                    estimatedVal = btcSatsStr;
                }
            }
        } catch (e) {}


        let anchorRes = null, proofRes = null, windowRes = null;
        const hasTechnicalData = localData.phase !== TxPhase.NONE && localData.phase !== TxPhase.WAITING_OPERATOR_APPROVAL && localData.phase !== TxPhase.OPERATOR_APPROVAL_EXPIRED;

        if (hasTechnicalData) {
            [anchorRes, proofRes, windowRes] = await Promise.all([
                activeProvider.anchorInfo ? activeProvider.anchorInfo(txId).catch(() => null) : null,
                activeProvider.proofInfo ? activeProvider.proofInfo(txId).catch(() => null) : null,
                activeProvider.windowsFor ? activeProvider.windowsFor(txId).catch(() => null) : null
            ]);
        }

        const localProof = proofRes ? {
            set: Boolean(proofRes[0]),
            verified: Boolean(proofRes[1]),
            invalid: Boolean(proofRes[2]),
            attempts: Number(proofRes[3]),
            txidLE: proofRes[4]?.toString(),
            blockHashLE: proofRes[5]?.toString(),
            blockHeight: proofRes[6]?.toString(),
            outValueSats: proofRes[7]?.toString(),
            outProgram: proofRes[8]?.toString()
        } : null;

        const localWindows = windowRes ? {
            headersStarted: Boolean(windowRes[0]),
            windowStartHeight: windowRes[1],
            lastHeight: windowRes[2]
        } : { headersStarted: false, windowStartHeight: 0, lastHeight: 0 };

        // The new protocol's anchor: the block before the payment blocks (a
        // buy) or the payment window (a tunnel's sale).
        const anchorFromSwap: number | null = localData.payBlocks ? localData.payBlocks.first - 1 : localData.swap?.payWindow ? localData.swap.payWindow.first - 1 : null;
        const anchorHeight = (anchorRes && anchorRes[0]) ? anchorRes[0].toString() : anchorFromSwap ? String(anchorFromSwap) : null;
        const epochFirstHeight = (anchorRes && anchorRes[1]) ? anchorRes[1].toString() : null;
        
        let epochFirstHash = null;
        if (epochFirstHeight  && activeProvider.globalHeightToHashLE) {
            epochFirstHash = await activeProvider.globalHeightToHashLE(BigInt(epochFirstHeight)).catch(() => null);
        }


        const headersList = [];
        if (localWindows.headersStarted && activeProvider.globalHeightToHashLE) {
            const startBI = toBigIntSafe(localWindows.windowStartHeight);
            const lastBI = toBigIntSafe(localWindows.lastHeight);
            
            if (startBI !== null && lastBI !== null && lastBI >= startBI) {
                const maxEnd = startBI + BigInt(MAX_HEADERS_PER_TX);
                const endBI = lastBI < maxEnd ? lastBI : maxEnd;
                
                const heightsToFetch = [];
                for (let h = startBI; h <= endBI; h = h + BigInt(1)) {
                    heightsToFetch.push(h);
                }

                const results = await Promise.all(heightsToFetch.map(async (h) => {
                    const hStr = h.toString();
                    if (headerCache.current[hStr]) return { height: hStr, hashLE: headerCache.current[hStr] };
                    const hashLE = await activeProvider.globalHeightToHashLE(h).catch(() => null);
                    return { height: hStr, hashLE };
                }));

                for (const res of results) {
                    if (res.hashLE && res.hashLE !== ZERO_HASH) {
                        headerCache.current[res.height] = res.hashLE.toString();
                        headersList.push(res);
                    } else { break; }
                }
            }
        }

        // The new protocol streams no headers per swap: the strip shows the
        // Bitcoin blocks from the anchor up, as the explorers have them. The
        // light client accepted the anchor and the proof's block; the rest
        // show where Bitcoin stands against the payment blocks.
        let windows = localWindows;
        if (!windows.headersStarted && anchorFromSwap) {
            const tipNow = await bitcoinChain.tip().catch(() => null);
            if (tipNow) {
                const windowEnd = localData.payBlocks?.last ?? localData.swap?.payWindow?.last ?? anchorFromSwap + 12;
                const last = Math.min(tipNow, Math.max(windowEnd, Number(localProof?.blockHeight ?? 0)));
                const heights: number[] = [];
                for (let h = anchorFromSwap; h <= last; h++) heights.push(h);
                const got = await Promise.all(heights.map(async (h) => {
                    const k = String(h);
                    if (headerCache.current[k]) return { height: k, hashLE: headerCache.current[k] };
                    const display = await bitcoinChain.blockHashAt(h).catch(() => null);
                    if (!display) return { height: k, hashLE: null as string | null };
                    const hashLE = "0x" + (display.match(/../g) ?? []).reverse().join("");
                    headerCache.current[k] = hashLE;
                    return { height: k, hashLE };
                }));
                for (const r of got) { if (r.hashLE) headersList.push(r as any); else break; }
                windows = { headersStarted: headersList.length > 0, windowStartHeight: anchorFromSwap, lastHeight: tipNow };
            }
        }

        // A buy's payment must be in its payment blocks; nothing else in the
        // new protocol ends at a block (the operator's deadline is a time).
        const depositEndHeight = localData.payBlocks ? String(localData.payBlocks.last) : null;
        const tipHeight = localData.payBlocks ? await bitcoinChain.tip().catch(() => null) : null;
        const latestStreamed = tipHeight !== null ? String(tipHeight) : (headersList.length > 0 ? headersList[headersList.length - 1].height : null);

        let endpointBlock = null;
        if (!localData.isNativeToBitcoin && (localData.phase === TxPhase.WAITING_USER_ACTION || localData.phase === TxPhase.USER_ACTION_EXPIRED)) {
            endpointBlock = depositEndHeight;
        }


        setConversion(localData);
        setPartnerConversion(partnerData);
        setEstimatedOutput(estimatedVal);
        setExtraData({ 
            anchorHeight, 
            epochFirstHeight, 
            epochFirstHash, 
            proof: localProof, 
            windows, 
            headers: [...headersList],
            endpointBlock,
            latestStreamed,
            tipHeight,
            showEndpoint: endpointBlock && latestStreamed && (Number(latestStreamed) < Number(endpointBlock)),
            showPendingProof: localProof?.set && !localProof?.verified && (!latestStreamed || BigInt(localProof.blockHeight) > BigInt(latestStreamed)),
            showGap: anchorHeight && epochFirstHeight  && BigInt(anchorHeight) > BigInt(epochFirstHeight) + BigInt(1)
        });

    } catch (e: any) {
        console.error(e);
        if (firstLoad) setError(e.message);
    } finally {
        setLoading(false);
    }
  }, [activeProvider, txIdStr, ethereumWallet, solanaWallet, baseWallet, robinhoodWallet, hyperliquidWallet, scriptPubKeyHexToAddress]);


  useEffect(() => {
      fetchData(true);
      const interval = setInterval(() => fetchData(false), 10000);
      return () => clearInterval(interval);
  }, [fetchData, activeProvider]);


  useEffect(() => {
    if (!conversion || loading) return;

    const actualPartnerId = conversion.networkId; 
    const actualPartnerKey = networkConfigs.find((n) => n.id === actualPartnerId)?.key;
    
    if (network === 'bitcoin') {
        if (actualPartnerId !== 0 && actualPartnerKey) {
            router.replace(`/${locale}/${network}/convert/transaction/${txIdStr}?linked=${actualPartnerKey}`);
        }
    } 
    else {
        if (actualPartnerKey && linkedParam !== actualPartnerKey) {
            const search = new URLSearchParams(window.location.search);
            search.set('linked', actualPartnerKey);
            router.replace(`/${locale}/${network}/convert/transaction/${txIdStr}?${search.toString()}`);
        }
    }
  }, [conversion, network, linkedParam, locale, txIdStr, networkConfigs, loading, router]);

  useEffect(() => {
      if (extraData && !selectedBlockHeight) {
          let target = null;
          if (extraData.proof?.set && extraData.proof?.blockHeight) target = extraData.proof.blockHeight;
          else if (extraData.anchorHeight) target = extraData.anchorHeight;
          else if (extraData.epochFirstHeight) target = extraData.epochFirstHeight;

          if (target) setSelectedBlockHeight(target);
      }
  }, [extraData, selectedBlockHeight]);



  useEffect(() => {
     
      if (
        !conversion || 
        conversion.networkId !== 0 || 
        conversion.isNativeToBitcoin || 
        (conversion.phase !== TxPhase.ACTIVE_WAITING_PROOF && conversion.phase !== TxPhase.WAITING_USER_ACTION)
      ) return;
     
      const depositAddr = btcAddressOf(conversion?.ipowReceiveProgram);
      if (!depositAddr) return;

      const scan = async () => {
          setIsScanningMempool(true);
          try {
              const res = await fetch(`https://mempool.space/api/address/${depositAddr}/txs`);
              if (!res.ok) return;
              const txs = await res.json();

              const expectedSats = conversion.bitcoinAmount;
              const match = txs.find((t: any) => t.vout.some((v: any) => v.value.toString() === expectedSats.toString()));

              if (match) {
                  const voutIndex = match.vout.findIndex((v: any) => v.value.toString() === expectedSats.toString());
                  setMempoolDetectedTx({
                      txid: match.txid,
                      vout: voutIndex,
                      height: match.status.block_height || 0 
                  });
              }
          } catch (e) { console.error("Mempool scanner error:", e); } 
          finally { setIsScanningMempool(false); }
      };

      scan();
      const interval = setInterval(scan, 20000);
      return () => clearInterval(interval);
    }, [conversion, scriptPubKeyHexToAddress]);

  const phase = conversion?.phase;
  const targetTimestamp = useMemo(() => {
      // The auction's end; a buy waits as long again for its operator to lock the coin.
      if (phase === TxPhase.WAITING_OPERATOR_APPROVAL) {
          const end = conversion.swap?.job?.times?.auctionEnd ?? (conversion.createdAt + 900);
          return getUnixTsFromField(conversion.isNativeToBitcoin ? end : end + 1800);
      }
      // Nothing loaded yet: no timer.
      const lockEnd = conversion?.swap?.job?.times?.lockEnd;
      if (phase === TxPhase.ACTIVE_WAITING_PROOF && lockEnd) return getUnixTsFromField(lockEnd);
      if (phase === TxPhase.WAITING_USER_ACTION || phase === TxPhase.ACTIVE_WAITING_PROOF) return getUnixTsFromField(conversion.operatorDutyExpiresAt);
      return null; 
  }, [phase, conversion]);

  const [timerData, setTimerData] = useState<{
      timeLeft: string | null;
      blocksLeft: number | null;
      blockLabel: string;
      isTimeExpired: boolean;
      isBlockExpired: boolean;
  }>({ timeLeft: null, blocksLeft: null, blockLabel: "", isTimeExpired: false, isBlockExpired: false });

  useEffect(() => {
      if (!conversion) {
          setTimerData({ timeLeft: null, blocksLeft: null, blockLabel: "", isTimeExpired: false, isBlockExpired: false });
          return;
      }

      const updateTimers = () => {
          const now = Math.floor(Date.now() / 1000);
          const currentHeight = Number(extraData?.tipHeight || extraData?.windows?.lastHeight || 0);
          const anchor = Number(extraData?.anchorHeight || 0);
          const phase = conversion.phase;

          let timeStr: string | null = null;
          let timeExpired = false;
          
          if (targetTimestamp) {
              const diff = targetTimestamp - now;
              if (diff <= 0) {
                  timeStr = "EXPIRED";
                  timeExpired = true;
              } else {
                  if (phase === TxPhase.WAITING_OPERATOR_APPROVAL) {
                      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
                      const s = (diff % 60).toString().padStart(2, '0');
                      timeStr = `${m}m ${s}s`;
                  } else {
                      const d = Math.floor(diff / 86400);
                      const h = Math.floor((diff % 86400) / 3600).toString().padStart(2, '0');
                      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
                      const s = (diff % 60).toString().padStart(2, '0');
                      timeStr = d > 0 ? `${d}${t("text222")} ${h}${t("text223")} ${m}${t("text224")}` : `${h}${t("text223")} ${m}${t("text224")} ${s}${t("text225")}`;
                  }
              }
          }

          let bLeft: number | null = null;
          let bLabel = "";
          let bExpired = false;
          
          if (anchor > 0 && currentHeight > 0) {
              let targetBlock = 0;
              // A buy's payment: its last payment block.
              if (!conversion.isNativeToBitcoin && phase === TxPhase.WAITING_USER_ACTION && conversion.payBlocks) {
                  targetBlock = Number(conversion.payBlocks.last);
                  bLabel = t("text252");
              }

              if (targetBlock > 0) {
                  bLeft = targetBlock - currentHeight;
                  bExpired = bLeft <= 0;
                  if (bExpired) bLabel = t("text254");
              }
          }

          setTimerData({
              timeLeft: timeStr,
              blocksLeft: bLeft,
              blockLabel: bLabel,
              isTimeExpired: timeExpired,
              isBlockExpired: bExpired
          });
      };

      updateTimers();
      const ticker = setInterval(updateTimers, 1000);
      return () => clearInterval(ticker);
  }, [conversion, extraData, targetTimestamp]);

  const handleAction = async (action: string) => {
      setBusy(true); 
      setMsg(null); 
      setError(null);
      setLastAction(action); 
      
      const txId = BigInt(txIdStr);
      
      try {
          let hash;
          if (action === 'deposit') hash = await activeProvider.depositApprovedConversion(txId);
          else if (action === 'refund_approval') hash = await activeProvider.refundIfNotApproved(txId);
          else if (action === 'claim_expired') hash = await activeProvider.claimNativeAfterOperatorExpired(txId);
          else if (action === 'refund_timeout') hash = await activeProvider.refundAfterNoProofNativeToBitcoin(txId);
          else if (action === 'complete') hash = await activeProvider.completeConversion(txId);

          if(hash) { 
              setTxid(hash);
              setShowSuccessModal(true);
              setShowErrorModal(false);
              await fetchData(false); 
          }
      } catch(e: any) { 
          console.error(e);
          // Why it failed, in the page, as well as the modal.
          setError(e?.shortMessage ?? e?.reason ?? e?.message ?? String(e));
          setShowErrorModal(true); 
      } finally { 
          setBusy(false); 
      }
    };

  // The fees of the user's untaken jobs, held by the protocol: withdrawn in
  // one transaction, apart from any refund.
  const [feeCredit, setFeeCredit] = useState<bigint>(BigInt(0));
  const readFeeCredit = useCallback(async () => {
      try { setFeeCredit(await activeProvider.feeCredit()); } catch { setFeeCredit(BigInt(0)); }
  }, [activeProvider]);
  useEffect(() => { readFeeCredit(); }, [readFeeCredit, conversion?.phase]);
  const withdrawFeeCredit = async () => {
      setBusy(true);
      setError(null);
      try {
          const hash = await activeProvider.withdrawFeeCredit();
          setTxid(hash);
          setShowSuccessModal(true);
          await readFeeCredit();
      } catch (e: any) {
          setError(e?.shortMessage ?? e?.message ?? String(e));
      } finally {
          setBusy(false);
      }
  };

  /** The wallet of a tunnel's source network. */
  const sourceWalletOf = (chain: string): any => ({ ethereum: ethereumWallet, base: baseWallet, robinhood: robinhoodWallet, hyperliquid: hyperliquidWallet, solana: solanaWallet } as any)[chain];

  // A tunnel's sell signed but not recorded (the wallet's confirmation timed
  // out, the page was closed): found on chain by the address it pays, and
  // recorded, so the page follows it instead of asking for it again.
  useEffect(() => {
      const tn = conversion?.tunnel;
      if (!tn || tn.leg !== "buy" || tn.tunnel.sellId || !conversion?.swap?.address) return;
      const source = sourceWalletOf(tn.tunnel.fromChain);
      if (!source?.connected || !source.sellPaying) return;
      let active = true;
      source.sellPaying(conversion.swap.address).then((id: bigint | null) => {
          if (!active || id === null) return;
          setTunnelSell(tn.tunnel.toChain, tn.tunnel.buyId, id.toString());
          fetchData(false);
      }).catch(() => {});
      return () => { active = false; };
  }, [conversion?.tunnel?.tunnel?.buyId, conversion?.tunnel?.tunnel?.sellId, conversion?.swap?.address, solanaWallet.connected, ethereumWallet.connected, baseWallet.connected, hyperliquidWallet.connected, robinhoodWallet.connected]);

  // A tunnel's sell: checked afresh against the funded buy (its address,
  // sats and payment blocks), then signed with the source network's wallet.
  const startTunnelSell = async () => {
      const tunnel = conversion?.tunnel?.tunnel;
      if (!tunnel || conversion.tunnel.leg !== "buy") return;
      const source: any = sourceWalletOf(tunnel.fromChain);
      setBusy(true);
      setError(null);
      try {
          if (!source?.connected) throw new Error(locale === "en" ? `Connect your ${tunnel.fromChain} wallet first` : `Hubungkan dompet ${tunnel.fromChain} Anda terlebih dahulu`);
          const check = await activeProvider.checkPayable(BigInt(txIdStr), TUNNEL_MARGIN_BLOCKS);
          if (!check.ok) throw new Error(check.reason);
          // The buy must be the one the operator promised: for this user's
          // wallet, the coin, the amount and the sats it quoted.
          const sameUser = tunnel.recipient?.startsWith("0x") ? check.user.toLowerCase() === tunnel.recipient.toLowerCase() : check.user === tunnel.recipient;
          const want = tunnel.token && tunnel.token !== "native" ? tunnel.token.toLowerCase() : null;
          const sameToken = want ? check.token.toLowerCase() === want : /^0x0{40}$/i.test(check.token);
          if (!tunnel.amountOut || !sameUser || !sameToken || check.amount !== BigInt(tunnel.amountOut) || check.sats !== BigInt(tunnel.sats))
              throw new Error(locale === "en" ? "This buy is not the one the operator promised you: do not sell." : "Pembelian ini bukan yang dijanjikan operator kepada Anda: jangan jual.");
          // A sale already paying this buy (signed before, its record lost):
          // a second would be lost, since the buy pays out once.
          const existing = await source.sellPaying(check.address);
          if (existing !== null) {
              setTunnelSell(tunnel.toChain, tunnel.buyId, existing.toString());
              await fetchData(false);
              throw new Error(locale === "en" ? `You already signed this sale (swap ${existing}): do not sign again.` : `Anda sudah menandatangani penjualan ini (swap ${existing}): jangan tandatangani lagi.`);
          }
          const sellId = await source.tunnelSell({ token: tunnel.fromToken ?? "native", amount: BigInt(tunnel.amountIn), sats: check.sats, to: check.address, window: check.payBlocks });
          setTunnelSell(tunnel.toChain, tunnel.buyId, sellId.toString());
          setTxid(null);
          setMsg(locale === "en" ? "Deposit signed. Converting now; this page follows the progress." : "Deposit ditandatangani. Konversi berjalan; halaman ini mengikuti prosesnya.");
          await fetchData(false);
      } catch (e: any) {
          console.error(e);
          setError(e?.shortMessage ?? e?.message ?? String(e));
      } finally {
          setBusy(false);
      }
  };

  const handleSwitchView = () => {
      if (!conversion || !networkConfigs) return;

      const partnerId = conversion.networkId;
      const contractId = conversion.contractChainId || activeProvider.ipowNetworkId;

      const contractKey = networkConfigs.find(n => n.id === contractId)?.key;
      const partnerKey = networkConfigs.find(n => n.id === partnerId)?.key;

      if (!contractKey || !partnerKey) return;

      const newTxId = partnerConversion?.id ? partnerConversion.id.toString() : txIdStr;

      let newUrlNetwork: string;
      let newLinkedParam: string;

      if (network === partnerKey) {
          newUrlNetwork = contractKey;
          newLinkedParam = partnerKey;
      } else {
          newUrlNetwork = partnerKey;
          newLinkedParam = contractKey;
      }

      const targetPath = `/${locale}/${newUrlNetwork}/convert/transaction/${newTxId}?linked=${newLinkedParam}`;
      router.replace(targetPath);
  };

  const [isSendProcessing, setIsSendProcessing] = useState(false);
  // Pays a buy's BTC. What to pay and where comes from the swap itself, read
  // again now: refused when the address was already paid (it is used once)
  // or too few payment blocks remain, and once tried, not again here for
  // three minutes (a send that looks failed may still have been broadcast).
  const payKey = `greatwall:convert:${network}:${txIdStr}:paidAt`;
  const handleConfirmSend = async (_toAddress: string, _amountToken: number) => {
    try {
      setIsSendProcessing(true);
      setError(null);
      try {
        const last = Number(localStorage.getItem(payKey) ?? 0);
        if (Date.now() - last < 3 * 60_000) {
          setError(locale === "en" ? "A payment was just sent from this browser. Check your Bitcoin wallet before paying again." : "Pembayaran baru saja dikirim dari browser ini. Periksa dompet Bitcoin Anda sebelum membayar lagi.");
          return;
        }
      } catch {}
      const check = await activeProvider.checkPayable(BigInt(txIdStr));
      if (!check.ok) {
        setError(check.reason);
        return;
      }
      // The fastest fee is known once the wallet has read fees.
      if (!bitcoinWallet.estimatedFee?.fetched || !bitcoinWallet.estimatedFee?.high) {
        setError(locale === "en" ? "Bitcoin fees are still loading: try again in a moment." : "Biaya Bitcoin masih dimuat: coba lagi sebentar lagi.");
        return;
      }
      try { localStorage.setItem(payKey, String(Date.now())); } catch {}
      // The fastest fee: a payment mined after the payment blocks is lost.
      const resultTxid = await bitcoinWallet.sendTokenTo(check.address, check.btc, "high");
      if (resultTxid) {
        setTxid(resultTxid);
        setShowSuccessModal(true);
      } else {
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error("Transaction Error:", error);
      setShowErrorModal(true);
    } finally {
      setIsSendProcessing(false);
    }
  };

  const TopRightTimer = () => {
    const { timeLeft, blocksLeft, blockLabel, isTimeExpired, isBlockExpired } = timerData;
    if (!timeLeft && blocksLeft === null) return null;

    const timeLabel = (phase === TxPhase.WAITING_OPERATOR_APPROVAL) 
        ? (locale === "en" ? "Connecting Timeout In" : "Percobaan Menghubungkan Berakhir Dalam") 
        : (locale === "en" ? "Connection Timeout In" : "Koneksi Berakhir Dalam");

    return (
        <div className="flex flex-col items-end gap-1.5 text-right animate-fade-in">
            {blocksLeft !== null && !isCompleted && (
                <div className="flex flex-col items-end leading-none">
                    <span className="text-[7px] font-bold  uppercase mb-0.5 tracking-tighter">{blockLabel}</span>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${blocksLeft <= 2 ? 'bg-red-50 border-red-200 text-red-600' : `${bgFlip} ${borderFlip} ${colorFlip}`}`}>
                        <FaCube size={8} className={blocksLeft <= 2 ? 'animate-pulse' : ''} />
                        <span className="text-[10px] font-mono font-black">
                           {isBlockExpired ? (locale === "en" ? "EXPIRED" : "KEDALUWARSA") : (locale === "en" ? `${blocksLeft} ${blocksLeft === 1 ? "Block" : "Blocks"}` : `${blocksLeft} Blok`)}
                        </span>
                    </div>
                </div>
            )}
            
            {timeLeft && !isBlockExpired &&  (
                <div className="flex flex-col items-end leading-none pt-1">
                    <span className="text-[7px] font-bold  uppercase mb-0.5 tracking-tighter">{timeLabel}</span>
                     <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${isTimeExpired? 'bg-red-50 border-red-200 text-red-600' : `${bgFlip} ${borderFlip} ${colorFlip}`}`}>
                        <FaClock size={8} className={isTimeExpired  ? 'animate-pulse' : ''} />
                        <span className="text-[10px] font-mono font-black">
                           {isTimeExpired ? (locale === "en" ? "EXPIRED" : "KEDALUWARSA") : timeLeft}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
  };

  if (loading && !conversion) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className={`animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent ${colorFlip} rounded-full`}></div>
          <p className="text-sm ">{t("text74")}</p>
        </div>
      </div>
    );
  } else if (!conversion) return  <div className="flex justify-center items-center h-[60vh]"><div className="text-center space-y-3"><p className="text-sm text-gray-500">{"No transaction found"}</p></div></div>

  if (!isAuthorized || !isAllFulfilled) {
    const currentNetworkName = network == "bitcoin" ? "Bitcoin" : networkConfigs.find((n) => n.id === activeProvider.ipowNetworkId)?.name || "Unknown Network";
    const handleShareLink = () => navigator.clipboard.writeText(window.location.href);

    return (
      <div className="pb-28 sm:pb-36">
        <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Image src={greatwallLogo} alt="Greatwall" className="w-auto h-5"/>
            <span className="text-sm font-bold">Greatwall</span>
          </div>
            {network === "bitcoin" ? <BitcoinConnectButton /> : network === "ethereum" ? <EthereumConnectButton /> : network === "solana" ? <SolanaConnectButton /> : network === "base" ? <BaseConnectButton /> : network === "robinhood" ? <RobinhoodConnectButton /> : network === "hyperliquid" ? <HyperliquidConnectButton /> : null}
        </div>

           <div className="max-w-2xl mx-auto mt-4">
            {!isAllFulfilled && (
               <div className="flex flex-col gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-pulse">
            <div className="flex items-start gap-3">
                  <Icon icon="solar:danger-triangle-bold" className="text-red-500 text-xl shrink-0 mt-0.5" />
                       <div className="flex flex-col gap-0.5">
                         <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{t("text26")}</p>
                         <p className="text-[11px] font-bold leading-relaxed">{dynamicMismatchText}</p>
                  </div>
                </div>
                <button
                  onClick={handleSwitchAll}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-lg active:scale-[0.98]"
                >
                  {mismatches.length > 1 ? t("text185") : t("text153")}
                </button>
              </div>
            )}
        </div> 
        <div className={`bgBox glass-card p-6 shadow-lg max-w-2xl mx-auto mt-8`}>
             <div className="p-5 glass-card shadow-buttonNav! flex justify-center items-center mx-auto w-28 h-28 rounded-full">
                           <Icon icon="iconoir:wallet-solid" className={`text-6xl  ${colorFlip} text-end`}/>
                         </div>
             <h2 className="text-xl font-bold text-center pt-3">{t("text250")}</h2>
            <p className="text-sm mb-10 leading-relaxed px-4 justify-center text-center">
               {locale === "en" ? (
  <>
    To view and manage this transaction, please connect the correct
    <span className={`font-bold ${colorFlip}`}> {currentNetworkName} </span> 
    wallet and network mode used for this Transaction.
  </>
) : (
  <>
    Untuk melihat dan mengelola transaksi ini, harap hubungkan dompet dan mode jaringan
    <span className={`font-bold ${colorFlip}`}> {currentNetworkName} </span> 
    yang benar yang digunakan untuk transaksi ini.
  </>
)}
            </p>
            <div className="pt-8 border-t">
                <button 
                    onClick={handleShareLink}
                    className={`flex items-center justify-center gap-2 mx-auto ${colorFlip} hover:underline    text-xs font-bold uppercase tracking-widest`}
                >
                    <FaLink className="text-[10px]" />
                   {t("text251")}
                </button>
            </div>
        </div>
      </div>
    );
  }

  const isOutbound = conversion.isNativeToBitcoin;
  const partnerNetId = conversion.networkId || 0; 
  
  const contractNet0 = networkConfigs.find((n) => n.id === activeProvider.ipowNetworkId);
  const partnerNet0 = networkConfigs.find((n) => n.id === partnerNetId);

  const statusInfo =  getUnifiedStatusConfig(conversion, partnerConversion);
  // A token swap: shown as its token, not the network's coin.
  const withToken = (net: any, c: any) =>
    c?.tokenSymbol && net ? { ...net, nativeToken: { ...net.nativeToken, symbol: c.tokenSymbol, decimals: c.tokenDecimals ?? net.nativeToken.decimals, logo: null } } : net;
  const contractNet = withToken(contractNet0, conversion);
  const partnerNet = withToken(partnerNet0, partnerConversion);
  let sourceAsset: any, destAsset: any;
   const isCompleted = conversion.phase === TxPhase.COMPLETED;
    const isDestCompleted = partnerConversion && partnerConversion.phase === TxPhase.COMPLETED;

  if (isOutbound) {
      sourceAsset = { ...contractNet, amountRaw: conversion.nativeAmount, amountFmt: formatAmt(conversion.nativeAmount, contractNet?.nativeToken.decimals || 9), address:  conversion.user };
      const rawDest = isDestCompleted ? partnerConversion.nativeAmount : (estimatedOutput);
      const rawDestAddr = (partnerNetId === 0) ? conversion.userProgram : conversion.networkAddress;
      
      destAsset = { 
          ...partnerNet, 
          amountRaw: rawDest, 
          amountFmt: formatAmt(rawDest, partnerNet?.nativeToken.decimals || 8), 
          address: rawDestAddr, 
          isEstimate: (partnerNetId === 0) ? !isCompleted  : !isDestCompleted 
      };
      // A tunnel's sale: what it buys is fixed on the other network (the
      // buy's amount, to the buy's user), known from the buy or the
      // tunnel's record; not an estimate, and not the old protocol's
      // "network address" field.
      const tn = conversion.tunnel?.leg === "sell" ? conversion.tunnel.tunnel : null;
      if (tn) {
          const amount = partnerConversion?.nativeAmount ?? tn.amountOut;
          const decimals = partnerConversion?.tokenDecimals ?? tn.toDecimals ?? partnerNet?.nativeToken.decimals ?? 18;
          destAsset = {
              ...destAsset,
              nativeToken: { ...partnerNet?.nativeToken, symbol: partnerConversion?.tokenSymbol ?? tn.toSymbol ?? partnerNet?.nativeToken.symbol, decimals },
              amountRaw: amount,
              amountFmt: formatAmt(amount, decimals),
              address: partnerConversion?.user ?? tn.recipient ?? null,
              isEstimate: false,
          };
      }
  } else {
      const rawInput = partnerConversion ? partnerConversion.nativeAmount : conversion.bitcoinAmount;
      const inputDecimals = partnerConversion ? partnerNet?.nativeToken.decimals : bitcoinWallet.decimals;
      // The source's address: the sale's signer once the sale exists.
      sourceAsset = { ...partnerNet, amountRaw: rawInput, amountFmt: formatAmt(rawInput, inputDecimals || 8), address: partnerConversion?.user ?? null };
     
      // A buy's amount is fixed when it is opened (the new protocol): no
      // estimate, whatever its state.
      const rawDest = conversion.nativeAmount && conversion.nativeAmount !== "0" ? conversion.nativeAmount : (estimatedOutput || "0");
      destAsset = { 
          ...contractNet, 
          amountRaw: rawDest, 
          amountFmt: formatAmt(rawDest, contractNet?.nativeToken.decimals || 9), 
          address: conversion.user, 
          isEstimate: !(conversion.nativeAmount && conversion.nativeAmount !== "0") 
      };
      // A tunnel's buy: what is sold on the source is known from the
      // tunnel's record before the sale exists, and the buy's amount is
      // fixed on chain, not an estimate.
      const tn = conversion.tunnel?.leg === "buy" ? conversion.tunnel.tunnel : null;
      if (tn && !partnerConversion) {
          const decimals = tn.fromDecimals ?? partnerNet?.nativeToken.decimals ?? 9;
          sourceAsset = {
              ...partnerNet,
              nativeToken: { ...partnerNet?.nativeToken, symbol: tn.fromSymbol ?? partnerNet?.nativeToken.symbol, decimals },
              amountRaw: tn.amountIn,
              amountFmt: formatAmt(tn.amountIn, decimals),
              // The wallet that sells: recorded with the tunnel, else the one connected now.
              address: tn.sender ?? sourceWalletOf(tn.fromChain)?.address ?? null,
          };
      }
      if (tn) destAsset = { ...destAsset, amountRaw: conversion.nativeAmount, amountFmt: formatAmt(conversion.nativeAmount, contractNet?.nativeToken.decimals || 9), isEstimate: false };
  }

let fromAddressDisplay = sourceAsset.address;
let toAddressDisplay = destAsset.address;

  if (!isOutbound) {
      if (partnerNetId === 0) {
          // The user's own Bitcoin address, as given when the buy was made
          // (kept by the app: the protocol does not learn who pays). A buy
          // made elsewhere has none: then where it is paid, once funded.
          fromAddressDisplay = btcAddressOf(conversion.userProgram) ?? btcAddressOf(conversion.ipowReceiveProgram); 
      } else if (!conversion.tunnel) {
          // The old protocol named the source's address in the swap; a
          // tunnel's source is the sale's signer (sourceAsset.address).
          fromAddressDisplay = decodeNetworkAddress(conversion.networkAddress, partnerNet?.key); 
      }
  }

  if (isOutbound) {
      if (partnerNetId === 0) {
          try { toAddressDisplay = scriptPubKeyHexToAddress(conversion.userProgram); } catch { toAddressDisplay = "BTC Script"; }
      } else if (!conversion.tunnel) {
          // The old protocol named the destination's address in the swap; a
          // tunnel's destination is the buy's user (destAsset.address).
          toAddressDisplay = decodeNetworkAddress(conversion.networkAddress, partnerNet?.key); 
      }
  }

  let depositAddressDisplay = "";
  if (!isOutbound && partnerNetId === 0) {
      try { depositAddressDisplay = scriptPubKeyHexToAddress(conversion.ipowReceiveProgram); } catch {}
  }

  return (
    <div className="pb-28 sm:pb-36">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto">
          
          <div className="flex items-center gap-2">
            <Image src={greatwallLogo} alt="Greatwall" className="w-auto h-5"/>
            <span className="text-sm font-bold">Greatwall</span>
          </div>

            {network === "bitcoin" ? <BitcoinConnectButton /> : network === "ethereum" ? <EthereumConnectButton /> : network === "solana" ? <SolanaConnectButton /> : network === "base" ? <BaseConnectButton /> : network === "robinhood" ? <RobinhoodConnectButton /> : network === "hyperliquid" ? <HyperliquidConnectButton /> : null}
        </div>

      <div className={`bgBox glass-card p-2 shadow-lg max-w-2xl mx-auto mt-8`}>
<div className={`px-2 md:px-8 py-5 flex items-center gap-4 rounded-t-[inherit]`}>
    <div className={`p-3 rounded-full shadow-sm border text-lg ${statusInfo.color}`}>
        {statusInfo.icon}
    </div>
    <div className="flex-1">
        <div className={`flex items-center w-fit gap-1 text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap ${statusInfo.bg} ${statusInfo.color}`}>
            {statusInfo.label}
        </div>
        <p className="text-xs">{statusInfo.desc}</p>
    </div>
    <TopRightTimer />
</div>
          
          <div className="px-2 md:px-8 py-5 border-b  flex justify-between items-center ">
              <span className="text-[10px] font-bold  tracking-widest">{t("text187")}: {txIdStr}</span>
              <div className="flex items-center gap-3">
{(conversion?.networkId === 0 || partnerConversion) && (
  <button 
    onClick={handleSwitchView} 
    className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm transition-all group hover:bg-gray-50"
  >
    <span className={`text-[10px] font-bold transition-colors ${
      'text-dark'
    }`}>
     {t("text226")} {network === 'bitcoin' 
        ? networkConfigs.find(n => n.id === activeProvider.ipowNetworkId)?.name 
        : networkConfigs.find(n => n.id === conversion.networkId)?.name
      }
    </span>
    <FaExchangeAlt className={`text-[10px] transition-colors`} />
  </button>
)}
              </div>
          </div>
          
      <div className="p-4 md:p-8">
    <div className="flex flex-col md:flex-row items-center justify-between relative gap-8 md:gap-0">
        
        {/* Source Asset */}
        <div className="flex-1 flex flex-col items-center text-center z-10 w-full">
            <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center p-3">
                    {sourceAsset.logo && <Image src={sourceAsset.logo} alt={sourceAsset.nativeToken.symbol} width={40} height={40} className="object-contain"/>}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-100 text-[9px] font-bold px-2 py-0.5 rounded-full text-gray-500 border border-white whitespace-nowrap shadow-sm">{sourceAsset.name}</div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{sourceAsset.amountFmt}</p>
            <p className="text-xs font-bold mb-3">{sourceAsset.nativeToken.symbol}</p>
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg text-[10px] text-gray-500 border border-gray-100">
                <span className="font-mono">{truncateAddr(fromAddressDisplay)}</span>
                <button onClick={() => navigator.clipboard.writeText(fromAddressDisplay)} className={`hover:text-black transition-colors`}><FaCopy/></button>
            </div>
        </div>
    
        <div className="flex flex-col items-center justify-center w-20 relative md:-top-4">
            <div className="bg-white p-2 rounded-full border border-gray-100 shadow-sm z-10 text-gray-300 rotate-90 md:rotate-0">
                <FaArrowRight />
            </div>
        </div>
        
        {/* Destination Asset */}
        <div className="flex-1 flex flex-col items-center text-center z-10 w-full">
            <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center p-3">
                    {destAsset.logo && <Image src={destAsset.logo} alt={destAsset.nativeToken.symbol} width={40} height={40} className="object-contain"/>}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-100 text-[9px] font-bold px-2 py-0.5 rounded-full text-gray-500 border border-white whitespace-nowrap shadow-sm">{destAsset.name}</div>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${destAsset.isEstimate ? ` animate-pulse` : ''}`}>{destAsset.isEstimate && "≈ "}{destAsset.amountFmt}</p>
            <p className="text-xs font-bold mb-3">{destAsset.nativeToken.symbol}</p>
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg text-[10px] text-gray-500 border border-gray-100">
                <span className="font-mono">{truncateAddr(toAddressDisplay)}</span>
                <button onClick={() => navigator.clipboard.writeText(toAddressDisplay)} className={`hover:text-black transition-colors`}><FaCopy/></button>
            </div>
        </div>
        
    </div>
</div>
          
         {(extraData?.windows?.headersStarted) && (() => {
   
    const anchorHeight = extraData?.anchorHeight?.toString();
    const epochStartHeight = extraData?.epochFirstHeight?.toString();
    const proofHeight = extraData?.proof?.blockHeight?.toString();
    // The new protocol: a payment counts in the 12 blocks after the anchor;
    // the operator's proof range is 25 blocks plus its confirmations.
    const proofEndHeight = (Number(extraData?.anchorHeight) + 30).toString();
    const depositEndHeight = (conversion.payBlocks?.last ?? conversion.swap?.payWindow?.last ?? Number(extraData?.anchorHeight) + 12).toString();

    const isProofBlock =  selectedBlockHeight === proofHeight;
    const proofData = extraData.proof;

    let endpointBlock = null;
    if (conversion.phase !== TxPhase.COMPLETED) {
        if (conversion.isNativeToBitcoin || (conversion.networkId !== 0 && !conversion.ipowReceiveProgram)) {
            endpointBlock = (conversion.phase === TxPhase.WAITING_USER_ACTION || conversion.phase === TxPhase.USER_ACTION_EXPIRED
            ) 
                ? depositEndHeight 
                : proofEndHeight;
        } else {
            endpointBlock = proofEndHeight;
        }
    }

    let headers = [...(extraData?.headers || [])].reverse();
    if (endpointBlock) {
        const endBI = BigInt(endpointBlock);
        headers = headers.filter((h: any) => BigInt(h.height) <= endBI);
    }

    const latestStreamed = extraData?.headers?.[extraData.headers.length - 1]?.height;
    const showEndpoint = endpointBlock && latestStreamed < endpointBlock;
    
    const showPendingProof = proofData?.set && !proofData?.verified && (!latestStreamed || BigInt(proofHeight) > BigInt(latestStreamed));
    
    const showGap = anchorHeight && epochStartHeight && BigInt(anchorHeight) > BigInt(epochStartHeight) + BigInt(1);

    const endpointLabel =((conversion.phase === TxPhase.WAITING_USER_ACTION || conversion.phase === TxPhase.USER_ACTION_EXPIRED) && isOutbound) ? "DEPOSIT END" : "PROOF END";
    const endpointTermKey = ((conversion.phase === TxPhase.WAITING_USER_ACTION || conversion.phase === TxPhase.USER_ACTION_EXPIRED) && isOutbound) ? "depositEnd" : "proofEnd";

    return (
      <div className="mt-6">

        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className={`text-xs font-bold ${colorFlip} uppercase flex items-center gap-1.5`}>
                      
              <FaCube className={`${colorFlip}`}/> 
              {locale === "en" ? "Trustless Chain Verification" : "Verifikasi Bockchain Secara Trustless"}
            </h4>

           <p className="text-[10px] mt-1 max-w-sm leading-tight">
  {locale === "en" ? (
    <>
      The smart contract acts as a Bitcoin Light Client. It mathematically verifies the{" "}
      <strong 
        onClick={() => setActiveInfoTerm('epochStart')}
        className={`${colorFlip} cursor-pointer inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity`}
      >
        Epoch Start <FaInfoCircle size={9} className="opacity-50"/>
      </strong>
      , connects it to the{" "}
      <strong 
        onClick={() => setActiveInfoTerm('anchor')}
        className={`${colorFlip} cursor-pointer inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity`}
      >
        Anchor <FaInfoCircle size={9} className="opacity-50"/>
      </strong>
      , and streams headers to prove the transaction.
    </>
  ) : (
    <>
      Smart contract bertindak sebagai Bitcoin Light Client. Ini memverifikasi secara matematis{" "}
      <strong 
        onClick={() => setActiveInfoTerm('epochStart')}
        className={`${colorFlip} cursor-pointer inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity`}
      >
        Awal Epoch <FaInfoCircle size={9} className="opacity-50"/>
      </strong>
      , menghubungkannya ke{" "}
      <strong 
        onClick={() => setActiveInfoTerm('anchor')}
        className={`${colorFlip} cursor-pointer inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity`}
      >
        Anchor <FaInfoCircle size={9} className="opacity-50"/>
      </strong>
      , dan menyiarkan header untuk membuktikan transaksi.
    </>
  )}
</p>
          </div>

          {(conversion.phase != TxPhase.COMPLETED && conversion.phase != TxPhase.REFUNDED && conversion.phase != TxPhase.USER_ACTION_EXPIRED) && (
            <div className="text-right">
              <span className="text-[9px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold animate-pulse uppercase">LIVE</span>
            </div>
          )}
        </div>

     
        <div className="relative flex items-center gap-2 overflow-x-auto pb-8 pt-8 scrollbar-thin px-2 scroll-smooth">
          
        
          {showEndpoint && ( 
            <div className="relative group shrink-0">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap uppercase">
                {endpointLabel}
              </div> 
              <button onClick={() => setSelectedBlockHeight(endpointBlock)} className={`w-10 h-10 rounded-lg border-2 border-dashed border-red-600 bg-white text-gray-400 hover:-translate-y-1 flex items-center justify-center text-[10px] font-mono ${selectedBlockHeight === endpointBlock ? 'ring-2 ring-black border-black' : ''}`}>{endpointBlock}</button>
            </div>
          )}

          {showEndpoint && <div className="flex items-center justify-center w-4 h-10 text-xs tracking-widest opacity-50 shrink-0">...</div>}

          {showPendingProof && (
            <div className="relative group shrink-0">
              <div className={`absolute -top-7 left-1/2 -translate-x-1/2 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap uppercase bg-black`}>
                PENDING PROOF
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black`}></div>
              </div> 
              <button onClick={() => setSelectedBlockHeight(proofHeight)} className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-[10px] font-mono font-bold transition-all hover:-translate-y-1 shadow-sm bg-black/5 border-black text-black ring-2 ring-black/10 ${selectedBlockHeight === proofHeight ? 'ring-2 z-10' : ''}`}>{proofHeight}</button>
            </div>
          )}

          {showPendingProof && <div className="flex items-center justify-center w-4 h-10 text-xs tracking-widest opacity-50 shrink-0">...</div>}

        
          {headers.map((h: any) => {
            const isAnchor = h.height === anchorHeight;
            const isProof = h.height === proofHeight;
            const isEnd = h.height === endpointBlock;
            const isSelected = selectedBlockHeight === h.height;
            
            let boxClass = "bg-white border-gray-300 text-gray-400 hover:border-gray-400";
            let label = null;

            if (isAnchor) {
              boxClass = "bg-black/10 border-black text-black ring-1 ring-black/20 font-bold";
              label = (<div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap uppercase">ANCHOR<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div></div>);
            } else if (isProof) {
             if (proofData.verified) {
                  boxClass = "bg-green-50 border-green-500 text-green-700 ring-1 ring-green-100 font-bold";
                  label = (<div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap uppercase">PROOF<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-green-600 "></div></div>);
              } else if (proofData.invalid) {
                  boxClass = "bg-red-50 border-red-500 text-red-700 ring-1 ring-red-100 font-bold";
                  label = (<div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap uppercase">INVALID<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-600 "></div></div>);
              } else {
       
                  boxClass = `bg-black/10 border-black text-black ring-1 ring-black/20 font-bold`;
                  label = (<div className={`absolute -top-7 left-1/2 -translate-x-1/2 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap uppercase bg-black`}>PENDING<div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black `}></div></div>);
              }
            } else if (isEnd) {
              boxClass = "bg-red-50 border-red-600 bg-white text-gray-400 ring-1 ring-orange-100 font-bold";
              label = (<div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap uppercase">{endpointLabel}</div>);
            }

            return (
              <div key={h.height} className="relative group shrink-0">
                {label}
                <button onClick={() => setSelectedBlockHeight(h.height)} className={`w-10 h-10 rounded-lg border flex items-center justify-center text-[10px] font-mono transition-all hover:-translate-y-1 shadow-sm ${boxClass} ${isSelected ? 'ring-2 z-10' : ''}`}>{h.height}</button>
              </div>
            );
          })}


          {showGap && <div className="flex items-center justify-center w-6 h-10 text-xs tracking-widest opacity-50 shrink-0">...</div>}

          {epochStartHeight && (
            <div className="relative group shrink-0 ml-1">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-100 text-black text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap uppercase">EPOCH START</div>
              <button onClick={() => setSelectedBlockHeight(epochStartHeight)} className={`text-gray-400 hover:border-gray-400 w-10 h-10 rounded border-2 border-dashed border-gray-400 bg-gray-100 flex items-center justify-center text-[9px] font-mono transition-all hover:-translate-y-1 shadow-sm ${selectedBlockHeight === epochStartHeight ? 'ring-2 ring-black border-black z-10' : ''}`}>{epochStartHeight}</button>
            </div>
          )}
        </div>

        {selectedBlockHeight && (() => {
          const h = extraData?.headers?.find((x: any) => x.height === selectedBlockHeight);
          const isEpochFirst = selectedBlockHeight === epochStartHeight;
          const isAnchor = selectedBlockHeight === anchorHeight;
          const isEnd = selectedBlockHeight === endpointBlock;
          
          let beHash = "";
          if (h) beHash = swapEndian(h.hashLE);
          else if (isProofBlock && proofData?.blockHashLE) beHash = swapEndian(proofData.blockHashLE);
          else if (isEpochFirst && extraData.epochFirstHash) beHash = swapEndian(extraData.epochFirstHash);

          if (!beHash && !isEnd && !isAnchor && !isEpochFirst && !isProofBlock) return null;

         let activeTermKey: keyof typeof PROTOCOL_TERMS | null = null;
       
          const isActuallyPending = isProofBlock && !proofData?.verified && !proofData?.invalid;

          if (isEpochFirst) activeTermKey = "epochStart";
          else if (isAnchor) activeTermKey = "anchor";
          else if (isEnd) activeTermKey = endpointTermKey as any;
          else if (isProofBlock) {
              if (proofData?.verified) activeTermKey = "verifiedProof";
              else if (proofData?.invalid) activeTermKey = "incorrectProof";
              else activeTermKey = "pendingProof";
          }
          return (
            <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg animate-fade-in shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-2">
                  Block #{selectedBlockHeight}
                  
                  {isEpochFirst && (
                    <button onClick={() => setActiveInfoTerm('epochStart')} className="bg-gray-100 text-black px-1 rounded text-[8px] flex items-center gap-1 hover:opacity-80 transition-opacity">
                      EPOCH START <FaInfoCircle size={8} className="opacity-40"/>
                    </button>
                  )}
                  {isAnchor && (
                    <button onClick={() => setActiveInfoTerm('anchor')} className="bg-black/10 text-black px-1 rounded text-[8px] flex items-center gap-1 hover:opacity-80 transition-opacity">
                      ANCHOR <FaInfoCircle size={8} className="opacity-40"/>
                    </button>
                  )}
                  {isEnd && (
                    <button onClick={() => setActiveInfoTerm(endpointTermKey as any)} className="bg-red-600 text-white px-1 rounded text-[8px] flex items-center gap-1 hover:opacity-80 transition-opacity">
                      {endpointLabel} <FaInfoCircle size={8} className="opacity-40"/>
                    </button>
                  )}
                 {isProofBlock && (
                    <button onClick={() => setActiveInfoTerm(activeTermKey as any)} className={`text-white ${proofData.verified ? 'bg-green-600' : isActuallyPending ? `bg-black` : `bg-red-600`} px-1 rounded text-[8px] flex items-center gap-1 hover:opacity-80 transition-opacity`}>
                      {isActuallyPending ? "PENDING PROOF" : proofData.verified ? "PROOF" : "INVALID PROOF"} <FaInfoCircle size={8} className="opacity-40"/>
                    </button>
                  )}
                </span>

                {beHash && (
                  <a href={`https://mempool.space/block/${beHash}`} target="_blank" rel="noreferrer" className={`flex items-center gap-1 text-[9px] hover:underline text-black font-bold`}>
                    {t("text255")} <FaLink/>
                  </a>
                )}
              </div>

              {beHash ? (
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-100 mb-2">
                  <code className="text-[9px] text-gray-500 break-all font-mono leading-tight">{beHash}</code>
                </div>
              ) : (
                <div className="p-2 border border-dashed border-gray-100 rounded text-center mb-2 bg-gray-50/50">
                    <span className="text-[9px] text-gray-400 italic">{t("text291")}</span>
                </div>
              )}

              {beHash && partnerNetId !== 0 && (conversion.userProgram || conversion.ipowReceiveProgram) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-2">
                      {locale == "en" ? "Bitcoin Linked Program" : "Bitcoin Program Terikat"}
                    </span>
                    <a href={`https://mempool.space/address/${btcAddressOf(isOutbound ? conversion.userProgram : conversion.ipowReceiveProgram) ?? ""}`} target="_blank" className={`flex items-center gap-1 text-[9px] hover:underline text-black font-bold`}>
                      {t("text255")} <FaLink size={8}/>
                    </a>
                  </div>
                  <div className="grid grid-cols-1 gap-2 bg-gray-50 p-2 rounded border border-gray-100">
                    <span className="font-mono text-[9px] text-gray-800">{btcAddressOf(isOutbound ? conversion.userProgram : conversion.ipowReceiveProgram) ?? "—"}</span>
                  </div>
                </div>
              )}

              {isProofBlock && proofData && proofData.set && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-2">
                      {locale == "en" ? "Proof Submitted" : "Proof yang Dikirim"} 
                    </span>
                    <a href={`https://mempool.space/tx/${swapEndian(proofData.txidLE)}`} target="_blank" rel="noreferrer" className={`flex items-center gap-1 text-[9px] text-black hover:underline font-bold`}>
                      {t("text255")} <FaLink/>
                    </a>
                  </div>
                  <div className={`grid grid-cols-1 gap-2 ${proofData.verified ? 'bg-green-50 border-green-100' : showPendingProof ? `bg-black/10 border-black` : 'bg-red-50 border-red-500'} p-2 rounded border`}>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-gray-500">TxID:</span>
                      <span className="font-mono text-gray-800 truncate ml-2">{swapEndian(proofData.txidLE)}</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-gray-500">{locale == "en" ? "Attempts" : "Percobaan"}:</span>
                      <span className="font-mono text-gray-800">{proofData.attempts}</span>
                    </div>
                   <div className="flex justify-between text-[9px]">
                      <span className="text-gray-500">Status:</span>
                      <span className={`font-bold ${proofData.verified ? 'text-green-600' : isActuallyPending ? "text-black" : `text-red-700`}`}>
                        {proofData.verified ? 'VERIFIED ON-CHAIN' : isActuallyPending ? 'PENDING VERIFICATION' : 'INCORRECT PROOF'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-gray-500">Address:</span>
                      <span className="font-mono text-gray-800 truncate ml-2">{btcAddressOf(proofData.outProgram) ?? "—"}</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-gray-500">Output:</span>
                      <span className="font-mono text-gray-800">{Number(proofData.outValueSats) / 10**bitcoinWallet.decimals} BTC</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  })()}

             {(conversion.phase === TxPhase.OPERATOR_APPROVAL_EXPIRED && network !== "bitcoin") && (
              <div className="pt-4 text-center space-y-2">
                  <p className="text-[11px] sm:text-xs opacity-80">
                    {locale === "en"
                      ? "The fee goes to your credit, to withdraw in one step afterwards."
                      : "Biayanya masuk ke kredit Anda, untuk ditarik dalam satu langkah setelahnya."}
                  </p>
                  <Button chain={network} buttonText={t("text256")} onClick={() => handleAction('refund_approval')} disabled={busy} />
              </div>
          )}


             {(conversion.tunnelSellable && network !== "bitcoin") && (
               <div className="pt-4 text-center space-y-2">
                  <p className="text-[11px] sm:text-xs">
                    {(() => {
                      // Bitcoin blocks the deposit can still be signed in: the
                      // buy's last payment block, less the margin the deposit
                      // needs, from the tip (about 10 minutes a block).
                      const tip = Number(extraData?.tipHeight || 0);
                      const left = conversion.payBlocks && tip ? Math.max(0, conversion.payBlocks.last - TUNNEL_MARGIN_BLOCKS - tip) : null;
                      const open = left === null ? (locale === "en" ? "for a limited time" : "untuk waktu terbatas") : locale === "en" ? `for about ${left * 10} more minutes` : `sekitar ${left * 10} menit lagi`;
                      return locale === "en"
                        ? `${destAsset.amountFmt} ${destAsset.nativeToken?.symbol ?? ""} is reserved for you. Deposit ${sourceAsset.amountFmt} ${sourceAsset.nativeToken?.symbol ?? ""} on ${partnerNet?.name ?? conversion.tunnel.tunnel.fromChain} to complete the conversion. The tunnel stays open ${open}.`
                        : `${destAsset.amountFmt} ${destAsset.nativeToken?.symbol ?? ""} sudah disediakan untuk Anda. Deposit ${sourceAsset.amountFmt} ${sourceAsset.nativeToken?.symbol ?? ""} di ${partnerNet?.name ?? conversion.tunnel.tunnel.fromChain} untuk menyelesaikan konversi. Terowongan terbuka ${open}.`;
                    })()}
                  </p>
                  <Button chain={network} buttonText={busy ? t("text10") : `${locale === "en" ? "Deposit on" : "Deposit di"} ${partnerNet?.name ?? ""}`} onClick={() => startTunnelSell()} disabled={busy} />
              </div>
          )}

             {(conversion.phase === TxPhase.OPERATOR_DUTY_EXPIRED && network !== "bitcoin" &&
               (isOutbound ? conversion.swap?.state === "Open" : (conversion.compensable || conversion.provable))) && (
               <div className="pt-4 text-center">
                  {isOutbound 
                    ? <Button chain={network} buttonText={t("text257")} onClick={() => handleAction('refund_timeout')} disabled={busy} />
                    : <Button chain={network} buttonText={t("text258")} onClick={() => handleAction('claim_expired')} disabled={busy} />
                  }
              </div>
          )}

           {(isOutbound && (conversion.phase === TxPhase.COMPLETED || extraData?.showPendingProof) && (partnerConversion?.phase === TxPhase.ACTIVE_WAITING_PROOF || partnerConversion?.phase === TxPhase.WAITING_USER_ACTION)) &&  (
              <div className="pt-4 text-center">
                 <Button chain={network} buttonText={extraData?.showPendingProof ? `${t("text259")} ${partnerNet?.name}` : `${t("text260")} ${partnerNet?.name}`} onClick={() => handleSwitchView()}  />
                             </div> )
                    }

          {(conversion.phase === TxPhase.WAITING_USER_ACTION || conversion.phase  === TxPhase.ACTIVE_WAITING_PROOF) && (
             <div className=" pt-4 ">
    {(isOutbound && conversion.phase === TxPhase.WAITING_USER_ACTION &&  network != 'bitcoin') ? (
        partnerConversion ?
        <div className="text-center">
                <Button chain={network} buttonText={`Deposit ${sourceAsset.amountFmt} ${sourceAsset.nativeToken.symbol}`} onClick={() => handleAction('deposit')} disabled={busy} />
            </div> : null
    ) : (
        <div>
            {network === 'bitcoin' && !isOutbound && (
                <div className="animate-fade-in">
                   {isShowDetails ?   
                  <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg animate-fade-in shadow-sm"> 
    <div className="space-y-4">

        <div className="space-y-1.5"> 
            <span className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-2">
               {t("text261")}
            </span>
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-100 mb-2">

  <code className="flex-1 text-[9px] text-gray-500 break-all font-mono leading-tight">
    {sourceAsset.amountFmt} BTC
  </code>
  
  <button 
    onClick={() => navigator.clipboard.writeText(sourceAsset.amountFmt)}
    className="text-gray-400 hover:text-black transition-colors p-1 shrink-0"
  >
    <FaCopy size={10} />
  </button>
</div>
        </div>

        <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-2">
            {t("text262")}
            </span>

            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-100 mb-2">
  <code className="flex-1 text-[9px] text-gray-500 break-all font-mono leading-tight">
    {depositAddressDisplay}
  </code>
  
  <button 
    onClick={() => navigator.clipboard.writeText(depositAddressDisplay)} 
    className="text-gray-400 hover:text-black transition-colors p-1 shrink-0"
  >
    <FaCopy size={10} />
  </button>
</div>
        </div>
    </div>
</div> : null}

                   <div className="flex items-center gap-3 pt-4">
    <div className="flex-1">
        {mempoolDetectedTx ? (
            <Button chain={network} buttonText={`${t("text260")} ${ destAsset.name}`} onClick={() => handleSwitchView()}  />
        ) : conversion.phase !== TxPhase.WAITING_USER_ACTION ? null : (
            <Button 
                buttonText={isSendProcessing ? t("text10") : `${t("text116")} ${sourceAsset.amountFmt} BTC`} 
                onClick={() => {handleConfirmSend(depositAddressDisplay, sourceAsset.amountFmt)}}
                disabled={isSendProcessing}
                chain={network}
            />
        )}
    </div>
    <button 
        onClick={() => setIsShowDetails(!isShowDetails)} 
        className="text-[10px] font-bold px-4 py-3 rounded-xl border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-all whitespace-nowrap"
    > 
        {isShowDetails ? "Hide Details" : "Show Details"}
    </button>
</div>
                </div>
            )}

            {(network !== 'bitcoin' && !isOutbound && conversion.completable) && (
                <div className="text-center space-y-2">
                    <p className="text-[11px] sm:text-xs">
                        {locale === "en"
                          ? "The operator's receipt of your payment is proven. Take your coin now, or wait for the operator to send it."
                          : "Tanda terima operator atas pembayaran Anda sudah terbukti. Ambil koin Anda sekarang, atau tunggu operator mengirimnya."}
                    </p>
                    <Button chain={network} buttonText={busy ? t("text10") : `${locale === "en" ? "Claim" : "Ambil"} ${destAsset.amountFmt} ${destAsset.nativeToken?.symbol ?? ""}`} onClick={() => handleAction('complete')} disabled={busy} />
                </div>
            )}
        </div>
    )}

</div>
          )}

  {/* A refund that is available: the fees the protocol holds for the user
      (of every conversion of theirs nobody took), claimed in one transaction. */}
  {(feeCredit > BigInt(0) && network !== "bitcoin") && (
    <div className="mt-6 p-4 rounded-xl border border-black/10 bg-white flex items-center justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{locale === "en" ? "Refund available" : "Pengembalian tersedia"}</p>
        <p className="text-sm">{formatAmt(feeCredit.toString(), contractNet0?.nativeToken.decimals || 18)} {contractNet0?.nativeToken.symbol}</p>
        <p className="text-[11px] opacity-70">{locale === "en" ? "The fees of your conversions that nobody took, in one claim." : "Biaya konversi Anda yang tidak diambil siapa pun, dalam satu klaim."}</p>
      </div>
      <Button chain={network} buttonText={busy ? t("text10") : (locale === "en" ? "Claim refund" : "Klaim pengembalian")} onClick={() => withdrawFeeCredit()} disabled={busy} />
    </div>
  )}

  <ConvertDetails
    network={network as any}
    explorer={activeProvider?.networkExplorer}
    conversion={conversion}
    partner={partnerConversion}
    partnerChain={(partnerNet0?.key as any) ?? null}
    partnerExplorer={partnerNet0?.key ? (sourceWalletOf(partnerNet0.key)?.networkExplorer ?? null) : null}
    locale={locale}
  />

  <div className="w-30 pt-5">
          <Button chain={network} buttonText={t("text105")} onClick={()=>{router.replace(`/${locale}/${network}/convert`);}}></Button>
        </div>
      </div>

      {msg && <div className="mb-6 bg-green-50 text-green-800 text-xs p-4 rounded-xl flex gap-3 items-center border border-green-100 shadow-sm"><FaCheckCircle className="text-lg"/> {msg}</div>}
      {error && <div className="mb-6 bg-red-50 text-red-800 text-xs p-4 rounded-xl flex gap-3 items-center border border-red-100 shadow-sm"><FaExclamationTriangle className="text-lg"/> {error}</div>}

       {/* SUCCESS MODAL */}
      <AnimatedModal
        isOpen={showSuccessModal && !!txid}
        onClose={() => setShowSuccessModal(false)}
        maxWidthClass="lg:w-100"
      >
        <div className="flex flex-col justify-center text-center p-6 overflow-y-auto custom-scrollbar">
          <div
            className={`p-5 glass-card shadow-sm flex justify-center items-center mx-auto w-24 h-24 rounded-full mb-5 ${colorFlip}`}
          >
            <FaCheckCircle className="text-6xl" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">{t("text32")}</h2>
          <p className="text-sm break-all mb-4">Hash: {txid}</p>
        </div>

        <div className="px-6 py-6 border-t border-black/5 bg-white">
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
                buttonText={t("text79")}
                onClick={() =>
                  window.open(

                   
                    `${network == 'bitcoin' ? (bitcoinWallet.networkExplorer as any).transaction :   (activeProvider.networkExplorer as any).transaction}${txid}${(activeProvider.networkExplorer as any).urlSuffix || ""}`,
                    "_blank"
                  )
                }
              />
            </div>
          </div>
        </div>
      </AnimatedModal>

     {/* ERROR / RECONFIRM MODAL */}
     <AnimatedModal
            isOpen={showErrorModal}
            onClose={() => setShowErrorModal(false)}
            maxWidthClass="lg:w-100"
          >
            <div className="flex flex-col justify-center text-center p-6 overflow-y-auto custom-scrollbar">
              <div className="p-5 glass-card shadow-sm flex justify-center items-center mx-auto w-24 h-24 rounded-full text-red-500 mb-5">
                <FaExclamationCircle className="text-6xl" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2">{t("text33")}</h2>
              <p className="text-sm mb-4">{t("text34")}</p>
            </div>
    
            <div className="px-6 py-6 border-t border-black/5 bg-white">
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
            isOpen={!!activeInfoTerm}
            onClose={() => setActiveInfoTerm(null)}
            title={activeInfoTerm ? PROTOCOL_TERMS[activeInfoTerm][locale as "en" | "id"]?.title : ""}
            description={activeInfoTerm ? PROTOCOL_TERMS[activeInfoTerm][locale as "en" | "id"]?.description : ""}
            image={null}
          />
          </div>
      );
  };