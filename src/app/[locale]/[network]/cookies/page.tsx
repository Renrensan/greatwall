// Greatwall's Cookies Policy: the cookies and browser storage the app
// actually sets. Keep the tables true to the code: a new cookie or
// storage key (network-provider.tsx, the wallet providers, tunnel.ts,
// basketList.ts, convertMethods.ts) belongs in them, with the date updated.

import type { Metadata } from "next";

import { Contact, H2, H3, LegalShell, List, Summary, Table } from "@/components/ui/legal";

export const metadata: Metadata = {
  title: "Cookies Policy · Greatwall",
  description: "The cookies and browser storage greatwall.finance uses, and how to control them.",
};

const SECTIONS = [
  { id: "summary", title: "Summary" },
  { id: "what", title: "What cookies are" },
  { id: "ours", title: "What Greatwall stores" },
  { id: "analytics", title: "Analytics" },
  { id: "third-party", title: "Wallets and other services" },
  { id: "advertising", title: "Advertising" },
  { id: "control", title: "Your choices" },
  { id: "dnt", title: "Do Not Track" },
  { id: "changes", title: "Changes" },
  { id: "contact", title: "Contact us" },
];

export default async function CookiesPolicy({ params }: { params: Promise<{ locale: string; network: string }> }) {
  const { locale, network } = await params;
  return (
    <LegalShell
      title="Cookies Policy"
      base={`/${locale}/${network}`}
      current="cookies"
      toc={SECTIONS}
      intro={
        <p>
          This policy explains the cookies and similar browser storage that Greatwall (&ldquo;we&rdquo;, &ldquo;us&rdquo;) uses on
          greatwall.finance (the &ldquo;Platform&rdquo;), what each one is for, and how you can control them. It sits alongside our Privacy
          Policy.
        </p>
      }
    >
      <Summary
        items={[
          "Greatwall sets one cookie of its own: the network you last chose.",
          "Most of what the app remembers (your wallet connection, settings and conversions in progress) stays in your browser's local storage and is never sent to us.",
          "We may use Google Analytics, which sets its own cookies to measure how the Platform is used.",
          "We use no advertising cookies.",
          "Greatwall never stores private keys, seed phrases or passwords in cookies or browser storage.",
        ]}
      />

      <section className="flex flex-col gap-4">
        <H2 id="what">What cookies are</H2>
        <p>
          Cookies are small text files a website saves in your browser, so it can recognise your browser and remember things between visits.
          Websites also use similar technologies, such as local storage, which keeps information in your browser without sending it to the
          website with every request. In this policy, &ldquo;cookies&rdquo; covers both, unless we say otherwise.
        </p>
        <p>
          A <strong>session</strong> cookie is deleted when you close your browser. A <strong>persistent</strong> cookie stays for a set time,
          or until you delete it. Local storage stays until it is cleared.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="ours">What Greatwall stores</H2>
        <p>Everything below is needed for the Platform to work as you expect, or to remember a choice you made. None of it is used for advertising.</p>

        <H3>Cookies</H3>
        <Table
          head={["Name", "Purpose", "Type", "Kept for"]}
          rows={[
            [<code key="n">preferred-default-chain</code>, "Remembers the network you last chose, so the app opens on it.", "Functional", "1 year"],
            [<code key="n">NEXT_LOCALE</code>, "May be set by the site's framework to remember the language. Greatwall is in English only.", "Functional", "Session"],
          ]}
        />

        <H3>Local storage</H3>
        <Table
          head={["What", "Purpose", "Kept for"]}
          rows={[
            ["Wallet connection state (for each network: the wallet you used, whether it is connected, and its public address)", "Reconnects your wallet when you come back, without asking you again.", "Until you disconnect or clear it"],
            ["Selected network and Solana network setting", "Keeps the app on the network you chose.", "Until cleared"],
            ["Conversions you started", "Lets you follow and finish a conversion after leaving the page.", "Until cleared (the latest 200)"],
            ["Indexes your browser has seen", "Lists them where the network can't be searched yet.", "Until cleared"],
          ]}
        />
        <p>
          This information stays in your browser. The app reads it to work, but does not send it to us, except where you take an action that
          needs it (for example, asking for your balances on a network).
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="analytics">Analytics</H2>
        <p>
          We may use Google Analytics to understand, in aggregate, how the Platform is used: which pages are visited, how long people stay, how
          they move between pages, their device and browser type, and their general region (not precise location). When it is active, Google
          Analytics sets its own cookies:
        </p>
        <Table
          head={["Name", "Set by", "Purpose", "Kept for"]}
          rows={[
            [<code key="n">_ga</code>, "Google", "Tells visits from different browsers apart.", "Up to 2 years"],
            [<code key="n">_ga_&lt;ID&gt;</code>, "Google", "Keeps the state of a visit.", "Up to 2 years"],
          ]}
        />
        <p>
          We use this information only for statistics and to improve the Platform. Google handles it under its own privacy policy. You can opt
          out with Google&rsquo;s Analytics opt-out browser add-on, or by blocking these cookies in your browser.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="third-party">Wallets and other services</H2>
        <p>
          When you connect a wallet, the wallet itself and any connection service you choose (such as MetaMask, Phantom or WalletConnect) may
          store their own data in your browser, under their own policies. External sites you open from the Platform, such as block explorers
          and token pages, set their own cookies. We don&rsquo;t control these, and recommend reading their policies.
        </p>
        <p>Greatwall never stores private keys, seed phrases or wallet passwords in cookies or browser storage.</p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="advertising">Advertising</H2>
        <p>
          Greatwall does not use advertising or marketing cookies. If we ever add them, we will update this policy first, and ask for your
          consent where the law requires it.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="control">Your choices</H2>
        <p>You can control cookies and local storage in your browser&rsquo;s settings. Most browsers let you:</p>
        <List
          items={[
            "See the cookies and site data stored for a site, and delete them.",
            "Block all cookies, or only those from other sites (third-party cookies).",
            "Clear everything when you close the browser.",
          ]}
        />
        <p>
          If you clear Greatwall&rsquo;s storage, the app forgets your network choice and wallet connection, and you will need to reconnect.
          Conversions in progress are not affected on the blockchain, but you may need to find them again in History. Blocking analytics cookies
          does not affect how the Platform works.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="dnt">Do Not Track</H2>
        <p>
          Some browsers can send a &ldquo;Do Not Track&rdquo; signal. There is no common standard for how websites should respond to it, so the
          Platform does not currently respond to it differently.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="changes">Changes</H2>
        <p>
          We may update this policy when the Platform, the law, or the services we use change. The date at the top shows the latest version.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="contact">Contact us</H2>
        <p>For questions about this policy or how Greatwall uses cookies:</p>
        <Contact />
      </section>
    </LegalShell>
  );
}
