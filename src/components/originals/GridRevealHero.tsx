"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
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

gsap.registerPlugin(Flip, SplitText);

export default function GridRevealHero({
  accentColor = "#c4d600",
  bgColor = "#e1e1e1",
  title = "Frme",
  subtitle = "Shaping the world of digital expression",
  fontFamily = "var(--font-dm-sans), sans-serif",
  textScale = 100,
  speed = 100,
}: {
  accentColor?: string;
  bgColor?: string;
  title?: string;
  subtitle?: string;
  fontFamily?: string;
  textScale?: number;
  speed?: number;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const preloaderRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const preloader = preloaderRef.current;
    const grid = gridRef.current;
    const marker = markerRef.current;
    const titleEl = titleRef.current;
    const subtitleEl = subtitleRef.current;
    if (!root || !preloader || !grid || !marker || !titleEl || !subtitleEl) return;

    const rate = Math.max(0.2, speed / 100);
    const zoom = cssZoom(root);
    const rect = { width: root.clientWidth, height: root.clientHeight };
    const maxTile = 42;
    const snapOdd = (v: number) => (v % 2 === 0 ? v - 1 : v);
    const cols = Math.max(3, snapOdd(Math.floor(rect.width / maxTile)));
    const rows = Math.max(3, snapOdd(Math.floor(rect.height / maxTile)));
    const tileSize = Math.min(rect.width / cols, rect.height / rows);
    const totalCols = cols + 2;
    const totalRows = rows + 2;

    grid.innerHTML = "";
    grid.style.width = `${totalCols * tileSize}px`;
    grid.style.height = `${totalRows * tileSize}px`;

    const tiles: HTMLDivElement[] = [];
    for (let i = 0; i < totalCols * totalRows; i++) {
      const tile = document.createElement("div");
      tile.style.width = `${tileSize}px`;
      tile.style.height = `${tileSize}px`;
      tile.style.backgroundColor = accentColor;
      tile.style.outline = `0.05px solid ${accentColor}`;
      grid.appendChild(tile);
      tiles.push(tile);
    }

    const midRow = Math.floor(totalRows / 2);
    const centerCol = Math.floor(totalCols / 2);
    const tileAt = (col: number) => tiles[midRow * totalCols + col];

    const first = tileAt(centerCol - 4);
    const second = tileAt(centerCol + 3);
    const third = tileAt(centerCol + 5);
    const final = tileAt(centerCol);
    const stops = [first, second, third, final];
    stops.forEach((t) => {
      t.style.backgroundColor = "#fff";
      t.style.outline = "0.05px solid #fff";
    });

    const fadeTiles = tiles.filter((t) => !stops.includes(t));
    gsap.set(fadeTiles, { opacity: 0 });
    gsap.set(marker, { width: tileSize, height: tileSize });

    const preloaderRect = layoutRect(preloader, zoom);
    const offset = (tile: HTMLDivElement) => {
      const r = layoutRect(tile, zoom);
      return { left: r.left - preloaderRect.left, top: r.top - preloaderRect.top };
    };
    gsap.set(marker, offset(first));

    function moveMarkerTo(tile: HTMLDivElement, label: string) {
      const state = Flip.getState(marker!);
      gsap.set(marker, offset(tile));
      marker!.innerHTML = label;
      Flip.from(state, { duration: 1 / rate, ease: "power1.out" });
    }

    const titleSplit = SplitText.create(titleEl, { type: "chars", charsClass: "char", mask: "chars" });
    const subtitleSplit = SplitText.create(subtitleEl, { type: "lines", linesClass: "line", mask: "lines" });
    gsap.set([titleSplit.chars, subtitleSplit.lines], { yPercent: 100 });

    const tl = gsap.timeline({ delay: 0.3 });
    tl.to(fadeTiles, { opacity: 1, duration: 0.125 / rate, stagger: { each: 2.5 / rate / fadeTiles.length, from: "random" } }, 0);
    tl.to([first, second, third], { backgroundColor: accentColor, outlineColor: accentColor, duration: 0.125 / rate, stagger: 0.25 / rate }, 2.75 / rate);
    tl.add(() => moveMarkerTo(second, "<p>50</p>"), 0.25 / rate);
    tl.add(() => moveMarkerTo(third, "<p>75</p>"), 1.5 / rate);
    tl.add(() => moveMarkerTo(final, "<p>100</p>"), 2.75 / rate);

    const collapsing = tiles.filter((t) => t !== final);
    tl.to(collapsing, { scaleY: 0, transformOrigin: "top", duration: 0.75 / rate, stagger: { each: 0.0035 / rate, from: "random" }, ease: "power3.out" }, `+=${0.4 / rate}`);
    tl.to([final, marker], { scaleY: 0, transformOrigin: "top", duration: 0.75 / rate, ease: "power3.out" }, "<");
    tl.to(titleSplit.chars, { yPercent: 0, duration: 1 / rate, ease: "power3.out", stagger: { each: 0.05 / rate, from: "random" } }, "<0.2");
    tl.to(subtitleSplit.lines, { yPercent: 0, duration: 1 / rate, ease: "power3.out", stagger: 0.1 / rate }, "<0.2");

    return () => {
      tl.kill();
      titleSplit.revert();
      subtitleSplit.revert();
    };
  }, [accentColor, bgColor, title, subtitle, speed]);

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden bg-black" style={{ fontFamily }}>
      <div ref={preloaderRef} className="absolute inset-0 overflow-hidden z-[2]">
        <div className="absolute inset-0" style={{ backgroundColor: bgColor }} />
        <div ref={gridRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-wrap z-[1]" />
        <div
          ref={markerRef}
          className="absolute top-0 left-0 z-[2] flex items-center justify-center bg-white text-black font-mono font-medium will-change-transform"
          style={{ fontSize: `calc(0.7rem * ${scale})` }}
        >
          <p>25</p>
        </div>
      </div>

      <section className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 ref={titleRef} className="font-black uppercase leading-[0.85] overflow-hidden" style={{ color: accentColor, fontSize: `clamp(calc(2.5rem * ${scale}),calc(10vw * ${scale}),calc(6rem * ${scale}))` }}>
          {title}
        </h1>
        <h3 ref={subtitleRef} className="text-white/90 font-medium max-w-xs overflow-hidden" style={{ fontSize: `clamp(calc(0.9rem * ${scale}),calc(2vw * ${scale}),calc(1.2rem * ${scale}))` }}>
          {subtitle}
        </h3>
      </section>
    </div>
  );
}
