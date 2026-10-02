"use client";

import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Accordion, { AccordionItemData } from "../../../../../subcomponents/Accordion";
import SolanaSwap from "./SolanaSwap"; 
import { bgdAppSolana } from "@/index";

export default function SolanaSwapApp() {
  const { locale } = useParams<{ locale: string }>();

  const accordionItems: AccordionItemData[] = useMemo(
    () =>
      (locale === "en"
        ? [
            {
              title: "What is a Token Swap?",
              description: "A token swap allows you to instantly trade one cryptocurrency for another directly on the blockchain without needing a centralized exchange.",
            },
            {
              title: "How does Paradapp find the best rates?",
              description: "We integrate with Jupiter Aggregator, which scans all decentralized exchanges (DEXs) on Solana to find the most efficient route and best price for your trade.",
            },
            {
              title: "What is 'Ultra Fast' mode?",
              description: "Ultra Fast mode automatically adjusts priority fees to ensure your transaction is processed as quickly as possible, especially during high network activity.",
            },
            {
              title: "Are there any fees?",
              description: "Paradapp provides the swap service with minimal network fees. The exact amount depends on the Solana network congestion and the specific tokens being traded.",
            },
          ]
        : [
            {
              title: "Apa itu Token Swap?",
              description: "Token swap memungkinkan Anda menukar satu mata uang kripto dengan yang lain secara instan langsung di blockchain tanpa perlu bursa terpusat.",
            },
            {
              title: "Bagaimana Paradapp menemukan harga terbaik?",
              description: "Kami berintegrasi dengan Jupiter Aggregator, yang memindai semua bursa terdesentralisasi (DEX) di Solana untuk menemukan rute paling efisien dan harga terbaik untuk perdagangan Anda.",
            },
            {
              title: "Apa itu mode 'Sangat Cepat'?",
              description: "Mode Sangat Cepat secara otomatis menyesuaikan biaya prioritas untuk memastikan transaksi Anda diproses sesegera mungkin, terutama selama aktivitas jaringan yang tinggi.",
            },
            {
              title: "Apakah ada biaya?",
              description: "Paradapp menyediakan layanan swap dengan biaya jaringan minimal. Jumlah pastinya bergantung pada kemacetan jaringan Solana dan token spesifik yang diperdagangkan.",
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
              alt="Solana Swap Background"
              fill
              className="object-cover absolute inset-0 z-0"
            />
            <Icon
              icon="iconamoon:swap-light"
              className={`bg-transparent w-15 h-15 md:w-25 md:h-25 text-white relative z-10`}
            />
          </div>
          <div className="flex flex-col gap-4 flex-1 text-left ">
            <p className="text-2xl sm:text-3xl md:text-5xl leading-tight font-bold">
              {locale === "en" ? "Solana Swap" : "Tukar Solana"}
            </p>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed">
              {locale === "en"
                ? "Swap tokens instantly with the best rates across the Solana ecosystem. Powered by Jupiter Aggregator for lightning-fast and secure trading."
                : "Tukar token secara instan dengan harga terbaik di seluruh ekosistem Solana. Didukung oleh Jupiter Aggregator untuk perdagangan yang cepat dan aman."}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <SolanaSwap hideHeader={true} /> 
      </div>

      <div className="glass-card rounded-2xl p-4 mt-2">
        <h2 className="text-lg sm:text-2xl font-bold mb-2 p-4">FAQ</h2>
        <Accordion items={accordionItems} />
      </div>
      
    </div>
  );
}