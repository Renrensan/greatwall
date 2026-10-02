"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { blackVideo, crossChainIcon, dappHubIcon, paraAiIcon, selfCustodyIcon, whiteVideo, pashaRenaisan, ekaLaksmana, kelwinShen, adiSaputra, fernando, hyperliquid } from "@/index";
import { useTheme } from "next-themes";
import CountUp from "@/marketing-components/CountUp";
import DecryptedText from "@/marketing-components/DecryptedText";
import { Icon } from "@iconify/react";
import ScrollReveal from "@/marketing-components/ScrollReveal";
import { motion, AnimatePresence } from "framer-motion";
import Particles from "@/marketing-components/Particles";
import ProfileCard from "@/marketing-components/ProfileCard";
import VideoBg from "@/marketing-components/VideoBg";
import { getPreferredChain, hasPreferredChain } from "@/app/network-provider";
import StartWithParaModal from "@/marketing-components/StartWithParaModal";

const CORE_CAPABILITIES = [
  {
    id: 1,
    title: "Self Custody Services",
    icon: (
      <div className="p-4 w-fit flex items-center justify-center rounded-3xl bg-black dark:bg-transparent transition-colors duration-300">
        <Image src={selfCustodyIcon} alt="Self Custody" width={120} height={120} className="capabilitiesIcon" />
      </div>
    ),
    description: "Own and manage your digital assets across multiple blockchain networks, with seamless movement between blockchain value and real-world integration.",
  },
  {
    id: 2,
    title: "Cross-Chain Convert (Powered by iPoW)",
    icon: (
      <div className="p-4 w-fit flex items-center justify-center rounded-3xl bg-black dark:bg-transparent transition-colors duration-300">
        <Image src={crossChainIcon} alt="Cross Chain" width={120} height={120} className="capabilitiesIcon" />
      </div>
    ),
    description: "Convert assets instantly across different blockchain networks with secure and seamless transactions.",
  },
  {
    id: 3,
    title: "dApp Hub",
    icon: (
      <div className="p-4 w-fit flex items-center justify-center rounded-3xl bg-black dark:bg-transparent transition-colors duration-300">
        <Image src={dappHubIcon} alt="dApp Hub" width={120} height={120} className="capabilitiesIcon rounded-none p-2" />
      </div>
    ),
    description: "Discover and access decentralized applications from multiple networks in one unified platform.",
  },
  {
    id: 4,
    title: "Para AI",
    icon: (
      <div className="p-4 w-fit flex items-center justify-center rounded-3xl bg-black dark:bg-transparent transition-colors duration-300">
        <Image src={paraAiIcon} alt="Para AI" width={120} height={120} className="capabilitiesIcon rounded-none p-2" />
      </div>
    ),
    description: "Navigate Web3 more easily with AI guidance across assets, networks, and dApps.",
  },
];

const TEAM_MEMBERS = [
  {
    id: 1,
    name: "Adi Saputra",
    role: "Marketing & Technical Writer",
    image: adiSaputra,
    socials: {
      github: "https://github.com/adiztra",
      twitter: "https://x.com/adiztraa",
      linkedin: "https://www.linkedin.com/in/adi-saputra-7b43aa1b0/",
    },
  },
  {
    id: 2,
    name: "Pasha Renaisan",
    role: "AI & Software Architect",
    image: pashaRenaisan,
    socials: {
      github: "https://github.com/Renrensan",
      twitter: "https://x.com/Renrensan24",
      linkedin: "https://www.linkedin.com/in/pasha-renaisan-b4725b237/",
    },
  },
  {
    id: 3,
    name: "Fernando",
    role: "Frontend & dApp Engineer",
    image: fernando,
    socials: {
      github: "https://github.com/fernandoshen",
    },
  },
  {
    id: 4,
    name: "Kelwin Shen",
    role: "Blockchain Protocol Engineer",
    image: kelwinShen,
    socials: {
      github: "https://github.com/kelwinshen",
      twitter: "https://x.com/kelwin_shen",
      linkedin: "https://www.linkedin.com/in/kelwin-shen-8964631b5/",
    },
  },
  {
    id: 5,
    name: "Eka Laksmana",
    role: "UI & Product Designer",
    image: ekaLaksmana,
    socials: {
      github: "https://github.com/PendingBrew",
      twitter: "https://x.com/cecepganteng31",
      linkedin: "https://www.linkedin.com/in/ekalaksmana/",
    },
  },
];

