import type { Metadata } from "next";

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
      title: "CryptosiastDAO Bali | Tumbuh, Belajar, dan Berkembang Bersama di Dunia Web3",
      description:
        "Wadah bagi crypto enthusiasts di Bali untuk berbagi informasi, belajar bersama, dan berkembang di industri Web3. Mulai dari airdrop, trading, teknologi blockchain, hingga peluang karier.",
    },
    en: {
      title: "CryptosiastDAO Bali | Grow, Learn, and Thrive Together in Web3",
      description:
        "A community for crypto enthusiasts in Bali to share information, learn together, and grow in the Web3 industry. From airdrops, trading, and blockchain technology to career opportunities.",
    },
  };

  const t = metadataContent[locale] || metadataContent.en;

  return {
    title: t.title,
    description: t.description,
  };
}

export default function CryptosiastDaoBaliLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
