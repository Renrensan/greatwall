"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import ButtonContrast from "./ButtonContrast";
import Button from "./Button";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useOnboarding } from "@/components/providers/onboarding-provider";
import { savePendingTransaction, getPendingTransaction, clearPendingTransaction } from "@/lib/onboarding-storage";

import {
  bitcoin,
  ethereum,
  hedera,
  paseo,
  polkadot,
  solana,
  temponetwork,
  hyperliquid,
  robinhood,
  base,
  arbitrum,
  usdc,
} from "..";
import { motion, AnimatePresence } from "framer-motion";

import { useTranslations } from "next-intl";
import { SupportedChain, useNetwork } from "@/app/network-provider";
import { useHederaWallet } from "@/components/hedera/hedera-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { usePolkadotWallet } from "@/components/polkadot/polkadot-provider";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaSortDown,
  FaSortUp,
} from "react-icons/fa";
import { Icon } from "@iconify/react";
import { AnimatedModal } from "./AnimatedModal";
import InformationPopUp from "./InformationPopUp";
import { getAddressErrorMessageKey } from "@/subcomponents/wallet-connect/address-validation";
import {
  SOLANA_NATIVE_MINT,
  USDC_MINT,
  USDC_MINT_DEVNET,
  USDT_MINT,
} from "@/components/solana/config/constants";
import {
  EXISTENTIAL_DEPOSIT_BUFFER,
  POLKADOT_EXISTENTIAL_DEPOSIT,
} from "@/components/polkadot/config/constants";

// /api/transaction/method returns banks and e-wallets in one flat list with no type/category
// field to distinguish them (verified directly against the live backend — same 3 keys,
// bankCode/bankName/maxAmountTransfer, for both). Categorization here is by exact bank name
// match, not a substring check — "DANA" as a substring would otherwise also match
// "BANK DANAMON". Also deliberately not a bankCode-range check: LinkAja itself appears
// twice, once at code 911 (inside the ordinary bank-code range) and again as "LINKAJA
// DIRECT" at 1014 (inside the e-wallet code range), so code range alone isn't reliable.
const EWALLET_NAMES = new Set([
  "OVO",
  "GOPAY",
  "DANA",
  "SHOPEEPAY",
  "LINKAJA",
  "LINKAJA DIRECT",
]);

function isEwallet(bankName: string): boolean {
  return EWALLET_NAMES.has((bankName || "").trim().toUpperCase());
}

const LEGACY_BANK_CODES: Record<string, string> = {
  "014": "ID_BCA",
  "009": "ID_BNI",
  "002": "ID_BRI",
  "008": "ID_MANDIRI",
  "013": "ID_PERMATA",
};

// How many decimal places a fee value needs to show its significant digits, derived
// straight from the value's own magnitude rather than a fixed/token-decimals count — see
// BuyToken.tsx's identical helper for why: round-tripping toFixed(N) through parseFloat for
// display re-introduces JS's exponential notation for anything below 1e-6.
function decimalsForFeeValue(value: number, minDecimals = 2): number {
  if (!value || !isFinite(value)) return minDecimals;
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  return Math.max(minDecimals, -exponent + 1);
}

const Assets = () => {
  const { locale, network } = useParams<{
    locale: string;
    network: SupportedChain;
  }>();

  const colorFlip = "text-black";
  const t = useTranslations("All");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startOnboarding } = useOnboarding();

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

  let decimals,
    connected,
    address,
    sendTokenTo,
    balance,
    estimatedFee,
    setFeeSelection,
    currencyTicker,
    networkName,
    selfCustodyParameter,
    price,
    networkExplorer;
let checkAtaRequired: any, verifiedTokensData: any, liveTokenPrices: any;


  if (network == "bitcoin") {
    networkName = bitcoinNetwork.networkName;
    connected = bitcoinNetwork.connected;
    networkExplorer = bitcoinNetwork.networkExplorer;
    address = bitcoinNetwork.address;
    currencyTicker = bitcoinNetwork.currencyTicker;
    sendTokenTo = bitcoinNetwork.sendTokenTo;
    balance = bitcoinNetwork.balance;
    estimatedFee = bitcoinNetwork.estimatedFee;
    setFeeSelection = bitcoinNetwork.setFeeSelection;
    selfCustodyParameter = bitcoinNetwork.selfCustodyParameter;
    price = bitcoinNetwork.price;
    decimals = bitcoinNetwork.decimals;
  } else if (network == "hedera") {
    networkName = hederaNetwork.networkName;
    connected = hederaNetwork.connected;
    address = hederaNetwork.address;
    currencyTicker = hederaNetwork.currencyTicker;
    sendTokenTo = hederaNetwork.sendTokenTo;
    balance = hederaNetwork.balance;
    estimatedFee = hederaNetwork.estimatedFee;
    setFeeSelection = hederaNetwork.setFeeSelection;
    selfCustodyParameter = hederaNetwork.selfCustodyParameter;
    price = hederaNetwork.price;
    networkExplorer = hederaNetwork.networkExplorer;
    decimals = hederaNetwork.decimals;
  } else if (network == "ethereum") {
    networkName = ethereumNetwork.networkName;
    connected = ethereumNetwork.connected;
    address = ethereumNetwork.address;
    currencyTicker = ethereumNetwork.currencyTicker;
    sendTokenTo = ethereumNetwork.sendTokenTo;
    balance = ethereumNetwork.balance;
    estimatedFee = ethereumNetwork.estimatedFee;
    setFeeSelection = ethereumNetwork.setFeeSelection;
    selfCustodyParameter = ethereumNetwork.selfCustodyParameter;
    price = ethereumNetwork.price;
    networkExplorer = ethereumNetwork.networkExplorer;
    decimals = ethereumNetwork.decimals;
  } else if (network == "polkadot") {
    networkName = polkadotNetwork.networkName;
    connected = polkadotNetwork.connected;
    address = polkadotNetwork.address;
    currencyTicker = polkadotNetwork.currencyTicker;
    sendTokenTo = polkadotNetwork.sendTokenTo;
    balance = polkadotNetwork.balance;
    estimatedFee = polkadotNetwork.estimatedFee;
    setFeeSelection = polkadotNetwork.setFeeSelection;
    selfCustodyParameter = polkadotNetwork.selfCustodyParameter;
    price = polkadotNetwork.price;
    networkExplorer = polkadotNetwork.networkExplorer;
    decimals = polkadotNetwork.decimals;
  } else if (network == "tempo") {
    networkName = tempoNetwork.networkName;
    connected = tempoNetwork.connected;
    address = tempoNetwork.address;
    currencyTicker = tempoNetwork.currencyTicker;
    sendTokenTo = tempoNetwork.sendTokenTo;
    balance = tempoNetwork.balance;
    estimatedFee = tempoNetwork.estimatedFee;
    setFeeSelection = tempoNetwork.setFeeSelection;
    selfCustodyParameter = tempoNetwork.selfCustodyParameter;
    price = tempoNetwork.price;
    networkExplorer = tempoNetwork.networkExplorer;
    decimals = tempoNetwork.decimals;
  } else if (network == "hyperliquid") {
    networkName = hyperliquidNetwork.networkName;
    connected = hyperliquidNetwork.connected;
    address = hyperliquidNetwork.address;
    currencyTicker = hyperliquidNetwork.currencyTicker;
    sendTokenTo = hyperliquidNetwork.sendTokenTo;
    balance = hyperliquidNetwork.balance;
    estimatedFee = hyperliquidNetwork.estimatedFee;
    setFeeSelection = hyperliquidNetwork.setFeeSelection;
    selfCustodyParameter = hyperliquidNetwork.selfCustodyParameter;
    price = hyperliquidNetwork.price;
    networkExplorer = hyperliquidNetwork.networkExplorer;
    decimals = hyperliquidNetwork.decimals;
  } else if (network == "robinhood") {
    networkName = robinhoodNetwork.networkName;
    connected = robinhoodNetwork.connected;
    address = robinhoodNetwork.address;
    currencyTicker = robinhoodNetwork.currencyTicker;
    sendTokenTo = robinhoodNetwork.sendTokenTo;
    balance = robinhoodNetwork.balance;
    estimatedFee = robinhoodNetwork.estimatedFee;
    setFeeSelection = robinhoodNetwork.setFeeSelection;
    selfCustodyParameter = robinhoodNetwork.selfCustodyParameter;
    price = robinhoodNetwork.price;
    networkExplorer = robinhoodNetwork.networkExplorer;
    decimals = robinhoodNetwork.decimals;
  } else if (network == "base") {
    networkName = baseNetwork.networkName;
    connected = baseNetwork.connected;
    address = baseNetwork.address;
    currencyTicker = baseNetwork.currencyTicker;
    sendTokenTo = baseNetwork.sendTokenTo;
    balance = baseNetwork.balance;
    estimatedFee = baseNetwork.estimatedFee;
    setFeeSelection = baseNetwork.setFeeSelection;
    selfCustodyParameter = baseNetwork.selfCustodyParameter;
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
    setFeeSelection = arbitrumNetwork.setFeeSelection;
    selfCustodyParameter = arbitrumNetwork.selfCustodyParameter;
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
    setFeeSelection = solanaNetwork.setFeeSelection;
    selfCustodyParameter = solanaNetwork.selfCustodyParameter;
    price = solanaNetwork.price;
    networkExplorer = solanaNetwork.networkExplorer;
   decimals = solanaNetwork.decimals;
    checkAtaRequired = solanaNetwork.checkAtaRequired;
    verifiedTokensData = solanaNetwork.verifiedTokensData;
    liveTokenPrices = solanaNetwork.liveTokenPrices;
  }

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

  const isTestnetActive = useMemo(() => {
    switch (network) {
      case "bitcoin":
        return !bitcoinMainnet;
      case "hedera":
        return !hederaMainnet;
      case "ethereum":
        return !ethereumMainnet;
      case "solana":
        return !solanaMainnet;
      case "polkadot":
        return !polkadotMainnet;
      case "tempo":
        return !tempoMainnet;
      case "hyperliquid":
        return !hyperliquidMainnet;
      case "robinhood":
        return !robinhoodMainnet;
      case "base":
        return !baseMainnet;
      case "arbitrum":
        return !arbitrumMainnet;
      default:
        return false;
    }
  }, [
    network,
    bitcoinMainnet,
    hederaMainnet,
    ethereumMainnet,
    solanaMainnet,
    polkadotMainnet,
    tempoMainnet,
    hyperliquidMainnet,
    robinhoodMainnet,
    baseMainnet,
    arbitrumMainnet,
  ]);

  const hasTestnetCaution = isTestnetActive;
  const hasActiveMismatch = false;

  const dynamicMessageText = useMemo(() => {
    if (hasTestnetCaution) {
      return locale == "id"
        ? "Perhatian: Kamu sedang menggunakan testnet. Token di jaringan ini hanya untuk uji coba dan tidak memiliki nilai nyata."
        : "Caution: You are currently on testnet. Tokens on this network are for testing only and have no real value.";
    }
    return "";
  }, [hasTestnetCaution, locale]);

  const handleSwitchCurrent = () => {
    if (hasTestnetCaution) {
      switch (network) {
        case "bitcoin":
          setBitcoinMainnet(true);
          break;
        case "hedera":
          setHederaMainnet(true);
          break;
        case "ethereum":
          setEthereumMainnet(true);
          break;
        case "solana":
          setSolanaMainnet(true);
          break;
        case "polkadot":
          setPolkadotMainnet(true);
          break;
        case "tempo":
          setTempoMainnet(true);
          break;
        case "hyperliquid":
          setHyperliquidMainnet(true);
          break;
        case "robinhood":
          setRobinhoodMainnet(true);
          break;
        case "base":
          setBaseMainnet(true);
          break;
        case "arbitrum":
          setArbitrumMainnet(true);
          break;
      }
    }
  };

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

    if ((network === "solana" || network === "ethereum" || network === "hedera" || network === "polkadot" || network === "tempo" || network === "hyperliquid" || network === "robinhood" || network === "base" || network === "arbitrum") && (balance as any)?.tokens) {
      const token = (balance as any).tokens.find(
        (t: any) => t.mint === mintOrSymbol || t.symbol === mintOrSymbol,
      );
      return Math.max(0, token?.amount || 0);
    }
    return 0;
  };

