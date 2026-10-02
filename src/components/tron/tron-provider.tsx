"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { TronWeb } from "tronweb";

import { useNetwork } from "@/app/network-provider";
import { tronnetwork } from "@/index";
import { appConfig, TronWalletContextType, TronWalletType } from "./config";
import { VERIFIED_TRC20_TOKENS } from "./config/constants";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
] as const;

const TronWalletContext = createContext<TronWalletContextType>({
  connected: false,
  address: null,
  isConnecting: false,
  walletType: null,
  availableWallets: [],
  balance: { confirmed: 0, unconfirmed: 0, sendable: 0, fetched: false, tokens: [] },
  estimatedFee: { low: 0, medium: 0, high: 0, selectedFee: "medium", fetched: false },
  setFeeSelection: () => {},
  currencyTicker: "TRX",
  decimals: 6,
  ipowDecimals: 6,
  networkName: "Tron",
  networkDescription: {},
  selfCustodyParameter: {},
  networkLogo: tronnetwork,
  price: {},
  networkExplorer: {},
  ipowConvert: "comingsoon",
  ipowNetworkId: 6,
  dappList: [],
  toggleFavoriteDapp: () => {},
  connect: async () => {},
  disconnect: () => {},
  switchWallet: async () => {},
  signMessage: async () => null,
  sendTokenTo: async () => null,
  checkAddress: () => ({ valid: false, reason: "invalid" }),
  isValidAddress: () => false,
  fetchETA: async () => null,
  commitNativeToBitcoin: async () => null,
  commitBitcoinToNative: async () => null,
  depositApprovedConversion: async () => null,
  submitBitcoinMerkleProofWithTx: async () => null,
  getMyTxIds: async () => [],
  getConversion: async () => null,
  refundIfNotApproved: async () => null,
  claimNativeAfterOperatorExpired: async () => null,
  refundAfterNoProofNativeToBitcoin: async () => null,
  estimateBitcoinFromNative: async () => null,
  estimateNativeFromBitcoin: async () => null,
  anchorInfo: async () => null,
  proofInfo: async () => null,
  windowsFor: async () => null,
  globalHeightToHashLE: async () => null,
  globalHeaders: async () => null,
});

export function useTronWallet() {
  return useContext(TronWalletContext);
}

/** TronLink's modern injected provider (window.tron) — request/event surface per TRON's
 * own developer docs. Falls back to the legacy window.tronLink/window.tronWeb globals for
 * older extension versions. */
function getTronLinkProvider(): any {
  if (typeof window === "undefined") return null;
  const modern = (window as any).tron;
  if (modern?.isTronLink) return modern;
  const legacy = (window as any).tronLink;
  if (legacy) return legacy;
  return null;
}

