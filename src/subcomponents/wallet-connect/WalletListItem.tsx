"use client";

import Image, { StaticImageData } from "next/image";

export function WalletListItem({
  icon,
  name,
  detected,
  detectedLabel,
  actionLabel,
  disabled,
  onClick,
}: {
  icon: StaticImageData;
  name: string;
  detected?: boolean;
  detectedLabel?: string;
  /** Shown on the right instead of `detectedLabel` when the wallet isn't detected — e.g.
   * "Install" / "Get the app" — to turn an otherwise dead-end row into an actionable one. */
  actionLabel?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-3 border border-black/5 dark:border-white/10 rounded-xl bgBox glass-card ${
        disabled ? "cursor-default opacity-50" : "cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <Image src={icon} alt={name} className="w-8 h-8 object-contain shrink-0" />
        <p className="font-bold text-sm">{name}</p>
        {detected && detectedLabel && (
          <span className="text-[10px] opacity-50 ml-auto">{detectedLabel}</span>
        )}
        {!detected && actionLabel && (
          <span className="text-[10px] opacity-50 ml-auto">{actionLabel}</span>
        )}
      </div>
    </button>
  );
}
