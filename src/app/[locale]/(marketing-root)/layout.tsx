import { socialItems } from "@/marketing-components/footerConfig";
import ConditionalFooter from "@/marketing-components/ConditionalFooter";
import LenisProvider from "@/marketing-components/LenisProvider";
import LoadingWrapper from "@/marketing-components/LoadingWrapper";


export default async function MarketingRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <LenisProvider>
      <LoadingWrapper>
        {children}
        <ConditionalFooter locale={locale} socialItems={socialItems} />
      </LoadingWrapper>
    </LenisProvider>
  );
}
