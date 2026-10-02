interface DepositLimits {
  min: number;
  maxVA: number;
  maxQRIS: number;
}

interface WithdrawLimits {
  min: number;
  max: number;
}

interface TokenConfig {
  token: string;
  isNative: boolean;
  deposit: DepositLimits;
  withdraw: WithdrawLimits;
}

interface CustodyParams {
  network: string;
  env: string;
  tokens: TokenConfig[];
  // Whether a real backend response has actually landed yet. Without this, an empty `tokens`
  // array is indistinguishable from "still loading" — a provider's initial state already has
  // non-empty keys (network/env/tokens), so BuyToken.tsx's COMING_SOON check couldn't tell the
  // difference and would treat a fetch that's merely still in flight (or one whose response got
  // lost, e.g. across a chain-switch remount) as permanently unavailable.
  fetched?: boolean;
}