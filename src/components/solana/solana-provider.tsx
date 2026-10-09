"use client";

import {
  getWallets,
  Wallet,
  WalletAccount,
  WalletWithFeatures,
} from "@wallet-standard/core";
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
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { solananetwork } from "@/index";
import { nativeUsdPrice } from "@/components/integrator/ipow/coinPrices";

import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";



import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { appKit } from "../walletconnect/wallet-connect-provider";
import { ConnectFeature, EventsFeature, SignMessageFeature, SolanaWalletContextType, SolanaWalletType } from "./config/type";
import { CONNECT, EVENTS, safeSolanaTokenAmount, SIGN_MESSAGE } from "./config/helpers";
import { appConfig } from "./config";
import { IPOW_NETWORK_ID, SOL_DATA, SOLANA_NATIVE_MINT, TOKEN_PROGRAM_ID, USDC_DATA } from "./config/constants";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";
import type { SolanaWallet } from "@ipow/sdk";
import { solanaConvertMethods } from "../integrator/ipow/solanaConvertMethods";
import { NO_CONVERT } from "../integrator/ipow/convertMethods";


// The RPC calls for this provider go through the /api/rpc proxy (see fullRpcUrl below),
// which only carries plain HTTP JSON-RPC — a Next.js route.ts can't proxy a websocket
// upgrade. accountSubscribe/programSubscribe therefore have nothing to connect to and
// web3.js's Connection retries them forever, logging on every retry. Balances are
// refreshed via the poll interval instead. The subscription setup itself is left
// completely intact — flip this back to true only if these ever point at a real
// websocket-capable RPC endpoint directly (not through this HTTP-only proxy).
const SOLANA_WS_SUBSCRIPTIONS_SUPPORTED = false;

const SolanaWalletContext = createContext<SolanaWalletContextType>({
  connected: false,
  isConnecting: false,
  address: null,
  walletName: null,
  walletType: null,
  availableWallets: [],
  currencyTicker: "SOL",
  decimals: 9,
  ipowDecimals: 9,
  networkName: "Solana",
  networkDescription: {},
  networkLogo: solananetwork,
  price: {},
  networkExplorer: {},
  ipowConvert: "comingsoon", 
  ipowNetworkId: 3,
  verifiedTokensData: [],

  checkAtaRequired: async () => false,

  connect: async () => {},
  disconnect: () => {},
  signMessage: async () => null,
  getAnchorWallet: () => null,
  switchWallet: async () => {},
  sendTokenTo: async () => null,
  checkAddress: () => ({ valid: false, reason: "invalid" }),
  isValidAddress: () => false,
  

    
  setFeeSelection: () => {},
  fetchETA: async () => null,
  

  ...NO_CONVERT,

  balance: { confirmed: 0, unconfirmed: 0, sendable: 0, stakeable: 0, swapable: 0, fetched: false, tokens: [] },
  estimatedFee: {
    low: 0,
    medium: 0,
    high: 0,
    selectedFee: "medium",
    fetched: false,
  },
});

export function useSolanaWallet() {
  return useContext(SolanaWalletContext);
}


