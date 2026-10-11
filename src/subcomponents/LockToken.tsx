"use client";

// Lock: any asset Greatwall lists (each network's coin and its RWA test
// tokens), on any network, locked by the iPoW vault so a recipient can use
// it on a network paired with it: From and To networks, a Send card, and
// under it the Receive strip (the recipient, and once an amount is typed,
// the receipt that appears there). Its modals are Convert's.
//
// The pairs are the deployments': every EVM network with Solana, and EVM
// networks with each other. From an EVM network the vault of the pair
// locks it (SDK `lock`); from Solana, the pair's configuration does (the
// SDK's SolanaVault), registering a token with that pair first when it is
// the first lock of it there (open to anyone, a little rent).

import { trackTx } from "@/components/ui/txToast";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { FaCheckCircle } from "react-icons/fa";
import { ZeroAddress, formatUnits, isAddress, parseUnits } from "ethers";
import { PublicKey } from "@solana/web3.js";
import { homeAssets, lock, quoteLock, receiptTokens } from "@ipow/sdk";

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
import { Caution, FaucetButton, rwaOf, useNotEnoughText, useRwaFaucet } from "./ipow/Faucet";
import { BASKET_CHAINS, deploymentOf, isSolanaAddress, readProvider, solanaConnection, solanaVaultOf, solanaVaultWith, type BasketChain, type EvmChain } from "@/components/integrator/ipow/sdk";
import { chainOfNumber } from "@/components/integrator/ipow/crossAssets";
import { rwaTokensOf } from "@/components/integrator/ipow/rwaTokens";
import { balanceOf } from "@/components/integrator/ipow/tokens";
import { lockFastTerms, type FastTerms } from "@/components/integrator/ipow/fastPath";
import { useEvmWallet } from "@/components/integrator/ipow/useEvmWallet";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import { lockPath } from "@/components/integrator/ipow/lockPaths";

type Side = "from" | "to";
/** A network the page locks on or toward: an EVM network, Tempo (its one
 *  vault pairs with Solana), or Solana. */
type Net = BasketChain | "solana";
/** An asset the page offers: the coin ("native") or a token address/mint. */
type Asset = { token: string; symbol: string; name: string; icon: any; decimals: number };
/** What the vault knows of the asset in the pair: its number, its record
 *  unit, and whether its receipt exists on the other side yet. */
type PairInfo = { number: number | null; unit: bigint; recordDecimals: number; receiptMade: boolean | null };

const NATIVE = "native";
const ZERO = BigInt(0);
/** SOL kept back from a SOL lock, and needed for a token lock: the
 *  transaction and the new accounts' rent. */
const SOL_RESERVE = BigInt(10_000_000);
/** An EVM coin kept back by Max for the lock's gas. */
const GAS_RESERVE = BigInt(1_000_000_000_000_000);
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SOLANA_NUMBER = 2;
/** The fast fee every lock pays by default, in basis points of the amount:
 *  an attester makes it usable at once instead of after the slow path. */
const FAST_BPS = BigInt(10);

const numberOf = (n: Net) => (n === "solana" ? SOLANA_NUMBER : deploymentOf(n)!.number);
const vaultsOf = (n: BasketChain) => (deploymentOf(n)!.vaults as readonly { peer: number }[]) ?? [];

/** The networks an asset on `src` can be locked toward: its vault pairs. */
function destinationsOf(src: Net): Net[] {
  if (src === "solana") return BASKET_CHAINS.filter((c) => vaultsOf(c).some((v) => v.peer === SOLANA_NUMBER));
  return vaultsOf(src).flatMap((v) => (v.peer === SOLANA_NUMBER ? ["solana" as Net] : chainOfNumber(v.peer) ? [chainOfNumber(v.peer)! as Net] : []));
}

/** A typed amount, kept to digits, one point and `decimals` after it. */
const clean = (raw: string, decimals: number) => {
  const v = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const dot = v.indexOf(".");
  if (dot < 0) return v;
  return v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, decimals);
};

