export interface PendingTransaction {
  type: "DEPOSIT" | "WITHDRAWAL";
  walletAddress: string;
  tokenType: string;
  network: string;
  networkEnv: string;
  refAddress?: string;
  idrAmount?: number;
  tokenAmount?: number;
  paymentDetails: {
    method: string;
    channelCode?: string;
    paymentMethod?: string;
    channelId?: string;
    channelName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    bankCode?: string;
    bankName?: string;
    bankAccountName?: string;
    bankAccount?: string;
    returnUrl?: string;
  };
}

const STORAGE_KEY = "paradapp-pending-transaction";
const INTENT_KEY = "paradapp-onboarding-intent";

export function savePendingTransaction(tx: PendingTransaction): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tx));
}

export function getPendingTransaction(): PendingTransaction | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as PendingTransaction;
  } catch (e) {
    console.error("Failed to parse pending transaction from storage:", e);
    return null;
  }
}

export function clearPendingTransaction(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function saveOnboardingIntent(intent: "new" | "link"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INTENT_KEY, intent);
}

export function getOnboardingIntent(): "new" | "link" | null {
  if (typeof window === "undefined") return null;
  const intent = localStorage.getItem(INTENT_KEY);
  if (intent === "new" || intent === "link") return intent;
  return null;
}

export function clearOnboardingIntent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(INTENT_KEY);
}

const TOKEN_STORAGE_KEY = "paradapp-onboarding-token";

export function saveOnboardingToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getOnboardingToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearOnboardingToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

const NETWORK_STORAGE_KEY = "paradapp-onboarding-network";

export function saveOnboardingNetwork(network: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NETWORK_STORAGE_KEY, network.toUpperCase());
}

export function getOnboardingNetwork(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NETWORK_STORAGE_KEY);
}

export function clearOnboardingNetwork(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(NETWORK_STORAGE_KEY);
}

