import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const metadataContent: any = {
    id: {
      title: "Komunitas Paradapp",
      description:
        "Temukan dan bergabung dengan komunitas Web3 lokal yang didukung Paradapp di seluruh Indonesia.",
    },
    en: {
      title: "Paradapp Communities",
      description:
        "Discover and join local Web3 communities supported by Paradapp across Indonesia.",
    },
  };

  const t = metadataContent[locale] || metadataContent.en;

  return {
    title: t.title,
    description: t.description,
  };
}

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
