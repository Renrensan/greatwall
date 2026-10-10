"use client";

// Quote section from the Figma "Quote Section" frame. Figma's 5s timeline is pinned and scrubbed by scroll:
// the engraving drifts up, the headline rises and fades, then the quote and its author come in.
// Times (seconds), eases and values are Figma's own; scroll position drives the playhead.

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import quoteBg from "@/assets/quote/quote-bg.jpg";
import quoteLine from "@/assets/quote/quote-line.svg";

gsap.registerPlugin(ScrollTrigger);

const TIMELINE_SECONDS = 5;
// Scroll the whole timeline plays over, then one more viewport where the section stays pinned while the next
// section slides up over it (the wrapper's negative bottom margin lets that section start one viewport early).
const TIMELINE_SCROLL = 300;
const CLOSING_SCROLL = 100;
const SCROLL_DISTANCE = `+=${TIMELINE_SCROLL + CLOSING_SCROLL}%`;

// Layout of the background: the parallax wrapper is the section plus 20% above; the image layer is 125% of that.
const WRAPPER_RATIO = 1.2;
const IMAGE_RATIO = 1.25;
const FRAME_HEIGHT = 843;
// A Figma shift in px of the 843px frame, as yPercent of the image layer.
const BG_SHIFT = (px: number) =>
  (px / FRAME_HEIGHT / (WRAPPER_RATIO * IMAGE_RATIO)) * 100;
// Parallax drift while entering or leaving, as yPercent of the wrapper (stays under the 20% overhang).
const PARALLAX = 15;

export default function QuoteSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = sectionRef.current;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: SCROLL_DISTANCE,
            pin: true,
            anticipatePin: 1,
            scrub: true,
          },
        });

        // Scroll-scrubbed, so the eases are gentle: Figma's near-vertical curves (0,0,0,0.99) are made for time and
        // turn a few pixels of scroll into a visible jump. The background drifts linearly (0 → -110px → -180px
        // in Figma's own key times), which also matches the linear parallax before and after the pin.
        tl.fromTo(
          ".q-bg",
          { yPercent: 0 },
          { yPercent: -BG_SHIFT(180), duration: 2.717, ease: "none" },
          0,
        )
          // "Build With Diversification": rises in, then lifts further and fades out.
          .fromTo(
            ".q-head",
            { opacity: 0, y: 0 },
            { opacity: 1, y: -100, duration: 0.879, ease: "power1.out" },
            0,
          )
          .to(
            ".q-head",
            { opacity: 0, y: -140, duration: 1.2695, ease: "power1.in" },
            1.197,
          )
          // Quote, then its author.
          .fromTo(
            ".q-quote",
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 1.0096, ease: "power1.out" },
            2.385,
          )
          .fromTo(
            ".q-author",
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.7483, ease: "power1.out" },
            2.883,
          )
          // Pad so the timeline spans Figma's full 5s, then holds the finished frame for the closing scroll.
          .to(
            {},
            { duration: 0 },
            (TIMELINE_SECONDS * (TIMELINE_SCROLL + CLOSING_SCROLL)) /
              TIMELINE_SCROLL,
          );

        // Parallax while the section scrolls in. It is created after the pinned timeline so its refresh already
        // counts the pin spacing. The wrapper reaches above the section so it never shows an edge. There is no exit
        // parallax: the background stays fixed and the next section covers it.
        gsap.fromTo(
          ".q-bg-parallax",
          { yPercent: -PARALLAX },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "top top",
              scrub: true,
            },
          },
        );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".q-bg", { yPercent: -BG_SHIFT(180) });
        gsap.set(".q-quote, .q-author", { opacity: 1 });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    // The -mx-4 (cancelling UiLayout's side margin) sits on an unpinned wrapper: pinning a section that carries
    // negative margins fixes it to the narrower content width and leaves a cream strip on the right.
    <div className="-mx-4 -mb-[max(100svh,600px)]">
      <section
        ref={sectionRef}
        className="relative h-[100svh] min-h-[600px] w-full overflow-hidden bg-cream"
      >
        {/* Full-bleed engraving, taller than the section so both the timeline's drift and the parallax have room. */}
        <div className="q-bg-parallax pointer-events-none absolute inset-x-0 -top-[20%] bottom-0 will-change-transform">
          <div className="q-bg absolute inset-x-0 top-0 h-[125%] will-change-transform">
            <Image
              src={quoteBg}
              alt=""
              fill
              sizes="100vw"
              className="scale-[1.15] object-cover object-[50%_30%]"
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 to-black/40" />

        <blockquote className="q-quote absolute left-5 right-5 top-[34%] font-serif text-[26px] leading-[1.2] text-cream opacity-0 md:left-[8.47%] md:right-auto md:top-[61.8%] md:w-[440px] md:text-[32px]">
          “Invest in seven ventures, yes, in eight; for you do not know what
          disaster may come upon the land.”
        </blockquote>

        <div className="q-author absolute left-5 top-[60%] flex items-center gap-[9px] opacity-0 md:left-[8.96%] md:top-[77.8%]">
          <Image src={quoteLine} alt="" width={36} height={1} aria-hidden />
          <cite className="font-serif text-[26px] not-italic leading-[1.2] text-cream md:text-[32px]">
            King Solomon
          </cite>
        </div>

        <h2 className="q-head absolute left-5 top-[58%] whitespace-nowrap font-serif text-[clamp(26px,5.2vw,75px)] leading-none tracking-[0.05em] text-cream opacity-0 md:left-[24.17%] md:top-[65%]">
          Build With Diversification
        </h2>
      </section>
    </div>
  );
}
