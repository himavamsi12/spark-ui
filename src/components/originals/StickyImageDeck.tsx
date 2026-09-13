"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const DEFAULT_EYEBROWS = ["Quiet Control", "Fluid Structures", "Wired Thought", "Silent Repetition"];
const DEFAULT_TITLES = ["Signal Drift", "Skyline Drift", "Neural Assembly", "Learning Loop"];
const DEFAULT_CARD_COLORS = ["#3d2fa9", "#ff7722", "#ff3d33", "#785f47"];
const DEFAULT_IMAGES = [
  "/circular-gallery/img1.jpg",
  "/circular-gallery/img2.jpg",
  "/circular-gallery/img3.jpg",
  "/circular-gallery/img4.jpg",
];

// The reference's own constants: how far a card behind the active one sits
// (as a % of yPercent) and shrinks per position back in the stack.
const CARD_Y_OFFSET = 5;
const CARD_SCALE_STEP = 0.075;

// Lenis' default lerp — the reference wraps its page in it; this reproduces
// the same easing on the internal wheel-driven scroll instead.
const smoothing = (dt: number) => 1 - Math.pow(0.9, dt * 60);

/**
 * Three plain sections — intro, a pinned card stack, outro — matching the
 * reference's own document: you scroll past the intro, the card section
 * pins for a fixed run of scroll while it cascades through its cards, then
 * it releases and the outro scrolls up over it.
 */
