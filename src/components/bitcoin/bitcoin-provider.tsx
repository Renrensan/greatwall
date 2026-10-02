"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useMemo,
  useCallback,
} from "react";
import * as bitcoin from "bitcoinjs-lib";
import { bitcoinnetwork } from "@/index";
import { useNetwork } from "@/app/network-provider";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { bitcoin as btcMainnet } from "@reown/appkit/networks";
import { appKit } from "../walletconnect/wallet-connect-provider";
import { BitcoinWalletContextType, BitcoinWalletType, BtcAccount } from "./config/type";
import { addressToScriptPubKeyHex, scriptPubKeyHexToAddress } from "./config/helpers";
import { appConfig } from "./config";
import { networkConfig } from "./config/networks";
import { IPOW_NETWORK_ID } from "./config/constants";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";
import { request as satsConnectRequest, AddressPurpose, isProviderInstalled } from "sats-connect";

export const network = bitcoin.networks.bitcoin;

/** Xverse's sats-connect provider id (sats-connect's own DefaultAdaptersInfo.xverse.id) —
 * every sats-connect `request` call below is scoped to this id explicitly rather than the
 * SDK's default, so it never accidentally talks to some other installed sats-connect-
 * compatible wallet (e.g. Unisat, which the same SDK also knows how to drive) sitting
 * behind the generic default. */
export const XVERSE_PROVIDER_ID = "XverseProviders.BitcoinProvider";

function isXverseInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return isProviderInstalled(XVERSE_PROVIDER_ID);
}

