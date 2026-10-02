"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useNetwork } from "@/app/network-provider";
import DecryptedText from "@/marketing-components/DecryptedText";
import VideoBg from "@/marketing-components/VideoBg";
import Accordion from "@/subcomponents/Accordion";
import BuyToken from "@/subcomponents/BuyToken";
import cryptosiastLogoBlack from "@/assets/cryptosiast-logo-black.png";
import cryptosiastLogoWhite from "@/assets/cryptosiast-logo-white.png";

interface PageTranslation {
  hero: {
    name: string;
    title: string;
    tagline: string;
    subtitle: string;
    ctaWhatsapp: string;
    ctaTelegram: string;
  };
  whyJoin: {
    tag: string;
    title: string;
    subtitle: string;
    reasons: {
      icon: string;
      title: string;
      description: string;
    }[];
  };
  instagram: {
    tag: string;
    title: string;
    subtitle: string;
    cta: string;
  };
  faq: {
    tag: string;
    title: string;
    subtitle: string;
    items: {
      title: string;
      description: string;
    }[];
  };
}

const WHATSAPP_URL = "https://chat.whatsapp.com/EZJjl7jxd9HEW3uQ5UM6ke";
const TELEGRAM_URL = "https://t.me/CryptosiastBLI";
const INSTAGRAM_URL = "https://www.instagram.com/cryptosiastbali/";

interface InstagramPost {
  id: string;
  caption: string;
  permalink: string;
  image: string;
}

