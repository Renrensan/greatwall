"use client";

// Unlock: Lock in reverse (LockToken.tsx), laid out the same. The user
// picks an asset on its own network (ETH on Ethereum, as Lock lists it),
// then the network it was locked toward and is held on now (Solana): the
// receipt held there is burned, and the asset is released on its own
// network to a recipient there.
//
// The receipt is found as Lock finds it: the asset's number in the vault
// of the pair (its own network with the other), and the receipt that
// number has on the other side (a mint on Solana, a token on an EVM
// network). The burn is signed on the network the receipt is held on: on
// Solana by the pair's configuration (SolanaVault.burn), on an EVM network
// by the pair's receipts contract (SDK `burn`). Amounts and fees are in the
// vault's record units, the receipt's own; the fast path is on by default.

import { trackTx } from "@/components/ui/txToast";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { FaCheckCircle } from "react-icons/fa";
import { ZeroAddress, formatUnits, isAddress, parseUnits } from "ethers";
import { PublicKey } from "@solana/web3.js";
import { burn, homeAssets, receiptTokens } from "@ipow/sdk";

import Button from "./Button";
import ButtonContrast from "./ButtonContrast";
import { AnimatedModal } from "./AnimatedModal";
import { EthereumConnectButton } from "./EthereumConnectButton";
import { SolanaConnectButton } from "./SolanaConnectButton";
import { BaseConnectButton } from "./BaseConnectButton";
import { RobinhoodConnectButton } from "./RobinhoodConnectButton";
import { HyperliquidConnectButton } from "./HyperliquidConnectButton";
import { ArbitrumConnectButton } from "./ArbitrumConnectButton";
import { TempoConnectButton } from "./TempoConnectButton";
import { useUsdValue } from "./ipow/useUsdValue";
import { Caution, rwaOf, useNotEnoughText } from "./ipow/Faucet";
import { BASKET_CHAINS, deploymentOf, isSolanaAddress, readProvider, solanaConnection, solanaVaultOf, solanaVaultWith, type BasketChain, PATH_USD } from "@/components/integrator/ipow/sdk";
import { chainOfNumber } from "@/components/integrator/ipow/crossAssets";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import { balanceOf } from "@/components/integrator/ipow/tokens";
import { OPERATOR, unlockFastTerms, type FastTerms } from "@/components/integrator/ipow/fastPath";
import { solanaTokenBalance } from "@/components/integrator/ipow/solanaTokenBalance";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import { lockPath } from "@/components/integrator/ipow/lockPaths";

type Side = "home" | "held";
/** An EVM network, Tempo (its one vault pairs with Solana), or Solana. */
type Net = BasketChain | "solana";
/** An asset on its own network: the coin ("native") or a token address/mint. */
type Asset = { token: string; symbol: string; name: string; icon: any; decimals: number };
/** The asset's receipt on the network it is held on: the asset's number in
 *  the pair's vault, the receipt (null until the vault made one), and its
 *  decimals (the vault's record decimals). */
type ReceiptInfo = { number: number | null; receipt: string | null; decimals: number };

const NATIVE = "native";
const ZERO = BigInt(0);
/** SOL a burn on Solana needs for its fees and the request's rent. */
const SOL_RESERVE = BigInt(10_000_000);
const SOLANA_NUMBER = 2;
/** The fast fee every unlock pays by default, in basis points, as on Lock. */
const FAST_BPS = BigInt(10);

const numberOf = (n: Net) => (n === "solana" ? SOLANA_NUMBER : deploymentOf(n)!.number);
const vaultsOf = (n: BasketChain) => (deploymentOf(n)!.vaults as readonly { peer: number }[]) ?? [];

/** The networks an asset of `home` can have been locked toward: its vault pairs. */
function pairsOf(home: Net): Net[] {
  if (home === "solana") return BASKET_CHAINS.filter((c) => vaultsOf(c).some((v) => v.peer === SOLANA_NUMBER));
  return vaultsOf(home).flatMap((v) => (v.peer === SOLANA_NUMBER ? ["solana" as Net] : chainOfNumber(v.peer) ? [chainOfNumber(v.peer)! as Net] : []));
}

