"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, animate, motion, motionValue, useMotionValue, type MotionValue } from "motion/react";
import { AudioLines, Contrast, FastForward, Pause, PersonStanding, Play, Plus, Rewind, ScanQrCode, Sun, Timer } from "lucide-react";

type WidgetSize = "square" | "wide";

/* ───────────────────────── icons ───────────────────────── */

function AirPlayAudioIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden="true">
      <path d="M5 16.8A8.5 8.5 0 1 1 19 16.8" />
      <path d="M8.2 14.2a4.6 4.6 0 1 1 7.6 0" />
      <path d="M12 13.2 17 20.5H7z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function AccessibilityIcon({ size }: { size: number }) {
  return (
    <span className="flex items-center justify-center rounded-full" style={{ width: size, height: size, border: `${Math.max(1.6, size * 0.075)}px solid currentColor` }}>
      <PersonStanding size={size * 0.72} strokeWidth={2.2} />
    </span>
  );
}

function QuickNoteIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <rect x="2.5" y="4" width="17" height="14" rx="2.5" />
      <path d="M2.5 8h17" />
      <path d="M6 11.5h8M6 14.5h5" />
      <circle cx="18.5" cy="17.5" r="4" fill="currentColor" stroke="none" />
      <path d="M18.5 15.6v3.8M16.6 17.5h3.8" stroke="#000" strokeOpacity={0.55} />
    </svg>
  );
}

function PingWatchIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <rect x="8" y="6" width="8" height="12" rx="2.6" fill="currentColor" stroke="none" />
      <path d="M9.5 6V3.5h5V6M9.5 18v2.5h5V18" />
      <path d="M5.2 9a5 5 0 0 0 0 6M2.6 7.2a8.4 8.4 0 0 0 0 9.6M18.8 9a5 5 0 0 1 0 6M21.4 7.2a8.4 8.4 0 0 1 0 9.6" />
    </svg>
  );
}

const TILES: { id: string; label: string; render: (size: number) => React.ReactNode }[] = [
  { id: "brightness", label: "Brightness", render: (s) => <Sun size={s} strokeWidth={2.2} fill="currentColor" /> },
  { id: "accessibility", label: "Accessibility", render: (s) => <AccessibilityIcon size={s * 0.92} /> },
  { id: "notes", label: "Quick Note", render: (s) => <QuickNoteIcon size={s} /> },
  { id: "timer", label: "Timer", render: (s) => <Timer size={s} strokeWidth={1.8} /> },
  { id: "scanner", label: "Code Scanner", render: (s) => <ScanQrCode size={s} strokeWidth={1.7} /> },
  { id: "contrast", label: "Dark Mode", render: (s) => <Contrast size={s} strokeWidth={2.4} /> },
  { id: "recognition", label: "Sound Recognition", render: (s) => <AudioLines size={s} strokeWidth={2} /> },
  { id: "watch", label: "Ping Watch", render: (s) => <PingWatchIcon size={s} /> },
];

/* ───────────────────────── geometry ───────────────────────── */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** iOS-style rubber band: 1:1 near the edge, asymptotically approaching `max`. */
const rubber = (overshoot: number, max = 0.14) => max * (1 - 1 / (overshoot / max + 1));

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** SVG arc (clockwise, y-down) around (cx, cy) between two angles in degrees. */
function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
  const a0 = (fromDeg * Math.PI) / 180;
  const a1 = (toDeg * Math.PI) / 180;
  const f = (n: number) => n.toFixed(2);
  return `M ${f(cx + r * Math.cos(a0))} ${f(cy + r * Math.sin(a0))} A ${f(r)} ${f(r)} 0 0 1 ${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))}`;
}

const LAYOUT_KEYS = [
  "w", "h", "radius",
  "artX", "artY", "artS",
  "airX", "airY", "airS",
  "titleX", "titleY", "titleW",
  "ctrlY", "rewX", "rewO", "pauseX", "nextX",
] as const;
type LayoutKey = (typeof LAYOUT_KEYS)[number];
type WidgetLayout = Record<LayoutKey, number>;

/**
 * Every pixel of the Now Playing widget as a pure function of resize progress
 * `p` (0 = 2×2 square, 1 = 4×1 pill). Size tracks `p` unclamped so the widget
 * can rubber-band past either end; inner content uses the clamped value but is
 * anchored to the live edges, so it hugs the frame as it stretches.
 */
