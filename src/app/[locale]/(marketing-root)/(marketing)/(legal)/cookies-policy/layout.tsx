import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const metadataContent: any = {
    id: {
      title: "Kebijakan Cookie | Paradapp",
      description:
        "Kebijakan Cookie Paradapp - Pelajari bagaimana kami menggunakan cookie dan teknologi serupa.",
    },
    en: {
      title: "Cookies Policy | Paradapp",
      description:
        "Paradapp Cookies Policy - Learn how we use cookies and similar technologies.",
    },
  };

  const t = metadataContent[locale] || metadataContent.en;

  return {
    title: t.title,
    description: t.description,
  };
}

export default function CookiesPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
