// The convert screens' methods (commitNativeToBitcoin, getConversion, ...)
// on the new protocol's Conversion, through @ipow/sdk, for an EVM network.
// The screens were written for the old protocol; these keep the methods'
// names and the shape of what they return, so the screens stay as they are.
//
// The new Conversion swaps one network's coin against real BTC, either way
// (docs/drafts/ipow-conversion-app.md in the iPoW repo). The old phases map
// onto it like this:
//   WAITING_OPERATOR_APPROVAL  the auction runs; for a buy, until the operator locks the coin
//   OPERATOR_APPROVAL_EXPIRED  no operator took it (or, for a buy, none locked in time)
//   WAITING_USER_ACTION        a buy is funded: the user pays BTC to the operator
//   USER_ACTION_EXPIRED        the buy's payment blocks passed with no payment
//   ACTIVE_WAITING_PROOF       the operator owes its BTC payment (a sell) or its receipt (a buy)
//   OPERATOR_DUTY_EXPIRED      the operator missed its deadline or was slashed
//   COMPLETED / REFUNDED       done / refunded, cancelled or reclaimed
// A sell has no "deposit" step: its coin is locked when it is made.

import { Contract, getBytes, hexlify, type Signer } from "ethers";
import {
  ABIS,
  Bitcoin,
  addressToScript,
  buy,
  cancelBuy,
  compensate,
  compensated,
  completeBuy,
  creditOf,
  expireJob,
  getSwap,
  paidOutsideWindow,
  provePayment,
  provenPayment,
  provenReceipt,
  quoteSwap,
  refundSell,
  scriptToAddress,
  sell,
  sellInWindow,
  sellPaying,
  swapsOf,
  withdrawCredit,
  type SwapView,
} from "@ipow/sdk";

import { TxPhase, TypeFilter } from "./evm/type";
import { UI_NETWORK_IDS } from "./routes";
import { bitcoinExplorer, deploymentOf, readProvider, type EvmChain } from "./sdk";
import { NATIVE, assetOf, coinFor, satsFor, toUnits, tunnelOf } from "./tunnel";

const bitcoin = bitcoinExplorer;
/** Time kept in hand before a buy's operator's deadline. */
const DEADLINE_MARGIN_SEC = 2 * 3600;
/** How many of the newest swaps a search by Bitcoin address reads. */
const PROGRAM_SCAN = 60;
/** Blocks kept in hand before a buy's last payment block. */
const PAY_MARGIN_BLOCKS = 4;
/** The same for a tunnel's sell, whose own auction (about 15 minutes) comes
 *  before its operator pays: the node takes it only with 3 blocks to spare. */
export const TUNNEL_MARGIN_BLOCKS = 6;
const ZERO = BigInt(0);

/** A number as a plain decimal string with at most `decimals` places. */
export function decimalString(n: number, decimals: number): string {
  return n.toFixed(Math.min(decimals, 18)).replace(/\.?0+$/, "") || "0";
}

/** Payments to a Bitcoin address a buy's operator named; null when the
 *  explorers did not answer. */
async function paymentsTo(address: string): Promise<{ txid: string; confirmed: boolean }[] | null> {
  try {
    return await bitcoin.paymentsTo(address);
  } catch {
    return null;
  }
}

/** The old phase of a swap now. A buy that is funded asks Bitcoin whether
 *  the user paid and whether its payment blocks have passed; a proven sell,
 *  whether its transaction paid the user enough. */
