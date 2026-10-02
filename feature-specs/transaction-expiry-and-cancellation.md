# Transaction Expiration Alignment & User Cancellation Specification

**Service:** `paradapp-client` (Frontend)  
**Status:** Approved / In Planning  
**Last Updated:** August 2026  

---

## 1. Executive Summary

This document specifies the frontend architecture, component modifications, state management, and UX design required to:
1. **Support Dynamic Expiration Timers:** Replace hardcoded `10-minute` frontend timers with dynamic `expiresAt` timestamps received from the backend/gateway (up to 120 minutes) formatted as `HH:MM:SS`.
2. **Implement User Transaction Cancellation:** Add a responsive "Cancel Transaction" action in `VaultTransactionPage` and `OnboardingSteps` that calls `POST /api/transaction/{id}/cancel` to immediately release active quota limits (max 3 deposits, max 1 withdrawal) and reset the user flow.

---

## 2. Problem Statement

### 2.1 Premature UI Expiration
* **Previous Implementation:** Both `VaultTransactionPage.tsx` and `OnboardingSteps.tsx` computed the countdown timer using a hardcoded `10 * 60 * 1000` (10 minutes):
  ```typescript
  const created = new Date(transaction.createdAt);
  const expiry = new Date(created.getTime() + 10 * 60 * 1000);
  ```
* **User Impact:** Even though the IDRx payment checkout URL is active for 120 minutes, the frontend countdown hit `00:00` after only 10 minutes, confusing users into thinking their checkout session had expired.

### 2.2 Active Transaction Rate-Limit Lockout
* The backend enforces strict concurrency limits:
  * **Withdrawals:** Max **1** waiting transaction.
  * **Deposits:** Max **3** waiting transactions.
* If a user initiates a transaction by mistake, the user previously had no way to cancel it and was forced to wait out the entire expiration window before they could create a new transaction.

---

## 3. Technical Specifications

### 3.1 Dynamic Expiration Calculation

The frontend will resolve the target expiration date dynamically from the transaction payload using the following fallback hierarchy:

```typescript
export function getTransactionExpiryDate(tx: Transaction): Date {
  // 1. Direct top-level expiresAt (ISO 8601)
  if (tx.expiresAt) {
    return new Date(tx.expiresAt);
  }
  // 2. Nested paymentDetails.expiresAt (ISO 8601)
  if (tx.paymentDetails?.expiresAt) {
    return new Date(tx.paymentDetails.expiresAt);
  }
  // 3. Nested paymentDetails.expiryPeriodMinutes (number)
  if (tx.paymentDetails?.expiryPeriodMinutes && tx.createdAt) {
    const created = new Date(tx.createdAt);
    return new Date(created.getTime() + tx.paymentDetails.expiryPeriodMinutes * 60 * 1000);
  }
  // 4. Default fallback (120 minutes for IDRx gateway)
  const created = tx.createdAt ? new Date(tx.createdAt) : new Date();
  return new Date(created.getTime() + 120 * 60 * 1000);
}
```

### 3.2 Enhanced Countdown Timer Formatter (`HH:MM:SS`)

To accommodate longer expiration windows (e.g. 120 minutes = 2 hours), the countdown formatter dynamically switches format:

```typescript
export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "00:00";

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
```

---

### 3.3 Transaction Cancellation Workflow

#### API Client Call
```typescript
export async function cancelTransaction(txId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transaction/${txId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to cancel transaction" };
  }
}
```

#### State Transition & Teardown
1. **User Action:** User clicks "Cancel Transaction" button when `status === "WAITING"`.
2. **Confirmation Modal / Prompt:** Displays confirmation alert:
   > *"Are you sure you want to cancel this transaction? You will be able to start a new one immediately."*
3. **Optimistic / Response Update:**
   * Invoke `cancelTransaction(tx.id)`.
   * On success:
     * Clear countdown timer interval.
     * Set `isExpired(true)` and update local transaction state `status = "EXPIRED"`.
     * Show success toast notification.
     * Provide immediate action button to return to `/vault/assets` or restart the buy/withdraw flow.
   * On error:
     * Show error toast (e.g. if the transaction was already processed or expired).

---

## 4. Component Level Modifications

### 4.1 [`VaultTransactionPage.tsx`](file:///Users/pasharenaisan/Documents/projects/paradapp/paradapp-client/src/app/%5Blocale%5D/%5Bnetwork%5D/%5Bapp%5D/transaction/%5Bid%5D/VaultTransactionPage.tsx)

#### A. Timer Hook Update (Lines ~645–664)
```typescript
useEffect(() => {
  if (!transaction?.createdAt || transaction.status !== "WAITING") return;

  const expiry = getTransactionExpiryDate(transaction);

  const interval = setInterval(() => {
    const now = new Date();
    const remaining = expiry.getTime() - now.getTime();

    if (remaining <= 0 || transaction.status === "EXPIRED") {
      setIsExpired(true);
      setTimeLeft("00:00");
      clearInterval(interval);
      return;
    }

    setTimeLeft(formatCountdown(remaining));
  }, 1000);

  return () => clearInterval(interval);
}, [transaction]);
```

#### B. Cancel Button Placement
Add the "Cancel Transaction" button in the `WAITING` action panel for both Buy (Deposit) and Withdraw:
```tsx
{status === "WAITING" && !isExpired && (
  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex justify-between items-center">
    <p className="text-xs text-gray-500 dark:text-gray-400">
      Changed your mind or need to update details?
    </p>
    <button
      onClick={handleCancelTransaction}
      disabled={isCancelling}
      className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
    >
      {isCancelling ? "Cancelling..." : "Cancel Transaction"}
    </button>
  </div>
)}
```

---

### 4.2 [`OnboardingSteps.tsx`](file:///Users/pasharenaisan/Documents/projects/paradapp/paradapp-client/src/app/%5Blocale%5D/%28marketing-root%29/%28actionable-marketing%29/buy-and-stake-usdc/OnboardingSteps.tsx)

* Update the countdown hook (Lines ~463–477) to use `getTransactionExpiryDate(transaction)` and `formatCountdown`.
* Provide a "Cancel and restart" button in the deposit payment step to allow quick quota recovery.

---

## 5. UI/UX State Matrix

| Transaction Status | Countdown Timer | Cancel Action | Primary CTA |
| :--- | :--- | :--- | :--- |
| **`WAITING` (Deposit)** | Ticking (`HH:MM:SS` from 120m) | Enabled ("Cancel Transaction") | "Pay via IDRx Checkout" |
| **`WAITING` (Withdrawal)** | N/A (or withdrawal window) | Enabled ("Cancel Withdrawal") | "Copy Destination Address" |
| **`PAID` / `PENDING`** | Hidden (Progress bar active) | Disabled (Locked) | Progress status stepper |
| **`COMPLETED`** | Hidden | Disabled | "View in Assets" |
| **`EXPIRED` / Cancelled** | "00:00" (Red Alert Banner) | Hidden | "Create New Transaction" |

---

## 6. Implementation Checklist

- [ ] Implement `getTransactionExpiryDate` and `formatCountdown` utilities.
- [ ] Add `cancelTransaction` service method in frontend API services.
- [ ] Update `useEffect` timer in `VaultTransactionPage.tsx`.
- [ ] Add "Cancel Transaction" button & confirmation in `VaultTransactionPage.tsx`.
- [ ] Update countdown timer & cancel option in `OnboardingSteps.tsx`.
- [ ] Verify cancellation immediately frees user to create a new deposit / withdrawal.