const allTokens = useMemo(() => {
    if (network === "solana") {
      const tokenMap = new Map();
      
    
      const getPrice = (tokenMint: string, tokenSymbol: string, mainnetMint: string) =>
        liveTokenPrices?.[tokenMint]?.usdPrice ||
        liveTokenPrices?.[tokenMint]?.price ||
        liveTokenPrices?.[mainnetMint]?.usdPrice ||
        liveTokenPrices?.[mainnetMint]?.price ||
        liveTokenPrices?.[tokenSymbol]?.usdPrice ||
        liveTokenPrices?.[tokenSymbol]?.price ||
        liveTokenPrices?.[tokenSymbol.toLowerCase()]?.usdPrice ||
        0;

      const getChange = (tokenMint: string, tokenSymbol: string, mainnetMint: string) =>
        liveTokenPrices?.[tokenMint]?.priceChange24h ||
        liveTokenPrices?.[mainnetMint]?.priceChange24h ||
        liveTokenPrices?.[tokenSymbol]?.priceChange24h ||
        0;

   
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

        const mainnetMintFallback = mint;


        if (isTestnetActive && !isNative) {
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
          mainnetMintFallback,
          isNative,
        };
      };

      const nativeMeta = resolveMetadata("SOL", true);
      tokenMap.set(nativeMeta.mint, {
        ...nativeMeta,
        price: getPrice(nativeMeta.mint, nativeMeta.symbol, nativeMeta.mainnetMintFallback).toString(),
        change: `${getChange(nativeMeta.mint, nativeMeta.symbol, nativeMeta.mainnetMintFallback) >= 0 ? "+" : ""}${getChange(nativeMeta.mint, nativeMeta.symbol, nativeMeta.mainnetMintFallback).toFixed(2)}%`,
        metaLoading: false,
      });


      const backendTokens = (selfCustodyParameter as any)?.tokens || [];
      backendTokens.forEach((bToken: any) => {
        const backendSymOrMint = (bToken.token || "").trim();
        if (!backendSymOrMint) return;

        const isNative = !!bToken.isNative;
        const meta = resolveMetadata(backendSymOrMint, isNative);

        tokenMap.set(meta.mint, {
          ...meta,
          price: getPrice(meta.mint, meta.symbol, meta.mainnetMintFallback).toString(),
          change: `${getChange(meta.mint, meta.symbol, meta.mainnetMintFallback) >= 0 ? "+" : ""}${getChange(meta.mint, meta.symbol, meta.mainnetMintFallback).toFixed(2)}%`,
          metaLoading: false,
        });
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
            price: getPrice(meta.mint, finalSymbol, meta.mainnetMintFallback).toString(),
            change: `${getChange(meta.mint, finalSymbol, meta.mainnetMintFallback) >= 0 ? "+" : ""}${getChange(meta.mint, finalSymbol, meta.mainnetMintFallback).toFixed(2)}%`,
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
          if (s === "USDC" || m === USDC_MINT_DEVNET || m === USDC_MINT) return 1;
          if (s === "USDT" || m === USDT_MINT) return 2;
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
        // Real live USD price + 24h change fetched in ethereum-provider.tsx's fetchBalance
        // (CoinGecko, by contract address) — "0"/flat only on testnet, where these tokens
        // genuinely have no real market, not as a placeholder.
        price: tok.price ?? "0",
        change: `${(tok.priceChange24h ?? 0) >= 0 ? "+" : ""}${(tok.priceChange24h ?? 0).toFixed(2)}%`,
        // Real logoURI from Uniswap's verified token list (fetchVerifiedTokenLogos), matched
        // by this exact contract address — null (→ letter-avatar fallback) when the list
        // doesn't carry this token, on testnet, or if the load itself fails (see onError below).
        logo: tok.logo ?? null,
        mint: tok.mint,
        decimals: tok.decimals,
        isNative: false,
      }));

      return [nativeEntry, ...heldTokens];
    } else if (network === "hedera") {
      // Hedera's mirror node enumerates every HTS token an account holds
      // (fetchHeldHtsTokens); hedera-provider.tsx's enrichHeldTokens then filters that down to
      // just the ones HashPack's own feed marks dueDiligenceComplete, so this list (like
      // Ethereum's/Solana's) is already verified-only by the time it lands here — unless that
      // feed itself is unreachable, in which case it falls back to showing everything held.
      const nativeEntry = {
        name: networkName,
        symbol: currencyTicker,
        price: ((price as any)?.usd || 0).toString(),
        change: "0.00%",
        logo: hedera,
        mint: null,
        decimals,
        isNative: true,
      };

      const heldTokens = ((balance as any)?.tokens || []).map((tok: any) => ({
        name: tok.name,
        symbol: tok.symbol,
        // Real USD price from HashPack's own price feed (hashpack-prices.ts) — "0" only when
        // that token isn't in HashPack's feed or the feed itself was unreachable.
        price: tok.price ?? "0",
        change: "0.00%",
        // Real icon URL — HashPack's own feed first, DavinciGraph's icon API as a fallback if
        // that feed call fails outright (see enrichHeldTokens in hedera-provider.tsx) — null
        // (→ letter-avatar fallback) only once both have nothing for this token.
        logo: tok.logo ?? null,
        mint: tok.mint,
        decimals: tok.decimals,
        isNative: false,
      }));

      return [nativeEntry, ...heldTokens];
    } else if (network === "polkadot") {
      // Same "show everything held" scope as Hedera, but discovered differently: Asset Hub's
      // pallet-assets has no single "list this account's holdings" call, so
      // fetchHeldAssetHubTokens enumerates every registered asset's on-chain metadata and
      // checks the account's balance against each, live — no hardcoded asset IDs (see that
      // file's comment for why guessing IDs here specifically was worth avoiding). Real
      // logo/price for anything in Subscan's maintained registry (asset-hub-registry.ts,
      // mainnet only) — null/"0" for a held asset that registry doesn't carry.
      const localName = isTestnetActive ? "Paseo" : networkName;

      const nativeEntry = {
        name: localName,
        symbol: currencyTicker,
        price: ((price as any)?.usd || 0).toString(),
        change: "0.00%",
        logo: isTestnetActive ? paseo : polkadot,
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
        logo: robinhood,
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
        logo: base,
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
        logo: arbitrum,
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
    liveTokenPrices,
    price,
    networkName,
    currencyTicker,
    decimals,
    balance,
    connected,
    selfCustodyParameter,
    isTestnetActive,
  ]);

  // `balance.fetched` means the same thing on every network (has the first real balance
  // value arrived), so this shouldn't be Solana-only — it was just never generalized when
  // built. This is exactly the skeleton state Polkadot needs while its Asset Hub RPC
  // connection is still resolving, which currently has zero visual feedback.
  const isLoadingTokens = connected && !(balance as any)?.fetched;

  // Gates the *whole* list, not per-row: showing some rows resolved and others still
  // skeleton looked broken. Wait until every token's real metadata has arrived, then
  // reveal the list all at once.
  const isMetaEnriching = allTokens.some((t: any) => t.metaLoading);

  const usdRate = price ? (price as any).usd : 0;
  const idrRate = price ? (price as any).idr : 0;
  const idrPerUsdRatio = usdRate > 0 ? idrRate / usdRate : 0;

  const [isMainInfoOpen, setIsMainInfoOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [isValidRecipient, setIsValidRecipient] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [selectedMethodLabel, setSelectedMethodLabel] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "withdraw">("send");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [sendAmount, setSendAmount] = useState("");

  const [selectedMethod, setSelectedMethod] = useState("");
  const [selectedMethodType, setSelectedMethodType] = useState("");

  const [sendAddress, setSendAddress] = useState("");
  const [copied, setCopied] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showWithdrawLimitModal, setShowWithdrawLimitModal] = useState(false);
  const [txid, setTxId] = useState<string | null>(null);

  const [recipientAddressError, setRecipientAddressError] = useState("");
  const [sendCoinAmountError, setSendCoinAmountError] = useState("");
  const [IsValidForm, setIsValidForm] = useState(false);

  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [modalStep, setModalStep] = useState<"form" | "selectToken">("form");
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");

  const [gaslessQuote, setGaslessQuote] = useState<any>(null);
  const [isFetchingGasless, setIsFetchingGasless] = useState(false);

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

  const currentTokenConstraints = useMemo(() => {
    if (
      !selfCustodyParameter ||
      !(selfCustodyParameter as CustodyParams).tokens
    )
      return null;

    const tokens = (selfCustodyParameter as CustodyParams).tokens;
    const targetSymbol = selectedToken?.symbol || currencyTicker || "";

    return (
      tokens.find((t: any) => {
        const backendToken = (t.token || "").trim().toUpperCase();
        const frontendSymbol = targetSymbol.trim().toUpperCase();

        const isSymbolMatch = backendToken === frontendSymbol;
        const isMintMatch =
          t.token && selectedToken?.mint && t.token === selectedToken.mint;

        return isSymbolMatch || isMintMatch;
      }) || null
    );
  }, [selfCustodyParameter, selectedToken, currencyTicker]);

  const isTokenWithdrawUnavailable = !currentTokenConstraints?.withdraw;