/** An amount for display, exact (no float), to 6 decimals at most. */
const show = (v: bigint, decimals: number) => {
  const [w, f = ""] = formatUnits(v, decimals).split(".");
  const frac = f.slice(0, 6).replace(/0+$/, "");
  return `${BigInt(w).toLocaleString("en-US")}${frac ? `.${frac}` : ""}`;
};

/** A typed amount, kept to digits, one point and `decimals` after it. */
const clean = (raw: string, decimals: number) => {
  const v = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const dot = v.indexOf(".");
  if (dot < 0) return v;
  return v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, decimals);
};

export default function UnlockToken({ initial }: { initial: Net }) {
  const t = useTranslations("All");
  const tb = useTranslations("Bridge");

  const ethereumWallet = useEthereumWallet();
  const solanaWallet = useSolanaWallet();
  const hyperliquidWallet = useHyperliquidWallet();
  const robinhoodWallet = useRobinhoodWallet();
  const baseWallet = useBaseWallet();
  const arbitrumWallet = useArbitrumWallet();
  const tempoWallet = useTempoWallet();

  // Each network's name, logo and coin, as Lock reads them.
  const networkOptions = useMemo(() => {
    const all: Record<string, any> = { ethereum: ethereumWallet, solana: solanaWallet, hyperliquid: hyperliquidWallet, robinhood: robinhoodWallet, base: baseWallet, arbitrum: arbitrumWallet, tempo: tempoWallet };
    return ([...BASKET_CHAINS, "solana"] as Net[])
      .filter((k) => all[k])
      .map((k) => ({ key: k, name: all[k].networkName as string, logo: all[k].networkLogo, currencyTicker: all[k].currencyTicker as string, decimals: all[k].decimals as number, tokenName: all[k].tokenName as string | undefined, tokenLogo: all[k].tokenLogo }));
  }, [ethereumWallet, solanaWallet, hyperliquidWallet, robinhoodWallet, baseWallet, arbitrumWallet, tempoWallet]);
  const optionOf = (n: Net) => networkOptions.find((o) => o.key === n);
  const nameOf = (n: Net) => optionOf(n)?.name ?? n;

  const networks: Net[] = useMemo(() => networkOptions.map((o) => o.key), [networkOptions]);
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const query = useSearchParams();
  // Where the receipt is held now ("Locked on", the navbar's network: it is
  // burned there), and the asset's own network, where it is unlocked. A
  // link may pick the asset (?home=, ?token=).
  const start: Net = networks.includes(initial) ? initial : "solana";
  const [heldOn, setHeldOn] = useState<Net>(start);
  const [home, setHome] = useState<Net>(() => {
    const h = query.get("home") as Net | null;
    return h && pairsOf(start).includes(h) ? h : (pairsOf(start)[0] ?? "ethereum");
  });
  const [token, setToken] = useState<string>(() => {
    const tk = query.get("token")?.toLowerCase();
    const h = query.get("home") as Net | null;
    return (tk && h && rwaTokensOf(h).find((r) => r.token.toLowerCase() === tk)?.token) || NATIVE;
  });
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientTouched, setRecipientTouched] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState(false);
  const [info, setInfo] = useState<ReceiptInfo | null>(null);
  const [infoFailed, setInfoFailed] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceFailed, setBalanceFailed] = useState(false);
  const [solBalance, setSolBalance] = useState<bigint | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chainModalOpen, setChainModalOpen] = useState(false);
  const [chainModalSide, setChainModalSide] = useState<Side>("home");
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  // The burn is signed where the receipt is held; the asset goes home.
  const heldEvm = useEvmWallet(heldOn === "solana" ? null : heldOn);
  const homeEvm = useEvmWallet(home === "solana" ? null : home);
  const heldConnected = heldOn === "solana" ? !!solanaWallet.connected : heldEvm.connected;
  const heldAddress = heldOn === "solana" ? solanaWallet.address : heldEvm.address;
  const homeConnected = home === "solana" ? !!solanaWallet.connected : homeEvm.connected;
  const homeAddress = home === "solana" ? solanaWallet.address : homeEvm.address;
  const prices = useUsdValue();
  const notEnough = useNotEnoughText();

  /** The coin and the RWA tokens Greatwall lists on a network, as on Lock. */
  const getAssetsForChain = (n: Net): Asset[] => {
    const o = optionOf(n);
    const coin: Asset = { token: NATIVE, symbol: o?.currencyTicker ?? "", name: o?.tokenName ?? o?.name ?? n, icon: o?.tokenLogo ?? o?.logo ?? null, decimals: o?.decimals ?? (n === "solana" ? 9 : 18) };
    const tokens = rwaTokensOf(n).map((r) => ({ token: r.token, symbol: r.symbol, name: r.name, icon: r.logo ?? null, decimals: r.decimals }));
    // Tempo has no coin of its own: PathUSD, the token its fees are paid
    // in, stands where a coin would (the vault's asset 0 there).
    const pathUsd: Asset = { token: PATH_USD, symbol: "PathUSD", name: "PathUSD", icon: o?.logo ?? null, decimals: 6 };
    return n === "tempo" ? [pathUsd, ...tokens] : [coin, ...tokens];
  };
  const assets = useMemo(() => getAssetsForChain(home), [home, networkOptions]); // eslint-disable-line react-hooks/exhaustive-deps
  const asset = assets.find((a) => a.token === token) ?? assets[0];

  // The recipient: the home network's wallet until one is typed; a new home starts over.
  useEffect(() => {
    if (!recipientTouched) setRecipient(homeAddress ?? "");
  }, [homeAddress, home, recipientTouched]);
  const lastHome = useRef(home);
  useEffect(() => {
    if (lastHome.current !== home) setRecipientTouched(false);
    lastHome.current = home;
  }, [home]);

  // The asset's receipt on the network it is held on.
  useEffect(() => {
    setInfo(null);
    setInfoFailed(false);
    let live = true;
    (async (): Promise<ReceiptInfo> => {
      if (home === "solana") {
        // SOL or a Solana token, held on an EVM network.
        const all = await solanaVaultWith(heldOn as BasketChain, null).assets();
        const a = asset.token === NATIVE ? all.find((x) => x.mint === null) : all.find((x) => x.mint === asset.token);
        if (!a) return { number: null, receipt: null, decimals: 9 };
        const dd = deploymentOf(heldOn as BasketChain)!;
        const pair = vaultsOf(heldOn as BasketChain).findIndex((v) => v.peer === SOLANA_NUMBER);
        const receipt = (await receiptTokens(readProvider(heldOn as BasketChain), dd, pair, a.number + 1)).get(a.number) ?? null;
        return { number: a.number, receipt, decimals: a.recordDecimals };
      }
      // An EVM network's asset, held on Solana or on another EVM network.
      const d = deploymentOf(home)!;
      const pair = vaultsOf(home).findIndex((v) => v.peer === numberOf(heldOn));
      const all = await homeAssets(readProvider(home), d, pair);
      const a = all.find((x) => (asset.token === NATIVE ? x.token === ZeroAddress : x.token.toLowerCase() === asset.token.toLowerCase()));
      if (!a) return { number: null, receipt: null, decimals: 9 };
      if (heldOn === "solana") {
        const mint = solanaVaultOf(home).receiptMint(a.number);
        const made = (await solanaConnection().getAccountInfo(mint)) !== null;
        return { number: a.number, receipt: made ? mint.toBase58() : null, decimals: a.recordDecimals };
      }
      const dd = deploymentOf(heldOn)!;
      const back = vaultsOf(heldOn).findIndex((v) => v.peer === d.number);
      const receipt = (await receiptTokens(readProvider(heldOn), dd, back, a.number + 1)).get(a.number) ?? null;
      return { number: a.number, receipt, decimals: a.recordDecimals };
    })()
      .then((i) => live && setInfo(i))
      .catch(() => live && setInfoFailed(true));
    return () => {
      live = false;
    };
  }, [home, heldOn, asset.token, refresh]);

  // The wallet's balance of the receipt where it is held, and SOL for a burn on Solana.
  useEffect(() => {
    setBalance(null);
    setBalanceFailed(false);
    setSolBalance(null);
    if (!heldAddress || !info) return;
    let live = true;
    if (heldOn === "solana")
      solanaConnection()
        .getBalance(new PublicKey(heldAddress))
        .then((b) => live && setSolBalance(BigInt(b)))
        .catch(() => undefined);
    if (!info.receipt) {
      setBalance(ZERO);
      return;
    }
    (heldOn === "solana" ? solanaTokenBalance(heldAddress, info.receipt) : balanceOf(heldOn, info.receipt, heldAddress))
      .then((b) => live && setBalance(b))
      .catch(() => {
        if (live) setBalanceFailed(true);
      });
    return () => {
      live = false;
    };
  }, [heldOn, heldAddress, info, refresh]);

  // The most the operator pays back at once right now, in record units: its
  // limit for the asset on this pair, and what it holds of the asset on its
  // home network. undefined while read; null when it does not pay it fast.
  const [fast, setFast] = useState<FastTerms | null | undefined>(undefined);
  useEffect(() => {
    setFast(undefined);
    if (info?.number == null) return;
    const number = info.number;
    const recordDecimals = info.decimals;
    let live = true;
    (async (): Promise<FastTerms | null> => {
      const held =
        home === "solana"
          ? asset.token === NATIVE
            ? BigInt(await solanaConnection().getBalance(new PublicKey(OPERATOR.solana)))
            : await solanaTokenBalance(OPERATOR.solana, asset.token)
          : asset.token === NATIVE
            ? await readProvider(home as BasketChain).getBalance(OPERATOR.evm)
            : await balanceOf(home as BasketChain, asset.token, OPERATOR.evm);
      // In record units, as the burn counts.
      const scale = BigInt(10) ** BigInt(Math.max(0, asset.decimals - recordDecimals));
      return unlockFastTerms(heldOn, home, number, held / scale);
    })()
      .then((m) => live && setFast(m))
      .catch(() => live && setFast(undefined));
    return () => {
      live = false;
    };
  }, [home, heldOn, asset.token, asset.decimals, info, refresh]);

  const decimals = info?.decimals ?? Math.min(asset.decimals, 9);
  useEffect(() => setAmount((a) => clean(a, decimals)), [decimals]);
  let amountUnits: bigint | null = null;
  try {
    amountUnits = parseUnits(amount.trim() || "0", decimals);
  } catch {
    amountUnits = null;
  }
  const typed = !!amountUnits && amountUnits > ZERO;
  /** The fast fee: Greatwall's share, at least the operator's least fast
   *  fee, so the operator always pays it at once. */
  const fastFeeOf = (x: bigint) => {
    const share = (x * FAST_BPS + BigInt(9_999)) / BigInt(10_000);
    return fast && fast.minFee > share ? fast.minFee : share;
  };
  const fastFee = typed ? fastFeeOf(amountUnits!) : ZERO;
  /** The most this wallet can unlock, the fast fee on top. */
  const maxUnlock = (() => {
    if (balance === null) return null;
    let most = (balance * BigInt(10_000)) / (BigInt(10_000) + FAST_BPS);
    while (most > ZERO && most + fastFeeOf(most) > balance) most -= BigInt(1);
    return most;
  })();
  /** A test token's cap: one faucet claim's worth, in record units. */
  const faucetCap = (() => {
    const r = rwaOf(home, asset.token);
    return r ? parseUnits(String(r.faucet), decimals) : null;
  })();
  const operatorCap = fast === undefined || fast === null ? null : fast.max;
  const fastCap = operatorCap !== null && faucetCap !== null ? (faucetCap < operatorCap ? faucetCap : operatorCap) : operatorCap;
  const overFast = fastCap !== null && typed && amountUnits! > fastCap;
  const maxUnlockFast = maxUnlock !== null && fastCap !== null && fastCap < maxUnlock ? fastCap : maxUnlock;
  const fmtFast = (v: bigint) => formatUnits(v, decimals).replace(/\.0$/, "");
  const setFraction = (f: number) => {
    if (maxUnlockFast === null) return;
    const v = (maxUnlockFast * BigInt(Math.round(f * 100))) / BigInt(100);
    setAmount(v > ZERO ? clean(formatUnits(v, decimals).replace(/\.0$/, ""), decimals) : "");
  };
  const lacking = typed && balance !== null && amountUnits! + fastFee > balance;
  const lacksSol = heldOn === "solana" && solBalance !== null && solBalance < SOL_RESERVE;
  const recipientOk = home === "solana" ? isSolanaAddress(recipient) : isAddress(recipient.trim());
  const nothingHeld = info !== null && (info.number === null || info.receipt === null);

  const problem = !heldConnected
    ? tb("lockConnect", { network: nameOf(heldOn) })
    : infoFailed
      ? tb("lockInfoFailed")
      : info === null
        ? tb("loading")
        : nothingHeld
          ? tb("unlockNoneLocked", { symbol: asset.symbol, network: nameOf(heldOn) })
          : !typed
            ? tb("enterAmount")
            : fast === undefined
              ? tb("loading")
              : fast === null
              ? tb("unlockNotFast", { to: nameOf(home) })
              : overFast
                ? tb("unlockOverFast", { max: fmtFast(fastCap!), symbol: asset.symbol })
                : lacking
              ? tb("notEnough", { symbol: asset.symbol })
              : lacksSol
                ? tb("notEnough", { symbol: "SOL" })
                : !recipient.trim()
                  ? homeConnected
                    ? tb("lockEnterRecipient", { network: nameOf(home) })
                    : tb("lockConnect", { network: nameOf(home) })
                  : !recipientOk
                    ? tb("lockBadRecipient", { network: nameOf(home) })
                    : null;
  const usd = (() => {
    const p = prices.priceOf(asset.symbol);
    const n = Number(amount);
    if (!amount || isNaN(n) || p === null) return "0.00";
    return (n * p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  })();

  const handleUnlock = async () => {
    if (problem || !info || info.number === null || !amountUnits) return;
    const number = info.number;
    setIsProcessing(true);
    // The send, as one step for its toast: it resolves with its hash.
    const send = async (): Promise<string> => {
      if (heldOn === "solana") {
        const anchor = solanaWallet.getAnchorWallet();
        if (!anchor) throw new Error(tb("lockConnect", { network: nameOf("solana") }));
        return (await solanaVaultWith(home as BasketChain, anchor).burn({ asset: number, to: recipient.trim(), amount: amountUnits, fee: ZERO, fastFee })).signature;
      }
      if (!heldEvm.getSigner) throw new Error(tb("lockConnect", { network: nameOf(heldOn) }));
      const d = deploymentOf(heldOn)!;
      const signer = await heldEvm.getSigner();
      const onChain = (await signer.provider?.getNetwork())?.chainId;
      if (onChain !== undefined && onChain !== BigInt(d.chainId)) throw new Error(tb("wrongNetwork"));
      const pair = vaultsOf(heldOn).findIndex((v) => v.peer === numberOf(home));
      if (pair < 0) throw new Error(tb("unlockNoPair", { network: nameOf(home) }));
      return (await burn(signer, d, { asset: number, to: recipient.trim(), amount: amountUnits, fee: ZERO, fastFee, pair })).txHash;
    };
    try {
      const r = await trackTx(heldOn, `Unlock ${amount} ${asset.symbol} on ${nameOf(home)}`, send, (h) => h, {
        done: `${tb("unlockDone", { amount, symbol: asset.symbol, network: nameOf(home) })}. ${tb("timing")}`,
      });
      if (!r.ok) return;
      setAmount("");
      setRefresh((n) => n + 1);
    } finally {
      setIsProcessing(false);
    }
  };

  const openChainPicker = (side: Side) => {
    setChainModalSide(side);
    setChainModalOpen(true);
    setTokenModalOpen(false);
  };
  // "Locked on" follows the navbar, and moves it.
  const chooseHeld = (n: Net, h: Net = home) => {
    const hs = pairsOf(n);
    const next = hs.includes(h) ? h : hs[0];
    if (next !== home) setToken(NATIVE);
    setHeldOn(n);
    setHome(next);
    setAmount("");
    if (n !== initial) router.replace(`${lockPath(locale, n, "unlock")}?home=${next}`, { scroll: false });
  };
  useEffect(() => {
    if (initial !== heldOn && networks.includes(initial)) chooseHeld(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);
  const pickChain = (n: Net) => {
    if (chainModalSide === "home") {
      const ps = pairsOf(n);
      setHome(n);
      setToken(NATIVE);
      setAmount("");
      if (!ps.includes(heldOn)) chooseHeld(ps[0], n);
    } else {
      chooseHeld(n);
    }
    setChainModalOpen(false);
  };

  const connectButton = (n: Net) =>
    n === "ethereum" ? <EthereumConnectButton /> : n === "solana" ? <SolanaConnectButton /> : n === "base" ? <BaseConnectButton /> : n === "robinhood" ? <RobinhoodConnectButton /> : n === "hyperliquid" ? <HyperliquidConnectButton /> : n === "arbitrum" ? <ArbitrumConnectButton /> : n === "tempo" ? <TempoConnectButton /> : null;
  const short = (x: string) => (x.length > 16 ? `${x.slice(0, 6)}…${x.slice(-4)}` : x);

  /** An asset's logo, badged with a network. */
  const badged = (a: Asset, n: Net, size: string, ring: string) => (
    <span className="relative shrink-0">
      {a.icon ? <Image src={a.icon} alt={a.symbol} width={40} height={40} unoptimized={typeof a.icon === "string"} className={`${size} rounded-full object-contain`} /> : <span className={`block ${size} rounded-full bg-black/5`} />}
      {optionOf(n)?.logo && <Image src={optionOf(n)!.logo} alt={nameOf(n)} className={`absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 ${ring}`} />}
    </span>
  );

  /** One side's network: a card that opens the network picker. */
  const networkCard = (n: Net, side: Side) => (
    <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2 rounded-2xl glass-card px-4 py-3 md:px-5 md:py-4">
      <button type="button" onClick={() => openChainPicker(side)} className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer rounded-xl -m-1 p-1 hover:bg-black/5 transition-colors">
        {optionOf(n)?.logo && <Image src={optionOf(n)!.logo} alt={nameOf(n)} className="w-9 h-9 md:w-11 md:h-11 rounded-full object-contain shrink-0" />}
        <span className="flex flex-col min-w-0 leading-tight">
          <span className="text-[11px] md:text-xs opacity-60">{side === "held" ? tb("unlockHeldLabel") : tb("unlockToLabel")}</span>
          <span className="text-sm md:text-lg font-bold truncate">{nameOf(n)}</span>
        </span>
      </button>
      {/* The network's wallet: connect it here, or see the one connected. */}
      <span className="shrink-0">{connectButton(n)}</span>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-4 mt-4">
        {/* ================= NETWORKS: where it is held, and its own network ================= */}
        <div className="relative flex items-stretch gap-2">
          {networkCard(heldOn, "held")}
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-lg bg-cream border-4 border-cream flex items-center justify-center pointer-events-none">
            <span className="w-full h-full rounded-md bg-paper glass-card flex items-center justify-center text-xs">
              <Icon icon="solar:arrow-right-linear" />
            </span>
          </span>
          {networkCard(home, "home")}
        </div>

        {/* ================= UNLOCK, and RECEIVE tucked under it ================= */}
        <div className="flex flex-col">
          <div className="relative z-10 rounded-2xl border border-ink bg-paper shadow-sm">
            <div className="py-4 px-4 md:py-5 md:px-6 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="opacity-60">{tb("tabUnlock")}</span>
                </span>
                {heldConnected ? (
                  <span className="flex items-center gap-1">
                    <span className="opacity-60">{tb("unlockLockedBalance", { network: nameOf(heldOn) })}</span>
                    {balanceFailed || infoFailed ? <span className="font-bold">—</span> : balance === null ? <span className="inline-block h-4 w-20 rounded bg-black/10 animate-pulse align-middle" aria-label="Loading balance" /> : <span className="font-bold tabular-nums">{`${show(balance, decimals)} ${asset.symbol}`}</span>}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3 w-full">
                <input
                  id="unlock-amount"
                  key={`${home}-${heldOn}`}
                  type="text"
                  inputMode="decimal"
                  aria-label={tb("tabUnlock")}
                  className="flex-1 min-w-0 text-4xl md:text-5xl font-bold bg-transparent outline-none border-none truncate"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(clean(e.target.value, decimals))}
                />
                <button
                  type="button"
                  onClick={() => {
                    setTokenModalOpen(true);
                    setChainModalOpen(false);
                  }}
                  className="hover:bg-black/10 shrink-0 flex glass-card pr-2 rounded-full items-center gap-2 text-left cursor-pointer hover:opacity-90 transition-all"
                >
                  {badged(asset, heldOn, "w-8 h-8 sm:w-10 sm:h-10", "border-paper")}
                  <span className="flex items-center gap-0.5 md:gap-1">
                    <span className="text-base sm:text-lg font-bold">{asset.symbol}</span>
                    <Icon icon="lsicon:down-filled" className="text-xs sm:text-base" />
                  </span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm opacity-60 tabular-nums">${usd}</span>
                {maxUnlock !== null && maxUnlock > ZERO && (
                  <div className="flex justify-end gap-2">
                    {[0.25, 0.75, 1].map((f) => (
                      <button key={f} type="button" onClick={() => setFraction(f)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-ink hover:text-snow transition-colors">
                        {f === 1 ? "Max" : `${f * 100}%`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {heldConnected && nothingHeld && <Caution text={tb("unlockNoneLocked", { symbol: asset.symbol, network: nameOf(heldOn) })} />}
              {heldConnected && !nothingHeld && lacking && <Caution text={notEnough(asset.symbol)} />}
              {heldConnected && !nothingHeld && fastCap !== null && <span className="text-[11px] opacity-60">{tb("lockFastUpTo", { max: fmtFast(fastCap), symbol: asset.symbol })}</span>}
            </div>
          </div>

          <div className="-mt-4 mx-1 rounded-b-2xl border border-dashed border-ink/25 border-t-0 bg-sand px-4 md:px-6 pt-7 pb-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className="opacity-60 shrink-0">{tb("unlockToLabel")}</span>
              </span>
              {editingRecipient ? (
                <input
                  id="unlock-recipient"
                  type="text"
                  autoFocus
                  spellCheck={false}
                  placeholder={home === "solana" ? tb("lockRecipientSolana") : tb("lockRecipientEvm")}
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value.trim());
                    setRecipientTouched(true);
                  }}
                  onBlur={() => setEditingRecipient(false)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingRecipient(false)}
                  className="flex-1 min-w-0 max-w-xs text-right font-semibold bg-transparent outline-none border-b border-ink/30"
                />
              ) : (
                <span className="flex items-center gap-2 min-w-0">
                  {recipient && recipient !== homeAddress ? (
                    <span className="font-semibold truncate font-mono">{short(recipient)}</span>
                  ) : !recipient ? (
                    <button type="button" onClick={() => setEditingRecipient(true)} className="font-semibold underline">
                      {tb("unlockAddRecipient")}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => setEditingRecipient(true)} aria-label={tb("lockEditRecipient", { network: nameOf(home) })} className="p-1 rounded-md hover:bg-black/5">
                    <Icon icon="solar:pen-bold" className="text-base" />
                  </button>
                </span>
              )}
            </div>
            {recipient.trim() !== "" && !recipientOk && <span className="text-[10px] text-red-500 font-medium text-right">{tb("lockBadRecipient", { network: nameOf(home) })}</span>}
            {typed && (
              <>
                <div className="flex items-center gap-3">
                  {badged(asset, home, "w-9 h-9 md:w-10 md:h-10", "border-sand")}
                  <span className="text-2xl md:text-3xl font-bold opacity-50 truncate tabular-nums">
                    {amount} {asset.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs sm:text-sm opacity-60">
                  <span className="tabular-nums">${usd}</span>
                  <span>
                    {tb("lockFastFee", { fee: formatUnits(fastFee, decimals).replace(/\.0$/, ""), symbol: asset.symbol })} · {tb("lockEta")}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <Button disabled={isProcessing || !!problem} onClick={handleUnlock} buttonText={isProcessing ? t("text10") : (problem ?? tb("tabUnlock"))} />
      </div>




      {/* NETWORK SELECTION MODAL: the asset's own network, or where it is held. */}
      <AnimatedModal isOpen={chainModalOpen} onClose={() => setChainModalOpen(false)} maxWidthClass="lg:w-150">
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">{chainModalSide === "home" ? tb("unlockHomeTitle") : tb("unlockHeldTitle")}</h2>
            <p className="text-[12px] opacity-70">{chainModalSide === "home" ? tb("unlockHomeText") : tb("unlockHeldText", { symbol: asset.symbol, network: nameOf(home) })}</p>
          </div>
          <div className="flex flex-col gap-3 pb-2">
            {networkOptions
              .filter((c) => (chainModalSide === "home" ? true : pairsOf(home).includes(c.key)))
              .map((c) => {
                const isSelected = chainModalSide === "home" ? home === c.key : heldOn === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => pickChain(c.key)}
                    className={`w-full text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                      isSelected ? "border-ink bg-ink! text-snow! shadow-none!" : "border-black/5 hover:bg-black/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Image src={c.logo} alt={c.name} className="w-8 h-8 object-contain" />
                      <span className={`font-bold lg:text-sm ${isSelected ? "" : "opacity-80"}`}>{c.name}</span>
                    </div>
                    {isSelected && <FaCheckCircle className="text-[18px] text-snow" />}
                  </button>
                );
              })}
          </div>
        </div>
        <div className="px-6 py-6 border-t border-black/5 bg-white">
          <ButtonContrast buttonText={t("text128")} onClick={() => setChainModalOpen(false)} />
        </div>
      </AnimatedModal>

      {/* TOKEN SELECTION MODAL: the assets of the asset's own network, as on Lock. */}
      <AnimatedModal isOpen={tokenModalOpen} onClose={() => setTokenModalOpen(false)} maxWidthClass="lg:w-150">
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">{t("text201")}</h2>
            <p className="text-[12px] opacity-70">{tb("lockChooseTokenText", { network: nameOf(home) })}</p>
          </div>
          <div className="flex flex-col gap-3 pb-2">
            {assets.map((a) => {
              const isSelected = asset.token === a.token;
              return (
                <button
                  key={a.token}
                  type="button"
                  onClick={() => {
                    setToken(a.token);
                    setAmount("");
                    setTokenModalOpen(false);
                  }}
                  className={`w-full text-left cursor-pointer transition-all duration-200 p-4 border rounded-xl flex items-center justify-between gap-2 bgBox glass-card ${
                    isSelected ? "border-ink bg-ink! text-snow! shadow-none!" : "border-black/5 hover:bg-black/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {a.icon ? (
                      <Image src={a.icon} alt={a.symbol} width={32} height={32} unoptimized={typeof a.icon === "string"} className="w-8 h-8 rounded-full object-contain shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-black/5 shrink-0" />
                    )}
                    <div className="flex flex-col leading-tight">
                      <span className={`font-bold lg:text-sm ${isSelected ? "" : "opacity-80"}`}>{a.symbol}</span>
                      <span className="text-[11px] opacity-60">{a.name}</span>
                    </div>
                  </div>
                  {isSelected && <FaCheckCircle className="text-[18px] text-snow shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-6 py-6 border-t border-black/5 bg-white">
          <ButtonContrast buttonText={t("text22")} onClick={() => setTokenModalOpen(false)} />
        </div>
      </AnimatedModal>
    </>
  );
}
