import { redirect } from "next/navigation";
import ConvertTransactionPage from "./ConvertTransactionPage";
import VaultTransactionPage from "./VaultTransactionPage";

export default async function TransactionPage({
  params,
}: {
  params: Promise<{
    locale: string;
    network: string;
    app: string;
    id: string;
  }>;
}) {
  const { locale, network, app, id } = await params;

  if (!id) {
    redirect(`/${locale}/${network}/${app}/history`);
  }

  if (app === "convert") {
    return <ConvertTransactionPage />;
  }

  if (app === "vault") {
    return <VaultTransactionPage />;
  }

  redirect(`/${locale}/${network}`);
}
