# Paradapp Client – Setup & Run Instructions

## Important Notes

### Online Client Demo Available

> You can easily view our client demo at **https://paradapp.com** without the hassle of local configs.

---

### Paradapp Protocol Repository

The **Paradapp Protocol** code repository is available here:

**https://github.com/Renrensan/paradapp-IPoW-v2**

This repository contains the **core Paradapp Protocol**, which powers the underlying protocol logic of our project.

---

### Paradapp IPoW Repository

The **Paradapp IPoW** code repository is available here:

**https://github.com/kelwinshen/ipow**

This is now a monorepo containing the IPoW cross-chain programs/contracts for every
supported network (Ethereum, Solana, Base, HyperEVM, Robinhood and Tempo).

---

### Litepaper

Our **Paradapp Litepaper** is available here:

**[https://drive.google.com/file/d/1pS5Vepda4Fn4yxOPMP_0JlUyDYIqUND1/view?usp=sharing](https://drive.google.com/file/d/1pS5Vepda4Fn4yxOPMP_0JlUyDYIqUND1/view?usp=sharing)**

This document provides an overview of the project vision, protocol design, and key concepts behind Paradapp.

---

### YouTube Channel (Brand & Demo Videos)

Our official **YouTube channel** is available here:

**[https://www.youtube.com/@paralleldapp](https://www.youtube.com/@paralleldapp)**

This channel contains our **brand materials** and **demo videos** for Paradapp.

### Supported Networks

Greatwall currently supports: **Bitcoin**, **Ethereum**, **Solana**, **Base**, **HyperEVM**, **Robinhood** and **Tempo** (Arbitrum's wallet is wired, without the protocol yet).

---

### Why we use `mise`

We use [`mise`](https://mise.rs) to ensure a more consistent and reproducible local development setup across machines.

This helps reduce environment mismatch issues and makes local run/setup easier to duplicate for all contributors.

You can also view all available project tasks defined in `mise` by running:

```bash
mise tasks
```

---

## Local Setup Guide

### 1) Install `mise` (if not already installed)

See: https://mise.rs

---

### 2) Clone the repository

```bash
git clone https://github.com/kelwinshen/paradapp-client.git
cd paradapp-client
```

---

### 3) Install Node.js version from `mise.toml`

```bash
mise install
```

---

### 4) Set up environment variables

```bash
cp .env.example .env
```

---

## Environment Configuration

Edit `.env` with the following values.

Replace placeholders with actual values.

### Backend & AI

#### `BACKEND_URL`

URL of your Paradapp API Service (**NODE backend**)

- Local development: `http://localhost:[port]`
- Production: your deployed backend URL or may use `https://api.paradapp.com`

#### `PARA_AI_URL`

Base URL for AI service (**Email us if need to test AI in local**)

#### `PARA_AI_API_KEY`

API key for AI service (**Email us if need to test AI in local**)

```env
BACKEND_URL=
PARA_AI_URL=
PARA_AI_API_KEY=
```

---

### Ethereum – Testnet (Sepolia)

#### `ETH_TESTNET_RPC_URL`

Ethereum Sepolia RPC URL

- Public: `https://rpc.sepolia.org`
- Infura: `https://sepolia.infura.io/v3/<your-project-id>`
- Alchemy: `https://eth-sepolia.g.alchemy.com/v2/<your-api-key>`

#### `ETH_TESTNET_EXPLORER`

Sepolia block explorer

- Default: `https://sepolia.etherscan.io`

```env
ETH_TESTNET_RPC_URL=
ETH_TESTNET_EXPLORER=https://sepolia.etherscan.io
```

---

### Ethereum – Mainnet

#### `ETH_MAINNET_RPC_URL`

Ethereum Mainnet RPC URL

- Public: `https://eth.llamarpc.com`
- Infura: `https://mainnet.infura.io/v3/<your-project-id>`
- Alchemy: `https://eth-mainnet.g.alchemy.com/v2/<your-api-key>`

#### `ETH_MAINNET_EXPLORER`

Mainnet block explorer

- Default: `https://etherscan.io`

```env
ETH_MAINNET_RPC_URL=
ETH_MAINNET_EXPLORER=https://etherscan.io
```

---

### Supra

#### `SUPRA_API_KEY`

API key for Supra (**Email us if needed this API key for local test**)

```env
SUPRA_API_KEY=
```

---

## Continue After Editing `.env`

### 5) Install npm dependencies

> **Important:** This project currently uses `--legacy-peer-deps` during installation to prevent peer dependency resolution issues that may occur in some local environments.

```bash
npm install --legacy-peer-deps
```

---

### 6) Run development server

```bash
mise run dev
```

---

## Optional: Build and run production standalone server

```bash
mise run build
mise run start
```

## Testing Limitations for Convert / Self-Custody Features

When testing our **Convert** or **Self-Custody** features locally, please note the following current limitations:

### Bitcoin Buy Token

- Cannot simulate a completed paid flow to receive BTC
- Able to create the deposit transaction successfully

### Convert To Bitcoin

- No Bitcoin will be received during testing
- Refund flow can still be tested based on our protocol refund scenario path

---
