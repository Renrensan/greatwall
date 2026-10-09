"use client";

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
import { Eip1193Provider, ethers } from "ethers";

import { useNetwork } from "@/app/network-provider";
import { nativeUsdPrice } from "@/components/integrator/ipow/coinPrices";
import { ethereumnetwork } from "@/index";
import { appConfig, EthereumWalletContextType, EthereumWalletType } from "./config";
import { getEvmWalletProvider, walletErrorCode, walletRejected } from "@/subcomponents/wallet-connect/evm-wallet-detection";
import { IPOW_NETWORK_ID } from "./config/constants";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";
import { sepolia } from "@reown/appkit/networks";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { appKit } from "../walletconnect/wallet-connect-provider";
import { evmConvertMethods } from "../integrator/ipow/convertMethods";
import { VERIFIED_ERC20_TOKENS } from "./config/verified-tokens";
import { fetchErc20Balances } from "./erc20-balances";


const EthereumWalletContext = createContext<EthereumWalletContextType>({
  connected: false,
  address: null,
  isConnecting: false,
  walletType: null,
  availableWallets: [],
  balance: { confirmed: 0, unconfirmed: 0, fetched: false, sendable: 0, tokens: [] },
  estimatedFee: {
    low: 0,
    medium: 0,
    high: 0,
    selectedFee: "medium",
    fetched: false,
  },
  currencyTicker: "ETH",
  decimals: 18,
  ipowDecimals: 18,
  networkName: "Ethereum",
  networkDescription: {},
  networkLogo: ethereumnetwork,
  price: {},
  networkExplorer: {},
  ipowConvert: "testnet",
  ipowNetworkId: 2,
  setFeeSelection: () => {},
  connect: async () => {},
  disconnect: () => {},
  switchWallet: async () => {},
  signMessage: async () => null,
  sendTokenTo: async () => null,
  checkAddress: () => ({ valid: false, reason: "invalid" }),
  isValidAddress: () => false,
  getSigner: async () => { throw new Error("ethereum: no wallet"); },
  estimateErc20SendFee: async () => null,
  fetchETA: async () => null,
  estimateBitcoinFromNative: async () => null,
  estimateNativeFromBitcoin: async () => null,
  commitNativeToBitcoin: async () => null,
  commitBitcoinToNative: async () => null,
  depositApprovedConversion: async () => null,
  submitBitcoinMerkleProofWithTx: async () => null,
  getMyTxIds: async () => [],
  getConversion: async () => null,
  refundIfNotApproved: async () => null,
  claimNativeAfterOperatorExpired: async () => null,
  refundAfterNoProofNativeToBitcoin: async () => null,
  anchorInfo: async () => null,
  proofInfo: async () => null,
  windowsFor: async () => null,
  globalHeightToHashLE: async () => null,
  globalHeaders: async () => null,
});

export function useEthereumWallet() {
  return useContext(EthereumWalletContext);
}

