import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const CONNECT = "standard:connect";
export const EVENTS = "standard:events";
export const SIGN_MESSAGE = "standard:signMessage";

export const safeSolanaTokenAmount = (calculatedAmount: number) => {
  return Math.max(0, Math.floor(calculatedAmount * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL);
};
