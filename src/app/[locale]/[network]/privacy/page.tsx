// Greatwall's Privacy Policy: what the app and its server actually handle.
// Greatwall is a non-custodial interface: no accounts, no identity or bank
// data. Keep this page true to the code: when a feature starts handling
// new data (a new server route, a new third party, new browser storage),
// update the section that covers it and the date below.

import type { Metadata } from "next";

import { Contact, H2, H3, LEGAL_EMAIL as EMAIL, LegalShell, List, Summary } from "@/components/ui/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · Greatwall",
  description: "How Greatwall handles information when you use greatwall.finance.",
};

const SECTIONS = [
  { id: "summary", title: "Summary" },
  { id: "not-collected", title: "What we don't collect" },
  { id: "handled", title: "What we handle" },
  { id: "use", title: "How we use it" },
  { id: "sharing", title: "Who it is shared with" },
  { id: "retention", title: "How long it is kept" },
  { id: "security", title: "Security" },
  { id: "choices", title: "Your choices and rights" },
  { id: "other", title: "Other terms" },
  { id: "contact", title: "Contact us" },
];

export default async function PrivacyPolicy({ params }: { params: Promise<{ locale: string; network: string }> }) {
  const { locale, network } = await params;
  return (
    <LegalShell
      title="Privacy Policy"
      base={`/${locale}/${network}`}
      current="privacy"
      toc={SECTIONS}
      intro={
        <p>
          Greatwall (&ldquo;we&rdquo;, &ldquo;us&rdquo;) runs greatwall.finance, an app for locking, converting and combining assets across
          networks (the &ldquo;Platform&rdquo;). This policy explains what information the Platform handles, why, and the choices you have.
          How we use cookies and browser storage is set out in more detail in our Cookies Policy.
        </p>
      }
    >
          <Summary
            items={[
                "Greatwall has no accounts. We never ask for your name, ID, bank or card details.",
                "Greatwall is non-custodial: your wallet holds your keys and signs every transaction. We never hold your keys or your funds.",
                "Your wallet address and your transactions are public on the blockchains you use, and cannot be deleted by anyone, including us.",
                "Our server passes your app's requests to blockchain networks, so it sees your IP address and the addresses you look up.",
                "What you publish when you create an index (its name, symbol, description, image and links) is public and permanent.",
                "We don't sell your information.",
              ]}
          />

          <section className="flex flex-col gap-4">
            <H2 id="not-collected">What we don&rsquo;t collect</H2>
            <p>
              You use Greatwall by connecting a wallet you already have. There is no sign-up, so we do not collect your name, email address, phone
              number, government ID, photo, date of birth, bank account, or payment card. We never receive your private keys or seed phrase. If
              anyone claiming to be Greatwall asks for them, it is not us.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="handled">What we handle</H2>

            <H3>Wallet addresses and on-chain activity</H3>
            <p>
              When you connect a wallet, the app reads your public address and uses it to show your balances, locked tokens, index tokens and
              history, which it reads from public blockchains. Transactions you sign (locks, unlocks, conversions, index mints) are recorded on
              those blockchains. Blockchain records are public, are kept by the networks themselves, and cannot be changed or deleted by us.
            </p>

            <H3>Requests to our server</H3>
            <p>
              To read blockchains reliably, the app sends its network requests through our server, which forwards them to blockchain node
              providers. Our server and those providers see your IP address, the time, and the request itself, which can include the addresses
              you look up. We use this only to answer the request and to keep the service working, for example by limiting traffic when a
              network is busy.
            </p>

            <H3>Index tokens you create</H3>
            <p>
              When you create an index, the name, symbol, description, image and links you enter are published as the token&rsquo;s metadata,
              to IPFS through a pinning service or to our own storage, so that wallets and other apps can show them. This information is public
              and may not be removable once published. Please don&rsquo;t include personal information in it. To prevent abuse, we briefly keep
              your IP address in memory to limit how many images can be uploaded from one place each hour.
            </p>

            <H3>Test token faucet</H3>
            <p>
              When you claim test tokens, we receive your wallet address and the token you asked for, and remember them for six hours so the
              same address cannot claim the same token again in that time.
            </p>

            <H3>Usage analytics</H3>
            <p>
              We may use Google Analytics to understand how the Platform is used, such as which pages are visited and how people move between
              them. Google Analytics uses cookies and collects information such as your device and browser type, pages viewed, and an
              approximate location derived from your IP address. Google processes this information under its own privacy policy.
            </p>

            <H3>Information kept in your browser</H3>
            <p>Some settings are saved in your own browser, not on our server, so the app remembers them between visits:</p>
            <List
              items={[
                "A cookie with the network you last chose, kept for one year, so the app opens on it.",
                "Local storage with your selected network, your Solana network setting, the indexes your browser has seen, and records of conversions you started, so you can follow and finish them.",
              ]}
            />
            <p>You can clear these at any time in your browser&rsquo;s settings.</p>

            <H3>Prices</H3>
            <p>Our server fetches market prices from a price provider to show what assets are worth. Nothing about you is sent with these requests.</p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="use">How we use it</H2>
            <List
              items={[
                "To run the Platform: showing balances and history, preparing transactions for your wallet to sign, and publishing index metadata.",
                "To keep it working and safe: limiting abuse of the faucet, uploads and network requests, and fixing problems.",
                "To improve it: understanding, in aggregate, how the Platform is used.",
                "To meet legal obligations, where they apply.",
              ]}
            />
            <p>We do not use your information for advertising, and we do not sell it.</p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="sharing">Who it is shared with</H2>
            <List
              items={[
                <>
                  <strong>Blockchain networks.</strong> Transactions you sign are broadcast to, and recorded by, the public networks you use.
                </>,
                <>
                  <strong>Blockchain node providers</strong>, such as Alchemy and the networks&rsquo; own public endpoints, which answer the
                  requests our server forwards.
                </>,
                <>
                  <strong>Storage providers</strong>, such as a pinning service for IPFS, for index metadata you publish.
                </>,
                <>
                  <strong>Analytics</strong>: Google Analytics, as described above.
                </>,
                <>
                  <strong>Wallet providers</strong> you choose, such as MetaMask, Phantom or WalletConnect, which handle the connection between
                  your wallet and the Platform under their own privacy policies.
                </>,
                <>
                  <strong>Hosting providers</strong> that run our server.
                </>,
                <>
                  <strong>Authorities</strong>, when we are required to by law.
                </>,
              ]}
            />
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="retention">How long it is kept</H2>
            <p>
              Faucet claims are kept for six hours, and upload limits for one hour. Request details on our server are kept only as long as needed
              to answer and protect it. Index metadata you publish stays public. Records on blockchains are permanent and outside anyone&rsquo;s
              control. Information in your browser stays until you clear it.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="security">Security</H2>
            <p>
              We take reasonable measures to protect the information our server handles. No method of sending or storing data over the internet
              is completely secure, and you are responsible for keeping your wallet, its keys and its seed phrase safe.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="choices">Your choices and rights</H2>
            <List
              items={[
                "You can disconnect your wallet at any time, and use the Platform without connecting one to browse.",
                "You can block or delete cookies and local storage in your browser, and opt out of Google Analytics with Google's browser add-on.",
                `Depending on where you live, you may have the right to ask what information we hold about you, and to have it corrected or deleted. Write to us at ${EMAIL}. We can't change or delete records on blockchains or published IPFS content.`,
              ]}
            />
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="other">Other terms</H2>
            <H3>Children</H3>
            <p>The Platform is not intended for anyone under 18, and we do not knowingly handle children&rsquo;s information.</p>
            <H3>International transfers</H3>
            <p>Our server and service providers may process information in countries other than yours.</p>
            <H3>Other websites</H3>
            <p>The Platform links to other websites, such as block explorers and token pages. Their privacy practices are their own.</p>
            <H3>Changes to this policy</H3>
            <p>
              We may update this policy as the Platform changes. The date at the top shows the latest version. Continuing to use the Platform
              after a change means you accept the updated policy.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="contact">Contact us</H2>
            <p>For questions, requests or complaints about this policy or your information:</p>
            <Contact />
          </section>
    </LegalShell>
  );
}
