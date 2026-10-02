"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import VideoBg from "@/marketing-components/VideoBg";
import Accordion from "@/subcomponents/Accordion";
import BitcoinOnboardingSteps from "./BitcoinOnboardingSteps";
import { useNetwork } from "@/app/network-provider";
import { bitcoin } from "@/index";

const PAGE_CONTENT: any = {
  id: {
    hero: {
      title: "Bitcoin: Aset Digital dengan Pasokan Paling Terbatas di Dunia",
      description:
        "Rupiah bisa terus dicetak, tapi Bitcoin tidak: hanya akan pernah ada 21 juta koin, selamanya. Di tengah pelemahan Rupiah, semakin banyak orang mengamankan sebagian aset mereka ke Bitcoin. Beli langsung lewat Paradapp dengan QRIS atau Virtual Account, sepenuhnya self-custody, kunci aset ada di tanganmu sendiri.",
      button: "Beli Bitcoin Sekarang",
      liveRateLabel: "Kurs Langsung",
    },
    scarcity: {
      title: "Kenapa Pasokan Terbatas Itu Penting",
      subtitle:
        "Tidak seperti uang kertas, jumlah Bitcoin yang bisa pernah ada sudah ditentukan sejak awal dan tidak bisa diubah oleh siapa pun.",
      cards: [
        {
          icon: "🔒",
          title: "Hanya 21 Juta, Selamanya",
          description:
            "Protokol Bitcoin membatasi jumlah total koin yang bisa pernah tercipta di angka 21 juta. Tidak ada bank sentral, pemerintah, atau perusahaan yang bisa mencetak lebih banyak, berbeda dengan Rupiah atau mata uang fiat lainnya.",
        },
        {
          icon: "⏳",
          title: "Halving: Pasokan Baru Terus Berkurang",
          description:
            "Setiap sekitar 4 tahun, jumlah Bitcoin baru yang tercipta per blok terpangkas setengah dalam peristiwa yang disebut 'halving'. Halving terakhir terjadi pada 2024. Semakin lama, semakin sedikit Bitcoin baru yang masuk ke peredaran.",
        },
        {
          icon: "🌐",
          title: "Tidak Bisa Dikontrol Satu Pihak",
          description:
            "Bitcoin berjalan di jaringan terdesentralisasi yang tersebar di ribuan komputer di seluruh dunia sejak 2009. Tidak ada otoritas tunggal yang bisa mengubah aturan pasokannya sesuka hati.",
        },
        {
          icon: "📉",
          title: "Pelindung Nilai Saat Rupiah Melemah",
          description:
            "Saat nilai tukar Rupiah tertekan, aset dengan pasokan tetap seperti Bitcoin menjadi salah satu cara untuk melindungi daya beli jangka panjang, di luar sistem mata uang yang bisa terus dicetak.",
        },
      ],
    },
    faq: [
      {
        title: "Kenapa jumlah Bitcoin dibatasi hanya 21 juta?",
        description:
          "Batas 21 juta sudah ditulis di dalam kode protokol Bitcoin sejak awal dibuat pada 2009. Ini disengaja untuk meniru sifat langka logam mulia seperti emas, sekaligus mencegah inflasi akibat pencetakan tak terbatas seperti pada mata uang fiat.",
      },
      {
        title: "Apa itu 'halving' dan kenapa itu penting?",
        description:
          "Halving adalah peristiwa terprogram yang memangkas separuh jumlah Bitcoin baru yang diberikan kepada penambang setiap sekitar 4 tahun. Karena pasokan baru semakin sedikit sementara permintaan bisa terus tumbuh, mekanisme ini memperkuat sifat langka Bitcoin dari waktu ke waktu.",
      },
      {
        title: "Apakah aman menyimpan Bitcoin di Paradapp?",
        description:
          "Paradapp menggunakan pendekatan self-custody: begitu Bitcoin kamu beli, aset langsung dikirim ke alamat walletmu sendiri. Paradapp tidak pernah menyimpan atau mengontrol kunci privatmu.",
      },
      {
        title: "Berapa minimal pembelian Bitcoin?",
        description:
          "Kamu bisa membeli Bitcoin dalam pecahan kecil (satoshi), tidak perlu membeli 1 BTC penuh. Batas minimal dan maksimal transaksi mengikuti ketentuan yang ditampilkan langsung di widget pembelian.",
      },
      {
        title: "Apa bedanya beli Bitcoin lewat Paradapp dengan exchange biasa?",
        description:
          "Di banyak exchange, aset kamu disimpan oleh pihak exchange (custodial) sampai kamu menariknya. Lewat Paradapp, Bitcoin langsung masuk ke wallet pribadimu saat itu juga, tanpa perantara yang memegang asetmu.",
      },
      {
        title: "Apakah harga Bitcoin yang ditampilkan real-time?",
        description:
          "Ya. Kurs dan estimasi jumlah Bitcoin yang akan kamu terima dihitung langsung dari harga pasar terkini saat kamu memasukkan jumlah Rupiah yang ingin dibelikan.",
      },
    ],
  },
  en: {
    hero: {
      title: "Bitcoin: The World's Scarcest Digital Asset",
      description:
        "The Rupiah can keep being printed. Bitcoin can't: only 21 million will ever exist. As the Rupiah weakens, more people are moving a portion of their savings into Bitcoin. Buy it instantly through Paradapp with QRIS or a local bank Virtual Account, fully self-custody, so the keys stay in your own hands.",
      button: "Buy Bitcoin Now",
      liveRateLabel: "Live Rate",
    },
    scarcity: {
      title: "Why Limited Supply Matters",
      subtitle:
        "Unlike paper money, the total amount of Bitcoin that will ever exist was fixed from day one, and no one can change it.",
      cards: [
        {
          icon: "🔒",
          title: "Only 21 Million, Forever",
          description:
            "Bitcoin's protocol caps the total supply at 21 million coins. No central bank, government, or company can print more, unlike the Rupiah or any other fiat currency.",
        },
        {
          icon: "⏳",
          title: "Halving: New Supply Keeps Shrinking",
          description:
            "Roughly every 4 years, the amount of new Bitcoin created per block gets cut in half in an event called the 'halving'. The most recent halving happened in 2024. Over time, less and less new Bitcoin enters circulation.",
        },
        {
          icon: "🌐",
          title: "No Single Point of Control",
          description:
            "Bitcoin has run on a decentralized network spread across thousands of computers worldwide since 2009. No single authority can change its supply rules on a whim.",
        },
        {
          icon: "📉",
          title: "A Hedge Against a Weakening Rupiah",
          description:
            "When the Rupiah's exchange rate comes under pressure, fixed-supply assets like Bitcoin become one way to protect long-term purchasing power, outside a currency system that can keep being printed.",
        },
      ],
    },
    faq: [
      {
        title: "Why is Bitcoin's supply capped at 21 million?",
        description:
          "The 21 million cap has been written into Bitcoin's protocol code since it launched in 2009. It was a deliberate design choice to mirror the scarcity of precious metals like gold, and to prevent the kind of inflation caused by unlimited printing under fiat currencies.",
      },
      {
        title: "What is the 'halving' and why does it matter?",
        description:
          "The halving is a programmed event that cuts the amount of new Bitcoin awarded to miners in half roughly every 4 years. Since new supply keeps shrinking while demand can keep growing, this mechanism reinforces Bitcoin's scarcity over time.",
      },
      {
        title: "Is it safe to hold Bitcoin through Paradapp?",
        description:
          "Paradapp uses a self-custody approach: as soon as you buy Bitcoin, it's sent directly to your own wallet address. Paradapp never holds or controls your private keys.",
      },
      {
        title: "What's the minimum amount of Bitcoin I can buy?",
        description:
          "You can buy Bitcoin in small fractions (satoshis), so you don't need to buy a full 1 BTC. Minimum and maximum transaction limits are shown directly in the buy widget.",
      },
      {
        title: "How is this different from buying on a regular exchange?",
        description:
          "On many exchanges, your assets are held by the exchange (custodial) until you withdraw them. Through Paradapp, Bitcoin goes straight to your own wallet the moment you buy it, with no intermediary holding your assets in between.",
      },
      {
        title: "Is the Bitcoin price shown here real-time?",
        description:
          "Yes. The rate and the estimated amount of Bitcoin you'll receive are calculated live from current market prices as you enter the Rupiah amount you want to spend.",
      },
    ],
  },
};

