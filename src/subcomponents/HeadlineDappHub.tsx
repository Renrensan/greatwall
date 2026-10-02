'use client';

import { useParams } from 'next/navigation';
import {  SupportedChain } from '@/app/network-provider';
import { Icon } from '@iconify/react';
import { useBitcoinWallet } from '@/components/bitcoin/bitcoin-provider';
import { useHederaWallet } from '@/components/hedera/hedera-provider';
import { useEthereumWallet } from '@/components/ethereum/ethereum-provider';
import { useSolanaWallet } from '@/components/solana/solana-provider';
import { usePolkadotWallet } from '@/components/polkadot/polkadot-provider';
import { useTronWallet } from '@/components/tron/tron-provider';
import { useHyperliquidWallet } from '@/components/hyperliquid/hyperliquid-provider';
import { useRobinhoodWallet } from '@/components/robinhood/robinhood-provider';
import { useBaseWallet } from '@/components/base/base-provider';
import { useArbitrumWallet } from '@/components/arbitrum/arbitrum-provider';



const HeadlineDappHub = () => {
  
  const { locale, network} = useParams<{
      locale: string;
      network: SupportedChain
    }>();
  
const colorFlip = (network === 'hedera' || network === 'polkadot') ? 'text-black dark:text-white' : (network === "base" ? "text-[#0052FF]" : `text-${network}`);



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

    let  networkName, networkDescription;

    if (network === "bitcoin") {
      networkName = bitcoinNetwork.networkName;
      networkDescription = bitcoinNetwork.networkDescription;

    } else if (network === "hedera") {
       networkName = hederaNetwork.networkName;
         networkDescription = hederaNetwork.networkDescription;

    } else if (network === "ethereum") {
       networkName = ethereumNetwork.networkName;
         networkDescription = ethereumNetwork.networkDescription;

    } else if (network === "polkadot") {
       networkName = polkadotNetwork.networkName;
         networkDescription = polkadotNetwork.networkDescription;

    } else if (network === "tron") {
       networkName = tronNetwork.networkName;
         networkDescription = tronNetwork.networkDescription;

    } else if (network === "hyperliquid") {
       networkName = hyperliquidNetwork.networkName;
         networkDescription = hyperliquidNetwork.networkDescription;

    } else if (network === "robinhood") {
       networkName = robinhoodNetwork.networkName;
         networkDescription = robinhoodNetwork.networkDescription;

    } else if (network === "base") {
       networkName = baseNetwork.networkName;
         networkDescription = baseNetwork.networkDescription;

    } else if (network === "arbitrum") {
       networkName = arbitrumNetwork.networkName;
         networkDescription = arbitrumNetwork.networkDescription;

    } else {
       networkName = solanaNetwork.networkName;
         networkDescription = solanaNetwork.networkDescription;
    }
  


  return (
  <section className="relative z-10 mx-auto lg:max-w-2xl px-4 md:px-0">
      <div className="flex justify-between gap-6 items-center">
        <div className="flex flex-col gap-4 flex-1">
          <p
            className={`text-4xl md:text-5xl leading-tight font-bold`}
          >
           dApp Hub
          </p>

          
          <p className="text-sm sm:text-base leading-relaxed">
         {locale == "en" ? " dApps are decentralized applications built on decentralize system. Paradapp connects users directly to these dApps across different networks, making them easier to access and use from a single platform." : "dApps adalah aplikasi terdesentralisasi yang dibangun di atas sistem terdesentralisasi. Paradapp menghubungkan pengguna secara langsung ke dApps ini di berbagai jaringan yang berbeda, membuatnya lebih mudah untuk diakses dan digunakan dari satu platform."} 
          </p>

        
        </div>
     <div className="w-50 h-50 hidden md:flex items-center justify-center glass-card shadow rounded-full border-black/10 backdrop-blur-md">
      <Icon 
            icon={`iconoir:apple-shortcuts`}
            className={`bg-transparent w-50 h-full md:w-37.5 ${colorFlip}`}
          />
     </div>
       
      </div>

    
      <div className="h-5" />
 
    </section>
  );
};

export default HeadlineDappHub;
