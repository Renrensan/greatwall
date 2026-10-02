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
  Keypair,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  MessageV0,
} from "@solana/web3.js";
import { solananetwork } from "@/index";
import { useNetwork } from "@/app/network-provider";
import { broadcastGaslessSendTx, prepareGaslessSendTx, } from "../integrator/selfcustody/send"

import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";

import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import idl from "../integrator/ipow/svm/ipow.json";



import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { appKit } from "../walletconnect/wallet-connect-provider";
import { ConnectFeature, EventsFeature, SignMessageFeature, SolanaWalletContextType, SolanaWalletType } from "./config/type";
import { broadcastGaslessTx, fetchMarinadeSOLData, fetchMarinadeUSDCData, fetchMarinadeUsdcRewardHistory, fetchMarinadeUsdcTransactionHistory, getMarinadeDepositTx, getMarinadeLiquidUnstakeTx, getMarinadeNativeDepositTx, getMarinadeNativeUnstakeTx, getMarinadeUsdcClaimTx, getMarinadeUsdcDepositTx, getMarinadeUsdcWithdrawTx, getNativeWithdrawTx } from "@/components/integrator/dapphub/solana/solana-staking/marinade-stake";
import { CONNECT, EVENTS, safeSolanaTokenAmount, SIGN_MESSAGE } from "./config/helpers";
import { appConfig } from "./config";
import { IPOW_NETWORK_ID, PARADAPP_FEE_VAULT_SOLANA, SOL_DATA, SOLANA_NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DATA, USDC_MINT } from "./config/constants";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";
import { broadcastSwapTx, getAtomicGaslessSwapTx, getGaslessQuoteAndFee, getJupiterPrices, getJupiterVerifiedTokens, searchJupiterToken } from "../integrator/dapphub/solana/solana-swap/jupiter-swap";
import { ADDITIONAL_SWAP_FEE_LAMPORTS, PARADAPP_JUPITER_FEE } from "../integrator/dapphub/solana/solana-swap/constant";
import { PARADAPP_MARINANDE_FEE } from "../integrator/dapphub/solana/solana-staking/constant";
import { getStockAssets } from "../integrator/dapphub/solana/solana-stocks/solana-stocks";
import { TxPhase } from "../integrator/ipow/evm/type";
import { Ipow } from "../integrator/ipow/svm/types/ipow";
import { BETA_MINT_ADDRESS, BETA_PROGRAM_ID, PORTFOLIO_WEIGHTS, RAW_MINTS } from "../integrator/dapphub/solana/solana-beta/constant";


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
  selfCustodyParameter: {},
  networkLogo: solananetwork,
  price: {},
  networkExplorer: {},
  ipowConvert: "testnet", 
  ipowNetworkId: 3,
  dappList: [],
  
  verifiedTokensData: [],
  liveTokenPrices: {},

  isUltraFast: false,
  setIsUltraFast: () => {},
  checkAtaRequired: async () => false,

  toggleFavoriteDapp: () => {},
  connect: async () => {},
  disconnect: () => {},
  signMessage: async () => null,
  switchWallet: async () => {},
  sendTokenTo: async () => null,
  checkAddress: () => ({ valid: false, reason: "invalid" }),
  isValidAddress: () => false,
  executeGaslessSend: async () => null,
  fetchGaslessSendQuote: async ()=>null,
  stakeToMarinade: async () => null, 
  unstakeFromMarinade: async () => null,
  getMarinadeSOLData: async () => null,
  getMarinadeUsdcRewardHistory: async () => null,
  getMarinadeUsdcTransactionHistory: async () => null,
  stakeNativeToMarinade: async () => null,
  unstakeNativeFromMarinade: async () => null,
  withdrawNativeStake: async () => null,
  depositUsdcToMarinade: async () => null,
  withdrawUsdcFromMarinade: async () => null,
  getMarinadeUSDCData: async () => null,
  claimUsdcFromMarinade: async () => null,
  fetchMarinadeDepositQuote: async () => null,
  fetchMarinadeUnstakeQuote: async () => null,
  fetchMarinadeNativeDepositQuote: async () => null,
  fetchMarinadeNativeUnstakeQuote: async () => null,
  fetchMarinadeUsdcDepositQuote: async () => null,
  fetchMarinadeUsdcWithdrawQuote: async () => null,
  

  executeSwap: async () => null,
  fetchSwapQuote: async () => null,
  fetchTokenMeta: async () => null,
  fetchStockAssets: async () => [],
  liveBetaPrice: 0,
    
  setFeeSelection: () => {},
  fetchETA: async () => null,
  

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
  initializeProtocol: async () => {},
  addSupportedNetwork: async () => {},

  anchorInfo: async () => null,
  windowsFor: async () => null,
  proofInfo: async () => null,
  globalHeightToHashLE: async () => "0x0000000000000000000000000000000000000000000000000000000000000000",
  submitBitcoinMerkleProofWithTx: async () => null,

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

// `Connection.getAccountInfo` (used by checkAtaRequired/fetchSwapQuote below) has no built-in
// timeout — a slow/unresponsive RPC node leaves the awaited promise hanging forever, which is
// the same class of bug fixed in SolanaStake.tsx's fee-quote effect (see withTimeout there):
// the debounced quote effects in SolanaSwap.tsx/SolanaStocks.tsx never get to their `finally`
// block, so isFetchingQuote stays stuck true with no way for the user to recover.
// `signal` is optional and additive to the timeout: when the caller (e.g. SolanaSwap.tsx's
// quote effect) aborts because the user changed the input again before this settled, this
// resolves immediately instead of waiting out the full timeout — the actual RPC calls in flight
// can't be killed (the SDK doesn't expose an AbortSignal hook), but the caller stops waiting on
// them right away instead of leaving isFetchingQuote stuck until the timeout elapses.
function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        resolve(null);
      }, { once: true });
    }),
  ]);
}

