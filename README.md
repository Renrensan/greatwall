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
- **Docs:** [greatwall.finance/en/docs](https://greatwall.finance/en/docs), how to use every page
- **Follow:** [X](https://x.com/greatwallfi) · [Telegram](https://t.me/greatwallfinance) · [YouTube](https://www.youtube.com/@greatwallfinance)

> [!NOTE]
> Greatwall runs on test networks only: Ethereum Sepolia, Base Sepolia, Arbitrum
> Sepolia, Robinhood Chain testnet, HyperEVM testnet, Tempo testnet and Solana
> devnet. The real-world-asset tokens are test stand-ins with no value. Bitcoin
> is the one real network: iPoW reads real Bitcoin.

## What you can do

| Page | What it does |
|---|---|
| **About** | The front page: what Greatwall is and how an index token is made. **Launch App** asks which network to start on |
| **Explore** | Every index token on a network: what backs it, on which networks, what one token is worth now, its supply over time, and its past performance: growth, yield (APY) and total return over 1, 3, 6 and 12 months, from the real assets' market data |
| **Create** | Launch an index token from assets on any network: pick the parts, set how much of each one token holds, name it and give it an image |
| **Lock / Unlock** | Lock any listed asset on its own network and receive it on a paired network, paid on the fast path in about 1–2 minutes from Solana or about 15 from Ethereum; unlock it back the same way |
| **Convert** | Move value between networks, or to and from Bitcoin, through an operator's quote |
| **Portfolio** | Everything your wallets hold, by network and in dollars, plus your index tokens |
| **Live** | The Explorer: a live view of iPoW itself: every protocol transaction on every network, who made it (an operator, a user, a guardian) and what it did. Open any row for what it means and why the protocol does it |

Index tokens run on all seven networks, Tempo included; Lock and Convert on
six (Tempo's are coming). Every on-chain action shows its progress in a toast,
with a link to the transaction.

### Try it in three minutes

1. Open [greatwall.finance](https://greatwall.finance), press **Launch App**, choose a network, and connect a wallet (MetaMask for the EVM networks, Phantom for Solana).
2. In **Portfolio** or **Lock**, use **Faucet** to get test tokens. Greatwall sends them and pays the fee, adding a little of the network's coin for fees when your wallet has none, so a new wallet needs nothing to start.
3. **Lock** a token on Ethereum for use on Solana, and watch it arrive.
4. **Create** an index token from a few assets, then find it in **Explore** and mint some.
5. Open **Live** to see the transactions you just made, next to the operators' work behind them.

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
- **Explorer** reads the iPoW contracts' events (EVM) and the programs'
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
| `FAUCET_EVM_KEY`, `FAUCET_SOLANA_KEY` | The server faucet's own test keys (`/api/faucet/*`): it sends test tokens and a little gas, paying the fee. The EVM key holds each network's gas coin and a stock of the tokens; the Solana key is the test mints' authority and holds devnet SOL. Never the deployer's or the operator's keys |
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
    [locale]/about           the About page, the front page (/ and /en open it)
    [locale]/(general)/...   pages of no network: Docs and the legal pages (/en/docs, /en/terms, ...)
    [locale]/[network]/...   the app's pages (Explore, Create, Lock, Convert, Portfolio, Live (/explorer))
    api/rpc/*                RPC proxies, rate-limited, keys kept server-side
    api/bitcoin/*            Bitcoin's explorer API through this server, for networks that block mempool.space
    api/prices, api/history  coin prices now, and a year of the real assets' prices for past performance
    api/explorer/*           the Explorer's readers (EVM events, Solana programs, Bitcoin tip)
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
  **has not been audited**. iPoW is built so no one is in control; the iPoW
  repository's `SECURITY.md` lists the development keys that exist on the test
  networks for now, and when each ends.
- [Terms of Use](https://greatwall.finance/en/terms) ·
  [Privacy Policy](https://greatwall.finance/en/privacy) ·
  [Cookies Policy](https://greatwall.finance/en/cookies)
