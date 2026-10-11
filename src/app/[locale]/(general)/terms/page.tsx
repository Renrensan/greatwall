// Greatwall's Terms of Use. The risk section states the protocol as it is
// today (testnets only, one operator key per network: see SECURITY.md in
// the iPoW repository); keep it true to that as the protocol changes.

import type { Metadata } from "next";

import { Contact, H2, H3, LegalShell, List, Summary } from "@/components/ui/legal";

export const metadata: Metadata = {
  title: "Terms of Use · Greatwall",
  description: "The terms for using greatwall.finance.",
};

const SECTIONS = [
  { id: "summary", title: "Summary" },
  { id: "agreement", title: "Agreeing to these terms" },
  { id: "eligibility", title: "Who may use Greatwall" },
  { id: "platform", title: "What Greatwall is" },
  { id: "testnet", title: "Test networks and test tokens" },
  { id: "wallet", title: "Your wallet" },
  { id: "using", title: "Using the Platform" },
  { id: "indexes", title: "Index tokens you create" },
  { id: "fees", title: "Fees" },
  { id: "risks", title: "Risks" },
  { id: "prohibited", title: "What you may not do" },
  { id: "ip", title: "Intellectual property" },
  { id: "third-party", title: "Other services" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability", title: "Limitation of liability" },
  { id: "indemnity", title: "Indemnity" },
  { id: "changes", title: "Changes and suspension" },
  { id: "general", title: "General" },
  { id: "contact", title: "Contact us" },
];

export default async function TermsOfUse({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const base = `/${locale}`;
  return (
    <LegalShell
      title="Terms of Use"
      base={base}
      current="terms"
      toc={SECTIONS}
      intro={
        <p>
          These Terms of Use (&ldquo;Terms&rdquo;) govern your use of greatwall.finance and the apps on it (the &ldquo;Platform&rdquo;), run
          by Greatwall (&ldquo;we&rdquo;, &ldquo;us&rdquo;). Please read them carefully: they explain what Greatwall is and isn&rsquo;t, and
          the risks of using it.
        </p>
      }
    >
      <Summary
        items={[
          "Greatwall is a non-custodial interface. You act through your own wallet, and every transaction is yours to review and sign.",
          "The Platform currently runs on test networks only. Its tokens, including the test versions of real-world assets, have no value and give no rights to anything.",
          "Blockchain transactions are final. We can't reverse, cancel or refund them.",
          "The protocol is in active development, and some of its functions are still controlled by a single operator. Use it knowing that.",
          "Nothing on the Platform is financial, investment, legal or tax advice.",
        ]}
      />

      <section className="flex flex-col gap-4">
        <H2 id="agreement">Agreeing to these terms</H2>
        <p>
          By accessing or using the Platform, you agree to these Terms and to our{" "}
          <a href={`${base}/privacy`} className="underline underline-offset-2">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href={`${base}/cookies`} className="underline underline-offset-2">
            Cookies Policy
          </a>
          . If you don&rsquo;t agree, don&rsquo;t use the Platform.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="eligibility">Who may use Greatwall</H2>
        <p>To use the Platform, you must:</p>
        <List
          items={[
            "be at least 18 years old and able to enter into a binding agreement;",
            "not be a person or entity named on a sanctions list, nor located in, or a resident of, a country or region subject to comprehensive sanctions; and",
            "be allowed to use services like the Platform under the laws that apply to you. You are responsible for knowing and following them.",
          ]}
        />
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="platform">What Greatwall is</H2>
        <p>
          Greatwall is a web interface to the iPoW protocol: smart contracts and programs on public blockchains that lock assets on one network
          for use on another, convert between networks with Bitcoin&rsquo;s proof of work as the record, and combine assets from several
          networks into index tokens. The Platform reads public blockchain data and prepares transactions; your wallet signs and sends them.
        </p>
        <p>
          Greatwall does not hold your assets, does not have your private keys, and cannot move funds on your behalf. We are not a bank, broker,
          exchange, custodian or financial adviser, and we do not act as an intermediary in your transactions.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="testnet">Test networks and test tokens</H2>
        <p>
          The Platform currently runs on test networks (such as Ethereum Sepolia and Solana devnet), not on main networks. Assets on test
          networks, and the tokens you get from the Platform&rsquo;s faucets, have no monetary value and cannot be redeemed for money.
        </p>
        <p>
          Some test tokens carry the names, symbols and logos of real-world assets, such as tokenized stocks, funds, gold or stablecoins. They are
          stand-ins for testing only. They are not issued by, or connected to, the issuers of those assets, are not securities, and give no
          ownership, claim or right to any real asset. Prices shown for them are for reference only.
        </p>
        <p>We may reset, change or retire test deployments, tokens and balances at any time.</p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="wallet">Your wallet</H2>
        <p>
          You use the Platform by connecting a wallet you control, such as MetaMask or Phantom. You alone are responsible for your wallet: its
          private keys, seed phrase and passwords, and every transaction it signs. If you lose access to your wallet, we cannot recover it or
          its assets. We will never ask for your private keys or seed phrase.
        </p>
        <p>Wallets are provided by third parties under their own terms. We are not responsible for them.</p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="using">Using the Platform</H2>
        <p>
          Before you sign, check every transaction: the network, the asset, the amount, the recipient, and the fees. Transactions on blockchains
          are public and final once confirmed. We cannot cancel, reverse or refund them, including transactions sent to a wrong address.
        </p>
        <H3>Locking and unlocking</H3>
        <p>
          Locking an asset keeps it in the protocol&rsquo;s vault on its own network, and makes a matching token usable on another network.
          Unlocking burns that token and releases the asset on its own network. The time this takes depends on the networks, the protocol&rsquo;s
          checks, and, on the fast path, on an operator.
        </p>
        <H3>Converting</H3>
        <p>
          A conversion has steps on more than one network, and may depend on an operator taking it on within set deadlines. If a conversion is not
          completed, the protocol&rsquo;s refund paths may need you, or anyone, to act to unwind it.
        </p>
        <H3>Times and estimates</H3>
        <p>Times, prices, values and amounts shown on the Platform are estimates and may differ from what happens on the blockchain.</p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="indexes">Index tokens you create</H2>
        <p>
          When you create an index token, you choose its parts, name, symbol, image, description and links, and they are published publicly and
          permanently. You are responsible for that content: you must have the right to use it, and it must not be misleading, infringe anyone&rsquo;s
          rights, impersonate anyone, or break the law. Index tokens are created by their creators, not by Greatwall. We don&rsquo;t endorse
          or check them, and we may hide any from the Platform&rsquo;s lists.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="fees">Fees</H2>
        <p>
          You pay the networks&rsquo; transaction fees. Some actions also have protocol fees, such as the fast-path fee when locking, conversion
          fees paid to operators, or fees set by an index&rsquo;s creator. Fees are shown before you sign, and are paid on the blockchain. Fees
          paid are not refundable, except where the protocol itself returns them.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="risks">Risks</H2>
        <p>Using the Platform involves risks, including:</p>
        <List
          items={[
            <>
              <strong>Software in development.</strong> The protocol and the Platform are under active development and may contain errors or
              vulnerabilities that cause loss of assets, or make them unavailable.
            </>,
            <>
              <strong>Centralized parts.</strong> Today, each network&rsquo;s contracts have a single operator key that approves conversions,
              relays Bitcoin headers and manages liquidity, and the operator&rsquo;s Bitcoin payments come from a single wallet. A failure or
              misuse of that key or wallet can affect your transactions. Some protocol settings can also be changed by the operator.
            </>,
            <>
              <strong>Blockchains.</strong> Networks can be congested, halt, fork, change their rules, or charge high fees, delaying or
              preventing transactions.
            </>,
            <>
              <strong>Cross-network actions.</strong> Locking, unlocking and converting depend on several networks and on the protocol&rsquo;s
              records staying in step. Delays on one network can hold up an action on another.
            </>,
            <>
              <strong>Prices.</strong> Asset prices can change quickly. Values shown come from third-party sources and may be wrong or late.
            </>,
            <>
              <strong>Law and regulation.</strong> Laws on digital assets are changing and may limit or end your ability to use the Platform.
            </>,
          ]}
        />
        <p>You use the Platform at your own risk, and only with assets you can afford to lose.</p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="prohibited">What you may not do</H2>
        <List
          items={[
            "Break any law, or use the Platform for money laundering, terrorist financing, sanctions evasion, fraud or other illegal activity.",
            "Interfere with the Platform, its servers or the protocol: attacks, overloading, exploiting bugs, or getting around rate limits.",
            "Abuse the faucets, for example by claiming from many addresses to collect test tokens in bulk.",
            "Create or promote index tokens that are misleading, impersonate a person, project or brand, or infringe anyone's rights.",
            "Copy, scrape or resell the Platform, or use it to build a confusingly similar service.",
            "Use automated means to access the Platform in a way that burdens it, except through the public blockchains themselves.",
          ]}
        />
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="ip">Intellectual property</H2>
        <p>
          The Platform&rsquo;s design, text, graphics, logos and the Greatwall name belong to Greatwall or its licensors. You may use the Platform
          for its intended purpose, but you may not copy or reuse these without our permission. Names and logos of other networks, wallets, assets
          and companies belong to their owners, and their use does not mean they endorse Greatwall. The smart contracts run on public blockchains,
          and the code there may be under its own licenses.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="third-party">Other services</H2>
        <p>
          The Platform relies on, and links to, services run by others: blockchains, wallets, node providers, price sources, block explorers and
          other websites. We don&rsquo;t control them and aren&rsquo;t responsible for their availability, content or actions. Your use of them is
          under their own terms.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="disclaimers">Disclaimers</H2>
        <p>
          The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, express or implied,
          including that it will be accurate, secure, uninterrupted or free of errors, or fit for any purpose. Nothing on the Platform is
          financial, investment, legal or tax advice, or an offer or recommendation to buy, sell or hold any asset. Consult your own advisers.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="liability">Limitation of liability</H2>
        <p>
          To the fullest extent the law allows, Greatwall and its team will not be liable for any indirect, incidental, special or consequential
          loss, or for any loss of assets, profits, data or opportunity, arising from your use of, or inability to use, the Platform or the
          protocol, including from errors, delays, failures of blockchains or third-party services, or the actions of operators or other users.
          Where liability can&rsquo;t be excluded, it is limited to the extent the law permits.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="indemnity">Indemnity</H2>
        <p>
          You agree to compensate Greatwall and its team for any claims, losses and costs (including reasonable legal fees) arising from your
          breach of these Terms, your misuse of the Platform, the content you publish, or your breach of any law or anyone&rsquo;s rights.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="changes">Changes and suspension</H2>
        <p>
          We may change, suspend or stop the Platform, or any part of it, at any time, and may restrict access where we reasonably believe it is
          needed to protect the Platform, its users, or to follow the law. Because Greatwall is an interface, this doesn&rsquo;t stop you from
          interacting with the protocol on the blockchains directly. We may update these Terms. The date at the top shows the latest version, and
          continuing to use the Platform after a change means you accept it.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="general">General</H2>
        <p>
          If any part of these Terms is found unenforceable, the rest stays in effect. Not enforcing a part of these Terms is not a waiver of it.
          These Terms, with the Privacy Policy and Cookies Policy, are the whole agreement between you and us about the Platform. If you have a
          complaint, please write to us first, and we will try to resolve it informally.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="contact">Contact us</H2>
        <p>For questions about these Terms:</p>
        <Contact />
      </section>
    </LegalShell>
  );
}
