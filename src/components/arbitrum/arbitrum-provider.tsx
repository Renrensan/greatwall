"use client";

import { readProvider } from "@/components/integrator/ipow/sdk";
import toast from "react-hot-toast";

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

import { nativeUsdPrice } from "@/components/integrator/ipow/coinPrices";
import { arbitrumnetwork } from "@/index";
import { appConfig, ArbitrumWalletContextType, ArbitrumWalletType } from "./config";
import { getEvmWalletProvider, walletErrorCode, walletRejected } from "@/subcomponents/wallet-connect/evm-wallet-detection";
import { NO_CONVERT, evmConvertMethods } from "@/components/integrator/ipow/convertMethods";
import { deploymentOf } from "@/components/integrator/ipow/sdk";
import { IPOW_NETWORK_ID } from "./config/constants";

/** Whether iPoW runs on Arbitrum here: its deployment is in the SDK. */
const ipowLive = deploymentOf("arbitrum") !== null;
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";
import { VERIFIED_ERC20_TOKENS } from "./config/verified-tokens";
import { fetchErc20Balances } from "@/components/ethereum/erc20-balances";

const notSupported = async () => null;

const ArbitrumWalletContext = createContext<ArbitrumWalletContextType>({
  connected: false,
  address: null,
  isConnecting: false,
  walletType: null,
  availableWallets: [],
  balance: { confirmed: 0, unconfirmed: 0, sendable: 0, fetched: false, tokens: [] },
  estimatedFee: { low: 0, medium: 0, high: 0, selectedFee: "medium", fetched: false },
  setFeeSelection: () => {},
  currencyTicker: "ETH",
  decimals: 18,
  ipowDecimals: 18,
  networkName: "Arbitrum",
  networkDescription: {},
  networkLogo: arbitrumnetwork,
  price: {},
  networkExplorer: {},
  ipowConvert: "comingsoon",
  ipowNetworkId: 0,
  connect: async () => {},
  disconnect: () => {},
  switchWallet: async () => {},
  signMessage: async () => null,
  sendTokenTo: async () => null,
  checkAddress: () => ({ valid: false, reason: "invalid" }),
  isValidAddress: () => false,
  getSigner: async () => { throw new Error("arbitrum: no wallet"); },
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

export function useArbitrumWallet() {
  return useContext(ArbitrumWalletContext);
}


export function ArbitrumProvider({ children }: { children: ReactNode }) {
  // Greatwall runs the network's testnet only.
  const currentNetworkConfig = appConfig.networks.testnet;
  const netKey = "testnet";

  const [price, setPrice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [walletType, setWalletType] = useState<ArbitrumWalletType | null>(null);
  const [availableWallets, setAvailableWallets] = useState<ArbitrumWalletType[]>([]);
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
    // Reads through this app's own RPC proxy (sdk.ts), so a network that
    // blocks the public RPC still sees balances; the wallet gets the public one.
    return readProvider("arbitrum");
  }, []);

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
      if (walletErrorCode(switchError) === 4902) {
        try {
          await prov.send("wallet_addEthereumChain", [
            {
              chainId: targetChainIdHex,
              chainName: "Arbitrum Sepolia",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: [currentNetworkConfig.jsonRpcUrl],
              blockExplorerUrls: [currentNetworkConfig.networkExplorer],
            },
          ]);
        } catch {
          throw new Error(
            `Your wallet doesn't have Arbitrum Sepolia added. Please add or switch to it manually.`,
          );
        }
      } else if (walletRejected(switchError)) {
        throw new Error("User rejected network switch");
      } else {
        throw new Error(`Could not switch the wallet's network: ${switchError?.shortMessage ?? switchError?.message ?? switchError}`);
      }
    }
  };

  const connect = async (wallet: ArbitrumWalletType, isAutoConnect = false) => {
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
        // A reconnect on page load doesn't move the wallet's network: every
        // network's wallet reconnects on pages that read them all, and each
        // switch would prompt. Signing switches first (getActiveSigner).
        if (!isAutoConnect) await switchNetwork(prov);
        const signer = await prov.getSigner();
        const addr = await signer.getAddress();

        setProvider(prov);
        setAddress(addr);
        setWalletType(wallet);
        setConnected(true);

        localStorage.setItem(`arbitrumConnected_${netKey}`, "true");
        localStorage.setItem(`arbitrumWalletType_${netKey}`, wallet);
      }
    } catch (err: any) {
      console.error("Connection Flow Error:", err.message);
      if (!isAutoConnect && !walletRejected(err)) toast.error(err?.shortMessage ?? err?.message ?? String(err));
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

    localStorage.removeItem(`arbitrumConnected_${netKey}`);
    localStorage.removeItem(`arbitrumWalletType_${netKey}`);
  };

  const switchWallet = async (wallet: ArbitrumWalletType) => {
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
      const selectedFeeEth = estimatedFee[estimatedFee.selectedFee];
      const totalFeeWeiAt21k = ethers.parseEther(selectedFeeEth.toString());
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

        const selectedFeeEth = estimatedFee[estimatedFee.selectedFee];
        const maxFeePerGas = ethers.parseEther(selectedFeeEth.toString()) / BigInt(21_000);

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
            console.error("Failed to fetch Arbitrum ERC-20 balances:", err);
            return null;
          }),
        ]);

        if (signal?.aborted) return;

        let unconfirmedWei = pendingWei - confirmedWei;
        if (unconfirmedWei < BigInt(0)) unconfirmedWei = BigInt(0);

        const confirmed = Number(ethers.formatEther(confirmedWei)) || 0;
        const unconfirmed = Number(ethers.formatEther(unconfirmedWei)) || 0;

        setBalance((prev) => {
          const nextTokens = tokens === null ? prev.tokens : tokens;
          const tokensChanged = JSON.stringify(prev.tokens) !== JSON.stringify(nextTokens);
          if (!tokensChanged && prev.fetched && prev.confirmed === confirmed && prev.unconfirmed === unconfirmed) {
            return prev;
          }
          return { confirmed, unconfirmed, fetched: true, tokens: nextTokens };
        });
      } catch (err) {
        if (signal?.aborted) return;
        console.error("Failed to fetch Arbitrum balance:", err);
        setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });
      }
    },
    [address, readOnlyProvider],
  );

  const estimateFee = useCallback(
    async (signal?: AbortSignal) => {
      if (!address) return;
      try {
        const block = await readOnlyProvider.getBlock("latest");
        if (signal?.aborted || !block) return;

        const baseFeePerGas = block.baseFeePerGas ?? BigInt(1_000_000);

        let lowPriorityGwei = 0.001;
        let medPriorityGwei = 0.005;
        let highPriorityGwei = 0.01;
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
        const toEth = (wei: bigint) => Number(ethers.formatEther(wei));
        const calcMaxFee = (priorityFee: bigint) => toEth((baseFeePerGas + priorityFee) * gasLimit);

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

      const baseFeePerGas = latest.baseFeePerGas ?? ethers.parseUnits("0.001", "gwei");
      const priorityFeePerGas = ethers.parseUnits("0.001", "gwei");
      const neededFeePerGas = baseFeePerGas + priorityFeePerGas;

      let txMaxFeePerGas: bigint | null = null;
      if (tx.maxFeePerGas != null) txMaxFeePerGas = tx.maxFeePerGas;
      else if ((tx as any).gasPrice != null) txMaxFeePerGas = (tx as any).gasPrice as bigint;

      if (txMaxFeePerGas == null) return null;
      if (txMaxFeePerGas >= neededFeePerGas * BigInt(2)) return { estimatedSeconds: 2, isCongested: false };
      if (txMaxFeePerGas >= neededFeePerGas) return { estimatedSeconds: 4, isCongested: false };
      return { estimatedSeconds: 8, isCongested: true };
    } catch (err) {
      console.error("Failed to estimate Arbitrum tx ETA:", err);
      return null;
    }
  };


  // The native coin's market price (coinPrices.ts, through /api/prices).
  const fetchPrice = async () => {
    const p = await nativeUsdPrice("ETH");
    if (p) setPrice(p as any);
  };

  useEffect(() => {
    fetchPrice();
    const i = setInterval(fetchPrice, 60000);
    return () => clearInterval(i);
  }, []);


  useEffect(() => {
    if (!walletType || !connected) return;

    let injection: any;
    let cancelled = false;

    const handleAccountsChanged = (accounts: string[]) => {
      const isActiveWallet = localStorage.getItem(`arbitrumWalletType_${netKey}`) === walletType;
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
  }, [walletType, connected]);

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
    const wasConnected = localStorage.getItem(`arbitrumConnected_${netKey}`) === "true";
    const savedWallet = localStorage.getItem(`arbitrumWalletType_${netKey}`) as ArbitrumWalletType | null;

    if (wasConnected && savedWallet) {
      connect(savedWallet, true);
    } else {
      setConnected(false);
      setAddress(null);
      setProvider(null);
      setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The convert screens' methods, on the new protocol's Conversion, once
  // Arbitrum is deployed; until then none.
  const signerRef = useRef(getActiveSigner);
  signerRef.current = getActiveSigner;
  const convert = useMemo(
    () => (ipowLive ? evmConvertMethods({ chain: "arbitrum", getSigner: () => signerRef.current(), address, uiNetworkId: IPOW_NETWORK_ID }) : NO_CONVERT),
    [address]
  );

  return (
    <ArbitrumWalletContext.Provider
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
        currencyTicker: "ETH",
        decimals: 18,
        ipowDecimals: 18,
        networkName: "Arbitrum",
        networkLogo: arbitrumnetwork,
        networkDescription: {
          en: "Arbitrum One is an Ethereum Layer 2 built on Optimistic Rollup technology for fast, low-cost transactions. It's one of the largest L2 ecosystems by value locked, powering DeFi, trading, and everyday onchain apps.",
        },
        // Convert runs once the SDK carries Arbitrum's deployment (D141).
        ipowConvert: ipowLive ? "testnet" : "comingsoon",
        ipowNetworkId: ipowLive ? IPOW_NETWORK_ID : 0,
        connect,
        setFeeSelection,
        disconnect,
        switchWallet,
        signMessage,
        sendTokenTo,
        checkAddress,
        isValidAddress,
        getSigner: getActiveSigner,
        estimateErc20SendFee,
        fetchETA,
        ...convert,
      }}
    >
      {children}
    </ArbitrumWalletContext.Provider>
  );
}