function widgetLayout(p: number, t: number, g: number): WidgetLayout {
  const q = clamp01(p);
  const S = 2 * t + g;
  const W = 4 * t + 3 * g;
  const w = lerp(S, W, p);
  const h = lerp(S, t, p);
  const btn = 0.5 * t;

  // square layout, relative to the live frame
  const sq = {
    artX: 0.2 * t, artY: 0.2 * t, artS: 0.7 * t,
    airS: 0.54 * t, airX: w - 0.2 * t - 0.54 * t, airY: 0.28 * t,
    titleX: 0.2 * t, titleY: 1.0 * t, titleW: w - 0.4 * t,
    ctrlY: h - 0.37 * t, rew: w / 2 - 0.6 * t, pause: w / 2, next: w / 2 + 0.6 * t,
  };
  // wide layout, relative to the live frame
  const wd = {
    artX: 0.18 * t, artY: h / 2 - 0.32 * t, artS: 0.64 * t,
    airS: 0.5 * t, airX: w - 0.25 * t - 0.5 * t, airY: h / 2 - 0.25 * t,
    titleX: 0.97 * t, titleY: h / 2 - 0.2 * t, titleW: Math.max(0, w - 2.05 * t - 0.97 * t),
    ctrlY: h / 2, rew: w - 1.7 * t, pause: w - 1.7 * t, next: w - 1.18 * t,
  };

  return {
    w, h,
    radius: lerp(0.37 * t, h / 2, q),
    artX: lerp(sq.artX, wd.artX, q), artY: lerp(sq.artY, wd.artY, q), artS: lerp(sq.artS, wd.artS, q),
    airX: lerp(sq.airX, wd.airX, q), airY: lerp(sq.airY, wd.airY, q), airS: lerp(sq.airS, wd.airS, q),
    titleX: lerp(sq.titleX, wd.titleX, q), titleY: lerp(sq.titleY, wd.titleY, q), titleW: lerp(sq.titleW, wd.titleW, q),
    ctrlY: lerp(sq.ctrlY, wd.ctrlY, q) - btn / 2,
    rewX: lerp(sq.rew, wd.rew, q) - btn / 2,
    rewO: 1 - clamp01(q / 0.4),
    pauseX: lerp(sq.pause, wd.pause, q) - btn / 2,
    nextX: lerp(sq.next, wd.next, q) - btn / 2,
  };
}

/** Grid slots for the tiles, flowing around the widget's footprint. */
function placeTiles(ids: string[], showWidget: boolean, size: WidgetSize) {
  const taken = new Set<string>();
  if (showWidget) {
    const cells = size === "square" ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[0, 0], [1, 0], [2, 0], [3, 0]];
    cells.forEach(([c, r]) => taken.add(`${c}:${r}`));
  }
  const out: Record<string, { c: number; r: number }> = {};
  let cell = 0;
  for (const id of ids) {
    while (taken.has(`${cell % 4}:${Math.floor(cell / 4)}`)) cell++;
    out[id] = { c: cell % 4, r: Math.floor(cell / 4) };
    cell++;
  }
  return out;
}

/* ───────────────────────── component ───────────────────────── */

