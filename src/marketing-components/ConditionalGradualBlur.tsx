"use client";

import { usePathname } from "next/navigation";
import GradualBlur from "@/marketing-components/GradualBlur";

export default function ConditionalGradualBlur() {
  const pathname = usePathname();
  const isStartWithPara = pathname?.includes("/start-with-para");

  if (isStartWithPara) {
    return null;
  }

  return (
    <GradualBlur
      target="page"
      position="bottom"
      height="7rem"
      strength={2}
      divCount={5}
      curve="bezier"
      exponential
      zIndex={10}
      opacity={1}
    />
  );
}
