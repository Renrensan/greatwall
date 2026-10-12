# ZEC lane: buy an index with shielded ZEC

**Status: built, and verified end to end on Zcash testnet on 2026-10-11;
switched to Zcash mainnet, buying only, on 2026-10-12; not yet deployed
or run on mainnet.** It sells **index tokens on Solana** (GREAT and the
others), not single tokens, for real ZEC. The Zcash side is `zec-lane/`
(a service beside Greatwall's server); the orders, prices, deliveries and
the page (`/<locale>/<network>/zec`, "Pay with ZEC") are Greatwall's. It
touches nothing of the iPoW protocol or its operator.

## What it is

The user scans a QR code with a Zcash phone wallet (Zashi, Ywallet) and
sends shielded ZEC; the lane sees the payment with its viewing key and
sends the index they chose to their Solana address. The user connects no
wallet to pay. On Zcash the payment is private: outsiders see neither
party, amount nor memo.

**Real ZEC for a test token.** The ZEC is real (Zcash mainnet); the index
is on Solana devnet and holds test tokens with no value. The page says so
before the user pays, and the caps are small (Z6).

**Buying only, for real.** The lane takes ZEC in and never pays ZEC out:
no refund, and selling an index for ZEC is a demo (below). Its Zcash wallet is
**watch-only**, made from the full viewing key alone
(`zcash-devtool wallet init-fvk`), so the server that runs it cannot spend
the ZEC it receives; the seed stays with its owner, off the server.

It is **Greatwall's own service, beside the protocol**, with wallets of
its own (the watch-only Zcash wallet, and the Solana wallet holding the
index parts), apart from the iPoW operator's keys: no contract, program,
light client, vault or operator changes, and the Bitcoin side is
untouched. It is not verified on chain; it is **accountable by a
published viewing key** (Z7) and capped (Z6).

## How a purchase goes

1. **Quote.** The user picks an index and an amount, and where it arrives
   on Solana (the connected wallet, or a typed address). Greatwall's
   server makes an order: its id, the ZEC amount, the lane's Zcash
   address, the memo `gw1:<id>` and an expiry (Z5).
2. **Pay.** Greatwall shows a ZIP-321 payment request as a QR code
   (`zcash:<address>?amount=<zec>&memo=<base64url>`). The phone's wallet
   fills in the address, amount and memo; the user taps Send.
3. **See.** The lane's wallet syncs Zcash through a light-wallet server
   (`zec.rocks`), and fetches each payment's full transaction to read its
   memo (compact blocks carry none). Greatwall finds the order by memo.
4. **Confirm.** Greatwall waits for 3 Zcash blocks (Z5).
5. **Deliver.** Greatwall mints the index from the parts the lane holds on
   Solana and sends it to the order's address (Z4, Z8). The page follows
   the order to "Received", with the delivery's transaction.

## Sell for ZEC (demo)

The page's "Sell for ZEC" tab shows the other direction without paying
ZEC, and says so before the user sells and while the order runs:

1. The user picks an index and an amount, and types a shielded Zcash
   address (`u1…` or `zs…`). Greatwall makes a sell order with the ZEC
   it would pay.
2. The user signs one transfer of the index to the lane's Solana address.
3. Greatwall reads the transfer once final on Solana: from the order's
   seller, of that index, to the lane.
4. **No ZEC is paid.** What arrived is sent back to the seller, and the
   page shows that transfer. A transfer is used by one order only, so it
   is never sent back twice.

## Pieces

| Piece | Where | Notes |
|---|---|---|
| Zcash wallet: sync, payments received with their memos | `zec-lane/lane.mjs`, a service on 127.0.0.1 with a key | Drives Zcash's own `zcash-devtool` (the official `zcash_client_backend` libraries) and reads its SQLite wallet; holds no Zcash code of its own, and no spending key |
| Orders, quotes, prices | Greatwall's server (`/api/zec/…`) | Index prices as the index page works them out, ZEC/USD from CoinGecko; orders kept on disk so a restart loses none |
| Delivery | Greatwall's server, with the lane's Solana key (the faucet's) | Mints the index from parts it holds, then a plain SPL transfer |
| Page: "Pay with ZEC" (QR, status) | Greatwall | Follows the order through Greatwall's server |

## Decisions

- **Z1. Zcash network: mainnet** (decided 2026-10-12). Real ZEC, because
  Zcash testnet has no phone wallet a user can pay from. Through the
  public light-wallet server `zec.rocks`. (Built and run first on testnet,
  see below.)
- **Z2. Indexes on Solana only.** The indexes the lane sells are minted on
  Solana devnet from the parts the lane holds there.
- **Z3. Shielded only.** The lane's Zcash address is a unified address
  with an Orchard receiver, so payments are shielded and carry a memo. A
  transparent payment has no memo and is not matched.
- **Z4. Memo, and what a payment gets** (revised 2026-10-12). The memo is
  `gw1:<order id>` and nothing else. Since nothing is refunded, a payment
  gets the index it paid for, never more than was ordered: a payment
  below the quote gets that share of the order; one above it gets the
  order, and the excess is kept. The page says so before the user pays.
- **Z5. Expiry and confirmations.**
  - A quote holds its price for **15 minutes**.
  - An order unpaid when its quote runs out is **expired** at once, and
    the page says so. A payment that still arrives within a day is
    delivered, at the prices of the moment it is delivered and at most the
    order, since no ZEC can be sent back. A sell order whose index has not
    been sent when its quote runs out is expired too.
  - A payment counts after **3 Zcash blocks** (75 seconds each on mainnet,
    about 4 minutes), whatever the amount: every order is under Z6's
    small cap.
- **Z6. Caps** (revised 2026-10-12). **$20 per order, $200 open** (paid
  and not yet delivered). Small, because real ZEC buys a test token, and
  so that faking or reorganizing three Zcash blocks wins nothing worth the
  work.
- **Z7. Accountability.** Greatwall publishes the lane's **full viewing
  key** (`/api/zec/info`): with it anyone can list every ZEC payment the
  lane received, with its memo, and match each to its delivery on Solana,
  which is public. A viewing key cannot spend.
- **Z8. Stock.** The lane delivers only from what it holds: a quote is
  refused when the lane is short of a part, so an order never waits for
  one.

## What it is not

- **Not trustless.** The protocol's Bitcoin side is verified on chain;
  this lane is not. Greatwall could take ZEC and not deliver. The
  published viewing key makes that visible to anyone, and the caps bound
  it.
- **Not a change to iPoW's rules.** No decision of
  `docs/design/ipow-protocol.md` changes, and nothing deployed changes.

## Running it

- On a machine that is **not** the server, make the wallet and keep its
  seed: `zcash-devtool wallet -w <dir> init --name lane --network main
  -i <age identity>` (the seed is encrypted to the age identity), then
  read its full viewing key with `list-accounts`. The seed can be
  restored in a phone wallet to move the ZEC received.
- On the server, make the watch-only wallet from the viewing key, with a
  birthday near the current height so it syncs quickly:
  `zcash-devtool wallet -w <dir> init-fvk --name lane --fvk <UFVK>
  --birthday <height> -s zecrocks`.
- Run `zec-lane/lane.mjs` with `ZEC_DEVTOOL`, `ZEC_WALLET_DIR` and
  `ZEC_LANE_API_KEY`; Greatwall's server gets `ZEC_LANE_URL` and the same
  `ZEC_LANE_API_KEY`.
- **NU7 on mainnet.** Zcash's NU7 upgrade has its mainnet height set on
  2026-10-20. The lane's `zcash-devtool` must know it by then (as it was
  patched to know testnet's NU7, below), or it may stop reading new
  blocks.

## Testnet run (2026-10-11)

Run on Zcash testnet and Solana devnet, with the lane able to send ZEC
then:
- **Buy.** Order `29a9934106`, 0.05 GREAT for 0.00039946 ZEC: paid with
  the memo `gw1:29a9934106`; seen, 3 confirmations, then GREAT minted
  from the lane's parts and sent, about 3 minutes from payment to
  delivery.
- **Sell** (since removed). Order `f0e062360f`, 0.05 GREAT for 0.00039779
  ZEC: the index sent to the lane, read final on Solana, then shielded ZEC
  sent with the memo `gw1:f0e062360f` (Zcash tx `63007d7f…1773`).
- **Zcash's NU7 on testnet.** The stable Zcash libraries do not know
  testnet's NU7 (height 4,465,026, branch id 0x77190ad9): the lane's
  `zcash-devtool` is built against `zcash_protocol` 0.10.5 with those two
  values filled in from Zcash's own pre-release (0.11.0-pre.0), with
  `--cfg zcash_unstable="nu7"`.

## Research notes (2026-10-11)

A full Zcash light client on chain (a second, parallel "mode" of iPoW)
was judged not worth it now. NU7 (25-second blocks, a new difficulty
window) reaches mainnet on 2026-10-20, a proof-of-stake layer (Crosslink)
is planned without a date, Equihash verification costs an estimated
0.4–0.8M gas per header on EVM and over Solana's per-transaction compute
limit, and faking Zcash work costs about 1/20 of Bitcoin's per hour. This
lane uses Zcash for what it does best, private payments, without
depending on any of that.
