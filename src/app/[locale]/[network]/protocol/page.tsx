// The protocol explorer: what runs under Greatwall, read from the chains.

import type { Metadata } from "next";

import ProtocolExplorer from "@/subcomponents/ProtocolExplorer";

export const metadata: Metadata = {
  title: "Protocol · Greatwall",
  description: "The iPoW protocol under Greatwall, live: Bitcoin blocks each network verified, operators and jobs, vaults and claims.",
};

export default function ProtocolPage() {
  return (
    <div className="w-full max-w-6xl mx-auto py-7.5 pb-32 md:pb-16">
      <ProtocolExplorer />
    </div>
  );
}
