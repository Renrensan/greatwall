"use client";

import { ReactNode } from "react";
import { IoPulseOutline } from "react-icons/io5";

export function NetworkStatusCard({
  label,
  testnet = true,
  pulse = true,
}: {
  label: string;
  /** Orange for a test network; green for Bitcoin, the one real network. */
  testnet?: boolean;
  /** Bitcoin's status dot is static; everyone else pulses. */
  pulse?: boolean;
}) {
  return (
    <div
      className="w-full px-4 py-3 rounded-md bg-ink text-snow flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <IoPulseOutline
          className={`text-[16px] ${testnet ? "text-orange-500" : "text-green-500"}`}
        />
        <p className="font-bold text-sm">{label}</p>
      </div>
      {pulse ? (
        <span className="relative flex h-2 w-2 ml-1">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${testnet ? "bg-orange-400" : "bg-green-400"}`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${testnet ? "bg-orange-500" : "bg-green-500"}`}
          ></span>
        </span>
      ) : (
        <span
          className={`h-2 w-2 rounded-full ${testnet ? "bg-orange-500" : "bg-green-500"}`}
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
      className="gw-row"
    >
      {icon}
      <p>{label}</p>
    </button>
  );
}
