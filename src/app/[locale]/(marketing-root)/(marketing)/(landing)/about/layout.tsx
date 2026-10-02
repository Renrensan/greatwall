import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const metadataContent: any = {
    id: {
      title: "Tentang Paradapp",
      description:
        "Paradapp menghubungkan jaringan blockchain, integrasi dunia nyata, dan AI ke dalam satu platform terpadu, memungkinkan interaksi cross-chain yang mulus, panduan cerdas, dan kontrol penuh (self-custody) atas aset digital Anda.",
    },
    en: {
      title: "About Paradapp",
      description:
        "Paradapp is built on a parallel architecture that connects real-word to blockchain, blockchain to blockchain, Artificial Intelligent, and dApps into one unified experience.",
    },
  };

  const t = metadataContent[locale] || metadataContent.en;

  return {
    title: t.title,
    description: t.description,
  };
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