/** sats-connect's `request()` runs an internal `getInfo` handshake against the provider
 * before it ever gets to the method actually being asked for — if that handshake never
 * gets a response (extension/SDK version mismatch, provider bug, etc.), the returned
 * promise just never settles, with no error surfaced anywhere. Every Xverse call below is
 * wrapped in this so a stuck connection times out into a visible failure instead of an
 * indefinite silent hang. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms),
    ),
  ]);
}

const BitcoinWalletContext = createContext<BitcoinWalletContextType>({
  connected: false,
  isConnecting: false,
  walletType: null,
  address: null,
  accounts: [],
  balance: { confirmed: 0, unconfirmed: 0, sendable: 0, fetched: false },
  estimatedFee: {
    low: 0,
    medium: 0,
    high: 0,
    selectedFee: "medium",
    fetched: false,
  },
  currencyTicker: "BTC",
  decimals: 8,
  networkName: "Bitcoin",
  networkDescription: {},
  networkLogo: bitcoinnetwork,
  selfCustodyParameter: {},
  selectedAccount: null,
  price: {},
  networkExplorer: {},
  ipowConvert: "mainnet",
  ipowNetworkId: 0,
  dappList: [],
  setFeeSelection: () => {},
  setSelectedAccount: () => {},
  connect: async () => {},
  disconnect: () => {},
  switchWallet: async () => {},
  signMessage: async () => null,
  sendTokenTo: async () => null,
  fetchETA: async () => null,
  addressToScriptPubKeyHex: () => "0x",
  scriptPubKeyHexToAddress: () => "",
  checkAddress: () => ({ valid: false, reason: "invalid" }),
  isValidAddress: () => false,
  toggleFavoriteDapp: () => {},
});

export function useBitcoinWallet() {
  return useContext(BitcoinWalletContext);
}

export function BitcoinProvider({ children }: { children: ReactNode }) {
  const { isConnected: akConnected, allAccounts } = useAppKitAccount();
  const { walletProvider: akProvider } = useAppKitProvider("bip122");
  const [walletType, setWalletType] = useState<BitcoinWalletType | null>(null);

  const currentNetworkConfig = useMemo(() => {
    return appConfig.networks.mainnet 
  }, []);

  const { bitcoinMainnet } = useNetwork();
  const isMainnet = bitcoinMainnet;

const [selfCustodyParameter, setSelfCustodyParameter] = useState<CustodyParams>({
  network: "BITCOIN",
   env: isMainnet ? "MAINNET" : "TESTNET",
  tokens: [

  ],
  fetched: false,
});
  const [dappList, setDappList] = useState<any[] | null>(null);


  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [accounts, setAccounts] = useState<BtcAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BtcAccount | null>(
    null,
  );

  const address = selectedAccount?.address ?? null;

  const [balance, setBalance] = useState<{
    confirmed: number;
    unconfirmed: number;
    fetched: boolean;
   tokens: any[];
  }>({ confirmed: 0, unconfirmed: 0, fetched: false, tokens:[] });

  const [price, setPrice] = useState(null);

  const [estimatedFee, setEstimatedFee] = useState<{
    low: number;
    medium: number;
    high: number;
    selectedFee: "low" | "medium" | "high";
    fetched: boolean;
  }>({ low: 0, medium: 0, high: 0, selectedFee: "medium", fetched: false });

  const netKey = useMemo(() => {
    return "mainnet";
  }, []);

  const targetNetwork = useMemo(() => {
    return  btcMainnet;
  }, []);

  const setSelectedAccountAndStore = (acc: BtcAccount) => {
    setSelectedAccount(acc);
    if (typeof window !== "undefined") {
      localStorage.setItem(`btcSelectedAddress_${netKey}`, acc.address);
      localStorage.setItem(`btcSelectedType_${netKey}`, acc.addressType);
      localStorage.setItem("phantomSelectedAccount", acc.address); 
    }
  };

  const getProvider = () => {
    if (typeof window !== "undefined" && "phantom" in window) {
      const prov = (window as any).phantom?.bitcoin;
      if (prov?.isPhantom) return prov;
    }
    return null;
  };

  const getValidatedBtcProvider = async () => {
    if (!walletType) throw new Error("No wallet selected");

    const isHub =
      walletType === "walletconnect" ||
      localStorage.getItem(`btcWalletType_${netKey}`) === "walletconnect";

    if (isHub) {
      const hasBtcSession =
        akConnected && allAccounts?.some((acc) => acc.namespace === "bip122");

      if (!hasBtcSession || !akProvider) {
        console.log("Bitcoin session overwritten. Reconnecting...");
        await connect("walletconnect", true);
      }
      return akProvider;
    }


    const p = getProvider();
    if (!p) throw new Error(`${walletType} extension missing`);
    return p;
  };

  const connect = async (wallet: BitcoinWalletType, isAutoConnect = false) => {
    setIsConnecting(true);

    try {
      if (wallet === "phantom") {
        const p = getProvider();

        if (!p) return;

        const fetched = await p.requestAccounts();
        if (fetched && fetched.length > 0) {
          const mapped: BtcAccount[] = fetched.map((acc: any) => ({
            address: acc.address,
            addressType: acc.addressType,
            publicKey: acc.publicKey,
            purpose: acc.purpose,
          }));

          setAccounts(mapped);

          const storedAddr = localStorage.getItem(
            `btcSelectedAddress_${netKey}`,
          );
          const storedType = localStorage.getItem(`btcSelectedType_${netKey}`);

          let preferred =
            mapped.find((a) => a.address === storedAddr) ||
            mapped.find((a) => a.addressType === storedType) ||
            mapped.find((a) => a.addressType === "p2wpkh") ||
            mapped[0];

          setSelectedAccountAndStore(preferred);

          setConnected(true);
          setWalletType("phantom");

          localStorage.setItem(`btcConnected_${netKey}`, "true");
          localStorage.setItem(`btcWalletType_${netKey}`, "phantom");
        }
      }

      if (wallet === "xverse") {
        if (!isXverseInstalled()) return;

        // `getAddresses` assumes a connection/permission already exists and doesn't
        // prompt anything for a site Xverse has never seen before — `wallet_connect` is
        // the method that actually triggers the extension's connect popup on first use,
        // so that's what has to run here, not getAddresses.
        const response = await withTimeout(
          satsConnectRequest(
            "wallet_connect",
            { addresses: [AddressPurpose.Payment, AddressPurpose.Ordinals] },
            XVERSE_PROVIDER_ID,
          ),
          20000,
          "Xverse connect",
        );

        if (response.status === "success" && response.result.addresses.length > 0) {
          const mapped: BtcAccount[] = response.result.addresses.map((acc) => ({
            address: acc.address,
            addressType: acc.addressType as BtcAccount["addressType"],
            publicKey: acc.publicKey,
            purpose: acc.purpose as BtcAccount["purpose"],
          }));

          setAccounts(mapped);

          const storedAddr = localStorage.getItem(
            `btcSelectedAddress_${netKey}`,
          );
          const storedType = localStorage.getItem(`btcSelectedType_${netKey}`);

          let preferred =
            mapped.find((a) => a.address === storedAddr) ||
            mapped.find((a) => a.addressType === storedType) ||
            mapped.find((a) => a.addressType === "p2wpkh") ||
            mapped[0];

          setSelectedAccountAndStore(preferred);

          setConnected(true);
          setWalletType("xverse");

          localStorage.setItem(`btcConnected_${netKey}`, "true");
          localStorage.setItem(`btcWalletType_${netKey}`, "xverse");
        }
      }

      if (wallet === "walletconnect") {
        await appKit.switchNetwork(targetNetwork);
        if (isAutoConnect) return;

        const unsubscribe = appKit.subscribeState((state) => {
          if (!state.open) {
            const isConnectedNow =
              localStorage.getItem(`btcConnected_${netKey}`) === "true";
            if (!isConnectedNow) {
              setIsConnecting(false);
            }
            if (unsubscribe) unsubscribe();
          }
        });

        await appKit.open({ view: "AllWallets", namespace: "bip122" });
      }
    } catch (error: any) {
      console.error("ParaAI: Connection error", error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async (hardDisconnect: boolean) => {
    try {
      if (walletType === "walletconnect") {
        if (hardDisconnect) {
          await appKit.disconnect("bip122");
        }
      }
    } catch (error) {
      console.warn("Error on disconnect", error);
    }

    setAccounts([]);
    setSelectedAccount(null);
    setConnected(false);

    setWalletType(null);

    if (typeof syncRef !== "undefined") syncRef.current = "";


    localStorage.removeItem(`btcConnected_${netKey}`);
    localStorage.removeItem(`btcWalletType_${netKey}`);
  };

  const switchWallet = async (wallet: BitcoinWalletType) => {
    try {
      disconnect(false);
      await connect(wallet, true);
    } catch (err) {
      console.error("Switch wallet error:", err);
    }
  };

  const signMessage = async (message: string) => {
    if (!selectedAccount) return null;

    if (walletType === "xverse") {
      const response = await withTimeout(
        satsConnectRequest(
          "signMessage",
          { address: selectedAccount.address, message },
          XVERSE_PROVIDER_ID,
        ),
        20000,
        "Xverse signMessage",
      );
      if (response.status !== "success") throw new Error("Xverse: user rejected or failed to sign message");
      return response.result.signature;
    }

    const activeProvider = await getValidatedBtcProvider();

    const isHub =
      walletType === "walletconnect" ||
      localStorage.getItem(`btcWalletType_${netKey}`) === "walletconnect";

    if (isHub) {
      return await activeProvider.request({
        method: "signMessage",
        params: {
          address: selectedAccount.address,
          message: message,
        },
      });
    }

    const encoded = new TextEncoder().encode(message);
    const res = await activeProvider.signMessage(
      selectedAccount.address,
      encoded,
    );
    const signatureBytes = res?.signature ?? res;
    if (typeof signatureBytes === "string") {
      return signatureBytes.trim();
    }
    if (signatureBytes instanceof Uint8Array || Array.isArray(signatureBytes)) {
      let binary = "";
      const len = signatureBytes.length;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(signatureBytes[i]);
      }
      return btoa(binary);
    }
    return null;
  };

  const estimateTxVbytes = (
    inputCount: number,
    outputCount: number,
    isTaproot: boolean,
  ) => {
    const inputSize = isTaproot ? 57 : 68;
    return inputCount * inputSize + outputCount * 31 + 10;
  };

const estimateFee = useCallback(async (signal?: AbortSignal) => {
    if (!selectedAccount) return null;

    try {

      const feeRes = await fetch(`${currentNetworkConfig.jsonRpcUrl}/v1/fees/recommended`, { signal });
      const feeRates = await feeRes.json();

      const utxoRes = await fetch(
        `${currentNetworkConfig.jsonRpcUrl}/address/${selectedAccount.address}/utxo`,
        { signal }
      );
      const utxos = await utxoRes.json();

      const isTaproot = selectedAccount.addressType === "p2tr";
      const vsize = estimateTxVbytes(utxos.length, 2, isTaproot);

      const calc = (rate: number) => Math.ceil(rate * vsize);

      setEstimatedFee((prev) => ({
        low: calc(feeRates.hourFee) / 1e8,
        medium: calc(feeRates.halfHourFee) / 1e8,
        high: calc(feeRates.fastestFee) / 1e8,
        fetched: true,
        selectedFee: prev.selectedFee,
      }));
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log(`[Abort] Cancelled fee estimation for ${selectedAccount.address}`);
      } else {
        console.error("Failed to estimate fees:", err);
      }
    }
  }, [selectedAccount?.address, currentNetworkConfig.jsonRpcUrl]);

  const fetchETA = async (
    txHash: string,
  ): Promise<{ estimatedSeconds: number; isCongested: boolean } | null> => {
    try {
      const txRes = await fetch(`${currentNetworkConfig.jsonRpcUrl}/tx/${txHash}`);
      if (!txRes.ok) return null;
      const txData = await txRes.json();

      if (txData.status && txData.status.confirmed) {
        return { estimatedSeconds: 0, isCongested: false };
      }

      const feeRate = txData.fee / (txData.weight / 4);

      const mempoolRes = await fetch(
        `${currentNetworkConfig.jsonRpcUrl}/v1/fees/mempool-blocks`,
      );
      if (!mempoolRes.ok) return null;
      const mempoolData = await mempoolRes.json();

      let etaBlocks = 0;
      let foundInProjectedBlocks = false;

      for (const block of mempoolData) {
        etaBlocks++;
        if (block.feeRange && feeRate >= block.feeRange[0]) {
          foundInProjectedBlocks = true;
          break;
        }
      }

      if (!foundInProjectedBlocks) {
        etaBlocks = mempoolData.length + 2;
      }

      const estimatedSeconds = etaBlocks * 600;

     
      const isCongested = !foundInProjectedBlocks || etaBlocks > 4;

      return { estimatedSeconds, isCongested };
    } catch (err) {
      console.error("Failed to estimate Bitcoin tx ETA:", err);
      return null;
    }
  };

  const setFeeSelection = (selectedFee: "low" | "medium" | "high") => {
    setEstimatedFee((prev) => ({
      low: prev.low,
      medium: prev.medium,
      high: prev.high,
      fetched: prev.fetched,
      selectedFee,
    }));
  };

  /** The single address-check entry point exposed to the frontend: whether an
   * address is valid, and if not, which specific rule it failed — so forms can
   * show a specific, actionable message instead of one generic "invalid" string. */
  const checkAddress = useCallback((address: string): AddressCheckResult => {
    try {
      bitcoin.address.toOutputScript(address, network);
      return { valid: true, reason: null };
    } catch {
      // fall through to figure out *why*, below
    }

    const prefixHints = ["", "b", "bc", "bc1"];
    const allowedPrefixes = ["1", "3", "bc1q", "bc1p"];
    if (prefixHints.includes(address) || !allowedPrefixes.some((p) => address.startsWith(p))) {
      return { valid: false, reason: "wrong-prefix" };
    }

    const prefix = allowedPrefixes.find((p) => address.startsWith(p))!;
    if (prefix === "1" || prefix === "3") {
      const base58Chars = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
      if (!base58Chars.test(address)) return { valid: false, reason: "invalid-characters" };
      if (address.length < 26) return { valid: false, reason: "too-short" };
      if (address.length > 35) return { valid: false, reason: "too-long" };
    } else {
      const bech32Chars = /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/;
      if (address !== address.toLowerCase() || !bech32Chars.test(address.slice(3))) {
        return { valid: false, reason: "invalid-characters" };
      }
      if (address.length < 42) return { valid: false, reason: "too-short" };
      if (address.length > 62) return { valid: false, reason: "too-long" };
    }
    return { valid: false, reason: "invalid" };
  }, []);

  const isValidAddress = useCallback((address: string): boolean => checkAddress(address).valid, [checkAddress]);

  const sendTokenTo = async (toAddress: string, amount: number) => {
    if (!selectedAccount) return null;
    const amountSats = Math.round(amount * 1e8);

    const utxoRes = await fetch(
     `${currentNetworkConfig.jsonRpcUrl}/address/${selectedAccount.address}/utxo`,
    );
    const utxos = await utxoRes.json();
    if (!utxos.length) throw new Error("No UTXOs available");

    const isTaproot = selectedAccount.addressType === "p2tr";
    const psbt = new bitcoin.Psbt({ network });
    let inputSum = 0;

    const feeSats = Math.round(estimatedFee[estimatedFee.selectedFee] * 1e8);
    const totalNeeded = amountSats + feeSats;

    for (const u of utxos) {
      const txRes = await fetch(`${currentNetworkConfig.jsonRpcUrl}/tx/${u.txid}`);
      const txData = await txRes.json();
      const vout = txData.vout[u.vout];

      const input = {
        hash: u.txid,
        index: u.vout,
        sequence: 0xfffffffd,
        witnessUtxo: {
          script: Buffer.from(vout.scriptpubkey, "hex"),
          value: vout.value,
        },
      };

      if (isTaproot && selectedAccount.publicKey) {
        const pubkey = Buffer.from(selectedAccount.publicKey, "hex");
        const xOnly = pubkey.length === 33 ? pubkey.slice(1) : pubkey;
        (input as any).tapInternalKey = xOnly;
      }

      psbt.addInput(input);
      inputSum += vout.value;
      if (inputSum >= totalNeeded) break;
    }

    if (inputSum < totalNeeded) throw new Error("Insufficient funds");

    psbt.addOutput({ address: toAddress, value: amountSats });
    const change = inputSum - totalNeeded;
    if (change > 0) {
      psbt.addOutput({ address: selectedAccount.address, value: change });
    }

    const psbtBase64 = psbt.toBase64();
    let signedPsbtB64: string;

    try {
      const inputCount = psbt.txInputs
        ? psbt.txInputs.length
        : psbt.data.inputs.length;
      const indexes = Array.from({ length: inputCount }, (_, i) => i);

      if (walletType === "xverse") {
        const response = await withTimeout(
          satsConnectRequest(
            "signPsbt",
            {
              psbt: psbtBase64,
              signInputs: { [selectedAccount.address]: indexes },
              broadcast: false,
            },
            XVERSE_PROVIDER_ID,
          ),
          20000,
          "Xverse signPsbt",
        );
        if (response.status !== "success") {
          throw new Error("Xverse: user rejected or failed to sign transaction");
        }
        signedPsbtB64 = response.result.psbt;
      } else {
        const activeProvider = await getValidatedBtcProvider();

        const isHub =
          walletType === "walletconnect" ||
          localStorage.getItem(`btcWalletType_${netKey}`) === "walletconnect";

        if (isHub) {

          const response = await activeProvider.signPSBT({
            psbt: psbtBase64,
            signInputs: indexes.map((i) => ({
              address: selectedAccount.address,
              index: i,
              sighashTypes: [bitcoin.Transaction.SIGHASH_DEFAULT],
            })),
            broadcast: false,
          });


          signedPsbtB64 = response.psbt;
        } else {

          const psbtBytes = Uint8Array.from(Buffer.from(psbtBase64, "base64"));

          const signedBytes = await activeProvider.signPSBT(psbtBytes, {
            inputsToSign: [
              {
                address: selectedAccount.address,
                signingIndexes: indexes,
                sigHash: bitcoin.Transaction.SIGHASH_DEFAULT,
              },
            ],
          });


          signedPsbtB64 = Buffer.from(signedBytes).toString("base64");
        }
      }


      const finalPsbt = bitcoin.Psbt.fromBase64(signedPsbtB64);
      finalPsbt.finalizeAllInputs();
      const rawTx = finalPsbt.extractTransaction().toHex();

      const broadcastRes = await fetch(`${currentNetworkConfig.jsonRpcUrl}/tx`, {
        method: "POST",
        body: rawTx,
      });

      const txid = await broadcastRes.text();
      if (!broadcastRes.ok) throw new Error(`Broadcast failed: ${txid}`);

      fetchBalance();
      return txid;
    } catch (error) {
      console.error("ParaAI: Transaction failed", error);
      return null;
    }
  };

