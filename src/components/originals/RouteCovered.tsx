"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useAnimationFrame, useMotionValue } from "motion/react";
import {
  CheckCheck,
  Ellipsis,
  Flag,
  Hand,
  Map as MapIcon,
  Radio,
  Route,
  Signpost,
  SquareArrowOutUpRight,
  StickyNote,
  Tent,
  Upload,
} from "lucide-react";

/* ═══════════════════════════ terrain ═══════════════════════════ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed: number) {
  const rnd = mulberry32(seed * 9173 + 17);
  const size = 64;
  const table = Array.from({ length: size * size }, () => rnd() * 2 - 1);
  const at = (x: number, y: number) => table[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smooth(x - x0);
    const ty = smooth(y - y0);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
    return a + (b - a) * ty;
  };
  return (x: number, y: number) => value(x, y) * 0.6 + value(x * 2.1 + 13, y * 2.1 + 7) * 0.3 + value(x * 4.3 + 31, y * 4.3 + 3) * 0.15;
}

const gauss = (u: number, v: number, x: number, y: number, s: number) => Math.exp(-((u - x) ** 2 + (v - y) ** 2) / (2 * s * s));
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Height (0–1) of the massif at plane coords (u, v) ∈ unit disc; v grows toward the viewer. */
function makeTerrain(seed: number, roughness: number) {
  const n1 = makeNoise(seed);
  const n2 = makeNoise(seed + 101);
  const n3 = makeNoise(seed + 211);
  const raw = (u0: number, v0: number) => {
    const r = Math.hypot(u0, v0);
    if (r >= 0.97) return 0;
    // domain warp gives the contours their finger-like lobes
    const w = 0.1 * roughness;
    const u = u0 + w * n3(u0 * 3.2 + 40, v0 * 3.2 + 40);
    const v = v0 + w * n3(u0 * 3.2 + 90, v0 * 3.2 + 15);
    let h =
      1.0 * gauss(u, v, 0.15, -0.1, 0.16) +
      0.55 * gauss(u, v, -0.18, -0.2, 0.16) +
      0.8 * gauss(u, v, 0.02, -0.04, 0.4) +
      0.3 * gauss(u, v, 0.46, 0.04, 0.22) +
      0.26 * gauss(u, v, -0.42, 0.26, 0.26) +
      0.24 * gauss(u, v, 0.16, 0.46, 0.28) +
      0.3 * Math.max(0, 1 - r / 0.95);
    h *= 1 + 0.16 * roughness * n1(u * 6 + 10, v * 6 + 10);
    h += 0.03 * roughness * n2(u * 12 + 3, v * 12 + 5);
    return Math.max(0, h * smoothstep(0.98, 0.84, r)) ** 0.85;
  };
  return raw;
}

type Loop = number[]; // flat [u0, v0, u1, v1, ...]
type Level = { level: number; loops: Loop[] };

