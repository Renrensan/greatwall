"use client";

import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import { tunnelAssets } from "@/components/integrator/ipow/tunnel";
import { coinPrices } from "@/components/integrator/ipow/coinPrices";
import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { trackTx } from "@/components/ui/txToast";
import { serverFaucet } from "@/subcomponents/ipow/Faucet";
import QRCode from "qrcode";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import ButtonContrast from "./ButtonContrast";
import Button from "./Button";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import {
  bitcoin,
  ethereum,
  solana,
  temponetwork,
  hyperliquid,
} from "..";
import { motion, AnimatePresence } from "framer-motion";

import { useTranslations } from "next-intl";
import { SupportedChain } from "@/app/network-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";
import { FaCheckCircle } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { AnimatedModal } from "./AnimatedModal";
import InformationPopUp from "./InformationPopUp";
import { getAddressErrorMessageKey } from "@/subcomponents/wallet-connect/address-validation";
import {
  SOLANA_NATIVE_MINT,
  USDC_MINT_DEVNET,
} from "@/components/solana/config/constants";

const Assets = () => {
  const { locale, network } = useParams<{
    locale: string;
    network: SupportedChain;
  }>();

  const colorFlip = "text-black";
  const t = useTranslations("All");
  const router = useRouter();

  const bitcoinNetwork = useBitcoinWallet();
  const ethereumNetwork = useEthereumWallet();
  const solanaNetwork = useSolanaWallet();
  const tempoNetwork = useTempoWallet();
  const hyperliquidNetwork = useHyperliquidWallet();
  const robinhoodNetwork = useRobinhoodWallet();
  const baseNetwork = useBaseWallet();
  const arbitrumNetwork = useArbitrumWallet();

  let decimals,
    connected,
    address,
    sendTokenTo,
    balance,
    estimatedFee,
    currencyTicker,
    networkName,
    price,
    networkExplorer;
let verifiedTokensData: any;
let faucet: any = null;


  if (network == "bitcoin") {
    networkName = bitcoinNetwork.networkName;
    connected = bitcoinNetwork.connected;
    networkExplorer = bitcoinNetwork.networkExplorer;
    address = bitcoinNetwork.address;
    currencyTicker = bitcoinNetwork.currencyTicker;
    sendTokenTo = bitcoinNetwork.sendTokenTo;
    balance = bitcoinNetwork.balance;
    estimatedFee = bitcoinNetwork.estimatedFee;
    price = bitcoinNetwork.price;
    decimals = bitcoinNetwork.decimals;
  } else if (network == "ethereum") {
    networkName = ethereumNetwork.networkName;
    connected = ethereumNetwork.connected;
    address = ethereumNetwork.address;
    currencyTicker = ethereumNetwork.currencyTicker;
    sendTokenTo = ethereumNetwork.sendTokenTo;
    faucet = (ethereumNetwork as any).faucet ?? null;
    balance = ethereumNetwork.balance;
    estimatedFee = ethereumNetwork.estimatedFee;
    price = ethereumNetwork.price;
    networkExplorer = ethereumNetwork.networkExplorer;
    decimals = ethereumNetwork.decimals;
  } else if (network == "tempo") {
    networkName = tempoNetwork.networkName;
    connected = tempoNetwork.connected;
    address = tempoNetwork.address;
    currencyTicker = tempoNetwork.currencyTicker;
    sendTokenTo = tempoNetwork.sendTokenTo;
    faucet = tempoNetwork.faucet ?? null;
    balance = tempoNetwork.balance;
    estimatedFee = tempoNetwork.estimatedFee;
    price = tempoNetwork.price;
    networkExplorer = tempoNetwork.networkExplorer;
    decimals = tempoNetwork.decimals;
  } else if (network == "hyperliquid") {
    networkName = hyperliquidNetwork.networkName;
    connected = hyperliquidNetwork.connected;
    address = hyperliquidNetwork.address;
    currencyTicker = hyperliquidNetwork.currencyTicker;
    sendTokenTo = hyperliquidNetwork.sendTokenTo;
    faucet = (hyperliquidNetwork as any).faucet ?? null;
    balance = hyperliquidNetwork.balance;
    estimatedFee = hyperliquidNetwork.estimatedFee;
    price = hyperliquidNetwork.price;
    networkExplorer = hyperliquidNetwork.networkExplorer;
    decimals = hyperliquidNetwork.decimals;
  } else if (network == "robinhood") {
    networkName = robinhoodNetwork.networkName;
    connected = robinhoodNetwork.connected;
    address = robinhoodNetwork.address;
    currencyTicker = robinhoodNetwork.currencyTicker;
    sendTokenTo = robinhoodNetwork.sendTokenTo;
    faucet = (robinhoodNetwork as any).faucet ?? null;
    balance = robinhoodNetwork.balance;
    estimatedFee = robinhoodNetwork.estimatedFee;
    price = robinhoodNetwork.price;
    networkExplorer = robinhoodNetwork.networkExplorer;
    decimals = robinhoodNetwork.decimals;
  } else if (network == "base") {
    networkName = baseNetwork.networkName;
    connected = baseNetwork.connected;
    address = baseNetwork.address;
    currencyTicker = baseNetwork.currencyTicker;
    sendTokenTo = baseNetwork.sendTokenTo;
    faucet = (baseNetwork as any).faucet ?? null;
    balance = baseNetwork.balance;
    estimatedFee = baseNetwork.estimatedFee;
    price = baseNetwork.price;
    networkExplorer = baseNetwork.networkExplorer;
    decimals = baseNetwork.decimals;
  } else if (network == "arbitrum") {
    networkName = arbitrumNetwork.networkName;
    connected = arbitrumNetwork.connected;
    address = arbitrumNetwork.address;
    currencyTicker = arbitrumNetwork.currencyTicker;
    sendTokenTo = arbitrumNetwork.sendTokenTo;
    balance = arbitrumNetwork.balance;
    estimatedFee = arbitrumNetwork.estimatedFee;
    price = arbitrumNetwork.price;
    networkExplorer = arbitrumNetwork.networkExplorer;
    decimals = arbitrumNetwork.decimals;
  } else {
    networkName = solanaNetwork.networkName;
    connected = solanaNetwork.connected;
    address = solanaNetwork.address;
    currencyTicker = solanaNetwork.currencyTicker;
    sendTokenTo = solanaNetwork.sendTokenTo;
    balance = solanaNetwork.balance;
    estimatedFee = solanaNetwork.estimatedFee;
    price = solanaNetwork.price;
    networkExplorer = solanaNetwork.networkExplorer;
   decimals = solanaNetwork.decimals;
    verifiedTokensData = solanaNetwork.verifiedTokensData;
  }

  const getUserBalance = (
    mintOrSymbol: string,
    isNative: boolean,
    type: "sendable" | "confirmed" = "sendable",
  ) => {
    if (!connected || !balance) return 0;

    if (isNative) {
      return Math.max(
        0,
        type === "sendable"
          ? (balance as any)?.sendable
          : (balance as any)?.confirmed || 0,
      );
    }

    if ((network === "solana" || network === "ethereum" || network === "tempo" || network === "hyperliquid" || network === "robinhood" || network === "base" || network === "arbitrum") && (balance as any)?.tokens) {
      const token = (balance as any).tokens.find(
        (t: any) => t.mint === mintOrSymbol || t.symbol === mintOrSymbol,
      );
      return Math.max(0, token?.amount || 0);
    }
    return 0;
  };

const baseTokens = useMemo(() => {
    if (network === "solana") {
      const tokenMap = new Map();
      
    
   
      const resolveMetadata = (mintOrSym: string, providedIsNative?: boolean) => {
        const clean = mintOrSym.trim();
        const upper = clean.toUpperCase();
        const isNative = !!providedIsNative || upper === "SOL" || clean === SOLANA_NATIVE_MINT;

        // Full base58 mint addresses are ~32-44 chars, real tickers are a handful — used to
        // tell "no metadata for this token yet" apart from "this really is a short symbol",
        // so an unlisted mint (common on devnet) shows an ellipsized address instead of the
        // full raw string blowing out the row's layout.
        const looksLikeMintAddress = !isNative && clean.length > 12;
        const shortAddress = looksLikeMintAddress ? `${clean.slice(0, 4)}...${clean.slice(-4)}` : upper;

        let mint = isNative ? SOLANA_NATIVE_MINT : clean;
        let symbol = shortAddress;
        let name = isNative ? "Solana" : `${shortAddress} Token`;
        let logo = isNative ? solana : null;
        let dec = isNative ? 9 : 6;

        const meta = verifiedTokensData?.find(
          (v: any) =>
            v.mint === clean ||
            v.symbol?.toUpperCase() === upper ||
            (isNative && (v.mint === SOLANA_NATIVE_MINT || v.symbol?.toUpperCase() === "SOL"))
        );

        if (meta) {
          mint = meta.mint;
          symbol = meta.symbol;
          name = meta.name;
          logo = meta.icon; 
          dec = meta.decimals;
        }

        if (!isNative) {
          if (symbol.toUpperCase() === "USDC" || mint === USDC_MINT_DEVNET) {
            mint = USDC_MINT_DEVNET; 
          }
        }

        return {
          name,
          symbol,
          logo,
          decimals: dec,
          mint,
          isNative,
        };
      };

      const nativeMeta = resolveMetadata("SOL", true);
      tokenMap.set(nativeMeta.mint, {
        ...nativeMeta,
        // SOL at its market price (the provider's, from /api/prices).
        price: ((price as any)?.usd || 0).toString(),
        change: "+0.00%",
        metaLoading: false,
      });


      const userTokens = (balance as any)?.tokens || [];
      userTokens.forEach((uToken: any) => {
        const isNative = !!uToken.isNative;
        const targetKey = isNative ? SOLANA_NATIVE_MINT : (uToken.mint || uToken.symbol);
        if (!targetKey) return;

        const meta = resolveMetadata(targetKey, isNative);

        if (!tokenMap.has(meta.mint)) {
          const finalSymbol =
            meta.symbol.startsWith("TKN-") && uToken.symbol && !uToken.symbol.startsWith("TKN-")
              ? uToken.symbol
              : meta.symbol;

          tokenMap.set(meta.mint, {
            ...meta,
            name: uToken.name !== "Unknown Token" && uToken.name !== "Devnet Token" ? uToken.name : meta.name,
            symbol: finalSymbol,
            logo: uToken.logo || meta.logo,
            decimals: uToken.decimals || meta.decimals,
            price: "0",
            change: "+0.00%",
            metaLoading: !!uToken.metaLoading,
          });
        }
      });

      return Array.from(tokenMap.values()).sort((a: any, b: any) => {
        if (a.isNative && !b.isNative) return -1;
        if (!a.isNative && b.isNative) return 1;

        const getCoreWeight = (t: any) => {
          const s = (t.symbol || "").toUpperCase();
          const m = t.mint || "";
          if (s === "USDC" || m === USDC_MINT_DEVNET) return 1;
          if (s === "USDT") return 2;
          return 99;
        };

        const weightA = getCoreWeight(a);
        const weightB = getCoreWeight(b);

        if (weightA !== weightB) return weightA - weightB;

        const balA = getUserBalance(a.mint || a.symbol, a.isNative, "confirmed");
        const balB = getUserBalance(b.mint || b.symbol, b.isNative, "confirmed");

        if (balA !== balB) return balB - balA;

        return (a.symbol || "").localeCompare(b.symbol || "");
      });
    } else if (network === "ethereum") {
      // Unlike Solana's SPL token accounts, there's no RPC call that lists every ERC-20 a
      // wallet holds — balance.tokens here is already the outcome of checking a small
      // verified allowlist (see VERIFIED_ERC20_TOKENS/fetchErc20Balances), filtered to
      // nonzero holdings, so it can just be appended after the native entry as-is.
      const nativeEntry = {
        name: networkName,
        symbol: currencyTicker,
        price: ((price as any)?.usd || 0).toString(),
        change: "0.00%",
        logo: ethereum,
        mint: null,
        decimals,
        isNative: true,
      };

      const heldTokens = ((balance as any)?.tokens || []).map((tok: any) => ({
        name: tok.name,
        symbol: tok.symbol,
        // Test tokens have no market: "0" here (a mock RWA token is priced below, by
        // the operator's rate).
        price: tok.price ?? "0",
        change: `${(tok.priceChange24h ?? 0) >= 0 ? "+" : ""}${(tok.priceChange24h ?? 0).toFixed(2)}%`,
        // Null (→ letter-avatar fallback); a mock RWA token's logo is set below.
        logo: tok.logo ?? null,
        mint: tok.mint,
        decimals: tok.decimals,
        isNative: false,
      }));

      return [nativeEntry, ...heldTokens];
    } else if (network === "tempo") {
      // Verified-allowlist approach like Ethereum (see VERIFIED_TRC20_TOKENS) — no logo/price
      // enrichment wired up yet, matching how Ethereum started before that was added later.
      const nativeEntry = {
        name: networkName,
        symbol: currencyTicker,
        price: ((price as any)?.usd || 0).toString(),
        change: "0.00%",
        logo: temponetwork,
        mint: null,
        decimals,
        isNative: true,
      };

      const heldTokens = ((balance as any)?.tokens || []).map((tok: any) => ({
        name: tok.name,
        symbol: tok.symbol,
        price: tok.price ?? "0",
        change: "0.00%",
        logo: tok.logo ?? null,
        mint: tok.mint,
        decimals: tok.decimals,
        isNative: false,
      }));

      return [nativeEntry, ...heldTokens];
    } else if (network === "hyperliquid") {
      // Verified-allowlist approach like Ethereum (see hyperliquid/config/verified-tokens.ts).
      const nativeEntry = {
        name: networkName,
        symbol: currencyTicker,
        price: ((price as any)?.usd || 0).toString(),
        change: "0.00%",
        logo: hyperliquid,
        mint: null,
        decimals,
        isNative: true,
      };

      const heldTokens = ((balance as any)?.tokens || []).map((tok: any) => ({
        name: tok.name,
        symbol: tok.symbol,
        price: tok.price ?? "0",
        change: "0.00%",
        logo: tok.logo ?? null,
        mint: tok.mint,
        decimals: tok.decimals,
        isNative: false,
      }));

      return [nativeEntry, ...heldTokens];
    } else if (network === "robinhood") {
      // Verified-allowlist approach like Ethereum (see robinhood/config/verified-tokens.ts).
      const nativeEntry = {
        name: networkName,
        symbol: currencyTicker,
        price: ((price as any)?.usd || 0).toString(),
        change: "0.00%",
        // The coin is ETH; the network's own mark is for the network, not the asset.
        logo: ethereum,
        mint: null,
        decimals,
        isNative: true,
      };

      const heldTokens = ((balance as any)?.tokens || []).map((tok: any) => ({
        name: tok.name,
        symbol: tok.symbol,
        price: tok.price ?? "0",
        change: "0.00%",
        logo: tok.logo ?? null,
        mint: tok.mint,
        decimals: tok.decimals,
        isNative: false,
      }));

      return [nativeEntry, ...heldTokens];
    } else if (network === "base") {
      // Verified-allowlist approach like Ethereum (see base/config/verified-tokens.ts).
      const nativeEntry = {
        name: networkName,
        symbol: currencyTicker,
        price: ((price as any)?.usd || 0).toString(),
        change: "0.00%",
        // The coin is ETH; the network's own mark is for the network, not the asset.
        logo: ethereum,
        mint: null,
        decimals,
        isNative: true,
      };

      const heldTokens = ((balance as any)?.tokens || []).map((tok: any) => ({
        name: tok.name,
        symbol: tok.symbol,
        price: tok.price ?? "0",
        change: "0.00%",
        logo: tok.logo ?? null,
        mint: tok.mint,
        decimals: tok.decimals,
        isNative: false,
      }));

      return [nativeEntry, ...heldTokens];
    } else if (network === "arbitrum") {
      // Verified-allowlist approach like Ethereum (see arbitrum/config/verified-tokens.ts).
      const nativeEntry = {
        name: networkName,
        symbol: currencyTicker,
        price: ((price as any)?.usd || 0).toString(),
        change: "0.00%",
        // The coin is ETH; the network's own mark is for the network, not the asset.
        logo: ethereum,
        mint: null,
        decimals,
        isNative: true,
      };

      const heldTokens = ((balance as any)?.tokens || []).map((tok: any) => ({
        name: tok.name,
        symbol: tok.symbol,
        price: tok.price ?? "0",
        change: "0.00%",
        logo: tok.logo ?? null,
        mint: tok.mint,
        decimals: tok.decimals,
        isNative: false,
      }));

      return [nativeEntry, ...heldTokens];
    } else {
      const localLogo = network === "bitcoin" ? bitcoin : null;

      return [
        {
          name: networkName,
          symbol: currencyTicker,
          price: ((price as any)?.usd || 0).toString(),
          change: "0.00%",
          logo: localLogo,
          mint: null,
          decimals: decimals,
          isNative: true,
        },
      ];
    }
  }, [
    network,
    verifiedTokensData,
    price,
    networkName,
    currencyTicker,
    decimals,
    balance,
    connected,
  ]);

  // The network's mock RWA tokens (rwaTokens.ts), listed whether or not the
  // wallet holds any, so they can be had from the faucet; priced at the
  // operator's test rate, in dollars by Bitcoin's price.
  const [rwaPrices, setRwaPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [assets, btc] = await Promise.all([
          tunnelAssets(),
          coinPrices().then((p) => Number(p?.BTC ?? 0)),
        ]);
        const prices: Record<string, number> = {};
        for (const a of assets.byChain[network as SupportedChain] ?? []) prices[a.token.toLowerCase()] = (Number(a.paySats) / 1e8) * btc;
        if (live) setRwaPrices(prices);
      } catch {}
    })();
    return () => { live = false; };
  }, [network]);
  const allTokens = useMemo(() => {
    const rwa = rwaTokensOf(network as SupportedChain);
    if (rwa.length === 0) return baseTokens;
    const have = new Set((baseTokens as any[]).map((t) => String(t.mint ?? "").toLowerCase()));
    const priced = (baseTokens as any[]).map((t) => {
      const r = rwa.find((x) => x.token.toLowerCase() === String(t.mint ?? "").toLowerCase());
      return r ? { ...t, rwa: r, price: String(rwaPrices[r.token.toLowerCase()] ?? 0), logo: t.logo ?? r.logo ?? null } : t;
    });
    const missing = rwa
      .filter((r) => !have.has(r.token.toLowerCase()))
      .map((r) => ({ name: r.name, symbol: r.symbol, price: String(rwaPrices[r.token.toLowerCase()] ?? 0), change: "0.00%", logo: r.logo ?? null, mint: r.token, decimals: r.decimals, isNative: false, rwa: r }));
    return [...priced, ...missing];
  }, [baseTokens, network, rwaPrices]);

  // Greatwall's server faucet: a mock RWA token, or the network's gas coin
  // ("gas"), sent by the server, which pays the fee. On EVM, when the server
  // is out of a token, the token's own faucet, signed by the wallet.
  const [faucetBusy, setFaucetBusy] = useState(false);
  /** Where a transaction is seen on this network's explorer. */
  const txUrl = (hash: string): string | null => {
    const ex: any = networkExplorer;
    if (ex?.transaction) return `${ex.transaction}${hash}${ex.urlSuffix ?? ""}`;
    if (typeof ex === "string") return `${ex.replace(/\/$/, "")}/tx/${hash}`;
    return null;
  };
  /** An amount as people read it: up to six decimals, no trailing zeros. */
  const fmtAmount = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  const claimFaucet = async (token: any) => {
    setFaucetBusy(true);
    const gas = !token.rwa;
    let done: string | undefined;
    const send = async (): Promise<string | null> => {
      if (!connected || !address) throw new Error("Connect your wallet first");
      try {
        const sent = await serverFaucet(network, address, gas ? "gas" : token.mint);
        done = sent.text;
        return sent.hash;
      } catch (e: any) {
        if (e?.dry === "token" && network !== "solana" && faucet) return faucet(token.mint);
        throw e;
      }
    };
    try {
      await trackTx(network, gas ? `Faucet: ${network === "tempo" ? "PathUSD" : token.symbol} for fees` : `Faucet: ${token.rwa.faucet} ${token.symbol}`, send, (h) => h, {
        linkOf: txUrl,
        pending: "Greatwall's faucet is sending it. If it is out of this token, your wallet asks you to confirm the token's own faucet.",
        get done() {
          return done;
        },
      });
    } finally {
      setFaucetBusy(false);
    }
  };

  // `balance.fetched` means the same thing on every network (has the first real balance
  // value arrived), so this shouldn't be Solana-only — it was just never generalized when
  // built.
  const isLoadingTokens = connected && !(balance as any)?.fetched;

  // Gates the *whole* list, not per-row: showing some rows resolved and others still
  // skeleton looked broken. Wait until every token's real metadata has arrived, then
  // reveal the list all at once.
  const isMetaEnriching = allTokens.some((t: any) => t.metaLoading);

  const [isMainInfoOpen, setIsMainInfoOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "receive">("send");
  /** The wallet's address as a QR code, for the Receive tab. */
  const [qrDataUrl, setQrDataUrl] = useState("");
  useEffect(() => {
    if (!address) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(address, { width: 480, margin: 1, color: { dark: "#000000", light: "#FFFFFF" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [address]);
  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied.");
    } catch {
      toast.error("Could not copy.");
    }
  };
  /** Receiving by converting: the Convert page with this network and token as the destination. */
  const receiveByConvert = () => {
    const token = selectedToken && selectedToken.isNative === false && selectedToken.mint ? `&toToken=${encodeURIComponent(selectedToken.mint)}` : "";
    router.push(`/${locale}/bitcoin/convert/create?to=${network}${token}`);
  };
  const [sendAmount, setSendAmount] = useState("");

  const [sendAddress, setSendAddress] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);

  const [recipientAddressError, setRecipientAddressError] = useState("");
  const [sendCoinAmountError, setSendCoinAmountError] = useState("");
  const [IsValidForm, setIsValidForm] = useState(false);

  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [modalStep, setModalStep] = useState<"form" | "selectToken">("form");
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");

  const [erc20SendFee, setErc20SendFee] = useState<number | null>(null);
  const [isEstimatingErc20Fee, setIsEstimatingErc20Fee] = useState(false);

  // Ethereum's verified-token logos are remote (Trust Wallet's asset CDN, see
  // getTrustWalletLogoUrl) rather than bundled locally like Solana/native icons — a genuinely
  // new failure mode (404, network hiccup) that didn't exist before, so a failed load falls
  // back to the same letter-avatar the "no logo" case already uses, instead of a broken image.
  const [brokenLogoKeys, setBrokenLogoKeys] = useState<Set<string>>(new Set());
  const markLogoBroken = (key: string) => {
    setBrokenLogoKeys((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  };

  useEffect(() => {
    let isCancelled = false;

    if (
      network !== "ethereum" ||
      activeTab !== "send" ||
      !selectedToken ||
      selectedToken.isNative !== false ||
      !sendAddress ||
      !ethereumNetwork.isValidAddress(sendAddress) ||
      !sendAmount ||
      isNaN(parseFloat(sendAmount)) ||
      parseFloat(sendAmount) <= 0
    ) {
      setErc20SendFee(null);
      setIsEstimatingErc20Fee(false);
      return;
    }

    const amt = parseFloat(sendAmount);
    const fetchFee = async () => {
      setIsEstimatingErc20Fee(true);
      try {
        const fee = await ethereumNetwork.estimateErc20SendFee(sendAddress, amt, {
          address: selectedToken.mint,
          decimals: selectedToken.decimals,
        });
        if (!isCancelled) setErc20SendFee(fee);
      } catch {
        if (!isCancelled) setErc20SendFee(null);
      } finally {
        if (!isCancelled) setIsEstimatingErc20Fee(false);
      }
    };

    const timeoutId = setTimeout(fetchFee, 500);
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
    // Depends on the specific stable callbacks, not the whole ethereumNetwork context
    // object — that object is a fresh literal on every provider render (e.g. every balance
    // poll), which would otherwise re-trigger this live estimate constantly while the send
    // modal just sits open.
  }, [network, activeTab, selectedToken, sendAddress, sendAmount, ethereumNetwork.isValidAddress, ethereumNetwork.estimateErc20SendFee]);

  useEffect(() => {
    if (connected && !selectedToken && currencyTicker && allTokens.length > 0) {
      const initial = allTokens.find(
        (t: any) =>
          t.symbol?.toLowerCase() === currencyTicker.toLowerCase() ||
          t.isNative === true,
      );
      setSelectedToken(initial || allTokens[0]);
    }
  }, [allTokens, currencyTicker, connected, selectedToken]);



  const filteredTokens = useMemo(() => {
    return allTokens.filter(
      (t: any) =>
        (t.symbol &&
          t.symbol.toLowerCase().includes(tokenSearchQuery.toLowerCase())) ||
        (t.name &&
          t.name.toLowerCase().includes(tokenSearchQuery.toLowerCase())),
    );
  }, [allTokens, tokenSearchQuery]);

const maxSendableBalance = useMemo(() => {
    if (!selectedToken) return 0;

    const userBalConfirmed = getUserBalance(
      selectedToken.mint || selectedToken.symbol,
      selectedToken.isNative,
      "confirmed",
    );


    return Math.max(0, userBalConfirmed);
  }, [selectedToken, balance, network, connected]);


useEffect(() => {
    let isSendTokenAmountValid = true;
    let isRecipientAddressValid = true;

    if (connected && selectedToken) {
      const dec = selectedToken.decimals || 8;
      const factor = Math.pow(10, dec);
      
      const feeToDeduct = selectedToken?.isNative && (network as string) !== "solana" && estimatedFee?.fetched
          ? (estimatedFee[estimatedFee.selectedFee || "medium"] || 0)
          : 0;

      const maxAvailableRaw = Math.max(0, maxSendableBalance - feeToDeduct);
      const maxAvailable = Math.floor(maxAvailableRaw * factor) / factor;
      
      const currentAmountStr = sendAmount;
      const amountNum = parseFloat(currentAmountStr);

      if (amountNum === 0 || !currentAmountStr || isNaN(amountNum)) {
        setSendCoinAmountError("");
        isSendTokenAmountValid = false;
      } else {
        const reqAmount = Math.round(amountNum * factor) / factor;
        if (reqAmount > maxAvailable) {
          setSendCoinAmountError(t("text118"));
          isSendTokenAmountValid = false;
        } else {
          setSendCoinAmountError("");
        }
      }
    }
    if (connected) {
      const addr = sendAddress?.trim() ?? "";

      if (addr === "") {
        setRecipientAddressError("");
        isRecipientAddressValid = false;
      } else {
        const provider = {
          bitcoin: bitcoinNetwork,
          ethereum: ethereumNetwork,
          solana: solanaNetwork,
          tempo: tempoNetwork,
          hyperliquid: hyperliquidNetwork,
          robinhood: robinhoodNetwork,
          base: baseNetwork,
          arbitrum: arbitrumNetwork,
        }[network];

        const result = provider?.checkAddress(addr) ?? { valid: false, reason: "invalid" as const };
        isRecipientAddressValid = result.valid;
        setRecipientAddressError(result.valid ? "" : t(getAddressErrorMessageKey(network, result.reason)));
      }
    }

    setIsValidForm(isSendTokenAmountValid && isRecipientAddressValid);
  }, [
    connected,
    address,
    balance,
    selectedToken,
    sendAddress,
    sendAmount,
    activeTab,
    estimatedFee,
    network,
    t,
    maxSendableBalance,
  ]);

  const handleReceive = () => {
    setActiveTab("receive");
    setModalStep("form");
    setShowModal(true);
  };

  const handleSend = () => {
    setActiveTab("send");
    setModalStep("form");
    setShowModal(true);
  };
const handleCloseModal = () => {
    setShowModal(false);
    setSendAmount("");
    setSendAddress("");
    setModalStep("form");
  };

  const handleConfirmSend = async () => {
    if (!connected) return;

    setShowModal(false);
    setIsProcessing(true);
    const amount = parseFloat(sendAmount);
    // The send, as one step for its toast: it resolves with its hash.
    const send = async (): Promise<string> => {
      let resultTxid;

        if (network === "solana") {
          // Signed by the wallet; a token by its mint and decimals.
          resultTxid = await (sendTokenTo as any)(
            sendAddress,
            amount,
            undefined,
            selectedToken && selectedToken.isNative === false ? selectedToken.mint : undefined,
            selectedToken?.decimals,
          );
        } else if (network === "ethereum" && selectedToken && selectedToken.isNative === false) {
          // Verified ERC-20 balances (see fetchErc20Balances) carry their contract address in
          // `mint` and their own decimals, unlike the native entry — sendTokenTo needs both to
          // build a transfer() call instead of a plain value transfer.
          resultTxid = await (sendTokenTo as any)(sendAddress, amount, undefined, {
            address: selectedToken.mint,
            decimals: selectedToken.decimals,
          });
        } else if (network === "tempo" && selectedToken && selectedToken.isNative === false) {
          // Held TRC-20 balances carry the contract address in `mint` — sendTokenTo needs it
          // plus decimals to build a transfer() call instead of a plain TRX transfer.
          resultTxid = await (sendTokenTo as any)(sendAddress, amount, undefined, {
            address: selectedToken.mint,
            decimals: selectedToken.decimals,
          });
        } else if (network === "hyperliquid" && selectedToken && selectedToken.isNative === false) {
          // Verified ERC-20 balances carry their contract address in `mint` — sendTokenTo needs
          // it plus decimals to build a transfer() call instead of a plain value transfer.
          resultTxid = await (sendTokenTo as any)(sendAddress, amount, undefined, {
            address: selectedToken.mint,
            decimals: selectedToken.decimals,
          });
        } else if (network === "robinhood" && selectedToken && selectedToken.isNative === false) {
          // Verified ERC-20 balances carry their contract address in `mint` — sendTokenTo needs
          // it plus decimals to build a transfer() call instead of a plain value transfer.
          resultTxid = await (sendTokenTo as any)(sendAddress, amount, undefined, {
            address: selectedToken.mint,
            decimals: selectedToken.decimals,
          });
        } else if ((network === "base" || network === "arbitrum") && selectedToken && selectedToken.isNative === false) {
          // Verified ERC-20 balances carry their contract address in `mint` — sendTokenTo needs
          // it plus decimals to build a transfer() call instead of a plain value transfer.
          resultTxid = await (sendTokenTo as any)(sendAddress, amount, undefined, {
            address: selectedToken.mint,
            decimals: selectedToken.decimals,
          });
        } else {

          resultTxid = await (sendTokenTo as any)(sendAddress, amount);
        }
      if (!resultTxid) throw new Error(t("text34"));
      return resultTxid as string;
    };
    try {
      const symbol = selectedToken?.symbol ?? currencyTicker;
      const r = await trackTx(network, `Send ${fmtAmount(amount)} ${symbol}`, send, (h) => h, { linkOf: txUrl });
      if (r.ok) {
        setSendAmount("");
        setSendAddress("");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const activeAmountStr = sendAmount;


  if (!connected || !address) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <div className="bgBox glass-card">
          <div className="flex flex-col justify-center gap-5 pb-5 text-center px-4 pt-6">
            <div className="p-5 glass-card shadow-buttonNav! flex justify-center items-center mx-auto w-28 h-28 rounded-full">
              <Icon
                icon="iconoir:wallet-solid"
                className={`text-6xl text-end`}
              />
            </div>
            <h2 className="text-xl font-bold text-center">{t("text24")}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full min-w-0">
   
      <div className="bgBox glass-card w-full max-w-full min-w-0">
        <div className="flex flex-col gap-5">
          <div className="flex justify-between items-center px-1">
            <div>
              <h2 className="font-bold text-lg sm:text-xl">
                {"Portfolio"}
              </h2>
            </div>
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

          <div className="flex flex-col gap-1">
            {isLoadingTokens || isMetaEnriching ? (
              [...Array(4)].map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="w-full p-4 border border-transparent rounded-xl flex items-center justify-between gap-3 animate-pulse bg-black/5"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-black/10 shrink-0" />
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-12 bg-black/10 rounded" />
                      <div className="h-2 w-20 bg-black/10 rounded" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="h-4 w-16 bg-black/10 rounded" />
                    <div className="h-2 w-10 bg-black/10 rounded" />
                  </div>
                </div>
              ))
            ) : allTokens.length > 0 ? (
              allTokens.map((token: any, index: any) => {
                const tokenPriceUsd = parseFloat(token.price) || 0;
                const tokenBalNum = getUserBalance(
                  token.mint || token.symbol,
                  token.isNative,
                  "confirmed",
                );
                const totalUSD = tokenBalNum * tokenPriceUsd;

                return (
                  <motion.div
                    // Keyed by identity, not position: an index key would make a row's
                    // identity depend on where it happens to land in the array. Even with a
                    // referentially-stable token list (see solana-provider's fetchBalance),
                    // token order could still shift between polls if the RPC ever returns
                    // accounts in a different order — with an index key that would misattach
                    // an existing row to a new token and replay this entrance animation.
                    key={token.mint || token.symbol}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                    whileHover={{ x: 6 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedToken(token);
                      setActiveTab("send");
                      setShowModal(true);
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl group/item cursor-pointer hover:bg-black/3 transition-all duration-300"
                  >
                    <div className="flex items-center gap-5">
                      <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                        <div
                          className={`absolute inset-0 rounded-full border border-black/20 group-hover/item:border-black/50 transition-colors opacity-30`}
                        />
                        <div className="absolute top-0 w-3 h-1 bg-current opacity-20 rounded-full group-hover/item:opacity-80 transition-opacity" />
                        <div className="absolute bottom-0 w-3 h-1 bg-current opacity-20 rounded-full group-hover/item:opacity-80 transition-opacity" />
                        <div className="absolute left-0 h-3 w-1 bg-current opacity-20 rounded-full group-hover/item:opacity-80 transition-opacity" />
                        <div className="absolute right-0 h-3 w-1 bg-current opacity-20 rounded-full group-hover/item:opacity-80 transition-opacity" />

                        <div className="w-11 h-11 rounded-full overflow-hidden shadow-xl border border-white/10 relative z-10 flex items-center justify-center bg-black/5 transition-transform duration-500 group-hover/item:scale-110">
                          {token.logo && !brokenLogoKeys.has(token.mint || token.symbol) ? (
                            <Image
                              src={token.logo}
                              alt={token.name || token.symbol}
                              fill
                              className="object-cover"
                              unoptimized={typeof token.logo === "string"}
                              onError={() => markLogoBroken(token.mint || token.symbol)}
                            />
                          ) : (
                            <span className="font-bold text-lg opacity-50">
                              {token.symbol
                                ? token.symbol.charAt(0).toUpperCase()
                                : "?"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span
                          className={`font-bold text-lg sm:text-xl tracking-tight group-hover/item:text-black transition-colors`}
                        >
                          {token.symbol}
                          {token.rwa?.about && (
                            <a
                              href={token.rwa.about}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={"About this asset on rwa.xyz"}
                              className="ml-2 inline-flex align-middle opacity-40 hover:opacity-100"
                            >
                              <Icon icon="solar:info-circle-linear" className="text-[16px]" />
                            </a>
                          )}
                        </span>
                        {token.rwa ? (
                          <span className="text-xs opacity-60 break-words">
                            {token.name}
                          </span>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold opacity-50">
                            ${totalUSD.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="font-black text-lg sm:text-xl tracking-tighter">
                        {tokenBalNum} {token.symbol}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-sm opacity-60">
                <Icon
                  icon="solar:wallet-broken"
                  className="text-6xl mb-4 opacity-50"
                />
                <p className="text-lg font-medium">
                  {"No Tokens Found"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

    
      {/* Pinned to the bottom of the Portfolio box: reachable however long the list is. */}
      <div className="w-full flex gap-5 sticky bottom-0 z-10 pt-5 pb-1 bg-[var(--color-paper)] before:content-[''] before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-[var(--color-paper)] before:to-transparent before:pointer-events-none">
        <Button
          chain={network}
          onClick={handleSend}
          buttonText={isProcessing ? t("text10") : `${t("text116")} Token`}
          disabled={isProcessing}
        />

        <ButtonContrast onClick={handleReceive} buttonText={"Receive"} />
      </div>

      
      <AnimatedModal
        isOpen={
          showModal && (activeTab === "send" ? estimatedFee.fetched : true)
        }
        onClose={handleCloseModal}
        maxWidthClass="lg:w-150"
      >
        <div className="flex flex-col p-6 overflow-hidden flex-1 min-h-0 max-h-[80vh]">
          <AnimatePresence mode="wait">
       
            {modalStep === "form" && (
              <motion.div
                key="form-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full min-h-0"
              >
          
                <div className="flex flex-col gap-5 pb-3 shrink-0">
                  <div className="flex flex-col gap-0">
                    <h2 className="text-xl font-bold">
                      {activeTab === "send" ? t("text116") : "Receive"} Token
                    </h2>
                    <p className="text-[12px] opacity-70">
                      {activeTab === "send"
                        ? t("text29")
                        : "Receive tokens at this wallet's address, from the faucet, or by converting."}
                    </p>
                  </div>

                  <div className="flex justify-between glass-card bgRound border-black/5 p-1 shadow-sm">
                    {[
                      { label: t("text116"), id: "send" },
                      { label: "Receive", id: "receive" },
                    ].map((tab) => {
                      const isActive = activeTab === tab.id;
                      const activeBgClass = "bg-black";
                      const activeTextClass = "text-white";

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() =>
                            setActiveTab(tab.id as "send" | "receive")
                          }
                          className={`flex items-center justify-center gap-2 w-full p-2.5 text-center rounded-full text-xs sm:text-sm transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                            isActive
                              ? `font-bold ${activeBgClass} ${activeTextClass} shadow-md`
                              : `font-medium hover:bg-black/5 opacity-60`
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar -mx-1 px-1">
                {activeTab === "receive" ? (
                  <div className="flex flex-col gap-5 py-4">
                    {/* 1. To this wallet's address. */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                        {"Send to this address"}
                      </span>
                      <div className="bgBox glass-card p-5 border border-black/5 rounded-2xl flex flex-col items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setModalStep("selectToken")}
                          className="flex items-center gap-2 glass-card rounded-full pl-1.5 pr-3 py-1.5 hover:bg-black/5"
                        >
                          {selectedToken?.logo && !brokenLogoKeys.has(selectedToken.mint || selectedToken.symbol) ? (
                            <Image
                              src={selectedToken.logo}
                              alt={selectedToken.symbol}
                              width={28}
                              height={28}
                              unoptimized={typeof selectedToken.logo === "string"}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center text-xs font-bold opacity-50">
                              {selectedToken?.symbol?.charAt(0)}
                            </span>
                          )}
                          <span className="font-bold text-sm">{selectedToken?.symbol}</span>
                          <Icon icon="lsicon:down-filled" className="text-sm" />
                        </button>
                        {qrDataUrl ? (
                          <img src={qrDataUrl} alt={address ?? ""} className="w-44 h-44 rounded-xl border border-black/5" />
                        ) : (
                          <div className="w-44 h-44 rounded-xl bg-black/5 animate-pulse" />
                        )}
                        <button
                          type="button"
                          onClick={copyAddress}
                          title={"Copy address"}
                          className="flex items-center justify-center gap-2 max-w-full px-3 py-2 rounded-lg border border-black/10 hover:bg-black/5"
                        >
                          <span className="font-mono text-xs break-all text-center">{address}</span>
                          <Icon icon="solar:copy-linear" className="text-base shrink-0" />
                        </button>
                      </div>
                    </div>
                    {/* 2. From the faucet, for the test RWA tokens. */}
                    {(selectedToken?.rwa || (selectedToken?.isNative && network !== "bitcoin")) && (
                      <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                          {"From the faucet"}
                        </span>
                        <div className="bgBox glass-card p-4 border border-black/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-xs opacity-70">
                            {selectedToken.rwa
                              ? `${selectedToken.rwa.faucet} ${selectedToken.symbol} a claim, once a day, sent by Greatwall with the fee paid; a test token with no value.`
                              : `A little ${network === "tempo" ? "PathUSD" : selectedToken.symbol} for network fees, once a day while your balance is low, sent by Greatwall.`}
                          </p>
                          <div className="sm:w-48 shrink-0">
                            <Button
                              chain={network}
                              disabled={faucetBusy}
                              onClick={() => claimFaucet(selectedToken)}
                              buttonText={faucetBusy ? "…" : selectedToken.rwa ? `Faucet: ${selectedToken.rwa.faucet} ${selectedToken.symbol}` : `Get ${network === "tempo" ? "PathUSD" : selectedToken.symbol} for fees`}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 3. By converting from another network: who it can be paid from. */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                        {"By converting"}
                      </span>
                      <div className="bgBox glass-card p-4 border border-black/5 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-ink text-snow flex items-center justify-center shrink-0">
                            <Icon icon="solar:transfer-vertical-bold" className="text-2xl" />
                          </div>
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="font-bold text-base truncate">
                              {`Get ${selectedToken?.symbol ?? "it"} by converting`}
                            </span>
                            <span className="text-xs opacity-60">
                              {"Pay from Bitcoin or another network"}
                            </span>
                          </div>
                        </div>
                        {/* The networks it can be paid from. */}
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {[
                              { key: "bitcoin", logo: bitcoinNetwork.networkLogo },
                              ...["ethereum", "solana", "base", "hyperliquid", "robinhood", "arbitrum"].map((n) => ({ key: n, logo: `/assets/networks/${n}.png` })),
                            ]
                              .filter((n) => n.key !== network)
                              .map((n) => (
                                <span key={n.key} title={n.key.charAt(0).toUpperCase() + n.key.slice(1)} className="w-7 h-7 rounded-full overflow-hidden border-2 border-paper bg-paper relative shrink-0">
                                  <Image src={n.logo} alt={n.key} fill unoptimized={typeof n.logo === "string"} className="object-cover" />
                                </span>
                              ))}
                          </div>
                          <span className="text-[11px] opacity-60">
                            {`Arrives as ${selectedToken?.symbol ?? "the token"} at this address`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={receiveByConvert}
                          className="w-full flex items-center justify-center gap-2 rounded-lg bg-ink text-snow py-3 text-sm font-medium hover:bg-pitch transition-colors"
                        >
                          <Icon icon="solar:transfer-horizontal-bold" />
                          {"Open Convert"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="flex flex-col gap-4 py-4"
                >
                  <div className="bgBox glass-card p-4 border border-black/5 rounded-2xl">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                        {t("text116")}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-60 group relative">
                          <Icon icon="solar:wallet-linear" />
                          <span>
                            {fmtAmount(maxSendableBalance)}{" "}
                            {selectedToken?.symbol}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col w-full">
                       <div className="flex flex-col w-full">
  <input
    type="text"
    inputMode="decimal"

    pattern={`^\\d*(\\.\\d{0,${selectedToken?.decimals || 8}})?$`}
    value={sendAmount}
    onChange={(e) => {
      const val = e.target.value;
      const maxDecimals = selectedToken?.decimals || 8;
      const regex = new RegExp(`^\\d*(\\.\\d{0,${maxDecimals}})?$`);
      
      if (regex.test(val) || val === "") {
        setSendAmount(val);
      }
    }}
    placeholder="0"
    className={`w-full bg-transparent text-2xl sm:text-3xl font-bold outline-none tracking-tight ${colorFlip}`}
  />
</div>
                      </div>

                    
                      <button
                        onClick={() => setModalStep("selectToken")}
                        className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 glass-card rounded-full shadow-md bg-white/60 border border-white/20 hover:bg-white/80 active:scale-95 transition-all group"
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden shadow-sm relative flex items-center justify-center bg-black/5 shrink-0">
                          {selectedToken?.logo && !brokenLogoKeys.has(selectedToken.mint || selectedToken.symbol) ? (
                            <Image
                              src={selectedToken.logo}
                              alt={selectedToken.symbol}
                              fill
                              className="object-cover"
                              unoptimized={
                                typeof selectedToken.logo === "string"
                              }
                              onError={() => markLogoBroken(selectedToken.mint || selectedToken.symbol)}
                            />
                          ) : (
                            <span className="font-bold text-[10px] opacity-50">
                              {selectedToken?.symbol?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-sm sm:text-base tracking-tight">
                          {selectedToken?.symbol}
                        </span>
                        <Icon
                          icon="solar:alt-arrow-down-linear"
                          className="text-sm opacity-40 group-hover:opacity-100 transition-opacity"
                        />
                      </button>
                    </div>

                   <div className="flex flex-col gap-2 mt-4 w-full">
                   
                      <div className="flex justify-between items-center w-full">
                        <div className="flex flex-col flex-1">
                          {(() => {
                            const activeNum = parseFloat(sendAmount) || 0;
                            if (activeNum > 0 && selectedToken) {
                              const tokenPriceUsd = parseFloat(selectedToken.price || "0");
                              const usdVal = activeNum * tokenPriceUsd;
                              if (usdVal > 0) {
                                return (
                                  <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight">
                                    ≈ ${usdVal.toFixed(2)}
                                  </span>
                                );
                              }
                            }
                            return <span />;
                          })()}
                        </div>

<div className="flex gap-1.5 shrink-0 ml-2">
                          {[0.25, 0.5, 1].map((pct) => {
                            // Total deducted for a p% click is p% of the balance, not the
                            // full balance — the network fee comes off that scaled amount, not off the full
                            // balance before scaling, mirroring the fix applied to Stake.
                            // Previously this fee reservation only kicked in at pct === 1
                            // (Max); a 25%/50% click reserved nothing at all, so for a
                            // native-currency send — where the network fee is paid out of
                            // this same balance — even a partial click could still leave less
                            // than expected once the fee actually posted.
                            let targetAmount = maxSendableBalance * pct;

                            if (network !== "solana" && selectedToken?.isNative) {
                              const fee = estimatedFee?.fetched ? (estimatedFee[estimatedFee.selectedFee || "medium"] || 0) : 0;
                              targetAmount = Math.max(0, maxSendableBalance * pct - fee);
                            }

                            const decimalsCount = selectedToken?.decimals || 8;
                            const factor = Math.pow(10, decimalsCount);
                            targetAmount = Math.max(0, Math.floor(targetAmount * factor) / factor);
                            const targetStr = targetAmount > 0 ? targetAmount.toString() : "";
                            
                            return (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setSendAmount(targetStr)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95 ${
                                  sendAmount === targetStr && targetAmount > 0
                                    ? "bg-black text-white shadow-lg shadow-black/20"
                                    : "bg-black/5 hover:bg-black/10 opacity-60"
                                }`}
                              >
                                {pct === 1 ? t("text42") : `${pct * 100}%`}
                              </button>
                            );
                          })}
                        </div>
                            </div>

                    </div>

                  </div>

                  {activeTab === "send" && (
                    <>
                      {sendCoinAmountError && (
                        <p className="text-[10px] text-red-500 -mt-2 italic px-1">
                          {sendCoinAmountError}
                        </p>
                      )}
                      <div className="flex flex-col gap-2">
                        <div className="bgBox glass-card p-3 border border-black/5 rounded-xl">
                          <input
                            type="text"
                            value={sendAddress}
                            onChange={(e) => setSendAddress(e.target.value)}
                            placeholder={t("text117")}
                            className="w-full bg-transparent lg:text-sm font-bold outline-none placeholder:text-gray-400"
                          />
                        </div>
                        {recipientAddressError && (
                          <span className="text-[10px] text-red-500 italic px-1">
                            {recipientAddressError}
                          </span>
                        )}
                      </div>

         
                    
              
                        <AnimatePresence>
                    {parseFloat(activeAmountStr) > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col gap-1.5 mt-2 px-3 py-3 bgBox glass-card border border-black/5 rounded-xl overflow-hidden"
                      >
                        <div className="flex justify-between items-center text-xs opacity-60">
                          <span>{"Send Amount"}</span>
                          <span className="font-mono">{parseFloat(activeAmountStr).toString()} {selectedToken?.symbol || currencyTicker}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs opacity-60">
                          <span className="flex items-center gap-1">

                            {"Network Fee"}
                          </span>
                          <span className="font-mono">
                            {network === "solana" ? (
                              activeTab === "send" && (!sendAddress || sendAddress.length < 32)
                                ? ("Need Enter address")
                                : "0"
                            ) : network === "ethereum" && selectedToken?.isNative === false ? (
                              // A token transfer's real gas cost differs by contract, so this
                              // is a live per-transaction estimate (see estimateErc20SendFee),
                              // not the flat 21,000-gas figure estimatedFee assumes.
                              isEstimatingErc20Fee
                                ? "..."
                                : erc20SendFee !== null
                                  ? `${parseFloat(erc20SendFee.toFixed(8))} ${currencyTicker}`
                                  : activeTab === "send" && (!sendAddress || !ethereumNetwork.isValidAddress(sendAddress))
                                    ? ("Need Enter address")
                                    : "0"
                            ) : (
                              estimatedFee?.fetched ? `${estimatedFee[estimatedFee.selectedFee || "medium"]} ${currencyTicker}` : "0"
                            )}
                          </span>
                        </div>
                        <div className="w-full h-[1px] bg-black/5 my-0.5" />
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span>{"Total Deducted"}</span>
                          <span className={`font-mono`}>
                            {network === "solana" ? (
                              `${parseFloat(activeAmountStr).toString()} ${selectedToken?.symbol || currencyTicker}`
                            ) : (network === "ethereum" || network === "tempo" || network === "hyperliquid" || network === "robinhood" || network === "base" || network === "arbitrum") && selectedToken?.isNative === false ? (
                              // The token balance only ever drops by the amount sent — the
                              // network fee (ETH gas, or Tron's bandwidth/TRX burn) is paid
                              // separately, not from the token.
                              `${parseFloat(activeAmountStr).toString()} ${selectedToken?.symbol}`
                            ) : (
                              `${parseFloat((parseFloat(activeAmountStr) + (estimatedFee?.fetched ? estimatedFee[estimatedFee.selectedFee || "medium"] : 0)).toFixed(selectedToken?.decimals || 8))} ${currencyTicker}`
                            )}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                    </>
                  )}
                  {activeTab == "send" && (
                    <div className="bgBox glass-card p-3 border border-black/5 rounded-xl mt-2">
                      <p className="text-[11px] font-medium opacity-60 leading-tight">
                        {t("text31")}
                      </p>
                    </div>
                  )}
                </form>
                )}
                </div>
              </motion.div>
            )}

           
            {modalStep === "selectToken" && (
              <motion.div
                key="token-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full min-h-0"
              >
                <div className="flex flex-col gap-0 pb-5">
                  <h2 className="text-xl font-bold">
                    {"Select Token"}
                  </h2>
                  <p className="text-[12px] opacity-70">
                    {"Choose an asset to manage from the list below."}
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
                      "Search symbol or name"
                    }
                    value={tokenSearchQuery}
                    onChange={(e) => setTokenSearchQuery(e.target.value)}
                    className="w-full bg-black/5 border border-black/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-black/50 focus:bg-black/10 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-3 pb-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar -mx-1 px-1">
                  {isLoadingTokens || isMetaEnriching ? (
                    [...Array(6)].map((_, i) => (
                      <div
                        key={`skeleton-modal-${i}`}
                        className="w-full shrink-0 p-4 border border-transparent rounded-xl flex items-center justify-between gap-3 animate-pulse bg-black/5"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-black/10 shrink-0" />
                          <div className="flex flex-col gap-2">
                            <div className="h-4 w-12 bg-black/10 rounded" />
                            <div className="h-2 w-20 bg-black/10 rounded" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : filteredTokens.length > 0 ? (
                    filteredTokens.map((token: any) => {
                      const isSelected = selectedToken?.symbol === token.symbol;
                      const userBal = getUserBalance(
                        token.mint || token.symbol,
                        token.isNative,
                        "confirmed",
                      );
                      const tokenPriceUsd = parseFloat(token.price || "0");
                      const totalUSD = userBal * tokenPriceUsd;

                      return (
                        <button
                          key={token.mint || token.symbol}
                          type="button"
                          onClick={() => {
                            setSelectedToken(token);
                            setTokenSearchQuery("");
                            setModalStep("form");
                          }}
                          className={`w-full shrink-0 text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                            isSelected
                              ? "border-ink bg-ink! text-snow! shadow-none!"
                              : "border-black/5 hover:bg-black/5"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm relative shrink-0 flex items-center justify-center bg-black/5">
                              {token.logo && !brokenLogoKeys.has(token.mint || token.symbol) ? (
                                <Image
                                  src={token.logo}
                                  alt={token.symbol}
                                  fill
                                  className="object-cover"
                                  unoptimized={typeof token.logo === "string"}
                                  onError={() => markLogoBroken(token.mint || token.symbol)}
                                />
                              ) : (
                                <span className="font-bold text-sm opacity-50">
                                  {token.symbol?.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col leading-tight min-w-0">
                              <span
                                className={`font-bold lg:text-sm ${isSelected ? "" : "opacity-80"}`}
                              >
                                {token.symbol}
                                {token.rwa?.about && (
                                  <a
                                    href={token.rwa.about}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title={"About this asset on rwa.xyz"}
                                    className="ml-1.5 inline-flex align-middle opacity-40 hover:opacity-100"
                                  >
                                    <Icon icon="solar:info-circle-linear" className="text-[14px]" />
                                  </a>
                                )}
                              </span>
                              <span className="text-[11px] opacity-60 break-words">
                                {token.name}
                              </span>
                              {token.rwa?.description && (
                                <span className="text-[11px] opacity-45 break-words">
                                  {token.rwa.description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            {userBal > 0 && (
                              <div className="flex flex-col items-end leading-tight">
                                <span
                                  className={`font-bold text-sm tracking-tight ${isSelected ? "text-snow" : "text-black"}`}
                                >
                                  {fmtAmount(userBal)}
                                </span>
                                {totalUSD > 0 && (
                                  <span className="text-[10px] font-bold opacity-40">
                                    ≈${totalUSD.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}
                            {isSelected && (
                              <FaCheckCircle className="text-[18px] text-snow shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40 gap-3">
                      <Icon
                        icon="solar:box-minimalistic-linear"
                        className="text-5xl"
                      />
                      <p className="text-sm font-bold uppercase tracking-widest text-center px-4">
                        {"No tokens found"}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

       
        <div className="px-6 py-6 border-t border-black/5 bg-white">
          {modalStep === "form" ? (
            <div className="flex flex-row justify-center gap-3 w-full">
              <div className="flex-1">
                <ButtonContrast
                  onClick={handleCloseModal}
                  buttonText={activeTab === "receive" ? t("text128") : t("text55")}
                />
              </div>
            {activeTab !== "receive" && (
            <div className="flex-1">
                <Button
                  buttonText={t("text123")}
                  chain={network}
                  disabled={!IsValidForm}
                  onClick={handleConfirmSend}
                />
              </div>
            )}
            </div>
          ) : (
            <div className="flex justify-center w-full">
              <div className="w-full sm:flex-1">
                <ButtonContrast
                  buttonText={"Back"}
                  onClick={() => setModalStep("form")}
                />
              </div>
            </div>
          )}
        </div>
      </AnimatedModal>

      <InformationPopUp
        isOpen={isMainInfoOpen}
        onClose={() => setIsMainInfoOpen(false)}
        title={"Portfolio"}
        image={null}
        description={
          "Commonly used network tokens are always shown for your convenience. Your other portfolio assets appear once you hold a balance."
        }
      />
    </div>
  );
};

export default Assets;
