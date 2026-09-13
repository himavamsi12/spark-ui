"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useSpring, useTransform } from "motion/react";
import { CornerUpLeft, CornerUpRight, MapPin, Zap } from "lucide-react";

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";


/** Count-up number that springs between values. */
function Num({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const s = useSpring(value, { stiffness: 90, damping: 20 });
  useEffect(() => {
    s.set(value);
  }, [s, value]);
  const text = useTransform(s, (v) => v.toFixed(decimals));
  return <motion.span>{text}</motion.span>;
}

/* ───────────── navigation world ───────────── */

const WORLD = 1320;
const GRID = 60;
type Pt = { x: number; y: number };

// A looping drive that sticks to the street grid.
const ROUTE: Pt[] = [
  { x: 660, y: 1140 },
  { x: 660, y: 840 },
  { x: 420, y: 840 },
  { x: 420, y: 540 },
  { x: 780, y: 540 },
  { x: 780, y: 300 },
  { x: 1020, y: 300 },
  { x: 1020, y: 1140 },
];
const STREETS = ["Van Ness", "Ness Ave", "Polk St", "Geary Blvd", "Larkin St", "Bush St", "Hyde St", "Market St"];

const SEG_LEN: number[] = ROUTE.map((p, i) => {
  const q = ROUTE[(i + 1) % ROUTE.length];
  return Math.hypot(q.x - p.x, q.y - p.y);
});
const CUM: number[] = SEG_LEN.reduce<number[]>((acc, l, i) => [...acc, acc[i] + l], [0]); // CUM[i] = distance at vertex i
const TOTAL = CUM[ROUTE.length];

function pointAt(d: number): Pt {
  const s = ((d % TOTAL) + TOTAL) % TOTAL;
  let i = 0;
  while (i < ROUTE.length - 1 && CUM[i + 1] <= s) i++;
  const a = ROUTE[i];
  const b = ROUTE[(i + 1) % ROUTE.length];
  const t = (s - CUM[i]) / SEG_LEN[i];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Polyline from distance d0 to d1 along the loop, including every corner in between. */
function routeSlice(d0: number, d1: number) {
  const pts: Pt[] = [pointAt(d0)];
  const lap = Math.floor(d0 / TOTAL);
  for (let l = lap; l <= lap + 1; l++) {
    for (let i = 0; i < ROUTE.length; i++) {
      const at = CUM[i] + l * TOTAL;
      if (at > d0 && at < d1) pts.push(ROUTE[i]);
    }
  }
  pts.push(pointAt(d1));
  return pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
}

/** Next corner ahead of distance d: how far, which way, and the street you turn onto. */
function nextTurn(d: number) {
  const s = ((d % TOTAL) + TOTAL) % TOTAL;
  for (let n = 1; n <= ROUTE.length; n++) {
    const i = n % ROUTE.length;
    const at = i === 0 ? TOTAL : CUM[i];
    if (at > s + 0.001) {
      const prev = ROUTE[(i - 1 + ROUTE.length) % ROUTE.length];
      const cur = ROUTE[i];
      const next = ROUTE[(i + 1) % ROUTE.length];
      const cross = (cur.x - prev.x) * (next.y - cur.y) - (cur.y - prev.y) * (next.x - cur.x);
      return { index: i, dist: at - s, dir: cross < 0 ? ("left" as const) : ("right" as const), street: STREETS[i] };
    }
  }
  return { index: 0, dist: 0, dir: "left" as const, street: STREETS[0] };
}

const ROADS = (() => {
  const minor: string[] = [];
  const major: string[] = [];
  for (let v = 0; v <= WORLD; v += GRID) {
    const target = v % (GRID * 4) === 0 ? major : minor;
    target.push(`M${v},0 L${v},${WORLD}`, `M0,${v} L${WORLD},${v}`);
  }
  const curves = [
    "M-40,420 C220,380 360,660 640,620 C900,585 1000,760 1380,720",
    "M300,-40 C260,300 520,420 470,760 C430,1040 560,1200 520,1380",
    "M880,-40 C840,180 960,260 920,470 C880,700 1120,780 1100,1000 C1085,1180 1180,1260 1220,1380",
    "M-40,980 C160,1000 260,900 420,930 C600,965 700,1100 900,1080",
    "M-40,160 L1380,1160",
    "M1380,120 C1180,160 1100,60 900,120",
  ];
  return { minor, major, curves };
})();

/* ───────────── component ───────────── */

export default function EvRangeWidgets({
  accentColor = "#ff3b30",
  batteryLevel = 18,
  kmPerPercent = 1.9,
  charging = true,
  chargerDistance = "12km",
  chargerName = "Ness Ave, San Francisco",
  distance = 900,
  streetName = "Ness Ave",
  speedLimit = 55,
  showGrain = true,
  speed = 100,
}: {
  accentColor?: string;
  batteryLevel?: number;
  kmPerPercent?: number;
  charging?: boolean;
  chargerDistance?: string;
  chargerName?: string;
  distance?: number;
  streetName?: string;
  speedLimit?: number;
  showGrain?: boolean;
  speed?: number;
}) {
  const k = 100 / Math.max(25, speed);

  /* fit the 620 × 380 artboard into any container */
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const fit = () => setScale(Math.max(0.3, Math.min(1.8, el.clientWidth / 620, el.clientHeight / 380)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* battery: optionally charges upward, looping back to the starting level */
  const [level, setLevel] = useState(batteryLevel);
  const [prevLevel, setPrevLevel] = useState(batteryLevel);
  if (prevLevel !== batteryLevel) {
    setPrevLevel(batteryLevel);
    setLevel(batteryLevel);
  }
  useEffect(() => {
    if (!charging) return;
    const id = window.setInterval(() => {
      setLevel((l) => (l >= Math.min(100, batteryLevel + 40) ? batteryLevel : l + 1));
    }, 900 * k);
    return () => window.clearInterval(id);
  }, [charging, batteryLevel, k]);

  const fillMV = useSpring(0, { stiffness: 60, damping: 18 });
  useEffect(() => {
    fillMV.set(level);
  }, [fillMV, level]);

  const card = {
    background: "linear-gradient(160deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025) 55%, rgba(255,255,255,0.04))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(255,255,255,0.08), 0 30px 60px -30px rgba(0,0,0,0.8)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  } as const;
  const grain = showGrain ? { backgroundImage: GRAIN, backgroundSize: "160px 160px", mixBlendMode: "overlay" as const, opacity: 0.35 } : null;

  const CELLS = 20;
  const lit = Math.max(1, Math.ceil(level / (100 / CELLS)));
  const chargeLimit = 80;
  const minutesToLimit = Math.max(0, Math.round((chargeLimit - level) * 2.1));

  return (
    <div
      ref={frameRef}
      className="relative h-full w-full overflow-hidden select-none text-white"
      style={{ background: "radial-gradient(120% 90% at 50% 40%, #232323 0%, #121212 70%, #0b0b0b 100%)", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      {grain && <div className="pointer-events-none absolute inset-0" style={grain} />}

      <div className="absolute left-1/2 top-1/2 flex" style={{ width: 560, gap: 36, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {/* ════════ charger card ════════ */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8 * k, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden"
          style={{ width: 262, height: 300, borderRadius: 26, padding: "20px 22px 0", ...card }}
        >
          {/* status row */}
          <div className="flex items-center justify-between">
            <span className="flex items-center rounded-full" style={{ gap: 6, fontSize: 10.5, padding: "4px 9px 4px 7px", background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)" }}>
              <span className="relative flex" style={{ width: 7, height: 7 }}>
                {charging && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: accentColor, opacity: 0.6 }} />}
                <span className="relative rounded-full" style={{ width: 7, height: 7, background: charging ? accentColor : "#6b6b6b" }} />
              </span>
              <span className="text-white/70">{charging ? "Charging" : "Parked"}</span>
            </span>
            <span className="flex items-center text-white/45 tabular-nums" style={{ gap: 4, fontSize: 10.5 }}>
              <Zap size={11} strokeWidth={1.8} />
              {charging ? "7.2 kW" : "0 kW"}
            </span>
          </div>

          {/* hero readout */}
          <div className="flex items-end" style={{ marginTop: 16, gap: 12 }}>
            <div className="font-semibold tracking-tight tabular-nums" style={{ fontSize: 50, lineHeight: 0.9 }}>
              <Num value={level} />
              <span className="font-normal text-white/45" style={{ fontSize: 20, marginLeft: 2 }}>%</span>
            </div>
            <div style={{ paddingBottom: 3 }}>
              <div className="font-medium tabular-nums" style={{ fontSize: 15 }}>
                <Num value={level * kmPerPercent} /> km
              </div>
              <div className="text-white/40" style={{ fontSize: 10.5 }}>estimated range</div>
            </div>
          </div>

          {/* cell battery */}
          <div className="relative" style={{ marginTop: 22, height: 70 }}>
            <div className="absolute inset-0 flex items-end" style={{ gap: 3 }}>
              {Array.from({ length: CELLS }, (_, i) => {
                const on = i < lit;
                const head = charging && i === lit - 1;
                return (
                  <motion.span
                    key={i}
                    className="relative block flex-1 overflow-hidden"
                    style={{ height: "100%", borderRadius: 999 }}
                    initial={{ scaleY: 0.2, opacity: 0 }}
                    animate={{
                      scaleY: 1,
                      opacity: head ? [1, 0.35, 1] : 1,
                      background: on
                        ? `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 75%, #fff), ${accentColor} 45%, color-mix(in srgb, ${accentColor} 70%, #000))`
                        : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                      boxShadow: on ? `0 0 14px ${accentColor}66` : "inset 0 0 0 1px rgba(255,255,255,0.05)",
                    }}
                    transition={{
                      scaleY: { type: "spring", stiffness: 260, damping: 20, delay: (0.2 + i * 0.025) * k },
                      opacity: head ? { duration: 1.1 * k, repeat: Infinity } : { duration: 0.3, delay: (0.2 + i * 0.025) * k },
                      background: { duration: 0.35 },
                    }}
                  >
                    {on && showGrain && <span className="absolute inset-0" style={{ backgroundImage: GRAIN, backgroundSize: "60px 60px", mixBlendMode: "soft-light", opacity: 0.8 }} />}
                  </motion.span>
                );
              })}
            </div>
            {/* charge limit marker */}
            <div className="pointer-events-none absolute" style={{ left: `calc(${chargeLimit}% - 1px)`, top: -10, bottom: -6, width: 2, borderRadius: 2, background: "rgba(255,255,255,0.75)" }}>
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-white/60" style={{ top: -13, fontSize: 8.5 }}>
                limit {chargeLimit}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-white/40" style={{ marginTop: 10, fontSize: 10 }}>
            <span>{charging ? (minutesToLimit > 0 ? `${Math.floor(minutesToLimit / 60)}h ${minutesToLimit % 60}m to ${chargeLimit}%` : "Limit reached") : "Plug in to charge"}</span>
            <span className="tabular-nums">+{Math.round(7.2 * kmPerPercent)} km/h</span>
          </div>

          {/* nearest charger tile */}
          <div
            className="absolute flex items-center rounded-2xl"
            style={{ left: 12, right: 12, bottom: 12, gap: 10, padding: "9px 10px", background: "rgba(255,255,255,0.05)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
          >
            <span className="flex shrink-0 items-center justify-center rounded-xl" style={{ width: 32, height: 32, background: `color-mix(in srgb, ${accentColor} 18%, transparent)`, color: accentColor }}>
              <MapPin size={15} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-white/90" style={{ fontSize: 11.5 }}>{chargerName}</div>
              <div className="flex items-center text-white/40" style={{ gap: 5, fontSize: 9.5, marginTop: 2 }}>
                <span className="flex" style={{ gap: 2 }}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <span key={i} className="rounded-full" style={{ width: 4, height: 4, background: i < 4 ? "#4ade80" : "rgba(255,255,255,0.18)" }} />
                  ))}
                </span>
                4 of 8 stalls free
              </div>
            </div>
            <span className="shrink-0 rounded-md tabular-nums text-white/80" style={{ fontSize: 10, padding: "3px 6px", background: "rgba(255,255,255,0.08)" }}>
              {chargerDistance}
            </span>
          </div>
        </motion.div>

        {/* ════════ navigation card ════════ */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8 * k, delay: 0.12 * k, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden"
          style={{ width: 254, height: 300, borderRadius: 26, ...card }}
        >
          <NavMap accentColor={accentColor} speedLimit={speedLimit} k={k} startStreet={streetName} unitMeters={distance / 300} />
        </motion.div>
      </div>
    </div>
  );
}

/* ───────────── follow-camera navigation ───────────── */

const MARK_X = 127;
const MARK_Y = 202;
const ZOOM = 0.55;

function NavMap({ accentColor, speedLimit, k, startStreet, unitMeters }: { accentColor: string; speedLimit: number; k: number; startStreet: string; unitMeters: number }) {
  const uid = useId().replace(/:/g, "");
  const mapRef = useRef<SVGGElement>(null);
  const aheadRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const [info, setInfo] = useState(() => {
    const t = nextTurn(0);
    return { dist: Math.round((t.dist * unitMeters) / 10) * 10, dir: t.dir, street: startStreet, index: t.index };
  });
  const [kmh, setKmh] = useState(speedLimit);
  const [trip, setTrip] = useState({ eta: "--:--", mins: 0, km: 0 });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let d = 40;
    let heading = 0;
    let uiTimer = 0;
    const smooth = (e0: number, e1: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
      return t * t * (3 - 2 * t);
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // ease off into corners and pull away after them
      const turn = nextTurn(d);
      const sinceCorner = Math.min(...CUM.slice(0, ROUTE.length).map((c) => {
        const s = ((d % TOTAL) + TOTAL) % TOTAL;
        const back = s - c;
        return back >= 0 ? back : back + TOTAL;
      }));
      const ease = 0.34 + 0.66 * smooth(0, 120, Math.min(turn.dist, sinceCorner));
      const v = 62 * ease / k;
      d += v * dt;

      // heading from a short look-behind/look-ahead gives rounded, natural rotation through turns
      const p = pointAt(d);
      const a = pointAt(d + 28);
      const b = pointAt(d - 28);
      const target = (Math.atan2(a.x - b.x, -(a.y - b.y)) * 180) / Math.PI;
      let delta = target - heading;
      delta = ((delta + 540) % 360) - 180;
      heading += delta * Math.min(1, dt * 7);

      mapRef.current?.setAttribute("transform", `translate(${MARK_X} ${MARK_Y}) scale(${ZOOM}) rotate(${(-heading).toFixed(2)}) translate(${(-p.x).toFixed(2)} ${(-p.y).toFixed(2)})`);
      const ahead = routeSlice(d, d + 820);
      aheadRef.current?.setAttribute("d", ahead);
      glowRef.current?.setAttribute("d", ahead);
      trailRef.current?.setAttribute("d", routeSlice(d - 180, d));

      uiTimer += dt;
      if (uiTimer > 0.12) {
        uiTimer = 0;
        setInfo({ dist: Math.max(0, Math.round((turn.dist * unitMeters) / 10) * 10), dir: turn.dir, street: turn.street, index: turn.index });
        setKmh(Math.round(speedLimit * (0.55 + 0.45 * ease)));
        const remainingM = (TOTAL - (((d % TOTAL) + TOTAL) % TOTAL)) * unitMeters;
        const mins = Math.max(1, Math.round(remainingM / 520));
        const arrive = new Date(Date.now() + mins * 60000);
        setTrip({ eta: `${String(arrive.getHours()).padStart(2, "0")}:${String(arrive.getMinutes()).padStart(2, "0")}`, mins, km: remainingM / 1000 });
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [k, speedLimit, unitMeters]);

  const TurnIcon = info.dir === "left" ? CornerUpLeft : CornerUpRight;

  return (
    <>
      <svg viewBox="0 0 254 300" className="absolute inset-0 h-full w-full">
        <defs>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#151515" stopOpacity="0.35" />
            <stop offset="0.18" stopColor="#151515" stopOpacity="0" />
            <stop offset="0.62" stopColor="#151515" stopOpacity="0" />
            <stop offset="0.86" stopColor="#151515" stopOpacity="0.96" />
          </linearGradient>
        </defs>
        <rect width="254" height="300" fill="#1b1b1b" />

        <g ref={mapRef} transform={`translate(${MARK_X} ${MARK_Y}) scale(${ZOOM})`}>
          <g fill="none" strokeLinecap="round">
            {ROADS.minor.map((d, i) => (
              <path key={`mo${i}`} d={d} stroke="#252525" strokeWidth={9} />
            ))}
            {ROADS.curves.map((d, i) => (
              <path key={`co${i}`} d={d} stroke="#343434" strokeWidth={26} />
            ))}
            {ROADS.major.map((d, i) => (
              <path key={`ma${i}`} d={d} stroke="#2e2e2e" strokeWidth={20} />
            ))}
            {ROADS.minor.map((d, i) => (
              <path key={`mi${i}`} d={d} stroke="#1f1f1f" strokeWidth={6} />
            ))}
            {ROADS.curves.map((d, i) => (
              <path key={`ci${i}`} d={d} stroke="#282828" strokeWidth={20} />
            ))}
            {ROADS.major.map((d, i) => (
              <path key={`mj${i}`} d={d} stroke="#252525" strokeWidth={15} />
            ))}
          </g>
          {/* driven trail, then the glowing route ahead */}
          <path ref={trailRef} fill="none" stroke="#5a5a5a" strokeOpacity={0.5} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          <path ref={glowRef} fill="none" stroke={accentColor} strokeOpacity={0.75} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${uid}-glow)`} />
          <path ref={aheadRef} fill="none" stroke={accentColor} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <rect width="254" height="300" fill={`url(#${uid}-fade)`} pointerEvents="none" />

        {/* vehicle puck with a heading beam; the world moves around it */}
        <defs>
          <radialGradient id={`${uid}-beam`} cx="0.5" cy="1" r="1">
            <stop offset="0" stopColor={accentColor} stopOpacity="0.45" />
            <stop offset="1" stopColor={accentColor} stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={`M${MARK_X},${MARK_Y} L${MARK_X - 34},${MARK_Y - 70} Q${MARK_X},${MARK_Y - 84} ${MARK_X + 34},${MARK_Y - 70} Z`} fill={`url(#${uid}-beam)`} />
        <circle cx={MARK_X} cy={MARK_Y} r={16} fill={accentColor} opacity={0.18}>
          <animate attributeName="r" values="16;28;16" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.22;0;0.22" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={MARK_X} cy={MARK_Y} r={12.5} fill="#fff" style={{ filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.6))" }} />
        <path d={`M${MARK_X},${MARK_Y - 7} L${MARK_X + 5.5},${MARK_Y + 5.5} L${MARK_X},${MARK_Y + 2.5} L${MARK_X - 5.5},${MARK_Y + 5.5} Z`} fill={accentColor} strokeLinejoin="round" />
      </svg>

      {/* floating manoeuvre pill */}
      <div
        className="absolute flex items-center rounded-2xl"
        style={{ left: 12, right: 12, top: 12, gap: 10, padding: "8px 12px 8px 8px", background: "rgba(20,20,20,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 10px 24px -12px rgba(0,0,0,0.8)" }}
      >
        <div className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ width: 38, height: 38, background: accentColor }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${info.index}-${info.dir}`}
              initial={{ x: info.dir === "left" ? 16 : -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: info.dir === "left" ? -16 : 16, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <TurnIcon size={20} strokeWidth={2.6} />
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="min-w-0">
          <div className="font-semibold tabular-nums" style={{ fontSize: 17, lineHeight: 1 }}>
            {info.dist < 30 ? "Turn now" : <><Num value={info.dist} /><span className="font-normal text-white/50" style={{ fontSize: 11, marginLeft: 3 }}>m</span></>}
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={info.street} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="truncate text-white/50" style={{ fontSize: 10.5, marginTop: 3 }}>
              {info.dir === "left" ? "Left" : "Right"} onto {info.street}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* trip bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-end" style={{ padding: "0 16px 16px", gap: 10 }}>
        <div className="min-w-0 flex-1">
          <div className="font-semibold tabular-nums" style={{ fontSize: 19, lineHeight: 1 }}>{trip.eta}</div>
          <div className="text-white/45 tabular-nums" style={{ fontSize: 10, marginTop: 4 }}>
            {trip.mins} min · {trip.km.toFixed(1)} km
          </div>
        </div>
        <div className="flex items-center rounded-2xl" style={{ gap: 8, padding: "6px 6px 6px 10px", background: "rgba(255,255,255,0.07)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)" }}>
          <div className="text-right">
            <div className="font-semibold tabular-nums" style={{ fontSize: 17, lineHeight: 1 }}>{kmh}</div>
            <div className="text-white/40" style={{ fontSize: 8 }}>km/h</div>
          </div>
          <div className="flex items-center justify-center rounded-full bg-white font-bold text-black tabular-nums" style={{ width: 30, height: 30, fontSize: 11, boxShadow: "inset 0 0 0 3px #e5484d" }}>
            {speedLimit}
          </div>
        </div>
      </div>
    </>
  );
}
