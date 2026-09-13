"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

/** Effective CSS zoom on an untransformed element (1 unless inside a zoomed container). */
function cssZoom(el: HTMLElement): number {
  const layout = el.offsetWidth;
  const visual = el.getBoundingClientRect().width;
  return layout && visual ? visual / layout : 1;
}

gsap.registerPlugin(SplitText);

const DEFAULT_LINKS = ["Index", "Persona", "Biography", "Work", "Journal"];
const DEFAULT_COL_ONE = [
  "Studio",
  "Shoreline Drive",
  "Oslo",
  "",
  "Edition",
  "Vol. 03",
  "",
  "Contact",
  "hello@example.com",
  "",
  "Direct",
  "+47 1234 567890",
];
const DEFAULT_COL_TWO = [
  "Instagram",
  "Are.na",
  "Vimeo",
  "",
  "",
  "Language",
  "Norsk",
  "",
  "",
  "Credits",
  "Imprint",
  "Ref. 00492X",
];

const CLOSED_CLIP = "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)";
const OPEN_CLIP = "polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)";
const COLLAPSE_CLIP = "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)";

const LERP_FACTOR = 0.05;
const NARROW_WIDTH = 1000;

/**
 * A full-screen menu that wipes up over the page. Its links are set far wider
 * than the frame and ride sideways with the pointer, an accent bar tracks
 * whichever one you are over, and each word swaps for a second copy of itself
 * letter by letter on hover.
 */
