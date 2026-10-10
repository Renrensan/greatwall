# Greatwall at the Crypto World's Fair

Our submission to Colosseum's Crypto World's Fair (September 14 – October 12,
2026) has two parts, built in this order:

1. **[iPoW](https://github.com/kelwinshen/ipow)**: the protocol underneath,
   which lets programmable networks talk to each other with Bitcoin as the
   shared source of truth. We built it first (its
   [HACKATHON.md](https://github.com/kelwinshen/ipow/blob/master/HACKATHON.md)
   tells that part).
2. **Greatwall**, this repository: the app on top of it, for locking,
   converting and combining assets across networks. We built it once the
   protocol and its SDK were in place, from October 3 to 10.

## Where we started

Greatwall is built on our own **multi-network app template**: the web client
of Paradapp, an earlier project of ours. It gave us the plumbing every
cross-network app needs, a wallet connection for each network, and it arrived
here as the first commit,
[`c96fa2d`](https://github.com/Renrensan/greatwall/commit/c96fa2d)
(October 3, 463 files). Alongside that plumbing it carried Paradapp's own
product: Bitcoin conversion on the first version of iPoW, an assets page, and
rupiah buy/sell with KYC. Greatwall replaced or removed all of that (see
October 9 below).

## What we built during the hackathon

| Date | Commit | What we built |
|---|---|---|
| Oct 3 | [`b61b8f6`](https://github.com/Renrensan/greatwall/commit/b61b8f6) | Greatwall's brand: guidelines, logos and fonts |
| Oct 4 | [`dfab8d0`](https://github.com/Renrensan/greatwall/commit/dfab8d0) | Greatwall itself: **index tokens** on Solana and Ethereum (explore, create, mint, burn), and Convert rebuilt on the new iPoW protocol through its SDK |
| Oct 5 | [`bbc01ef`](https://github.com/Renrensan/greatwall/commit/bbc01ef) | Conversion between two networks in one transaction; test real-world-asset tokens with faucets; index tokens made of assets from several networks |
| Oct 9 | [`bb04680`](https://github.com/Renrensan/greatwall/commit/bb04680) | **Lock / Unlock** across six networks with a fast path (about 1–2 minutes from Solana, about 15 from Ethereum); the **Explorer**, which shows every protocol transaction behind the app; Portfolio across networks; Convert and Portfolio redesigned; Terms, Privacy and Cookies pages |
| Oct 9 | [`1bb8f6a`](https://github.com/Renrensan/greatwall/commit/1bb8f6a) | The brand fonts in the app |
| Oct 10 | `COMMIT` | Index tokens on **Tempo**; every on-chain action with a progress toast; the **Live** Explorer, with plain-language titles and details for every protocol action; **past performance and yield** for index tokens (growth, APY and total return from real market data); Collect all fees in one approval; a supply chart; the **Docs** page; and Bitcoin and network access through Greatwall's own server, for networks that block them |

The same October 9 commit took out what Greatwall doesn't need from the
template, over 36,000 lines: Paradapp's rupiah and KYC features, the mainnet
switch (Greatwall runs on test networks, with real Bitcoin underneath), and
every call to the first version of iPoW. What remains from the template is the
wallet plumbing and the Bitcoin side of Convert; everything else in Greatwall
was built during the hackathon.

## How to check it

- `git log` on this repository: every commit above, with its date and author.
- The [live app](https://greatwall.finance), its [Docs](https://greatwall.finance/en/ethereum/docs), and its **Live** page (the Explorer), which
  reads every iPoW transaction behind it straight from the chains.
- [iPoW's HACKATHON.md](https://github.com/kelwinshen/ipow/blob/master/HACKATHON.md),
  for the protocol built first.

## Tools

Built with the help of AI coding assistants. [`AGENTS.md`](AGENTS.md) and
[`.agents/`](.agents) hold the brand and product notes they work from.
