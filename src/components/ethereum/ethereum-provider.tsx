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
import { BytesLike, Eip1193Provider, ethers } from "ethers";

import { useNetwork } from "@/app/network-provider";
import { ethereumnetwork } from "@/index";
import { appConfig, EthereumWalletContextType, EthereumWalletType } from "./config";
import { getEvmWalletProvider } from "@/subcomponents/wallet-connect/evm-wallet-detection";
import { IPOW_CONTRACT_ADDRESS_TESTNET, IPOW_GAS_LIMIT, IPOW_NETWORK_ID } from "./config/constants";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";
import IPOW_ABI_JSON from "../integrator/ipow/evm/abi.json";
import { mainnet, sepolia } from "@reown/appkit/networks";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { appKit } from "../walletconnect/wallet-connect-provider";
import { TxPhase, TypeFilter } from "../integrator/ipow/evm/type";
import { VERIFIED_ERC20_TOKENS } from "./config/verified-tokens";
import { fetchErc20Balances, fetchErc20UsdPrices, fetchVerifiedTokenLogos } from "./erc20-balances";



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
  selfCustodyParameter: {},
  networkLogo: ethereumnetwork,
  price: {},
  networkExplorer: {},
  ipowConvert: "testnet",
  ipowNetworkId: 2,
  dappList: [],
  toggleFavoriteDapp: () => {},
  setFeeSelection: () => {},
  connect: async () => {},
  disconnect: () => {},
  switchWallet: async () => {},
  signMessage: async () => null,
  sendTokenTo: async () => null,
  checkAddress: () => ({ valid: false, reason: "invalid" }),
  isValidAddress: () => false,
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

  const { ethereumMainnet, selectedChain } = useNetwork();
  const isMainnet = ethereumMainnet;
  const currentNetworkConfig = useMemo(() => {
    return isMainnet ? appConfig.networks.mainnet : appConfig.networks.testnet;
  }, [isMainnet]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullRpcUrl = `${origin}${currentNetworkConfig.jsonRpcUrl}`;



const [selfCustodyParameter, setSelfCustodyParameter] = useState<CustodyParams>({
  network: "ETHEREUM",
  env: isMainnet ? "MAINNET" : "TESTNET",
  tokens: [

  ],
  fetched: false,
});
  const [dappList, setDappList] = useState<any[] | null>(null);
  const [price, setPrice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [walletType, setWalletType] = useState<EthereumWalletType | null>(null);
  const [availableWallets, setAvailableWallets] = useState<
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

  const netKey = useMemo(() => {
    return isMainnet ? "mainnet" : "testnet";
  }, [isMainnet]);

  const targetNetwork = useMemo(() => {
    return isMainnet ? mainnet : sepolia;
  }, [isMainnet]);

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
      if (switchError.code === 4902) {
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
      } else {
        throw new Error("User rejected network switch");
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
          const currentNetwork = appKit.getCaipNetwork();

          if (currentNetwork?.id !== targetNetwork.id) {
            console.log(
              `Connection established! Forcing MetaMask to add/switch to ${targetNetwork.name}...`,
            );
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
  }, [akConnected, allAccounts, akProvider, isMainnet, address, walletType]);

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

  const getReadOnlyConvertContract = () => {
    return new ethers.Contract(
      IPOW_CONTRACT_ADDRESS_TESTNET,
      IPOW_ABI_JSON,
      new ethers.JsonRpcProvider(fullRpcUrl),
    );
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

  const getSignerConvertContract = async () =>
    new ethers.Contract(
      IPOW_CONTRACT_ADDRESS_TESTNET,
      IPOW_ABI_JSON,
      await getActiveSigner(),
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
          console.log(
            `Wrong network detected before signing. Attempting switch to ${targetNetwork.name}...`,
          );

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
            } catch (fallbackErr) {
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

  const priceCache = useRef({ ethPriceUsd: 0, btcPriceUsd: 0, lastFetched: 0 });

  const fetchMarketPrices = async () => {

    if (Date.now() - priceCache.current.lastFetched < 30000) {
      return priceCache.current;
    }

    try {
      const [ethRes, btcRes] = await Promise.all([
        fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT").then(r => r.json()),
        fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT").then(r => r.json())
      ]);

      priceCache.current = {
        ethPriceUsd: parseFloat(ethRes.price),
        btcPriceUsd: parseFloat(btcRes.price),
        lastFetched: Date.now(),
      };

      return priceCache.current;
    } catch (error) {
      console.error("Failed to fetch market prices:", error);
      
      try {
         const cgResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd");
         const cgData = await cgResponse.json();
         return {
            ethPriceUsd: cgData.ethereum.usd,
            btcPriceUsd: cgData.bitcoin.usd,
         };
      } catch (fallbackError) {
         throw new Error("All pricing oracles failed");
      }
    }
  };

  const estimateBitcoinFromNative = async (
    ethAmount: number,
  ): Promise<string | null> => {
    try {
      const { ethPriceUsd, btcPriceUsd } = await fetchMarketPrices();
      
      const btcAmount = (ethAmount * ethPriceUsd) / btcPriceUsd * 0.99;
      
      const sats = Math.floor(btcAmount * 1e8);
      
      return sats.toString();
    } catch (e) {
      console.error("estimateBitcoinFromNative error:", e);
      return null;
    }
  };

  const estimateNativeFromBitcoin = async (
    btcSats: string,
  ): Promise<string | null> => {
    try {
      const { ethPriceUsd, btcPriceUsd } = await fetchMarketPrices();
      
      const btcAmount = Number(btcSats) / 1e8;
      
      const ethAmount = (btcAmount * btcPriceUsd) / ethPriceUsd * 0.99;
      
      return ethAmount.toFixed(18);
    } catch (e) {
      console.error("estimateNativeFromBitcoin error:", e);
      return null;
    }
  };


const commitNativeToBitcoin = async (
    userProgram: string,
    ethAmount: number,
    bitcoinAmountSats: number,
    destination?: { networkId: number; networkAddress: string },
  ) => {
    try {
      const c = await getSignerConvertContract();
      const weiAmount = ethers.parseEther(ethAmount.toString());
      

      const fee = (weiAmount * BigInt(50)) / BigInt(10000);

      const isCrossChain = destination && destination.networkId > 0;
      let finalNetworkId = 0;
      let finalNetworkAddress = "0x";
      let finalUserProgram = "0x";

      if (isCrossChain) {
        finalNetworkId = destination!.networkId;
        finalNetworkAddress = destination!.networkAddress.startsWith("0x")
          ? destination!.networkAddress
          : ethers.hexlify(ethers.toUtf8Bytes(destination!.networkAddress));
        finalUserProgram = "0x";
      } else {
        if (!userProgram) throw new Error("Bitcoin Program required for direct swap");
        finalNetworkId = 0;
        finalNetworkAddress = "0x";
        finalUserProgram = userProgram.startsWith("0x") ? userProgram : `0x${userProgram}`;
      }

      const tx = await c.commitNativeToBitcoin(
        weiAmount,
        bitcoinAmountSats.toString(),
        finalNetworkId.toString(),
        finalNetworkAddress,
        finalUserProgram,
        {
          value: fee,
          gasLimit: IPOW_GAS_LIMIT,
        },
      );

      return tx.hash;
    } catch (e) {
      console.error("commitNativeToBitcoin error:", e);
      return null;
    }
  };

  const commitBitcoinToNative = async (
    btcSats: string | number,
    ethAmount: number,
    userProgram: string,
  ) => {
    try {
      if (!userProgram) throw new Error("Bitcoin Program required for direct swap");
      const finalUserProgram = userProgram.startsWith("0x") ? userProgram : `0x${userProgram}`;

      const c = await getSignerConvertContract();
      const weiAmount = ethers.parseEther(ethAmount.toString());
      

      const fee = (weiAmount * BigInt(50)) / BigInt(10000);

      const tx = await c.commitBitcoinToNative(
        btcSats.toString(),     // 1. bitcoinAmount
        weiAmount.toString(),   // 2. nativeAmount
        0,                      // 3. networkId
        finalUserProgram,       // 4. userProgram
        ethers.ZeroAddress,     // 5. destAddress
        "0x",                   // 6. networkAddress
        0,                      // 7. dutyWindowSeconds
        "0x",                   // 8. ipowReceiveProgram
        0,                      // 9. lockedAnchorHeight
        { 
          value: fee,
          gasLimit: IPOW_GAS_LIMIT 
        },
      );
      
      return tx.hash;
    } catch (error) {
      console.error("commitBitcoinToNative error:", error);
      return null;
    }
  };

  const depositApprovedConversion = async (txId: bigint) => {
    const c = await getSignerConvertContract();
    const conversionData = await c.conversions(txId);
    const amountToDeposit = conversionData.nativeAmount;

    const tx = await c.depositApprovedConversion(txId, {
      value: amountToDeposit,
      gasLimit: IPOW_GAS_LIMIT,
    });

    return tx.hash;
  };

  const submitBitcoinMerkleProofWithTx = async (
    txId: bigint,
    txRaw: BytesLike,
    voutIndex: bigint,
    blockHashLE: BytesLike,
    blockHeight: bigint,
    branch: BytesLike[],
    index: bigint,
  ) =>
    (
      await (
        await getSignerConvertContract()
      ).submitBitcoinMerkleProofWithTx(
        txId,
        txRaw,
        voutIndex,
        blockHashLE,
        blockHeight,
        branch,
        index,
      )
    ).hash;

  const getMyTxIds = async (
    phase: TxPhase = 0,
    typeFilter: TypeFilter = 0,
    bitcoinProgramFilter: string = "",
    isUserBitcoinProgramFilter: boolean = true,
  ) => {
    try {
      if (!address && !bitcoinProgramFilter) return [];
      const c = getReadOnlyConvertContract();

      let evmUserFilter = address;
      if (bitcoinProgramFilter && bitcoinProgramFilter !== "") {
        evmUserFilter = ethers.ZeroAddress;
      }

      let programBytes = "0x";
      if (bitcoinProgramFilter) {
        programBytes = bitcoinProgramFilter.startsWith("0x")
          ? bitcoinProgramFilter
          : `0x${bitcoinProgramFilter}`;
      }

      const next: bigint = await c.nextTxId();

      return next <= BigInt(1)
        ? []
        : c.getTxIdsByFilter(
            typeFilter,
            phase ?? 0,
            evmUserFilter,
            programBytes,
            isUserBitcoinProgramFilter,
            0,
            false,
            BigInt(1),
            next - BigInt(1),
            200,
          );
    } catch (e) {
      console.error("Eth getMyTxIds error:", e);
      return [];
    }
  };

  const getConversion = async (txId: bigint): Promise<any> => {
    try {
      const c = getReadOnlyConvertContract();
      const result = await c.getConversionWithPhase(txId);

      const raw = result[0];
      const phase = Number(result[1]);

      if (!raw || raw.user === "0x0000000000000000000000000000000000000000")
        return null;

      return {
        id: txId.toString(),
        phase: phase,
        user: raw.user,
        isNativeToBitcoin: raw.isNativeToBitcoin,
        slippage: Number(raw.slippage),
        networkId: Number(raw.networkId),
        userProgram: raw.userProgram,
        ipowReceiveProgram: raw.ipowReceiveProgram,
        networkAddress: raw.networkAddress,
        nativeAmount: raw.nativeAmount?.toString() || "0",
        bitcoinAmount: raw.bitcoinAmount?.toString() || "0",
        commitFee: raw.commitFee?.toString() || "0",
        reservedNative: raw.reservedNative?.toString() || "0",
        createdAt: Number(raw.createdAt),
        approvedAt: Number(raw.approvedAt),
        depositedAt: Number(raw.depositedAt),
        operatorDutyExpiresAt: Number(raw.operatorDutyExpiresAt),
        approved: raw.approved,
        deposited: raw.deposited,
        completed: raw.completed,
        refunded: raw.refunded,
      };
    } catch (e) {
      console.error("getConversion error:", e);
      return null;
    }
  };

  const anchorInfo = async (txId: bigint): Promise<any | null> => {
    try {
      return await getReadOnlyConvertContract().anchorInfo(txId);
    } catch (e) {
      console.error("anchorInfo error:", e);
      return null;
    }
  };

  const proofInfo = async (txId: bigint): Promise<any | null> => {
    try {
      return await getReadOnlyConvertContract().proofInfo(txId);
    } catch (e) {
      console.error("proofInfo error:", e);
      return null;
    }
  };

  const windowsFor = async (txId: bigint): Promise<any | null> => {
    try {
      return await getReadOnlyConvertContract().windowsFor(txId);
    } catch (e) {
      console.error("windowsFor error:", e);
      return null;
    }
  };

  const globalHeightToHashLE = async (h: bigint): Promise<any | null> => {
    try {
      return await getReadOnlyConvertContract().globalHeightToHashLE(h);
    } catch (e) {
      console.error("globalHeightToHashLE error:", e);
      return null;
    }
  };

  const globalHeaders = async (hashLE: any): Promise<any | null> => {
    try {
      return await getReadOnlyConvertContract().globalHeaders(hashLE);
    } catch (e) {
      console.error("globalHeaders error:", e);
      return null;
    }
  };

  const refundIfNotApproved = async (txId: bigint): Promise<string | null> => {
    try {
      const c = await getSignerConvertContract();
      const tx = await c.refundIfNotApproved(txId);
      return tx.hash;
    } catch (e) {
      console.error("refundIfNotApproved error:", e);
      return null;
    }
  };

  const claimNativeAfterOperatorExpired = async (
    txId: bigint,
  ): Promise<string | null> => {
    try {
      const c = await getSignerConvertContract();
      const tx = await c.claimNative_AfterOperatorExpired(txId);
      return tx.hash;
    } catch (e) {
      console.error("claimNativeAfterOperatorExpired error:", e);
      return null;
    }
  };

  const refundAfterNoProofNativeToBitcoin = async (
    txId: bigint,
  ): Promise<string | null> => {
    try {
      const c = await getSignerConvertContract();
      const tx = await c.refundAfterNoProof_NativeToBitcoin(txId);
      return tx.hash;
    } catch (e) {
      console.error("refundAfterNoProofNativeToBitcoin error:", e);
      return null;
    }
  };

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
        console.log(`[Abort] Cancelled ETH balance update for ${address}`);
        return;
      }

      // Testnet tokens have no real market, and Uniswap's list is mainnet-only — both would
      // be misleading/empty on testnet, so only fetch either on mainnet.
      let pricedTokens = tokens;
      if (tokens && tokens.length > 0 && isMainnet) {
        const addresses = tokens.map((t) => t.mint);
        const [prices, logos] = await Promise.all([
          fetchErc20UsdPrices(addresses),
          fetchVerifiedTokenLogos(addresses),
        ]);
        if (signal?.aborted) return;
        pricedTokens = tokens.map((t) => {
          const p = prices[t.mint.toLowerCase()];
          return {
            ...t,
            price: p ? p.usd.toString() : "0",
            priceChange24h: p ? p.usd_24h_change : 0,
            logo: logos[t.mint.toLowerCase()] || null,
          };
        });
      }

      let unconfirmedWei = pendingWei - confirmedWei;
      if (unconfirmedWei < BigInt(0)) unconfirmedWei = BigInt(0);

      const confirmed = Number(ethers.formatEther(confirmedWei)) || 0;
      const unconfirmed = Number(ethers.formatEther(unconfirmedWei)) || 0;

      setBalance((prev) => {
        // `tokens` is `null` when the multicall itself failed (RPC hiccup, etc.) — keep
        // whatever token list we already had rather than dropping it to empty for one bad poll.
        const nextTokens = pricedTokens === null ? prev.tokens : pricedTokens;
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
  }, [address, currentNetworkConfig.jsonRpcUrl, netKey, isMainnet]);

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

  const favoriteTimers = useRef<Record<number, NodeJS.Timeout>>({});

  const toggleFavoriteDapp = async (dappId: number) => {
    if (!address) return;

    setDappList((prev) =>
      prev!.map((dapp) => {
        if (dapp.id === dappId) {
          const willBeFavorited = !dapp.isFavorited;
          return {
            ...dapp,
            favoriteCount: willBeFavorited
              ? dapp.favoriteCount + 1
              : Math.max(0, dapp.favoriteCount - 1),
            isFavorited: willBeFavorited,
          };
        }
        return dapp;
      }),
    );

    if (favoriteTimers.current[dappId]) {
      clearTimeout(favoriteTimers.current[dappId]);
    }

    favoriteTimers.current[dappId] = setTimeout(async () => {
      try {
        const response = await fetch("/api/dapphub/favorite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            network: "ETHEREUM",
            dappId: dappId,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setDappList((prev) =>
            prev!.map((dapp) =>
              dapp.id === dappId
                ? { ...dapp, favoriteCount: result.favoriteCount }
                : dapp,
            ),
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
      const response = await fetch(`/api/token-price?token=ETH&env=${envMode}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      setPrice(data);
    } catch (error) {
      console.error("Error fetching price:", error);
    }
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
  }, [akConnected, allAccounts, akProvider, isMainnet, address, walletType]);

  useEffect(() => {
    const fetchDapps = async () => {
      try {
        const addressQuery = address ? `&walletAddress=${address}` : "";
        const response = await fetch(
          `/api/dapphub/list?network=ETHEREUM${addressQuery}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (result.success) {
          setDappList(result.data);
        } else {
          setDappList([]);
        }
      } catch (error) {
        console.error(`[DAppHub] Fetch Error:`, error);
        setDappList([]);
      }
    };

    fetchDapps();
    const interval = setInterval(fetchDapps, 300000);
    return () => clearInterval(interval);
  }, [address, connected]);

useEffect(() => {
    setSelfCustodyParameter((prev) => ({ ...prev, tokens: [], fetched: false }));

    let cancelled = false;
    let quickRetries = 0;
    const MAX_QUICK_RETRIES = 4;
    const QUICK_RETRY_DELAY_MS = 2000;

    const fetchSelfCustodyConstraints = async () => {
      try {
        const envMode = isMainnet ? "MAINNET" : "TESTNET";
        const response = await fetch(
          `/api/transaction/constraints/?network=ETHEREUM&env=${envMode}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );

        const data: CustodyParams = await response.json();
        if (cancelled) return;

        if (data && data.tokens) {
          setSelfCustodyParameter({ ...data, fetched: true });
          return;
        }
      } catch (error) {
        console.error("Failed to fetch ETHEREUM self-custody limits:", error);
      }

      // A malformed/empty response shouldn't strand the UI in "still loading" for a full 5
      // minutes (the normal poll cadence below) — retry quickly a few times first, since
      // that's a much more plausible transient hiccup than a genuinely empty token list.
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
    if (selectedChain !== "ethereum" && selectedChain !== "bitcoin") return;

    const checkChain = async () => {
      if (!provider) return;
      const network = await provider.getNetwork();
      const targetChainId = BigInt(currentNetworkConfig.chainId);

      if (network.chainId !== targetChainId) {
        console.warn("Chain ID mismatch detected");
      }
    };
    checkChain();
  }, [isMainnet, connected, selectedChain, provider, currentNetworkConfig]);

  useEffect(() => {
    fetchPrice();
    const i = setInterval(() => {
      fetchPrice();
    }, 60000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMainnet]);

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
  }, [walletType, connected, isMainnet]);
  useEffect(() => {
    if (selectedChain !== "ethereum" && selectedChain !== "bitcoin") return;
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
        console.log("Wrong network detected. Switching...");
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

    const handleNewBlock = (blockNumber: number) => {

      estimateFee(signal); 

      blockCount++;
      if (blockCount >= 3) {
        console.log(`🔗 3 ETH blocks passed. Refetching balance...`);
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
  }, [isMainnet]);
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
          id: `Ethereum adalah blockchain pertama dari smart contract dan aplikasi terdesentralisasi. Jaringan Ethereum ini memiliki likuiditas tinggi untuk kamu yang mau akses DeFi, NFT, DAO, dan lainnya.`,
        },
        selfCustodyParameter,
        ipowConvert: "testnet",
        ipowNetworkId: IPOW_NETWORK_ID,
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
        estimateBitcoinFromNative,
        estimateNativeFromBitcoin,
        commitNativeToBitcoin,
        submitBitcoinMerkleProofWithTx,
        commitBitcoinToNative,
        depositApprovedConversion,
        getMyTxIds,
        getConversion,
        refundIfNotApproved,
        claimNativeAfterOperatorExpired,
        refundAfterNoProofNativeToBitcoin,
        anchorInfo,
        proofInfo,
        windowsFor,
        globalHeightToHashLE,
        globalHeaders,
      }}
    >
      {children}
    </EthereumWalletContext.Provider>
  );
}
