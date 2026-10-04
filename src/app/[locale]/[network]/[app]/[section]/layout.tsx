import { redirect } from "next/navigation";
import type { ReactNode } from "react";

const VALID_SECTIONS_BY_APP: Record<string, readonly string[]> = {
  vault: ["assets", "buy", "move", "history"],
  convert: ["create", "history"],
  bridge: ["send", "history"],
  beta: ["baskets", "create", "explore"],
};

const DEFAULT_SECTION_BY_APP: Record<string, string> = {
  vault: "assets",
  convert: "create",
  bridge: "send",
  beta: "baskets",
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

  const validSections = VALID_SECTIONS_BY_APP[app] ?? VALID_SECTIONS_BY_APP["vault"];
  const defaultSection = DEFAULT_SECTION_BY_APP[app] ?? DEFAULT_SECTION_BY_APP["vault"];

  if (!validSections.includes(section)) {
    redirect(`/${locale}/${network}/${app}/${defaultSection}`);
  }

  return <>{children}</>;
}