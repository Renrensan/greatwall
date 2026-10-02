# Technical Specification: USDC Treasury Profit & Revenue Consolidation

**Document Version:** 1.0  
**Status:** DRAFT / PROPOSED  
**Target Repositories:** `paradapp-self-custody-service`, `paradapp-client`

---

## 1. Executive Summary

In the current self-custody engine, platform revenue (the **0.5% Platform Fee** and network fee surpluses) is retained via post-hoc deductions. This causes platform revenue to fragment across multiple venues and assets:
* Leftover **BTC / ETH / USDT** balance inside the **Binance Corporate Account** (for cross-chain deposits).
* Leftover **SOL** in the **Solana Operator Wallet** (for SOL deposits).
* Leftover **IDRX** on Solana (for withdrawals).

This specification establishes an **Upfront USDC Revenue Skimming Architecture** ensuring that **100% of all platform fees, processing margins, and revenue from all networks consolidate strictly as `USDC` inside the Main Solana Operator Wallet**.

```
                           ┌──────────────────────────────────────────────┐
                           │      Main Solana Operator Hot Wallet        │
                           │              (Treasury Root)                 │
                           │                                              │
                           │    ┌────────────────────────────────────┐    │
                           │    │     100% Consolidated Profit       │    │
                           │    │           (SPL-USDC)               │    │
                           │    └────────────────────────────────────┘    │
                           └──────────────────────▲───────────────────────┘
                                                  │
                 ┌────────────────────────────────┼───────────────────────────────┐
                 │ Upfront Skim (0.5%)            │ Upfront Skim (0.5%)           │ Unswapped USDC (0.5%)
                 │                                │                               │
     [Solana Deposits: SOL/USDC]     [Cross-Chain: BTC/ETH/DOT/etc]     [Withdrawals: All Chains]
        IDRX -> USDC Split              IDRX -> USDC (Retain Fee)           Binance USDC -> IDRX
                                           Net -> Binance Buy                 (Retain Fee in USDC)
```

---

## 2. Current State vs. Target State Comparison

| Dimension | Current Architecture (Post-Hoc Deductions) | Target Architecture (Upfront USDC Skimming) |
| :--- | :--- | :--- |
| **Deposit Revenue Location (Solana USDC)** | Main Solana Operator Wallet (`USDC`) | Main Solana Operator Wallet (`USDC`) |
| **Deposit Revenue Location (Solana SOL)** | Main Solana Operator Wallet (`SOL`) | Main Solana Operator Wallet (`USDC`) |
| **Deposit Revenue Location (Cross-Chain)** | Binance Corporate Account (`USDT` / target crypto dust) | **Main Solana Operator Wallet (`USDC`)** |
| **Withdrawal Revenue Location** | Main Solana Operator Wallet (`IDRX` tokens) | **Main Solana Operator Wallet (`USDC`)** |
| **CEX Capital Retention** | Residual dust accumulates on Binance | **Zero revenue left on Binance** (only exact net buys executed) |
| **Treasury Currency Exposure** | Multi-asset volatility (SOL, BTC, ETH, IDRX) | **100% Stablecoin (`USDC`)** |

---

## 3. Core Architectural Principles

1. **Solana as the Settlement Clearinghouse:**  
   Because all deposits enter through IDRX on Solana and all withdrawals exit through IDRX redemption on Solana, the Solana Operator Wallet acts as the single central clearinghouse for treasury fee capture.
2. **Upfront Fee Skimming:**  
   Fees are never deducted at the end of a multi-hop pipeline. The 0.5% Platform Fee is captured immediately upon IDRX $\rightarrow$ USDC conversion on Solana *before* forwarding capital to Binance or downstream chains.
3. **Exact Sized Downstream Operations:**  
   All downstream operations (Jupiter swaps to SOL, Binance buy orders, IDRX burn redemptions) are sized strictly to the **Net User Amount + verifiable gas/disbursement costs**.

---

## 4. Deposit Flows Specification

### 4.1. Solana Native Deposits (SOL & USDC)

#### A. USDC on Solana (`NetworkType::Solana`, `TokenType::Usdc`)
1. User pays IDR $\rightarrow$ IDRX minted to Derived KYC Address.
2. Operator sweeps 100% IDRX $\rightarrow$ Main Solana Operator Wallet.
3. Operator executes Jupiter Swap: `100% IDRX` $\rightarrow$ `Gross USDC`.
4. **Fee Skim:**
   $$\text{Platform Fee (USDC)} = \text{round\_ceil}(\text{Gross USDC} \times 0.005)$$
   $$\text{Network Fee (USDC)} = \text{round\_ceil}(\text{Gross USDC} \times 0.005)$$
   $$\text{Referral Fee (USDC)} = \text{Gross USDC} \times 0.0025 \quad (\text{if } \text{ref\_address} \ne \text{None})$$
   $$\text{Net User USDC} = \text{Gross USDC} - \text{Platform Fee} - \text{Network Fee} - \text{Referral Fee}$$
5. Operator sends `Net User USDC` to user wallet.
6. (If referral present) Operator sends `Referral Fee (USDC)` to referrer wallet.
7. **Treasury Outcome:** `Platform Fee (USDC)` and unspent network fee buffer remain as **USDC** in the Operator wallet.

