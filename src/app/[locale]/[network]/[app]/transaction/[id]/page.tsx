import { notFound, redirect } from "next/navigation";
import ConvertTransactionPage from "./ConvertTransactionPage";
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

  // The vault's transactions were fiat ones, which this app does not have;
  // there is no page for them.
  if (app === "vault") {
    notFound();
  }

  redirect(`/${locale}/${network}`);
}
