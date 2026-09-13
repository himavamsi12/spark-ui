"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

type RowKey = "top" | "middle" | "bottom";
const ROWS: RowKey[] = ["top", "middle", "bottom"];

/**
 * (row, layer) pairs in the exact order the source draws them: one full pass
 * across top/bottom/middle per layer before moving to the next layer, which
 * is what makes the reveal read as three colour waves sweeping through the
 * stack rather than one row finishing before the next starts.
 */
const DRAW_ORDER: [RowKey, number][] = [
  ["top", 0],
  ["bottom", 0],
  ["middle", 0],
  ["top", 1],
  ["bottom", 1],
  ["middle", 1],
  ["top", 2],
  ["middle", 2],
  ["bottom", 2],
];

const CURVE_PATH = "M180 180.538C1512.01 180.54 1718.64 133.099 2067.5 931.594";
const CURVE_VIEWBOX = "0 -10 2248 1132"; // padded 10px so the thick stroke caps aren't clipped

export default function UnravelStrokeReveal({
  introTitle = "Scroll down to watch calm quietly unravel",
  revealedTitle = "Welcome back, things have shifted again",
  /** 9 colours, row-major: top×3 layers, then middle×3, then bottom×3. */
  barColors = ["#FF6D38", "#C6FE69", "#7A78FF", "#7A78FF", "#B9DDFD", "#C6FE69", "#FFC412", "#FF6D38", "#B9DDFD"],
  curveColors = ["#FFC412", "#FF6D38"],
  outlineColor = "#0f0f0f",
  backgroundStart = "#e3e3db",
  backgroundEnd = "#141414",
  textStart = "#141414",
  textEnd = "#ffffff",
  mobileBreakpoint = 1000,
  fontFamily = "var(--font-barlow-condensed), sans-serif",
  textScale = 100,
  speed = 100,
  autoPlay = true,
}: {
  introTitle?: string;
  /** Swapped in at the pin's midpoint, instantly — matching the source. */
  revealedTitle?: string;
  barColors?: string[];
  curveColors?: string[];
  outlineColor?: string;
  backgroundStart?: string;
  backgroundEnd?: string;
  textStart?: string;
  textEnd?: string;
  /** Stage width, in px, below which the wide-format container widens further. */
  mobileBreakpoint?: number;
  fontFamily?: string;
  textScale?: number;
  /** How fast the scrub responds to wheel input and auto-play drifts. */
  speed?: number;
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const revealedRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<Record<string, SVGPathElement | null>>({});
  const barOutlineRefs = useRef<Record<string, SVGPathElement | null>>({});
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const curveRefs = useRef<(SVGPathElement | null)[]>([]);
  const curveOutlineRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const intro = introRef.current;
    const revealed = revealedRef.current;
    if (!root || !intro || !revealed) return;

    const bars = DRAW_ORDER.map(([row, layer]) => barRefs.current[`${row}-${layer}`]);
    const barOutlines = DRAW_ORDER.map(([row, layer]) => barOutlineRefs.current[`${row}-${layer}`]);
    const curves = curveRefs.current;
    const curveOutlines = curveOutlineRefs.current;
    const rows = rowRefs.current;
    if (bars.some((b) => !b) || curves.some((c) => !c) || rows.some((r) => !r)) return;

    const barPaths = bars as SVGPathElement[];
    const barOutlinePaths = barOutlines as SVGPathElement[];
    const curvePaths = curves as SVGPathElement[];
    const curveOutlinePaths = curveOutlines as SVGPathElement[];
    const rowEls = rows as HTMLDivElement[];

    // Every bar shares one length (a straight horizontal line); the two
    // curves share the other.
    const barLength = barPaths[0].getTotalLength();
    const curveLength = curvePaths[0].getTotalLength();
    [...barPaths, ...barOutlinePaths].forEach((p) => {
      p.style.strokeDasharray = String(barLength);
      p.style.strokeDashoffset = String(barLength);
    });
    [...curvePaths, ...curveOutlinePaths].forEach((p) => {
      p.style.strokeDasharray = String(curveLength);
      p.style.strokeDashoffset = String(curveLength);
    });
    gsap.set(revealed, { opacity: 0 });
    gsap.set(rowEls, { xPercent: 0 });

    const tl = gsap.timeline({ paused: true });

    DRAW_ORDER.forEach((_, i) => {
      tl.to([barOutlinePaths[i], barPaths[i]], { strokeDashoffset: 0, duration: 1.5, ease: "power2.out" }, i * 0.3);
    });

    const curveStartTime = 5 * 0.3 + 0.3;
    curveColors.forEach((_, i) => {
      const at = curveStartTime + i;
      tl.to([curveOutlinePaths[i], curvePaths[i]], { strokeDashoffset: 0, duration: 1, ease: "power2.out" }, at);
      tl.to(
        [curveOutlinePaths[i], curvePaths[i]],
        { strokeDashoffset: -curveLength, duration: 1.5, ease: "power2.inOut" },
        at + 1,
      );
    });

    tl.to(rowEls, { xPercent: 100, duration: 2, ease: "power3.inOut", stagger: 0.15 }, ">-0.5");

    const total = tl.duration();
    const rate = Math.max(0.2, speed / 100);
    let progress = 0;
    let target = 0;
    let revealedShown = false;

    function applyHeadline(p: number) {
      const shouldShow = p >= 0.5;
      if (shouldShow === revealedShown) return;
      revealedShown = shouldShow;
      gsap.set(intro, { opacity: shouldShow ? 0 : 1 });
      gsap.set(revealed, { opacity: shouldShow ? 1 : 0 });
      gsap.set(root, {
        backgroundColor: shouldShow ? backgroundEnd : backgroundStart,
        color: shouldShow ? textEnd : textStart,
      });
    }

    let userDriven = false;
    function onWheel(e: WheelEvent) {
      const next = gsap.utils.clamp(0, 1, target + e.deltaY * 0.0006 * rate);
      if (next === target) return;
      e.preventDefault();
      userDriven = true;
      target = next;
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    let autoDir = 1;
    function loop() {
      // A demo with no real page to scroll would otherwise sit static at
      // rest — auto-play drifts it through the whole reveal on its own so
      // colour/text props are visible without a wheel gesture first, the
      // same reasoning the rest of this library's scroll-driven pieces use.
      if (autoPlay && !userDriven) {
        target += autoDir * 0.0035 * rate;
        if (target >= 1) {
          target = 1;
          autoDir = -1;
        } else if (target <= 0) {
          target = 0;
          autoDir = 1;
        }
      }
      progress += (target - progress) * 0.08;
      tl.seek(progress * total);
      applyHeadline(progress);
      raf = requestAnimationFrame(loop);
    }
    loop();

    const ro = new ResizeObserver(() => {
      const isMobile = root.clientWidth < mobileBreakpoint;
      root.style.setProperty("--stroke-container-width", isMobile ? "1000%" : "300%");
    });
    ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      tl.kill();
      root.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, [barColors, curveColors, mobileBreakpoint, speed, autoPlay, backgroundStart, backgroundEnd, textStart, textEnd]);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={
        {
          fontFamily,
          backgroundColor: backgroundStart,
          color: textStart,
          "--stroke-container-width": "300%",
        } as React.CSSProperties
      }
    >
      <div ref={introRef} className="absolute inset-0 flex items-center justify-center px-8 text-center">
        <h1
          className="uppercase font-extrabold leading-[0.85]"
          style={{ fontSize: `clamp(calc(1.75rem * ${scale}), calc(6vw * ${scale}), calc(4rem * ${scale}))` }}
        >
          {introTitle}
        </h1>
      </div>
      <div ref={revealedRef} className="absolute inset-0 flex items-center justify-center px-8 text-center">
        <h1
          className="uppercase font-extrabold leading-[0.85]"
          style={{ fontSize: `clamp(calc(1.75rem * ${scale}), calc(6vw * ${scale}), calc(4rem * ${scale}))` }}
        >
          {revealedTitle}
        </h1>
      </div>

      {/* The nine bars: three rows, each holding three colours stacked
          exactly on top of one another (same path, different stroke),
          drawn and retracted in DRAW_ORDER's staggered wave. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 flex h-[calc(100%-7.5px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center"
        style={{ width: "var(--stroke-container-width)" }}
      >
        {ROWS.map((row, rowIndex) => (
          <div
            key={row}
            ref={(el) => {
              rowRefs.current[rowIndex] = el;
            }}
            className="relative h-full w-full flex-1"
          >
            {[0, 1, 2].map((layer) => (
              <svg
                key={layer}
                viewBox="0 0 3360 360"
                className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 overflow-visible"
              >
                <path
                  ref={(el) => {
                    barOutlineRefs.current[`${row}-${layer}`] = el;
                  }}
                  d="M180 180H3180"
                  fill="none"
                  stroke={outlineColor}
                  strokeWidth={370}
                  strokeMiterlimit={3.8637}
                  strokeLinecap="round"
                />
                <path
                  ref={(el) => {
                    barRefs.current[`${row}-${layer}`] = el;
                  }}
                  d="M180 180H3180"
                  fill="none"
                  stroke={barColors[rowIndex * 3 + layer]}
                  strokeWidth={360}
                  strokeMiterlimit={3.8637}
                  strokeLinecap="round"
                />
              </svg>
            ))}
          </div>
        ))}
      </div>

      {/* The two curves, drawn after the bars and immediately retracted —
          a swoosh rather than a reveal. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 flex h-[calc(100%-7.5px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center"
        style={{ width: "var(--stroke-container-width)" }}
      >
        <div className="flex-1" />
        <div className="relative h-full w-full flex-1">
          {curveColors.map((color, i) => (
            <svg
              key={i}
              viewBox={CURVE_VIEWBOX}
              className="absolute left-[40%] top-0 h-[310%] -translate-x-1/2 -translate-y-[1%] object-contain overflow-visible"
            >
              <path
                ref={(el) => {
                  curveOutlineRefs.current[i] = el;
                }}
                d={CURVE_PATH}
                fill="none"
                stroke={outlineColor}
                strokeWidth={370}
                strokeMiterlimit={3.8637}
                strokeLinecap="round"
              />
              <path
                ref={(el) => {
                  curveRefs.current[i] = el;
                }}
                d={CURVE_PATH}
                fill="none"
                stroke={color}
                strokeWidth={360}
                strokeMiterlimit={3.8637}
                strokeLinecap="round"
              />
            </svg>
          ))}
        </div>
        <div className="flex-1" />
      </div>
    </div>
  );
}
