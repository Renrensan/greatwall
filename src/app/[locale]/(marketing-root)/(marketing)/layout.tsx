
import { logos } from "@/index";
import { socialItems } from "@/marketing-components/footerConfig";
import ConditionalGradualBlur from "@/marketing-components/ConditionalGradualBlur";
import StaggeredMenu from "@/marketing-components/StaggeredMenu";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // These items point at sections that only exist on the About page. Since
  // this layout wraps every marketing route (blog, learn-blockchain, legal
  // pages, ...), each link needs the locale-prefixed /about path so it
  // navigates there first, then scrolls to the section once mounted.
  const menuItems = [
    { label: "Home", ariaLabel: "Home", link: `/${locale}/about#hero` },
    { label: "Core", ariaLabel: "Core", link: `/${locale}/about#capabilities` },
    { label: "Network", ariaLabel: "Network", link: `/${locale}/about#network` },
    { label: "Team", ariaLabel: "Team", link: `/${locale}/about#team` },
    {
      label: "Litepaper",
      ariaLabel: "Litepaper",
      link: "https://drive.google.com/drive/folders/1VT5KCst_nrXDtw0l7Fp29wJGDSEYzfLe",
    },
  ];

  return (
    <>
      <StaggeredMenu
        items={menuItems}
        socialItems={socialItems}
        logoUrl={(logos as any).src || logos}
        logoText="Paradapp"
        isFixed={true}
      />
      <main className="relative min-h-screen overflow-hidden">
        <div className="relative z-10">{children}</div>

        <ConditionalGradualBlur />
      </main>
    </>
  );
}
