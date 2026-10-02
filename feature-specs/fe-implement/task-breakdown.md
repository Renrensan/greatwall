# Frontend Implementation: Step-by-Step Task Breakdown

This document breaks down the frontend onboarding integration and IDRX migration into small, manageable, and testable tasks.

---

## Phase 1: API Proxies & Utility Layer

### Task 1.1: Request Link Proxy Route
*   **File**: `src/app/api/auth/onboarding/request-link/route.ts`
*   **Action**: Create a Next.js App Router POST API route.
*   **Details**: Read JSON payload `{ email, walletAddress }` and proxy it to `${process.env.BACKEND_URL}/api/auth/onboarding/request-link`.

### Task 1.2: Verify Link Proxy Route (Multipart Data)
*   **File**: `src/app/api/auth/onboarding/verify-link/route.ts`
*   **Action**: Create a Next.js App Router POST API route.
*   **Details**: Extract form-data boundaries, reconstruct the multipart payload (handling file binary uploads like KTP image files), and forward it to `${process.env.BACKEND_URL}/api/auth/onboarding/verify-link`.

### Task 1.3: Session Preservation Utilities
*   **File**: `src/lib/onboarding-storage.ts`
*   **Action**: Create helper functions to read, write, and clear the pending transaction payload from `localStorage` (`pending-transaction`).

---

## Phase 2: User Onboarding Initiation (Phase 1 UI)

### Task 2.1: Implement OnboardingModal Component
*   **File**: `src/components/onboarding/OnboardingModal.tsx`
*   **Action**: Build a modal styled with glassmorphism matching the dark-theme brand.
*   **States**:
    1.  **Form Input**: Email input + Wallet Address display.
    2.  **Requesting**: Loading state calling `/api/auth/onboarding/request-link`.
    3.  **Check Email Screen**: Instructive message. If in development environment, render a direct bypass link to the verify route with the returned token.

### Task 2.2: Add Global Onboarding Trigger Context/State
*   **File**: Create a context provider or hook (e.g., `src/components/providers/onboarding-provider.tsx`) to manage the visibility of the `OnboardingModal` globally.

---

## Phase 3: Magic Link Verification Landing Page (Phase 2 UI)

### Task 3.1: Create Landing Page Shell
*   **File**: `src/app/[locale]/onboarding/verify/page.tsx`
*   **Action**: Parse the `token` parameter from search params in a client-side component.

### Task 3.2: Implement Stateless Intent Resolution
*   **File**: `src/app/[locale]/onboarding/verify/page.tsx`
*   **Action**:
    1.  On mount, try hitting `/api/auth/onboarding/verify-link` with only the `token`.
    2.  **If 200 OK**: Render checkmark success and execute Auto-Redirect (Task 3.4).
    3.  **If 400 Bad Request (Missing fields)**: Show the KYC Form (Task 3.3).
    4.  **If 403 Forbidden**: Show token expired message with resend trigger button.

### Task 3.3: Build KYC Submission Form
*   **File**: `src/app/[locale]/onboarding/verify/page.tsx`
*   **Action**:
    *   Form fields: Legal Full Name, Address, ID Number (KTP/NIK), and ID Card Image file input (drag & drop support).
    *   Handle client-side validation and submit multipart form-data to `/api/auth/onboarding/verify-link`.

### Task 3.4: Auto-Redirect Flow
*   **File**: `src/app/[locale]/onboarding/verify/page.tsx`
*   **Action**: On success, show verification checkmark animation, wait 1.5 seconds, then redirect back to `/[locale]/[network]/vault/buy` or `/[locale]/[network]/vault/assets` appending query param `?verify_success=true`.

---

## Phase 4: Vault Integration & Transaction Autocompletion

### Task 4.1: Integrate Deposit Form (BuyToken)
*   **File**: `src/subcomponents/BuyToken.tsx`
*   **Action**:
    *   In `handleBuyClick`, catch `400 Bad Request` where `error` contains `"not onboarded with IDRX"`.
    *   If caught, save the active transaction parameters (amount, token, wallet) into `localStorage` and trigger the onboarding flow.

### Task 4.2: Integrate Withdrawal Form (Assets)
*   **File**: `src/subcomponents/Assets.tsx`
*   **Action**:
    *   In the withdrawal confirmation button click handler, catch the `"not onboarded"` error.
    *   If caught, save the active withdrawal parameters (amount, bank details, token, wallet) into `localStorage` and trigger the onboarding flow.

### Task 4.3: Implement Transaction Resume Observer
*   **File**: A central watcher component or inline in `BuyToken.tsx` / `Assets.tsx`.
*   **Action**:
    *   Watch for changes in search params. If `?verify_success=true` is present, retrieve the cached transaction details.
    *   Automatically initiate the transaction creation (`handleBuyClick` or `handleConfirmWithdraw`) on behalf of the user.
    *   Clean URL params (remove `?verify_success`) and clear `localStorage` transaction cache.

---

## Phase 5: Verification & Testing

### Task 5.1: Dev Sandbox Verification
*   Test requesting a link, clicking the development-only direct link from the modal, resolving intent, and completing verification.

### Task 5.2: Cross-Device Resolution Testing
*   Test requesting verification on a laptop and clicking the link on a mobile device, ensuring the mobile landing page resolves the intent and requests KYC credentials properly.
