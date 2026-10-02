"use client";

import { createAppKit } from '@reown/appkit/react';
import { mainnet, bitcoin, solana, solanaDevnet, sepolia } from '@reown/appkit/networks';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin';
import { PROJECT_ID } from './config/constants';
import { ReactNode } from 'react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { HederaAdapter, HederaChainDefinition, hederaNamespace } from '@hashgraph/hedera-wallet-connect';

const metadata = {
  name: "Paradapp",
  description: "Paradapp is built on a parallel architecture that connects real-word to blockchain, blockchain to blockchain, Artificial Intelligent, and dApps into one unified experience.",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://paradapp.com",
  icons: ["https://paradapp.com/logo.png"],
};


// Native Hedera adapter (`hedera` namespace) — the `eip155` variant is deliberately not
// wired here: the package's own types mark it deprecated in favor of `WagmiAdapter`, and
// Hedera's EVM side already connects directly via MetaMask (evm-wallet-detection.ts),
// untouched by this. See hedera-provider.tsx for the migration this replaces (a standalone
// DAppConnector spinning up its own WalletConnect Core client under this same PROJECT_ID,
// which raced with this shared appKit client and caused WalletConnect init errors).
const hederaAdapter = new HederaAdapter({
  projectId: PROJECT_ID,
  networks: [HederaChainDefinition.Native.Mainnet, HederaChainDefinition.Native.Testnet],
  namespace: hederaNamespace,
});

export const appKit = createAppKit({
  adapters: [new EthersAdapter(), new BitcoinAdapter(), new SolanaAdapter(), hederaAdapter],
  networks: [
    mainnet,
    sepolia,
    bitcoin,
    solana,
    solanaDevnet,
    HederaChainDefinition.Native.Mainnet,
    HederaChainDefinition.Native.Testnet,
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
