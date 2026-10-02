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
import { ethers } from "ethers";

import { useNetwork } from "@/app/network-provider";
import { hyperliquidnetwork } from "@/index";
import { appConfig, HyperliquidWalletContextType, HyperliquidWalletType } from "./config";
import { getEvmWalletProvider } from "@/subcomponents/wallet-connect/evm-wallet-detection";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";
import { VERIFIED_ERC20_TOKENS } from "./config/verified-tokens";
import { fetchErc20Balances } from "@/components/ethereum/erc20-balances";

const notSupported = async () => null;

const HyperliquidWalletContext = createContext<HyperliquidWalletContextType>({
  connected: false,
  address: null,
  isConnecting: false,
  walletType: null,
  availableWallets: [],
  balance: { confirmed: 0, unconfirmed: 0, sendable: 0, fetched: false, tokens: [] },
  estimatedFee: { low: 0, medium: 0, high: 0, selectedFee: "medium", fetched: false },
  setFeeSelection: () => {},
  currencyTicker: "HYPE",
  decimals: 18,
  ipowDecimals: 18,
  networkName: "Hyperliquid",
  networkDescription: {},
  selfCustodyParameter: {},
  networkLogo: hyperliquidnetwork,
  price: {},
  networkExplorer: {},
  ipowConvert: "comingsoon",
  ipowNetworkId: 0,
  dappList: [],
  toggleFavoriteDapp: () => {},
  connect: async () => {},
  disconnect: () => {},
  switchWallet: async () => {},
  signMessage: async () => null,
  sendTokenTo: async () => null,
  checkAddress: () => ({ valid: false, reason: "invalid" }),
  isValidAddress: () => false,
  estimateErc20SendFee: async () => null,
  fetchETA: async () => null,
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
});

export function useHyperliquidWallet() {
  return useContext(HyperliquidWalletContext);
}

interface CustodyParams {
  network: string;
  env: string;
  tokens: any[];
  fetched: boolean;
}

