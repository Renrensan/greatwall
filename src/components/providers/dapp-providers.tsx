"use client";

import dynamic from "next/dynamic";
import { ReactNode, useMemo, ComponentType } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { NetworkProvider, SupportedChain } from "@/app/network-provider";
import { WalletConnectProvider } from "@/components/walletconnect/wallet-connect-provider";
import { OnboardingProvider } from "@/components/providers/onboarding-provider";
import { resolveToChain } from "@/components/integrator/ipow/convert-networks";

const PolkadotProvider = dynamic(() => import("@/components/polkadot/polkadot-provider").then(m => m.PolkadotProvider), { ssr: false });
const HederaProvider = dynamic(() => import("@/components/hedera/hedera-provider").then(m => m.HederaProvider), { ssr: false });
const EthereumProvider = dynamic(() => import("@/components/ethereum/ethereum-provider").then(m => m.EthereumProvider), { ssr: false });
const SolanaProvider = dynamic(() => import("@/components/solana/solana-provider").then(m => m.SolanaProvider), { ssr: false });
const BitcoinProvider = dynamic(() => import("@/components/bitcoin/bitcoin-provider").then(m => m.BitcoinProvider), { ssr: false });
const TempoProvider = dynamic(() => import("@/components/tempo/tempo-provider").then(m => m.TempoProvider), { ssr: false });
const HyperliquidProvider = dynamic(() => import("@/components/hyperliquid/hyperliquid-provider").then(m => m.HyperliquidProvider), { ssr: false });
const RobinhoodProvider = dynamic(() => import("@/components/robinhood/robinhood-provider").then(m => m.RobinhoodProvider), { ssr: false });
const BaseProvider = dynamic(() => import("@/components/base/base-provider").then(m => m.BaseProvider), { ssr: false });
const ArbitrumProvider = dynamic(() => import("@/components/arbitrum/arbitrum-provider").then(m => m.ArbitrumProvider), { ssr: false });

type ChainProvider = ComponentType<{ children: ReactNode }>;

/** network segment -> its wallet provider. Covers every value VALID_NETWORKS allows. */
const CHAIN_PROVIDERS: Record<SupportedChain, ChainProvider> = {
  bitcoin: BitcoinProvider,
  ethereum: EthereumProvider,
  solana: SolanaProvider,
  hedera: HederaProvider,
  polkadot: PolkadotProvider,
  tempo: TempoProvider,
  hyperliquid: HyperliquidProvider,
  robinhood: RobinhoodProvider,
  base: BaseProvider,
  arbitrum: ArbitrumProvider,
};

/**
 * Mounts only the wallet provider(s) the current route actually needs:
 *  - vault, bridge, beta (single-network routes): just `network`'s provider.
 *  - convert/history: every chain — a past conversion's partner can be any of
 *    them, and the list shows all of them at once.
 *  - convert (the form, a conversion's page): Bitcoin (always: every swap is
 *    against BTC) + fromChain (`network`) + toChain (resolved from `?to=`, or
 *    `?linked=` for the transaction page), deduplicated.
 *
 * NetworkProvider + WalletConnectProvider always mount: NetworkProvider is
 * cheap local UI state, and WalletConnectProvider's module owns the shared
 * `appKit` singleton every per-chain provider reads from.
 */
export function ScopedDappProviders({ children }: { children: ReactNode }) {
  const { network, app, section } = useParams<{ network: SupportedChain; app?: string; section?: string }>();
  const searchParams = useSearchParams();

  const activeChains = useMemo<SupportedChain[]>(() => {
    if (app !== "convert") return [network];
    if (section === "history") return Object.keys(CHAIN_PROVIDERS) as SupportedChain[];
    const toChain = resolveToChain(network, searchParams.get("to") ?? searchParams.get("linked"));
    return Array.from(new Set<SupportedChain>(["bitcoin", network, toChain]));
  }, [network, app, section, searchParams]);

  const content = activeChains.reduceRight<ReactNode>((acc, chain) => {
    const Provider = CHAIN_PROVIDERS[chain];
    return <Provider>{acc}</Provider>;
  }, children);

  return (
    <NetworkProvider initialChain={network}>
      <WalletConnectProvider>{content}</WalletConnectProvider>
    </NetworkProvider>
  );
}

/** All multi-network wallet stack, for pages outside [network] (e.g. onboarding/verify). */
export function AllDappProviders({ children }: { children: ReactNode }) {
  return (
    <NetworkProvider initialChain="solana">
      <WalletConnectProvider>
        <BitcoinProvider>
          <EthereumProvider>
            <SolanaProvider>
              <HederaProvider>
                <PolkadotProvider>
                  <TempoProvider>
                    <HyperliquidProvider>
                      <RobinhoodProvider>
                        <BaseProvider>
                          <OnboardingProvider>{children}</OnboardingProvider>
                        </BaseProvider>
                      </RobinhoodProvider>
                    </HyperliquidProvider>
                  </TempoProvider>
                </PolkadotProvider>
              </HederaProvider>
            </SolanaProvider>
          </EthereumProvider>
        </BitcoinProvider>
      </WalletConnectProvider>
    </NetworkProvider>
  );
}