export default function StickyImageDeck({
  introTitle = "Enter the Frame",
  outroTitle = "Loop Complete",
  eyebrows = DEFAULT_EYEBROWS,
  titles = DEFAULT_TITLES,
  cardColors = DEFAULT_CARD_COLORS,
  images = DEFAULT_IMAGES,
  background = "#e3e3db",
  textColor = "#ffffff",
  introTextColor = "#0f0f0f",
  fontFamily = "var(--font-barlow-condensed), sans-serif",
  eyebrowFont = "var(--font-dm-mono), monospace",
  textScale = 100,
  speed = 100,
  autoPlay = true,
}: {
  introTitle?: string;
  outroTitle?: string;
  /** One card is created per title; paired with the other lists by position. */
  eyebrows?: string[];
  titles?: string[];
  /** Hex colour per card, cycled if there are fewer than titles. */
  cardColors?: string[];
  /** One photo per card, cycled if there are fewer than titles. */
  images?: string[];
  /** Colour of the pinned stage behind the cards. */
  background?: string;
  /** Colour of text on every card. */
  textColor?: string;
  /** Colour of the intro and outro headlines. */
  introTextColor?: string;
  fontFamily?: string;
  eyebrowFont?: string;
  textScale?: number;
  /** How far each scroll notch advances the sequence. */
  speed?: number;
  /** Cycle the sequence on its own instead of waiting for a wheel gesture. */
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const count = titles.length;
  const cards = titles.map((title, i) => ({
    eyebrow: eyebrows[i % eyebrows.length] ?? "",
    title,
    color: cardColors[i % cardColors.length] ?? "#3d2fa9",
    image: images[i % images.length] ?? DEFAULT_IMAGES[0],
  }));

  useEffect(() => {
    const root = rootRef.current;
    const hero = heroRef.current;
    const track = trackRef.current;
    const cardEls = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!root || !hero || !track || cardEls.length !== count) return;

    const segmentSize = 1 / count;

    cardEls.forEach((card, i) => {
      gsap.set(card, {
        xPercent: -50,
        yPercent: -50 + i * CARD_Y_OFFSET,
        scale: 1 - i * CARD_SCALE_STEP,
        rotationX: 0,
      });
    });

    function applyCards(progress: number) {
      const activeIndex = Math.min(Math.floor(progress / segmentSize), count - 1);
      const segProgress = (progress - activeIndex * segmentSize) / segmentSize;

      cardEls.forEach((card, i) => {
        if (i < activeIndex) {
          gsap.set(card, { yPercent: -250, rotationX: 35 });
        } else if (i === activeIndex) {
          gsap.set(card, {
            yPercent: gsap.utils.interpolate(-50, -200, segProgress),
            rotationX: gsap.utils.interpolate(0, 35, segProgress),
            scale: 1,
          });
        } else {
          const behindIndex = i - activeIndex;
          gsap.set(card, {
            yPercent: -50 + (behindIndex - segProgress) * CARD_Y_OFFSET,
            rotationX: 0,
            scale: 1 - (behindIndex - segProgress) * CARD_SCALE_STEP,
          });
        }
      });
    }

    applyCards(0);

    // Matches the reference's own ratio: two viewport-heights of scroll per
    // card while the stack is pinned, bracketed by one plain frame each for
    // the intro and the outro, exactly like its intro/sticky-cards/outro
    // sections and the ScrollTrigger pin between them.
    const pinFrames = count * 2;

    const frameH = () => root!.clientHeight;
    const introH = () => frameH();
    const pinH = () => frameH() * pinFrames;
    const maxScroll = () => introH() + pinH() + frameH();

    function frame(scroll: number) {
      const inH = introH();
      const pH = pinH();
      applyCards(gsap.utils.clamp(0, 1, (scroll - inH) / pH));
      track!.style.transform = `translateY(${-scroll}px)`;
    }

    frame(0);

    const rate = Math.max(0.2, speed / 100);
    let scroll = 0;
    let target = 0;
    let userDriven = false;

    function onWheel(e: WheelEvent) {
      const next = gsap.utils.clamp(0, maxScroll(), target + e.deltaY * rate);
      if (next === target) return;
      e.preventDefault();
      userDriven = true;
      target = next;
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    let dir = 1;
    let last = performance.now();
    function loop(now: number) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (autoPlay && !userDriven) {
        target += dir * dt * maxScroll() * 0.08 * rate;
        if (target >= maxScroll()) {
          target = maxScroll();
          dir = -1;
        } else if (target <= 0) {
          target = 0;
          dir = 1;
        }
      }
      scroll += (target - scroll) * smoothing(dt);
      frame(scroll);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      root!.style.setProperty("--frame-h", `${root!.clientHeight}px`);
      frame(scroll);
    });
    root!.style.setProperty("--frame-h", `${root!.clientHeight}px`);
    ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gsap.killTweensOf(cardEls);
      root.removeEventListener("wheel", onWheel);
    };
  }, [count, speed, autoPlay]);

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden" style={{ isolation: "isolate", containerType: "inline-size" }}>
      {/* The pinned card stack: always full-bleed and static in the
          viewport. The intro section sits on top of it in the track below
          and slides away to reveal it; the outro slides in over it once the
          pin's worth of scroll has passed. */}
      <div ref={heroRef} className="absolute inset-0 z-0" style={{ background }}>
        {/* Only `perspective`, deliberately no `transform-style: preserve-3d`:
            preserve-3d would put the cards in a 3D rendering context where the
            browser sorts them by computed depth — each card's rotationX tilt
            pushes its top backward in Z — which overrides z-index and paints
            the active card behind the smaller ones still stacked under it. */}
        <div className="absolute inset-0" style={{ perspective: "1000px" }}>
          {cards.map((card, i) => (
            <div
              key={`${card.title}-${i}`}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="absolute top-1/2 left-1/2 flex items-center justify-center gap-4 rounded-2xl will-change-transform w-[calc(100%-4rem)] h-[75%] flex-col @[1000px]:w-[65%] @[1000px]:h-[60%] @[1000px]:flex-row"
              style={{
                padding: "2.5rem",
                background: card.color,
                color: textColor,
                transformOrigin: "center bottom",
                zIndex: cards.length - i,
              }}
            >
              <div className="flex-1 min-h-0 min-w-0 w-full h-full flex flex-col justify-between p-2">
                <p className="uppercase tracking-tight" style={{ fontFamily: eyebrowFont, fontSize: `calc(0.9rem * ${scale})` }}>
                  {card.eyebrow}
                </p>
                <h2
                  className="uppercase font-black leading-[0.9]"
                  style={{ fontFamily, fontSize: `clamp(calc(1.25rem * ${scale}), calc(3.5cqw * ${scale}), calc(3rem * ${scale}))` }}
                >
                  {card.title}
                </h2>
              </div>
              <div className="flex-1 min-h-0 min-w-0 w-full h-full overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.image} alt="" className="h-full w-full object-cover" draggable={false} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The scrolling document: intro, a transparent spacer the length of
          the pin (letting the hero show through while it holds), then the
          outro, all riding on one translateY. */}
      <div ref={trackRef} className="absolute top-0 left-0 w-full z-[1] will-change-transform">
        <div
          className="w-full flex items-center justify-center"
          style={{ height: "var(--frame-h, 100%)", background }}
        >
          <h1
            className="uppercase font-black leading-[0.85]"
            style={{
              color: introTextColor,
              fontFamily,
              fontSize: `clamp(calc(1.75rem * ${scale}), calc(6cqw * ${scale}), calc(4.5rem * ${scale}))`,
            }}
          >
            {introTitle}
          </h1>
        </div>
        {/* Stands in for the pinned deck's own frame as well as the pin
            itself, since the deck is drawn as a static layer rather than as a
            section in this track. A frame short and the outro overshoots the
            top at the end of the scroll, exposing the deck beneath it. */}
        <div className="w-full" style={{ height: `calc(var(--frame-h, 100%) * ${count * 2 + 1})` }} />
        <div
          className="w-full flex items-center justify-center"
          style={{ height: "var(--frame-h, 100%)", background }}
        >
          <h1
            className="uppercase font-black leading-[0.85]"
            style={{
              color: introTextColor,
              fontFamily,
              fontSize: `clamp(calc(1.75rem * ${scale}), calc(6cqw * ${scale}), calc(4.5rem * ${scale}))`,
            }}
          >
            {outroTitle}
          </h1>
        </div>
      </div>
    </div>
  );
}
