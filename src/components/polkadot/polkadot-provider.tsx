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
import type { PolkadotClient, TypedApi } from "polkadot-api";
import { assetHubPolkadot, assetHubPaseo, MultiAddress } from "@polkadot-api/descriptors";
import { ethers, BytesLike } from "ethers";
import { polkadotnetwork } from "@/index";
import { useNetwork } from "@/app/network-provider";
import {
  PolkadotWalletContextType,
  PolkadotWalletType,
  PolkadotAccount,
} from "./config/type";
import { appConfig } from "./config";
import { toPlanck, fromPlanck, reencodeAddress, sameAccount, isValidSs58Address } from "./config/helpers";
import { AddressCheckResult } from "@/subcomponents/wallet-connect/address-validation";
import { fetchHeldAssetHubTokens } from "./asset-hub-tokens";
import { fetchAssetHubRegistry, fetchAssetHubPrices } from "./asset-hub-registry";
import IPOW_ABI_JSON from "../integrator/ipow/evm/abi.json";
import { TxPhase, TypeFilter } from "../integrator/ipow/evm/type";
import {
  IPOW_NETWORK_ID,
  POLKADOT_APP_NAME,
  POLKADOT_WALLETS,
  IPOW_CONTRACT_ADDRESS_TESTNET,
  IPOW_EVM_RPC_URL_TESTNET,
  IPOW_AMOUNT_DECIMALS,
} from "./config/constants";

type NetKey = "mainnet" | "testnet";
type AssetHubApi = TypedApi<typeof assetHubPolkadot>;

const DESCRIPTORS: Record<NetKey, typeof assetHubPolkadot | typeof assetHubPaseo> = {
  mainnet: assetHubPolkadot,
  testnet: assetHubPaseo,
};