export default function ControlCenterEdit({
  bgFrom = "#c46a6c",
  bgVia = "#cfa2aa",
  bgTo = "#0d5670",
  accentColor = "#ffffff",
  artwork = "/grid-shutter/img1.jpg",
  songTitle = "Golden Hour",
  artist = "Nova & The Tides",
  tileSize = 72,
  gap = 10,
  glassOpacity = 30,
  blur = 22,
  widgetSize: widgetSizeProp = "square",
  startEditing = true,
  speed = 100,
  autoPlay = false,
}: {
  bgFrom?: string;
  bgVia?: string;
  bgTo?: string;
  accentColor?: string;
  artwork?: string;
  songTitle?: string;
  artist?: string;
  tileSize?: number;
  gap?: number;
  glassOpacity?: number;
  blur?: number;
  widgetSize?: WidgetSize;
  startEditing?: boolean;
  speed?: number;
  autoPlay?: boolean;
}) {
  const t = tileSize;
  const g = gap;

  const [editing, setEditing] = useState(startEditing);
  const [size, setSize] = useState<WidgetSize>(widgetSizeProp);
  const [tiles, setTiles] = useState(TILES.map((x) => x.id));
  const [showWidget, setShowWidget] = useState(true);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState(true);
  const [dragging, setDragging] = useState(false);

  const [prevStart, setPrevStart] = useState(startEditing);
  if (prevStart !== startEditing) {
    setPrevStart(startEditing);
    setEditing(startEditing);
  }
  const [prevSize, setPrevSize] = useState(widgetSizeProp);
  if (prevSize !== widgetSizeProp) {
    setPrevSize(widgetSizeProp);
    setSize(widgetSizeProp);
  }

  const springCfg = { type: "spring" as const, stiffness: 420 * (speed / 100), damping: 36, mass: 1 };

  /* ── resize progress drives every widget pixel through motion values (no re-renders while dragging) ── */
  const progress = useMotionValue(widgetSizeProp === "wide" ? 1 : 0);
  const [mv] = useState(() => {
    const init = widgetLayout(widgetSizeProp === "wide" ? 1 : 0, tileSize, gap);
    return Object.fromEntries(LAYOUT_KEYS.map((k) => [k, motionValue(init[k])])) as Record<LayoutKey, MotionValue<number>>;
  });
  const arcBox = t * 0.9;
  const arcOverhang = t * 0.14;
  const arcD = useMotionValue("");

  useEffect(() => {
    const apply = (p: number) => {
      const l = widgetLayout(p, t, g);
      for (const k of LAYOUT_KEYS) mv[k].set(l[k]);
      const c = arcBox - arcOverhang - l.radius;
      arcD.set(arcPath(c, c, l.radius + t * 0.01, 16, 74));
    };
    apply(progress.get());
    return progress.on("change", apply);
  }, [progress, mv, arcD, t, g, arcBox, arcOverhang]);

  // Settle onto whichever size is current (tap, prop change, auto play, release).
  const drag = useRef<{ x: number; y: number; p0: number; moved: boolean } | null>(null);
  useEffect(() => {
    if (drag.current) return;
    const ctrl = animate(progress, size === "wide" ? 1 : 0, { ...springCfg, velocity: progress.getVelocity() });
    return () => ctrl.stop();
    // springCfg is derived from speed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, progress, speed]);

  /* ── fit to container ── */
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const panelW = 4 * t + 3 * g;
  const panelH = 3 * t + 2 * g;
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => {
      const s = Math.max(0.3, Math.min(1.7, (frame.clientWidth - 40) / panelW, (frame.clientHeight - 150) / panelH));
      scaleRef.current = s;
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [panelW, panelH]);

  /* ── auto play demo ── */
  useEffect(() => {
    if (!autoPlay) return;
    const steps = [() => setEditing(true), () => setSize("wide"), () => setSize("square"), () => setEditing(false)];
    let i = 0;
    const id = setInterval(() => steps[i++ % steps.length](), 1800 * (100 / Math.max(25, speed)));
    return () => clearInterval(id);
  }, [autoPlay, speed]);

  /* ── resize gesture: the widget follows the finger 1:1 along the square→pill diagonal ── */
  const sizeRef = useRef(size);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  function onHandleDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer already released (e.g. synthetic events); moves still arrive via bubbling
    }
    progress.stop();
    drag.current = { x: e.clientX, y: e.clientY, p0: progress.get(), moved: false };
    setDragging(true);
  }

  function onHandleMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / scaleRef.current;
    const dy = (e.clientY - d.y) / scaleRef.current;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    d.moved = true;

    // Project the pointer delta onto the vector from the square's corner to the pill's corner.
    const vx = 2 * t + 2 * g;
    const vy = -(t + g);
    const raw = d.p0 + (dx * vx + dy * vy) / (vx * vx + vy * vy);
    const p = raw < 0 ? -rubber(-raw) : raw > 1 ? 1 + rubber(raw - 1) : raw;
    progress.set(p);

    // Reflow the other tiles as soon as the widget commits past halfway (with hysteresis).
    if (sizeRef.current === "square" && p > 0.55) {
      sizeRef.current = "wide";
      setSize("wide");
    } else if (sizeRef.current === "wide" && p < 0.45) {
      sizeRef.current = "square";
      setSize("square");
    }
  }

  function onHandleUp() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragging(false);

    let target: WidgetSize;
    if (!d.moved) {
      target = sizeRef.current === "square" ? "wide" : "square";
    } else {
      const projected = progress.get() + progress.getVelocity() * 0.12;
      target = projected > 0.5 ? "wide" : "square";
    }
    if (target !== sizeRef.current) {
      sizeRef.current = target;
      setSize(target); // the size effect springs `progress` home, carrying the release velocity
    } else {
      animate(progress, target === "wide" ? 1 : 0, { ...springCfg, velocity: progress.getVelocity() });
    }
  }

  /* ── long press anywhere on a control enters edit mode, like iOS ── */
  const pressTimer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);
  const pressHandlers = {
    onPointerDown: () => {
      if (editing) return;
      longPressed.current = false;
      pressTimer.current = window.setTimeout(() => {
        longPressed.current = true;
        setEditing(true);
      }, 450);
    },
    onPointerUp: () => window.clearTimeout(pressTimer.current),
    onPointerLeave: () => window.clearTimeout(pressTimer.current),
  };

  function restoreAll() {
    setTiles(TILES.map((x) => x.id));
    setShowWidget(true);
  }

  /* ── styling ── */
  const ring = Math.max(2, t * 0.03);
  const backdrop = `blur(${blur}px) saturate(180%)`;
  const tileGlass = {
    backgroundColor: `rgba(12,16,22,${glassOpacity / 100})`,
    backdropFilter: backdrop,
    WebkitBackdropFilter: backdrop,
    boxShadow: `inset 0 0 0 ${ring}px rgba(255,255,255,0.36), 0 8px 24px -14px rgba(0,0,0,0.45)`,
  };
  const pillGlass = {
    backgroundColor: "rgba(255,255,255,0.18)",
    backdropFilter: backdrop,
    WebkitBackdropFilter: backdrop,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
  };
  const arcStroke = t * 0.16;
  const tileArcBox = t + arcOverhang * 2;
  const tileArc = arcPath(tileArcBox / 2, tileArcBox / 2, t / 2 + t * 0.01, 18, 72);
  const slots = placeTiles(tiles, showWidget, size);

  const badge = (onRemove: () => void, label: string) => (
    <motion.button
      key="minus"
      type="button"
      aria-label={`Remove ${label}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.85 }}
      transition={springCfg}
      className="absolute z-30 flex items-center justify-center rounded-full"
      style={{
        left: -t * 0.02,
        top: -t * 0.02,
        width: t * 0.29,
        height: t * 0.29,
        backgroundColor: "rgba(242,236,238,0.94)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
      }}
    >
      <span className="block rounded-full" style={{ width: t * 0.14, height: Math.max(2, t * 0.028), backgroundColor: "#8e8e93" }} />
    </motion.button>
  );

  return (
    <div
      ref={frameRef}
      className="relative h-full w-full select-none overflow-hidden"
      style={{
        background: [
          "radial-gradient(55% 40% at 88% 4%, rgba(196,186,98,0.9), transparent 72%)",
          `radial-gradient(45% 35% at 0% 100%, ${hexToRgba(bgVia, 0.9)}, transparent 70%)`,
          `linear-gradient(122deg, ${bgVia} 0%, ${bgFrom} 34%, ${bgFrom} 46%, ${bgTo} 66%, #06314a 100%)`,
        ].join(","),
      }}
      onClick={() => editing && setEditing(false)}
    >
      {/* bottom bar */}
      <div className="absolute inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2 px-4 pb-5">
        <AnimatePresence>
          {editing && (
            <motion.button
              key="add"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                restoreAll();
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-white"
              style={pillGlass}
            >
              <Plus size={13} strokeWidth={2.5} /> Add a Control
            </motion.button>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditing((v) => !v);
          }}
          className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-white"
          style={pillGlass}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{ width: panelW, height: panelH, transform: `scale(${scale})` }}
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence initial={false}>
            {showWidget && (
              <motion.div
                key="now-playing"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={springCfg}
                className="absolute left-0 top-0 z-10 text-white"
                style={{ width: mv.w, height: mv.h, transformOrigin: "0 0" }}
                {...pressHandlers}
              >
                <motion.div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    borderRadius: mv.radius,
                    backgroundColor: `rgba(128,38,46,${Math.min(0.92, glassOpacity / 100 + 0.3)})`,
                    backdropFilter: backdrop,
                    WebkitBackdropFilter: backdrop,
                    boxShadow: `inset 0 0 0 ${ring}px rgba(255,186,190,0.62), 0 14px 34px -18px rgba(60,0,0,0.6)`,
                  }}
                >
                  <motion.img
                    src={artwork}
                    alt=""
                    draggable={false}
                    className="absolute left-0 top-0 object-cover"
                    style={{ x: mv.artX, y: mv.artY, width: mv.artS, height: mv.artS, borderRadius: t * 0.13, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
                  />
                  <motion.div
                    className="absolute left-0 top-0 flex items-center justify-center rounded-full"
                    style={{ x: mv.airX, y: mv.airY, width: mv.airS, height: mv.airS, backgroundColor: "rgba(255,255,255,0.14)" }}
                  >
                    <AirPlayAudioIcon size={t * 0.3} />
                  </motion.div>
                  <motion.div className="absolute left-0 top-0" style={{ x: mv.titleX, y: mv.titleY, width: mv.titleW }}>
                    <div className="truncate font-semibold" style={{ fontSize: t * 0.155, lineHeight: 1.25 }}>
                      {songTitle}
                    </div>
                    <div className="truncate" style={{ fontSize: t * 0.15, lineHeight: 1.25, color: "rgba(255,168,172,0.95)" }}>
                      {artist}
                    </div>
                  </motion.div>
                  <motion.button
                    type="button"
                    aria-label="Previous"
                    className="absolute left-0 top-0 flex items-center justify-center"
                    style={{ x: mv.rewX, y: mv.ctrlY, opacity: mv.rewO, width: t * 0.5, height: t * 0.5 }}
                    whileTap={{ scale: 0.8 }}
                  >
                    <Rewind size={t * 0.27} fill="currentColor" strokeWidth={1} />
                  </motion.button>
                  <motion.button
                    type="button"
                    aria-label={playing ? "Pause" : "Play"}
                    onClick={() => setPlaying((v) => !v)}
                    className="absolute left-0 top-0 flex items-center justify-center"
                    style={{ x: mv.pauseX, y: mv.ctrlY, width: t * 0.5, height: t * 0.5 }}
                    whileTap={{ scale: 0.8 }}
                  >
                    {playing ? <Pause size={t * 0.3} fill="currentColor" strokeWidth={1} /> : <Play size={t * 0.28} fill="currentColor" strokeWidth={1} />}
                  </motion.button>
                  <motion.button
                    type="button"
                    aria-label="Next"
                    className="absolute left-0 top-0 flex items-center justify-center"
                    style={{ x: mv.nextX, y: mv.ctrlY, width: t * 0.5, height: t * 0.5 }}
                    whileTap={{ scale: 0.8 }}
                  >
                    <FastForward size={t * 0.27} fill="currentColor" strokeWidth={1} />
                  </motion.button>
                </motion.div>

                <AnimatePresence>
                  {editing && badge(() => setShowWidget(false), "Now Playing")}
                </AnimatePresence>
                <AnimatePresence>
                  {editing && (
                    <motion.div
                      key="handle"
                      role="button"
                      aria-label="Resize Now Playing"
                      title="Drag to resize"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: dragging ? 1.08 : 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={springCfg}
                      onPointerDown={onHandleDown}
                      onPointerMove={onHandleMove}
                      onPointerUp={onHandleUp}
                      onPointerCancel={onHandleUp}
                      className={`absolute z-20 touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
                      style={{ right: -arcOverhang, bottom: -arcOverhang, width: arcBox, height: arcBox, transformOrigin: "30% 30%" }}
                    >
                      <svg width={arcBox} height={arcBox} className="pointer-events-none overflow-visible" aria-hidden="true">
                        <motion.path d={arcD} fill="none" stroke={hexToRgba(accentColor, 0.94)} strokeWidth={arcStroke} strokeLinecap="round" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {tiles.map((id) => {
              const tile = TILES.find((x) => x.id === id)!;
              const slot = slots[id];
              const x = slot.c * (t + g);
              const y = slot.r * (t + g);
              const on = !!active[id];
              return (
                <motion.div
                  key={id}
                  initial={{ x, y, opacity: 0, scale: 0.4 }}
                  animate={{ x, y, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.3, transition: { duration: 0.18 } }}
                  transition={springCfg}
                  className="absolute left-0 top-0"
                  style={{ width: t, height: t }}
                >
                  <motion.button
                    type="button"
                    aria-label={tile.label}
                    aria-pressed={on}
                    whileTap={{ scale: editing ? 0.96 : 0.88 }}
                    {...pressHandlers}
                    onClick={() => {
                      if (longPressed.current) {
                        longPressed.current = false;
                        return;
                      }
                      if (!editing) setActive((a) => ({ ...a, [id]: !a[id] }));
                    }}
                    className="flex h-full w-full items-center justify-center rounded-full transition-colors duration-300"
                    style={{ ...tileGlass, backgroundColor: on ? accentColor : tileGlass.backgroundColor, color: on ? "#1c1c1e" : "#ffffff" }}
                  >
                    {tile.render(t * 0.36)}
                  </motion.button>
                  <AnimatePresence>{editing && badge(() => setTiles((ts) => ts.filter((v) => v !== id)), tile.label)}</AnimatePresence>
                  <AnimatePresence>
                    {editing && (
                      <motion.svg
                        key="arc"
                        width={tileArcBox}
                        height={tileArcBox}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={springCfg}
                        className="pointer-events-none absolute overflow-visible"
                        style={{ left: -arcOverhang, top: -arcOverhang }}
                        aria-hidden="true"
                      >
                        <path d={tileArc} fill="none" stroke={hexToRgba(accentColor, 0.82)} strokeWidth={arcStroke} strokeLinecap="round" />
                      </motion.svg>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