export default function LockToken({ initial }: { initial: Net }) {
  const t = useTranslations("All");
  const tb = useTranslations("Bridge");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();

  const ethereumWallet = useEthereumWallet();
  const solanaWallet = useSolanaWallet();
  const hyperliquidWallet = useHyperliquidWallet();
  const robinhoodWallet = useRobinhoodWallet();
  const baseWallet = useBaseWallet();
  const arbitrumWallet = useArbitrumWallet();
  const tempoWallet = useTempoWallet();

  // Each network's name, logo and coin, as Convert reads them.
  const networkOptions = useMemo(() => {
    const all: Record<string, any> = { ethereum: ethereumWallet, solana: solanaWallet, hyperliquid: hyperliquidWallet, robinhood: robinhoodWallet, base: baseWallet, arbitrum: arbitrumWallet, tempo: tempoWallet };
    return ([...BASKET_CHAINS, "solana"] as Net[])
      .filter((k) => all[k])
      .map((k) => ({ key: k, name: all[k].networkName as string, logo: all[k].networkLogo, currencyTicker: all[k].currencyTicker as string, decimals: all[k].decimals as number, tokenName: all[k].tokenName as string | undefined, tokenLogo: all[k].tokenLogo }));
  }, [ethereumWallet, solanaWallet, hyperliquidWallet, robinhoodWallet, baseWallet, arbitrumWallet, tempoWallet]);
  const optionOf = (n: Net) => networkOptions.find((o) => o.key === n);
  const nameOf = (n: Net) => optionOf(n)?.name ?? n;

  const sources: Net[] = useMemo(() => networkOptions.map((o) => o.key), [networkOptions]);
  const start: Net = sources.includes(initial) ? initial : "ethereum";
  // A link may pick the asset and where it is used (?token=, ?to=).
  const query = useSearchParams();
  const [src, setSrc] = useState<Net>(start);
  const [dst, setDst] = useState<Net>(() => {
    const to = query.get("to") as Net | null;
    return to && destinationsOf(start).includes(to) ? to : (destinationsOf(start)[0] ?? "solana");
  });
  const [token, setToken] = useState<string>(() => {
    const tk = query.get("token");
    return tk && rwaTokensOf(start).some((r) => r.token.toLowerCase() === tk.toLowerCase()) ? rwaTokensOf(start).find((r) => r.token.toLowerCase() === tk.toLowerCase())!.token : NATIVE;
  });
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientTouched, setRecipientTouched] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceFailed, setBalanceFailed] = useState(false);
  const [solBalance, setSolBalance] = useState<bigint | null>(null);
  const [info, setInfo] = useState<PairInfo | null>(null);
  const [infoFailed, setInfoFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chainModalOpen, setChainModalOpen] = useState(false);
  const [chainModalSide, setChainModalSide] = useState<Side>("from");
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  const srcEvm = useEvmWallet(src === "solana" ? null : src);
  const dstEvm = useEvmWallet(dst === "solana" ? null : dst);
  const prices = useUsdValue();
  const srcConnected = src === "solana" ? !!solanaWallet.connected : srcEvm.connected;
  const srcAddress = src === "solana" ? solanaWallet.address : srcEvm.address;
  const dstConnected = dst === "solana" ? !!solanaWallet.connected : dstEvm.connected;
  const dstAddress = dst === "solana" ? solanaWallet.address : dstEvm.address;

  /** The coin and the RWA tokens Greatwall lists on a network. */
  const getAssetsForChain = (n: Net): Asset[] => {
    const o = optionOf(n);
    const coin: Asset = { token: NATIVE, symbol: o?.currencyTicker ?? "", name: o?.tokenName ?? o?.name ?? n, icon: o?.tokenLogo ?? o?.logo ?? null, decimals: o?.decimals ?? (n === "solana" ? 9 : 18) };
    const tokens = rwaTokensOf(n).map((r) => ({ token: r.token, symbol: r.symbol, name: r.name, icon: r.logo ?? null, decimals: r.decimals }));
    // Tempo has no coin of its own (its fees are PathUSD): its tokens only.
    return n === "tempo" ? tokens : [coin, ...tokens];
  };
  const assets = useMemo(() => getAssetsForChain(src), [src, networkOptions]); // eslint-disable-line react-hooks/exhaustive-deps
  const asset = assets.find((a) => a.token === token) ?? assets[0];

  // The recipient: the destination wallet's address until one is typed.
  useEffect(() => {
    if (!recipientTouched) setRecipient(dstAddress ?? "");
  }, [dstAddress, dst, recipientTouched]);
  useEffect(() => setRecipientTouched(false), [dst]);

  // The wallet's balance of the asset on the source. Read again (after a
  // lock or a faucet claim), the shown balance stays until the new one
  // comes; the skeleton is for a new asset or wallet only.
  const balanceFor = useRef<string | null>(null);
  useEffect(() => {
    const key = `${src}:${asset.token}:${srcAddress ?? ""}`;
    if (balanceFor.current !== key) {
      setBalance(null);
      setSolBalance(null);
    }
    balanceFor.current = key;
    setBalanceFailed(false);
    if (!srcAddress) return;
    let live = true;
    (async () => {
      if (src === "solana") {
        const conn = solanaConnection();
        const owner = new PublicKey(srcAddress);
        const sol = BigInt(await conn.getBalance(owner));
        if (live) setSolBalance(sol);
        if (asset.token === NATIVE) return sol;
        // The lock spends from the wallet's associated account, so only it counts.
        const mint = new PublicKey(asset.token);
        const program = (await conn.getAccountInfo(mint))?.owner;
        if (!program) return ZERO;
        const [ata] = PublicKey.findProgramAddressSync([owner.toBuffer(), program.toBuffer(), mint.toBuffer()], ATA_PROGRAM);
        if (!(await conn.getAccountInfo(ata))) return ZERO;
        return BigInt((await conn.getTokenAccountBalance(ata)).value.amount);
      }
      return asset.token === NATIVE ? readProvider(src).getBalance(srcAddress) : balanceOf(src, asset.token, srcAddress);
    })()
      .then((b) => live && setBalance(b))
      .catch(() => {
        if (live) setBalanceFailed(true);
      });
    return () => {
      live = false;
    };
  }, [src, asset.token, srcAddress, refresh]);

  // What the pair's vault knows of the asset, and whether its receipt is
  // made on the destination yet (a first lock waits for an operator).
  useEffect(() => {
    setInfo(null);
    setInfoFailed(false);
    let live = true;
    (async (): Promise<PairInfo> => {
      if (src === "solana") {
        const v = solanaVaultWith(dst as EvmChain, null);
        const all = await v.assets();
        const a = asset.token === NATIVE ? all[0] : all.find((x) => x.mint === asset.token);
        if (!a) return { number: null, unit: BigInt(1), recordDecimals: Math.min(asset.decimals, 9), receiptMade: false };
        const dd = deploymentOf(dst as EvmChain)!;
        const pair = (dd.vaults as readonly { peer: number }[]).findIndex((x) => x.peer === SOLANA_NUMBER);
        const made = await receiptTokens(readProvider(dst as EvmChain), dd, pair, a.number + 1).then((m) => m.has(a.number)).catch(() => null);
        return { number: a.number, unit: a.unit, recordDecimals: a.recordDecimals, receiptMade: made };
      }
      const d = deploymentOf(src)!;
      const pair = vaultsOf(src).findIndex((v) => v.peer === numberOf(dst));
      const all = await homeAssets(readProvider(src), d, pair);
      const a = all.find((x) => (asset.token === NATIVE ? x.token === ZeroAddress : x.token.toLowerCase() === asset.token.toLowerCase()));
      if (!a) return { number: null, unit: BigInt(1), recordDecimals: 9, receiptMade: false };
      let made: boolean | null = null;
      if (dst === "solana") {
        made = await solanaConnection().getAccountInfo(solanaVaultOf(src).receiptMint(a.number)).then((x) => x !== null).catch(() => null);
      } else {
        const dd = deploymentOf(dst)!;
        const back = (dd.vaults as readonly { peer: number }[]).findIndex((x) => x.peer === d.number);
        made = await receiptTokens(readProvider(dst), dd, back, a.number + 1).then((m) => m.has(a.number)).catch(() => null);
      }
      return { number: a.number, unit: a.unit, recordDecimals: a.recordDecimals, receiptMade: made };
    })()
      .then((i) => live && setInfo(i))
      .catch(() => live && setInfoFailed(true));
    return () => {
      live = false;
    };
  }, [src, dst, asset.token, asset.decimals, refresh]);

  // The most the operator delivers at once right now, in record units: its
  // limit for the asset on this pair, and the receipts it holds there.
  // undefined while read; null when it does not deliver this asset fast.
  const [fast, setFast] = useState<FastTerms | null | undefined>(undefined);
  useEffect(() => {
    setFast(undefined);
    if (info?.number == null) return;
    let live = true;
    lockFastTerms(src, dst, info.number)
      .then((m) => live && setFast(m))
      .catch(() => live && setFast(undefined));
    return () => {
      live = false;
    };
  }, [src, dst, info?.number, refresh]);

  // Amounts in the asset's units; a lock counts whole record units.
  const places = Math.min(asset.decimals, info?.recordDecimals ?? 9);
  useEffect(() => setAmount((a) => clean(a, places)), [places]);
  let amountUnits: bigint | null = null;
  try {
    amountUnits = parseUnits(amount.trim() || "0", asset.decimals);
  } catch {
    amountUnits = null;
  }
  const spendable = balance === null ? null : src === "solana" && asset.token === NATIVE ? (balance > SOL_RESERVE ? balance - SOL_RESERVE : ZERO) : balance;
  const unit = info?.unit && info.unit > ZERO ? info.unit : BigInt(1);
  /** The fast fee for an amount, rounded up to whole record units. */
  /** The fast fee for an amount: Greatwall's share, at least the operator's
   *  least fast fee (so the operator always pays it at once), rounded up to
   *  whole record units. */
  const fastFeeOf = (x: bigint) => {
    const share = (x * FAST_BPS + BigInt(9_999)) / BigInt(10_000);
    const least = fast ? fast.minFee * unit : ZERO;
    const f = share > least ? share : least;
    return ((f + unit - BigInt(1)) / unit) * unit;
  };
  const fastFee = amountUnits && amountUnits > ZERO ? fastFeeOf(amountUnits) : ZERO;
  /** The most this wallet can lock: its balance less a gas reserve on an
   *  EVM coin, in whole record units. */
  const maxLock = (() => {
    if (spendable === null) return null;
    const left = spendable - (src !== "solana" && asset.token === NATIVE ? GAS_RESERVE : ZERO);
    if (left <= ZERO) return ZERO;
    // Room for the fast fee on top: amount + amount × FAST_BPS / 10000 ≤ left.
    let most = ((left * BigInt(10_000)) / (BigInt(10_000) + FAST_BPS) / unit) * unit;
    while (most > ZERO && most + fastFeeOf(most) > left) most -= unit;
    return most;
  })();
  /** The fast path's cap in the asset's units, when known. */
  const fastCap = fast === undefined || fast === null ? null : fast.max * unit;
  const fmtFast = (v: bigint) => formatUnits(v, asset.decimals).replace(/\.0$/, "");
  const overFast = fastCap !== null && !!amountUnits && amountUnits > fastCap;
  const maxLockFast = maxLock !== null && fastCap !== null && fastCap < maxLock ? fastCap : maxLock;
  const fmtBalance = (v: bigint) => (Number(v) / 10 ** asset.decimals).toLocaleString("en-US", { maximumFractionDigits: 6 });
  const setFraction = (f: number) => {
    if (maxLockFast === null) return;
    const v = (((maxLockFast * BigInt(Math.round(f * 100))) / BigInt(100)) / unit) * unit;
    setAmount(v > ZERO ? clean(formatUnits(v, asset.decimals).replace(/\.0$/, ""), places) : "");
  };
  // A token lock on Solana still pays SOL: fees, the lock's rent and, the first time, the registration's.
  const lacksSol = src === "solana" && asset.token !== NATIVE && solBalance !== null && solBalance < SOL_RESERVE;
  const recipientOk = dst === "solana" ? isSolanaAddress(recipient) : isAddress(recipient.trim());

  // Why it can't lock yet, said under the card, as Convert says its wallet note.
  const problem = !srcConnected
    ? tb("lockConnect", { network: nameOf(src) })
    : !amountUnits || amountUnits <= ZERO
      ? null
      : fast === null && info !== null && info.number !== null
        ? tb("lockNotFast", { from: nameOf(src), to: nameOf(dst) })
        : overFast
          ? tb("lockOverFast", { max: fmtFast(fastCap!), symbol: asset.symbol })
          : spendable !== null && amountUnits + fastFee > spendable
        ? tb("notEnough", { symbol: asset.symbol })
        : lacksSol
          ? tb("notEnough", { symbol: "SOL" })
          : !recipient.trim()
            ? dstConnected
              ? tb("lockEnterRecipient", { network: nameOf(dst) })
              : tb("lockConnect", { network: nameOf(dst) })
            : !recipientOk
              ? tb("lockBadRecipient", { network: nameOf(dst) })
              : infoFailed
                ? tb("lockInfoFailed")
                : src !== "solana" && info !== null && info.number === null
                  ? tb("lockNotCarried", { network: nameOf(dst) })
                  : null;
  // Locked only once the fast path's cap is known: never one that would wait a week.
  const canLock = !problem && !!amountUnits && amountUnits > ZERO && info !== null && (info.number === null || fast !== undefined);
  const usd = (() => {
    const p = prices.priceOf(asset.symbol);
    const n = Number(amount);
    if (!amount || isNaN(n) || p === null) return "0.00";
    return (n * p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  })();

  const openChainPicker = (side: Side) => {
    setChainModalSide(side);
    setChainModalOpen(true);
    setTokenModalOpen(false);
  };
  // "Lock on" is the navbar's network: choosing one here moves the
  // navbar there, and the navbar's choice moves it here.
  const chooseSrc = (n: Net, to: Net = dst) => {
    const ds = destinationsOf(n);
    const d = ds.includes(to) ? to : ds[0];
    setSrc(n);
    setDst(d);
    setToken(NATIVE);
    setAmount("");
    if (n !== initial) router.replace(`${lockPath(locale, n)}?to=${d}`, { scroll: false });
  };
  useEffect(() => {
    if (initial !== src && sources.includes(initial)) chooseSrc(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);
  const pickChain = (n: Net) => {
    if (chainModalSide === "from") {
      chooseSrc(n);
    } else {
      setDst(n);
    }
    setChainModalOpen(false);
  };
  const pickToken = (a: Asset) => {
    setToken(a.token);
    setAmount("");
    setTokenModalOpen(false);
  };
  // The networks flipped, where the pair runs both ways.
  const swap = () => {
    if (!destinationsOf(dst).includes(src)) return;
    chooseSrc(dst, src);
  };

  const handleLock = async () => {
    if (!canLock || !amountUnits) return;
    setIsProcessing(true);
    // The send, as one step for its toast: it resolves with its hash.
    const send = async (): Promise<string> => {
      if (src === "solana") {
        const anchor = solanaWallet.getAnchorWallet();
        if (!anchor) throw new Error(tb("lockConnect", { network: nameOf("solana") }));
        const v = solanaVaultWith(dst as EvmChain, anchor);
        let number = info!.number;
        // Registered since the page read the pair (by this page or anyone): use it.
        if (number === null) number = (await v.assetOfMint(asset.token))?.number ?? null;
        if (number === null) number = (await v.registerToken(asset.token)).asset;
        return (await v.lock({ asset: number, recipient: recipient.trim(), amount: amountUnits, fee: ZERO, fastFee })).signature;
      }
      if (!srcEvm.getSigner) throw new Error(tb("lockConnect", { network: nameOf(src) }));
      const d = deploymentOf(src)!;
      const signer = await srcEvm.getSigner();
      const onChain = (await signer.provider?.getNetwork())?.chainId;
      if (onChain !== undefined && onChain !== BigInt(d.chainId)) throw new Error(tb("wrongNetwork"));
      const pair = vaultsOf(src).findIndex((v) => v.peer === numberOf(dst));
      const q = await quoteLock(readProvider(src), d, { asset: info!.number!, amount: amountUnits, fee: ZERO, fastFee, pair });
      return (await lock(signer, d, q, recipient.trim())).txHash;
    };
    try {
      const r = await trackTx(src, `Lock ${amount} ${asset.symbol} for ${nameOf(dst)}`, send, (h) => h, {
        done: `${tb("lockDone", { amount, symbol: asset.symbol, network: nameOf(dst) })}. ${tb("timing")}`,
      });
      if (!r.ok) return;
      setAmount("");
      setRefresh((n) => n + 1);
    } finally {
      setIsProcessing(false);
    }
  };

  const connectButton = (n: Net) =>
    n === "ethereum" ? <EthereumConnectButton /> : n === "solana" ? <SolanaConnectButton /> : n === "base" ? <BaseConnectButton /> : n === "robinhood" ? <RobinhoodConnectButton /> : n === "hyperliquid" ? <HyperliquidConnectButton /> : n === "arbitrum" ? <ArbitrumConnectButton /> : n === "tempo" ? <TempoConnectButton /> : null;

  const tokenPill = (a: Asset, onClick?: () => void) => {
    const inner = (
      <>
        {a.icon ? (
          <Image src={a.icon} alt={a.symbol} width={40} height={40} unoptimized={typeof a.icon === "string"} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-contain" />
        ) : (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary/10" />
        )}
        <div className="leading-tight">
          <div className="flex items-center gap-0.5 md:gap-1">
            <p className="text-base sm:text-lg font-bold">{a.symbol}</p>
            {onClick && <Icon icon="lsicon:down-filled" className="text-xs sm:text-base" />}
          </div>
        </div>
      </>
    );
    return onClick ? (
      <button type="button" onClick={onClick} className="hover:bg-black/10 shrink-0 flex glass-card pr-2 rounded-full items-center gap-2 text-left cursor-pointer hover:opacity-90 transition-all">
        {inner}
      </button>
    ) : (
      <div className="shrink-0 flex glass-card pr-2 rounded-full items-center gap-2 text-left">{inner}</div>
    );
  };

  // A test RWA token held none of, or too little: its faucet, as the mint panel offers it.
  const rwa = rwaOf(src, asset.token);
  const faucet = useRwaFaucet(src, srcAddress, srcEvm.faucet, () => setRefresh((n) => n + 1));
  const lacking = balance !== null && (balance === ZERO || (!!amountUnits && amountUnits + fastFee > (spendable ?? ZERO)));
  const canFaucet = srcConnected && faucet.available(rwa);
  const notEnough = useNotEnoughText();
  const short = (x: string) => (x.length > 16 ? `${x.slice(0, 6)}…${x.slice(-4)}` : x);
  const typed = !!amountUnits && amountUnits > ZERO;
  const [editingRecipient, setEditingRecipient] = useState(false);

  /** One side's network: a card that opens the network picker. */
  const networkCard = (n: Net, side: Side) => (
    <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2 rounded-2xl glass-card px-4 py-3 md:px-5 md:py-4">
      <button type="button" onClick={() => openChainPicker(side)} className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer rounded-xl -m-1 p-1 hover:bg-black/5 transition-colors">
        {optionOf(n)?.logo && <Image src={optionOf(n)!.logo} alt={nameOf(n)} className="w-9 h-9 md:w-11 md:h-11 rounded-full object-contain shrink-0" />}
        <span className="flex flex-col min-w-0 leading-tight">
          <span className="text-[11px] md:text-xs opacity-60">{side === "from" ? tb("lockFromLabel") : tb("lockToLabel")}</span>
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
        {/* ================= NETWORKS ================= */}
        <div className="relative flex items-stretch gap-2">
          {networkCard(src, "from")}
          <button
            type="button"
            onClick={swap}
            aria-label={tb("lockSwap")}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-lg bg-cream border-4 border-cream flex items-center justify-center"
          >
            <span className="w-full h-full rounded-md bg-paper glass-card flex items-center justify-center text-xs">
              <Icon icon="solar:arrow-right-linear" />
            </span>
          </button>
          {networkCard(dst, "to")}
        </div>

        {/* ================= SEND, and RECEIVE tucked under it ================= */}
        <div className="flex flex-col">
          <div className="relative z-10 rounded-2xl border border-ink bg-paper shadow-sm">
            <div className="py-4 px-4 md:py-5 md:px-6 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="opacity-60">{tb("tabLock")}</span>
                </span>
                {srcConnected ? (
                  <span className="flex items-center gap-1">
                    <span className="opacity-60">{tb("lockBalance")}</span>
                    {balanceFailed ? <span className="font-bold">—</span> : balance === null ? <span className="inline-block h-4 w-20 rounded bg-black/10 animate-pulse align-middle" aria-label="Loading balance" /> : <span className="font-bold tabular-nums">{`${fmtBalance(balance)} ${asset.symbol}`}</span>}
                    {canFaucet && lacking && <span className="ml-1"><FaucetButton busy={faucet.busy === rwa!.token} onClick={() => faucet.claim(rwa!)} /></span>}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3 w-full">
                <input
                  id="lock-amount"
                  key={src}
                  type="text"
                  inputMode="decimal"
                  aria-label={tb("tabLock")}
                  className="flex-1 min-w-0 text-4xl md:text-5xl font-bold bg-transparent outline-none border-none truncate"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(clean(e.target.value, places))}
                />
                {tokenPill(asset, () => {
                  setTokenModalOpen(true);
                  setChainModalOpen(false);
                })}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm opacity-60 tabular-nums">${usd}</span>
                {maxLock !== null && (
                  <div className="flex justify-end gap-2">
                    {[0.25, 0.75, 1].map((f) => (
                      <button key={f} type="button" onClick={() => setFraction(f)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-ink hover:text-snow transition-colors">
                        {f === 1 ? "Max" : `${f * 100}%`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {srcConnected && lacking && <Caution text={notEnough(asset.symbol)} />}
              {fastCap !== null && <span className="text-[11px] opacity-60">{tb("lockFastUpTo", { max: fmtFast(fastCap), symbol: asset.symbol })}</span>}
            </div>
          </div>

          <div className="-mt-4 mx-1 rounded-b-2xl border border-dashed border-ink/25 border-t-0 bg-sand px-4 md:px-6 pt-7 pb-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className="opacity-60 shrink-0">{tb("lockToLabel")}</span>
              </span>
              {editingRecipient ? (
                <input
                  id="lock-recipient"
                  type="text"
                  autoFocus
                  spellCheck={false}
                  placeholder={dst === "solana" ? tb("lockRecipientSolana") : tb("lockRecipientEvm")}
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
                  {recipient && recipient !== dstAddress ? (
                    <span className="font-semibold truncate font-mono">{short(recipient)}</span>
                  ) : !recipient ? (
                    <button type="button" onClick={() => setEditingRecipient(true)} className="font-semibold underline">
                      {tb("unlockAddRecipient")}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => setEditingRecipient(true)} aria-label={tb("lockEditRecipient", { network: nameOf(dst) })} className="p-1 rounded-md hover:bg-black/5">
                    <Icon icon="solar:pen-bold" className="text-base" />
                  </button>
                </span>
              )}
            </div>
            {recipient.trim() !== "" && !recipientOk && <span className="text-[10px] text-red-500 font-medium text-right">{tb("lockBadRecipient", { network: nameOf(dst) })}</span>}
            {typed && (
              <>
                <div className="flex items-center gap-3">
                  <span className="relative shrink-0">
                    {asset.icon ? (
                      <Image src={asset.icon} alt={asset.symbol} width={40} height={40} unoptimized={typeof asset.icon === "string"} className="w-9 h-9 md:w-10 md:h-10 rounded-full object-contain" />
                    ) : (
                      <span className="block w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/5" />
                    )}
                    {optionOf(dst)?.logo && <Image src={optionOf(dst)!.logo} alt={nameOf(dst)} className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-sand" />}
                  </span>
                  <span className="text-2xl md:text-3xl font-bold opacity-50 truncate tabular-nums">
                    {amount} {asset.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs sm:text-sm opacity-60">
                  <span className="tabular-nums">${usd}</span>
                  <span>
                    {tb("lockFastFee", { fee: formatUnits(fastFee, asset.decimals).replace(/\.0$/, ""), symbol: asset.symbol })} · {tb("lockEta")}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <Button
          disabled={isProcessing || !canLock}
          onClick={handleLock}
          buttonText={isProcessing ? t("text10") : !srcConnected ? tb("lockConnect", { network: nameOf(src) }) : !typed ? tb("enterAmount") : problem ?? (info === null && !infoFailed ? tb("loading") : tb("tabLock"))}
        />
      </div>




      {/* NETWORK SELECTION MODAL */}
      <AnimatedModal isOpen={chainModalOpen} onClose={() => setChainModalOpen(false)} maxWidthClass="lg:w-150">
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">{chainModalSide === "from" ? t("text199") : t("text200")}</h2>
            <p className="text-[12px] opacity-70">{t("text197")}</p>
          </div>

          <div className="flex flex-col gap-3 pb-2">
            {networkOptions
              .filter((c) => (chainModalSide === "from" ? true : destinationsOf(src).includes(c.key)))
              .map((c) => {
                const isSelected = chainModalSide === "from" ? src === c.key : dst === c.key;
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
          <div className="flex justify-center w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast buttonText={t("text128")} onClick={() => setChainModalOpen(false)} />
            </div>
          </div>
        </div>
      </AnimatedModal>

      {/* TOKEN SELECTION MODAL */}
      <AnimatedModal isOpen={tokenModalOpen} onClose={() => setTokenModalOpen(false)} maxWidthClass="lg:w-150">
        <div className="flex flex-col p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="flex flex-col gap-0 pb-5">
            <h2 className="text-xl font-bold">{t("text201")}</h2>
            <p className="text-[12px] opacity-70">{tb("lockChooseTokenText", { network: nameOf(src) })}</p>
          </div>

          <div className="flex flex-col gap-3 pb-2">
            {assets.map((a) => {
              const isSelected = asset.token === a.token;
              return (
                <button
                  key={a.token}
                  type="button"
                  onClick={() => pickToken(a)}
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
          <div className="flex justify-center w-full">
            <div className="w-full sm:flex-1">
              <ButtonContrast buttonText={t("text22")} onClick={() => setTokenModalOpen(false)} />
            </div>
          </div>
        </div>
      </AnimatedModal>
    </>
  );
}
