// The convert screens' methods on Solana, on the new protocol's Conversion
// through @ipow/sdk (SolanaConversion): the same names and shapes as the EVM
// networks' (convertMethods.ts), so the screens stay as they are.
//
// Open here: selling SOL or a token for BTC, either as a tunnel's source
// (its sell, paid to the destination buy's address within its payment
// blocks), and a tunnel into Solana: its buy of SOL or a token, with the
// sale's terms in its memo, and the user's own payment proof (D10) when its
// operator does not deliver, which the owner asked for before a buy opens to
// testers (docs/specs/ipow-conversion-tunnel.md, Q3 in the iPoW repo). A buy
// paid from the user's own Bitcoin wallet is not open here yet.

import { SolanaConversion, addressToScript, provePaymentOnSolana, scriptToAddress, solanaPaidOutsideWindow, type SolanaSwapView, type SolanaWallet } from "@ipow/sdk";

import { TxPhase, TypeFilter } from "./evm/type";
import { NO_CONVERT, decimalString, type ConvertMethods } from "./convertMethods";

import { UI_NETWORK_IDS } from "./routes";
import { READ_ONLY_SOLANA, bitcoinExplorer, solanaConnection } from "./sdk";
import { NATIVE, assetOf, coinFor, satsFor, toUnits, tunnelOf } from "./tunnel";

const bitcoin = bitcoinExplorer;
/** Conversion's MAX_SATS on Solana. */
const MAX_SATS = BigInt(10_000_000);
const NOT_YET = "Buying on Solana with your own Bitcoin wallet is not open yet: convert from another network instead";


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

/** Conversion's FUNDING_TIME: how long a buy's operator has to lock the
 *  coin, from the end of the auction (seconds). */
const FUNDING_TIME = 30 * 60;

/** The old phase of a swap now (the screens' phases; the same rules as
 *  convertMethods.ts): a funded buy asks Bitcoin whether the user paid and
 *  whether its payment blocks have passed. */