export function SolanaProvider({ children }: { children: ReactNode }) {

  const [liveBetaPrice, setLiveBetaPrice] = useState<number>(0.00);
    
  const { isConnected: akConnected, allAccounts } = useAppKitAccount();
  const { walletProvider: akProvider } = useAppKitProvider("solana");

  const { solanaMainnet } = useNetwork();
  const isMainnet = solanaMainnet;

    const currentNetworkConfig = useMemo(() => {
      return isMainnet ? appConfig.networks.mainnet : appConfig.networks.devnet;
    }, [isMainnet]);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullRpcUrl = `${origin}${currentNetworkConfig.jsonRpcUrl}`;



const [selfCustodyParameter, setSelfCustodyParameter] = useState<CustodyParams>({
  network: "SOLANA",
  env: isMainnet ? "MAINNET" : "TESTNET",
  tokens: [
    {
      token: "SOL",
      isNative: true,
      deposit: { min: 10000, maxVA: 100000000, maxQRIS: 10000000 },
      withdraw: { min: 10000, max: 100000000 },
    },
    {
      token: isMainnet ? USDC_MINT : "USDC",
      isNative: false,
      deposit: { min: 10000, maxVA: 100000000, maxQRIS: 10000000 },
      withdraw: { min: 10000, max: 100000000 },
    },
  ],
  fetched: false,
});


  const [verifiedTokensData, setVerifiedTokensData] = useState<any[]>([
    SOL_DATA,
    USDC_DATA,
  ]);
  const [liveTokenPrices, setLiveTokenPrices] = useState<Record<string, any>>({});

  const verifiedTokensRef = useRef<any[]>([]);
  const liveTokenPricesRef = useRef<Record<string, any>>({});


  useEffect(() => {
    verifiedTokensRef.current = verifiedTokensData;
  }, [verifiedTokensData]);

  useEffect(() => {
    liveTokenPricesRef.current = liveTokenPrices;
  }, [liveTokenPrices]);

  const [dappList, setDappList] = useState<any[] | null>(null);

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

const [isUltraFast, setIsUltraFast] = useState(false);
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
      const netKey = isMainnet ? "mainnet" : "testnet";

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
    const netKey = isMainnet ? "mainnet" : "testnet";

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


 
  const calculateLiveBetaPrice = useCallback(async (currentPrices: Record<string, any>) => {
    try {
      const conn = new Connection(fullRpcUrl);
      

      const betaMintInfo = await conn.getTokenSupply(BETA_MINT_ADDRESS);
      const totalSupply = Number(betaMintInfo.value.uiAmount);


      if (totalSupply === 0) {
        setLiveBetaPrice(1.00);
        return;
      }

      const [epochStatePda] = PublicKey.findProgramAddressSync([Buffer.from("epoch_state_v0")], BETA_PROGRAM_ID);
      let totalVaultUsd = 0;

      await Promise.all(PORTFOLIO_WEIGHTS.map(async (asset) => {
         const isStandardToken = asset.mint === RAW_MINTS .cbbtc || asset.mint === RAW_MINTS.usdc;
         const tokenProgram = isStandardToken ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

         const vaultAta = await getAssociatedTokenAddress(
           new PublicKey(asset.mint),
           epochStatePda,
           true,
           new PublicKey(tokenProgram)
         );

  
         const vaultBalance = await conn.getTokenAccountBalance(vaultAta);
         const balanceUi = Number(vaultBalance.value.uiAmount);


         const priceObj = currentPrices[asset.mint];
         const priceUsd = parseFloat(priceObj?.usdPrice || priceObj?.price || "0");


         totalVaultUsd += (balanceUi * priceUsd);
      }));


      const calculatedPrice = totalVaultUsd / totalSupply;
      

      if (calculatedPrice > 0) {
        setLiveBetaPrice(calculatedPrice);
      }
      
    } catch (error) {
      console.error("Failed to calculate live BETA price:", error);
    }
  }, [fullRpcUrl]);

const enrichTokenData = async (solAmount: number, rawTokens: any[]) => {
    try {
      let verifiedList = verifiedTokensRef.current;

      if (verifiedList.length === 0) {
        const tokensRes = await getJupiterVerifiedTokens();
        verifiedList = tokensRes.success ? tokensRes.tokens : [];
        verifiedTokensRef.current = verifiedList;
      }

      const USDC_MINT = USDC_DATA.mint;
      const SOL_MINT = SOL_DATA.mint;

      const mintsToPrice = new Set<string>([SOL_MINT, USDC_MINT, ...rawTokens.map(t => t.mint)]);

      let currentPrices = liveTokenPricesRef.current;
      if (mintsToPrice.size > 0) {
        const priceRes = await getJupiterPrices(Array.from(mintsToPrice));
        if (priceRes.success && priceRes.prices?.data) {
          const mergedPrices = { ...currentPrices, ...priceRes.prices.data };
          // This runs on every 15s balance poll (via fetchBalance below), and
          // liveTokenPrices is provider-level state — every consumer across the app
          // re-renders whenever it changes. Bail out when the merge didn't actually change
          // anything (e.g. Jupiter returned the same figures) instead of publishing an
          // equivalent-but-new object every cycle.
          if (JSON.stringify(mergedPrices) !== JSON.stringify(currentPrices)) {
            currentPrices = mergedPrices;
            liveTokenPricesRef.current = currentPrices;
            setLiveTokenPrices(currentPrices);
            calculateLiveBetaPrice(currentPrices);
          } else {
            currentPrices = mergedPrices;
          }
        }
      }

      const getPrice = (mint: string) => currentPrices[mint]?.usdPrice || currentPrices[mint]?.price || 0;
      const getChange = (mint: string) => currentPrices[mint]?.priceChange24h || 0;

      // Builds one token's display entry, matching an existing entry by reference when
      // nothing about it actually changed. This lets the setBalance below detect "nothing
      // changed" (see `changed` further down) and bail out entirely instead of publishing a
      // new `tokens` array — the same array/token-object churn that used to retrigger the
      // global-token-data effect (which depends on balance.tokens) every 15s instead of its
      // intended 60s, and flash Assets.tsx's skeleton/entrance animation on every poll.
      const buildEntry = (
        prevByMint: Map<string, any>,
        mint: string,
        amount: number,
        rawDecimals: number,
        isNative: boolean,
      ) => {
        const meta = verifiedList.find((v: any) => v.id === mint);

        // SOL always shows. A non-native mint with no match on Jupiter's curated "verified"
        // list is excluded — on Solana that's the standard signature of spam/dust (huge
        // unsolicited airdropped supply, no real price or liquidity, a phishing link for a
        // name), not a legitimate token that merely lacks metadata. Matching against real
        // metadata is what determines whether a token is genuine, not the other way around.
        if (!isNative && !meta) return null;

        const price = getPrice(mint).toString();
        const change = `${getChange(mint) >= 0 ? "+" : ""}${getChange(mint).toFixed(2)}%`;
        const decimals = meta?.decimals || rawDecimals;
        const symbol = meta?.symbol || "SOL";
        const name = meta?.name || "Solana";
        const logo = meta?.icon || null;

        const prevEntry = prevByMint.get(mint);
        if (
          prevEntry &&
          !prevEntry.metaLoading &&
          prevEntry.amount === amount &&
          prevEntry.decimals === decimals &&
          prevEntry.symbol === symbol &&
          prevEntry.name === name &&
          prevEntry.logo === logo &&
          prevEntry.price === price &&
          prevEntry.change === change
        ) {
          return prevEntry;
        }

        return { mint, amount, decimals, symbol, name, logo, price, change, isNative, metaLoading: false };
      };

      setBalance(prev => {
        const prevByMint = new Map((prev.tokens || []).map((t: any) => [t.mint, t]));

        const nextTokens = [
          buildEntry(prevByMint, SOL_MINT, solAmount, 9, true),
          ...rawTokens.map(t => buildEntry(prevByMint, t.mint, t.amount, t.decimals, false)),
        ].filter((t): t is NonNullable<typeof t> => t !== null);

        const prevTokens = prev.tokens || [];
        const changed =
          nextTokens.length !== prevTokens.length ||
          nextTokens.some((t, i) => t !== prevTokens[i]);

        if (!changed) return prev;

        return { ...prev, tokens: nextTokens };
      });

    } catch (e) {
      console.error("Background enrichment failed:", e);
    }
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
              // Already resolved by enrichTokenData before — keep its real metadata, just
              // refresh the amount, instead of reverting it to a "Loading..." placeholder.
              return { ...prevEntry, amount, decimals };
            }
            // A genuinely new mint (never seen before): if the verified-token list is already
            // loaded and this mint isn't on it, enrichTokenData would exclude it as spam/dust
            // moments later anyway (see its buildEntry) — skip the placeholder here too, so a
            // held spam token doesn't flicker in and out of the list every poll.
            if (!prevEntry && verifiedTokensRef.current.length > 0 && !verifiedTokensRef.current.some((v: any) => v.id === mint)) {
              return null;
            }
            // metaLoading only on mainnet: that's the only case enrichTokenData() runs below
            // to replace this placeholder with real Jupiter metadata. On testnet there's no
            // enrichment pass at all, so treating it as "still loading" would never resolve.
            return { mint, amount, decimals, symbol: `${mint.slice(0, 4)}`, name: "Loading...", price: "0", change: "0%", isNative: false, metaLoading: isMainnet };
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

        // Always let enrichTokenData check for a live price refresh, even when the raw token
        // amounts above didn't change — market prices move on their own. It has its own
        // bail-outs (see buildEntry/changed and the price-merge check inside it) so this is
        // safe to call every tick without reintroducing the churn fixed above.
        if (isMainnet) {
          enrichTokenData(solAmount, rawTokens);
        }

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
  }, [address, fullRpcUrl, isMainnet]);
  const fetchPrice = async () => {
    try {
      const envMode = isMainnet ? "MAINNET" : "TESTNET";
      const response = await fetch(`/api/token-price?token=SOL&env=${envMode}`, {
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
            network: "SOLANA",
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
      console.log(`Transaction Signature: ${sig}`);
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

    let raw: Uint8Array | undefined =
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
    console.log(`Transaction Signature: ${sig}`);
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

  const getMarinadeUSDCData = async (): Promise<any | null> => {
  try {
    const response = await fetchMarinadeUSDCData(fullRpcUrl, address!);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch Marinade USDC data");
    }

    return response.data;
  } catch (err) {
    console.error("[SolanaProvider] getMarinadeUsdcData error:", err);
    return null;
  }
};

  const getMarinadeSOLData = async (): Promise<any | null> => {
  try {
    const response = await fetchMarinadeSOLData(fullRpcUrl, address!);

    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch Marinade data");
    }

    return response.data;
  } catch (err) {
    console.error("[SolanaProvider] getMarinadeData error:", err);
    return null;
  }
};

  const getMarinadeUsdcRewardHistory = async (): Promise<any | null> => {
    if (!address) return null;
    try {
      const response = await fetchMarinadeUsdcRewardHistory(address);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to fetch USDC reward history");
      }
      return response.data;
    } catch (err) {
      console.error("[SolanaProvider] getMarinadeUsdcRewardHistory error:", err);
      return null;
    }
  };

  const getMarinadeUsdcTransactionHistory = async (): Promise<any | null> => {
    if (!address) return null;
    try {
      const response = await fetchMarinadeUsdcTransactionHistory(address);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to fetch USDC transaction history");
      }
      return response.data;
    } catch (err) {
      console.error("[SolanaProvider] getMarinadeUsdcTransactionHistory error:", err);
      return null;
    }
  };

/** Quote-only variant of stakeToMarinade — builds the tx and returns its fee breakdown
 * without prompting the wallet to sign, for a live "you'll pay X" preview as the user
 * types. Does not touch the sign+broadcast flow below at all. */
const fetchMarinadeDepositQuote = async (amountSol: number): Promise<any | null> => {
  if (!address) return null;
  try {
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const res = await getMarinadeDepositTx(address, lamports, fullRpcUrl);
    return res.success ? res : null;
  } catch (err) {
    console.error("[fetchMarinadeDepositQuote error]", err);
    return null;
  }
};

