import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ReactQueryProvider } from "src/app/react-query-provider";
import { GoogleAnalytics } from "@next/third-parties/google";
import FrameGuard from "@/components/ui/FrameGuard";
import BgComponent from "@/subcomponents/BgComponent";
import NextTopLoader from "nextjs-toploader";
import { Space_Grotesk } from "next/font/google";
import { greatwallFontClassNames } from "@/lib/greatwall-fonts";
import "../globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Paradapp",
  description:
    "Paradapp is built on a parallel architecture that connects real-word to blockchain, blockchain to blockchain, Artificial Intelligent, and dApps into one unified experience.",
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
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${greatwallFontClassNames}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preload" href="/assets/black.webm" as="video" type="video/webm" />
        <link rel="preload" href="/assets/white.webm" as="video" type="video/webm" />
      </head>
      <body className="font-grotesk antialiased bg-white dark:bg-[#0a0a0a] text-black dark:text-white">
        <NextTopLoader
          showSpinner={false}
          crawl={true}
          crawlSpeed={200}
          height={3}
          speed={200}
          zIndex={99999}
        />
        <FrameGuard />
        <ThemeProvider
          attribute="class" // adds .dark to <html>
          defaultTheme="system" // light | dark | system
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <ReactQueryProvider>
              {children}
              <div className="fixed inset-0 -z-20 pointer-events-none">
                <BgComponent />
              </div>
            </ReactQueryProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
      </body>
    </html>
  );
}