function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PolkadotWalletContext = createContext<PolkadotWalletContextType>({
  connected: false,
  isConnecting: false,
  walletType: null,
  address: null,
  resolvedAddress: null,
  accounts: [],
  balance: { confirmed: 0, unconfirmed: 0, sendable: 0, fetched: false, tokens: [] },
  estimatedFee: {
    low: 0,
    medium: 0,
    high: 0,
    selectedFee: "medium",
    fetched: false,
  },
  currencyTicker: "DOT",
  decimals: 10,
  ipowDecimals: IPOW_AMOUNT_DECIMALS,
  networkName: "Polkadot",
  networkDescription: {},
  networkLogo: polkadotnetwork,
  selfCustodyParameter: {},
  selectedAccount: null,
  price: {},
  networkExplorer: {},
  ipowConvert: "comingsoon",
  ipowNetworkId: IPOW_NETWORK_ID,
  detectedWallets: [],
  setFeeSelection: () => {},
  setSelectedAccount: () => {},
  connect: async () => {},
  disconnect: () => {},
  switchWallet: async () => {},
  signMessage: async () => null,
  sendTokenTo: async () => null,
  checkAddress: () => ({ valid: false, reason: "invalid" }),
  isValidAddress: () => false,
  fetchETA: async () => null,
  getEvmAddress: async () => null,
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

export function usePolkadotWallet() {
  return useContext(PolkadotWalletContext);
}

/** Lazily bootstraps a PAPI client per network, shared across the app. */
const clients: Partial<Record<NetKey, PolkadotClient>> = {};
const typedApis: Partial<Record<NetKey, AssetHubApi>> = {};
const connecting: Partial<Record<NetKey, Promise<AssetHubApi>>> = {};
// How many mounted PolkadotProviders currently need each network's connection.
const refCounts: Partial<Record<NetKey, number>> = {};

const API_CONNECT_TIMEOUT_MS = 15000;
const API_CONNECT_MAX_ATTEMPTS = 3;
const API_CONNECT_RETRY_DELAY_MS = 1500;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectViaRpc(netKey: NetKey, rpcEndpoints: string[]): Promise<AssetHubApi> {
  const { createClient } = await import("polkadot-api");
  // getWsProvider natively accepts an endpoint list and fails over between them.
  const { getWsProvider } = await import("polkadot-api/ws");
  const client = createClient(getWsProvider(rpcEndpoints));

  try {
    // Force an actual round-trip so a genuinely unreachable endpoint set rejects
    // instead of hanging forever, mirroring the previous timeout behavior.
    await Promise.race([
      client.getChainSpecData(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timed out connecting to Asset Hub (${netKey})`)),
          API_CONNECT_TIMEOUT_MS,
        ),
      ),
    ]);

    const typedApi = client.getTypedApi(DESCRIPTORS[netKey]) as AssetHubApi;
    clients[netKey] = client;
    typedApis[netKey] = typedApi;
    console.log(`[Polkadot] Connected to Asset Hub (${netKey}) via RPC`);
    return typedApi;
  } catch (err) {
    client.destroy();
    throw err;
  }
}

async function getApiForNetwork(netKey: NetKey, rpcEndpoints: string[]) {
  if (typedApis[netKey]) return typedApis[netKey]!;
  if (!connecting[netKey]) {
    connecting[netKey] = (async () => {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= API_CONNECT_MAX_ATTEMPTS; attempt++) {
        try {
          return await connectViaRpc(netKey, rpcEndpoints);
        } catch (err) {
          lastErr = err;
          console.error(`Asset Hub connect attempt ${attempt}/${API_CONNECT_MAX_ATTEMPTS} (${netKey}) failed:`, err);
          if (attempt < API_CONNECT_MAX_ATTEMPTS) await delay(API_CONNECT_RETRY_DELAY_MS);
        }
      }
      // Let the next call retry instead of being stuck on this rejected promise forever.
      delete connecting[netKey];
      throw lastErr;
    })();
  }
  return connecting[netKey]!;
}

/** Called once per mounted PolkadotProvider per netKey; see releaseApiForNetwork. */
function acquireApiForNetwork(netKey: NetKey) {
  refCounts[netKey] = (refCounts[netKey] ?? 0) + 1;
}

/**
 * Releases this consumer's hold on a network's connection. When the last consumer
 * releases it, the connection is actually torn down — previously the client was cached
 * at module scope forever, so navigating away from Polkadot left its socket running
 * invisibly in the background indefinitely.
 */
function releaseApiForNetwork(netKey: NetKey) {
  const next = (refCounts[netKey] ?? 1) - 1;
  if (next > 0) {
    refCounts[netKey] = next;
    return;
  }
  delete refCounts[netKey];
  delete connecting[netKey];
  const client = clients[netKey];
  delete clients[netKey];
  delete typedApis[netKey];
  client?.destroy();
}

export function PolkadotProvider({ children }: { children: ReactNode }) {
  const { polkadotMainnet } = useNetwork();
  const isMainnet = polkadotMainnet;
  const netKey: NetKey = isMainnet ? "mainnet" : "testnet";

  const currentNetworkConfig = useMemo(() => {
    return isMainnet ? appConfig.networks.mainnet : appConfig.networks.testnet;
  }, [isMainnet]);

  const getApi = useCallback(() => {
    return getApiForNetwork(netKey, currentNetworkConfig.rpcEndpoints);
  }, [netKey, currentNetworkConfig.rpcEndpoints]);

  // Tracks how many mounted PolkadotProviders are using this netKey's connection, so it's
  // actually disconnected once nobody needs it (e.g. navigating away from Polkadot), instead
  // of running forever in the background.
  useEffect(() => {
    acquireApiForNetwork(netKey);
    return () => releaseApiForNetwork(netKey);
  }, [netKey]);

  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletType, setWalletType] = useState<PolkadotWalletType | null>(null);
  const [detectedWallets, setDetectedWallets] = useState<PolkadotWalletType[]>([]);
  const [accounts, setAccounts] = useState<PolkadotAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<PolkadotAccount | null>(null);
  const address = selectedAccount?.address ?? null;
  // Kept in sync below, once getEvmAddress is defined (mirrors hedera-provider.tsx's
  // resolvedAddress — the connected account's pallet-revive fallback EVM identity).
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  // Canonical SS58 prefix for the active network's own address format. Both Polkadot mainnet
  // Asset Hub and Paseo Asset Hub display as prefix 0 (addresses starting with "1") —
  // deliberately matching wallet-ecosystem display convention (SubWallet, Talisman, etc. all
  // show Paseo Asset Hub this way) rather than the chain's raw `system_properties.ss58Format`
  // field (which reports 42, Substrate's generic default). This is purely a display choice —
  // SS58 decoding is prefix-agnostic, so it has no effect on signing/verification correctness.
  const ss58Format = 0;

  const [chainMeta, setChainMeta] = useState<{ ticker: string; decimals: number }>({
    ticker: isMainnet ? "DOT" : "PAS",
    decimals: 10,
  });

  const [balance, setBalance] = useState<{
    confirmed: number;
    unconfirmed: number;
    sendable: number;
    fetched: boolean;
    tokens: any[];
  }>({ confirmed: 0, unconfirmed: 0, sendable: 0, fetched: false, tokens: [] });

  const [estimatedFee, setEstimatedFee] = useState<{
    low: number;
    medium: number;
    high: number;
    selectedFee: "low" | "medium" | "high";
    fetched: boolean;
  }>({ low: 0, medium: 0, high: 0, selectedFee: "medium", fetched: false });

  const [price, setPrice] = useState(null);
  const [selfCustodyParameter, setSelfCustodyParameter] = useState<CustodyParams>({
    network: "POLKADOT",
    env: isMainnet ? "MAINNET" : "TESTNET",
    tokens: [],
  });

  const setSelectedAccountAndStore = (acc: PolkadotAccount) => {
    setSelectedAccount(acc);
    if (typeof window !== "undefined") {
      localStorage.setItem(`pdotSelectedAddress_${netKey}`, acc.address);
    }
  };

  const detectExtension = (wallet: PolkadotWalletType) => {
    return typeof window !== "undefined" && !!(window as any).injectedWeb3?.[wallet];
  };

  // Extensions inject asynchronously, so injectedWeb3 may not be populated yet on the
  // very first render; re-check shortly after mount to catch late injections.
  useEffect(() => {
    const checkDetected = () => {
      setDetectedWallets(POLKADOT_WALLETS.map((w) => w.id).filter(detectExtension));
    };
    checkDetected();
    const t = setTimeout(checkDetected, 1000);
    return () => clearTimeout(t);
  }, []);

  /**
   * Re-connects to the wallet extension and returns the signer for a specific address.
   *
   * Talks directly to the extension's raw `window.injectedWeb3[wallet]` API instead of
   * going through `polkadot-api/pjs-signer`'s `connectInjectedExtension` convenience
   * wrapper — that wrapper builds its `PolkadotSigner` with a fixed, non-extensible set
   * of signed-extension mappers, so it can't sign a transaction on a chain (e.g. Paseo
   * testnet) that has an extension it doesn't recognize. Our patched signer (see
   * ./config/pjs-signer-patched.ts) covers that gap.
   */
  const getSignerForAddress = async (wallet: PolkadotWalletType, forAddress: string) => {
    const injectedWeb3 = (window as any).injectedWeb3;
    const injected = await injectedWeb3?.[wallet]?.enable?.(POLKADOT_APP_NAME);
    if (!injected) return null;

    // The extension's raw accounts come back in its own default SS58 format, which may not
    // match `forAddress` (our stored account is re-encoded to the active network's canonical
    // prefix — see reencodeAddress in connect()/reconcileAccounts). Same account, different
    // cosmetic prefix, so match by public key rather than string equality.
    const rawAccounts = await injected.accounts.get();
    const account = rawAccounts.find((a: any) => sameAccount(a.address, forAddress));
    if (!account) return null;

    const { getPatchedPolkadotSignerFromPjs } = await import("./config/pjs-signer-patched");
    // Sign using the extension's own raw address form — it's what the extension's internal
    // account lookup (and signRaw's `address` field validation) expects, not our re-encoded one.
    return getPatchedPolkadotSignerFromPjs(account.address, injected.signer.signPayload, injected.signer.signRaw);
  };

  // Holds the current extension's account-change unsubscribe function, so switching an
  // account (or adding/removing one) inside the wallet's own UI is reflected here too,
  // instead of only ever seeing the snapshot taken at connect() time.
  const accountsUnsubRef = useRef<(() => void) | null>(null);

  // Stop listening if this provider unmounts entirely (e.g. navigating away from Polkadot)
  // while still connected — otherwise the subscription callback would keep firing and
  // calling setState on an unmounted component.
  useEffect(() => {
    return () => accountsUnsubRef.current?.();
  }, []);

  // Re-encode whatever's already selected/known the instant the network toggles, rather than
  // waiting for a fresh connect() call (which isn't guaranteed to fire — e.g. this network may
  // never have been connected under its own localStorage key before) or the next extension
  // account-change event. reencodeAddress is idempotent, so re-running this on an address
  // already in the target format is a no-op.
  useEffect(() => {
    setAccounts((prev) => prev.map((a) => ({ ...a, address: reencodeAddress(a.address, ss58Format) })));
    setSelectedAccount((prev) => (prev ? { ...prev, address: reencodeAddress(prev.address, ss58Format) } : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ss58Format]);

  const reconcileAccounts = (updated: PolkadotAccount[]) => {
    setAccounts(updated);
    setSelectedAccount((prev) => {
      if (updated.length === 0) return null;
      const stillPresent = prev && updated.find((a) => sameAccount(a.address, prev.address));
      const next = stillPresent || updated[0];
      // Keep localStorage in sync too, same as setSelectedAccountAndStore — this update
      // came from the extension itself (account switched/added/removed), not a user click,
      // so we can't route through that function directly without restructuring its signature.
      if (typeof window !== "undefined") {
        localStorage.setItem(`pdotSelectedAddress_${netKey}`, next.address);
      }
      return next;
    });
  };

  const connect = async (wallet: PolkadotWalletType, isAutoConnect = false) => {
    setIsConnecting(true);

    try {
      if (!detectExtension(wallet)) {
        if (!isAutoConnect) console.warn(`${wallet} extension not found`);
        return;
      }

      accountsUnsubRef.current?.();
      accountsUnsubRef.current = null;

      const { connectInjectedExtension } = await import("polkadot-api/pjs-signer");
      // This talks directly to the extension's own background script (window.injectedWeb3[
      // wallet].enable(...) under the hood) — unlike the Asset Hub connection below, it had no
      // timeout at all, so an unresponsive/stuck extension (SubWallet's background service
      // worker in a bad state, needs a reload, etc.) would hang the connect button forever
      // with nothing to catch it. This is a different failure mode than the Asset Hub
      // connection issues we've already handled — the extension itself not answering.
      const extension = await Promise.race([
        connectInjectedExtension(wallet, POLKADOT_APP_NAME),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${wallet} didn't respond, try reloading the page or restarting the extension.`)),
            10000,
          ),
        ),
      ]);
      const injectedAccounts = extension.getAccounts();
      if (injectedAccounts.length === 0) return;

      const mapped: PolkadotAccount[] = injectedAccounts.map((a) => ({
        address: reencodeAddress(a.address, ss58Format),
        name: a.name || "Account",
        source: wallet,
      }));

      setAccounts(mapped);

      const storedAddr = localStorage.getItem(`pdotSelectedAddress_${netKey}`);
      const preferred = mapped.find((a) => storedAddr && sameAccount(a.address, storedAddr)) || mapped[0];
      setSelectedAccountAndStore(preferred);

      setConnected(true);
      setWalletType(wallet);
      localStorage.setItem(`pdotConnected_${netKey}`, "true");
      localStorage.setItem(`pdotWalletType_${netKey}`, wallet);

      // Live-track account changes made inside the extension itself (switching the active
      // account, or adding/removing one) instead of only ever using the connect-time snapshot.
      accountsUnsubRef.current = extension.subscribe((updatedAccounts) => {
        reconcileAccounts(
          updatedAccounts.map((a) => ({
            address: reencodeAddress(a.address, ss58Format),
            name: a.name || "Account",
            source: wallet,
          })),
        );
      });

      // Kick off the Asset Hub connection in the background rather than awaiting it here —
      // a slow/unreachable RPC endpoint would otherwise leave the connect button spinning
      // forever. The balance/fee-estimate effects below pick up the api once it's ready.
      getApi().catch((err) => console.error("Failed to connect to Asset Hub:", err));
    } catch (err: any) {
      console.error("Polkadot connection error:", err?.message ?? err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = (_hardDisconnect: boolean) => {
    accountsUnsubRef.current?.();
    accountsUnsubRef.current = null;

    setConnected(false);
    setSelectedAccount(null);
    setWalletType(null);
    setAccounts([]);
    setBalance({ confirmed: 0, unconfirmed: 0, sendable: 0, fetched: false, tokens: [] });

    localStorage.removeItem(`pdotConnected_${netKey}`);
    localStorage.removeItem(`pdotWalletType_${netKey}`);
  };

  const switchWallet = async (wallet: PolkadotWalletType) => {
    disconnect(false);
    await connect(wallet);
  };

  const signMessage = async (message: string): Promise<string | null> => {
    if (!selectedAccount || !walletType) return null;

    try {
      const signer = await getSignerForAddress(walletType, selectedAccount.address);
      if (!signer) throw new Error("Connected wallet does not support message signing");

      const signature = await signer.signBytes(new TextEncoder().encode(message));
      return bytesToHex(signature);
    } catch (err) {
      console.error("Polkadot signMessage error:", err);
      return null;
    }
  };

  const txStatusRef = useRef<Record<string, "pending" | "inBlock" | "finalized">>({});

  /** The single address-check entry point exposed to the frontend. Accepts both the
   * Substrate SS58 format (native wallets, the primary format everywhere in this app)
   * and `0x...` EVM addresses (pallet-revive's fallback-account address for the same
   * account — see getEvmAddress below) since a manually-entered convert destination may
   * be given in either form. */
  const checkAddress = useCallback((address: string): AddressCheckResult => {
    if (address.startsWith("0x")) {
      const valid = ethers.isAddress(address as unknown);
      if (valid) return { valid: true, reason: null };
      if (!/^0x[a-fA-F0-9]*$/.test(address)) return { valid: false, reason: "invalid-characters" };
      if (address.length !== 42) return { valid: false, reason: "wrong-length" };
      return { valid: false, reason: "invalid" };
    }
    return isValidSs58Address(address)
      ? { valid: true, reason: null }
      : { valid: false, reason: "invalid" };
  }, []);

  const isValidAddress = useCallback((address: string): boolean => checkAddress(address).valid, [checkAddress]);

  const sendTokenTo = async (
    to: string,
    amount: number,
    _customFee?: number,
    token?: { assetId: number; decimals: number },
  ): Promise<string | null> => {
    if (!selectedAccount || !walletType) return null;

    try {
      const typedApi = await getApi();
      const signer = await getSignerForAddress(walletType, selectedAccount.address);
      if (!signer) throw new Error("Connected wallet does not support signing");

      const tx = token
        ? typedApi.tx.Assets.transfer_keep_alive({
            id: token.assetId,
            target: MultiAddress.Id(to),
            amount: toPlanck(amount, token.decimals),
          })
        : typedApi.tx.Balances.transfer_keep_alive({
            dest: MultiAddress.Id(to),
            value: toPlanck(amount, chainMeta.decimals),
          });

      return await new Promise<string | null>((resolve, reject) => {
        let resolved = false;
        const subscription = tx.signSubmitAndWatch(signer).subscribe({
          next: (event) => {
            txStatusRef.current[event.txHash] =
              event.type === "finalized"
                ? "finalized"
                : event.type === "txBestBlocksState" && event.found
                  ? "inBlock"
                  : "pending";

            if (!resolved) {
              resolved = true;
              resolve(event.txHash);
            }
            if (event.type === "finalized") subscription.unsubscribe();
          },
          error: (err) => {
            console.error("Polkadot sendTokenTo error:", err);
            if (!resolved) {
              resolved = true;
              resolve(null);
            }
          },
        });
      });
    } catch (err) {
      console.error("Polkadot sendTokenTo error:", err);
      return null;
    }
  };

  const fetchETA = async (
    txHash: string,
  ): Promise<{ estimatedSeconds: number; isCongested: boolean } | null> => {
    const status = txStatusRef.current[txHash];
    if (status === "finalized") return { estimatedSeconds: 0, isCongested: false };
    if (status === "inBlock") return { estimatedSeconds: 12, isCongested: false };
    return { estimatedSeconds: 18, isCongested: false };
  };

  const setFeeSelection = (selectedFee: "low" | "medium" | "high") => {
    setEstimatedFee((prev) => ({ ...prev, selectedFee }));
  };

  const favoriteTimers = useRef<Record<number, NodeJS.Timeout>>({});

  // Chain metadata (ticker/decimals) — read from the connected Asset Hub client rather
  // than hardcoded, since Paseo Asset Hub's decimals differ from Polkadot Asset Hub's.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getApi();
        if (cancelled) return;
        const client = clients[netKey];
        if (!client) return;

        const spec = await client.getChainSpecData();
        if (cancelled) return;

        const props = (spec.properties ?? {}) as { tokenSymbol?: unknown; tokenDecimals?: unknown };
        const rawSymbol = props.tokenSymbol;
        const rawDecimals = props.tokenDecimals;
        setChainMeta({
          ticker: (Array.isArray(rawSymbol) ? rawSymbol[0] : rawSymbol) ?? (isMainnet ? "DOT" : "PAS"),
          decimals: Number((Array.isArray(rawDecimals) ? rawDecimals[0] : rawDecimals) ?? 10),
        });
      } catch (err) {
        console.error("Failed to read Polkadot chain metadata:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getApi, isMainnet, netKey]);

  // Live balance subscription — the RPC connection is persistent, so we subscribe
  // rather than poll.
  useEffect(() => {
    // Reset to zero immediately whenever the account or network changes — Assets.tsx and
    // friends render `balance.confirmed`/`sendable` directly rather than gating on `fetched`,
    // so leaving the previous account/network's numbers in place while the new subscription
    // spins up would show a stale (and possibly very different) balance labeled as current.
    setBalance({ confirmed: 0, unconfirmed: 0, sendable: 0, fetched: false, tokens: [] });

    if (!address) return;

    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 1500;

    const subscribeWithRetry = async (attempt = 1) => {
      console.log(`[Polkadot Balance] (${netKey}) connecting for address`, address, `attempt ${attempt}/${MAX_ATTEMPTS}`);
      try {
        const typedApi = await getApi();
        if (cancelled) {
          console.log("[Polkadot Balance] effect cancelled before connection resolved, aborting subscribe");
          return;
        }
        console.log(`[Polkadot Balance] (${netKey}) connected, calling watchValue(...)`);

        subscription = typedApi.query.System.Account.watchValue(address).subscribe({
          next: (event: any) => {
            console.log(`[Polkadot Balance] (${netKey}) watchValue emitted:`, event);
            // Unlike getValue() (which resolves the decoded value directly), watchValue()'s
            // emissions are wrapped as { block, value } — the actual AccountInfo lives at
            // `.value`, not at the top level.
            const info = event?.value;
            // A freshly-created/never-funded address has no System.Account entry at all yet —
            // PAPI's chainHead-based subscription honestly reports that as undefined instead of
            // synthesizing a default zero struct the way the old @polkadot/api provider did.
            const free = info?.data?.free ? fromPlanck(info.data.free.toString(), chainMeta.decimals) : 0;
            const frozenRaw = info?.data?.frozen ?? info?.data?.miscFrozen ?? BigInt(0);
            const frozen = fromPlanck(frozenRaw.toString(), chainMeta.decimals);
            const sendable = Math.max(free - frozen, 0);

            console.log(`[Polkadot Balance] (${netKey}) computed balance:`, { free, frozen, sendable, decimals: chainMeta.decimals });
            setBalance((prev) => ({ confirmed: free, unconfirmed: 0, sendable, fetched: true, tokens: prev.tokens }));
          },
          // Without this, a mid-stream error (e.g. a chainHead reconnect) would kill the
          // subscription silently — nothing else re-triggers this effect to recover it.
          error: (err) => {
            console.error(`Polkadot balance subscription error (attempt ${attempt}/${MAX_ATTEMPTS}):`, err);
            if (!cancelled && attempt < MAX_ATTEMPTS) {
              setTimeout(() => subscribeWithRetry(attempt + 1), RETRY_DELAY_MS);
            }
          },
        });
      } catch (err) {
        console.error(`Failed to subscribe to Polkadot balance (attempt ${attempt}/${MAX_ATTEMPTS}):`, err);
        if (!cancelled && attempt < MAX_ATTEMPTS) {
          setTimeout(() => subscribeWithRetry(attempt + 1), RETRY_DELAY_MS);
        }
      }
    };

    subscribeWithRetry();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [address, getApi, chainMeta.decimals]);

  // Asset Hub pallet-assets holdings — a separate, slower-polling pull rather than a live
  // subscription like native balance above, since discovering held tokens means enumerating
  // every registered asset's metadata plus a batched balance check (see
  // fetchHeldAssetHubTokens), not something worth re-running on every block.
  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    const fetchTokens = async () => {
      try {
        const typedApi = await getApi();
        if (cancelled) return;
        const rawTokens = await fetchHeldAssetHubTokens(typedApi, address);
        if (cancelled) return;

        // Real logo + price from Subscan's maintained asset registry (asset-hub-registry.ts)
        // — mainnet only, since that registry has no Paseo/testnet coverage.
        let tokens = rawTokens;
        if (rawTokens.length > 0 && isMainnet) {
          try {
            const registry = await fetchAssetHubRegistry();
            const coingeckoIds = rawTokens
              .map((t) => registry.get(Number(t.mint))?.coingeckoId)
              .filter((id): id is string => !!id);
            const prices = await fetchAssetHubPrices(coingeckoIds);

            tokens = rawTokens.map((t) => {
              const info = registry.get(Number(t.mint));
              const usd = info?.coingeckoId ? prices[info.coingeckoId] : undefined;
              return {
                ...t,
                logo: info?.logo || t.logo,
                price: usd != null ? usd.toString() : t.price,
              };
            });
          } catch (err) {
            console.error("Failed to fetch Asset Hub registry logo/price info:", err);
          }
        }

        if (cancelled) return;
        setBalance((prev) => {
          const tokensChanged = JSON.stringify(prev.tokens) !== JSON.stringify(tokens);
          return tokensChanged ? { ...prev, tokens } : prev;
        });
      } catch (err) {
        console.error("Failed to fetch held Asset Hub tokens:", err);
      }
    };

    fetchTokens();
    const interval = setInterval(fetchTokens, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address, getApi, isMainnet]);

  const estimateFee = useCallback(async () => {
    // Reset immediately on account/network change so a stale fee from the previous context
    // isn't shown as current (several UI spots do gate on `fetched`, but not all) while the
    // new estimate is in flight.
    setEstimatedFee((prev) => ({ ...prev, low: 0, medium: 0, high: 0, fetched: false }));

    if (!selectedAccount) return;
    try {
      const typedApi = await getApi();
      const fee = await typedApi.tx.Balances.transfer_keep_alive({
        dest: MultiAddress.Id(selectedAccount.address),
        value: BigInt(1),
      }).getEstimatedFees(selectedAccount.address);

      const feeAmount = fromPlanck(fee, chainMeta.decimals);
      setEstimatedFee((prev) => ({ low: feeAmount, medium: feeAmount, high: feeAmount * 1.5, selectedFee: prev.selectedFee, fetched: true }));
    } catch (err) {
      console.error("Failed to estimate Polkadot fee:", err);
    }
  }, [selectedAccount, getApi, chainMeta.decimals]);

  useEffect(() => {
    estimateFee();
  }, [estimateFee]);

  // ============ ipow convert (via pallet-revive's Substrate-origin `Revive.call`) ============
  //
  // Polkadot Hub's EVM layer (pallet-revive) lets a plain Substrate account call an EVM
  // contract directly — no separate EVM/secp256k1 keypair needed. Every Substrate account
  // has a deterministic "fallback" EVM (H160) address (`ReviveApi.address`), and `AutoMap`
  // is enabled on this chain, so that mapping needs no explicit registration step.
  // `Revive.call`'s `value` field is the chain's native Balance type (Planck, 10-decimal);
  // pallet-revive scales it up by `NativeToEthRatio` (10^8) to the 18-decimal `msg.value`
  // the contract sees, matching the ipow contract's `NATIVE_DECIMALS = 18` constructor
  // param. So: the calldata argument for a native amount is still `ethers.parseEther`-scaled
  // (18-decimal, to match what the contract compares msg.value against), while the
  // extrinsic's own `value` (the actual token transfer) is Planck-scaled via `toPlanck`.

  const getReadOnlyEvmProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(IPOW_EVM_RPC_URL_TESTNET);
  }, []);

  const getReadOnlyConvertContract = useCallback(() => {
    return new ethers.Contract(IPOW_CONTRACT_ADDRESS_TESTNET, IPOW_ABI_JSON, getReadOnlyEvmProvider());
  }, [getReadOnlyEvmProvider]);

  const ipowInterface = useMemo(() => new ethers.Interface(IPOW_ABI_JSON), []);

  /** The connected (or any) Substrate account's pallet-revive fallback EVM address —
   * needed wherever the ipow contract expects an `0x...` identity (its own "who am I"
   * filter, or as a cross-chain destination when Polkadot is the receiving side). */
  const getEvmAddress = useCallback(
    async (ss58: string): Promise<string | null> => {
      try {
        const typedApi = await getApi();
        const addr = await typedApi.apis.ReviveApi.address(ss58);
        return addr ?? null;
      } catch (err) {
        console.error("Polkadot getEvmAddress error:", err);
        return null;
      }
    },
    [getApi],
  );

  // Keeps resolvedAddress in sync with the connected account, same idea as
  // hedera-provider.tsx's own resolvedAddress — lets comparisons against an on-chain
  // `0x...` identity (e.g. ConvertTransactionPage's isAuthorized check) read it
  // synchronously instead of awaiting getEvmAddress at every point of use.
  useEffect(() => {
    let cancelled = false;
    if (!address) {
      setResolvedAddress(null);
      return;
    }
    (async () => {
      const evm = await getEvmAddress(address);
      if (!cancelled) setResolvedAddress(evm ? evm.toLowerCase() : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [address, getEvmAddress]);

  /**
   * Encodes an ipow contract call and submits it as a `Revive.call` extrinsic signed by
   * the connected Substrate account — dry-running first via `ReviveApi.call` since,
   * unlike a plain transfer, this extrinsic must declare its weight/storage-deposit limits
   * upfront rather than having the runtime compute them.
   */
  const submitReviveCall = async (
    functionName: string,
    args: any[],
    valueDot: number,
  ): Promise<string | null> => {
    if (!selectedAccount || !walletType) {
      throw new Error("Connect your Polkadot wallet first.");
    }

    const data = ethers.getBytes(ipowInterface.encodeFunctionData(functionName, args));
    const value = toPlanck(valueDot, chainMeta.decimals);

    const typedApi = await getApi();
    const signer = await getSignerForAddress(walletType, selectedAccount.address);
    if (!signer) throw new Error("Connected wallet does not support signing");

    const dryRun = await typedApi.apis.ReviveApi.call(
      selectedAccount.address,
      IPOW_CONTRACT_ADDRESS_TESTNET,
      value,
      undefined,
      undefined,
      data,
    );

    if (!dryRun.result.success) {
      throw new Error(`ipow.${functionName} would revert (dry run failed)`);
    }

    // 20% safety margin over the dry-run estimate — the live chain's actual weight/deposit
    // can drift slightly between the dry run and the real submission.
    const weightLimit = {
      ref_time: (dryRun.weight_required.ref_time * BigInt(120)) / BigInt(100),
      proof_size: (dryRun.weight_required.proof_size * BigInt(120)) / BigInt(100),
    };
    const maxDeposit = dryRun.max_storage_deposit.value ?? BigInt(0);
    const storageDepositLimit = maxDeposit > BigInt(0) ? (maxDeposit * BigInt(120)) / BigInt(100) : BigInt(0);

    const tx = typedApi.tx.Revive.call({
      dest: IPOW_CONTRACT_ADDRESS_TESTNET,
      value,
      weight_limit: weightLimit,
      storage_deposit_limit: storageDepositLimit,
      data,
    });

    return await new Promise<string | null>((resolve) => {
      let resolved = false;
      const subscription = tx.signSubmitAndWatch(signer).subscribe({
        next: (event) => {
          txStatusRef.current[event.txHash] =
            event.type === "finalized"
              ? "finalized"
              : event.type === "txBestBlocksState" && event.found
                ? "inBlock"
                : "pending";

          if (!resolved) {
            resolved = true;
            resolve(event.txHash);
          }
          if (event.type === "finalized") subscription.unsubscribe();
        },
        error: (err) => {
          console.error(`Polkadot ipow.${functionName} error:`, err);
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        },
      });
    });
  };

  const priceCache = useRef({ dotPriceUsd: 0, btcPriceUsd: 0, lastFetched: 0 });

  const fetchMarketPrices = async () => {
    if (Date.now() - priceCache.current.lastFetched < 30000) {
      return priceCache.current;
    }

    try {
      const [dotRes, btcRes] = await Promise.all([
        fetch("https://api.binance.com/api/v3/ticker/price?symbol=DOTUSDT").then((r) => r.json()),
        fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT").then((r) => r.json()),
      ]);

      priceCache.current = {
        dotPriceUsd: parseFloat(dotRes.price),
        btcPriceUsd: parseFloat(btcRes.price),
        lastFetched: Date.now(),
      };

      return priceCache.current;
    } catch (error) {
      console.error("Failed to fetch market prices:", error);

      try {
        const cgResponse = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=polkadot,bitcoin&vs_currencies=usd",
        );
        const cgData = await cgResponse.json();
        return { dotPriceUsd: cgData.polkadot.usd, btcPriceUsd: cgData.bitcoin.usd };
      } catch (fallbackError) {
        throw new Error("All pricing oracles failed");
      }
    }
  };

  const estimateBitcoinFromNative = async (dotAmount: number): Promise<string | null> => {
    try {
      const { dotPriceUsd, btcPriceUsd } = await fetchMarketPrices();
      const btcAmount = ((dotAmount * dotPriceUsd) / btcPriceUsd) * 0.99;
      const sats = Math.floor(btcAmount * 1e8);
      return sats.toString();
    } catch (e) {
      console.error("Polkadot estimateBitcoinFromNative error:", e);
      return null;
    }
  };

  const estimateNativeFromBitcoin = async (btcSats: string): Promise<string | null> => {
    try {
      const { dotPriceUsd, btcPriceUsd } = await fetchMarketPrices();
      const btcAmount = Number(btcSats) / 1e8;
      const dotAmount = ((btcAmount * btcPriceUsd) / dotPriceUsd) * 0.99;
      return dotAmount.toFixed(18);
    } catch (e) {
      console.error("Polkadot estimateNativeFromBitcoin error:", e);
      return null;
    }
  };

  const commitNativeToBitcoin = async (
    userProgram: string,
    dotAmount: number,
    bitcoinAmountSats: number,
    destination?: { networkId: number; networkAddress: string },
  ): Promise<string | null> => {
    try {
      const weiAmount = ethers.parseEther(dotAmount.toString());
      const feeWei = (weiAmount * BigInt(50)) / BigInt(10000);
      const feeDot = Number(ethers.formatEther(feeWei));

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

      return await submitReviveCall(
        "commitNativeToBitcoin",
        [weiAmount, bitcoinAmountSats.toString(), finalNetworkId.toString(), finalNetworkAddress, finalUserProgram],
        feeDot,
      );
    } catch (e) {
      console.error("Polkadot commitNativeToBitcoin error:", e);
      return null;
    }
  };

  const commitBitcoinToNative = async (
    btcSats: string | number,
    dotAmount: number,
    userProgram: string,
  ): Promise<string | null> => {
    try {
      if (!userProgram) throw new Error("Bitcoin Program required for direct swap");
      const finalUserProgram = userProgram.startsWith("0x") ? userProgram : `0x${userProgram}`;

      const weiAmount = ethers.parseEther(dotAmount.toString());
      const feeWei = (weiAmount * BigInt(50)) / BigInt(10000);
      const feeDot = Number(ethers.formatEther(feeWei));

      return await submitReviveCall(
        "commitBitcoinToNative",
        [btcSats.toString(), weiAmount.toString(), 0, finalUserProgram, ethers.ZeroAddress, "0x", 0, "0x", 0],
        feeDot,
      );
    } catch (error) {
      console.error("Polkadot commitBitcoinToNative error:", error);
      return null;
    }
  };

  const depositApprovedConversion = async (txId: bigint): Promise<string | null> => {
    try {
      const c = getReadOnlyConvertContract();
      const conversionData = await c.conversions(txId);
      const amountToDepositDot = Number(ethers.formatEther(conversionData.nativeAmount));

      return await submitReviveCall("depositApprovedConversion", [txId], amountToDepositDot);
    } catch (e) {
      console.error("Polkadot depositApprovedConversion error:", e);
      return null;
    }
  };

  const submitBitcoinMerkleProofWithTx = async (
    txId: bigint,
    txRaw: BytesLike,
    voutIndex: bigint,
    blockHashLE: BytesLike,
    blockHeight: bigint,
    branch: BytesLike[],
    index: bigint,
  ): Promise<string | null> => {
    try {
      return await submitReviveCall(
        "submitBitcoinMerkleProofWithTx",
        [txId, txRaw, voutIndex, blockHashLE, blockHeight, branch, index],
        0,
      );
    } catch (e) {
      console.error("Polkadot submitBitcoinMerkleProofWithTx error:", e);
      return null;
    }
  };

  const getMyTxIds = async (
    phase: TxPhase = 0,
    typeFilter: TypeFilter = 0,
    bitcoinProgramFilter: string = "",
    isUserBitcoinProgramFilter: boolean = true,
  ): Promise<bigint[]> => {
    try {
      let evmUserFilter = ethers.ZeroAddress;
      if (selectedAccount) {
        evmUserFilter = (await getEvmAddress(selectedAccount.address)) ?? ethers.ZeroAddress;
      }

      if (evmUserFilter === ethers.ZeroAddress && !bitcoinProgramFilter) return [];

      const c = getReadOnlyConvertContract();

      if (bitcoinProgramFilter && bitcoinProgramFilter !== "") {
        evmUserFilter = ethers.ZeroAddress;
      }

      let programBytes = "0x";
      if (bitcoinProgramFilter) {
        programBytes = bitcoinProgramFilter.startsWith("0x") ? bitcoinProgramFilter : `0x${bitcoinProgramFilter}`;
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
      console.error("Polkadot getMyTxIds error:", e);
      return [];
    }
  };

  const getConversion = async (txId: bigint): Promise<any> => {
    try {
      const c = getReadOnlyConvertContract();
      const result = await c.getConversionWithPhase(txId);

      const raw = result[0];
      const phase = Number(result[1]);

      if (!raw || raw.user === "0x0000000000000000000000000000000000000000") return null;

      return {
        id: txId.toString(),
        phase,
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
      console.error("Polkadot getConversion error:", e);
      return null;
    }
  };

  const refundIfNotApproved = async (txId: bigint): Promise<string | null> => {
    try {
      return await submitReviveCall("refundIfNotApproved", [txId], 0);
    } catch (e) {
      console.error("Polkadot refundIfNotApproved error:", e);
      return null;
    }
  };

  const claimNativeAfterOperatorExpired = async (txId: bigint): Promise<string | null> => {
    try {
      return await submitReviveCall("claimNative_AfterOperatorExpired", [txId], 0);
    } catch (e) {
      console.error("Polkadot claimNativeAfterOperatorExpired error:", e);
      return null;
    }
  };

  const refundAfterNoProofNativeToBitcoin = async (txId: bigint): Promise<string | null> => {
    try {
      return await submitReviveCall("refundAfterNoProof_NativeToBitcoin", [txId], 0);
    } catch (e) {
      console.error("Polkadot refundAfterNoProofNativeToBitcoin error:", e);
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

  const fetchPrice = async () => {
    try {
      // PAS (Paseo's native testnet ticker) has no real market price — the price API 500s on
      // it. Use DOT's price as an indicative stand-in on testnet, same idea as showing a
      // mainnet-equivalent value for a token that has no real market of its own.
      const priceTicker = isMainnet ? chainMeta.ticker : "DOT";
      const envMode = isMainnet ? "MAINNET" : "TESTNET";
      const response = await fetch(`/api/token-price?token=${priceTicker}&env=${envMode}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      setPrice(data);
    } catch (error) {
      console.error("Error fetching Polkadot price:", error);
    }
  };

  useEffect(() => {
    // Reset immediately on network switch — otherwise the previous network's token price
    // stays on screen (mislabeled as the new network's) until the new fetch resolves.
    setPrice(null);
    fetchPrice();
    const i = setInterval(fetchPrice, 60000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainMeta.ticker, isMainnet]);

  useEffect(() => {
    // Reset to an empty (most conservative) limit immediately on network switch — this
    // gates real transaction-amount validation, so using the previous network's limits
    // during the switch window isn't just a cosmetic staleness issue. `fetched: false` here
    // is what lets BuyToken.tsx's networkState tell "still loading" apart from "genuinely no
    // tokens for this network" — without it, an empty tokens array looks the same either way.
    setSelfCustodyParameter({ network: "POLKADOT", env: isMainnet ? "MAINNET" : "TESTNET", tokens: [], fetched: false });

    let cancelled = false;
    let quickRetries = 0;
    const MAX_QUICK_RETRIES = 4;
    const QUICK_RETRY_DELAY_MS = 2000;

    const fetchSelfCustodyConstraints = async () => {
      try {
        const envMode = isMainnet ? "MAINNET" : "TESTNET";
        const response = await fetch(
          `/api/transaction/constraints/?network=POLKADOT&env=${envMode}`,
          { method: "GET", headers: { "Content-Type": "application/json" } },
        );
        const data: CustodyParams = await response.json();
        if (cancelled) return;
        if (data && data.tokens) {
          setSelfCustodyParameter({ ...data, fetched: true });
          return;
        }
      } catch (error) {
        console.error("Failed to fetch Polkadot self-custody limits:", error);
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

  // Auto-reconnect on mount / network switch.
  useEffect(() => {
    const wasConnected = localStorage.getItem(`pdotConnected_${netKey}`) === "true";
    const savedWallet = localStorage.getItem(`pdotWalletType_${netKey}`) as PolkadotWalletType;

    if (wasConnected && savedWallet) {
      connect(savedWallet, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netKey]);

  return (
    <PolkadotWalletContext.Provider
      value={{
        connected,
        isConnecting,
        walletType,
        address,
        resolvedAddress,
        accounts,
        balance,
        estimatedFee,
        selectedAccount,
        currencyTicker: chainMeta.ticker,
        decimals: chainMeta.decimals,
        ipowDecimals: IPOW_AMOUNT_DECIMALS,
        networkName: "Polkadot",
        networkDescription: {
          en: "Polkadot connects multiple specialized blockchains into one decentralized network that shares security, with Asset Hub as the parachain this app connects to for your DOT. It's a great network for you who want a trustless way to access DeFi, staking, on-chain governance, and a growing ecosystem of dApps and smart contracts.",
          id: "Polkadot menghubungkan banyak blockchain khusus ke dalam satu jaringan terdesentralisasi yang berbagi keamanan, dengan Asset Hub sebagai parachain yang terhubung dengan aplikasi ini untuk DOT kamu. Jaringan ini cocok untuk kamu yang mau cara yang trustless untuk akses DeFi, staking, on-chain governance, dan ekosistem dApp serta smart contract yang terus berkembang.",
        },
        networkLogo: polkadotnetwork,
        selfCustodyParameter,
        price,
        networkExplorer: {
          address: `${currentNetworkConfig.networkExplorer}/account/`,
          transaction: `${currentNetworkConfig.networkExplorer}/extrinsic/`,
        },
        ipowConvert: "comingsoon",
        ipowNetworkId: IPOW_NETWORK_ID,
        detectedWallets,
        setFeeSelection,
        setSelectedAccount: setSelectedAccountAndStore,
        connect,
        disconnect,
        switchWallet,
        signMessage,
        sendTokenTo,
        checkAddress,
        isValidAddress,
        fetchETA,
        getEvmAddress,
        commitNativeToBitcoin,
        commitBitcoinToNative,
        depositApprovedConversion,
        submitBitcoinMerkleProofWithTx,
        getMyTxIds,
        getConversion,
        refundIfNotApproved,
        claimNativeAfterOperatorExpired,
        refundAfterNoProofNativeToBitcoin,
        estimateBitcoinFromNative,
        estimateNativeFromBitcoin,
        anchorInfo,
        proofInfo,
        windowsFor,
        globalHeightToHashLE,
        globalHeaders,
      }}
    >
      {children}
    </PolkadotWalletContext.Provider>
  );
}
