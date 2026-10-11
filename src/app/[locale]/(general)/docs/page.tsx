// Greatwall's user guide: what each page does and how to use it. Keep it
// true to the app as it changes, and to the protocol as it is today (test
// networks only; SECURITY.md in the iPoW repository lists the development
// keys that exist for now).

import type { Metadata } from "next";

import { Contact, H2, H3, LegalShell, List, Summary, Table } from "@/components/ui/legal";
import { AppLink } from "@/components/NetworkChooser";

export const metadata: Metadata = {
  title: "Documentation · Greatwall",
  description: "How to use Greatwall: wallets and test tokens, Lock and Unlock, Convert, index tokens, and the Explorer.",
};

const SECTIONS = [
  { id: "summary", title: "Quick start" },
  { id: "start", title: "Before you start" },
  { id: "networks", title: "Networks" },
  { id: "portfolio", title: "Portfolio" },
  { id: "lock", title: "Lock and Unlock" },
  { id: "convert", title: "Convert" },
  { id: "indexes", title: "Index tokens" },
  { id: "explorer", title: "Explorer" },
  { id: "how", title: "How it works" },
  { id: "node", title: "Run a node" },
  { id: "status", title: "Status and safety" },
  { id: "help", title: "Help" },
];

const IPOW = "https://github.com/kelwinshen/ipow";
const NODE_GUIDE = `${IPOW}/blob/master/node/README.md`;

