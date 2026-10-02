"use client";

import { ReactNode } from "react";

export function ConnectingButton({
  label,
  className,
}: {
  label: ReactNode;
  className: string;
}) {
  return (
    <button disabled className={className}>
      {label}
      <span className="animate-spin h-2 w-2 border-2 border-white border-t-transparent rounded-full"></span>
    </button>
  );
}
