"use client";

export function BrandPulseLoader({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[9998] pointer-events-none transition-opacity duration-300 ${className}`}
    />
  );
}
