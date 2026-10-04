"use client";

// Greatwall's footer: social links and the copyright on the left, the
// reading links on the right; stacked on phones.

import Link from "next/link";
import { FaLinkedin, FaXTwitter, FaYoutube } from "react-icons/fa6";

// The pages these open are not published yet: set their addresses here.
const SOCIAL = [
  { label: "X", href: "#", icon: FaXTwitter },
  { label: "LinkedIn", href: "#", icon: FaLinkedin },
  { label: "YouTube", href: "#", icon: FaYoutube },
];

const LINKS = [
  { label: "Knowledge Base", href: "#" },
  { label: "Documentation", href: "#" },
  { label: "Term of Use", href: "#" },
  { label: "Privacy Policy", href: "#" },
];

export default function Footer() {
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
          {LINKS.map(({ label, href }) => (
            <Link key={label} href={href} className="text-[15px] text-snow transition-opacity hover:opacity-70">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
