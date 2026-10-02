import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import betaIdl from "../solana-beta/idl.json";
import { ParadappBeta } from "./types";
import { BETA_PROGRAM_ID, mints } from "./constant";


const getProgram = (connection: Connection, userAddress: string) => {
  const userKey = new PublicKey(userAddress);
  const provider = new AnchorProvider(connection, { publicKey: userKey } as any, { preflightCommitment: "confirmed" });
  return new Program(betaIdl as anchor.Idl, provider) as unknown as Program<ParadappBeta>;
};

const [epochStatePda] = PublicKey.findProgramAddressSync([Buffer.from("epoch_state_v0")], BETA_PROGRAM_ID);
const getVaultAta = (mint: PublicKey, tp: PublicKey) => getAssociatedTokenAddressSync(mint, epochStatePda, true, tp);
const getUserAta = (mint: PublicKey, userKey: PublicKey, tp: PublicKey) => getAssociatedTokenAddressSync(mint, userKey, false, tp, ASSOCIATED_TOKEN_PROGRAM_ID);

export const buildMintBetaInstruction = async (
  connection: Connection,
  userAddress: string,
  minBetaOut: number,
  depositAmounts: number[],
  getPythAcc: (id: string) => PublicKey 
): Promise<TransactionInstruction> => {
  const userKey = new PublicKey(userAddress);
  const program = getProgram(connection, userAddress);

  return await program.methods
    .mintBeta(new BN(minBetaOut), depositAmounts.map(a => new BN(a)))
    .accounts({
      user: userKey,
      epochState: epochStatePda,
      betaMint: mints.beta,
      userBeta: getUserAta(mints.beta, userKey, TOKEN_PROGRAM_ID),
      

      userCbbtc: getUserAta(mints.cbbtc, userKey, TOKEN_PROGRAM_ID),
      userUsdc:  getUserAta(mints.usdc,  userKey, TOKEN_PROGRAM_ID),
      userVt:    getUserAta(mints.vt,    userKey, TOKEN_2022_PROGRAM_ID),
      userSpy:   getUserAta(mints.spy,   userKey, TOKEN_2022_PROGRAM_ID),
      userQqq:   getUserAta(mints.qqq,   userKey, TOKEN_2022_PROGRAM_ID),
      userIemg:  getUserAta(mints.iemg,  userKey, TOKEN_2022_PROGRAM_ID),
      userGld:   getUserAta(mints.gld,   userKey, TOKEN_2022_PROGRAM_ID),


      vaultCbbtc: getVaultAta(mints.cbbtc, TOKEN_PROGRAM_ID),
      vaultUsdc:  getVaultAta(mints.usdc,  TOKEN_PROGRAM_ID),
      vaultVt:    getVaultAta(mints.vt,    TOKEN_2022_PROGRAM_ID),
      vaultSpy:   getVaultAta(mints.spy,   TOKEN_2022_PROGRAM_ID),
      vaultQqq:   getVaultAta(mints.qqq,   TOKEN_2022_PROGRAM_ID),
      vaultIemg:  getVaultAta(mints.iemg,  TOKEN_2022_PROGRAM_ID),
      vaultGld:   getVaultAta(mints.gld,   TOKEN_2022_PROGRAM_ID),

 
      oracleCbbtc: getPythAcc(mints.cbbtc.toBase58()), 
      oracleUsdc:  getPythAcc(mints.usdc.toBase58()),
      oracleVt:    getPythAcc(mints.vt.toBase58()),
      oracleSpy:   getPythAcc(mints.spy.toBase58()),
      oracleQqq:   getPythAcc(mints.qqq.toBase58()),
      oracleIemg:  getPythAcc(mints.iemg.toBase58()),
      oracleGld:   getPythAcc(mints.gld.toBase58()),

      tokenProgram: TOKEN_PROGRAM_ID,
      token2022Program: TOKEN_2022_PROGRAM_ID,
    } as any)
    .instruction();
};



export const buildRedeemBetaInstruction = async (
  connection: Connection,
  userAddress: string,
  betaAmountToBurn: number,
  getPythAcc: (id: string) => PublicKey
): Promise<TransactionInstruction> => {
  const userKey = new PublicKey(userAddress);
  const program = getProgram(connection, userAddress); 

  return await program.methods
    .redeemBeta(new BN(betaAmountToBurn))
    .accounts({
      user: userKey,
      epochState: epochStatePda,
      betaMint: mints.beta,
      userBeta: getUserAta(mints.beta, userKey, TOKEN_PROGRAM_ID),

      // User ATAs (Where the unlocked funds will go)
      userCbbtc: getUserAta(mints.cbbtc, userKey, TOKEN_PROGRAM_ID),
      userUsdc:  getUserAta(mints.usdc,  userKey, TOKEN_PROGRAM_ID),
      userVt:    getUserAta(mints.vt,    userKey, TOKEN_2022_PROGRAM_ID),
      userSpy:   getUserAta(mints.spy,   userKey, TOKEN_2022_PROGRAM_ID),
      userQqq:   getUserAta(mints.qqq,   userKey, TOKEN_2022_PROGRAM_ID),
      userIemg:  getUserAta(mints.iemg,  userKey, TOKEN_2022_PROGRAM_ID),
      userGld:   getUserAta(mints.gld,   userKey, TOKEN_2022_PROGRAM_ID),


      vaultCbbtc: getVaultAta(mints.cbbtc, TOKEN_PROGRAM_ID),
      vaultUsdc:  getVaultAta(mints.usdc,  TOKEN_PROGRAM_ID),
      vaultVt:    getVaultAta(mints.vt,    TOKEN_2022_PROGRAM_ID),
      vaultSpy:   getVaultAta(mints.spy,   TOKEN_2022_PROGRAM_ID),
      vaultQqq:   getVaultAta(mints.qqq,   TOKEN_2022_PROGRAM_ID),
      vaultIemg:  getVaultAta(mints.iemg,  TOKEN_2022_PROGRAM_ID),
      vaultGld:   getVaultAta(mints.gld,   TOKEN_2022_PROGRAM_ID),


      oracleCbbtc: getPythAcc(mints.cbbtc.toBase58()),
      oracleUsdc:  getPythAcc(mints.usdc.toBase58()),
      oracleVt:    getPythAcc(mints.vt.toBase58()),
      oracleSpy:   getPythAcc(mints.spy.toBase58()),
      oracleQqq:   getPythAcc(mints.qqq.toBase58()),
      oracleIemg:  getPythAcc(mints.iemg.toBase58()),
      oracleGld:   getPythAcc(mints.gld.toBase58()),

      tokenProgram: TOKEN_PROGRAM_ID,
      token2022Program: TOKEN_2022_PROGRAM_ID,
    } as any)
    .instruction();
};