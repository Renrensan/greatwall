# Implementation Plan: Onboarding Wallet Signature Verification

This document outlines the step-by-step implementation plan for integrating multi-network cryptographic wallet signatures into the IDRX onboarding and wallet-linking flows.

---

## 1. Overview & Objectives

To comply with backend API security requirements ([`frontend-onboarding-signature-integration-guide.md`](file:///home/renrensan/project/paradapp/paradapp-client/feature-specs/fe-implement/frontend-onboarding-signature-integration-guide.md)):
- **Intent `"link"`**: Existing users linking a new wallet address must sign `"Paradapp wallet linking authorization.\nToken: <EMAIL_TOKEN>"` using their connected wallet before calling `POST /api/auth/onboarding/verify-link`.
- **Intent `"new"`**: New users registering KYC must sign the server-issued `signMessage` string (returned by `/verify-link`) using their connected wallet upon submitting their KYC details to `POST /api/auth/onboarding/submit-kyc`.

Signature standards differ per network:
- **Solana**: Ed25519 signature encoded as a **Base58** string via `bs58.encode()`.
- **Ethereum / EVM / Hedera EVM**: EIP-191 `personal_sign` returned as a **Hex** string (`0x...`).
- **Bitcoin**: Bitcoin Signed Message returned as a **Base64** string.
- **Polkadot**: Sr25519/Ed25519 returned as a **Hex** string (`0x...`).

Instead of custom standalone signers, implementation directly consumes the existing per-network wallet providers (`useSolanaWallet`, `useEthereumWallet`, `useBitcoinWallet`, `usePolkadotWallet`).

---

## 2. Component & Architecture Changes

### A. Signature Dispatcher Function (`executeWalletSignature`)
Inside `src/app/[locale]/onboarding/verify/page.tsx`:
1. Consume existing network wallet hooks:
   - `useSolanaWallet()` from `@/components/solana/solana-provider`
   - `useEthereumWallet()` from `@/components/ethereum/ethereum-provider`
   - `useBitcoinWallet()` from `@/components/bitcoin/bitcoin-provider`
   - `usePolkadotWallet()` from `@/components/polkadot/polkadot-provider`
2. Create dispatcher function `executeWalletSignature(messageString: string)`:
   - Detects active connected wallet provider (`solana.connected`, `eth.connected`, `btc.connected`, `polkadot.connected`).
   - Delegates message signing to the connected wallet's `signMessage()` method.
   - Formats signature string based on network (converts Solana hex signature bytes to Base58).

### B. Verification Landing Page (`src/app/[locale]/onboarding/verify/page.tsx`)

#### Flow 1: Intent `"link"` (Existing user linking wallet)
1. User arrives at `/onboarding/verify?token=<EMAIL_TOKEN>`.
2. Check if a wallet is connected across any network provider.
   - If **disconnected**: Render wallet connection prompt instructing user to connect their wallet.
3. Construct `signMessage = "Paradapp wallet linking authorization.\nToken: " + token`.
4. Trigger `executeWalletSignature(signMessage)` with signing loading indicator (`"Awaiting wallet signature..."`).
5. Send `POST /api/auth/onboarding/verify-link` with payload `{ token, signature }`.
6. On success: Clear pending storage, render success animation, auto-redirect back to dApp transaction page.

#### Flow 2: Intent `"new"` (New user completing KYC)
1. User arrives at `/onboarding/verify?token=<EMAIL_TOKEN>`.
2. Send initial `POST /api/auth/onboarding/verify-link` with payload `{ token }`.
3. Backend returns `{ success: true, onboardingToken, signMessage }`.
4. Render KYC form (fullname, address, idNumber, idFile).
5. User completes form and clicks Submit:
   - Check if a wallet is connected.
   - Trigger `executeWalletSignature(signMessage)` with signing loading state.
   - Construct `FormData` with parameters:
     - `onboardingToken`
     - `signature`
     - `fullname`
     - `address`
     - `idNumber`
     - `idFile`
   - Send `POST /api/auth/onboarding/submit-kyc`.
6. On success: Clear pending storage, render success animation, auto-redirect back to dApp.

### C. Error & Edge Case Handling
- **Signature Rejected by User**: Catch wallet popup cancellation errors and show toast notification (`"Signature request was rejected in your wallet."`).
- **Signature Verification Failure (`403 Forbidden`)**: Render clear error card explaining signature mismatch or expiration.
- **Disconnected Wallet**: Prevent submission without connected wallet and provide wallet connect trigger buttons.

---

## 3. Step-by-Step Implementation Roadmap

- [x] **Task 1**: Document implementation plan in `feature-specs/fe-implement/onboarding-signature-implementation-plan.md`.
- [ ] **Task 2**: Update `src/app/[locale]/onboarding/verify/page.tsx` with wallet provider hooks (`useSolanaWallet`, `useEthereumWallet`, `useBitcoinWallet`, `usePolkadotWallet`).
- [ ] **Task 3**: Implement `executeWalletSignature` dispatcher supporting Solana (Base58), EVM (Hex), Bitcoin (Base64), and Polkadot (Hex).
- [ ] **Task 4**: Wire signature verification into Intent `"link"` flow and Intent `"new"` KYC submission flow.
- [ ] **Task 5**: Add wallet connection prompt & wallet signing loading states in `verify/page.tsx`.
- [ ] **Task 6**: Verify implementation with linting / build check.
