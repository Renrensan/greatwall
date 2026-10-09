// A wallet's balance of an SPL token: its associated account's, the one
// the apps spend from (classic Token or Token-2022, by the mint's owner).

import { PublicKey } from "@solana/web3.js";

import { solanaConnection } from "./sdk";

const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

export async function solanaTokenBalance(owner: string, mint: string): Promise<bigint> {
  const conn = solanaConnection();
  const m = new PublicKey(mint);
  const program = (await conn.getAccountInfo(m))?.owner;
  if (!program) return BigInt(0);
  const [ata] = PublicKey.findProgramAddressSync([new PublicKey(owner).toBuffer(), program.toBuffer(), m.toBuffer()], ATA_PROGRAM);
  if (!(await conn.getAccountInfo(ata))) return BigInt(0);
  return BigInt((await conn.getTokenAccountBalance(ata)).value.amount);
}
