import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const metadataContent: any = {
    id: {
      title: "Memahami Blockchain dari Dasar Bersama ParaHub",
      description:
        "Melalui materi onboarding dari ParaHub, Anda akan mempelajari blockchain dari dasar dengan bahasa yang sederhana dan mudah dipahami, bahkan jika Anda belum pernah mengenalnya sebelumnya.",
    },
    en: {
      title: "Understanding Blockchain from the Ground Up with ParaHub",
      description:
        "Through onboarding materials from ParaHub, you will learn blockchain from the basics in simple, easy-to-understand language, even if you have never encountered it before.",
    },
  };

  const t = metadataContent[locale] || metadataContent.en;

  return {
    title: t.title,
    description: t.description,
  };
}

export default function LearnBlockchainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
