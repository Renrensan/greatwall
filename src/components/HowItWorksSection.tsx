"use client";

// "How it works" after the networks: the three steps to a new index, pinned and scrubbed by scroll.
// 1. Define the index token: its name and ticker type themselves into a card.
// 2. Choose the tokenized assets behind it: every asset rides a snake that enters from the right edge, winds across
//    the screen row by row and leaves it, with the picked ones marked.
// 3. Prepare the assets and mint: the picked assets' allocations fill, then the mint goes through.
// The snake is placed by hand on a path built from the section's size (straight rows joined by half circles), so it
// fits any screen and is rebuilt on every ScrollTrigger refresh.

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TOKENIZED_ASSETS } from "./tokenizedAssets";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    n: "01",
    label: "Define",
    title: "Define your index token",
    body: "Start with the idea. Name the index token you want to create and give it a ticker, so everyone knows what it stands for.",
  },
  {
    n: "02",
    label: "Choose",
    title: "Choose the assets behind it",
    body: "Pick the tokenized stocks and assets that back your index token, from every network Greatwall supports.",
  },
  {
    n: "03",
    label: "Mint",
    title: "Prepare and mint",
    body: "Set how much of each asset goes in, bring the assets, and mint. Your index token is live and anyone can join it.",
  },
];

const INDEX_NAME = "Digital Leaders";
const INDEX_TICKER = "DGTL";
// The assets picked in step 2 and weighed in step 3.
const PICKS: { name: string; weight: number }[] = [
  { name: "Amazon", weight: 35 },
  { name: "Alphabet", weight: 30 },
  { name: "Adobe", weight: 20 },
  { name: "Airbnb", weight: 15 },
];
const PICKED = new Set(PICKS.map((p) => p.name));
const imageOf = (name: string) =>
  TOKENIZED_ASSETS.find((a) => a.name === name)!.image;

// The snake's order: a fixed stride through the alphabetical list, so neighbouring tiles differ in colour.
const SNAKE = TOKENIZED_ASSETS.map(
  (_, i) => TOKENIZED_ASSETS[(i * 7) % TOKENIZED_ASSETS.length],
);

// Timeline layout, in timeline units. The snake runs from SNAKE_START for SNAKE_DURATION.
const SNAKE_START = 1.5;
const SNAKE_DURATION = 3.2;
const STEP3_START = SNAKE_START + SNAKE_DURATION;
const TIMELINE_END = STEP3_START + 2.3;
// Scroll the pinned timeline plays over, as % of the viewport.
const SCROLL_DISTANCE = "+=500%";

// Gap between tiles along the path and distance between rows, in tile sizes. The tile size follows the section
// width, but is never so big that fewer than three rows fit the stage.
const SPACING = 1.16;
const PITCH = 1.7;
const tileSize = (width: number, stageHeight: number) =>
  Math.floor(
    Math.min(104, Math.max(56, width * 0.15), stageHeight / (1 + 2 * PITCH)),
  );

type Segment =
  | { kind: "line"; x0: number; y: number; dx: number; len: number }
  | {
      kind: "arc";
      cx: number;
      cy: number;
      r: number;
      sweep: number;
      len: number;
    };

// Rows across the stage, alternating direction, joined by half circles. The first row starts past the right edge and
// the last row ends past an edge, so every tile enters and leaves the screen.
function buildPath(width: number, top: number, height: number, tile: number) {
  const pitch = tile * PITCH;
  const rows = Math.max(
    2,
    Math.min(5, Math.floor((height - tile) / pitch) + 1),
  );
  const r = pitch / 2;
  const y0 = top + (height - (rows - 1) * pitch) / 2;
  const edge = Math.max(16, width * 0.04) + r + tile / 2;
  const segments: Segment[] = [];
  for (let k = 0; k < rows; k++) {
    const y = y0 + k * pitch;
    const leftward = k % 2 === 0;
    const xs =
      k === 0
        ? leftward
          ? width + tile
          : -tile
        : leftward
          ? width - edge
          : edge;
    const xe =
      k === rows - 1
        ? leftward
          ? -tile
          : width + tile
        : leftward
          ? edge
          : width - edge;
    segments.push({
      kind: "line",
      x0: xs,
      y,
      dx: xe - xs,
      len: Math.abs(xe - xs),
    });
    if (k < rows - 1)
      segments.push({
        kind: "arc",
        cx: xe,
        cy: y + r,
        r,
        sweep: leftward ? -Math.PI : Math.PI,
        len: Math.PI * r,
      });
  }
  const length = segments.reduce((sum, s) => sum + s.len, 0);
  return { segments, length };
}

