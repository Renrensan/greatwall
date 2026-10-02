"use client";
import { useParams } from "next/navigation";
import Image from "next/image";
import VideoBg from "@/marketing-components/VideoBg";
import BuyToken from "@/subcomponents/BuyToken";
import Accordion from "@/subcomponents/Accordion";
import { phantom, sketchyCoins, sketchyBarchart } from "@/index";
import USDvsIDRChart from "./USDvsIDRChart";
import OnboardingSteps from "./OnboardingSteps";

const PAGE_CONTENT: any = {
  id: {
    hero: {
      title: "Rupiah Melemah, Beli USDC & Mulai Staking Sekarang.",
      description:
        "Banyak orang mulai cemas saat melihat rupiah melemah hingga tembus 18000 saat ini. Namun, orang yang menyimpan Dolar tetap tenang menghadapi guncangan ekonomi tersebut. Oleh sebab itu, Paradapp hadir memudahkanmu beli dolar menggunakan USDC berbasis teknologi blockchain. Jadi, platform ini menjadi tempat beli usdc terbaik sekaligus memulai staking usdc harian layaknya deposito dolar.",
      button: "Mulai Coba",
    },
    section3: {
      title: "Amankan Aset Saat Rupiah Melemah 2026 Lewat Deposito Digital",
      description:
        "Tren grafik menunjukkan bahwa fenomena rupiah melemah pada tahun 2026 terus merosot tanpa henti. Akibatnya, kondisi ekonomi global ini memicu kenaikan harga barang secara drastis di pasar domestik. Oleh sebab itu, beralih ke deposito dolar digital menjadi keputusan yang sangat bijak. Jadi, mulailah beli usdc sekarang juga untuk melindungi hasil kerja kerasmu.",
    },
    wallet: {
      title: "Dompet Web3 yang Direkomendasikan",
      subtitle:
        "Paradapp berjalan di atas jaringan Solana. Oleh karena itu, kami merekomendasikan dompet Phantom untuk menyimpan dan bertransaksi USDC secara aman.",
      phantomDesc:
        "Phantom merupakan dompet digital paling populer saat ini. Selain sangat aman, dompet ini memudahkanmu menyimpan aset untuk modal staking usdc.",
      buttonLabel: "Unduh Phantom Wallet",
    },
    section4: {
      title: "Langkah Kedua: Beli USDC & Mulai Staking",
      description:
        "Setelah memasang dompet Phantom, kamu bisa langsung beli usdc dengan sangat mudah. Kemudian, gunakan platform Paradapp sebagai aplikasi tepercaya untuk beli dolar secara instan. Ini adalah cara aman mengamankan aset menggunakan Virtual Account bank lokal atau QRIS sebelum memulai program deposito digitalmu.",
    },
    faq: [
      {
        title:
          "Apa itu USDC dan mengapa saya harus menggunakannya saat rupiah melemah?",
        description:
          "USDC adalah Dolar digital atau stablecoin yang menggunakan keunggulan teknologi blockchain. Selain itu, aset modern ini memiliki jaminan nilai 1:1 dengan Dolar AS resmi. Secara historis, mata uang Dolar AS jauh lebih stabil daripada Rupiah dalam jangka panjang. Oleh karena itu, langkah beli dolar ini menjadi pilihan tepat untuk melindungi nilai uangmu ketika rupiah melemah.",
      },
      {
        title: "Apa itu staking USDC dan bagaimana cara kerjanya?",
        description:
          "Staking adalah fitur pertumbuhan aset yang bekerja persis seperti deposito dolar di bank konvensional. Melalui program staking usdc ini, kamu menyimpan dan mengunci asetmu di dalam jaringan blockchain secara aman. Sebagai imbalannya, kamu akan mendapatkan keuntungan pasif berupa bunga Dolar yang tumbuh setiap detik.",
      },
      {
        title: "Bagaimana cara menukar kembali hasil staking USDC ke Rupiah?",
        description:
          "Proses penukaran kembali berjalan sangat instan dan fleksibel selama 24 jam setiap hari. Kamu hanya perlu mengakses fitur penarikan dana di Paradapp. Kemudian, tentukan jumlah hasil staking usdc yang ingin kamu jual. Sistem kami akan langsung mengirimkan dana Rupiah ke rekening bank lokalmu.",
      },
      {
        title:
          "Mengapa kombinasi beli USDC dan staking menjadi solusi terbaik sekarang?",
        description:
          "Saat ini, menaruh uang di tabungan biasa akan membuat nilainya menyusut akibat inflasi. Namun, kombinasi beli usdc dan melakukan staking usdc memberikan perlindungan ganda untuk keuanganmu. Pertama, kamu mengamankan aset ke mata uang Dolar yang kuat saat rupiah melemah. Kedua, fitur ini memberikan bunga tinggi layaknya deposito dolar otomatis.",
      },
      {
        title:
          "Apa itu teknologi blockchain dan apakah aman untuk menyimpan aset saya?",
        description:
          "Blockchain adalah teknologi pencatatan data digital yang tersebar di ribuan komputer di seluruh dunia. Oleh karena itu, sistem ini tidak memiliki pusat data tunggal yang bisa diretas oleh oknum nakal. Selain itu, setiap transaksi beli usdc atau program staking usdc tercatat secara transparan dan permanen. Jadi, aset digital milikmu sepenuhnya aman karena hanya kamu yang memegang kendali penuh atas kunci aksesnya.",
      },
      {
        title: "Apa yang terjadi jika rupiah melemah terhadap daya beli saya?",
        description:
          "Secara langsung, fenomena rupiah melemah akan menurunkan daya beli masyarakat secara drastis. Hal ini terjadi karena harga barang impor dan kebutuhan pokok pasti melonjak naik. Oleh karena itu, mengalihkan dana dari tabungan dolar fisik ke deposito digital USDC lewat Paradapp merupakan langkah taktis untuk menjaga kekayaanmu tetap stabil.",
      },
      {
        title: "Apa yang menjadi penyebab utama rupiah melemah di tahun 2026?",
        description:
          "Kondisi rupiah melemah pada tahun 2026 terjadi akibat tekanan ekonomi global yang sangat kuat. Di tingkat global, bank sentral Amerika Serikat menerapkan kebijakan suku bunga tinggi. Akibatnya, aliran modal keluar dari Indonesia secara masif. Selain itu, ketegangan geopolitik dunia membuat para investor mengamankan dana mereka ke Dolar AS.",
      },
      {
        title:
          "Apa perbedaan menyimpan USDC di Paradapp dibandingkan membeli USD fisik di bank?",
        description:
          "Membeli USD fisik biasanya sangat rumit karena selisih kurs yang tinggi dan antrean panjang. Sebagai alternatif, Paradapp hadir sebagai tempat beli usdc yang menawarkan likuiditas tinggi dengan transaksi instan 24/7 langsung dari ponselmu. Selain itu, kamu bisa menikmati biaya konversi rendah tanpa risiko kerusakan fisik uang kertas.",
      },
      {
        title:
          "Apakah aman menyimpan USDC dan melakukan staking untuk jangka panjang?",
        description:
          "Ya, aset ini sangat aman karena perusahaan teknologi asal AS bernama Circle menerbitkan USDC secara resmi. Mereka juga melakukan audit rutin setiap bulan melalui akuntan publik ternama. Terlebih lagi, kontrak cerdas blockchain Solana mengamankan program staking milikmu secara transparan tanpa risiko penipuan.",
      },
      {
        title:
          "Apakah boleh beli dolar dan melakukan staking saat rupiah melemah?",
        description:
          "Langkah finansial ini tentu sangat boleh, legal, dan merupakan pilihan yang bijak. Membeli Dolar dan memutarnya di deposito digital bukanlah tindakan spekulasi. Sebaliknya, langkah ini menjadi strategi lindung nilai yang rasional untuk melindungi masa depan finansialmu.",
      },
      {
        title: "Apa dampak beli usd bagi ekonomi indonesia secara keseluruhan?",
        description:
          "Mengamankan aset ke Dolar digital tidak akan merusak ekonomi lokal selama kamu menjadikannya alat penyimpan nilai. Kamu tetap tinggal dan berabelanja di Indonesia. Oleh karena itu, kamu akan menukarkan kembali USDC tersebut menjadi Rupiah saat bertransaksi. Hasilnya, roda ekonomi dalam negeri tetap berputar sehat.",
      },
    ],
  },
  en: {
    hero: {
      title: "Indonesia Rupiah Weakens! Buy USDC & Start Staking Now.",
      description:
        "Many people in Indonesia feel anxious as the rupiah weakens past 18000 today. However, individuals who save dollars stay calm during this economic shock. Therefore, Paradapp helps you buy dollars easily using blockchain-based USDC. So, this platform becomes the best place to buy usdc while starting daily usdc staking like a dollar deposit.",
      button: "Try Now",
    },
    section3: {
      title: "Secure Assets as the Rupiah Weakens in 2026 via Digital Deposits",
      description:
        "Chart trends show that the rupiah weakens continuously in 2026. Consequently, this global economic condition triggers a drastic price rise in local markets. Therefore, switching to a digital dollar deposit is a very wise decision. So, buy usdc now to protect your hard-earned wealth.",
    },
    wallet: {
      title: "Recommended Web3 Wallet",
      subtitle:
        "Paradapp operates on the Solana network. Therefore, we recommend the Phantom wallet to store and transact USDC safely.",
      phantomDesc:
        "Phantom is the most popular digital wallet today. Additionally, this highly secure wallet simplifies storing your assets for usdc staking.",
      buttonLabel: "Download Phantom Wallet",
    },
    section4: {
      title: "Step Two: Buy USDC & Start Staking",
      description:
        "After installing your Phantom wallet, you can buy usdc very easily. Then, use Paradapp as your trusted application to buy dollars instantly. Consequently, you can secure assets via local bank transfers or QRIS before starting your digital dollar deposit.",
    },
    faq: [
      {
        title: "What is USDC and why should I use it when the rupiah weakens?",
        description:
          "USDC is a digital Dollar or stablecoin that uses advanced blockchain technology. Additionally, this modern asset maintains a 1:1 value guarantee with the official US Dollar. Historically, the US Dollar is far more stable than the Rupiah over the long term. Therefore, choosing to buy dollars digitally protects your money perfectly when the rupiah weakens.",
      },
      {
        title: "What is USDC staking and how does it work?",
        description:
          "Staking is an asset growth feature that functions exactly like a dollar deposit in traditional banks. Through this usdc staking program, you safely lock your assets inside the blockchain network. In return, you earn passive profits as your Dollar interest grows every second.",
      },
      {
        title: "How do I convert my USDC staking rewards back to Rupiah?",
        description:
          "The conversion process is completely instant and flexible 24/7 every day. First, you only need to access the withdrawal feature on Paradapp. Then, specify the amount of usdc staking returns you want to sell. Finally, our system directly sends the Rupiah funds to your local bank account.",
      },
      {
        title:
          "Why is the combination of buying USDC and staking the best solution right now?",
        description:
          "Currently, keeping money in a regular bank account shrinks its value due to inflation. However, combining the choice to buy usdc and run usdc staking provides double protection for your finances. First, you secure your assets into the strong US Dollar when the rupiah weakens. Second, this feature automatically provides high interest like a classic dollar deposit.",
      },
      {
        title:
          "What is blockchain technology and is it safe to store my assets?",
        description:
          "Blockchain is a digital data recording technology distributed across thousands of computers worldwide. Therefore, this system avoids a single central data point that malicious actors could exploit. Additionally, every buy usdc transaction or usdc staking program logs data transparently and permanently. So, your digital assets remain completely safe because you hold full control over the access keys.",
      },
      {
        title:
          "What happens if the rupiah weakens against my purchasing power?",
        description:
          "Directly, the phenomenon where the rupiah weakens drops public purchasing power drastically. This happens because prices of imported goods and basic needs will definitely climb. Therefore, shifting funds from physical dollar savings to digital USDC on Paradapp successfully keeps your wealth stable.",
      },
      {
        title: "What is the main reason the rupiah weakens in 2026?",
        description:
          "The trend where the rupiah weakens in 2026 occurs due to intense global economic pressures. Globally, the United States central bank implements high interest rate policies. Consequently, capital flows out of Indonesia massively. Additionally, global geopolitical tensions force investors to secure their funds into the US Dollar.",
      },
      {
        title:
          "What is the difference between storing USDC on Paradapp versus buying physical USD at a bank?",
        description:
          "Buying physical USD usually involves extreme complexity due to high exchange spreads and long lines. Alternatively, Paradapp operates as the best place to buy usdc with instant 24/7 transactions right from your phone. Additionally, you enjoy low conversion fees without any risk of physical paper damage.",
      },
      {
        title:
          "Is it safe to store USDC and participate in staking for the long term?",
        description:
          "Yes, this asset is highly secure because an American financial technology company named Circle officially issues USDC. They also undergo regular monthly audits through renowned public accounting firms. Furthermore, Solana blockchain smart contracts protect your staking program transparently without any fraud risks.",
      },
      {
        title:
          "Is it permissible to buy dollars and participate in staking when the rupiah weakens?",
        description:
          "This financial step is entirely legal, permissible, and represents a very wise choice. Choosing to buy dollars and growing them in a digital deposit does not constitute speculation. Instead, this move serves as a rational hedging strategy to protect your entire financial future.",
      },
      {
        title:
          "What is the impact if I buy usd on the overall Indonesian economy?",
        description:
          "Securing assets into digital Dollars does not harm the local economy if used as a store of value. After all, you still live and spend money inside Indonesia. Therefore, you will convert that USDC back into Rupiah when buying daily items. Consequently, the domestic economic wheel continues to rotate healthily.",
      },
    ],
  },
};

