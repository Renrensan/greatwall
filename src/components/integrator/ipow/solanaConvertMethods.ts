// The convert screens' methods on Solana, on the new protocol's Conversion
// through @ipow/sdk (SolanaConversion): the same names and shapes as the EVM
// networks' (convertMethods.ts), so the screens stay as they are.
//
// Open here: selling SOL for BTC, and SOL as a tunnel's source (its sell,
// paid to the destination buy's address within its payment blocks). Buying
// SOL, and so a tunnel into Solana, waits for the user's own payment proof
// (D10) on Solana: the owner decided a buy opens to testers only with it
// (docs/drafts/ipow-conversion-tunnel.md, Q3 in the iPoW repo).

import { Bitcoin, SolanaConversion, addressToScript, scriptToAddress, solanaPaidOutsideWindow, type SolanaSwapView, type SolanaWallet } from "@ipow/sdk";

import { TxPhase, TypeFilter } from "./evm/type";
import { NO_CONVERT, decimalString, type ConvertMethods } from "./convertMethods";

import { UI_NETWORK_IDS } from "./routes";
import { READ_ONLY_SOLANA, bitcoinExplorer, solanaConnection } from "./sdk";
import { NATIVE, coinFor, satsFor, toUnits, tunnelOf } from "./tunnel";

const bitcoin = bitcoinExplorer;
/** Conversion's MAX_SATS on Solana. */
const MAX_SATS = BigInt(10_000_000);
const NOT_YET = "Converting into SOL opens once proving your own Bitcoin payment works on Solana";


/** What a proven sell's transaction paid the user's address in one output,
 *  the most, and whether that is its sats; null when unknown. */
async function provenPaid(s: SolanaSwapView): Promise<{ paid: bigint; enough: boolean } | null> {
  if (!s.provenTxid || !s.address) return null;
  const script = addressToScript(s.address).slice(2).toLowerCase();
  const outs = await bitcoin.outputs(s.provenTxid).catch(() => null);
  if (!outs) return null;
  const paid = outs.filter((o) => o.script.toLowerCase() === script).reduce((m, o) => (o.sats > m ? o.sats : m), BigInt(0));
  return { paid, enough: paid >= s.sats };
}

/** The old phase of a sell now (the screens' phases; see convertMethods.ts). */
async function phaseOf(s: SolanaSwapView, paid?: { enough: boolean } | null): Promise<TxPhase> {
  const now = Math.floor(Date.now() / 1000);
  if (s.state === "Done") return TxPhase.COMPLETED;
  if (s.state === "Refunded" || s.state === "Cancelled" || s.state === "Reclaimed") return TxPhase.REFUNDED;
  if (s.stage === "Auction") return TxPhase.WAITING_OPERATOR_APPROVAL;
  if (s.stage === "Expired") return TxPhase.OPERATOR_APPROVAL_EXPIRED;
  if (s.stage === "Slashed" || (s.stage === "Assigned" && s.times.deadline !== null && now > s.times.deadline)) return TxPhase.OPERATOR_DUTY_EXPIRED;
  if (s.side === "Sell" && (s.stage === "Proven" || s.stage === "Settled")) {
    if (solanaPaidOutsideWindow(s)) return TxPhase.OPERATOR_DUTY_EXPIRED;
    const p = paid === undefined ? await provenPaid(s) : paid;
    if (p && !p.enough) return TxPhase.OPERATOR_DUTY_EXPIRED;
  }
  return TxPhase.ACTIVE_WAITING_PROOF;
}

const scriptOf = (address: string | null) => {
  if (!address) return "0x";
  try {
    return addressToScript(address);
  } catch {
    return "0x";
  }
};

export type SolanaConvertContext = {
  /** The connected wallet, or null. */
  getWallet: () => SolanaWallet | null;
  /** The connected address, or null. */
  address: string | null;
  uiNetworkId: number;
};