export function SolanaProvider({ children }: { children: ReactNode }) {

    
  const { isConnected: akConnected, allAccounts } = useAppKitAccount();
  const { walletProvider: akProvider } = useAppKitProvider("solana");

  // Greatwall runs Solana's devnet only.
  const currentNetworkConfig = appConfig.networks.devnet;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullRpcUrl = `${origin}${currentNetworkConfig.jsonRpcUrl}`;


  const [verifiedTokensData] = useState<any[]>([
    SOL_DATA,
    USDC_DATA,
  ]);

  const verifiedTokensRef = useRef<any[]>([]);


  useEffect(() => {
    verifiedTokensRef.current = verifiedTokensData;
  }, [verifiedTokensData]);


  const [price, setPrice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<SolanaWalletType | null>(null); 
  const [availableWallets, setAvailableWallets] = useState<Wallet[]>([]);
  const [currentWallet, setCurrentWallet] =
    useState<WalletWithFeatures<any> | null>(null);
  const [currentAccount, setCurrentAccount] = useState<WalletAccount | null>(
    null,
  );


const [balance, setBalance] = useState<{
  confirmed: number;
  unconfirmed: number;
  fetched: boolean;
  rent: number;
  tokens: any[]; 
}>({ 
  confirmed: 0, 
  unconfirmed: 0, 
  fetched: false, 
  rent: 0, 
  tokens: [] 
});

  const [requiresAta, setRequiresAta] = useState(false);

  

const checkAtaRequired = async (
    destinationAddress: string, 
    mintAddress: string | null | undefined
  ): Promise<boolean> => {
    if (
      !mintAddress || 
      mintAddress.trim() === "" || 
      mintAddress === SOLANA_NATIVE_MINT || 
      !destinationAddress
    ) {
      setRequiresAta(false);
      return false;
    }

    try {
      // "confirmed" rather than the default "finalized" commitment — finalized can take
      // 13+ seconds to reflect a just-created account, which is longer than the delay used
      // when re-checking this right after a stake transaction (see SolanaStake.tsx's
      // post-transaction re-check), causing a freshly-created ATA to still read as
      // "not found" and needlessly reserve rent for an account that already exists.
      const conn = new Connection(fullRpcUrl, "confirmed");
      const destPubkey = new PublicKey(destinationAddress);
      const mintPubkey = new PublicKey(mintAddress);


      const mintInfo = await conn.getAccountInfo(mintPubkey);
      const programId = mintInfo ? mintInfo.owner : new PublicKey(TOKEN_PROGRAM_ID);
      

      const ata = await getAssociatedTokenAddress(mintPubkey, destPubkey, true, programId);
      const info = await conn.getAccountInfo(ata);
      
      const needsRent = info === null;
      setRequiresAta(needsRent);
      return needsRent;

    } catch (error) {
      console.warn("Failed to check ATA:", error);
      setRequiresAta(false);
      return false;
    }
  };


  const [estimatedFee, setEstimatedFee] = useState<{
    low: number;
    medium: number;
    high: number;
    selectedFee: "low" | "medium" | "high";
    fetched: boolean;
  }>({ low: 0, medium: 0, high: 0, selectedFee: "medium", fetched: false });

  const detectWallets = () => {
    const wallets = Array.from(getWallets().get());
    const seen = new Set<string>();
    const uniqueWallets = wallets.filter((w) => {
      if (seen.has(w.name)) return false;
      seen.add(w.name);
      return true;
    });


    const filtered = uniqueWallets.filter((w) => w.name === "Phantom");
    setAvailableWallets(filtered);
  };

  const connect = async (
    wallet: Wallet | "walletconnect",
    isAutoConnect = false,
  ) => {
    setIsConnecting(true);
    try {
      const netKey = "testnet";

      if (wallet === "walletconnect") {
        if (isAutoConnect) return;

        const unsubscribe = appKit.subscribeState((state) => {
          if (!state.open) {
            const isConnectedNow =
              localStorage.getItem(`solana_connected_${netKey}`) === "true";
            if (!isConnectedNow) {
              setIsConnecting(false);
            }
            if (unsubscribe) unsubscribe();
          }
        });

        await appKit.open({ view: "AllWallets", namespace: "solana" });
      }

      else {
        const connectFeature = wallet.features[CONNECT] as ConnectFeature;
        const { accounts } = await connectFeature.connect();
        const account = accounts[0];

        setCurrentWallet(wallet as WalletWithFeatures<any>);
        setCurrentAccount(account);
        setAddress(account.address);
        setWalletName(wallet.name);
        setWalletType("phantom");
        setConnected(true);

        localStorage.setItem(`solana_connected_${netKey}`, "true");
        localStorage.setItem(`solana_wallet_${netKey}`, wallet.name);
        localStorage.setItem(`solana_wallet_type_${netKey}`, "phantom");
        localStorage.setItem(`solana_address_${netKey}`, account.address);

        const eventsFeature = wallet.features[EVENTS] as EventsFeature;
        eventsFeature?.on?.("change", ({ accounts }) => {
          if (accounts.length > 0) {
            setCurrentAccount(accounts[0]);
            setAddress(accounts[0].address);
          } else {
            disconnect(false);
          }
        });
      }
    } catch (error) {
      console.error("Connection failed", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async (hardDisconnect: boolean = true) => {
    const netKey = "testnet";

    try {
      if (walletType === "walletconnect" && hardDisconnect) {
        await appKit.disconnect();
      }
    } catch (e) {
      console.warn("Error on disconnect", e);
    }

    setConnected(false);
    setAddress(null);
    setWalletName(null);
    setWalletType(null);
    setCurrentWallet(null);
    setCurrentAccount(null);


    localStorage.removeItem(`solana_connected_${netKey}`);
    localStorage.removeItem(`solana_wallet_${netKey}`);
    localStorage.removeItem(`solana_wallet_type_${netKey}`);
    localStorage.removeItem(`solana_address_${netKey}`);
  };


 
  const fetchBalance = useCallback(async (signal?: AbortSignal) => {
    if (!address) return;
    
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      if (signal?.aborted) return;

      try {
        const conn = new Connection(fullRpcUrl, "confirmed");
        const publicKey = new PublicKey(address);

        const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
        const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

        const [lamports, rentLamports, tokenAccounts, token2022Accounts] = await Promise.all([
          conn.getBalance(publicKey, "confirmed"),
          conn.getMinimumBalanceForRentExemption(0),
          conn.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }, "confirmed"),
          conn.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID }, "confirmed")
        ]);

        if (signal?.aborted) return;

        const allAccounts = [...tokenAccounts.value, ...token2022Accounts.value];
        const rawTokensMap = new Map<string, any>();

        allAccounts.forEach((acc) => {
          const info = acc.account.data.parsed.info;
          const mint = info.mint;
          const decimals = info.tokenAmount.decimals;
          const rawAmountBigInt = BigInt(info.tokenAmount.amount);
          if (rawAmountBigInt > BigInt(0)) {
            if (rawTokensMap.has(mint)) {
              rawTokensMap.get(mint).rawAmount += rawAmountBigInt;
            } else {
              rawTokensMap.set(mint, { mint, rawAmount: rawAmountBigInt, decimals });
            }
          }
        });

        const rawTokens = Array.from(rawTokensMap.values()).map(t => ({
          mint: t.mint,
          amount: Number(t.rawAmount) / Math.pow(10, t.decimals),
          decimals: t.decimals
        }));

        const solAmount = lamports / LAMPORTS_PER_SOL;
        const rentSol = rentLamports / LAMPORTS_PER_SOL;

        // This runs every 15s (the poll below) or on any real account-change event — most of
        // those ticks find nothing different. Diff against what's already in state and bail
        // out entirely (same `prev` reference) when nothing changed, instead of publishing a
        // fresh `tokens` array every time: that used to retrigger the global-token-data effect
        // (which depends on balance.tokens by reference) every 15s instead of its intended
        // 60s, and reset already-resolved tokens back to "Loading..." placeholders on every
        // poll, flashing Assets.tsx's skeleton on each one instead of just the first load.
        setBalance(prev => {
          const prevByMint = new Map((prev.tokens || []).map((t: any) => [t.mint, t]));

          const buildEntry = (mint: string, amount: number, decimals: number) => {
            const prevEntry = prevByMint.get(mint);
            if (prevEntry && !prevEntry.metaLoading && prevEntry.amount === amount && prevEntry.decimals === decimals) {
              return prevEntry;
            }
            if (prevEntry && !prevEntry.metaLoading) {
              // Already resolved before — keep its metadata, just refresh the amount,
              // instead of reverting it to a "Loading..." placeholder.
              return { ...prevEntry, amount, decimals };
            }
            // A genuinely new mint (never seen before): if the verified-token list is already
            // loaded and this mint isn't on it, it is treated as spam/dust and skipped, so a
            // held spam token doesn't flicker in and out of the list every poll.
            if (!prevEntry && verifiedTokensRef.current.length > 0 && !verifiedTokensRef.current.some((v: any) => v.id === mint)) {
              return null;
            }
            // No metadata pass follows on devnet, so this placeholder is not "still loading".
            return { mint, amount, decimals, symbol: `${mint.slice(0, 4)}`, name: "Loading...", price: "0", change: "0%", isNative: false, metaLoading: false };
          };

          const prevSol = prevByMint.get(SOL_DATA.mint);
          const nextSol =
            prevSol && !prevSol.metaLoading && prevSol.amount === solAmount
              ? prevSol
              : { ...(prevSol && !prevSol.metaLoading ? prevSol : { mint: SOL_DATA.mint, decimals: 9, symbol: "SOL", name: "Solana", price: "0", change: "0%", isNative: true, metaLoading: false }), amount: solAmount };

          const nextTokens = [
            nextSol,
            ...rawTokens.map(t => buildEntry(t.mint, t.amount, t.decimals)).filter((t): t is NonNullable<typeof t> => t !== null),
          ];

          const prevTokens = prev.tokens || [];
          const tokensChanged =
            nextTokens.length !== prevTokens.length ||
            nextTokens.some((t, i) => t !== prevTokens[i]);

          if (!tokensChanged && prev.confirmed === solAmount && prev.rent === rentSol && prev.fetched) {
            return prev;
          }

          return {
            ...prev,
            confirmed: solAmount,
            rent: rentSol,
            fetched: true,
            tokens: nextTokens,
          };
        });

        return; // Success, exit retry loop
      } catch (err: any) {
        if (signal?.aborted) return;
        if (attempts >= maxAttempts) {
          console.error("Failed to fetch Solana balances after retries:", err);
          // Guarantee fetched: true is set so UI never gets permanently stuck in loading
          setBalance(prev => ({ ...prev, fetched: true }));
        } else {
          await new Promise((resolve) => setTimeout(resolve, attempts * 400));
        }
      }
    }
  }, [address, fullRpcUrl]);
  // The native coin's market price (coinPrices.ts, through /api/prices).
  const fetchPrice = async () => {
    const p = await nativeUsdPrice("SOL");
    if (p) setPrice(p as any);
  };


  const setFeeSelection = (selectedFee: "low" | "medium" | "high") => {
    setEstimatedFee((prev) => ({
      low: prev.low,
      medium: prev.medium,
      high: prev.high,
      fetched: prev.fetched,
      selectedFee: selectedFee,
    }));
  };

