'use client';

import { useParams } from 'next/navigation';
import {  SupportedChain, useNetwork } from '@/app/network-provider';
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
import Image from 'next/image';
import { hyperliquid } from '..';



const HeadlineVault = () => {
  
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
  

  const localizedDescription = locale == "id" ? (networkDescription as any).id : (networkDescription as any).en;


  return (
   <section className="relative z-10 mx-auto lg:max-w-2xl px-4 md:px-0">
      <div className="flex justify-between gap-6 items-center">
        <div className="flex flex-col gap-4 flex-1">
          <p
            className={`text-4xl md:text-5xl leading-tight font-bold`}
          >
            {networkName}
          </p>

          
          <p className="text-sm sm:text-base leading-relaxed">
            {localizedDescription}
          </p>

        
        </div>
     <div className="w-50 h-50 hidden md:flex items-center justify-center glass-card shadow rounded-full border-black/10 backdrop-blur-md">
      {network === "hyperliquid" ? (
        <Image src={hyperliquid} alt="Hyperliquid" className="w-37.5 h-37.5 object-contain" />
      ) : (
        <Icon
          icon={`token:${network}`}
          className={`bg-transparent w-50 h-full md:w-37.5 ${colorFlip}`}
        />
      )}
     </div>
       
      </div>

    
      <div className="h-5" />
 
    </section>
  );
};

export default HeadlineVault;
