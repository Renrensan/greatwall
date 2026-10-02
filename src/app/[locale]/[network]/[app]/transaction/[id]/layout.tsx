import { redirect } from "next/navigation";

const VALID_APPS = ["vault", "convert"] as const;

export default async function TransactionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
    network: string;
    app: string;
    id: string;
  }>;
}) {
  const { locale, network, app, id } = await params;

  if (!id || !VALID_APPS.includes(app as any) ) {
    redirect(`/${locale}/${network}/${app}/history`);
  }

  return <>{children}</>;
}
