import type { Metadata } from "next";
import ChatbotLazy from "@/components/integrator/para-ai/ChatbotLazy";
import { AllDappProviders } from "@/components/providers/dapp-providers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const metadataContent: Record<
    string,
    { title: string; description: string }
  > = {
    id: {
      title: "Mulai dengan Para | Paradapp",
      description: "Mulai perjalanan Anda dengan Paradapp.",
    },
    en: {
      title: "Start with Para | Paradapp",
      description: "Get started with Paradapp.",
    },
  };

  const t = metadataContent[locale] || metadataContent.en;

  return {
    title: t.title,
    description: t.description,
  };
}

export default function StartWithParaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AllDappProviders>
      {children}
      <ChatbotLazy />
    </AllDappProviders>
  );
}
