"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

import Accordion, { AccordionItemData } from "../../../../../subcomponents/Accordion";

import { betaIcon } from "@/index"; 

import SolanaBeta from "./SolanaBeta"; 

export default function SolanaBetaApp() {
  const { locale } = useParams<{ locale: string }>();


  const accordionItems: AccordionItemData[] = useMemo(
    () =>
      (locale === "en"
        ? [
            {
              title: "What is $BETA?",
              description: "BETA is a tokenized portfolio asset designed to simplify long-term wealth preservation and diversified investing through a single on-chain token. Instead of manually managing multiple assets, platforms, and jurisdictions, you can hold or mint $BETA to gain exposure to a structured basket of tokenized equities, commodities, digital assets, and cash allocations.",
            },
            {
              title: "What are the key features of $BETA?",
              description: "BETA provides a diversified multi-asset portfolio within a single token, reducing concentration risk while simplifying portfolio management. You gain direct on-chain access to tokenized U.S. equities, global market indices, and physical gold. It also integrates structured exposure to digital assets like Bitcoin alongside traditional markets, creating a balanced portfolio designed for both growth potential and resilience.",
            },
            {
              title: "How is the portfolio allocated?",
              description: "The current allocation is a transparent 7-asset portfolio designed to balance growth, stability, liquidity, and diversification. It consists of 30% VT for global equities, 15% SPY for U.S. markets, 10% QQQ for tech-focused growth, and 5% IEMG for emerging markets. To balance this, it includes 15% GLD as an inflation hedge, 15% cbBTC for digital asset exposure, and 10% USDC as a cash reserve and liquidity buffer.",
            },
            {
              title: "Is $BETA non-custodial?",
              description: "Yes. BETA is built on Solana, meaning you maintain 100% self-custody of your tokens in your own wallet. You are interacting directly with a transparent smart contract, allowing you to access diversified investments through a simplified and accessible system.",
            },
          ]
        : [
            {
              title: "Apa itu $BETA?",
              description: "BETA adalah aset portofolio yang ditokenisasi untuk menyederhanakan pelestarian kekayaan jangka panjang dan investasi terdiversifikasi melalui satu token on-chain. Daripada mengelola berbagai aset, platform, dan yurisdiksi secara manual, kamu bisa menyimpan atau mencetak $BETA untuk mendapatkan eksposur ke keranjang terstruktur yang berisi alokasi saham, komoditas, aset digital, dan uang tunai.",
            },
            {
              title: "Apa saja fitur utama dari $BETA?",
              description: "BETA memberikan portofolio multi-aset yang terdiversifikasi dalam satu token, sehingga mengurangi risiko konsentrasi sekaligus menyederhanakan manajemen portofolio. Kamu mendapatkan akses on-chain langsung ke saham AS, indeks pasar global, dan emas fisik. BETA juga mengintegrasikan eksposur aset digital seperti Bitcoin di samping pasar tradisional, menciptakan portofolio seimbang yang dirancang untuk potensi pertumbuhan dan ketahanan.",
            },
            {
              title: "Bagaimana alokasi portofolio saat ini?",
              description: "Alokasi saat ini adalah portofolio 7 aset transparan yang dirancang untuk menyeimbangkan pertumbuhan, stabilitas, likuiditas, dan diversifikasi. Komposisinya terdiri dari 30% VT untuk saham global, 15% SPY untuk pasar AS, 10% QQQ untuk pertumbuhan teknologi, dan 5% IEMG untuk pasar berkembang. Sebagai penyeimbang, portofolio ini juga mencakup 15% GLD sebagai lindung nilai inflasi, 15% cbBTC untuk eksposur aset digital, dan 10% USDC sebagai cadangan kas serta penyangga likuiditas.",
            },
            {
              title: "Apakah $BETA bersifat non-kustodial?",
              description: "Ya. BETA dibangun di jaringan Solana, yang berarti kamu memegang kendali penuh (100% self-custody) atas token di wallet kamu sendiri. Kamu berinteraksi langsung dengan smart contract yang transparan, memungkinkan kamu mengakses investasi yang terdiversifikasi melalui sistem yang praktis dan sangat mudah diakses.",
            },
          ]
      ).map((item) => ({
        title: item.title,
        description: item.description,
      })),
    [locale],
  );

  return (
    <div className="flex flex-col gap-6 w-full font-sans pb-32">
      
    
      <div className="relative z-10 p-0">
        <div className="flex flex-col items-start md:flex-row md:justify-between gap-6 md:items-center">
          <div className="w-30 h-30 md:w-50 md:h-50 shrink-0 flex items-center justify-center glass-card shadow rounded-full border-black/10 order-first md:order-last relative overflow-hidden">
            <Image
              src={betaIcon}
              alt="BETA Background"
              fill
              className="bg-transparent w-10 h-10 md:w-10 md:h-10 text-white relative z-10 p-10 object-contain"
            />
          </div>
          <div className="flex flex-col gap-4 flex-1 text-left ">
            <p className="text-2xl sm:text-3xl md:text-5xl leading-tight font-bold">
              {locale === "en" ? "Paradapp BETA" : "BETA Paradapp"}
            </p>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed">
              {locale === "en"
                ? "Stop chasing Alpha. Own global economy. BETA is a multi-asset class index token holding a verifiable basket of worldwide equities, Bitcoin, and gold."
                : "Berhenti mengejar Alpha. Miliki ekonomi global. BETA adalah token indeks multi-aset dengan portofolio terverifikasi yang berisi saham global, Bitcoin, dan emas."}
            </p>
          </div>
        </div>
      </div>


      <div className="w-full">
        <SolanaBeta hideHeader={true} /> 
      </div>

      <div className="glass-card rounded-2xl p-4 mt-2">
        <h2 className="text-lg sm:text-2xl font-bold mb-2 p-4">FAQ</h2>
        <Accordion items={accordionItems} />
      </div>
      
    </div>
  );
}