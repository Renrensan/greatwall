import SolanaBeta from "@/components/integrator/dapphub/solana/solana-beta/SolanaBeta";
import SolanaStaking from "@/components/integrator/dapphub/solana/solana-staking/SolanaStake";
import SolanaStockUS from "@/components/integrator/dapphub/solana/solana-stocks/SolanaStocks";
import SolanaSwap from "@/components/integrator/dapphub/solana/solana-swap/SolanaSwap";

const SolanaTrending = () => {
  return (
    <div>
      {/* <SolanaBeta/> */}
      <div className="flex flex-col gap-10">
        <SolanaStaking />
        <SolanaSwap />
        <SolanaStockUS />
      </div>
    </div>
  );
};

export default SolanaTrending;
