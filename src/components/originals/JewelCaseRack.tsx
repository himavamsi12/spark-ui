"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_COVERS = Array.from({ length: 28 }, (_, i) => `/jewel-case-rack/cover-${i + 1}.jpg`);

const DEFAULT_TITLES = ["Static Meadow", "", "", "Aurora bloom\n13.04.1999", "", "The Shrooms", "", "", "Deluxe Edition", "", "Lunar", ""];

// How far each neighbour follows the hovered case out of the rack.
const FOLLOW = [1, 0.42, 0.16, 0.05];

/**
 * A long isometric rack of CD jewel cases drifting slowly along its length as
 * an endless carousel. Hovering a case brings the rack to a stop and slides
 * that case out of the row in its own plane, like fingering a disc off a
 * shelf; its neighbours come part of the way with it and the row parts
 * slightly around it.
 */
export default function JewelCaseRack({
  covers = DEFAULT_COVERS,
  titles = DEFAULT_TITLES,
  count = 24,
  caseSize = 210,
  spacing = 36,
  pullOut = 45,
  spread = 14,
  tilt = 22,
  turn = 48,
  background = "#cbcbcb",
  caseTint = "#e4e8ef",
  speed = 100,
  drift = 22,
  showTitles = true,
  fontFamily = "var(--font-inter), sans-serif",
  textScale = 100,
}: {
  /** Cover art, repeated along the rack. */
  covers?: string[];
  /** Caption printed on each cover in turn; leave an entry empty for a plain cover. */
  titles?: string[];
  /** Minimum number of cases; the rack adds more as needed to run edge to edge. */
  count?: number;
  /** Width and height of a case, in px. */
  caseSize?: number;
  /** Distance between neighbouring cases, in px. */
  spacing?: number;
  /** How far the hovered case slides out, as a % of its width. */
  pullOut?: number;
  /** Gap that opens either side of the hovered case, in px. */
  spread?: number;
  /** Degrees the camera looks down on the rack. */
  tilt?: number;
  /** Degrees the rack is turned away from the camera. */
  turn?: number;
  background?: string;
  /** Colour of the clear plastic. */
  caseTint?: string;
  /** Speed of the slide, as a %. */
  speed?: number;
  /** Carousel speed in px per second along the rack; negative runs it the other way. */
  drift?: number;
  showTitles?: boolean;
  fontFamily?: string;
  textScale?: number;
  /** Accepted for the preview grid; the carousel always runs. */
  autoPlay?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<number | null>(null);
  // Slot positions along the rack at the moment a case was hovered. The
  // carousel is stopped while hovering, so these stay true until it leaves.
  const [slots, setSlots] = useState<number[] | null>(null);
  // The rack always runs off both edges of the frame: enough cases to cover
  // the frame's diagonal at the current scale and angle, and at least `count`.
  const fit = size.w > 0 ? Math.min(size.w / 1200, size.h / 800) * 1.4 : 1;
  const step = spacing * fit * Math.hypot(Math.sin((turn * Math.PI) / 180), Math.cos((turn * Math.PI) / 180) * Math.sin((tilt * Math.PI) / 180));
  const needed = size.w > 0 ? Math.ceil(Math.hypot(size.w, size.h) / Math.max(1, step)) + 6 : 0;
  const n = Math.min(120, Math.max(1, Math.round(count), needed));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setSize({ w: root.clientWidth, h: root.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // The carousel runs outside React: each frame advances an offset along the
  // rack and writes every case's depth and edge fade straight to the DOM.
  const caseRefs = useRef<(HTMLDivElement | null)[]>([]);
  const offset = useRef(0);
  const live = useRef({ drift, spacing, n, paused: false });
  useEffect(() => {
    live.current = { drift, spacing, n, paused: hovered !== null };
  });
  const slotOf = (i: number) => {
    const { spacing: sp, n: count } = live.current;
    const len = count * sp;
    return ((((i * sp - offset.current) % len) + len) % len) / sp;
  };

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let velocity = live.current.drift;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const L = live.current;
      // Ease to a stop on hover and back up to speed after, rather than snapping.
      velocity += ((L.paused ? 0 : L.drift) - velocity) * (1 - Math.exp(-dt * 5));
      offset.current += velocity * dt;
      const len = L.n * L.spacing;
      const fadeLen = L.spacing * 1.5;
      for (let i = 0; i < L.n; i++) {
        const el = caseRefs.current[i];
        if (!el) continue;
        const p = (((i * L.spacing - offset.current) % len) + len) % len;
        el.style.transform = `translate3d(0, 0, ${-(p - len / 2 + L.spacing / 2)}px)`;
        el.style.setProperty("--fade", String(Math.min(1, p / fadeLen, (len - L.spacing - p) / fadeLen + 1 / 1.5)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPointerMove = (e: React.PointerEvent) => {
    const el = (e.target as Element).closest("[data-case]");
    if (!el) {
      setHovered(null);
      return;
    }
    const i = Number(el.getAttribute("data-case"));
    if (i === hovered) return;
    setSlots(Array.from({ length: n }, (_, k) => slotOf(k)));
    setHovered(i);
  };
  const active = hovered !== null && slots ? hovered : null;

  const W = caseSize;
  const H = caseSize;
  const D = Math.max(6, caseSize * 0.06);
  const hinge = W * 0.075;
  const duration = 0.65 / (Math.max(10, speed) / 100);
  const edge = `1px solid rgba(255,255,255,0.55)`;
  const plastic = `color-mix(in srgb, ${caseTint} 55%, transparent)`;
  const fs = (textScale / 100) * (caseSize / 210);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full select-none overflow-hidden"
      style={{ background, fontFamily }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHovered(null)}
    >
      <div className="absolute left-1/2 top-1/2" style={{ transformStyle: "preserve-3d", transform: `scale(${fit}) rotateX(${-tilt}deg) rotateY(${-turn}deg)` }}>
        {Array.from({ length: n }, (_, i) => {
          const cover = covers.length ? covers[i % covers.length] : "";
          const title = showTitles && titles.length ? titles[i % titles.length] : "";
          // Neighbours are counted by where cases sit in the rack, since the
          // carousel wraps and index order stops matching position.
          const d = active === null || !slots ? -1 : Math.round(Math.abs(slots[i] - slots[active]));
          const follow = d >= 0 && d < FOLLOW.length ? FOLLOW[d] : 0;
          const x = (pullOut / 100) * W * follow;
          const gap = active === null || !slots || i === active ? 0 : Math.sign(slots[active] - slots[i]) * spread;
          return (
            <div
              key={i}
              ref={(el) => {
                caseRefs.current[i] = el;
              }}
              data-case={i}
              className="absolute"
              style={{ width: W, height: H, left: -W / 2, top: -H / 2, transformStyle: "preserve-3d" }}
            >
            <div
              className="absolute inset-0"
              style={{
                transformStyle: "preserve-3d",
                transform: `translate3d(${x}px, 0, ${gap}px)`,
                transition: `transform ${duration}s cubic-bezier(0.22, 1, 0.36, 1)`,
              }}
            >
              {/* Front: the cover behind clear plastic, with the black hinge down the left */}
              <div className="absolute inset-0 overflow-hidden" style={{ transform: `translateZ(${D / 2}px)`, background: plastic, border: edge, backfaceVisibility: "hidden", opacity: "var(--fade, 1)" }}>
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt=""
                    draggable={false}
                    decoding="async"
                    className="absolute object-cover"
                    style={{ left: hinge + 2, top: 3, width: W - hinge - 6, height: H - 6 }}
                  />
                )}
                {title && (
                  <div
                    className="absolute whitespace-pre-line text-white"
                    style={{
                      left: hinge + 12 * fs,
                      top: i % 2 ? undefined : 12 * fs,
                      bottom: i % 2 ? 22 * fs : undefined,
                      fontSize: 13 * fs,
                      lineHeight: 1.15,
                      letterSpacing: "0.01em",
                      fontFamily: i % 2 ? "var(--font-dm-mono), monospace" : undefined,
                      textShadow: "0 1px 6px rgba(0,0,0,0.35)",
                    }}
                  >
                    {title}
                  </div>
                )}
                <div
                  className="absolute inset-y-0 left-0"
                  style={{ width: hinge, background: "linear-gradient(90deg, #0d0d0d, #2b2b2b 60%, #121212)", borderRight: "1px solid rgba(255,255,255,0.25)" }}
                >
                  <div className="absolute left-[18%] right-[18%] top-[3%]" style={{ height: hinge * 0.7, background: "#050505", border: "1px solid rgba(255,255,255,0.18)" }} />
                  <div className="absolute left-[18%] right-[18%] bottom-[3%]" style={{ height: hinge * 0.7, background: "#050505", border: "1px solid rgba(255,255,255,0.18)" }} />
                </div>
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "linear-gradient(115deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.08) 22%, rgba(255,255,255,0) 45%, rgba(255,255,255,0) 72%, rgba(255,255,255,0.18) 100%)" }}
                />
              </div>

              {/* Opening edge: clear plastic, so the art of the case behind shows through.
                  The back and hinge sides always face away, so they aren't drawn. */}
              <div
                className="absolute top-0"
                style={{
                  left: W / 2 - D / 2,
                  width: D,
                  height: H,
                  transform: `rotateY(90deg) translateZ(${W / 2}px)`,
                  backfaceVisibility: "hidden",
                  opacity: "var(--fade, 1)",
                  background: "linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.4))",
                  border: edge,
                }}
              />

              {/* Top edge: clear, with the hinge's dark knuckle at the left */}
              <div
                className="absolute left-0"
                style={{
                  top: H / 2 - D / 2,
                  width: W,
                  height: D,
                  transform: `rotateX(90deg) translateZ(${H / 2}px)`,
                  backfaceVisibility: "hidden",
                  opacity: "var(--fade, 1)",
                  background: `linear-gradient(90deg, #111 0, #333 ${hinge}px, ${plastic} ${hinge}px, rgba(255,255,255,0.7) 60%, ${plastic})`,
                  border: edge,
                }}
              />
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