const stakeToMarinade = async (amountSol: number): Promise<string | null> => {
  if (!address) return null;
  try {
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const response = await getMarinadeDepositTx(address, lamports, fullRpcUrl);

    if (!response.success || !response.transactionBase64) {
      throw new Error(response.error || "Failed to build tx");
    }

    return await signAndBroadcastGaslessTx(response.transactionBase64, fullRpcUrl);
  } catch (err) {
    console.error("[Marinade Liquid Staking Error]", err);
    return null;
  }
};

const fetchMarinadeUnstakeQuote = async (amountMSol: number): Promise<any | null> => {
  if (!address) return null;
  try {
    const lamports = Math.floor(amountMSol * LAMPORTS_PER_SOL);
    const res = await getMarinadeLiquidUnstakeTx(address, lamports, fullRpcUrl);
    return res.success ? res : null;
  } catch (err) {
    console.error("[fetchMarinadeUnstakeQuote error]", err);
    return null;
  }
};

const unstakeFromMarinade = async (amountMSol: number): Promise<string | null> => {
  if (!address) return null;
  try {
    const lamports = Math.floor(amountMSol * LAMPORTS_PER_SOL);
    const response = await getMarinadeLiquidUnstakeTx(address, lamports, fullRpcUrl);

    if (!response.success || !response.transactionBase64) {
      throw new Error(response.error || "Failed to build tx");
    }

    return await signAndBroadcastGaslessTx(response.transactionBase64, fullRpcUrl);
  } catch (err) {
    console.error("[Marinade Liquid Unstaking Error]", err);
    return null;
  }
};

const fetchMarinadeNativeDepositQuote = async (amountSol: number): Promise<any | null> => {
  if (!address) return null;
  try {
    const lamports = Math.floor(amountSol * 1_000_000_000);
    const res = await getMarinadeNativeDepositTx(address, lamports, fullRpcUrl);
    return res.success ? res : null;
  } catch (err) {
    console.error("[fetchMarinadeNativeDepositQuote error]", err);
    return null;
  }
};

const stakeNativeToMarinade = async (amountSol: number): Promise<string | null> => {
  if (!address) return null;
  try {
    const lamports = Math.floor(amountSol * 1_000_000_000);
    const res = await getMarinadeNativeDepositTx(address, lamports, fullRpcUrl);
    
    if (!res.success || !res.transactionBase64) throw new Error(res.error);
    return await signAndBroadcastGaslessTx(
      res.transactionBase64,
      fullRpcUrl,
      res.extraSignerSecrets,
    );
  } catch (err: any) {
    console.error("[Marinade Native Staking Error]", err);
    return null;
  }
};

const fetchMarinadeNativeUnstakeQuote = async (amountSol: number): Promise<any | null> => {
  if (!address) return null;
  try {
    const lamports = Math.floor(amountSol * 1_000_000_000);
    const res = await getMarinadeNativeUnstakeTx(address, lamports, fullRpcUrl);
    return res.success ? res : null;
  } catch (err) {
    console.error("[fetchMarinadeNativeUnstakeQuote error]", err);
    return null;
  }
};

const unstakeNativeFromMarinade = async (amountSol: number): Promise<string | null> => {
  if (!address) return null;
  try {
    const lamports = Math.floor(amountSol * 1_000_000_000);
    const res = await getMarinadeNativeUnstakeTx(address, lamports, fullRpcUrl);
    
    if (!res.success || !res.transactionBase64) throw new Error(res.error);
    return await signAndBroadcastGaslessTx(res.transactionBase64, fullRpcUrl);
  } catch (err) {
    console.error("Native Unstake Error:", err);
    return null;
  }
};

const withdrawNativeStake = async (stakeAccountAddress: string, lamports: number): Promise<string | null> => {
  if (!address) return null;
  try {
    const res = await getNativeWithdrawTx(address, stakeAccountAddress, lamports, fullRpcUrl);
    
    if (!res.success || !res.transactionBase64) throw new Error(res.error);
    return await signAndBroadcastGaslessTx(res.transactionBase64, fullRpcUrl);
  } catch (err) {
    console.error("Withdraw Error:", err);
    return null;
  }
};

const fetchMarinadeUsdcDepositQuote = async (amountUsdc: number): Promise<any | null> => {
  if (!address) return null;
  try {
    const res = await getMarinadeUsdcDepositTx(address, amountUsdc, fullRpcUrl);
    return res.success ? res : null;
  } catch (err) {
    console.error("[fetchMarinadeUsdcDepositQuote error]", err);
    return null;
  }
};

const depositUsdcToMarinade = async (amountUsdc: number): Promise<string | null> => {
  if (!address) return null;
  try {
    const res = await getMarinadeUsdcDepositTx(address, amountUsdc, fullRpcUrl);

    if (!res.success || !res.transactionBase64s || res.transactionBase64s.length === 0) throw new Error(res.error);
    return await signAndBroadcastGaslessTx(res.transactionBase64s, fullRpcUrl);
  } catch (err: any) {
    console.error("[Marinade USDC Deposit Error]", err);
    return null;
  }
};

const fetchMarinadeUsdcWithdrawQuote = async (amountUsdc: number): Promise<any | null> => {
  if (!address) return null;
  try {
    const res = await getMarinadeUsdcWithdrawTx(address, amountUsdc, fullRpcUrl);
    return res.success ? res : null;
  } catch (err) {
    console.error("[fetchMarinadeUsdcWithdrawQuote error]", err);
    return null;
  }
};

const withdrawUsdcFromMarinade = async (sharesToWithdraw: number): Promise<string | null> => {
  if (!address) return null;
  try {
    const res = await getMarinadeUsdcWithdrawTx(address, sharesToWithdraw, fullRpcUrl);

    if (!res.success || !res.transactionBase64s || res.transactionBase64s.length === 0) throw new Error(res.error);
    return await signAndBroadcastGaslessTx(res.transactionBase64s, fullRpcUrl);
  } catch (err: any) {
    console.error("[Marinade USDC Withdraw Error]", err);
    return null;
  }
};

const claimUsdcFromMarinade = async (estimatedRewardUsd: number): Promise<string | null> => {
  if (!address) return null;
  try {
    const res = await getMarinadeUsdcClaimTx(address, fullRpcUrl, estimatedRewardUsd);
    
    if (!res.success || !res.transactionBase64s || res.transactionBase64s.length === 0) {
      throw new Error(res.error || "Failed to generate claim instructions");
    }

    const sig = await signAndBroadcastGaslessTx(res.transactionBase64s, fullRpcUrl);
    
    console.log(`USDC Farm Claim Success: ${sig}`);
    return sig;
  } catch (err: any) {
    console.error("[Marinade USDC Claim Error]", err);
    return null;
  }
};

