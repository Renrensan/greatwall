"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import StaggeredMenu from "@/components/StaggeredMenu";
import greatwallLogo from "@/assets/logo/greatwall-logo-with-name.svg";

const SOCIAL_ITEMS = [
  { label: "X", link: "https://x.com/greatwallfi" },
  { label: "Telegram", link: "https://t.me/greatwallfinance" },
  { label: "YouTube", link: "https://www.youtube.com/@greatwallfinance" },
];

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  const { locale, network } = useParams<{ locale: string; network: string }>();
  const t = useTranslations("All");
  const base = `/${locale}/${network}`;

  const items = [
    { label: t("navExplore"), link: `${base}/index` },
    { label: t("navCreate"), link: `${base}/index/create` },
    { label: t("navPortfolio"), link: `${base}/vault/assets` },
    { label: t("navConvert"), link: `${base}/convert/create` },
    { label: t("navProtocol"), link: `${base}/protocol` },
  ].map((item) => ({ ...item, ariaLabel: item.label }));

  return (
    <>
      <StaggeredMenu
        isFixed
        position="right"
        items={items}
        socialItems={SOCIAL_ITEMS}
        displayItemNumbering={false}
        logoUrl={greatwallLogo.src}
        colors={["#EFECE5", "#FBF9F1"]}
        menuButtonColor="#181818"
        openMenuButtonColor="#181818"
        accentColor="#2F2C25"
      />
      {children}
    </>
  );
}
