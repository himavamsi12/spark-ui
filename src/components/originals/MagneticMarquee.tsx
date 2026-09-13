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

/** getBoundingClientRect() in layout pixels, so rects and CSS left/top agree under zoom. */
function layoutRect(el: Element, zoom: number) {
  const r = el.getBoundingClientRect();
  return { left: r.left / zoom, top: r.top / zoom, right: r.right / zoom, bottom: r.bottom / zoom, width: r.width / zoom, height: r.height / zoom };
}

gsap.registerPlugin(SplitText);

const DEFAULT_IMAGES = Array.from({ length: 6 }, (_, i) => `/magnetic-marquee/marquee-img-${i + 1}.jpg`);

type Line = { el: HTMLElement; restCenterY: number; currentY: number };

export default function MagneticMarquee({
  title = "Spark Studio",
  subtitle = "Making stuff others try to copy",
  images = DEFAULT_IMAGES,
  fontFamily = "var(--font-instrument-serif), Georgia, serif",
  textScale = 100,
  speed = 100,
}: {
  title?: string;
  subtitle?: string;
  images?: string[];
  fontFamily?: string;
  textScale?: number;
  speed?: number;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const strip = stripRef.current;
    const content = contentRef.current;
    const copy = copyRef.current;
    if (!root || !track || !strip || !content || !copy) return;

    const config = {
      marqueeScrollSpeed: 100,
      stripFollowEase: 0.05,
      stripEdgeInset: 175,
      contentRiseRate: 0.85,
      risenTopGap: 100,
      liftHeadStart: 125,
      wakeStrength: 2.5,
      wakeReach: 125,
      lineSettleEase: 0.09,
    };
    const rate = Math.max(0.2, speed / 100);

    const sourceItems = Array.from(track.children) as HTMLElement[];
    const oneSetWidth = sourceItems.reduce((sum, item) => sum + item.offsetWidth, 0);
    const setsNeeded = Math.ceil(root.clientWidth / oneSetWidth) + 1;

    const clones: HTMLElement[] = [];
    for (let copyIdx = 0; copyIdx < setsNeeded; copyIdx++) {
      sourceItems.forEach((item) => {
        const clone = item.cloneNode(true) as HTMLElement;
        track.appendChild(clone);
        clones.push(clone);
      });
    }

    const marqueeTween = gsap.to(track, {
      x: `-=${oneSetWidth}`,
      duration: oneSetWidth / (config.marqueeScrollSpeed * rate),
      ease: "none",
      repeat: -1,
      modifiers: { x: (x) => `${gsap.utils.wrap(-oneSetWidth, 0, parseFloat(x))}px` },
    });

    let stripBaseTop = 0;
    let stripHeight = 0;
    let sectionHeight = 0;
    let stripRestCenterY = 0;
    let contentTopAtRest = 0;

    let stripTargetY = 0;
    let stripCurrentY = 0;
    let stripPrevY = 0;
    let hasPointerMoved = false;

    let textLines: Line[] = [];

    const splits = [content.querySelector("h1"), content.querySelector("h3"), copy]
      .filter(Boolean)
      .map((el) => SplitText.create(el as HTMLElement, { type: "lines", linesClass: "line" }));

    function measureGeometry() {
      const zoom = cssZoom(root!);
      const rootRect = layoutRect(root!, zoom);
      sectionHeight = rootRect.height;
      stripBaseTop = strip!.offsetTop;
      stripHeight = strip!.offsetHeight;
      stripRestCenterY = config.stripEdgeInset;

      let blockTop = Infinity;
      textLines.forEach((line) => {
        const r = layoutRect(line.el, zoom);
        line.restCenterY = r.top - rootRect.top + r.height / 2;
        blockTop = Math.min(blockTop, line.restCenterY - r.height / 2);
      });
      contentTopAtRest = isFinite(blockTop) ? blockTop : sectionHeight * 0.4;

      if (!hasPointerMoved) {
        const restY = config.stripEdgeInset - stripBaseTop - stripHeight / 2;
        stripTargetY = restY;
        stripCurrentY = restY;
        stripPrevY = restY;
      }
    }

    textLines = splits.flatMap((s) =>
      (s.lines as HTMLElement[]).map((el) => ({ el, restCenterY: 0, currentY: 0 })),
    );
    measureGeometry();

    const ro = new ResizeObserver(() => measureGeometry());
    ro.observe(root);

    function onMouseMove(e: MouseEvent) {
      hasPointerMoved = true;
      const bounds = root!.getBoundingClientRect();
      const cursorY = (e.clientY - bounds.top) / cssZoom(root!);
      const wantedY = cursorY - stripBaseTop - stripHeight / 2;
      const highestY = config.stripEdgeInset - stripBaseTop - stripHeight / 2;
      const lowestY = sectionHeight - config.stripEdgeInset - stripBaseTop - stripHeight / 2;
      stripTargetY = gsap.utils.clamp(highestY, lowestY, wantedY);
    }
    root.addEventListener("mousemove", onMouseMove);

    const tickerFn = () => {
      stripCurrentY += (stripTargetY - stripCurrentY) * config.stripFollowEase;
      gsap.set(strip, { y: stripCurrentY });

      const stripCenterY = stripBaseTop + stripCurrentY + stripHeight / 2;
      const stripVelocityY = stripCurrentY - stripPrevY;
      stripPrevY = stripCurrentY;

      const descentBelowRest = Math.max(0, stripCenterY - stripRestCenterY);
      const maxRise = Math.max(0, contentTopAtRest - config.risenTopGap);
      const contentRise = -Math.min(descentBelowRest * config.contentRiseRate, maxRise);

      textLines.forEach((line) => {
        const gapToStrip = line.restCenterY - stripCenterY;
        const reachedLine = stripCenterY + config.liftHeadStart >= line.restCenterY;
        const wakeInfluence = Math.exp(-(gapToStrip * gapToStrip) / (2 * config.wakeReach * config.wakeReach));
        const wakeOffset = stripVelocityY * wakeInfluence * config.wakeStrength;
        const lineTarget = (reachedLine ? contentRise : 0) + wakeOffset;
        line.currentY += (lineTarget - line.currentY) * config.lineSettleEase;
        gsap.set(line.el, { y: line.currentY });
      });
    };
    gsap.ticker.add(tickerFn);

    return () => {
      marqueeTween.kill();
      gsap.ticker.remove(tickerFn);
      ro.disconnect();
      root.removeEventListener("mousemove", onMouseMove);
      splits.forEach((s) => s.revert());
      clones.forEach((c) => c.remove());
    };
  }, [speed, title, subtitle, images]);

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden bg-[#0f0f0f]">
      <div className="absolute top-0 left-0 w-full p-4 flex flex-col items-center text-[#7a7a7a] text-[10px]">
        <p className="italic">hello@studio.com</p>
      </div>

      <div ref={stripRef} className="absolute top-0 left-0 w-full overflow-hidden flex will-change-transform pointer-events-none z-0">
        <div ref={trackRef} className="flex shrink-0 will-change-transform">
          {images.map((src, i) => (
            <div key={i} className="shrink-0 w-40 px-1">
              <img src={src} alt="" className="w-full h-24 object-cover rounded-md" draggable={false} />
            </div>
          ))}
        </div>
      </div>

      <div
        ref={contentRef}
        className="relative z-[2] w-full h-full flex flex-col items-center justify-center gap-4 px-6 text-center text-white"
        style={{ mixBlendMode: "difference" }}
      >
        <h1 className="italic" style={{ fontSize: `clamp(calc(1.75rem * ${scale}),calc(6vw * ${scale}),calc(3.5rem * ${scale}))`, fontFamily }}>
          {title}
        </h1>
        <h3 className="uppercase font-medium" style={{ fontSize: `clamp(calc(0.85rem * ${scale}),calc(2vw * ${scale}),calc(1.25rem * ${scale}))` }}>
          {subtitle}
        </h3>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-4 flex justify-center text-[#7a7a7a] text-[9px] text-center">
        <p ref={copyRef} className="max-w-[60%]">
          This studio explores web design, animation, and front-end development through practical tutorials.
        </p>
      </div>
    </div>
  );
}
