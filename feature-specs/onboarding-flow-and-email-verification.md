# Onboarding Flow and Email Verification Guide (Frontend & Backend integration)

This specification defines the secure, two-step onboarding and wallet-linking flow. 

> [!IMPORTANT]
> **Frontend Implementation Status:** The frontend integration, screen states, and pages for this onboarding flow are **not yet implemented**.
>
> **Registered Wallet Bypass:** If the frontend is using a "connect wallet" mechanism, onboarding/linking is **not needed** for wallets that are **already registered** in the database. The user only goes through this flow if their wallet is brand new/unregistered.

---

## 1. Context and Objective

Originally, a user could be onboarded directly by calling `POST /api/auth/onboarding` without verifying email ownership. This created a security gap where anyone could trigger real IDRX KYC registrations using an email they did not own.

To fix this, the system enforces a **two-step onboarding process** utilizing magic links sent via **Brevo** and a short-lived + long-lived dual token flow:
1. Prove email ownership by requesting a short-lived magic link (15 minutes).
2. Verify email ownership by consuming the single-use token and exchanging it for a long-lived onboarding session token (1 hour).
3. Complete the onboarding by submitting KYC details along with the onboarding session token.

---

## 2. Onboarding Personas (The Two Intents)

When a user initiates the onboarding flow, the backend checks if the email is already registered in the DB and returns an `intent`:

### **A. New User (`intent = "new"`)**
*   **Who:** First-time email address.
*   **Goal:** Create a brand new IDRX account and submit identity documents (KYC).
*   **FE Behavior:** Show a KYC form where the user fills out their full name, address, ID number, and uploads an ID file.

### **B. Existing User (`intent = "link"`)**
*   **Who:** An email address already associated with an active IDRX account (e.g. they registered previously using a different wallet).
*   **Goal:** Map a new wallet address to the existing IDRX account without repeating KYC.
*   **FE Behavior:** Do **NOT** show the KYC form. Immediately verify the session and map the wallet automatically.

---

## 3. Frontend (FE) Implementation Roadmap

Frontend developers must implement the following screens and API integrations:

```
[Screen 1: Register] ──(Calls Request-Link)──> [Screen 2: Check Email Notice]
                                                         │ (User clicks link in email)
                                                         ▼
[Screen 4: Onboarding Success] <──(Calls Submit-KYC)── [Screen 3: Landing / KYC Page]
                                                         ▲
                                                         │ (Auto-exchanges magic link)
                                                         │ (via Verify-Link endpoint)
```

### **Phase 1: Entry Point (Registration Screen)**
The frontend displays a form with two inputs:
*   Email Address
*   Wallet Address

**API Call:**
The frontend makes a `POST` request to `/api/auth/onboarding/request-link` with the JSON payload.
*   **If successful:** 
    1. Read the `intent` from the JSON response and store it locally (in state or localStorage).
    2. Read the `token` from the response.
    3. Transition the user to a "Check Your Email" message screen.

---

### **Phase 2: Magic Link Redirect Landing Page**
When the user clicks the verification link in their email:
`https://<FRONTEND_URL>/onboarding/verify?token=<email_token>`

1.  **Parse the Token:** The frontend must extract the short-lived `token` from the URL query parameters.
2.  **Exchange for Onboarding Session:**
    The frontend immediately makes a `POST` request to `/api/auth/onboarding/verify-link` with the token.
    *   **If `intent == "link"` (Existing User)**: The backend automatically maps the wallet and returns success. Display a success screen and redirect the user to their dashboard.
    *   **If `intent == "new"` (New User)**: The backend returns a new long-lived **`onboardingToken`** (1 hour expiry). Cache this `onboardingToken` in state and transition the user to the KYC Form.

---

### **Phase 3: Submitting KYC Form**
Submit the KYC form data and the long-lived `onboardingToken` to `/api/auth/onboarding/submit-kyc` using `multipart/form-data`.
*   This endpoint consumes the `onboardingToken`, performs user onboarding on IDRX, and maps the wallet address.

---

## 4. API Reference Details

### **1. Request Link (`POST /api/auth/onboarding/request-link`)**
Generates the token, registers it in Redis (TTL = 15 minutes), and sends the magic link email via Brevo.

*   **URL:** `/api/auth/onboarding/request-link`
*   **Method:** `POST`
*   **Headers:** `Content-Type: application/json`
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "walletAddress": "29dkDAneDrXWgPAQSEksYc8bqrEEM2Nuyx1zMFojghNR"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "intent": "new" | "link",
      "message": "Magic link sent to your email",
      "token": "472e3650-4322-412d-772e-365047b2c7ac"
    }
    ```

---

### **2. Verify Link (`POST /api/auth/onboarding/verify-link`)**
Consumes the short-lived email token. If the intent is `new`, it returns a long-lived `onboardingToken` session token.

*   **URL:** `/api/auth/onboarding/verify-link`
*   **Method:** `POST`
*   **Headers:** `Content-Type: multipart/form-data`
*   **Form Parameters:**
    *   `token` (String, Required): The short-lived magic link token.

*   **Response (200 OK - intent = "new"):**
    ```json
    {
      "success": true,
      "onboardingToken": "9a2f6b8c-55c3-42e7-91bc-a8f4c7d2e365"
    }
    ```
*   **Response (200 OK - intent = "link"):**
    ```json
    {
      "success": true,
      "walletAddress": "29dkDAneDrXWgPAQSEksYc8bqrEEM2Nuyx1zMFojghNR",
      "kycOnboardingAddress": "0x914EffCbd43c570ec5d59e8a3918b80439e6cb86",
      "reused": true
    }
    ```

---

### **3. Submit KYC (`POST /api/auth/onboarding/submit-kyc`)**
Consumes the long-lived `onboardingToken` and registers/onboards the user on IDRX.

*   **URL:** `/api/auth/onboarding/submit-kyc`
*   **Method:** `POST`
*   **Headers:** `Content-Type: multipart/form-data`
*   **Form Parameters:**
    *   `onboardingToken` (String, Required): The long-lived session token.
    *   `fullname` (String, Required): Full legal name.
    *   `address` (String, Required): Physical address.
    *   `idNumber` (String, Required): Identity document number.
    *   `idFile` (File binary, Required): Image upload of ID card (PNG/JPEG/WEBP).

*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "walletAddress": "29dkDAneDrXWgPAQSEksYc8bqrEEM2Nuyx1zMFojghNR",
      "kycOnboardingAddress": "0x914EffCbd43c570ec5d59e8a3918b80439e6cb86",
      "fullname": "John Doe"
    }
    ```

---

## 5. Security & Verification State Handling

*   **Email Token Expiry (15 Minutes):** Magic links automatically expire after 15 minutes. The frontend should handle `403 Forbidden` errors by showing an "Expired Verification Session" message with a button to resend a new magic link.
*   **Onboarding Session Token Expiry (60 Minutes):** Once the user clicks the email link, they have 60 minutes to complete the KYC form submission. If the `onboardingToken` expires, the form submission will return `403 Forbidden`.
*   **Single-use Tokens:** All tokens are consumed immediately upon reading. If form validation fails on `/submit-kyc` (e.g. invalid file format or missing inputs), the session is consumed. The user must request a new magic link.