const signAndBroadcastGaslessTx = async (
  transactionBase64: string | string[],
  rpcUrl: string,
  extraSignerSecrets?: string[]
): Promise<string> => {
  const conn = new Connection(rpcUrl, "confirmed");
  
  const base64Array = Array.isArray(transactionBase64) ? transactionBase64 : [transactionBase64];
  const vtxs = base64Array.map(b64 => VersionedTransaction.deserialize(Buffer.from(b64, "base64")));

  // Catch a transaction that would fail onchain *before* asking the wallet to sign it —
  // per Phantom's own guidance, letting a doomed transaction reach signTransaction is
  // exactly what can trigger their "this dApp could be malicious" simulation warning.
  // sigVerify:false since nothing has signed yet at this point (see buildGaslessTx in
  // marinade-stake.ts) — we only care whether the instructions themselves would succeed.
  for (const vtx of vtxs) {
    const sim = await conn.simulateTransaction(vtx, { sigVerify: false });
    if (sim.value.err) {
      throw new Error(`Transaction would fail onchain: ${JSON.stringify(sim.value.err)}`);
    }
  }

  let signedVtxs: VersionedTransaction[] = [];

  if (walletType === "walletconnect" && akProvider) {
    for (const vtx of vtxs) {
      const signed = await (akProvider as any).signTransaction(vtx);
      signedVtxs.push(signed);
    }
  } else {
    const signAllFeature = currentWallet?.features["solana:signAllTransactions"] as any;
    const signFeature = currentWallet?.features["solana:signTransaction"] as any;

    if (vtxs.length > 1 && signAllFeature) {
      const signedResults = await signAllFeature.signAllTransactions({
        transactions: vtxs.map(v => v.serialize()),
        account: currentAccount!,
      });
      
      signedVtxs = signedResults.map((res: any) => 
        VersionedTransaction.deserialize(new Uint8Array(res.signedTransaction))
      );
    } else {

      for (const vtx of vtxs) {
        const signedResult = await signFeature.signTransaction({
          transaction: vtx.serialize(),
          account: currentAccount!,
        });

        const signed = Array.isArray(signedResult) ? signedResult[0] : signedResult;
        const raw = signed instanceof Uint8Array ? signed : signed?.signedTransaction;
        
        if (!raw) throw new Error("Failed to extract signed transaction bytes");
        signedVtxs.push(VersionedTransaction.deserialize(new Uint8Array(raw)));
      }
    }
  }


  // Broadcast via the server action, which adds the relayer's signature only now — after
  // the user's own signature is already on the transaction (see buildGaslessTx's comment).
  let lastSig = "";
  for (const signedVtx of signedVtxs) {
    const result = await broadcastGaslessTx(
      Buffer.from(signedVtx.serialize()).toString("base64"),
      rpcUrl,
      extraSignerSecrets,
    );
    if (!result.success || !result.signature) throw new Error(result.error || "Broadcast failed");
    lastSig = result.signature;
  }

  return lastSig;
};



  const fetchGaslessSendQuote = async (
    recipientAddress: string,
    mintAddress: string,
    amountUi: number,
    decimals: number
  ): Promise<any | null> => {
    if (!address) return null;
    try {
      // Direct Server Action Call
      const data = await prepareGaslessSendTx({
        senderAddress: address, 
        recipientAddress,
        mintAddress,
        amountUi,
        decimals,
        rpcUrl: fullRpcUrl
      });
      
      if (!data.success) throw new Error(data.error);
      return data; 
    } catch (err) {
      console.error("fetchGaslessSendQuote error:", err);
      return null;
    }
  };

  const executeGaslessSend = async (transactionBase64: string): Promise<string | null> => {
    if (!address) return null;
    try {
      const txBytes = Buffer.from(transactionBase64, "base64");
      const versionedTx = VersionedTransaction.deserialize(new Uint8Array(txBytes));

      // Same pre-flight as signAndBroadcastGaslessTx/executeSwap (see their comments) — this
      // is a third, separate relayer-sponsored signing path (prepareGaslessSendTx leaves the
      // relayer unsigned the same way), so it needs its own copy of the check too.
      const conn = new Connection(fullRpcUrl, "confirmed");
      const sim = await conn.simulateTransaction(versionedTx, { sigVerify: false });
      if (sim.value.err) {
        throw new Error(`Transaction would fail onchain: ${JSON.stringify(sim.value.err)}`);
      }

      let signedTxBase64 = "";
      
      // 1. User Wallet Signature
      if (walletType === "walletconnect" && akProvider) {
        const signedTx = await (akProvider as any).signTransaction(versionedTx);
        signedTxBase64 = Buffer.from(signedTx.serialize()).toString("base64");
      } else {
        const signFeature = currentWallet?.features["solana:signTransaction"] as any;
        if (!signFeature) throw new Error("Wallet lacks signTransaction");

        const signedResult = await signFeature.signTransaction({
          transaction: versionedTx.serialize(),
          account: currentAccount!,
        });

        let raw: Uint8Array | undefined = undefined;
        if (Array.isArray(signedResult)) raw = signedResult[0]?.signedTransaction;
        else if (signedResult instanceof Uint8Array) raw = signedResult;
        else if (signedResult && (signedResult as any).signedTransaction) raw = (signedResult as any).signedTransaction;
        
        if (!raw) throw new Error("Transaction cancelled by user");
        signedTxBase64 = Buffer.from(raw).toString("base64");
      }

      // 2. Direct Server Action Call to Broadcast
      const broadcastData = await broadcastGaslessSendTx({
        signedTransactionBase64: signedTxBase64,
        rpcUrl: fullRpcUrl
      });

       if (!broadcastData.success) throw new Error(broadcastData.error);

      return broadcastData.signature || null;
    } catch (err: any) {
      console.error("executeGaslessSend error:", err);
      return null;
    }
  };



const fetchSwapQuote = async (
    inputMint: string,
    outputMint: string,
    amountInSmallestUnit: number,
    inputAmountUi: number,
    swapMode: "ExactIn" | "ExactOut" = "ExactIn",
    inputDecimals: number = 9,
    signal?: AbortSignal,
  ): Promise<any | null> => {
    try {
      if (!inputAmountUi) throw new Error("amountUi is required");
      if (signal?.aborted) return null;

      const isNativeSolIn = inputMint === SOLANA_NATIVE_MINT || inputMint === "So11111111111111111111111111111111111111112";
      const isNativeSolOut = outputMint === SOLANA_NATIVE_MINT || outputMint === "So11111111111111111111111111111111111111112";

      const ataResult = await withTimeout(Promise.all([
        isNativeSolIn ? Promise.resolve(false) : checkAtaRequired(PARADAPP_FEE_VAULT_SOLANA, inputMint),
        isNativeSolOut || !address ? Promise.resolve(false) : checkAtaRequired(address, outputMint)
      ]), 15000, signal);
      if (signal?.aborted) return null;
      if (!ataResult) throw new Error("Timed out checking token accounts, the RPC node may be unresponsive.");
      const [needsInputAta, needsOutputAta] = ataResult;

      // getGaslessQuoteAndFee makes several uncached RPC calls (mint/rent lookups,
      // prioritization fees) on top of its own already-timeout-guarded Jupiter fetches — this
      // is the other half of the hang this component's isCancelled guard alone can't fix (see
      // withTimeout's comment above): a slow RPC node here left isFetchingQuote stuck forever.
      // Note: `signal` is NOT passed as an argument to getGaslessQuoteAndFee itself — it's a
      // 'use server' export, so calling it from here is a Next.js Server Action RPC, and a raw
      // AbortSignal object doesn't survive that serialization (it deserializes into something
      // that isn't really an AbortSignal, which throws once it reaches AbortSignal.any
      // downstream). withTimeout still races the *call* against the signal client-side below —
      // that only stops this function from waiting on it, it can't cancel the in-flight request
      // itself once it's crossed into the server action.
      const feeRes = await withTimeout(getGaslessQuoteAndFee(
        inputMint,
        outputMint,
        inputAmountUi,
        amountInSmallestUnit,
        needsInputAta,
        needsOutputAta,
        fullRpcUrl,
        swapMode,
        inputDecimals
      ), 15000, signal);

      if (signal?.aborted) return null;
      if (!feeRes) throw new Error("Timed out fetching swap quote, please try again.");
      if (!feeRes.success || !feeRes.quote) throw new Error(feeRes.error || "Failed to fetch quote");

      feeRes.quote.appliedFee = feeRes.appliedFee;
      feeRes.quote.needsInputAta = needsInputAta;
      feeRes.quote.inputDecimals = feeRes.decimals;
      feeRes.quote.networkFeeUi = feeRes.networkFeeUi;
      feeRes.quote.ataFeeUi = feeRes.ataFeeUi;
      feeRes.quote.platformFeeUi = feeRes.platformFeeUi;

      return { success: true, quote: feeRes.quote }; 
    } catch (err) {

      console.error("[SolanaProvider] fetchSwapQuote error:", err);
      return { success: false, error: err instanceof Error ? err.message : "Unknown quote error" }; 
    }
  };

  const executeSwap = async (
    quoteResponse: any,
    inputMint: string,
    isUltraFast: boolean = true
  ): Promise<string | null> => {
    if (!address) return null;
    
    try {
      const conn = new Connection(fullRpcUrl, "confirmed");
      const isNativeSol = inputMint === SOLANA_NATIVE_MINT || inputMint === "So11111111111111111111111111111111111111112";
      
      let tokenProgramId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
      if (!isNativeSol) {
        const mintInfo = await conn.getAccountInfo(new PublicKey(inputMint));
        if (mintInfo) tokenProgramId = mintInfo.owner.toBase58();
      }

      const response = await getAtomicGaslessSwapTx(
        address,
        quoteResponse,
        quoteResponse.appliedFee,
        quoteResponse.needsInputAta,
        inputMint,
        quoteResponse.inputDecimals,
        tokenProgramId,
        fullRpcUrl,
        isUltraFast
      );

      if (!response.success || !response.transactionBase64) {
        throw new Error(response.error || "Server failed to build swap transaction");
      }

      const txBytes = Buffer.from(response.transactionBase64, "base64");
      const versionedTx = VersionedTransaction.deserialize(new Uint8Array(txBytes));

      // Same pre-flight as signAndBroadcastGaslessTx (see its comment) — this path builds and
      // signs its own transaction separately from that shared helper, so it needs its own copy
      // of the simulate-before-sign check rather than inheriting one. sigVerify:false since
      // nothing has signed yet (getAtomicGaslessSwapTx leaves the relayer's signature off, see
      // its "❌ REMOVED" comment) — this was missing here even after that fix landed elsewhere,
      // which is why Swap kept triggering Phantom's warning after Stake was already resolved.
      const sim = await conn.simulateTransaction(versionedTx, { sigVerify: false });
      if (sim.value.err) {
        throw new Error(`Transaction would fail onchain: ${JSON.stringify(sim.value.err)}`);
      }

      if (walletType === "walletconnect" && akProvider) {
        const signedTx = await (akProvider as any).signTransaction(versionedTx);

        const broadcastResult = await broadcastSwapTx(
          Buffer.from(signedTx.serialize()).toString("base64"),
          fullRpcUrl
        );
        if (!broadcastResult.success) throw new Error(broadcastResult.error);
        return broadcastResult.signature || null;
      }

      const signFeature = currentWallet?.features["solana:signTransaction"] as any;
      if (!signFeature) throw new Error("Wallet lacks signTransaction feature");

      const signedResult = await signFeature.signTransaction({
        transaction: versionedTx.serialize(),
        account: currentAccount!,
      });

      let raw: Uint8Array | undefined = undefined;

      if (Array.isArray(signedResult)) {
        raw = signedResult[0]?.signedTransaction;
      } else if (signedResult instanceof Uint8Array) {
        raw = signedResult;
      } else if (signedResult && (signedResult as any).signedTransaction) {
        raw = (signedResult as any).signedTransaction;
      }
      
      if (!raw) throw new Error("Transaction cancelled by user");

      const broadcastResult = await broadcastSwapTx(
        Buffer.from(raw).toString("base64"),
        fullRpcUrl
      );

      if (!broadcastResult.success) throw new Error(broadcastResult.error);

      return broadcastResult.signature || null;

    } catch (err: any) {
      console.error("[Jupiter Swap Error]", err);
      return null;
    }
  };

