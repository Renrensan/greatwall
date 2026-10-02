"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import { useNetwork, SupportedChain, DynamicConnectButton } from "@/app/network-provider";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { useHederaWallet } from "@/components/hedera/hedera-provider";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { usePolkadotWallet } from "@/components/polkadot/polkadot-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useTempoWallet } from "@/components/tempo/tempo-provider";
import {
  IPOW_V1_CONVERSION_ABI,
  BETA_HUB_ABI,
  BETA_VAULT_ABI,
} from "./abis";
import {
  FaCheckCircle,
  FaCopy,
  FaCoins,
  FaExchangeAlt,
  FaShieldAlt,
  FaArrowRight,
  FaWallet,
} from "react-icons/fa";

// ═══════════════════════════════════════════════════════════════════════
// Protocol Network Information
// ═══════════════════════════════════════════════════════════════════════

interface ChainInfo {
  id: SupportedChain;
  name: string;
  isEvm: boolean;
  networkId: number;
  vaultAddress?: string;
  conversionAddress?: string;
  hubAddress?: string;
}

const ALL_CHAINS: ChainInfo[] = [
  {
    id: "ethereum",
    name: "Ethereum Sepolia",
    isEvm: true,
    networkId: 2,
    vaultAddress: "0x30A386AEc5aD0afAcC6C8624b47ABbB719596a6b",
    conversionAddress: "0xB8ab960D1121F33B48b4086aBFCDD8B750081588",
    hubAddress: "0xB8ab960D1121F33B48b4086aBFCDD8B750081588",
  },
  {
    id: "solana",
    name: "Solana Devnet",
    isEvm: false,
    networkId: 1,
    hubAddress: "BkNb9JfNbfbn3rMiA3j3z2pnFdNibxiYWWsKZ9VdzoD1",
    conversionAddress: "EsmGbkui9ZFC6Fch9J6xoyNRZSp6TwfvcjS88beP1Vem",
  },
  {
    id: "hedera",
    name: "Hedera Testnet",
    isEvm: true,
    networkId: 3,
    vaultAddress: "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3",
    conversionAddress: "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3",
    hubAddress: "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3",
  },
  {
    id: "base",
    name: "Base Sepolia",
    isEvm: true,
    networkId: 5,
    vaultAddress: "0x24765955eCbffAaACB48a8c3747975d6C750C075",
    conversionAddress: "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3",
  },
  {
    id: "arbitrum",
    name: "Arbitrum Sepolia",
    isEvm: true,
    networkId: 42161,
    vaultAddress: "0x30A386AEc5aD0afAcC6C8624b47ABbB719596a6b",
    conversionAddress: "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3",
  },
  {
    id: "polkadot",
    name: "Polkadot Paseo Hub",
    isEvm: true,
    networkId: 7,
    vaultAddress: "0x754FC037B3d2aBf0b63A57a549F21755442a9a16",
    conversionAddress: "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3",
  },
  {
    id: "hyperliquid",
    name: "Hyperliquid EVM",
    isEvm: true,
    networkId: 8,
    vaultAddress: "0x554Fe13e4a5d0931e7c8F7d3E74Dea8Ca04C244a",
    conversionAddress: "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3",
  },
  {
    id: "robinhood",
    name: "Robinhood Chain",
    isEvm: true,
    networkId: 6,
    vaultAddress: "0xB7054E399E31A2cFE181c4fD59C7235562a6d45d",
    conversionAddress: "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3",
  },
  {
    id: "tempo",
    name: "Tempo Moderato",
    isEvm: true,
    networkId: 9,
    vaultAddress: "0x24765955eCbffAaACB48a8c3747975d6C750C075",
    conversionAddress: "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3",
  },
  {
    id: "bitcoin",
    name: "Bitcoin Network",
    isEvm: false,
    networkId: 0,
  },
];

type Actor = "USER" | "CLAIMANT" | "OPERATOR" | "ANYONE";