function pointAt(segments: Segment[], length: number, distance: number) {
  let s = Math.min(Math.max(distance, 0), length);
  for (const seg of segments) {
    if (s <= seg.len || seg === segments[segments.length - 1]) {
      const t = seg.len ? Math.min(s / seg.len, 1) : 0;
      if (seg.kind === "line") return { x: seg.x0 + seg.dx * t, y: seg.y };
      const a = -Math.PI / 2 + seg.sweep * t;
      return {
        x: seg.cx + seg.r * Math.cos(a),
        y: seg.cy + seg.r * Math.sin(a),
      };
    }
    s -= seg.len;
  }
  return { x: 0, y: 0 };
}

function DefineCard({ filled }: { filled?: boolean }) {
  return (
    <div className="w-full max-w-[400px] rounded-2xl border border-warm/10 bg-paper p-5 text-left shadow-[0_24px_60px_-30px_rgba(24,24,24,0.35)] md:p-6">
      <p className="text-xs uppercase tracking-[0.12em] text-stone">
        New index token
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <div className="rounded-xl bg-well px-4 py-3">
          <p className="text-[11px] text-stone">Name</p>
          <p className="mt-0.5 flex h-7 items-center font-serif text-2xl text-ink">
            <span
              className="hw-name empty:before:text-stone/40 empty:before:content-[attr(data-placeholder)]"
              data-placeholder="Your index name"
            >
              {filled ? INDEX_NAME : ""}
            </span>
            <span
              className="hw-caret ml-0.5 h-6 w-px animate-pulse bg-ink"
              aria-hidden
            />
          </p>
        </div>
        <div className="rounded-xl bg-well px-4 py-3">
          <p className="text-[11px] text-stone">Ticker</p>
          <p className="mt-0.5 flex h-7 items-center text-lg font-medium text-ink">
            $
            <span
              className="hw-ticker empty:before:text-stone/40 empty:before:content-[attr(data-placeholder)]"
              data-placeholder="TICKER"
            >
              {filled ? INDEX_TICKER : ""}
            </span>
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-stone">
        One index, one token. Once published, the index is public and never
        changes.
      </p>
    </div>
  );
}