const PAGE_CONTENT: any = {
  id: {
    hero: {
      title: "Interoperable dApp Platform",
      description: "Paradapp menghubungkan jaringan blockchain, integrasi dunia nyata, dan AI ke dalam satu platform terpadu, memungkinkan interaksi cross-chain yang mulus, panduan cerdas, dan kontrol penuh (self-custody) atas aset digital Anda.",
      button: "Coba Sekarang",
    },
    scrollReveal: "Jelajahi empat kapabilitas utama Paradapp yang dirancang untuk mendefinisikan ulang pengalaman terdesentralisasi Anda. Pilar-pilar ini, mulai dari self-custody dan konversi cross-chain hingga dApp hub terpadu dan panduan AI, memastikan koneksi yang mulus, aman, dan paralel di seluruh jaringan blockchain dan dunia nyata.",
    capabilities: [
      {
        title: "Self Custody Services",
        description: "Miliki dan kelola aset digital Anda di berbagai jaringan blockchain, dengan pergerakan mulus antara blockchain dan integrasi dunia nyata.",
      },
      {
        title: "Cross-Chain Convert (Powered by iPoW)",
        description: "Konversi aset secara instan di berbagai jaringan blockchain dengan transaksi yang aman dan mulus.",
      },
      {
        title: "dApp Hub",
        description: "Temukan dan akses aplikasi terdesentralisasi dari berbagai jaringan dalam satu platform terpadu.",
      },
      {
        title: "Para AI",
        description: "Navigasi Web3 dengan lebih mudah melalui panduan AI untuk aset, jaringan, dan dApps.",
      },
    ],
    buttons: {
      1: "Kelola Aset",
      2: "Mulai Konversi",
      3: "Jelajahi dApps",
      4: "Tanya AI",
      default: "Buka dApp",
    },
    parallel: {
      title: "Connected in Parallel",
      description: "Paradapp dibangun di atas arsitektur paralel yang menghubungkan real-world ke blockchain, blockchain ke blockchain, Artificial Intelligence, dan dApps ke dalam satu pengalaman terpadu.",
      sub1: "Real-world connectivity. Cross-chain interoperability.",
      sub2: "Unified dApp access. Smart AI assistance.",
    },
    network: {
      title: "Network yang Didukung",
    },
    stats: {
      dapps: "Integrasi dApps",
      volume: "Jumlah Transaksi",
    },
    team: {
      title: "Meet Our Team",
      description: "Tim pembangun, engineer, dan inovator yang berdedikasi untuk membentuk masa depan infrastruktur blockchain yang interoperable.",
    },
    faq: {
      title: "Frequently Asked Questions",
      description: "Temukan jawaban untuk pertanyaan umum tentang Paradapp.",
      items: [
        {
          q: "Apa itu Paradapp?",
          a: "Paradapp adalah platform terdesentralisasi yang memudahkan penjelajahan ekosistem Web3. Pengguna bisa mengelola aset dengan wallet self-custody, konversi aset lintas blockchain, dan akses dApps melalui dApp Hub yang terintegrasi. Platform ini dirancang untuk pengguna baru maupun berpengalaman agar interaksi Web3 lebih aman dan sederhana.",
        },
        {
          q: "Apakah saya perlu pengalaman Web3 untuk menggunakan Paradapp?",
          a: "Tidak. Paradapp dirancang untuk pemula. Antarmukanya sederhana dengan panduan yang membantu menyederhanakan interaksi blockchain yang kompleks seperti manajemen aset dan konversi token.",
        },
        {
          q: "Apakah crypto saya aman saat menggunakan Paradapp?",
          a: "Ya. Paradapp menggunakan pendekatan self-custody. Aset tetap di wallet milik Anda sendiri. Paradapp tidak menyimpan/mengontrol dana atau private key. Setiap transaksi membutuhkan persetujuan langsung dari pengguna.",
        },
        {
          q: "Mengapa harus menggunakan Paradapp dibanding mengelola secara terpisah?",
          a: "Karena ekosistem Web3 biasanya terfragmentasi (banyak wallet/jaringan). Paradapp menyatukan pengalaman tersebut dalam satu platform (Unified Experience) sehingga interaksi antar ekosistem blockchain lebih efisien.",
        },
        {
          q: "Bagaimana cara kerja cross-chain conversion di Paradapp?",
          a: "Menggunakan teknologi iPoW (Interoperable Proof of Work) untuk memverifikasi dan memfasilitasi transaksi antar jaringan tanpa bergantung pada perantara terpusat.",
        },
        {
          q: "Apa itu Paradapp dApp Hub?",
          a: "Gateway satu pintu untuk menemukan dan mengakses aplikasi terdesentralisasi dari berbagai jaringan blockchain tanpa perlu berpindah-pindah platform atau wallet.",
        },
      ],
    },
  },
  en: {
    hero: {
      title: "Interoperable dApp Platform",
      description: "Paradapp connects blockchain networks, real-world integration, and AI into one unified platform, enabling seamless cross-chain interaction, intelligent guidance, and full self-custody of your digital assets.",
      button: "Try Now",
    },
    scrollReveal: "Explore Paradapp's four core capabilities designed to redefine your decentralized experience. These pillars, ranging from self-custody and cross-chain conversions to a unified dApp hub and AI guidance, ensure a seamless, secure, and parallel connection across all blockchain networks and the real world.",
    capabilities: [
      {
        title: "Self Custody Services",
        description: "Own and manage your digital assets across multiple blockchain networks, with seamless movement between blockchain value and real-world integration.",
      },
      {
        title: "Cross-Chain Convert (Powered by iPoW)",
        description: "Convert assets instantly across different blockchain networks with secure and seamless transactions.",
      },
      {
        title: "dApp Hub",
        description: "Discover and access decentralized applications from multiple networks in one unified platform.",
      },
      {
        title: "Para AI",
        description: "Navigate Web3 more easily with AI guidance across assets, networks, and dApps.",
      },
    ],
    buttons: {
      1: "Manage Assets",
      2: "Start Converting",
      3: "Browse dApps",
      4: "Ask AI",
      default: "Open dApp",
    },
    parallel: {
      title: "Connected in Parallel",
      description: "Paradapp is built on a parallel architecture that connects real-word to blockchain, blockchain to blockchain, Artificial Intelligent, and dApps into one unified experience.",
      sub1: "Real-world connectivity. Cross-chain interoperability.",
      sub2: "Unified dApp access. Smart AI assistance.",
    },
    network: {
      title: "Network Supported",
    },
    stats: {
      dapps: "dApps Integration",
      volume: "Total Transaction",
    },
    team: {
      title: "Meet Our Team",
      description: "A team of builders, engineers, and innovators dedicated to shaping the future of interoperable blockchain infrastructure.",
    },
    faq: {
      title: "Frequently Asked Questions",
      description: "Find answers to commonly asked questions about Paradapp.",
      items: [
        {
          q: "What is Paradapp?",
          a: "A decentralized platform for navigating Web3. It includes self-custody wallet management, cross-chain conversion, and a unified dApp Hub for a simpler and more secure user experience.",
        },
        {
          q: "Do I need Web3 experience?",
          a: "No. It’s designed for both beginners and experts with a simple interface and guided tools for complex blockchain tasks.",
        },
        {
          q: "Is my crypto safe?",
          a: "Yes. It follows a self-custody approach. You maintain full ownership and control of your private keys and funds.",
        },
        {
          q: "Why use Paradapp over separate tools?",
          a: "It solves fragmentation by bringing multiple networks, wallets, and dApps into one unified interface for maximum efficiency.",
        },
        {
          q: "How does cross-chain conversion work?",
          a: "It uses iPoW (Interoperable Proof of Work) to facilitate transactions between networks without centralized intermediaries.",
        },
        {
          q: "What is the Paradapp dApp Hub?",
          a: "A gateway to discover and access decentralized applications across different blockchains from one single place.",
        },
      ],
    },
  },
};