/** The convert screens' methods on Solana. */
export function solanaConvertMethods(ctx: SolanaConvertContext): ConvertMethods {
  const read = () => new SolanaConversion(solanaConnection(), READ_ONLY_SOLANA);
  const signing = () => {
    const w = ctx.getWallet();
    if (!w) throw new Error("Connect your Solana wallet first");
    return new SolanaConversion(solanaConnection(), w);
  };
  /** The swaps this page made, by their transaction's signature. */
  const made = new Map<string, bigint>();

  const getConversion = async (txId: bigint): Promise<any> => {
    try {
      const s = await read().getSwap(txId);
      const proven = s.stage === "Proven" || s.stage === "Settled";
      const paid = s.side === "Sell" && proven ? await provenPaid(s) : null;
      const phase = await phaseOf(s, paid);
      const linked = tunnelOf("solana", txId.toString());
      const partnerChain = linked ? (linked.leg === "sell" ? linked.tunnel.toChain : linked.tunnel.fromChain) : null;
      return {
        id: txId.toString(),
        phase,
        user: s.user,
        isNativeToBitcoin: s.side === "Sell",
        slippage: 0,
        networkId: partnerChain ? (UI_NETWORK_IDS[partnerChain] ?? 0) : 0,
        partnerTxId: linked ? (linked.leg === "sell" ? linked.tunnel.buyId : linked.tunnel.sellId) : null,
        tunnel: linked,
        userProgram: s.side === "Sell" ? scriptOf(s.address) : "0x",
        ipowReceiveProgram: s.side === "Buy" ? scriptOf(s.address) : "0x",
        networkAddress: "0x",
        nativeAmount: s.amount.toString(),
        bitcoinAmount: s.sats.toString(),
        commitFee: "0",
        reservedNative: "0",
        createdAt: s.times.opened,
        approvedAt: s.operator ? s.times.auctionEnd : 0,
        depositedAt: 0,
        operatorDutyExpiresAt: s.times.deadline ?? 0,
        approved: s.operator !== null,
        deposited: s.side === "Sell" || s.state === "Funded",
        completed: s.state === "Done",
        refunded: s.state === "Refunded" || s.state === "Cancelled",
        contractChainId: ctx.uiNetworkId,
        swap: s,
        token: NATIVE,
        tokenSymbol: null,
        tokenDecimals: null,
        payBlocks: s.payBlocks,
        waitingFor: null,
        compensable: false,
        completable: false,
        provable: false,
        paidOutsideWindow: solanaPaidOutsideWindow(s),
        provenPaid: s.provenTxid && paid ? { txid: s.provenTxid, sats: paid.paid.toString(), enough: paid.enough } : null,
        tunnelSellable: false,
      };
    } catch (e) {
      console.error("getConversion error:", e);
      return null;
    }
  };

  return {
    ...NO_CONVERT,

    // At the operator's own prices (its tunnel API's assets). SOL only: the
    // SDK's token swaps on Solana are not built.
    estimateBitcoinFromNative: async (amount: number, token = NATIVE): Promise<string | null> =>
      token === NATIVE ? satsFor("solana", NATIVE, decimalString(amount, 9)) : null,

    estimateNativeFromBitcoin: async (btcSats: string, token = NATIVE): Promise<string | null> => {
      const n = token === NATIVE ? await coinFor("solana", NATIVE, Number(btcSats)) : null;
      return n === null ? null : decimalString(n, 9);
    },

    /** Sells `amount` SOL for at least `sats`, paid to the Bitcoin output
     *  script `userProgram`. */
    commitNativeToBitcoin: async (userProgram: string, amount: number, sats: number, destination?: { networkId: number; networkAddress: string }): Promise<string | null> => {
      if (destination && destination.networkId > 0) throw new Error("A swap is against BTC: a conversion to another network is a tunnel");
      const to = scriptToAddress(userProgram.startsWith("0x") ? userProgram : `0x${userProgram}`);
      if (!to) throw new Error("Not a Bitcoin address the swap can pay");
      const lamports = toUnits(decimalString(amount, 9), 9);
      const { swapId, signature } = await signing().sell({ lamports, sats: BigInt(Math.floor(sats)), to });
      made.set(signature, swapId);
      return signature;
    },

    commitBitcoinToNative: async () => {
      throw new Error(NOT_YET);
    },

    tunnelSell: async (o: { token?: string; amount: bigint; sats: bigint; to: string; window: { first: number; last: number } }): Promise<bigint> => {
      if (o.token && o.token !== NATIVE) throw new Error("Selling a token on Solana is not available yet");
      const { swapId, signature } = await signing().sellInWindow({ lamports: o.amount, sats: o.sats, to: o.to, window: o.window });
      made.set(signature, swapId);
      return swapId;
    },

    sellPaying: async (address: string): Promise<bigint | null> => {
      if (!ctx.address) return null;
      return (await read().sellPaying(ctx.address, address))?.id ?? null;
    },

    getMyTxIds: async (phase: TxPhase = 0, typeFilter: TypeFilter = 0, bitcoinProgramFilter = ""): Promise<bigint[]> => {
      // A search by Bitcoin address reads every swap: not here.
      if (bitcoinProgramFilter || !ctx.address) return [];
      try {
        const out: bigint[] = [];
        for (const s of await read().swapsOf(ctx.address)) {
          if (typeFilter === TypeFilter.BITCOIN_TO_NATIVE && s.side !== "Buy") continue;
          if (typeFilter === TypeFilter.NATIVE_TO_BITCOIN && s.side !== "Sell") continue;
          if (typeFilter === TypeFilter.NATIVE_TO_NATIVE_IN || typeFilter === TypeFilter.NATIVE_TO_NATIVE_OUT) continue;
          if (phase && (await phaseOf(s)) !== phase) continue;
          out.push(s.id);
        }
        return out;
      } catch (e) {
        console.error("getMyTxIds error:", e);
        return [];
      }
    },

    getConversion,

    proofInfo: async (txId: bigint): Promise<any[] | null> => {
      const s = await read().getSwap(txId).catch(() => null);
      if (!s?.provenTxid) return null;
      const le = "0x" + (s.provenTxid.match(/../g) ?? []).reverse().join("");
      return [true, true, false, 1, le, null, s.provenHeight, s.sats, scriptOf(s.address)];
    },

    /** Ends a swap no operator took: a sell's SOL back, a buy cancelled;
     *  then the job's fees back to the wallet. */
    refundIfNotApproved: async (txId: bigint): Promise<string | null> => {
      const s = await read().getSwap(txId);
      const c = signing();
      const { signature } = s.side === "Sell" ? await c.refundSell(txId) : await c.cancel(txId);
      // The user paid the job's fees: an expired job returns them.
      await c.reclaimFees(txId).catch((e) => console.warn("The fees were not reclaimed yet:", e));
      return signature;
    },

    /** A sell whose operator missed its deadline, was slashed, paid too
     *  little or paid outside the tunnel's window: the SOL back. */
    refundAfterNoProofNativeToBitcoin: async (txId: bigint): Promise<string | null> => {
      const s = await read().getSwap(txId);
      // Only a proven payment too small needs its transaction.
      const needsTx = (s.stage === "Proven" || s.stage === "Settled") && !solanaPaidOutsideWindow(s) && s.provenTxid;
      const raw = needsTx ? await bitcoin.rawTx(s.provenTxid!) : null;
      const bytes = raw ? Uint8Array.from((raw.replace(/^0x/, "").match(/../g) ?? []).map((b) => parseInt(b, 16))) : new Uint8Array();
      return (await signing().refundSell(txId, bytes)).signature;
    },

    maxSats: async (): Promise<bigint> => MAX_SATS,

    swapMadeBy: async (hash: string): Promise<bigint | null> => made.get(hash) ?? null,
  };
}
