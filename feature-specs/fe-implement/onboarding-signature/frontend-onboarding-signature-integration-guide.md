# Frontend Integration Guide — Onboarding Wallet Signature Verification

> [!IMPORTANT]
> **API Breaking Changes Alert**
> Onboarding and wallet-linking endpoints now require a **cryptographic wallet signature (Ed25519)** proving ownership of the wallet address before onboarding or linking can complete.

---

## Overview & Why This Changed

Previously, the backend accepted `walletAddress` as plain text without verifying if the user controlled the private key. This allowed potential impersonation or wallet clobbering.

With this update:
- **Intent `"link"` (Existing user linking a new wallet)**: Must submit a signature of the email token to `/verify-link`.
- **Intent `"new"` (New user submitting KYC)**: Must submit a signature of the server-issued `signMessage` to `/submit-kyc`.

---

## 1. Intent `"link"` — Wallet Linking Flow

When `request-link` returns `intent: "link"`, the user lands on the email verification page. The frontend **must collect a wallet signature** before calling `verify-link`.

### Flow Diagram

```
User lands on /onboarding/verify?token=<EMAIL_TOKEN>
                        │
                        ▼
Frontend constructs signMessage:
"Paradapp wallet linking authorization.\nToken: <EMAIL_TOKEN>"
                        │
                        ▼
Wallet popup: wallet.signMessage(utf8(signMessage))
                        │
                        ▼
Base58 encode signature -> signatureB58
                        │
                        ▼
POST /api/auth/onboarding/verify-link
Body: { "token": "<EMAIL_TOKEN>", "signature": "<SIGNATURE_B58>" }
```

### API Specification

- **Endpoint:** `POST /api/auth/onboarding/verify-link`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "token": "472e3650-4322-412d-772e-365047b2c7ac",
    "signature": "3Kz7gX...base58_signature_64_bytes...",
    "network": "SOLANA"
  }
  ```
- **Error Responses:**
  - `403 Forbidden` (`"Signature required for wallet linking"`): Missing `signature` field.
  - `403 Forbidden` (`"Invalid wallet signature"`): Signature failed verification.

---

## 2. Intent `"new"` — Full KYC Onboarding Flow

When `request-link` returns `intent: "new"`, `verify-link` returns an `onboardingToken` along with the exact `signMessage` string that the user must sign.

### Flow Diagram

```
POST /api/auth/onboarding/verify-link
Body: { "token": "<EMAIL_TOKEN>", "network": "SOLANA" }
                        │
                        ▼
Returns: {
  "success": true,
  "onboardingToken": "9a2f6b8c-55c3-42e7-91bc-a8f4c7d2e365",
  "signMessage": "Paradapp onboarding authorization.\nToken: 9a2f6b8c-55c3-42e7-91bc-a8f4c7d2e365"
}
                        │
                        ▼
User completes KYC form & clicks Submit
                        │
                        ▼
Wallet popup: wallet.signMessage(utf8(signMessage))
                        │
                        ▼
POST /api/auth/onboarding/submit-kyc
Body (multipart/form-data):
  - onboardingToken: "9a2f6b8c-55c3-42e7-91bc-a8f4c7d2e365"
  - signature: "<SIGNATURE_B58>"
  - network: "SOLANA"
  - fullname: "John Doe"
  - address: "Jakarta, Indonesia"
  - idNumber: "3171234567890001"
  - idFile: (binary image file)
```

### API Specification

- **Endpoint:** `POST /api/auth/onboarding/submit-kyc`
- **Headers:** `Content-Type: multipart/form-data`
- **Form Parameters:**
  - `onboardingToken` (string, required): Long-lived session token.
  - `signature` (string, required): Base58-encoded or hex signature of `signMessage`.
  - `network` (string, optional/recommended): Target network identifier (`SOLANA`, `ETHEREUM`, `BITCOIN`, `POLKADOT`, `HEDERA`).
  - `fullname` (string, required): Full legal name.
  - `address` (string, required): Physical address.
  - `idNumber` (string, required): KTP / Passport number.
  - `idFile` (file, required): Image file of ID card.
- **Error Responses:**
  - `400 Bad Request` (`"Missing signature"`): Missing `signature` field in multipart form.
  - `403 Forbidden` (`"Invalid wallet signature"`): Signature failed verification.

---

## 3. Multi-Network Wallet Signing (Solana, EVM, Bitcoin & Polkadot)

The backend's `verify_wallet_signature_with_network` utility directly uses the target network when provided (or automatically falls back to format detection):

| Network / Address Format | Signature Standard | Format | Example Wallets |
|---|---|---|---|
| **Solana** (`base58` address) | Ed25519 | Base58 string | Phantom, Solflare, Backpack |
| **Ethereum / EVM / Hedera EVM** (`0x...` 42-char address) | EIP-191 `personal_sign` | Hex string (`0x...`) | MetaMask, Rabby, Coinbase Wallet, Wagmi |
| **Bitcoin** (P2PKH, P2WPKH, etc.) | Bitcoin Signed Message | Base64 string | Unisat, Xverse, Leather |
| **Polkadot** (SS58 address `1...` / `5...`) | Sr25519 / Ed25519 | Hex string (`0x...`) | Polkadot{.js}, SubWallet, Talisman |

### TypeScript Code Example

```typescript
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useSignMessage as useEvmSignMessage } from 'wagmi';
import bs58 from 'bs58';

export function useMultiNetworkWalletSigner() {
  const solanaWallet = useSolanaWallet();
  const { signMessageAsync: signEvmMessage } = useEvmSignMessage();

  const getSignature = async (
    walletAddress: string,
    messageString: string,
    network?: string
  ): Promise<string> => {
    // 1. EVM / Ethereum / Hedera EVM Address
    if (walletAddress.startsWith('0x') && walletAddress.length === 42) {
      return await signEvmMessage({ message: messageString });
    }

    // 2. Solana Address (Base58 32-bytes)
    if (solanaWallet.signMessage && solanaWallet.publicKey) {
      const messageBytes = new TextEncoder().encode(messageString);
      const signatureBytes = await solanaWallet.signMessage(messageBytes);
      return bs58.encode(signatureBytes);
    }

    // 3. Bitcoin Wallet (Unisat / Xverse / Leather)
    if (window.unisat?.signMessage) {
      // Returns Base64-encoded Bitcoin Message Signature
      return await window.unisat.signMessage(messageString);
    }

    // 4. Polkadot Wallet (Polkadot{.js} / SubWallet / Talisman)
    if (window.injectedWeb3) {
      // Polkadot signRaw returns { signature: "0x..." }
      const injector = await window.injectedWeb3['polkadot-js'].enable('Paradapp');
      const { signature } = await injector.signer.signRaw({
        address: walletAddress,
        data: messageString,
        type: 'bytes'
      });
      return signature;
    }

    throw new Error("Unsupported wallet network or signing not available");
  };

  return { getSignature };
}
```

---

## Summary Checklist for Frontend Team

- [ ] **Verify-Link page (`intent == "link"`)**: Construct `signMessage = "Paradapp wallet linking authorization.\nToken: " + token`, request signature, send `{ token, signature }` to `/verify-link`.
- [ ] **Verify-Link page (`intent == "new"`)**: Store `onboardingToken` and `signMessage` returned by `/verify-link`.
- [ ] **Submit-KYC page**: Prompt wallet signature for `signMessage` upon submit, append `signature` parameter to `FormData`, submit to `/submit-kyc`.
- [ ] **Error Handling**: Handle `403 Forbidden` signature errors and display clear user messages (e.g. "Signature verification failed. Please try again.").