export default function BuyBitcoinPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = PAGE_CONTENT[locale] || PAGE_CONTENT.en;
  const { bitcoinMainnet, setSelectedChain } = useNetwork();

  const [liveRateIdr, setLiveRateIdr] = useState<number | null>(null);

  // The shared Navbar only syncs selectedChain from the URL on routes that have a
  // [network]/[app] segment (see Navbar.tsx's `if (!app) return`) — this page has neither,
  // so without this, selectedChain just sits at whatever it defaulted to (solana), leaving
  // the navbar's network icon and wallet-connect button on Solana the entire time, even
  // though this page and its BuyToken widget are fixed to Bitcoin.
  useEffect(() => {
    setSelectedChain("bitcoin");
  }, [setSelectedChain]);

  useEffect(() => {
    let cancelled = false;
    const fetchRate = async () => {
      try {
        // A large-ish probe amount so the returned BTC amount has enough significant
        // decimal digits to reverse into an accurate per-coin rate (a tiny probe amount
        // would round to too few digits at typical 8-decimal BTC precision).
        const probeIdr = 10_000_000_000;
        const params = new URLSearchParams({
          network: "BITCOIN",
          token: "BTC",
          idr: probeIdr.toString(),
          env: bitcoinMainnet ? "MAINNET" : "TESTNET",
          paymentMethod: "QRIS",
        });
        const res = await fetch(`/api/estimate-deposit?${params.toString()}`);
        const data = await res.json();
        const token = data.token || data.qris?.token || data.va?.token || 0;
        if (!cancelled && token > 0) {
          setLiveRateIdr(probeIdr / token);
        }
      } catch (err) {
        console.error("Failed to fetch live BTC/IDR rate:", err);
      }
    };
    fetchRate();
    return () => {
      cancelled = true;
    };
  }, [bitcoinMainnet]);

  const scrollToWidget = () => {
    document.getElementById("buy-widget")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative w-full min-h-screen bg-[radial-gradient(rgba(0,0,0,0.04)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[24px_24px] pt-24 md:pt-32 pb-16">
      <div className="fixed inset-0 -z-20 pointer-events-none w-screen h-screen">
        <VideoBg />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section 1: Hero */}
        <section
          id="hero"
          className="flex pt-12 md:pt-0 flex-col lg:flex-row gap-12 items-center lg:items-center justify-between text-center pb-16 md:pb-24 border-b border-black/5 dark:border-white/5"
        >
          <div className="w-full flex-1 text-left">
            <h1 className="text-5xl md:text-6xl font-black text-left tracking-tight text-current mb-8">
              {t.hero.title}
            </h1>
            <div className="max-w-xl mx-auto md:ml-0 space-y-6 text-current text-base text-left md:text-lg font-medium">
              <p>{t.hero.description}</p>

              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl glass-card border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5">
                <div className="relative w-8 h-8 shrink-0">
                  <Image src={bitcoin} alt="Bitcoin" fill className="object-contain" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-50">
                    {t.hero.liveRateLabel}
                  </span>
                  <span className="font-bold text-base sm:text-lg">
                    {liveRateIdr ? (
                      `1 BTC ≈ Rp ${Math.round(liveRateIdr).toLocaleString("id-ID")}`
                    ) : (
                      <span className="inline-block h-4 w-32 bg-black/10 dark:bg-white/10 rounded animate-pulse align-middle" />
                    )}
                  </span>
                </div>
              </div>

              <div>
                <button
                  onClick={scrollToWidget}
                  className="px-8 py-4 rounded-xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-bold text-base transition-all transform hover:-translate-y-0.5 shadow-lg shadow-black/10 dark:shadow-white/10 cursor-pointer"
                >
                  {t.hero.button}
                </button>
              </div>
            </div>
          </div>

          <div className="w-full flex-1 relative flex justify-center lg:justify-end z-20">
            <div className="relative w-56 h-56 sm:w-72 sm:h-72">
              <Image src={bitcoin} alt="Bitcoin" fill className="object-contain" />
            </div>
          </div>
        </section>

        {/* Section 2: Scarcity */}
        <section className="w-full py-16 md:py-24 border-b border-black/5 dark:border-white/5">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-current mb-4">
              {t.scarcity.title}
            </h2>
            <p className="text-base md:text-lg max-w-2xl mx-auto opacity-80">
              {t.scarcity.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {t.scarcity.cards.map((card: any, idx: number) => (
              <div
                key={idx}
                className="flex flex-col gap-3 p-8 rounded-3xl glass-card border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5"
              >
                <div className="text-4xl">{card.icon}</div>
                <h3 className="text-xl font-bold text-current">{card.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Onboarding Steps — same guided-wizard structure as buy-and-stake-usdc's
            OnboardingSteps, just 2 steps instead of 3 (no staking step for Bitcoin). Step 2
            embeds the real BuyToken component rather than re-implementing its transaction
            logic, so it inherits the KYC/IDRX handling, live rates, and payment-field
            mapping already fixed there instead of risking a second copy of those bugs. */}
        <div id="buy-widget" className="scroll-mt-24">
          <BitcoinOnboardingSteps locale={locale} />
        </div>

        <hr className="border-[0.5px] border-white/10 mt-30" />

        {/* Section 4: FAQ */}
        <section className="w-full flex flex-col items-start md:items-center py-16 md:py-24 text-left md:text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-current leading-tight mb-8">
            {locale === "en" ? "Frequently Asked Questions" : "Pertanyaan yang Sering Diajukan"}
          </h2>
          <div className="w-full max-w-4xl text-left font-grotesk">
            <Accordion
              items={t.faq}
              titleClassName="text-base md:text-lg font-bold"
              contentClassName="text-sm md:text-base leading-relaxed opacity-85"
            />
          </div>
        </section>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-37.5 md:h-62.5 lg:h-75 bg-linear-to-t from-white dark:from-[#121212] to-transparent pointer-events-none z-10" />
    </div>
  );
}
