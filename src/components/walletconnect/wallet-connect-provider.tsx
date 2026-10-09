"use client";

import { createAppKit } from '@reown/appkit/react';
import { bitcoin, solanaDevnet, sepolia } from '@reown/appkit/networks';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin';
import { PROJECT_ID } from './config/constants';
import { ReactNode } from 'react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';

const metadata = {
  name: "Greatwall",
  description:
    "Greatwall: convert, move and basket coins across networks, settled on Bitcoin through the iPoW protocol.",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://greatwall.finance",
  // The app icon (src/app/icon.png), which Next serves at /icon.png.
  icons: ["https://greatwall.finance/icon.png"],
};


export const appKit = createAppKit({
  adapters: [new EthersAdapter(), new BitcoinAdapter(), new SolanaAdapter()],
  // The test networks Greatwall runs on, and real Bitcoin (iPoW reads real Bitcoin).
  networks: [
    sepolia,
    bitcoin,
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