export default function SlidingRailMenu({
  heroTitle = "Shaping Ideas",
  toggleLabel = "Menu",
  navItem = "Archive",
  links = DEFAULT_LINKS,
  columnOne = DEFAULT_COL_ONE,
  columnTwo = DEFAULT_COL_TWO,
  menuImage = "/accordion-frames/spotlight-7.jpg",
  dark = "#1e1e1e",
  light = "#fefff8",
  accent = "#fca311",
  linkSize = 10,
  imageWidth = 150,
  displayFont = "var(--font-barlow-condensed), sans-serif",
  bodyFont = "var(--font-dm-sans), sans-serif",
  textScale = 100,
  autoOpen = true,
}: {
  heroTitle?: string;
  toggleLabel?: string;
  navItem?: string;
  /** The oversized words along the foot of the menu. */
  links?: string[];
  columnOne?: string[];
  columnTwo?: string[];
  menuImage?: string;
  dark?: string;
  light?: string;
  /** The bar that tracks the hovered link. */
  accent?: string;
  /** Size of the menu words, in rem. */
  linkSize?: number;
  /** Width of the centre image, in px. */
  imageWidth?: number;
  displayFont?: string;
  bodyFont?: string;
  textScale?: number;
  /** Opens the menu shortly after mount so the demo shows it. */
  autoOpen?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const highlighterRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLDivElement | null)[]>([]);
  const anchorRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const toggleRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current;
    const container = containerRef.current;
    const overlay = overlayRef.current;
    const content = contentRef.current;
    const image = imageRef.current;
    const wrapper = wrapperRef.current;
    const highlighter = highlighterRef.current;
    if (!root || !container || !overlay || !content || !image || !wrapper || !highlighter) return;

    // The container masks; the anchor inside it is what actually travels, so
    // the word rises out from behind its own frame rather than carrying it.
    const linkEls = linkRefs.current.filter(Boolean) as HTMLDivElement[];
    const anchorEls = anchorRefs.current.filter(Boolean) as HTMLSpanElement[];
    const splits: SplitText[] = [];
    const cleanups: (() => void)[] = [];
    let raf = 0;
    let openTimer: number | undefined;
    let cancelled = false;

    let currentX = 0;
    let targetX = 0;
    let currentHighlighterX = 0;
    let targetHighlighterX = 0;
    let currentHighlighterWidth = 0;
    let targetHighlighterWidth = 0;
    let isMenuOpen = false;
    let isMenuAnimating = false;

    // The reference's own 1000px cutoff, read off the frame rather than the
    // window so a boxed demo behaves like a viewport of its own size.
    const isNarrow = () => root!.clientWidth < NARROW_WIDTH;

    // Parked before the first paint rather than inside the deferred start
    // below, so the menu is never briefly assembled on screen while the fonts
    // are still settling.
    gsap.set(content, { y: "50%", opacity: 0.25 });
    gsap.set(image, { scale: 0.5, opacity: 0.25 });
    gsap.set(anchorEls, { y: "150%" });
    gsap.set(highlighter, { y: "150%" });

    function start() {
      if (cancelled) return;

      // Each word carries two stacked copies; the second is parked below so it
      // can take the first's place a letter at a time.
      linkEls.forEach((link) => {
        const copies = link.querySelectorAll(":scope > span > span");
        copies.forEach((copy, copyIndex) => {
          const split = SplitText.create(copy, { type: "chars", charsClass: "char" });
          splits.push(split);
          gsap.set(split.chars, { position: "relative", display: "inline-block" });
          if (copyIndex === 1) gsap.set(split.chars, { y: "110%" });
        });
      });

      // The bar starts on the first link, measured off the real layout.
      const first = linkEls[0];
      if (first) {
        const firstCopy = first.querySelector(":scope > span > span") as HTMLElement | null;
        const width = firstCopy ? firstCopy.offsetWidth : first.offsetWidth;
        highlighter!.style.width = `${width}px`;
        currentHighlighterWidth = width;
        targetHighlighterWidth = width;
        const x = (first.getBoundingClientRect().left - wrapper!.getBoundingClientRect().left) / cssZoom(wrapper!);
        currentHighlighterX = x;
        targetHighlighterX = x;
      }

      function toggleMenu() {
        if (isMenuAnimating) return;
        isMenuAnimating = true;

        if (!isMenuOpen) {
          gsap.to(container, { y: "-40%", opacity: 0.25, duration: 1.25, ease: "expo.out" });
          gsap.to(overlay, {
            clipPath: OPEN_CLIP,
            duration: 1.25,
            ease: "expo.out",
            onComplete: () => {
              gsap.set(container, { y: "40%" });
              gsap.set(linkEls, { overflow: "visible" });
              isMenuOpen = true;
              isMenuAnimating = false;
            },
          });
          gsap.to(content, { y: "0%", opacity: 1, duration: 1.5, ease: "expo.out" });
          gsap.to(image, { scale: 1, opacity: 1, duration: 1.5, ease: "expo.out" });
          gsap.to(anchorEls, { y: "0%", duration: 1.25, stagger: 0.1, delay: 0.25, ease: "expo.out" });
          gsap.to(highlighter, { y: "0%", duration: 1, delay: 1, ease: "expo.out" });
        } else {
          gsap.to(container, { y: "0%", opacity: 1, duration: 1.25, ease: "expo.out" });
          gsap.to(anchorEls, { y: "-200%", duration: 1.25, ease: "expo.out" });
          gsap.to(content, { y: "-100%", opacity: 0.25, duration: 1.25, ease: "expo.out" });
          gsap.to(image, { y: "-100%", opacity: 0.5, duration: 1.25, ease: "expo.out" });
          gsap.to(overlay, {
            clipPath: COLLAPSE_CLIP,
            duration: 1.25,
            ease: "expo.out",
            onComplete: () => {
              gsap.set(overlay, { clipPath: CLOSED_CLIP });
              gsap.set(anchorEls, { y: "150%" });
              gsap.set(highlighter, { y: "150%" });
              gsap.set(content, { y: "50%", opacity: 0.25 });
              gsap.set(image, { y: "0%", scale: 0.5, opacity: 0.25 });
              gsap.set(linkEls, { overflow: "hidden" });
              gsap.set(wrapper, { x: 0 });
              currentX = 0;
              targetX = 0;
              isMenuOpen = false;
              isMenuAnimating = false;
            },
          });
        }
      }
      toggleRef.current = toggleMenu;

      linkEls.forEach((link) => {
        const onEnter = () => {
          if (isNarrow()) return;
          const copies = link.querySelectorAll(":scope > span > span");
          const visibleChars = copies[0].querySelectorAll(".char");
          const animatedChars = copies[1]?.querySelectorAll(".char") ?? [];
          gsap.to(visibleChars, { y: "-110%", stagger: 0.03, duration: 0.5, ease: "expo.inOut" });
          gsap.to(animatedChars, { y: "0%", stagger: 0.03, duration: 0.5, ease: "expo.inOut" });

          const x = (link.getBoundingClientRect().left - wrapper!.getBoundingClientRect().left) / cssZoom(wrapper!);
          targetHighlighterX = x;
          const copyEl = link.querySelector(":scope > span > span") as HTMLElement | null;
          targetHighlighterWidth = copyEl ? copyEl.offsetWidth : link.offsetWidth;
        };
        const onLeave = () => {
          if (isNarrow()) return;
          const copies = link.querySelectorAll(":scope > span > span");
          const visibleChars = copies[0].querySelectorAll(".char");
          const animatedChars = copies[1]?.querySelectorAll(".char") ?? [];
          gsap.to(animatedChars, { y: "110%", stagger: 0.03, duration: 0.5, ease: "expo.inOut" });
          gsap.to(visibleChars, { y: "0%", stagger: 0.03, duration: 0.5, ease: "expo.inOut" });
        };
        link.addEventListener("mouseenter", onEnter);
        link.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          link.removeEventListener("mouseenter", onEnter);
          link.removeEventListener("mouseleave", onLeave);
        });
      });

      /**
       * The rail is wider than the frame, so the pointer drives it sideways —
       * but only across the middle half, which leaves dead margins either side
       * rather than the rail lurching the moment the pointer enters.
       */
      function onMouseMove(e: MouseEvent) {
        if (isNarrow()) return;
        const rect = root!.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / cssZoom(root!);
        const viewportWidth = root!.clientWidth;
        const wrapperWidth = wrapper!.offsetWidth;

        const maxMoveLeft = 0;
        const maxMoveRight = viewportWidth - wrapperWidth;
        const sensitivityRange = viewportWidth * 0.5;
        const startX = (viewportWidth - sensitivityRange) / 2;
        const endX = startX + sensitivityRange;

        let mousePercentage: number;
        if (mouseX <= startX) mousePercentage = 0;
        else if (mouseX >= endX) mousePercentage = 1;
        else mousePercentage = (mouseX - startX) / sensitivityRange;

        targetX = maxMoveLeft + mousePercentage * (maxMoveRight - maxMoveLeft);
      }
      overlay!.addEventListener("mousemove", onMouseMove);
      cleanups.push(() => overlay!.removeEventListener("mousemove", onMouseMove));

      function onWrapperLeave() {
        const first = linkEls[0];
        if (!first) return;
        const copyEl = first.querySelector(":scope > span > span") as HTMLElement | null;
        targetHighlighterX =
          (first.getBoundingClientRect().left - wrapper!.getBoundingClientRect().left) / cssZoom(wrapper!);
        targetHighlighterWidth = copyEl ? copyEl.offsetWidth : first.offsetWidth;
      }
      wrapper!.addEventListener("mouseleave", onWrapperLeave);
      cleanups.push(() => wrapper!.removeEventListener("mouseleave", onWrapperLeave));

      function animate() {
        currentX += (targetX - currentX) * LERP_FACTOR;
        currentHighlighterX += (targetHighlighterX - currentHighlighterX) * LERP_FACTOR;
        currentHighlighterWidth += (targetHighlighterWidth - currentHighlighterWidth) * LERP_FACTOR;

        gsap.to(wrapper, { x: currentX, duration: 0.3, ease: "power4.out" });
        gsap.to(highlighter, {
          x: currentHighlighterX,
          width: currentHighlighterWidth,
          duration: 0.3,
          ease: "power4.out",
        });

        raf = requestAnimationFrame(animate);
      }
      animate();

      if (autoOpen) openTimer = window.setTimeout(() => toggleMenu(), 800);
    }

    // SplitText measures rendered text, so a webfont landing late would split
    // against the fallback face.
    if (document.fonts?.status === "loaded") start();
    else document.fonts?.ready.then(start).catch(start);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (openTimer) clearTimeout(openTimer);
      cleanups.forEach((fn) => fn());
      gsap.killTweensOf([container, overlay, content, image, wrapper, highlighter, ...linkEls, ...anchorEls]);
      splits.forEach((s) => s.revert());
      toggleRef.current = () => {};
    };
    // The columns are inert markup, so they are not dependencies; the type
    // settings are, because the highlighter's width is measured off the words.
  }, [links.join("\u0000"), autoOpen, linkSize, textScale, displayFont]);

  const smallType = {
    fontFamily: bodyFont,
    textTransform: "uppercase",
    fontSize: `calc(0.8rem * ${scale})`,
    fontWeight: 600,
    lineHeight: 1,
  } as const;

  const column = (items: string[], align: "left" | "right") => (
    <div style={{ textAlign: align }}>
      {items.map((item, i) =>
        item === "" ? <br key={i} /> : (
          <p key={i} style={smallType} className="select-none">
            {item}
          </p>
        ),
      )}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={
        {
          background: "#000",
          fontFamily: bodyFont,
          containerType: "inline-size",
          "--srm-link-fs": `calc(${linkSize}rem * ${scale})`,
          "--srm-link-ls": "-0.2rem",
          "--srm-hero-fs": `calc(${linkSize}rem * ${scale})`,
          "--srm-scale": String(scale),
        } as React.CSSProperties
      }
    >
      <nav
        className="absolute top-0 left-0 z-[2] flex w-full justify-between mix-blend-difference"
        style={{ padding: "1rem", color: light }}
      >
        <div onClick={() => toggleRef.current()} style={{ padding: "1rem", cursor: "pointer" }}>
          <p style={smallType} className="select-none">
            {toggleLabel}
          </p>
        </div>
        <div style={{ padding: "1rem", cursor: "pointer" }}>
          <p style={smallType} className="select-none">
            {navItem}
          </p>
        </div>
      </nav>

      <div
        ref={overlayRef}
        className="absolute top-0 left-0 z-[1] h-full w-full overflow-hidden will-change-[clip-path] @max-[1000px]:[--srm-link-fs:calc(4rem*var(--srm-scale))] @max-[1000px]:[--srm-link-ls:-0.05rem]"
        style={{ background: dark, color: light, clipPath: CLOSED_CLIP }}
      >
        <div
          ref={contentRef}
          className="absolute flex w-full items-center justify-between will-change-[transform,opacity] @max-[1000px]:!top-1/4"
          style={{ top: "45%", transform: "translateY(-50%)", padding: "2rem" }}
        >
          {column(columnOne, "left")}
          {column(columnTwo, "right")}
        </div>

        <div
          ref={imageRef}
          className="absolute will-change-[transform,opacity] @max-[1000px]:!hidden"
          style={{
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: `${imageWidth}px`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={menuImage} alt="" className="h-full w-full object-cover" draggable={false} />
        </div>

        <div
          ref={wrapperRef}
          className="absolute bottom-0 left-0 flex w-max justify-between will-change-transform @max-[1000px]:!flex-col @max-[1000px]:!gap-0"
          style={{ padding: "2rem", gap: "2rem" }}
        >
          {links.map((link, i) => (
            <div
              key={`${link}-${i}`}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              className="relative overflow-hidden will-change-transform"
            >
              {/* A span, not an anchor: these cards are themselves links in
                  the gallery, and an anchor inside an anchor is invalid HTML
                  that breaks hydration. */}
              <span
                ref={(el) => {
                  anchorRefs.current[i] = el;
                }}
                className="relative inline-block overflow-hidden no-underline select-none"
                style={{
                  color: light,
                  fontFamily: displayFont,
                  fontSize: "var(--srm-link-fs)",
                  fontWeight: 500,
                  letterSpacing: "var(--srm-link-ls)",
                  lineHeight: 1,
                }}
              >
                <span>{link}</span>
                {/* The second copy sits exactly over the first, parked below. */}
                <span style={{ position: "absolute", top: 0, left: 0 }}>{link}</span>
              </span>
            </div>
          ))}

          <div
            ref={highlighterRef}
            className="absolute bottom-0 left-0 will-change-[transform,width] @max-[1000px]:!hidden"
            style={{ width: "400px", height: "0.75rem", background: accent }}
          />
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative z-0 h-full w-full will-change-[transform,opacity] @max-[1000px]:[--srm-hero-fs:calc(4rem*var(--srm-scale))]"
      >
        <section
          className="relative flex h-full w-full items-center justify-center text-center"
          style={{ background: light, color: dark, padding: "2rem" }}
        >
          <h1
            className="w-[70%] uppercase @max-[1000px]:!w-full"
            style={{
              fontFamily: displayFont,
              fontSize: "var(--srm-hero-fs)",
              fontWeight: 500,
              letterSpacing: "-0.1rem",
              lineHeight: 0.9,
            }}
          >
            {heroTitle}
          </h1>
        </section>
      </div>
    </div>
  );
}
