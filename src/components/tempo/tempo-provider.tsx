"use client";

import toast from "react-hot-toast";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { Eip1193Provider, ethers } from "ethers";

import { useNetwork } from "@/app/network-provider";
import { temponetwork } from "@/index";
import { appConfig, TempoWalletContextType, TempoWalletType } from "./config";
import { getEvmWalletProvider, walletErrorCode, walletRejected } from "@/subcomponents/wallet-connect/evm-wallet-detection";
import { fetchErc20Balances } from "@/components/ethereum/erc20-balances";
import { VERIFIED_ERC20_TOKENS } from "./config/verified-tokens";

// Tempo has no native coin: eth_getBalance answers with a placeholder
// (about 4.2e57). The wallet's "USD" is PathUSD, Tempo's fee token, a
// TIP-20 token with 6 decimals, read like any token.
const PATHUSD = "0x20C0000000000000000000000000000000000000";
const PATHUSD_DECIMALS = 6;
const BALANCE_OF = ["function balanceOf(address) view returns (uint256)"];
import { IPOW_NETWORK_ID } from "./config/constants";
import { NO_CONVERT } from "../integrator/ipow/convertMethods";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";
import { tempoTestnet } from "@reown/appkit/networks";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { appKit } from "../walletconnect/wallet-connect-provider";


const TempoWalletContext = createContext<TempoWalletContextType>({
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
  currencyTicker: "USD",
  decimals: 18,
  ipowDecimals: 18,
  networkName: "Tempo",
  networkDescription: {},
  networkLogo: temponetwork,
  price: {},
  networkExplorer: {},
  ipowConvert: "comingsoon",
  ipowNetworkId: 9,
  setFeeSelection: () => {},
  connect: async () => {},
  disconnect: () => {},
  switchWallet: async () => {},
  signMessage: async () => null,
  sendTokenTo: async () => null,
  checkAddress: () => ({ valid: false, reason: "invalid" }),
  isValidAddress: () => false,
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

export function useTempoWallet() {
  return useContext(TempoWalletContext);
}

export function TempoProvider({ children }: { children: ReactNode }) {
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
  const [walletType, setWalletType] = useState<TempoWalletType | null>(null);
  const [availableWallets] = useState<
    TempoWalletType[]
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
  const targetNetwork = tempoTestnet;

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
  const getWalletInjection = (wallet: TempoWalletType) =>
    wallet === "metamask" || wallet === "phantom" ? getEvmWalletProvider(wallet) : Promise.resolve(null);

  const connect = async (wallet: TempoWalletType, isAutoConnect = false) => {
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
          if (selectedChain !== "tempo") return;
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

  const switchWallet = async (wallet: TempoWalletType) => {
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

  // Tempo has no native coin to send: "USD" is PathUSD, and every send is a
  // token transfer. Without `token`, PathUSD; with it, that token (Assets
  // passes the RWA tokens' address and decimals). The wallet prices the fee.
  const sendTokenTo = async (
    to: string,
    amount: number,
    _unused?: unknown,
    token?: { address: string; decimals: number },
  ): Promise<string | null> => {
    if (!address) return null;

    try {
      const signer = await getActiveSigner();
      const { address: tokenAddress, decimals } = token ?? { address: PATHUSD, decimals: PATHUSD_DECIMALS };
      const erc20 = new ethers.Contract(tokenAddress, ["function transfer(address to, uint256 amount) returns (bool)"], signer);
      // Amounts come rounded to 18 places (and 1e-7 style for tiny ones):
      // cut down to the token's own decimals, never up, before parsing.
      const cut = (Math.floor(amount * 10 ** decimals) / 10 ** decimals).toFixed(decimals);
      const tx = await erc20.transfer(to, ethers.parseUnits(cut, decimals));
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

const fetchBalance = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (!address) return;
    try {
      const pathUsd = new ethers.Contract(PATHUSD, BALANCE_OF, readOnlyProvider);
      const [confirmedWei, pendingWei, tokens] = await Promise.all([
        pathUsd.balanceOf(address, { blockTag: "latest" }) as Promise<bigint>,
        (pathUsd.balanceOf(address, { blockTag: "pending" }) as Promise<bigint>).catch(() => pathUsd.balanceOf(address) as Promise<bigint>),
        // The allowlisted ERC-20s the wallet holds (Multicall3 is on Tempo's testnet).
        fetchErc20Balances(readOnlyProvider, address, VERIFIED_ERC20_TOKENS[netKey]).catch((err) => {
          console.error("Failed to fetch Tempo ERC-20 balances:", err);
          return [];
        }),
      ]);

    
      if (signal?.aborted) {
        return;
      }

      let unconfirmedWei = pendingWei - confirmedWei;
      if (unconfirmedWei < BigInt(0)) unconfirmedWei = BigInt(0);

      const confirmed = Number(ethers.formatUnits(confirmedWei, PATHUSD_DECIMALS)) || 0;
      const unconfirmed = Number(ethers.formatUnits(unconfirmedWei, PATHUSD_DECIMALS)) || 0;

      setBalance({ confirmed, unconfirmed, fetched: true, tokens });
    } catch (err) {
      if (signal?.aborted) return;
      console.error("Failed to fetch balance:", err);
      setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });
    }
  }, [address, currentNetworkConfig.jsonRpcUrl]);

  /** The test RWA tokens' faucet (MockRWA.faucet): a few tokens to the
   *  wallet, once every few hours; sent as an ordinary transaction, like
   *  sendTokenTo. */
  const faucet = async (token: string): Promise<string> => {
    const signer = await getActiveSigner();
    const c = new ethers.Contract(token, ["function faucet()", "error FaucetCoolingDown(uint256 nextAt)"], signer);
    try {
      const tx = await c.faucet();
      await tx.wait();
      fetchBalance().catch(() => {});
      return tx.hash;
    } catch (e: any) {
      // ethers v6 decodes only Error(string) and Panic; the custom error is parsed here.
      let parsed: any = null;
      try { parsed = e?.data ? c.interface.parseError(e.data) : null; } catch {}
      if (parsed?.name === "FaucetCoolingDown") throw new Error(`The faucet gave you some already: again at ${new Date(Number(parsed.args[0]) * 1000).toLocaleTimeString()}`);
      throw e;
    }
  };

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


  // PathUSD, Tempo's fee token, is a dollar stablecoin: a dollar each.
  const fetchPrice = async () => {
    setPrice({ usd: 1 } as any);
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
  }, []);

  useEffect(() => {
    // Only on this network's own pages: on others (Bitcoin's included) every
    // network's wallet is loaded, and two of these would pull the wallet back
    // and forth. Signing switches to the right network anyway.
    if (selectedChain !== "tempo") return;

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
    if (selectedChain !== "tempo") return;
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
    ) as TempoWalletType | null;

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
    <TempoWalletContext.Provider
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
        currencyTicker: "USD",
        decimals: 18,
        ipowDecimals: 18,
        networkName: "Tempo",
        networkLogo: temponetwork,
        networkDescription: {
          en: `Tempo Network.`, // Stubbed for Tempo
        },
        ipowConvert: "comingsoon",
        ipowNetworkId: IPOW_NETWORK_ID,
        // The old iPoW contract is gone; Convert is "comingsoon" here.
        ...NO_CONVERT,
        connect,
        setFeeSelection,
        disconnect,
        switchWallet,
        signMessage,
        sendTokenTo,
        faucet,
        getSigner: getActiveSigner,
        checkAddress,
        isValidAddress,
        fetchETA,
      }}
    >
      {children}
    </TempoWalletContext.Provider>
  );
}