const estimateFee = useCallback(async (signal?: AbortSignal) => {
    if (!address) return;

    try {
      const conn = new Connection(fullRpcUrl);


      const recentFees = await conn.getRecentPrioritizationFees();

      if (signal?.aborted) return;

      const sortedFees = recentFees
        .map((f) => f.prioritizationFee)
        .sort((a, b) => a - b);

    
      let lowMicroLamports = 1;
      let medMicroLamports = 5000;
      let highMicroLamports = 10000;

      if (sortedFees.length > 0) {

        const nonZeroFees = sortedFees.filter((f) => f > 0);

        if (nonZeroFees.length > 0) {
          const getPercentile = (arr: number[], percentile: number) => {
            const index = Math.floor(arr.length * percentile);
            return arr[index];
          };

          lowMicroLamports = getPercentile(nonZeroFees, 0.25);
          medMicroLamports = getPercentile(nonZeroFees, 0.5);
          highMicroLamports = getPercentile(nonZeroFees, 0.85);
        }
      }


      const computeUnitLimit = 300_000;
      const BASE_FEE_LAMPORTS = 5000; 

      const calcFee = (microLamports: number) => {
        const priorityFeeLamports = Math.ceil(
          (computeUnitLimit * microLamports) / 1_000_000
        );
        const totalLamports = BASE_FEE_LAMPORTS + priorityFeeLamports;
        return totalLamports / LAMPORTS_PER_SOL;
      };

      setEstimatedFee((prev) => ({
        ...prev,
        low: +calcFee(lowMicroLamports).toFixed(8),
        medium: +calcFee(medMicroLamports).toFixed(8),
        high: +calcFee(highMicroLamports).toFixed(8),
        fetched: true,
      }));
      
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Failed to fetch real Solana fees:", error);
    }
  }, [address, fullRpcUrl]);


  const fetchETA = async (
    txHash: string,
  ): Promise<{ estimatedSeconds: number; isCongested: boolean } | null> => {
    if (!txHash) return null;

    try {
      const conn = new Connection(fullRpcUrl);

      const { value } = await conn.getSignatureStatuses([txHash]);
      const status = value[0];

      if (!status) {
        return null;
      }

      if (status.confirmationStatus === "finalized") {
        return { estimatedSeconds: 0, isCongested: false };
      }

     
      if (typeof status.confirmations === "number") {
        const TARGET = 32;

        const remaining = Math.max(TARGET - status.confirmations, 1);

        const isCongested = remaining > 15;

        return { estimatedSeconds: remaining, isCongested };
      }
      return { estimatedSeconds: 5, isCongested: false };
    } catch (err) {
      console.error("[Solana fetchETA error]", err);
      return null;
    }
  };


