
import { redirect } from "next/navigation";

export default async function LocaleRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Greatwall opens on the About page; "Launch App" there asks for a network.
  redirect(`/${locale}/about`);
}
