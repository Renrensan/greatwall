import { redirect } from "next/navigation";


export default async function NetworkRootPage({
  params,
}: {
  params: Promise<{ locale: string; network: string }>;
}) {
  const { locale, network } = await params;

  redirect(`/${locale}/${network}/vault/assets`);

}



