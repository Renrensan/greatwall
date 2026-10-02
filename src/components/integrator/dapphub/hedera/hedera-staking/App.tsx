"use client";

import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { bgdAppHedera } from "@/index";
import Accordion, { AccordionItemData } from "../../../../../subcomponents/Accordion";
import HederaStaking from "./HederaStaking";

export default function HederaStakeApp() {
  const { locale } = useParams<{ locale: string }>();

  const accordionItems: AccordionItemData[] = useMemo(
    () =>
      (locale === "en"
        ? [
            {
              title: "What is Hedera Staking?",
              description:
                "Staking is the process of delegating your HBAR to a network node to help secure Hedera's consensus. In return, you earn daily rewards without ever losing custody or liquidity of your HBAR.",
            },
            {
              title: "Do I need to lock up my HBAR?",
              description:
                "No. Hedera staking has zero lock-up periods, your HBAR remains fully liquid and spendable at any time, even while staked.",
            },
            {
              title: "Is my HBAR safe?",
              description:
                "Yes, Paradapp uses a self-custody approach. Your assets remain in your wallet, and you maintain full control over your private keys, staking only delegates, it never transfers ownership.",
            },
            {
              title: "How are rewards paid out?",
              description:
                "Rewards accrue automatically and are added to your balance whenever your account performs a transaction. You can also use 'Claim' to deposit any pending reward immediately.",
            },
            {
              title: "Can I switch nodes or unstake anytime?",
              description:
                "Yes, you can change your selected node or unstake freely at any time. It may take up to 48 hours for staking rewards to begin after you first stake or switch nodes.",
            },
          ]
        : [
            {
              title: "Apa itu Staking Hedera?",
              description:
                "Staking adalah proses mendelegasikan HBAR Kamu ke node jaringan untuk membantu mengamankan konsensus Hedera. Sebagai imbalannya, Kamu mendapatkan reward harian tanpa pernah kehilangan kepemilikan atau likuiditas HBAR Kamu.",
            },
            {
              title: "Apakah HBAR saya perlu dikunci?",
              description:
                "Tidak. Staking Hedera tanpa masa penguncian, HBAR Kamu tetap sepenuhnya likuid dan dapat digunakan kapan saja, bahkan saat sedang di-stake.",
            },
            {
              title: "Apakah HBAR saya aman?",
              description:
                "Ya, Paradapp menggunakan pendekatan self-custody. Aset Kamu tetap berada di dompet Kamu, dan Kamu mempertahankan kontrol penuh atas private key Kamu, staking hanya mendelegasikan, tidak pernah memindahkan kepemilikan.",
            },
            {
              title: "Bagaimana reward dibayarkan?",
              description:
                "Reward terkumpul secara otomatis dan ditambahkan ke saldo Kamu setiap kali akun Kamu melakukan transaksi. Kamu juga bisa menggunakan 'Klaim' untuk langsung mendapatkan reward yang tertunda.",
            },
            {
              title: "Bisakah saya ganti node atau unstake kapan saja?",
              description:
                "Ya, Kamu dapat mengganti node pilihan atau melakukan unstake secara bebas kapan saja. Reward staking mungkin butuh waktu hingga 48 jam untuk mulai setelah pertama kali stake atau berpindah node.",
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
              src={bgdAppHedera}
              alt="Hedera Staking Background"
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
              {locale === "en" ? "Hedera Stake" : "Stake Hedera"}
            </p>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed">
              {locale === "en"
                ? "Put your HBAR to work and earn daily passive rewards directly on Hedera. Zero lock-up periods keep your assets fully liquid while you help secure the network."
                : "Tumbuhkan HBAR Kamu dengan mendapatkan reward pasif harian langsung di Hedera. Tanpa masa penguncian menjaga aset Kamu tetap likuid sambil membantu mengamankan jaringan."}
            </p>
          </div>
        </div>
      </div>

      {/* --- The Core Staking Engine --- */}
      <div className="w-full">
        <HederaStaking hideHeader={true} />
      </div>

      {/* --- FAQ Section --- */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-lg sm:text-2xl font-bold mb-2 p-4">FAQ</h2>
        <Accordion items={accordionItems} />
      </div>
    </div>
  );
}
