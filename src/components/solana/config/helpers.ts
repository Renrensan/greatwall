import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const CONNECT = "standard:connect";
export const DISCONNECT = "standard:disconnect";
export const EVENTS = "standard:events";
export const SIGN_MESSAGE = "standard:signMessage";

export const safeSolanaTokenAmount = (calculatedAmount: number) => {
  return Math.max(0, Math.floor(calculatedAmount * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL);
};


/**
 * Safely calculates a percentage of a balance, clamping excess decimals 
 * to prevent blockchain precision errors (e.g., fractional lamports).
 * @param balance - The total balance available
 * @param pct - The percentage to calculate (e.g., 0.25, 0.5, 1)
 * @param decimals - The max allowed decimals for the token (default: 9 for SOL)
 * @returns The perfectly clamped number ready for transactions
 */

export const getClampedPercentage = (balance: number, pct: number, decimals: number = 9): number => {
  // No pct === 1 shortcut: callers that pre-scale the balance themselves and pass pct=1 just
  // to clamp (e.g. SolanaSwap.tsx/SolanaStocks.tsx's computeSellTargetForPercentage, which
  // divides by (1 + platform fee rate) to solve for the sell amount) need the floor applied
  // just as much as a real percentage does — skipping it here let a raw division result with
  // far more than the token's on-chain decimals (e.g. a 15-decimal USDC amount) straight
  // through unclamped.
  const targetAmount = balance * pct;
  const factor = Math.pow(10, decimals);
  return Math.floor(targetAmount * factor) / factor;
};