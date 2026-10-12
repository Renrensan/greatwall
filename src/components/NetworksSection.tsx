"use client";

// "Built Across Networks" section from the Figma frame: heading, copy, a strip of network tiles that fades out at
// both edges, and a Create Now button. The frame's logo and Menu come from the page's StaggeredMenu. The frame has
// no motion: the text rises in like the quote's, and the tile strip is a right-to-left marquee that speeds up while
// the page is scrolling (both are additions, not from Figma).

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { arbitrumnetwork, basenetwork, bitcoinnetwork, ethereumnetwork, hyperliquidnetwork, robinhoodnetwork, solananetwork, temponetwork, zcashnetwork } from "@/index";
import { useLaunch } from "@/components/NetworkChooser";

gsap.registerPlugin(ScrollTrigger, CustomEase);

// Marquee speed in px/s at rest, how much each px/s of scroll speed adds, and the most it can add.
const BASE_SPEED = 70;
const SCROLL_BOOST = 0.35;
const MAX_BOOST = 900;
// Copies of the tile set in the track, so the strip stays filled on wide screens while it wraps.
const COPIES = 3;

// The networks Greatwall runs on, with the app's own rounded-square network logos (src/assets/<network>-network).
const NETWORKS = [
  { name: "Bitcoin", logo: bitcoinnetwork },
  { name: "Ethereum", logo: ethereumnetwork },
  { name: "Solana", logo: solananetwork },
  { name: "Robinhood", logo: robinhoodnetwork },
  { name: "Hyperliquid", logo: hyperliquidnetwork },
  { name: "Base", logo: basenetwork },
  { name: "Tempo", logo: temponetwork },
  { name: "Arbitrum", logo: arbitrumnetwork },
  { name: "Zcash", logo: zcashnetwork },
];

export default function NetworksSection() {
  const launch = useLaunch();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Text: same fade + rise as the quote, one piece after another.
        const rise = CustomEase.create("qQuote", "0.153,-0.004,0,0.998");
        gsap.fromTo(
          ".n-reveal",
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 1.0096,
            ease: rise,
            stagger: 0.12,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 60%",
              toggleActions: "play none none reverse",
            },
          },
        );

        // Marquee: always drifts right to left; scroll speed adds to it, eased so it never jerks.
        const track = trackRef.current;
        if (!track) return;
        const setX = gsap.quickSetter(track, "x", "px");
        let x = 0;
        let boost = 0;
        let scrollSpeed = 0;
        let inView = false;

        const scrollWatcher = ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => {
            scrollSpeed = Math.abs(self.getVelocity());
          },
        });
        const viewWatcher = ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (inView = self.isActive),
        });

        const tick = (_time: number, deltaMs: number) => {
          if (!inView) return;
          const dt = Math.min(deltaMs, 50) / 1000;
          const target = Math.min(scrollSpeed * SCROLL_BOOST, MAX_BOOST);
          boost += (target - boost) * (1 - Math.exp(-dt * 6));
          // One copy of the tile set is the loop length.
          const loop = track.scrollWidth / COPIES;
          x = (x - (BASE_SPEED + boost) * dt) % loop;
          setX(x);
        };
        gsap.ticker.add(tick);

        return () => {
          gsap.ticker.remove(tick);
          scrollWatcher.kill();
          viewWatcher.kill();
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".n-reveal", { opacity: 1 });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="-mx-4 flex min-h-[max(100svh,600px)] flex-col items-center justify-center overflow-hidden bg-cream px-4 py-24 text-center"
    >
      <div className="flex w-full max-w-[743px] flex-col items-center gap-[19px]">
        <h2 className="n-reveal opacity-0 font-serif text-[clamp(40px,5.2vw,75px)] leading-none tracking-[0.05em] text-ink">
          Built Across Networks
        </h2>
        <p className="n-reveal opacity-0 font-sans text-base leading-normal text-ink">
          Put assets from Ethereum, Solana, Base, Robinhood Chain, Hyperliquid,
          Arbitrum and Tempo into the same index token, and buy one privately
          with Zcash.
        </p>
      </div>

      {/* Tiles overlap by 10px. The track holds several copies of the set and slides left, wrapping by one set. The
          wrapper's padding leaves room for a hovered tile to grow without being clipped; edges fade to the page. */}
      <div className="relative mb-[17px] mt-px w-full overflow-hidden py-6">
        <div ref={trackRef} className="flex w-max will-change-transform">
          {Array.from({ length: COPIES }, (_, copy) => (
            <ul
              key={copy}
              className="flex shrink-0 items-center"
              aria-hidden={copy > 0 || undefined}
            >
              {NETWORKS.map((n) => (
                <li
                  key={n.name}
                  className="relative mr-[-10px] size-[120px] shrink-0 cursor-pointer overflow-hidden rounded-[11px] transition-[scale,rotate] duration-300 ease-out hover:z-10 hover:rotate-3 hover:scale-110 sm:size-[186px] sm:rounded-[16px]"
                  aria-label={copy === 0 ? n.name : undefined}
                >
                  <Image src={n.logo} alt="" fill sizes="186px" className="object-cover" />
                </li>
              ))}
            </ul>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[10.5vw] max-w-[151px] bg-gradient-to-r from-cream to-cream/0" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[10.5vw] max-w-[151px] bg-gradient-to-l from-cream to-cream/0" />
      </div>

      <button
        type="button"
        onClick={() => launch("/index/create")}
        className="cursor-pointer n-reveal opacity-0 rounded-[5px] bg-ink px-5 py-2.5 text-sm font-medium text-sand backdrop-blur-[10px] transition-opacity hover:brightness-125"
      >
        Create Now
      </button>
    </section>
  );
}