// Solana sends are signed by the wallet (paradapp's relayer was removed): no relayer quote.
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

  const withdrawButtonText = useMemo(() => {
    if (isTokenWithdrawUnavailable) return t("text295");
    if (isSubmitting) return t("text10");
    return t("text56");
  }, [isTokenWithdrawUnavailable, isSubmitting, t]);

const maxSendableBalance = useMemo(() => {
    if (!selectedToken) return 0;

    const userBalConfirmed = getUserBalance(
      selectedToken.mint || selectedToken.symbol,
      selectedToken.isNative,
      "confirmed",
    );


    return Math.max(0, userBalConfirmed);
  }, [selectedToken, balance, network, connected]);

const [estimateWithdraw, setEstimateWithdraw] = useState<{
    netIdr: string;
    netUsd: string;
  }>({ netIdr: "", netUsd: "" });

  const [feeDetails, setFeeDetails] = useState<any[]>([]);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(0);

  const [bankMethods, setBankMethods] = useState<any[]>([]);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const res = await fetch("/api/transaction/method");
        const json = await res.json();
        if (json.statusCode === 200 && Array.isArray(json.data)) {
          setBankMethods(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch bank methods:", err);
      }
    };
    fetchMethods();
  }, []);

  const selectedBankLimit = useMemo(() => {
    const bank = bankMethods.find((b) => b.bankCode === selectedMethod);
    return bank ? bank.maxAmountTransfer : null;
  }, [bankMethods, selectedMethod]);

  const filteredBankMethods = useMemo(() => {
    const query = bankSearchQuery.trim().toLowerCase();
    if (!query) return bankMethods;
    return bankMethods.filter(
      (bank) =>
        bank.bankName?.toLowerCase().includes(query) ||
        bank.bankCode?.toLowerCase().includes(query),
    );
  }, [bankMethods, bankSearchQuery]);

  // Split the search-filtered pool into the two categories the backend doesn't separate
  // itself — see isEwallet's comment for why this is an exact-name match, not a range/
  // substring check.
  const filteredBanks = useMemo(
    () => filteredBankMethods.filter((bank) => !isEwallet(bank.bankName)),
    [filteredBankMethods],
  );
  const filteredEwallets = useMemo(
    () => filteredBankMethods.filter((bank) => isEwallet(bank.bankName)),
    [filteredBankMethods],
  );

  // Clear the search whenever the dropdown closes, regardless of how — toggling the
  // trigger, selecting a bank — so it never reopens still filtered from last time.
  useEffect(() => {
    if (!dropdownOpen) setBankSearchQuery("");
  }, [dropdownOpen]);

  const exceedsBankLimit = useMemo(() => {
    if (!selectedBankLimit) return false;
    const amtNum = parseFloat(withdrawAmount) || 0;
    return (amtNum * exchangeRate) > selectedBankLimit;
  }, [selectedBankLimit, withdrawAmount, exchangeRate]);

  // Withdraw is the mirror of the buy-side deductedAmount convention: the fee is expressed
  // in whichever currency the user actually receives at the end of the transaction. Buying
  // deducts fees from the token you receive, so PERCENT fees there are token-denominated;
  // withdrawing deducts fees from the IDR you receive, so PERCENT fees here (Platform Fee,
  // Slippage Tolerance, Binance Trade Fee) are IDR-denominated instead — confirmed directly
  // against real payloads (grossTokenAmount * tokenPriceIdr - sum(IDR fees) - (network fee
  // token amount * tokenPriceIdr) lands exactly on netIdr). Only the on-chain network fee
  // stays token-denominated, since that's a real cost paid on the chain itself regardless of
  // which direction the trade goes.
  const groupedFees = useMemo(() => {
    if (!feeDetails || feeDetails.length === 0) return null;

    let paymentAndTax = 0; // IDR
    let platform = 0;      // IDR
    let slippage = 0;      // IDR
    let networkCrypto = 0; // Crypto token units

    feeDetails.forEach((fee: any) => {
      const label = (fee.label || "").toLowerCase();
      const type = fee.type || "";
      const deductedAmount = fee.deductedAmount ?? 0;

      if (
        label.includes("network") ||
        type === "DYNAMIC_ON_CHAIN" ||
        type === "TOKEN_FIXED"
      ) {
        networkCrypto += deductedAmount;
      } else if (label.includes("platform")) {
        platform += deductedAmount;
      } else if (
        label.includes("slippage") ||
        label.includes("tolerance") ||
        label.includes("trade")
      ) {
        slippage += deductedAmount;
      } else {
        // Disbursement fee, payment/payout tax, etc.
        paymentAndTax += deductedAmount;
      }
    });

    return { paymentAndTax, platform, slippage, networkCrypto };
  }, [feeDetails]);


