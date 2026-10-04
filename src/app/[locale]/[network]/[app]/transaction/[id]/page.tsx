import { redirect } from "next/navigation";
import ConvertTransactionPage from "./ConvertTransactionPage";
import VaultTransactionPage from "./VaultTransactionPage";
import BridgeTransactionPage from "./BridgeTransactionPage";
import BasketPage from "./BasketPage";

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

  if (app === "bridge") {
    return <BridgeTransactionPage />;
  }

  if (app === "beta") {
    return <BasketPage />;
  }

  if (app === "vault") {
    return <VaultTransactionPage />;
  }

  redirect(`/${locale}/${network}`);
}
