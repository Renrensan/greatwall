"use client";

// The pages that belong to no network (/en/docs, /en/terms, /en/privacy,
// /en/cookies): Greatwall's logo, a Launch App that asks for a network
// (NetworkChooser), and the footer. None of the app's navbar.

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

import Footer from "@/subcomponents/Footer";
import { LaunchProvider, useLaunch } from "@/components/NetworkChooser";
import { greatwallLogo } from "@/index";

function Header() {
  const { locale = "en" } = useParams<{ locale?: string }>();
  const launch = useLaunch();
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 md:px-16">
        <Link href={`/${locale}/about`} aria-label="Greatwall">
          <Image src={greatwallLogo} alt="Greatwall" className="h-7 w-auto" priority />
        </Link>
        <button type="button" onClick={() => launch("/index")} className="gw-wallet-btn">
          Launch App
        </button>
      </div>
    </header>
  );
}

export default function GeneralLayout({ children }: { children: React.ReactNode }) {
  return (
    <LaunchProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="h-16" />
        <main className="mx-4 grow">{children}</main>
        <Footer />
      </div>
    </LaunchProvider>
  );
}
