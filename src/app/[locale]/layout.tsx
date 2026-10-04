import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ReactQueryProvider } from "src/app/react-query-provider";
import { GoogleAnalytics } from "@next/third-parties/google";
import FrameGuard from "@/components/ui/FrameGuard";
import NextTopLoader from "nextjs-toploader";
import localFont from "next/font/local";
import "../globals.css";

// The TASA fonts are bundled (src/assets/fonts, SIL Open Font License), so a
// build never depends on reaching Google Fonts. Both are variable: 400 to 800.

// Headlines and the wordmark.
const explorer = localFont({
  src: "../../assets/fonts/TASAExplorer-Variable.ttf",
  weight: "400 800",
  variable: "--font-tasa-explorer",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Everything read.
const orbiter = localFont({
  src: "../../assets/fonts/TASAOrbiter-Variable.ttf",
  weight: "400 800",
  variable: "--font-tasa-orbiter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Greatwall",
  description:
    "Greatwall: convert, move and basket coins across networks, settled on Bitcoin through the iPoW protocol.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} className={`${explorer.variable} ${orbiter.variable}`} suppressHydrationWarning>
      <body className="font-orbiter antialiased bg-paper text-ink">
        <NextTopLoader
          showSpinner={false}
          crawl={true}
          crawlSpeed={200}
          height={3}
          speed={200}
          zIndex={99999}
        />
        <FrameGuard />
        <NextIntlClientProvider>
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>
        </NextIntlClientProvider>
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
      </body>
    </html>
  );
}