/** Marching squares over a height grid → closed contour loops per level. */
function buildContours(height: (u: number, v: number) => number, levels: number, G = 150) {
  const N = G + 1;
  const grid = new Float32Array(N * N);
  let max = 0;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const h = height(-1 + (2 * i) / G, -1 + (2 * j) / G);
      grid[j * N + i] = h;
      if (h > max) max = h;
    }
  for (let k = 0; k < grid.length; k++) grid[k] /= max;
  const H = (i: number, j: number) => grid[j * N + i];

  const out: Level[] = [];
  for (let k = 0; k < levels; k++) {
    const l = 0.012 + (k / levels) * 0.96;
    const pos = new Map<number, [number, number]>();
    const adj = new Map<number, number[]>();
    const hEdge = (i: number, j: number) => {
      const id = j * N + i;
      if (!pos.has(id)) {
        const a = H(i, j);
        const t = (l - a) / (H(i + 1, j) - a);
        pos.set(id, [i + t, j]);
      }
      return id;
    };
    const vEdge = (i: number, j: number) => {
      const id = N * N + j * N + i;
      if (!pos.has(id)) {
        const a = H(i, j);
        const t = (l - a) / (H(i, j + 1) - a);
        pos.set(id, [i, j + t]);
      }
      return id;
    };
    const link = (a: number, b: number) => {
      (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
      (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
    };

    for (let j = 0; j < G; j++)
      for (let i = 0; i < G; i++) {
        const tl = H(i, j), tr = H(i + 1, j), br = H(i + 1, j + 1), bl = H(i, j + 1);
        const c = (tl > l ? 8 : 0) | (tr > l ? 4 : 0) | (br > l ? 2 : 0) | (bl > l ? 1 : 0);
        if (c === 0 || c === 15) continue;
        const T = () => hEdge(i, j), B = () => hEdge(i, j + 1), L = () => vEdge(i, j), R = () => vEdge(i + 1, j);
        const centerUp = (tl + tr + br + bl) / 4 > l;
        switch (c) {
          case 1: case 14: link(L(), B()); break;
          case 2: case 13: link(B(), R()); break;
          case 3: case 12: link(L(), R()); break;
          case 4: case 11: link(T(), R()); break;
          case 6: case 9: link(T(), B()); break;
          case 7: case 8: link(L(), T()); break;
          case 5:
            if (centerUp) { link(L(), T()); link(B(), R()); } else { link(T(), R()); link(L(), B()); }
            break;
          case 10:
            if (centerUp) { link(T(), R()); link(L(), B()); } else { link(L(), T()); link(B(), R()); }
            break;
        }
      }

    const seen = new Set<number>();
    const loops: Loop[] = [];
    for (const start of adj.keys()) {
      if (seen.has(start)) continue;
      const loop: Loop = [];
      let prev = -1;
      let cur = start;
      let lastU = 9, lastV = 9;
      for (;;) {
        seen.add(cur);
        const [x, y] = pos.get(cur)!;
        const u = -1 + (2 * x) / G, v = -1 + (2 * y) / G;
        if (Math.hypot(u - lastU, v - lastV) > 0.007) {
          loop.push(u, v);
          lastU = u;
          lastV = v;
        }
        const nb = adj.get(cur)!;
        const next = nb[0] !== prev ? nb[0] : nb[1];
        if (next === undefined || seen.has(next)) break;
        prev = cur;
        cur = next;
      }
      if (loop.length >= 16) loops.push(loop);
    }
    out.push({ level: l, loops });
  }
  // Bilinear lookup into the height grid: cheap enough to ray-march for occlusion every frame.
  const sample = (u: number, v: number) => {
    const x = ((u + 1) * G) / 2;
    const y = ((v + 1) * G) / 2;
    if (x < 0 || y < 0 || x >= G || y >= G) return 0;
    const i = Math.floor(x), j = Math.floor(y), tx = x - i, ty = y - j;
    const a = H(i, j) + (H(i + 1, j) - H(i, j)) * tx;
    const b = H(i, j + 1) + (H(i + 1, j + 1) - H(i, j + 1)) * tx;
    return a + (b - a) * ty;
  };
  return { levels: out, height: (u: number, v: number) => height(u, v) / max, sample };
}

/* ═══════════════════════════ scene data ═══════════════════════════ */

type PinKind = "letter" | "camp" | "signal" | "flag" | "hand";
type PinDef = { id: string; kind: PinKind; letter?: string; sx: number; sy: number; stem: number };

// Base points & stem lengths traced from the reference, in perspective-view map pixels (1090 × 700).
const PINS: PinDef[] = [
  { id: "start", kind: "letter", letter: "S", sx: 165, sy: 480, stem: 183 },
  { id: "camp1", kind: "camp", sx: 345, sy: 415, stem: 217 },
  { id: "signal1", kind: "signal", sx: 423, sy: 247, stem: 112 },
  { id: "camp2", kind: "camp", sx: 495, sy: 208, stem: 138 },
  { id: "summit", kind: "flag", sx: 605, sy: 112, stem: 59 },
  { id: "signal2", kind: "signal", sx: 747, sy: 297, stem: 90 },
  { id: "rest", kind: "hand", sx: 643, sy: 425, stem: 102 },
  { id: "finish", kind: "letter", letter: "F", sx: 698, sy: 570, stem: 145 },
  { id: "end", kind: "letter", letter: "E", sx: 910, sy: 448, stem: 159 },
];

const APPROACH: [number, number][] = [[165, 480], [205, 455], [265, 430], [345, 415]];
const CLIMB: [number, number][] = [
  [345, 415], [415, 360], [465, 310], [480, 260], [490, 210], [505, 170], [525, 150], [565, 135], [595, 115], [603, 112],
  [615, 160], [625, 200], [655, 240], [685, 300], [715, 360], [740, 400], [755, 440], [750, 500], [735, 540], [705, 570],
];

const LOG: {
  pin: string;
  title: string;
  time: string;
  avatars?: boolean;
  rows: [string, ReactNode, string, ReactNode][];
}[] = [
  {
    pin: "start",
    title: "Started to climb",
    time: "17.06.24 at 7:34 AM",
    avatars: true,
    rows: [
      ["Group", <>6 climbers <u className="ml-5 underline-offset-4 decoration-1" style={{ color: "var(--rc-link)" }}>Full list</u></>, "Guide", "Oliver Harmons"],
      ["End", "17.06.24, at 8 AM", "License", <u key="l" className="underline-offset-4 decoration-1" style={{ color: "var(--rc-link)" }}>FRG6743PT</u>],
      ["End", "24.06.24, at 8 PM", "Status", <span key="s" className="flex items-center gap-4" style={{ color: "var(--rc-accent)" }}>Approved <CheckCheck size={26} strokeWidth={1.6} /></span>],
    ],
  },
  {
    pin: "camp1",
    title: "First camp",
    time: "17.06.24 at 6:12 PM",
    rows: [
      ["Name", "Mount camp June 24", "Location", "Crater Camp"],
      ["Altitude", "2,140 m", "Tents", "3 pitched"],
    ],
  },
  {
    pin: "signal1",
    title: "Signal check",
    time: "18.06.24 at 9:05 AM",
    rows: [
      ["Beacon", "RX-12 online", "Battery", "86%"],
      ["Contact", "Base station", "Status", <span key="s" style={{ color: "var(--rc-accent)" }}>Clear</span>],
    ],
  },
  {
    pin: "camp2",
    title: "Second camp",
    time: "19.06.24 at 5:48 PM",
    rows: [
      ["Name", "High ridge camp", "Location", "North Saddle"],
      ["Altitude", "3,420 m", "Weather", "Wind 24 km/h"],
    ],
  },
  {
    pin: "summit",
    title: "Reached summit",
    time: "21.06.24 at 11:20 AM",
    rows: [
      ["Peak", "Mount Veyra", "Altitude", "4,108 m"],
      ["Climbers", "6 of 6", "Status", <span key="s" style={{ color: "var(--rc-accent)" }}>Confirmed</span>],
    ],
  },
  {
    pin: "signal2",
    title: "Signal check",
    time: "22.06.24 at 8:40 AM",
    rows: [
      ["Beacon", "RX-12 online", "Battery", "41%"],
      ["Contact", "Rescue desk", "Status", <span key="s" style={{ color: "var(--rc-accent)" }}>Clear</span>],
    ],
  },
  {
    pin: "rest",
    title: "Rest stop",
    time: "23.06.24 at 1:15 PM",
    rows: [["Duration", "2 h 10 min", "Location", "East Terraces"]],
  },
  {
    pin: "finish",
    title: "Finished descent",
    time: "24.06.24 at 7:52 PM",
    rows: [
      ["Distance", "38.6 km", "Elevation", "+3,980 m"],
      ["Duration", "7 days", "Status", <span key="s" style={{ color: "var(--rc-accent)" }}>Completed</span>],
    ],
  },
  {
    pin: "end",
    title: "Exit point",
    time: "24.06.24 at 8:00 PM",
    rows: [["Pickup", "Valley road", "Transfer", "Minibus · 6 seats"]],
  },
];

const AVATARS = [
  ["#f3c7a5", "#b97a56"],
  ["#d9a36b", "#7b4a2a"],
  ["#9cb7c9", "#44606f"],
  ["#e9d6b8", "#9a7b54"],
  ["#f1b8b2", "#a55a55"],
];

/* ═══════════════════════════ component ═══════════════════════════ */

const MAP_W = 1090;
const MAP_H = 700;
const CARD_W = 1090;
const MAP_CARD_H = 855;

const VIEWS = {
  perspective: { R: 405, tilt: 0.432, H: 340, cx: 545, cy: 465, stem: 1 },
  top: { R: 318, tilt: 0.8, H: 96, cx: 545, cy: 372, stem: 0.45 },
};

export default function RouteCovered({
  backdrop = "#adbfc3",
  cardColor = "#1c1c1e",
  contourColor = "#98989d",
  ringColor = "#9dbdc2",
  accentColor = "#e4efa4",
  campColor = "#a9c7cf",
  signalColor = "#f0643c",
  title = "Route covered",
  logTitle = "Climbing log",
  contourLevels = 32,
  roughness = 100,
  terrainSeed = 7,
  layout = "auto",
  showLog = true,
  showClimber = true,
  autoRotate = false,
  speed = 100,
  autoPlay = false,
}: {
  backdrop?: string;
  cardColor?: string;
  contourColor?: string;
  ringColor?: string;
  accentColor?: string;
  campColor?: string;
  signalColor?: string;
  title?: string;
  logTitle?: string;
  contourLevels?: number;
  roughness?: number;
  terrainSeed?: number;
  layout?: "auto" | "stacked" | "side";
  showLog?: boolean;
  showClimber?: boolean;
  autoRotate?: boolean;
  speed?: number;
  autoPlay?: boolean;
}) {
  const k = 100 / Math.max(25, speed); // time multiplier

  /* ── geometry (pure, deterministic) ── */
  const scene = useMemo(() => {
    const terrain = buildContours(makeTerrain(terrainSeed, roughness / 100), Math.round(contourLevels));
    const P = VIEWS.perspective;
    // Front-most surface point under a perspective-view screen coordinate.
    const pick = (sx: number, sy: number) => {
      const u = (sx - P.cx) / P.R;
      // If the target sits above the silhouette, settle on the ridge (highest on-screen point) instead of the far side.
      let ridge = { u, v: 1.1, h: 0 };
      let ridgeY = Infinity;
      for (let v = 1.1; v >= -1.1; v -= 0.003) {
        const h = terrain.height(u, v);
        const y = P.cy + v * P.R * P.tilt - h * P.H;
        if (y <= sy) return { u, v, h };
        if (y < ridgeY) {
          ridgeY = y;
          ridge = { u, v, h };
        }
      }
      return ridge;
    };
    const trace = (pts: [number, number][]) => {
      const dense: [number, number][] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 5));
        for (let s = 0; s < steps; s++) dense.push([x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps]);
      }
      dense.push(pts[pts.length - 1]);
      const picked = dense.map(([x, y]) => pick(x, y));
      // light smoothing so contour fingers don't make the trail jitter
      return picked.map((p, i) => {
        const a = picked[Math.max(0, i - 2)];
        const b = picked[Math.min(picked.length - 1, i + 2)];
        const u = (a.u + p.u * 2 + b.u) / 4;
        const v = (a.v + p.v * 2 + b.v) / 4;
        return { u, v, h: terrain.height(u, v) };
      });
    };
    return {
      levels: terrain.levels,
      sample: terrain.sample,
      pins: PINS.map((p) => ({ ...p, ...pick(p.sx, p.sy) })),
      approach: trace(APPROACH),
      climb: trace(CLIMB),
    };
  }, [terrainSeed, roughness, contourLevels]);

  /* ── intro growth ── */
  const [grow, setGrow] = useState(0);
  useEffect(() => {
    const ctrl = animate(0, 1, { delay: 0.5 * k, duration: 1.7 * k, ease: [0.33, 1, 0.68, 1], onUpdate: setGrow });
    return () => ctrl.stop();
  }, [k]);

  /* ── view morph (perspective ↔ top) ── */
  const [view, setView] = useState<"perspective" | "top">("perspective");
  const [morph, setMorph] = useState(0);
  const morphRef = useRef(0);
  useEffect(() => {
    const ctrl = animate(morphRef.current, view === "top" ? 1 : 0, {
      type: "spring",
      stiffness: 120 / k,
      damping: 22,
      onUpdate: (v) => {
        morphRef.current = v;
        setMorph(v);
      },
    });
    return () => ctrl.stop();
  }, [view, k]);

  /* ── compass rotation (drag, letters, auto-rotate) ── */
  const azMV = useMotionValue(0);
  const [az, setAz] = useState(0);
  useEffect(() => azMV.on("change", setAz), [azMV]);
  const scaleRef = useRef(1);
  const dragRef = useRef<{ x: number; az: number; lastX: number; lastT: number; vel: number } | null>(null);
  const movedRef = useRef(false);
  const azAnim = useRef<{ stop: () => void } | null>(null);
  const [dragging, setDragging] = useState(false);

  function spinTo(target: number, velocity = 0) {
    azAnim.current?.stop();
    azAnim.current = animate(azMV, target, { type: "spring", stiffness: 70 / k, damping: 18, velocity });
  }
  function onMapPointerDown(e: React.PointerEvent) {
    azAnim.current?.stop();
    movedRef.current = false;
    dragRef.current = { x: e.clientX, az: azMV.get(), lastX: e.clientX, lastT: performance.now(), vel: 0 };
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.x;
      if (!movedRef.current && Math.abs(dx) > 4) {
        movedRef.current = true;
        setDragging(true);
      }
      if (!movedRef.current) return;
      const now = performance.now();
      const dt = Math.max(1, now - d.lastT);
      const perPx = 0.009 / Math.max(0.2, scaleRef.current);
      d.vel = d.vel * 0.6 + (((ev.clientX - d.lastX) * perPx) / dt) * 1000 * 0.4;
      d.lastX = ev.clientX;
      d.lastT = now;
      azMV.set(d.az + dx * perPx);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = dragRef.current;
      dragRef.current = null;
      setDragging(false);
      if (d && movedRef.current) spinTo(azMV.get() + d.vel * 0.28, d.vel);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }
  function faceDirection(letterDeg: number) {
    // bring this compass letter round to the front of the ring (screen-down)
    const target = Math.PI / 2 - (letterDeg * Math.PI) / 180;
    const cur = azMV.get();
    const delta = ((((target - cur) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    spinTo(cur + delta);
  }
  useAnimationFrame((_, delta) => {
    if (!autoRotate || dragRef.current || delta > 100) return;
    azMV.set(azMV.get() + delta * 0.00018 * (speed / 100));
  });

  const A = VIEWS.perspective;
  const B = VIEWS.top;
  const m = morph;
  const V = {
    R: A.R + (B.R - A.R) * m,
    tilt: A.tilt + (B.tilt - A.tilt) * m,
    H: A.H + (B.H - A.H) * m,
    cx: A.cx,
    cy: A.cy + (B.cy - A.cy) * m,
    stem: A.stem + (B.stem - A.stem) * m,
  };
  const cosA = Math.cos(az);
  const sinA = Math.sin(az);
  /** Depth toward the viewer after spinning the plane by the compass azimuth. */
  const depth = (u: number, v: number) => u * sinA + v * cosA;
  const X = (u: number, v: number) => V.cx + (u * cosA - v * sinA) * V.R;
  // `grow` lifts every elevation by the same fraction, so the massif rises straight up as one piece.
  const Y = (u: number, v: number, h: number) => V.cy + depth(u, v) * V.R * V.tilt - h * V.H * grow;
  const f = (n: number) => Math.round(n * 10) / 10;

  /** True when terrain between the point and the viewer rises above it on screen. */
  const occluded = (u: number, v: number, h: number) => {
    const ru = u * cosA - v * sinA;
    const rv = depth(u, v);
    const y = V.cy + rv * V.R * V.tilt - h * V.H * grow;
    for (let d = 0.03; rv + d < 1; d += 0.02) {
      const qv = rv + d;
      const qu = ru * cosA + qv * sinA;
      const qw = -ru * sinA + qv * cosA;
      if (V.cy + qv * V.R * V.tilt - scene.sample(qu, qw) * V.H * grow < y - 3) return true;
    }
    return false;
  };

  const contourPaths = scene.levels.map(({ level, loops }) => {
    let d = "";
    for (const loop of loops) {
      d += `M${f(X(loop[0], loop[1]))} ${f(Y(loop[0], loop[1], level))}`;
      for (let i = 2; i < loop.length; i += 2) d += `L${f(X(loop[i], loop[i + 1]))} ${f(Y(loop[i], loop[i + 1], level))}`;
      d += "Z";
    }
    return { level, d };
  });
  const projectTrail = (pts: { u: number; v: number; h: number }[]) =>
    pts.map((p) => ({ x: f(X(p.u, p.v)), y: f(Y(p.u, p.v, p.h)), vis: !occluded(p.u, p.v, p.h) }));
  const fullD = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join("");
  const visibleD = (pts: { x: number; y: number; vis: boolean }[]) => {
    let d = "";
    let pen = false;
    for (const p of pts) {
      if (!p.vis) pen = false;
      else {
        d += `${pen ? "L" : "M"}${p.x} ${p.y}`;
        pen = true;
      }
    }
    return d;
  };
  const approachPts = projectTrail(scene.approach);
  const climbPts = projectTrail(scene.climb);
  const approachD = visibleD(approachPts);
  const climbD = visibleD(climbPts);
  const trailMaskD = fullD(approachPts) + fullD(climbPts);

  /* ── intro sequencing ── */
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setIntroDone(true), 5000 * k);
    return () => window.clearTimeout(id);
  }, [k]);

  /* ── selection ── */
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const logScroll = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!selected) return;
    const box = logScroll.current;
    const el = entryRefs.current[selected];
    if (box && el) box.scrollTo({ top: el.offsetTop - 12, behavior: "smooth" });
  }, [selected]);

  useEffect(() => {
    if (!autoPlay) return;
    let i = 0;
    const id = window.setInterval(() => {
      setSelected(LOG[i % LOG.length].pin);
      i++;
    }, 2600 * k);
    return () => window.clearInterval(id);
  }, [autoPlay, k]);

  /* ── fit to host ── */
  const frameRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 1600, h: 900 });
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const gapPx = 18;
  const side = showLog && (layout === "side" || (layout === "auto" && box.w / Math.max(1, box.h) > 1.25));
  const logH = side ? MAP_CARD_H : 640;
  const contentW = side ? CARD_W * 2 + gapPx : CARD_W;
  const contentH = showLog && !side ? MAP_CARD_H + gapPx + logH : MAP_CARD_H;
  const pad = Math.min(box.w, box.h) * 0.05;
  const scale = Math.max(0.1, Math.min(1, (box.w - pad * 2) / contentW, (box.h - pad * 2) / contentH));
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  /* ── pieces ── */
  const pinColor = (kind: PinKind) =>
    kind === "camp" ? campColor : kind === "signal" ? signalColor : kind === "hand" ? "#d7ec8c" : "#ffffff";
  const stemColor = (kind: PinKind) =>
    kind === "camp" ? "#5d7c84" : kind === "signal" ? "#8c4629" : kind === "hand" ? "#6f7c4c" : "#c9c9cc";
  const pinOrder = ["start", "camp1", "signal1", "camp2", "summit", "signal2", "rest", "finish", "end"];

  const ticks: ReactNode[] = [];
  const LETTERS = [
    { ch: "W", a: -135 },
    { ch: "N", a: -45 },
    { ch: "E", a: 45 },
    { ch: "S", a: 135 },
  ];
  for (let deg = 0; deg < 360; deg += 2.5) {
    const a = ((deg > 180 ? deg - 360 : deg) * Math.PI) / 180;
    if (LETTERS.some((L) => Math.abs(((((deg - L.a) % 360) + 540) % 360) - 180) < 8)) continue;
    const major = Math.round(deg / 2.5) % 4 === 0;
    const r0 = 1.07;
    const r1 = major ? 1.155 : 1.115;
    const front = depth(Math.cos(a), Math.sin(a)) > -0.15;
    ticks.push(
      <line
        key={deg}
        x1={f(X(Math.cos(a) * r0, Math.sin(a) * r0))}
        y1={f(Y(Math.cos(a) * r0, Math.sin(a) * r0, 0))}
        x2={f(X(Math.cos(a) * r1, Math.sin(a) * r1))}
        y2={f(Y(Math.cos(a) * r1, Math.sin(a) * r1, 0))}
        stroke={front ? "#f2f2f2" : ringColor}
        strokeOpacity={front ? (major ? 0.95 : 0.7) : 0.75}
        strokeWidth={major ? 3 : 2}
        strokeLinecap="round"
      />,
    );
  }

  /* pins: those whose foot is hidden behind the massif are painted before the terrain */
  const pinNodes = [...scene.pins]
    .sort((a, b) => depth(a.u, a.v) - depth(b.u, b.v))
    .map((p) => {
                const bx = X(p.u, p.v);
                const by = Y(p.u, p.v, p.h);
                const stem = p.stem * V.stem;
                const big = p.kind !== "letter";
                const r = big ? 24 : 14.5;
                const hy = by - stem;
                const order = pinOrder.indexOf(p.id);
                const active = selected === p.id;
                const hot = hovered === p.id || active;
                const entry = LOG.find((e) => e.pin === p.id);
                const hidden = occluded(p.u, p.v, p.h);
                const node = (
                  <g
                    key={p.id}
                    className="cursor-pointer"
                    onPointerEnter={() => setHovered(p.id)}
                    onPointerLeave={() => setHovered((h) => (h === p.id ? null : h))}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected((s) => (s === p.id ? null : p.id));
                    }}
                  >
                    <motion.ellipse
                      cx={bx}
                      cy={by}
                      rx={big ? 9 : 7}
                      ry={big ? 3.8 : 3}
                      fill={stemColor(p.kind)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.9 }}
                      transition={{ delay: (2.2 + order * 0.14) * k }}
                    />
                    <motion.line
                      x1={bx}
                      y1={by}
                      x2={bx}
                      y2={hy}
                      stroke={stemColor(p.kind)}
                      strokeWidth={2.6}
                      style={{ transformBox: "fill-box", originY: 1 }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: (2.2 + order * 0.14) * k, duration: 0.5 * k, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <motion.g
                      style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: hot ? 1.14 : 1, opacity: 1 }}
                      transition={{
                        scale: { type: "spring", stiffness: 420, damping: 18, delay: hot ? 0 : (2.5 + order * 0.14) * k },
                        opacity: { delay: (2.5 + order * 0.14) * k, duration: 0.2 },
                      }}
                    >
                      {p.kind === "signal" && introDone && (
                        <circle cx={bx} cy={hy} r={r} fill="none" stroke={signalColor} strokeWidth={2}>
                          <animate attributeName="r" values={`${r};${r * 1.9}`} dur={`${1.8 * k}s`} repeatCount="indefinite" />
                          <animate attributeName="stroke-opacity" values="0.7;0" dur={`${1.8 * k}s`} repeatCount="indefinite" />
                        </circle>
                      )}
                      {active && <circle cx={bx} cy={hy} r={r + 7} fill="none" stroke={accentColor} strokeWidth={2.5} />}
                      <circle cx={bx} cy={hy} r={r} fill={pinColor(p.kind)} stroke={big ? "none" : "#1c1c1e"} strokeWidth={big ? 0 : 2} />
                      {p.kind === "letter" ? (
                        <text x={bx} y={hy + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill="#111">
                          {p.letter}
                        </text>
                      ) : (
                        <PinGlyph kind={p.kind} x={bx} y={hy} />
                      )}
                    </motion.g>
                    <AnimatePresence>
                      {hovered === p.id && entry && (
                        <motion.g
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.18 }}
                          className="pointer-events-none"
                        >
                          <rect x={bx - 105} y={hy - r - 62} width={210} height={48} rx={16} fill="#2c2c2e" stroke="rgba(255,255,255,0.08)" />
                          <text x={bx} y={hy - r - 44} textAnchor="middle" fontSize={16} fontWeight={600} fill="#fff">
                            {entry.title}
                          </text>
                          <text x={bx} y={hy - r - 24} textAnchor="middle" fontSize={13} fill="#8e8e93">
                            {entry.time}
                          </text>
                        </motion.g>
                      )}
                    </AnimatePresence>
                  </g>
                );
                return { hidden, node };
    });

  return (
    <div
      ref={frameRef}
      className="relative h-full w-full overflow-hidden select-none"
      style={
        {
          backgroundColor: backdrop,
          fontFamily: "var(--font-satoshi, ui-sans-serif), system-ui, sans-serif",
          "--rc-accent": accentColor,
          "--rc-link": campColor,
        } as React.CSSProperties
      }
    >
      <div
        className="absolute left-1/2 top-1/2 flex"
        style={{
          width: contentW,
          height: contentH,
          gap: gapPx,
          flexDirection: side ? "row" : "column",
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {/* ════════ Route covered ════════ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 * k, ease: [0.22, 1, 0.36, 1] }}
          className="relative shrink-0 overflow-hidden"
          style={{ width: CARD_W, height: MAP_CARD_H, borderRadius: 72, backgroundColor: cardColor, boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.05)" }}
        >
          <CardHeader
            icon={<Route size={34} strokeWidth={1.6} />}
            title={title}
            right={
              <>
                <HeaderIcon label="Notes"><StickyNote size={32} strokeWidth={1.5} /></HeaderIcon>
                <HeaderIcon label="Expand"><SquareArrowOutUpRight size={32} strokeWidth={1.5} /></HeaderIcon>
                <HeaderIcon label="Toggle view" onClick={() => setView((v) => (v === "top" ? "perspective" : "top"))}>
                  <MapIcon size={32} strokeWidth={1.5} />
                </HeaderIcon>
                <HeaderIcon label="More"><span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.6px] border-current"><Ellipsis size={20} strokeWidth={2} /></span></HeaderIcon>
              </>
            }
          >
            <button
              type="button"
              onClick={() => setView((v) => (v === "top" ? "perspective" : "top"))}
              className="relative overflow-hidden text-left transition-opacity hover:opacity-80"
              style={{ color: accentColor, height: 40 }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={view}
                  className="block"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -30, opacity: 0 }}
                  transition={{ duration: 0.35 * k, ease: [0.22, 1, 0.36, 1] }}
                >
                  {view === "top" ? "3D view" : "New view"}
                </motion.span>
              </AnimatePresence>
            </button>
          </CardHeader>

          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            width={MAP_W}
            height={MAP_H}
            className={`absolute left-0 touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ top: MAP_CARD_H - MAP_H - 10 }}
            onPointerDown={onMapPointerDown}
            onClick={() => {
              if (!movedRef.current) setSelected(null);
            }}
          >
            <defs>
              <radialGradient id="rc-floor" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#000" stopOpacity="0.45" />
                <stop offset="1" stopColor="#000" stopOpacity="0" />
              </radialGradient>
              <mask id="rc-trail-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={MAP_W} height={MAP_H}>
                <motion.path
                  d={trailMaskD}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={26}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 3 * k, duration: 2.2 * k, ease: "easeInOut" }}
                />
              </mask>
            </defs>

            {/* compass */}
            <ellipse cx={V.cx} cy={V.cy + 18} rx={V.R * 1.05} ry={V.R * V.tilt * 1.05} fill="url(#rc-floor)" />
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 * k, duration: 0.9 * k }}>
              {ticks}
              {LETTERS.map(({ ch, a }) => {
                const t = (a * Math.PI) / 180;
                const tr = t + az;
                const r = 1.115;
                const s = 0.0024 * V.R;
                const ma = -Math.sin(tr) * s;
                const mb = Math.cos(tr) * s * V.tilt;
                const mc = -Math.cos(tr) * s;
                const md = -Math.sin(tr) * s * V.tilt;
                return (
                  <g
                    key={ch}
                    className="cursor-pointer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      faceDirection(a);
                    }}
                    transform={`matrix(${ma} ${mb} ${mc} ${md} ${f(X(Math.cos(t) * r, Math.sin(t) * r))} ${f(Y(Math.cos(t) * r, Math.sin(t) * r, 0))})`}
                  >
                    <circle r={34} fill="transparent" />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={42} fontWeight={800} fill="#f4f4f4" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
                      {ch}
                    </text>
                  </g>
                );
              })}
            </motion.g>
            <motion.ellipse
              cx={V.cx}
              cy={V.cy}
              rx={V.R}
              ry={V.R * V.tilt}
              fill="none"
              stroke={ringColor}
              strokeWidth={3.5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2 * k, ease: "easeInOut" }}
            />

            {/* pins behind the ridge */}
            {pinNodes.filter((n) => n.hidden).map((n) => n.node)}

            {/* terrain: filled contours painted bottom-up so upper terraces hide what's behind them */}
            {contourPaths.map(({ d }, i) => (
              <motion.path
                key={`${terrainSeed}-${i}`}
                d={d}
                fill={cardColor}
                fillRule="evenodd"
                stroke={contourColor}
                strokeWidth={2.3}
                strokeLinejoin="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 * k, duration: 0.5 * k }}
              />
            ))}

            {/* trail */}
            <g mask="url(#rc-trail-mask)">
              <path d={approachD} fill="none" stroke="#bdbdbd" strokeOpacity={0.7} strokeWidth={3.2} strokeDasharray="7 8" strokeLinecap="round" />
              <path d={climbD} fill="none" stroke="#ffffff" strokeWidth={4} strokeDasharray="8 8" strokeLinecap="round" />
            </g>
            {showClimber && introDone && <Climber points={climbPts} color={accentColor} ring={cardColor} duration={9 * k} />}

            {/* pins in front of the terrain */}
            {pinNodes.filter((n) => !n.hidden).map((n) => n.node)}
          </svg>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: dragging ? 0 : 1 }}
            transition={{ delay: dragging ? 0 : 5 * k, duration: 0.4 }}
            className="pointer-events-none absolute inset-x-0 text-center"
            style={{ bottom: 22, fontSize: 17, color: "#6e6e73" }}
          >
            Drag to rotate · tap W, N, E or S to face that side
          </motion.div>
        </motion.div>

        {/* ════════ Climbing log ════════ */}
        {showLog && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 * k, duration: 0.7 * k, ease: [0.22, 1, 0.36, 1] }}
            className="relative shrink-0 overflow-hidden"
            style={{ width: CARD_W, height: logH, borderRadius: 72, backgroundColor: cardColor, boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.05)" }}
          >
            <CardHeader
              icon={<Signpost size={34} strokeWidth={1.6} />}
              title={logTitle}
              right={
                <>
                  <HeaderIcon label="Share"><Upload size={32} strokeWidth={1.5} /></HeaderIcon>
                  <HeaderIcon label="More"><span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.6px] border-current"><Ellipsis size={20} strokeWidth={2} /></span></HeaderIcon>
                </>
              }
            >
              <span style={{ color: "#8e8e93" }}>Archived</span>
            </CardHeader>

            <div
              ref={logScroll}
              className="absolute inset-x-0 bottom-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ top: 118, paddingLeft: 32, paddingRight: 32, paddingBottom: 40 }}
            >
              {LOG.map((e, i) => {
                const pin = PINS.find((p) => p.id === e.pin)!;
                const active = selected === e.pin;
                const last = i === LOG.length - 1;
                return (
                  <motion.div
                    key={e.pin}
                    ref={(el) => {
                      entryRefs.current[e.pin] = el;
                    }}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (0.5 + i * 0.12) * k, duration: 0.6 * k, ease: [0.22, 1, 0.36, 1] }}
                    className="relative flex cursor-pointer"
                    style={{ gap: 26, paddingTop: 22, paddingBottom: 22 }}
                    onClick={() => setSelected((s) => (s === e.pin ? null : e.pin))}
                    onPointerEnter={() => setHovered(e.pin)}
                    onPointerLeave={() => setHovered((h) => (h === e.pin ? null : h))}
                  >
                    {/* timeline rail */}
                    <div className="relative flex shrink-0 flex-col items-center" style={{ width: 44 }}>
                      <motion.div
                        animate={{ scale: active ? 1.15 : 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="relative z-10 flex items-center justify-center rounded-full"
                        style={{
                          width: 44,
                          height: 44,
                          marginTop: 8,
                          backgroundColor: pinColor(pin.kind),
                          boxShadow: active ? `0 0 0 5px ${cardColor}, 0 0 0 7.5px ${accentColor}` : undefined,
                          color: "#1c1c1e",
                        }}
                      >
                        {pin.kind === "letter" ? (
                          <span style={{ fontSize: 22, fontWeight: 700 }}>{pin.letter}</span>
                        ) : (
                          <GlyphIcon kind={pin.kind} size={24} />
                        )}
                      </motion.div>
                      {!last && <div className="absolute" style={{ top: 66, bottom: -30, width: 2.5, backgroundColor: "#48484a" }} />}
                    </div>

                    <div className="shrink-0" style={{ width: 222 }}>
                      <div className="text-white" style={{ fontSize: 27, lineHeight: 1.3, fontWeight: 500 }}>{e.title}</div>
                      <div style={{ fontSize: 23, color: "#8e8e93", marginTop: 4 }}>{e.time}</div>
                      {e.avatars && (
                        <div className="flex" style={{ marginTop: 14 }}>
                          {AVATARS.map(([a, b], j) => (
                            <motion.span
                              key={j}
                              whileHover={{ y: -6 }}
                              className="block rounded-full"
                              style={{
                                width: 38,
                                height: 38,
                                marginLeft: j ? -8 : 0,
                                background: `radial-gradient(circle at 50% 38%, ${a} 0 32%, ${b} 34% 100%)`,
                                boxShadow: `0 0 0 2.5px ${cardColor}`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <motion.div
                      className="min-w-0 flex-1"
                      animate={{
                        borderColor: active ? accentColor : "rgba(255,255,255,0.08)",
                        backgroundColor: active || hovered === e.pin ? "#313133" : "#2a2a2c",
                      }}
                      transition={{ duration: 0.25 }}
                      style={{ borderWidth: 1.5, borderStyle: "solid", borderRadius: 38, padding: "30px 36px" }}
                    >
                      <div className="grid" style={{ gridTemplateColumns: "86px 1fr 110px auto", rowGap: 18, columnGap: 0, fontSize: 23 }}>
                        {e.rows.map(([l1, v1, l2, v2], r) => (
                          <div key={r} className="contents">
                            <span style={{ color: "#8e8e93" }}>{l1}</span>
                            <span className="truncate text-white">{v1}</span>
                            <span style={{ color: "#8e8e93" }}>{l2}</span>
                            <span className="whitespace-nowrap text-white">{v2}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16" style={{ background: `linear-gradient(to top, ${cardColor}, transparent)` }} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════ small parts ═══════════════════════════ */

/** Marker that walks the trail, ducking out of sight wherever the massif hides the path. */
function Climber({ points, color, ring, duration }: { points: { x: number; y: number; vis: boolean }[]; color: string; ring: string; duration: number }) {
  const [t, setT] = useState(0);
  useAnimationFrame((time) => setT(((time / 1000) % duration) / duration));
  if (points.length < 2) return null;
  const pos = t * (points.length - 1);
  const i = Math.floor(pos);
  const a = points[i];
  const b = points[Math.min(points.length - 1, i + 1)];
  const x = a.x + (b.x - a.x) * (pos - i);
  const y = a.y + (b.y - a.y) * (pos - i);
  const visible = a.vis && b.vis;
  const pulse = 9 + 7 * (0.5 + 0.5 * Math.sin((t * duration * Math.PI * 2) / 1.6));
  return (
    <g style={{ opacity: visible ? 1 : 0, transition: "opacity 160ms" }} className="pointer-events-none">
      <circle cx={x} cy={y} r={pulse} fill={color} opacity={0.25} />
      <circle cx={x} cy={y} r={6.5} fill={color} stroke={ring} strokeWidth={2.5} />
    </g>
  );
}

function CardHeader({ icon, title, children, right }: { icon: ReactNode; title: string; children: ReactNode; right: ReactNode }) {
  return (
    <div className="absolute inset-x-0 top-0 flex items-center" style={{ height: 128, paddingLeft: 32, paddingRight: 34 }}>
      <div className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 72, height: 72, backgroundColor: "#2c2c2e", color: "#a1a1a6" }}>
        {icon}
      </div>
      <div className="flex items-center text-white" style={{ marginLeft: 28, fontSize: 29, fontWeight: 500 }}>
        {title}
        <span className="block" style={{ width: 2, height: 32, backgroundColor: "#48484a", marginLeft: 30, marginRight: 30 }} />
        <span style={{ fontWeight: 400 }}>{children}</span>
      </div>
      <div className="ml-auto flex items-center" style={{ gap: 30, color: "#a1a1a6" }}>
        {right}
      </div>
    </div>
  );
}

function HeaderIcon({ children, label, onClick }: { children: ReactNode; label: string; onClick?: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ scale: 1.1, color: "#ffffff" }}
      whileTap={{ scale: 0.92 }}
      className="flex items-center justify-center"
      style={{ width: 36, height: 36 }}
    >
      {children}
    </motion.button>
  );
}

function GlyphIcon({ kind, size }: { kind: PinKind; size: number }) {
  const props = { size, strokeWidth: 2 };
  if (kind === "camp") return <Tent {...props} />;
  if (kind === "signal") return <Radio {...props} />;
  if (kind === "flag") return <Flag {...props} />;
  if (kind === "hand") return <Hand {...props} />;
  return null;
}

function PinGlyph({ kind, x, y }: { kind: PinKind; x: number; y: number }) {
  const s = 24;
  const color = kind === "signal" ? "#ffffff" : "#1c1c1e";
  const common = { x: x - s / 2, y: y - s / 2, width: s, height: s, color, strokeWidth: 2 };
  if (kind === "camp") return <Tent {...common} />;
  if (kind === "signal") return <Radio {...common} />;
  if (kind === "flag") return <Flag {...common} />;
  if (kind === "hand") return <Hand {...common} />;
  return null;
}
