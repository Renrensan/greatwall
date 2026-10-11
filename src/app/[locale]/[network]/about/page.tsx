// About Greatwall: what it is and how it works, in plain language.

import type { Metadata } from "next";
import Hero from "@/components/Hero";
import QuoteSection from "@/components/QuoteSection";
import DiversificationSection from "@/components/DiversificationSection";
import NetworksSection from "@/components/NetworksSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import ClosingCtaSection from "@/components/ClosingCtaSection";
import AboutFooter from "@/components/AboutFooter";

export const metadata: Metadata = {
  title: "About · Greatwall",
  description:
    "Greatwall lets people publish immutable, public indexes backed by tokenized assets, and join them by minting or buying.",
};

const POINTS = [
  {
    title: "Immutable and public",
    body: "An index is a fixed allocation of ingredients. Once published it cannot be changed, and anyone can read it.",
  },
  {
    title: "One index, one token",
    body: "Every index has a single index token. Joining an index never creates a second token for the same plan.",
  },
  {
    title: "Mint or buy",
    body: "Mint through the protocol on a network the creator allowed, or buy the index token directly once supply exists.",
  },
  {
    title: "No one-click copies",
    body: "You can join a creator's exact index, but you cannot fork it into your own token. To make your own, build a new index.",
  },
];

export default function About() {
  return (
    <>
      <Hero />
      <QuoteSection />
      {/* Opaque and above the pinned quote section, so it slides up and closes over it. */}
      <div className="relative z-10 -mx-4 bg-cream px-4">
        <DiversificationSection />
        <NetworksSection />
        <HowItWorksSection />
        <ClosingCtaSection />
      </div>
      <AboutFooter />
    </>
  );
}
