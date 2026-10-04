"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Button from "./Button";
import { useTranslations } from "next-intl";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import {
  bca,
  bni,
  bri,
  mandiri,
  permata,
  qris,
  bitcoin,
  ethereum,
  hedera,
  polkadot,
  solana,
  usdc,
  bitcoinnetwork,
  hederanetwork,
  ethereumnetwork,
  solananetwork,
  paseo,
} from "..";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { SupportedChain, useNetwork } from "@/app/network-provider";
import { useOnboarding } from "@/components/providers/onboarding-provider";
import { savePendingTransaction, getPendingTransaction, clearPendingTransaction } from "@/lib/onboarding-storage";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useHederaWallet } from "@/components/hedera/hedera-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { usePolkadotWallet } from "@/components/polkadot/polkadot-provider";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";
import { FaCheckCircle, FaSortDown } from "react-icons/fa";
import ButtonContrast from "./ButtonContrast";
import { Icon } from "@iconify/react";
import { AnimatedModal } from "./AnimatedModal";
import {
  SOLANA_NATIVE_MINT,
  USDC_MINT,
  USDC_MINT_DEVNET,
  USDT_MINT,
} from "@/components/solana/config/constants";
import InformationPopUp from "./InformationPopUp";
import { getAddressErrorMessageKey } from "@/subcomponents/wallet-connect/address-validation";

interface BuyTokenProps {
  networkOverride?: SupportedChain;
  lockToken?: string;
  openTxInNewTab?: boolean;
}

// How many decimal places a fee value needs to show its significant digits, derived
// straight from the value's own magnitude rather than a fixed/token-decimals count — e.g.
// 8.6e-7 is already telling us it's a 10^-7-magnitude number, so it needs 8 decimal places
// (one past that exponent) to render as "0.00000086" instead of rounding away to "0.00".
function decimalsForFeeValue(value: number, minDecimals = 2): number {
  if (!value || !isFinite(value)) return minDecimals;
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  return Math.max(minDecimals, -exponent + 1);
}

