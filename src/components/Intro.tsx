"use client";

// The About page's opening scene, shown over the page while it loads.
// 1. On the cream page colour the Greatwall mark builds itself brick by brick, from the base up, like a wall going up;
//    the name and tagline rise in under it and a counter runs at the bottom.
// 2. Once the page (fonts and the hero painting) is ready, the text clears, the mark turns into a window onto the
//    hero, and the camera flies through it: the cream cover is masked by the mark, and the mask grows until the
//    whole hero is uncovered. The Hero's own entrance starts as the flight begins (see introGate).
// It plays once per tab session; later visits only fade the cover away. Skipped for reduced motion.

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import logoIcon from "@/assets/logo/greatwall-logo-icon-only.svg";
import { holdIntro, releaseIntro } from "./introGate";

const SEEN_KEY = "gw-intro-seen";
const WORDMARK = "Greatwall";
// Shortest time the scene is on screen, and the longest it waits for the page before opening anyway.
const MIN_SECONDS = 2.4;
const MAX_WAIT_MS = 6000;
// The mark's width in its own units, the point the flight zooms about (centre of the 27.8–36.1 bar, which spans
// x 4–54), and that bar's half width and half height.
const LOGO_W = 58;
const ZOOM_AT = [29, 31.95] as const;
const ZOOM_HALF = [25, 4.13] as const;

// The mark's pieces in build order, base first. Bars grow out from their centre, posts rise from their foot.
const PIECES: { kind: "bar" | "post"; d: string }[] = [
  { kind: "bar", d: "M53.9915 62.2693H4.00781V70.4962H53.9915V62.2693Z" },
  { kind: "post", d: "M16.504 62.4795H8.25195V47.1543H16.504V62.4795Z" },
  { kind: "post", d: "M49.7481 62.4795H41.4961V47.1543H49.7481V62.4795Z" },
  {
    kind: "bar",
    d: "M0.0258118 47.1544H58V38.9023H45.5752H24.8502H12.4248H0L0.0126526 43.0284L0.0258118 47.1544Z",
  },
  { kind: "bar", d: "M53.9915 27.8223H4.00781V36.0743H53.9915V27.8223Z" },
  { kind: "post", d: "M8.25195 23.5781h8.25203v4.2439H8.25195Z" },
  { kind: "post", d: "M24.7559 23.5781h8.25203v4.2439H24.7559Z" },
  { kind: "post", d: "M41.4961 23.5781h8.25203v4.2439H41.4961Z" },
  {
    kind: "bar",
    d: "M28.3855 21.0046C43.9836 21.0132 57.6439 21.0051 57.9849 20.9869V12.7168H45.5633H33.2439H12.4216H0L0.0126493 16.8531L0.0258051 20.9894L28.3855 21.0046Z",
  },
  { kind: "post", d: "M24.7563 0h8.25203v12.7317H24.7563Z" },
];

function heroReady() {
  const img = document.querySelector<HTMLImageElement>(".hero-bg-zoom img");
  const painting =
    !img || img.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        });
  const fonts =
    document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
  const cap = new Promise<void>((resolve) => setTimeout(resolve, MAX_WAIT_MS));
  return Promise.race([Promise.all([painting, fonts]), cap]);
}

// Keeps the page (and Locomotive's smooth scroll) still while the scene plays. Stopping the events in the capture
// phase on the document keeps them from reaching Lenis's listener on the window.
function lockScroll() {
  const stop = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const keys = (e: KeyboardEvent) => {
    if (
      [
        " ",
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
        "Home",
        "End",
      ].includes(e.key)
    )
      stop(e);
  };
  const opts = { capture: true, passive: false } as const;
  document.addEventListener("wheel", stop, opts);
  document.addEventListener("touchmove", stop, opts);
  document.addEventListener("keydown", keys, opts);
  return () => {
    document.removeEventListener("wheel", stop, opts);
    document.removeEventListener("touchmove", stop, opts);
    document.removeEventListener("keydown", keys, opts);
  };
}

