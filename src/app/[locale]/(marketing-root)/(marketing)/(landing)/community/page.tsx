"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import VideoBg from "@/marketing-components/VideoBg";

interface CommunityEntry {
  slug: string;
  name: string;
  location: string;
  description: string;
  image: string;
  cta: string;
}

const PAGE_CONTENT: Record<
  string,
  { title: string; description: string; communities: CommunityEntry[] }
> = {
  id: {
    title: "Komunitas Paradapp",
    description:
      "Temukan komunitas Web3 lokal yang didukung Paradapp. Gabung, belajar, dan berkembang bersama sesama crypto enthusiasts di kotamu.",
    communities: [
      {
        slug: "cryptosiastdaobali",
        name: "CryptosiastDAO Bali",
        location: "Bali, Indonesia",
        description:
          "Wadah bagi crypto enthusiasts di Bali untuk berbagi informasi, belajar bersama, dan berkembang di industri Web3.",
        image:
          "https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?auto=format&fit=crop&w=800&q=80",
        cta: "Kunjungi Komunitas",
      },
    ],
  },
  en: {
    title: "Paradapp Communities",
    description:
      "Discover local Web3 communities supported by Paradapp. Join, learn, and grow together with fellow crypto enthusiasts in your city.",
    communities: [
      {
        slug: "cryptosiastdaobali",
        name: "CryptosiastDAO Bali",
        location: "Bali, Indonesia",
        description:
          "A community for crypto enthusiasts in Bali to share information, learn together, and grow in the Web3 industry.",
        image:
          "https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?auto=format&fit=crop&w=800&q=80",
        cta: "Visit Community",
      },
    ],
  },
};

export default function CommunityListPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = PAGE_CONTENT[locale] || PAGE_CONTENT.en;

  return (
    <main className="min-h-screen bg-[radial-gradient(rgba(0,0,0,0.04)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[24px_24px] pt-32 pb-20 px-4 relative overflow-hidden">
      {/* Fixed backdrop wrapper for VideoBg — the same Paradapp-branded background used on
          the buy-and-stake-usdc / about / learn-blockchain pages. No opaque bg-color here:
          this route's layout wraps children in a `relative z-10` div that creates its own
          stacking context, so a fixed/-z-20 child like VideoBg escapes into THAT context —
          any opaque background painted on this page's own wrapper would then render in
          front of the video instead of behind it. */}
      <div className="fixed inset-0 -z-20 pointer-events-none w-screen h-screen">
        <VideoBg />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center mb-16 relative z-10">
          <h1 className="text-5xl md:text-7xl font-black mb-6 bg-linear-to-b from-foreground to-foreground/50 bg-clip-text text-current">
            {t.title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t.description}
          </p>
        </div>

        <hr className="border-none h-10" />

        {/* Community Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {t.communities.map((community) => (
            <Link
              key={community.slug}
              href={`/${locale}/${community.slug}`}
              className="group block rounded-3xl overflow-hidden glass-card hover:translate-y-[-8px] transition-all duration-500 border-white/10"
            >
              <div className="relative h-60 w-full overflow-hidden">
                <Image
                  src={community.image}
                  alt={community.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 px-4 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-bold rounded-full shadow-sm">
                  {community.location}
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-3 leading-tight group-hover:text-primary transition-colors">
                  {community.name}
                </h3>
                <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                  {community.description}
                </p>
                <div className="mt-6 flex items-center text-primary font-bold text-sm">
                  {community.cta}
                  <svg
                    className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom overlay fading to background */}
      <div className="absolute bottom-0 left-0 w-full h-37.5 md:h-62.5 lg:h-75 bg-linear-to-t from-white dark:from-[#121212] to-transparent pointer-events-none z-10" />
    </main>
  );
}
