import { redirect } from "next/navigation";
import type { ReactNode } from "react";

const VALID_SECTIONS_BY_APP: Record<string, readonly string[]> = {
  vault: ["buy", "history", "assets"],
  convert: ["create", "history"],
  dapphub: ["trending", "favorite", "dappstore"],
};

const DEFAULT_SECTION_BY_APP: Record<string, string> = {
  vault: "buy",
  convert: "create",
  dapphub: "trending",
};

const DAPP_NETWORK_MAP: Record<string, string> = {
  "solana-swap": "solana",
  "solana-stake": "solana",
  "solana-tokenized-stocks": "solana",
  "beta-global-index": "solana",
  "hedera-stake": "hedera",
};

export default async function SectionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{
    locale: string;
    network: string;
    app: string;
    section: string;
  }>;
}) {
  const { locale, network, app, section } = await params;

  if (app === "dapp") {
    if (!section) {
      redirect(`/${locale}/${network}/dapphub/trending`);
    }


    const correctNetwork = DAPP_NETWORK_MAP[section];
    

    if (correctNetwork && correctNetwork !== network) {
      redirect(`/${locale}/${correctNetwork}/dapp/${section}`);
    }


    return <>{children}</>;
  }

  const validSections = VALID_SECTIONS_BY_APP[app] ?? VALID_SECTIONS_BY_APP["vault"];
  const defaultSection = DEFAULT_SECTION_BY_APP[app] ?? DEFAULT_SECTION_BY_APP["vault"];

  if (!validSections.includes(section)) {
    redirect(`/${locale}/${network}/${app}/${defaultSection}`);
  }

  return <>{children}</>;
}