const fetchTokenMeta = async (query: string): Promise<any | null> => {
  try {
    const response = await searchJupiterToken(query);
    
    if (!response.success) {
      return null;
    }

    return {
      mint: response.mint,
      symbol: response.symbol,
      name: response.name,
      decimals: response.decimals,
      icon: response.icon 
    };
  } catch (err) {
    console.error("[SolanaProvider] fetchTokenMeta error:", err);
    return null; 
  }
};

// const fetchVerifiedTokens = async (): Promise<any[]> => {
//   try {
//     const response = await getJupiterVerifiedTokens();
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




const fetchStockAssets = async (): Promise<any[]> => {
  try {
    const response = await getStockAssets();
    
  
    if (response.success && Array.isArray(response.stocks)) {
      return response.stocks;
    }
    
    return [];
  } catch (err) {
    console.error("[SolanaProvider] fetchStockAssets error:", err);
    return [];
  }
};

const IPOW_PROGRAM_ID = new PublicKey("EsmGbkui9ZFC6Fch9J6xoyNRZSp6TwfvcjS88beP1Vem");

const getAnchorProgram = () => {
    const conn = new Connection(fullRpcUrl, "confirmed");
    
    const activePublicKey = address ? new PublicKey(address) : PublicKey.default;

    const wallet = {
      publicKey: activePublicKey,
      signTransaction: async (tx: Transaction) => tx,
      signAllTransactions: async (txs: Transaction[]) => txs,
    };

    const provider = new AnchorProvider(conn, wallet as any, { 
      preflightCommitment: "confirmed" ,
       skipPreflight: false, 
    });
    
    return new Program(idl as anchor.Idl, provider) as unknown as Program<Ipow>;
  };


  const ipowPriceCache = useRef({ solPriceUsd: 0, btcPriceUsd: 0, lastFetched: 0 });

  const fetchIpowMarketPrices = async () => {
    if (Date.now() - ipowPriceCache.current.lastFetched < 30000) {
      return ipowPriceCache.current;
    }
    try {
      const [solRes, btcRes] = await Promise.all([
        fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT").then(r => r.json()),
        fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT").then(r => r.json())
      ]);
      ipowPriceCache.current = {
        solPriceUsd: parseFloat(solRes.price),
        btcPriceUsd: parseFloat(btcRes.price),
        lastFetched: Date.now(),
      };
      return ipowPriceCache.current;
    } catch (error) {
      const cgResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin&vs_currencies=usd");
      const cgData = await cgResponse.json();
      return { solPriceUsd: cgData.solana.usd, btcPriceUsd: cgData.bitcoin.usd };
    }
  };

  const estimateBitcoinFromNative = async (solAmount: number): Promise<string | null> => {
    try {
      const { solPriceUsd, btcPriceUsd } = await fetchIpowMarketPrices();
      const btcAmount = (solAmount * solPriceUsd) / btcPriceUsd;
      return Math.floor(btcAmount * 1e8).toString();
    } catch (e) { return null; }
  };

  const estimateNativeFromBitcoin = async (btcSats: string): Promise<string | null> => {
    try {
      const { solPriceUsd, btcPriceUsd } = await fetchIpowMarketPrices();
      const solAmount = ((Number(btcSats) / 1e8) * btcPriceUsd) / solPriceUsd;
      return solAmount.toFixed(9); 
    } catch (e) { return null; }
  };


  const signAndSendIpowTx = async (transaction: Transaction, conn: Connection): Promise<string> => {
    if (!address) throw new Error("Wallet not connected");

    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey(address),
      recentBlockhash: transaction.recentBlockhash!,
      instructions: transaction.instructions,
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(messageV0);

    if (walletType === "walletconnect" && akProvider) {
      const signedTx = await (akProvider as any).signTransaction(versionedTx);
      return await conn.sendRawTransaction(signedTx.serialize(), { 
        skipPreflight: false, 
        preflightCommitment: "confirmed" 
      });
    } else {
      const signFeature = currentWallet?.features["solana:signTransaction"] as any;
      if (!signFeature) throw new Error("Wallet lacks signTransaction feature");

      const signedResult = await signFeature.signTransaction({
        transaction: versionedTx.serialize(), 
        account: currentAccount!,
      });

      const signed = Array.isArray(signedResult) ? signedResult[0] : signedResult;
      const raw = signed instanceof Uint8Array ? signed : signed?.signedTransaction;
      
      if (!raw) throw new Error("Failed to extract signed transaction");

      return await conn.sendRawTransaction(raw, { 
          skipPreflight: false, 
          preflightCommitment: "confirmed" 
      });
    }
  };

 const commitNativeToBitcoin = async (
    userProgram: string,
    solAmount: number,
    bitcoinAmountSats: number,
    destination?: { networkId: number; networkAddress: string }
  ) => {
    if (!address) return null;
    try {
      const program = getAnchorProgram();
      const conn = program.provider.connection;
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

      const isCrossChain = destination && destination.networkId > 0;
      const finalNetworkId = isCrossChain ? destination.networkId : 0;
      const finalNetworkAddress = isCrossChain ? Array.from(Buffer.from(destination.networkAddress.replace("0x", ""), 'hex')) : [];
      const finalUserProgram = isCrossChain ? [] : Array.from(Buffer.from(userProgram.replace("0x", ""), 'hex'));

      const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], IPOW_PROGRAM_ID);
      const [escrowVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("escrow")], IPOW_PROGRAM_ID);
      const globalState = await program.account.globalState.fetch(globalStatePda);
      const txIdBN = new BN(globalState.nextTxId.toString());
      
      const [conversionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("conversion"), Buffer.from(txIdBN.toArrayLike(Buffer, "le", 8))],
        IPOW_PROGRAM_ID
      );

      const networkConfigPda = finalNetworkId > 0 
        ? PublicKey.findProgramAddressSync(
            [Buffer.from("network"), new BN(finalNetworkId).toArrayLike(Buffer, "le", 8)], 
            IPOW_PROGRAM_ID
          )[0]
        : null;

      const ix = await program.methods.commitNativeToBitcoin(
        new BN(lamports.toString()),
        new BN(bitcoinAmountSats.toString()),
        new BN(finalNetworkId.toString()),
        Buffer.from(finalNetworkAddress) as any, 
        Buffer.from(finalUserProgram) as any
      ).accounts({
        globalState: globalStatePda,
        escrowVault: escrowVaultPda,
        conversion: conversionPda,
        networkConfig: networkConfigPda,
        user: new PublicKey(address),
        systemProgram: SystemProgram.programId, 
      } as any).instruction(); 

      const transaction = new Transaction().add(ix);
      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(address);

      return await signAndSendIpowTx(transaction, conn);
    } catch (e) {
      console.error("Solana commitNativeToBitcoin error:", e);
      return null;
    }
  };

