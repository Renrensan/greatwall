"use client";

// Hero from the Figma "Hero Section" frame. The logo and Menu in the design come from the
// page layout's StaggeredMenu, so only the background, headline, copy and CTA live here.
// -mx-4 / -mt-24 cancel UiLayout's side margin and navbar spacer so the image fills the viewport.

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import heroImage from "@/assets/hero/hero-great-wall.jpg";

gsap.registerPlugin(ScrollTrigger);

const HEADLINE = "WITHSTAND IN UNCERTAINTY".split(" ");

export default function Hero() {
  const { locale, network } = useParams<{ locale: string; network: string }>();
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Same entrance as the StaggeredMenu items: each piece rises out of a mask, tilted, staggered.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Background: eases in from a slight zoom, then drifts down slower than the page on scroll.
        gsap.fromTo(".hero-bg-zoom", { scale: 1.15 }, { scale: 1, duration: 2.2, ease: "power3.out" });
        gsap.to(".hero-bg-parallax", {
          yPercent: 15,
          ease: "none",
          scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.fromTo(
          ".hero-reveal",
          { yPercent: 140, rotate: 10, opacity: 1 },
          { yPercent: 0, rotate: 0, duration: 1, ease: "power4.out", stagger: 0.1, delay: 0.2 },
        );
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".hero-reveal", { opacity: 1 });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative -mx-4 -mt-24 flex min-h-[600px] h-[100svh] items-end overflow-hidden bg-ink">
      {/* Taller than the section (top extended) so the parallax shift never exposes an edge. */}
      <div className="hero-bg-parallax pointer-events-none absolute inset-x-0 -top-[20%] bottom-0 will-change-transform">
        <div className="hero-bg-zoom absolute inset-0 will-change-transform">
          <Image src={heroImage} alt="" fill priority quality={90} sizes="(max-width: 768px) 300vw, 100vw" className="object-cover object-[65%_bottom]" />
        </div>
      </div>
      <div ref={textRef} className="relative flex w-full max-w-[743px] flex-col items-start gap-[19px] px-5 pb-[100px] md:pl-[100px] md:pb-[150px]">
        <h1 className="font-serif text-[44px] leading-none tracking-[0.05em] text-cream md:text-[75px]" aria-label="WITHSTAND IN UNCERTAINTY">
          {HEADLINE.map((word, i) => (
            <span key={i} aria-hidden className="inline-block overflow-hidden align-top">
              <span className="hero-reveal inline-block origin-[50%_100%] opacity-0 will-change-transform">{word}</span>
              {i < HEADLINE.length - 1 && "\u00A0"}
            </span>
          ))}
        </h1>
        <div className="overflow-hidden">
          <p className="hero-reveal origin-[50%_100%] font-sans text-base leading-normal text-cream opacity-0 will-change-transform">
            Greatwall is a multichain platform for creating and minting assets backed by existing assets from supported blockchain networks.
          </p>
        </div>
        <div className="overflow-hidden">
          <Link
            href={`/${locale}/${network}/index`}
            className="hero-reveal inline-block origin-[50%_100%] rounded-[5px] bg-cream px-5 py-2.5 text-sm font-medium text-ink opacity-0 backdrop-blur-[10px] will-change-transform hover:opacity-90"
          >
            Launch App
          </Link>
        </div>
      </div>
    </section>
  );
}