/** The single address-check entry point exposed to the frontend: whether an
 * address is valid, and if not, which specific rule it failed — so forms can
 * show a specific, actionable message instead of one generic "invalid" string. */
const checkAddress = useCallback((address: string): AddressCheckResult => {
  try {
    new PublicKey(address);
    return { valid: true, reason: null };
  } catch {
    // fall through to figure out *why*, below
  }
  const base58Chars = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Chars.test(address)) return { valid: false, reason: "invalid-characters" };
  if (address.length < 32) return { valid: false, reason: "too-short" };
  if (address.length > 44) return { valid: false, reason: "too-long" };
  return { valid: false, reason: "invalid" };
}, []);

const isValidAddress = useCallback((address: string): boolean => checkAddress(address).valid, [checkAddress]);

const sendTokenTo = async (
  toAddress: string,
  amount: number,
  customFee?: number,
  mintAddress?: string,
  decimals: number = 9
): Promise<string | null> => {
  if (!address) return null;

  // Fires a best-effort refresh shortly after broadcast, so the UI doesn't sit on the
  // stale pre-send balance for up to a full 15s poll tick. The transaction isn't confirmed
  // yet when this fires — it's a courtesy nudge, not a guarantee — the poll interval still
  // catches up regardless.
  const scheduleBalanceRefresh = () => {
    setTimeout(() => {
      fetchBalance();
      estimateFee();
    }, 2000);
  };

  try {
    const conn = new Connection(fullRpcUrl);
    const from = new PublicKey(address);
    const to = new PublicKey(toAddress);
    const latest = await conn.getLatestBlockhash();

    const computeUnitLimit = 300_000;

    const tx = new Transaction({
      recentBlockhash: latest.blockhash,
      feePayer: from,
    });

    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }),
    );

    if (customFee) {
      const BASE_FEE_LAMPORTS = 5000;
      const totalLamports = Math.floor(customFee * LAMPORTS_PER_SOL);
      const priorityFeeLamports = totalLamports - BASE_FEE_LAMPORTS;

      const microLamports = Math.floor(
        (priorityFeeLamports * 1_000_000) / computeUnitLimit,
      );

      if (microLamports > 0) {
        tx.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports,
          }),
        );
      }
    }


    if (!mintAddress || mintAddress === SOLANA_NATIVE_MINT) {
      const transferLamports = Math.floor(amount * LAMPORTS_PER_SOL);
      tx.add(
        SystemProgram.transfer({
          fromPubkey: from,
          toPubkey: to,
          lamports: transferLamports,
        }),
      );
    } else {

      const mintPubkey = new PublicKey(mintAddress);

      const accountInfo = await conn.getAccountInfo(mintPubkey);
      if (!accountInfo) throw new Error("Token Mint not found on chain");
      const tokenProgramId = accountInfo.owner; 

      const fromATA = await getAssociatedTokenAddress(mintPubkey, from, false, tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID);
      const toATA = await getAssociatedTokenAddress(mintPubkey, to, false, tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID);

      const toATAInfo = await conn.getAccountInfo(toATA);
      if (!toATAInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            from,        
            toATA,       
            to,         
            mintPubkey, 
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      const transferAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));


      tx.add(
        createTransferCheckedInstruction(
          fromATA,
          mintPubkey,
          toATA,
          from,
          transferAmount,
          decimals,
          [],
          tokenProgramId
        )
      );
    }


    if (walletType === "walletconnect" && akProvider) {
      const signedTx = await (akProvider as any).signTransaction(tx);
      const sig = await conn.sendRawTransaction(signedTx.serialize());
      scheduleBalanceRefresh();
      return sig;
    }


    const unsigned = tx.serialize({ requireAllSignatures: false });
    const signFeature = currentWallet?.features["solana:signTransaction"] as any;
    if (!signFeature) throw new Error("Wallet lacks signTransaction");

    const signed = await signFeature.signTransaction({
      transaction: unsigned,
      account: currentAccount!,
    });

    const raw: Uint8Array | undefined =
      signed instanceof Uint8Array
        ? signed
        : Array.isArray(signed) && signed[0]?.signedTransaction instanceof Uint8Array
          ? signed[0].signedTransaction
          : signed?.signedTransaction instanceof Uint8Array
            ? signed.signedTransaction
            : signed?.serialize
              ? (signed as any).serialize()
              : undefined;

    if (!raw) {
      console.error("Unknown signed result:", signed);
      throw new Error("Unsupported signed transaction format");
    }

    const sig = await conn.sendRawTransaction(raw);
    scheduleBalanceRefresh();
    return sig;
  } catch (err) {
    console.error("[Solana send error]", err);
    return null;
  }
};

  const signMessage = async (message: string) => {
    const encoded = new TextEncoder().encode(message);


    if (walletType === "walletconnect" && akProvider) {
      const res = await (akProvider as any).signMessage(encoded);
      return Buffer.from(res).toString("hex");
    }


    const feature = currentWallet?.features[SIGN_MESSAGE] as SignMessageFeature;
    if (!feature || !currentAccount) return null;

    const res = await feature.signMessage({
      message: encoded,
      account: currentAccount,
    });
    return Buffer.from(res.signature).toString("hex");
  };

  const switchWallet = async (w: Wallet | "walletconnect") => {
    if (w === "walletconnect") {
      disconnect(false);
      await connect(w);
    } else if (w.name !== currentWallet?.name) {
      disconnect(false);
      await connect(w);
    }
  };