export function HyperliquidProvider({ children }: { children: ReactNode }) {
  const { hyperliquidMainnet } = useNetwork();
  const isMainnet = hyperliquidMainnet;
  const currentNetworkConfig = useMemo(() => {
    return isMainnet ? appConfig.networks.mainnet : appConfig.networks.testnet;
  }, [isMainnet]);

  const netKey = useMemo(() => (isMainnet ? "mainnet" : "testnet"), [isMainnet]);

  const [selfCustodyParameter, setSelfCustodyParameter] = useState<CustodyParams>({
    network: "HYPERLIQUID",
    env: isMainnet ? "MAINNET" : "TESTNET",
    tokens: [],
    fetched: false,
  });
  const [dappList, setDappList] = useState<any[] | null>(null);
  const [price, setPrice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [walletType, setWalletType] = useState<HyperliquidWalletType | null>(null);
  const [availableWallets, setAvailableWallets] = useState<HyperliquidWalletType[]>([]);
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

  const readOnlyProvider = useMemo(() => {
    return new ethers.JsonRpcProvider(currentNetworkConfig.jsonRpcUrl);
  }, [currentNetworkConfig.jsonRpcUrl]);

  useEffect(() => {
    let cancelled = false;
    getEvmWalletProvider("metamask").then((p) => {
      if (!cancelled) setAvailableWallets(p ? ["metamask"] : []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const switchNetwork = async (prov: ethers.BrowserProvider) => {
    const targetChainIdHex = currentNetworkConfig.chainId.toLowerCase();

    const network = await prov.getNetwork();
    const currentChainIdHex = "0x" + network.chainId.toString(16);

    if (currentChainIdHex.toLowerCase() === targetChainIdHex) return;

    try {
      await prov.send("wallet_switchEthereumChain", [{ chainId: targetChainIdHex }]);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await prov.send("wallet_addEthereumChain", [
            {
              chainId: targetChainIdHex,
              chainName: isMainnet ? "Hyperliquid" : "Hyperliquid Testnet",
              nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
              rpcUrls: [currentNetworkConfig.jsonRpcUrl],
              blockExplorerUrls: [currentNetworkConfig.networkExplorer],
            },
          ]);
        } catch {
          throw new Error(
            `Your wallet doesn't have ${isMainnet ? "Hyperliquid" : "Hyperliquid Testnet"} added. Please add or switch to it manually.`,
          );
        }
      } else {
        throw new Error("User rejected network switch");
      }
    }
  };

  const connect = async (wallet: HyperliquidWalletType, isAutoConnect = false) => {
    setIsConnecting(true);
    try {
      const p = await getEvmWalletProvider("metamask");
      if (!p) return;

      const prov = new ethers.BrowserProvider(p, "any");
      let accounts = await prov.listAccounts();

      if (accounts.length === 0) {
        if (isAutoConnect) return;
        await prov.send("eth_requestAccounts", []);
        accounts = await prov.listAccounts();
      }

      if (accounts.length > 0) {
        await switchNetwork(prov);
        const signer = await prov.getSigner();
        const addr = await signer.getAddress();

        setProvider(prov);
        setAddress(addr);
        setWalletType(wallet);
        setConnected(true);

        localStorage.setItem(`hyperliquidConnected_${netKey}`, "true");
        localStorage.setItem(`hyperliquidWalletType_${netKey}`, wallet);
      }
    } catch (err: any) {
      console.error("Connection Flow Error:", err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = (_hardDisconnect: boolean) => {
    setConnected(false);
    setAddress(null);
    setWalletType(null);
    setProvider(null);
    setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });

    localStorage.removeItem(`hyperliquidConnected_${netKey}`);
    localStorage.removeItem(`hyperliquidWalletType_${netKey}`);
  };

  const switchWallet = async (wallet: HyperliquidWalletType) => {
    try {
      disconnect(false);
      await connect(wallet, true);
    } catch (err) {
      console.error("Switch wallet error:", err);
    }
  };

  const getActiveSigner = async () => {
    if (!walletType) throw new Error("No active wallet session found. Please reconnect.");
    const injection = await getEvmWalletProvider("metamask");
    if (!injection) throw new Error("MetaMask is not available or was hijacked.");
    const prov = new ethers.BrowserProvider(injection, "any");
    await switchNetwork(prov);
    return await prov.getSigner();
  };

  const signMessage = async (message: string): Promise<string | null> => {
    const signer = await getActiveSigner();
    return await signer.signMessage(message);
  };

  const checkAddress = useCallback((address: string): AddressCheckResult => {
    const valid = ethers.isAddress(address as unknown);
    if (valid) return { valid: true, reason: null };
    if (!address.startsWith("0x")) return { valid: false, reason: "wrong-prefix" };
    if (!/^0x[a-fA-F0-9]*$/.test(address)) return { valid: false, reason: "invalid-characters" };
    if (address.length !== 42) return { valid: false, reason: "wrong-length" };
    return { valid: false, reason: "invalid" };
  }, []);

  const isValidAddress = useCallback(
    (address: string): boolean => checkAddress(address).valid,
    [checkAddress],
  );

  const sendTokenTo = async (
    to: string,
    amount: number,
    _customFee?: number,
    token?: { address: string; decimals: number },
  ): Promise<string | null> => {
    if (!address || !estimatedFee.fetched) return null;

    try {
      const signer = await getActiveSigner();
      const selectedFeeHype = estimatedFee[estimatedFee.selectedFee];
      const totalFeeWeiAt21k = ethers.parseEther(selectedFeeHype.toString());
      const maxFeePerGas = totalFeeWeiAt21k / BigInt(21_000);
      const maxPriorityFeePerGas = maxFeePerGas / BigInt(2);

      if (token) {
        const erc20 = new ethers.Contract(
          token.address,
          ["function transfer(address to, uint256 amount) returns (bool)"],
          signer,
        );
        const amountUnits = ethers.parseUnits(amount.toString(), token.decimals);

        let gasLimit: bigint;
        try {
          const estimated: bigint = await erc20.transfer.estimateGas(to, amountUnits);
          gasLimit = (estimated * BigInt(120)) / BigInt(100);
        } catch {
          gasLimit = BigInt(90_000);
        }

        const tx = await erc20.transfer(to, amountUnits, {
          gasLimit,
          maxFeePerGas,
          maxPriorityFeePerGas,
        });
        await tx.wait();
        return tx.hash;
      }

      const gasLimit = BigInt(21_000);
      const valueWei = ethers.parseEther(amount.toString());

      const tx = await signer.sendTransaction({
        to,
        value: valueWei,
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      await tx.wait();
      return tx.hash;
    } catch (err) {
      console.error("Send error:", err);
      return null;
    }
  };

  const estimateErc20SendFee = useCallback(
    async (
      to: string,
      amount: number,
      token: { address: string; decimals: number },
    ): Promise<number | null> => {
      if (!address || !ethers.isAddress(to) || !(amount > 0) || !estimatedFee.fetched) return null;

      try {
        const erc20 = new ethers.Contract(
          token.address,
          ["function transfer(address to, uint256 amount) returns (bool)"],
          readOnlyProvider,
        );
        const amountUnits = ethers.parseUnits(amount.toString(), token.decimals);
        const estimatedGas: bigint = await erc20.transfer.estimateGas(to, amountUnits, { from: address });
        const gasLimit = (estimatedGas * BigInt(120)) / BigInt(100);

        const selectedFeeHype = estimatedFee[estimatedFee.selectedFee];
        const maxFeePerGas = ethers.parseEther(selectedFeeHype.toString()) / BigInt(21_000);

        return Number(ethers.formatEther(maxFeePerGas * gasLimit));
      } catch (err) {
        console.error("estimateErc20SendFee error:", err);
        return null;
      }
    },
    [address, estimatedFee, readOnlyProvider],
  );

  const fetchBalance = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!address) return;
      try {
        const [confirmedWei, pendingWei, tokens] = await Promise.all([
          readOnlyProvider.getBalance(address, "latest"),
          readOnlyProvider
            .getBalance(address, "pending")
            .catch(() => readOnlyProvider.getBalance(address, "latest")),
          fetchErc20Balances(readOnlyProvider, address, VERIFIED_ERC20_TOKENS[netKey]).catch((err) => {
            console.error("Failed to fetch HyperEVM ERC-20 balances:", err);
            return null;
          }),
        ]);

        if (signal?.aborted) return;

        let pricedTokens = tokens;
        if (tokens && tokens.length > 0 && isMainnet) {
          const addresses = tokens.map((t) => t.mint);
          const prices = await fetchHyperEvmUsdPrices(addresses);
          if (signal?.aborted) return;
          pricedTokens = tokens.map((t) => {
            const p = prices[t.mint.toLowerCase()];
            return {
              ...t,
              price: p ? p.usd.toString() : "0",
              priceChange24h: p ? p.usd_24h_change : 0,
            };
          });
        }

        let unconfirmedWei = pendingWei - confirmedWei;
        if (unconfirmedWei < BigInt(0)) unconfirmedWei = BigInt(0);

        const confirmed = Number(ethers.formatEther(confirmedWei)) || 0;
        const unconfirmed = Number(ethers.formatEther(unconfirmedWei)) || 0;

        setBalance((prev) => {
          const nextTokens = pricedTokens === null ? prev.tokens : pricedTokens;
          const tokensChanged = JSON.stringify(prev.tokens) !== JSON.stringify(nextTokens);
          if (!tokensChanged && prev.fetched && prev.confirmed === confirmed && prev.unconfirmed === unconfirmed) {
            return prev;
          }
          return { confirmed, unconfirmed, fetched: true, tokens: nextTokens };
        });
      } catch (err) {
        if (signal?.aborted) return;
        console.error("Failed to fetch HyperEVM balance:", err);
        setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });
      }
    },
    [address, netKey, isMainnet, readOnlyProvider],
  );

  const estimateFee = useCallback(
    async (signal?: AbortSignal) => {
      if (!address) return;
      try {
        const block = await readOnlyProvider.getBlock("latest");
        if (signal?.aborted || !block) return;

        const baseFeePerGas = block.baseFeePerGas ?? BigInt(1_000_000_000);

        let lowPriorityGwei = 0.5;
        let medPriorityGwei = 2;
        let highPriorityGwei = 4;
        try {
          const feeHistory = await readOnlyProvider.send("eth_feeHistory", ["20", "latest", [25, 50, 85]]);
          if (signal?.aborted) return;

          const rewards: string[][] = feeHistory?.reward || [];
          const toGwei = (hex: string) => Number(ethers.formatUnits(BigInt(hex), "gwei"));
          const avgAt = (idx: number) => {
            const vals = rewards.map((r) => toGwei(r[idx])).filter((v) => v > 0);
            return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
          };

          lowPriorityGwei = avgAt(0) ?? lowPriorityGwei;
          medPriorityGwei = avgAt(1) ?? medPriorityGwei;
          highPriorityGwei = avgAt(2) ?? highPriorityGwei;
        } catch (feeHistoryErr) {
          console.warn("Failed to fetch live fee history, using fallback priority rate", feeHistoryErr);
        }

        const priorityFees = {
          low: ethers.parseUnits(lowPriorityGwei.toFixed(9), "gwei"),
          medium: ethers.parseUnits(medPriorityGwei.toFixed(9), "gwei"),
          high: ethers.parseUnits(highPriorityGwei.toFixed(9), "gwei"),
        };

        const gasLimit = BigInt(21_000);
        const toHype = (wei: bigint) => Number(ethers.formatEther(wei));
        const calcMaxFee = (priorityFee: bigint) => toHype((baseFeePerGas + priorityFee) * gasLimit);

        setEstimatedFee((prev) => ({
          low: calcMaxFee(priorityFees.low),
          medium: calcMaxFee(priorityFees.medium),
          high: calcMaxFee(priorityFees.high),
          fetched: true,
          selectedFee: prev.selectedFee,
        }));
      } catch (e) {
        if (signal?.aborted) return;
        console.error("Fee estimation error", e);
      }
    },
    [address, readOnlyProvider],
  );

  const setFeeSelection = (selectedFee: "low" | "medium" | "high") => {
    setEstimatedFee((prev) => ({ ...prev, selectedFee }));
  };

  const fetchETA = async (
    txHash: string,
  ): Promise<{ estimatedSeconds: number; isCongested: boolean } | null> => {
    if (!provider) return null;
    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx) return null;
      if (tx.blockNumber !== null) return { estimatedSeconds: 0, isCongested: false };

      const latest = await provider.getBlock("latest");
      if (!latest) return null;

      const baseFeePerGas = latest.baseFeePerGas ?? ethers.parseUnits("1", "gwei");
      const priorityFeePerGas = ethers.parseUnits("0.5", "gwei");
      const neededFeePerGas = baseFeePerGas + priorityFeePerGas;

      let txMaxFeePerGas: bigint | null = null;
      if (tx.maxFeePerGas != null) txMaxFeePerGas = tx.maxFeePerGas;
      else if ((tx as any).gasPrice != null) txMaxFeePerGas = (tx as any).gasPrice as bigint;

      if (txMaxFeePerGas == null) return null;
      if (txMaxFeePerGas >= neededFeePerGas) return { estimatedSeconds: 2, isCongested: false };
      return { estimatedSeconds: 5, isCongested: true };
    } catch (err) {
      console.error("Failed to estimate HyperEVM tx ETA:", err);
      return null;
    }
  };

  const favoriteTimers = useRef<Record<number, NodeJS.Timeout>>({});

  const toggleFavoriteDapp = async (dappId: number) => {
    if (!address) return;

    setDappList((prev) =>
      prev!.map((dapp) => {
        if (dapp.id === dappId) {
          const willBeFavorited = !dapp.isFavorited;
          return {
            ...dapp,
            favoriteCount: willBeFavorited ? dapp.favoriteCount + 1 : Math.max(0, dapp.favoriteCount - 1),
            isFavorited: willBeFavorited,
          };
        }
        return dapp;
      }),
    );

    if (favoriteTimers.current[dappId]) clearTimeout(favoriteTimers.current[dappId]);

    favoriteTimers.current[dappId] = setTimeout(async () => {
      try {
        const response = await fetch("/api/dapphub/favorite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address, network: "HYPERLIQUID", dappId }),
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

  const fetchPrice = async () => {
    try {
      const envMode = isMainnet ? "MAINNET" : "TESTNET";
      const response = await fetch(`/api/token-price?token=HYPE&env=${envMode}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      setPrice(data);
    } catch (error) {
      console.error("Error fetching price:", error);
    }
  };

  useEffect(() => {
    fetchPrice();
    const i = setInterval(fetchPrice, 60000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMainnet]);

  useEffect(() => {
    const fetchDapps = async () => {
      try {
        const addressQuery = address ? `&walletAddress=${address}` : "";
        const response = await fetch(`/api/dapphub/list?network=HYPERLIQUID${addressQuery}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const result = await response.json();
        setDappList(result.success ? result.data : []);
      } catch (error) {
        console.error(`[DAppHub] Fetch Error:`, error);
        setDappList([]);
      }
    };

    fetchDapps();
    const interval = setInterval(fetchDapps, 300000);
    return () => clearInterval(interval);
  }, [address]);

  useEffect(() => {
    setSelfCustodyParameter((prev) => ({ ...prev, tokens: [], fetched: false }));

    let cancelled = false;
    let quickRetries = 0;
    const MAX_QUICK_RETRIES = 4;
    const QUICK_RETRY_DELAY_MS = 2000;

    const fetchSelfCustodyConstraints = async () => {
      try {
        const envMode = isMainnet ? "MAINNET" : "TESTNET";
        const response = await fetch(`/api/transaction/constraints/?network=HYPERLIQUID&env=${envMode}`, {
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
        console.error("Failed to fetch HYPERLIQUID self-custody limits:", error);
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

  useEffect(() => {
    if (!walletType || !connected) return;

    let injection: any;
    let cancelled = false;

    const handleAccountsChanged = (accounts: string[]) => {
      const isActiveWallet = localStorage.getItem(`hyperliquidWalletType_${netKey}`) === walletType;
      if (!isActiveWallet) return;
      if (accounts.length > 0) setAddress(ethers.getAddress(accounts[0]));
      else disconnect(false);
    };

    (async () => {
      const found = await getEvmWalletProvider("metamask");
      if (cancelled || !found) return;
      injection = found;
      injection.on("accountsChanged", handleAccountsChanged);
    })();

    return () => {
      cancelled = true;
      injection?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [walletType, connected, netKey]);

  useEffect(() => {
    if (!address) return;

    const controller = new AbortController();
    const signal = controller.signal;

    fetchBalance(signal);
    estimateFee(signal);

    let blockCount = 0;
    const handleNewBlock = () => {
      estimateFee(signal);
      blockCount++;
      if (blockCount >= 3) {
        fetchBalance(signal);
        blockCount = 0;
      }
    };

    readOnlyProvider.on("block", handleNewBlock);

    return () => {
      controller.abort();
      readOnlyProvider.off("block", handleNewBlock);
    };
  }, [address, readOnlyProvider]);

  useEffect(() => {
    const wasConnected = localStorage.getItem(`hyperliquidConnected_${netKey}`) === "true";
    const savedWallet = localStorage.getItem(`hyperliquidWalletType_${netKey}`) as HyperliquidWalletType | null;

    if (wasConnected && savedWallet) {
      connect(savedWallet, true);
    } else {
      setConnected(false);
      setAddress(null);
      setProvider(null);
      setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMainnet]);

  return (
    <HyperliquidWalletContext.Provider
      value={{
        connected,
        isConnecting,
        address,
        walletType,
        availableWallets,
        balance: {
          ...balance,
          sendable:
            balance.confirmed - estimatedFee[estimatedFee.selectedFee] * 1.1 > 0
              ? balance.confirmed - estimatedFee[estimatedFee.selectedFee] * 1.1
              : 0,
        },
        estimatedFee,
        price,
        networkExplorer: {
          address: `${currentNetworkConfig.networkExplorer}/address/`,
          transaction: `${currentNetworkConfig.networkExplorer}/tx/`,
        },
        currencyTicker: "HYPE",
        decimals: 18,
        ipowDecimals: 18,
        networkName: "Hyperliquid",
        networkLogo: hyperliquidnetwork,
        networkDescription: {
          en: "Hyperliquid is a high-performance L1 built around its own order-book exchange, with HyperEVM, an Ethereum-compatible execution layer, for smart contracts and tokens like USDT0.",
          id: "Hyperliquid adalah L1 berperforma tinggi yang dibangun di sekitar bursa order-book miliknya sendiri, dengan HyperEVM, lapisan eksekusi yang kompatibel dengan Ethereum, untuk smart contract dan token seperti USDT0.",
        },
        selfCustodyParameter,
        ipowConvert: "comingsoon",
        ipowNetworkId: 0,
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
        estimateErc20SendFee,
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
    </HyperliquidWalletContext.Provider>
  );
}

// CoinGecko's asset-platform id for HyperEVM is "hyperevm" (verified live: chain_identifier
// 999, matching eth_chainId) — distinct from "hyperliquid", which CoinGecko uses for an
// unrelated native-ledger platform.
async function fetchHyperEvmUsdPrices(
  addresses: string[],
): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  if (addresses.length === 0) return {};
  try {
    const url = `https://api.coingecko.com/api/v3/simple/token_price/hyperevm?contract_addresses=${addresses.join(",")}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();

    const normalized: Record<string, { usd: number; usd_24h_change: number }> = {};
    for (const [addr, info] of Object.entries<any>(data || {})) {
      normalized[addr.toLowerCase()] = {
        usd: info?.usd ?? 0,
        usd_24h_change: info?.usd_24h_change ?? 0,
      };
    }
    return normalized;
  } catch (err) {
    console.error("Failed to fetch HyperEVM ERC-20 USD prices:", err);
    return {};
  }
}
