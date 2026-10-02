"use client";

import SolanaBetaApp from "@/components/integrator/dapphub/solana/solana-beta/App";
import SolanaStakeApp from "@/components/integrator/dapphub/solana/solana-staking/App";
import SolanaStocksApp from "@/components/integrator/dapphub/solana/solana-stocks/App";
import SolanaSwap from "@/components/integrator/dapphub/solana/solana-swap/SolanaSwap";
import HederaStakeApp from "@/components/integrator/dapphub/hedera/hedera-staking/App";
import { useParams, useRouter } from "next/navigation";



export default function DappHolder({ slug }: { slug: string }) {
  const router = useRouter();
  const { locale, network } = useParams();


  const renderDappUI = () => {
    switch (slug) {
      case "solana-swap":
        return <SolanaSwap />; // Layer 2
      case "solana-stake":
        return <SolanaStakeApp />; // Layer 2
      case "solana-tokenized-stocks":
        return <SolanaStocksApp />; // Layer 2
        case "beta-global-index":
        return <SolanaBetaApp />; // Layer 1
      case "hedera-stake":
        return <HederaStakeApp />; // Layer 2
      default:
        return (
          <div className="text-center py-20 glass-card rounded-2xl">
            <h2 className="text-xl font-bold">dApp Not Found</h2>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="w-full">
        {renderDappUI()}
      </div>
     
    </div>
  );
}