export function EthereumProvider({ children }: { children: ReactNode }) {
  const { isConnected: akConnected, allAccounts } = useAppKitAccount();
  const { walletProvider: akProvider } = useAppKitProvider("eip155");

  const { selectedChain } = useNetwork();
  // Greatwall runs the network's testnet only.
  const currentNetworkConfig = appConfig.networks.testnet;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullRpcUrl = `${origin}${currentNetworkConfig.jsonRpcUrl}`;


  const [price, setPrice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [walletType, setWalletType] = useState<EthereumWalletType | null>(null);
  const [availableWallets] = useState<
    EthereumWalletType[]
  >([]);
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

  const netKey = "testnet";
  const targetNetwork = sepolia;

  const switchNetwork = async (prov: ethers.BrowserProvider) => {
    const targetChainIdHex = currentNetworkConfig.chainId.toLowerCase();

    const network = await prov.getNetwork();
    const currentChainIdHex = "0x" + network.chainId.toString(16);

    if (currentChainIdHex.toLowerCase() === targetChainIdHex) return;

    try {
      await prov.send("wallet_switchEthereumChain", [
        { chainId: targetChainIdHex },
      ]);
    } catch (switchError: any) {
      if (walletErrorCode(switchError) === 4902) {
        try {
          await prov.send("wallet_addEthereumChain", [
            {
              chainId: targetChainIdHex,
              chainName: currentNetworkConfig.network,
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: [fullRpcUrl],
              blockExplorerUrls: [currentNetworkConfig.networkExplorer],
            },
          ]);
        } catch {
          // Some wallets (esp. mobile injected providers) don't support adding chains at all —
          // a different failure mode than the user simply rejecting a switch prompt.
          throw new Error(
            `Your wallet doesn't have ${currentNetworkConfig.network} added. Please add or switch to it manually.`,
          );
        }
      } else if (walletRejected(switchError)) {
        throw new Error("User rejected network switch");
      } else {
        throw new Error(`Could not switch the wallet's network: ${switchError?.shortMessage ?? switchError?.message ?? switchError}`);
      }
    }
  };

  // See evm-wallet-detection.ts: resolves the real injected provider via EIP-6963's
  // spoof-resistant `rdns` identity first, since Phantom deliberately sets `isMetaMask: true`
  // on its own injected `window.ethereum` for legacy dapp compatibility.
  const getWalletInjection = (wallet: EthereumWalletType) =>
    wallet === "metamask" || wallet === "phantom" ? getEvmWalletProvider(wallet) : Promise.resolve(null);

  const connect = async (wallet: EthereumWalletType, isAutoConnect = false) => {
    setIsConnecting(true);

    try {
      if (wallet === "phantom" || wallet === "metamask") {
        const p = await getWalletInjection(wallet);

        if (!p) return;

        const prov = new ethers.BrowserProvider(p, "any");
        let accounts = await prov.listAccounts();

        if (accounts.length === 0) {
          if (isAutoConnect) return;
          await prov.send("eth_requestAccounts", []);
          accounts = await prov.listAccounts();
        }

        if (accounts.length > 0) {
          const signer = await prov.getSigner();
          const addr = await signer.getAddress();

          setProvider(prov);
          setAddress(addr);
          setWalletType(wallet);
          setConnected(true);

          localStorage.setItem(`ethConnected_${netKey}`, "true");
          localStorage.setItem(`ethWalletType_${netKey}`, wallet);
        }
      }
      if (wallet === "walletconnect") {
        if (isAutoConnect) return;

      
        await appKit.open({ view: "AllWallets", namespace: "eip155" });
      }
    } catch (err: any) {
      console.error("Connection Flow Error:", err.message);
      if (!isAutoConnect && !walletRejected(err)) toast.error(err?.shortMessage ?? err?.message ?? String(err));
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (akConnected && allAccounts && akProvider) {
      const wasInjected =
        localStorage.getItem(`ethWalletType_${netKey}`) === "metamask" ||
        localStorage.getItem(`ethWalletType_${netKey}`) === "phantom";

      const ethAccount = allAccounts.find((acc) => acc.namespace === "eip155");

      if (ethAccount && (!wasInjected || walletType === "walletconnect")) {

        const enforceNetwork = async () => {
          // Only on this network's own pages, as with injected wallets: two
          // providers enforcing at once would pull the wallet back and forth.
          if (selectedChain !== "ethereum") return;
          const currentNetwork = appKit.getCaipNetwork();

          if (currentNetwork?.id !== targetNetwork.id) {
            try {
            
              const rawProvider = akProvider as any;
              const targetChainIdHex = `0x${targetNetwork.id.toString(16)}`;

         
              await rawProvider.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: targetChainIdHex,
                    chainName: currentNetworkConfig.network,
                    nativeCurrency: {
                      name: "ETH",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    rpcUrls: [`${origin}${currentNetworkConfig.jsonRpcUrl}`],
                    blockExplorerUrls: [currentNetworkConfig.networkExplorer],
                  },
                ],
              });

            
              await appKit.switchNetwork(targetNetwork);
            } catch (err) {
              console.error(
                "User rejected network switch post-connection:",
                err,
              );
            }
          }
        };

        enforceNetwork();

       
        const prov = new ethers.BrowserProvider(
          akProvider as Eip1193Provider,
          targetNetwork.id,
        );
        const checksumAddress = ethers.getAddress(ethAccount.address);

        if (address !== checksumAddress) {
          setProvider(prov);
          setAddress(checksumAddress);
          setConnected(true);
          setWalletType("walletconnect");

          localStorage.setItem(`ethConnected_${netKey}`, "true");
          localStorage.setItem(`ethWalletType_${netKey}`, "walletconnect");
          localStorage.setItem(`ethAddress_${netKey}`, checksumAddress);
        }
      }
    }
  }, [akConnected, allAccounts, akProvider, address, walletType, selectedChain]);

  const disconnect = async (hardDisconnect: boolean) => {
    try {
      if (walletType === "walletconnect") {
        if (hardDisconnect) {
          await appKit.disconnect("eip155");
        }
      }
    } catch (e) {
      console.warn("Error on disconnect", e);
    }

    setConnected(false);
    setAddress(null);
    setWalletType(null);
    setProvider(null);
    setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens:[] });

    localStorage.removeItem(`ethConnected_${netKey}`);
    localStorage.removeItem(`ethWalletType_${netKey}`);
    localStorage.removeItem(`ethAddress_${netKey}`);
  };

  const switchWallet = async (wallet: EthereumWalletType) => {
    try {
      disconnect(false);
      await connect(wallet, true);
    } catch (err) {
      console.error("Switch wallet error:", err);
    }
  };

  const signMessage = async (message: string): Promise<string | null> => {
    const signer = await getActiveSigner();
    return await signer.signMessage(message);
  };

  /** The single address-check entry point exposed to the frontend: whether an
   * address is valid, and if not, which specific rule it failed — so forms can
   * show a specific, actionable message instead of one generic "invalid" string. */
  const checkAddress = useCallback((address: string): AddressCheckResult => {
    // Cast avoids `address: string` narrowing to `never` after the type-predicate check below.
    const valid = ethers.isAddress(address as unknown);
    if (valid) return { valid: true, reason: null };
    if (!address.startsWith("0x")) return { valid: false, reason: "wrong-prefix" };
    if (!/^0x[a-fA-F0-9]*$/.test(address)) return { valid: false, reason: "invalid-characters" };
    if (address.length !== 42) return { valid: false, reason: "wrong-length" };
    return { valid: false, reason: "invalid" };
  }, []);

  const isValidAddress = useCallback((address: string): boolean => checkAddress(address).valid, [checkAddress]);

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

      // estimatedFee's tiers are stored as a total ETH cost assuming a plain 21,000-gas
      // native transfer (see estimateFee below) — dividing back out gives the same
      // fee-per-gas rate the UI already showed the user, which can then be reapplied against
      // whatever gas limit the actual transaction needs (higher for an ERC-20 transfer).
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
          // 20% headroom — balance/allowance state at broadcast time can differ slightly
          // from estimate time, and an underestimated gas limit reverts out-of-gas.
          gasLimit = (estimated * BigInt(120)) / BigInt(100);
        } catch {
          // Non-standard token or an RPC that doesn't support eth_estimateGas well —
          // fall back to a limit generous enough for a standard ERC-20 transfer.
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

const readOnlyProvider = useMemo(() => {
    return new ethers.JsonRpcProvider(fullRpcUrl);
  }, [fullRpcUrl]);

  /** Live gas estimate for a specific ERC-20 transfer, for display before the user confirms —
   * an ERC-20 transfer's real gas cost varies by token contract and isn't the flat 21,000 gas
   * a native send uses, so the generic estimatedFee tiers would understate it. */
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

        // Same fee-per-gas rate the UI already shows for native sends (see sendTokenTo),
        // just reapplied against this token transfer's real gas limit instead of 21,000.
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

  const getActiveSigner = async () => {

    if (walletType === "metamask" || walletType === "phantom") {
      const injection = await getWalletInjection(walletType);
      if (!injection)
        throw new Error(`${walletType} is not available or was hijacked.`);

      const prov = new ethers.BrowserProvider(injection, "any");
      await switchNetwork(prov);
      return await prov.getSigner();
    }


    if (walletType === "walletconnect") {
      if (akProvider) {
        const currentNetwork = appKit.getCaipNetwork();


        if (currentNetwork?.id !== targetNetwork.id) {

          try {

            await appKit.switchNetwork(targetNetwork);
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } catch (switchErr) {
            console.warn(
              "Standard switch failed, falling back to Raw RPC...",
              switchErr,
            );


            const rawProvider = akProvider as any;
            const targetChainIdHex = `0x${targetNetwork.id.toString(16)}`;

            try {
              await rawProvider.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: targetChainIdHex,
                    chainName: currentNetworkConfig.network,
                    nativeCurrency: {
                      name: "ETH",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    rpcUrls: [`${origin}${currentNetworkConfig.jsonRpcUrl}`],
                    blockExplorerUrls: [currentNetworkConfig.networkExplorer],
                  },
                ],
              });
              await appKit.switchNetwork(targetNetwork); 
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch {
              throw new Error(
                `Please open your wallet and switch to ${currentNetworkConfig.network} to proceed.`,
              );
            }
          }
        }

        const prov = new ethers.BrowserProvider(
          akProvider as any,
          targetNetwork.id,
        );

        try {
       
          let accounts = await prov.send("eth_accounts", []);
          if (!accounts || accounts.length === 0) {
            accounts = await prov.send("eth_requestAccounts", []);
          }

          if (!accounts || accounts.length === 0) {
            throw new Error("No accounts permitted.");
          }

        
          return await prov.getSigner(0);
        } catch (err) {
          console.error("WalletConnect Signer Error:", err);
          throw new Error(
            "Failed to secure connection for signing. Please check your mobile wallet.",
          );
        }
      }
    }

    throw new Error("No active wallet session found. Please reconnect.");
  };

  // The convert screens' methods, on the new protocol's Conversion.
  const signerRef = useRef(getActiveSigner);
  signerRef.current = getActiveSigner;
  const convert = useMemo(
    () => evmConvertMethods({ chain: "ethereum", getSigner: () => signerRef.current(), address, uiNetworkId: IPOW_NETWORK_ID }),
    [address]
  );