const fadeInProps = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.8 },
  viewport: { once: true },
};

const fadeInRightProps = {
  initial: { opacity: 0, x: 20 },
  whileInView: { opacity: 1, x: 0 },
  transition: { duration: 0.8, delay: 0.2 },
  viewport: { once: true },
};

const NETWORK_ICONS = [
  { key: "polkadot", icon: "token:polkadot", color: "text-current" },
  { key: "ethereum", icon: "token:ethereum", color: "text-ethereum" },
  { key: "bitcoin", icon: "token-branded:bitcoin", color: "text-bitcoin" },
  { key: "solana", icon: "token-branded:solana", color: "text-solana" },
  { key: "hedera", icon: "token:hedera-hashgraph", color: "text-current" },
  { key: "tron", icon: "token-branded:tron", color: "text-tron" },
  // No Iconify icon exists for Hyperliquid — renders the local asset instead (see both
  // render sites below).
  { key: "hyperliquid", icon: null, image: hyperliquid, color: "text-hyperliquid" },
  { key: "robinhood", icon: "token-branded:robinhood", color: "text-robinhood" },
  // "base" literally collides with Tailwind's own text-base (font-size) utility, so this
  // uses an arbitrary-value class instead of the usual text-${key} pattern — see globals.css.
  { key: "base", icon: "token-branded:base", color: "text-[#0052FF]" },
  { key: "arbitrum", icon: "token-branded:arbitrum", color: "text-arbitrum" },
];