// const fetchVerifiedTokens = async (): Promise<any[]> => {
//   try {
//     if (response.success && Array.isArray(response.tokens)) {
//       return response.tokens.map((t: any) => ({
//         id: t.id,
//         mint: t.id,
//         symbol: t.symbol,
//         name: t.name,
//         icon: t.icon,
//         decimals: t.decimals,
//       }));
//     }
//     return [];
//   } catch (err) {
//     console.error("[SolanaProvider] fetchVerifiedTokens error:", err);
//     return [];
//   }
// };


  /** Signs one transaction with the connected wallet, WalletConnect or a
   *  wallet-standard one, and gives it back signed, of the same kind. */
  const signOne = async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
    if (walletType === "walletconnect" && akProvider) return (await (akProvider as any).signTransaction(tx)) as T;
    const feature = currentWallet?.features["solana:signTransaction"] as any;
    if (!feature || !currentAccount) throw new Error("Wallet lacks signTransaction");
    const bytes = tx instanceof VersionedTransaction ? tx.serialize() : tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    const result = await feature.signTransaction({ transaction: bytes, account: currentAccount });
    const signed = Array.isArray(result) ? result[0] : result;
    const raw: Uint8Array | undefined = signed instanceof Uint8Array ? signed : signed?.signedTransaction;
    if (!raw) throw new Error("Failed to extract signed transaction");
    return (tx instanceof VersionedTransaction ? VersionedTransaction.deserialize(raw) : Transaction.from(raw)) as T;
  };

  /** The connected wallet in the shape Anchor and @ipow/sdk sign with;
   *  null while none is connected. */
  const getAnchorWallet = (): SolanaWallet | null =>
    address
      ? {
          publicKey: new PublicKey(address),
          signTransaction: signOne,
          // Several at once in one prompt where the wallet can (the
          // wallet-standard feature takes many); one by one otherwise.
          signAllTransactions: async (txs) => {
            const feature = currentWallet?.features["solana:signTransaction"] as any;
            if (walletType !== "walletconnect" && feature && currentAccount && txs.length > 1) {
              try {
                const results = await feature.signTransaction(
                  ...txs.map((tx) => ({ transaction: tx instanceof VersionedTransaction ? tx.serialize() : tx.serialize({ requireAllSignatures: false, verifySignatures: false }), account: currentAccount }))
                );
                if (Array.isArray(results) && results.length === txs.length) {
                  return results.map((r: any, i: number) => {
                    const raw: Uint8Array = r instanceof Uint8Array ? r : r?.signedTransaction;
                    return (txs[i] instanceof VersionedTransaction ? VersionedTransaction.deserialize(raw) : Transaction.from(raw)) as any;
                  });
                }
              } catch (e) {
                // Refused by the user: stop. Anything else: one by one.
                if ((e as any)?.code === 4001 || /reject|denied|cancel/i.test(String((e as any)?.message ?? e))) throw e;
              }
            }
            const out = [];
            for (const tx of txs) out.push(await signOne(tx));
            return out;
          },
        }
      : null;

  // Convert on the new protocol (solanaConvertMethods), spread into the
  // context's value.
  const anchorWalletRef = useRef(getAnchorWallet);
  anchorWalletRef.current = getAnchorWallet;
  const convert = useMemo(
    () => solanaConvertMethods({ getWallet: () => anchorWalletRef.current(), address, uiNetworkId: IPOW_NETWORK_ID }),
    [address]
  );



  


  useEffect(() => {
    const netKey = "testnet";
    if (akConnected && allAccounts && akProvider) {
      const wasInjected =
        localStorage.getItem(`solana_wallet_type_${netKey}`) === "phantom";
      const solAccount = allAccounts.find((acc) => acc.namespace === "solana");

      if (solAccount && (!wasInjected || walletType === "walletconnect")) {
        const currentAddress = solAccount.address;

        if (address !== currentAddress) {
          setAddress(currentAddress);
          setConnected(true);
          setWalletType("walletconnect");
          setWalletName("WalletConnect");

          localStorage.setItem(`solana_connected_${netKey}`, "true");
          localStorage.setItem(`solana_wallet_type_${netKey}`, "walletconnect");
          localStorage.setItem(`solana_address_${netKey}`, currentAddress);
        }
      }
    }
  }, [akConnected, allAccounts, akProvider, address, walletType]);


  useEffect(() => {
    const wasConnected =
      localStorage.getItem(
        `solana_connected_testnet`,
      ) === "true";
    const savedWalletName = localStorage.getItem(
      `solana_wallet_testnet`,
    );
    const savedWalletType = localStorage.getItem(
      `solana_wallet_type_testnet`,
    );

    // WalletConnect restoration is intentionally NOT handled here: setting `connected` straight
    // from a cached address would show a fully "connected" wallet even if the underlying WC
    // session actually died (expired, revoked, or never restored) while the app was closed. The
    // `akConnected`/`allAccounts`/`akProvider` effect above is the only source of truth for
    // that — it fires once reown/appkit's own SDK confirms the session is genuinely live, and
    // simply never fires if it isn't, which is the correct outcome.
    if (wasConnected && savedWalletType && savedWalletType !== "walletconnect") {
      if (savedWalletName) {
        setIsConnecting(true);
        detectWallets();
        let attempts = 0;
        const tryHydrate = () => {
          const wallets = getWallets().get();
          const wallet = wallets.find((w) => w.name === savedWalletName);
          if (wallet) {
            connect(wallet, true);
            return true;
          }
          return false;
        };

        if (!tryHydrate()) {
          const interval = setInterval(() => {
            attempts++;
            if (tryHydrate() || attempts > 20) {
              clearInterval(interval);
              if (attempts > 20 && !connected) {
                setIsConnecting(false);
              }
            }
          }, 100);
          return () => clearInterval(interval);
        }
      }
    } else if (!connected && !akConnected) {
      setIsConnecting(false);
      setConnected(false);
      setAddress(null);
      setWalletType(null);
      setWalletName(null);
      setCurrentWallet(null);
      setCurrentAccount(null);
      setBalance({ confirmed: 0, unconfirmed: 0, fetched: false, rent: 0, tokens: [] });
      detectWallets();
    }
  }, []);
  useEffect(() => {
    fetchPrice();
    const i = setInterval(() => {
      fetchPrice();
    }, 60000);
    return () => clearInterval(i);
  }, []);

