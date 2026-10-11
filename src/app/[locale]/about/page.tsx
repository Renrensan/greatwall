// About Greatwall: what it is and how it works, in plain language.

import type { Metadata } from "next";
import Intro from "@/components/Intro";
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
    "Greatwall lets anyone create an index token backed by tokenized stocks, Treasuries and gold from several networks, and mint or redeem it for its parts.",
};

export default function About() {
  return (
    <>
      <Intro />
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
