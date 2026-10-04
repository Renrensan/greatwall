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
      className="gw-row"
    >
      <div className="flex items-center gap-3">
        <Image src={icon} alt="" className="w-6 h-6 object-contain shrink-0 rounded" />
        <p>{name}</p>
        {detected && detectedLabel && (
          <span className="text-xs opacity-60 ml-auto">{detectedLabel}</span>
        )}
        {!detected && actionLabel && (
          <span className="text-xs opacity-60 ml-auto">{actionLabel}</span>
        )}
      </div>
    </button>
  );
}