function MintCard({ minted }: { minted?: boolean }) {
  return (
    <div className="relative w-full max-w-[400px]">
      <div
        className={`hw-coin absolute -top-4 right-4 z-10 flex items-center gap-2 rounded-full bg-ink py-1.5 pl-1.5 pr-3.5 text-sm text-sand shadow-lg ${minted ? "" : "scale-0 opacity-0"}`}
      >
        <span className="grid size-6 place-items-center rounded-full bg-cream font-serif text-xs text-ink">
          D
        </span>
        +1,000 ${INDEX_TICKER}
      </div>
      <div className="rounded-2xl border border-warm/10 bg-paper p-5 text-left shadow-[0_24px_60px_-30px_rgba(24,24,24,0.35)] md:p-6">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-[0.12em] text-stone">
            Prepare assets
          </p>
          <p className="font-serif text-lg text-ink">${INDEX_TICKER}</p>
        </div>
        <ul className="mt-3 flex flex-col gap-2.5 md:mt-4 md:gap-3">
          {PICKS.map((p) => (
            <li key={p.name} className="flex items-center gap-3">
              <Image
                src={imageOf(p.name)}
                alt=""
                width={32}
                height={32}
                className="size-7 rounded-md md:size-8"
              />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-sm text-ink">
                  <span className="truncate">{p.name}</span>
                  <span className="tabular-nums">{p.weight}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-well">
                  <div
                    className={`hw-bar h-full origin-left rounded-full bg-ink ${minted ? "" : "scale-x-0"}`}
                    style={{ width: `${(p.weight / PICKS[0].weight) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="hw-mint relative mt-4 h-11 overflow-hidden rounded-[5px] bg-ink text-sm font-medium text-sand md:mt-5">
          <span
            className={`hw-mint-a absolute inset-0 grid place-items-center ${minted ? "opacity-0" : ""}`}
          >
            Mint ${INDEX_TICKER}
          </span>
          <span
            className={`hw-mint-b absolute inset-0 flex items-center justify-center gap-2 ${minted ? "" : "opacity-0"}`}
          >
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path
                d="M3 8.5l3 3 7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Minted
          </span>
        </div>
      </div>
    </div>
  );
}

function AssetTile({
  name,
  image,
  className = "",
  style,
}: {
  name: string;
  image: (typeof TOKENIZED_ASSETS)[number]["image"];
  className?: string;
  style?: React.CSSProperties;
}) {
  const picked = PICKED.has(name);
  return (
    <div className={`overflow-visible ${className}`} style={style}>
      <div
        className={`relative size-full rounded-[14%] ${picked ? "ring-2 ring-ink ring-offset-2 ring-offset-cream" : ""}`}
      >
        <Image
          src={image}
          alt=""
          fill
          sizes="104px"
          loading="eager"
          className="rounded-[14%] object-cover"
        />
        {picked && (
          <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-sand">
            <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
              <path
                d="M3 8.5l3 3 7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

function CreateLink({ className = "inline-block" }: { className?: string }) {
  const { locale, network } = useParams<{ locale: string; network: string }>();
  return (
    <Link
      href={`/${locale}/${network}/index/create`}
      className={`mt-4 rounded-[5px] ${className} bg-ink px-5 py-2.5 text-sm font-medium text-sand transition hover:brightness-125`}
    >
      Create your index
    </Link>
  );
}

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = sectionRef.current!;
        const stage = stageRef.current!;
        const tiles = gsap.utils.toArray<HTMLElement>(".hw-tile");
        const setters = tiles.map((t) => ({
          x: gsap.quickSetter(t, "x", "px"),
          y: gsap.quickSetter(t, "y", "px"),
        }));
        const nameEl = section.querySelector<HTMLElement>(".hw-name")!;
        const tickerEl = section.querySelector<HTMLElement>(".hw-ticker")!;

        // Snake geometry, rebuilt from the section's size on every refresh.
        let path = buildPath(1, 0, 1, 1);
        let gap = 1;
        let travel = 1;
        const snake = { p: 0 };
        const place = () => {
          setters.forEach((s, i) => {
            const pt = pointAt(path.segments, path.length, snake.p - i * gap);
            s.x(pt.x);
            s.y(pt.y);
          });
        };
        const layout = () => {
          const width = section.clientWidth;
          const tile = tileSize(width, stage.offsetHeight);
          path = buildPath(width, stage.offsetTop, stage.offsetHeight, tile);
          gap = tile * SPACING;
          travel = path.length + gap * (tiles.length - 1);
          gsap.set(tiles, { width: tile, height: tile });
        };
        gsap.set(tiles, { xPercent: -50, yPercent: -50, autoAlpha: 1 });
        layout();
        place();
        ScrollTrigger.addEventListener("refreshInit", layout);
        ScrollTrigger.addEventListener("refresh", place);

        const typed = { n: 0 };
        const tl = gsap.timeline({
          defaults: { ease: "power1.out", duration: 0.4 },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: SCROLL_DISTANCE,
            pin: true,
            anticipatePin: 1,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        tl.fromTo(
          ".hw-progress",
          { scaleX: 0 },
          { scaleX: 1, duration: TIMELINE_END, ease: "none" },
          0,
        )
          // Step 1: the name, then the ticker, type themselves in.
          .to(
            typed,
            {
              n: INDEX_NAME.length + INDEX_TICKER.length,
              duration: 0.9,
              ease: "none",
              onUpdate: () => {
                const n = Math.round(typed.n);
                nameEl.textContent = INDEX_NAME.slice(0, n);
                tickerEl.textContent = INDEX_TICKER.slice(
                  0,
                  Math.max(0, n - INDEX_NAME.length),
                );
              },
            },
            0.1,
          )
          // Step 1 → 2.
          .to(".hw-copy-0", { autoAlpha: 0, y: -30, ease: "power1.in" }, 1.2)
          .to(".hw-define", { autoAlpha: 0, y: -40, ease: "power1.in" }, 1.2)
          .fromTo(
            ".hw-copy-1",
            { autoAlpha: 0, y: 30 },
            { autoAlpha: 1, y: 0 },
            SNAKE_START,
          )
          .fromTo(".hw-nav-1", { opacity: 0.35 }, { opacity: 1 }, SNAKE_START)
          // Step 2: the snake crosses the screen.
          .to(
            snake,
            {
              p: () => travel,
              duration: SNAKE_DURATION,
              ease: "none",
              onUpdate: place,
            },
            SNAKE_START,
          )
          // Step 2 → 3.
          .to(
            ".hw-copy-1",
            { autoAlpha: 0, y: -30, ease: "power1.in" },
            STEP3_START - 0.3,
          )
          .fromTo(
            ".hw-copy-2",
            { autoAlpha: 0, y: 30 },
            { autoAlpha: 1, y: 0 },
            STEP3_START,
          )
          .fromTo(".hw-nav-2", { opacity: 0.35 }, { opacity: 1 }, STEP3_START)
          .fromTo(
            ".hw-mint-card",
            { autoAlpha: 0, y: 50 },
            { autoAlpha: 1, y: 0 },
            STEP3_START,
          )
          // Step 3: allocations fill, then the mint goes through.
          .fromTo(
            ".hw-bar",
            { scaleX: 0 },
            { scaleX: 1, duration: 0.5, stagger: 0.15 },
            STEP3_START + 0.3,
          )
          .to(
            ".hw-mint",
            { scale: 0.96, duration: 0.1, yoyo: true, repeat: 1 },
            STEP3_START + 1.3,
          )
          .to(
            ".hw-mint-a",
            { opacity: 0, y: -12, duration: 0.2 },
            STEP3_START + 1.4,
          )
          .fromTo(
            ".hw-mint-b",
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.2 },
            STEP3_START + 1.45,
          )
          .fromTo(
            ".hw-coin",
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" },
            STEP3_START + 1.5,
          )
          .to({}, { duration: 0 }, TIMELINE_END);

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", layout);
          ScrollTrigger.removeEventListener("refresh", place);
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => setReduced(true));
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  if (reduced)
    return (
      <section className="mx-auto flex w-full max-w-[1100px] flex-col gap-20 py-24">
        <p className="text-center text-xs uppercase tracking-[0.14em] text-stone">
          How it works
        </p>
        {STEPS.map((step, i) => (
          <div
            key={step.n}
            className="flex flex-col items-center gap-8 text-center"
          >
            <div className="max-w-[520px]">
              <p className="font-serif text-xl text-stone">{step.n}</p>
              <h3 className="mt-2 font-serif text-[clamp(32px,4.4vw,60px)] leading-none text-ink">
                {step.title}
              </h3>
              <p className="mt-4 text-sm leading-normal text-ink md:text-base">
                {step.body}
              </p>
              {i === 2 && <CreateLink />}
            </div>
            {i === 0 && <DefineCard filled />}
            {i === 1 && (
              <div className="flex flex-wrap justify-center gap-3">
                {SNAKE.map((a) => (
                  <AssetTile
                    key={a.name}
                    name={a.name}
                    image={a.image}
                    className="size-14 md:size-20"
                  />
                ))}
              </div>
            )}
            {i === 2 && <MintCard minted />}
          </div>
        ))}
      </section>
    );

  return (
    // The -mx-4 (cancelling UiLayout's side margin) sits on an unpinned wrapper, as in QuoteSection: pinning a section
    // that carries negative margins fixes it to the narrower content width.
    <div className="-mx-4">
      <section
        ref={sectionRef}
        className="relative flex h-[100svh] min-h-[640px] flex-col overflow-hidden bg-cream px-4 pb-8 pt-24 text-center md:pt-28"
      >
        {/* Step indicator, with a line that fills over the whole pinned scroll. */}
        <div className="relative z-10 mx-auto w-full max-w-[560px]">
          <p className="text-xs uppercase tracking-[0.14em] text-stone">
            How it works
          </p>
          <ol className="mt-4 flex justify-between">
            {STEPS.map((step, i) => (
              <li
                key={step.n}
                className={`hw-nav-${i} flex items-baseline gap-2 text-ink ${i ? "opacity-35" : ""}`}
              >
                <span className="font-serif text-lg md:text-xl">{step.n}</span>
                <span className="text-xs uppercase tracking-[0.12em] md:text-sm">
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-3 h-px bg-ink/10">
            <div className="hw-progress h-full origin-left scale-x-0 bg-ink" />
          </div>
        </div>

        {/* Each step's copy, stacked in one cell so the block keeps the tallest one's height. */}
        <div className="relative z-10 mx-auto mt-6 grid w-full max-w-[560px] md:mt-10">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className={`hw-copy-${i} [grid-area:1/1] ${i ? "invisible opacity-0" : ""}`}
            >
              <h3 className="font-serif text-[clamp(32px,4.4vw,60px)] leading-none text-ink">
                {step.title}
              </h3>
              <p className="mx-auto mt-3 max-w-[460px] text-sm leading-normal text-ink md:mt-4 md:text-base">
                {step.body}
              </p>
              {/* Desktop only: on short phone screens it would push the mint card into the copy. */}
              {i === 2 && <CreateLink className="hidden md:inline-block" />}
            </div>
          ))}
        </div>

        {/* Where the step visuals sit; the snake's rows are fitted to it. */}
        <div
          ref={stageRef}
          className="relative z-10 mt-6 min-h-0 flex-1 md:mt-8"
        >
          <div className="hw-define absolute inset-0 grid place-items-center">
            <DefineCard />
          </div>
          <div className="hw-mint-card invisible absolute inset-0 grid place-items-center opacity-0">
            <MintCard />
          </div>
        </div>

        {/* The snake: full width, so tiles enter and leave at the screen's edges. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {SNAKE.map((a) => (
            <AssetTile
              key={a.name}
              name={a.name}
              image={a.image}
              className="hw-tile invisible absolute left-0 top-0 size-[52px] will-change-transform"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
