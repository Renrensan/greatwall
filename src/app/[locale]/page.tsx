
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const VALID_NETWORKS = ["bitcoin", "ethereum", "hedera", "solana", "polkadot"];
// Mirrors PREFERRED_CHAIN_KEY in @/app/network-provider — duplicated (rather than
// imported from that 'use client' module) to keep this server component clean of
// any client-boundary import.
const PREFERRED_CHAIN_COOKIE = "preferred-default-chain";

export default async function LocaleRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(PREFERRED_CHAIN_COOKIE)?.value;

  if (preferred && VALID_NETWORKS.includes(preferred)) {
    redirect(`/${locale}/${preferred}/vault/buy`);
  }

  redirect(`/${locale}/about`);
}
