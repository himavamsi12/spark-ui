"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const DEFAULT_HEADINGS = [
  "Order is temporary while you're passing through",
  "Memories shuffle like cards in an endless deck",
  "Each moment scatters as another takes its place",
  "The fragments float before settling once more",
];

// The reference ships four folders of fifteen, so every shuffle lands on a
// wholly fresh set. Pooling four of this project's galleries gets to 56, which
// keeps all but the last few cards of the final set unseen.
const DEFAULT_IMAGES = [
  ...Array.from({ length: 20 }, (_, i) => `/accordion-frames/spotlight-${i + 1}.jpg`),
  ...Array.from({ length: 12 }, (_, i) => `/circular-gallery/img${i + 1}.jpg`),
  ...Array.from({ length: 12 }, (_, i) => `/scroll-wave/img${i + 1}.jpg`),
  ...Array.from({ length: 12 }, (_, i) => `/spiral-gallery/img${i + 1}.jpg`),
];

// Lenis' default lerp — the reference wraps its page in it; this reproduces
// the same easing on the internal wheel-driven scroll instead.
const smoothing = (dt: number) => 1 - Math.pow(0.9, dt * 60);

/** The reference pins the gallery for six viewport-heights. */
const PIN_FRAMES = 6;
/**
 * The gallery is drawn as a static layer rather than as a section inside the
 * track, so the track's spacer has to stand in for the gallery's own frame as
 * well as the pin — the reference's document is intro + gallery + pin spacer +
 * outro. One frame short here and the outro overshoots the top of the frame at
 * the end of the scroll, letting the gallery show through beneath it.
 */
const SPACER_FRAMES = PIN_FRAMES + 1;

/**
 * One notch moves the pixels a real page would, matching the reference. Any
 * multiplier here backfires: the shuffles run on their own 1.25s clock rather
 * than being scrubbed, so scrolling faster doesn't speed them up, it just
 * crosses section boundaries before a shuffle can play and the pinned stretch
 * goes by without showing its effect at all.
 */
const WHEEL_MULTIPLIER = 1;
/**
 * Idle drift, as a fraction of the whole scroll per second, giving a ~14s
 * pass. The pin is six of the eight frames, so each of the four sets holds for
 * roughly 2.7s — comfortably longer than the 1.25s shuffle, so every shuffle
 * reads fully instead of being cut off by the next boundary.
 */
const AUTO_PLAY_RATE = 0.07;

type CardRecord = { element: HTMLDivElement; centerX: number; centerY: number };

type Config = {
  images: string[];
  headings: string[];
  cardCount: number;
  cardWidth: number;
  cardHeight: number;
  spreadMin: number;
  spreadMax: number;
  tilt: number;
  borderColor: string;
  animationDuration: number;
  animationOverlap: number;
  headingFadeDuration: number;
  speed: number;
  autoPlay: boolean;
};

/**
 * A pinned gallery of scattered photos: each quarter of the scroll flings the
 * current set out to whichever edge of the frame it sits nearest and pulls a
 * fresh set in from the edges behind it, while the heading cross-fades.
 */
