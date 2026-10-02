import { SupportedChain } from "@/app/network-provider";
import { useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import { useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { useHederaWallet } from "@/components/hedera/hedera-provider";
import { useSolanaWallet } from "@/components/solana/solana-provider";
import { usePolkadotWallet } from "@/components/polkadot/polkadot-provider";
import { useTronWallet } from "@/components/tron/tron-provider";
import { useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { useBaseWallet } from "@/components/base/base-provider";
import { useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";

const DappHubComingSoon = () => {
  const t = useTranslations("All");


  const { locale, network } = useParams<{
    locale: string;
    network: SupportedChain;
  }>();

  const bitcoinNetwork = useBitcoinWallet();
  const hederaNetwork = useHederaWallet();
  const ethereumNetwork = useEthereumWallet();
  const solanaNetwork = useSolanaWallet();
  const polkadotNetwork = usePolkadotWallet();
  const tronNetwork = useTronWallet();
  const hyperliquidNetwork = useHyperliquidWallet();
  const robinhoodNetwork = useRobinhoodWallet();
  const baseNetwork = useBaseWallet();
  const arbitrumNetwork = useArbitrumWallet();

  let networkName;
  if (network === "bitcoin") networkName = bitcoinNetwork.networkName;
  else if (network === "hedera") networkName = hederaNetwork.networkName;
  else if (network === "ethereum") networkName = ethereumNetwork.networkName;
  else if (network === "polkadot") networkName = polkadotNetwork.networkName;
  else if (network === "tron") networkName = tronNetwork.networkName;
  else if (network === "hyperliquid") networkName = hyperliquidNetwork.networkName;
  else if (network === "robinhood") networkName = robinhoodNetwork.networkName;
  else if (network === "base") networkName = baseNetwork.networkName;
  else if (network === "arbitrum") networkName = arbitrumNetwork.networkName;
  else networkName = solanaNetwork.networkName;


  return (
   <div className="flex flex-col gap-3 py-4 mb-4 pb-40 lg:pb-32">
          <div className="bgBox glass-card">
            <div className="flex flex-col justify-center gap-5 pb-5 text-center px-4 pt-6">
              <div className="p-5 glass-card shadow-buttonNav! flex justify-center items-center mx-auto w-28 h-28 rounded-full">
                <Icon
                      icon={`iconoir:apple-shortcuts`}
                  className={`text-6xl ${(network == "hedera" || network == "polkadot") ? `` : (network === "base" ? "text-[#0052FF]" : `text-${network}`)} text-end`}
                />
              </div>
              <h2 className="text-xl font-bold text-center">{locale == "en" ? networkName + " dApp Hub" : "dApp Hub " + networkName}  {t("text296")}</h2>
            </div>
          </div>
        </div>
  );
};

export default DappHubComingSoon;
