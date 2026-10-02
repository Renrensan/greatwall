import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const metadataContent: Record<string, { title: string; description: string }> = {
    id: {
      title: "Beli Bitcoin | Aset Digital Paling Langka di Dunia",
      description:
        "Bitcoin hanya akan pernah ada 21 juta koin. Amankan aset dari pelemahan Rupiah dengan Bitcoin, beli langsung dengan QRIS atau Virtual Account lewat Paradapp, self-custody sepenuhnya.",
    },
    en: {
      title: "Buy Bitcoin | The World's Scarcest Digital Asset",
      description:
        "Only 21 million bitcoin will ever exist. Protect your savings from Rupiah depreciation with Bitcoin, buy instantly with QRIS or Virtual Account through Paradapp, fully self-custody.",
    },
  };

  const t = metadataContent[locale] || metadataContent.en;

  return {
    title: t.title,
    description: t.description,
  };
}

export default function BuyBitcoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No provider wrapping here on purpose: the parent (actionable-marketing) layout now
  // mounts AllDappProviders itself, above both Navbar and {children}. Nesting a second,
  // per-route BitcoinProvider around just {children} (as this used to do) would create a
  // separate context instance that this page's own components read from while Navbar keeps
  // reading the outer one — the exact desync bug that fix was meant to avoid, just moved
  // one level down instead of eliminated.
  return <>{children}</>;
}