const fetchBalance = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (!address) return;
    try {
      const [confirmedWei, pendingWei, tokens] = await Promise.all([
        readOnlyProvider.getBalance(address, "latest"),
        readOnlyProvider
          .getBalance(address, "pending")
          .catch(() => readOnlyProvider.getBalance(address, "latest")),
        fetchErc20Balances(readOnlyProvider, address, VERIFIED_ERC20_TOKENS[netKey]).catch((err) => {
          console.error("Failed to fetch ERC-20 balances:", err);
          return null;
        }),
      ]);


      if (signal?.aborted) {
        return;
      }

      let unconfirmedWei = pendingWei - confirmedWei;
      if (unconfirmedWei < BigInt(0)) unconfirmedWei = BigInt(0);

      const confirmed = Number(ethers.formatEther(confirmedWei)) || 0;
      const unconfirmed = Number(ethers.formatEther(unconfirmedWei)) || 0;

      setBalance((prev) => {
        // `tokens` is `null` when the multicall itself failed (RPC hiccup, etc.) — keep
        // whatever token list we already had rather than dropping it to empty for one bad poll.
        const nextTokens = tokens === null ? prev.tokens : tokens;
        const tokensChanged = JSON.stringify(prev.tokens) !== JSON.stringify(nextTokens);
        if (!tokensChanged && prev.fetched && prev.confirmed === confirmed && prev.unconfirmed === unconfirmed) {
          return prev;
        }
        return { confirmed, unconfirmed, fetched: true, tokens: nextTokens };
      });
    } catch (err) {
      if (signal?.aborted) return;
      console.error("Failed to fetch balance:", err);
      setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });
    }
  }, [address, currentNetworkConfig.jsonRpcUrl]);

