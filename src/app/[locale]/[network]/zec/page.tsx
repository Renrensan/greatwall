// The ZEC page: buy any index on Solana with shielded ZEC, and the sell demo.

import type { Metadata } from "next";

import ZecApp from "@/subcomponents/ZecApp";

export const metadata: Metadata = {
  title: "Pay with ZEC · Greatwall",
  description: "Buy an index privately: pay shielded ZEC from your phone, receive it on Solana.",
};

export default function ZecPage() {
  return (
    <div className="2xl:container 2xl:mx-auto flex flex-col w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 w-full max-w-full lg:max-w-6xl mx-auto pb-32 md:pb-16">
        <div className="flex flex-col gap-8 py-7.5">
          <ZecApp />
        </div>
      </div>
    </div>
  );
}
