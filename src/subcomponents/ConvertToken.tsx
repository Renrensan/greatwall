"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import Button from "./Button";
import ButtonContrast from "./ButtonContrast";

import { paseo } from "@/index";
import { SupportedChain, useNetwork } from "@/app/network-provider";
import { CONVERT_NETWORK_ORDER, resolveToChain } from "@/components/integrator/ipow/convert-networks";
import { NATIVE, fromUnits, registerTunnel, removeTunnel, saveTunnel, toUnits, tunnelAssets, tunnelMessage, tunnelQuote, type TunnelAssets } from "@/components/integrator/ipow/tunnel";
import { isEvmChain } from "@/components/integrator/ipow/sdk";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import { useHederaWallet } from "@/components/hedera/hedera-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { usePolkadotWallet } from "@/components/polkadot/polkadot-provider";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";

import { BitcoinConnectButton } from "./BitcoinConnectButton";
import { HederaConnectButton } from "./HederaConnectButton";
import { EthereumConnectButton } from "./EthereumConnectButton";
import { SolanaConnectButton } from "./SolanaConnectButton";
import { PolkadotConnectButton } from "./PolkadotConnectButton";
import { BaseConnectButton } from "./BaseConnectButton";
import { RobinhoodConnectButton } from "./RobinhoodConnectButton";
import { HyperliquidConnectButton } from "./HyperliquidConnectButton";
import { IoSwapVertical } from "react-icons/io5";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { AnimatedModal } from "./AnimatedModal";
import { TxPhase, TypeFilter } from "@/components/integrator/ipow/evm/type";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { getAddressErrorMessageKey } from "@/subcomponents/wallet-connect/address-validation";

type Side = "from" | "to";

type Asset = {
  id: string;
  symbol: string;
  name: string;
  chain: SupportedChain;
  decimals: number;
  icon: any;
  native: boolean;
  /** `native`, or the token's address: what the operator trades it as. */
  token: string;
};

const TESTNET_LIMITS: Record<string, { min: number; max: number }> = {
  hedera: { min: 30, max: 100 },
  ethereum: { min: 0.002, max: 0.003 },
  // Within the operator's 2,000 sats a tunnel at its test rates (its
  // /assets): 0.003 ETH is 900 sats, 0.06 SOL is 900 sats, 0.9 HYPE is
  // 1,800 sats. A sell must also pay at least Bitcoin's dust (546 sats):
  // from about 0.002 ETH or 0.04 SOL.
  solana: { min: 0.04, max: 0.06 },
  polkadot: { min: 2, max: 10 },
  base: { min: 0.002, max: 0.003 },
  robinhood: { min: 0.002, max: 0.003 },
  hyperliquid: { min: 0.1, max: 0.9 },
};

