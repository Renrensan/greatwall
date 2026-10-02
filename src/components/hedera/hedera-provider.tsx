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

import {
  HederaChainDefinition,
  hederaNamespace,
  DAppSigner,
  CAIPChainIdToLedgerId,
} from "@hashgraph/hedera-wallet-connect";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { appKit } from "../walletconnect/wallet-connect-provider";
import {
  TransferTransaction,
  ContractId,
  ContractExecuteTransaction,
  AccountUpdateTransaction,
  Client,
  TransactionId,
  AccountId,
} from "@hiero-ledger/sdk";

import IPOW_ABI_JSON from "../integrator/ipow/evm/abi.json";
import { hederanetwork } from "@/index";
import { useNetwork } from "@/app/network-provider";
import { appConfig, HederaWalletContextType, HederaWalletType } from "./config";

import {
  IPOW_GAS_LIMIT,
  IPOW_CONTRACT_ACCOUNT_ID_TESTNET,
  IPOW_NETWORK_ID,
} from "./config/constants";
import { TxPhase, TypeFilter } from "../integrator/ipow/evm/type";
import { ContractFunctionParameterBuilder, convertHederaAccountIdToEVM } from "./config/helpers";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";
import { detectEvmWallets, getEvmWalletProvider } from "@/subcomponents/wallet-connect/evm-wallet-detection";
import { fetchHeldHtsTokens, HeldHtsToken } from "./hts-balances";
import { fetchHederaTokenIcons } from "./token-icons";
import { fetchHashPackTokenInfo } from "./hashpack-prices";

const HederaWalletContext = createContext<HederaWalletContextType>({
  connected: false,
  isConnecting: false,
  address: null,
  resolvedAddress: null,
  walletType: null,
  availableWallets: [],
  balance: { confirmed: 0, unconfirmed: 0, sendable: 0, fetched: false,  tokens: [] },
  estimatedFee: {
    low: 0,
    medium: 0,
    high: 0,
    selectedFee: "medium",
    fetched: false,
  },
  price: {},
  networkExplorer: {},
  currencyTicker: "HBAR",
  decimals: 8,
  ipowDecimals: 8,
  networkName: "Hedera",
  networkLogo: hederanetwork,
  selfCustodyParameter: {},
  networkDescription: {},
  ipowConvert: "testnet",
  ipowNetworkId: 1,
  dappList: [],
  toggleFavoriteDapp: () => {},
  connect: async () => {},
  disconnect: () => {},
  switchWallet: async () => {},
  sendTokenTo: async () => null,
  checkAddress: () => ({ valid: false, reason: "invalid" }),
  isValidAddress: () => false,
  setFeeSelection: () => {},
  getEvmAddress: async () => null,
  submitBitcoinMerkleProofWithTx: async () => null,
  estimateBitcoinFromNative: async () => null,
  estimateNativeFromBitcoin: async () => null,
  commitNativeToBitcoin: async () => null,
  commitBitcoinToNative: async () => null,
  depositApprovedConversion: async () => null,
  getMyTxIds: async () => [],
  getConversion: async () => null,
  refundIfNotApproved: async () => null,
  claimNativeAfterOperatorExpired: async () => null,
  refundAfterNoProofNativeToBitcoin: async () => null,
  fetchETA: async () => null,
  anchorInfo: async () => null,
  proofInfo: async () => null,
  windowsFor: async () => null,
  globalHeightToHashLE: async () => null,
  globalHeaders: async () => null,

  getHederaNodes: async () => null,

  stakeToNode: async () => null,
  claimRewards: async () => null,
  unstake: async () => null,
  getCurrentStake: async () => null,
  bonzoIntelligenceData: null,
  depositToLending: async () => null,
  depositToVault: async () => null,
  repayDebt: async () => null,
  withdrawFromVault: async () => null,
  withdrawFromLending: async () => null,
});

export function useHederaWallet() {
  return useContext(HederaWalletContext);
}