export default function PhotoScatterGallery({
  introTitle = "Time loosens its grip and the stack begins to shift",
  outroTitle = "Eventually, the stack settles and the scroll continues",
  headings = DEFAULT_HEADINGS,
  images = DEFAULT_IMAGES,
  cardCount = 15,
  cardWidth = 250,
  cardHeight = 300,
  spreadMin = 35,
  spreadMax = 70,
  tilt = 25,
  background = "#141414",
  introBackground = "#0f0f0f",
  borderColor = "#4a4a4a",
  textColor = "#ffffff",
  fontFamily = "var(--font-instrument-serif), serif",
  textScale = 100,
  speed = 100,
  autoPlay = true,
}: {
  introTitle?: string;
  outroTitle?: string;
  /** One scatter set is created per heading; the heading cross-fades on each swap. */
  headings?: string[];
  /** Photo pool, dealt out across the sets in order and cycled when it runs short. */
  images?: string[];
  /** Cards in each set. */
  cardCount?: number;
  cardWidth?: number;
  cardHeight?: number;
  /** Inner edge of the scatter ring, as a % of the frame's smaller side. */
  spreadMin?: number;
  /** Outer edge of the scatter ring, as a % of the frame's smaller side. */
  spreadMax?: number;
  /** Maximum resting tilt of a card, in degrees either way. */
  tilt?: number;
  background?: string;
  introBackground?: string;
  borderColor?: string;
  textColor?: string;
  fontFamily?: string;
  textScale?: number;
  /** How far each scroll notch advances the sequence. */
  speed?: number;
  /** Cycle the sequence on its own instead of waiting for a wheel gesture. */
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const sections = headings.length;

  // Sliders in the customize panel fire onChange continuously while dragged,
  // so tunables are read live from a ref rather than closed over — that keeps
  // the wheel listener, rAF loop and observer mounted exactly once instead of
  // tearing the whole rig down on every drag tick.
  const configRef = useRef<Config>({
    images,
    headings,
    cardCount,
    cardWidth,
    cardHeight,
    spreadMin,
    spreadMax,
    tilt,
    borderColor,
    animationDuration: 0.75,
    animationOverlap: 0.5,
    headingFadeDuration: 0.5,
    speed,
    autoPlay,
  });
  useEffect(() => {
    configRef.current = {
      ...configRef.current,
      images,
      headings,
      cardCount,
      cardWidth,
      cardHeight,
      spreadMin,
      spreadMax,
      tilt,
      borderColor,
      speed,
      autoPlay,
    };
  }, [images, headings, cardCount, cardWidth, cardHeight, spreadMin, spreadMax, tilt, borderColor, speed, autoPlay]);

  // Restyle the cards already on screen without re-rolling their scatter, so
  // dragging a size or colour slider doesn't reshuffle the whole set.
  const restyleRef = useRef<() => void>(() => {});
  useEffect(() => {
    restyleRef.current();
  }, [cardWidth, cardHeight, borderColor]);

  // A full re-deal, for the things that change what a set actually is.
  const redealRef = useRef<() => void>(() => {});
  useEffect(() => {
    redealRef.current();
  }, [cardCount, spreadMin, spreadMax, tilt, images, sections]);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const track = trackRef.current;
    const heading = headingRef.current;
    if (!root || !stage || !track || !heading) return;

    let cards: CardRecord[] = [];
    let currentSection = 0;
    let isAnimating = false;
    const timelines = new Set<gsap.core.Timeline>();

    const viewport = { centerX: 0, centerY: 0, rangeMin: 0, rangeMax: 0 };

    function updateViewport() {
      const cfg = configRef.current;
      const w = root!.clientWidth;
      const h = root!.clientHeight;
      viewport.centerX = w / 2;
      viewport.centerY = h / 2;
      viewport.rangeMin = Math.min(w, h) * (cfg.spreadMin / 100);
      viewport.rangeMax = Math.min(w, h) * (cfg.spreadMax / 100);
    }

    /**
     * The edge a card leaves through (and arrives from): whichever side of the
     * frame its own centre sits nearest, pushed well clear of the bounds with
     * a random slide along that edge.
     */
    function getEdgePosition(centerX: number, centerY: number) {
      const cfg = configRef.current;
      const w = root!.clientWidth;
      const h = root!.clientHeight;
      const distances = { left: centerX, right: w - centerX, top: centerY, bottom: h - centerY };
      const minDistance = Math.min(...Object.values(distances));
      const offsetX = cfg.cardWidth / 2;
      const offsetY = cfg.cardHeight / 2;
      const variation = () => (Math.random() - 0.5) * 400;

      if (minDistance === distances.left) {
        return { x: -300 - Math.random() * 200, y: centerY - offsetY + variation() };
      }
      if (minDistance === distances.right) {
        return { x: w + 50 + Math.random() * 200, y: centerY - offsetY + variation() };
      }
      if (minDistance === distances.top) {
        return { x: centerX - offsetX + variation(), y: -400 - Math.random() * 200 };
      }
      return { x: centerX - offsetX + variation(), y: h + 50 + Math.random() * 200 };
    }

    function styleCard(element: HTMLDivElement) {
      const cfg = configRef.current;
      element.style.position = "absolute";
      element.style.width = `${cfg.cardWidth}px`;
      element.style.height = `${cfg.cardHeight}px`;
      element.style.borderRadius = "1rem";
      element.style.border = `0.5rem solid ${cfg.borderColor}`;
      element.style.boxShadow = "5px 5px 10px rgba(0, 0, 0, 0.25)";
      element.style.willChange = "transform";
      element.style.overflow = "hidden";
    }

    function createCards(setIndex: number): CardRecord[] {
      const cfg = configRef.current;
      const made: CardRecord[] = [];

      for (let i = 0; i < cfg.cardCount; i++) {
        const card = document.createElement("div");
        styleCard(card);

        const img = document.createElement("img");
        img.src = cfg.images[(setIndex * cfg.cardCount + i) % cfg.images.length];
        img.alt = "";
        img.draggable = false;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.borderRadius = "0.5rem";
        card.appendChild(img);

        // One card per equal sector of the ring, jittered anywhere inside its
        // own sector. The reference rolls a free `Math.random() * 2π` per
        // card, which over only fifteen of them reliably stacks several into
        // one arc and leaves a quadrant empty — measurably so, not just on an
        // unlucky load. Keeping the jitter but fixing the sector preserves the
        // hand-scattered look while the ring stays evenly populated.
        const sector = (Math.PI * 2) / cfg.cardCount;
        const angle = i * sector + Math.random() * sector;
        const radius = viewport.rangeMin + Math.random() * (viewport.rangeMax - viewport.rangeMin);
        const centerX = viewport.centerX + Math.cos(angle) * radius;
        const centerY = viewport.centerY + Math.sin(angle) * radius;

        gsap.set(card, {
          left: centerX - cfg.cardWidth / 2,
          top: centerY - cfg.cardHeight / 2,
          rotation: Math.random() * (cfg.tilt * 2) - cfg.tilt,
        });

        stage!.appendChild(card);
        made.push({ element: card, centerX, centerY });
      }

      return made;
    }

    function animateHeading(text: string) {
      const cfg = configRef.current;
      const tl = gsap
        .timeline()
        .to(heading, { opacity: 0, duration: cfg.headingFadeDuration, ease: "power2.inOut" })
        .call(() => {
          heading!.textContent = text;
        })
        .to(heading, { opacity: 1, duration: cfg.headingFadeDuration, ease: "power2.inOut" });
      timelines.add(tl);
      return tl;
    }

    function animateCards(exiting: CardRecord[], entering: CardRecord[]) {
      const cfg = configRef.current;
      const tl = gsap.timeline();

      exiting.forEach(({ element, centerX, centerY }) => {
        const edge = getEdgePosition(centerX, centerY);
        tl.to(
          element,
          {
            left: edge.x,
            top: edge.y,
            rotation: Math.random() * 180 - 90,
            duration: cfg.animationDuration,
            ease: "power2.in",
            onComplete: () => element.remove(),
          },
          0,
        );
      });

      entering.forEach(({ element, centerX, centerY }) => {
        const edge = getEdgePosition(centerX, centerY);
        gsap.set(element, { left: edge.x, top: edge.y, rotation: Math.random() * 180 - 90 });
        tl.to(
          element,
          {
            left: centerX - cfg.cardWidth / 2,
            top: centerY - cfg.cardHeight / 2,
            rotation: Math.random() * (cfg.tilt * 2) - cfg.tilt,
            duration: cfg.animationDuration,
            ease: "power2.out",
          },
          cfg.animationOverlap,
        );
      });

      timelines.add(tl);
      return tl;
    }

    function clearCards() {
      cards.forEach(({ element }) => element.remove());
      cards = [];
    }

    function redeal() {
      timelines.forEach((tl) => tl.kill());
      timelines.clear();
      isAnimating = false;
      clearCards();
      // Any half-flown cards from a killed transition would otherwise be
      // orphaned in the stage, since only their onComplete removes them.
      stage!.replaceChildren();
      updateViewport();
      cards = createCards(currentSection);
      heading!.textContent = configRef.current.headings[currentSection] ?? "";
      gsap.set(heading, { opacity: 1 });
    }
    redealRef.current = redeal;

    restyleRef.current = () => {
      const cfg = configRef.current;
      cards.forEach(({ element, centerX, centerY }) => {
        styleCard(element);
        gsap.set(element, { left: centerX - cfg.cardWidth / 2, top: centerY - cfg.cardHeight / 2 });
      });
    };

    updateViewport();
    cards = createCards(0);
    heading.textContent = configRef.current.headings[0] ?? "";
    gsap.set(heading, { opacity: 1 });

    /** The reference's quarters, generalised to however many headings there are. */
    function getSectionIndex(progress: number) {
      const n = configRef.current.headings.length;
      return Math.min(Math.floor(progress * n), n - 1);
    }

    function onProgress(progress: number) {
      if (isAnimating) return;

      const target = getSectionIndex(progress);
      if (target === currentSection) return;

      isAnimating = true;
      const incoming = createCards(target);

      Promise.all([
        animateCards(cards, incoming).then(),
        animateHeading(configRef.current.headings[target] ?? "").then(),
      ]).then(() => {
        cards = incoming;
        currentSection = target;
        isAnimating = false;
      });
    }

    const frameH = () => root!.clientHeight;
    // Track content is intro + spacer + outro; the last frame of travel is the
    // outro sliding up to fill the frame exactly.
    const maxScroll = () => frameH() * (SPACER_FRAMES + 1);

    function frame(scroll: number) {
      const inH = frameH();
      const pinH = frameH() * PIN_FRAMES;
      onProgress(gsap.utils.clamp(0, 1, (scroll - inH) / pinH));
      track!.style.transform = `translateY(${-scroll}px)`;
    }

    frame(0);

    let scroll = 0;
    let target = 0;
    let userDriven = false;

    function onWheel(e: WheelEvent) {
      const rate = Math.max(0.2, configRef.current.speed / 100);
      const next = gsap.utils.clamp(0, maxScroll(), target + e.deltaY * WHEEL_MULTIPLIER * rate);
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
      const cfg = configRef.current;
      const rate = Math.max(0.2, cfg.speed / 100);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // Idle playback stands still for the length of a shuffle. onProgress
      // ignores section changes while one is in flight — faithful for a real
      // scrub, where racing past a section is the visitor's own doing — so
      // left running, auto-play would sail over a section and never show it.
      // Both the target and the lerp below are held, since catching up to a
      // target set before the shuffle can cross a boundary just as easily.
      // Nothing moves on screen during the pin anyway: the track is a
      // transparent spacer there and the gallery is a static layer.
      const holdForShuffle = cfg.autoPlay && !userDriven && isAnimating;
      if (cfg.autoPlay && !userDriven && !isAnimating) {
        target += dir * dt * maxScroll() * AUTO_PLAY_RATE * rate;
        if (target >= maxScroll()) {
          target = maxScroll();
          dir = -1;
        } else if (target <= 0) {
          target = 0;
          dir = 1;
        }
      }
      if (!holdForShuffle) scroll += (target - scroll) * smoothing(dt);
      frame(scroll);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      root!.style.setProperty("--frame-h", `${root!.clientHeight}px`);
      redeal();
      frame(scroll);
    });
    root.style.setProperty("--frame-h", `${root.clientHeight}px`);
    ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      timelines.forEach((tl) => tl.kill());
      timelines.clear();
      root.removeEventListener("wheel", onWheel);
      stage.replaceChildren();
      redealRef.current = () => {};
      restyleRef.current = () => {};
    };
    // Mounted once: every tunable is read live from configRef, and the two
    // effects above re-style or re-deal the cards without rebuilding the rig.
  }, []);

  const headingStyle = {
    width: "45%",
    textAlign: "center",
    fontFamily,
    fontWeight: 500,
    lineHeight: 0.9,
    letterSpacing: "-0.025rem",
    fontSize: `clamp(calc(1.75rem * ${scale}), calc(5cqw * ${scale}), calc(7cqw * ${scale}))`,
  } as const;

  return (
    <div
      ref={rootRef}
      className="relative w-full h-full overflow-hidden"
      style={{ isolation: "isolate", containerType: "inline-size", color: textColor }}
    >
      {/* The pinned gallery: the scatter stage and its heading, static in the
          frame while the intro above and outro below scroll over it. */}
      <div className="absolute inset-0 z-0 flex items-center justify-center" style={{ background }}>
        <div ref={stageRef} className="absolute inset-0" aria-hidden />
        {/* Left empty on purpose, exactly like the reference: the heading's
            text is owned by the timeline that cross-fades it. */}
        <h1 ref={headingRef} className="relative z-[2] @max-[1000px]:w-full @max-[1000px]:p-8" style={headingStyle} />
      </div>

      {/* The scrolling document: intro, a transparent spacer the length of the
          pin, then the outro. */}
      <div ref={trackRef} className="absolute top-0 left-0 w-full z-[1] will-change-transform">
        <div
          className="w-full flex items-center justify-center"
          style={{ height: "var(--frame-h, 100%)", background: introBackground }}
        >
          <h1 className="@max-[1000px]:w-full @max-[1000px]:p-8" style={headingStyle}>
            {introTitle}
          </h1>
        </div>
        <div className="w-full" style={{ height: `calc(var(--frame-h, 100%) * ${SPACER_FRAMES})` }} />
        <div
          className="w-full flex items-center justify-center"
          style={{ height: "var(--frame-h, 100%)", background: introBackground }}
        >
          <h1 className="@max-[1000px]:w-full @max-[1000px]:p-8" style={headingStyle}>
            {outroTitle}
          </h1>
        </div>
      </div>
    </div>
  );
}
