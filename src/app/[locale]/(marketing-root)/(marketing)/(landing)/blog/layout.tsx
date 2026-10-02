import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const metadataContent: any = {
    id: {
      title: "Paradapp Blog",
      description:
        "Temukan info terbaru, tips, dan update seputar dunia Web3 langsung dari tim Paradapp.",
    },
    en: {
      title: "Paradapp Blog",
      description:
        "Discover the latest info, tips, and updates about the Web3 world directly from the Paradapp team.",
    },
  };

  const t = metadataContent[locale] || metadataContent.en;

  return {
    title: t.title,
    description: t.description,
  };
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