const PAGE_CONTENT: Record<string, PageTranslation> = {
  id: {
    hero: {
      name: "CryptosiastDAO Bali",
      title: "Tumbuh, Belajar, dan Berkembang Bersama di Dunia Web3.",
      tagline: "“Sing Dadi Takut Melajah”",
      subtitle:
        "Wadah bagi crypto enthusiasts di Bali untuk berbagi informasi, belajar bersama, dan berkembang di industri Web3. Mulai dari airdrop, trading, teknologi blockchain, hingga peluang karier, CryptosiastDAO Bali menjadi tempat untuk mendapatkan insight, berdiskusi, dan terhubung dengan sesama crypto enthusiasts.",
      ctaWhatsapp: "Gabung Komunitas Whatsapp",
      ctaTelegram: "Gabung Komunitas Telegram",
    },
    whyJoin: {
      tag: "MENGAPA BERGABUNG?",
      title: "Alasan Utama Bergabung dengan CryptosiastDAO Bali",
      subtitle:
        "Bergabung bersama komunitas crypto enthusiasts di Bali untuk mendapatkan informasi, berbagi insight, dan belajar bersama tentang berbagai hal di dunia Web3.",
      reasons: [
        {
          icon: "🚀",
          title: "Airdrop & Alpha Insights",
          description:
            "Dapatkan informasi dan insight seputar airdrop, peluang, serta perkembangan terbaru di ekosistem Web3 melalui komunitas CryptosiastDAO Bali.",
        },
        {
          icon: "📚",
          title: "Belajar Bersama tentang Web3",
          description:
            "Temukan berbagai pembahasan seputar trading, teknologi blockchain, airdrop, hingga career. Belajar bersama anggota komunitas dan terus menambah pemahaman tentang industri Web3.",
        },
        {
          icon: "🌴",
          title: "Komunitas Crypto di Bali",
          description:
            "Terhubung dengan sesama trader, developer, airdrop hunter, dan crypto enthusiasts di Bali. Bangun koneksi, berbagi pengalaman, dan berkembang bersama dalam ekosistem Web3.",
        },
      ],
    },
    instagram: {
      tag: "DARI INSTAGRAM KAMI",
      title: "Galeri Komunitas CryptosiastDAO Bali",
      subtitle:
        "Ikuti aktivitas dan perkembangan komunitas CryptosiastDAO Bali melalui Instagram, mulai dari informasi seputar Web3 hingga berbagai momen dari komunitas crypto di Bali.",
      cta: "Kunjungi CryptosiastDAObali",
    },
    faq: {
      tag: "FAQ KOMUNITAS",
      title: "Pertanyaan yang Sering Diajukan",
      subtitle:
        "Jawaban singkat untuk pertanyaan umum seputar Komunitas CryptosiastDAO Bali.",
      items: [
        {
          title: "Bagaimana cara bergabung dengan Komunitas CryptosiastDAO Bali?",
          description:
            "Anda dapat langsung bergabung melalui grup Telegram dan Whatsapp Cryptosis DAO Bali. Informasi dan berbagai update mengenai komunitas akan dibagikan melalui kanal tersebut.",
        },
        {
          title:
            "Bagaimana cara mendapatkan informasi seputar aktivitas dan kegiatan komunitas?",
          description:
            "Informasi mengenai aktivitas komunitas akan dibagikan melalui grup Telegram dan Whatsapp CryptosiastDAO Bali. Pastikan sudah bergabung agar tidak melewatkan informasi terbaru.",
        },
        {
          title: "Apakah komunitas ini cocok untuk yang baru belajar Web3 & Crypto?",
          description:
            "Tentu. CryptosiastDAO Bali merupakan wadah untuk berbagi informasi dan belajar bersama mengenai berbagai topik seperti airdrop, trading, teknologi blockchain, hingga career di industri Web3.",
        },
        {
          title: "Bagaimana cara ikut berkontribusi dalam komunitas?",
          description:
            "Anda dapat mulai dengan bergabung ke komunitas, mengikuti diskusi, dan berbagi informasi atau insight yang relevan dengan anggota lainnya. CryptosiastDAO Bali dibangun untuk tumbuh dan belajar bersama.",
        },
      ],
    },
  },
  en: {
    hero: {
      name: "CryptosiastDAO Bali",
      title: "Grow, Learn, and Thrive Together in Web3",
      tagline: "“Sing Dadi Takut Melajah”",
      subtitle:
        "A community for crypto enthusiasts in Bali to share information, learn together, and grow in the Web3 industry. From airdrops, trading, and blockchain technology to career opportunities, CryptosiastDAO Bali is a place to discover insights, exchange ideas, and connect with fellow crypto enthusiasts.",
      ctaWhatsapp: "Join the WhatsApp Community",
      ctaTelegram: "Join the Telegram Community",
    },
    whyJoin: {
      tag: "WHY JOIN?",
      title: "Main Reasons to Join CryptosiastDAO Bali",
      subtitle:
        "Join a community of crypto enthusiasts in Bali to access information, exchange insights, and learn together about different aspects of the Web3 world.",
      reasons: [
        {
          icon: "🚀",
          title: "Airdrop & Alpha Insights",
          description:
            "Get information and insights on airdrops, opportunities, and the latest developments across the Web3 ecosystem through the CryptosiastDAO Bali community.",
        },
        {
          icon: "📚",
          title: "Learn Web3 Together",
          description:
            "Explore discussions around trading, blockchain technology, airdrops, and careers. Learn alongside other community members and continue building your understanding of the Web3 industry.",
        },
        {
          icon: "🌴",
          title: "Crypto Community in Bali",
          description:
            "Connect with fellow traders, developers, airdrop hunters, and crypto enthusiasts in Bali. Build connections, share experiences, and grow together within the Web3 ecosystem.",
        },
      ],
    },
    instagram: {
      tag: "FROM OUR INSTAGRAM",
      title: "CryptosiastDAO Bali Community Gallery",
      subtitle:
        "Follow the activities and growth of CryptosiastDAO Bali through Instagram, from Web3 insights and information to moments from the crypto community in Bali.",
      cta: "Visit CryptosiastDAO Bali",
    },
    faq: {
      tag: "COMMUNITY FAQ",
      title: "Frequently Asked Questions",
      subtitle:
        "Quick answers to common questions about the CryptosiastDAO Bali community.",
      items: [
        {
          title: "How can I join the CryptosiastDAO Bali community?",
          description:
            "You can join directly through the CryptosiastDAO Bali WhatsApp and Telegram groups. Community information and updates will be shared through these channels.",
        },
        {
          title:
            "How can I get information about community activities and events?",
          description:
            "Information about community activities and events will be shared through the CryptosiastDAO Bali WhatsApp and Telegram groups. Make sure to join so you don't miss the latest updates.",
        },
        {
          title: "Is this community suitable for people who are new to Web3 & Crypto?",
          description:
            "Absolutely. CryptosiastDAO Bali is a place to share information and learn together about various topics including airdrops, trading, blockchain technology, and careers in the Web3 industry.",
        },
        {
          title: "How can I contribute to the community?",
          description:
            "You can start by joining the community, participating in discussions, and sharing relevant information or insights with other members. CryptosiastDAO Bali is built around learning, sharing, and growing together.",
        },
      ],
    },
  },
};

