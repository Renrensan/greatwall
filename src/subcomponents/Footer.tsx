"use client";

// Greatwall's footer: social links and the copyright on the left, the
// reading links on the right; stacked on phones.

import Link from "next/link";
import { useParams } from "next/navigation";
import { FaTelegram, FaXTwitter, FaYoutube } from "react-icons/fa6";

export const SOCIAL = [
  { label: "X", href: "https://x.com/greatwallfi", icon: FaXTwitter },
  { label: "Telegram", href: "https://t.me/greatwallfinance", icon: FaTelegram },
  { label: "YouTube", href: "https://www.youtube.com/@greatwallfinance", icon: FaYoutube },
];

// The footer's page links: general pages, under no network.
export const LINKS = (base: string) => [
  { label: "Documentation", href: `${base}/docs` },
  { label: "About", href: `${base}/about` },
  { label: "Terms of Use", href: `${base}/terms` },
  { label: "Privacy Policy", href: `${base}/privacy` },
  { label: "Cookies Policy", href: `${base}/cookies` },
];

export default function Footer() {
  const { locale = "en" } = useParams<{ locale?: string }>();
  return (
    <footer className="w-full bg-ink text-snow">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-16 md:py-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            {SOCIAL.map(({ label, href, icon: Icon }) => (
              <a key={label} href={href} aria-label={label} target="_blank" rel="noreferrer" className="text-snow transition-opacity hover:opacity-70">
                <Icon className="text-[20px]" />
              </a>
            ))}
          </div>
          <p className="text-xs text-snow/85">© {new Date().getFullYear()} Greatwall.finance. All rights reserved.</p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-3">
          {LINKS(`/${locale}`).map(({ label, href }) => (
            <Link key={label} href={href} className="text-[15px] text-snow transition-opacity hover:opacity-70">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
