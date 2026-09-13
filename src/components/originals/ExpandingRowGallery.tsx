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

export type RowGalleryItem = { name: string; year: number; img: string };

const DEFAULT_ITEMS: RowGalleryItem[] = Array.from({ length: 12 }, (_, i) => ({
  name: `Frame ${String(i + 1).padStart(2, "0")}`,
  year: 2018 + (i % 8),
  img: `/circular-gallery/img${i + 1}.jpg`,
}));

// Lenis' default lerp — the source wraps its page in ReactLenis for the
// smooth-scroll feel; this reproduces that exact easing on the internal
// wheel-driven scroll instead, since a boxed demo has no real page to wrap.
const smoothing = (dt: number) => 1 - Math.pow(0.9, dt * 60);

type Config = {
  rowStartWidth: number;
  rowEndWidth: number;
  mobileRowStartWidth: number;
  mobileRowEndWidth: number;
  mobileBreakpoint: number;
  wheelSensitivity: number;
  autoPlay: boolean;
  autoPlaySpeed: number;
};

/**
 * A stack of image rows that widen as they scroll through, each one starting
 * narrow, filling out to its widest as it crosses the frame, matching the
 * "Ingamana" scroll-reveal effect.
 */
export default function ExpandingRowGallery({
  items = DEFAULT_ITEMS,
  rows = 10,
  itemsPerRow = 9,
  rowStartWidth = 125,
  rowEndWidth = 500,
  mobileRowStartWidth = 250,
  mobileRowEndWidth = 750,
  mobileBreakpoint = 1000,
  background = "#0a0a0a",
  textColor = "#f5f5f0",
  wheelSensitivity = 100,
  autoPlay = true,
  autoPlaySpeed = 100,
  fontFamily = "var(--font-neue-montreal), sans-serif",
  textScale = 100,
}: {
  items?: RowGalleryItem[];
  /** How many stacked rows make up the scroll. */
  rows?: number;
  /** Cards per row; rows repeat through `items` when there are fewer than this. */
  itemsPerRow?: number;
  /** Row width as a % of the stage at rest, before it's scrolled into view. */
  rowStartWidth?: number;
  /** Row width as a % of the stage at its widest, mid-scroll. */
  rowEndWidth?: number;
  mobileRowStartWidth?: number;
  mobileRowEndWidth?: number;
  /** Stage width, in px, below which the mobile row widths apply. */
  mobileBreakpoint?: number;
  background?: string;
  textColor?: string;
  /** How far one wheel notch moves the internal scroll. */
  wheelSensitivity?: number;
  /**
   * Idles the scroll back and forth through the whole stack when nothing has
   * touched the wheel yet. Most of the rows here sit below the first
   * viewport at rest, so without this a change like "Rows" has no visible
   * effect until something scrolls — auto-play is what makes the
   * customization panel's sliders actually demonstrable on their own.
   */
  autoPlay?: boolean;
  /** How fast the idle auto-play drifts, as a % of a brisk baseline. */
  autoPlaySpeed?: number;
  fontFamily?: string;
  textScale?: number;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Sliders in the customize panel fire onChange continuously while dragged.
  // Reading tunables from a ref (kept current by the cheap effect below)
  // instead of closing over the props lets the ticker/listeners/observer
  // mount exactly once — remounting them on every drag tick was the actual
  // bug: it tore the whole rig down and rebuilt it dozens of times a second,
  // flashing every row's width to "" on each rebuild.
  const configRef = useRef<Config>({
    rowStartWidth,
    rowEndWidth,
    mobileRowStartWidth,
    mobileRowEndWidth,
    mobileBreakpoint,
    wheelSensitivity,
    autoPlay,
    autoPlaySpeed,
  });
  useEffect(() => {
    configRef.current = {
      rowStartWidth,
      rowEndWidth,
      mobileRowStartWidth,
      mobileRowEndWidth,
      mobileBreakpoint,
      wheelSensitivity,
      autoPlay,
      autoPlaySpeed,
    };
  }, [
    rowStartWidth,
    rowEndWidth,
    mobileRowStartWidth,
    mobileRowEndWidth,
    mobileBreakpoint,
    wheelSensitivity,
    autoPlay,
    autoPlaySpeed,
  ]);

  // Re-measure (without tearing down the ticker) whenever the row/item count
  // changes the actual DOM, or a width prop changes what "widest" means.
  const remeasureRef = useRef<() => void>(() => {});
  useEffect(() => {
    remeasureRef.current();
  }, [rows, itemsPerRow, rowStartWidth, rowEndWidth, mobileRowStartWidth, mobileRowEndWidth]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;

    let startW = configRef.current.rowStartWidth;
    let endW = configRef.current.rowEndWidth;
    let viewport = root.clientHeight;
    let maxScroll = 0;
    let scroll = 0;
    let target = 0;

    /** Every row is assumed the same height, measured at its widest. */
    function measure() {
      const cfg = configRef.current;
      const rowEls = rowsRef.current.filter((el): el is HTMLDivElement => !!el);
      if (!rowEls.length) return;

      const isMobile = root!.clientWidth < cfg.mobileBreakpoint;
      startW = isMobile ? cfg.mobileRowStartWidth : cfg.rowStartWidth;
      endW = isMobile ? cfg.mobileRowEndWidth : cfg.rowEndWidth;

      const first = rowEls[0];
      const prevWidth = first.style.width;
      first.style.width = `${endW}%`;
      const rowHeight = first.offsetHeight;
      // Restored to its last real value rather than "" — applyRowWidths()
      // below repaints every row anyway, but this avoids even a one-frame
      // flash to a collapsed width if it's ever called off the ticker.
      first.style.width = prevWidth;

      const gap = parseFloat(getComputedStyle(track!).rowGap || getComputedStyle(track!).gap) || 0;
      const totalHeight = rowHeight * rowEls.length + gap * (rowEls.length - 1);
      track!.style.setProperty("--track-height", `${totalHeight}px`);

      viewport = root!.clientHeight;
      maxScroll = Math.max(0, totalHeight - viewport);
      target = gsap.utils.clamp(0, maxScroll, target);

      applyRowWidths();
    }
    remeasureRef.current = measure;

    // A real wheel gesture always wins over the idle drift, permanently —
    // matching how the other scrub-driven originals in this library treat
    // autoPlay as a "nothing's touched it yet" default, not a loop that
    // fights the visitor once they've taken over.
    let userDriven = false;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      userDriven = true;
      const cfg = configRef.current;
      target = gsap.utils.clamp(0, maxScroll, target + e.deltaY * (cfg.wheelSensitivity / 100));
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    /**
     * Reads each row's *current* on-screen box and widens it based on how far
     * it's travelled through the stage — the same rect-based trigger the
     * source uses, just measured against this component's own box instead of
     * the browser window. Because it re-reads live layout every frame, a
     * row's own reflow (its aspect-ratio cards changing size as it widens)
     * naturally shifts the rows below it, the same cascading feel the
     * original gets from being driven by real document layout.
     */
    function applyRowWidths() {
      const rowEls = rowsRef.current.filter((el): el is HTMLDivElement => !!el);
      const zoom = cssZoom(root!);
      const rootRect = layoutRect(root!, zoom);
      for (const row of rowEls) {
        const rect = layoutRect(row, zoom);
        const rowTop = rect.top - rootRect.top + scroll;
        const rowBottom = rowTop + rect.height;

        const scrollStart = rowTop - viewport;
        const scrollEnd = rowBottom;

        let progress = (scroll - scrollStart) / (scrollEnd - scrollStart || 1);
        progress = Math.max(0, Math.min(1, progress));

        row.style.width = `${startW + (endW - startW) * progress}%`;
      }
    }

    let dir = 1;
    function tick() {
      const cfg = configRef.current;
      if (cfg.autoPlay && !userDriven && maxScroll > 0) {
        // A slow ping-pong through the whole stack, so a change to a prop
        // like "Rows" is visible on its own instead of needing a wheel
        // gesture first to scroll it into the frame.
        target += dir * (1 / 60) * maxScroll * 0.05 * (cfg.autoPlaySpeed / 100);
        if (target >= maxScroll) {
          target = maxScroll;
          dir = -1;
        } else if (target <= 0) {
          target = 0;
          dir = 1;
        }
      }
      scroll += (target - scroll) * smoothing(1 / 60);
      track!.style.transform = `translateY(${-scroll}px)`;
      applyRowWidths();
    }

    measure();
    gsap.ticker.add(tick);

    const ro = new ResizeObserver(() => measure());
    ro.observe(root);

    return () => {
      gsap.ticker.remove(tick);
      root.removeEventListener("wheel", onWheel);
      ro.disconnect();
      remeasureRef.current = () => {};
    };
    // Mounted once: tunables are read live from configRef every frame, and
    // row/width changes are handled by the lightweight remeasure effect
    // above rather than by rebuilding this whole rig.
  }, []);

  const rowsData: RowGalleryItem[][] = [];
  let cursor = 0;
  for (let r = 0; r < rows; r++) {
    const rowItems: RowGalleryItem[] = [];
    for (let c = 0; c < itemsPerRow; c++) {
      rowItems.push(items[cursor % items.length]);
      cursor++;
    }
    rowsData.push(rowItems);
  }

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background, color: textColor, fontFamily }}
    >
      <div ref={trackRef} className="absolute inset-x-0 top-0 flex flex-col items-center gap-2 py-2">
        {rowsData.map((rowItems, rowIndex) => (
          <div
            key={rowIndex}
            ref={(el) => {
              // Unconditional, including null on unmount — leaving a stale
              // entry here when a row is removed (e.g. dragging "Rows" down)
              // was the second bug: this ref list would over-report how many
              // rows still exist, throwing off the height/scroll math.
              rowsRef.current[rowIndex] = el;
            }}
            className="flex gap-4"
            style={{ width: `${rowStartWidth}%` }}
          >
            {rowItems.map((item, colIndex) => (
              <div key={colIndex} className="flex flex-1 flex-col overflow-hidden" style={{ aspectRatio: "7 / 5" }}>
                <div className="min-h-0 flex-1 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.img} alt={item.name} className="h-full w-full object-cover" draggable={false} />
                </div>
                <div className="flex items-center justify-between py-1" style={{ fontSize: `${11 * scale}px` }}>
                  <p className="truncate uppercase tracking-tight">{item.name}</p>
                  <p className="shrink-0 uppercase tracking-tight opacity-70">{item.year}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