export function HederaProvider({ children }: { children: ReactNode }) {
  const { hederaMainnet, selectedChain } = useNetwork();
  const isMainnet = hederaMainnet;
  const currentNetworkConfig = useMemo(() => {
    return isMainnet ? appConfig.networks.mainnet : appConfig.networks.testnet;
  }, [isMainnet]);

  const getReadOnlyContract = () => {
    const provider = new ethers.JsonRpcProvider(
      currentNetworkConfig.jsonRpcUrl,
    );

    const cachedContract = new ethers.Contract(
      convertHederaAccountIdToEVM(IPOW_CONTRACT_ACCOUNT_ID_TESTNET),
      IPOW_ABI_JSON,
      provider,
    );

    return cachedContract;
  };

const client = useMemo(() => {
    return isMainnet ? Client.forMainnet() : Client.forTestnet();
  }, [isMainnet]);

  
  const netKey = useMemo(() => {
    return isMainnet ? "mainnet" : "testnet";
  }, [isMainnet]);

  const targetNetwork = useMemo(() => {
    return isMainnet ? HederaChainDefinition.Native.Mainnet : HederaChainDefinition.Native.Testnet;
  }, [isMainnet]);

  const { isConnected: akConnected, allAccounts } = useAppKitAccount();
  // The shared appKit hands every adapter the same plain `@walletconnect/universal-provider`
  // instance (see appkit-base-client.js: `UniversalProvider.init(...)`), NOT the
  // hedera-wallet-connect package's own `HederaProvider` subclass — so there's no
  // `.nativeProvider`/HIP820Provider here. Build the DAppSigner directly from the raw
  // session + sign client instead, the same way HIP820Provider.getSigners() does internally.
  const { walletProvider: akProvider } = useAppKitProvider<any>(hederaNamespace);

  const getWalletConnectSigner = () => {
    const session = akProvider?.session;
    const signClient = akProvider?.client;
    const topic = session?.topic;
    if (!session || !signClient || !topic) return undefined;

    const targetChainId = isMainnet ? `${hederaNamespace}:mainnet` : `${hederaNamespace}:testnet`;
    const hederaAccounts: string[] | undefined = session.namespaces?.[hederaNamespace]?.accounts;
    const match = hederaAccounts?.find((acc) => acc.startsWith(`${targetChainId}:`));
    if (!match) return undefined;

    const accountIdStr = match.split(":")[2];
    return new DAppSigner(AccountId.fromString(accountIdStr), signClient, topic, CAIPChainIdToLedgerId(targetChainId));
  };

  const getValidatedSigner = async () => {
    if (walletType !== "metamask" || !provider) {
      throw new Error("MetaMask not connected or provider missing");
    }

    try {
      await switchNetwork(provider);
      return await provider.getSigner();
    } catch (error) {
      console.error("Network validation failed:", error);
      throw error;
    }
  };

const readOnlyProvider = useMemo(() => {
    return new ethers.JsonRpcProvider(currentNetworkConfig.jsonRpcUrl);
  }, [currentNetworkConfig.jsonRpcUrl]);

  const [price, setPrice] = useState(null);

  const [dappList, setDappList] = useState<any[] | null>(null);


const [selfCustodyParameter, setSelfCustodyParameter] = useState<CustodyParams>({
  network: "HEDERA",
  env: isMainnet ? "MAINNET" : "TESTNET",
  tokens: [
  ],
  fetched: false,
});
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<HederaWalletType | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [availableWallets, setAvailableWallets] = useState<HederaWalletType[]>(
    [],
  );
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

  const switchNetwork = async (prov: ethers.BrowserProvider) => {
    const targetChainIdHex = currentNetworkConfig.chainId.toLowerCase();

    const network = await prov.getNetwork();
    const currentChainIdHex = "0x" + network.chainId.toString(16);
    if (currentChainIdHex.toLowerCase() === targetChainIdHex) return;

    try {
      await prov.send("wallet_switchEthereumChain", [
        { chainId: targetChainIdHex },
      ]);
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await prov.send("wallet_addEthereumChain", [
            {
              chainId: targetChainIdHex,
              chainName: `Hedera ${currentNetworkConfig.network}`,
              nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
              rpcUrls: [currentNetworkConfig.jsonRpcUrl],
              blockExplorerUrls: [currentNetworkConfig.networkExplorer],
            },
          ]);
        } catch (addError) {
          console.error("User rejected adding network", addError);
        }
      }
    }
  };

  const detectWallets = async () => {
    const detected: HederaWalletType[] = [];
    const { metamask } = await detectEvmWallets();

    if (metamask) {
      detected.push("metamask");
    }

    detected.push("walletconnect");
    setAvailableWallets(detected);
  };

  const connect = async (wallet: HederaWalletType, isAutoConnect = false) => {
    const netKey = isMainnet ? "mainnet" : "testnet";
    setIsConnecting(true);

    try {
      if (wallet === "metamask") {
        const eth = await getEvmWalletProvider("metamask");
        if (!eth) return;

        const prov = new ethers.BrowserProvider(eth, "any");
        let accounts = await prov.listAccounts();

        if (accounts.length === 0) {
          if (isAutoConnect) return;
          await prov.send("eth_requestAccounts", []);
          accounts = await prov.listAccounts();
        }

        if (accounts.length > 0) {
          const signer = await prov.getSigner();
          setProvider(prov);
          setAddress(await signer.getAddress());
          setWalletType("metamask");
          setConnected(true);
          localStorage.setItem(`hederaConnected_${netKey}`, "true");
          localStorage.setItem(`hederaWalletType_${netKey}`, wallet);
        }
      }

      if (wallet === "walletconnect") {
        if (isAutoConnect) return;

        // A HIP-820 session only carries accounts for the chains the wallet actually
        // approved at connect time. If we're already connected but the live session has
        // no account for the network we're on now (e.g. it was approved mainnet-only and
        // the user just switched to testnet), appKit.open() would just show the existing
        // "connected account" screen instead of a fresh pairing prompt — there'd be no way
        // to ever approve testnet. Tear the stale session down first so a new pairing
        // request gives the wallet a real chance to grant the network we need.
        if (akConnected && akProvider && !getWalletConnectSigner()) {
          try {
            const signClient = (akProvider as any)?.client;
            await appKit.disconnect(hederaNamespace);

            // Disconnecting only ends the session — the pairing stays alive and the next
            // connect() can silently reuse it, handing back the same stale approval. Clear
            // pairings too so the next connect is a genuinely fresh handshake.
            const pairings = signClient?.core?.pairing?.getPairings?.() ?? [];
            await Promise.all(
              pairings.map((p: { topic: string }) =>
                signClient.core.pairing.disconnect({ topic: p.topic }).catch(() => {}),
              ),
            );
          } catch (e) {
            console.warn("Error clearing stale Hedera session before reconnect", e);
          }
        }

        await appKit.open({ view: "AllWallets", namespace: hederaNamespace });
      }
    } catch (err: any) {
      console.error("Connection Flow Error:", err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Reactively picks up a Hedera WalletConnect session once Reown AppKit's shared
  // client finishes connecting (mirrors ethereum-provider.tsx's pattern) — connect()
  // above only opens the modal, it doesn't wait on the session itself. Sourcing the
  // address from the DAppSigner (rather than allAccounts' address field) since that's
  // the field-tested way to get a Hedera account ID out of a HIP-820 session.
  //
  // Also re-runs on every isMainnet flip: a HIP-820 session only exposes an account
  // for a chain the wallet actually approved, so switching mainnet/testnet can land on
  // a chain with no approved account in the current session. Without clearing in that
  // case, the previous network's address/connected state would just linger unchanged.
  useEffect(() => {
    if (walletType === "metamask") return;

    const signer = akConnected && akProvider ? getWalletConnectSigner() : undefined;
    const id = signer?.getAccountId()?.toString() ?? null;
    if (id === address) return;

    if (id) {
      setAddress(id);
      setWalletType("walletconnect");
      setConnected(true);

      localStorage.setItem(`hederaConnected_${netKey}`, "true");
      localStorage.setItem(`hederaWalletType_${netKey}`, "walletconnect");
    } else if (walletType === "walletconnect") {
      setAddress(null);
      setWalletType(null);
      setConnected(false);

      localStorage.removeItem(`hederaConnected_${netKey}`);
      localStorage.removeItem(`hederaWalletType_${netKey}`);
    }
  }, [akConnected, allAccounts, akProvider, isMainnet, address, walletType, netKey]);

  // Keeps the shared appKit's active Hedera network in sync with Paradapp's own
  // mainnet/testnet toggle. A HIP-820 session is scoped to one network for its whole
  // lifetime (unlike EVM's live wallet_switchEthereumChain), so this only affects
  // which network the *next* connect() targets — same reconnect-after-toggle behavior
  // the old per-network DAppConnector instances already had.
  useEffect(() => {
    if (appKit.getCaipNetwork()?.id !== targetNetwork.id) {
      appKit.switchNetwork(targetNetwork);
    }
  }, [targetNetwork]);

  const disconnect = async (hardDisconenct: boolean) => {
    try {
      if (walletType === "walletconnect") {
        if (hardDisconenct) {
          await appKit.disconnect(hederaNamespace);
        }
      } else {
        setProvider(null);
      }
    } catch (e) {
      console.warn("Error on disconnect", e);
    }
    setConnected(false);
    setAddress(null);
    setWalletType(null);
    setProvider(null);

    setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });

    localStorage.removeItem(`hederaConnected_${netKey}`);
    localStorage.removeItem(`hederaWalletType_${netKey}`);
  };

  const switchWallet = async (wallet: HederaWalletType) => {
    disconnect(false);
    await connect(wallet);
  };

  const getEvmAddress = async (accountId: string): Promise<string> => {
    if (accountId.startsWith("0x")) return accountId;

    try {
      const response = await fetch(
        `${currentNetworkConfig.mirrorNodeUrl}/api/v1/accounts/${accountId}`,
      );

      if (!response.ok) {
        throw new Error(`Mirror node lookup failed: ${response.statusText}`);
      }

      const data = await response.json();

      return data.evm_address || convertHederaAccountIdToEVM(accountId);
    } catch (err) {
      console.error("Critical Error resolving EVM address:", err);
      throw new Error(
        "Unable to verify Hedera account type. Please try again.",
      );
    }
  };

  /** The single address-check entry point exposed to the frontend: whether an
   * address is valid, and if not, which specific rule it failed — so forms can
   * show a specific, actionable message instead of one generic "invalid" string.
   * Hedera accepts either its native `0.0.x` account-ID format or an EVM-style
   * `0x...` address. */
  const checkAddress = useCallback((address: string): AddressCheckResult => {
    if (address.startsWith("0.0.")) {
      try {
        AccountId.fromString(address);
        return { valid: true, reason: null };
      } catch {
        return { valid: false, reason: "invalid" };
      }
    }
    if (address.startsWith("0x")) {
      const valid = ethers.isAddress(address as unknown);
      if (valid) return { valid: true, reason: null };
      if (!/^0x[a-fA-F0-9]*$/.test(address)) return { valid: false, reason: "invalid-characters" };
      if (address.length !== 42) return { valid: false, reason: "wrong-length" };
      return { valid: false, reason: "invalid" };
    }
    return { valid: false, reason: "wrong-prefix" };
  }, []);

  const isValidAddress = useCallback((address: string): boolean => checkAddress(address).valid, [checkAddress]);

  const sendTokenTo = async (
    to: string,
    amountHBAR: number,
    customFeeHbar?: number,
    token?: { tokenId: string; decimals: number },
  ): Promise<string | null> => {
    const hbarBudget = customFeeHbar || estimatedFee[estimatedFee.selectedFee];

    if (walletType === "metamask") {
      // Only resolved here — the walletconnect path below never needs an EVM-form address at
      // all, so it shouldn't take on this extra mirror-node round trip (and failure point) too.
      const evmToAddress = to.includes(".") ? await getEvmAddress(to) : to;
      const signer = await getValidatedSigner();

      if (token) {
        // HTS tokens are reachable at their "long-zero" EVM address (same entity-number
        // encoding the SDK already uses for accounts, see convertHederaAccountIdToEVM) and
        // proxy standard ERC-20 calls through Hedera's JSON-RPC relay.
        const tokenEvmAddress = convertHederaAccountIdToEVM(token.tokenId);
        const erc20 = new ethers.Contract(
          tokenEvmAddress,
          ["function transfer(address to, uint256 amount) returns (bool)"],
          signer,
        );
        const amountUnits = ethers.parseUnits(amountHBAR.toString(), token.decimals);

        let gasLimit: bigint;
        try {
          const estimated: bigint = await erc20.transfer.estimateGas(evmToAddress, amountUnits);
          gasLimit = (estimated * BigInt(120)) / BigInt(100);
        } catch {
          // HTS precompile calls carry more overhead than a plain ERC-20 transfer —
          // a much larger fallback than Ethereum's equivalent is intentional here.
          gasLimit = BigInt(800_000);
        }

        const tx = await erc20.transfer(evmToAddress, amountUnits, { gasLimit });
        const receipt = await tx.wait();
        return receipt?.hash ?? tx.hash;
      }

      const feeData = await readOnlyProvider.getFeeData();
      const currentGasPrice = feeData.gasPrice || BigInt(15000000000);

      const budgetInWei = ethers.parseEther(hbarBudget.toString());
      const calculatedLimit = budgetInWei / currentGasPrice;

      const minLimit = BigInt(100000);
      const finalGasLimit =
        calculatedLimit > minLimit ? calculatedLimit : minLimit;

      const tx = await signer.sendTransaction({
        to: evmToAddress,
        value: ethers.parseEther(amountHBAR.toString()),
        gasLimit: finalGasLimit,
      });

      const receipt = await tx.wait();
      return receipt?.hash ?? tx.hash;
    }

    if (walletType === "walletconnect") {
      const signer = getWalletConnectSigner();
      if (!signer) return null;

      const transactionBuilder = token
        ? // addTokenTransferWithDecimals (not the plain addTokenTransfer) — it embeds the
          // token's decimals in the transfer itself, which is what lets the wallet validate
          // the amount actually matches what it thinks the token's decimals are. Without it,
          // wallets that enforce this check (HashPack included) refuse to even show the
          // approval prompt, since a dApp lying about decimals is a known way to trick a user
          // into approving a transfer orders of magnitude off from what they intended.
          new TransferTransaction().addTokenTransferWithDecimals(
            token.tokenId,
            signer.getAccountId(),
            -Math.round(amountHBAR * Math.pow(10, token.decimals)),
            token.decimals,
          ).addTokenTransferWithDecimals(
            token.tokenId,
            to,
            Math.round(amountHBAR * Math.pow(10, token.decimals)),
            token.decimals,
          )
        : new TransferTransaction()
            .addHbarTransfer(signer.getAccountId(), -amountHBAR)
            .addHbarTransfer(to, amountHBAR);

      if (hbarBudget) {
        transactionBuilder.setMaxTransactionFee(hbarBudget);
      }

      transactionBuilder.setTransactionId(
        TransactionId.generate(signer.getAccountId()),
      );

      const tx = transactionBuilder.freezeWith(client);

      // Sign-only, then submit ourselves via our own `client` — rather than
      // executeWithSigner/getReceiptWithSigner, which hand BOTH signing and submission to the
      // wallet's own internal node selection. HashPack (and possibly others) may still submit
      // through a node-health mechanism built on AccountBalanceQuery, which Hedera Consensus
      // Node v0.77 removes outright — submitting through our own Client instead uses the SDK's
      // real multi-node network + retry/backoff, independent of whatever the wallet does.
      const signedTx = await signer.signTransaction(tx);
      const result = await signedTx.execute(client);
      const receipt = await result.getReceipt(client);

      if (receipt.status.toString() === "SUCCESS") {
        return result.transactionId.toString();
      }

      console.error(
        `Hedera sendTokenTo: transaction reached consensus but failed, status: ${receipt.status.toString()}`,
        { to, amountHBAR, token },
      );
    }

    return null;
  };

  const fetchETA = async (
    txHash: string,
  ): Promise<{ estimatedSeconds: number; isCongested: boolean } | null> => {
    try {
      if (walletType === "metamask" && provider) {
        const tx = await readOnlyProvider.getTransaction(txHash);
        if (!tx) return null;

        if (tx.blockNumber !== null) {
          return { estimatedSeconds: 0, isCongested: false };
        }

        return { estimatedSeconds: 5, isCongested: false };
      }

      if (walletType === "walletconnect") {
        let formattedTxId = txHash;
        if (txHash.includes("@")) {
          const [accountId, timestamp] = txHash.split("@");
          formattedTxId = `${accountId}-${timestamp.replace(".", "-")}`;
        }

        const res = await fetch(
          `${currentNetworkConfig.mirrorNodeUrl}/api/v1/transactions/${formattedTxId}`,
        );

        if (!res.ok) return null;

        const data = await res.json();
        const tx = data.transactions?.[0];

        if (!tx) return null;

        if (tx.result === "SUCCESS" || tx.result === "OK") {
          return { estimatedSeconds: 0, isCongested: false };
        }

        return { estimatedSeconds: 5, isCongested: false };
      }

      return null;
    } catch (err) {
      console.error("Failed to estimate Hedera tx ETA:", err);
      return null;
    }
  };

  // Enriches held tokens with real price + icon, and — now that HashPack's feed gives a real
  // due-diligence signal — filters to just the tokens it's actually reviewed, the same
  // "verified only" treatment Ethereum's allowlist and Solana's Jupiter-list filter already
  // get. That filter only applies when the HashPack call actually succeeds: if it's
  // unreachable (that endpoint is Cloudflare-gated against non-browser traffic, confirmed via
  // repeated server-side probing) there's no due-diligence signal to filter on at all, so this
  // falls back to DavinciGraph's icon-only API (token-icons.ts) and shows everything held
  // rather than hiding every token just because the verification check itself failed.
  const enrichHeldTokens = async (tokens: HeldHtsToken[] | null): Promise<HeldHtsToken[] | null> => {
    if (!tokens || tokens.length === 0) return tokens;

    try {
      const priceInfo = await fetchHashPackTokenInfo(netKey);
      const enriched = tokens
        .map((t): HeldHtsToken | null => {
          const info = priceInfo.get(t.mint);
          if (!info) return null; // absent from HashPack's feed entirely — treat as unverified
          return {
            ...t,
            logo: info.icon || t.logo,
            price: info.priceUsd.toString(),
            dueDiligenceComplete: info.dueDiligenceComplete,
          };
        })
        .filter((t): t is HeldHtsToken => t !== null && t.dueDiligenceComplete);
      return enriched;
    } catch (err) {
      console.error("Failed to fetch HashPack token info, falling back to icon-only lookup (unfiltered):", err);
    }

    try {
      const icons = await fetchHederaTokenIcons(tokens.map((t) => t.mint));
      return tokens.map((t) => ({ ...t, logo: icons[t.mint] || t.logo }));
    } catch (err) {
      console.error("Failed to fetch Hedera token icons:", err);
      return tokens;
    }
  };

const fetchBalance = useCallback(async (signal?: AbortSignal): Promise<void> => {
    try {
      if (walletType === "metamask" && address) {
        const [wei, rawTokens] = await Promise.all([
          readOnlyProvider.getBalance(address),
          fetchHeldHtsTokens(currentNetworkConfig.mirrorNodeUrl, address).catch((err) => {
            console.error("Failed to fetch held HTS tokens:", err);
            return null;
          }),
        ]);
        const tokens = await enrichHeldTokens(rawTokens);

        if (signal?.aborted) return;

        setBalance((prev) => {
          const confirmed = Number(ethers.formatEther(wei));
          const nextTokens = tokens === null ? prev.tokens : tokens;
          const tokensChanged = JSON.stringify(prev.tokens) !== JSON.stringify(nextTokens);
          if (!tokensChanged && prev.fetched && prev.confirmed === confirmed) return prev;
          return { confirmed, unconfirmed: 0, fetched: true, tokens: nextTokens };
        });
        return;
      }


      if (walletType === "walletconnect" && address) {
        const [res, rawTokens] = await Promise.all([
          fetch(`${currentNetworkConfig.mirrorNodeUrl}/api/v1/accounts/${address}`, { signal }),
          fetchHeldHtsTokens(currentNetworkConfig.mirrorNodeUrl, address).catch((err) => {
            console.error("Failed to fetch held HTS tokens:", err);
            return null;
          }),
        ]);
        const tokens = await enrichHeldTokens(rawTokens);

        const data = await res.json();
        if (signal?.aborted) return;

        setBalance((prev) => {
          const confirmed = data.balance?.balance / 1e8;
          const nextTokens = tokens === null ? prev.tokens : tokens;
          const tokensChanged = JSON.stringify(prev.tokens) !== JSON.stringify(nextTokens);
          if (!tokensChanged && prev.fetched && prev.confirmed === confirmed) return prev;
          return { confirmed, unconfirmed: 0, fetched: true, tokens: nextTokens };
        });
        return;
      }
    } catch (err: any) {
      if (err.name === "AbortError" || signal?.aborted) {
        console.log(`[Abort] Cancelled Hedera balance update for ${address}`);
        return;
      }
      console.error("Error fetching Hedera balance", err);
    }
  }, [address, walletType, currentNetworkConfig.jsonRpcUrl, currentNetworkConfig.mirrorNodeUrl]);

  const fetchPrice = async () => {
    try {
      const envMode = isMainnet ? "MAINNET" : "TESTNET";
      const response = await fetch(`/api/token-price?token=HBAR&env=${envMode}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      setPrice(data);
    } catch (error) {
      console.error("Error fetching price:", error);
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
            network: "HEDERA",
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

const estimateFee = useCallback(async () => {
    // Hedera has no gas-auction fee market like ETH/BTC — transfer fees are fixed by the
    // network's published USD fee schedule and converted to HBAR using the network's own
    // live exchange rate, so "real" here means pulling that rate instead of a flat guess.
    const TRANSFER_FEE_USD = 0.0001; // Hedera's published base CryptoTransfer fee
    let usdPerHbar = 0.05; // conservative fallback if the live rate can't be fetched

    try {
      const res = await fetch(`${currentNetworkConfig.mirrorNodeUrl}/api/v1/network/exchangerate`);
      if (res.ok) {
        const data = await res.json();
        const rate = data?.current_rate;
        if (rate?.cent_equivalent && rate?.hbar_equivalent) {
          const liveUsdPerHbar = (rate.cent_equivalent / rate.hbar_equivalent) / 100;
          if (liveUsdPerHbar > 0) usdPerHbar = liveUsdPerHbar;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch live Hedera exchange rate, using fallback rate", e);
    }

    const base = TRANSFER_FEE_USD / usdPerHbar;

    setEstimatedFee((prev) => ({
      low: base,
      medium: base * 5,
      high: base * 10,
      fetched: true,
      selectedFee: prev.selectedFee,
    }));
  }, [currentNetworkConfig.mirrorNodeUrl]);

  const setFeeSelection = (selectedFee: "low" | "medium" | "high") => {
    setEstimatedFee((prev) => ({
      ...prev,
      selectedFee,
    }));
  };

  const hbarToTinybars = (hbarAmount: number): bigint => {
    const tiny = Math.round(hbarAmount * 10 ** 8);
    return BigInt(tiny);
  };

  const tinybarsToHbarString = (tinybars: bigint): string => {
    const hbar = Number(tinybars) / 10 ** 8;
    return hbar.toString();
  };

  const tinybarsToWei = (tinybars: bigint): bigint => {
    const wei = tinybars * BigInt(10000000000);
    return wei;
  };


  const priceCache = useRef({ hbarPriceUsd: 0, btcPriceUsd: 0, lastFetched: 0 });

  const fetchMarketPrices = async () => {
    if (Date.now() - priceCache.current.lastFetched < 30000) {
      return priceCache.current;
    }

    try {
      const [hbarRes, btcRes] = await Promise.all([
        fetch("https://api.binance.com/api/v3/ticker/price?symbol=HBARUSDT").then(r => r.json()),
        fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT").then(r => r.json())
      ]);

      priceCache.current = {
        hbarPriceUsd: parseFloat(hbarRes.price),
        btcPriceUsd: parseFloat(btcRes.price),
        lastFetched: Date.now(),
      };

      return priceCache.current;
    } catch (error) {
      console.error("Failed to fetch market prices:", error);
      
      try {
         const cgResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph,bitcoin&vs_currencies=usd");
         const cgData = await cgResponse.json();
         return {
            hbarPriceUsd: cgData["hedera-hashgraph"].usd,
            btcPriceUsd: cgData.bitcoin.usd,
         };
      } catch (fallbackError) {
         throw new Error("All pricing oracles failed");
      }
    }
  };

  const estimateBitcoinFromNative = async (
    hbarAmount: number,
  ): Promise<string | null> => {
    try {
      const { hbarPriceUsd, btcPriceUsd } = await fetchMarketPrices();
      
      const btcAmount = (hbarAmount * hbarPriceUsd) / btcPriceUsd;
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
      const { hbarPriceUsd, btcPriceUsd } = await fetchMarketPrices();
      
      const btcAmount = Number(btcSats) / 1e8;
      const hbarAmount = (btcAmount * btcPriceUsd) / hbarPriceUsd;
      
      return hbarAmount.toFixed(8); 
    } catch (e) {
      console.error("estimateNativeFromBitcoin error:", e);
      return null;
    }
  };

  const anchorInfo = async (txId: bigint): Promise<any | null> => {
    try {
      const c = getReadOnlyContract();

      const result: bigint = await c.anchorInfo(txId);

      return result;
    } catch (e) {
      console.error("anchorInfo error:", e);
      return null;
    }
  };

  const proofInfo = async (txId: bigint): Promise<any | null> => {
    try {
      const c = getReadOnlyContract();

      const result: bigint = await c.proofInfo(txId);

      return result;
    } catch (e) {
      console.error("proofInfo error:", e);
      return null;
    }
  };

  const windowsFor = async (txId: bigint): Promise<any | null> => {
    try {
      const c = getReadOnlyContract();

      const result: bigint = await c.windowsFor(txId);

      return result;
    } catch (e) {
      console.error("windowsFor error:", e);
      return null;
    }
  };

  const globalHeightToHashLE = async (h: bigint): Promise<any | null> => {
    try {
      const c = getReadOnlyContract();
      const result: bigint = await c.globalHeightToHashLE(h);

      return result;
    } catch (e) {
      console.error("windowsFor error:", e);
      return null;
    }
  };

  const globalHeaders = async (hashLE: any): Promise<any | null> => {
    try {
      const c = getReadOnlyContract();

      const result: bigint = await c.globalHeaders(hashLE);

      return result;
    } catch (e) {
      console.error("windowsFor error:", e);
      return null;
    }
  };

const commitNativeToBitcoin = async (
    userProgram: string,
    hbarAmount: number,
    bitcoinAmountSats: number, 
    destination?: {
      networkId: number;
      networkAddress: string;
    },
  ): Promise<string | null> => {
    try {

      const hbarTinybars = hbarToTinybars(hbarAmount);
      

      const feeTinybars = (hbarTinybars * BigInt(50)) / BigInt(10000);


      const feeWei = tinybarsToWei(feeTinybars); 
      const feeHbarStr = tinybarsToHbarString(feeTinybars);

      const isCrossChain = destination && destination.networkId > 0;
      let finalNetworkId = "0";
      let finalNetworkAddress: Uint8Array = new Uint8Array([]);
      let finalUserProgram: Uint8Array = new Uint8Array([]);

      if (isCrossChain) {
        finalNetworkId = destination!.networkId.toString();
        if (destination!.networkAddress.startsWith("0x")) {
          finalNetworkAddress = ethers.getBytes(destination!.networkAddress);
        } else {
          finalNetworkAddress = ethers.toUtf8Bytes(destination!.networkAddress);
        }
        finalUserProgram = new Uint8Array([]);
      } else {
        finalNetworkId = "0";
        finalNetworkAddress = new Uint8Array([]);
        const scriptHex = userProgram.startsWith("0x") ? userProgram : `0x${userProgram}`;
        finalUserProgram = ethers.getBytes(scriptHex);
      }

      if (walletType === "metamask") {
        const signer = await getValidatedSigner();

        const abi = [
          "function commitNativeToBitcoin(uint256 nativeAmount, uint256 bitcoinAmount, uint256 networkId, bytes networkAddress, bytes userProgram) payable",
        ];

        const contract = new ethers.Contract(
          `0x${ContractId.fromString(IPOW_CONTRACT_ACCOUNT_ID_TESTNET).toSolidityAddress()}`,
          abi,
          signer,
        );

        const tx = await contract.commitNativeToBitcoin(
          hbarTinybars.toString(),
          bitcoinAmountSats.toString(),
          finalNetworkId,
          ethers.hexlify(finalNetworkAddress),
          ethers.hexlify(finalUserProgram),
          {
            value: feeWei,
            gasLimit: IPOW_GAS_LIMIT,
          },
        );

        return tx.hash;
      }

      if (walletType === "walletconnect") {
        const signer = getWalletConnectSigner();

        const functionParameters = new ContractFunctionParameterBuilder()
          .addParam({
            type: "uint256",
            name: "nativeAmount",
            value: hbarTinybars.toString(),
          })
          .addParam({ 
            type: "uint256",
            name: "bitcoinAmount",
            value: bitcoinAmountSats.toString(),
          })
          .addParam({
            type: "uint256",
            name: "networkId",
            value: finalNetworkId,
          })
          .addParam({
            type: "bytes",
            name: "networkAddress",
            value: finalNetworkAddress,
          })
          .addParam({
            type: "bytes",
            name: "userProgram",
            value: finalUserProgram,
          });

        const transactionBuilder = new ContractExecuteTransaction()
          .setContractId(IPOW_CONTRACT_ACCOUNT_ID_TESTNET)
          .setGas(IPOW_GAS_LIMIT)
          .setFunction(
            "commitNativeToBitcoin",
            functionParameters.buildHAPIParams(),
          )
          .setPayableAmount(feeHbarStr); 

        transactionBuilder.setTransactionId(
          TransactionId.generate(signer!.getAccountId()),
        );

        const tx = transactionBuilder.freezeWith(client);
        const response = await tx.executeWithSigner(signer!);
        const receipt = await response.getReceiptWithSigner(signer!);

        if (receipt.status.toString() === "SUCCESS") {
          const txId = response.transactionId.toString();
          console.log("HashPack Commit Native to Bitcoin Success ID:", txId);
          return txId;
        }
      }

      return null;
    } catch (err: any) {
      console.error("Hedera commitNativeToBitcoin error:", err);
      return null;
    }
  };

 const commitBitcoinToNative = async (
    btcSats: string | number,
    hbarAmount: number, 
    userProgram: string,
  ): Promise<string | null> => {
    try {
      const nativeAmountTinybars = hbarToTinybars(hbarAmount); 
      
      const feeTinybars = (nativeAmountTinybars * BigInt(50)) / BigInt(10000);
      
      const feeWei = tinybarsToWei(feeTinybars);
      const feeHbarStr = tinybarsToHbarString(feeTinybars);

      const emptyBytes = new Uint8Array([]);
      const scriptHex = userProgram.startsWith("0x") ? userProgram : `0x${userProgram}`;
      const finalUserProgramBytes = ethers.getBytes(scriptHex);


      if (walletType === "metamask") {
        const signer = await getValidatedSigner();

        const abi = [
          "function commitBitcoinToNative(uint256 bitcoinAmount, uint256 nativeAmount, uint256 networkId, bytes userProgram, address destAddress, bytes networkAddress, uint256 dutyWindowSeconds, bytes ipowReceiveProgram, uint256 lockedAnchorHeight) payable",
        ];

        const contract = new ethers.Contract(
          `0x${ContractId.fromString(IPOW_CONTRACT_ACCOUNT_ID_TESTNET).toSolidityAddress()}`,
          abi,
          signer,
        );

        const tx = await contract.commitBitcoinToNative(
          btcSats.toString(),              
          nativeAmountTinybars.toString(),  
          "0",                              
          ethers.hexlify(finalUserProgramBytes), 
          ethers.ZeroAddress,               
          ethers.hexlify(emptyBytes),       
          "0",     
          ethers.hexlify(emptyBytes),      
          "0",     
          {
            value: feeWei, 
            gasLimit: IPOW_GAS_LIMIT,
          },
        );

        return tx.hash;
      }
      if (walletType === "walletconnect") {
        const signer = getWalletConnectSigner();

        const functionParameters = new ContractFunctionParameterBuilder()
          .addParam({ type: "uint256", name: "bitcoinAmount", value: btcSats.toString() })
          .addParam({ type: "uint256", name: "nativeAmount", value: nativeAmountTinybars.toString() })
          .addParam({ type: "uint256", name: "networkId", value: "0" })
          .addParam({
            type: "bytes",
            name: "userProgram",
            value: finalUserProgramBytes,
          })
          .addParam({
            type: "address",
            name: "destAddress",
            value: ethers.ZeroAddress,
          })
          .addParam({
            type: "bytes",
            name: "networkAddress",
            value: emptyBytes,
          })
          .addParam({ type: "uint256", name: "dutyWindowSeconds", value: "0" })
          .addParam({
            type: "bytes",
            name: "ipowReceiveProgram",
            value: emptyBytes,
          })
          .addParam({ type: "uint256", name: "lockedAnchorHeight", value: "0" });


        const transactionBuilder = new ContractExecuteTransaction()
          .setContractId(IPOW_CONTRACT_ACCOUNT_ID_TESTNET)
          .setGas(IPOW_GAS_LIMIT)
          .setFunction(
            "commitBitcoinToNative",
            functionParameters.buildHAPIParams(),
          )
          .setPayableAmount(feeHbarStr); 

        transactionBuilder.setTransactionId(
          TransactionId.generate(signer!.getAccountId()),
        );

        const tx = transactionBuilder.freezeWith(client);
        const response = await tx.executeWithSigner(signer!);
        const receipt = await response.getReceiptWithSigner(signer!);

        if (receipt.status.toString() === "SUCCESS") {
          const txId = response.transactionId.toString();
          console.log("HashPack Commit Bitcoin to Native Success ID:", txId);
          return txId;
        }
      }

      return null;
    } catch (err) {
      console.error("commitBitcoinToNative error:", err);
      return null;
    }
  };

  const depositApprovedConversion = async (
    txId: bigint,
  ): Promise<string | null> => {
    try {
      const c = getReadOnlyContract();

      const conversionStruct = await c.conversions(txId);

      const amountTinybars = conversionStruct.nativeAmount;

      const functionParameters =
        new ContractFunctionParameterBuilder().addParam({
          type: "uint256",
          name: "txId",
          value: txId.toString(),
        });

      if (walletType === "metamask") {
        const signer = await getValidatedSigner();

        const amountWei = tinybarsToWei(amountTinybars);

        const abi = [
          `function depositApprovedConversion(${functionParameters.buildAbiFunctionParams()}) payable`,
        ];

        const contract = new ethers.Contract(
          `0x${ContractId.fromString(IPOW_CONTRACT_ACCOUNT_ID_TESTNET).toSolidityAddress()}`,
          abi,
          signer,
        );

        const txResult = await contract.depositApprovedConversion(
          ...functionParameters.buildEthersParams(),
          {
            gasLimit: IPOW_GAS_LIMIT,
            value: amountWei,
          },
        );
        return txResult.hash;
      }

      if (walletType === "walletconnect") {
        const signer = getWalletConnectSigner();

        const amountHbarStr = tinybarsToHbarString(amountTinybars);

        const transactionBuilder = new ContractExecuteTransaction()
          .setContractId(IPOW_CONTRACT_ACCOUNT_ID_TESTNET)
          .setGas(IPOW_GAS_LIMIT)
          .setFunction(
            "depositApprovedConversion",
            functionParameters.buildHAPIParams(),
          )
          .setPayableAmount(amountHbarStr); 

        transactionBuilder.setTransactionId(
          TransactionId.generate(signer!.getAccountId()),
        );

        const tx = transactionBuilder.freezeWith(client);

        const response = await tx.executeWithSigner(signer!);
        const receipt = await response.getReceiptWithSigner(signer!);

        if (receipt.status.toString() === "SUCCESS") {
          const txId = response.transactionId.toString();
          console.log("HashPack Deposit Approved Conversion:", txId);
          return txId;
        }
      }
      return null;
    } catch (error: any) {
      console.warn("Deposit Error:", error.message || error);
      return null;
    }
  };

  const submitBitcoinMerkleProofWithTx = async (
    txId: bigint,
    txRaw: any,
    voutIndex: bigint,
    blockHashLE: any,
    blockHeight: bigint,
    branch: any,
    index: bigint,
  ): Promise<string | null> => {
    const functionParameters = new ContractFunctionParameterBuilder()
      .addParam({ type: "uint256", name: "txId", value: txId.toString() })
      .addParam({ type: "bytes", name: "txRaw", value: txRaw })
      .addParam({
        type: "uint256",
        name: "voutIndex",
        value: voutIndex.toString(),
      })
      .addParam({ type: "bytes32", name: "blockHashLE", value: blockHashLE })
      .addParam({
        type: "uint256",
        name: "blockHeight",
        value: blockHeight.toString(),
      })
      .addParam({ type: "bytes32Array", name: "branchLE", value: branch })
      .addParam({ type: "uint256", name: "index", value: index.toString() });

    if (walletType === "metamask") {
      const signer = await getValidatedSigner();

      const abi = [
        "function submitBitcoinMerkleProofWithTx(uint256 txId, bytes txRaw, uint256 voutIndex, bytes32 blockHashLE, uint256 blockHeight, bytes32[] branchLE, uint256 index)",
      ];

      const contract = new ethers.Contract(
        `0x${ContractId.fromString(IPOW_CONTRACT_ACCOUNT_ID_TESTNET).toSolidityAddress()}`,
        abi,
        signer,
      );

      const hexTxRaw = ethers.hexlify(txRaw);
      const hexBlockHash = ethers.hexlify(blockHashLE);
      const hexBranch = branch.map((b: Uint8Array) => ethers.hexlify(b));
      const txResult = await contract.submitBitcoinMerkleProofWithTx(
        txId,
        hexTxRaw,
        voutIndex,
        hexBlockHash,
        blockHeight,
        hexBranch,
        index,
        {
          gasLimit: IPOW_GAS_LIMIT,
        },
      );

      console.log("Tx Submitted:", txResult.hash);
      return txResult.hash;
    }

    if (walletType == "walletconnect") {
      const signer = getWalletConnectSigner();
      const transactionBuilder = new ContractExecuteTransaction()
        .setContractId(IPOW_CONTRACT_ACCOUNT_ID_TESTNET)
        .setGas(IPOW_GAS_LIMIT)
        .setFunction(
          "submitBitcoinMerkleProofWithTx",
          functionParameters.buildHAPIParams(),
        );

      transactionBuilder.setTransactionId(
        TransactionId.generate(signer!.getAccountId()),
      );

      const tx = transactionBuilder.freezeWith(client);

      const response = await tx.executeWithSigner(signer!);
      const receipt = await response.getReceiptWithSigner(signer!);

      if (receipt.status.toString() === "SUCCESS") {
        const txId = response.transactionId.toString();
        console.log(
          "HashPack Submit Bitcoin Merkle Proof with Tx Success ID:",
          txId,
        );
        return txId;
      }
    }
    return null;
  };

  const getMyTxIds = async (
    phase: TxPhase = 0,
    typeFilter: TypeFilter = 0,
    bitcoinProgramFilter: string = "",
    isUserBitcoinProgramFilter: boolean = true,
  ): Promise<bigint[]> => {
    try {
      if (!address && !bitcoinProgramFilter) return [];

      const c = getReadOnlyContract();

      let evmAddress = ethers.ZeroAddress;

      if (address) {
        const isHederaAccountId = address.includes(".");
        if (isHederaAccountId) {
          evmAddress = await getEvmAddress(address);
        } else {
          evmAddress = address;
        }
      }

      if (bitcoinProgramFilter && bitcoinProgramFilter !== "") {
        evmAddress = ethers.ZeroAddress;
      }

      let programFilterBytes: string = "0x";
      if (bitcoinProgramFilter) {
        programFilterBytes = bitcoinProgramFilter.startsWith("0x")
          ? bitcoinProgramFilter
          : `0x${bitcoinProgramFilter}`;
      }

      const nextTxId: bigint = await c.nextTxId();
      if (nextTxId <= BigInt(1)) return [];

      const txIds: bigint[] = await c.getTxIdsByFilter(
        typeFilter,
        phase ?? TxPhase.NONE,
        evmAddress,
        programFilterBytes,
        isUserBitcoinProgramFilter,
        0,
        false,
        BigInt(1),
        nextTxId - BigInt(1),
        200,
      );

      return txIds;
    } catch (e) {
      console.error("getMyTxIds error:", e);
      return [];
    }
  };

  const getConversion = async (txId: bigint): Promise<any> => {
    try {
      const c = getReadOnlyContract();

      const result = await c.getConversionWithPhase(txId);

      const raw = result[0]; 
      const phase = Number(result[1]); 

      if (!raw || raw.user === "0x0000000000000000000000000000000000000000") {
        return null;
      }

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

  const refundIfNotApproved = async (txId: bigint): Promise<string | null> => {
    const functionParameters = new ContractFunctionParameterBuilder().addParam({
      type: "uint256",
      name: "txId",
      value: txId.toString(),
    });

    if (walletType === "metamask") {
      const signer = await getValidatedSigner();

      const abi = [
        `function ${"refundIfNotApproved"}(${functionParameters.buildAbiFunctionParams()})`,
      ];

      const contract = new ethers.Contract(
        `0x${ContractId.fromString(IPOW_CONTRACT_ACCOUNT_ID_TESTNET).toSolidityAddress()}`,
        abi,
        signer,
      );
      try {
        const txResult = await contract["refundIfNotApproved"](
          ...functionParameters.buildEthersParams(),
          {
            gasLimit: IPOW_GAS_LIMIT,
          },
        );
        return txResult.hash;
      } catch (error: any) {
        console.warn(error.message ? error.message : error);
        return null;
      }
    }

    if (walletType == "walletconnect") {
      const signer = getWalletConnectSigner();
      const transactionBuilder = new ContractExecuteTransaction()
        .setContractId(IPOW_CONTRACT_ACCOUNT_ID_TESTNET)
        .setGas(IPOW_GAS_LIMIT)
        .setFunction(
          "refundIfNotApproved",
          functionParameters.buildHAPIParams(),
        );

      transactionBuilder.setTransactionId(
        TransactionId.generate(signer!.getAccountId()),
      );

      const tx = transactionBuilder.freezeWith(client);

      const response = await tx.executeWithSigner(signer!);
      const receipt = await response.getReceiptWithSigner(signer!);

      if (receipt.status.toString() === "SUCCESS") {
        const txId = response.transactionId.toString();
        console.log("HashPack Refund if Not Approved Success ID:", txId);
        return txId;
      }
    }
    return null;
  };

  const claimNativeAfterOperatorExpired = async (
    txId: bigint,
  ): Promise<string | null> => {
    const functionParameters = new ContractFunctionParameterBuilder().addParam({
      type: "uint256",
      name: "txId",
      value: txId.toString(),
    });
    if (walletType === "metamask") {
      const signer = await getValidatedSigner();
      const abi = [
        `function ${"claimNative_AfterOperatorExpired"}(${functionParameters.buildAbiFunctionParams()})`,
      ];

      const contract = new ethers.Contract(
        `0x${ContractId.fromString(IPOW_CONTRACT_ACCOUNT_ID_TESTNET).toSolidityAddress()}`,
        abi,
        signer,
      );
      try {
        const txResult = await contract["claimNative_AfterOperatorExpired"](
          ...functionParameters.buildEthersParams(),
          {
            gasLimit: IPOW_GAS_LIMIT,
          },
        );
        return txResult.hash;
      } catch (error: any) {
        console.warn(error.message ? error.message : error);
        return null;
      }
    }

    if (walletType == "walletconnect") {
      const signer = getWalletConnectSigner();
      const transactionBuilder = new ContractExecuteTransaction()
        .setContractId(IPOW_CONTRACT_ACCOUNT_ID_TESTNET)
        .setGas(IPOW_GAS_LIMIT)
        .setFunction(
          "claimNative_AfterOperatorExpired",
          functionParameters.buildHAPIParams(),
        );

       transactionBuilder.setTransactionId(
          TransactionId.generate(signer!.getAccountId()),
        );


      const tx = transactionBuilder.freezeWith(client);

      const response = await tx.executeWithSigner(signer!);
      const receipt = await response.getReceiptWithSigner(signer!);

      if (receipt.status.toString() === "SUCCESS") {
        const txId = response.transactionId.toString();
        console.log(
          "HashPack Claim Native After Operator Expired Success ID:",
          txId,
        );
        return txId;
      }
    }
    return null;
  };

  const refundAfterNoProofNativeToBitcoin = async (
    txId: bigint,
  ): Promise<string | null> => {
    const functionParameters = new ContractFunctionParameterBuilder().addParam({
      type: "uint256",
      name: "txId",
      value: txId.toString(),
    });

    if (walletType === "metamask") {
      const signer = await getValidatedSigner();
      const abi = [
        `function ${"refundAfterNoProof_NativeToBitcoin"}(${functionParameters.buildAbiFunctionParams()})`,
      ];

      const contract = new ethers.Contract(
        `0x${ContractId.fromString(IPOW_CONTRACT_ACCOUNT_ID_TESTNET).toSolidityAddress()}`,
        abi,
        signer,
      );
      try {
        const txResult = await contract["refundAfterNoProof_NativeToBitcoin"](
          ...functionParameters.buildEthersParams(),
          {
            gasLimit: IPOW_GAS_LIMIT,
          },
        );
        return txResult.hash;
      } catch (error: any) {
        console.warn(error.message ? error.message : error);
        return null;
      }
    }

    if (walletType == "walletconnect") {
      const signer = getWalletConnectSigner();
      const transactionBuilder = new ContractExecuteTransaction()
        .setContractId(IPOW_CONTRACT_ACCOUNT_ID_TESTNET)
        .setGas(IPOW_GAS_LIMIT)
        .setFunction(
          "refundAfterNoProof_NativeToBitcoin",
          functionParameters.buildHAPIParams(),
        );

       transactionBuilder.setTransactionId(
          TransactionId.generate(signer!.getAccountId()),
        );

      const tx = transactionBuilder.freezeWith(client);

      const response = await tx.executeWithSigner(signer!);
      const receipt = await response.getReceiptWithSigner(signer!);

      if (receipt.status.toString() === "SUCCESS") {
        const txId = response.transactionId.toString();
        console.log(
          "HashPack Refund After No Proof Native to Bitcoin Success ID:",
          txId,
        );
        return txId;
      }
    }
    return null;
  };

  const getHederaNodes = async () => {
    try {
      let allNodes: any[] = [];
      let nextUrl = `${currentNetworkConfig.mirrorNodeUrl}/api/v1/network/nodes?limit=100`;

      while (nextUrl) {
        const response = await fetch(nextUrl);
        const data = await response.json();
        allNodes = [...allNodes, ...data.nodes];

        nextUrl = data.links?.next
          ? `${currentNetworkConfig.mirrorNodeUrl}${data.links.next}`
          : "";
      }

      return allNodes.map((node) => {
        const tinybarsInHbar = 100_000_000;

        const rawApy = ((node.reward_rate_start * 365) / tinybarsInHbar) * 100;

        const isOverStaked = node.stake_rewarded > node.max_stake;
        const saturationRatio = isOverStaked
          ? node.max_stake / node.stake_rewarded
          : 1;
        const saturationPercentage =
          (node.stake_rewarded / node.max_stake) * 100;

        const effectiveApy = rawApy * saturationRatio;

        const [operatorRaw, locationRaw] = node.description.split("|");
        const cleanName =
          operatorRaw?.replace("Hosted by ", "").trim() || "Unknown";
        const cleanLocation = locationRaw?.trim() || "Global";

        return {
          id: node.node_id,
          accountId: node.node_account_id,
          name: cleanName,
          location: cleanLocation,
          totalStake: node.stake / tinybarsInHbar,
          rewardedStake: node.stake_rewarded / tinybarsInHbar,
          nonRewardedStake: node.stake_not_rewarded / tinybarsInHbar,
          maxStake: node.max_stake / tinybarsInHbar,
          apy: effectiveApy.toFixed(2),
          saturation: saturationPercentage.toFixed(1),
          isFull: isOverStaked,
          declineReward: node.decline_reward,
          endpoints: node.service_endpoints || [],
        };
      });
    } catch (error) {
      console.error("Failed to fetch Hedera nodes:", error);
      return [];
    }
  };

  const getCurrentStake = async (): Promise<any | null> => {
    if (!address) return null;
    try {
      const response = await fetch(
        `${currentNetworkConfig.mirrorNodeUrl}/api/v1/accounts/${address}`,
      );
      const data = await response.json();

      return {
        stakedNodeId: data.staked_node_id,
        stakePeriodStart: data.stake_period_start,
        pendingReward: data.pending_reward,
      };
    } catch (err) {
      console.error("Error fetching stake info:", err);
      return null;
    }
  };

  const stakeToNode = async (nodeId: number): Promise<string | null> => {
    if (!address || walletType !== "walletconnect") return null;

    try {
      const signer = getWalletConnectSigner();
      if (!signer) throw new Error("No HashPack signer found");

      const userAccountId = signer.getAccountId();

      const transactionBuilder = new AccountUpdateTransaction()
        .setAccountId(userAccountId)
        .setStakedNodeId(nodeId)
        .setDeclineStakingReward(nodeId === -1);

      transactionBuilder.setTransactionId(
        TransactionId.generate(userAccountId),
      );

      const tx = transactionBuilder.freezeWith(client);

      const response = await tx.executeWithSigner(signer);
      const receipt = await response.getReceiptWithSigner(signer);

      if (receipt.status.toString() === "SUCCESS") {
        console.log(
          "HashPack Staking Success ID:",
          response.transactionId.toString(),
        );
        return response.transactionId.toString();
      }
    } catch (error: any) {
      console.error("Staking failed:", error.message);
    }
    return null;
  };

  const unstake = async (): Promise<string | null> => {
    return stakeToNode(-1);
  };

  const claimRewards = async (): Promise<string | null> => {
    if (!address || walletType != "walletconnect") return null;

    try {
      if (walletType === "walletconnect") {
        const signer = getWalletConnectSigner();

        if (!signer) throw new Error("No HashPack signer found");

        const transactionBuilder = new TransferTransaction()
          .addHbarTransfer(signer.getAccountId(), 0)
          .addHbarTransfer(signer.getAccountId(), 0);

        transactionBuilder.setTransactionId(
          TransactionId.generate(signer.getAccountId()),
        );

        const tx = transactionBuilder.freezeWith(client);

        const response = await tx.executeWithSigner(signer);
        const receipt = await response.getReceiptWithSigner(signer);

        if (receipt.status.toString() === "SUCCESS") {
          const txId = response.transactionId.toString();
          console.log("HashPack Reward Claim Success ID:", txId);
          return txId;
        }
      }
    } catch (error: any) {
      console.error("Reward claim failed:", error.message || error);
    }
    return null;
  };

  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  // const getBonzoData = async () => {
  //   if (!readOnlyProvider) return null;

  //   try {
  //     let fluctuation1h = 0;
  //     try {
  //       const cgResponse = await fetch(
  //         "https://api.coingecko.com/api/v3/coins/hedera-hashgraph/market_chart?vs_currency=usd&days=1",
  //       );
  //       const cgData = await cgResponse.json();

  //       if (cgData.prices && cgData.prices.length >= 13) {
  //         const prices = cgData.prices;
  //         const nowPrice = prices[prices.length - 1][1];
  //         const hourAgoPrice = prices[prices.length - 13][1]; // 12 intervals * 5 mins = 60 mins ago
  //         fluctuation1h = ((nowPrice - hourAgoPrice) / hourAgoPrice) * 100;
  //       }
  //     } catch (e) {
  //       console.warn("Fluctuation fetch failed, continuing with 0%.");
  //     }

  //     // 2. HIT THE STAGING API
  //     const API_URL = isMainnet
  //       ? "https://mainnet-data-staging.bonzo.finance/market"
  //       : "https://testnet-data-new.bonzo.finance/market";
  //     const apiResponse = await fetch(API_URL);
  //     const apiData = await apiResponse.json();

  //     // 3. LENDING POOL CONSTANTS (For On-Chain Verification)
  //     const LENDING_POOL_ADDRESS = (
  //       isMainnet
  //         ? "0x236897c518996163E7b313aD21D1C9fCC7BA1afc"
  //         : "0xf67DBe9bD1B331cA379c44b5562EAa1CE831EbC2"
  //     ).toLowerCase();

  //     const LENDING_POOL_ABI = [
  //       "function getUserAccountData(address user) external view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
  //     ];

  //     const contract = new ethers.Contract(
  //       LENDING_POOL_ADDRESS,
  //       LENDING_POOL_ABI,
  //       readOnlyProvider,
  //     );

  //     // --- PART A: MAP THE JSON DATA CORRECTLY ---
  //     const lendingMarket: any = {};
  //     const vaultMarket: any = {};

  //     if (apiData && apiData.reserves) {
  //       apiData.reserves.forEach((item: any) => {
  //         const sym =
  //           item.symbol === "WHBAR" ? "hbar" : item.symbol.toLowerCase();

  //         lendingMarket[sym] = {
  //           supplyApy: (item.supply_apy || 0).toFixed(2) + "%",
  //           borrowApy: (item.variable_borrow_apy || 0).toFixed(2) + "%",
  //           address: item.evm_address,
  //         };

  //         vaultMarket[sym] = {
  //           vaultApy: ((item.supply_apy || 0) * 1.4).toFixed(2) + "%",
  //           tvl: item.available_liquidity?.usd_display || "0",
  //         };
  //       });
  //     }

  //     // --- PART B: PERSONAL DATA ---
  //     let personalData = null;
  //     if (resolvedAddress && ethers.isAddress(resolvedAddress)) {
  //       try {
  //         const data = await contract.getUserAccountData(resolvedAddress);
  //         const hf = Number(data.healthFactor) / 1e18;

  //         personalData = {
  //           healthFactor: hf,
  //           healthFactorFormatted: hf > 1e10 ? "∞" : hf.toFixed(4),
  //           totalCollateralUSD: parseFloat(
  //             ethers.formatUnits(data.totalCollateralETH, 18),
  //           ).toFixed(2),
  //           totalDebtUSD: parseFloat(
  //             ethers.formatUnits(data.totalDebtETH, 18),
  //           ).toFixed(2),
  //           ltv: (Number(data.ltv) / 100).toFixed(2) + "%",
  //         };
  //       } catch (err) {
  //         console.warn("No active user position found on-chain.");
  //       }
  //     }

  //     // --- PART C: AI KEEPER LOGIC (VOLATILITY AWARE) ---
  //     const hbarYield =
  //       apiData.reserves.find((r: any) => r.symbol === "WHBAR")?.supply_apy ||
  //       0;

  //     // NEW LOGIC: We only recommend VAULT_OPTIMAL if yield is > 1% AND volatility is < 2%
  //     const isVolatile = Math.abs(fluctuation1h) > 2.0;

  //     let recommendation = "VAULT_OPTIMAL";
  //     if (isVolatile || hbarYield <= 1.0) {
  //       recommendation = "STABLE";
  //     }

  //     return {
  //       type: personalData ? "PERSONAL" : "GLOBAL",
  //       lending: lendingMarket,
  //       vaults: vaultMarket,
  //       personal: personalData,
  //       recommendation,
  //       fluctuation: fluctuation1h.toFixed(2) + "%",
  //       isVolatile,
  //       source: isMainnet
  //         ? "BONZO-STAGING + COINGECKO"
  //         : "BONZO-TESTNET + COINGECKO",
  //     };
  //   } catch (error: any) {
  //     console.error("Bonzo Intelligence Error:", error.message);
  //     return null;
  //   }
  // };

  //  Component State
  const [bonzoIntelligenceData, setBonzoIntelligenceData] = useState<any>(null);

  const depositToLending = async (
    assetAddress: string,
    amountHBAR: number,
  ): Promise<string | null> => {
    try {
      const amountTinybars = hbarToTinybars(amountHBAR);


      const LENDING_POOL_ID = isMainnet ? "0.0.6521313" : "0.0.1517506";


      if (walletType === "metamask") {
        const signer = await getValidatedSigner();
        const abi = [
          "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
        ];

        const contract = new ethers.Contract(
          `0x${ContractId.fromString(LENDING_POOL_ID).toSolidityAddress()}`,
          abi,
          signer,
        );

        const tx = await contract.deposit(
          assetAddress,
          amountTinybars.toString(),
          resolvedAddress,
          0, // referralCode
          { gasLimit: 800000 },
        );
        return tx.hash;
      }

      if (walletType === "walletconnect") {
        const signer = getWalletConnectSigner();
        if (!signer) return null;

        const functionParameters = new ContractFunctionParameterBuilder()
          .addParam({ type: "address", name: "asset", value: assetAddress })
          .addParam({
            type: "uint256",
            name: "amount",
            value: amountTinybars.toString(),
          })
          .addParam({
            type: "address",
            name: "onBehalfOf",
            value: resolvedAddress!,
          })
          .addParam({ type: "uint16", name: "referralCode", value: "0" });

        const transactionBuilder = new ContractExecuteTransaction()
          .setContractId(LENDING_POOL_ID)
          .setGas(800000)
          .setFunction("deposit", functionParameters.buildHAPIParams());

        transactionBuilder.setTransactionId(
          TransactionId.generate(signer.getAccountId()),
        );

        const tx = transactionBuilder.freezeWith(client);
        const response = await tx.executeWithSigner(signer);
        const receipt = await response.getReceiptWithSigner(signer);

        return receipt.status.toString() === "SUCCESS"
          ? response.transactionId.toString()
          : null;
      }

      return null;
    } catch (err: any) {
      console.error("Bonzo Lending Deposit Error:", err.message || err);
      return null;
    }
  };

  const withdrawFromLending = async (
    assetAddress: string, // The underlying token address (e.g., WHBAR)
    amountHBAR: number,
    isFullWithdraw: boolean = false,
  ): Promise<string | null> => {
    try {
      const amountTinybars = hbarToTinybars(amountHBAR);
      const finalAmount = isFullWithdraw ? ethers.MaxUint256 : amountTinybars;


      const LENDING_POOL_ID = isMainnet ? "0.0.6521313" : "0.0.1517506";

      if (walletType === "metamask") {
        const signer = await getValidatedSigner();

        const abi = [
          "function withdraw(address asset, uint256 amount, address to) returns (uint256)",
        ];

        const contract = new ethers.Contract(
          `0x${ContractId.fromString(LENDING_POOL_ID).toSolidityAddress()}`,
          abi,
          signer,
        );

        const tx = await contract.withdraw(
          assetAddress,
          finalAmount,
          resolvedAddress,
          { gasLimit: 900000 },
        );
        return tx.hash;
      }
      if (walletType === "walletconnect") {
        const signer = getWalletConnectSigner();
        if (!signer) return null;

        const functionParameters = new ContractFunctionParameterBuilder()
          .addParam({ type: "address", name: "asset", value: assetAddress })
          .addParam({
            type: "uint256",
            name: "amount",
            value: finalAmount.toString(),
          })
          .addParam({ type: "address", name: "to", value: resolvedAddress! });

        const transactionBuilder = new ContractExecuteTransaction()
          .setContractId(LENDING_POOL_ID)
          .setGas(900000)
          .setFunction("withdraw", functionParameters.buildHAPIParams());

        transactionBuilder.setTransactionId(
          TransactionId.generate(signer.getAccountId()),
        );

        const tx = transactionBuilder.freezeWith(client);
        const response = await tx.executeWithSigner(signer);
        const receipt = await response.getReceiptWithSigner(signer);

        return receipt.status.toString() === "SUCCESS"
          ? response.transactionId.toString()
          : null;
      }

      return null;
    } catch (err: any) {
      console.error("Bonzo Lending Withdrawal Error:", err.message || err);
      return null;
    }
  };


  const depositToVault = async (
    vaultAddress: string,
    amountHBAR: number,
  ): Promise<string | null> => {
    try {
      const amountTinybars = hbarToTinybars(amountHBAR);

      if (walletType === "metamask") {
        const signer = await getValidatedSigner();

        const abi = [
          "function deposit(uint256 assets, address receiver) returns (uint256)",
        ];

        const contract = new ethers.Contract(vaultAddress, abi, signer);

        const tx = await contract.deposit(
          amountTinybars.toString(),
          resolvedAddress,
          { gasLimit: 1000000 }, 
        );
        return tx.hash;
      }

      if (walletType === "walletconnect") {
        const signer = getWalletConnectSigner();
        if (!signer) return null;

        const functionParameters = new ContractFunctionParameterBuilder()
          .addParam({
            type: "uint256",
            name: "assets",
            value: amountTinybars.toString(),
          })
          .addParam({
            type: "address",
            name: "receiver",
            value: resolvedAddress!,
          });

        const transactionBuilder = new ContractExecuteTransaction()
          .setContractId(
            ContractId.fromSolidityAddress(vaultAddress).toString(),
          )
          .setGas(1000000)
          .setFunction("deposit", functionParameters.buildHAPIParams());

        transactionBuilder.setTransactionId(
          TransactionId.generate(signer.getAccountId()),
        );

        const tx = transactionBuilder.freezeWith(client);
        const response = await tx.executeWithSigner(signer);
        const receipt = await response.getReceiptWithSigner(signer);

        return receipt.status.toString() === "SUCCESS"
          ? response.transactionId.toString()
          : null;
      }

      return null;
    } catch (err: any) {
      console.error("Bonzo Vault Deposit Error:", err.message || err);
      return null;
    }
  };



  const withdrawFromVault = async (
    vaultAddress: string,
    amountHBAR: number,
    isFullWithdraw: boolean = false,
  ): Promise<string | null> => {
    try {
  
      const amountTinybars = hbarToTinybars(amountHBAR);
      const finalAmount = isFullWithdraw ? ethers.MaxUint256 : amountTinybars;


      if (walletType === "metamask") {
        const signer = await getValidatedSigner();

        const abi = [
          "function withdraw(uint256 assets, address receiver, address owner) returns (uint256)",
        ];

        const contract = new ethers.Contract(vaultAddress, abi, signer);

        const tx = await contract.withdraw(
          finalAmount,
          resolvedAddress, 
          resolvedAddress, 
          { gasLimit: 1000000 },
        );
        return tx.hash;
      }


      if (walletType === "walletconnect") {
        const signer = getWalletConnectSigner();
        if (!signer) return null;

        const functionParameters = new ContractFunctionParameterBuilder()
          .addParam({
            type: "uint256",
            name: "assets",
            value: finalAmount.toString(),
          })
          .addParam({
            type: "address",
            name: "receiver",
            value: resolvedAddress!,
          })
          .addParam({
            type: "address",
            name: "owner",
            value: resolvedAddress!,
          });

        const transactionBuilder = new ContractExecuteTransaction()
          .setContractId(
            ContractId.fromSolidityAddress(vaultAddress).toString(),
          )
          .setGas(1000000)
          .setFunction("withdraw", functionParameters.buildHAPIParams());

        transactionBuilder.setTransactionId(
          TransactionId.generate(signer.getAccountId()),
        );

        const tx = transactionBuilder.freezeWith(client);
        const response = await tx.executeWithSigner(signer);
        const receipt = await response.getReceiptWithSigner(signer);

        return receipt.status.toString() === "SUCCESS"
          ? response.transactionId.toString()
          : null;
      }

      return null;
    } catch (err: any) {
      console.error("Bonzo Vault Withdrawal Error:", err.message || err);
      return null;
    }
  };

  const repayDebt = async (
    assetAddress: string, 
    amount: number, 
    isFullRepayment: boolean = false,
  ): Promise<string | null> => {
    try {
      const isUSDC = assetAddress
        .toLowerCase()
        .includes("0000000000000000000000000000000000001549");
      const decimals = isUSDC ? 6 : 8;
      const amountRaw = Math.round(amount * Math.pow(10, decimals));


      const finalAmount = isFullRepayment
        ? ethers.MaxUint256
        : BigInt(amountRaw);

      const LENDING_POOL_ID = isMainnet ? "0.0.6521313" : "0.0.1517506";

      if (walletType === "metamask") {
        const signer = await getValidatedSigner();
        const abi = [
          "function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) returns (uint256)",
        ];

        const contract = new ethers.Contract(
          `0x${ContractId.fromString(LENDING_POOL_ID).toSolidityAddress()}`,
          abi,
          signer,
        );

        const tx = await contract.repay(
          assetAddress,
          finalAmount,
          2,
          resolvedAddress,
          { gasLimit: 800000 },
        );
        return tx.hash;
      }

      if (walletType === "walletconnect") {
        const signer = getWalletConnectSigner();
        if (!signer) return null;

        const functionParameters = new ContractFunctionParameterBuilder()
          .addParam({ type: "address", name: "asset", value: assetAddress })
          .addParam({
            type: "uint256",
            name: "amount",
            value: finalAmount.toString(),
          })
          .addParam({ type: "uint256", name: "rateMode", value: "2" })
          .addParam({
            type: "address",
            name: "onBehalfOf",
            value: resolvedAddress!,
          });

        const transactionBuilder = new ContractExecuteTransaction()
          .setContractId(LENDING_POOL_ID)
          .setGas(800000)
          .setFunction("repay", functionParameters.buildHAPIParams());

        transactionBuilder.setTransactionId(
          TransactionId.generate(signer.getAccountId()),
        );

        const tx = transactionBuilder.freezeWith(client);
        const response = await tx.executeWithSigner(signer);
        const receipt = await response.getReceiptWithSigner(signer);

        return receipt.status.toString() === "SUCCESS"
          ? response.transactionId.toString()
          : null;
      }

      return null;
    } catch (err: any) {
      console.error("Bonzo Repayment Error:", err.message || err);
      return null;
    }
  };

  // useEffect(() => {
  //   const refreshIntelligence = async () => {
  //     const data = await getBonzoData();
  //     if (data) {
  //       setBonzoIntelligenceData(data);
  //       console.log(`Bonzo Data Synced (${data.type})`);
  //     }
  //   };

  //   refreshIntelligence();
  //   const interval = setInterval(refreshIntelligence, 30000);
  //   return () => clearInterval(interval);
  // }, [address, resolvedAddress, isMainnet]);

  useEffect(() => {
    const fetchDapps = async () => {
      try {
        const addressQuery = address ? `&walletAddress=${address}` : "";
        const response = await fetch(
          `/api/dapphub/list?network=HEDERA${addressQuery}`,
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
          `/api/transaction/constraints/?network=HEDERA&env=${envMode}`,
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
        console.error("Failed to fetch HEDERA self-custody limits:", error);
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
    if (selectedChain !== "hedera" && selectedChain !== "bitcoin") return;
    if (!(walletType === "metamask" && provider)) return;

    let eth: any;
    let cancelled = false;
    const targetChainIdHex = currentNetworkConfig.chainId.toLowerCase();

    const handleChainChanged = (chainIdHex: string) => {
      if (chainIdHex.toLowerCase() !== targetChainIdHex) {
        switchNetwork(provider);
      } else {
        setProvider(new ethers.BrowserProvider(eth, "any"));
      }
    };

    (async () => {
      const found = await getEvmWalletProvider("metamask");
      if (cancelled || !found) return;
      eth = found;

      try {
        const currentChainIdHex = await eth.request({ method: "eth_chainId" });
        if (currentChainIdHex.toLowerCase() !== targetChainIdHex) {
          console.log("Wrong network detected. Switching...");
          await switchNetwork(provider);
        }
      } catch (error) {
        console.error("Failed to check MetaMask network:", error);
      }

      eth.on("chainChanged", handleChainChanged);
    })();

    return () => {
      cancelled = true;
      eth?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [walletType, provider, selectedChain, currentNetworkConfig]);

  useEffect(() => {
    detectWallets();
    const netKey = isMainnet ? "mainnet" : "testnet";
    const isPrev = localStorage.getItem(`hederaConnected_${netKey}`) === "true";
    const savedWallet = localStorage.getItem(
      `hederaWalletType_${netKey}`,
    ) as HederaWalletType | null;

    if (isPrev && savedWallet) {
      connect(savedWallet, true).catch(() => {});
    } else {
      setConnected(false);
      setAddress(null);
      setWalletType(null);
      setProvider(null);
      setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, tokens: [] });
    }
  }, [isMainnet, selectedChain]);

  useEffect(() => {
    if (walletType !== "metamask") return;

    let eth: any;
    let cancelled = false;

    const handleAccountChanged = async (accounts: string[]) => {
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        fetchBalance();
      } else {
        disconnect(false);
      }
    };

    (async () => {
      const found = await getEvmWalletProvider("metamask");
      if (cancelled || !found) return;
      eth = found;
      eth.on?.("accountsChanged", handleAccountChanged);
    })();

    return () => {
      cancelled = true;
      eth?.removeListener?.("accountsChanged", handleAccountChanged);
    };
  }, [walletType, provider]);

  useEffect(() => {
    fetchPrice();
    const i = setInterval(() => {
      fetchPrice();
    }, 60000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMainnet]);

     useEffect(() => {
    if (!address) {
      return;
    }
    
    const controller = new AbortController();
    const signal = controller.signal;

    fetchBalance(signal);
    estimateFee();

    const interval = setInterval(() => {
      fetchBalance(signal);
      estimateFee();
    }, 15000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };

 }, [address, walletType, currentNetworkConfig.jsonRpcUrl, currentNetworkConfig.mirrorNodeUrl]);

  useEffect(() => {
    const normalize = async () => {
      if (!address) {
        setResolvedAddress(null);
        return;
      }

      if (address.startsWith("0x")) {
        setResolvedAddress(address.toLowerCase());
        return;
      }
      try {
        const evm = await getEvmAddress(address);
        setResolvedAddress(evm.toLowerCase());
      } catch (e) {
        console.error("Resolution failed", e);
        setResolvedAddress(convertHederaAccountIdToEVM(address).toLowerCase());
      }
    };

    normalize();
  }, [address]);

  return (
    <HederaWalletContext.Provider
      value={{
        connected,
        isConnecting,
        address,
        resolvedAddress,
        walletType,
        availableWallets,
        balance: {
          ...balance,
          sendable: balance.confirmed - estimatedFee[estimatedFee.selectedFee],
        },
        price,
        networkExplorer: {
          address: `${currentNetworkConfig.networkExplorer}/account/`,
          transaction: `${currentNetworkConfig.networkExplorer}/transaction/`,
        },
        estimatedFee,
        currencyTicker: "HBAR",
        decimals: 8,
        ipowDecimals: 8,
        networkName: "Hedera",
        networkDescription: {
          en: `Hedera is a public network built for real-world apps. With low fees, fast finality, and hashgraph efficiency, Hedera is great network for you who want to access services related to payments, tokenized assets, and enterprise-grade dApps.`,
          id: `Hedera adalah jaringan publik untuk aplikasi dunia nyata. Dengan biaya rendah, finalitas cepat, dan efisiensi hashgraph, Hedera adalah jaringan yang cocok untuk kamu yang mau akses servis terkait pembayaran, aset ter-tokenisasi, dan dApp tingkat enterprise.`,
        },
        networkLogo: hederanetwork,

        selfCustodyParameter,
        ipowConvert: "testnet",
        ipowNetworkId: IPOW_NETWORK_ID,
        dappList,
        toggleFavoriteDapp,
        connect,
        disconnect,
        switchWallet,
        sendTokenTo,
        checkAddress,
        isValidAddress,
        setFeeSelection,
        fetchETA,
        getEvmAddress,
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
        getHederaNodes,
        stakeToNode,
        unstake,
        claimRewards,
        getCurrentStake,
        bonzoIntelligenceData,
        depositToLending,
        depositToVault,
        repayDebt,
        withdrawFromVault,
        withdrawFromLending,
      }}
    >
      {children}
    </HederaWalletContext.Provider>
  );
}