const estimateFee = useCallback(async (signal?: AbortSignal) => {
    if (!address) return;
    try {
      const block = await readOnlyProvider.getBlock("latest");


      if (signal?.aborted) return;
      if (!block) return;

      const baseFeePerGas = block.baseFeePerGas ?? BigInt(1_000_000_000);

      // Priority-fee tiers are pulled from recent fee history (same percentile approach
      // used for Solana/Bitcoin) instead of a fixed 0.5/2/4 gwei guess, so they track what
      // the network is actually charging right now.
      let lowPriorityGwei = 0.5;
      let medPriorityGwei = 2;
      let highPriorityGwei = 4;
      try {
        const feeHistory = await readOnlyProvider.send("eth_feeHistory", [
          "20",
          "latest",
          [25, 50, 85],
        ]);
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
      const calcMaxFee = (priorityFee: bigint) =>
        toEth((baseFeePerGas + priorityFee) * gasLimit);

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
  }, [address, currentNetworkConfig.jsonRpcUrl]);


  // The native coin's market price (coinPrices.ts, through /api/prices).
  const fetchPrice = async () => {
    const p = await nativeUsdPrice("ETH");
    if (p) setPrice(p as any);
  };

  const fetchETA = async (
    txHash: string,
  ): Promise<{ estimatedSeconds: number; isCongested: boolean } | null> => {
    // Requires a real provider for fetching actual block TX
    if (!provider) return null;

    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx) return null;

      if (tx.blockNumber !== null)
        return { estimatedSeconds: 0, isCongested: false };

      const latest = await provider.getBlock("latest");
      if (!latest) return null;

      const baseFeePerGas =
        latest.baseFeePerGas ?? ethers.parseUnits("30", "gwei");
      const priorityFeePerGas = ethers.parseUnits("2", "gwei");
      const neededFeePerGas = baseFeePerGas + priorityFeePerGas;

      let txMaxFeePerGas: bigint | null = null;
      if (tx.maxFeePerGas != null) {
        txMaxFeePerGas = tx.maxFeePerGas;
      } else if ((tx as any).gasPrice != null) {
        txMaxFeePerGas = (tx as any).gasPrice as bigint;
      }

      if (txMaxFeePerGas == null) return null;


      if (txMaxFeePerGas >= neededFeePerGas * BigInt(2)) {
        return { estimatedSeconds: 12, isCongested: false };
      }

      if (txMaxFeePerGas >= neededFeePerGas) {
        return { estimatedSeconds: 24, isCongested: false };
      }

      if (txMaxFeePerGas >= baseFeePerGas) {
        return { estimatedSeconds: 36, isCongested: true };
      }

      return { estimatedSeconds: 60, isCongested: true };
    } catch (err) {
      console.error("Failed to estimate ETH tx ETA:", err);
      return null;
    }
  };

  const setFeeSelection = (selectedFee: "low" | "medium" | "high") => {
    setEstimatedFee((prev) => ({
      ...prev,
      selectedFee: selectedFee,
    }));
  };

  useEffect(() => {
    if (akConnected && allAccounts && akProvider) {
      const wasInjected =
        localStorage.getItem(`ethWalletType_${netKey}`) === "metamask" ||
        localStorage.getItem(`ethWalletType_${netKey}`) === "phantom";

      const ethAccount = allAccounts.find((acc) => acc.namespace === "eip155");

      if (ethAccount && (!wasInjected || walletType === "walletconnect")) {
        const prov = new ethers.BrowserProvider(
          akProvider as Eip1193Provider,
          "any",
        );
        const checksumAddress = ethers.getAddress(ethAccount.address);

        if (address !== checksumAddress) {
          setProvider(prov);
          setAddress(checksumAddress);
          setConnected(true);
          setWalletType("walletconnect");

          localStorage.setItem(`ethConnected_${netKey}`, "true");
          localStorage.setItem(`ethWalletType_${netKey}`, "walletconnect");
          localStorage.setItem(`ethAddress_${netKey}`, checksumAddress);
        }
      }
    }
  }, [akConnected, allAccounts, akProvider, address, walletType]);


  useEffect(() => {
    // Only on this network's own pages: on others (Bitcoin's included) every
    // network's wallet is loaded, and two of these would pull the wallet back
    // and forth. Signing switches to the right network anyway.
    if (selectedChain !== "ethereum") return;

    const checkChain = async () => {
      if (!provider) return;
      const network = await provider.getNetwork();
      const targetChainId = BigInt(currentNetworkConfig.chainId);

      if (network.chainId !== targetChainId) {
        console.warn("Chain ID mismatch detected");
      }
    };
    checkChain();
  }, [connected, selectedChain, provider, currentNetworkConfig]);

  useEffect(() => {
    fetchPrice();
    const i = setInterval(() => {
      fetchPrice();
    }, 60000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!walletType || !connected) return;

    let injection: any;
    let cancelled = false;

    const handleAccountsChanged = (accounts: string[]) => {
      const isActiveWallet =
        localStorage.getItem(`ethWalletType_${netKey}`) === walletType;
      if (!isActiveWallet) return;

      if (accounts.length > 0) {
        setAddress(ethers.getAddress(accounts[0]));
      } else {
        disconnect(false);
      }
    };

    (async () => {
      const found = await getWalletInjection(walletType);
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
    // Only on this network's own pages: on others (Bitcoin's included) every
    // network's wallet is loaded, and two of these would pull the wallet back
    // and forth. Signing switches to the right network anyway.
    if (selectedChain !== "ethereum") return;
    if (!((walletType === "metamask" || walletType === "phantom") && provider)) return;

    let eth: any;
    let cancelled = false;
    const targetChainId = BigInt(currentNetworkConfig.chainId);

    const handleChainChanged = (chainIdHex: string) => {
      if (
        chainIdHex.toLowerCase() !==
        currentNetworkConfig.chainId.toLowerCase()
      ) {
        switchNetwork(provider);
      }
    };

    (async () => {
      const found = await getWalletInjection(walletType!);
      if (cancelled || !found) return;
      eth = found;

      const network = await provider.getNetwork();
      if (network.chainId !== targetChainId) {
        await switchNetwork(provider);
      }

      eth.on("chainChanged", handleChainChanged);
    })();

    return () => {
      cancelled = true;
      eth?.removeListener("chainChanged", handleChainChanged);
    };
  }, [walletType, provider, selectedChain, currentNetworkConfig]);


  useEffect(() => {
    if (!address){
      return;
    }
    
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

  }, [address, currentNetworkConfig.jsonRpcUrl]);

  useEffect(() => {
    const wasConnected =
      localStorage.getItem(`ethConnected_${netKey}`) === "true";
    const savedWallet = localStorage.getItem(
      `ethWalletType_${netKey}`,
    ) as EthereumWalletType | null;

    // WalletConnect restoration is intentionally NOT handled here: setting `connected`
    // straight from a cached flag/address would show a fully "connected" wallet even if the
    // underlying WC session actually died (expired, revoked, or never restored) while the app
    // was closed. The `akConnected`/`allAccounts`/`akProvider` effect above is the only source
    // of truth for that — it fires once reown/appkit's own SDK confirms the session is
    // genuinely live, and simply never fires if it isn't, which is the correct outcome.
    if (wasConnected && savedWallet && savedWallet !== "walletconnect") {
      connect(savedWallet, true);
    } else if (!connected && !akConnected) {
      setConnected(false);
      setAddress(null);
      setProvider(null);
      setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });
    }
  }, []);
  return (
    <EthereumWalletContext.Provider
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
        networkName: "Ethereum",
        networkLogo: ethereumnetwork,
        networkDescription: {
          en: `Ethereum is the foundation blockchain for smart contracts and decentralized apps. Ethereum network has high liquidity for you who what to access DeFi, NFTs, DAOs, and more.`,
        },
        ipowConvert: "testnet",
        ipowNetworkId: IPOW_NETWORK_ID,
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
    </EthereumWalletContext.Provider>
  );
}
