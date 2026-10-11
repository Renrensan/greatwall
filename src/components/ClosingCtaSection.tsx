"use client";

// The About page's closing call to action, just before the footer uncovers. A big serif line rises in word by word
// (same motion as the other sections), with a create button and an explore link. Around it float a few of the
// tokenized assets from the "How it works" snake, each drifting at its own speed while the page scrolls.

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useLaunch } from "@/components/NetworkChooser";
import { RWA_TOKENS } from "@/components/integrator/ipow/rwaTokens";

gsap.registerPlugin(ScrollTrigger, CustomEase);

const HEADLINE = "Your index, built to withstand.";

// Floating tiles. Positions are % of the section: `m` on phones (kept to the bands above and below the copy),
// `d` from md up (around the sides). `speed` is the scroll drift in yPercent; negative drifts up.
const FLOATERS: {
  id: string;
  size: string;
  rotate: number;
  speed: number;
  m?: [number, number];
  d: [number, number];
}[] = [
  {
    id: "base:AMZN.d",
    size: "size-16 md:size-24",
    rotate: -8,
    speed: -60,
    m: [10, 8],
    d: [16, 9],
  },
  {
    id: "solana:GOOGLx",
    size: "size-12 md:size-20",
    rotate: 6,
    speed: -30,
    m: [6, 68],
    d: [10, 78],
  },
  {
    id: "ethereum:NVDAon",
    size: "size-12 md:size-16",
    rotate: 10,
    speed: -90,
    d: [44, 4],
  },
  {
    id: "robinhood:METAr",
    size: "size-14 md:size-24",
    rotate: -5,
    speed: -45,
    m: [80, 74],
    d: [70, 86],
  },
  {
    id: "tempo:USDY",
    size: "size-10 md:size-14",
    rotate: 12,
    speed: -120,
    m: [17, 40],
    d: [36, 90],
  },
  {
    id: "hyperliquid:SPYx",
    size: "size-12 md:size-20",
    rotate: -10,
    speed: -70,
    m: [84, 12],
    d: [76, 14],
  },
  {
    id: "arbitrum:PGOLD",
    size: "size-14 md:size-16",
    rotate: 4,
    speed: -100,
    d: [86, 44],
  },
  {
    id: "ethereum:QQQon",
    size: "size-10 md:size-14",
    rotate: -14,
    speed: -40,
    m: [88, 46],
    d: [8, 46],
  },
];
/** A float's token logo, from Greatwall's own test RWA tokens ("<network>:<symbol>"). */
const logoOf = (id: string) => {
  const [chain, symbol] = id.split(":");
  return (RWA_TOKENS as Record<string, { symbol: string; logo?: string }[] | undefined>)[chain]!.find((t) => t.symbol === symbol)!.logo!;
};

export default function ClosingCtaSection() {
  const launch = useLaunch();
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = sectionRef.current;
        const rise = CustomEase.create("qQuote", "0.153,-0.004,0,0.998");
        const enter = {
          trigger: section,
          start: "top 55%",
          toggleActions: "play none none reverse",
        };

        gsap.fromTo(
          ".cta-word",
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 1.0096,
            ease: rise,
            stagger: 0.06,
            scrollTrigger: enter,
          },
        );
        gsap.fromTo(
          ".cta-reveal",
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 1.0096,
            ease: rise,
            stagger: 0.12,
            delay: 0.35,
            scrollTrigger: enter,
          },
        );
        gsap.fromTo(
          ".cta-float",
          { opacity: 0, scale: 0.6 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.9,
            ease: "back.out(1.6)",
            stagger: 0.05,
            scrollTrigger: enter,
          },
        );

        // Each tile drifts at its own speed for as long as the section is on screen.
        gsap.utils.toArray<HTMLElement>(".cta-drift").forEach((el) => {
          gsap.fromTo(
            el,
            { yPercent: -Number(el.dataset.speed) / 2 },
            {
              yPercent: Number(el.dataset.speed) / 2,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".cta-word, .cta-reveal, .cta-float", { opacity: 1 });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative -mx-4 flex min-h-[max(100svh,640px)] items-center justify-center overflow-hidden bg-cream px-4 py-32 text-center"
    >
      {/* The drift (scroll) and the pop-in (enter) sit on separate elements so their transforms don't clash. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {FLOATERS.map((f) => (
          <div
            key={f.id}
            data-speed={f.speed}
            className={`cta-drift absolute -translate-x-1/2 top-[var(--mt)] left-[var(--ml)] md:top-[var(--dt)] md:left-[var(--dl)] ${f.m ? "" : "hidden md:block"}`}
            style={
              {
                "--mt": `${f.m?.[0] ?? 0}%`,
                "--ml": `${f.m?.[1] ?? 0}%`,
                "--dt": `${f.d[0]}%`,
                "--dl": `${f.d[1]}%`,
              } as React.CSSProperties
            }
          >
            <div className={`cta-float opacity-0 ${f.size}`}>
              <Image
                src={logoOf(f.id)}
                alt=""
                width={96}
                height={96}
                className="size-full rounded-full shadow-[0_18px_40px_-18px_rgba(24,24,24,0.45)]"
                style={{ rotate: `${f.rotate}deg` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex max-w-[820px] flex-col items-center">
        <p className="cta-reveal text-xs uppercase tracking-[0.14em] text-stone opacity-0">
          Start building
        </p>
        <h2
          className="mt-5 font-serif text-[clamp(44px,7.4vw,108px)] leading-[0.98] text-ink"
          aria-label={HEADLINE}
        >
          {HEADLINE.split(" ").map((word, i) => (
            <span
              key={i}
              aria-hidden
              className="cta-word inline-block opacity-0 will-change-transform"
            >
              {word}
              {" "}
            </span>
          ))}
        </h2>
        <p className="cta-reveal mt-6 max-w-[480px] text-sm leading-normal text-ink opacity-0 md:text-base">
          Bring the tokenized assets you believe in together into one index
          token, on the networks you already use.
        </p>
        <div className="cta-reveal mt-8 flex flex-wrap items-center justify-center gap-3 opacity-0">
          <button
            type="button"
            onClick={() => launch("/index/create")}
            className="cursor-pointer rounded-[5px] bg-ink px-5 py-2.5 text-sm font-medium text-sand transition hover:brightness-125"
          >
            Create your index
          </button>
          <button
            type="button"
            onClick={() => launch("/index")}
            className="cursor-pointer rounded-[5px] border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/50"
          >
            Explore indexes
          </button>
        </div>
      </div>
    </section>
  );
}
