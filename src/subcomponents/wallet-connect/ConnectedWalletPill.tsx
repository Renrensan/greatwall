"use client";

import Image, { StaticImageData } from "next/image";

export function ConnectedWalletPill({
  icon,
  alt,
  label,
  isMainnet,
  className,
  onClick,
}: {
  icon: StaticImageData;
  alt: string;
  label: string;
  isMainnet: boolean;
  className: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={className}>
      <Image src={icon} alt={alt} width={15} height={15} />
      {label}
      <span className="relative flex h-2 w-2 ml-1">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMainnet ? "bg-green-400" : "bg-orange-400"}`}
        ></span>
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${isMainnet ? "bg-green-500" : "bg-orange-500"}`}
        ></span>
      </span>
    </button>
  );
}
