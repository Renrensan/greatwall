"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logos } from "@/index";
import DecryptedText from "@/marketing-components/DecryptedText";
import {  useRouter } from 'next/navigation'
import { DEFAULT_CHAIN, getPreferredChain, type SupportedChain } from "@/app/network-provider";


interface FooterMarketingSocialItem {
  label: string;
  link: string;
}

interface FooterMarketingProps {
  locale: string;
  socialItems?: FooterMarketingSocialItem[];
}

export default function FooterMarketing({ locale, socialItems = [] }: FooterMarketingProps) {
  // Seeded with DEFAULT_CHAIN (matching the server's typeof-window-undefined fallback) so
  // the first client render matches the SSR HTML exactly; corrected from localStorage only
  // after mount, avoiding the hydration mismatch that calling getPreferredChain() directly
  // during render would cause once a user has a non-default chain saved.
  const [chain, setChain] = useState<SupportedChain>(DEFAULT_CHAIN);

  useEffect(() => {
    setChain(getPreferredChain());
  }, []);

  return (
    <footer className="w-full bg-white dark:bg-[#111] text-black dark:text-white py-16 px-8 md:px-16 border-t border-black/5 dark:border-white/5 relative z-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 ">
        {/* Left side: Logo and Copyright */}
        <div className="flex flex-col gap-4 min-w-[200px] ">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img
              src={(logos as any).src || logos}
              alt="Logo"
              className="h-8 w-auto "
            />
            <span className="text-2xl font-bold tracking-tight">Paradapp</span>
          </Link>
          <p className="text-sm text-secondary dark:text-gray-500 mt-2">
            @ 2026 Paradapp, Inc.
            <br />
            All rights reserved.
          </p>
        </div>

        {/* Right side: Links Grid */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-16 justify-items-start max-w-[900px] ">
          {/* Products Column */}
          <div className="flex flex-col gap-6">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
              Products
            </h4>
            <ul className="flex flex-col gap-4">
              <li>
                <Link
                 href={`/${locale}/${chain}/vault/buy`}
                  className="text-sm text-secondary dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-block min-w-[140px]"
                >
                  <DecryptedText
                    text="Self-Custody"
                    animateOn="hover"
                    sequential={true}
                    revealDirection="start"
                    speed={60}
                    maxIterations={10}
                  />
                </Link>
              </li>
              <li>
                <Link
  href={`/${locale}/${chain}/convert/create`}
  className="text-sm text-secondary dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-block min-w-[140px]"
>
                  <DecryptedText
                    text="Cross-Chain Convert"
                    animateOn="hover"
                    sequential={true}
                    revealDirection="start"
                    speed={60}
                    maxIterations={10}
                  />
                </Link>
              </li>
              <li>
                <Link
 href={`/${locale}/${chain}/dapphub/trending`}
  className="text-sm text-secondary dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-block min-w-[140px]"
>
                  <DecryptedText
                    text="dApp Hub"
                    animateOn="hover"
                    sequential={true}
                    revealDirection="start"
                    speed={60}
                    maxIterations={10}
                  />
                </Link>
              </li>
              <li>
               <Link
  href={`/${locale}/${chain}/vault/buy`}
  className="text-sm text-secondary dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-block min-w-[80px]"
>
                  <DecryptedText
                    text="Para AI"
                    animateOn="hover"
                    sequential={true}
                    revealDirection="start"
                    speed={60}
                    maxIterations={10}
                  />
                </Link>
              </li>
            </ul>
          </div>

          {/* Explore Column */}
          <div className="flex flex-col gap-6">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
              Explore
            </h4>
            <ul className="flex flex-col gap-4">
              <li>
                <Link
                  href={`/${locale}/blog`}
                  className="text-sm text-secondary dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-block min-w-[80px]"
                >
                  <DecryptedText
                    text="Blog"
                    animateOn="hover"
                    sequential={true}
                    revealDirection="start"
                    speed={60}
                    maxIterations={10}
                  />
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/community`}
                  className="text-sm text-secondary dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-block min-w-[80px]"
                >
                  <DecryptedText
                    text="Community"
                    animateOn="hover"
                    sequential={true}
                    revealDirection="start"
                    speed={60}
                    maxIterations={10}
                  />
                </Link>
              </li>
              <li>
                <Link
                  href="mailto:paradappofficial@gmail.com"
                  className="text-sm text-secondary dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-block min-w-[80px]"
                >
                  <DecryptedText
                    text="Contact"
                    animateOn="hover"
                    sequential={true}
                    revealDirection="start"
                    speed={60}
                    maxIterations={10}
                  />
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/about`}
                  className="text-sm text-secondary dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-block min-w-[80px]"
                >
                  <DecryptedText
                    text="About"
                    animateOn="hover"
                    sequential={true}
                    revealDirection="start"
                    speed={60}
                    maxIterations={10}
                  />
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="flex flex-col gap-6">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
              Legal
            </h4>
            <ul className="flex flex-col gap-4">
              <li>
                <Link
                  href={`/${locale}/privacy-policy`}
                  className="text-sm text-secondary dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-block min-w-[120px]"
                >
                  <DecryptedText
                    text="Privacy Policy"
                    animateOn="hover"
                    sequential={true}
                    revealDirection="start"
                    speed={60}
                    maxIterations={10}
                  />
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/cookies-policy`}
                  className="text-sm text-secondary dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-block min-w-[120px]"
                >
                  <DecryptedText
                    text="Cookie Policy"
                    animateOn="hover"
                    sequential={true}
                    revealDirection="start"
                    speed={60}
                    maxIterations={10}
                  />
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Column */}
          <div className="flex flex-col gap-6">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
              Social
            </h4>
            <ul className="flex flex-col gap-4">
              {socialItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-secondary dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-block min-w-[100px]"
                  >
                    <DecryptedText
                      text={item.label}
                      animateOn="hover"
                      sequential={true}
                      revealDirection="start"
                      speed={60}
                      maxIterations={10}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
