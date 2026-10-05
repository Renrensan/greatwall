
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const VALID_NETWORKS = ["bitcoin", "ethereum", "solana"];
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

  // The portfolio of the preferred network, else of Ethereum.
  const network = preferred && VALID_NETWORKS.includes(preferred) ? preferred : "ethereum";
  redirect(`/${locale}/${network}/vault/assets`);
}
