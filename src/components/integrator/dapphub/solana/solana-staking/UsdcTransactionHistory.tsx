"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import { usdc } from "@/index";

export type TransactionHistoryEntry = {
  date: string;
  instruction: string;
  tokenAmount: number;
  usdValue: number;
  transaction: string;
};

export default function UsdcTransactionHistory({
  history,
  isLoading,
  locale,
  networkExplorer,
}: {
  history: TransactionHistoryEntry[];
  isLoading: boolean;
  locale: string;
  networkExplorer?: any;
}) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const localeTag = locale === "en" ? "en-US" : "id-ID";

  const instructionLabel = (instruction: string) => {
    const isDeposit = instruction.toLowerCase().includes("deposit");
    if (locale === "en") return isDeposit ? "Deposit" : "Withdraw";
    return isDeposit ? "Setor" : "Tarik";
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
        <div className="h-5 w-40 bg-black/10 dark:bg-white/10 rounded animate-pulse" />
        <div className="h-24 w-full bg-black/5 dark:bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
      <h3 className="font-bold text-base sm:text-lg">
        {locale === "en" ? "Transaction History" : "Riwayat Transaksi"}
      </h3>

      <div className="flex flex-col">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide opacity-40 border-b border-black/5 dark:border-white/10 pb-2">
          <span className="flex-1">{locale === "en" ? "Date" : "Tanggal"}</span>
          <span className="flex-1">{locale === "en" ? "Type" : "Tipe"}</span>
          <span className="flex-1 text-right sm:text-left">
            {locale === "en" ? "Balance" : "Saldo"}
          </span>
          <span className="flex-1 text-right hidden sm:block">
            {locale === "en" ? "Est. value" : "Est. Nilai"}
          </span>
        </div>

        {sorted.length === 0 ? (
          <p className="text-xs opacity-40 py-6 text-center">
            {locale === "en" ? "No transactions yet" : "Belum ada transaksi"}
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
          {sorted.map((tx, i) => {
            const isDeposit = tx.instruction.toLowerCase().includes("deposit");
            const dateObj = new Date(tx.date);
            const explorerUrl = networkExplorer?.transaction
              ? `${networkExplorer.transaction}${tx.transaction}${networkExplorer.urlSuffix || ""}`
              : undefined;

            const row = (
              <div className="flex items-center justify-between text-sm py-3 border-b border-black/5 dark:border-white/5 last:border-none">
                <span className="flex-1 flex flex-col leading-tight">
                  <span className="font-bold">
                    {dateObj.toLocaleDateString(localeTag, {
                      month: "numeric",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[11px] opacity-50">
                    {dateObj.toLocaleTimeString(localeTag, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <span className="flex-1 flex items-center gap-1.5 font-bold">
                  <Icon
                    icon={isDeposit ? "solar:arrow-left-down-linear" : "solar:arrow-right-up-linear"}
                    className={isDeposit ? "text-green-500" : "text-red-500"}
                  />
                  {instructionLabel(tx.instruction)}
                </span>
                <span className="flex-1 flex items-center gap-1.5 justify-end sm:justify-start font-mono">
                  <div className="relative w-4 h-4 shrink-0">
                    <Image src={usdc} alt="USDC" fill className="rounded-full object-contain" />
                  </div>
                  {tx.tokenAmount.toFixed(2)}
                </span>
                <span className="flex-1 text-right font-mono hidden sm:block">
                  ${tx.usdValue.toFixed(2)}
                </span>
              </div>
            );

            return explorerUrl ? (
              <a
                key={tx.transaction}
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors -mx-2 px-2"
              >
                {row}
              </a>
            ) : (
              <div key={tx.transaction}>{row}</div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}