async function phaseOf(s: SwapView, fundingTime: number): Promise<TxPhase> {
  const now = Math.floor(Date.now() / 1000);
  const job = s.job;
  if (s.state === "Done") return TxPhase.COMPLETED;
  if (s.state === "Refunded" || s.state === "Cancelled") return TxPhase.REFUNDED;
  if (s.state === "Reclaimed") {
    // The coin went back to the buy's operator: after the payment blocks
    // with no payment, or with one nobody completed in time.
    const paid = s.address ? await paymentsTo(s.address) : null;
    return paid && paid.length > 0 ? TxPhase.OPERATOR_DUTY_EXPIRED : TxPhase.USER_ACTION_EXPIRED;
  }
  const pastDeadline = job.times.deadline !== null && now > job.times.deadline && job.stage === "Assigned";
  if (s.side === "Sell") {
    if (job.stage === "Auction") return TxPhase.WAITING_OPERATOR_APPROVAL;
    if (job.stage === "Expired") return TxPhase.OPERATOR_APPROVAL_EXPIRED;
    if (job.stage === "Slashed" || pastDeadline) return TxPhase.OPERATOR_DUTY_EXPIRED;
    if (job.stage === "Proven" || job.stage === "Settled") {
      // A tunnel's sell paid outside the buy's payment blocks: it pays
      // nothing there, and the user takes the coin back.
      if (paidOutsideWindow(s)) return TxPhase.OPERATOR_DUTY_EXPIRED;
      // Proven, but paying the user too little: the user takes the coin back.
      const p = await provenPayment(s, bitcoin).catch(() => null);
      if (p && !p.enough) return TxPhase.OPERATOR_DUTY_EXPIRED;
    }
    return TxPhase.ACTIVE_WAITING_PROOF;
  }
  if (s.state === "Open") {
    if (job.stage === "Expired" || (job.stage !== "Auction" && now > job.times.auctionEnd + fundingTime)) return TxPhase.OPERATOR_APPROVAL_EXPIRED;
    return TxPhase.WAITING_OPERATOR_APPROVAL;
  }
  // Funded: the operator locked the coin and named its address.
  if (job.stage === "Slashed" || pastDeadline) return TxPhase.OPERATOR_DUTY_EXPIRED;
  if (job.stage === "Proven" || job.stage === "Settled") return TxPhase.ACTIVE_WAITING_PROOF;
  const paid = s.address ? await paymentsTo(s.address) : null;
  if (paid && paid.length > 0) return TxPhase.ACTIVE_WAITING_PROOF;
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

// A buy's user names their own Bitcoin address in the form; the contract
// does not keep it (anyone may pay). Kept here so the screens can show it.
const programKey = (conversion: string, id: bigint | string) => `greatwall:convert:${conversion.toLowerCase()}:${id}:userProgram`;
function rememberProgram(conversion: string, id: bigint, program: string) {
  try {
    localStorage.setItem(programKey(conversion, id), program);
  } catch {}
}
function programOf(conversion: string, id: bigint | string): string | null {
  try {
    return localStorage.getItem(programKey(conversion, id));
  } catch {
    return null;
  }
}

export type ConvertContext = {
  chain: EvmChain;
  /** The wallet's signer, on the network's test network. */
  getSigner: () => Promise<Signer>;
  /** The connected address, or null. */
  address: string | null;
  /** The UI's own number for the network (the screens' `ipowNetworkId`). */
  uiNetworkId: number;
};

/** The convert screens' methods for one EVM network. */
export function evmConvertMethods(ctx: ConvertContext) {
  const d = deploymentOf(ctx.chain)!;
  const read = () => readProvider(ctx.chain);
  const conversion = () => new Contract(d.conversion, ABIS.conversion, read());
  let fundingTime: number | null = null;
  const funding = async () => (fundingTime ??= Number(await conversion().FUNDING_TIME()));

  // The swap made by a transaction, from its Sold or Bought event.
  /** The swaps this page made, by their transaction. */
  const made = new Map<string, bigint>();
  const madeBy = async (hash: string): Promise<bigint | null> => {
    const known = made.get(hash);
    if (known !== undefined) return known;
    const receipt = await read().getTransactionReceipt(hash);
    const c = conversion();
    for (const log of receipt?.logs ?? []) {
      if (log.address.toLowerCase() !== d.conversion.toLowerCase()) continue;
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "Sold" || parsed?.name === "Bought") return parsed.args.swapId as bigint;
    }
    return null;
  };

  /** A funded buy the user paid whose operator will not deliver: it failed
   *  (slashed, or past its deadline), or proved a close instead of the
   *  receipt. The user proves their own payment then (D10). */
  const provable = async (s: SwapView, receiptProven: boolean): Promise<boolean> => {
    if (s.side !== "Buy" || s.state !== "Funded" || !s.address) return false;
    const now = Math.floor(Date.now() / 1000);
    const st = s.job.stage;
    const failed = st === "Slashed" || (st === "Assigned" && s.job.times.deadline !== null && now > s.job.times.deadline);
    const closed = (st === "Proven" || st === "Settled") && !receiptProven;
    if (!failed && !closed) return false;
    const paid = await paymentsTo(s.address);
    return !!paid?.some((p) => p.confirmed);
  };

  const getConversion = async (txId: bigint): Promise<any> => {
    try {
      const s = await getSwap(read(), d, txId);
      let phase = await phaseOf(s, await funding());
      const job = s.job;
      // A swap that is one leg of a tunnel names the other leg's network
      // and swap (the sell's, once the user made it).
      const linked = tunnelOf(ctx.chain, txId.toString());
      const partnerChain = linked ? (linked.leg === "sell" ? linked.tunnel.toChain : linked.tunnel.fromChain) : null;
      const partnerTxId = linked ? (linked.leg === "sell" ? linked.tunnel.buyId : linked.tunnel.sellId) : null;
      const proven = job.stage === "Proven" || job.stage === "Settled";
      const payment = s.side === "Sell" && proven ? await provenPayment(s, bitcoin).catch(() => null) : null;
      const slashedUnpaid = job.stage === "Slashed" && !(await compensated(read(), d, txId).catch(() => true));
      // A proven buy is completable only when its proof is a receipt of the
      // user's payment; a proven close is not.
      const receipt = s.side === "Buy" && s.state === "Funded" && proven ? await provenReceipt(s, bitcoin).catch(() => null) : null;
      const canProve = await provable(s, receipt !== null).catch(() => false);
      // A token swap: what the amount is of (the coin when unknown here).
      const isToken = !/^0x0{40}$/i.test(s.token);
      const asset = isToken ? await assetOf(ctx.chain, s.token) : null;
      // A close proven where the receipt was owed: the operator did not deliver.
      if (canProve && phase === TxPhase.ACTIVE_WAITING_PROOF) phase = TxPhase.OPERATOR_DUTY_EXPIRED;
      return {
        id: txId.toString(),
        phase,
        user: s.user,
        isNativeToBitcoin: s.side === "Sell",
        slippage: 0,
        // Each swap is on one network against BTC: a tunnel across two
        // networks is two swaps, linked by the app.
        networkId: partnerChain ? (UI_NETWORK_IDS[partnerChain] ?? 0) : 0,
        partnerTxId,
        tunnel: linked,
        // A buy's user script is on the swap (new Conversion); a buy made
        // before that has only what this browser kept.
        userProgram: s.side === "Sell" ? scriptOf(s.address) : (s.userAddress ? scriptOf(s.userAddress) : (programOf(d.conversion, txId) ?? "0x")),
        ipowReceiveProgram: s.side === "Buy" ? scriptOf(s.address) : "0x",
        networkAddress: "0x",
        nativeAmount: s.amount.toString(),
        bitcoinAmount: s.sats.toString(),
        commitFee: (job.commitmentFee + job.escrowFee).toString(),
        reservedNative: "0",
        createdAt: job.times.opened,
        approvedAt: job.times.lastBid ?? 0,
        depositedAt: s.state === "Funded" ? (job.times.lastBid ?? 0) : 0,
        operatorDutyExpiresAt: job.times.deadline ?? 0,
        approved: job.operator !== null,
        deposited: s.state === "Funded" || s.side === "Sell",
        completed: s.state === "Done",
        // A buy reclaimed by its operator is not a refund to the user.
        refunded: s.state === "Refunded" || s.state === "Cancelled",
        contractChainId: ctx.uiNetworkId,
        // The new protocol's own view, for what the old record has no field for.
        swap: s,
        /** The token swapped, when not the network's coin. */
        token: isToken ? s.token : NATIVE,
        tokenSymbol: isToken ? (asset?.symbol ?? `${s.token.slice(0, 6)}…`) : null,
        tokenDecimals: isToken ? (asset?.decimals ?? 18) : null,
        payBlocks: s.payBlocks,
        waitingFor: s.waitingFor,
        /** A slashed swap whose user can still take the escrow's share. */
        compensable: slashedUnpaid,
        /** A funded buy whose operator's receipt is proven: anyone, the user
         *  too, can complete it now. */
        completable: receipt !== null,
        /** A paid buy whose operator will not deliver: the user proves their
         *  payment and takes the coin (D10). */
        provable: canProve,
        /** A tunnel's sell whose payment was mined outside its window. */
        paidOutsideWindow: paidOutsideWindow(s),
        /** A sell's proven payment, and whether it paid the user enough. */
        provenPaid: payment ? { txid: payment.txid, sats: payment.paid.toString(), enough: payment.enough } : null,
        /** A tunnel's buy, funded and still payable, whose sell the user has
         *  not made: the user signs it on the source network now. */
        tunnelSellable:
          linked?.leg === "buy" && !linked.tunnel.sellId && phase === TxPhase.WAITING_USER_ACTION && job.stage === "Assigned",
      };
    } catch (e) {
      console.error("getConversion error:", e);
      return null;
    }
  };

  return {
    // At the operator's own prices (its tunnel API's assets).
    estimateBitcoinFromNative: async (amount: number, token = NATIVE): Promise<string | null> =>
      satsFor(ctx.chain, token, decimalString(amount, (await assetOf(ctx.chain, token))?.decimals ?? 18)),

    estimateNativeFromBitcoin: async (btcSats: string, token = NATIVE): Promise<string | null> => {
      const n = await coinFor(ctx.chain, token, Number(btcSats));
      return n === null ? null : decimalString(n, 8);
    },

    /** Sells `amount` of the coin, or of `token`, for at least `sats`, paid
     *  to the Bitcoin output script `userProgram`. A conversion to another
     *  network is a tunnel, not this. */
    commitNativeToBitcoin: async (
      userProgram: string,
      amount: number,
      sats: number,
      destination?: { networkId: number; networkAddress: string },
      token = NATIVE
    ): Promise<string | null> => {
      if (destination && destination.networkId > 0) throw new Error("A swap is against BTC: a conversion to another network is a tunnel");
      const to = scriptToAddress(userProgram.startsWith("0x") ? userProgram : `0x${userProgram}`);
      if (!to) throw new Error("Not a Bitcoin address the swap can pay");
      const signer = await ctx.getSigner();
      const quote = await quoteSwap(read(), d);
      const decimals = (await assetOf(ctx.chain, token))?.decimals ?? 18;
      const { swapId, txHash } = await sell(signer, d, quote, {
        token: token === NATIVE ? undefined : token,
        amount: toUnits(decimalString(amount, decimals), decimals),
        sats: BigInt(Math.floor(sats)),
        to,
      });
      rememberProgram(d.conversion, swapId, userProgram);
      made.set(txHash, swapId);
      return txHash;
    },

    /**
     * A tunnel's sell (T1): `amount` (smallest units) of the coin for at least
     * `sats`, paid to the destination buy's address, mined within its payment
     * blocks. A payment outside them does not complete the sell: the coin
     * comes back.
     */
    tunnelSell: async (o: { token?: string; amount: bigint; sats: bigint; to: string; window: { first: number; last: number } }): Promise<bigint> => {
      const signer = await ctx.getSigner();
      const quote = await quoteSwap(read(), d);
      const { swapId, txHash } = await sellInWindow(signer, d, quote, { ...o, token: o.token === NATIVE ? undefined : o.token });
      made.set(txHash, swapId);
      return swapId;
    },

    /** The user's sell on this network that already pays `address` (a
     *  tunnel's buy address): a second one would be lost. */
    sellPaying: async (address: string): Promise<bigint | null> => {
      if (!ctx.address) return null;
      return (await sellPaying(read(), d, ctx.address, address))?.id ?? null;
    },

    /**
     * A tunnel's buy (its destination leg), opened by the user, who pays its
     * job fees: `amount` (smallest units) of the coin or of `token` for
     * `sats`, at the operator's quote. The user's own address receives it.
     */
    tunnelBuy: async (o: { token?: string; amount: bigint; sats: bigint; memo: string }): Promise<bigint> => {
      const signer = await ctx.getSigner();
      const quote = await quoteSwap(read(), d);
      const { swapId, txHash } = await buy(signer, d, quote, { token: o.token && o.token !== NATIVE ? o.token : undefined, amount: o.amount, sats: o.sats, memo: o.memo });
      made.set(txHash, swapId);
      return swapId;
    },

    /** Buys `amount` of the coin, or of `token`, for `sats`. The user pays
     *  once an operator locks the coin and names its address. */
    commitBitcoinToNative: async (btcSats: string | number, amount: number, userProgram: string, token = NATIVE): Promise<string | null> => {
      const signer = await ctx.getSigner();
      const quote = await quoteSwap(read(), d);
      const decimals = (await assetOf(ctx.chain, token))?.decimals ?? 18;
      // The user's own Bitcoin address goes on the swap, for any browser to show.
      const from = userProgram ? scriptToAddress(userProgram.startsWith("0x") ? userProgram : `0x${userProgram}`) : null;
      const { swapId, txHash } = await buy(signer, d, quote, {
        token: token === NATIVE ? undefined : token,
        amount: toUnits(decimalString(amount, decimals), decimals),
        sats: BigInt(btcSats.toString()),
        from: from ?? undefined,
      });
      if (userProgram) rememberProgram(d.conversion, swapId, userProgram);
      made.set(txHash, swapId);
      return txHash;
    },

    /** The new protocol has no deposit after approval: a sell's coin is
     *  locked when it is made, and a buy's operator locks its own. */
    depositApprovedConversion: async (_txId: bigint): Promise<string | null> => {
      throw new Error("Nothing to deposit: the coin was locked when the swap was made");
    },

    /** The user's own proof of a buy's payment (D10): adds the Bitcoin
     *  blocks the light client lacks, then proves the payment; the coin goes
     *  to the user. */
    submitBitcoinMerkleProofWithTx: async (txId: bigint): Promise<string | null> => {
      return (await provePayment(await ctx.getSigner(), d, txId, bitcoin)).txHash;
    },

    getMyTxIds: async (phase: TxPhase = 0, typeFilter: TypeFilter = 0, bitcoinProgramFilter = "", _isUserProgram = true): Promise<bigint[]> => {
      try {
        // By a Bitcoin address (the Bitcoin view): the swaps that pay it (a
        // sell) or that this browser made paid from it (a buy), among the
        // newest; no EVM wallet needed. Otherwise the wallet's own swaps.
        let mine: SwapView[];
        if (bitcoinProgramFilter) {
          const want = (bitcoinProgramFilter.startsWith("0x") ? bitcoinProgramFilter : `0x${bitcoinProgramFilter}`).toLowerCase();
          const c = conversion();
          const count = Number(await c.swapCount());
          const ids = Array.from({ length: Math.min(count, PROGRAM_SCAN) }, (_, i) => count - i);
          const raw = await Promise.all(ids.map((id) => c.getSwap(id)));
          const hits = ids.filter((id, i) => {
            const side = Number(raw[i].side);
            if (side === 1) return String(raw[i].script).toLowerCase() === want;
            return side === 2 && (programOf(d.conversion, String(id)) ?? "").toLowerCase() === want;
          });
          mine = await Promise.all(hits.map((id) => getSwap(read(), d, id)));
        } else {
          if (!ctx.address) return [];
          mine = await swapsOf(read(), d, ctx.address);
        }
        const ft = await funding();
        const out: bigint[] = [];
        for (const s of mine) {
          if (typeFilter === TypeFilter.BITCOIN_TO_NATIVE && s.side !== "Buy") continue;
          if (typeFilter === TypeFilter.NATIVE_TO_BITCOIN && s.side !== "Sell") continue;
          if (typeFilter === TypeFilter.NATIVE_TO_NATIVE_IN || typeFilter === TypeFilter.NATIVE_TO_NATIVE_OUT) continue;
          if (phase && (await phaseOf(s, ft)) !== phase) continue;
          out.push(s.id);
        }
        return out;
      } catch (e) {
        console.error("getMyTxIds error:", e);
        return [];
      }
    },

    getConversion,

    /** The job's anchor: [its height, the first height of its epoch (not
     *  kept by the new protocol: null)]. */
    anchorInfo: async (txId: bigint): Promise<any[] | null> => {
      const s = await getSwap(read(), d, txId).catch(() => null);
      if (!s?.job.times.anchored) return null;
      const duty = await new Contract(d.protocol, ABIS.protocol, read()).getDuty(s.job.id);
      return [BigInt(duty.anchor.height), null];
    },

    /** The operator's proven Bitcoin transaction, in the old record's order:
     *  [set, verified, invalid, attempts, txid LE, block hash LE, height,
     *  sats, script]. */
    proofInfo: async (txId: bigint): Promise<any[] | null> => {
      const s = await getSwap(read(), d, txId).catch(() => null);
      const txid = s?.job.provenTxid;
      if (!s || !txid) return null;
      const tx = await bitcoin.tx(txid).catch(() => null);
      const le = hexlify(getBytes("0x" + txid).reverse());
      return [true, true, false, 1, le, null, tx?.height ?? null, s.sats, scriptOf(s.address)];
    },

    // The old protocol streamed Bitcoin headers per conversion; the new one
    // keeps them in its light client, so these have nothing to show.
    windowsFor: async (_txId: bigint): Promise<any | null> => null,
    globalHeightToHashLE: async (_h: bigint): Promise<any | null> => null,
    globalHeaders: async (_hashLE: any): Promise<any | null> => null,

    /** Ends a swap no operator took: a sell's coin back, a buy cancelled.
     *  The job's fees go to the payer's credit on the protocol (Conversion
     *  expires the job as it ends the swap; a Conversion from before that
     *  needs the step here), to withdraw with `withdrawFeeCredit`. */
    refundIfNotApproved: async (txId: bigint): Promise<string | null> => {
      const signer = await ctx.getSigner();
      const s = await getSwap(read(), d, txId);
      const { txHash } = s.side === "Sell" ? await refundSell(signer, d, txId) : await cancelBuy(signer, d, txId);
      const me = await signer.getAddress();
      if (s.job.stage === "Expired" && s.job.payer.toLowerCase() === me.toLowerCase()) {
        const job = await new Contract(d.protocol, ABIS.protocol, read()).getJob(s.job.id);
        if (!job.feesReturned) await expireJob(signer, d, s.job.id).catch(() => null);
      }
      return txHash;
    },

    /** The fees of the user's jobs that nobody took, held for them by the
     *  protocol until withdrawn: in the coin's smallest units. */
    feeCredit: async (): Promise<bigint> => (ctx.address ? creditOf(read(), d, ctx.address) : ZERO),

    /** Withdraws that credit to the wallet: one transaction for all of it. */
    withdrawFeeCredit: async (): Promise<string> => (await withdrawCredit(await ctx.getSigner(), d)).txHash,

    /** A sell whose operator missed its deadline or was slashed: the coin
     *  back (with the escrow's share when slashed). */
    refundAfterNoProofNativeToBitcoin: async (txId: bigint): Promise<string | null> => {
      const s = await getSwap(read(), d, txId);
      // Only a proven payment too small needs its transaction; a missed
      // deadline, a slash or a payment outside the window does not.
      const proven = (s.job.stage === "Proven" || s.job.stage === "Settled") && !paidOutsideWindow(s);
      const p = proven ? await provenPayment(s, bitcoin) : null;
      const raw = p && !p.enough ? await p.raw() : "0x";
      const { txHash } = await refundSell(await ctx.getSigner(), d, txId, raw);
      return txHash;
    },

    /** A buy whose operator will not deliver: when the user paid, their
     *  own proof gives them the coin (D10); when slashed, the escrow's share
     *  goes to them too. */
    claimNativeAfterOperatorExpired: async (txId: bigint): Promise<string | null> => {
      const s = await getSwap(read(), d, txId);
      const signer = await ctx.getSigner();
      // Each on its own: a proof that fails does not hold back the escrow's share.
      let hash: string | null = null;
      let proofError: unknown = null;
      if (s.state === "Funded" && s.address && (await paymentsTo(s.address))?.some((p) => p.confirmed)) {
        try {
          hash = (await provePayment(signer, d, txId, bitcoin)).txHash;
        } catch (e) {
          proofError = e;
        }
      }
      if (s.job.stage === "Slashed" && !(await compensated(read(), d, txId))) {
        hash = (await compensate(signer, d, txId)).txHash;
      }
      if (proofError) throw proofError;
      if (!hash) throw new Error("Nothing to claim: no payment of yours was found, and the operator was not slashed");
      return hash;
    },

    /** Gives a buy's coin to its user once the operator's receipt is proven:
     *  the user's wallet may do it rather than wait for the operator. */
    completeConversion: async (txId: bigint): Promise<string | null> => {
      return (await completeBuy(await ctx.getSigner(), d, txId, bitcoin)).txHash;
    },

    /** The test RWA tokens' faucet (MockRWA.faucet): a few tokens to the
     *  wallet, once every few hours. */
    faucet: async (token: string): Promise<string> => {
      const signer = await ctx.getSigner();
      const c = new Contract(token, ["function faucet()", "function FAUCET_COOLDOWN() view returns (uint256)", "error FaucetCoolingDown(uint256 nextAt)"], signer);
      try {
        const tx = await c.faucet();
        await tx.wait();
        return tx.hash;
      } catch (e: any) {
        // ethers v6 decodes only Error(string) and Panic; the custom error is parsed here.
        let parsed: any = null;
        try { parsed = e?.data ? c.interface.parseError(e.data) : null; } catch {}
        if (parsed?.name === "FaucetCoolingDown") throw new Error(`The faucet gave you some already: again at ${new Date(Number(parsed.args[0]) * 1000).toLocaleTimeString()}`);
        throw e;
      }
    },

    /** The most sats a buy may pay here (Conversion.maxSats). */
    maxSats: async (): Promise<bigint> => BigInt(await conversion().maxSats()),

    /** The swap a transaction of this network made. */
    swapMadeBy: madeBy,

    /**
     * Whether the user may pay a buy's BTC now, checked afresh: the swap is
     * funded, its payment blocks have at least `PAY_MARGIN_BLOCKS` to go, and
     * nothing paid the operator's address yet (it is used once). What to pay
     * and where, when it may.
     */
    checkPayable: async (
      txId: bigint,
      marginBlocks = PAY_MARGIN_BLOCKS
    ): Promise<
      | { ok: true; address: string; btc: number; sats: bigint; payBlocks: { first: number; last: number }; user: string; amount: bigint; token: string }
      | { ok: false; reason: string }
    > => {
      const s = await getSwap(read(), d, txId);
      if (s.side !== "Buy" || s.state !== "Funded" || !s.address || !s.payBlocks) return { ok: false, reason: "This swap is not waiting for a payment." };
      // Only while the operator still owes its receipt, with time to make it.
      const now = Math.floor(Date.now() / 1000);
      if (s.job.stage !== "Assigned" || s.job.times.deadline === null) return { ok: false, reason: "The operator can no longer complete this swap: do not pay." };
      if (s.job.times.deadline - now < DEADLINE_MARGIN_SEC) return { ok: false, reason: "The operator's deadline is too close: do not pay." };
      const [tip, paid] = await Promise.all([bitcoin.tip().catch(() => null), paymentsTo(s.address)]);
      if (tip === null || paid === null) return { ok: false, reason: "Bitcoin explorers did not answer: try again in a moment." };
      if (paid.length > 0) return { ok: false, reason: "This address was already paid. Do not pay again." };
      if (tip + marginBlocks > s.payBlocks.last) return { ok: false, reason: "Too close to the end of the payment blocks: a payment now may not be mined in time." };
      return { ok: true, address: s.address, btc: Number(s.sats) / 1e8, sats: s.sats, payBlocks: s.payBlocks, user: s.user, amount: s.amount, token: s.token };
    },
  };
}

