"use client";

// Footer for the About page only. It is pinned to the bottom of the viewport underneath the page, and the page
// (opaque, above it) scrolls away to uncover it like a curtain. While it is uncovered, scroll drives the motion:
// the huge "Greatwall" wordmark rises into place and the links fade in.

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LINKS, SOCIAL } from "@/subcomponents/Footer";
import footerBg from "@/assets/footer/about-footer-bg.jpg";
import logoIcon from "@/assets/logo/greatwall-logo-icon-only.svg";

gsap.registerPlugin(ScrollTrigger);

const HEIGHT = "h-[100svh] min-h-[560px]";

export default function AboutFooter() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { locale = "en", network = "solana" } = useParams<{
    locale?: string;
    network?: string;
  }>();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // From the moment the footer's top edge enters the screen until it is fully uncovered.
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: wrapRef.current,
            start: "top bottom",
            end: "bottom bottom",
            scrub: true,
          },
        });

        tl.fromTo(".af-word", { yPercent: 35, opacity: 0 }, { yPercent: 0, opacity: 0.1 }, 0)
          .fromTo(".af-bg", { yPercent: -8, scale: 1.1 }, { yPercent: 0, scale: 1 }, 0)
          .fromTo(".af-logo", { yPercent: 25, opacity: 0 }, { yPercent: 0, opacity: 0.1 }, 0)
          .fromTo(".af-meta", { y: 40, opacity: 0 }, { y: 0, opacity: 1 }, 0.4);
      });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  const base = `/${locale}/${network}`;

  return (
    // The clip keeps the fixed footer visible only inside this box, so it shows only once the page has scrolled
    // off it. The -mx-4 cancels UiLayout's side margin.
    <div ref={wrapRef} className={`-mx-4 ${HEIGHT} [clip-path:inset(0)]`}>
      <footer
        className={`fixed inset-x-0 bottom-0 z-0 ${HEIGHT} flex flex-col justify-between overflow-hidden bg-ink text-snow`}
      >
        {/* The painting, darkened so the links and the wordmark stay readable. */}
        <Image
          src={footerBg}
          alt=""
          fill
          quality={90}
          sizes="(max-width: 768px) 300vw, 100vw"
          className="af-bg pointer-events-none object-cover object-[50%_60%]"
        />
        <div className="pointer-events-none absolute inset-0 bg-ink/50" />

        <div className="af-meta relative mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pt-16 md:flex-row md:justify-between md:px-16 md:pt-20">
          <nav aria-label="Footer" className="flex flex-col gap-3">
            {LINKS(base).map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="font-serif text-2xl leading-none text-snow/80 transition-colors hover:text-snow md:text-3xl"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex items-center gap-4">
              {SOCIAL.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                  className="text-snow transition-opacity hover:opacity-70"
                >
                  <Icon className="text-[22px]" />
                </a>
              ))}
            </div>
            <p className="text-xs text-snow/60">
              © {new Date().getFullYear()} Greatwall.finance. All rights reserved.
            </p>
          </div>
        </div>

        <p
          aria-hidden
          className="af-word relative select-none whitespace-nowrap text-center font-wordmark text-[21vw] font-semibold leading-[0.8] tracking-[-0.04em] text-snow"
        >
          Greatwall
        </p>

        {/* The logo mark, centered on the whole footer and above the wordmark (the SVG is black, so it is inverted
            to white). Centered by a flex wrapper, not a translate: GSAP rewrites `translate` when it animates. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Image
            src={logoIcon}
            alt=""
            aria-hidden
            className="af-logo h-[45%] w-auto opacity-0 invert"
          />
        </div>
      </footer>
    </div>
  );
}
