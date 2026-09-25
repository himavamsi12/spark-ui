"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_IMAGES = Array.from({ length: 32 }, (_, i) => `/infinite-drag-grid/tile-${i + 1}.jpg`);

const DEFAULT_NAMES = [
  "Ana Lucía", "Tomás Ruiz", "Elena Cándida", "Mateo Ibarra", "Clara Benítez", "Julián Soto", "Irene Vidal",
  "Hugo Ferrer", "Sofía Aranda", "Bruno Salas", "Marta Quiroga", "Diego Paredes", "Lucía Morales", "Andrés Lagos",
  "Paula Ríos", "Nicolás Vera", "Carmen Solís", "Rafael Ortega", "Valeria Cruz", "Gabriel Núñez",
];

/**
 * An endless plane of numbered tiles that pans in every direction under a
 * drag or the wheel. Columns zigzag up and down and alternate rows are
 * offset, so the plane reads as scattered prints rather than a spreadsheet.
 * Dragging zooms the plane out and releasing zooms it back; the view eases
 * after the pointer, the plane leans gently away from it, and tiles that
 * leave one edge re-enter at the other.
 */
export default function InfiniteDragGrid({
  images = DEFAULT_IMAGES,
  names = DEFAULT_NAMES,
  columns = 20,
  rows = 10,
  scale = 100,
  zigzag = 100,
  rowShift = 36,
  smoothing = 60,
  hoverScale = 108,
  dragZoom = 80,
  background = "#fafafa",
  textColor = "#111111",
  fontFamily = "var(--font-dm-mono), monospace",
  textScale = 100,
  autoPlay = false,
}: {
  /** Tile images, repeated across the plane. */
  images?: string[];
  /** Name printed above each tile, repeated across the plane. */
  names?: string[];
  /** Tiles per row before the plane repeats. */
  columns?: number;
  /** Rows before the plane repeats. */
  rows?: number;
  /** Size of tiles and spacing, as a %. */
  scale?: number;
  /** How far alternate columns drop, as a %. */
  zigzag?: number;
  /** Sideways offset of alternate rows, as a % of the column spacing. */
  rowShift?: number;
  /** How softly the view follows the pointer, 0-100. */
  smoothing?: number;
  /** Size of a hovered tile, as a %. */
  hoverScale?: number;
  /** Scale the plane zooms out to while dragging, as a %. */
  dragZoom?: number;
  background?: string;
  textColor?: string;
  fontFamily?: string;
  textScale?: number;
  /** Drifts slowly on its own until the plane is touched. */
  autoPlay?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const cols = Math.max(2, Math.round(columns));
  const rowCount = Math.max(2, Math.round(rows));
  const count = cols * rowCount;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setSize({ w: root.clientWidth, h: root.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // Layout in px, all proportional to the frame's width.
  const u = (Math.max(size.w, 320) / 100) * (scale / 100);
  const tile = u * 8.1;
  const label = u * 0.82 * (textScale / 100);
  const pitchX = u * 15.8;
  const pitchY = u * 17.2;
  const drop = u * 4.1 * (zigzag / 100);
  const planeW = cols * pitchX;
  const planeH = rowCount * pitchY;

  const view = useRef({ x: 0, y: 0, tx: 0, ty: 0, px: 0.5, py: 0.5, tpx: 0.5, tpy: 0.5 });
  // Zoom of the whole plane: eased out while dragging, back in on release.
  const zoom = useRef({ from: 1, to: 1, start: 0, dur: 0.4, inOut: false });
  const live = useRef({ pitchX, pitchY, drop, planeW, planeH, rowShift, smoothing, cols, count, tile, label, w: size.w, h: size.h });
  useEffect(() => {
    live.current = { pitchX, pitchY, drop, planeW, planeH, rowShift, smoothing, cols, count, tile, label, w: size.w, h: size.h };
  });
  const playing = useRef(autoPlay);
  useEffect(() => {
    playing.current = autoPlay;
  }, [autoPlay]);

  const zoomAt = (now: number) => {
    const z = zoom.current;
    const p = clamp((now - z.start) / 1000 / z.dur, 0, 1);
    const e = z.inOut ? (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2) : 1 - (1 - p) * (1 - p);
    return z.from + (z.to - z.from) * e;
  };
  const zoomTo = (to: number, inOut: boolean) => {
    const now = performance.now();
    zoom.current = { from: zoomAt(now), to, start: now, dur: 0.4, inOut };
  };

  // Positions are written straight to the DOM each frame; React only renders the tiles once.
  const planeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const L = live.current;
      const v = view.current;
      if (playing.current) {
        v.tx -= 28 * dt;
        v.ty -= 14 * dt;
      }
      // The view and the pointer parallax both chase their targets by a fixed
      // share per frame (8% at the default), made frame-rate independent.
      const k = 1 - Math.pow(1 - clamp(0.32 - L.smoothing * 0.004, 0.02, 1), dt * 60);
      v.x += (v.tx - v.x) * k;
      v.y += (v.ty - v.y) * k;
      v.px += (v.tpx - v.px) * k;
      v.py += (v.tpy - v.py) * k;
      const z = zoomAt(now);
      if (planeRef.current) planeRef.current.style.transform = `scale(${z})`;
      // The whole plane leans away from the pointer by up to most of a tile.
      const shiftX = -(v.px - 0.5) * L.tile * 1.6;
      const shiftY = -(v.py - 0.5) * L.tile * 1.6;
      // Zoomed out, more of the plane is on screen, so the wrap window widens.
      const mx = (L.w / z - L.w) / 2;
      const my = (L.h / z - L.h) / 2;
      const tileH = L.tile + L.label * 1.9;
      for (let i = 0; i < L.count; i++) {
        const el = tileRefs.current[i];
        if (!el) continue;
        const r = Math.floor(i / L.cols);
        const c = i % L.cols;
        const baseX = c * L.pitchX + (r % 2 ? -(L.rowShift / 100) * L.pitchX : 0);
        const baseY = r * L.pitchY + (c % 2 ? L.drop : 0);
        const x = wrap(baseX + v.x + shiftX + L.pitchX + mx, L.planeW) - L.pitchX - mx;
        const y = wrap(baseY + v.y + shiftY + L.pitchY + my, L.planeH) - L.pitchY - my;
        const visible = x < L.w + mx + L.pitchX && y < L.h + my + L.pitchY && x > -L.tile - L.pitchX - mx && y > -tileH - L.pitchY - my;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        el.style.visibility = visible ? "visible" : "hidden";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // A press becomes a drag after 8px of travel or 300ms held; only then does
  // the plane zoom out. The view follows the pointer with no throw on release.
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; active: boolean; hold: ReturnType<typeof setTimeout> } | null>(null);
  const beginDrag = () => {
    const d = drag.current;
    if (!d || d.active) return;
    d.active = true;
    setDragging(true);
    zoomTo(dragZoom / 100, false);
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointers that can't be captured still drag while over the frame.
    }
    playing.current = false;
    const v = view.current;
    drag.current = { x: e.clientX, y: e.clientY, tx: v.tx, ty: v.ty, active: false, hold: setTimeout(beginDrag, 300) };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    view.current.tpx = (e.clientX - rect.left) / rect.width;
    view.current.tpy = (e.clientY - rect.top) / rect.height;
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.hypot(dx, dy) <= 8) return;
      clearTimeout(d.hold);
      beginDrag();
    }
    view.current.tx = d.tx + dx;
    view.current.ty = d.ty + dy;
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    clearTimeout(d.hold);
    if (d.active) {
      setDragging(false);
      zoomTo(1, true);
    }
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      playing.current = false;
      const f = e.deltaMode === 1 ? 16 : 1;
      view.current.tx -= 0.8 * e.deltaX * f;
      view.current.ty -= 0.8 * e.deltaY * f;
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full select-none overflow-hidden"
      style={{ background, color: textColor, fontFamily, touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div ref={planeRef} className="absolute inset-0" style={{ transformOrigin: "50% 50%", willChange: "transform" }}>
      {size.w > 0 &&
        Array.from({ length: count }, (_, i) => {
          const src = images.length ? images[i % images.length] : "";
          const name = names.length ? names[i % names.length] : "";
          return (
            <div
              key={i}
              ref={(el) => {
                tileRefs.current[i] = el;
              }}
              className="group absolute left-0 top-0"
              style={{ width: tile, visibility: "hidden", willChange: "transform" }}
            >
              <div
                className="transition-transform duration-500 ease-out"
                style={{ transformOrigin: "50% 60%" }}
                onPointerEnter={(e) => {
                  if (!drag.current) e.currentTarget.style.transform = `scale(${hoverScale / 100})`;
                }}
                onPointerLeave={(e) => {
                  e.currentTarget.style.transform = "";
                }}
              >
                <div
                  className="flex items-baseline justify-between whitespace-nowrap"
                  style={{ fontSize: label, lineHeight: 1, letterSpacing: "0.04em", marginBottom: label * 0.9 }}
                >
                  <span>{i + 1}.</span>
                  <span className="ml-3 truncate">{name}</span>
                </div>
                <div className="overflow-hidden" style={{ width: tile, height: tile, background: "rgba(0,0,0,0.05)" }}>
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" draggable={false} decoding="async" className="block h-full w-full object-cover" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function wrap(v: number, len: number) {
  return ((v % len) + len) % len;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
