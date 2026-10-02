import { redirect } from "next/navigation";


const DEFAULT_SECTION_BY_APP: Record<string, string> = {
  vault: "buy",
  convert: "create",
  dapphub: "trending",
};

export default async function AppRootPage({
  params,
}: {
  params: Promise<{ locale: string; network: string; app: string }>;
}) {
  const { locale, network, app } = await params;
  const defaultSection = DEFAULT_SECTION_BY_APP[app] || "buy";

  redirect(`/${locale}/${network}/${app}/${defaultSection}`);
}



