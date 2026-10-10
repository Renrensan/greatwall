// About Greatwall: what it is and how it works, in plain language.

import type { Metadata } from "next";
import Hero from "@/components/Hero";
import QuoteSection from "@/components/QuoteSection";
import DiversificationSection from "@/components/DiversificationSection";
import NetworksSection from "@/components/NetworksSection";

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
        <div className="w-full max-w-3xl mx-auto px-5 py-7.5 pb-32 md:pb-16">
          <h1 className="text-5xl md:text-6xl leading-tight">
            About Greatwall
          </h1>
          <p className="mt-5 text-lg text-[#6B6B6B]">
            Greatwall lets people publish transparent indexes, plans whose value
            is backed by ingredients such as tokenized stocks, and lets others
            join them.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {POINTS.map((p) => (
              <li
                key={p.title}
                className="rounded-2xl border border-[#2F2C25]/10 bg-[#FBF9F1] p-5"
              >
                <h2 className="text-2xl">{p.title}</h2>
                <p className="mt-2 text-[#6B6B6B]">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