const commitBitcoinToNative = async (
    btcSats: string | number,
    solAmount: number,
    userProgram: string,
  ) => {
    if (!address) return null;
    try {
      const program = getAnchorProgram();
      const conn = program.provider.connection;
    
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
      
      const finalUserProgram = Buffer.from(userProgram.replace("0x", ""), 'hex');
      const emptyNetworkAddress = Buffer.from([]);

      const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], IPOW_PROGRAM_ID);
      const globalState = await program.account.globalState.fetch(globalStatePda);
      
      const [escrowVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("escrow")], IPOW_PROGRAM_ID);
      
      const txIdBN = new BN(globalState.nextTxId.toString());
      const [conversionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("conversion"), 
          txIdBN.toArrayLike(Buffer, "le", 8)
        ],
        IPOW_PROGRAM_ID
      );

      const ix = await program.methods.commitBitcoinToNative(
        new BN(btcSats.toString()),         
        new BN(lamports.toString()),       
        new BN(0),                        
        emptyNetworkAddress,                
        finalUserProgram              
      ).accounts({
        globalState: globalStatePda,
        escrowVault: escrowVaultPda,
        conversion: conversionPda,
        user: new PublicKey(address),
        systemProgram: SystemProgram.programId,
      } as any).instruction();


      const transaction = new Transaction().add(ix);
      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(address);

      return await signAndSendIpowTx(transaction, conn);
    } catch (error) {
      console.error("Solana commitBitcoinToNative error:", error);
      return null;
    }
  };
  const depositApprovedConversion = async (txIdNum: number | string | bigint) => {
    if (!address) return null;
    try {
      const program = getAnchorProgram();
      const conn = program.provider.connection;
      const txIdBN = new BN(txIdNum.toString());

      const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], IPOW_PROGRAM_ID);
      const [escrowVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("escrow")], IPOW_PROGRAM_ID);
      const [conversionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("conversion"), txIdBN.toArrayLike(Buffer, "le", 8)],
        IPOW_PROGRAM_ID
      );

      const ix = await program.methods.depositApprovedConversion()
        .accounts({
          globalState: globalStatePda,
          escrowVault: escrowVaultPda,
          conversion: conversionPda,
          user: new PublicKey(address),
          systemProgram: SystemProgram.programId, 
        } as any).instruction();

      const transaction = new Transaction().add(ix);
      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(address);

      return await signAndSendIpowTx(transaction, conn);
    } catch (e) {
      // console.error("Solana depositApprovedConversion error:", e);
      return null;
    }
  };

  const refundIfNotApproved = async (txIdNum: number | string | bigint) => {
    if (!address) return null;
    try {
      const program = getAnchorProgram();
      const conn = program.provider.connection;
      const txIdBN = new BN(txIdNum.toString());

      const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], IPOW_PROGRAM_ID);
      const [escrowVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("escrow")], IPOW_PROGRAM_ID);
      const [conversionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("conversion"), txIdBN.toArrayLike(Buffer, "le", 8)],
        IPOW_PROGRAM_ID
      );

      const ix = await program.methods.refundIfNotApproved()
        .accounts({
          globalState: globalStatePda,
          escrowVault: escrowVaultPda,
          conversion: conversionPda,
          user: new PublicKey(address),
          systemProgram: SystemProgram.programId, 
        } as any).instruction();

      const transaction = new Transaction().add(ix);
      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(address);

      return await signAndSendIpowTx(transaction, conn);
    } catch (e) {
      console.error("Solana refundIfNotApproved error:", e);
      return null;
    }
  };
  
const claimNativeAfterOperatorExpired = async (txIdNum: number | string | bigint) => {
    if (!address) return null;
    try {
      const program = getAnchorProgram();
      const conn = program.provider.connection;
      const txIdBN = new BN(txIdNum.toString());

      const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], IPOW_PROGRAM_ID);
      const [escrowVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("escrow")], IPOW_PROGRAM_ID);
      
      const [conversionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("conversion"), Buffer.from(txIdBN.toArrayLike(Buffer, "le", 8))],
        IPOW_PROGRAM_ID
      );

      const ix = await program.methods.claimNativeAfterOperatorExpired()
        .accounts({
          globalState: globalStatePda,
          escrowVault: escrowVaultPda,
          conversion: conversionPda,
          user: new PublicKey(address),
          systemProgram: SystemProgram.programId, 
        } as any).instruction();

      const transaction = new Transaction().add(ix);
      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(address);

      return await signAndSendIpowTx(transaction, conn);
    } catch (e) {
      console.error("Solana claimNativeAfterOperatorExpired error:", e);
      return null;
    }
  };

const refundAfterNoProofNativeToBitcoin = async (txIdNum: number | string | bigint) => {
    if (!address) return null;
    try {
      const program = getAnchorProgram();
      const conn = program.provider.connection;
      const txIdBN = new BN(txIdNum.toString());

      const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], IPOW_PROGRAM_ID);
      const [escrowVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("escrow")], IPOW_PROGRAM_ID);
      
      const [conversionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("conversion"), Buffer.from(txIdBN.toArrayLike(Buffer, "le", 8))],
        IPOW_PROGRAM_ID
      );

      const globalState = await program.account.globalState.fetch(globalStatePda);

      const ix = await program.methods.refundAfterNoProofNativeToBitcoin()
        .accounts({
          globalState: globalStatePda,
          escrowVault: escrowVaultPda,
          conversion: conversionPda,
          operator: globalState.operator,
          systemProgram: SystemProgram.programId,
        } as any).instruction();

      const transaction = new Transaction().add(ix);
      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(address);

      return await signAndSendIpowTx(transaction, conn);
    } catch (e) {
      console.error("Solana refundAfterNoProofNativeToBitcoin error:", e);
      return null;
    }
  };


  const calculatePhase = (data: any, globalTipHeight: number, now: number): number => {
    const DEPOSIT_BLOCKS_WINDOW = 10;
    const PROOF_BLOCKS_WINDOW = 40;
    const APPROVAL_WINDOW_SEC = 15 * 60;

    const status = data.status;
    const createdAt = data.createdAt.toNumber();
    const dutyExpiresAt = data.operatorDutyExpiresAt.toNumber();
    const windowStartHeight = data.windowStartHeight.toNumber();

    if (!status || status.none) return TxPhase.NONE;
    
    if (status.committed) {
        return now > createdAt + APPROVAL_WINDOW_SEC 
            ? TxPhase.OPERATOR_APPROVAL_EXPIRED 
            : TxPhase.WAITING_OPERATOR_APPROVAL;
    } 
    else if (status.approved) {
        if (data.isNativeToBitcoin) {
            const depositExpiresAtHeight = windowStartHeight + DEPOSIT_BLOCKS_WINDOW - 1;
            return (data.windowStarted && globalTipHeight > depositExpiresAtHeight) 
                ? TxPhase.USER_ACTION_EXPIRED 
                : TxPhase.WAITING_USER_ACTION;
        } else {
            return (dutyExpiresAt > 0 && now > dutyExpiresAt) 
                ? TxPhase.OPERATOR_DUTY_EXPIRED 
                : TxPhase.ACTIVE_WAITING_PROOF;
        }
    } 
    else if (status.deposited) {
        const proofExpiresAtHeight = windowStartHeight + PROOF_BLOCKS_WINDOW - 1;
        return (data.windowStarted && globalTipHeight > proofExpiresAtHeight) 
            ? TxPhase.OPERATOR_DUTY_EXPIRED 
            : TxPhase.ACTIVE_WAITING_PROOF;
    } 
    else if (status.completed) return TxPhase.COMPLETED;
    else if (status.refunded) return TxPhase.REFUNDED;

    return TxPhase.NONE;
  };

  const getMyTxIds = async (
    phase: number = 0,
    typeFilter: number = 0,
    bitcoinProgramFilter: string = "",
    isUserBitcoinProgramFilter: boolean = true
  ): Promise<string[]> => {
    try {
      if (!address && !bitcoinProgramFilter) return [];
      const program = getAnchorProgram();
      
     
      const allConversions = await program.account.conversion.all();
      let filtered = allConversions;

    
      if (bitcoinProgramFilter && bitcoinProgramFilter !== "") {
        const expectedHex = bitcoinProgramFilter.replace(/^0x/, "").toLowerCase();
        
        filtered = filtered.filter(acc => {
          const progBuf = isUserBitcoinProgramFilter 
            ? acc.account.userProgram 
            : acc.account.ipowReceiveProgram;
          const progHex = Buffer.from(progBuf).toString('hex').toLowerCase();
          return progHex === expectedHex;
        });
      } else {
        filtered = filtered.filter(acc => acc.account.user.toBase58() === address);
      }

      if (typeFilter === 1) {
        filtered = filtered.filter(acc => acc.account.isNativeToBitcoin === true);
      } else if (typeFilter === 2) {
        filtered = filtered.filter(acc => acc.account.isNativeToBitcoin === false);
      }

      if (phase !== 0) {
        const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], IPOW_PROGRAM_ID);
        const globalState = await program.account.globalState.fetch(globalStatePda);
        const globalTipHeight = globalState.globalTipHeight.toNumber();
        const now = Math.floor(Date.now() / 1000);

        filtered = filtered.filter(acc => calculatePhase(acc.account, globalTipHeight, now) === phase);
      }

      filtered.sort((a, b) => b.account.txId.toNumber() - a.account.txId.toNumber());

      return filtered.map((acc) => acc.account.txId.toString());
      
    } catch (error) {
      console.error("Error fetching Solana Tx IDs:", error);
      return [];
    }
  };


