"use client";

import { useEffect, useId, useRef, useState } from "react";

// Scene layout in reference units. The whole scene is drawn at this width and
// scaled to fit the frame, so the grid, the slabs and the text keep their
// proportions at any size.
const REF_W = 1200;
const FRAME_X = 34;
const COL_L = 323;
const COL_C = 489;
const COL_R = 322;
const ROW = 248;

// Slab geometry, in the flat square's own units before the isometric projection.
const S = 165;
const R = 30;
const DOT_INSET = 18;
const COS = 0.866;
const ISO = `matrix(${COS} 0.5 ${-COS} 0.5 0 0)`;

const DEFAULT_TITLES = ["Capture Signals", "Unify Profiles", "Model Intent", "Activate Everywhere"];
const DEFAULT_DESCRIPTIONS = [
  "Every click, form fill and product event lands in one stream the moment it happens, tagged with the account and the person behind it.",
  "Scattered records from your CRM, billing and support tools merge into a single profile, so every team works from the same picture of each customer.",
  "A scoring layer watches how accounts behave over time and flags the ones warming up, long before they ask to talk to sales.",
  "Audiences sync back to ads, email and in-app messaging on their own, keeping every channel in step without a single CSV export.",
];

const HOLO = ["#7ad7f0", "#b9a7ff", "#f6b3d0", "#ffd2a1", "#9ff0da"];
const HOLO_CSS = `linear-gradient(180deg, ${HOLO.join(", ")})`;

