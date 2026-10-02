import NavbarStaticLP from "./NavbarStaticLP";
import FooterStaticLP from "./FooterStaticLP";
import { socialItems } from "@/marketing-components/footerConfig";
import LenisProvider from "@/marketing-components/LenisProvider";
import LoadingWrapper from "@/marketing-components/LoadingWrapper";
import { AllDappProviders } from "@/components/providers/dapp-providers";
import ChatbotLazy from "@/components/integrator/para-ai/ChatbotLazy";
import GradualBlur from "@/marketing-components/GradualBlur";

export default async function LandingPageCommunityLayout({
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
        <AllDappProviders>
          <NavbarStaticLP forceShow={true} />
          <main className="relative min-h-screen overflow-hidden">
            <div className="relative z-10">{children}</div>

            <GradualBlur
              target="page"
              position="bottom"
              height="4rem"
              strength={2}
              divCount={5}
              curve="bezier"
              exponential
              zIndex={10}
              opacity={1}
            />
          </main>
          <FooterStaticLP locale={locale} socialItems={socialItems} />
          <ChatbotLazy />
        </AllDappProviders>
      </LoadingWrapper>
    </LenisProvider>
  );
}
