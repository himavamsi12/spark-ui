"use client";

import { useEffect, useRef } from "react";

const DEFAULT_TITLES = [
  "Redroom Gesture 14",
  "Shadowwear 6AM",
  "Blur Formation 03",
  "Sunglass Operator",
  "Azure Figure 5",
];
const DEFAULT_CATEGORIES = [
  "Concept Series",
  "Photography",
  "Kinetic Study",
  "Editorial Motion",
  "Visual Research",
];
const DEFAULT_YEARS = ["2025", "2024", "2024", "2023", "2024"];
const DEFAULT_IMAGES = Array.from({ length: 5 }, (_, i) => `/accordion-frames/spotlight-${i + 1}.jpg`);

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

/** Wraps an unbounded index back into the data, the reference's own modulo. */
const wrapIndex = (index: number, length: number) =>
  ((Math.abs(index) % length) + length) % length;

type Item = { el: HTMLDivElement; parallax?: { update: (scroll: number, index: number) => void } };

/**
 * An endless column of full-bleed projects that never reaches an end, with a
 * white minimap panel across the middle running the same list in miniature —
 * pictures on one side, their details on the other, both tracking the scroll.
 * Let go and it settles onto the nearest project on its own.
 */
export default function ParallaxMinimapScroll({
  titles = DEFAULT_TITLES,
  categories = DEFAULT_CATEGORIES,
  years = DEFAULT_YEARS,
  images = DEFAULT_IMAGES,
  minimapHeight = 250,
  minimapWidth = 75,
  previewWidth = 35,
  minimapBackground = "#ffffff",
  minimapTextColor = "#000000",
  imageScale = 150,
  parallaxAmount = 20,
  scrollSpeed = 75,
  snapDuration = 500,
  fontFamily = "var(--font-inter), sans-serif",
  textScale = 100,
  autoPlay = true,
}: {
  /** One project per title; the other lists are paired with it by position. */
  titles?: string[];
  categories?: string[];
  years?: string[];
  images?: string[];
  /** Height of one row inside the minimap, in px. */
  minimapHeight?: number;
  /** Width of the minimap panel, as a % of the frame. */
  minimapWidth?: number;
  /** Width of the picture column inside the minimap, as a %. */
  previewWidth?: number;
  minimapBackground?: string;
  minimapTextColor?: string;
  /** How far the pictures are overscaled to give the parallax room, as a %. */
  imageScale?: number;
  /** How far a picture drifts against its frame, as a %. */
  parallaxAmount?: number;
  /** How far one wheel notch travels, as a %. */
  scrollSpeed?: number;
  /** How long the settle onto the nearest project takes, in ms. */
  snapDuration?: number;
  fontFamily?: string;
  textScale?: number;
  /** Steps through the projects on its own until the wheel is used. */
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  const configRef = useRef({
    titles,
    categories,
    years,
    images,
    minimapHeight,
    imageScale,
    parallaxAmount,
    scrollSpeed,
    snapDuration,
    minimapTextColor,
    scale,
    autoPlay,
  });
  useEffect(() => {
    configRef.current = {
      titles,
      categories,
      years,
      images,
      minimapHeight,
      imageScale,
      parallaxAmount,
      scrollSpeed,
      snapDuration,
      minimapTextColor,
      scale,
      autoPlay,
    };
  });

  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    const preview = previewRef.current;
    const infoList = infoRef.current;
    if (!root || !list || !preview || !infoList) return;

    /** The reference's config, with the tunables read live. */
    const BUFFER_SIZE = 5;
    const LERP_FACTOR = 0.05;
    const MAX_VELOCITY = 150;

    let currentY = 0;
    let targetY = 0;
    let isSnapping = false;
    let userDriven = false;
    let lastScrollTime = Date.now();
    let lastAutoAdvance = Date.now();
    const snapStart = { time: 0, y: 0, target: 0 };

    const projects = new Map<number, Item>();
    const minimap = new Map<number, Item>();
    const minimapInfo = new Map<number, Item>();

    const projectHeight = () => root!.clientHeight;

    function createParallax(img: HTMLImageElement, height: () => number) {
      let current = 0;
      return {
        update: (scroll: number, index: number) => {
          const cfg = configRef.current;
          const target = (-scroll - index * height()) * (cfg.parallaxAmount / 100);
          current = lerp(current, target, 0.1);
          if (Math.abs(current - target) > 0.01) {
            img.style.transform = `translateY(${current}px) scale(${cfg.imageScale / 100})`;
          }
        },
      };
    }

    function makeImg(src: string, alt: string) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = alt;
      img.draggable = false;
      img.style.position = "relative";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.transform = `scale(${configRef.current.imageScale / 100})`;
      img.style.willChange = "transform";
      return img;
    }

    function createElement(index: number, type: "main" | "minimap" | "info") {
      const maps = { main: projects, minimap, info: minimapInfo };
      if (maps[type].has(index)) return;

      const cfg = configRef.current;
      const len = Math.max(1, cfg.titles.length);
      const i = wrapIndex(index, len);
      const title = cfg.titles[i] ?? "";
      const image = cfg.images[i % Math.max(1, cfg.images.length)] ?? DEFAULT_IMAGES[0];
      const num = String(i + 1).padStart(2, "0");

      if (type === "main") {
        const el = document.createElement("div");
        el.style.position = "absolute";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.overflow = "hidden";
        el.style.willChange = "transform";
        const img = makeImg(image, title);
        el.appendChild(img);
        list!.appendChild(el);
        projects.set(index, { el, parallax: createParallax(img, projectHeight) });
      } else if (type === "minimap") {
        const el = document.createElement("div");
        el.style.position = "absolute";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.overflow = "hidden";
        el.style.willChange = "transform";
        const img = makeImg(image, title);
        el.appendChild(img);
        preview!.appendChild(el);
        minimap.set(index, {
          el,
          parallax: createParallax(img, () => configRef.current.minimapHeight),
        });
      } else {
        const el = document.createElement("div");
        el.style.position = "absolute";
        el.style.width = "100%";
        el.style.height = `${cfg.minimapHeight}px`;
        el.style.display = "flex";
        el.style.flexDirection = "column";
        el.style.justifyContent = "space-between";
        el.style.willChange = "transform";

        const row = (a: string, b: string) => {
          const r = document.createElement("div");
          r.style.width = "100%";
          r.style.display = "flex";
          r.style.justifyContent = "space-between";
          r.style.padding = "0.5rem";
          for (const text of [a, b]) {
            const p = document.createElement("p");
            p.textContent = text;
            p.style.textTransform = "uppercase";
            p.style.fontSize = `calc(0.85rem * ${cfg.scale})`;
            p.style.fontWeight = "600";
            p.style.letterSpacing = "-0.0125rem";
            p.style.color = cfg.minimapTextColor;
            r.appendChild(p);
          }
          return r;
        };

        el.appendChild(row(num, title));
        el.appendChild(row(cfg.categories[i] ?? "", cfg.years[i] ?? ""));
        infoList!.appendChild(el);
        minimapInfo.set(index, { el });
      }
    }

    for (let i = -BUFFER_SIZE; i <= BUFFER_SIZE; i++) {
      createElement(i, "main");
      createElement(i, "minimap");
      createElement(i, "info");
    }

    function syncElements() {
      const current = Math.round(-targetY / projectHeight());
      // A non-finite index would make the loop below run forever.
      if (!Number.isFinite(current)) return;
      const min = current - BUFFER_SIZE;
      const max = current + BUFFER_SIZE;

      for (let i = min; i <= max; i++) {
        createElement(i, "main");
        createElement(i, "minimap");
        createElement(i, "info");
      }

      [projects, minimap, minimapInfo].forEach((map) => {
        map.forEach((item, index) => {
          if (index < min || index > max) {
            item.el.remove();
            map.delete(index);
          }
        });
      });
    }

    function snapToProject() {
      isSnapping = true;
      snapStart.time = Date.now();
      snapStart.y = targetY;
      snapStart.target = -Math.round(-targetY / projectHeight()) * projectHeight();
    }

    function updateSnap() {
      const progress = Math.min(
        (Date.now() - snapStart.time) / Math.max(1, configRef.current.snapDuration),
        1,
      );
      const eased = 1 - Math.pow(1 - progress, 3);
      targetY = snapStart.y + (snapStart.target - snapStart.y) * eased;
      if (progress >= 1) isSnapping = false;
    }

    function updatePositions() {
      const h = projectHeight();
      const minimapY = (currentY * configRef.current.minimapHeight) / h;

      projects.forEach((item, index) => {
        item.el.style.transform = `translateY(${index * h + currentY}px)`;
        item.parallax?.update(currentY, index);
      });

      minimap.forEach((item, index) => {
        const y = index * configRef.current.minimapHeight + minimapY;
        item.el.style.transform = `translateY(${y}px)`;
        item.parallax?.update(minimapY, index);
      });

      minimapInfo.forEach((item, index) => {
        item.el.style.transform = `translateY(${index * configRef.current.minimapHeight + minimapY}px)`;
      });
    }

    let raf = 0;
    function animate() {
      // The root can measure 0px tall for a frame (for example while a preview
      // card is still being laid out). Every step below divides by that height,
      // and a zero turned the element loop into an infinite one that froze the
      // whole page, so those frames are skipped.
      if (!(projectHeight() > 0)) {
        raf = requestAnimationFrame(animate);
        return;
      }
      const cfg = configRef.current;
      const now = Date.now();

      // Steps one project at a time so it lands where the snap would anyway.
      if (cfg.autoPlay && !userDriven && !isSnapping && now - lastAutoAdvance > 2600) {
        lastAutoAdvance = now;
        targetY -= projectHeight();
      }

      if (!isSnapping && now - lastScrollTime > 100) {
        const snapPoint = -Math.round(-targetY / projectHeight()) * projectHeight();
        if (Math.abs(targetY - snapPoint) > 1) snapToProject();
      }

      if (isSnapping) updateSnap();
      currentY += (targetY - currentY) * LERP_FACTOR;

      syncElements();
      updatePositions();
      raf = requestAnimationFrame(animate);
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      isSnapping = false;
      userDriven = true;
      lastScrollTime = Date.now();
      const speed = configRef.current.scrollSpeed / 100;
      const delta = Math.max(Math.min(e.deltaY * speed, MAX_VELOCITY), -MAX_VELOCITY);
      targetY -= delta;
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    animate();

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("wheel", onWheel);
      [projects, minimap, minimapInfo].forEach((map) => {
        map.forEach((item) => item.el.remove());
        map.clear();
      });
    };
  }, [titles.length, images.length]);

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden" style={{ fontFamily }}>
      <div ref={listRef} className="absolute inset-0" />

      <div
        className="absolute overflow-hidden"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `${minimapWidth}%`,
          height: `calc(${minimapHeight}px + 3rem)`,
          background: minimapBackground,
          padding: "1.5rem",
        }}
      >
        <div className="relative h-full w-full">
          <div
            ref={previewRef}
            className="absolute h-full overflow-hidden @max-[1000px]:!left-auto @max-[1000px]:!right-0 @max-[1000px]:!translate-x-0"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: `${previewWidth}%`,
            }}
          />
          <div ref={infoRef} className="relative h-full w-full overflow-hidden" />
        </div>
      </div>
    </div>
  );
}
