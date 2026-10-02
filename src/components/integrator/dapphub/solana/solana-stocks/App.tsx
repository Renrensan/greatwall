"use client";

import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Accordion, { AccordionItemData } from "../../../../../subcomponents/Accordion";
import { bgdAppSolana } from "@/index"; 
import SolanaStock from "./SolanaStocks";

export default function SolanaStocksApp() {
  const { locale } = useParams<{ locale: string }>();

  const accordionItems: AccordionItemData[] = useMemo(
    () =>
      (locale === "en"
        ? [
            {
              title: "What are Tokenized Stocks?",
              description: "Tokenized stocks are digital assets on the Solana blockchain that represent real-world shares of US companies.",
            },
            {
              title: "How is the price determined?",
              description: "The price of tokenized stocks tracks the real-time market price of the underlying US stock, though small differences may occur due to liquidity on-chain.",
            },
            {
              title: "Can I trade stocks when the US market is closed?",
              description: "Yes, one of the main advantages of tokenized stocks on Solana is that they can be traded 24/7, even when traditional stock exchanges are closed.",
            },
            {
              title: "Is fractional ownership possible?",
              description: "Absolutely. You can buy as little as a fraction of a share, making it accessible to invest in high-priced stocks with any amount of capital.",
            },
          ]
        : [
            {
              title: "Apa itu Saham Tokenisasi?",
              description: "Saham tokenisasi adalah aset digital di blockchain Solana yang mewakili saham dunia nyata dari perusahaan-perusahaan AS.",
            },
            {
              title: "Bagaimana harga ditentukan?",
              description: "Harga saham tokenisasi mengikuti harga pasar waktu nyata dari saham AS yang mendasarinya, meskipun perbedaan kecil dapat terjadi karena likuiditas on-chain.",
            },
            {
              title: "Dapatkah saya memperdagangkan saham saat pasar AS tutup?",
              description: "Ya, salah satu keuntungan utama dari saham tokenisasi di Solana adalah mereka dapat diperdagangkan 24/7, bahkan saat bursa saham tradisional tutup.",
            },
            {
              title: "Apakah kepemilikan fraksional dimungkinkan?",
              description: "Tentu saja. Anda dapat membeli hanya sebagian kecil dari satu saham, menjadikannya dapat diakses untuk berinvestasi di saham berharga tinggi dengan modal berapa pun.",
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
              src={bgdAppSolana}
              alt="US Stocks Background"
              fill
              className="object-cover absolute inset-0 z-0"
            />
            <Icon
              icon="oui:line-chart"
              className={`bg-transparent w-15 h-15 md:w-25 md:h-25 text-white relative z-10`}
            />
          </div>
          <div className="flex flex-col gap-4 flex-1 text-left ">
            <p className="text-2xl sm:text-3xl md:text-5xl leading-tight font-bold">
              {locale === "en" ? "US Stocks" : "Saham AS"}
            </p>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed">
              {locale === "en"
                ? "Access the US stock market directly on Solana. Tokenize your favorite stocks and trade them 24/7 with instant settlement and fractional ownership."
                : "Akses pasar saham AS langsung di Solana. Tokenisasi saham favorit Anda dan perdagangkan 24/7 dengan penyelesaian instan dan kepemilikan fraksional."}
            </p>
          </div>
        </div>
      </div>

      {/* --- 2. The Core Solana Stock Engine --- */}
      {/* Just mount it here! Zero rewriting needed. */}
      <div className="w-full">
        <SolanaStock hideHeader={true}/> 
      </div>

      {/* --- 3. FAQ Section --- */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-lg sm:text-2xl font-bold mb-2 p-4">FAQ</h2>
        <Accordion items={accordionItems} />
      </div>
      
    </div>
  );
}