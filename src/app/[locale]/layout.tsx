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

// The fonts are bundled (src/assets/fonts, SIL Open Font License), so a
// build never depends on reaching Google Fonts. Greatwall's brand: Instrument
// Serif for headlines and hierarchy, BDO Grotesk for body and UI copy.

// Headlines: Instrument Serif (Google Fonts' files, regular and italic).
const serif = localFont({
  src: [
    { path: "../../assets/fonts/InstrumentSerif-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../assets/fonts/InstrumentSerif-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

// The wordmark's text ("Greatwall" beside the mark): Instrument Sans, semibold.
const wordmark = localFont({
  src: "../../assets/fonts/InstrumentSans-Variable.ttf",
  weight: "400 700",
  variable: "--font-instrument-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Body and UI: BDO Grotesk, self-hosted (src/assets/fonts/bdo-grotesk).
const sans = localFont({
  src: [
    { path: "../../assets/fonts/bdo-grotesk/BDOGrotesk-Light.woff2", weight: "300", style: "normal" },
    { path: "../../assets/fonts/bdo-grotesk/BDOGrotesk-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../assets/fonts/bdo-grotesk/BDOGrotesk-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../assets/fonts/bdo-grotesk/BDOGrotesk-DemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../assets/fonts/bdo-grotesk/BDOGrotesk-Bold.woff2", weight: "700", style: "normal" },
    { path: "../../assets/fonts/bdo-grotesk/BDOGrotesk-ExtraBold.woff2", weight: "800", style: "normal" },
    { path: "../../assets/fonts/bdo-grotesk/BDOGrotesk-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-sans-body",
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
    <html lang={locale} className={`${serif.variable} ${sans.variable} ${wordmark.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-cream text-ink">
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