export function TronProvider({ children }: { children: ReactNode }) {
  const { tronMainnet } = useNetwork();
  const isMainnet = tronMainnet;
  const currentNetworkConfig = useMemo(() => {
    return isMainnet ? appConfig.networks.mainnet : appConfig.networks.testnet;
  }, [isMainnet]);

  const netKey = useMemo<"mainnet" | "testnet">(() => (isMainnet ? "mainnet" : "testnet"), [isMainnet]);

  const readOnlyTronWeb = useMemo(() => {
    return new TronWeb({ fullHost: currentNetworkConfig.fullHost });
  }, [currentNetworkConfig.fullHost]);

  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<TronWalletType | null>(null);
  const [availableWallets, setAvailableWallets] = useState<TronWalletType[]>([]);
  const [injectedProvider, setInjectedProvider] = useState<any>(null);

  const [price, setPrice] = useState(null);
  const [dappList, setDappList] = useState<any[] | null>(null);
  const [selfCustodyParameter, setSelfCustodyParameter] = useState<CustodyParams>({
    network: "TRON",
    env: isMainnet ? "MAINNET" : "TESTNET",
    tokens: [],
    fetched: false,
  });

  const [balance, setBalance] = useState<{
    confirmed: number;
    unconfirmed: number;
    fetched: boolean;
    tokens: any[];
  }>({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });

  const [estimatedFee, setEstimatedFee] = useState<{
    low: number;
    medium: number;
    high: number;
    selectedFee: "low" | "medium" | "high";
    fetched: boolean;
  }>({ low: 0, medium: 0, high: 0, selectedFee: "medium", fetched: false });

  useEffect(() => {
    setAvailableWallets(getTronLinkProvider() ? ["tronlink"] : []);
  }, []);

  const connect = async (_wallet: TronWalletType, isAutoConnect = false) => {
    setIsConnecting(true);
    try {
      const provider = getTronLinkProvider();
      if (!provider) {
        if (!isAutoConnect) console.warn("TronLink not detected");
        return;
      }

      if (typeof provider.request === "function") {
        await provider.request({ method: "eth_requestAccounts" });
      }

      const tronWeb = provider.tronWeb;
      const connectedAddress: string | undefined = tronWeb?.defaultAddress?.base58 || undefined;

      if (!connectedAddress) {
        if (isAutoConnect) return;
        throw new Error("TronLink did not return a connected address.");
      }

      setInjectedProvider(provider);
      setAddress(connectedAddress);
      setWalletType("tronlink");
      setConnected(true);
      localStorage.setItem(`tronConnected_${netKey}`, "true");
    } catch (err: any) {
      console.error("Tron connection error:", err?.message ?? err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = (_hardDisconnect: boolean) => {
    setConnected(false);
    setAddress(null);
    setWalletType(null);
    setInjectedProvider(null);
    setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });
    localStorage.removeItem(`tronConnected_${netKey}`);
  };

  const switchWallet = async (wallet: TronWalletType) => {
    disconnect(false);
    await connect(wallet);
  };

  // TronLink fires account/network changes via a `message` event with a specific payload
  // shape (legacy) as well as the modern provider.on(...) surface — listen for both so this
  // keeps working across TronLink versions.
  useEffect(() => {
    if (!connected) return;
    const provider = getTronLinkProvider();

    const handleAccountsChanged = () => {
      const tronWeb = provider?.tronWeb;
      const next: string | undefined = tronWeb?.defaultAddress?.base58 || undefined;
      if (next && next !== address) {
        setAddress(next);
      } else if (!next) {
        disconnect(false);
      }
    };

    if (provider?.on) {
      provider.on("accountsChanged", handleAccountsChanged);
      provider.on("disconnect", () => disconnect(false));
    }

    const handleMessage = (e: MessageEvent) => {
      const msg = e.data?.message;
      if (!msg) return;
      if (msg.action === "accountsChanged" || msg.action === "setAccount") {
        handleAccountsChanged();
      } else if (msg.action === "disconnect" || msg.action === "disconnectWeb") {
        disconnect(false);
      }
    };
    window.addEventListener("message", handleMessage);

    return () => {
      provider?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.removeEventListener("message", handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, address]);

  // Auto-reconnect on mount if a prior session flag is set and TronLink is already
  // authorized for this site (no popup — read-only check).
  useEffect(() => {
    const wasConnected = localStorage.getItem(`tronConnected_${netKey}`) === "true";
    if (wasConnected) {
      connect("tronlink", true);
    } else {
      setConnected(false);
      setAddress(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netKey]);

  const checkAddress = useCallback((addr: string): AddressCheckResult => {
    try {
      if (TronWeb.isAddress(addr)) return { valid: true, reason: null };
    } catch {
      // fall through
    }
    if (!addr.startsWith("T")) return { valid: false, reason: "wrong-prefix" };
    if (addr.length !== 34) return { valid: false, reason: "wrong-length" };
    return { valid: false, reason: "invalid" };
  }, []);

  const isValidAddress = useCallback((addr: string): boolean => checkAddress(addr).valid, [checkAddress]);

  const signMessage = async (message: string): Promise<string | null> => {
    try {
      const tronWeb = injectedProvider?.tronWeb;
      if (!tronWeb) return null;
      return await tronWeb.trx.signMessageV2(message);
    } catch (err) {
      console.error("Tron signMessage error:", err);
      return null;
    }
  };

  const sendTokenTo = async (
    to: string,
    amount: number,
    _customFee?: number,
    token?: { address: string; decimals: number },
  ): Promise<string | null> => {
    const tronWeb = injectedProvider?.tronWeb;
    if (!tronWeb || !address) return null;

    try {
      if (token) {
        const contract = await tronWeb.contract(ERC20_ABI as any, token.address);
        const amountUnits = BigInt(Math.round(amount * 10 ** token.decimals));
        const txId: string = await contract.methods.transfer(to, amountUnits.toString()).send({
          feeLimit: 100_000_000, // 100 TRX cap on TRC-20 energy burn — TronLink still shows the real cost for approval
        });
        return txId;
      }

      const tx = await tronWeb.transactionBuilder.sendTrx(to, Math.round(amount * 1_000_000), address);
      const signedTx = await tronWeb.trx.sign(tx);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);
      if (result?.result) return result.txid ?? signedTx.txID ?? null;
      console.error("Tron sendTokenTo: broadcast was not accepted", result);
      return null;
    } catch (err) {
      console.error("Tron sendTokenTo error:", err);
      return null;
    }
  };

  const fetchETA = async (
    _txHash: string,
  ): Promise<{ estimatedSeconds: number; isCongested: boolean } | null> => {
    // Tron blocks finalize in ~3s and transactions are confirmed almost immediately once
    // included — no live lookup needed for a reasonable estimate.
    return { estimatedSeconds: 3, isCongested: false };
  };

  const setFeeSelection = (selectedFee: "low" | "medium" | "high") => {
    setEstimatedFee((prev) => ({ ...prev, selectedFee }));
  };

  const fetchBalance = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (!address) return;
    try {
      const [sunBalance, tokens] = await Promise.all([
        readOnlyTronWeb.trx.getBalance(address),
        fetchHeldTrc20Balances(readOnlyTronWeb, address, VERIFIED_TRC20_TOKENS[netKey]).catch((err) => {
          console.error("Failed to fetch held TRC-20 balances:", err);
          return null;
        }),
      ]);
      if (signal?.aborted) return;

      const confirmed = sunBalance / 1_000_000;
      setBalance((prev) => {
        const nextTokens = tokens === null ? prev.tokens : tokens;
        const tokensChanged = JSON.stringify(prev.tokens) !== JSON.stringify(nextTokens);
        if (!tokensChanged && prev.fetched && prev.confirmed === confirmed) return prev;
        return { confirmed, unconfirmed: 0, fetched: true, tokens: nextTokens };
      });
    } catch (err) {
      if (signal?.aborted) return;
      console.error("Failed to fetch Tron balance:", err);
      setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });
    }
  }, [address, readOnlyTronWeb, netKey]);

  useEffect(() => {
    if (!address) return;
    const controller = new AbortController();
    fetchBalance(controller.signal);
    const interval = setInterval(() => fetchBalance(controller.signal), 15000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [address, fetchBalance]);

  // Tron's fee model is bandwidth/energy-based, not a gas auction — a plain TRX transfer is
  // free while the account has spare free bandwidth (every account gets some daily) and only
  // costs TRX once that's exhausted. This is a simple, honest estimate of that worst case
  // (full bandwidth burn), not a precise per-account bandwidth query — good enough to show a
  // sane upper bound without the complexity of modeling TRON's resource economics exactly.
  const estimateFee = useCallback(() => {
    const TRANSFER_BYTES = 250; // typical signed TRX transfer size
    const BANDWIDTH_PRICE_SUN = 1000; // current network-wide price per byte of bandwidth
    const worstCaseTrx = (TRANSFER_BYTES * BANDWIDTH_PRICE_SUN) / 1_000_000;

    setEstimatedFee((prev) => ({
      low: 0,
      medium: worstCaseTrx,
      high: worstCaseTrx,
      fetched: true,
      selectedFee: prev.selectedFee,
    }));
  }, []);

  useEffect(() => {
    estimateFee();
  }, [estimateFee]);

  const favoriteTimers = useRef<Record<number, NodeJS.Timeout>>({});
  const toggleFavoriteDapp = async (dappId: number) => {
    if (!address) return;
    setDappList((prev) =>
      prev!.map((dapp) =>
        dapp.id === dappId
          ? {
              ...dapp,
              favoriteCount: dapp.isFavorited ? Math.max(0, dapp.favoriteCount - 1) : dapp.favoriteCount + 1,
              isFavorited: !dapp.isFavorited,
            }
          : dapp,
      ),
    );
    if (favoriteTimers.current[dappId]) clearTimeout(favoriteTimers.current[dappId]);
    favoriteTimers.current[dappId] = setTimeout(async () => {
      try {
        const response = await fetch("/api/dapphub/favorite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address, network: "TRON", dappId }),
        });
        const result = await response.json();
        if (result.success) {
          setDappList((prev) =>
            prev!.map((dapp) => (dapp.id === dappId ? { ...dapp, favoriteCount: result.favoriteCount } : dapp)),
          );
        }
      } catch (error) {
        console.error("Failed to sync favorite with server:", error);
      } finally {
        delete favoriteTimers.current[dappId];
      }
    }, 800);
  };

  useEffect(() => {
    setDappList(null);
    const fetchDapps = async () => {
      try {
        const addressQuery = address ? `&walletAddress=${address}` : "";
        const response = await fetch(`/api/dapphub/list?network=TRON${addressQuery}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const result = await response.json();
        setDappList(result.success ? result.data : []);
      } catch (error) {
        console.error("[DAppHub] Fetch Error:", error);
        setDappList([]);
      }
    };
    fetchDapps();
    const interval = setInterval(fetchDapps, 300000);
    return () => clearInterval(interval);
  }, [address]);

  useEffect(() => {
    setSelfCustodyParameter({ network: "TRON", env: isMainnet ? "MAINNET" : "TESTNET", tokens: [], fetched: false });

    let cancelled = false;
    let quickRetries = 0;
    const MAX_QUICK_RETRIES = 4;
    const QUICK_RETRY_DELAY_MS = 2000;

    const fetchSelfCustodyConstraints = async () => {
      try {
        const envMode = isMainnet ? "MAINNET" : "TESTNET";
        const response = await fetch(`/api/transaction/constraints/?network=TRON&env=${envMode}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data: CustodyParams = await response.json();
        if (cancelled) return;
        if (data && data.tokens) {
          setSelfCustodyParameter({ ...data, fetched: true });
          return;
        }
      } catch (error) {
        console.error("Failed to fetch Tron self-custody limits:", error);
      }
      if (!cancelled && quickRetries < MAX_QUICK_RETRIES) {
        quickRetries += 1;
        setTimeout(fetchSelfCustodyConstraints, QUICK_RETRY_DELAY_MS);
      }
    };

    fetchSelfCustodyConstraints();
    const interval = setInterval(fetchSelfCustodyConstraints, 300000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isMainnet]);

  const fetchPrice = async () => {
    try {
      const envMode = isMainnet ? "MAINNET" : "TESTNET";
      const response = await fetch(`/api/token-price?token=TRX&env=${envMode}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      setPrice(data);
    } catch (error) {
      console.error("Error fetching Tron price:", error);
    }
  };

  useEffect(() => {
    setPrice(null);
    fetchPrice();
    const i = setInterval(fetchPrice, 60000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMainnet]);

  // --- ipow bridge: not supported yet (ipowConvert: "comingsoon" below) ---
  const notSupported = async () => null;

  return (
    <TronWalletContext.Provider
      value={{
        connected,
        isConnecting,
        address,
        walletType,
        availableWallets,
        balance: {
          ...balance,
          sendable: Math.max(0, balance.confirmed - estimatedFee[estimatedFee.selectedFee]),
        },
        estimatedFee,
        price,
        networkExplorer: {
          address: `${currentNetworkConfig.networkExplorer}/#/address/`,
          transaction: `${currentNetworkConfig.networkExplorer}/#/transaction/`,
        },
        currencyTicker: "TRX",
        decimals: 6,
        ipowDecimals: 6,
        networkName: "Tron",
        networkLogo: tronnetwork,
        networkDescription: {
          en: "Tron is a high-throughput network best known as the dominant settlement chain for USDT. Fast, low-fee transfers make it a popular choice for everyday stablecoin payments.",
          id: "Tron adalah jaringan berkecepatan tinggi yang paling dikenal sebagai jaringan penyelesaian utama untuk USDT. Transfer yang cepat dan murah membuatnya populer untuk pembayaran stablecoin sehari-hari.",
        },
        selfCustodyParameter,
        ipowConvert: "comingsoon",
        ipowNetworkId: 6,
        dappList,
        toggleFavoriteDapp,
        connect,
        setFeeSelection,
        disconnect,
        switchWallet,
        signMessage,
        sendTokenTo,
        checkAddress,
        isValidAddress,
        fetchETA,
        commitNativeToBitcoin: notSupported,
        commitBitcoinToNative: notSupported,
        depositApprovedConversion: notSupported,
        submitBitcoinMerkleProofWithTx: notSupported,
        getMyTxIds: async () => [],
        getConversion: notSupported,
        refundIfNotApproved: notSupported,
        claimNativeAfterOperatorExpired: notSupported,
        refundAfterNoProofNativeToBitcoin: notSupported,
        estimateBitcoinFromNative: notSupported,
        estimateNativeFromBitcoin: notSupported,
        anchorInfo: notSupported,
        proofInfo: notSupported,
        windowsFor: notSupported,
        globalHeightToHashLE: notSupported,
        globalHeaders: notSupported,
      }}
    >
      {children}
    </TronWalletContext.Provider>
  );
}

async function fetchHeldTrc20Balances(
  tronWeb: TronWeb,
  owner: string,
  candidates: { address: string; symbol: string; name: string; decimals: number }[],
) {
  if (candidates.length === 0) return [];

  const held: any[] = [];
  for (const token of candidates) {
    try {
      const contract = await tronWeb.contract(ERC20_ABI as any, token.address);
      const raw: any = await contract.methods.balanceOf(owner).call();
      const amount = Number(raw.toString()) / Math.pow(10, token.decimals);
      if (amount > 0) {
        held.push({
          mint: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          amount,
          isNative: false,
          logo: null,
          price: "0",
        });
      }
    } catch (err) {
      console.error(`Failed to fetch TRC-20 balance for ${token.symbol}:`, err);
    }
  }
  return held;
}