export default function Intro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current!;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Already seen, or no motion: let the Hero start now and fade the cover away.
    if (seen || reduced) {
      releaseIntro();
      const fade = gsap.to(root, {
        autoAlpha: 0,
        duration: 0.4,
        ease: "power1.out",
        onComplete: () => setGone(true),
      });
      return () => {
        fade.kill();
      };
    }

    holdIntro();
    window.scrollTo(0, 0);
    const unlock = lockScroll();
    let cancelled = false;

    const ctx = gsap.context(() => {
      const counter = root.querySelector<HTMLElement>(".intro-count")!;
      const count = { v: 0 };
      const showCount = () =>
        (counter.textContent = String(Math.round(count.v)).padStart(3, "0"));

      // 1. The build.
      const build = gsap.timeline({ delay: 0.3 });
      build
        .fromTo(
          ".intro-letter",
          { y: 0, yPercent: 110 },
          { yPercent: 0, duration: 0.8, ease: "power4.out", stagger: 0.04 },
          1.0,
        )
        .fromTo(
          ".intro-tag",
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
          1.35,
        )
        .fromTo(
          ".intro-foot",
          { opacity: 0 },
          { opacity: 1, duration: 0.6 },
          0,
        );
      // Pieces are interleaved by kind, so place each at its own slot in the build order.
      root.querySelectorAll<SVGPathElement>(".intro-piece").forEach((el, i) => {
        gsap.set(el, {
          transformOrigin: el.classList.contains("intro-bar")
            ? "50% 50%"
            : "50% 100%",
        });
        build.fromTo(
          el,
          el.classList.contains("intro-bar") ? { scaleX: 0 } : { scaleY: 0 },
          { scaleX: 1, scaleY: 1, duration: 0.55, ease: "power3.out" },
          i * 0.11,
        );
      });
      // Hidden until the pieces are collapsed, so the finished mark never flashes before the build.
      gsap.set(".intro-logo", { opacity: 1 });
      gsap.to(count, {
        v: 90,
        duration: MIN_SECONDS,
        ease: "power1.inOut",
        onUpdate: showCount,
      });
      gsap.fromTo(
        ".intro-line",
        { scaleX: 0 },
        { scaleX: 0.9, duration: MIN_SECONDS, ease: "power1.inOut" },
      );

      const minTime = new Promise((resolve) =>
        setTimeout(resolve, MIN_SECONDS * 1000),
      );
      Promise.all([heroReady(), minTime]).then(() => {
        if (cancelled) return;
        ctx.add(() => open());
      });

      // 2. The flight through the mark.
      const open = () => {
        const logo = root.querySelector<SVGSVGElement>(".intro-logo")!;
        const cover = root.querySelector<HTMLElement>(".intro-cover")!;
        const box = logo.getBoundingClientRect();
        const unit = box.width / LOGO_W;
        // Zoom about the middle of the mark's widest bar, so that bar ends up covering the whole screen.
        const fx = box.left + ZOOM_AT[0] * unit;
        const fy = box.top + ZOOM_AT[1] * unit;
        const end =
          LOGO_W *
          Math.max(
            (Math.max(fy, window.innerHeight - fy) / ZOOM_HALF[1]) * 1.05,
            (Math.max(fx, window.innerWidth - fx) / ZOOM_HALF[0]) * 1.05,
          );
        const mask = { w: box.width };
        const setMask = () => {
          const k = mask.w / LOGO_W;
          // Two layers: the mark, then the full-screen fill it is cut out of.
          const size = `${mask.w}px auto, 100% 100%`;
          const position = `${fx - ZOOM_AT[0] * k}px ${fy - ZOOM_AT[1] * k}px, 0 0`;
          cover.style.maskSize = cover.style.webkitMaskSize = size;
          cover.style.maskPosition = cover.style.webkitMaskPosition = position;
        };

        const tl = gsap.timeline({
          onComplete: () => {
            try {
              sessionStorage.setItem(SEEN_KEY, "1");
            } catch {}
            unlock();
            setGone(true);
          },
        });
        tl.to(
          count,
          { v: 100, duration: 0.35, ease: "power1.out", onUpdate: showCount },
          0,
        )
          .to(
            ".intro-line",
            { scaleX: 1, duration: 0.35, ease: "power1.out" },
            0,
          )
          .to(
            ".intro-letter",
            { yPercent: -110, duration: 0.5, ease: "power3.in", stagger: 0.02 },
            0.35,
          )
          .to(
            ".intro-tag, .intro-foot",
            { opacity: 0, duration: 0.4, ease: "power1.in" },
            0.35,
          )
          // The mark becomes a window: the cover gets a mark-shaped hole right under it, then the mark fades.
          .add(() => {
            cover.classList.add("intro-masked");
            setMask();
          }, 0.8)
          .to(
            ".intro-logo",
            { opacity: 0, duration: 0.35, ease: "power1.out" },
            0.8,
          )
          .add(() => releaseIntro(), 1.15)
          .to(
            mask,
            { w: end, duration: 1.3, ease: "power3.in", onUpdate: setMask },
            1.25,
          );
      };
    }, root);

    return () => {
      cancelled = true;
      ctx.revert();
      unlock();
      releaseIntro();
    };
  }, []);

  if (gone) return null;

  return (
    <div ref={rootRef} className="gw-intro fixed inset-0 z-[1000]" aria-hidden>
      {/* No JavaScript, no scene: the cover would never lift. */}
      <noscript>
        <style>{`.gw-intro{display:none}`}</style>
      </noscript>
      <style>{`
        .intro-masked {
          -webkit-mask: url("${logoIcon.src}") 0 0 / auto no-repeat, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask: url("${logoIcon.src}") 0 0 / auto no-repeat exclude, linear-gradient(#000 0 0);
        }
      `}</style>
      <div className="intro-cover absolute inset-0 bg-cream" />

      {/* The mark sits dead centre, so the mask (centred on the screen) lines up with it exactly. */}
      <svg
        viewBox="0 0 58 71"
        className="intro-logo opacity-0 absolute left-1/2 top-1/2 w-16 -translate-x-1/2 -translate-y-1/2 overflow-visible md:w-[84px]"
      >
        {PIECES.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="var(--color-ink)"
            className={`intro-piece intro-${p.kind}`}
          />
        ))}
      </svg>

      <div className="absolute inset-x-0 top-1/2 mt-16 flex flex-col items-center gap-3 md:mt-20">
        <p className="flex overflow-hidden font-serif text-4xl leading-tight text-ink md:text-5xl">
          {WORDMARK.split("").map((ch, i) => (
            <span
              key={i}
              className="intro-letter inline-block"
              style={{ transform: "translateY(110%)" }}
            >
              {ch}
            </span>
          ))}
        </p>
        <p className="intro-tag text-[11px] uppercase tracking-[0.3em] text-stone opacity-0">
          Withstand in uncertainty
        </p>
      </div>

      <div className="intro-foot absolute inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] opacity-0 md:inset-x-10 md:bottom-10">
        <div className="flex items-end justify-between text-ink">
          <span className="text-[11px] uppercase tracking-[0.2em] text-stone">
            Building the wall
          </span>
          <span className="intro-count font-serif text-4xl leading-none tabular-nums md:text-5xl">
            000
          </span>
        </div>
        <div className="mt-3 h-px bg-ink/10">
          <div className="intro-line h-full origin-left scale-x-0 bg-ink" />
        </div>
      </div>
    </div>
  );
}
