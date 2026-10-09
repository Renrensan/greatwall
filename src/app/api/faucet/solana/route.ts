// The faucet of the mock RWA tokens on Solana devnet: this server holds the
// tokens' mint authority (a test key) and mints a claim's worth to the
// address asked for, once every six hours per address and token. The EVM
// tokens have their faucet in the token itself; SPL mints have no code of
// their own, so the server does it here.
//
//   POST /api/faucet/solana  {address, mint}

import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createMintToInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";

import { RWA_TOKENS } from "@/components/integrator/ipow/rwaTokens";

export const runtime = "nodejs";

/** How long a claim locks an address and token. */
const COOLDOWN_MS = 6 * 3600_000;
const claimed = new Map<string, number>();

function authority(): Keypair | null {
  const raw = process.env.SOLANA_MOCK_RWA_MINT_AUTHORITY;
  if (!raw) return null;
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const key = authority();
  if (!key) return NextResponse.json({ error: "The Solana faucet is not set up on this server" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const { address, mint } = body as { address?: unknown; mint?: unknown };
  if (typeof address !== "string" || typeof mint !== "string") return NextResponse.json({ error: "address and mint are needed" }, { status: 400 });
  const token = (RWA_TOKENS.solana ?? []).find((t) => t.token === mint);
  if (!token) return NextResponse.json({ error: "Not one of the test tokens" }, { status: 400 });
  let owner: PublicKey;
  try {
    owner = new PublicKey(address);
  } catch {
    return NextResponse.json({ error: "Not a Solana address" }, { status: 400 });
  }
  const lock = `${address}:${mint}`;
  const last = claimed.get(lock) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    const next = new Date(last + COOLDOWN_MS).toISOString();
    return NextResponse.json({ error: `Already claimed; again at ${next}` }, { status: 429 });
  }
  for (const [k, t] of claimed) if (Date.now() - t >= COOLDOWN_MS) claimed.delete(k);

  const url = process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(url, "confirmed");
  // The faucet pays the fee and the new token account's rent: say so when
  // it has nothing to pay with, rather than a simulation error.
  if ((await connection.getBalance(key.publicKey).catch(() => 1)) < 3_000_000) {
    return NextResponse.json({ error: `The faucet is out of SOL for fees: fund ${key.publicKey.toBase58()} on devnet` }, { status: 503 });
  }
  const mintKey = new PublicKey(mint);
  const ata = getAssociatedTokenAddressSync(mintKey, owner);
  const amount = BigInt(token.faucet) * BigInt(10) ** BigInt(token.decimals);
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(key.publicKey, ata, owner, mintKey),
    createMintToInstruction(mintKey, ata, key.publicKey, amount)
  );
  try {
    claimed.set(lock, Date.now());
    const signature = await sendAndConfirmTransaction(connection, tx, [key], { commitment: "confirmed" });
    return NextResponse.json({ signature, amount: token.faucet, symbol: token.symbol });
  } catch (e: any) {
    claimed.delete(lock);
    return NextResponse.json({ error: `The mint failed: ${e?.message ?? e}` }, { status: 502 });
  }
}
