import { Decimal } from 'decimal.js';

export function usdcToShares(amountUsdc: Decimal, tokensPerShare: Decimal) {
  return amountUsdc.div(tokensPerShare);
}

export function sharesToUsdc(shares: Decimal, tokensPerShare: Decimal) {
  return shares.mul(tokensPerShare);
}

