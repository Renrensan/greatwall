"use client";

// The About page sits outside any network (/en/about): its own menu and
// footer, none of the app's navbar. Every way into the app from here asks
// which network to start on (NetworkChooser).

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import StaggeredMenu, { type StaggeredMenuItem } from "@/components/StaggeredMenu";
import SmoothScroll from "@/components/SmoothScroll";
import { LaunchProvider, useLaunch } from "@/components/NetworkChooser";
import greatwallLogo from "@/assets/logo/greatwall-logo-with-name.svg";

const SOCIAL_ITEMS = [
  { label: "X", link: "https://x.com/greatwallfi" },
  { label: "Telegram", link: "https://t.me/greatwallfinance" },
  { label: "YouTube", link: "https://www.youtube.com/@greatwallfinance" },
];

function Menu() {
  const t = useTranslations("All");
  const launch = useLaunch();
  const { locale = "en" } = useParams<{ locale?: string }>();
  const items: StaggeredMenuItem[] = [
    ...[
      { label: t("navExplore"), path: "/index" },
      { label: t("navCreate"), path: "/index/create" },
      { label: t("navPortfolio"), path: "/vault/assets" },
      { label: t("navConvert"), path: "/convert/create" },
      { label: t("navProtocol"), path: "/explorer" },
    ].map(({ label, path }) => ({ label, ariaLabel: label, link: "#", onClick: () => launch(path) })),
    { label: t("navDocs"), ariaLabel: t("navDocs"), link: `/${locale}/docs` },
  ];

  return (
    <StaggeredMenu
      isFixed
      position="right"
      items={items}
      socialItems={SOCIAL_ITEMS}
      displayItemNumbering={false}
      logoUrl={greatwallLogo.src}
      colors={["#EFECE5", "#FBF9F1"]}
      menuButtonColor="#ffffff"
      blendDifference
      introAnimation
      openMenuButtonColor="#181818"
      accentColor="#2F2C25"
    />
  );
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <LaunchProvider>
      <SmoothScroll />
      <Menu />
      {/* The sections cancel this side margin themselves (-mx-4), as they did inside the app's layout. */}
      <div className="mx-4">{children}</div>
    </LaunchProvider>
  );
}
