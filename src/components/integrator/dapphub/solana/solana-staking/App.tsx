"use client";

import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { bgdAppSolana } from "@/index";
import Accordion, { AccordionItemData } from "../../../../../subcomponents/Accordion";
import SolanaStake from "./SolanaStake";

export default function SolanaStakeApp() {
  const { locale } = useParams<{ locale: string }>();

const accordionItems: AccordionItemData[] = useMemo(
    () =>
      (locale === "en"
        ? [
            {
              title: "What is Solana Stake?",
              description: "Staking is the process of participating in a proof-of-stake (PoS) blockchain network by locking up your tokens to support the network's security and operations. In return, you earn rewards in the form of additional tokens.",
            },
            {
              title: "What is the difference between Native and Liquid Staking?",
              description: "Native staking involves locking your SOL directly with a validator. Liquid staking (via Marinade) gives you mSOL in return, allowing you to use your staked assets in other DeFi protocols while still earning rewards.",
            },
            {
              title: "Is my SOL safe?",
              description: "Yes, Paradapp uses a self-custody approach. Your assets remain in your wallet, and you maintain full control over your private keys.",
            },
            {
              title: "How do I earn rewards on USDC?",
              description: "When you stake USDC, it is supplied to Kamino's on-chain lending markets via smart contracts. Borrowers post collateral and pay interest, which generates your yield. An external vault manager actively reallocates this capital across different lending pools to optimize returns based on market demand.",
            },
            {
              title: "Are there risks to staking USDC?",
              description: "Yes. This vault deploys capital on-chain and is not a traditional savings account. You are exposed to strategy risk (yields fluctuate based on lending demand), USDC depeg risk, potential smart contract vulnerabilities, and liquidity risk (unstaking depends on available market liquidity).",
            },
          ]
        : [
            {
              title: "Apa itu Solana Stake?",
              description: "Staking adalah proses berpartisipasi dalam jaringan blockchain proof-of-stake (PoS) dengan mengunci token Anda untuk mendukung keamanan dan operasional jaringan. Sebagai imbalannya, Anda mendapatkan reward dalam bentuk token tambahan.",
            },
            {
              title: "Apa perbedaan antara Native dan Liquid Staking?",
              description: "Native staking melibatkan penguncian SOL Anda langsung dengan validator. Liquid staking (melalui Marinade) memberi Anda mSOL sebagai gantinya, memungkinkan Anda menggunakan aset yang di-stake di protokol DeFi lain sambil tetap mendapatkan reward.",
            },
            {
              title: "Apakah SOL saya aman?",
              description: "Ya, Paradapp menggunakan pendekatan self-custody. Aset Anda tetap berada di dompet Anda, dan Anda mempertahankan kontrol penuh atas private key Anda.",
            },
            {
              title: "Bagaimana cara saya mendapatkan reward di USDC?",
              description: "Saat Anda melakukan stake, USDC Anda disalurkan ke pasar pinjaman on-chain Kamino melalui smart contract. Peminjam memberikan agunan dan membayar bunga, yang kemudian menjadi yield Anda. Manajer vault secara aktif mengalokasikan ulang modal ini di berbagai pool pinjaman untuk mengoptimalkan keuntungan berdasarkan permintaan pasar.",
            },
            {
              title: "Apakah ada risiko dalam melakukan stake USDC?",
              description: "Ya. Vault ini menempatkan modal secara on-chain dan bukan rekening tabungan tradisional. Anda terekspos pada risiko strategi (yield berfluktuasi sesuai permintaan pinjaman), risiko depeg USDC, potensi kerentanan smart contract, dan risiko likuiditas (penarikan bergantung pada ketersediaan likuiditas di pasar saat itu).",
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
              alt="Solana Staking Background"
              fill
              className="object-cover absolute inset-0 z-0"
            />
            <Icon
              icon="oui:line-chart"
              className="bg-transparent w-15 h-15 md:w-25 md:h-25 text-white relative z-10"
            />
          </div>
          <div className="flex flex-col gap-4 flex-1 text-left">
            <p className="text-2xl sm:text-3xl md:text-5xl leading-tight font-bold">
              {locale === "en" ? "Solana Stake" : "Stake Solana"}
            </p>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed">
              {locale === "en"
                ? "Put your crypto to work and earn passive income directly on Solana. Choose between stable USDC yields, secure native staking, or flexible liquid staking to maximize your returns."
                : "Tumbuhkan aset Anda dengan mendapatkan penghasilan pasif langsung di Solana. Pilih antara yield USDC yang stabil, staking native yang aman, atau liquid staking yang fleksibel untuk memaksimalkan keuntungan Anda."}
            </p>
          </div>
        </div>
      </div>

      {/* --- The Core Staking Engine --- */}
      <div className="w-full">
        <SolanaStake hideHeader={true} />
      </div>

      {/* --- FAQ Section --- */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-lg sm:text-2xl font-bold mb-2 p-4">FAQ</h2>
        <Accordion items={accordionItems} />
      </div>
    </div>
  );
}