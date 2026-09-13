"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

/** The two scribbles the reference layers over every card, verbatim. */
const ACCENT_PATH = {
  viewBox: "0 0 2453 2273",
  d: "M227.549 1818.76C227.549 1818.76 406.016 2207.75 569.049 2130.26C843.431 1999.85 -264.104 1002.3 227.549 876.262C552.918 792.849 773.647 2456.11 1342.05 2130.26C1885.43 1818.76 14.9644 455.772 760.548 137.262C1342.05 -111.152 1663.5 2266.35 2209.55 1972.76C2755.6 1679.18 1536.63 384.467 1826.55 137.262C2013.5 -22.1463 2209.55 381.262 2209.55 381.262",
};
const BASE_PATH = {
  viewBox: "0 0 2250 2535",
  d: "M1661.28 2255.51C1661.28 2255.51 2311.09 1960.37 2111.78 1817.01C1944.47 1696.67 718.456 2870.17 499.781 2255.51C308.969 1719.17 2457.51 1613.83 2111.78 963.512C1766.05 313.198 427.949 2195.17 132.281 1455.51C-155.219 736.292 2014.78 891.514 1708.78 252.012C1437.81 -314.29 369.471 909.169 132.281 566.512C18.1772 401.672 244.781 193.012 244.781 193.012",
};

// The reference's own row: two square cards side by side. It stacks three such
// rows down a scrolling page; one row is what fits a boxed demo, and it keeps
// the cards large enough for the stroke to read.
const DEFAULT_IMAGES = ["/mosaic-flip/img1.jpg", "/mosaic-flip/img2.jpg"];
const DEFAULT_TITLES = ["Synthetic Silhouette", "Red Form Study"];
const DEFAULT_STROKE_COLORS = ["#e67339", "#a66363", "#eb3828", "#a6a09d", "#99938a", "#5f7c98"];

/**
 * A grid of image cards, each with two scribbles laid over it. Hovering draws
 * both strokes on while fattening them from a line into a broad painted mark
 * that swallows the picture, and the title rises in word by word behind it.
 */