export default function ConvertToken() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const t = useTranslations("All");

  const { locale, network } = useParams<{
    locale: string;
    network: SupportedChain;
    section: string;
  }>();

  const bitcoinWallet = useBitcoinWallet();
  const hederaWallet = useHederaWallet();
  const ethereumWallet = useEthereumWallet();
  const solanaWallet = useSolanaWallet();
  const polkadotWallet = usePolkadotWallet();
  const tempoWallet = useTempoWallet();
  const hyperliquidWallet = useHyperliquidWallet();
  const robinhoodWallet = useRobinhoodWallet();
  const baseWallet = useBaseWallet();
  const arbitrumWallet = useArbitrumWallet();

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

  const networkOptions = useMemo(
    () => [
      {
        key: "bitcoin" as SupportedChain,
        name: bitcoinWallet.networkName,
        logo: bitcoinWallet.networkLogo,
        currencyTicker: bitcoinWallet.currencyTicker,
        decimals: bitcoinWallet.decimals,
        networkExplorer: bitcoinWallet.networkExplorer,
        ipowConvert: bitcoinWallet.ipowConvert,
        ipowNetworkId: bitcoinWallet.ipowNetworkId,
        connected: bitcoinWallet.connected,
        price: bitcoinWallet.price,
      },
      {
        key: "hedera" as SupportedChain,
        name: hederaWallet.networkName,
        logo: hederaWallet.networkLogo,
        currencyTicker: hederaWallet.currencyTicker,
        decimals: hederaWallet.decimals,
        networkExplorer: hederaWallet.networkExplorer,
        ipowConvert: hederaWallet.ipowConvert,
        ipowNetworkId: hederaWallet.ipowNetworkId,
        connected: hederaWallet.connected,
        price: hederaWallet.price,
      },
      {
        key: "ethereum" as SupportedChain,
        name: ethereumWallet.networkName,
        logo: ethereumWallet.networkLogo,
        currencyTicker: ethereumWallet.currencyTicker,
        decimals: ethereumWallet.decimals,
        networkExplorer: ethereumWallet.networkExplorer,
        ipowConvert: ethereumWallet.ipowConvert,
        ipowNetworkId: ethereumWallet.ipowNetworkId,
        connected: ethereumWallet.connected,
        price: ethereumWallet.price,
      },
      {
        key: "solana" as SupportedChain,
        name: solanaWallet.networkName,
        logo: solanaWallet.networkLogo,
        currencyTicker: solanaWallet.currencyTicker,
        decimals: solanaWallet.decimals,
        networkExplorer: solanaWallet.networkExplorer,
        ipowConvert: solanaWallet.ipowConvert,
        ipowNetworkId: solanaWallet.ipowNetworkId,
        connected: solanaWallet.connected,
        price: solanaWallet.price,
      },
      {
        key: "polkadot" as SupportedChain,
        name: polkadotWallet.networkName,
        logo: polkadotWallet.networkLogo,
        // The network badge always stays "Polkadot" (logo above). The *token* shown for
        // the asset itself follows whichever chain ipow convert is actually running
        // against right now: DOT/Polkadot on mainnet, PAS/Paseo on testnet (ipow convert
        // only runs on Polkadot Hub's testnet today, so this is "PAS" in practice).
        tokenLogo: polkadotMainnet ? polkadotWallet.networkLogo : paseo,
        tokenName: polkadotMainnet ? polkadotWallet.networkName : "Paseo",
        currencyTicker: polkadotWallet.currencyTicker,
        decimals: polkadotWallet.decimals,
        networkExplorer: polkadotWallet.networkExplorer,
        ipowConvert: polkadotWallet.ipowConvert,
        ipowNetworkId: polkadotWallet.ipowNetworkId,
        connected: polkadotWallet.connected,
        price: polkadotWallet.price,
      },
      {
        key: "tempo" as SupportedChain,
        name: tempoWallet.networkName,
        logo: tempoWallet.networkLogo,
        currencyTicker: tempoWallet.currencyTicker,
        decimals: tempoWallet.decimals,
        networkExplorer: tempoWallet.networkExplorer,
        ipowConvert: tempoWallet.ipowConvert,
        ipowNetworkId: tempoWallet.ipowNetworkId,
        connected: tempoWallet.connected,
        price: tempoWallet.price,
      },
      {
        key: "hyperliquid" as SupportedChain,
        name: hyperliquidWallet.networkName,
        logo: hyperliquidWallet.networkLogo,
        currencyTicker: hyperliquidWallet.currencyTicker,
        decimals: hyperliquidWallet.decimals,
        networkExplorer: hyperliquidWallet.networkExplorer,
        ipowConvert: hyperliquidWallet.ipowConvert,
        ipowNetworkId: hyperliquidWallet.ipowNetworkId,
        connected: hyperliquidWallet.connected,
        price: hyperliquidWallet.price,
      },
      {
        key: "robinhood" as SupportedChain,
        name: robinhoodWallet.networkName,
        logo: robinhoodWallet.networkLogo,
        currencyTicker: robinhoodWallet.currencyTicker,
        decimals: robinhoodWallet.decimals,
        networkExplorer: robinhoodWallet.networkExplorer,
        ipowConvert: robinhoodWallet.ipowConvert,
        ipowNetworkId: robinhoodWallet.ipowNetworkId,
        connected: robinhoodWallet.connected,
        price: robinhoodWallet.price,
      },
      {
        key: "base" as SupportedChain,
        name: baseWallet.networkName,
        logo: baseWallet.networkLogo,
        currencyTicker: baseWallet.currencyTicker,
        decimals: baseWallet.decimals,
        networkExplorer: baseWallet.networkExplorer,
        ipowConvert: baseWallet.ipowConvert,
        ipowNetworkId: baseWallet.ipowNetworkId,
        connected: baseWallet.connected,
        price: baseWallet.price,
      },
      {
        key: "arbitrum" as SupportedChain,
        name: arbitrumWallet.networkName,
        logo: arbitrumWallet.networkLogo,
        currencyTicker: arbitrumWallet.currencyTicker,
        decimals: arbitrumWallet.decimals,
        networkExplorer: arbitrumWallet.networkExplorer,
        ipowConvert: arbitrumWallet.ipowConvert,
        ipowNetworkId: arbitrumWallet.ipowNetworkId,
        connected: arbitrumWallet.connected,
        price: arbitrumWallet.price,
      },
    ],
    [bitcoinWallet, hederaWallet, ethereumWallet, solanaWallet, polkadotWallet, tempoWallet, hyperliquidWallet, robinhoodWallet, baseWallet, arbitrumWallet],
  );

  /** The wallet of a network that converts, with the convert methods. */
  const walletOf = (chain: string): any => {
    if (chain === "hedera") return hederaWallet;
    if (chain === "ethereum") return ethereumWallet;
    if (chain === "solana") return solanaWallet;
    if (chain === "polkadot") return polkadotWallet;
    if (chain === "base") return baseWallet;
    if (chain === "robinhood") return robinhoodWallet;
    if (chain === "hyperliquid") return hyperliquidWallet;
    return null;
  };

  const getNativeAsset = (chain: SupportedChain): Asset => {
    const tokenInfo = networkOptions.find((n) => n.key === chain)!;
    const name = (tokenInfo as any)?.tokenName ?? tokenInfo?.name;
    const symbol = tokenInfo?.currencyTicker;
    const icon = (tokenInfo as any)?.tokenLogo ?? tokenInfo?.logo;
    const decimals = tokenInfo?.decimals;
    return { id: symbol, symbol, name, chain, decimals, icon, native: true, token: NATIVE };
  };

  // What the operator trades on each network (its tunnel API's assets): the
  // coin, and the test RWA tokens, with its prices.
  const [operatorAssets, setOperatorAssets] = useState<TunnelAssets>({ byChain: {}, maxSats: BigInt(0) });
  useEffect(() => {
    let active = true;
    tunnelAssets().then((a) => active && setOperatorAssets(a));
    return () => {
      active = false;
    };
  }, []);

  const getAssetsForChain = (chain: SupportedChain): Asset[] => [
    getNativeAsset(chain),
    ...(operatorAssets.byChain[chain] ?? [])
      .filter((a) => a.token !== NATIVE)
      .map((a) => ({ id: a.symbol, symbol: a.symbol, name: `${a.symbol} (test RWA)`, chain, decimals: a.decimals, icon: null, native: false, token: a.token })),
  ];

  /** The picked token on each side; the coin by default, and again when the
   *  network changes. */
  const [fromToken, setFromToken] = useState(NATIVE);
  const [toToken, setToToken] = useState(NATIVE);

  const buildSearchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null) next.delete(k);
      else next.set(k, v);
    });
    return next;
  };

  const replaceUrl = (
    nextSearchParams: URLSearchParams,
    nextPathname: string = pathname,
  ) => {
    const qs = nextSearchParams.toString();
    router.replace(qs ? `${nextPathname}?${qs}` : nextPathname, {
      scroll: false,
    });
  };

  const replaceNetworkSegment = (chain: SupportedChain) => {
    const segments = pathname.split("/");
    if (segments.length >= 3) segments[2] = chain;
    return segments.join("/");
  };

  const fromChain = network;
  const rawTo = searchParams.get("to");

  const toChain: SupportedChain = useMemo(
    () => resolveToChain(fromChain, rawTo),
    [rawTo, fromChain],
  );

  const fromChainConnected = useMemo(() => {
    return networkOptions.find((n) => n.key === fromChain)?.connected ?? false;
  }, [networkOptions, fromChain]);

  const toChainConnected = useMemo(() => {
    return networkOptions.find((n) => n.key === toChain)?.connected ?? false;
  }, [networkOptions, toChain]);

  const [manualAddress, setManualAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [isAddressValid, setIsAddressValid] = useState(false);

  useEffect(() => {
    if (toChainConnected) {
      setAddressError("");
      setIsAddressValid(true);
      return;
    }

    if (fromChain === "bitcoin") {
      setAddressError("");
      setIsAddressValid(false);
      return;
    }

    const trimmed = manualAddress.trim();
    if (trimmed === "") {
      setAddressError("");
      setIsAddressValid(false);
      return;
    }

    const provider = {
      bitcoin: bitcoinWallet,
      ethereum: ethereumWallet,
      solana: solanaWallet,
      hedera: hederaWallet,
      polkadot: polkadotWallet,
    }[toChain as "bitcoin" | "ethereum" | "solana" | "hedera" | "polkadot"];

    const result = provider?.checkAddress(trimmed) ?? { valid: false, reason: "invalid" as const };
    setIsAddressValid(result.valid);
    setAddressError(result.valid ? "" : t(getAddressErrorMessageKey(toChain as "bitcoin" | "ethereum" | "solana" | "hedera" | "polkadot", result.reason)));
  }, [manualAddress, toChain, toChainConnected, fromChain, t, bitcoinWallet, ethereumWallet, solanaWallet, hederaWallet, polkadotWallet]);

  const getBitcoinScript = (address: string) => {
    try {
      return bitcoinWallet.addressToScriptPubKeyHex(address);
    } catch {
      return null;
    }
  };

  const derivedDestScriptPubKey = useMemo(() => {
    if (toChain !== "bitcoin") return null;
    if (bitcoinWallet.connected && bitcoinWallet.address)
      return getBitcoinScript(bitcoinWallet.address);
    if (manualAddress.trim()) return getBitcoinScript(manualAddress.trim());
    return null;
  }, [toChain, bitcoinWallet.connected, bitcoinWallet.address, manualAddress]);

  const derivedSourceScriptPubKey = useMemo(() => {
    if (fromChain !== "bitcoin") return null;
    if (bitcoinWallet.connected && bitcoinWallet.address)
      return getBitcoinScript(bitcoinWallet.address);
    return null;
  }, [fromChain, bitcoinWallet.connected, bitcoinWallet.address]);

  const isToSideValid = useMemo(() => {
    if (toChainConnected) return true;

    if (fromChain === "bitcoin") return false;

    return isAddressValid && manualAddress.length > 0;
  }, [toChainConnected, isAddressValid, manualAddress, fromChain]);

  const isFromSideValid = useMemo(() => {
    if (fromChain === "bitcoin")
      return bitcoinWallet.connected && !!derivedSourceScriptPubKey;
    return fromChainConnected;
  }, [
    fromChain,
    bitcoinWallet.connected,
    derivedSourceScriptPubKey,
    fromChainConnected,
  ]);

  useEffect(() => {
    const allKeys = networkOptions.map((n) => n.key);
    if (
      !rawTo ||
      !allKeys.includes(rawTo as SupportedChain) ||
      rawTo === fromChain
    ) {
      const fallback = allKeys.find((c) => c !== fromChain)!;
      const next = new URLSearchParams(searchParams.toString());
      next.set("to", fallback);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    }
  }, [rawTo, fromChain, networkOptions, pathname, searchParams, router]);

  const fromAsset = useMemo(
    () => getAssetsForChain(fromChain).find((a) => a.token === fromToken) ?? getNativeAsset(fromChain),
    [fromChain, fromToken, networkOptions, operatorAssets],
  );
  const toAsset = useMemo(
    () => getAssetsForChain(toChain).find((a) => a.token === toToken) ?? getNativeAsset(toChain),
    [toChain, toToken, networkOptions, operatorAssets],
  );
  useEffect(() => setFromToken(NATIVE), [fromChain]);
  useEffect(() => setToToken(NATIVE), [toChain]);

  const [fromAmount, setFromAmount] = useState(
    searchParams.get("amount") || "",
  );
  const [toAmount, setToAmount] = useState("");

  const fromPrice = useMemo(() => {
    const option = networkOptions.find((n) => n.key === fromChain);
    return (option?.price as any)?.usd ?? 0;
  }, [fromChain, networkOptions]);

  const toPrice = useMemo(() => {
    const option = networkOptions.find((n) => n.key === toChain);
    return (option?.price as any)?.usd ?? 0;
  }, [toChain, networkOptions]);

  const fromUsdValue = useMemo(() => {
    const amt = Number(fromAmount);
    if (!fromAmount || isNaN(amt)) return "0.00";
    return (amt * fromPrice).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [fromAmount, fromPrice]);

  const toUsdValue = useMemo(() => {
    const amt = Number(toAmount.replace(/,/g, ""));
    if (!toAmount || isNaN(amt)) return "0.00";
    return (amt * toPrice).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [toAmount, toPrice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentParams = new URLSearchParams(searchParams.toString());
      const urlAmount = currentParams.get("amount") || "";

      if (fromAmount !== urlAmount) {
        if (fromAmount) {
          currentParams.set("amount", fromAmount);
        } else {
          currentParams.delete("amount");
        }
        router.replace(`${pathname}?${currentParams.toString()}`, {
          scroll: false,
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [fromAmount, pathname, router, searchParams]);

  const getIsMainnet = (chain: SupportedChain) => {
    if (chain === "bitcoin") return bitcoinMainnet;
    if (chain === "hedera") return hederaMainnet;
    if (chain === "ethereum") return ethereumMainnet;
    if (chain === "solana") return solanaMainnet;
    if (chain === "polkadot") return polkadotMainnet;
    return false;
  };

  // Into SOL waits for the user's own payment proof on Solana
  // (solanaConvertMethods.ts).
  const intoSolana = toChain === "solana";

  const isSupportedRoute = useMemo(() => {
    if (fromChain === toChain) return false;
    if (toChain === "solana") return false;

    const fromConfig = networkOptions.find((n) => n.key === fromChain);
    const toConfig = networkOptions.find((n) => n.key === toChain);

    if (!fromConfig || fromConfig.ipowConvert === "comingsoon") return false;
    if (!toConfig || toConfig.ipowConvert === "comingsoon") return false;

    const fromMatch =
      getIsMainnet(fromChain) === (fromConfig.ipowConvert === "mainnet");
    const pathMatch =
      getIsMainnet(toChain) === (toConfig.ipowConvert === "mainnet");

    return fromMatch && pathMatch;
  }, [
    fromChain,
    toChain,
    networkOptions,
    bitcoinMainnet,
    hederaMainnet,
    ethereumMainnet,
    solanaMainnet,
    polkadotMainnet,
  ]);


  /** A token's limits at the operator's price: from Bitcoin's dust (546
   *  sats, with room) to the cap, the operator's per tunnel, or
   *  Conversion's (100,000 sats) for a swap against BTC. */
  const tokenLimit = (rate: bigint, tunnel: boolean) => {
    const r = Number(rate);
    if (!r) return { min: 0, max: Infinity };
    const cap = tunnel ? Number(operatorAssets.maxSats || BigInt(100_000)) : 100_000;
    return { min: Math.ceil((600 / r) * 1e6) / 1e6, max: Math.floor((cap / r) * 1e6) / 1e6 };
  };

  const currentLimit = useMemo(() => {
    const isMainnetMode = getIsMainnet(fromChain);
    if (isMainnetMode) return { min: 0, max: Infinity };
    if (fromToken !== NATIVE) {
      const a = operatorAssets.byChain[fromChain]?.find((x) => x.token === fromToken);
      if (a) return tokenLimit(a.paySats, toChain !== "bitcoin");
    }

    return TESTNET_LIMITS[fromChain] || { min: 0, max: Infinity };
  }, [
    fromToken,
    operatorAssets,
    fromChain,
    bitcoinMainnet,
    hederaMainnet,
    ethereumMainnet,
    solanaMainnet,
    polkadotMainnet,
  ]);

  const destLimit = useMemo(() => {
    if (toToken !== NATIVE && !getIsMainnet(toChain)) {
      const a = operatorAssets.byChain[toChain]?.find((x) => x.token === toToken);
      if (a) return tokenLimit(a.askSats, fromChain !== "bitcoin");
    }
    const isMainnetMode = getIsMainnet(toChain);
    if (isMainnetMode) return { min: 0, max: Infinity };

    const limits = TESTNET_LIMITS[toChain] ?? { min: 0, max: Infinity };

    return {
      min: limits.min * 1.05,
      max: limits.max * 0.95,
    };
  }, [
    toToken,
    operatorAssets,toChain, bitcoinMainnet, hederaMainnet, ethereumMainnet, solanaMainnet, polkadotMainnet]);

  const canConvert = useMemo(() => {
    if (!isSupportedRoute) return false;
    if (!isFromSideValid) return false;
    if (!isToSideValid) return false;

    const amountVal = Number(fromAmount);
    if (!fromAmount || amountVal <= 0) return false;

    if (fromChain !== "bitcoin") {
      if (amountVal < currentLimit.min || amountVal > currentLimit.max)
        return false;
    } else {
      const destAmountVal = Number(toAmount.replace(/,/g, ""));
      if (!toAmount || destAmountVal === 0) return false;
      if (destAmountVal < destLimit.min || destAmountVal > destLimit.max)
        return false;
    }

    if (toChain === "bitcoin" && !toChainConnected && !derivedDestScriptPubKey)
      return false;
    // Between two networks: the coin goes to the destination's own wallet,
    // and the user signs the sell with the source's.
    if (fromChain !== "bitcoin" && toChain !== "bitcoin" && !toChainConnected)
      return false;
    return true;
  }, [
    isSupportedRoute,
    isFromSideValid,
    isToSideValid,
    fromAmount,
    toAmount,
    currentLimit,
    destLimit,
    fromChain,
    toChain,
    toChainConnected,
    derivedDestScriptPubKey,
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  /** Why the last conversion failed, shown in the error modal. */
  const [convertError, setConvertError] = useState<string | null>(null);

  const mismatches = useMemo(() => {
    const checks = [
      {
        name: bitcoinWallet.networkName,
        current: bitcoinMainnet,
        required: bitcoinWallet.ipowConvert,
        setter: setBitcoinMainnet,
      },
      {
        name: hederaWallet.networkName,
        current: hederaMainnet,
        required: hederaWallet.ipowConvert,
        setter: setHederaMainnet,
      },
      {
        name: ethereumWallet.networkName,
        current: ethereumMainnet,
        required: ethereumWallet.ipowConvert,
        setter: setEthereumMainnet,
      },
      {
        name: solanaWallet.networkName,
        current: solanaMainnet,
        required: solanaWallet.ipowConvert,
        setter: setSolanaMainnet,
      },
      {
        name: polkadotWallet.networkName,
        current: polkadotMainnet,
        required: polkadotWallet.ipowConvert,
        setter: setPolkadotMainnet,
      },
    ];

    return checks.filter((c) => {
      if (c.required === "comingsoon") return false;
      const isRequiredMainnet = c.required === "mainnet";
      return c.current !== isRequiredMainnet;
    });
  }, [
    bitcoinMainnet,
    hederaMainnet,
    ethereumMainnet,
    solanaMainnet,
    polkadotMainnet,
    bitcoinWallet,
    hederaWallet,
    ethereumWallet,
    solanaWallet,
    polkadotWallet,
    setBitcoinMainnet,
    setHederaMainnet,
    setEthereumMainnet,
    setSolanaMainnet,
    setPolkadotMainnet,
  ]);

  const isAllFulfilled = mismatches.length === 0;

  const dynamicMismatchText = useMemo(() => {
    if (mismatches.length === 0) return "";
    const phrases = mismatches.map((m) => `${m.required} wallet in ${m.name}`);

    if (phrases.length === 1)
      return locale == "en"
        ? `Please select ${phrases[0]} in the wallet settings to use Convert.`
        : `Mohon pilih wallet ${phrases[0]} di pengaturan wallet untuk menggunakan Konversi`;
    if (phrases.length === 2)
      return locale == "en"
        ? `Please select ${phrases[0]} and ${phrases[1]} in the wallet settings to use Convert.`
        : `Mohon pilih wallet ${phrases[0]} dan ${phrases[1]} di pengaturan wallet untuk menggunakan Konversi`;

    const lastPhrase = phrases.pop();
    return locale == "en"
      ? `Please select ${phrases.join(", ")}, and ${lastPhrase} in the wallet settings to use Convert.`
      : `Mohon pilih wallet  ${phrases.join(", ")}, dan ${lastPhrase} di pengaturan wallet untuk  untuk menggunakan Konversi`;
  }, [mismatches, locale]);

  const handleSwitchAll = () => {
    mismatches.forEach((m) => m.setter(m.required === "mainnet"));
  };

  const isComingSoon = useMemo(() => {
    const fromConfig = networkOptions.find((n) => n.key === fromChain);
    const toConfig = networkOptions.find((n) => n.key === toChain);
    return (
      intoSolana ||
      fromConfig?.ipowConvert === "comingsoon" ||
      toConfig?.ipowConvert === "comingsoon"
    );
  }, [fromChain, toChain, networkOptions, intoSolana]);

  const buttonText = useMemo(() => {
    if (isComingSoon) return "Coming Soon";
    if (isProcessing) return t("text10");
    return t("text25");
  }, [isComingSoon, isProcessing, t]);

  const isDisable = useMemo(() => {
    if (isComingSoon || isProcessing || !isAllFulfilled) return true;
    return !canConvert;
  }, [isComingSoon, isProcessing, isAllFulfilled, canConvert]);

  const [chainModalOpen, setChainModalOpen] = useState(false);
  const [chainModalSide, setChainModalSide] = useState<Side>("from");
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [tokenModalSide, setTokenModalSide] = useState<Side>("from");


  useEffect(() => {
    let isActive = true;
    let timerId: NodeJS.Timeout;

    const run = async () => {
      if (!isSupportedRoute) {
        if (isActive) setToAmount("");
        return;
      }

      const amt = Number(fromAmount);

      if (!fromAmount || !Number.isFinite(amt) || amt <= 0) {
        if (isActive) setToAmount("");
        return;
      }

      if (
        fromChain !== "bitcoin" &&
        (amt < currentLimit.min || amt > currentLimit.max)
      ) {
        if (isActive) setToAmount("");
        return;
      }


      const getWallet = (chain: string) => walletOf(chain);

      try {
        if (fromChain === "bitcoin") {
          const targetWallet = getWallet(toChain);
          const sats = Math.floor(amt * 10 ** bitcoinWallet.decimals);
          const out = await targetWallet?.estimateNativeFromBitcoin(
            sats.toString(),
            toToken,
          );

          if (isActive) {
            const outNum = Number(out ?? "0");
            const fracDigits =
              toChain === "solana" ? 6 : toChain === "ethereum" ? 6 : 4;
            setToAmount(
              outNum.toLocaleString(undefined, {
                maximumFractionDigits: fracDigits,
              }),
            );
          }
        } else if (toChain === "bitcoin") {
          const sourceWallet = getWallet(fromChain);
          const sats = await sourceWallet?.estimateBitcoinFromNative(amt, fromToken);

          if (isActive) {
            const n = Number(sats?.toString() ?? "0");
            setToAmount(
              (n / 10 ** bitcoinWallet.decimals).toLocaleString(undefined, {
                maximumFractionDigits: 8,
              }),
            );
          }
        } else {
          // Between two networks: the operator's own quote, which it honours
          // when it opens the tunnel.
          const q = await tunnelQuote(
            fromChain,
            fromToken,
            toUnits(fromAmount, fromAsset.decimals),
            toChain,
            toToken,
          );

          if (q.sats > BigInt(0)) {
            if (isActive) {
              const outNum = fromUnits(q.amountOut, toAsset.decimals);
              const fracDigits =
                toChain === "solana" ? 6 : toChain === "ethereum" ? 6 : 4;
              setToAmount(
                outNum.toLocaleString(undefined, {
                  maximumFractionDigits: fracDigits,
                }),
              );
            }
          }
        }
      } catch (e) {
        console.error("Estimation Error:", e);
        if (isActive) setToAmount("");
      }
    };

    timerId = setTimeout(run, 500);

    return () => {
      isActive = false;
      clearTimeout(timerId);
    };
  }, [
    fromAmount,
    fromChain,
    toChain,
    fromToken,
    toToken,
    isSupportedRoute,
    currentLimit,
    hederaWallet,
    ethereumWallet,
    solanaWallet,
    polkadotWallet,
    baseWallet,
    robinhoodWallet,
    hyperliquidWallet,
    bitcoinWallet.decimals,
  ]);

  const openChainPicker = (side: Side) => {
    setChainModalSide(side);
    setChainModalOpen(true);
    setTokenModalOpen(false);
  };

  const openTokenPicker = (side: Side) => {
    setTokenModalSide(side);
    setTokenModalOpen(true);
    setChainModalOpen(false);
  };

  const pickChain = (chain: SupportedChain) => {
    setShowErrorModal(false);
    if (chainModalSide === "from") {
      const nextPath = replaceNetworkSegment(chain);
      if (chain === toChain) {
        const fallback = chain === "bitcoin" ? "hedera" : "bitcoin";
        const next = buildSearchParams({ to: fallback });
        replaceUrl(next, nextPath);
      } else {
        replaceUrl(new URLSearchParams(searchParams.toString()), nextPath);
      }
      setChainModalOpen(false);
      return;
    }
    setToAmount("");
    setManualAddress("");
    setAddressError("");
    const next = buildSearchParams({ to: chain });
    replaceUrl(next);
    setChainModalOpen(false);
  };

  const pickToken = (asset: Asset) => {
    if (tokenModalSide === "from") setFromToken(asset.token);
    else setToToken(asset.token);
    setToAmount("");
    setTokenModalOpen(false);
  };

  // The test RWA tokens' faucet, from the picker.
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);
  const [faucetBusy, setFaucetBusy] = useState(false);
  const claimFaucet = async (asset: Asset) => {
    setFaucetBusy(true);
    setFaucetMsg(null);
    try {
      const w = walletOf(asset.chain);
      if (!w?.connected) throw new Error(`Connect your ${asset.chain} wallet first`);
      await w.faucet(asset.token);
      setFaucetMsg(`${asset.symbol} sent to your wallet`);
    } catch (e: any) {
      setFaucetMsg(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setFaucetBusy(false);
    }
  };

  const swap = () => {
    const next = new URLSearchParams(searchParams.toString());

    next.set("to", fromChain);
    const nextAmount = toAmount.replace(/,/g, "");

    if (nextAmount && nextAmount !== "0") {
      next.set("amount", nextAmount);
    } else {
      next.delete("amount");
    }

    router.replace(replaceNetworkSegment(toChain) + "?" + next.toString(), {
      scroll: false,
    });

    setFromAmount(nextAmount);
    setToAmount("");
    setManualAddress("");
  };

  const handleConvert = async () => {
    if (!isSupportedRoute) return;

    try {
      setIsProcessing(true);
      setShowErrorModal(false);

      const isDirectToBitcoin = toChain === "bitcoin";
      // The network the swap is made on: the one that is not Bitcoin. A
      // route between two networks starts with a swap on the first.
      const activeNativeChain = fromChain === "bitcoin" ? toChain : fromChain;
      const statusWallet = walletOf(activeNativeChain);

      let idsBefore: any[] = [];
      try {
        idsBefore =
          (await statusWallet?.getMyTxIds(TxPhase.NONE, TypeFilter.ANY)) || [];
      } catch (e) {
        console.warn("Snapshot failed, assuming 0", e);
      }
      const known = new Set(idsBefore.map((id: any) => id.toString()));

      let txHash = null;
      const amountArg = Number(fromAmount);
      const destAmountNumber = Number(toAmount.replace(/,/g, ""));

      if (fromChain === "bitcoin") {
        if (!derivedSourceScriptPubKey)
          throw new Error("Bitcoin wallet not connected or invalid");

        const sats = Math.floor(
          amountArg * 10 ** bitcoinWallet.decimals,
        ).toString();
        // A buy pays at most the network's Conversion.maxSats.
        const max = await walletOf(toChain)?.maxSats?.();
        if (max && BigInt(sats) > max) throw new Error(`At most ${max} sats per conversion to ${toChain}`);
        txHash = await walletOf(toChain)?.commitBitcoinToNative(
          sats,
          destAmountNumber,
          derivedSourceScriptPubKey,
          toToken,
        );
      } else if (isDirectToBitcoin) {
        txHash = await statusWallet?.commitNativeToBitcoin(
          derivedDestScriptPubKey!,
          amountArg,
          Math.floor(destAmountNumber * 1e8),
          undefined,
          fromToken,
        );
      } else {
        // A tunnel: the user opens the buy on the destination at the
        // operator's quote, paying its job fees, and the operator is told
        // of it. Once the operator locks the coin there, the user signs the
        // sell on this network, on the buy's page.
        const destination = walletOf(toChain);
        const recipient = destination?.address;
        if (!recipient) throw new Error(`Connect your ${toChain} wallet: the coin goes to it`);
        const amountIn = toUnits(fromAmount, fromAsset.decimals);
        const q = await tunnelQuote(fromChain, fromToken, amountIn, toChain, toToken);
        const max = await destination?.maxSats?.();
        if (max && q.sats > max) throw new Error(`At most ${max} sats per conversion to ${toChain}`);
        const buyId: bigint = await destination.tunnelBuy({ token: toToken, amount: q.amountOut, sats: q.sats });
        saveTunnel({
          fromChain,
          fromToken,
          fromSymbol: fromAsset.symbol,
          fromDecimals: fromAsset.decimals,
          sender: walletOf(fromChain)?.address ?? null,
          toChain,
          token: toToken,
          toSymbol: toAsset.symbol,
          toDecimals: toAsset.decimals,
          buyId: buyId.toString(),
          amountIn: amountIn.toString(),
          sats: q.sats.toString(),
          amountOut: q.amountOut.toString(),
          recipient,
        });
        try {
          // Signed by the wallet that opened the buy: its owner sets the terms.
          const terms = { to: toChain, buyId, from: fromChain, fromToken, amountIn };
          const signature: string = await destination.signTunnel(tunnelMessage(terms));
          await registerTunnel({ ...terms, signature });
        } catch (e: any) {
          // Without the operator's word it is an ordinary buy of the coin
          // for BTC, which the operator may still take and fund: the user
          // then pays it in BTC, or lets it end by its own rules.
          removeTunnel(toChain, buyId.toString());
          throw new Error(`Your buy ${buyId} on ${toChain} is open, but the operator did not take it as a tunnel: ${e?.message ?? e}. It is now an ordinary buy of ${toAsset.symbol} for BTC: see it in your ${toChain} history.`);
        }
        router.push(`/${locale}/${toChain}/convert/transaction/${buyId}?linked=${fromChain}`);
        setFromAmount("");
        setToAmount("");
        setManualAddress("");
        return;
      }

      if (!txHash) {
        setIsProcessing(false);
        return;
      }

      // The swap the transaction made: named by it, or else the one that is
      // new in the list.
      let newIdFound: string | null = (await statusWallet?.swapMadeBy?.(txHash).catch(() => null))?.toString() ?? null;
      let attempts = 0;
      const MAX_ATTEMPTS = 40;

      while (!newIdFound && attempts < MAX_ATTEMPTS) {
        attempts++;
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const currentIds =
            (await statusWallet?.getMyTxIds(TxPhase.NONE, TypeFilter.ANY)) ||
            [];
          const newlyAddedIds = currentIds.map((id: any) => id.toString()).filter((id: string) => !known.has(id));

          if (newlyAddedIds.length > 0) {
            newIdFound = newlyAddedIds.reduce(
              (max: string, curr: string) =>
                Number(curr) > Number(max) ? curr : max,
              newlyAddedIds[0],
            );
            break;
          }
        } catch (e) {}
      }

      if (newIdFound) {
        router.push(
          `/${locale}/${network}/convert/transaction/${newIdFound}?linked=${toChain}`,
        );
      }

      setFromAmount("");
      setToAmount("");
      setManualAddress("");
    } catch (e: any) {
      console.error(e);
      setConvertError(e?.shortMessage ?? e?.reason ?? e?.message ?? String(e));
      setShowErrorModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const amountNumber = Number(fromAmount);
  const destAmountNumber = Number(toAmount.replace(/,/g, ""));

  return (
    <>
      {!isAllFulfilled && (
        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-pulse">
          <div className="flex items-start gap-3">
            <Icon
              icon="solar:danger-triangle-bold"
              className="text-red-500 text-xl shrink-0 mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-bold text-red-500 uppercase tracking-widest">
                {t("text26")}
              </p>
              <p className="text-[11px] font-bold leading-relaxed">
                {dynamicMismatchText}
              </p>
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
      <div className="relative flex p-4 flex-col gap-6 mt-4 rounded-2xl border-white/30  shadow  border  bg-white/50">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none blur-sm" />
        {/* ================= FROM ================= */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <p>Deposit</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center">
              <p className="text-[8px] md:text-xs">{t("text194")}:</p>
              <div className="w-0.5" />
              {fromChain === "bitcoin" ? (
                <BitcoinConnectButton />
              ) : fromChain === "hedera" ? (
                <HederaConnectButton />
              ) : fromChain === "ethereum" ? (
                <EthereumConnectButton />
              ) : fromChain === "solana" ? (
                <SolanaConnectButton />
              ) : fromChain === "polkadot" ? (
                <PolkadotConnectButton />
              ) : fromChain === "base" ? (
                <BaseConnectButton />
              ) : fromChain === "robinhood" ? (
                <RobinhoodConnectButton />
              ) : fromChain === "hyperliquid" ? (
                <HyperliquidConnectButton />
              ) : null}
            </div>

            <div className="justify-start flex items-center">
              <p className="text-[8px] md:text-xs">
                {locale == "en"
                  ? `On ${networkOptions.find((a) => a.key === fromChain)?.name} Network`
                  : `Di Jaringan ${networkOptions.find((a) => a.key === fromChain)?.name}`}
              </p>
              <div className="w-1" />
              <button
                onClick={() => openChainPicker("from")}
                className={`p-2 cursor-pointer shadow-buttonNav hover:bg-black/10 rounded-full glass-card text-base`}
              >
                <Image
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                  src={networkOptions.find((a) => a.key === fromChain)?.logo!}
                  alt={fromChain}
                />
              </button>
            </div>
          </div>

          <div className="h-2" />

          <div className="glass-card rounded-2xl">
            <div className="py-4 px-4 md:py-6 md:px-6 flex flex-col gap-2 md:gap-3">
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex flex-col flex-1 min-w-0">
                  <input
                    key={fromChain}
                    type="text"
                    inputMode="decimal"
                    className={`w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none border-none truncate ${
                      ""
                    }`}
                    placeholder="0"
                    value={fromAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-9]*\.?[0-9]*$/.test(val) || val === "")
                        setFromAmount(val);
                    }}
                  />

                  <span className="text-xs sm:text-sm opacity-60">
                    ≈ ${fromUsdValue}
                  </span>

                  {/* --- Standard static limits (when not BTC) --- */}
                  {fromChain !== "bitcoin" &&
                    amountNumber > 0 &&
                    amountNumber < currentLimit.min && (
                      <span className="text-[10px] text-red-500 mt-1 font-medium block">
                        {locale === "en"
                          ? `Min limit: ${currentLimit.min} ${fromAsset?.symbol}`
                          : `Limit Min: ${currentLimit.min} ${fromAsset?.symbol}`}
                      </span>
                    )}
                  {fromChain !== "bitcoin" &&
                    amountNumber > currentLimit.max && (
                      <span className="text-[10px] text-red-500 mt-1 font-medium block">
                        {locale === "en"
                          ? `Max limit: ${currentLimit.max} ${fromAsset?.symbol}`
                          : `Limit Max: ${currentLimit.max} ${fromAsset?.symbol}`}
                      </span>
                    )}

                  {/* --- Dynamic destination limit (when BTC is source) --- */}
                  {fromChain === "bitcoin" &&
                    destAmountNumber > 0 &&
                    destAmountNumber < destLimit.min && (
                      <span className="text-[10px] text-red-500 mt-1 font-medium block">
                        {locale === "en"
                          ? `Min limit: ${Number((destLimit.min * (amountNumber / destAmountNumber)).toFixed(8))} ${fromAsset?.symbol}`
                          : `Limit Min: ${Number((destLimit.min * (amountNumber / destAmountNumber)).toFixed(8))} ${fromAsset?.symbol}`}
                      </span>
                    )}
                  {fromChain === "bitcoin" &&
                    destAmountNumber > destLimit.max && (
                      <span className="text-[10px] text-red-500 mt-1 font-medium block">
                        {locale === "en"
                          ? `Max limit: ${Number((destLimit.max * (amountNumber / destAmountNumber)).toFixed(8))} ${fromAsset?.symbol}`
                          : `Limit Max: ${Number((destLimit.max * (amountNumber / destAmountNumber)).toFixed(8))} ${fromAsset?.symbol}`}
                      </span>
                    )}
                </div>

                {/* Token Picker Button */}
                <button
                  type="button"
                  onClick={() => openTokenPicker("from")}
                  className={`hover:bg-black/10 shrink-0 flex glass-card pr-2 rounded-full items-center gap-2 text-left cursor-pointer hover:opacity-90 transition-all`}
                >
                  {fromAsset?.icon ? (
                    <Image
                      src={fromAsset.icon}
                      alt={fromAsset.symbol}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary/10" />
                  )}
                  <div className="leading-tight">
                    <div className="flex items-center gap-0.5 md:gap-1">
                      <p className="text-base sm:text-lg font-bold">
                        {fromAsset!.symbol}
                      </p>
                      <Icon
                        icon="lsicon:down-filled"
                        className="text-xs sm:text-base"
                      />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= SWAP ================= */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={swap}
            className="bgRound glass-card cursor-pointer md:h-[50] md:w-[50] h-[40] w-[40] px-3 py-3 flex items-center justify-center hover:bg-secondary/10"
          >
            <IoSwapVertical />
          </button>
        </div>

        {/* ================= TO ================= */}
        <div className="md:mt-[-60] mt-[-20]">
          <div className="flex items-center justify-between gap-3">
            <p>{t("text195")}</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center">
              <p className="text-[8px] md:text-xs">{t("text194")}:</p>
              <div className="w-0.5" />
              {toChain === "bitcoin" ? (
                <BitcoinConnectButton />
              ) : toChain === "hedera" ? (
                <HederaConnectButton />
              ) : toChain === "ethereum" ? (
                <EthereumConnectButton />
              ) : toChain === "solana" ? (
                <SolanaConnectButton />
              ) : toChain === "polkadot" ? (
                <PolkadotConnectButton />
              ) : toChain === "base" ? (
                <BaseConnectButton />
              ) : toChain === "robinhood" ? (
                <RobinhoodConnectButton />
              ) : toChain === "hyperliquid" ? (
                <HyperliquidConnectButton />
              ) : null}
            </div>

            <div className="justify-start flex items-center">
              <p className="text-[8px] md:text-xs">
                {locale == "en"
                  ? `On ${networkOptions.find((a) => a.key === toChain)?.name} Network`
                  : `Di Jaringan ${networkOptions.find((a) => a.key === toChain)?.name}`}
              </p>
              <div className="w-1" />
              <button
                onClick={() => openChainPicker("to")}
                key={toChain}
                className={`p-2 cursor-pointer shadow-buttonNav hover:bg-black/10 rounded-full glass-card text-base`}
              >
                <Image
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                  src={networkOptions.find((a) => a.key === toChain)?.logo!}
                  alt={toChain}
                />
              </button>
            </div>
          </div>

          <div className="h-2" />

          {/* <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-4">
  <p className="text-xs font-bold text-yellow-600 mb-2 uppercase">Developer Tools</p>
  <button 
    onClick={() => solanaWallet.initializeProtocol()}
    className="w-full py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-600 transition-all"
  >
    Initialize Solana Protocol
  </button>
</div> */}

          {/* --- HEDERA CONFIGURATION BLOCK --- */}
          {/* <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl mb-4">
  <p className="text-xs font-bold text-purple-600 mb-2 uppercase">Network Setup</p>
  <button 
    onClick={() => solanaWallet.addSupportedNetwork("Hedera", 1, 20, 20)}
    className="w-full py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-all"
  >
    Configure Hedera (ID: 1)
  </button>
</div> */}

          {/* --- ETHEREUM CONFIGURATION BLOCK --- */}
          {/* <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
  <p className="text-xs font-bold text-blue-600 mb-2 uppercase">Network Setup</p>
  <button 
    onClick={() => solanaWallet.addSupportedNetwork("Ethereum", 2, 20, 20)}
    className="w-full py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-all"
  >
    Configure Ethereum (ID: 2)
  </button>
</div> */}

          <div className="glass-card rounded-2xl">
            <div className="py-4 px-4 md:py-6 md:px-6 flex flex-col gap-2 md:gap-3">
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex flex-col flex-1 min-w-0">
                  <input
                    key={toChain}
                    type="text"
                    readOnly
                    className={`${
                      ""
                    } w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none border-none truncate`}
                    placeholder="0"
                    value={toAmount}
                  />

                  <span className="text-xs sm:text-sm opacity-60">
                    ≈ ${toUsdValue}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => openTokenPicker("to")}
                  className={`hover:bg-black/10 shrink-0 flex glass-card pr-2 rounded-full items-center gap-2 text-left cursor-pointer hover:opacity-90 transition-all`}
                >
                  {toAsset?.icon ? (
                    <Image
                      src={toAsset.icon}
                      alt={toAsset.symbol}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary/10" />
                  )}
                  <div className="leading-tight">
                    <div className="flex items-center gap-0.5 md:gap-1">
                      <p className="text-base sm:text-lg font-bold">
                        {toAsset!.symbol}
                      </p>
                      <Icon
                        icon="lsicon:down-filled"
                        className="text-xs sm:text-base"
                      />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {!toChainConnected && fromChain !== "bitcoin" && (
          <div className="flex flex-col gap-2">
            <p className="text-[8px] md:text-xs">
              {locale == "en"
                ? `Or Input ${networkOptions.find((n) => n.key === toChain)?.name} Receive Address Manually:`
                : `Atau Masukkan Address ${networkOptions.find((n) => n.key === toChain)?.name} Penerima  Secara Manual:`}
            </p>
            <div className="bgBox glass-card cursor-text">
              <div className="flex items-center px-3 py-3">
                <input
                  type="text"
                  className="w-full sm:text-sm text-[10px] font-bold bg-transparent outline-none"
                  placeholder={
                    locale == "en"
                      ? `Enter your ${toChain} address`
                      : `Masukkan address ${toChain} kamu`
                  }
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                />
              </div>
            </div>
            {addressError && (
              <p className="sm:text-sm text-[10px] italic text-red-500">
                {addressError}
              </p>
            )}
          </div>
        )}

        {/* Footer convert */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            disabled={isDisable}
            chain={fromChain}
            onClick={() => {
              if (canConvert) handleConvert();
            }}
            buttonText={buttonText}
          />
        </div>
      </div>

      <hr className="border-none h-[150px]" />

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
          {convertError && <p className="text-xs break-words mb-4 opacity-80">{convertError}</p>}
        </div>

        {/* Sticky Footer */}
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

      {/* NETWORK SELECTION MODAL */}
      <AnimatedModal
        isOpen={chainModalOpen}
        onClose={() => setChainModalOpen(false)}
        maxWidthClass="lg:w-150"
      >
        {/* Main Content Body */}
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">
              {chainModalSide === "from" ? t("text199") : t("text200")}
            </h2>
            <p className="text-[12px] opacity-70">{t("text197")}</p>
          </div>

          <div className="flex flex-col gap-3 pb-2">
            {(chainModalSide === "from"
              ? networkOptions
              : networkOptions.filter(
                  (c) => c.key !== fromChain && CONVERT_NETWORK_ORDER.includes(c.key),
                )
            ).map((c) => {
              const isSelected =
                chainModalSide === "from"
                  ? fromChain === c.key
                  : toChain === c.key;

              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => pickChain(c.key)}
                  className={`w-full text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                    isSelected
                      ? "border-black/20 bg-black/5" 
                      : "border-black/5 hover:bg-black/5" 
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={c.logo}
                      alt={c.name}
                      className="w-8 h-8 object-contain"
                    />
                    <span
                      className={`font-bold lg:text-sm ${isSelected ? "" : "opacity-80"}`}
                    >
                      {c.name}
                    </span>
                  </div>
                  {isSelected && (
                    <FaCheckCircle className="text-[18px] text-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-6 border-t border-black/5 bg-white">
          <div className="flex justify-center w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast
                buttonText={t("text128")}
                onClick={() => setChainModalOpen(false)}
              />
            </div>
          </div>
        </div>
      </AnimatedModal>

      {/* Token Modal */}
      {/* TOKEN SELECTION MODAL */}
      <AnimatedModal
        isOpen={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        maxWidthClass="lg:w-150"
      >
        {/* Main Content Body */}
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">
              {tokenModalSide === "from" ? t("text201") : t("text202")}
            </h2>
            <p className="text-[12px] opacity-70">{t("text203")}</p>
          </div>

          <div className="flex flex-col gap-3 pb-2">
            {getAssetsForChain(
              tokenModalSide === "from" ? fromChain : toChain,
            ).map((a) => {
              const isSelected =
                tokenModalSide === "from"
                  ? fromAsset?.id === a.id
                  : toAsset?.id === a.id;

              return (
                <div key={a.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => pickToken(a)}
                  className={`flex-1 text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                    isSelected
                      ? "border-black/20 bg-black/5" 
                      : "border-black/5 hover:bg-black/5" 
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {a.icon ? (
                      <Image
                        src={a.icon}
                        alt={a.symbol}
                        className="w-8 h-8 rounded-full object-contain shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-black/5 shrink-0" />
                    )}
                    <div className="flex flex-col leading-tight">
                      <span
                        className={`font-bold lg:text-sm ${isSelected ? "" : "opacity-80"}`}
                      >
                        {a.symbol}
                      </span>
                      <span className="text-[11px] opacity-60">{a.name}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <FaCheckCircle className="text-[18px] text-green-500 shrink-0" />
                  )}
                </button>
                {/* The test RWA tokens' faucet, beside the row. */}
                {!a.native && isEvmChain(a.chain) && (
                  <button
                    type="button"
                    disabled={faucetBusy}
                    onClick={() => claimFaucet(a)}
                    className="text-[11px] font-bold px-3 py-2 rounded-lg border border-black/10 hover:bg-black/5 disabled:opacity-50 shrink-0"
                  >
                    {faucetBusy ? "…" : "Faucet"}
                  </button>
                )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-6 border-t border-black/5 bg-white">
          {faucetMsg && <p className="text-[11px] mb-3 opacity-80">{faucetMsg}</p>}
          <div className="flex justify-center w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast
                buttonText={t("text22")}
                onClick={() => setTokenModalOpen(false)}
              />
            </div>
          </div>
        </div>
      </AnimatedModal>
    </>
  );
}