#### B. SOL on Solana (`NetworkType::Solana`, `TokenType::Sol`)
1. Operator sweeps 100% IDRX $\rightarrow$ Main Solana Operator Wallet.
2. Operator executes Jupiter Swap: `100% IDRX` $\rightarrow$ `Gross USDC`.
3. **Fee Skim (Immediate in USDC):**
   $$\text{Platform Fee (USDC)} = \text{Gross USDC} \times 0.005$$
   $$\text{Net USDC for SOL} = \text{Gross USDC} - \text{Platform Fee} - \text{Network Fee} - \text{Referral Fee}$$
4. Operator executes Second Jupiter Swap: `Net USDC for SOL` $\rightarrow$ `Net SOL`.
5. Operator transfers `Net SOL` directly to user's wallet.
6. **Treasury Outcome:** The `Platform Fee` never touches SOL; it remains permanently as **`USDC`** in the Operator wallet.

---

### 4.2. Cross-Chain Deposits (BTC, ETH, HBAR, DOT, POL)

#### Step-by-Step Flow:
1. **IDRX Sweep:** Sweep IDRX to Main Solana Operator Wallet.
2. **Initial Swap to USDC on Jupiter:** Swap `100% IDRX` $\rightarrow$ `Gross USDC`.
3. **Upfront Fee Isolation (On Solana):**
   * Deduct `Platform Fee (USDC)` (0.5% or 0.25% if referral).
   * Deduct `Estimated Network Processing Fee (USDC)` (0.5%).
   * Retain these fees in the Main Solana Operator Wallet as **USDC**.
4. **Transfer Net Capital to Binance:**
   * Calculate $\text{Investable USDC} = \text{Gross USDC} - \text{Platform Fee} - \text{Processing Fee}$.
   * Swap `Investable USDC` $\rightarrow$ `USDT` (or send `USDC` directly to Binance's Solana deposit address).
5. **Binance Exact Net Buy:**
   * Place market buy order on Binance sized to buy the exact `Net User Token Amount + Binance Withdraw Fee`.
6. **Binance Withdrawal:**
   * Withdraw the purchased net token amount to the user's self-custody wallet (or batch vault).
7. **Treasury Outcome:**
   * Binance account balance returns to clean baseline (zero leftover accumulation).
   * 100% of platform earnings reside in the **Main Solana Operator Wallet as USDC**.

---

## 5. Withdrawal Flows Specification (Crypto $\rightarrow$ IDR Bank)

### 5.1. Solana Native Withdrawals (SOL / USDC $\rightarrow$ IDR Bank)
1. User sends SOL/USDC to Operator address.
2. If SOL: Operator swaps SOL $\rightarrow$ `Gross USDC`.
3. The system calculates the exact IDR needed for user's bank payout + IDRX disbursement fee:
   $$\text{Target IDRX} = \text{Net IDR Payout} + \text{IDRX Disbursement Fee (Rp 2,500 - 4,000)}$$
4. Operator swaps only the exact `Target USDC` $\rightarrow$ `Target IDRX`.
5. Operator transfers `Target IDRX` to user's Derived KYC address and triggers `POST /transaction/redeem-request`.
6. **Treasury Outcome:** The remaining `(Gross USDC - Target USDC)` represents the 0.5% platform fee and network margin. It is **never converted to IDRX** and remains as **USDC** in the Operator wallet.

---

### 5.2. Cross-Chain Withdrawals (BTC, ETH, DOT, etc. $\rightarrow$ IDR Bank)
1. User transfers target asset to Chain Operator Address $\rightarrow$ forwarded to Binance.
2. On Binance: Market sell target asset $\rightarrow$ `Gross USDC`.
3. Withdraw 100% of `Gross USDC` from Binance $\rightarrow$ Main Solana Operator Wallet.
4. On Solana:
   * Determine exact $\text{Target IDRX} = \text{Net IDR Payout} + \text{IDRX Disbursement Fee}$.
   * Swap only the exact required USDC portion into `Target IDRX`.
   * The remaining **0.5% Platform Fee portion of USDC is left unswapped**.
5. Transfer `Target IDRX` to user's Derived KYC address and execute the bank burn payout.
6. **Treasury Outcome:** Profit accumulates directly in the **Main Solana Operator Wallet as USDC**.

---

## 6. Implementation Roadmap & File Changes

### 1. `crates/infra/src/fee.rs`
* Update `get_deposit_breakdown_from_idr`:
  * Return `platform_fee_usdc`, `net_investable_usdc`, and `net_token_amount`.
* Update `get_withdraw_breakdown_from_token`:
  * Return `exact_usdc_to_swap_for_idrx` and `retained_platform_fee_usdc`.

### 2. `crates/app/src/action.rs`
* In `process_idrx_deposit_routing`:
  * For Non-Solana deposits: Perform IDRX $\rightarrow$ USDC swap, isolate fee in USDC, and transfer only net investable funds to Binance.
  * For SOL deposits: Perform IDRX $\rightarrow$ USDC, retain fee in USDC, and swap net USDC $\rightarrow$ SOL for the user payout.
* In `process_withdrawal_flow` & `check_idrx_withdrawal_payout_status`:
  * Calculate exact IDRX needed for bank payout.
  * Execute Jupiter swap only for the exact redemption amount, preserving the fee surplus as USDC.

---

## 7. Key Benefits

1. **Single-Token Treasury Management:** Complete real-time visibility over all platform revenue in `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (SPL USDC).
2. **Zero Currency Volatility:** Profits are never exposed to market swings in SOL, BTC, or fluctuating IDRX rates.
3. **Automated Sweep & Distribution:** Treasury scripts can easily sweep accumulated USDC to cold storage or shareholder contracts via simple SPL token transfers.
