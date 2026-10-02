"use client";

import { usePathname } from "next/navigation";
import FooterMarketing from "@/marketing-components/FooterMarketing";

export default function ConditionalFooter({
  locale,
  socialItems,
}: {
  locale: string;
  socialItems: any[];
}) {
  const pathname = usePathname();
  const isStartWithPara = pathname?.includes("/start-with-para");

  if (isStartWithPara) {
    return null;
  }

  return <FooterMarketing locale={locale} socialItems={socialItems} />;
}