export default function ScribbleStrokeCards({
  images = DEFAULT_IMAGES,
  titles = DEFAULT_TITLES,
  strokeColors = DEFAULT_STROKE_COLORS,
  baseStrokeColor = "#e0e0e0",
  columns = 2,
  strokeRest = 200,
  strokeHover = 700,
  scribbleScale = 150,
  background = "#ffffff",
  textColor = "#000000",
  fontFamily = "var(--font-plus-jakarta-sans), sans-serif",
  textScale = 100,
  speed = 100,
}: {
  /** One card per title; the other lists are paired with it by position. */
  images?: string[];
  titles?: string[];
  /** The drawn-on colour per card, cycled if there are fewer than titles. */
  strokeColors?: string[];
  /** The second scribble, the same on every card in the reference. */
  baseStrokeColor?: string;
  columns?: number;
  /** Stroke weight at rest, in the scribble's own viewBox units. */
  strokeRest?: number;
  /** Stroke weight once hovered — the fattening is what covers the picture. */
  strokeHover?: number;
  /** How far past the card the scribble is blown up before being clipped. */
  scribbleScale?: number;
  background?: string;
  textColor?: string;
  fontFamily?: string;
  textScale?: number;
  speed?: number;
}) {
  const scale = textScale / 100;
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  const count = titles.length;

  useEffect(() => {
    const splits: SplitText[] = [];
    const cleanups: (() => void)[] = [];
    let cancelled = false;

    function start() {
      if (cancelled) return;
      const rate = Math.max(0.2, speed / 100);

      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        const title = titleRefs.current[i];
        // Two paths per card, laid down in render order.
        const paths = [pathRefs.current[i * 2], pathRefs.current[i * 2 + 1]].filter(
          Boolean,
        ) as SVGPathElement[];
        if (!card || !title || paths.length !== 2) continue;

        const split = SplitText.create(title, { type: "words", mask: "words", wordsClass: "word" });
        splits.push(split);
        gsap.set(split.words, { yPercent: 100 });

        const lengths = paths.map((p) => p.getTotalLength());
        paths.forEach((p, k) => {
          p.style.strokeDasharray = String(lengths[k]);
          p.style.strokeDashoffset = String(lengths[k]);
        });

        let tl: gsap.core.Timeline | null = null;

        const onEnter = () => {
          if (tl) tl.kill();
          tl = gsap.timeline();
          paths.forEach((p) => {
            tl!.to(
              p,
              {
                strokeDashoffset: 0,
                attr: { "stroke-width": strokeHover },
                duration: 1.5 / rate,
                ease: "power2.out",
              },
              0,
            );
          });
          tl.to(
            split.words,
            { yPercent: 0, duration: 0.75 / rate, ease: "power3.out", stagger: 0.075 / rate },
            0.35 / rate,
          );
        };

        const onLeave = () => {
          if (tl) tl.kill();
          tl = gsap.timeline();
          paths.forEach((p, k) => {
            tl!.to(
              p,
              {
                strokeDashoffset: lengths[k],
                attr: { "stroke-width": strokeRest },
                duration: 1 / rate,
                ease: "power2.out",
              },
              0,
            );
          });
          tl.to(
            split.words,
            {
              yPercent: 100,
              duration: 0.5 / rate,
              ease: "power3.out",
              stagger: { each: 0.05 / rate, from: "end" },
            },
            0,
          );
        };

        card.addEventListener("mouseenter", onEnter);
        card.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          card.removeEventListener("mouseenter", onEnter);
          card.removeEventListener("mouseleave", onLeave);
          if (tl) tl.kill();
          gsap.killTweensOf(paths);
        });
      }
    }

    // SplitText measures the rendered text, so a webfont landing late would
    // leave the masked words sized against the fallback face.
    if (document.fonts?.status === "loaded") start();
    else document.fonts?.ready.then(start).catch(start);

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      splits.forEach((s) => s.revert());
    };
  }, [count, speed, strokeRest, strokeHover, titles]);

  const cards = titles.map((title, i) => ({
    title,
    image: images[i % images.length] ?? DEFAULT_IMAGES[0],
    stroke: strokeColors[i % strokeColors.length] ?? DEFAULT_STROKE_COLORS[0],
  }));

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background, color: textColor, fontFamily, containerType: "inline-size" }}
    >
      <div className="min-h-0 flex-1 p-4">
        {/* Cards keep the reference's square aspect; sizing them off the row
            height rather than the column width is what lets all six stay
            square inside one frame instead of overflowing it. */}
        <div
          className="grid h-full place-items-center gap-4 @max-[1000px]:!grid-cols-1"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${Math.max(1, Math.ceil(count / Math.max(1, columns)))}, minmax(0, 1fr))`,
          }}
        >
          {cards.map((card, i) => (
            <div
              key={`${card.title}-${i}`}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="relative aspect-square h-full max-w-full overflow-hidden rounded-2xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.image} alt="" className="h-full w-full object-cover" draggable={false} />

              {/* Both scribbles are blown up past the card and clipped by it,
                  which is what keeps the marks reading as cropped gestures
                  rather than tidy centred drawings. */}
              {[
                { path: ACCENT_PATH, color: card.stroke },
                { path: BASE_PATH, color: baseStrokeColor },
              ].map((layer, k) => (
                <div
                  key={k}
                  className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full"
                  style={{ transform: `translate(-50%, -50%) scale(${scribbleScale / 100})` }}
                >
                  <svg viewBox={layer.path.viewBox} className="h-full w-full">
                    <path
                      ref={(el) => {
                        pathRefs.current[i * 2 + k] = el;
                      }}
                      d={layer.path.d}
                      fill="none"
                      stroke={layer.color}
                      strokeWidth={strokeRest}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              ))}

              {/* The reference's 2rem inset. `right` is the one addition: it
                  wraps a long title inside the card instead of letting it run
                  off the edge, which is all the source would do with one. */}
              <div className="pointer-events-none absolute bottom-8 left-8 right-8">
                <h3
                  ref={(el) => {
                    titleRefs.current[i] = el;
                  }}
                  style={{
                    fontFamily,
                    fontWeight: 450,
                    lineHeight: 1.25,
                    letterSpacing: "-0.025rem",
                    fontSize: `clamp(calc(2rem * ${scale}), calc(2.5cqw * ${scale}), calc(3rem * ${scale}))`,
                  }}
                >
                  {card.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