export default function CryptosiastDaoBaliPage() {
  const { locale } = useParams<{ locale: string }>();
  const { selectedChain } = useNetwork();
  const t = PAGE_CONTENT[locale] || PAGE_CONTENT.en;

  // Live posts from /api/instagram-feed (Meta's Graph API, free — no token configured yet
  // means an empty array back, so this quietly stays on the static placeholder grid below).
  const [igPosts, setIgPosts] = useState<InstagramPost[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/instagram-feed")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.posts)) {
          setIgPosts(data.posts);
        }
      })
      .catch((err) => console.error("Failed to load Instagram feed:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-[radial-gradient(rgba(0,0,0,0.04)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[24px_24px] pt-24 md:pt-32 pb-16">
      {/* Fixed backdrop wrapper for VideoBg — the same Paradapp-branded background used on
          the buy-and-stake-usdc / about / learn-blockchain pages. No opaque bg-color here:
          this route's layout wraps children in a `relative z-10` div that creates its own
          stacking context, so a fixed/-z-20 child like VideoBg escapes into THAT context —
          any opaque background painted on this page's own wrapper would then render in
          front of the video instead of behind it. */}
      <div className="fixed inset-0 -z-20 pointer-events-none w-screen h-screen">
        <VideoBg />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section 1: Hero */}
        <section
          id="hero"
          className="flex pt-12 md:pt-16 flex-col lg:flex-row gap-12 items-center lg:items-start justify-between pb-16 md:pb-24 border-b border-black/5 dark:border-white/5"
        >
          {/* Left Column: Community Details */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 text-xs md:text-sm font-bold tracking-wide text-current mb-6 backdrop-blur-md"
            >
              🌴 {t.hero.name}
            </motion.div>

            {/* Cryptosiast Logo (Light & Dark Mode) */}
            <div className="my-4 relative w-64 sm:w-80 md:w-96 h-16 sm:h-20 md:h-24 flex items-center justify-center lg:justify-start">
              {/* cryptosiast-logo-black for light mode */}
              <Image
                src={cryptosiastLogoBlack}
                alt="Cryptosiast Logo"
                className="object-contain dark:hidden block h-full w-auto"
                priority
              />
              {/* cryptosiast-logo-white for dark mode */}
              <Image
                src={cryptosiastLogoWhite}
                alt="Cryptosiast Logo"
                className="object-contain hidden dark:block h-full w-auto"
                priority
              />
            </div>

            {/* Title with DecryptedText effect */}
            <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight text-current mb-4 max-w-4xl leading-tight">
              <DecryptedText
                animateOn="view"
                sequential={true}
                revealDirection="start"
                speed={50}
                maxIterations={8}
                text={t.hero.title}
              />
            </h1>

            {/* Balinese tagline */}
            <p className="text-lg sm:text-xl font-bold italic text-current opacity-70 mb-6">
              {t.hero.tagline}
            </p>

            {/* Subtitle */}
            <p className="max-w-2xl text-base md:text-lg font-medium opacity-85 leading-relaxed text-current mb-8">
              {t.hero.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-bold text-base transition-all transform hover:-translate-y-0.5 shadow-lg shadow-black/10 dark:shadow-white/10 flex items-center justify-center gap-2"
              >
                <span>{t.hero.ctaWhatsapp}</span>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79 1.031h.004c4.363 0 7.926-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.673M7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.1-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.336-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
                </svg>
              </a>
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/15 font-bold text-base transition-all flex items-center justify-center gap-2 backdrop-blur-md"
              >
                <span>{t.hero.ctaTelegram}</span>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right Column: Vault Buy Self-Custody Widget */}
          <div className="w-full lg:w-[460px] xl:w-[480px] shrink-0 relative z-20 [&>hr]:hidden">
            <BuyToken
              networkOverride={selectedChain || "solana"}
              openTxInNewTab={true}
            />
          </div>
        </section>

        {/* Section 2: Why Join CryptosiastDAO Bali */}
        <section className="py-16 md:py-24 border-b border-black/5 dark:border-white/5">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-neutral-400 uppercase">
              {t.whyJoin.tag}
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-current mt-2 mb-4">
              {t.whyJoin.title}
            </h2>
            <p className="text-base md:text-lg max-w-xl mx-auto opacity-80">
              {t.whyJoin.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.whyJoin.reasons.map((reason, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col justify-start p-8 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-md hover:border-neutral-500/40 dark:hover:border-neutral-500/40 transition-all"
              >
                <div className="text-4xl mb-6 p-3 rounded-2xl bg-black/5 dark:bg-white/10 w-fit">
                  {reason.icon}
                </div>
                <h3 className="text-xl font-bold text-current mb-3">
                  {reason.title}
                </h3>
                <p className="text-sm opacity-80 leading-relaxed">
                  {reason.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 3: Instagram Gallery — hidden entirely until the real
            /api/instagram-feed has posts (i.e. until Paradapp's own IG Business
            credentials are configured, see .env.example). No static/manual fallback
            images on purpose. */}
        {igPosts.length > 0 && (
          <section className="py-16 md:py-24 border-b border-black/5 dark:border-white/5">
            <div className="text-center mb-16">
              <span className="text-xs font-bold tracking-widest text-neutral-400 uppercase">
                {t.instagram.tag}
              </span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-current mt-2 mb-4">
                {t.instagram.title}
              </h2>
              <p className="text-base md:text-lg max-w-xl mx-auto opacity-80">
                {t.instagram.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {igPosts.map((post) => (
                <motion.a
                  key={post.id}
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -6 }}
                  className="relative aspect-square rounded-3xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-md group"
                >
                  {/* Image */}
                  <Image
                    src={post.image}
                    alt={post.caption || t.instagram.title}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />

                  {/* Glassmorphic Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center gap-3 p-6 text-white backdrop-blur-xs">
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                    </svg>
                    <span className="text-sm font-bold tracking-wide text-center line-clamp-3 px-2">
                      {post.caption || t.instagram.title}
                    </span>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* Profile CTA Button */}
            <div className="flex justify-center mt-12">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/15 font-bold text-base transition-all flex items-center gap-3 backdrop-blur-md"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
                <span>{t.instagram.cta}</span>
              </a>
            </div>
          </section>
        )}

        {/* Section 4: FAQ */}
        <section className="w-full flex flex-col items-start md:items-center py-16 md:py-24 text-left md:text-center">
          <span className="text-xs font-bold tracking-widest text-neutral-400 uppercase mb-2">
            {t.faq.tag}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-current leading-tight mb-4">
            {t.faq.title}
          </h2>
          <p className="text-base md:text-lg max-w-xl mx-auto opacity-80 mb-12">
            {t.faq.subtitle}
          </p>

          <div className="w-full max-w-4xl text-left font-grotesk">
            <Accordion
              items={t.faq.items}
              titleClassName="text-base md:text-lg font-bold"
              contentClassName="text-sm md:text-base leading-relaxed opacity-85"
            />
          </div>
        </section>
      </div>

      {/* Bottom overlay fading to background */}
      <div className="absolute bottom-0 left-0 w-full h-37.5 md:h-62.5 lg:h-75 bg-linear-to-t from-white dark:from-[#121212] to-transparent pointer-events-none z-10" />
    </div>
  );
}
