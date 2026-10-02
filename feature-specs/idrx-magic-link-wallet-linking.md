# Magic Link — IDRX Onboarding Email Verification

> **Scope:** This document describes the fully updated onboarding flow introducing email verification
> via magic link for **all** onboarding cases — both new users and existing users linking a new wallet.
> The current `POST /api/auth/onboarding` is unsafe because any caller can trigger a real IDRX KYC
> registration using any email they don't own. This flow fixes that.

---

## Problem Statement

The current onboarding endpoint has two security gaps:

| Case | Gap |
|------|-----|
| **New user** | Anyone can submit an email they don't own and trigger IDRX KYC |
| **Existing user, new wallet** | The previous `existingWalletAddress` guard was weak — replaced but still inline |

**Goal:** Email ownership must be proven before any IDRX operation happens.

---

## Revised Flow Overview

Two variants share the same two endpoints. The `intent` field in the Redis payload distinguishes them.

### Case A — New User (first-time email)

```
Client                           API Server                       Redis
  │                                  │                               │
  │  POST /onboarding/request-link   │                               │
  │  { email, walletAddress }        │                               │
  │ ───────────────────────────────► │                               │
  │                                  │  lookup email → NOT found     │
  │                                  │                               │
  │                                  │  SET idrx_link:<token>        │
  │                                  │  { intent: "new",             │
  │                                  │    email, walletAddress }     │
  │                                  │  TTL = 15 min                 │
  │                                  │ ─────────────────────────────►│
  │                                  │                               │
  │  { token } ◄─────────────────── │  (email sent in prod)         │
  │                                  │                               │
  │  POST /onboarding/verify-link    │                               │
  │  { token, + full KYC form }      │                               │
  │ ───────────────────────────────► │                               │
  │                                  │  GET + DEL idrx_link:<token>  │
  │                                  │ ─────────────────────────────►│
  │                                  │  { intent: "new", email, ... }│
  │                                  │ ◄─────────────────────────────│
  │                                  │                               │
  │                                  │  call IDRX onboard API        │
  │                                  │  save IdrxAccount in DB       │
  │                                  │                               │
  │  { success, kycAddress } ◄────── │                               │
```

### Case B — Existing User, New Wallet

```
Client                           API Server                       Redis
  │                                  │                               │
  │  POST /onboarding/request-link   │                               │
  │  { email, walletAddress }        │                               │
  │ ───────────────────────────────► │                               │
  │                                  │  lookup email → FOUND         │
  │                                  │                               │
  │                                  │  SET idrx_link:<token>        │
  │                                  │  { intent: "link",            │
  │                                  │    email, walletAddress }     │
  │                                  │  TTL = 15 min                 │
  │                                  │ ─────────────────────────────►│
  │                                  │                               │
  │  { token } ◄─────────────────── │  (email sent in prod)         │
  │                                  │                               │
  │  POST /onboarding/verify-link    │                               │
  │  { token }  (no KYC form needed) │                               │
  │ ───────────────────────────────► │                               │
  │                                  │  GET + DEL idrx_link:<token>  │
  │                                  │ ─────────────────────────────►│
  │                                  │  { intent: "link", ... }      │
  │                                  │ ◄─────────────────────────────│
  │                                  │                               │
  │                                  │  map_idrx_account_wallet()    │
  │                                  │                               │
  │  { success, kycAddress } ◄────── │                               │
```

---

## Redis Key Design

Adapted from `StoreEmailLoginVerificationSessionToRedis` in the Go reference:

| Key pattern              | Value (JSON string)                                                                                   | TTL    |
|--------------------------|-------------------------------------------------------------------------------------------------------|--------|
| `idrx_link:<uuid-token>` | `{ "intent": "new" \| "link", "email": "...", "walletAddress": "..." }` | 15 min |

- Token is a **UUID v4** — 122 bits of entropy, URL-safe, opaque.
- Key is deleted on successful verify (single-use), mirroring the Go reference's DEL inside `CreateRefreshTokenSessionInRedis`.
- Requesting a new link before expiry **overwrites** the previous token (idempotent, prevents accumulation).

---

## Endpoints

### 1. `POST /api/auth/onboarding/request-link`

**The only entry point into onboarding.** Replaces direct calls to `POST /api/auth/onboarding`.

**Request body (JSON):**
```json
{
  "email": "user@example.com",
  "walletAddress": "7xKX..."
}
```

**Logic:**
1. Validate both fields present and non-empty.
2. Look up `email` in `IdrxAccount` table:
   - **Not found** → `intent = "new"`
   - **Found** → `intent = "link"`
3. Generate token: `uuid::Uuid::new_v4().to_string()`
4. Store: `SET idrx_link:<token> <json_payload> EX 900`
5. **In production:** send email to user containing the verify link/token.
   **For now (no email sender):** return token directly in response body.

**Success response:**
```json
{
  "success": true,
  "intent": "new" | "link",
  "message": "Magic link sent to your email",
  "token": "<uuid>"
}
```

| Status | Condition |
|--------|-----------|
| `400`  | Missing `email` or `walletAddress` |
| `500`  | Redis write failure |

---

### 2. `POST /api/auth/onboarding/verify-link`

