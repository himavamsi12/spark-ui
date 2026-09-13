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

const DEFAULT_LABELS = [
  "Address",
  "Current Time",
  "General Inquiries",
  "New Business Inquiries",
  "Collaborations",
  "Job Inquiries",
  "Telephone",
  "Social Media",
];
const DEFAULT_VALUES = [
  "19 Great Street",
  "20:40:30 (GMT)",
  "hello@deadspacelabs.com",
  "business@deadspacelabs.com",
  "Selective Connections",
  "hiring@deadspacelabs.com",
  "+44 09 9842 2235",
  "@Deadspace",
];
// Seven glyphs on transparency, like the reference's own — it floats a
// shape over the dark page rather than showing a framed picture, which is
// why they carry no background and need no crop.
const DEFAULT_ICONS = Array.from({ length: 7 }, (_, i) => `/parting-contact-rows/icon-${i + 1}.svg`);

/**
 * The reference's thresholds, as distances from the top of the frame. Its own
 * `top+=${visualCenter - 550} center` cancels the centre term out — the start
 * offset is subtracted from the very centre it aligns to — so what actually
 * governs the effect is the row's distance from the top, not from the middle.
 */
const SPREAD_FROM = 550;
const SPREAD_TO = 450;
const CLOSE_FROM = 400;
const CLOSE_TO = 300;

/** How near the centre a row has to be to claim the icon. */
const CENTRE_TOLERANCE = 25;

/** Lenis' default lerp, the smoothing the reference scrolls with. */
const smoothing = (dt: number) => 1 - Math.pow(0.9, dt * 60);

/**
 * An endlessly looping contact list with a single icon pinned to the middle of
 * the frame. Every row prises its two columns apart as it crosses the centre,
 * opening a gap wide enough to clear the icon, then closes again behind it —
 * and each row that passes swaps the icon for the next one.
 */
