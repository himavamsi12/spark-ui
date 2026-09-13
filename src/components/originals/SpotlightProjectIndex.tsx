"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Effective CSS zoom on an untransformed element (1 unless inside a zoomed container). */
function cssZoom(el: HTMLElement): number {
  const layout = el.offsetWidth;
  const visual = el.getBoundingClientRect().width;
  return layout && visual ? visual / layout : 1;
}

/** getBoundingClientRect() in layout pixels, so rects and CSS left/top agree under zoom. */
function layoutRect(el: Element, zoom: number) {
  const r = el.getBoundingClientRect();
  return { left: r.left / zoom, top: r.top / zoom, right: r.right / zoom, bottom: r.bottom / zoom, width: r.width / zoom, height: r.height / zoom };
}

const DEFAULT_NAMES = [
  "Human Form Study",
  "Interior Light",
  "Project 21",
  "Shadow Portraits",
  "Everyday Objects",
  "Unit 07 Care",
  "Motion Practice",
  "Noonlight Series",
  "Material Stillness",
  "Quiet Walk",
];
const DEFAULT_IMAGES = Array.from({ length: 10 }, (_, i) => `/circular-gallery/img${i + 1}.jpg`);

/** The reference pins the spotlight for five viewport-heights. */
const PIN_FRAMES = 5;
/**
 * The pinned section is drawn as a static layer rather than as a block in the
 * track, so the spacer stands in for its own frame as well as the pin.
 */
const SPACER_FRAMES = PIN_FRAMES + 1;

/** Lenis' default lerp, the smoothing the reference scrolls with. */
const smoothing = (dt: number) => 1 - Math.pow(0.9, dt * 60);

/**
 * A pinned spotlight with three things moving at once: a counter sliding down
 * the left, a column of stills riding up the middle with whichever one holds
 * the centre line brought to full strength, and the project names peeling off
 * the bottom right one at a time as their turn comes round.
 */
