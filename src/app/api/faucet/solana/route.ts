// The faucet of Solana devnet: this server's faucet key is the mock RWA
// tokens' mint authority (a test key) and mints a claim's worth to the
// address asked for, adding a little SOL in the same transaction when the
// address has too little for fees. The faucet pays the fee and the token
// account's rent. The EVM networks' faucet is /api/faucet/[chain].
//
//   POST /api/faucet/solana  {address, mint}    mint: an RWA token's mint, or "gas"
//   -> {signature, hash, amount, symbol, gas: {amount, symbol} | null}
//
// Limits (../limits.ts): this site only, ten claims an hour per visitor,
// each address once a day per token and once a day for SOL.

import { NextResponse } from "next/server";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createAssociatedTokenAccountIdempotentInstruction, createMintToInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";

import { RWA_TOKENS } from "@/components/integrator/ipow/rwaTokens";
import { PUBLIC_FAUCET, refused, take, takeDrip, type Hold } from "../limits";

export const runtime = "nodejs";

/** One drip of SOL, and the balance under which an address gets one. */
const DRIP = 0.05 * LAMPORTS_PER_SOL;
const BELOW = 0.01 * LAMPORTS_PER_SOL;

function faucetKey(): Keypair | null {
  const raw = process.env.FAUCET_SOLANA_KEY;
  if (!raw) return null;
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  } catch {
    return null;
  }
}

const fail = (error: string, status: number, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

export async function POST(req: Request) {
  const no = refused(req);
  if (no) return no;
  const key = faucetKey();
  if (!key) return fail("The Solana faucet is not set up on this server", 503);
  const { address, mint } = (await req.json().catch(() => ({}))) as { address?: unknown; mint?: unknown };
  if (typeof address !== "string" || typeof mint !== "string") return fail("address and mint are needed", 400);
  const wantsGasOnly = mint === "gas";
  const token = wantsGasOnly ? null : (RWA_TOKENS.solana ?? []).find((t) => t.token === mint);
  if (!wantsGasOnly && !token) return fail("Not one of the test tokens", 400);
  let owner: PublicKey;
  try {
    owner = new PublicKey(address);
  } catch {
    return fail("Not a Solana address", 400);
  }
  // Taken now, before anything is awaited: a second request at once is refused.
  const who = owner.toBase58();
  const gasLock = `solana:${who}:gas`;
  const claim = take(token ? `solana:${who}:${token.token}` : gasLock);
  if ("until" in claim) return fail(`Already claimed; again at ${claim.until}`, 429);
  let gasHold: Hold | null = wantsGasOnly ? claim : null;
  let budget: Hold | null = null;
  const giveBack = () => [claim, gasHold, budget].forEach((h) => h?.release());

  const connection = new Connection(process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
  let sendGas = false;
  try {
    const [theirs, ours] = await Promise.all([connection.getBalance(owner), connection.getBalance(key.publicKey)]);
    if (theirs < BELOW) {
      if (!gasHold) {
        const g = take(gasLock);
        gasHold = "until" in g ? null : g;
      }
      budget = gasHold ? takeDrip("solana") : null;
      sendGas = !!budget;
    }
    if (wantsGasOnly && !sendGas) {
      giveBack();
      return theirs < BELOW
        ? fail("Greatwall's faucet has given today's SOL; get some from the public faucet.", 503, { faucet: PUBLIC_FAUCET.solana, dry: "gas" })
        : fail("You have enough SOL for fees already", 400);
    }
    if (!sendGas && gasHold !== claim) {
      gasHold?.release();
      gasHold = null;
    }
    // Its own fee and a token account's rent need a little too.
    if (ours < (sendGas ? DRIP : 0) + 0.005 * LAMPORTS_PER_SOL) {
      giveBack();
      return fail("Greatwall's faucet is out of SOL. Get some from the public faucet.", 503, { faucet: PUBLIC_FAUCET.solana, dry: "gas" });
    }
  } catch (e: any) {
    giveBack();
    console.error("[faucet solana] reading balances:", e?.message ?? e);
    return fail("Solana didn't answer; try again in a moment.", 502);
  }

  const tx = new Transaction();
  if (sendGas) tx.add(SystemProgram.transfer({ fromPubkey: key.publicKey, toPubkey: owner, lamports: DRIP }));
  if (token) {
    const mintKey = new PublicKey(token.token);
    const ata = getAssociatedTokenAddressSync(mintKey, owner);
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(key.publicKey, ata, owner, mintKey),
      createMintToInstruction(mintKey, ata, key.publicKey, BigInt(token.faucet) * BigInt(10) ** BigInt(token.decimals))
    );
  }
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed").catch(() => ({ blockhash: "", lastValidBlockHeight: 0 }));
  if (!blockhash) {
    giveBack();
    return fail("Solana didn't answer; try again in a moment.", 502);
  }
  tx.recentBlockhash = blockhash;
  tx.feePayer = key.publicKey;
  tx.sign(key);
  // The signature is known before sending: if confirming fails, it is looked
  // up, and the claim is given back only when it surely did not land.
  const signature = bs58.encode(tx.signature!);
  try {
    await connection.sendRawTransaction(tx.serialize());
    const r = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    if (r.value.err) throw new Error(JSON.stringify(r.value.err));
    return NextResponse.json({
      signature,
      hash: signature,
      amount: token ? token.faucet : DRIP / LAMPORTS_PER_SOL,
      symbol: token ? token.symbol : "SOL",
      gas: sendGas && token ? { amount: DRIP / LAMPORTS_PER_SOL, symbol: "SOL" } : null,
    });
  } catch (e: any) {
    console.error("[faucet solana] sending:", e?.message ?? e);
    const st = await connection.getSignatureStatus(signature, { searchTransactionHistory: true }).catch(() => null);
    if (st?.value && !st.value.err) return NextResponse.json({ signature, hash: signature, amount: token ? token.faucet : DRIP / LAMPORTS_PER_SOL, symbol: token ? token.symbol : "SOL", gas: sendGas && token ? { amount: DRIP / LAMPORTS_PER_SOL, symbol: "SOL" } : null });
    // Not seen: it failed, or may still land before its blockhash expires. Kept
    // held unless it is known to have failed, so it can't be sent twice.
    if (st?.value?.err) giveBack();
    return fail("The faucet's send didn't confirm. Check your wallet in a minute before trying again.", 502);
  }
}