const isWithdrawDisabled = useMemo(() => {
    if (isTokenWithdrawUnavailable || isSubmitting) return true;

    const maxAvailable = maxSendableBalance;
    const amtNum = parseFloat(withdrawAmount) || 0;
    

    const fee = network === "solana" ? (gaslessQuote?.calculatedFeeUi || gaslessQuote?.feeDeductedUi || 0) : 0;
    const totalDeductedRaw = amtNum + fee;

    const decimals = selectedToken?.decimals || 8;
    const factor = Math.pow(10, decimals);
    const roundedTotalDeducted = Math.round(totalDeductedRaw * factor) / factor;
    const roundedMaxAvailable = Math.round(maxAvailable * factor) / factor;

    const minWithdraw = currentTokenConstraints?.withdraw?.min || 0;
    const maxWithdraw = currentTokenConstraints?.withdraw?.max || 0;

    return (
      amtNum <= 0 ||
      roundedTotalDeducted > roundedMaxAvailable ||
      (maxWithdraw > 0 && amtNum > maxWithdraw) ||
      !selectedMethod ||
      !accountNumber ||
      !accountHolder ||
      amtNum < minWithdraw ||
      exceedsBankLimit ||
      (network === "solana" && isFetchingGasless)
    );
  }, [
    isTokenWithdrawUnavailable,
    isSubmitting,
    withdrawAmount,
    selectedToken,
    selectedMethod,
    accountNumber,
    accountHolder,
    currentTokenConstraints,
    maxSendableBalance,
    network,
    gaslessQuote,
    isFetchingGasless,
    exceedsBankLimit,
  ]);


  useEffect(() => {
    const amtStr = activeTab === "send" ? sendAmount : withdrawAmount;

    if (network === "solana" && amtStr && selectedToken) {
      const amtNum = parseFloat(amtStr);
      const fee = gaslessQuote?.calculatedFeeUi || gaslessQuote?.feeDeductedUi || 0;
      

      if (amtNum > 0 && fee > 0 && amtNum === maxSendableBalance) {
        const safeMax = Math.max(0, maxSendableBalance - fee);
        const decimalsCount = selectedToken.decimals || 8;
        const factor = Math.pow(10, decimalsCount);
        const adjustedAmount = (Math.floor(safeMax * factor) / factor).toString();
        
        if (activeTab === "send") setSendAmount(adjustedAmount);
        if (activeTab === "withdraw") setWithdrawAmount(adjustedAmount);
      }
    }
  }, [gaslessQuote, sendAmount, withdrawAmount, maxSendableBalance, network, activeTab, selectedToken]);
  useEffect(() => {
    const floatWithdrawAmount = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(floatWithdrawAmount) || floatWithdrawAmount <= 0 || !selectedToken || !network) {
      setEstimateWithdraw({ netIdr: "", netUsd: "" });
      setFeeDetails([]);
      setExchangeRate(0);
      setShowFeeBreakdown(false);
      return;
    }

    const getEstimation = async () => {
      try {
        const params = new URLSearchParams({
          network: network.toUpperCase(),
          token: selectedToken.symbol.toUpperCase(),
          amount: withdrawAmount,
          env: isTestnetActive ? "TESTNET" : "MAINNET",
        });

        const res = await fetch(`/api/estimate-withdraw?${params.toString()}`);
        const result = await res.json();

        if (result?.data?.netIdr && result?.data?.netUsd) {
          setEstimateWithdraw({
            netIdr: result.data.netIdr,
            netUsd: result.data.netUsd,
          });
          setFeeDetails(result.data.feeDetails || []);
          setExchangeRate(result.data.tokenPriceIdr || 0);
        } else {

          setEstimateWithdraw({ netIdr: "", netUsd: "" });
          setFeeDetails([]);
          setExchangeRate(0);
          setShowFeeBreakdown(false);
        }
      } catch (error) {
        console.error("Failed to fetch estimation:", error);

        setEstimateWithdraw({ netIdr: "", netUsd: "" });
        setFeeDetails([]);
        setExchangeRate(0);
        setShowFeeBreakdown(false);
      }
    };

    const timeoutId = setTimeout(() => {
      getEstimation();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    withdrawAmount,
    selectedToken, 
    network,
    isTestnetActive
  ]);




  const referralLink = address
    ? `${window.location.origin}/${locale}/${network}/vault/buy?ref=${address}`
    : "";


useEffect(() => {
    let isSendTokenAmountValid = true;
    let isRecipientAddressValid = true;

    if (connected && selectedToken) {
      const dec = selectedToken.decimals || 8;
      const factor = Math.pow(10, dec);
      
      const feeToDeduct = selectedToken?.isNative && (network as string) !== "solana" && estimatedFee?.fetched
          ? (estimatedFee[estimatedFee.selectedFee || "medium"] || 0)
          : 0;

      // Asset Hub reaps an account whose free balance drops below the existential
      // deposit — reserve it (with a small safety buffer) so a "send everything"
      // amount can never leave the account below that floor.
      const existentialReserve = network === "polkadot" && selectedToken?.isNative
        ? POLKADOT_EXISTENTIAL_DEPOSIT * EXISTENTIAL_DEPOSIT_BUFFER
        : 0;

      const maxAvailableRaw = Math.max(0, maxSendableBalance - feeToDeduct - existentialReserve);
      const maxAvailable = Math.floor(maxAvailableRaw * factor) / factor;
      
      const currentAmountStr = activeTab === "send" ? sendAmount : withdrawAmount;
      const amountNum = parseFloat(currentAmountStr);

      if (amountNum === 0 || !currentAmountStr || isNaN(amountNum)) {
        setSendCoinAmountError("");
        isSendTokenAmountValid = false;
      } else if (network === "solana") {

        const applicableFee = (gaslessQuote?.calculatedFeeUi || gaslessQuote?.feeDeductedUi || 0);

        const totalDeductedRaw = amountNum + applicableFee;
        const totalDeducted = Math.round(totalDeductedRaw * factor) / factor;

        if (totalDeducted > maxAvailable) {
          const formattedFee = parseFloat(applicableFee.toFixed(dec));
          setSendCoinAmountError(`${t("text118")} (Incl. Fee: ${formattedFee})`);
          isSendTokenAmountValid = false;
        } else {
          setSendCoinAmountError("");
        }
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

      if (activeTab === "withdraw") {
        isRecipientAddressValid = true;
      } else if (addr === "") {
        setRecipientAddressError("");
        isRecipientAddressValid = false;
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
    withdrawAmount,
    activeTab,
    estimatedFee,
    gaslessQuote,
    groupedFees,
    network,
    t,
    maxSendableBalance,
  ]);

  const executeWithdrawal = async (tx: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tx),
      });
      const data = await res.json();
      if (res.ok && data.success && data.tx?.id) {
        router.push(`/${network}/vault/transaction/${data.tx.id}`);
      } else if (
        res.status === 429 ||
        (data?.error && (data.error.toLowerCase().includes("too many on progress") || data.error.toLowerCase().includes("limit")))
      ) {
        setShowWithdrawLimitModal(true);
      } else {
        toast.error(data?.error || "Failed to execute withdrawal transaction.");
      }
    } catch (err: any) {
      console.error("Failed to auto-resume withdrawal:", err);
      toast.error(err?.message || "Failed to auto-resume withdrawal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const verifySuccess = searchParams.get("verify_success");
    if (verifySuccess === "true" && address) {
      const pendingTx = getPendingTransaction();
      if (
        pendingTx &&
        pendingTx.type === "WITHDRAWAL" &&
        pendingTx.walletAddress === address
      ) {
        clearPendingTransaction();
        
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete("verify_success");
        const path = window.location.pathname;
        const search = newParams.toString();
        router.replace(`${path}${search ? `?${search}` : ""}`, { scroll: false });
        
        executeWithdrawal(pendingTx);
      }
    }
  }, [searchParams, address, router]);

  const handleWithdraw = () => {
    setActiveTab("withdraw");
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
    setSelectedMethod("");
    setWithdrawAmount("");
    setAccountNumber("");
    setAccountHolder("");
    setValidationMessage("");
    setIsValidRecipient(false);
    setDropdownOpen(false);
    setModalStep("form");
    setGaslessQuote(null);
  };

  const handleConfirmSend = async () => {
    if (!connected) return;

    setShowModal(false);
    try {
      setIsProcessing(true);
      const amount = parseFloat(sendAmount);

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
      } else if (network === "hedera" && selectedToken && selectedToken.isNative === false) {
        // Held HTS balances (see fetchHeldHtsTokens) carry the Hedera token ID in `mint` —
        // sendTokenTo needs it plus decimals to build a token transfer instead of an HBAR one.
        resultTxid = await (sendTokenTo as any)(sendAddress, amount, undefined, {
          tokenId: selectedToken.mint,
          decimals: selectedToken.decimals,
        });
      } else if (network === "polkadot" && selectedToken && selectedToken.isNative === false) {
        // Held Asset Hub balances (see fetchHeldAssetHubTokens) carry the numeric asset ID in
        // `mint` (as a string) — sendTokenTo needs it as a number plus decimals to build an
        // Assets.transfer_keep_alive instead of a Balances one.
        resultTxid = await (sendTokenTo as any)(sendAddress, amount, undefined, {
          assetId: Number(selectedToken.mint),
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

      if (resultTxid) {
        setTxId(resultTxid);
        setShowSuccessModal(true);
        setSendAmount("");
        setSendAddress("");
        setGaslessQuote(null);
      } else {
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error("Transaction Error:", error);
      setShowErrorModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const activeAmountStr = activeTab === "send" ? sendAmount : withdrawAmount;


  if (!connected || !address) {
    return (
      <div className="flex flex-col gap-3 py-4 mb-4 pb-40 lg:pb-32">
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
    <div className="flex flex-col gap-6 pb-40 lg:pb-32 w-full max-w-full min-w-0">
   
      <div className="bgBox glass-card w-full max-w-full min-w-0">
        <div className="flex flex-col gap-5">
          <div className="flex justify-between items-center px-1">
            <div>
              <h2 className="font-bold text-lg sm:text-xl">
                {locale === "en" ? "Vault" : "Brankas"}
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

          <div className="flex flex-col gap-1 max-h-[840px] overflow-y-auto pr-2 custom-scrollbar">
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
                const totalIDR = totalUSD * idrPerUsdRatio;

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

                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`font-bold text-lg sm:text-xl tracking-tight group-hover/item:text-black transition-colors`}
                        >
                          {token.symbol}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold opacity-50">
                            ${totalUSD.toFixed(2)} (Rp{" "}
                            {Number(totalIDR.toFixed(0)).toLocaleString(
                              locale === "id" ? "id-ID" : "en-US",
                            )}
                            )
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
                  {locale === "en"
                    ? "No Tokens Found"
                    : "Tidak Ada Token Ditemukan"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

    
      <div className="bgBox glass-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
          <p className="w-full sm:w-3/4 text-sm text-center sm:text-left">
            {t("text109")} <span className="font-semibold">{t("text111")}</span>{" "}
            {t("text112")}
          </p>
          {address && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(referralLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch (err) {
                  console.error("Failed to copy:", err);
                }
              }}
              className={`w-full sm:w-1/4 py-3 px-2 rounded-xl font-bold text-center transition-all active:scale-95 shadow-lg bg-black text-white shadow-black/20 sm:text-sm text-xs`}
            >
              {copied ? t("text114") : t("text113")}
            </button>
          )}
        </div>
      </div>

   
      <div className="w-full flex gap-5 pt-5">
        <Button
          chain={network}
          onClick={handleSend}
          buttonText={isProcessing ? t("text10") : `${t("text116")} Token`}
          disabled={isProcessing}
        />

        <ButtonContrast onClick={handleWithdraw} buttonText={t("text38")} />
      </div>

      
      <AnimatedModal
        isOpen={
          showModal && (activeTab === "send" ? estimatedFee.fetched : true)
        }
        onClose={handleCloseModal}
        maxWidthClass="lg:w-150"
      >
        <div className="flex flex-col p-6 overflow-x-hidden overflow-y-auto custom-scrollbar flex-1 max-h-[80vh] min-h-[60vh]">
          <AnimatePresence mode="wait">
       
            {modalStep === "form" && (
              <motion.div
                key="form-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
          
                <div className="flex flex-col gap-5 pb-3">
                  <div className="flex flex-col gap-0">
                    <h2 className="text-xl font-bold">
                      {activeTab === "send" ? t("text116") : t("text38")} Token
                    </h2>
                    <p className="text-[12px] opacity-70">
                      {activeTab === "send" ? t("text29") : t("text27")}
                    </p>
                  </div>

                  <div className="flex justify-between glass-card bgRound border-black/5 p-1 shadow-sm">
                    {[
                      { label: t("text116"), id: "send" },
                      { label: t("text38"), id: "withdraw" },
                    ].map((tab) => {
                      const isActive = activeTab === tab.id;
                      const activeBgClass = "bg-black";
                      const activeTextClass = "text-white";

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() =>
                            setActiveTab(tab.id as "send" | "withdraw")
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

                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="flex flex-col gap-4 py-4"
                >
                  {activeTab === "withdraw" && (
                    <>
                      {hasActiveMismatch && (
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
                              <p className="text-[11px] font-bold leading-relaxed text-red-700">
                                {dynamicMessageText}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleSwitchCurrent}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-lg active:scale-[0.98]"
                          >
                            {t("text153")}
                          </button>
                        </div>
                      )}

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
                    </>
                  )}

               
                  <div className="bgBox glass-card p-4 border border-black/5 rounded-2xl">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                        {activeTab === "send" ? t("text116") : t("text38")}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-60 group relative">
                        <Icon icon="solar:wallet-linear" />
                        <span>
                        
                          {maxSendableBalance.toFixed(selectedToken?.decimals)}{" "}
                          {selectedToken?.symbol}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col w-full">
                       <div className="flex flex-col w-full">
  <input
    type="text"
    inputMode="decimal"

    pattern={`^\\d*(\\.\\d{0,${selectedToken?.decimals || 8}})?$`}
    value={
      activeTab === "send" ? sendAmount : withdrawAmount
    }
    onChange={(e) => {
      const val = e.target.value;
      const maxDecimals = selectedToken?.decimals || 8;
      const regex = new RegExp(`^\\d*(\\.\\d{0,${maxDecimals}})?$`);
      
      if (regex.test(val) || val === "") {
        if (activeTab === "send") setSendAmount(val);
        else setWithdrawAmount(val);
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
                            if (activeTab === "send") {
                              const activeStr = sendAmount;
                              const activeNum = parseFloat(activeStr) || 0;
                              if (activeNum > 0 && selectedToken) {
                                const tokenPriceUsd = parseFloat(selectedToken.price || "0");
                                const usdVal = activeNum * tokenPriceUsd;
                                const idrVal = usdVal * idrPerUsdRatio;
                                if (idrRate > 0 || usdVal > 0) {
                                  return (
                                    <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight">
                                      ≈ ${usdVal.toFixed(2)} (Rp {Number(idrVal.toFixed(0)).toLocaleString(locale === "id" ? "id-ID" : "en-US")})
                                    </span>
                                  );
                                }
                              }
                            } else {
                              const netUsd = parseFloat(String(estimateWithdraw?.netUsd ?? 0)) || 0;
                              const netIdr = parseFloat(String(estimateWithdraw?.netIdr ?? 0)) || 0;

                              if (netUsd > 0 || netIdr > 0) {
                                return (
                                  <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight">
                                    {locale === "en" ? "Estimated Receive: " : "Estimasi Diterima: "}
                                    ≈ ${netUsd.toFixed(2)} (Rp {Number(netIdr).toLocaleString(locale === "id" ? "id-ID" : "en-US")})
                                  </span>
                                );
                              }

                              // A valid amount with no real estimate yet keeps showing the
                              // skeleton regardless of *why* — still loading, or the fetch
                              // already failed/returned nothing. Tying this to
                              // isEstimatingWithdraw alone meant a failed request cleared
                              // back to fully invisible once the loading flag turned off;
                              // this way it never looks empty while there's an amount to
                              // estimate, only once the amount itself is cleared/invalid.
                              if ((parseFloat(withdrawAmount) || 0) > 0) {
                                return (
                                  <span className="text-[10px] sm:text-xs font-bold opacity-40 tracking-tight inline-flex items-center gap-1.5">
                                    {locale === "en" ? "Estimated Receive: " : "Estimasi Diterima: "}
                                    <span className="inline-block h-3 w-16 bg-black/10 rounded animate-pulse align-middle" />
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
                            // full balance — network fee (and, on Polkadot, the existential
                            // deposit reserve) come off that scaled amount, not off the full
                            // balance before scaling, mirroring the fix applied to Stake.
                            // Previously this fee reservation only kicked in at pct === 1
                            // (Max); a 25%/50% click reserved nothing at all, so for a
                            // native-currency send — where the network fee is paid out of
                            // this same balance — even a partial click could still leave less
                            // than expected once the fee actually posted.
                            let targetAmount = maxSendableBalance * pct;

                            if (network === "solana") {
                              const fee = gaslessQuote?.calculatedFeeUi || gaslessQuote?.feeDeductedUi || 0;

                              if (fee > 0) {
                                targetAmount = Math.max(0, maxSendableBalance * pct - fee);
                              }
                            } else if (selectedToken?.isNative) {
                              const fee = estimatedFee?.fetched ? (estimatedFee[estimatedFee.selectedFee || "medium"] || 0) : 0;
                              // Same existential-deposit reserve as the validation check below —
                              // otherwise "Max" on Polkadot proposes an amount that reaps the account.
                              const existentialReserve = network === "polkadot"
                                ? POLKADOT_EXISTENTIAL_DEPOSIT * EXISTENTIAL_DEPOSIT_BUFFER
                                : 0;
                              targetAmount = Math.max(0, maxSendableBalance * pct - fee - existentialReserve);
                            }

                            const decimalsCount = selectedToken?.decimals || 8;
                            const factor = Math.pow(10, decimalsCount);
                            targetAmount = Math.max(0, Math.floor(targetAmount * factor) / factor);
                            const targetStr = targetAmount > 0 ? targetAmount.toString() : "";
                            
                            return (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => {
                                  if (activeTab === "send") setSendAmount(targetStr);
                                  else setWithdrawAmount(targetStr);
                                }}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95 ${
                                  (activeTab === "send" ? sendAmount : withdrawAmount) === targetStr && targetAmount > 0
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

                     
                      {activeTab === "withdraw" && parseFloat(String(estimateWithdraw?.netUsd ?? 0)) > 0 && (
                        <div className="flex justify-between items-center w-full pt-1">
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
                            <span />
                          )}

                          {typeof exchangeRate !== "undefined" && exchangeRate > 0 && (
                            <span className="text-[10px] sm:text-xs font-black opacity-30 italic">
                              1 {selectedToken?.symbol || currencyTicker} ≈ Rp {Math.round(exchangeRate).toLocaleString("id-ID")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {activeTab === "withdraw" && showFeeBreakdown && groupedFees && (
                      <div className="mt-4 pt-3 border-t border-black/5 flex flex-col gap-2 animate-fade-in w-full">
                        
                        {groupedFees.paymentAndTax > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] sm:text-xs font-medium opacity-60">
                              {locale === "en" ? "Payout Fee" : "Biaya Payout"}
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold opacity-80">
                              Rp {groupedFees.paymentAndTax.toFixed(0)}
                            </span>
                          </div>
                        )}

                        {groupedFees.platform > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] sm:text-xs font-medium opacity-60">
                              {locale === "en" ? "Platform Fees" : "Biaya Platform"}
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold opacity-80">
                              Rp {groupedFees.platform.toFixed(0)}
                            </span>
                          </div>
                        )}

                        {groupedFees.slippage > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] sm:text-xs font-medium opacity-60">
                              {locale === "en" ? "Slippage" : "Toleransi Harga"}
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold opacity-80">
                              Rp {groupedFees.slippage.toFixed(0)}
                            </span>
                          </div>
                        )}

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

                  {activeTab === "send" ? (
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
                          <span>{activeTab === "send" ? (locale === "en" ? "Send Amount" : "Jumlah Kirim") : (locale === "en" ? "Withdraw Amount" : "Jumlah Tarik")}</span>
                          <span className="font-mono">{parseFloat(activeAmountStr).toString()} {selectedToken?.symbol || currencyTicker}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs opacity-60">
                          <span className="flex items-center gap-1">

                            {locale === "en" ? "Network Fee" : "Biaya Jaringan"}
                          </span>
                          <span className="font-mono">
                            {network === "solana" ? (
                              isFetchingGasless
                                ? "..."
                                : gaslessQuote
                                  ? `${parseFloat((gaslessQuote.networkFeeUi ?? gaslessQuote.calculatedFeeUi ?? gaslessQuote.feeDeductedUi ?? 0).toFixed(selectedToken?.decimals || 8))} ${selectedToken?.symbol || currencyTicker}`
                                  : activeTab === "send" && (!sendAddress || sendAddress.length < 32)
                                    ? (locale === "en" ? "Need Enter address" : "Butuh Masukkan alamat")
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
                                    ? (locale === "en" ? "Need Enter address" : "Butuh Masukkan alamat")
                                    : "0"
                            ) : (
                              estimatedFee?.fetched ? `${estimatedFee[estimatedFee.selectedFee || "medium"]} ${currencyTicker}` : "0"
                            )}
                          </span>
                        </div>
                        {network === "solana" && !isFetchingGasless && gaslessQuote && (gaslessQuote.ataFeeUi || 0) > 0 && (
                          <div className="flex justify-between items-center text-xs opacity-60">
                            <span className="flex items-center gap-1">
                              {locale === "en" ? "New Account Fee (ATA)" : "Biaya Akun Baru (ATA)"}
                            </span>
                            <span className="font-mono">
                              {`${parseFloat(gaslessQuote.ataFeeUi.toFixed(selectedToken?.decimals || 8))} ${selectedToken?.symbol || currencyTicker}`}
                            </span>
                          </div>
                        )}
                        <div className="w-full h-[1px] bg-black/5 my-0.5" />
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span>{locale === "en" ? "Total Deducted" : "Total Dipotong"}</span>
                          <span className={`font-mono`}>
                            {network === "solana" ? (
                              isFetchingGasless
                                ? "..."
                                : gaslessQuote
                                  ? `${parseFloat((parseFloat(activeAmountStr) + (gaslessQuote.calculatedFeeUi || gaslessQuote.feeDeductedUi || 0)).toFixed(selectedToken?.decimals || 8))} ${selectedToken?.symbol || currencyTicker}`
                                  : `${parseFloat(activeAmountStr).toString()} ${selectedToken?.symbol || currencyTicker}`
                            ) : (network === "ethereum" || network === "hedera" || network === "polkadot" || network === "tempo" || network === "hyperliquid" || network === "robinhood" || network === "base" || network === "arbitrum") && selectedToken?.isNative === false ? (
                              // The token balance only ever drops by the amount sent — the
                              // network fee (ETH gas, Hedera's HBAR fee, Polkadot's DOT fee, or
                              // Tron's bandwidth/TRX burn) is paid separately, not from the token.
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
                  ) : (
                    <>
                      {!withdrawAmount ||
                      parseFloat(withdrawAmount) === 0 ? null : parseFloat(
                          withdrawAmount,
                        ) > maxSendableBalance ? (
                        <p className="text-[10px] text-red-500 -mt-2 italic px-1">
                          {t("text108")}
                        </p>
                      ) : (currentTokenConstraints?.withdraw?.max && currentTokenConstraints.withdraw.max > 0 && parseFloat(withdrawAmount || "0") > currentTokenConstraints.withdraw.max) ? (
                        <p className="text-[10px] text-red-500 -mt-2 italic px-1">
                          {t("text43")}{" "}
                          {currentTokenConstraints.withdraw.max}{" "}
                          {selectedToken?.symbol || currencyTicker}
                        </p>
                      ) : (currentTokenConstraints?.withdraw?.min && currentTokenConstraints.withdraw.min > 0 && parseFloat(withdrawAmount || "0") < currentTokenConstraints.withdraw.min) ? (
                        <p className="text-[10px] text-red-500 -mt-2 italic px-1">
                          {t("text44")}{" "}
                          {currentTokenConstraints.withdraw.min}{" "}
                          {selectedToken?.symbol || currencyTicker}
                        </p>
                      ) : (exceedsBankLimit && selectedBankLimit) ? (
                        <p className="text-[10px] text-red-500 -mt-2 italic px-1">
                          {locale === "en"
                            ? `Amount exceeds maximum bank transfer limit of Rp ${selectedBankLimit.toLocaleString()}`
                            : `Jumlah melebihi batas transfer bank maksimum Rp ${selectedBankLimit.toLocaleString()}`}
                        </p>
                      ) :null}

                      <div className="flex flex-col gap-1 relative z-20">
                        <div
                          className="bgBox glass-card cursor-pointer p-3 border border-black/5 rounded-xl transition-all hover:bg-black/5"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                          <div className="flex justify-between items-center">
                            {selectedMethod ? (
                              <div className="flex items-center gap-2">
                                {selectedMethodType !== "EWALLET" && (
                                  <Icon
                                    icon="solar:bank-bold-duotone"
                                    className="w-5 h-5 text-black/50"
                                  />
                                )}
                                <span className="lg:text-sm font-bold">
                                  {selectedMethodLabel}
                                </span>
                              </div>
                            ) : (
                              <span className="lg:text-sm font-bold opacity-70">
                                {t("text46")}
                              </span>
                            )}
                            <span className="text-lg opacity-50">
                              {dropdownOpen ? <FaSortUp /> : <FaSortDown />}
                            </span>
                          </div>
                        </div>

                        {dropdownOpen && (
                          <div className="absolute top-full left-0 w-full mt-1 bgBox glass-card py-2 px-0 border border-black/10 rounded-xl shadow-lg bg-white overflow-hidden">
                            <div className="px-3 pb-2">
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                  <Icon
                                    icon="solar:magnifer-linear"
                                    className="text-base opacity-40 group-focus-within:opacity-100 transition-all"
                                  />
                                </div>
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder={
                                    locale === "en"
                                      ? "Search bank or wallet"
                                      : "Cari bank atau wallet"
                                  }
                                  value={bankSearchQuery}
                                  onChange={(e) => setBankSearchQuery(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full bg-black/5 border border-black/5 rounded-lg py-2 pl-9 pr-3 text-xs font-medium outline-none focus:border-black/20 transition-all"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col gap-0 max-h-60 overflow-y-auto custom-scrollbar">
                              {filteredBanks.length === 0 && filteredEwallets.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs opacity-50">
                                  {locale === "en" ? "No results found" : "Tidak ada hasil ditemukan"}
                                </div>
                              ) : (
                                <>
                                  {filteredEwallets.length > 0 && (
                                    <>
                                      <div className="px-4 py-2 text-[10px] font-bold uppercase opacity-50 tracking-wider">
                                        {t("text329")}
                                      </div>
                                      {filteredEwallets.map((bank) => (
                                        <button
                                          key={bank.bankCode}
                                          type="button"
                                          onClick={() => {
                                            setSelectedMethod(bank.bankCode);
                                            setSelectedMethodLabel(bank.bankName);
                                            setSelectedMethodType("EWALLET");
                                            setIsValidRecipient(false);
                                            setValidationMessage("");
                                            setDropdownOpen(false);
                                          }}
                                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-black/5 text-xs transition-colors font-semibold"
                                        >
                                          {bank.bankName}
                                        </button>
                                      ))}
                                    </>
                                  )}

                                  {filteredBanks.length > 0 && (
                                    <>
                                      <div className="px-4 py-2 text-[10px] font-bold uppercase opacity-50 tracking-wider">
                                        {t("text47")}
                                      </div>
                                      {filteredBanks.map((bank) => (
                                        <button
                                          key={bank.bankCode}
                                          type="button"
                                          onClick={() => {
                                            setSelectedMethod(bank.bankCode);
                                            setSelectedMethodLabel(bank.bankName);
                                            setSelectedMethodType("BANK");
                                            setIsValidRecipient(false);
                                            setValidationMessage("");
                                            setDropdownOpen(false);
                                          }}
                                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-black/5 text-xs transition-colors font-semibold"
                                        >
                                        
                                          {bank.bankName}
                                        </button>
                                      ))}
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {selectedMethod && (
                        <div className="flex flex-col gap-3 z-10 mt-2">
                          <div className="bgBox glass-card p-3 border border-black/5 rounded-xl flex flex-col gap-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="\d*"
                              value={accountNumber}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d{0,20}$/.test(value)) {
                                  setAccountNumber(value);
                                  setIsValidRecipient(false);
                                  setValidationMessage("");
                                }
                              }}
                              className="w-full border-none bg-transparent outline-none lg:text-sm font-bold placeholder:font-normal placeholder:opacity-50"
                              placeholder={
                                selectedMethodType === "BANK"
                                  ? t("text48")
                                  : t("text49")
                              }
                            />

                            <div className="w-full h-[1px] bg-black/5" />

                          
                            <input
                              type="text"
                              value={accountHolder}
                              onChange={(e) => {
                                setAccountHolder(e.target.value);
                                setIsValidRecipient(false);
                                setValidationMessage("");
                              }}
                              className="w-full border-none bg-transparent outline-none lg:text-sm font-bold uppercase placeholder:font-normal placeholder:opacity-50 placeholder:capitalize"
                              placeholder={
                                locale === "en"
                                  ? "Account Holder Name"
                                  : "Nama Pemilik Rekening"
                              }
                            />
                          </div>

                          {validationMessage && (
                            <p className="text-[10px] -mt-1 mb-1 italic px-1 font-medium text-red-500">
                              {validationMessage}
                            </p>
                          )}
                        </div>
                      )}
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
              </motion.div>
            )}

           
            {modalStep === "selectToken" && (
              <motion.div
                key="token-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                <div className="flex flex-col gap-0 pb-5">
                  <h2 className="text-xl font-bold">
                    {locale === "en" ? "Select Token" : "Pilih Token"}
                  </h2>
                  <p className="text-[12px] opacity-70">
                    {locale === "en"
                      ? "Choose an asset to manage from the list below."
                      : "Pilih aset untuk dikelola dari daftar di bawah."}
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
                  {isLoadingTokens || isMetaEnriching ? (
                    [...Array(6)].map((_, i) => (
                      <div
                        key={`skeleton-modal-${i}`}
                        className="w-full p-4 border border-transparent rounded-xl flex items-center justify-between gap-3 animate-pulse bg-black/5"
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
                    filteredTokens.map((token: any, idx: any) => {
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
                          className={`w-full text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                            isSelected
                              ? "border-black/20 bg-black/5"
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
                            {userBal > 0 && (
                              <div className="flex flex-col items-end leading-tight">
                                <span
                                  className={`font-bold text-sm tracking-tight text-black`}
                                >
                                  {userBal}
                                </span>
                                {totalUSD > 0 && (
                                  <span className="text-[10px] font-bold opacity-40">
                                    ≈${totalUSD.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}
                            {isSelected && (
                              <FaCheckCircle className="text-[18px] text-green-500 shrink-0" />
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
                        {locale === "en"
                          ? "No tokens found"
                          : "Token tidak ditemukan"}
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
                  buttonText={t("text55")}
                />
              </div>
            <div className="flex-1">
                {activeTab === "send" ? (
                  <Button
                    buttonText={t("text123")}
                    chain={network}
                    disabled={!IsValidForm || isFetchingGasless}
                    onClick={handleConfirmSend}
                  />
                ) : (
                  <Button
                    chain={network}
                    buttonText={withdrawButtonText}
                    disabled={isWithdrawDisabled}
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        const envMode = isTestnetActive ? "TESTNET" : "MAINNET";
                        const payload = {
                          type: "WITHDRAWAL",
                          walletAddress: address,
                          tokenType: selectedToken?.symbol || currencyTicker,
                          network: network.toUpperCase(),
                          networkEnv: envMode,
                          tokenAmount: parseFloat(withdrawAmount),
                          paymentDetails: {
                            method: LEGACY_BANK_CODES[selectedMethod] || selectedMethod,
                            accountNumber: accountNumber,
                            accountHolderName: accountHolder,
                            bankCode: selectedMethod,
                            bankName: selectedMethodLabel,
                            bankAccountName: accountHolder,
                            bankAccount: accountNumber,
                          },
                        };

                        const res = await fetch("/api/transaction", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        });
                        const data = await res.json();
                        if (res.ok && data.success && data.tx?.id) {
                          setShowModal(false);
                          setModalStep("form");
                          router.push(
                            `/${network}/vault/transaction/${data.tx.id}`,
                          );
                        } else if (
                          res.status === 429 ||
                          (data?.error && (data.error.toLowerCase().includes("too many on progress") || data.error.toLowerCase().includes("limit")))
                        ) {
                          setShowModal(false);
                          setShowWithdrawLimitModal(true);
                        } else if (
                          data?.errorCode === "ERR_IDRX_REKYC_REQUIRED" ||
                          data?.error_code === "ERR_IDRX_REKYC_REQUIRED"
                        ) {
                          savePendingTransaction({
                            type: "WITHDRAWAL",
                            walletAddress: address,
                            tokenType: selectedToken?.symbol || currencyTicker,
                            network: network.toString(),
                            networkEnv: envMode,
                            tokenAmount: parseFloat(withdrawAmount),
                            paymentDetails: {
                              method: LEGACY_BANK_CODES[selectedMethod] || selectedMethod,
                              accountNumber: accountNumber,
                              accountHolderName: accountHolder,
                              bankCode: selectedMethod,
                              bankName: selectedMethodLabel,
                              bankAccountName: accountHolder,
                              bankAccount: accountNumber,
                            },
                          });
                          setShowModal(false);
                          setModalStep("form");
                          startOnboarding(
                            address,
                            (network || "solana").toUpperCase(),
                            data?.lastEmail || data?.last_email,
                            true,
                          );
                        } else if (
                          res.status === 400 &&
                          (() => {
                            const msg = data.error?.toLowerCase() || "";
                            // Backend wording differs by endpoint — deposit says "not
                            // onboarded with IDRX", withdrawal says "not onboarded to
                            // IDRX" — so match on both key phrases independently instead
                            // of one exact string, verified against the live backend.
                            return msg.includes("not onboarded") && msg.includes("idrx");
                          })()
                        ) {
                          savePendingTransaction({
                            type: "WITHDRAWAL",
                            walletAddress: address,
                            tokenType: selectedToken?.symbol || currencyTicker,
                            network: network.toString(),
                            networkEnv: envMode,
                            tokenAmount: parseFloat(withdrawAmount),
                            paymentDetails: {
                              method: LEGACY_BANK_CODES[selectedMethod] || selectedMethod,
                              accountNumber: accountNumber,
                              accountHolderName: accountHolder,
                              bankCode: selectedMethod,
                              bankName: selectedMethodLabel,
                              bankAccountName: accountHolder,
                              bankAccount: accountNumber,
                            },
                          });
                          setShowModal(false);
                          setModalStep("form");
                          startOnboarding(address, (network || "solana").toUpperCase());
                        } else {
                          const errMsg = data?.error || "Transaction creation failed.";
                          const isBankValidationError = 
                            data?.errorCode === "BANK_ACCOUNT_VALIDATION_ERROR" || 
                            errMsg.includes("76");

                          if (isBankValidationError) {
                            setValidationMessage(
                              locale === "en"
                                ? "Invalid bank account number"
                                : "Nomor rekening tujuan tidak valid"
                            );
                          } else {
                            setValidationMessage(errMsg);
                          }
                        }
                      } catch (err: any) {
                        console.error(err);
                        setValidationMessage(err?.message || "An error occurred.");
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center w-full">
              <div className="w-full sm:flex-1">
                <ButtonContrast
                  buttonText={locale === "en" ? "Back" : "Kembali"}
                  onClick={() => setModalStep("form")}
                />
              </div>
            </div>
          )}
        </div>
      </AnimatedModal>

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
                buttonText={`${t("text79")}`}
                onClick={() =>
                  window.open(
                    `${(networkExplorer as any).transaction}${txid}${(networkExplorer as any).urlSuffix || ""}`,
                    "_blank",
                  )
                }
              />
            </div>
          </div>
        </div>
      </AnimatedModal>

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
        isOpen={isMainInfoOpen}
        onClose={() => setIsMainInfoOpen(false)}
        title={locale === "en" ? "The Vault" : "Brankas"}
        image={null}
        description={
          locale === "en"
            ? "Commonly used network tokens are always shown for your convenience. Your other portfolio assets appear once you hold a balance."
            : "Token jaringan yang umum digunakan selalu ditampilkan untuk kenyamanan Anda. Aset portofolio lainnya akan muncul setelah Anda memiliki saldo."
        }
      />

      {/* Withdrawal Limit Modal */}
      <AnimatedModal
        isOpen={showWithdrawLimitModal}
        onClose={() => setShowWithdrawLimitModal(false)}
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
                  ? "Active Withdrawal in Progress"
                  : "Penarikan Sedang Berjalan"}
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                {locale === "en"
                  ? "You already have 1 active withdrawal in progress. Please wait for it to complete or cancel it in your History before creating a new withdrawal."
                  : "Anda sudah memiliki 1 transaksi penarikan yang sedang berjalan. Silakan tunggu hingga selesai atau batalkan transaksi di menu Riwayat sebelum membuat penarikan baru."}
              </p>
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 pt-3 border-t border-black/5">
            <button
              onClick={() => setShowWithdrawLimitModal(false)}
              className="px-4 py-2.5 rounded-xl border border-black/10 text-xs font-semibold hover:bg-black/5 text-neutral-600 transition-colors cursor-pointer"
            >
              {locale === "en" ? "Close" : "Tutup"}
            </button>
            <button
              onClick={() => {
                setShowWithdrawLimitModal(false);
                router.push(`/${network}/vault/history`);
              }}
              className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              {locale === "en" ? "View Active Orders" : "Lihat Riwayat"}
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
};

export default Assets;