export type ConvertMethods = ReturnType<typeof evmConvertMethods>;

const notHere = async (): Promise<never> => {
  throw new Error("Convert is not open on this network yet");
};

/** The methods' stand-ins before a network's provider is mounted. */
export const NO_CONVERT: ConvertMethods = {
  estimateBitcoinFromNative: async () => null,
  estimateNativeFromBitcoin: async () => null,
  commitNativeToBitcoin: notHere,
  commitBitcoinToNative: notHere,
  depositApprovedConversion: notHere,
  submitBitcoinMerkleProofWithTx: notHere,
  getMyTxIds: async () => [],
  getConversion: async () => null,
  anchorInfo: async () => null,
  proofInfo: async () => null,
  windowsFor: async () => null,
  globalHeightToHashLE: async () => null,
  globalHeaders: async () => null,
  refundIfNotApproved: notHere,
  refundAfterNoProofNativeToBitcoin: notHere,
  claimNativeAfterOperatorExpired: notHere,
  swapMadeBy: async () => null,
  completeConversion: notHere,
  maxSats: async () => BigInt(0),
  checkPayable: async () => ({ ok: false, reason: "Convert is not open on this network yet" }),
  tunnelSell: notHere,
  tunnelBuy: notHere,
  sellPaying: async () => null,
  faucet: notHere,
  feeCredit: async () => BigInt(0),
  withdrawFeeCredit: notHere,
};
