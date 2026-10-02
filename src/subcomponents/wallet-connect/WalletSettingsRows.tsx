"use client";

import { ReactNode } from "react";
import { IoPulseOutline } from "react-icons/io5";

export function NetworkStatusCard({
  label,
  isMainnet,
  borderClassName,
  pulse = true,
}: {
  label: string;
  isMainnet: boolean;
  borderClassName: string;
  /** Bitcoin's status dot is static (no testnet mode); everyone else pulses. */
  pulse?: boolean;
}) {
  return (
    <div
      className={`w-full p-3 rounded-xl border ${borderClassName} bgBox glass-card opacity-80 flex items-center justify-between`}
    >
      <div className="flex items-center gap-2">
        <IoPulseOutline
          className={`text-[16px] ${isMainnet ? "text-green-500" : "text-orange-500"}`}
        />
        <p className="font-bold text-sm">{label}</p>
      </div>
      {pulse ? (
        <span className="relative flex h-2 w-2 ml-1">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMainnet ? "bg-green-400" : "bg-orange-400"}`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${isMainnet ? "bg-green-500" : "bg-orange-500"}`}
          ></span>
        </span>
      ) : (
        <span
          className={`h-2 w-2 rounded-full ${isMainnet ? "bg-green-500" : "bg-orange-500"}`}
        />
      )}
    </div>
  );
}

export function SettingsRow({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full p-3 border border-black/5 dark:border-white/10 rounded-xl bgBox glass-card hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3"
    >
      {icon}
      <p className="font-bold text-sm">{label}</p>
    </button>
  );
}