export default function SpotlightProjectIndex({
  introText = "A collection of selected works",
  outroText = "Scroll complete",
  names = DEFAULT_NAMES,
  images = DEFAULT_IMAGES,
  background = "#141414",
  textColor = "#ffffff",
  inactiveColor = "#4a4a4a",
  imageWidth = 35,
  dimmedOpacity = 50,
  mobileBreakpoint = 1000,
  fontFamily = "var(--font-plus-jakarta-sans), sans-serif",
  textScale = 100,
  speed = 100,
  autoPlay = true,
}: {
  introText?: string;
  outroText?: string;
  /** One project per name; the counter and the stills follow this count. */
  names?: string[];
  images?: string[];
  background?: string;
  textColor?: string;
  /** Colour of a name whose turn hasn't come round. */
  inactiveColor?: string;
  /** Width of the image column, as a % of the frame. */
  imageWidth?: number;
  /** Strength of the stills that aren't holding the centre line, as a %. */
  dimmedOpacity?: number;
  /** Frame width, in px, below which the column goes full-bleed. */
  mobileBreakpoint?: number;
  fontFamily?: string;
  textScale?: number;
  speed?: number;
  /** Run the pinned sequence on its own instead of waiting for a wheel gesture. */
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<HTMLHeadingElement>(null);
  const imagesRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nameRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const total = names.length;

  const configRef = useRef({ textColor, inactiveColor, dimmedOpacity, mobileBreakpoint, speed, autoPlay });
  useEffect(() => {
    configRef.current = { textColor, inactiveColor, dimmedOpacity, mobileBreakpoint, speed, autoPlay };
  }, [textColor, inactiveColor, dimmedOpacity, mobileBreakpoint, speed, autoPlay]);

  useEffect(() => {
    const root = rootRef.current;
    const hero = heroRef.current;
    const track = trackRef.current;
    const projectIndex = indexRef.current;
    const imagesContainer = imagesRef.current;
    const namesContainer = namesRef.current;
    if (!root || !hero || !track || !projectIndex || !imagesContainer || !namesContainer) return;

    const imgs = imgRefs.current.filter(Boolean) as HTMLDivElement[];
    const nameEls = nameRefs.current.filter(Boolean) as HTMLParagraphElement[];

    // The column is centred by its own transform, which GSAP then owns along
    // with the y it writes every frame.
    gsap.set(imagesContainer, { xPercent: -50 });

    let moveDistanceIndex = 0;
    let moveDistanceNames = 0;
    let moveDistanceImages = 0;
    let threshold = 0;

    /** The reference's measurements, taken off the real layout. */
    function measure() {
      const sectionHeight = hero!.offsetHeight;
      const padding = parseFloat(getComputedStyle(hero!).padding) || 0;
      moveDistanceIndex = sectionHeight - padding * 2 - projectIndex!.offsetHeight;
      moveDistanceNames = sectionHeight - padding * 2 - namesContainer!.offsetHeight;
      // Negative: the column is far taller than the frame, so this carries it up.
      moveDistanceImages = root!.clientHeight - imagesContainer!.offsetHeight;
      threshold = root!.clientHeight / 2;
    }

    function apply(progress: number) {
      const cfg = configRef.current;
      const narrow = root!.clientWidth < cfg.mobileBreakpoint;

      const currentIndex = Math.min(Math.floor(progress * total) + 1, total);
      projectIndex!.textContent = `${String(currentIndex).padStart(2, "0")}/${String(total).padStart(2, "0")}`;

      gsap.set(projectIndex, { y: progress * moveDistanceIndex });
      gsap.set(imagesContainer, { y: progress * moveDistanceImages });

      const zoom = cssZoom(root!);
      const rootTop = layoutRect(root!, zoom).top;
      for (const img of imgs) {
        const rect = layoutRect(img, zoom);
        const top = rect.top - rootTop;
        const bottom = rect.bottom - rootTop;
        gsap.set(img, {
          opacity: top <= threshold && bottom >= threshold ? 1 : cfg.dimmedOpacity / 100,
        });
      }

      nameEls.forEach((p, index) => {
        const startProgress = index / total;
        const endProgress = (index + 1) / total;
        const projectProgress = Math.max(
          0,
          Math.min(1, (progress - startProgress) / (endProgress - startProgress)),
        );
        gsap.set(p, { y: -projectProgress * moveDistanceNames });
        // The reference's narrow breakpoint forces every name to full strength.
        const active = projectProgress > 0 && projectProgress < 1;
        gsap.set(p, { color: narrow || active ? cfg.textColor : cfg.inactiveColor });
      });
    }

    const frameH = () => root!.clientHeight;
    const maxScroll = () => frameH() * (SPACER_FRAMES + 1);

    function frame(scroll: number) {
      const h = frameH();
      apply(gsap.utils.clamp(0, 1, (scroll - h) / (h * PIN_FRAMES)));
      track!.style.transform = `translateY(${-scroll}px)`;
    }

    measure();
    frame(0);

    let scroll = 0;
    let target = 0;
    let userDriven = false;

    function onWheel(e: WheelEvent) {
      const rate = Math.max(0.2, configRef.current.speed / 100);
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
      const cfg = configRef.current;
      const rate = Math.max(0.2, cfg.speed / 100);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (cfg.autoPlay && !userDriven) {
        target += dir * dt * maxScroll() * 0.07 * rate;
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
      measure();
      frame(scroll);
    });
    root.style.setProperty("--frame-h", `${root.clientHeight}px`);
    ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("wheel", onWheel);
      gsap.killTweensOf([projectIndex, imagesContainer, ...imgs, ...nameEls]);
    };
  }, [total, images.length]);

  const bodyType = {
    fontWeight: 500,
    lineHeight: 1.25,
    fontSize: `calc(1.5rem * ${scale})`,
  } as const;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background, color: textColor, fontFamily, containerType: "inline-size" }}
    >
      {/* The pinned spotlight, held still while the spacer beneath it in the
          track runs out. */}
      <div ref={heroRef} className="absolute inset-0 z-0 overflow-hidden" style={{ padding: "2rem" }}>
        <div className="project-index">
          <h1
            ref={indexRef}
            className="uppercase will-change-transform"
            style={{
              fontWeight: 400,
              lineHeight: 1,
              fontSize: `clamp(calc(3rem * ${scale}), calc(5cqw * ${scale}), calc(7rem * ${scale}))`,
            }}
          >
            {`01/${String(total).padStart(2, "0")}`}
          </h1>
        </div>

        {/* Behind the counter and the names, as in the reference. The 50%
            vertical padding is what parks the first still on the centre line
            at rest and the last one there at the end. */}
        <div
          ref={imagesRef}
          className="absolute top-0 left-1/2 z-[-1] flex flex-col will-change-transform @max-[1000px]:!w-[calc(100%-4rem)] @max-[1000px]:!gap-[25cqh]"
          style={{
            width: `${imageWidth}%`,
            padding: "calc(var(--frame-h, 100vh) * 0.5) 0",
            gap: "0.5rem",
          }}
        >
          {images.slice(0, total).map((src, i) => (
            <div
              key={`${src}-${i}`}
              ref={(el) => {
                imgRefs.current[i] = el;
              }}
              className="w-full overflow-hidden"
              style={{
                aspectRatio: "16 / 9",
                opacity: dimmedOpacity / 100,
                // GSAP writes the opacity every frame and this smooths each
                // write, so a still comes up to strength over 0.3s as it
                // reaches the centre line instead of snapping on.
                transition: "all 0.3s ease",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
            </div>
          ))}
        </div>

        <div
          ref={namesRef}
          className="absolute flex flex-col items-end"
          style={{ right: "2rem", bottom: "2rem" }}
        >
          {names.map((name, i) => (
            <p
              key={`${name}-${i}`}
              ref={(el) => {
                nameRefs.current[i] = el;
              }}
              className="whitespace-nowrap will-change-transform"
              // Same again for the colour the timeline swaps on its turn: the
              // name eases between the two rather than flicking over.
              style={{ ...bodyType, color: inactiveColor, transition: "color 0.3s ease" }}
            >
              {name}
            </p>
          ))}
        </div>
      </div>

      {/* The scrolling document: intro, the spacer the pin consumes, outro. */}
      <div ref={trackRef} className="absolute inset-x-0 top-0 z-[1] will-change-transform">
        <div
          className="flex w-full items-center justify-center text-center"
          style={{ height: "var(--frame-h, 100%)", padding: "2rem", background }}
        >
          <p style={bodyType}>{introText}</p>
        </div>
        <div className="w-full" style={{ height: `calc(var(--frame-h, 100%) * ${SPACER_FRAMES})` }} />
        <div
          className="flex w-full items-center justify-center text-center"
          style={{ height: "var(--frame-h, 100%)", padding: "2rem", background }}
        >
          <p style={bodyType}>{outroText}</p>
        </div>
      </div>
    </div>
  );
}
