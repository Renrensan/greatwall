"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

import { SupportedChain } from "@/app/network-provider";
import { CONVERT_NETWORK_ORDER, resolveToChain } from "@/components/integrator/ipow/convert-networks";
import { NATIVE, fromUnits, saveTunnel, toUnits, tunnelAssets, tunnelMemoFor, tunnelQuote, type TunnelAssets } from "@/components/integrator/ipow/tunnel";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import { balanceOf } from "@/components/integrator/ipow/tokens";
import { isEvmChain, type EvmChain } from "@/components/integrator/ipow/sdk";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";

import { BitcoinConnectButton } from "./BitcoinConnectButton";
import { EthereumConnectButton } from "./EthereumConnectButton";
import { SolanaConnectButton } from "./SolanaConnectButton";
import { BaseConnectButton } from "./BaseConnectButton";
import { RobinhoodConnectButton } from "./RobinhoodConnectButton";
import { HyperliquidConnectButton } from "./HyperliquidConnectButton";
import { ArbitrumConnectButton } from "./ArbitrumConnectButton";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { AnimatedModal } from "./AnimatedModal";
import { Caution, FaucetButton, rwaOf, useNotEnoughText, useRwaFaucet } from "./ipow/Faucet";
import { solanaTokenBalance } from "@/components/integrator/ipow/solanaTokenBalance";
import { TxPhase, TypeFilter } from "@/components/integrator/ipow/evm/type";

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
  ethereum: { min: 0.002, max: 0.003 },
  // Within the operator's 2,000 sats a tunnel at its test rates (its
  // /assets): 0.003 ETH is 900 sats, 0.06 SOL is 900 sats, 0.9 HYPE is
  // 1,800 sats. A sell must also pay at least Bitcoin's dust (546 sats):
  // from about 0.002 ETH or 0.04 SOL.
  solana: { min: 0.04, max: 0.06 },
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
  const ethereumWallet = useEthereumWallet();
  const solanaWallet = useSolanaWallet();
  const tempoWallet = useTempoWallet();
  const hyperliquidWallet = useHyperliquidWallet();
  const robinhoodWallet = useRobinhoodWallet();
  const baseWallet = useBaseWallet();
  const arbitrumWallet = useArbitrumWallet();

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
    [bitcoinWallet, ethereumWallet, solanaWallet, tempoWallet, hyperliquidWallet, robinhoodWallet, baseWallet, arbitrumWallet],
  );

  /** The wallet of a network that converts, with the convert methods. */
  const walletOf = (chain: string): any => {
    if (chain === "ethereum") return ethereumWallet;
    if (chain === "solana") return solanaWallet;
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

  // The operator's tokens, with the name and logo Greatwall knows them by
  // (rwaTokens.ts); one it does not know shows its symbol alone.
  const getAssetsForChain = (chain: SupportedChain): Asset[] => [
    getNativeAsset(chain),
    ...(operatorAssets.byChain[chain] ?? [])
      .filter((a) => a.token !== NATIVE)
      .map((a) => {
        const known = rwaTokensOf(chain).find((r) => r.token.toLowerCase() === a.token.toLowerCase());
        return { id: a.symbol, symbol: a.symbol, name: known?.name ?? a.symbol, chain, decimals: a.decimals, icon: known?.logo ?? null, native: false, token: a.token };
      }),
  ];

  /** The picked token on each side; the coin by default (or `?fromToken=`,
   *  as the Portfolio links here), and the coin again when the network changes. */
  const [fromToken, setFromToken] = useState(searchParams.get("fromToken") || NATIVE);
  const [toToken, setToToken] = useState(searchParams.get("toToken") || NATIVE);

  const firstChainRun = useRef(true);

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
    return null;
  }, [toChain, bitcoinWallet.connected, bitcoinWallet.address]);

  const derivedSourceScriptPubKey = useMemo(() => {
    if (fromChain !== "bitcoin") return null;
    if (bitcoinWallet.connected && bitcoinWallet.address)
      return getBitcoinScript(bitcoinWallet.address);
    return null;
  }, [fromChain, bitcoinWallet.connected, bitcoinWallet.address]);

  // The destination's wallet must be connected: the coin goes to it, and
  // between two networks the user opens the buy there.
  const isToSideValid = toChainConnected;

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
  useEffect(() => {
    if (firstChainRun.current) { firstChainRun.current = false; return; }
    setFromToken(NATIVE);
  }, [fromChain]);
  const firstToChainRun = useRef(true);
  useEffect(() => {
    if (firstToChainRun.current) { firstToChainRun.current = false; return; }
    setToToken(NATIVE);
  }, [toChain]);

  const [fromAmount, setFromAmount] = useState(
    searchParams.get("amount") || "",
  );

  /** What the wallet holds of the token converted: the coin from the
   *  wallet's balance, an ERC-20 read from the chain; null until known. */
  const [fromBalance, setFromBalance] = useState<number | null>(null);
  /** The balance could not be read: shown as nothing rather than loading forever. */
  const [fromBalanceFailed, setFromBalanceFailed] = useState(false);
  /** Bumped after a faucet claim, to read the balance again. */
  const [faucetRound, setFaucetRound] = useState(0);
  const fromWallet: any = fromChain === "bitcoin" ? bitcoinWallet : walletOf(fromChain);
  const fromOwner: string | null = fromWallet?.connected ? (fromWallet.address ?? null) : null;
  // Read again after a faucet claim, the shown balance stays until the new
  // one comes; the skeleton is for a new token or wallet only.
  const balanceFor = useRef<string | null>(null);
  useEffect(() => {
    let live = true;
    const key = `${fromChain}:${fromToken}:${fromOwner ?? ""}`;
    if (balanceFor.current !== key) setFromBalance(null);
    balanceFor.current = key;
    setFromBalanceFailed(false);
    if (!fromOwner) return;
    if (fromToken === NATIVE) {
      const b = fromWallet?.balance;
      setFromBalance(Number(b?.sendable ?? b?.confirmed ?? 0));
      return;
    }
    const decimals = operatorAssets.byChain[fromChain]?.find((a) => a.token === fromToken)?.decimals ?? rwaOf(fromChain, fromToken)?.decimals ?? 18;
    if (fromChain === "solana") {
      solanaTokenBalance(fromOwner, fromToken)
        .then((units) => live && setFromBalance(fromUnits(units, decimals)))
        .catch(() => live && setFromBalanceFailed(true));
      return () => {
        live = false;
      };
    }
    if (!isEvmChain(fromChain)) {
      setFromBalanceFailed(true);
      return;
    }
    balanceOf(fromChain as EvmChain, fromToken, fromOwner)
      .then((units) => live && setFromBalance(fromUnits(units, decimals)))
      .catch(() => live && setFromBalanceFailed(true));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromChain, fromToken, fromOwner, fromWallet?.balance?.confirmed, operatorAssets, faucetRound]);
  // A test RWA token held none of, or too little: its faucet, as the mint panel offers it.
  const fromRwa = rwaOf(fromChain, fromToken);
  const faucet = useRwaFaucet(fromChain, fromOwner, fromWallet?.faucet, () => setFaucetRound((n) => n + 1));
  const fromLacking = fromBalance !== null && (fromBalance === 0 || Number(fromAmount) > fromBalance);
  const canFaucet = faucet.available(fromRwa);
  const notEnough = useNotEnoughText();
  const fmtBalance = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  const setFraction = (f: number) => {
    if (fromBalance === null) return;
    const v = fromBalance * f;
    setFromAmount(v > 0 ? String(Number(v.toFixed(8))) : "");
  };
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

    return true;
  }, [fromChain, toChain, networkOptions]);


  /** A token's limits at the operator's price: from Bitcoin's dust (546
   *  sats, with room) to the cap, the operator's per tunnel, or
   *  Conversion's (100,000 sats) for a swap against BTC. */
  const tokenLimit = (rate: bigint, tunnel: boolean) => {
    const r = Number(rate);
    if (!r) return { min: 0, max: Infinity };
    const cap = tunnel ? Number(operatorAssets.maxSats || BigInt(100_000)) : 100_000;
    return { min: Math.ceil((600 / r) * 1e6) / 1e6, max: Math.floor((cap / r) * 1e6) / 1e6 };
  };

  // Bitcoin is the real network (iPoW reads real Bitcoin): no test limits on its side.
  const currentLimit = useMemo(() => {
    if (fromChain === "bitcoin") return { min: 0, max: Infinity };
    if (fromToken !== NATIVE) {
      const a = operatorAssets.byChain[fromChain]?.find((x) => x.token === fromToken);
      if (a) return tokenLimit(a.paySats, toChain !== "bitcoin");
    }

    return TESTNET_LIMITS[fromChain] || { min: 0, max: Infinity };
  }, [fromToken, operatorAssets, fromChain, toChain]);

  const destLimit = useMemo(() => {
    if (toChain === "bitcoin") return { min: 0, max: Infinity };
    if (toToken !== NATIVE) {
      const a = operatorAssets.byChain[toChain]?.find((x) => x.token === toToken);
      if (a) return tokenLimit(a.askSats, fromChain !== "bitcoin");
    }

    const limits = TESTNET_LIMITS[toChain] ?? { min: 0, max: Infinity };

    return {
      min: limits.min * 1.05,
      max: limits.max * 0.95,
    };
  }, [
    toToken,
    operatorAssets, toChain, fromChain]);

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

    if (!toChainConnected) return false;
    if (toChain === "bitcoin" && !derivedDestScriptPubKey) return false;
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
    if (isComingSoon || isProcessing) return true;
    return !canConvert;
  }, [isComingSoon, isProcessing, canConvert]);

  const [chainModalOpen, setChainModalOpen] = useState(false);
  const [chainModalSide, setChainModalSide] = useState<Side>("from");
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [tokenModalSide, setTokenModalSide] = useState<Side>("from");


  useEffect(() => {
    let isActive = true;

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

    const timerId = setTimeout(run, 500);

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
    ethereumWallet,
    solanaWallet,
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
        const fallback = chain === "bitcoin" ? "ethereum" : "bitcoin";
        const next = buildSearchParams({ to: fallback });
        replaceUrl(next, nextPath);
      } else {
        replaceUrl(new URLSearchParams(searchParams.toString()), nextPath);
      }
      setChainModalOpen(false);
      return;
    }
    setToAmount("");
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
        // operator's quote, paying its job fees, with the sale's terms in
        // the buy's memo for the operator to read. Once the operator locks
        // the coin there, the user signs the sell on this network, on the
        // buy's page. One transaction, nothing else to sign.
        const destination = walletOf(toChain);
        const recipient = destination?.address;
        if (!recipient) throw new Error(`Connect your ${toChain} wallet: the coin goes to it`);
        const amountIn = toUnits(fromAmount, fromAsset.decimals);
        const q = await tunnelQuote(fromChain, fromToken, amountIn, toChain, toToken);
        if (q.canTake === false) throw new Error("The operator cannot take another conversion right now: try again later");
        const max = await destination?.maxSats?.();
        if (max && q.sats > max) throw new Error(`At most ${max} sats per conversion to ${toChain}`);
        const buyId: bigint = await destination.tunnelBuy({ token: toToken, amount: q.amountOut, sats: q.sats, memo: tunnelMemoFor(fromChain, fromToken, amountIn) });
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
        router.push(`/${locale}/${toChain}/convert/transaction/${buyId}?linked=${fromChain}`);
        setFromAmount("");
        setToAmount("");
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
        } catch {}
      }

      if (newIdFound) {
        router.push(
          `/${locale}/${network}/convert/transaction/${newIdFound}?linked=${toChain}`,
        );
      }

      setFromAmount("");
      setToAmount("");
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

  const optionOf = (n: string) => networkOptions.find((o) => o.key === n);
  const nameOf = (n: string) => optionOf(n)?.name ?? n;
  const short = (x: string) => (x.length > 16 ? `${x.slice(0, 6)}…${x.slice(-4)}` : x);
  const connectButton = (n: string) =>
    n === "bitcoin" ? <BitcoinConnectButton /> : n === "ethereum" ? <EthereumConnectButton /> : n === "solana" ? <SolanaConnectButton /> : n === "base" ? <BaseConnectButton /> : n === "robinhood" ? <RobinhoodConnectButton /> : n === "hyperliquid" ? <HyperliquidConnectButton /> : n === "arbitrum" ? <ArbitrumConnectButton /> : null;

  /** One side's network: a card that opens the network picker, with its wallet. */
  const networkCard = (n: string, side: Side) => (
    <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2 rounded-2xl glass-card px-4 py-3 md:px-5 md:py-4">
      <button type="button" onClick={() => openChainPicker(side)} className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer rounded-xl -m-1 p-1 hover:bg-black/5 transition-colors">
        {optionOf(n)?.logo && <Image src={optionOf(n)!.logo} alt={nameOf(n)} className="w-9 h-9 md:w-11 md:h-11 rounded-full object-contain shrink-0" />}
        <span className="flex flex-col min-w-0 leading-tight">
          <span className="text-[11px] md:text-xs opacity-60">{side === "from" ? t("convertFromLabel") : t("convertToLabel")}</span>
          <span className="text-sm md:text-lg font-bold truncate">{nameOf(n)}</span>
        </span>
      </button>
      <span className="shrink-0">{connectButton(n)}</span>
    </div>
  );

  /** A token's pill; `small` for the one in the receive strip. */
  const tokenPill = (a: Asset | undefined, onClick: () => void, small = false) => (
    <button type="button" onClick={onClick} className="hover:bg-black/10 shrink-0 flex glass-card pr-2 rounded-full items-center gap-2 text-left cursor-pointer hover:opacity-90 transition-all">
      {a?.icon ? (
        <Image src={a.icon} alt={a.symbol} width={40} height={40} unoptimized={typeof a.icon === "string"} className={small ? "w-6 h-6 rounded-full object-contain" : "w-8 h-8 sm:w-10 sm:h-10 rounded-full object-contain"} />
      ) : (
        <div className={small ? "w-6 h-6 rounded-full bg-secondary/10" : "w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary/10"} />
      )}
      <span className="flex items-center gap-0.5 md:gap-1">
        <span className={small ? "text-sm font-bold" : "text-base sm:text-lg font-bold"}>{a?.symbol}</span>
        <Icon icon="lsicon:down-filled" className="text-xs sm:text-base" />
      </span>
    </button>
  );

  // Outside the limits: the one line that says which, in the source's terms.
  const limitMessage =
    fromChain !== "bitcoin"
      ? amountNumber > 0 && amountNumber < currentLimit.min
        ? `Min limit: ${currentLimit.min} ${fromAsset?.symbol}`
        : amountNumber > currentLimit.max
          ? `Max limit: ${currentLimit.max} ${fromAsset?.symbol}`
          : null
      : destAmountNumber > 0 && destAmountNumber < destLimit.min
        ? `Min limit: ${Number((destLimit.min * (amountNumber / destAmountNumber)).toFixed(8))} ${fromAsset?.symbol}`
        : destAmountNumber > destLimit.max
          ? `Max limit: ${Number((destLimit.max * (amountNumber / destAmountNumber)).toFixed(8))} ${fromAsset?.symbol}`
          : null;

  return (
    <>
      <div className="flex flex-col gap-4 mt-4">
        {/* ================= NETWORKS ================= */}
        <div className="relative flex items-stretch gap-2">
          {networkCard(fromChain, "from")}
          <button
            type="button"
            onClick={swap}
            aria-label={t("convertSwap")}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-lg bg-cream border-4 border-cream flex items-center justify-center"
          >
            <span className="w-full h-full rounded-md bg-paper glass-card flex items-center justify-center text-xs">
              <Icon icon="solar:arrow-right-linear" />
            </span>
          </button>
          {networkCard(toChain, "to")}
        </div>

        {/* ================= SEND, and RECEIVE tucked under it ================= */}
        <div className="flex flex-col">
          <div className="relative z-10 rounded-2xl border border-ink bg-paper shadow-sm">
            <div className="py-4 px-4 md:py-5 md:px-6 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
                <span className="opacity-60">{t("convertSendLabel")}</span>
                {fromOwner ? (
                  <span className="flex items-center gap-1">
                    <span className="opacity-60">{t("convertBalance")}</span>
                    {fromBalanceFailed ? (
                      <span className="font-bold">—</span>
                    ) : fromBalance === null ? (
                      <span className="inline-block h-4 w-20 rounded bg-black/10 animate-pulse align-middle" aria-label="Loading balance" />
                    ) : (
                      <span className="font-bold tabular-nums">{`${fmtBalance(fromBalance)} ${fromAsset?.symbol}`}</span>
                    )}
                    {canFaucet && fromLacking && (
                      <span className="ml-1">
                        <FaucetButton busy={faucet.busy === fromRwa!.token} onClick={() => faucet.claim(fromRwa!)} />
                      </span>
                    )}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3 w-full">
                <input
                  id="convert-amount"
                  key={fromChain}
                  type="text"
                  inputMode="decimal"
                  aria-label={t("convertSendLabel")}
                  className="flex-1 min-w-0 text-4xl md:text-5xl font-bold bg-transparent outline-none border-none truncate"
                  placeholder="0"
                  value={fromAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9]*\.?[0-9]*$/.test(val) || val === "") setFromAmount(val);
                  }}
                />
                {tokenPill(fromAsset, () => openTokenPicker("from"))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm opacity-60 tabular-nums">${fromUsdValue}</span>
                {fromBalance !== null && (
                  <div className="flex justify-end gap-2">
                    {[0.25, 0.75, 1].map((f) => (
                      <button key={f} type="button" onClick={() => setFraction(f)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-ink hover:text-snow transition-colors">
                        {f === 1 ? "Max" : `${f * 100}%`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {limitMessage && <span className="text-[11px] text-red-500 font-medium">{limitMessage}</span>}
              {fromLacking && fromToken !== NATIVE && <Caution text={notEnough(fromAsset.symbol)} />}
            </div>
          </div>

          <div className="-mt-4 mx-1 rounded-b-2xl border border-dashed border-ink/25 border-t-0 bg-sand px-4 md:px-6 pt-7 pb-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
              <span className="opacity-60 shrink-0">{t("convertReceiveLabel")}</span>
              <span className="flex items-center gap-2 min-w-0">
                {toChainConnected && walletOf(toChain)?.address ? (
                  <span className="font-semibold truncate font-mono">{short(walletOf(toChain).address)}</span>
                ) : (
                  <span className="font-semibold opacity-70">{t("convertConnectTo", { network: nameOf(toChain) })}</span>
                )}
                {tokenPill(toAsset, () => openTokenPicker("to"), true)}
              </span>
            </div>
            {toAmount && destAmountNumber > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <span className="relative shrink-0">
                    {toAsset?.icon ? (
                      <Image src={toAsset.icon} alt={toAsset.symbol} width={40} height={40} unoptimized={typeof toAsset.icon === "string"} className="w-9 h-9 md:w-10 md:h-10 rounded-full object-contain" />
                    ) : (
                      <span className="block w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/5" />
                    )}
                    {optionOf(toChain)?.logo && <Image src={optionOf(toChain)!.logo} alt={nameOf(toChain)} className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-sand" />}
                  </span>
                  <span className="text-2xl md:text-3xl font-bold opacity-50 truncate tabular-nums">
                    {toAmount} {toAsset?.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs sm:text-sm opacity-60">
                  <span className="tabular-nums">${toUsdValue}</span>
                  <span>{t("convertQuoteNote")}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <Button
          disabled={isDisable}
          chain={fromChain}
          onClick={() => {
            if (canConvert) handleConvert();
          }}
          buttonText={!toChainConnected && !isComingSoon && !isProcessing ? t("convertConnectTo", { network: nameOf(toChain) }) : buttonText}
        />
      </div>


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
                      ? "border-ink bg-ink! text-snow! shadow-none!"
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
                    <FaCheckCircle className="text-[18px] text-snow" />
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
                <button
                  key={a.id}
                  type="button"
                  onClick={() => pickToken(a)}
                  className={`w-full text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                    isSelected
                      ? "border-ink bg-ink! text-snow! shadow-none!"
                      : "border-black/5 hover:bg-black/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {a.icon ? (
                      <Image
                        src={a.icon}
                        alt={a.symbol}
                        width={32}
                        height={32}
                        unoptimized={typeof a.icon === "string"}
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
                    <FaCheckCircle className="text-[18px] text-snow shrink-0" />
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
