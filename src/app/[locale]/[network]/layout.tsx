import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { UiLayout } from "@/components/ui/ui-layout";
import { ScopedDappProviders } from "@/components/providers/dapp-providers";
import { BrandPulseLoader } from "@/components/ui/BrandPulseLoader";


const VALID_NETWORKS = ["bitcoin", "ethereum", "solana", "tempo", "hyperliquid", "robinhood", "base", "arbitrum"];
const FALLBACK_NETWORK = "solana";
// Mirrors PREFERRED_CHAIN_KEY in @/app/network-provider — duplicated (rather than
// imported from that 'use client' module) to keep this server component clean of
// any client-boundary import.
const PREFERRED_CHAIN_COOKIE = "preferred-default-chain";

export default async function NetworkLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; network: string }>;
}) {
  // Ensure that the incoming `network` is valid
  const { network, locale } = await params;

  if (!VALID_NETWORKS.includes(network)) {
    const cookieStore = await cookies();
    const preferred = cookieStore.get(PREFERRED_CHAIN_COOKIE)?.value;
    const defaultNetwork = preferred && VALID_NETWORKS.includes(preferred) ? preferred : FALLBACK_NETWORK;
    redirect(`/${locale}/${defaultNetwork}/vault/assets`);
  }

  return (
    <Suspense
      fallback={
        <UiLayout>
          <BrandPulseLoader />
        </UiLayout>
      }
    >
      <ScopedDappProviders>
        <UiLayout>{children}</UiLayout>
      </ScopedDappProviders>
    </Suspense>
  );
}