export default async function Docs({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const base = `/${locale}`;
  // A general page (terms, privacy, cookies) is a plain link; a page of the
  // app lives under a network, so it asks which one first.
  const GENERAL = ["terms", "privacy", "cookies", "docs"];
  const page = (path: string, label: string) =>
    GENERAL.includes(path) ? (
      <a href={`${base}/${path}`} className="font-semibold underline underline-offset-2">
        {label}
      </a>
    ) : (
      <AppLink path={`/${path}`} className="font-semibold underline underline-offset-2">
        {label}
      </AppLink>
    );
  return (
    <LegalShell
      title="Documentation"
      base={base}
      current="docs"
      toc={SECTIONS}
      intro={
        <p>
          Greatwall lets you hold and combine assets across networks, with Bitcoin as the record every network checks for itself. This guide
          walks through each page: what it does, and what to expect when you use it.
        </p>
      }
    >
      <Summary
        items={[
          <>Connect a wallet: MetaMask for the EVM networks, Phantom for Solana.</>,
          <>In {page("vault/assets", "Portfolio")} or {page("lock", "Lock")}, use Faucet to get test tokens. Greatwall sends them and pays the fee, with a little of the network&rsquo;s own coin for fees when your wallet has none.</>,
          <>{page("lock", "Lock")} a token on one network for use on another, and watch it arrive.</>,
          <>{page("index/create", "Create")} an index token from a few assets, then find it in {page("index", "Explore")} and mint some.</>,
          <>Open {page("explorer", "Live")} to see your transactions next to the operators&rsquo; work behind them.</>,
        ]}
      />

      <section className="flex flex-col gap-4">
        <H2 id="start">Before you start</H2>
        <H3>Wallets</H3>
        <List
          items={[
            "EVM networks (Ethereum, Base, Arbitrum, Robinhood Chain, HyperEVM, Tempo): MetaMask, or any wallet the Connect button lists.",
            "Solana: Phantom, or another Solana wallet.",
            "Bitcoin, for Convert only: Xverse or Phantom.",
          ]}
        />
        <p>
          Pick the network in the navbar; Greatwall asks your wallet to switch to it. Every transaction is prepared by the page and signed by your
          wallet: check the network, the asset and the amount before you sign.
        </p>
        <H3>Test tokens</H3>
        <p>
          Greatwall runs on test networks. The Faucet button sends you test versions of real-world-asset tokens (tokenized stocks, funds, gold,
          stablecoins). They are stand-ins with no value. Greatwall&rsquo;s server sends them and pays the fee; when your wallet is low on the
          network&rsquo;s own coin (test ETH, SOL, HYPE, or PathUSD on Tempo), the same claim adds a little for fees, and Portfolio has a
          &ldquo;Get &hellip; for fees&rdquo; button on that coin. Each wallet can claim each token once a day. If Greatwall&rsquo;s faucet runs
          dry, it links you to the network&rsquo;s public faucet.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="networks">Networks</H2>
        <Table
          head={["Network", "Test network", "What you can do there"]}
          rows={[
            ["Bitcoin", "Bitcoin itself", "Convert BTC. Bitcoin runs no programs: it is the record the other networks check"],
            ["Ethereum", "Sepolia", "Lock, Convert, index tokens"],
            ["Solana", "Devnet", "Lock, index tokens, Convert out of Solana (into Solana is coming)"],
            ["Base", "Base Sepolia", "Lock, Convert, index tokens"],
            ["Arbitrum", "Arbitrum Sepolia", "Lock, Convert, index tokens"],
            ["Robinhood Chain", "Testnet", "Lock, Convert, index tokens"],
            ["HyperEVM", "Testnet", "Lock, Convert, index tokens"],
            ["Tempo", "Testnet", "Index tokens, made of tokens only (Tempo has no coin of its own); Lock and Convert are coming"],
          ]}
        />
        <p>
          Bitcoin is the one real network: the protocol reads real Bitcoin blocks, and Convert pays and receives real BTC. With Bitcoin selected, a
          page that needs programs offers the same page on another network.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="portfolio">Portfolio</H2>
        <p>
          Everything your connected wallets hold, by network and in dollars, plus your index tokens and the assets you have locked. The panel
          across networks shows each network&rsquo;s total, and says when a wallet isn&rsquo;t connected. From here you can send, receive and
          use the faucet.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="lock">Lock and Unlock</H2>
        <p>
          Locking keeps an asset in the protocol&rsquo;s vault on its own network and makes a matching token usable on a paired network.
          Unlocking burns that token and releases the asset back on its own network.
        </p>
        <H3>Locking</H3>
        <List
          items={[
            "Choose the asset, the amount, the network to receive it on, and the recipient.",
            "Sign the lock. The asset stays in the vault on this network.",
            "An operator relays the lock to the other network, where the token becomes usable.",
          ]}
        />
        <H3>Fast path and slow path</H3>
        <p>
          With a <strong>fast fee</strong>, an attester makes the token usable on the other network as soon as your lock is final on its
          own network, putting up its own collateral as a guarantee. How long that takes depends on where you lock: about 1–2 minutes from
          Solana, about 15 minutes from Ethereum (Ethereum takes that long to finalize a block), and longer from a rollup such as Base or
          Arbitrum. Without one, the lock takes the <strong>slow path</strong>: a Bitcoin checkpoint the
          networks certify, then a claim period in which anyone can challenge it, about nine days in all.
        </p>
        <H3>Fees</H3>
        <List
          items={[
            "The network's transaction fee, paid in its own coin.",
            "An operator's fee, to the operator who relays the lock. Operators may skip one below their minimum.",
            "An optional fast fee, to the attester who makes it usable at once.",
          ]}
        />
        <H3>The first lock on a pair</H3>
        <p>
          If nothing of an asset has crossed a pair of networks yet, an operator who serves that pair must relay the first lock. Until one does,
          the asset stays locked, and a lock can&rsquo;t be cancelled. The page warns you before you sign.
        </p>
        <H3>Unlocking</H3>
        <p>
          Unlock from the network where you hold the token. Signing burns it; an operator relays the burn, and the asset is released to the
          recipient on its own network. Each lock and unlock has its own page, which follows it step by step.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="convert">Convert</H2>
        <p>
          Convert moves value between Bitcoin and a network&rsquo;s coin, or between two networks, through an operator&rsquo;s quote. The page
          shows every fee before you start.
        </p>
        <H3>Buying a coin with BTC</H3>
        <List
          items={[
            "Choose the network and the amount. An operator takes the conversion and locks the coin for you.",
            "The conversion's page shows the Bitcoin address to pay and the blocks your payment must be in. Pay from the page with your Bitcoin wallet.",
            "Once your payment is in a Bitcoin block, it is proven to the network and the coin is released to you.",
          ]}
        />
        <p>
          Pay only while the page says you can. If the blocks to pay in have passed, don&rsquo;t pay: the operator takes the coin back. If the
          operator doesn&rsquo;t finish, your payment must be proven before the deadline the page shows.
        </p>
        <H3>Selling a coin for BTC, and between networks</H3>
        <p>
          You deposit the coin on its network, and the operator pays you on Bitcoin or on the other network. If no operator takes it in time, the
          page lets you take your deposit and fees back.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="indexes">Index tokens</H2>
        <p>
          An index token is one token backed by fixed amounts of several assets, from one network or several. Anyone can mint it by depositing
          that mix, and burn it to take the assets back.
        </p>
        <H3>Explore</H3>
        <p>
          Every index token on the selected network: what backs it, on which networks, what one token is worth now, its supply over time, and
          its mint and burn activity. Open one to mint or burn it.
        </p>
        <H3>Past performance and yield</H3>
        <p>Each index token&rsquo;s page shows what its fixed mix of assets would have done over 1, 3, 6 and 12 months:</p>
        <List
          items={[
            <>
              <strong>Growth:</strong> the change in one token&rsquo;s value, price only.
            </>,
            <>
              <strong>Yield (APY):</strong> the dividends and interest its assets paid over the past 12 months, weighted by their value today.
              Bitcoin and gold pay none; stock funds pay dividends; dollar funds pay interest.
            </>,
            <>
              <strong>Total return:</strong> growth and yield together, with the income reinvested.
            </>,
          ]}
        />
        <p>
          They come from the market prices of the assets each part stands for. Past performance is not a promise. When you create an index, its
          shares set each part&rsquo;s amount at that day&rsquo;s prices; the amounts are then fixed, so the shares drift as prices move.
        </p>
        <H3>Create</H3>
        <List
          items={[
            "Pick the parts: assets on this network, or on a network paired with it.",
            "Set how much of each asset one token holds.",
            "Set your creator fee, earned on every mint and burn. It is fixed for good once the token is created.",
            "Give it a name, a symbol, an image and a description. These are published publicly and permanently.",
          ]}
        />
        <p>The first mint must be a whole number of tokens: it sets the index&rsquo;s mix.</p>
        <H3>Mint and burn</H3>
        <p>
          Minting shows what each asset the amount takes, and what your wallet holds; the mint fee is included. Burning pays you each asset back,
          after the burn fee. As the creator, you collect your fees from the token&rsquo;s page: one part at a time, or every part at once with
          Collect all, signed in a single approval on Solana.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="explorer">Explorer</H2>
        <p>
          {page("explorer", "Live")} in the navbar opens the Explorer, a live view of iPoW itself: the latest Bitcoin block, and every protocol
          transaction on every network, who made it (an operator, a user, a guardian) and what it did. Open any row for what it means, why the
          protocol does it, and its full details. It is read straight from the chains, not from a database of ours, so you can check what the
          operators do.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="how">How it works</H2>
        <p>Every cross-network step runs on iPoW, a protocol with Bitcoin as the shared source of truth:</p>
        <List
          items={[
            <>
              <strong>A Bitcoin light client on each network.</strong> Each network checks Bitcoin&rsquo;s proof of work itself, so it knows
              Bitcoin&rsquo;s blocks without trusting anyone.
            </>,
            <>
              <strong>Operators.</strong> They carry messages between networks, putting up stake that is taken if they lie.
            </>,
            <>
              <strong>Attesters.</strong> They make a lock usable at once on the fast path, backed by their own collateral.
            </>,
            <>
              <strong>Applications.</strong> The vault (Lock and Unlock), Conversion (Convert) and BETA baskets (index tokens) are built on top.
            </>,
          ]}
        />
        <p>
          The design, the contracts and the specs are in the{" "}
          <a href={IPOW} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
            iPoW repository
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="node">Run a node</H2>
        <p>
          The people who keep iPoW running are paid for it, and anyone can join. One program, the iPoW node, runs any mix of three roles on any
          of the networks. Each role puts up stake that it loses if it lies, which is what lets everyone else trust the result without trusting
          the person.
        </p>
        <Table
          head={["Role", "What it does", "What it earns", "What it risks", "What it needs"]}
          rows={[
            [
              <strong key="o">Operator</strong>,
              "Proves Bitcoin blocks to each network (checkpoint jobs), carries locks and unlocks between networks through Bitcoin, and gives users their tokens at once on the fast path.",
              "Job fees, relay fees on locks and unlocks, and fast fees.",
              "Its stake and bonds, if it lies or misses a deadline.",
              "A stake on each network, bonds in the tokens it carries, a Bitcoin wallet with a little BTC, and coin for gas.",
            ],
            [
              <strong key="a">Attester</strong>,
              "Vouches for an operator's proven job by locking stake behind it, so applications can rely on it sooner.",
              "40% of the job's escrow fee: about 0.2% of what it locks per week, about 10% a year.",
              "What it locks, if it vouches for a false proof.",
              "A stake, and coin for gas.",
            ],
            [
              <strong key="g">Guardian</strong>,
              "Watches every proof and every claim, and objects to anything false: a fake Bitcoin block, a lock that never happened, a missed deadline.",
              "20% of what a liar is slashed.",
              "Small deposits, if it objects to something true.",
              "Coin for deposits and gas. No stake.",
            ],
          ]}
        />
        <p>
          The more independent guardians watch, the safer everyone is: one honest guardian is enough to catch a lie. Today the deployer runs the
          only operator, and the protocol is open for anyone to join.
        </p>
        <H3>Getting started</H3>
        <List
          items={[
            <>
              Read the{" "}
              <a href={NODE_GUIDE} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
                node guide
              </a>
              : each role&rsquo;s duties every round, its settings, and how to run it.
            </>,
            "Start as a guardian: it needs no stake, only a little coin for deposits and gas.",
            "An operator also locks a stake on each network, registers once on each pair of networks it serves (one Bitcoin transaction, counted after a 36-hour challenge window), and keeps bonds in the tokens it carries.",
          ]}
        />
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="status">Status and safety</H2>
        <List
          items={[
            "Greatwall runs on test networks only, and its tokens have no value. Bitcoin is real: only pay BTC amounts you can afford to lose.",
            "iPoW is built so no one is in control. Its contracts on the EVM networks have no owner and can't be changed by anyone, Bitcoin is checked on chain rather than reported, and anyone can run an operator or a guardian.",
            <>
              It is in active development and not yet audited. While it is tested, a few development keys exist on purpose: on Solana devnet
              the programs can still be upgraded for fixes, and new vaults have a genesis key until October 21. Once audited, before mainnet,
              the Solana programs become unchangeable, like the EVM contracts. The iPoW repository&rsquo;s{" "}
              <a href={`${IPOW}/blob/master/SECURITY.md`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                SECURITY.md
              </a>{" "}
              lists each key, what it can do and when it ends.
            </>,
            "Transactions are final once confirmed. Greatwall never holds your assets or keys, and can't reverse a transaction.",
          ]}
        />
        <p>
          See the {page("terms", "Terms of Use")}, the {page("privacy", "Privacy Policy")} and the {page("cookies", "Cookies Policy")}.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="help">Help</H2>
        <p>Questions, or something not working? Write to us, or find us on X and Telegram (links below).</p>
        <Contact />
      </section>
    </LegalShell>
  );
}
