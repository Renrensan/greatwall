# Greatwall

**Index tokens and assets that work across networks, settled on Bitcoin.**

Greatwall is a web app for holding and combining real-world-asset tokens across
seven networks. Lock an asset on its own network and use it on another, convert
between networks, and create index tokens backed by assets from several
networks at once, all without a bridge to trust. Every cross-network step runs
on [**iPoW**](https://github.com/kelwinshen/ipow), a protocol that uses
Bitcoin's chain of blocks as the shared source of truth: each network checks
Bitcoin's proof of work itself, and operators who carry messages between
networks put up stake that is slashed if they lie.

- **Live:** [greatwall.finance](https://greatwall.finance)
- **Protocol:** [github.com/kelwinshen/ipow](https://github.com/kelwinshen/ipow)
- **Follow:** [X](https://x.com/greatwallfi) · [Telegram](https://t.me/greatwallfinance) · [YouTube](https://www.youtube.com/@greatwallfinance)

> [!NOTE]
> Greatwall runs on test networks only: Ethereum Sepolia, Base Sepolia, Arbitrum
> Sepolia, Robinhood Chain testnet, HyperEVM testnet, Tempo testnet and Solana
> devnet. The real-world-asset tokens are test stand-ins with no value. Bitcoin
> is the one real network: iPoW reads real Bitcoin.

## What you can do

| Page | What it does |
|---|---|
| **Explore** | Every index token on a network: what backs it, on which networks, and what one token is worth now |
| **Create** | Launch an index token from assets on any network: pick the parts, set how much of each one token holds, name it and give it an image |
| **Lock / Unlock** | Lock an asset on its own network and receive it on a paired network, paid in about two minutes on the fast path; unlock it back the same way |
| **Convert** | Move value between networks, or to and from Bitcoin, through an operator's quote |
| **Portfolio** | Everything your wallets hold, by network and in dollars, plus your index tokens |
| **Protocol** | A live explorer of iPoW itself: every protocol transaction on every network, who made it (an operator, a user, a guardian) and what it did |

### Try it in three minutes

1. Open [greatwall.finance](https://greatwall.finance) and connect a wallet (MetaMask for the EVM networks, Phantom for Solana).
2. In **Portfolio** or **Lock**, use **Faucet** to get test tokens (you need a little test ETH or SOL for fees).
3. **Lock** a token on Ethereum for use on Solana, and watch it arrive.
4. **Create** an index token from a few assets, then find it in **Explore** and mint some.
5. Open **Protocol** to see the transactions you just made, next to the operators' work behind them.

## How it fits together

```
 Greatwall (this repo)          Next.js app: pages, wallets, server routes
        │
        ▼
 @ipow/sdk                      TypeScript SDK from the iPoW repo
        │
        ▼
 iPoW on each network           light client · protocol · vault        (protocol)
                                Conversion · BETA index baskets        (applications)
        │
        ▼
 Bitcoin                        the shared source of truth, read by every network
```

- **Lock / Unlock** use iPoW's **vault**: an asset locked on its home network
  is issued as a receipt on the paired network once an operator's claim about
  it stands, or at once on the fast path, backed by an attester's stake.
- **Index tokens** are **BETA baskets**, an application on iPoW: one token
  backed by fixed amounts of several assets, minted by depositing that mix and
  burned to take it back.
- **Convert** uses the **Conversion** application, and the operator node's
  tunnel for conversions between two networks.
- **Protocol** reads the iPoW contracts' events (EVM) and the programs'
  transactions (Solana) directly from each network: nothing comes from a
  database of ours.

## Run it locally

Greatwall uses the iPoW SDK straight from the iPoW repository, so clone both
side by side:

```bash
git clone https://github.com/kelwinshen/ipow.git
git clone https://github.com/Renrensan/greatwall.git
cd greatwall
```

Requirements: **Node 22** and **pnpm 11** (both pinned in `mise.toml`; with
[mise](https://mise.jdx.dev), run `mise install`).

```bash
pnpm install
cp .env.example .env.local    # then fill in the values below
pnpm run build && pnpm start  # production build, served on http://localhost:3000
# or, while developing:
pnpm dev
```

### Environment

Set in `.env.local` (never commit it):

| Variable | What it is |
|---|---|
| `ETH_TESTNET_RPC_URL`, `BASE_TESTNET_RPC_URL`, `ARBITRUM_TESTNET_RPC_URL`, `ROBINHOOD_TESTNET_RPC_URL`, `HYPERLIQUID_TESTNET_RPC_URL`, `TEMPO_TESTNET_RPC_URL` | Each EVM test network's RPC. The browser reaches them through this app's `/api/rpc/*` routes, so the URLs (and their API keys) stay on the server |
| `SOLANA_DEVNET_RPC_URL` | Solana devnet RPC, also proxied |
| `TUNNEL_API_URL`, `TUNNEL_API_KEY` | The iPoW operator node's tunnel API, for conversions between two networks. Called only from this app's server |
| `SOLANA_MOCK_RWA_MINT_AUTHORITY` | The test tokens' mint authority on Solana devnet, for the Solana faucet |
| `PINATA_JWT`, `IPFS_GATEWAY` | Where index-token images and metadata are pinned (IPFS). Without them, files are kept in `GREATWALL_DATA_DIR` |
| `PUBLIC_ORIGIN` | This site's public address, written into index metadata (set it in production) |
| `NEXT_PUBLIC_GA_ID` | Optional: Google Analytics |

### Checks

```bash
pnpm lint    # ESLint
pnpm build   # type-checks and builds
```

## Project layout

```
src/
  app/
    [locale]/[network]/...   pages (Explore, Create, Lock, Convert, Portfolio, Protocol, legal)
    api/rpc/*                RPC proxies, rate-limited, keys kept server-side
    api/explorer/*           the protocol explorer's readers (EVM events, Solana programs, Bitcoin tip)
    api/baskets, api/beta    index-token listings and metadata
    api/faucet, api/tunnel   test-token faucet, operator tunnel
  components/
    <network>/               one wallet provider per network
    integrator/ipow/         Greatwall's use of @ipow/sdk (vaults, baskets, conversion, tunnel)
  subcomponents/             the pages' components
messages/en.json             all user-facing text
```

## Status

- Test networks only, as above; the protocol is under active development and
  **has not been audited**. See the iPoW repository's `SECURITY.md` for what is
  still centralized today.
- [Terms of Use](https://greatwall.finance/en/ethereum/terms) ·
  [Privacy Policy](https://greatwall.finance/en/ethereum/privacy) ·
  [Cookies Policy](https://greatwall.finance/en/ethereum/cookies)