async function phaseOf(s: SolanaSwapView, paid?: { enough: boolean } | null): Promise<TxPhase> {
  const now = Math.floor(Date.now() / 1000);
  if (s.state === "Done") return TxPhase.COMPLETED;
  if (s.state === "Refunded" || s.state === "Cancelled") return TxPhase.REFUNDED;
  if (s.state === "Reclaimed") {
    // The coin went back to the buy's operator: after the payment blocks
    // with no payment, or with one nobody completed in time.
    const sent = s.address ? await bitcoin.paymentsTo(s.address).catch(() => null) : null;
    return sent && sent.length > 0 ? TxPhase.OPERATOR_DUTY_EXPIRED : TxPhase.USER_ACTION_EXPIRED;
  }
  const pastDeadline = s.stage === "Assigned" && s.times.deadline !== null && now > s.times.deadline;
  if (s.side === "Sell") {
    if (s.stage === "Auction") return TxPhase.WAITING_OPERATOR_APPROVAL;
    if (s.stage === "Expired") return TxPhase.OPERATOR_APPROVAL_EXPIRED;
    if (s.stage === "Slashed" || pastDeadline) return TxPhase.OPERATOR_DUTY_EXPIRED;
    if (s.stage === "Proven" || s.stage === "Settled") {
      if (solanaPaidOutsideWindow(s)) return TxPhase.OPERATOR_DUTY_EXPIRED;
      const p = paid === undefined ? await provenPaid(s) : paid;
      if (p && !p.enough) return TxPhase.OPERATOR_DUTY_EXPIRED;
    }
    return TxPhase.ACTIVE_WAITING_PROOF;
  }
  if (s.state === "Open") {
    if (s.stage === "Expired" || (s.stage !== "Auction" && now > s.times.auctionEnd + FUNDING_TIME)) return TxPhase.OPERATOR_APPROVAL_EXPIRED;
    return TxPhase.WAITING_OPERATOR_APPROVAL;
  }
  // Funded: the operator locked the coin and named its address.
  if (s.stage === "Slashed" || pastDeadline) return TxPhase.OPERATOR_DUTY_EXPIRED;
  if (s.stage === "Proven" || s.stage === "Settled") return TxPhase.ACTIVE_WAITING_PROOF;
  const sent = s.address ? await bitcoin.paymentsTo(s.address).catch(() => null) : null;
  if (sent && sent.length > 0) return TxPhase.ACTIVE_WAITING_PROOF;
  if (s.payBlocks) {
    const tip = await bitcoin.tip().catch(() => null);
    if (tip !== null && tip >= s.payBlocks.last) return TxPhase.USER_ACTION_EXPIRED;
  }
  return TxPhase.WAITING_USER_ACTION;
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
      // A token's symbol and decimals: the operator's list, which sells it.
      const asset = s.token ? await assetOf("solana", s.token).catch(() => null) : null;
      // A funded buy whose payment is confirmed and whose operator will not
      // deliver its receipt (failed, or proved something else): the user's
      // own proof gives them the coin (D10).
      const now = Math.floor(Date.now() / 1000);
      const operatorDone = s.stage === "Slashed" || s.stage === "Proven" || s.stage === "Settled" || (s.stage === "Assigned" && s.times.deadline !== null && now > s.times.deadline);
      const canProve =
        s.side === "Buy" && s.state === "Funded" && !!s.address && operatorDone
          ? await bitcoin.paymentsTo(s.address).then((l) => l.some((x) => x.confirmed)).catch(() => false)
          : false;
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
        // A buy reclaimed by its operator is not a refund to the user.
        refunded: s.state === "Refunded" || s.state === "Cancelled",
        contractChainId: ctx.uiNetworkId,
        swap: s,
        token: s.token ?? NATIVE,
        tokenSymbol: s.token ? (asset?.symbol ?? `${s.token.slice(0, 6)}…`) : null,
        tokenDecimals: s.token ? (asset?.decimals ?? 9) : null,
        payBlocks: s.payBlocks,
        waitingFor: null,
        compensable: false,
        completable: false,
        provable: canProve,
        paidOutsideWindow: solanaPaidOutsideWindow(s),
        provenPaid: s.provenTxid && paid ? { txid: s.provenTxid, sats: paid.paid.toString(), enough: paid.enough } : null,
        /** A tunnel's buy, funded and still payable, whose sell the user has
         *  not made: the user signs it on the source network now. */
        tunnelSellable: linked?.leg === "buy" && !linked.tunnel.sellId && phase === TxPhase.WAITING_USER_ACTION && s.stage === "Assigned",
      };
    } catch (e) {
      console.error("getConversion error:", e);
      return null;
    }
  };

  return {
    ...NO_CONVERT,

    // At the operator's own prices (its tunnel API's assets), SOL or a token.
    estimateBitcoinFromNative: async (amount: number, token = NATIVE): Promise<string | null> =>
      satsFor("solana", token, decimalString(amount, (await assetOf("solana", token))?.decimals ?? 9)),

    estimateNativeFromBitcoin: async (btcSats: string, token = NATIVE): Promise<string | null> => {
      const n = await coinFor("solana", token, Number(btcSats));
      return n === null ? null : decimalString(n, 9);
    },

    /** Sells `amount` SOL, or of `token` (a mint), for at least `sats`, paid
     *  to the Bitcoin output script `userProgram`. */
    commitNativeToBitcoin: async (userProgram: string, amount: number, sats: number, destination?: { networkId: number; networkAddress: string }, token = NATIVE): Promise<string | null> => {
      if (destination && destination.networkId > 0) throw new Error("A swap is against BTC: a conversion to another network is a tunnel");
      const to = scriptToAddress(userProgram.startsWith("0x") ? userProgram : `0x${userProgram}`);
      if (!to) throw new Error("Not a Bitcoin address the swap can pay");
      const decimals = token === NATIVE ? 9 : ((await assetOf("solana", token))?.decimals ?? 9);
      const lamports = toUnits(decimalString(amount, decimals), decimals);
      const { swapId, signature } = await signing().sell({ lamports, sats: BigInt(Math.floor(sats)), to, token: token === NATIVE ? undefined : token });
      made.set(signature, swapId);
      return signature;
    },

    commitBitcoinToNative: async () => {
      throw new Error(NOT_YET);
    },

    tunnelSell: async (o: { token?: string; amount: bigint; sats: bigint; to: string; window: { first: number; last: number } }): Promise<bigint> => {
      const token = o.token && o.token !== NATIVE ? o.token : undefined;
      const { swapId, signature } = await signing().sellInWindow({ lamports: o.amount, sats: o.sats, to: o.to, window: o.window, token });
      made.set(signature, swapId);
      return swapId;
    },

    /**
     * A tunnel's buy (its destination leg), opened by the user, who pays its
     * job fees: `amount` (smallest units) of SOL or of `token` for `sats`, at
     * the operator's quote, the sale's terms in its memo. The user's own
     * address receives it.
     */
    tunnelBuy: async (o: { token?: string; amount: bigint; sats: bigint; memo: string }): Promise<bigint> => {
      const token = o.token && o.token !== NATIVE ? o.token : undefined;
      const { swapId, signature } = await signing().buy({ lamports: o.amount, sats: o.sats, token, memo: o.memo });
      made.set(signature, swapId);
      return swapId;
    },

    /** The user's own proof of a buy's payment (D10): adds the Bitcoin
     *  blocks the light client lacks, then proves the payment; the coin goes
     *  to the user. */
    submitBitcoinMerkleProofWithTx: async (txId: bigint): Promise<string | null> => {
      const w = ctx.getWallet();
      if (!w) throw new Error("Connect your Solana wallet first");
      return (await provePaymentOnSolana(solanaConnection(), w, txId, bitcoin)).signature;
    },

    /** A buy whose operator will not deliver: when the user paid, their own
     *  proof gives them the coin (D10). */
    claimNativeAfterOperatorExpired: async (txId: bigint): Promise<string | null> => {
      const w = ctx.getWallet();
      if (!w) throw new Error("Connect your Solana wallet first");
      return (await provePaymentOnSolana(solanaConnection(), w, txId, bitcoin)).signature;
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

    /** Ends a swap no operator took: a sell's SOL or token back, a buy cancelled;
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