function BuyToken({ networkOverride, lockToken, openTxInNewTab = false }: BuyTokenProps = {}) {
  const params = useParams<{
    locale: string;
    network?: SupportedChain;
  }>();

  const network = networkOverride || params.network || "solana";
  const locale = params.locale || "en";

  const colorFlip = "text-black";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startOnboarding } = useOnboarding();
  const t = useTranslations("All");

  const defaultVaChannels = [
    {
      name: "Bank INA",
      detailName: "Bank INA Virtual Account",
      code: "INA",
      logo: null,
      isAvailable: true,
      fee: 3000,
    },
  ];

  const [vaChannels, setVaChannels] = useState(defaultVaChannels);

  const qrisInfo = t("text21");

  const bitcoinNetwork = useBitcoinWallet();
  const hederaNetwork = useHederaWallet();
  const ethereumNetwork = useEthereumWallet();
  const solanaNetwork = useSolanaWallet();
  const polkadotNetwork = usePolkadotWallet();
  const tempoNetwork = useTempoWallet();
  const hyperliquidNetwork = useHyperliquidWallet();
  const robinhoodNetwork = useRobinhoodWallet();
  const baseNetwork = useBaseWallet();
  const arbitrumNetwork = useArbitrumWallet();

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
    tempoMainnet,
    setTempoMainnet,
    hyperliquidMainnet,
    setHyperliquidMainnet,
    robinhoodMainnet,
    setRobinhoodMainnet,
    baseMainnet,
    setBaseMainnet,
    arbitrumMainnet,
    setArbitrumMainnet,
  } = useNetwork();

  let connected,
    isConnecting,
    address,
    currencyTicker,
    networkName,
    selfCustodyParameter,
    price,
    balance,
    decimals,
    isMainnet,
    networkBanner;
  let verifiedTokensData: any, liveTokenPrices: any;

  if (network === "bitcoin") {
    networkName = bitcoinNetwork.networkName;
    connected = bitcoinNetwork.connected;
    isConnecting = bitcoinNetwork.isConnecting;
    address = bitcoinNetwork.address;
    balance = bitcoinNetwork.balance;
    currencyTicker = bitcoinNetwork.currencyTicker;
    selfCustodyParameter = bitcoinNetwork.selfCustodyParameter;
    decimals = bitcoinNetwork.decimals;
    isMainnet = bitcoinMainnet;
    price = bitcoinNetwork.price;
    networkBanner = bitcoinnetwork;
  } else if (network === "hedera") {
    networkName = hederaNetwork.networkName;
    connected = hederaNetwork.connected;
    isConnecting = hederaNetwork.isConnecting;
    address = hederaNetwork.address;
    balance = hederaNetwork.balance;
    currencyTicker = hederaNetwork.currencyTicker;
    selfCustodyParameter = hederaNetwork.selfCustodyParameter;
    decimals = hederaNetwork.decimals;
    price = hederaNetwork.price;
    isMainnet = hederaMainnet;
    networkBanner = hederanetwork;
  } else if (network === "ethereum") {
    networkName = ethereumNetwork.networkName;
    connected = ethereumNetwork.connected;
    isConnecting = ethereumNetwork.isConnecting;
    address = ethereumNetwork.address;
    balance = ethereumNetwork.balance;
    currencyTicker = ethereumNetwork.currencyTicker;
    selfCustodyParameter = ethereumNetwork.selfCustodyParameter;
    decimals = ethereumNetwork.decimals;
    price = ethereumNetwork.price;
    isMainnet = ethereumMainnet;
    networkBanner = ethereumnetwork;
  } else if (network === "polkadot") {
    networkName = polkadotNetwork.networkName;
    connected = polkadotNetwork.connected;
    isConnecting = polkadotNetwork.isConnecting;
    address = polkadotNetwork.address;
    balance = polkadotNetwork.balance;
    currencyTicker = polkadotNetwork.currencyTicker;
    selfCustodyParameter = polkadotNetwork.selfCustodyParameter;
    decimals = polkadotNetwork.decimals;
    price = polkadotNetwork.price;
    isMainnet = polkadotMainnet;
    networkBanner = polkadotNetwork.networkLogo;
  } else if (network === "tempo") {
    networkName = tempoNetwork.networkName;
    connected = tempoNetwork.connected;
    address = tempoNetwork.address;
    balance = tempoNetwork.balance;
    currencyTicker = tempoNetwork.currencyTicker;
    selfCustodyParameter = tempoNetwork.selfCustodyParameter;
    decimals = tempoNetwork.decimals;
    price = tempoNetwork.price;
    isMainnet = tempoMainnet;
    networkBanner = tempoNetwork.networkLogo;
  } else if (network === "hyperliquid") {
    networkName = hyperliquidNetwork.networkName;
    connected = hyperliquidNetwork.connected;
    address = hyperliquidNetwork.address;
    balance = hyperliquidNetwork.balance;
    currencyTicker = hyperliquidNetwork.currencyTicker;
    selfCustodyParameter = hyperliquidNetwork.selfCustodyParameter;
    decimals = hyperliquidNetwork.decimals;
    price = hyperliquidNetwork.price;
    isMainnet = hyperliquidMainnet;
    networkBanner = hyperliquidNetwork.networkLogo;
  } else if (network === "robinhood") {
    networkName = robinhoodNetwork.networkName;
    connected = robinhoodNetwork.connected;
    address = robinhoodNetwork.address;
    balance = robinhoodNetwork.balance;
    currencyTicker = robinhoodNetwork.currencyTicker;
    selfCustodyParameter = robinhoodNetwork.selfCustodyParameter;
    decimals = robinhoodNetwork.decimals;
    price = robinhoodNetwork.price;
    isMainnet = robinhoodMainnet;
    networkBanner = robinhoodNetwork.networkLogo;
  } else if (network === "base") {
    networkName = baseNetwork.networkName;
    connected = baseNetwork.connected;
    address = baseNetwork.address;
    balance = baseNetwork.balance;
    currencyTicker = baseNetwork.currencyTicker;
    selfCustodyParameter = baseNetwork.selfCustodyParameter;
    decimals = baseNetwork.decimals;
    price = baseNetwork.price;
    isMainnet = baseMainnet;
    networkBanner = baseNetwork.networkLogo;
  } else if (network === "arbitrum") {
    networkName = arbitrumNetwork.networkName;
    connected = arbitrumNetwork.connected;
    address = arbitrumNetwork.address;
    balance = arbitrumNetwork.balance;
    currencyTicker = arbitrumNetwork.currencyTicker;
    selfCustodyParameter = arbitrumNetwork.selfCustodyParameter;
    decimals = arbitrumNetwork.decimals;
    price = arbitrumNetwork.price;
    isMainnet = arbitrumMainnet;
    networkBanner = arbitrumNetwork.networkLogo;
  } else {
    networkName = solanaNetwork.networkName;
    connected = solanaNetwork.connected;
    isConnecting = solanaNetwork.isConnecting;
    address = solanaNetwork.address;
    balance = solanaNetwork.balance;
    currencyTicker = solanaNetwork.currencyTicker;
    selfCustodyParameter = solanaNetwork.selfCustodyParameter;
    decimals = solanaNetwork.decimals;
    price = solanaNetwork.price;
    isMainnet = solanaMainnet;
    verifiedTokensData = solanaNetwork.verifiedTokensData;
    liveTokenPrices = solanaNetwork.liveTokenPrices;
    networkBanner = solananetwork;
  }

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
      {
        key: "tempo",
        isMainnet: tempoMainnet,
        params: tempoNetwork.selfCustodyParameter as any,
        setter: setTempoMainnet,
      },
      {
        key: "hyperliquid",
        isMainnet: hyperliquidMainnet,
        params: hyperliquidNetwork.selfCustodyParameter as any,
        setter: setHyperliquidMainnet,
      },
      {
        key: "robinhood",
        isMainnet: robinhoodMainnet,
        params: robinhoodNetwork.selfCustodyParameter as any,
        setter: setRobinhoodMainnet,
      },
      {
        key: "base",
        isMainnet: baseMainnet,
        params: baseNetwork.selfCustodyParameter as any,
        setter: setBaseMainnet,
      },
      {
        key: "arbitrum",
        isMainnet: arbitrumMainnet,
        params: arbitrumNetwork.selfCustodyParameter as any,
        setter: setArbitrumMainnet,
      },
    ];

    const active = allChecks.find((c) => c.key === network)!;
    const tokens = active.params?.tokens || [];
    const hasTokens = tokens.length > 0;

    // `fetched` (not just "params has keys") is what actually distinguishes a genuinely
    // empty/unsupported network from one whose self-custody constraints just haven't come
    // back yet — a provider's initial state already has non-empty keys (network/env/tokens),
    // so without this a fetch that's merely still in flight (or one whose response was lost
    // across a network-switch remount) looked identical to "permanently coming soon" and the
    // buy button got stuck showing "Unavailable" with no way to recover short of a 5-minute
    // background retry.
    if (active.params?.isComingSoon === true || (!hasTokens && active.params?.fetched))
      return { type: "COMING_SOON" as const, active };
    if (!active.isMainnet) return { type: "TESTNET_CAUTION" as const, active };

    return { type: "OK" as const, active };
  }, [
    network,
    bitcoinMainnet,
    hederaMainnet,
    ethereumMainnet,
    solanaMainnet,
    polkadotMainnet,
    tempoMainnet,
    bitcoinNetwork,
    hederaNetwork,
    ethereumNetwork,
    solanaNetwork,
    polkadotNetwork,
    tempoNetwork,
    hyperliquidMainnet,
    hyperliquidNetwork,
    robinhoodMainnet,
    robinhoodNetwork,
    baseMainnet,
    baseNetwork,
    arbitrumMainnet,
    arbitrumNetwork,
  ]);

  const isNetworkComingSoon = networkState.type === "COMING_SOON";
  const hasTestnetCaution = networkState.type === "TESTNET_CAUTION";

  const dynamicMessageText = useMemo(() => {
    if (networkState.type === "TESTNET_CAUTION") {
      return locale == "id"
        ? "Perhatian: Kamu sedang menggunakan testnet. Token di jaringan ini hanya untuk uji coba dan tidak memiliki nilai nyata."
        : "Caution: You are currently on testnet. Tokens on this network are for testing only and have no real value.";
    }
    return "";
  }, [networkState, locale]);

  const isLoadingTokens =
    network === "solana" &&
    (!verifiedTokensData || verifiedTokensData.length === 0);

  const buyableTokens = useMemo(() => {
    const backendTokens = (selfCustodyParameter as any)?.tokens?.filter(
      (t: any) => !!t.deposit,
    ) || [];

    if (network === "solana") {
      const getPrice = (
        tokenMint: string,
        tokenSymbol: string,
        mainnetMint: string,
      ) =>
        liveTokenPrices?.[tokenMint]?.usdPrice ||
        liveTokenPrices?.[tokenMint]?.price ||
        liveTokenPrices?.[mainnetMint]?.usdPrice ||
        liveTokenPrices?.[mainnetMint]?.price ||
        liveTokenPrices?.[tokenSymbol]?.usdPrice ||
        liveTokenPrices?.[tokenSymbol]?.price ||
        liveTokenPrices?.[tokenSymbol.toLowerCase()]?.usdPrice ||
        0;

      const defaultSolNative = {
        name: "Solana",
        symbol: "SOL",
        price: getPrice(SOLANA_NATIVE_MINT, "SOL", SOLANA_NATIVE_MINT).toString(),
        logo: solana,
        mint: SOLANA_NATIVE_MINT,
        decimals: 9,
        isNative: true,
      };

      if (!selfCustodyParameter || !(selfCustodyParameter as any).tokens || backendTokens.length === 0) {
        return [defaultSolNative];
      }

      return backendTokens.map((bToken: any) => {
        const backendSymOrMint = (bToken.token || "").trim();
        const upperSymbolOrMint = backendSymOrMint.toUpperCase();

        const isNative = !!bToken.isNative;

        let mint = isNative ? SOLANA_NATIVE_MINT : backendSymOrMint;
        let symbol = upperSymbolOrMint;
        let name = isNative ? "Solana" : `${upperSymbolOrMint} Token`;
        let logo = isNative ? solana : null;
        let dec = isNative ? 9 : 6;

        if (
          mint === USDC_MINT ||
          mint === USDC_MINT_DEVNET ||
          backendSymOrMint === USDC_MINT ||
          backendSymOrMint === USDC_MINT_DEVNET ||
          upperSymbolOrMint === "USDC"
        ) {
          symbol = "USDC";
          name = "USD Coin";
          logo = usdc;
          dec = 6;
          mint = isMainnet ? USDC_MINT : USDC_MINT_DEVNET;
        }

        const meta = verifiedTokensData?.find(
          (v: any) =>
            v.mint === backendSymOrMint ||
            v.symbol?.toUpperCase() === upperSymbolOrMint ||
            (isNative &&
              (v.mint === SOLANA_NATIVE_MINT ||
                v.symbol?.toUpperCase() === "SOL")),
        );

        if (meta) {
          mint = meta.mint;
          symbol = meta.symbol;
          name = meta.name;
          logo = meta.icon;
          dec = meta.decimals;
        }

        const mainnetMintFallback = mint;

        if (!isMainnet && !isNative) {
          if (symbol.toUpperCase() === "USDC" || mint === USDC_MINT_DEVNET) {
            mint = USDC_MINT_DEVNET;
            symbol = "USDC";
            name = "USD Coin";
            logo = usdc;
          }
        }

        return {
          name,
          symbol,
          price: getPrice(mint, symbol, mainnetMintFallback).toString(),
          logo,
          mint,
          decimals: dec,
          isNative,
        };
      });
    } else {
      let localLogo = null;
      if (network === "bitcoin") localLogo = bitcoin;
      if (network === "ethereum") localLogo = ethereum;
      if (network === "hedera") localLogo = hedera;
      if (network === "polkadot") localLogo = isMainnet ? polkadot : paseo;
      if (network === "tempo") localLogo = networkBanner;
      if (network === "hyperliquid") localLogo = networkBanner;
      if (network === "robinhood") localLogo = networkBanner;
      if (network === "base") localLogo = networkBanner;
      if (network === "arbitrum") localLogo = networkBanner;

      const localName = network === "polkadot" && !isMainnet ? "Paseo" : networkName;

      return [
        {
          name: localName,
          symbol: currencyTicker,
          price: ((price as any)?.usd || 0).toString(),
          logo: localLogo,
          mint: null,
          decimals: decimals,
          isNative: true,
        },
      ];
    }
  }, [
    network,
    selfCustodyParameter,
    verifiedTokensData,
    liveTokenPrices,
    price,
    networkName,
    currencyTicker,
    decimals,
    isMainnet,
  ]);

  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"va" | "qris">("va");
  const [selectedVaChannel, setSelectedVaChannel] = useState<string>("INA");
  const [isVaSelectorOpen, setIsVaSelectorOpen] = useState(false);
  const [vaSearchQuery, setVaSearchQuery] = useState("");
  const [paymentDetails, setPaymentDetails] = useState({
    method: "IDRX",
    channelCode: "INA",
  });

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch("/api/payment-channels");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          const vaList = data
            .filter((c: any) => c.method?.toLowerCase() === "va")
            .map((c: any) => ({
              name: c.name,
              detailName: `${c.name} Virtual Account`,
              code: c.code,
              logo: null,
              isAvailable: true,
              fee: c.feeValue || 3000,
            }));
          if (vaList.length > 0) {
            setVaChannels(vaList);
          }
        }
      } catch (err) {
        console.error("Failed to fetch payment channels:", err);
      }
    };
    fetchChannels();
  }, []);

  const currentVa = useMemo(() => {
    return (
      vaChannels.find((channel) => channel.code === selectedVaChannel) ||
      vaChannels[0]
    );
  }, [selectedVaChannel, vaChannels]);

  const filteredVaChannels = useMemo(() => {
    if (!vaSearchQuery.trim()) return vaChannels;
    const query = vaSearchQuery.toLowerCase();
    return vaChannels.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.detailName.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query)
    );
  }, [vaSearchQuery, vaChannels]);
  const [manualAddress, setManualAddress] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isMainInfoOpen, setIsMainInfoOpen] = useState(false);

  const [amountError, setAmountError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [paymentMethodError, setpaymentMethodError] = useState("");
  const [isValidForm, setIsValidForm] = useState(false);
  const [statusTxCreated, setStatusTxCreated] = useState("");

  const [approxCryptoValue, setApproxCryptoValue] = useState<number>(0);
  const [feeDetails, setFeeDetails] = useState<any[]>([]);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [dotsCount, setDotsCount] = useState(1);
  const estimateCacheRef = useRef<Map<string, { token: number; feeDetails: any[] }>>(new Map());

  useEffect(() => {
    if (!isEstimating) {
      setDotsCount(1);
      return;
    }
    const interval = setInterval(() => {
      setDotsCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 280);
    return () => clearInterval(interval);
  }, [isEstimating]);

  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");

  // Tracks whether we've already attempted to seed selectedToken from the URL's
  // `token` param, so the one-time restoration doesn't re-fire and clobber the
  // user's own later selections once buyableTokens keeps changing (network mode
  // toggles, live price refreshes, etc).
  const initializedTokenFromUrlRef = useRef(false);
  const prevNetworkRef = useRef(network);

  useEffect(() => {
    if (prevNetworkRef.current !== network) {
      prevNetworkRef.current = network;
      initializedTokenFromUrlRef.current = false;
      if (buyableTokens.length > 0) {
        const defaultNativeToken = buyableTokens.find(
          (t: any) =>
            t.isNative === true ||
            t.symbol?.toLowerCase() === currencyTicker?.toLowerCase(),
        );
        setSelectedToken(defaultNativeToken || buyableTokens[0]);
      } else {
        setSelectedToken(null);
      }
    }
  }, [network, buyableTokens, currencyTicker]);

  // Clear the selected token immediately on a chain switch (e.g. via a network switcher
  // that doesn't navigate/remount this component, like the community landing pages —
  // BuyToken stays mounted across the switch). Without this, if the new chain's
  // buyableTokens list comes back empty (unconfigured/coming-soon network), the effect
  // below that would normally pick a fresh default token never runs at all (it's gated on
  // buyableTokens.length > 0), leaving selectedToken — and therefore the "Buy X" header, the
  // receive-token logo, and currentTokenConstraints' lookup — stuck showing the *previous*
  // chain's token indefinitely.
  useEffect(() => {
    setSelectedToken(null);
  }, [network]);

  const selectedVALogo = vaChannels.find(
    (channel) => channel.code === paymentDetails.channelCode,
  )?.logo;

  // Synchronous active token resolution: guarantee selectedToken is valid for the current network
  const activeSelectedToken = useMemo(() => {
    if (!buyableTokens || buyableTokens.length === 0) return selectedToken;
    if (!selectedToken) return buyableTokens[0];
    const match = buyableTokens.find(
      (t: any) =>
        t.symbol?.toUpperCase() === selectedToken.symbol?.toUpperCase() &&
        Boolean(t.isNative) === Boolean(selectedToken.isNative),
    );
    return match || buyableTokens[0];
  }, [selectedToken, buyableTokens]);

  const currentTokenConstraints = useMemo(() => {
    if (!selfCustodyParameter || !(selfCustodyParameter as any).tokens)
      return null;

    const tokens = (selfCustodyParameter as any).tokens;
    const targetSymbol = activeSelectedToken?.symbol || selectedToken?.symbol || currencyTicker || "";

    return (
      tokens.find((t: any) => {
        const backendToken = (t.token || "").trim().toUpperCase();
        const frontendSymbol = targetSymbol.trim().toUpperCase();

        const isSymbolMatch = backendToken === frontendSymbol;
        const isMintMatch =
          t.token && (activeSelectedToken?.mint || selectedToken?.mint) && t.token === (activeSelectedToken?.mint || selectedToken?.mint);

        return isSymbolMatch || isMintMatch;
      }) || null
    );
  }, [selfCustodyParameter, activeSelectedToken, selectedToken, currencyTicker]);

  const isTokenUnavailable = useMemo(() => {
    if (isNetworkComingSoon) return true;
    if (currentTokenConstraints) {
      return currentTokenConstraints.deposit === false;
    }
    if (
      selfCustodyParameter &&
      Array.isArray((selfCustodyParameter as any).tokens) &&
      (selfCustodyParameter as any).tokens.length > 0
    ) {
      if (!currentTokenConstraints && !activeSelectedToken?.isNative) {
        return true;
      }
    }
    return false;
  }, [isNetworkComingSoon, currentTokenConstraints, selfCustodyParameter, activeSelectedToken]);

  useEffect(() => {
    if (buyableTokens.length > 0) {
      const urlTokenSymbol = searchParams.get("token");
      if (urlTokenSymbol && !initializedTokenFromUrlRef.current) {
        const urlToken = buyableTokens.find(
          (t: any) => t.symbol?.toUpperCase() === urlTokenSymbol.toUpperCase(),
        );
        if (urlToken) {
          initializedTokenFromUrlRef.current = true;
          setSelectedToken(urlToken);
          return;
        }
      }

      const matchingTokenInNewEnv = selectedToken
        ? buyableTokens.find(
            (t: any) =>
              t.symbol?.toUpperCase() === selectedToken.symbol?.toUpperCase() &&
              t.isNative === selectedToken.isNative,
          )
        : null;

      if (matchingTokenInNewEnv) {
        if (
          String(matchingTokenInNewEnv.mint) !== String(selectedToken.mint) ||
          String(matchingTokenInNewEnv.price) !== String(selectedToken.price)
        ) {
          setSelectedToken(matchingTokenInNewEnv);
        }
      } else {
        const defaultNativeToken = buyableTokens.find(
          (t: any) =>
            t.isNative === true ||
            t.symbol?.toLowerCase() === currencyTicker?.toLowerCase(),
        );
        const fallbackToken = defaultNativeToken || buyableTokens[0];

        if (
          !selectedToken ||
          selectedToken.symbol?.toUpperCase() !==
            fallbackToken?.symbol?.toUpperCase() ||
          selectedToken.isNative !== fallbackToken?.isNative
        ) {
          setSelectedToken(fallbackToken);
        }
      }
    }
  }, [buyableTokens, currencyTicker, selectedToken, searchParams]);

  const filteredTokens = useMemo(() => {
    return buyableTokens.filter(
      (t: any) =>
        (t.symbol &&
          t.symbol.toLowerCase().includes(tokenSearchQuery.toLowerCase())) ||
        (t.name &&
          t.name.toLowerCase().includes(tokenSearchQuery.toLowerCase())),
    );
  }, [buyableTokens, tokenSearchQuery]);

  const getUserBalance = (mintOrSymbol: string, isNative: boolean): number | null => {
    if (!connected || isConnecting || !balance || !balance.fetched) return null;

    if (isNative) return Math.max(0, balance?.confirmed || 0);

    if (network === "solana" && (balance as any)?.tokens) {
      const isUsdc =
        mintOrSymbol === "USDC" ||
        mintOrSymbol === USDC_MINT ||
        mintOrSymbol === USDC_MINT_DEVNET;

      const token = (balance as any).tokens.find(
        (t: any) =>
          t.mint === mintOrSymbol ||
          t.symbol?.toUpperCase() === mintOrSymbol?.toUpperCase() ||
          (isUsdc &&
            (t.mint === USDC_MINT ||
              t.mint === USDC_MINT_DEVNET ||
              t.symbol?.toUpperCase() === "USDC")),
      );

      if (token?.metaLoading) return null;
      return Math.max(0, token?.amount || 0);
    }

    if ((balance as any)?.tokens) {
      const token = (balance as any).tokens.find(
        (t: any) =>
          t.mint === mintOrSymbol ||
          t.symbol?.toUpperCase() === mintOrSymbol?.toUpperCase(),
      );
      if (token?.metaLoading) return null;
      return Math.max(0, token?.amount || 0);
    }

    return 0;
  };

  const isBalanceLoading = isConnecting || (connected && (!balance || !balance.fetched));

  const getCanonicalTokenSymbol = (token: any, net: string): string => {
    if (!token) return "";
    const sym = (token.symbol || "").trim().toUpperCase();
    if (
      sym === "USDC" ||
      token.mint === USDC_MINT ||
      token.mint === USDC_MINT_DEVNET ||
      sym.includes("EPJFWDD5AUFQSSQEM2QN1XZYBAPCE8G4WEGGKZWYTDT1V")
    ) {
      return "USDC";
    }
    if (token.isNative || sym === "SOL" || token.mint === SOLANA_NATIVE_MINT) {
      return net === "solana" ? "SOL" : sym;
    }
    return sym;
  };

  useEffect(() => {
    const userAddress = connected ? address : manualAddress.trim();

    let isAmountValid = true;
    let isAddressValid = true;
    let isPaymentMethodValid = true;

    const isNumber = /^\d+(\.\d+)?$/.test(customAmount);

    const minAmount = currentTokenConstraints?.deposit?.min || 0;
    const maxAmount =
      selectedPaymentMethod === "qris" || paymentDetails.method === "QRIS"
        ? currentTokenConstraints?.deposit?.maxQRIS || 0
        : currentTokenConstraints?.deposit?.maxVA || 0;

    if (!customAmount || customAmount.trim() === "") {
      setAmountError("");
      isAmountValid = false;
    } else if (!isNumber || parseFloat(customAmount) <= 0) {
      setAmountError("Please enter a valid positive number.");
      isAmountValid = false;
    } else if (parseFloat(customAmount) < minAmount) {
      setAmountError(
        locale == "en"
          ? `Minimum amount is ${minAmount.toLocaleString("id-ID")} IDR.`
          : `Jumlah minimal adalah Rp ${minAmount.toLocaleString("id-ID")}.`,
      );
      isAmountValid = false;
    } else if (parseFloat(customAmount) > maxAmount && maxAmount > 0) {
      setAmountError(
        locale == "en"
          ? `Maximum amount for ${paymentDetails.method || "payment"} is ${maxAmount.toLocaleString("id-ID")} IDR.`
          : `Jumlah maksimal untuk metode ${paymentDetails.method || "pembayaran"} adalah Rp ${maxAmount.toLocaleString("id-ID")}.`,
      );
      isAmountValid = false;
    } else {
      setAmountError("");
    }

    if (!connected) {
      const trimmed = userAddress!.trim();

      if (trimmed === "") {
        setAddressError("");
        isAddressValid = false;
      } else {
        const provider = {
          bitcoin: bitcoinNetwork,
          ethereum: ethereumNetwork,
          solana: solanaNetwork,
          hedera: hederaNetwork,
          polkadot: polkadotNetwork,
          tempo: tempoNetwork,
          hyperliquid: hyperliquidNetwork,
          robinhood: robinhoodNetwork,
          base: baseNetwork,
          arbitrum: arbitrumNetwork,
        }[network];

        const result = provider?.checkAddress(trimmed) ?? { valid: false, reason: "invalid" as const };
        isAddressValid = result.valid;
        setAddressError(result.valid ? "" : t(getAddressErrorMessageKey(network, result.reason)));
      }
    }

    if (paymentDetails.method == "" || paymentDetails.channelCode == "") {
      isPaymentMethodValid = false;
    } else {
      setpaymentMethodError("");
    }

    setIsValidForm(
      isAmountValid &&
        isAddressValid &&
        isPaymentMethodValid &&
        !isTokenUnavailable,
    );
  }, [
    customAmount,
    connected,
    address,
    manualAddress,
    paymentDetails,
    network,
    t,
    isTokenUnavailable,
    currentTokenConstraints,
    locale,
    selectedPaymentMethod,
  ]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");

    if (ref) {
      localStorage.setItem("paradapp-ref", ref);
    }

    const urlAmount = urlParams.get("amount");
    if (urlAmount && /^\d+(\.\d+)?$/.test(urlAmount)) {
      setCustomAmount(urlAmount);
    }
  }, []);

  // `isRetry` marks the automatic call this effect makes right after a KYC/email
  // verification redirect (see the verify_success effect below) — the user didn't just
  // click anything, so if this silent attempt itself fails, showing the same alarming
  // "Transaction creation failed" text as a real manual failure was confusing right after
  // they'd just successfully completed verification. A generic failure here most likely
  // means the IDRX-side KYC review hasn't actually finished propagating yet even though our
  // own email/wallet verification just did — so it's logged, not shown, leaving the normal
  // Buy button available for the user to try again themselves once it has.
  const handleBuyClick = async (isRetry = false) => {
    const idrAmount = parseFloat(customAmount);
    const walletAddress = connected ? address : manualAddress;
    if (!walletAddress) return;

    setStatusTxCreated("");

    const refAddress = localStorage.getItem("paradapp-ref")
      ? localStorage.getItem("paradapp-ref") == address
        ? undefined
        : localStorage.getItem("paradapp-ref")
      : undefined;

    setIsProcessing(true);
    try {
      const isQris = selectedPaymentMethod === "qris";
      const payload = {
        type: "DEPOSIT",
        walletAddress: walletAddress,
        tokenType: activeSelectedToken?.symbol || selectedToken?.symbol,
        network: network.toUpperCase(),
        networkEnv: isMainnet ? "MAINNET" : "TESTNET",
        refAddress: refAddress,
        idrAmount: idrAmount,
        paymentDetails: {
          method: "IDRX",
          paymentMethod: isQris ? "qris" : "va",
          channelId: isQris ? "QR" : selectedVaChannel,
          channelName: isQris ? "QRIS" : currentVa.detailName,
          returnUrl:
            typeof window !== "undefined"
              ? `${window.location.origin}/payment-return`
              : "https://paradapp.io/payment-return",
        },
      };

      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success && data.tx?.id) {
        const txUrl = `/${network}/vault/transaction/${data.tx.id}`;
        if (openTxInNewTab) {
          window.open(txUrl, "_blank", "noopener,noreferrer");
        } else {
          router.push(txUrl);
        }
      } else if (
        res.status === 429 ||
        (data?.error && (data.error.toLowerCase().includes("too many on progress") || data.error.toLowerCase().includes("limit")))
      ) {
        setShowLimitModal(true);
      } else if (
        data?.errorCode === "ERR_IDRX_REKYC_REQUIRED" ||
        data?.error_code === "ERR_IDRX_REKYC_REQUIRED"
      ) {
        savePendingTransaction({
          type: "DEPOSIT",
          walletAddress: walletAddress,
          tokenType: activeSelectedToken?.symbol || selectedToken?.symbol || "USDC",
          network: network.toString(),
          networkEnv: isMainnet ? "MAINNET" : "TESTNET",
          refAddress: refAddress || undefined,
          idrAmount: idrAmount,
          paymentDetails: {
            method: "IDRX",
            paymentMethod: isQris ? "qris" : "va",
            channelId: isQris ? "QR" : selectedVaChannel,
            channelName: isQris ? "QRIS" : currentVa.detailName,
            returnUrl:
              typeof window !== "undefined"
                ? `${window.location.origin}/payment-return`
                : "https://paradapp.io/payment-return",
          },
        });
        startOnboarding(
          walletAddress,
          (network || "solana").toUpperCase(),
          data?.lastEmail || data?.last_email,
          true,
        );
      } else if (
        res.status === 400 &&
        (() => {
          const msg = data.error?.toLowerCase() || "";
          // Backend wording differs by endpoint — deposit says "not onboarded with
          // IDRX", withdrawal says "not onboarded to IDRX" — match on both key phrases
          // independently instead of one exact string, verified against the live backend.
          return msg.includes("not onboarded") && msg.includes("idrx");
        })()
      ) {
        // Cache transaction details in localStorage for auto-resuming
        savePendingTransaction({
          type: "DEPOSIT",
          walletAddress: walletAddress,
          tokenType: activeSelectedToken?.symbol || selectedToken?.symbol || "USDC",
          network: network.toString(),
          networkEnv: isMainnet ? "MAINNET" : "TESTNET",
          refAddress: refAddress || undefined,
          idrAmount: idrAmount,
          paymentDetails: {
            method: "IDRX",
            paymentMethod: isQris ? "qris" : "va",
            channelId: isQris ? "QR" : selectedVaChannel,
            channelName: isQris ? "QRIS" : currentVa.detailName,
            returnUrl:
              typeof window !== "undefined"
                ? `${window.location.origin}/payment-return`
                : "https://paradapp.io/payment-return",
          },
        });
        // Open the onboarding email verification modal
        startOnboarding(walletAddress, (network || "solana").toUpperCase());
      } else {
        // Raw backend error strings (e.g. upstream price-API/HTTP failures) aren't meant
        // for end users — log the real detail for debugging, show the friendly fallback.
        console.error("Transaction creation failed:", data?.error);
        if (!isRetry) setStatusTxCreated(t("text152"));
      }
    } catch (error: any) {
      console.error("Transaction creation error:", error);
      if (!isRetry) setStatusTxCreated(t("text152"));
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const verifySuccess = searchParams.get("verify_success");
    if (verifySuccess === "true") {
      const pendingTx = getPendingTransaction();
      const currentWallet = connected ? address : manualAddress;
      
      if (
        pendingTx &&
        pendingTx.type === "DEPOSIT" &&
        pendingTx.walletAddress === currentWallet
      ) {
        if (pendingTx.idrAmount) {
          setCustomAmount(pendingTx.idrAmount.toString());
        }
        if (pendingTx.paymentDetails) {
          if (pendingTx.paymentDetails.paymentMethod === "qris") {
            setSelectedPaymentMethod("qris");
          } else {
            setSelectedPaymentMethod("va");
            if (pendingTx.paymentDetails.channelId) {
              setSelectedVaChannel(pendingTx.paymentDetails.channelId);
            }
          }
        }
        
        clearPendingTransaction();
        
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete("verify_success");
        const path = window.location.pathname;
        const search = newParams.toString();
        router.replace(`${path}${search ? `?${search}` : ""}`, { scroll: false });
        
        // A short delay so the just-completed verification has a moment to actually
        // propagate on the backend before this fires — hitting it immediately risked a
        // transient "not onboarded" response right after the user had just verified.
        setTimeout(() => {
          handleBuyClick(true);
        }, 800);
      }
    }
  }, [searchParams, connected, address, manualAddress, router]);

  const idrAmount = parseFloat(customAmount || "0");
  const selectedVA = vaChannels.find(
    (channel) => channel.code === paymentDetails.channelCode,
  )?.name;

  // Group fee details into display categories. deductedAmount is now the backend's
  // authoritative deducted value for every line, already in whichever unit is correct for
  // that fee — PERCENT no longer implies "IDR cost = value * idrAmount" the way it used to,
  // since PERCENT is now also used for token-denominated fees (Platform Fee, Slippage
  // Tolerance, Binance Trade Fee), not just IDR ones (Final Income Tax). Only the payment
  // gateway/tax bucket is IDR; everything else (platform, slippage/trade, network,
  // TOKEN_FIXED-type fees like a Binance withdrawal fee) is crypto token units.
  const groupedFees = useMemo(() => {
    if (!feeDetails || feeDetails.length === 0) return null;

    let paymentAndTax = 0; // IDR
    let platform = 0;      // Crypto token units
    let slippage = 0;      // Crypto token units
    let networkCrypto = 0; // Crypto token units

    feeDetails.forEach((fee: any) => {
      const label = (fee.label || "").toLowerCase();
      const type: string = fee.type || "";
      const deductedAmount: number = fee.deductedAmount ?? fee.deducted_amount ?? 0;

      if (label.includes("platform")) {
        platform += deductedAmount;
      } else if (
        label.includes("slippage") ||
        label.includes("tolerance") ||
        label.includes("trade")
      ) {
        slippage += deductedAmount;
      } else if (
        label.includes("network") ||
        type === "TOKEN_FIXED" ||
        type === "DYNAMIC_ON_CHAIN"
      ) {
        networkCrypto += deductedAmount;
      } else {
        // Payment gateway (QRIS/VA), taxes, etc.
        paymentAndTax += deductedAmount;
      }
    });

    // Return null if everything is truly zero (nothing to display)
    if (paymentAndTax === 0 && platform === 0 && slippage === 0 && networkCrypto === 0) {
      return null;
    }

    return { paymentAndTax, platform, slippage, networkCrypto };
  }, [feeDetails]);

  useEffect(() => {
    // 1. CLEAR FEES IF AMOUNT IS 0
    if (idrAmount <= 0 || !activeSelectedToken || !network) {
      setApproxCryptoValue(0);
      setFeeDetails([]); 
      setShowFeeBreakdown(false);
      setIsEstimating(false);
      setEstimateError(false);
      return;
    }

    const tokenSymbol = getCanonicalTokenSymbol(activeSelectedToken, network);
    const cacheKey = `${network}_${tokenSymbol}_${idrAmount}_${selectedPaymentMethod}_${selectedVaChannel}_${isMainnet ? "M" : "T"}`;

    // Instant cache hit restoration
    if (estimateCacheRef.current.has(cacheKey)) {
      const cached = estimateCacheRef.current.get(cacheKey)!;
      setApproxCryptoValue(cached.token);
      setFeeDetails(cached.feeDetails);
      setIsEstimating(false);
      setEstimateError(false);
      return;
    }

    setIsEstimating(true);
    setEstimateError(false);
    const controller = new AbortController();

    const getEstimation = async () => {
      let attempts = 0;
      const maxAttempts = 3;
      let success = false;

      while (attempts < maxAttempts && !controller.signal.aborted) {
        attempts++;
        try {
          const params = new URLSearchParams({
            network: network.toUpperCase(),
            token: tokenSymbol,
            idr: idrAmount.toString(),
            env: isMainnet ? "MAINNET" : "TESTNET",
            paymentMethod: selectedPaymentMethod === "qris" ? "QRIS" : "VA",
            channelId: selectedVaChannel,
          });

          const res = await fetch(`/api/estimate-deposit?${params.toString()}`, {
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error(`Estimate API returned ${res.status}`);
          }

          const data = await res.json();

          let finalToken = 0;
          let finalFeeDetails: any[] = [];

          if (data.token) {
            finalToken = data.token;
            finalFeeDetails = data.feeDetails || data.fee_details || [];
          } else if (data.qris || data.va) {
            const selectedData =
              selectedPaymentMethod === "qris"
                ? data.qris || data.va
                : data.va || data.qris;
            finalToken = selectedData?.token || 0;
            finalFeeDetails =
              selectedData?.feeDetails || selectedData?.fee_details || [];
          }

          if (finalToken > 0) {
            setApproxCryptoValue(finalToken);
            setFeeDetails(finalFeeDetails);
            setEstimateError(false);
            estimateCacheRef.current.set(cacheKey, {
              token: finalToken,
              feeDetails: finalFeeDetails,
            });
            success = true;
            break;
          } else if (attempts < maxAttempts && !controller.signal.aborted) {
            await new Promise((r) => setTimeout(r, attempts * 300));
          }
        } catch (error: any) {
          if (error?.name === "AbortError") return;
          if (attempts < maxAttempts && !controller.signal.aborted) {
            await new Promise((r) => setTimeout(r, attempts * 300));
          }
        }
      }

      if (!success && !controller.signal.aborted) {
        setEstimateError(true);
      }
      setIsEstimating(false);
    };

    const timeoutId = setTimeout(() => {
      getEstimation();
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [idrAmount, selectedToken, network, isMainnet, selectedPaymentMethod, selectedVaChannel, retryTrigger]);

  // Mirror the current token/amount selection into the URL (debounced, so typing
  // doesn't fire a replace per keystroke) so the page stays shareable — copying the
  // link reproduces whatever was selected instead of always landing on the defaults.
  useEffect(() => {
    if (!selectedToken || isLoadingTokens) return;

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      // A locked token (dedicated single-asset pages like buy-bitcoin) can never be
      // anything else, so there's nothing to restore from a shared link — reflecting it in
      // the URL is just noise (unlike an open token picker, where it's genuinely useful).
      if (lockToken) {
        params.delete("token");
      } else {
        params.set("token", selectedToken.symbol);
      }
      if (customAmount) {
        params.set("amount", customAmount);
      } else {
        params.delete("amount");
      }
      const query = params.toString();
      router.replace(
        `${window.location.pathname}${query ? `?${query}` : ""}`,
        { scroll: false },
      );
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [selectedToken, customAmount, isLoadingTokens, router, lockToken]);

  const handleTokenSelect = (token: any) => {
    setSelectedToken(token);
    setIsTokenSelectorOpen(false);
    setTokenSearchQuery("");

    // Restore instantly from cache if available for this token & amount
    const tokenSymbol = getCanonicalTokenSymbol(token, network);
    const cacheKey = `${network}_${tokenSymbol}_${idrAmount}_${selectedPaymentMethod}_${selectedVaChannel}_${isMainnet ? "M" : "T"}`;
    if (estimateCacheRef.current.has(cacheKey)) {
      const cached = estimateCacheRef.current.get(cacheKey)!;
      setApproxCryptoValue(cached.token);
      setFeeDetails(cached.feeDetails);
    }

    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (currentPath.includes(`/${network}/`)) {
        const params = new URLSearchParams(window.location.search);
        if (params.get("token") !== token.symbol) {
          params.set("token", token.symbol);
          const query = params.toString();
          const newUrl = `${currentPath}${query ? `?${query}` : ""}`;
          window.history.replaceState(window.history.state, "", newUrl);
        }
      }
    }
  };

  const handleAmountChange = (val: string) => {
    setCustomAmount(val);
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (currentPath.includes(`/${network}/`)) {
        const params = new URLSearchParams(window.location.search);
        if (val) {
          params.set("amount", val);
        } else {
          params.delete("amount");
        }
        const query = params.toString();
        const newUrl = `${currentPath}${query ? `?${query}` : ""}`;
        window.history.replaceState(window.history.state, "", newUrl);
      }
    }
  };

  const buttonText = useMemo(() => {
    if (isTokenUnavailable) return t("text295");
    if (isProcessing) return t("text10");
    if (idrAmount > 0 && (estimateError || approxCryptoValue <= 0) && !isEstimating) {
      return locale === "en" ? "Rate Unavailable" : "Estimasi Tidak Tersedia";
    }
    return t("text9");
  }, [isTokenUnavailable, isProcessing, idrAmount, estimateError, approxCryptoValue, isEstimating, locale, t]);

  const isDisable =
    isTokenUnavailable ||
    isProcessing ||
    !isValidForm ||
    isEstimating ||
    (idrAmount > 0 && approxCryptoValue <= 0);

  return (
    <>
      <div className="flex flex-col gap-6 glass-card p-4 rounded-2xl w-full max-w-full min-w-0">
        <div>
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-lg sm:text-xl">
              {locale === "en"
                ? `Buy ${activeSelectedToken?.symbol || currencyTicker || "Tokens"}`
                : `Beli ${activeSelectedToken?.symbol || currencyTicker || "Token"}`}
            </h2>
            <button
              onClick={() => setIsMainInfoOpen(true)}
              className="p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <Icon
                icon="mingcute:information-line"
                className="text-xl sm:text-2xl"
              />
            </button>
          </div>
          {/*<p className="pt-3 text-xs sm:text-sm opacity-60 leading-relaxed px-1 -mt-1">
            {locale === "en"
              ? "Purchase your favorite crypto tokens instantly using Indonesian local payment methods like Virtual Accounts or QRIS."
              : "Beli token kripto favorit Anda secara instan menggunakan metode pembayaran lokal Indonesia seperti Virtual Account atau QRIS."}
          </p>*/}
        </div>
        {/* Testnet Caution Warning */}
        {hasTestnetCaution && (
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
        {/* SWAP-STYLE INPUT WRAPPER */}
        <div className="relative flex flex-col gap-1 z-0">
          {/* TOP BOX: YOU PAY (IDR) */}
          <div className="glass-card rounded-2xl border border-black/5 bg-white/40 transition-all duration-300 shadow-sm">
            <div className="py-4 px-4 md:py-6 md:px-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                  {locale === "en" ? "You Pay" : "Kamu Bayar"}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex flex-col flex-1 min-w-0">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={customAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-9]*\.?[0-9]*$/.test(val) || val === "") {
                        handleAmountChange(val);
                      }
                    }}
                    className={`w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none border-none truncate transition-all`}
                    placeholder="0"
                  />
                </div>

                {/* Static IDR Label */}
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 glass-card rounded-full shadow-md bg-white/60 border border-white/20 opacity-90 cursor-default">
                  <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-black/5 rounded-full overflow-hidden shrink-0">
                    <span className={`font-bold text-[10px] ${colorFlip}`}>
                      Rp
                    </span>
                  </div>
                  <span className="font-bold text-sm sm:text-base pr-1">
                    IDR
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CENTERED INDICATOR ICON */}
          <div className="h-0 flex items-center justify-center z-10 pointer-events-none">
            <div
              className={`w-10 h-10 rounded-xl glass-card shadow-2xl flex items-center justify-center transform scale-75 md:scale-85 bg-black text-white`}
            >
              <Icon icon="solar:arrow-down-linear" className="text-xl" />
            </div>
          </div>

          {/* BOTTOM BOX: YOU RECEIVE (CRYPTO) */}
          <div className="glass-card rounded-2xl border border-black/5 bg-white/40 transition-all duration-300 shadow-sm">
            <div className="py-4 px-4 md:py-6 md:px-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                  {locale === "en" ? "You Receive" : "Kamu Terima"}
                </p>
                {(connected || isConnecting) && (
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold opacity-40">
                    <Icon icon="solar:wallet-linear" />
                    {isBalanceLoading || getUserBalance(activeSelectedToken?.mint || activeSelectedToken?.symbol, activeSelectedToken?.isNative) === null ? (
                      <span className="inline-block w-12 h-3.5 bg-black/10 rounded animate-pulse" />
                    ) : (
                      <span>
                        {getUserBalance(
                          activeSelectedToken?.mint || activeSelectedToken?.symbol,
                          activeSelectedToken?.isNative,
                        ) ?? 0}{" "}
                        {activeSelectedToken?.symbol || currencyTicker}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex flex-col flex-1 min-w-0">
                  {isEstimating ? (
                    <div className="flex items-center gap-1.5 h-10 py-1 select-none">
                      <span
                        className={`w-2 h-2 rounded-full bg-current transition-opacity duration-200 ${
                          dotsCount >= 1 ? "opacity-70" : "opacity-15"
                        }`}
                      />
                      <span
                        className={`w-2 h-2 rounded-full bg-current transition-opacity duration-200 ${
                          dotsCount >= 2 ? "opacity-70" : "opacity-15"
                        }`}
                      />
                      <span
                        className={`w-2 h-2 rounded-full bg-current transition-opacity duration-200 ${
                          dotsCount >= 3 ? "opacity-70" : "opacity-15"
                        }`}
                      />
                    </div>
                  ) : estimateError && idrAmount > 0 && approxCryptoValue === 0 ? (
                    <div className="flex items-center gap-2 h-10 py-1">
                      <span className="text-xs sm:text-sm font-semibold text-red-500/80">
                        {locale === "en" ? "Rate unavailable" : "Estimasi gagal"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRetryTrigger((n) => n + 1)}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg bg-black/5 hover:bg-black/10 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Icon icon="solar:restart-bold" className="text-xs" />
                        <span>{locale === "en" ? "Retry" : "Ulangi"}</span>
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      readOnly
                      value={approxCryptoValue > 0 ? approxCryptoValue : ""}
                      className="w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none border-none truncate transition-all text-current opacity-70"
                      placeholder="0"
                    />
                  )}
                </div>

                {/* Dynamic Token Selector */}
                <button
                  disabled={!!lockToken}
                  onClick={() => setIsTokenSelectorOpen(true)}
                  className={`shrink-0 flex items-center gap-2 px-2.5 py-1.5 glass-card rounded-full shadow-md bg-white/60 border border-white/20 active:scale-95 transition-all group ${lockToken ? "cursor-default opacity-90" : "hover:bg-white/80"}`}
                >
                  <div className="relative w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-black/5 rounded-full overflow-hidden shrink-0">
                    {activeSelectedToken?.logo ? (
                      <Image
                        src={activeSelectedToken.logo}
                        alt={activeSelectedToken.symbol}
                        fill
                        className="object-cover"
                        unoptimized={typeof activeSelectedToken.logo === "string"}
                      />
                    ) : (
                      <span className="font-bold text-[10px] opacity-50">
                        {activeSelectedToken?.symbol?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-sm sm:text-base pr-1">
                    {activeSelectedToken?.symbol || currencyTicker}
                  </span>
                  {!lockToken && (
                    <Icon
                      icon="solar:alt-arrow-down-linear"
                      className="text-sm opacity-40 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </button>
              </div>

              {/* Display Exchange Rate Info */}
             {/* Display Exchange Rate Info & Fee Breakdown Toggle */}
              <div className="flex justify-between items-center mt-1">
                {groupedFees ? (
                  <button 
                    onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
                    className="flex items-center gap-1 text-[10px] sm:text-xs font-bold opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Icon icon="solar:info-circle-linear" />
                    {locale === "en" ? "Fee Breakdown" : "Rincian Biaya"}
                    <Icon icon={showFeeBreakdown ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"} />
                  </button>
                ) : (
                  <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight"></span>
                )}
                
                <span className="text-[10px] sm:text-xs font-black opacity-30 italic h-4">
                  {idrAmount > 0 && approxCryptoValue > 0
                    ? (() => {
                        // 1. Remove IDR fees to get the pure IDR being swapped — platform/
                        //    slippage are crypto-denominated now, not IDR, so they no longer
                        //    belong here (see groupedFees).
                        const pureIdrAmount = groupedFees
                          ? idrAmount - groupedFees.paymentAndTax
                          : idrAmount;

                        // 2. Add crypto fees back to get the gross crypto bought
                        const grossCryptoValue = groupedFees
                          ? approxCryptoValue + groupedFees.platform + groupedFees.slippage + groupedFees.networkCrypto
                          : approxCryptoValue;

                        // 3. Calculate raw rate
                        const rawRate = pureIdrAmount / grossCryptoValue;

                        return `1 ${activeSelectedToken?.symbol || currencyTicker} ≈ Rp ${Math.round(rawRate).toLocaleString("id-ID")}`;
                      })()
                    : ""}
                </span>
              </div>

              {/* Collapsible Fee Breakdown Area */}
              {showFeeBreakdown && groupedFees && (
                <div className="mt-3 pt-3 border-t border-black/5 flex flex-col gap-2 animate-fade-in">
                  
                  {selectedPaymentMethod === "qris" && approxCryptoValue > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] sm:text-xs font-medium opacity-60">
                        {locale === "en" ? "Payment Fee (QRIS)" : "Biaya Pembayaran (QRIS)"}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold opacity-80">
                        {(approxCryptoValue * 0.007).toFixed(decimalsForFeeValue(approxCryptoValue * 0.007))} {activeSelectedToken?.symbol || currencyTicker}
                      </span>
                    </div>
                  )}

                  {groupedFees.platform > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] sm:text-xs font-medium opacity-60">
                        {locale === "en" ? "Platform Fees" : "Biaya Platform"}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold opacity-80">
                        {groupedFees.platform.toFixed(decimalsForFeeValue(groupedFees.platform))} {selectedToken?.symbol || currencyTicker}
                      </span>
                    </div>
                  )}

                  {/* SLIPPAGE ROW */}
                  {groupedFees.slippage > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] sm:text-xs font-medium opacity-60">
                        {locale === "en" ? "Slippage" : "Toleransi Harga"}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold opacity-80">
                        {groupedFees.slippage.toFixed(decimalsForFeeValue(groupedFees.slippage))} {selectedToken?.symbol || currencyTicker}
                      </span>
                    </div>
                  )}

                  {/* NETWORK PROCESSING (CRYPTO ONLY) */}
                  {groupedFees.networkCrypto > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] sm:text-xs font-medium opacity-60 flex items-center gap-1">
                        {locale === "en" ? "Network Processing" : "Pemrosesan Jaringan"}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold opacity-80">
                        {groupedFees.networkCrypto.toFixed(decimalsForFeeValue(groupedFees.networkCrypto))} {selectedToken?.symbol || currencyTicker}
                      </span>
                    </div>
                  )}
                  
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PAYMENT METHOD SELECTOR */}
        <div className="flex flex-col gap-2 mt-1 w-full min-w-0">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
              {locale === "en" ? "Payment Method" : "Metode Pembayaran"}
            </p>
          </div>

          {/* Top-Level Tabs: Virtual Account vs QRIS */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/5 border border-black/5 w-full">
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod("va")}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                selectedPaymentMethod === "va"
                  ? "bg-white text-neutral-900 shadow-sm border-black/5"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Icon icon="solar:card-2-bold" className="text-base" />
              <span>Virtual Account</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPaymentMethod("qris")}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                selectedPaymentMethod === "qris"
                  ? "bg-white text-neutral-900 shadow-sm border-black/5"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <div className="w-4 h-4 overflow-hidden shrink-0 flex items-center justify-center">
                <Image src={qris} alt="QRIS" className="w-full h-full object-contain" />
              </div>
              <span>QRIS</span>
            </button>
          </div>

          {/* Details for Selected Method */}
          {selectedPaymentMethod === "va" ? (
            <button
              type="button"
              onClick={() => setIsVaSelectorOpen(true)}
              className="w-full min-h-[62px] px-3.5 py-3 glass-card rounded-2xl border border-black/5 bg-white/40 shadow-sm hover:border-black/15 transition-all text-left flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-black/5 text-neutral-700 border border-black/5 flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-sm">
                  {currentVa?.logo ? (
                    <Image
                      src={currentVa.logo}
                      alt={currentVa.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Icon icon="solar:card-2-bold" className="text-lg" />
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                      {currentVa?.name || "Bank INA"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/5 font-semibold opacity-60">
                      Virtual Account
                    </span>
                  </div>
                  <span className="text-[10px] opacity-50 truncate mt-0.5">
                    {currentVa?.detailName || "Bank INA Virtual Account"}
                  </span>
                  <span className="text-[10px] text-amber-500 font-semibold mt-0.5">
                    +Rp {(((currentVa as any)?.fee) || 3000).toLocaleString("id-ID")} transfer fee
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] opacity-40 font-medium hidden sm:inline group-hover:opacity-70 transition-opacity">
                  {locale === "en" ? "Change" : "Ganti"}
                </span>
                <Icon
                  icon="solar:alt-arrow-down-linear"
                  className="text-sm opacity-40 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </button>
          ) : (
            <div className="w-full h-[62px] px-3.5 glass-card rounded-2xl border border-black/5 bg-white/40 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-white border border-black/5 flex items-center justify-center shrink-0 p-1 shadow-sm">
                  <Image src={qris} alt="QRIS" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                      QRIS
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/5 font-semibold opacity-60">
                      QR Code
                    </span>
                  </div>
                  <span className="text-[10px] opacity-50 truncate mt-0.5">
                    {locale === "en" ? "Scan QR code to pay" : "Pindai kode QR untuk membayar"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {amountError && (
          <p className="text-sm text-red-500 italic px-1">{amountError}</p>
        )}
        {/* Manual Address Input (If not connected) */}
        {!connected && (
          <div className="flex flex-col gap-2">
            <div className="bgBox glass-card cursor-text">
              <div className="flex items-center justify-between gap-2 lg:gap-1 px-3 py-3">
                <input
                  type="text"
                  className="w-full h-full sm:text-sm text-[10px] font-bold bg-transparent outline-none border-none"
                  placeholder={t("text13")}
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                />
              </div>
            </div>
            {addressError && (
              <p
                className={`sm:text-sm text-[10px] italic ${addressError.includes("must start") || addressError.includes("prefix") ? "" : "text-red-500"}`}
              >
                {addressError}
              </p>
            )}
          </div>
        )}

        <Button
          disabled={isDisable}
          chain={network}
          onClick={() => {
            if (!isDisable) handleBuyClick();
          }}
          buttonText={buttonText}
        />
        {statusTxCreated && (
          <p className="mt-2 text-xs text-red-500">{statusTxCreated}</p>
        )}
      </div>


      {/* --- Token Selection Modal --- */}
      <AnimatedModal
        isOpen={isTokenSelectorOpen}
        onClose={() => setIsTokenSelectorOpen(false)}
        maxWidthClass="lg:w-150"
      >
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 max-h-[80vh]">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">
              {locale === "en" ? "Select Token" : "Pilih Token"}
            </h2>
            <p className="text-[12px] opacity-70">
              {locale === "en"
                ? "Choose an asset to purchase from the supported list."
                : "Pilih aset untuk dibeli dari daftar yang didukung."}
            </p>
          </div>

          <div className="relative group mb-5">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Icon
                icon="solar:magnifer-linear"
                className="text-xl opacity-40 group-focus-within:opacity-100 transition-all"
              />
            </div>
            <input
              type="text"
              placeholder={
                locale === "en"
                  ? "Search symbol or name"
                  : "Cari simbol atau nama"
              }
              value={tokenSearchQuery}
              onChange={(e) => setTokenSearchQuery(e.target.value)}
              className="w-full bg-black/5 border border-black/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-black/50 focus:bg-black/10 transition-all"
            />
          </div>

          <div className="flex flex-col gap-3 pb-2">
            {filteredTokens.length > 0 ? (
              filteredTokens.map((token: any, idx: number) => {
                const isSelected = selectedToken?.symbol === token.symbol;

                const userBal = getUserBalance(
                  token.mint || token.symbol,
                  token.isNative,
                );
                const tokenPriceUsd = parseFloat(token.price || "0");
                const totalUSD = userBal !== null ? userBal * tokenPriceUsd : 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTokenSelect(token)}
                    className={`w-full text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${isSelected ? "border-black/20 bg-black/5" : "border-black/5 hover:bg-black/5"}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm relative shrink-0 flex items-center justify-center bg-black/5">
                        {token.logo ? (
                          <Image
                            src={token.logo}
                            alt={token.symbol}
                            fill
                            className="object-cover"
                            unoptimized={typeof token.logo === "string"}
                          />
                        ) : (
                          <span className="font-bold text-sm opacity-50">
                            {token.symbol?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span
                          className={`font-bold lg:text-sm ${isSelected ? "" : "opacity-80"}`}
                        >
                          {token.symbol}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-30 truncate max-w-[150px]">
                          {token.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex flex-col items-end leading-tight">
                        {isBalanceLoading ? (
                          <span className="inline-block w-10 h-3 bg-black/10 rounded animate-pulse" />
                        ) : (
                          userBal !== null && userBal > 0 && (
                            <span
                              className={`font-bold text-sm tracking-tight text-black`}
                            >
                              {userBal}
                            </span>
                          )
                        )}

                        {connected && balance?.fetched && userBal !== null && totalUSD > 0 && (
                          <span className="text-[10px] font-bold opacity-40">
                            ≈${totalUSD.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <FaCheckCircle className="text-[18px] text-green-500 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : null}

            {network === "solana" && verifiedTokensData?.length <= 2 && (
              <div className="flex items-center justify-center gap-2 py-2.5 opacity-40 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                <span>{locale === "en" ? "Discovering more tokens..." : "Memuat lebih banyak token..."}</span>
              </div>
            )}

            {filteredTokens.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-40 gap-3">
                <Icon
                  icon="solar:box-minimalistic-linear"
                  className="text-5xl"
                />
                <p className="text-sm font-bold uppercase tracking-widest text-center px-4">
                  {locale === "en"
                    ? "No supported tokens found"
                    : "Tidak ada token yang didukung"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-6 border-t border-black/5 bg-white">
          <div className="flex justify-center w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast
                buttonText={locale === "en" ? "Close" : "Tutup"}
                onClick={() => setIsTokenSelectorOpen(false)}
              />
            </div>
          </div>
        </div>
      </AnimatedModal>

      {/* --- Virtual Account Bank Selection Modal --- */}
      <AnimatedModal
        isOpen={isVaSelectorOpen}
        onClose={() => {
          setIsVaSelectorOpen(false);
          setVaSearchQuery("");
        }}
        maxWidthClass="lg:w-120"
      >
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 max-h-[80vh]">
          {/* Header */}
          <div className="flex flex-col gap-0.5 pb-4">
            <h2 className="text-xl font-bold">
              {locale === "en" ? "Select Virtual Account Bank" : "Pilih Bank Virtual Account"}
            </h2>
            <p className="text-[12px] opacity-70">
              {locale === "en"
                ? "Choose your preferred bank for the Virtual Account."
                : "Pilih bank yang ingin Anda gunakan untuk Virtual Account."}
            </p>
          </div>

          {/* Search Box */}
          <div className="relative group mb-4">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Icon
                icon="solar:magnifer-linear"
                className="text-xl opacity-40 group-focus-within:opacity-100 transition-all"
              />
            </div>
            <input
              type="text"
              placeholder={
                locale === "en" ? "Search bank..." : "Cari nama bank..."
              }
              value={vaSearchQuery}
              onChange={(e) => setVaSearchQuery(e.target.value)}
              className="w-full bg-black/5 border border-black/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-black/50 focus:bg-black/10 transition-all"
            />
          </div>

          {/* List of VAs */}
          <div className="flex flex-col gap-2 pb-2">
            {filteredVaChannels.map((va) => {
              const isSelected = selectedVaChannel === va.code;

              return (
                <button
                  key={va.code}
                  type="button"
                  onClick={() => {
                    setSelectedVaChannel(va.code);
                    setIsVaSelectorOpen(false);
                    setVaSearchQuery("");
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-black/5 border-black/20 shadow-sm ring-1 ring-black/10"
                      : "bg-white/40 border-black/5 hover:border-black/15"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-sm">
                      {va.logo ? (
                        <Image
                          src={va.logo}
                          alt={va.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Icon icon="solar:card-2-bold" className="text-xl text-neutral-700" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-neutral-900">
                        {va.name}
                      </span>
                      <span className="text-xs opacity-50 truncate">
                        {va.detailName}
                      </span>
                      <span className="text-[11px] text-amber-500 font-semibold mt-0.5">
                        +Rp {(((va as any).fee) || 3000).toLocaleString("id-ID")} transfer fee
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Icon
                      icon="solar:check-circle-bold"
                      className="text-xl text-neutral-900 shrink-0"
                    />
                  )}
                </button>
              );
            })}

            {filteredVaChannels.length === 0 && (
              <p className="text-center py-8 text-sm opacity-40">
                {locale === "en" ? "No bank found" : "Bank tidak ditemukan"}
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-6 border-t border-black/5 bg-white">
          <div className="flex justify-center w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast
                buttonText={locale === "en" ? "Close" : "Tutup"}
                onClick={() => {
                  setIsVaSelectorOpen(false);
                  setVaSearchQuery("");
                }}
              />
            </div>
          </div>
        </div>
      </AnimatedModal>

      <InformationPopUp
        isOpen={isMainInfoOpen}
        onClose={() => setIsMainInfoOpen(false)}
        title={
          locale === "en"
            ? `Buy ${selectedToken?.symbol || currencyTicker || "Tokens"}`
            : `Beli ${selectedToken?.symbol || currencyTicker || "Token"}`
        }
        image={networkBanner}
        description={
          locale === "en"
            ? `Purchase ${selectedToken?.symbol || currencyTicker || "tokens"} directly using Indonesian local payment methods like Virtual Accounts (BCA, Mandiri, BRI, BNI, Permata) or QRIS.`
            : `Beli ${selectedToken?.symbol || currencyTicker || "token"} langsung menggunakan metode pembayaran lokal Indonesia seperti Virtual Account (BCA, Mandiri, BRI, BNI, Permata) atau QRIS.`
        }
      />

      {/* Transaction Limit Modal */}
      <AnimatedModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        maxWidthClass="lg:w-105"
      >
        <div className="p-6 flex flex-col gap-4 text-black">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
              <Icon icon="solar:danger-circle-bold" className="text-2xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {locale === "en"
                  ? "Buy Limit Reached"
                  : "Batas Transaksi Beli Tercapai"}
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                {locale === "en"
                  ? "You have reached the maximum limit of 3 active buy orders. Please complete your existing payment or cancel an ongoing transaction in your History to start a new one."
                  : "Anda telah mencapai batas maksimal 3 transaksi beli yang sedang berjalan. Silakan selesaikan pembayaran atau batalkan transaksi yang ada di menu Riwayat untuk membuat transaksi baru."}
              </p>
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 pt-3 border-t border-black/5">
            <button
              onClick={() => setShowLimitModal(false)}
              className="px-4 py-2.5 rounded-xl border border-black/10 text-xs font-semibold hover:bg-black/5 text-neutral-600 transition-colors cursor-pointer"
            >
              {locale === "en" ? "Close" : "Tutup"}
            </button>
            <button
              onClick={() => {
                setShowLimitModal(false);
                router.push(`/${network}/vault/history`);
              }}
              className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              {locale === "en" ? "View Active Orders" : "Lihat Riwayat"}
            </button>
          </div>
        </div>
      </AnimatedModal>
      <hr className="border-none h-37.5" />
    </>
  );
}

export default BuyToken;