const CoinsIllustration = ({ className = "" }: { className?: string }) => (
  <div className={`relative w-48 h-48 sm:w-64 sm:h-64 ${className}`}>
    <Image
      src={sketchyCoins}
      alt="Coins Illustration"
      fill
      className="object-contain"
    />
  </div>
);

const BarChartIllustration = ({ className = "" }: { className?: string }) => (
  <div className={`relative w-48 h-48 sm:w-64 sm:h-64 ${className}`}>
    <Image
      src={sketchyBarchart}
      alt="Bar Chart Illustration"
      fill
      className="object-contain"
    />
  </div>
);

export default function LandingUSDC() {
  const { locale } = useParams<{ locale: string }>();
  const t = PAGE_CONTENT[locale] || PAGE_CONTENT.en;

  const scrollToWidget = () => {
    document
      .getElementById("buy-widget")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div className="relative w-full min-h-screen bg-[radial-gradient(rgba(0,0,0,0.04)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[24px_24px] pt-24 md:pt-32 pb-16">
        {/* Fixed backdrop wrapper for VideoBg to prevent stretch/zoom and keep it non-scrollable */}
        <div className="fixed inset-0 -z-20 pointer-events-none w-screen h-screen">
          <VideoBg />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section 1: Hero */}
          <section
            id="hero"
            className="flex pt-32 md:pt-0 flex-col lg:flex-row gap-12 items-start lg:items-center justify-between text-center pb-16 md:pb-24 border-b border-black/5 dark:border-white/5"
          >
            <div className="w-full flex-1 text-left">
              <h1 className="text-5xl md:text-6xl font-black text-left tracking-tight text-current mb-8">
                {t.hero.title}
              </h1>
              <div className="max-w-xl mx-auto md:ml-0 space-y-0 text-current text-base text-left md:text-lg font-medium">
                <p>{t.hero.description}</p>
                <hr className="border-none h-10" />
                <div className="w-full md:w-auto mx-auto md:mx-0"></div>
              </div>
            </div>

            {/* Graphic Chart USDC with IDR */}
            <div className="w-full flex-1 relative flex justify-center lg:justify-end z-20">
              <USDvsIDRChart locale={locale} />
            </div>
          </section>

          {/* Interactive Onboarding Steps */}
          <OnboardingSteps locale={locale} />

          <hr className=" border-[0.5px] border-white/10 mt-30" />

          {/* Section: FAQ */}
          <section className="w-full flex flex-col  items-start md:items-center py-16 md:py-24  text-left md:text-center">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-current leading-tight mb-8">
              {locale === "en"
                ? "Frequently Asked Questions"
                : "Pertanyaan yang Sering Diajukan"}
            </h2>
            <div className="w-full max-w-4xl text-left font-grotesk">
              <Accordion
                items={t.faq}
                titleClassName="text-base md:text-lg font-bold"
                contentClassName="text-sm md:text-base leading-relaxed opacity-85"
              />
            </div>
          </section>

          {/* Section 4 (Now Section 6 at the bottom) */}
        </div>

        {/* bottom overlay fading to background */}
        <div className="absolute bottom-0 left-0 w-full h-37.5 md:h-62.5 lg:h-75 bg-linear-to-t from-white dark:from-[#121212] to-transparent pointer-events-none z-10" />
      </div>
    </>
  );
}