**Consumes the magic link token and executes the appropriate action based on `intent`.**

This endpoint is a `multipart/form-data` endpoint (to support KYC file upload for `intent = "new"`).
Fields that only apply to `intent = "new"` are optional for `intent = "link"`.

**Form fields:**

| Field | Required for `new` | Required for `link` | Description |
|-------|--------------------|---------------------|-------------|
| `token` | ✅ | ✅ | Magic link token from step 1 |
| `fullname` | ✅ | ❌ | User full name |
| `address` | ✅ | ❌ | User address |
| `idNumber` | ✅ | ❌ | KTP / ID number |
| `idFile` | ✅ | ❌ | ID photo (JPEG/PNG) |

**Logic:**
1. Extract `token` from form.
2. `GET idrx_link:<token>` from Redis → deserialize `{ intent, email, walletAddress }`.
   - Not found / expired → `403` — _"Token invalid or expired"_
3. `DEL idrx_link:<token>` — consumed, single-use.
4. **Branch on `intent`:**

   **`intent = "new"`:**
   - Validate KYC fields present.
   - Derive KYC onboarding keypair from `walletAddress`.
   - Call IDRX onboarding API (`idrx_service.onboard_user(...)`).
   - Save `IdrxAccount` row with `email`, `walletAddress`, `idrxApiKey`, `idrxApiSecret`, `kycOnboardingAddress`.
   - Return `{ success, walletAddress, kycOnboardingAddress, fullname }`.

   **`intent = "link"`:**
   - Look up `email` in `IdrxAccount` to fetch existing credentials.
   - Call `map_idrx_account_wallet(walletAddress, existing_account)`.
   - Return `{ success, walletAddress, kycOnboardingAddress, reused: true }`.

**Success responses:**

`intent = "new"`:
```json
{
  "success": true,
  "walletAddress": "7xKX...",
  "kycOnboardingAddress": "hKebV...",
  "fullname": "John Doe"
}
```

`intent = "link"`:
```json
{
  "success": true,
  "walletAddress": "7xKX...",
  "kycOnboardingAddress": "hKebV...",
  "reused": true
}
```

| Status | Condition |
|--------|-----------|
| `400`  | Missing token or missing KYC fields for `intent = "new"` |
| `403`  | Token not found or expired in Redis |
| `500`  | IDRX API failure, DB error |

---

## Updated `POST /api/auth/onboarding` Behaviour

The existing multipart onboarding handler is **deprecated** in favour of the two-step flow above.

Options (to decide at revision):
- **Option A:** Keep it for backwards compatibility but require it to only work for emails that already have a pending verified session (i.e. after `verify-link`). — More complex.
- **Option B:** Remove it entirely and migrate all callers to the new two-step flow. — Cleaner.

> **Recommendation: Option B.** The old endpoint is the root of the security problem.

---

## Redis Helper Methods to Add to `RedisService`

```rust
/// Store a pending magic link session.
/// Key: idrx_link:<token>
/// Value: JSON { intent, email, walletAddress }
/// TTL: 15 min
pub async fn set_idrx_link_token(
    &self,
    token: &str,
    payload_json: &str,
) -> Result<(), redis::RedisError>

/// Consume the magic link token atomically (GET then DEL).
/// Returns None if the token does not exist or has expired.
pub async fn consume_idrx_link_token(
    &self,
    token: &str,
) -> Result<Option<String>, redis::RedisError>
// Returns the raw JSON string — caller deserializes
```

`consume_idrx_link_token` uses a pipeline (GET + DEL in one round-trip) to ensure
single-use — mirrors how the Go reference deletes `emailLoginSessionKey` inside a Watch
transaction upon login completion (`CreateRefreshTokenSessionInRedis`).

---

## Security Properties

| Threat | Mitigation |
|--------|------------|
| Attacker registers with victim's email | Email must be received to get token — only owner gets the link |
| Attacker guesses token | UUID v4 = 122 bits of entropy — brute force infeasible |
| Token replay | Single-use: DEL on first successful consume |
| Stale tokens | 15-minute TTL |
| Request-link spam for same email | Token overwrites previous; optional per-email cooldown key can be added (mirrors `GetResendVerificationEmailRemainingCooldown` in Go reference) |
| KYC submitted for wrong email | Token payload carries email — verify step re-checks DB, email not re-submitted by client |

---

## Files to Change

| File | Change |
|------|--------|
| `crates/infra/src/redis.rs` | Add `set_idrx_link_token`, `consume_idrx_link_token` |
| `crates/api/src/transaction.rs` | Add `handle_request_link`, `handle_verify_link`; deprecate/remove `handle_onboarding`; remove `existingWalletAddress` guard |
| `crates/api/src/lib.rs` | Register the two new routes; remove or keep old route |
| `crates/infra/src/transaction.rs` | No change — `map_idrx_account_wallet`, `get_idrx_account_by_email`, `create_idrx_account` already exist |

---

## What Is NOT Changing

- `IdrxAccount` DB schema — `email` column already added and migrated.
- `map_idrx_account_wallet`, `create_idrx_account` DB functions — already implemented.
- IDRX API calls (`idrx_service.onboard_user`) — unchanged, just moved into `verify-link`.
- Downstream minting flow — unaffected.
