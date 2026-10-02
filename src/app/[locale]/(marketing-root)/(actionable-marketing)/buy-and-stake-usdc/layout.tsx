import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const metadataContent: any = {
    id: {
      title: "Rupiah Melemah? Beli & Staking USDC di Paradapp",
      description:
        "Kondisi rupiah melemah mulai mengancam tabunganmu? Jadi, segera beli USDC dan aktifkan staking mirip deposito USD secara aman lewat Paradapp.",
    },
    en: {
      title: "Rupiah Weakens? Buy & Stake USDC on Paradapp",
      description:
        "Is the rupiah weakens affecting your savings? Therefore, buy USDC and start staking like a USD deposit safely on Paradapp.",
    },
  };

  const t = metadataContent[locale] || metadataContent.en;

  return {
    title: t.title,
    description: t.description,
  };
}

export default function BuyAndStakeUsdcLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
