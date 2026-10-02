import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const metadataContent: any = {
    id: {
      title: "Kebijakan Privasi | Paradapp",
      description:
        "Kebijakan Privasi Paradapp - Privasi Anda adalah prioritas kami.",
    },
    en: {
      title: "Privacy Policy | Paradapp",
      description: "Paradapp Privacy Policy - Your privacy is our priority.",
    },
  };

  const t = metadataContent[locale] || metadataContent.en;

  return {
    title: t.title,
    description: t.description,
  };
}

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