const fetchBalance = useCallback(async (signal?: AbortSignal) => {
    if (!selectedAccount) return;
    
    try {
      const res = await fetch(
        `${currentNetworkConfig.jsonRpcUrl}/address/${selectedAccount.address}`,
        { 
          cache: "no-cache",
          signal: signal 
        }
      );
      
      const data = await res.json();
      const confirmed = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8;
      const unconfirmed = (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 1e8;
      
      setBalance({ confirmed, unconfirmed, fetched: true, tokens: []});
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log(`[Abort] Cancelled balance fetch for ${selectedAccount.address}`);
      } else {
        console.error("Failed to fetch balance:", err);
      }
    }
  }, [selectedAccount?.address, currentNetworkConfig.jsonRpcUrl]); 

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
            network: "BITCOIN",
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
      const response = await fetch(`/api/token-price?token=BTC&env=${envMode}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      setPrice(data);
    } catch (error) {
      console.error("Error fetching price:", error);
    }
  };

  const syncRef = useRef<string>("");

  useEffect(() => {
    if (akConnected && allAccounts && akProvider) {
      const savedInjectedType = localStorage.getItem(`btcWalletType_${netKey}`);
      const wasInjected = savedInjectedType === "phantom" || savedInjectedType === "xverse";

      const btcAccounts = allAccounts.filter(
        (
          acc,
        ): acc is Extract<
          (typeof allAccounts)[number],
          { namespace: "bip122" }
        > => acc.namespace === "bip122",
      );

      if (
        btcAccounts.length > 0 &&
        (!wasInjected || walletType === "walletconnect")
      ) {
        const accountsSignature = JSON.stringify(btcAccounts);
        if (syncRef.current === accountsSignature) return;

        const mappedAccounts: BtcAccount[] = btcAccounts.map((acc) => ({
          address: acc.address,
          addressType: acc.type === "ordinal" ? "p2tr" : "p2wpkh",
          publicKey: acc.publicKey || "",
          purpose: acc.type === "ordinal" ? "ordinals" : "payment",
        }));

        syncRef.current = accountsSignature;
        setAccounts(mappedAccounts);

        const storedAddr = localStorage.getItem(`btcSelectedAddress_${netKey}`);
        const storedType = localStorage.getItem(`btcSelectedType_${netKey}`);

        let preferred =
          mappedAccounts.find((a) => a.address === storedAddr) ||
          mappedAccounts.find((a) => a.addressType === storedType) ||
          mappedAccounts.find((a) => a.addressType === "p2wpkh") ||
          mappedAccounts[0];

        setSelectedAccount(preferred); 

        setConnected(true);
        setWalletType("walletconnect");

        localStorage.setItem(`btcConnected_${netKey}`, "true");
        localStorage.setItem(`btcWalletType_${netKey}`, "walletconnect");
        localStorage.setItem(`btcSelectedAddress_${netKey}`, preferred.address);
        localStorage.setItem(
          `btcSelectedType_${netKey}`,
          preferred.addressType,
        );
      }
    }
  }, [akConnected, allAccounts, akProvider, walletType, isMainnet]);

  useEffect(() => {
    const fetchDapps = async () => {
      try {
        const addressQuery = address ? `&walletAddress=${address}` : "";
        const response = await fetch(
          `/api/dapphub/list?network=BITCOIN${addressQuery}`,
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

      const currentNetwork = "BITCOIN";
      const envMode = isMainnet ? "MAINNET" : "TESTNET";

      const response = await fetch(
        `/api/transaction/constraints/?network=${currentNetwork}&env=${envMode}`,
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
      console.error(`Failed to fetch ${network} self-custody limits:`, error);
    }

    // A malformed/empty response shouldn't strand the UI in "still loading" for a full 5
    // minutes (the normal poll cadence below) — retry quickly a few times first, since that's
    // a much more plausible transient hiccup than a genuinely empty token list.
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
    fetchPrice();
    const i = setInterval(() => {
      fetchPrice();
    }, 60000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMainnet]);

useEffect(() => {
    if (!selectedAccount){
      return;
    }


    fetchBalance();
    estimateFee();

    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;
    let isMounted = true;

    const connectWebSocket = () => {
      ws = new WebSocket(networkConfig.mainnet.websocketUrl);

      ws.onopen = () => {
        console.log("Connected to Mempool WebSocket");
        ws.send(JSON.stringify({ action: "track-address", address: selectedAccount.address }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data["address-transactions"] || data.block) {
            console.log("Activity detected! Refetching balance & UTXOs...");
            fetchBalance();
            estimateFee(); 
          }
        } catch (err) {
          console.error("Failed to parse WS message", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
        ws.close(); 
      };

      ws.onclose = (event) => {
        if (isMounted && !event.wasClean) {
          console.log("WebSocket dropped. Attempting to reconnect in 5 seconds...");
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        }
      };
    };

    connectWebSocket();

    const feeInterval = setInterval(() => {
      console.log("Polling network fees...");
      estimateFee(); 
    }, 60000);

    return () => {
      isMounted = false; 
      clearTimeout(reconnectTimeout); 
      clearInterval(feeInterval);
      if (ws) {
        ws.close(); 
      }
    };

  }, [selectedAccount, fetchBalance, estimateFee]);
  
  useEffect(() => {
    const prov = getProvider();

    if (prov) {
      const handleAccountsChanged = (newAccounts: any[]) => {
        const isPhantomActive =
          localStorage.getItem(`btcWalletType_${netKey}`) === "phantom";
        if (isPhantomActive && newAccounts.length > 0) {
          const mapped: BtcAccount[] = newAccounts.map((acc) => ({
            address: acc.address,
            addressType: acc.addressType,
            publicKey: acc.publicKey,
            purpose: acc.purpose,
          }));

          setAccounts(mapped);
          const storedAddr = localStorage.getItem(
            `btcSelectedAddress_${netKey}`,
          );
          const storedType = localStorage.getItem(`btcSelectedType_${netKey}`);

          let p =
            mapped.find((a) => a.address === storedAddr) ||
            mapped.find((a) => a.addressType === storedType) ||
            mapped.find((a) => a.addressType === "p2wpkh") ||
            mapped[0];

          setSelectedAccountAndStore(p);
          setConnected(true);
        }
      };

      prov.on("accountsChanged", handleAccountsChanged);
      return () =>
        prov.removeListener("accountsChanged", handleAccountsChanged);
    }
  }, [isMainnet]);

  useEffect(() => {
    const wasConnected =
      localStorage.getItem(`btcConnected_${netKey}`) === "true";
    const savedWallet = localStorage.getItem(
      `btcWalletType_${netKey}`,
    ) as BitcoinWalletType;

    // WalletConnect restoration is intentionally NOT handled here: parsing a cached accounts
    // blob straight into state would show a fully "connected" wallet even if the underlying WC
    // session actually died (expired, revoked, or never restored) while the app was closed. The
    // `akConnected`/`allAccounts`/`akProvider` effect above is the only source of truth for
    // that — it fires once reown/appkit's own SDK confirms the session is genuinely live, and
    // simply never fires if it isn't, which is the correct outcome.
    if (wasConnected && (savedWallet === "phantom" || savedWallet === "xverse")) {
      connect(savedWallet, true);
    }
  }, [isMainnet, akConnected]);
  return (
    <BitcoinWalletContext.Provider
      value={{
        connected,
        isConnecting,
        walletType,
        address,
        accounts,
        balance: {
          ...balance,
          sendable:
            balance.confirmed - estimatedFee[estimatedFee.selectedFee] * 1.1 > 0
              ? balance.confirmed - estimatedFee[estimatedFee.selectedFee] * 1.1
              : 0,
        },
        price,
        networkExplorer: {
          address: `${currentNetworkConfig.networkExplorer}/address/`,
          transaction: `${currentNetworkConfig.networkExplorer}/tx/`,
        },
        estimatedFee,
        fetchETA,
        setFeeSelection,
        selectedAccount,
        currencyTicker: "BTC",
        decimals: 8,
        networkName: "Bitcoin",
        networkDescription: {
          en: `Bitcoin runs on the world’s most secure decentralized network, powered by Proof-of-Work. It lets you store and transfer value without banks or intermediaries. Giving you full control over your real money, anytime, anywhere.`,
          id: `Bitcoin berjalan di jaringan terdesentralisasi paling aman di dunia, didukung oleh Proof-of-Work. Jaringan Bitcoin ini memungkinkan kamu menyimpan dan mengirim nilai tanpa bank atau perantara. Memberikan kamu kendali penuh atas uang yang sebenarnya, kapan pun dan di mana pun.`,
        },
        networkLogo: bitcoinnetwork,
        selfCustodyParameter,
        ipowConvert: "mainnet",

        ipowNetworkId: IPOW_NETWORK_ID,
        dappList,
        toggleFavoriteDapp,
        setSelectedAccount: setSelectedAccountAndStore,
        connect,
        disconnect,
        switchWallet,
        signMessage,
        sendTokenTo,
        addressToScriptPubKeyHex,
        scriptPubKeyHexToAddress,
        checkAddress,
        isValidAddress,
      }}
    >
      {children}
    </BitcoinWalletContext.Provider>
  );
}
