"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

/**
 * An original sail mark: one closed path, so it both writes on as a single
 * continuous stroke and reads as a solid once it fills.
 */
const LOGO_PATH =
  "M12 108 C12 54 42 14 104 2 C88 26 76 50 70 74 C86 58 102 50 116 46 C92 64 66 86 50 108 Z";

const DEFAULT_IMAGES = [
  "/accordion-frames/spotlight-1.jpg",
  "/accordion-frames/spotlight-2.jpg",
  "/accordion-frames/spotlight-3.jpg",
  "/accordion-frames/spotlight-4.jpg",
];

type PageKey = "index" | "archive" | "contact";
const PAGES: PageKey[] = ["index", "archive", "contact"];

/** Lenis's own curve, so the archive column carries the same weight. */
const smoothing = (dt: number) => 1 - Math.pow(0.9, dt * 60);

/**
 * Moving between pages closes a row of panels across the screen from the left,
 * holds on a mark that writes itself on and fills, then opens the panels again
 * from the right onto the page that was behind them.
 */
export default function BlockSweepPageTransition({
  brand = "Silhouette",
  navLinks = ["Index", "Archive", "Contact"],
  indexHeading = "Timeless Form",
  contactHeading = "Get in touch",
  images = DEFAULT_IMAGES,
  blockCount = 20,
  blockColor = "#222222",
  pageColor = "#e3e4d8",
  textColor = "#141414",
  logoColor = "#e3e4d8",
  headingSize = 12,
  archiveWidth = 30,
  displayFont = "var(--font-barlow-condensed), sans-serif",
  monoFont = "var(--font-dm-mono), monospace",
  textScale = 100,
  speed = 100,
  autoPlay = true,
}: {
  brand?: string;
  /** Labels for the three pages, in order. */
  navLinks?: string[];
  indexHeading?: string;
  contactHeading?: string;
  /** The archive column, top to bottom. */
  images?: string[];
  /** How many panels sweep across; more means a finer sweep. */
  blockCount?: number;
  blockColor?: string;
  pageColor?: string;
  textColor?: string;
  /** Colour the mark writes itself in, and fills with. */
  logoColor?: string;
  /** Size of the page headings, in rem. */
  headingSize?: number;
  /** Width of the archive column, as a % of the frame. */
  archiveWidth?: number;
  displayFont?: string;
  monoFont?: string;
  textScale?: number;
  speed?: number;
  /** Moves through the pages on its own until a link is used. */
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rate = Math.max(0.2, speed / 100);

  const [page, setPage] = useState<PageKey>("index");
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoOverlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);
  const blocksRef = useRef<(HTMLDivElement | null)[]>([]);
  const isTransitioning = useRef(false);
  const pathLengthRef = useRef(0);
  const revealTimeoutRef = useRef<number | null>(null);
  const userDriven = useRef(false);
  const rateRef = useRef(rate);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const blocks = () => blocksRef.current.filter(Boolean) as HTMLDivElement[];

  const revealPage = useCallback(() => {
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    const r = rateRef.current;

    gsap.set(blocks(), { scaleX: 1, transformOrigin: "right" });

    gsap.to(blocks(), {
      scaleX: 0,
      duration: 0.4 / r,
      stagger: 0.02 / r,
      ease: "power2.out",
      transformOrigin: "right",
      onComplete: () => {
        isTransitioning.current = false;
        if (overlayRef.current) overlayRef.current.style.pointerEvents = "none";
        if (logoOverlayRef.current) logoOverlayRef.current.style.pointerEvents = "none";
      },
    });

    // A backstop in case the sweep above is interrupted and leaves the page
    // sitting behind a panel that never opened.
    revealTimeoutRef.current = window.setTimeout(() => {
      const list = blocks();
      const firstBlock = list[0];
      if (firstBlock && (gsap.getProperty(firstBlock, "scaleX") as number) > 0) {
        gsap.to(list, {
          scaleX: 0,
          duration: 0.2 / rateRef.current,
          ease: "power2.out",
          transformOrigin: "right",
          onComplete: () => {
            isTransitioning.current = false;
            if (overlayRef.current) overlayRef.current.style.pointerEvents = "none";
            if (logoOverlayRef.current) logoOverlayRef.current.style.pointerEvents = "none";
          },
        });
      }
    }, 1000);
  }, []);

  const coverPage = useCallback(
    (next: PageKey) => {
      const overlay = overlayRef.current;
      const logoOverlay = logoOverlayRef.current;
      const path = logoRef.current?.querySelector("path");
      if (!overlay || !logoOverlay || !path) return;

      const r = rateRef.current;
      overlay.style.pointerEvents = "auto";
      logoOverlay.style.pointerEvents = "auto";

      // The page swaps only once the mark has come and gone, which is what
      // makes the hold feel like a destination rather than a wipe.
      const tl = gsap.timeline({ onComplete: () => setPage(next) });

      tl.to(blocks(), {
        scaleX: 1,
        duration: 0.4 / r,
        stagger: 0.02 / r,
        ease: "power2.out",
        transformOrigin: "left",
      })
        .set(logoOverlay, { opacity: 1 }, `-=${0.2 / r}`)
        .set(path, { strokeDashoffset: pathLengthRef.current, fill: "transparent" }, `-=${0.25 / r}`)
        .to(path, { strokeDashoffset: 0, duration: 2 / r, ease: "power2.inOut" }, `-=${0.5 / r}`)
        .to(path, { fill: logoColor, duration: 1 / r, ease: "power2.out" }, `-=${0.5 / r}`)
        .to(logoOverlay, { opacity: 0, duration: 0.25 / r, ease: "power2.out" });
    },
    [logoColor],
  );

  const handleRouteChange = useCallback(
    (next: PageKey) => {
      if (isTransitioning.current) return;
      isTransitioning.current = true;
      coverPage(next);
    },
    [coverPage],
  );

  // Blocks start closed and the mark starts undrawn; the reveal below is what
  // opens them, so the first paint already plays the transition's second half.
  useEffect(() => {
    gsap.set(blocks(), { scaleX: 0, transformOrigin: "left" });

    const path = logoRef.current?.querySelector("path");
    if (path) {
      pathLengthRef.current = path.getTotalLength();
      gsap.set(path, {
        strokeDasharray: pathLengthRef.current,
        strokeDashoffset: pathLengthRef.current,
        fill: "transparent",
      });
    }
  }, [blockCount]);

  useEffect(() => {
    revealPage();
    return () => {
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
  }, [page, revealPage]);

  // Read from a ref rather than a state updater: a transition is a side effect
  // and React may run an updater twice.
  const pageRef = useRef<PageKey>(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (!autoPlay) return;
    const id = window.setInterval(() => {
      if (userDriven.current || isTransitioning.current) return;
      isTransitioning.current = true;
      coverPage(PAGES[(PAGES.indexOf(pageRef.current) + 1) % PAGES.length]);
    }, 5200 / rate);
    return () => clearInterval(id);
  }, [autoPlay, coverPage, rate]);

  const onNavClick = (next: PageKey) => {
    userDriven.current = true;
    if (next !== page) handleRouteChange(next);
  };

  const linkStyle = {
    fontFamily: monoFont,
    textTransform: "uppercase",
    color: textColor,
    fontSize: `calc(0.9rem * ${scale})`,
    fontWeight: 500,
    cursor: "pointer",
  } as const;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background: pageColor, containerType: "inline-size" }}
    >
      <nav
        className="absolute top-0 left-0 z-[1] flex w-full items-center justify-between"
        style={{ padding: "2rem" }}
      >
        <div
          onClick={() => onNavClick("index")}
          style={{
            ...linkStyle,
            fontFamily: displayFont,
            fontSize: `calc(1.25rem * ${scale})`,
            fontWeight: 700,
          }}
          className="select-none"
        >
          {brand}
        </div>
        <div className="flex" style={{ gap: "2rem" }}>
          {PAGES.map((key, i) => (
            <div key={key} onClick={() => onNavClick(key)} style={linkStyle} className="select-none">
              {navLinks[i] ?? key}
            </div>
          ))}
        </div>
      </nav>

      {/* Keyed so every page re-runs its own entrance, the way a route change
          remounts the page beneath the overlay. */}
      <PageBody
        key={page}
        page={page}
        heading={page === "index" ? indexHeading : contactHeading}
        images={images}
        pageColor={pageColor}
        textColor={textColor}
        headingSize={headingSize}
        archiveWidth={archiveWidth}
        displayFont={displayFont}
        scale={scale}
        rate={rate}
      />

      <div
        ref={overlayRef}
        className="pointer-events-none absolute top-0 left-0 z-[2] flex h-full w-full"
      >
        {Array.from({ length: Math.max(1, blockCount) }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              blocksRef.current[i] = el;
            }}
            className="h-full flex-1"
            style={{ background: blockColor, transform: "scaleX(0)", transformOrigin: "left" }}
          />
        ))}
      </div>

      <div
        ref={logoOverlayRef}
        className="pointer-events-none absolute top-0 left-0 z-[10000] flex h-full w-full items-center justify-center opacity-0"
        style={{ background: blockColor }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: "200px", height: "200px", padding: "20px" }}
        >
          <svg ref={logoRef} width="160" height="160" viewBox="-4 -4 128 128" fill="none">
            <path
              d={LOGO_PATH}
              fill="none"
              stroke={logoColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function PageBody({
  page,
  heading,
  images,
  pageColor,
  textColor,
  headingSize,
  archiveWidth,
  displayFont,
  scale,
  rate,
}: {
  page: PageKey;
  heading: string;
  images: string[];
  pageColor: string;
  textColor: string;
  headingSize: number;
  archiveWidth: number;
  displayFont: string;
  scale: number;
  rate: number;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const archiveRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    let split: SplitText | null = null;
    let cancelled = false;

    function start() {
      if (cancelled || !el) return;
      split = SplitText.create(el, { type: "chars", mask: "chars", charsClass: "char++" });
      gsap.set(split.chars, { position: "relative", display: "inline-block" });
      gsap.set(split.chars, { y: "100%" });
      gsap.to(split.chars, {
        y: "0%",
        duration: 1 / rate,
        stagger: 0.03 / rate,
        ease: "power4.out",
        delay: 0.3 / rate,
      });
    }

    // SplitText measures rendered text, so a webfont landing late would mask
    // the characters against the fallback face.
    if (document.fonts?.status === "loaded") start();
    else document.fonts?.ready.then(start).catch(start);

    return () => {
      cancelled = true;
      if (split) {
        gsap.killTweensOf(split.chars);
        split.revert();
      }
    };
  }, [heading, rate]);

  // The archive is the one page long enough to scroll; it is driven off the
  // wheel because a boxed demo has no page scroll of its own.
  useEffect(() => {
    const frame = archiveRef.current;
    const track = trackRef.current;
    if (page !== "archive" || !frame || !track) return;

    let scroll = 0;
    let target = 0;
    let raf = 0;
    let last = performance.now();

    const maxScroll = () => Math.max(0, track.scrollHeight - frame.clientHeight);

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      target = Math.min(Math.max(target + e.deltaY, 0), maxScroll());
    }
    frame.addEventListener("wheel", onWheel, { passive: false });

    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      scroll += (target - scroll) * smoothing(dt);
      track!.style.transform = `translateY(${-scroll}px)`;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      frame.removeEventListener("wheel", onWheel);
    };
  }, [page]);

  if (page === "archive") {
    return (
      <div ref={archiveRef} className="relative h-full w-full overflow-hidden">
        <div
          ref={trackRef}
          className="mx-auto flex flex-col will-change-transform @max-[900px]:!w-4/5"
          style={{
            width: `${archiveWidth}%`,
            padding: "15rem 2rem",
            gap: "2rem",
            background: pageColor,
          }}
        >
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${src}-${i}`}
              src={src}
              alt=""
              className="w-full object-cover"
              style={{ aspectRatio: "5 / 7" }}
              draggable={false}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      style={{ padding: "2rem", background: pageColor }}
    >
      <h1
        ref={headingRef}
        className="text-center uppercase @max-[900px]:![font-size:calc(2rem*var(--bspt-scale))]"
        style={
          {
            fontFamily: displayFont,
            color: textColor,
            fontSize: `calc(${headingSize}rem * ${scale})`,
            fontWeight: 800,
            lineHeight: 1,
            "--bspt-scale": String(scale),
          } as React.CSSProperties
        }
      >
        {heading}
      </h1>
    </div>
  );
}