useEffect(() => {
    if (!address){
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    fetchBalance(signal);
    estimateFee();

    // Polling fallback: the RPC websocket subscriptions below (onAccountChange /
    // onProgramAccountChange) require the provider's plan to support accountSubscribe /
    // programSubscribe. Now that requests are routed through the /api/rpc proxy, the
    // derived websocket endpoint points at this app's own server (which has no WS listener
    // to upgrade to — a Next.js route.ts can't proxy a persistent socket), so those
    // subscriptions can never succeed. This interval is the real balance-refresh mechanism.
    let pollInFlight = false;
    const pollInterval = setInterval(async () => {
      if (pollInFlight) return;
      pollInFlight = true;
      try {
        await fetchBalance(signal);
        if (!signal.aborted) estimateFee();
      } finally {
        pollInFlight = false;
      }
    }, 15000);

    const conn = new Connection(fullRpcUrl, "confirmed");
    const publicKey = new PublicKey(address);

    const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

    let fetchTimeout: NodeJS.Timeout;
    const triggerDebouncedFetch = () => {
      clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => {
        fetchBalance();
        estimateFee();
      }, 2000);
    };

    // Gated off: the /api/rpc proxy can only carry plain HTTP JSON-RPC, not a websocket
    // upgrade, so accountSubscribe/programSubscribe have no server to connect to through it.
    // Left in place (not deleted) so it can be re-enabled if these ever point at a real
    // websocket-capable RPC endpoint directly instead of the proxy.
    let solSubId: number | undefined;
    let splSubId: number | undefined;
    let token2022SubId: number | undefined;

    if (SOLANA_WS_SUBSCRIPTIONS_SUPPORTED) {
      solSubId = conn.onAccountChange(
        publicKey,
        () => {
          triggerDebouncedFetch();
        },
        { commitment: "confirmed" }
      );

      splSubId = conn.onProgramAccountChange(
        TOKEN_PROGRAM_ID,
        () => {
          triggerDebouncedFetch();
        },
        {
          commitment: "confirmed",
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 32, bytes: publicKey.toBase58() } }
          ]
        }
      );

      token2022SubId = conn.onProgramAccountChange(
        TOKEN_2022_PROGRAM_ID,
        () => {
          triggerDebouncedFetch();
        },
        {
          commitment: "confirmed",
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 32, bytes: publicKey.toBase58() } }
          ]
        }
      );
    }

    return () => {
      controller.abort();
      clearTimeout(fetchTimeout);
      clearInterval(pollInterval);
      if (solSubId !== undefined) conn.removeAccountChangeListener(solSubId).catch(console.warn);
      if (splSubId !== undefined) conn.removeProgramAccountChangeListener(splSubId).catch(console.warn);
      if (token2022SubId !== undefined) conn.removeProgramAccountChangeListener(token2022SubId).catch(console.warn);
    };


  }, [address, fullRpcUrl]);

  const ATA_RENT_SOL = requiresAta ? 0.00203928 : 0;
  
  const STD_NETWORK_FEE = estimatedFee[estimatedFee.selectedFee];
  

  return (
   <SolanaWalletContext.Provider
      value={{
        connected,
        isConnecting,
        address,
        walletName,
        walletType,
        availableWallets,
        currencyTicker: "SOL",
        decimals: 9,
        ipowDecimals: 9,
        networkName: "Solana",
        networkLogo: solananetwork,
        networkDescription: {
          en: `Solana is a fast, scalable blockchain for modern apps. With ultra-low fees and high throughput, solana is a ideal network for you who want to use DeFi, NFTs, and real-time dApps.`,
        },
        ipowConvert: "testnet",
        ipowNetworkId: IPOW_NETWORK_ID,
        connect,
        disconnect,
        signMessage,
        getAnchorWallet,
        switchWallet,
        sendTokenTo,
        checkAddress,
        isValidAddress,
        setFeeSelection,
        fetchETA,
        verifiedTokensData,
        checkAtaRequired,
        balance: {
          ...balance,
          
       
          sendable: safeSolanaTokenAmount(
            balance.confirmed - STD_NETWORK_FEE - ATA_RENT_SOL - (balance.rent * 1.2)
          ),
          
        
          swapable: safeSolanaTokenAmount(
              Math.max(0, balance.confirmed)),
          
        
          // Not reserving NATIVE_STAKE_RENT_FEE here: a new native stake account's
          // rent-exempt minimum is funded BY the staked amount itself (SystemProgram
          // .createAccount({ lamports: <stake amount> }) inside getAuthNativeStakeSOLIx) —
          // it's a floor on how small a stake can be (already enforced generously by
          // MIN_SOL_LAMPORTS), not a separate reserve on top of the stake. Liquid staking
          // creates no stake account at all (Marinade's pool absorbs the deposit), so this
          // never applied there either. Reserving it here was silently shrinking the max
          // stakeable amount for no real on-chain reason, to the point of causing genuine
          // "insufficient balance" failures on amounts that were actually affordable.
          stakeable: safeSolanaTokenAmount(Math.max(0, balance.confirmed)),
        },
        estimatedFee,
        price,
        networkExplorer : currentNetworkConfig.networkExplorer,

        ...convert,
      }}
    >
      {children}
    </SolanaWalletContext.Provider>
  );
}
