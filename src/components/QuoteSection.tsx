"use client";

// Quote section from the Figma "Quote Section" frame. Figma's 5s timeline is pinned and scrubbed by scroll:
// the engraving drifts up, the headline rises and fades, then the quote and its author come in.
// Times (seconds), eases and values are Figma's own; scroll position drives the playhead.

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import quoteBg from "@/assets/quote/quote-bg.jpg";
import quoteLine from "@/assets/quote/quote-line.svg";

gsap.registerPlugin(ScrollTrigger, CustomEase);

const TIMELINE_SECONDS = 5;
// Pixels of scroll the whole timeline plays over.
const SCROLL_DISTANCE = "+=300%";

// Layout of the background: the parallax wrapper is the section plus 20% above; the image layer is 125% of that.
const WRAPPER_RATIO = 1.2;
const IMAGE_RATIO = 1.25;
const FRAME_HEIGHT = 843;
// A Figma shift in px of the 843px frame, as yPercent of the image layer.
const BG_SHIFT = (px: number) =>
  (px / FRAME_HEIGHT / (WRAPPER_RATIO * IMAGE_RATIO)) * 100;
// Parallax drift while entering or leaving, as yPercent of the wrapper (stays under the 20% overhang).
const PARALLAX = 15;

const ease = (name: string, bezier: string) => CustomEase.create(name, bezier);

export default function QuoteSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const bgOut1 = ease("qBg1", "0,0,0,0.987");
        const bgOut2 = ease("qBg2", "0,0,0,0.994");
        const headIn = ease("qHeadIn", "0.206,-0.016,0,1.024");
        const headOut = ease("qHeadOut", "1,0.003,0.645,1.017");
        const quoteIn = ease("qQuote", "0.153,-0.004,0,0.998");
        const authorIn = ease("qAuthor", "0.42,0,0,0.991");

        const section = sectionRef.current;
        const pinTrigger = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: SCROLL_DISTANCE,
        });

        // Parallax while the section scrolls in and out (the pinned stretch is Figma's own motion).
        // The wrapper reaches above and below the section so it never shows an edge.
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
        gsap.to(".q-bg-parallax", {
          yPercent: PARALLAX,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: () => pinTrigger.end,
            end: () => pinTrigger.end + window.innerHeight,
            scrub: true,
          },
        });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: SCROLL_DISTANCE,
            pin: true,
            scrub: 0.5,
          },
        });

        // Background: 0 → -110px → -180px, as a share of the 1260px frame.
        tl.fromTo(
          ".q-bg",
          { yPercent: 0 },
          { yPercent: -BG_SHIFT(110), duration: 1.3204, ease: bgOut1 },
          0,
        )
          .to(
            ".q-bg",
            { yPercent: -BG_SHIFT(180), duration: 0.913, ease: bgOut2 },
            1.804,
          )
          // "Build With Diversification": rises in, then lifts further and fades out.
          .fromTo(
            ".q-head",
            { opacity: 0, y: 0 },
            { opacity: 1, y: -100, duration: 0.879, ease: headIn },
            0,
          )
          .to(
            ".q-head",
            { opacity: 0, y: -140, duration: 1.2695, ease: headOut },
            1.197,
          )
          // Quote, then its author.
          .fromTo(
            ".q-quote",
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 1.0096, ease: quoteIn },
            2.385,
          )
          .fromTo(
            ".q-author",
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.7483, ease: authorIn },
            2.883,
          )
          // Pad so the timeline spans Figma's full 5s.
          .to({}, { duration: 0 }, TIMELINE_SECONDS);
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
    <div className="-mx-4">
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