const getConversion = async (txId: number | string | bigint) => {
    try {
      const program = getAnchorProgram();
      
      const txIdBN = new BN(txId.toString());
      const [conversionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("conversion"), Buffer.from(txIdBN.toArray("le", 8))],
        IPOW_PROGRAM_ID
      );

      const [globalStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("global_state")],
        IPOW_PROGRAM_ID
      );

      const [data, globalState] = await Promise.all([
        program.account.conversion.fetch(conversionPda),
        program.account.globalState.fetch(globalStatePda)
      ]);

      const now = Math.floor(Date.now() / 1000);
      const globalTipHeight = globalState.globalTipHeight.toNumber();
      const phaseNumber = calculatePhase(data, globalTipHeight, now);
      console.log("memek",data.user.toBase58());
      return {
        id: data.txId.toString(),
        user: data.user.toBase58(),
        
        nativeAmount: data.nativeAmount.toString(),
        bitcoinAmount: data.bitcoinAmount.toString(),
        reservedNative: data.reservedNative.toString(), 
        
        userProgram: "0x" + Buffer.from(data.userProgram).toString("hex"),
        ipowReceiveProgram: "0x" + Buffer.from(data.ipowReceiveProgram).toString("hex"),
        
        networkAddress: "0x" + Buffer.from(data.networkAddress).toString("hex"),
        
        networkId: data.networkId.toNumber(),
        isNativeToBitcoin: data.isNativeToBitcoin,
        
        phase: phaseNumber, 
        createdAt: data.createdAt.toString(), 
        operatorDutyExpiresAt: data.operatorDutyExpiresAt.toString() 
      };

    } catch (error) {
      console.warn(`Could not fetch conversion ${txId}:`, error);
      return null;
    }
  };

  // This effect only actually needs to know WHICH mints are held (to know what to price),
  // not their amounts/prices/symbols — but depending on `balance.tokens` directly means it
  // reruns on every price tick too (enrichTokenData legitimately gives that array a new
  // reference whenever a price moves), turning its own 60s interval into an effective 15s
  // one. Deriving a primitive signature of just the held mint set lets the effect below
  // depend on "did my holdings change" instead of "did balance.tokens get a new reference".
  const heldMintsSignature = useMemo(() => {
    return (balance?.tokens || [])
      .filter((t: any) => t.amount > 0)
      .map((t: any) => t.mint)
      .sort()
      .join(",");
  }, [balance?.tokens]);

  useEffect(() => {
    if (!isMainnet) return;

    const fetchGlobalTokenData = async () => {
      try {
        let currentVerifiedTokens = verifiedTokensData;


        if (currentVerifiedTokens.length <= 2) {
          const tokensRes = await getJupiterVerifiedTokens();
          if (tokensRes.success && Array.isArray(tokensRes.tokens)) {
            currentVerifiedTokens = tokensRes.tokens.map((t: any) => ({
              id: t.id,
              mint: t.id,
              symbol: t.symbol,
              name: t.name,
              icon: t.icon,
              decimals: t.decimals,
            }));
            setVerifiedTokensData(currentVerifiedTokens);
          }
        }

        const mintsToFetch = new Set<string>();
        
        mintsToFetch.add(SOLANA_NATIVE_MINT);

        if (balance?.tokens && balance.tokens.length > 0) {
          balance.tokens.forEach((t: any) => {
            if (t.amount > 0) mintsToFetch.add(t.mint);
          });
        }

        if (selfCustodyParameter?.tokens && selfCustodyParameter.tokens.length > 0) {
          selfCustodyParameter.tokens.forEach((ct) => {
            const foundMeta = currentVerifiedTokens.find(
              (v: any) => v.symbol.toUpperCase() === ct.token.toUpperCase() || v.mint === ct.token
            );
            if (foundMeta) mintsToFetch.add(foundMeta.mint);
          });
        }

        if (mintsToFetch.size > 0) {
          const priceRes = await getJupiterPrices(Array.from(mintsToFetch).slice(0, 50));
          if (priceRes.success && priceRes.prices) {
            setLiveTokenPrices(priceRes.prices);
          }
        }
      } catch (err) {
        // console.error("[SolanaProvider] Failed to fetch global token data:", err);
      }
    };

 
    fetchGlobalTokenData();


    const interval = setInterval(fetchGlobalTokenData, 60000);
    return () => clearInterval(interval);

    // balance?.tokens is intentionally omitted — heldMintsSignature (derived from it) is
    // the dependency that should actually govern this effect's re-runs; see its comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMainnet, heldMintsSignature, selfCustodyParameter, verifiedTokensData]);


  useEffect(() => {
    const netKey = isMainnet ? "mainnet" : "testnet";
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
  }, [akConnected, allAccounts, akProvider, isMainnet, address, walletType]);

  useEffect(() => {
    const fetchDapps = async () => {
      try {
        const addressQuery = address ? `&walletAddress=${address}` : "";
        const response = await fetch(
          `/api/dapphub/list?network=SOLANA${addressQuery}`,
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
    setSelfCustodyParameter(prev => ({ ...prev, tokens: [], fetched: false }));

    let cancelled = false;
    let quickRetries = 0;
    const MAX_QUICK_RETRIES = 4;
    const QUICK_RETRY_DELAY_MS = 2000;

    const fetchSelfCustodyConstraints = async () => {
      try {
        const envMode = isMainnet ? "MAINNET" : "TESTNET";
        const response = await fetch(
          `/api/transaction/constraints/?network=SOLANA&env=${envMode}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );

        const data: CustodyParams = await response.json();
        if (cancelled) return;

        if (data && data.tokens) {
          const next = { ...data, fetched: true };
          // selfCustodyParameter is a dependency of the global-token-data effect further
          // below; publishing a freshly-parsed (but content-identical) object here every 5
          // minutes would retrigger that effect for no reason. Bail out when nothing about
          // the constraints actually changed.
          setSelfCustodyParameter(prev =>
            JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
          );
          return;
        }
      } catch (error) {
        // console.error("Failed to fetch SOLANA self-custody limits:", error);
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
    const wasConnected =
      localStorage.getItem(
        `solana_connected_${isMainnet ? "mainnet" : "testnet"}`,
      ) === "true";
    const savedWalletName = localStorage.getItem(
      `solana_wallet_${isMainnet ? "mainnet" : "testnet"}`,
    );
    const savedWalletType = localStorage.getItem(
      `solana_wallet_type_${isMainnet ? "mainnet" : "testnet"}`,
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
  }, [isMainnet]);
  useEffect(() => {
    fetchPrice();
    const i = setInterval(() => {
      fetchPrice();
    }, 60000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMainnet]);

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
        console.log(" Network settled. Fetching fresh balances now...");
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
          console.log(" Native SOL Account Changed! Debouncing fetch...");
          triggerDebouncedFetch();
        },
        { commitment: "confirmed" }
      );

      splSubId = conn.onProgramAccountChange(
        TOKEN_PROGRAM_ID,
        () => {
          console.log(" SPL Token Account Changed! Debouncing fetch...");
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
          console.log("Token-2022 Account Changed! Debouncing fetch...");
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
  

const initializeProtocol = async () => {
    if (!address) return alert("Connect wallet first!");
    
    try {
      const program = getAnchorProgram();
      const conn = program.provider.connection;
      const adminPubkey = new PublicKey(address);


      const [globalStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("global_state")], 
        IPOW_PROGRAM_ID
      );

      const [escrowVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow")], 
        IPOW_PROGRAM_ID
      );

      console.log("Initializing PDA at:", globalStatePda.toBase58());


      const initIx = await program.methods.initialize(
        adminPubkey,     
        50               
      )
      .accounts({
        globalState: globalStatePda,
        escrowVault: escrowVaultPda, 
        admin: adminPubkey,
        systemProgram: SystemProgram.programId,
      } as any)
      .instruction();

      const amountInLamports = new BN(2 * LAMPORTS_PER_SOL); 
      const addLiquidityIx = await program.methods.addLiquidity(amountInLamports)
      .accounts({
        globalState: globalStatePda,
        escrowVault: escrowVaultPda,
        operator: adminPubkey,
        systemProgram: SystemProgram.programId,
      } as any)
      .instruction();

      const transaction = new Transaction()
        .add(initIx)
        .add(addLiquidityIx);

      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = adminPubkey;

      const sig = await signAndSendIpowTx(transaction, conn);
      console.log(" Protocol Initialized & Funded! Tx Sig:", sig);
     
      
    } catch (error: any) {
      console.error("Init Error:", error);
      alert("Failed: " + error.message);
    }
};


const addSupportedNetwork = async (
    networkName: string,
    networkId: number,
    minAddrLen: number,
    maxAddrLen: number
  ): Promise<void> => {
    if (!address) return; 
    
    try {
      const program = getAnchorProgram();
      const conn = program.provider.connection;
      const adminPubkey = new PublicKey(address);

      const [globalStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("global_state")], 
        IPOW_PROGRAM_ID
      );


      const networkIdBuffer = new BN(networkId).toArrayLike(Buffer, "le", 8);
      const [networkConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("network"), networkIdBuffer], 
        IPOW_PROGRAM_ID
      );

      console.log(`Adding ${networkName} (ID: ${networkId}) at PDA:`, networkConfigPda.toBase58());

      const ix = await program.methods.addNetwork(
        new BN(networkId),
        minAddrLen,
        maxAddrLen
      )
      .accounts({
        globalState: globalStatePda,
        networkConfig: networkConfigPda,
        admin: adminPubkey,
        systemProgram: SystemProgram.programId,
      } as any)
      .instruction();

      const transaction = new Transaction().add(ix);
      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = adminPubkey;

      const sig = await signAndSendIpowTx(transaction, conn);
      
      console.log(` ${networkName} Configured! Tx Sig:`, sig);
      

    } catch (error: any) {
      console.error(`Error configuring ${networkName}:`, error);
      
    }
  };


  const anchorInfo = async (txIdNum: number | string | bigint) => {
    try {
      const program = getAnchorProgram();
      const txIdBN = new BN(txIdNum.toString());
      const [conversionPda] = PublicKey.findProgramAddressSync([Buffer.from("conversion"), Buffer.from(txIdBN.toArray("le", 8))], IPOW_PROGRAM_ID);
      const data = await program.account.conversion.fetch(conversionPda);
      return [data.windowStartHeight, data.epochStartHeight];
    } catch (e) { return null; }
  };

  const windowsFor = async (txIdNum: number | string | bigint) => {
    try {
      const program = getAnchorProgram();
      const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], IPOW_PROGRAM_ID);
      const globalState = await program.account.globalState.fetch(globalStatePda);
      const txIdBN = new BN(txIdNum.toString());
      const [conversionPda] = PublicKey.findProgramAddressSync([Buffer.from("conversion"), Buffer.from(txIdBN.toArray("le", 8))], IPOW_PROGRAM_ID);
      const data = await program.account.conversion.fetch(conversionPda);
      return [data.windowStarted, data.windowStartHeight, globalState.globalTipHeight];
    } catch (e) { return null; }
  };

const proofInfo = async (txIdNum: number | string | bigint) => {
    try {
      const program = getAnchorProgram();
      const txIdBN = new BN(txIdNum.toString());

      const txIdBuffer = txIdBN.toArrayLike(Buffer, "le", 8);

      const [proofCachePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("proof"), txIdBuffer], 
        IPOW_PROGRAM_ID
      );

      const [conversionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("conversion"), txIdBuffer], 
        IPOW_PROGRAM_ID
      );

      try {
 
        const pc = await program.account.proofCache.fetch(proofCachePda);


        let blockHashHex = "0x0000000000000000000000000000000000000000000000000000000000000000";
        try {
            const heightBuffer = pc.proofBlockHeight.toArrayLike(Buffer, "le", 8);
            const [headerPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("header"), heightBuffer],
                IPOW_PROGRAM_ID
            );
            

            const headerAcc = await program.account.globalHeader.fetch(headerPda);
            if (headerAcc && headerAcc.hashLe) {
                blockHashHex = "0x" + Buffer.from(headerAcc.hashLe).toString("hex");
            }
        } catch (e) {
          
        }

        return [
          pc.isSet,                       // [0] set
          pc.isVerified,                  // [1] verified
          pc.isInvalid,                   // [2] invalid
          pc.attempts,                    // [3] attempts
          "0x" + Buffer.from(pc.txidLe).toString("hex"), // [4] txidLE
          blockHashHex,                   // [5] blockHashLE 
          pc.proofBlockHeight.toString(), // [6] blockHeight 
          pc.outValueSats.toString(),     // [7] outValueSats
          "0x" + Buffer.from(pc.outProgram).toString("hex") // [8] outProgram
        ];

      } catch (cacheError) {
        const conv = await program.account.conversion.fetch(conversionPda);

        if (conv.proofVerified) {
            let fallbackBlockHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
            try {
                const heightBuffer = conv.proofBlockHeight.toArrayLike(Buffer, "le", 8);
                const [headerPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("header"), heightBuffer],
                    IPOW_PROGRAM_ID
                );
                const headerAcc = await program.account.globalHeader.fetch(headerPda);
                if (headerAcc && headerAcc.hashLe) {
                    fallbackBlockHash = "0x" + Buffer.from(headerAcc.hashLe).toString("hex");
                }
            } catch (e) {}

            const expectedProgram = conv.ipowReceiveProgram.length > 0 
                ? conv.ipowReceiveProgram 
                : conv.userProgram;

            return [
                true,  
                true,  
                false,
                1,     
                "0x" + Buffer.from(conv.proofTxidLe).toString("hex"), 
                fallbackBlockHash,
                conv.proofBlockHeight.toString(), 
                conv.bitcoinAmount.toString(),   
                "0x" + Buffer.from(expectedProgram).toString("hex") 
            ];
        }

        return [
          false, false, false, 0,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0", "0", "0x"
        ];
      }
    } catch (e) { 
      console.error("Solana proofInfo error:", e);
      return null; 
    }
  };

  const globalHeightToHashLE = async (height: bigint | number) => {
    try {
      const program = getAnchorProgram();
      const heightBN = new BN(height.toString());
      const [headerPda] = PublicKey.findProgramAddressSync([Buffer.from("header"), Buffer.from(heightBN.toArray("le", 8))], IPOW_PROGRAM_ID);
      const header = await program.account.globalHeader.fetch(headerPda);
      return "0x" + Buffer.from(header.hashLe).toString("hex");
    } catch (e) { 
      return "0x0000000000000000000000000000000000000000000000000000000000000000"; 
    }
  };

const submitBitcoinMerkleProofWithTx = async (
    txIdNum: number | string | bigint,
    rawTx: Uint8Array,
    voutIndex: number,
    blockHashLE: Uint8Array,
    blockHeight: number,
    branch: Uint8Array[],
    index: number
  ) => {
    if (!address) return null;
    try {
      const program = getAnchorProgram();
      const conn = program.provider.connection;
      const txIdBN = new BN(txIdNum.toString());
      const heightBN = new BN(blockHeight);

      const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], IPOW_PROGRAM_ID);
      const [escrowVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("escrow")], IPOW_PROGRAM_ID);
      
      const [conversionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("conversion"), Buffer.from(txIdBN.toArray("le", 8))], 
        IPOW_PROGRAM_ID
      );
      
      const [proofCachePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("proof"), Buffer.from(txIdBN.toArray("le", 8))], 
        IPOW_PROGRAM_ID
      );

      const [heightTrackerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tracker"), Buffer.from(heightBN.toArray("le", 8))], 
        IPOW_PROGRAM_ID
      );

      const [headerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("header"), Buffer.from(heightBN.toArray("le", 8))], 
        IPOW_PROGRAM_ID
      );
      
      const headerInfo = await conn.getAccountInfo(headerPda);
      const isHeaderPresent = headerInfo !== null;

     
      const globalState = await program.account.globalState.fetch(globalStatePda);
      const conversion = await program.account.conversion.fetch(conversionPda);


      const formattedBranch = branch.map(b => Array.from(b));


      const ix = await program.methods.submitBitcoinProofCache(
        Buffer.from(rawTx) as any,
        new BN(voutIndex),
        heightBN,
        formattedBranch as any,
        new BN(index)
      ).accounts({
        globalState: globalStatePda,
        escrowVault: escrowVaultPda,          
        conversion: conversionPda,
        proofCache: proofCachePda,       
        heightTracker: heightTrackerPda, 
        header: isHeaderPresent ? headerPda : null, 
        operator: globalState.operator,         
        user: conversion.user,                
        signer: new PublicKey(address),
        systemProgram: SystemProgram.programId
      } as any).instruction();

      const transaction = new Transaction().add(ix);
      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(address);

      return await signAndSendIpowTx(transaction, conn);
    } catch (e) {
      console.error("Solana submit proof cache error:", e);
      return null;
    }
  };




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
          id: `Solana adalah blockchain cepat dan skalabel untuk aplikasi modern. Dengan biaya sangat rendah dan throughput tinggi, Solana adalah jaringan yang ideal buat kamu yang mau menggunakan DeFi, NFT, dan dApp secara real-time.`,
        },
        selfCustodyParameter,
        ipowConvert: "testnet",
        ipowNetworkId: IPOW_NETWORK_ID,
        dappList,
        toggleFavoriteDapp,
        connect,
        disconnect,
        signMessage,
        switchWallet,
        sendTokenTo,
        checkAddress,
        isValidAddress,
        stakeToMarinade,
        unstakeFromMarinade,
        getMarinadeSOLData,
        stakeNativeToMarinade,
        unstakeNativeFromMarinade,
        withdrawNativeStake,
        depositUsdcToMarinade,
        withdrawUsdcFromMarinade,
        getMarinadeUSDCData,
        getMarinadeUsdcRewardHistory,
        getMarinadeUsdcTransactionHistory,
        claimUsdcFromMarinade,
        fetchMarinadeDepositQuote,
        fetchMarinadeUnstakeQuote,
        fetchMarinadeNativeDepositQuote,
        fetchMarinadeNativeUnstakeQuote,
        fetchMarinadeUsdcDepositQuote,
        fetchMarinadeUsdcWithdrawQuote,
        executeSwap,
        fetchSwapQuote,
        fetchStockAssets,
        setFeeSelection,
        fetchETA,
        fetchTokenMeta,
        verifiedTokensData,
        liveTokenPrices,
        isUltraFast,
        setIsUltraFast,
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

        estimateBitcoinFromNative,
        estimateNativeFromBitcoin,
        commitNativeToBitcoin,
        commitBitcoinToNative,
        depositApprovedConversion,
        getMyTxIds,
        getConversion,
        refundIfNotApproved,
        claimNativeAfterOperatorExpired,
        refundAfterNoProofNativeToBitcoin,
        initializeProtocol,
        addSupportedNetwork,
        // --- iPoW SPV & BLOCKSTREAM FUNCTIONS (ADDED) ---
        anchorInfo,
        windowsFor,
        proofInfo,
        globalHeightToHashLE,
        submitBitcoinMerkleProofWithTx,
        liveBetaPrice,
        executeGaslessSend,
        fetchGaslessSendQuote
      }}
    >
      {children}
    </SolanaWalletContext.Provider>
  );
}
