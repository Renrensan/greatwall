"use client";

// Statement section after the quote. Same motion as the quote's text (fade + rise, Figma's easing), played word by
// word once the copy scrolls into view, and reversed when it scrolls back out below.

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, CustomEase);

const TEXT =
  "One asset can fall on its own. An index token spreads across many, and it always holds the assets it was made from.";

export default function DiversificationSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rise = CustomEase.create("qQuote", "0.153,-0.004,0,0.998");
        gsap.fromTo(
          ".d-word",
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 1.0096,
            ease: rise,
            stagger: 0.06,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 55%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".d-word", { opacity: 1 });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="mx-auto flex min-h-[100svh] w-full max-w-[1240px] items-center px-1 py-24 md:px-[84px]"
    >
      <h2
        className="font-serif text-[clamp(30px,4.6vw,64px)] leading-[1.15] text-ink"
        aria-label={TEXT}
      >
        {TEXT.split(" ").map((word, i) => (
          <span
            key={i}
            aria-hidden
            className="d-word inline-block opacity-0 will-change-transform"
          >
            {word}
            {" "}
          </span>
        ))}
      </h2>
    </section>
  );
}
