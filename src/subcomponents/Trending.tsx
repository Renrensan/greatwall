"use client";

import { SupportedChain, useNetwork } from '@/app/network-provider';
import { useParams } from 'next/navigation'; 
import DappHubComingSoon from './DappHubComingSoon';
import DappLabComingSoon from './DappLabComingSoon';
import SolanaTrending from './SolanaTrending';
import HederaTrending from './HederaTrending';

const Trending = () => {
  const { network } = useParams<{
    locale: string;
    network: SupportedChain;
  }>();

  const {
    bitcoinMainnet,
    hederaMainnet,
    ethereumMainnet,
    solanaMainnet,
    polkadotMainnet,
    tronMainnet,
    hyperliquidMainnet,
    robinhoodMainnet,
    baseMainnet,
    arbitrumMainnet,
  } = useNetwork();


  const isMainnet = (() => {
    switch (network) {
      case "bitcoin": return bitcoinMainnet;
      case "hedera": return hederaMainnet;
      case "ethereum": return ethereumMainnet;
      case "solana": return solanaMainnet;
      case "polkadot": return polkadotMainnet;
      case "tron": return tronMainnet;
      case "hyperliquid": return hyperliquidMainnet;
      case "robinhood": return robinhoodMainnet;
      case "base": return baseMainnet;
      case "arbitrum": return arbitrumMainnet;
      default: return false;
    }
  })();


  const renderContent = () => {
    if (!isMainnet) {
      return <DappLabComingSoon />;
    }

    if (network === 'hedera') {
      return <HederaTrending />;
    }

    if (network === 'solana') {
      return <SolanaTrending />;
    }

    return <DappHubComingSoon />;
  };

  return (
    <>
      {renderContent()}
    </>
  );
};

export default Trending;