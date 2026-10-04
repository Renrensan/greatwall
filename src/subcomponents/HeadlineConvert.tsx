'use client';

import { useParams } from 'next/navigation';
import { SupportedChain } from '@/app/network-provider';
import { useBitcoinWallet } from '@/components/bitcoin/bitcoin-provider';
import { useHederaWallet } from '@/components/hedera/hedera-provider';
import { useEthereumWallet } from '@/components/ethereum/ethereum-provider';
import { useSolanaWallet } from '@/components/solana/solana-provider';
import { useTempoWallet } from '@/components/tempo/tempo-provider';
import { useHyperliquidWallet } from '@/components/hyperliquid/hyperliquid-provider';
import { useRobinhoodWallet } from '@/components/robinhood/robinhood-provider';
import { useBaseWallet } from '@/components/base/base-provider';
import { useArbitrumWallet } from '@/components/arbitrum/arbitrum-provider';
import Image from 'next/image';
import { bitcoin } from '..';

const HeadlineConvert = () => {
  const { locale, network } = useParams<{
    locale: string;
    network: SupportedChain;
  }>();


  const bitcoinNetwork = useBitcoinWallet();
  const hederaNetwork = useHederaWallet();
  const ethereumNetwork = useEthereumWallet();
  const solanaNetwork = useSolanaWallet();
  const tempoNetwork = useTempoWallet();
  const hyperliquidNetwork = useHyperliquidWallet();
  const robinhoodNetwork = useRobinhoodWallet();
  const baseNetwork = useBaseWallet();
  const arbitrumNetwork = useArbitrumWallet();

  let networkName: string | undefined;
  let networkDescription: any;

  if (network === 'bitcoin') {
    networkName = bitcoinNetwork.networkName;
    networkDescription = bitcoinNetwork.networkDescription;
  } else if (network === 'hedera') {
    networkName = hederaNetwork.networkName;
    networkDescription = hederaNetwork.networkDescription;
  } else if (network === 'ethereum') {
    networkName = ethereumNetwork.networkName;
    networkDescription = ethereumNetwork.networkDescription;
  } else if (network === 'tempo') {
    networkName = tempoNetwork.networkName;
    networkDescription = tempoNetwork.networkDescription;
  } else if (network === 'hyperliquid') {
    networkName = hyperliquidNetwork.networkName;
    networkDescription = hyperliquidNetwork.networkDescription;
  } else if (network === 'robinhood') {
    networkName = robinhoodNetwork.networkName;
    networkDescription = robinhoodNetwork.networkDescription;
  } else if (network === 'base') {
    networkName = baseNetwork.networkName;
    networkDescription = baseNetwork.networkDescription;
  } else if (network === 'arbitrum') {
    networkName = arbitrumNetwork.networkName;
    networkDescription = arbitrumNetwork.networkDescription;
  } else {
    networkName = solanaNetwork.networkName;
    networkDescription = solanaNetwork.networkDescription;
  }

  return (
  <section className="relative z-10 mx-auto lg:max-w-2xl px-4 md:px-0">
  <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-6 flex-1">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-3xl sm:text-4xl md:text-5xl leading-tight font-bold">
          iPoW Convert
        </p>

        <div className="shrink-0 w-fit glass-card bg-white/90 shadow-buttonNav rounded-full px-3 py-2 flex items-center gap-2 border border-white/5">
          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
            <Image
              src={bitcoin}
              alt="Bitcoin"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col leading-tight pr-1">
            <span className="text-[9px] uppercase tracking-wide">
              Interoperable Proof of Work
            </span>
            <span className="text-xs font-bold text-black whitespace-nowrap">
              {"Powered by Bitcoin"}
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm sm:text-base leading-relaxed">
        {locale == "en" ? "iPoW convert is a feature made possible by Paradapp’s Interoperable Proof of Work technology. By anchoring conversions to Bitcoin’s proof-of-work security, it enables assets to move safely between different networks without relying on trusted party, or weakest chain, creating a more secure and trustless way to perform cross-chain conversions."
         : "Konversi iPoW adalah fitur yang dimungkinkan oleh teknologi Interoperable Proof of Work dari Paradapp. Dengan mengandalkan konversi pada keamanan proof-of-work Bitcoin, fitur ini memungkinkan aset untuk berpindah dengan aman antara berbagai jaringan tanpa bergantung pada pihak tengah ataupun jaringan perantara terlemah (weakest chain), menciptakan cara yang lebih aman dan terdesentralisasi (trustless) untuk melakukan konversi antar jaringan."} 
      </p>
    </div>
  </div>

  <div className="h-5" />
</section>
  );
};

export default HeadlineConvert;