export default function AboutPage() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [targetPath, setTargetPath] = useState("/vault/buy");

  const t = PAGE_CONTENT[locale] || PAGE_CONTENT.en;

  const [stats, setStats] = useState({ dapps: 0, volume: 0 });
  const [centerIndex, setCenterIndex] = useState(0);

  const particleColors = useMemo(() => (resolvedTheme === "dark" ? ["#ffffff"] : ["#000000"]), [resolvedTheme]);

  const centerIconContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={NETWORK_ICONS[centerIndex].key}
        initial={{ opacity: 0, rotate: -180, scale: 0.4 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, rotate: 180, scale: 0.4 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full h-full"
      >
        {NETWORK_ICONS[centerIndex].icon ? (
          <Icon icon={NETWORK_ICONS[centerIndex].icon as string} width="100%" height="100%" className={`${NETWORK_ICONS[centerIndex].color} glass-card rounded-full p-4`} />
        ) : (
          <Image src={(NETWORK_ICONS[centerIndex] as any).image} alt={NETWORK_ICONS[centerIndex].key} width={160} height={160} className={`${NETWORK_ICONS[centerIndex].color} glass-card rounded-full p-4 w-full h-full object-contain`} />
        )}
      </motion.div>
    </AnimatePresence>
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCenterIndex((prev) => (prev + 1) % NETWORK_ICONS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Appending networkEnv=MAINNET just like your swagger example
        const res = await fetch("/api/transaction/metrics?networkEnv=MAINNET");
        const data = await res.json();

        if (data.success) {
          setStats({
            dapps: data.totalDapps || 0,
            volume: data.totalCompletedTransactions || 0,
          });
        }
      } catch (error) {
        console.error("Failed to fetch landing page stats:", error);
      }
    };

    fetchStats();
  }, []);

  const handleViewMore = () => {
    if (hasPreferredChain()) {
      router.push(`/${locale}/${getPreferredChain()}/vault/buy`);
    } else {
      setTargetPath("/vault/buy");
      setIsStartModalOpen(true);
    }
  };

  const handleCapabilityClick = (dappId: number) => {
    const routes: Record<number, string> = {
      1: "/vault",
      2: "/convert",
      3: "/dapp-hub",
      4: "/vault",
    };
    const path = routes[dappId] || "/vault";
    if (hasPreferredChain()) {
      router.push(`/${locale}/${getPreferredChain()}${path}`);
    } else {
      setTargetPath(path);
      setIsStartModalOpen(true);
    }
  };

  const getButtonText = (dappId: number): string => {
    return t.buttons[dappId] || t.buttons.default;
  };

  return (
    <>
      <div className="relative overflow-hidden">
        <VideoBg />

        {/* Hero Section */}
        <section id="hero" className="flex pt-32 md:pt-0 flex-col md:flex-row container mx-auto gap-12 items-center justify-between  px-4 text-center mt-20 md:mt-32">
          <div className="w-full flex-1">
            <h1 className="text-5xl md:text-7xl font-black text-left  tracking-tight text-current mb-8">
              <DecryptedText animateOn="view" sequential={true} revealDirection="start" speed={60} maxIterations={10} text={t.hero.title} />
            </h1>
            <div className="max-w-xl mx-auto md:ml-0 space-y-0 text-current text-base text-left md:text-lg font-medium">
              <p>{t.hero.description}</p>
              <hr className="border-none h-10" />
              <div className="w-full md:w-auto mx-auto md:mx-0">
                <button onClick={handleViewMore} className="w-1/2 bg-buttonBackground text-buttonText rounded-xl cursor-pointer font-bold text-lg">
                  <DecryptedText animateOn="both" sequential={true} revealDirection="start" speed={60} maxIterations={10} text={t.hero.button} parentClassName="p-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="w-full flex-1 flex items-center justify-center">
            <div className="w-40 h-40 md:w-56 md:h-56">{centerIconContent}</div>
          </div>
        </section>

        <hr className="border-none h-37.5 md:h-62.5 lg:h-75" />
        {/* botom rectangle fullwidth gradient to top start 000 to transparent */}
        <div className="absolute bottom-0 left-0 w-full h-37.5 md:h-62.5 lg:h-75 bg-linear-to-t from-white dark:from-[#121212] to-transparent pointer-events-none z-10" />
      </div>

      {/* Text muncul disini */}
      <section className="max-w-5xl mx-auto">
        <ScrollReveal baseOpacity={0.1} enableBlur baseRotation={3} blurStrength={4}>
          {t.scrollReveal}
        </ScrollReveal>
      </section>

      {/* Core Capabilities Section */}
      <section id="capabilities" className="py-16 md:py-24 px-4 max-w-5xl mx-auto ">
        {CORE_CAPABILITIES.map((item) => (
          <div key={item.id}>
            <hr className="border-current/20" />
            <span className="flex gap-6 items-center text-xs uppercase tracking-widest text-current pt-4">
              <Icon icon={"ph:arrow-right-light"} className="rotate-45 text-current" /> <DecryptedText animateOn="hover" sequential={true} revealDirection="start" speed={60} maxIterations={10} text={t.capabilities[CORE_CAPABILITIES.indexOf(item)].title} />
            </span>
            <motion.div {...fadeInProps} className="py-12">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0">
                <div className="w-full md:w-1/2 flex justify-start md:justify-start text-current">{item.icon}</div>

                <div className="flex flex-col gap-4 w-full md:w-1/2 text-left md:text-left">
                  <motion.p {...fadeInRightProps} className="text-xl font-normal leading-relaxed text-current">
                    {t.capabilities[CORE_CAPABILITIES.indexOf(item)].description}
                  </motion.p>

                  <div className="flex justify-start ">
                    <button
                      onClick={() => handleCapabilityClick(item.id)}
                      className="w-fit cursor-pointer flex items-center underline decoration-0 underline-offset-6"
                    >
                      <Icon icon={"ph:arrow-right-light"} className="rotate-45" /> <DecryptedText animateOn="hover" sequential={true} revealDirection="start" speed={60} maxIterations={10} text={getButtonText(item.id)} className="" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ))}
        <hr className="border-current/20" />
      </section>

      <hr className="border-none h-37.5 md:h-62.5 lg:h-75" />
      {/* Connected in Parallel Section */}
      <section className="py-16 md:py-24 px-4 max-w-5xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-black text-current mb-6">{t.parallel.title}</h2>
        <p className="text-current text-lg md:text-xl font-medium max-w-3xl mx-auto mb-12">{t.parallel.description}</p>
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-neutral-800 bg-black shadow-2xl">
          <iframe src="https://www.youtube.com/embed/KetDL_rIIks?rel=0&modestbranding=1" title="Tutorial Video" className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
        </div>
        <div className="mt-12 text-center space-y-2">
          <p className="text-xl md:text-2xl font-bold text-current bg-clip-text">{t.parallel.sub1}</p>
          <p className="text-lg md:text-xl font-medium text-current">{t.parallel.sub2}</p>
        </div>
      </section>

      <hr className="border-none h-37.5 md:h-62.5 lg:h-75" />

      {/* Network Section */}
      <section id="network" className=" w-full pt-32 relative">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <Particles particleCount={200} particleSpread={10} speed={0.1} particleColors={particleColors} moveParticlesOnHover={false} particleHoverFactor={3.2} alphaParticles={false} particleBaseSize={140} sizeRandomness={0.4} cameraDistance={19} disableRotation={false} />
        </div>
        <div>
          <h2 className="text-2xl md:text-4xl font-bold text-center text-current mb-10">{t.network.title}</h2>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 max-w-3xl mx-auto px-4">
            {NETWORK_ICONS.map((network) => (
              <div
                key={network.key}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full glass-card flex items-center justify-center shadow-buttonNav"
              >
                {network.icon ? (
                  <Icon icon={network.icon} className={`${network.color} text-3xl md:text-4xl`} />
                ) : (
                  <Image src={(network as any).image} alt={network.key} width={40} height={40} className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24 px-4 max-w-5xl mx-auto text-center">
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-24 lg:gap-40 mb-16">
          <div className="flex flex-col items-center text-center">
            <h4 className="text-2xl md:text-3xl font-medium text-current mb-6">{t.stats.dapps}</h4>
            <CountUp
              from={0}
              to={stats.dapps} // dynamically rendered
              separator=","
              direction="up"
              duration={1}
              className="text-4xl md:text-6xl font-bold"
            />
          </div>
          <div className="flex flex-col items-center text-center">
            <h4 className="text-2xl md:text-3xl font-medium text-current mb-6">{t.stats.volume}</h4>
            <CountUp
              from={0}
              to={stats.volume} // dynamically rendered
              separator=","
              direction="up"
              duration={1}
              className="text-4xl md:text-6xl font-bold"
            />
          </div>
        </div>
      </section>

      <hr className="border-none h-37.5 md:h-62.5 lg:h-75" />

      {/* Team Section */}
      <section id="team" className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-current mb-4">{t.team.title}</h2>
            <p className="text-neutral-400 text-lg md:text-xl font-medium max-w-3xl mx-auto">{t.team.description}</p>
          </motion.div>

          {/* Team Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8">
            {TEAM_MEMBERS.map((member, index) => (
              <ProfileCard key={member.id} name={member.name} role={member.role} image={member.image} socials={member.socials} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Section FAQ */}
      <section id="faq" className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-current mb-4">{t.faq.title}</h2>
            <p className="text-neutral-400 text-lg md:text-xl font-medium">{t.faq.description}</p>
          </motion.div>

          <div className="space-y-4">
            {t.faq.items.map((faq: any, index: number) => (
              <div key={index} className="glass-card rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)} className="w-full flex items-center justify-between p-6 text-left cursor-pointer transition-colors hover:bg-white/5">
                  <span className="text-lg font-bold text-current mr-4">{faq.q}</span>
                  <Icon icon="ph:caret-down-bold" className={`text-2xl transition-transform duration-300 ${openFaqIndex === index ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaqIndex === index && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                      <div className="p-6 pt-0 text-neutral-400 leading-relaxed font-medium">{faq.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="border-none h-25 md:h-37.5" />

      <StartWithParaModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        locale={locale as "en" | "id"}
        targetPath={targetPath}
      />
    </>
  );
}