export default function PartingContactRows({
  labels = DEFAULT_LABELS,
  values = DEFAULT_VALUES,
  icons = DEFAULT_ICONS,
  background = "#0f0f0f",
  textColor = "#ffffff",
  mutedColor = "#4f4f4f",
  maxGap = 10,
  mobileMaxGap = 5,
  mobileBreakpoint = 1000,
  iconSize = 8,
  iconRadius = 50,
  rowGap = 1.5,
  fontFamily = "var(--font-host-grotesk), sans-serif",
  textScale = 100,
  speed = 100,
  autoPlay = true,
}: {
  /** One row per label, paired with the values by position. */
  labels?: string[];
  values?: string[];
  /** Cycled one per row as each passes the centre. */
  icons?: string[];
  background?: string;
  textColor?: string;
  /** Colour of the right-hand column. */
  mutedColor?: string;
  /** How far apart a row's columns are prised at the centre, in rem. */
  maxGap?: number;
  mobileMaxGap?: number;
  /** Frame width, in px, below which the narrower gap applies. */
  mobileBreakpoint?: number;
  /** Size of the centre icon, in rem. */
  iconSize?: number;
  /** Corner rounding of the centre icon, as a %. 50 is a circle. */
  iconRadius?: number;
  /** Space between rows, in rem. */
  rowGap?: number;
  fontFamily?: string;
  textScale?: number;
  speed?: number;
  /** Drift the loop on its own instead of waiting for a wheel gesture. */
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLImageElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const count = labels.length;
  // Three stacked copies: the loop wraps by one frame, so one copy covers the
  // frame while the one before it is still leaving.
  const COPIES = 3;

  const configRef = useRef({
    icons,
    maxGap,
    mobileMaxGap,
    mobileBreakpoint,
    iconSize,
    scale,
    speed,
    autoPlay,
  });
  useEffect(() => {
    configRef.current = {
      icons,
      maxGap,
      mobileMaxGap,
      mobileBreakpoint,
      iconSize,
      scale,
      speed,
      autoPlay,
    };
  }, [icons, maxGap, mobileMaxGap, mobileBreakpoint, iconSize, scale, speed, autoPlay]);

  // The main effect applies these on mount and on resize; this re-applies them
  // when the controls change them, without rebuilding the loop.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const narrow = root.clientWidth < mobileBreakpoint;
    root.style.setProperty("--row-fs", `${(narrow ? 1 : 1.4) * scale}rem`);
    root.style.setProperty("--icon-size", `${narrow ? iconSize / 2 : iconSize}rem`);
  }, [iconSize, scale, mobileBreakpoint]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const icon = iconRef.current;
    if (!root || !track || !icon) return;

    let scroll = 0;
    let target = 0;
    let userDriven = false;
    let currentIconIndex = 0;
    let lastCentredRow: HTMLDivElement | null = null;

    const frameH = () => root.clientHeight;

    /**
     * The reference runs two scrubbed ScrollTriggers per row — one opening the
     * gap, one closing it — which together are this piecewise function of how
     * far down the frame the row sits. Outside both ranges ScrollTrigger holds
     * progress at 0 or 1, which is the flat 1rem either side here.
     */
    function gapFor(top: number, max: number) {
      if (top >= SPREAD_FROM) return 1;
      if (top >= SPREAD_TO) return 1 + (max - 1) * ((SPREAD_FROM - top) / (SPREAD_FROM - SPREAD_TO));
      if (top >= CLOSE_FROM) return max;
      if (top >= CLOSE_TO) return max - (max - 1) * ((CLOSE_FROM - top) / (CLOSE_FROM - CLOSE_TO));
      return 1;
    }

    function frame() {
      const cfg = configRef.current;
      const h = frameH();
      track!.style.transform = `translateY(${-(((scroll % h) + h) % h)}px)`;

      const zoom = cssZoom(root!);
      const rootRect = layoutRect(root!, zoom);
      const centre = rootRect.top + h / 2;
      const max = root!.clientWidth < cfg.mobileBreakpoint ? cfg.mobileMaxGap : cfg.maxGap;

      let closestRow: HTMLDivElement | null = null;
      let minDistance = Infinity;

      for (const row of rowRefs.current) {
        if (!row) continue;
        const rect = layoutRect(row, zoom);
        row.style.gap = `${gapFor(rect.top - rootRect.top, max)}rem`;

        const distance = Math.abs(rect.top + rect.height / 2 - centre);
        if (distance < minDistance && distance < CENTRE_TOLERANCE) {
          minDistance = distance;
          closestRow = row;
        }
      }

      if (closestRow && closestRow !== lastCentredRow) {
        lastCentredRow = closestRow;
        currentIconIndex = (currentIconIndex + 1) % cfg.icons.length;
        icon!.src = cfg.icons[currentIconIndex];
      }
    }

    frame();

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      userDriven = true;
      // No clamp: the reference runs Lenis with `infinite: true`, so the list
      // wraps rather than ending.
      target += e.deltaY * Math.max(0.2, configRef.current.speed / 100);
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    let last = performance.now();
    function loop(now: number) {
      const cfg = configRef.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (cfg.autoPlay && !userDriven) {
        target += dt * frameH() * 0.25 * Math.max(0.2, cfg.speed / 100);
      }
      scroll += (target - scroll) * smoothing(dt);
      frame();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    /**
     * The reference's `@media (max-width: 1000px)` block, driven off the frame
     * rather than the window — it steps the type and the icon down at the same
     * breakpoint the script already uses for the parted gap, so all three
     * change together instead of the type easing while the gap jumps.
     */
    function applyBreakpoint() {
      const cfg = configRef.current;
      const narrow = root!.clientWidth < cfg.mobileBreakpoint;
      root!.style.setProperty("--row-fs", `${(narrow ? 1 : 1.4) * cfg.scale}rem`);
      root!.style.setProperty("--icon-size", `${narrow ? cfg.iconSize / 2 : cfg.iconSize}rem`);
    }

    const ro = new ResizeObserver(() => {
      root!.style.setProperty("--frame-h", `${root!.clientHeight}px`);
      applyBreakpoint();
      frame();
    });
    root.style.setProperty("--frame-h", `${root.clientHeight}px`);
    applyBreakpoint();
    ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("wheel", onWheel);
      gsap.killTweensOf(track);
    };
  }, [count, icons.length]);

  const rows = labels.map((label, i) => ({ label, value: values[i % values.length] ?? "" }));

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background, color: textColor, fontFamily, containerType: "inline-size" }}
    >
      {/* The icon sits beneath the rows, so it's the parting of a row's two
          columns that uncovers it rather than the icon rising over them. */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <div
          className="relative overflow-hidden"
          style={{
            width: `var(--icon-size, ${iconSize}rem)`,
            height: `var(--icon-size, ${iconSize}rem)`,
            // The box is square, so 50% is a circle.
            borderRadius: `${iconRadius}%`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={iconRef}
            src={icons[0]}
            alt=""
            className="h-full w-full object-contain"
            draggable={false}
          />
        </div>
      </div>

      <div ref={trackRef} className="absolute inset-x-0 top-0 z-[1] will-change-transform">
        {Array.from({ length: COPIES }, (_, copy) => (
          <section
            key={copy}
            className="relative flex w-full flex-col justify-center overflow-hidden"
            style={{ height: "var(--frame-h, 100%)", gap: `${rowGap}rem` }}
          >
            {rows.map((row, i) => (
              <div
                key={`${copy}-${i}`}
                ref={(el) => {
                  rowRefs.current[copy * count + i] = el;
                }}
                className="flex justify-center will-change-[gap]"
                style={{ gap: "1rem" }}
              >
                <p
                  className="flex-1 text-right"
                  style={{
                    fontWeight: 400,
                    lineHeight: 0.95,
                    letterSpacing: "-0.025rem",
                    fontSize: `var(--row-fs, ${1.4 * scale}rem)`,
                  }}
                >
                  {row.label}
                </p>
                <p
                  className="flex-1"
                  style={{
                    color: mutedColor,
                    fontWeight: 400,
                    lineHeight: 0.95,
                    letterSpacing: "-0.025rem",
                    fontSize: `var(--row-fs, ${1.4 * scale}rem)`,
                  }}
                >
                  {row.value}
                </p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