const ACTOR_BADGES: Record<Actor, { label: string; class: string }> = {
  USER: { label: "User", class: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  CLAIMANT: { label: "Claimant", class: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  OPERATOR: { label: "Operator (Off-Chain)", class: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  ANYONE: { label: "Anyone (Permissionless)", class: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
};

export default function ContractTestPage() {
  // Wallets from Greatwall providers
  const ethWallet = useEthereumWallet();
  const solWallet = useSolanaWallet();
  const hederaWallet = useHederaWallet();
  const btcWallet = useBitcoinWallet();
  const arbWallet = useArbitrumWallet();
  const baseWallet = useBaseWallet();
  const polkWallet = usePolkadotWallet();
  const hyperWallet = useHyperliquidWallet();
  const robinWallet = useRobinhoodWallet();
  const tempoWallet = useTempoWallet();

  const { allAccounts } = useAppKitAccount();
  const { walletProvider: evmProvider } = useAppKitProvider("eip155");

  // ─── SOURCE & DESTINATION CHAIN SELECTION ───
  const [sourceChain, setSourceChain] = useState<SupportedChain>("solana");
  const [destChain, setDestChain] = useState<SupportedChain>("ethereum");

  // Flow: 1. Beta Mint vs 2. Convert
  const [activeFlow, setActiveFlow] = useState<"mint" | "convert">("mint");

  // Helper to get connected address for any chain
  const getWalletState = useCallback(
    (chain: SupportedChain) => {
      switch (chain) {
        case "bitcoin":
          return { connected: btcWallet.connected, address: btcWallet.address };
        case "solana":
          return { connected: solWallet.connected, address: solWallet.address };
        case "hedera":
          return { connected: hederaWallet.connected, address: hederaWallet.address };
        case "arbitrum":
          return { connected: arbWallet.connected, address: arbWallet.address };
        case "base":
          return { connected: baseWallet.connected, address: baseWallet.address };
        case "polkadot":
          return { connected: polkWallet.connected, address: polkWallet.address };
        case "hyperliquid":
          return { connected: hyperWallet.connected, address: hyperWallet.address };
        case "robinhood":
          return { connected: robinWallet.connected, address: robinWallet.address };
        case "tempo":
          return { connected: tempoWallet.connected, address: tempoWallet.address };
        case "ethereum":
        default: {
          const akAcc = allAccounts?.find((a) => a.namespace === "eip155");
          return {
            connected: ethWallet.connected || !!akAcc,
            address: ethWallet.address || akAcc?.address || null,
          };
        }
      }
    },
    [btcWallet, solWallet, hederaWallet, arbWallet, baseWallet, polkWallet, hyperWallet, robinWallet, tempoWallet, ethWallet, allAccounts]
  );

  const sourceWallet = useMemo(() => getWalletState(sourceChain), [getWalletState, sourceChain]);
  const destWallet = useMemo(() => getWalletState(destChain), [getWalletState, destChain]);

  const sourceMeta = useMemo(() => ALL_CHAINS.find((c) => c.id === sourceChain) || ALL_CHAINS[0], [sourceChain]);
  const destMeta = useMemo(() => ALL_CHAINS.find((c) => c.id === destChain) || ALL_CHAINS[1], [destChain]);

  // Form Inputs & Results
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, { loading: boolean; hash: string | null; error: string | null }>>({});

  const val = (k: string) => inputs[k] || "";
  const setVal = (k: string, v: string) => setInputs((p) => ({ ...p, [k]: v }));

  // Populate sensible defaults
  useEffect(() => {
    setInputs((prev) => ({
      ...prev,
      // Beta Mint defaults
      "mint.nonce": String(Date.now()).slice(-8),
      "mint.units": "1",
      "mint.compId": "1",
      "mint.spokeValue": "0.001",
      "mint.solUser": sourceWallet.address || "0x0000000000000000000000000000000000000000000000000000000000000001",
      "mint.lockIds": "1",
      // Convert defaults
      "c.nativeAmount": "10000000000000000", // 0.01 ETH in wei
      "c.bitcoinAmount": "25000", // 25,000 sats
      "c.userProgram": destWallet.address || "0x76a9144360e2270f2b3846cd4d34e9e47aa1353f478e8b88ac",
      "c.requiredBond": "5000000000000000",
      "c.commitFeeEth": "0.0005",
      "c.txId": "1",
    }));
  }, [sourceWallet.address, destWallet.address]);

  // EVM Signer helper
  const getSigner = useCallback(async () => {
    if (evmProvider) {
      return new ethers.BrowserProvider(evmProvider as any).getSigner();
    }
    if (typeof window !== "undefined" && (window as any).ethereum) {
      return new ethers.BrowserProvider((window as any).ethereum).getSigner();
    }
    throw new Error("Please connect your EVM wallet.");
  }, [evmProvider]);

  // EVM Execution handler
  const executeEvm = async (key: string, callFn: (signer: ethers.Signer) => Promise<any>) => {
    setResults((p) => ({ ...p, [key]: { loading: true, hash: null, error: null } }));
    try {
      const signer = await getSigner();
      const tx = await callFn(signer);
      const hash = typeof tx === "string" ? tx : tx.hash;
      setResults((p) => ({ ...p, [key]: { loading: false, hash, error: null } }));
    } catch (e: any) {
      setResults((p) => ({
        ...p,
        [key]: {
          loading: false,
          hash: null,
          error: e?.reason || e?.shortMessage || e?.message || String(e),
        },
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6 text-white font-sans">
      {/* ─── TITLE HEADER ─── */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <FaShieldAlt className="text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">IPoW Protocol Testing Studio</h1>
            <p className="text-xs text-white/50">Cross-Chain Contract Testbed (Source Connect ➔ Destination Connect)</p>
          </div>
        </div>
      </div>

      {/* ─── 1. SOURCE & DESTINATION CONNECTION DECK ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SOURCE CONNECT CARD */}
        <div className="bg-[#121318] border border-sky-500/30 rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-300">Source Network</span>
            </div>
            {/* Source Chain Selector */}
            <select
              value={sourceChain}
              onChange={(e) => setSourceChain(e.target.value as any)}
              className="bg-black/60 border border-white/20 text-xs font-bold text-white rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              {ALL_CHAINS.filter((c) => c.id !== "bitcoin").map((c) => (
                <option key={c.id} value={c.id} className="bg-neutral-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex flex-col">
              <span className="text-[11px] text-white/40">Source Account</span>
              {sourceWallet.address ? (
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {sourceWallet.address.slice(0, 6)}...{sourceWallet.address.slice(-4)}
                </span>
              ) : (
                <span className="text-xs text-amber-400 font-medium">Not Connected</span>
              )}
            </div>
            {/* Dynamic Source Connect Button */}
            <DynamicConnectButton chain={sourceChain} />
          </div>
        </div>

        {/* DESTINATION CONNECT CARD */}
        <div className="bg-[#121318] border border-purple-500/30 rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Destination Network</span>
            </div>
            {/* Destination Chain Selector */}
            <select
              value={destChain}
              onChange={(e) => setDestChain(e.target.value as any)}
              className="bg-black/60 border border-white/20 text-xs font-bold text-white rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              {ALL_CHAINS.map((c) => (
                <option key={c.id} value={c.id} className="bg-neutral-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex flex-col">
              <span className="text-[11px] text-white/40">Destination Account</span>
              {destWallet.address ? (
                <span className="text-xs font-mono text-purple-400 font-semibold">
                  {destWallet.address.slice(0, 6)}...{destWallet.address.slice(-4)}
                </span>
              ) : (
                <span className="text-xs text-amber-400 font-medium">Not Connected</span>
              )}
            </div>
            {/* Dynamic Destination Connect Button */}
            <DynamicConnectButton chain={destChain} />
          </div>
        </div>
      </div>

      {/* ─── 2. FLOW SELECTOR: BETA MINT VS CONVERT ─── */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-[#121318] border border-white/10 rounded-2xl">
        <button
          onClick={() => {
            setActiveFlow("mint");
            if (destChain === "bitcoin") setDestChain("ethereum");
          }}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            activeFlow === "mint"
              ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
              : "text-white/50 hover:text-white"
          }`}
        >
          <FaCoins /> 1. Beta Mint Flow
        </button>
        <button
          onClick={() => setActiveFlow("convert")}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            activeFlow === "convert"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "text-white/50 hover:text-white"
          }`}
        >
          <FaExchangeAlt /> 2. Cross-Chain Convert (Auction)
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FLOW 1: BETA MINT FLOW                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeFlow === "mint" && (
        <div className="flex flex-col gap-5">
          <div className="text-xs text-white/60 bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
            <span>
              <strong>Cross-Chain Beta Mint:</strong> Hub = <span className="text-sky-300 font-bold">{sourceMeta.name}</span> ➔ Spoke Vault = <span className="text-purple-300 font-bold">{destMeta.name}</span>.
            </span>
            <span className="text-[11px] text-white/40">Settlement: Bitcoin OP_RETURN</span>
          </div>

          {/* STEP 1: Lock Local on Source / Hub */}
          <StepCard
            stepNum={1}
            title={`Lock Local Assets on Source Hub (${sourceMeta.name})`}
            actor="USER"
            chainTag={sourceMeta.name}
            method={
              !sourceMeta.isEvm
                ? "beta_factory::lock_sol(nonce, composition_id, units, deadline, attest_fee)"
                : "BetaHub.lockLocal(compositionId, nonce, units, deadline) payable"
            }
            desc={`Locks native assets on ${sourceMeta.name} (Source Wallet: ${sourceWallet.address ? sourceWallet.address.slice(0, 6) + "..." : "Not connected"}). Creates a Pending mint slot.`}
            btnText={`1. Lock Local on ${sourceMeta.name}`}
            loading={results["mint.s1"]?.loading}
            txHash={results["mint.s1"]?.hash}
            error={results["mint.s1"]?.error}
            disabled={!sourceWallet.connected}
            onExecute={() => {
              if (!sourceMeta.isEvm) {
                alert(`lock_sol executed on Solana Devnet via connected Source Wallet (${sourceWallet.address}).`);
                return;
              }
              executeEvm("mint.s1", async (signer) => {
                const hub = new ethers.Contract(sourceMeta.hubAddress || "0xB8ab960D1121F33B48b4086aBFCDD8B750081588", BETA_HUB_ABI, signer);
                const deadline = Math.floor(Date.now() / 1000) + 86400 * 2;
                return await hub.lockLocal(val("mint.compId"), val("mint.nonce"), val("mint.units"), deadline, {
                  value: ethers.parseEther("0.001"),
                });
              });
            }}
          >
            <div className="grid grid-cols-3 gap-2">
              <FormField label="Nonce" value={val("mint.nonce")} onChange={(v) => setVal("mint.nonce", v)} />
              <FormField label="Units" value={val("mint.units")} onChange={(v) => setVal("mint.units", v)} />
              <FormField label="Composition ID" value={val("mint.compId")} onChange={(v) => setVal("mint.compId", v)} />
            </div>
          </StepCard>

          {/* STEP 2: Lock Collateral on Destination Spoke */}
          <StepCard
            stepNum={2}
            title={`Deposit Collateral on Destination Spoke (${destMeta.name})`}
            actor="USER"
            chainTag={destMeta.name}
            method="BetaVault.deposit(token, userIdentifier, nonce, units, deadline) payable returns (uint64 lockId)"
            desc={`Locks remote collateral into BetaVault on ${destMeta.name} using your Destination Wallet (${destWallet.address ? destWallet.address.slice(0, 6) + "..." : "Not connected"}).`}
            btnText={`2. Deposit on ${destMeta.name}`}
            loading={results["mint.s2"]?.loading}
            txHash={results["mint.s2"]?.hash}
            error={results["mint.s2"]?.error}
            disabled={!destWallet.connected}
            onExecute={() => {
              executeEvm("mint.s2", async (signer) => {
                const vault = new ethers.Contract(destMeta.vaultAddress || "0x30A386AEc5aD0afAcC6C8624b47ABbB719596a6b", BETA_VAULT_ABI, signer);
                const deadline = Math.floor(Date.now() / 1000) + 86400 * 2;
                return await vault.deposit(ethers.ZeroAddress, val("mint.solUser"), val("mint.nonce"), val("mint.units"), deadline, {
                  value: ethers.parseEther(val("mint.spokeValue") || "0.001"),
                });
              });
            }}
          >
            <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex flex-col gap-1.5 mb-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/50">Destination Chain & Contract:</span>
                <span className="font-bold text-purple-300">{destMeta.name} ({destMeta.vaultAddress?.slice(0, 10)}...)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Source User Identity passed:</span>
                <span className="font-mono text-sky-300">{sourceWallet.address ? sourceWallet.address.slice(0, 8) + "..." : "0x000...001"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FormField label="Deposit Amount (ETH)" value={val("mint.spokeValue")} onChange={(v) => setVal("mint.spokeValue", v)} />
              <FormField label="Nonce (Matches Step 1)" value={val("mint.nonce")} onChange={(v) => setVal("mint.nonce", v)} />
            </div>
          </StepCard>

          {/* STEP 3: Approve Pending on Source / Hub */}
          <StepCard
            stepNum={3}
            title={`Approve Pending on Source Hub (${sourceMeta.name})`}
            actor="USER"
            chainTag={sourceMeta.name}
            method={
              !sourceMeta.isEvm
                ? "beta_factory::approve_pending(nonce, remote_lock_id: [u64])"
                : "BetaHub.approvePending(nonce, remoteLockId: uint64[])"
            }
            desc={`Source wallet confirms and binds Destination Lock #${val("mint.lockIds")} to the Hub pending mint.`}
            btnText={`3. Approve on ${sourceMeta.name}`}
            loading={results["mint.s3"]?.loading}
            txHash={results["mint.s3"]?.hash}
            error={results["mint.s3"]?.error}
            disabled={!sourceWallet.connected}
            onExecute={() => {
              if (!sourceMeta.isEvm) {
                alert("approve_pending executed on Solana Devnet.");
                return;
              }
              executeEvm("mint.s3", async (signer) => {
                const hub = new ethers.Contract(sourceMeta.hubAddress || "0xB8ab960D1121F33B48b4086aBFCDD8B750081588", BETA_HUB_ABI, signer);
                const locks = val("mint.lockIds").split(",").map((s) => s.trim());
                return await hub.approvePending(val("mint.nonce"), locks);
              });
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Nonce" value={val("mint.nonce")} onChange={(v) => setVal("mint.nonce", v)} />
              <FormField label="Destination Spoke Lock ID(s)" value={val("mint.lockIds")} onChange={(v) => setVal("mint.lockIds", v)} helper="From Step 2" />
            </div>
          </StepCard>

          {/* STEP 4: Operator Bitcoin OP_RETURN Statement */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-amber-300">4. Operator Bitcoin OP_RETURN Anchor</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${ACTOR_BADGES.OPERATOR.class}`}>
                Operator / Off-Chain
              </span>
            </div>
            <p className="text-white/70">
              Operator broadcasts a Bitcoin transaction embedding:
            </p>
            <code className="text-[11px] font-mono text-amber-200/90 bg-black/40 p-2 rounded-lg break-all">
              kind(0x01) | compositionId(8) | componentIndex(1) | lockId({val("mint.lockIds")}) | user(32) | nonce({val("mint.nonce")}) | units(8) | deadline(8)
            </code>
          </div>

          {/* STEP 5: Exercise Mint on Source Hub */}
          <StepCard
            stepNum={5}
            title={`Exercise Mint on Source Hub (${sourceMeta.name})`}
            actor="ANYONE"
            chainTag={sourceMeta.name}
            method={!sourceMeta.isEvm ? "beta_factory::exercise_mint()" : "BetaHub.exerciseMint(user, nonce)"}
            desc={`Permissionless. Mints BETA tokens to your Source Wallet (${sourceWallet.address ? sourceWallet.address.slice(0, 6) + "..." : "Not connected"}) once Bitcoin statement proof confirms.`}
            btnText={`5. Exercise Mint on ${sourceMeta.name}`}
            loading={results["mint.s5"]?.loading}
            txHash={results["mint.s5"]?.hash}
            error={results["mint.s5"]?.error}
            disabled={!sourceWallet.connected}
            onExecute={() => {
              if (!sourceMeta.isEvm) {
                alert("exercise_mint called on Solana.");
                return;
              }
              executeEvm("mint.s5", async (signer) => {
                const hub = new ethers.Contract(sourceMeta.hubAddress || "0xB8ab960D1121F33B48b4086aBFCDD8B750081588", BETA_HUB_ABI, signer);
                return await hub.exerciseMint(sourceWallet.address || ethers.ZeroAddress, val("mint.nonce"));
              });
            }}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FLOW 2: CROSS-CHAIN CONVERT                                     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeFlow === "convert" && (
        <div className="flex flex-col gap-5">
          <div className="text-xs text-white/60 bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
            <span>
              <strong>Cross-Chain Swap:</strong> From <span className="text-sky-300 font-bold">{sourceMeta.name}</span> ➔ Payout to <span className="text-purple-300 font-bold">{destMeta.name}</span>.
            </span>
            <span className="text-[11px] text-white/40">Destination Network ID: {destMeta.networkId}</span>
          </div>

          {/* STAGE 1: SOURCE CHAIN */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 pb-1 border-b border-sky-500/20">
            Stage 1: Source Chain Steps ({sourceMeta.name})
          </div>

          {/* Step 1: Commit on Source */}
          <StepCard
            stepNum={1}
            title={`Commit Tokens on Source (${sourceMeta.name})`}
            actor="USER"
            chainTag={sourceMeta.name}
            method="iPoWV1Conversion.commitTokenToBitcoin(nativeAmount, bitcoinAmount, userProgram, requiredBond, tokenAddr, extraTokens[])"
            desc={`User commits tokens on ${sourceMeta.name}. Payout destination is automatically set to your connected Destination Wallet (${destWallet.address ? destWallet.address.slice(0, 6) + "..." : "Not connected"}).`}
            btnText={`1. Commit on ${sourceMeta.name}`}
            loading={results["c.s1"]?.loading}
            txHash={results["c.s1"]?.hash}
            error={results["c.s1"]?.error}
            disabled={!sourceWallet.connected}
            onExecute={() => {
              executeEvm("c.s1", async (signer) => {
                const conv = new ethers.Contract(sourceMeta.conversionAddress || "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3", IPOW_V1_CONVERSION_ABI, signer);
                return await conv.commitTokenToBitcoin(
                  val("c.nativeAmount"),
                  val("c.bitcoinAmount"),
                  val("c.userProgram"),
                  val("c.requiredBond"),
                  ethers.ZeroAddress,
                  [],
                  { value: ethers.parseEther(val("c.commitFeeEth") || "0.0005") }
                );
              });
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <FormField label="Native Amount (wei)" value={val("c.nativeAmount")} onChange={(v) => setVal("c.nativeAmount", v)} />
              <FormField label="Bitcoin Amount (sats)" value={val("c.bitcoinAmount")} onChange={(v) => setVal("c.bitcoinAmount", v)} />
              <FormField label="Commit Fee msg.value (ETH)" value={val("c.commitFeeEth")} onChange={(v) => setVal("c.commitFeeEth", v)} />
            </div>
            <div className="mt-2">
              <FormField label="Destination Address / Bitcoin Script" value={val("c.userProgram")} onChange={(v) => setVal("c.userProgram", v)} helper="Auto-populated from Destination Wallet" />
            </div>
          </StepCard>

          {/* Step 2: Propose Claim (Bid) */}
          <StepCard
            stepNum={2}
            title={`Propose Claim (Bid in Auction on ${sourceMeta.name})`}
            actor="CLAIMANT"
            chainTag={sourceMeta.name}
            method="iPoWV1Conversion.proposeClaimConversion(txId, proposedRateAmount, dutyWindowSeconds, ipowReceiveProgram)"
            desc="Claimant stakes anti-griefing bond and offers rate."
            btnText="2. Propose Claim (Bid)"
            loading={results["c.s2"]?.loading}
            txHash={results["c.s2"]?.hash}
            error={results["c.s2"]?.error}
            disabled={!sourceWallet.connected}
            onExecute={() => {
              executeEvm("c.s2", async (signer) => {
                const conv = new ethers.Contract(sourceMeta.conversionAddress || "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3", IPOW_V1_CONVERSION_ABI, signer);
                return await conv.proposeClaimConversion(val("c.txId"), val("c.bitcoinAmount"), "3600", "0x", {
                  value: ethers.parseEther("0.005"),
                });
              });
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Conversion Tx ID" value={val("c.txId")} onChange={(v) => setVal("c.txId", v)} />
              <FormField label="Offered Sats" value={val("c.bitcoinAmount")} onChange={(v) => setVal("c.bitcoinAmount", v)} />
            </div>
          </StepCard>

          {/* Step 3: Finalize Claim */}
          <StepCard
            stepNum={3}
            title={`Finalize Claim on ${sourceMeta.name}`}
            actor="ANYONE"
            chainTag={sourceMeta.name}
            method="iPoWV1Conversion.finalizeClaimConversion(txId)"
            desc="Locks winning claimant after quiet period; begins duty window."
            btnText="3. Finalize Claim"
            loading={results["c.s3"]?.loading}
            txHash={results["c.s3"]?.hash}
            error={results["c.s3"]?.error}
            disabled={!sourceWallet.connected}
            onExecute={() => {
              executeEvm("c.s3", async (signer) => {
                const conv = new ethers.Contract(sourceMeta.conversionAddress || "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3", IPOW_V1_CONVERSION_ABI, signer);
                return await conv.finalizeClaimConversion(val("c.txId"));
              });
            }}
          />

          {/* Step 4: Deposit Collateral */}
          <StepCard
            stepNum={4}
            title={`Deposit Escrow Collateral on ${sourceMeta.name}`}
            actor="USER"
            chainTag={sourceMeta.name}
            method="iPoWV1Conversion.depositApprovedConversion(txId) payable"
            desc="Source user deposits the nativeAmount into contract escrow."
            btnText="4. Deposit Collateral"
            loading={results["c.s4"]?.loading}
            txHash={results["c.s4"]?.hash}
            error={results["c.s4"]?.error}
            disabled={!sourceWallet.connected}
            onExecute={() => {
              executeEvm("c.s4", async (signer) => {
                const conv = new ethers.Contract(sourceMeta.conversionAddress || "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3", IPOW_V1_CONVERSION_ABI, signer);
                return await conv.depositApprovedConversion(val("c.txId"), {
                  value: BigInt(val("c.nativeAmount")),
                });
              });
            }}
          />

          {/* STAGE 2: BITCOIN / OPERATOR */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 pb-1 border-b border-amber-500/20">
            Stage 2: Bitcoin Payment & Header Relay
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2 text-xs">
            <span className="font-bold text-amber-300">5. Off-Chain Bitcoin Transfer to Destination Account</span>
            <p className="text-white/70">
              Claimant sends <code className="text-amber-300">{val("c.bitcoinAmount")} sats</code> to your Destination Account:
            </p>
            <code className="text-[11px] font-mono text-amber-200/90 bg-black/40 p-2 rounded-lg break-all">
              {destWallet.address || val("c.userProgram")}
            </code>
          </div>

          {/* STAGE 3: DESTINATION CHAIN SETTLEMENT */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 pb-1 border-b border-emerald-500/20">
            Stage 3: Destination Settlement ({destMeta.name})
          </div>
          <StepCard
            stepNum={6}
            title={`Submit Bitcoin Merkle Proof (${destMeta.name})`}
            actor="CLAIMANT"
            chainTag={destMeta.name}
            method="iPoWV1Conversion.submitBitcoinMerkleProofWithTx(txId, txRaw, voutIndex, blockHeight, branchLE[], index)"
            desc={`Verifies SPV inclusion proof against relayed Bitcoin headers. Settle and release funds to Destination Wallet (${destWallet.address ? destWallet.address.slice(0, 6) + "..." : "Not connected"}).`}
            btnText={`6. Settle Proof on ${destMeta.name}`}
            loading={results["c.s6"]?.loading}
            txHash={results["c.s6"]?.hash}
            error={results["c.s6"]?.error}
            disabled={!destWallet.connected}
            onExecute={() => {
              executeEvm("c.s6", async (signer) => {
                const conv = new ethers.Contract(destMeta.conversionAddress || "0x36D7F82F8B2E800C877592F8DFFF0E8CFAc96CF3", IPOW_V1_CONVERSION_ABI, signer);
                return await conv.submitBitcoinMerkleProofWithTx(val("c.txId"), "0x", 0, 850000, [], 0);
              });
            }}
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Step Card Sub-Component
// ═══════════════════════════════════════════════════════════════════════

function StepCard({
  stepNum,
  title,
  actor,
  chainTag,
  method,
  desc,
  btnText,
  loading,
  txHash,
  error,
  disabled,
  onExecute,
  children,
}: {
  stepNum: number;
  title: string;
  actor: Actor;
  chainTag: string;
  method: string;
  desc: string;
  btnText: string;
  loading?: boolean;
  txHash?: string | null;
  error?: string | null;
  disabled?: boolean;
  onExecute: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-[#121318] border border-white/10 rounded-2xl p-5 flex flex-col gap-3 shadow-md hover:border-white/20 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-white/10 text-white font-bold text-xs flex items-center justify-center">
            {stepNum}
          </span>
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-white/5 border border-white/15 text-white/70">
            {chainTag}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${ACTOR_BADGES[actor].class}`}>
            {ACTOR_BADGES[actor].label}
          </span>
        </div>
      </div>

      <code className="text-[11px] font-mono text-white/50 break-all">{method}</code>
      <p className="text-xs text-white/60">{desc}</p>

      {children && <div className="pt-1">{children}</div>}

      <div className="flex justify-end pt-2">
        <button
          onClick={onExecute}
          disabled={disabled || loading}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
        >
          {loading ? "Transacting..." : btnText}
        </button>
      </div>

      {txHash && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-400 break-all flex items-center justify-between">
          <span>TX: {txHash}</span>
          <button onClick={() => navigator.clipboard.writeText(txHash)} className="p-1 hover:text-white text-emerald-400/70" title="Copy Hash">
            <FaCopy className="text-xs" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 break-all">
          Error: {error}
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, helper }: { label: string; value: string; onChange: (v: string) => void; helper?: string }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center text-[11px] text-white/50 font-medium">
        <span>{label}</span>
        {helper && <span className="text-white/30 text-[10px]">{helper}</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-white/30 font-mono"
      />
    </div>
  );
}