/** Icons on a 24-unit grid. `fill` paths take the holographic fill when their layer is active. */
type Icon = { strokes: string[]; fill?: string };
const ICONS: Icon[] = [
  {
    strokes: [0, 60, 120, 180, 240, 300].map((deg) => {
      const a = (deg * Math.PI) / 180;
      const p = (r: number) => `${(12 + Math.sin(a) * r).toFixed(2)} ${(12 - Math.cos(a) * r).toFixed(2)}`;
      return `M${p(3)}L${p(10)}`;
    }),
  },
  { fill: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", strokes: ["M9 13l2 2 4-4"] },
  { strokes: ["M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0", "M16.5 16.5L21 21", "M8 11h6"] },
  { strokes: ["M21 3L10 14", "M21 3l-7 18-4-7-7-4z"] },
];

function roundedSquare(x: number, y: number, s: number, r: number) {
  return `M${x + r} ${y}H${x + s - r}A${r} ${r} 0 0 1 ${x + s} ${y + r}V${y + s - r}A${r} ${r} 0 0 1 ${x + s - r} ${y + s}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + s - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/** Projects a point on the slab's top square onto the screen. */
function iso(x: number, y: number): [number, number] {
  return [COS * (x - y), 0.5 * (x + y)];
}

function rgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(255,255,255,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Screen outline of the slab's sides: the convex hull of its top and bottom faces. */
function sideSilhouette(depth: number) {
  const pts: [number, number][] = [];
  const corners: [number, number, number][] = [
    [S - R, R, -90],
    [S - R, S - R, 0],
    [R, S - R, 90],
    [R, R, 180],
  ];
  for (const [cx, cy, start] of corners) {
    for (let k = 0; k <= 8; k++) {
      const a = ((start + (k / 8) * 90) * Math.PI) / 180;
      const [x, y] = iso(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      pts.push([x, y], [x, y + depth]);
    }
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const out: [number, number][] = [];
    for (const pt of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], pt) <= 0) out.pop();
      out.push(pt);
    }
    out.pop();
    return out;
  };
  const hull = [...half(pts), ...half([...pts].reverse())];
  return `M${hull.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`;
}

// Half the slab's screen width: the rounded corner's extreme point, not the sharp corner.
const HALF_W = COS * (S - (2 - Math.SQRT2) * R);
const PAD = 8;

function Slab({ uid, index, active, depth, background, shimmer }: {
  uid: string;
  index: number;
  active: number;
  depth: number;
  background: string;
  shimmer: number;
}) {
  const icon = ICONS[index % ICONS.length];
  const holo = `${uid}-holo`;
  const sheen = `${uid}-sheen`;
  const iconHolo = `${uid}-icon`;
  const top = `${uid}-top`;
  const rim = 0.22 + 0.63 * active;
  const sides = sideSilhouette(depth);
  const frontY = S - R + R / Math.SQRT2;
  const dots = [iso(DOT_INSET, DOT_INSET), iso(S - DOT_INSET, DOT_INSET), iso(S - DOT_INSET, S - DOT_INSET), iso(DOT_INSET, S - DOT_INSET)];
  const iconSize = S * 0.42;
  const iconScale = iconSize / 24;
  const iconOrigin = (S - iconSize) / 2;
  const vent = (from: number, count: number, v0: number, v1: number) =>
    Array.from({ length: count }, (_, k) => `M${from + k * 5} ${v0 * depth}V${v1 * depth}`).join("");

  return (
    <svg
      width={HALF_W * 2 + PAD * 2}
      height={S + depth + PAD * 2}
      viewBox={`${-HALF_W - PAD} ${-PAD} ${HALF_W * 2 + PAD * 2} ${S + depth + PAD * 2}`}
      overflow="visible"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={holo} gradientUnits="userSpaceOnUse" x1={-HALF_W} y1={0} x2={HALF_W} y2={0} spreadMethod="reflect">
          {HOLO.map((c, k) => (
            <stop key={k} offset={k / (HOLO.length - 1)} stopColor={c} />
          ))}
          {shimmer > 0 && (
            <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to={`${HALF_W * 4} 0`} dur={`${shimmer}s`} repeatCount="indefinite" />
          )}
        </linearGradient>
        <linearGradient id={sheen} gradientUnits="userSpaceOnUse" x1={0} y1={S / 2} x2={0} y2={S + depth}>
          <stop offset={0} stopColor="#fff" stopOpacity={0.35} />
          <stop offset={0.5} stopColor="#fff" stopOpacity={0} />
          <stop offset={1} stopColor="#000" stopOpacity={0.25} />
        </linearGradient>
        <linearGradient id={iconHolo} x1="0" y1="0" x2="1" y2="1">
          {HOLO.map((c, k) => (
            <stop key={k} offset={k / (HOLO.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id={top} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={S}>
          <stop offset={0} stopColor="#1d1d1d" />
          <stop offset={1} stopColor="#0f0f0f" />
        </linearGradient>
      </defs>

      {/* Sides: one silhouette spanning the top and bottom faces. The top
          face is drawn over its upper half. */}
      <g>
        <path d={sides} fill={background} />
        <path d={sides} fill="#ffffff" fillOpacity={0.035} />
        <g opacity={active}>
          <path d={sides} fill={`url(#${holo})`} />
          <path d={sides} fill={`url(#${sheen})`} />
        </g>
        <path d={sides} fill="none" stroke="#fff" strokeOpacity={rim * 0.8} strokeWidth={1} />
        <path d={`M0 ${frontY}V${frontY + depth}`} stroke="#fff" strokeOpacity={rim * 0.6} strokeWidth={1} />
        {/* Vent grilles on the two front faces */}
        <path
          d={vent(R + 12, 12, 0.3, 0.8)}
          transform={`matrix(${COS} 0.5 0 1 ${-COS * S} ${0.5 * S})`}
          stroke={active > 0.5 ? "#111" : "#fff"}
          strokeOpacity={0.25 + 0.5 * active}
          strokeWidth={1.6}
        />
        <path
          d={vent(S - R - 12 - 5 * 9, 10, 0.22, 0.5)}
          transform={`matrix(${COS} -0.5 0 1 0 ${S})`}
          stroke={active > 0.5 ? "#111" : "#fff"}
          strokeOpacity={0.25 + 0.5 * active}
          strokeWidth={1.4}
        />
      </g>

      {/* Top face */}
      <g transform={ISO}>
        <path d={roundedSquare(0, 0, S, R)} fill={`url(#${top})`} />
        <path d={roundedSquare(0, 0, S, R)} fill="#090909" fillOpacity={active} stroke="#fff" strokeOpacity={rim} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        <path d={roundedSquare(8, 8, S - 16, R - 6)} fill="none" stroke="#fff" strokeOpacity={0.12 + 0.28 * active} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={roundedSquare(30, 30, S - 60, R - 14)} fill="#000" fillOpacity={0.25} stroke="#fff" strokeOpacity={0.1 + 0.22 * active} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={roundedSquare(44, 44, S - 88, R - 18)} fill="none" stroke="#fff" strokeOpacity={0.06 + 0.12 * active} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <g transform={`translate(${iconOrigin} ${iconOrigin}) scale(${iconScale})`}>
          {icon.fill && (
            <>
              <path d={icon.fill} fill="none" stroke="#fff" strokeOpacity={0.3 * (1 - active)} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              <path d={icon.fill} fill={`url(#${iconHolo})`} fillOpacity={active} />
            </>
          )}
          {icon.strokes.map((d, k) => (
            <g key={k}>
              <path d={d} fill="none" stroke="#fff" strokeOpacity={0.3 * (1 - active)} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              <path
                d={d}
                fill="none"
                stroke={icon.fill ? "#f4f4f4" : `url(#${iconHolo})`}
                strokeOpacity={active}
                strokeWidth={icon.fill ? 1.8 : 2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ))}
        </g>
      </g>

      {dots.map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r={2.4} fill="#fff" opacity={active} />
      ))}
    </svg>
  );
}

/**
 * A pinned scroll scene: an isometric stack of hardware-like layers down the
 * middle of a ruled grid, with a label for each layer alternating left and
 * right. The layers start closed up in a tight pile with no labels. Each
 * scroll step lifts the next one out to the centre and fades its label in.
 * There its sides turn iridescent, its pins light up, and a connector runs
 * out to the label.
 */
export default function IsometricStackScroll({
  titles = DEFAULT_TITLES,
  descriptions = DEFAULT_DESCRIPTIONS,
  depth = 50,
  background = "#0d0d0d",
  textColor = "#ffffff",
  lineOpacity = 12,
  shimmerSpeed = 100,
  snap = true,
  showGrain = true,
  fontFamily = "var(--font-inter), sans-serif",
  textScale = 100,
  autoPlay = false,
}: {
  /** One layer per title, top to bottom. */
  titles?: string[];
  /** Paragraph under each title, paired by position. */
  descriptions?: string[];
  /** Thickness of each slab. */
  depth?: number;
  background?: string;
  textColor?: string;
  /** Opacity of the grid lines, as a %. */
  lineOpacity?: number;
  /** Speed of the iridescent shimmer on the active layer, as a %. 0 holds it still. */
  shimmerSpeed?: number;
  /** Settle on one layer per scroll step. */
  snap?: boolean;
  showGrain?: boolean;
  fontFamily?: string;
  textScale?: number;
  /** Steps through the layers on its own until the frame is scrolled. */
  autoPlay?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // -1 is the closed stack; from 0 up, the index of the layer at the centre.
  const [p, setP] = useState(-1);
  const n = Math.max(1, titles.length);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setSize({ w: root.clientWidth, h: root.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // The scroll position sets a target layer; the drawn position eases toward it.
  const target = useRef(-1);
  const current = useRef(-1);
  const playing = useRef(autoPlay);
  useEffect(() => {
    playing.current = autoPlay;
  }, [autoPlay]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.clientHeight > 0) target.current = clamp(el.scrollTop / el.clientHeight - 1, -1, n - 1);
    };
    const stop = () => (playing.current = false);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("keydown", stop);

    let raf = 0;
    let last = performance.now();
    let held = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playing.current) {
        held += dt;
        if (held > 2.2) {
          held = 0;
          const step = Math.round(target.current) + 1;
          const next = step > n - 1 ? -1 : step;
          el.scrollTo({ top: (next + 1) * el.clientHeight, behavior: "instant" });
          target.current = next;
        }
      }
      const diff = target.current - current.current;
      if (Math.abs(diff) > 0.0005) {
        current.current += diff * (1 - Math.exp(-dt * 7));
        setP(current.current);
      } else if (diff !== 0) {
        current.current = target.current;
        setP(current.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("keydown", stop);
    };
  }, [n]);

  const scale = size.w > 0 ? Math.min(size.w / REF_W, size.h / 600) : 1;
  const viewH = size.h / scale;
  const offsetX = (size.w - REF_W * scale) / 2;
  // The pile is pinned: its slots never move. Each step lifts the top slab of
  // the pile up to the centre, and slabs already shown carry on upward, one
  // row per step, like sections scrolling past a pinned stage.
  const slabH = S + depth + PAD * 2;
  const tight = depth * 0.55 + 14;
  const gap = depth + 10;
  const activeTop = viewH / 2 - slabH / 2 - 20;
  const pileTop = (i: number) => activeTop + gap + (i - 1) * tight;
  const slabTop = (i: number) => {
    if (p <= i - 1) return pileTop(i);
    if (p <= i) return pileTop(i) + (activeTop - pileTop(i)) * smooth(p - i + 1);
    return activeTop - (p - i) * ROW;
  };
  const gridIn = smooth(clamp(p + 1, 0, 1));

  const line = rgba(textColor, lineOpacity / 100);
  const fs = textScale / 100;
  const cx = FRAME_X + COL_L + COL_C / 2;
  const divL = FRAME_X + COL_L;
  const divR = FRAME_X + COL_L + COL_C;
  const right = FRAME_X + COL_L + COL_C + COL_R;
  const shimmer = shimmerSpeed > 0 ? 6 / (shimmerSpeed / 100) : 0;
  const activation = Array.from({ length: n }, (_, i) => smooth(clamp(1 - Math.abs(p - i) * 1.5, 0, 1)));
  // A label appears as its layer rises out of the pile, and stays once it has.
  const shown = Array.from({ length: n }, (_, i) => smooth(clamp(p - i + 1, 0, 1)));
  const dotX = COS * (S - 2 * DOT_INSET);

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden" style={{ background, fontFamily }}>
      <div
        ref={scrollRef}
        tabIndex={0}
        className="no-scrollbar absolute inset-0 overflow-y-auto outline-none"
        style={{ scrollSnapType: snap ? "y mandatory" : undefined, overscrollBehavior: "contain" }}
      >
        <div className="relative" style={{ height: size.h * (n + 1) }}>
          {Array.from({ length: n + 1 }, (_, i) => (
            <div key={i} aria-hidden className="absolute inset-x-0" style={{ top: i * size.h, height: size.h, scrollSnapAlign: "start" }} />
          ))}
          <div className="sticky top-0 overflow-hidden" style={{ height: size.h }}>
            {size.w > 0 && (
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{ width: REF_W, height: viewH, transform: `translate(${offsetX}px, 0) scale(${scale})` }}
              >
                <div className="absolute left-0 top-0" style={{ width: REF_W, height: viewH }}>
                  {/* Column rules, each shown row's cell lines, and the dashed guides joining the slabs */}
                  <svg className="absolute left-0 top-0" width={REF_W} height={viewH} aria-hidden>
                    <g stroke={line} strokeWidth={1} fill="none" opacity={gridIn}>
                      {[FRAME_X, divL, divR, right].map((x) => (
                        <path key={x} d={`M${x} 0V${viewH}`} />
                      ))}
                    </g>
                    <g stroke={line} strokeWidth={1} fill="none">
                      {Array.from({ length: n }, (_, i) => {
                        const mid = slabTop(i) + PAD + S / 2 + depth / 2;
                        const d = [mid - ROW / 2, mid + ROW / 2].map((y) => `M${FRAME_X} ${y}H${divL}M${divR} ${y}H${right}`).join("");
                        return <path key={i} d={d} opacity={shown[i]} />;
                      })}
                    </g>
                    <g stroke={rgba(textColor, 0.28)} strokeWidth={1} strokeDasharray="4 5" fill="none">
                      {Array.from({ length: n - 1 }, (_, i) => {
                        const y0 = slabTop(i) + PAD + S / 2;
                        const y1 = slabTop(i + 1) + PAD + S / 2;
                        return [-dotX, 0, dotX].map((dx) => <path key={`${i}-${dx}`} d={`M${cx + dx} ${y0}V${y1}`} />);
                      })}
                    </g>
                  </svg>

                  {/* Slabs, bottom first so each one overlaps the one below it */}
                  {Array.from({ length: n }, (_, k) => n - 1 - k).map((i) => (
                    <div key={i} className="absolute" style={{ left: cx - HALF_W - PAD, top: slabTop(i) }}>
                      <Slab uid={`${uid}-${i}`} index={i} active={activation[i]} depth={depth} background={background} shimmer={shimmer} />
                    </div>
                  ))}

                  {/* Labels, connectors and accent bars */}
                  {Array.from({ length: n }, (_, i) => {
                    const a = activation[i];
                    const v = shown[i];
                    const onLeft = i % 2 === 0;
                    const colX = onLeft ? FRAME_X : divR;
                    const colW = onLeft ? COL_L : COL_R;
                    const barX = onLeft ? divL : divR;
                    const connY = slabTop(i) + PAD + S / 2 + depth / 2;
                    const rowTop = connY - ROW / 2;
                    const edge = onLeft ? cx - HALF_W : cx + HALF_W;
                    const connW = Math.abs(barX - edge);
                    const icon = ICONS[i % ICONS.length];
                    return (
                      <div key={i}>
                        <div
                          className="absolute"
                          style={{
                            left: barX - 2,
                            top: rowTop,
                            width: 4,
                            height: ROW,
                            background: HOLO_CSS,
                            opacity: a,
                            transform: `scaleY(${a})`,
                          }}
                        />
                        <div
                          className="absolute"
                          style={{
                            left: onLeft ? barX : edge,
                            top: connY,
                            width: connW,
                            height: 1,
                            background: rgba(textColor, 0.7),
                            opacity: a,
                            transform: `scaleX(${a})`,
                            transformOrigin: onLeft ? "right" : "left",
                          }}
                        />
                        <div
                          className="absolute"
                          style={{
                            left: edge + (onLeft ? -12 : 4),
                            top: connY - 4,
                            width: 8,
                            height: 8,
                            border: `1px solid ${rgba(textColor, 0.8)}`,
                            background: HOLO_CSS,
                            opacity: a,
                          }}
                        />
                        <div
                          className="absolute"
                          style={{ left: colX + 34, top: rowTop + 48 + (1 - v) * 16, width: colW - 34 - 46 }}
                        >
                          <svg width={22 * fs} height={22 * fs} viewBox="0 0 24 24" fill="none" stroke={rgba(textColor, v * (0.45 + 0.55 * a))} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            {icon.fill && <path d={icon.fill} />}
                            {icon.strokes.map((d, k) => (
                              <path key={k} d={d} />
                            ))}
                          </svg>
                          <div
                            className="uppercase"
                            style={{
                              marginTop: 22 * fs,
                              fontSize: 17 * fs,
                              lineHeight: 1.2,
                              letterSpacing: "0.01em",
                              color: rgba(textColor, v * (0.42 + 0.58 * a)),
                            }}
                          >
                            {titles[i]}
                          </div>
                          <p
                            style={{
                              marginTop: 12 * fs,
                              fontSize: 13.5 * fs,
                              lineHeight: 1.15,
                              color: rgba(textColor, v * (0.24 + 0.52 * a)),
                            }}
                          >
                            {descriptions[i] ?? ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {showGrain && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  opacity: 0.09,
                  mixBlendMode: "screen",
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
