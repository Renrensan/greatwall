"use client";

// Smooth scrolling for the page it is mounted on (Locomotive Scroll v5, built on Lenis).
// Keeps GSAP ScrollTrigger in sync so scrubbed effects such as the Hero parallax follow it.

import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "locomotive-scroll/dist/locomotive-scroll.css";

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let destroy: (() => void) | undefined;

    import("locomotive-scroll").then(({ default: LocomotiveScroll }) => {
      if (cancelled) return;
      const scroll = new LocomotiveScroll({
        lenisOptions: { lerp: 0.08, smoothWheel: true },
        scrollCallback: () => ScrollTrigger.update(),
      });
      destroy = () => scroll.destroy();
    });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, []);

  return null;
}
