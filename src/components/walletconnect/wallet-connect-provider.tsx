"use client";

import { createAppKit } from '@reown/appkit/react';
import { mainnet, bitcoin, solana, solanaDevnet, sepolia } from '@reown/appkit/networks';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin';
import { PROJECT_ID } from './config/constants';
import { ReactNode } from 'react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';

const metadata = {
  name: "Paradapp",
  description: "Paradapp is built on a parallel architecture that connects real-word to blockchain, blockchain to blockchain, Artificial Intelligent, and dApps into one unified experience.",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://paradapp.com",
  icons: ["https://paradapp.com/logo.png"],
};


export const appKit = createAppKit({
  adapters: [new EthersAdapter(), new BitcoinAdapter(), new SolanaAdapter()],
  networks: [
    mainnet,
    sepolia,
    bitcoin,
    solana,
    solanaDevnet,
  ],
  defaultNetwork: sepolia,
  projectId: PROJECT_ID,
  metadata,
  features: {analytics: true,
    email: false,
    pay: false,
    receive: false,
    socials: false,
    allWallets: true,
    swaps: false,
    onramp: false,
    history: false,
    send: false
}});

export function WalletConnectProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
