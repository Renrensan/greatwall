import { redirect } from "next/navigation";


const DEFAULT_SECTION_BY_APP: Record<string, string> = {
  vault: "assets",
  convert: "create",
  bridge: "lock",
  beta: "baskets",
};

export default async function AppRootPage({
  params,
}: {
  params: Promise<{ locale: string; network: string; app: string }>;
}) {
  const { locale, network, app } = await params;
  const defaultSection = DEFAULT_SECTION_BY_APP[app] || "assets";

  redirect(`/${locale}/${network}/${app}/${defaultSection}`);
}



