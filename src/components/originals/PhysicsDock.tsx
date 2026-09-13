"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Reorder, AnimatePresence, motion, useAnimate, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";

/* ───────────────────────── app icons (vector, 100×100) ───────────────────────── */

type IconProps = { uid: string; month: string; day: number };

const ICONS: Record<string, { label: string; draw: (p: IconProps) => ReactNode }> = {
  finder: {
    label: "Finder",
    draw: ({ uid }) => (
      <>
        <defs>
          <linearGradient id={`${uid}-fl`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3fc2ff" />
            <stop offset="1" stopColor="#1a64ef" />
          </linearGradient>
          <linearGradient id={`${uid}-fr`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f7fb" />
            <stop offset="1" stopColor="#cdd8e6" />
          </linearGradient>
          <clipPath id={`${uid}-fc`}>
            <rect width="100" height="100" rx="22.5" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-fc)`}>
          <rect width="100" height="100" fill={`url(#${uid}-fr)`} />
          <path d="M0 0H56C47 16 42 34 43 56H52C51 72 53 86 57 100H0Z" fill={`url(#${uid}-fl)`} />
        </g>
        <rect x="28" y="28" width="5" height="13" rx="2.5" fill="#1d2433" />
        <rect x="67" y="28" width="5" height="13" rx="2.5" fill="#1d2433" />
        <path d="M22 66C38 80 62 80 78 64" fill="none" stroke="#1d2433" strokeWidth="3.6" strokeLinecap="round" />
      </>
    ),
  },
  calculator: {
    label: "Calculator",
    draw: ({ uid }) => (
      <>
        <defs>
          <linearGradient id={`${uid}-cb`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e3e3e3" />
            <stop offset="1" stopColor="#a9a9a9" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22.5" fill={`url(#${uid}-cb)`} />
        <rect x="24" y="12" width="52" height="76" rx="9" fill="#262626" />
        <rect x="30" y="18" width="40" height="15" rx="3" fill="#5b5b5b" />
        {[44, 56, 68].map((y) =>
          [36, 50, 64].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4.4" fill={x === 64 ? "#ff9f0a" : "#a5a5a5"} />),
        )}
        <rect x="31.6" y="75.6" width="23" height="8.8" rx="4.4" fill="#e6e6e6" />
        <circle cx="64" cy="80" r="4.4" fill="#ff9f0a" />
      </>
    ),
  },
  terminal: {
    label: "Terminal",
    draw: () => (
      <>
        <rect width="100" height="100" rx="22.5" fill="#d4d4d4" />
        <rect x="4.5" y="4.5" width="91" height="91" rx="18.5" fill="#1b1b1b" />
        <path d="M18 20l10 6.5L18 33" fill="none" stroke="#f2f2f2" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 36h12" stroke="#f2f2f2" strokeWidth="3.2" strokeLinecap="round" />
      </>
    ),
  },
  mail: {
    label: "Mail",
    draw: ({ uid }) => (
      <>
        <defs>
          <linearGradient id={`${uid}-mb`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d6af0" />
            <stop offset="1" stopColor="#5ecbfb" />
          </linearGradient>
          <linearGradient id={`${uid}-me`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#dfe6ee" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22.5" fill={`url(#${uid}-mb)`} />
        <rect x="15" y="29" width="70" height="43" rx="4" fill={`url(#${uid}-me)`} />
        <path d="M16 31l34 25 34-25M16 71l26-21M84 71L58 50" fill="none" stroke="#aebccd" strokeWidth="1.8" strokeLinejoin="round" />
      </>
    ),
  },
  notes: {
    label: "Notes",
    draw: ({ uid }) => (
      <>
        <defs>
          <linearGradient id={`${uid}-nt`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe36e" />
            <stop offset="1" stopColor="#f6c61f" />
          </linearGradient>
          <clipPath id={`${uid}-nc`}>
            <rect width="100" height="100" rx="22.5" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-nc)`}>
          <rect width="100" height="100" fill="#f5f3ee" />
          <rect width="100" height="24" fill={`url(#${uid}-nt)`} />
          <path d="M0 27.5h100" stroke="#bdb6a4" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
          {[48, 69, 90].map((y) => (
            <path key={y} d={`M0 ${y}h100`} stroke="#dcd8cd" strokeWidth="1.2" />
          ))}
        </g>
      </>
    ),
  },
  safari: {
    label: "Safari",
    draw: ({ uid }) => (
      <>
        <defs>
          <linearGradient id={`${uid}-sb`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e4e4e4" />
          </linearGradient>
          <linearGradient id={`${uid}-sc`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#24b8ff" />
            <stop offset="1" stopColor="#1463e0" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22.5" fill={`url(#${uid}-sb)`} />
        <circle cx="50" cy="50" r="39" fill={`url(#${uid}-sc)`} />
        <circle cx="50" cy="50" r="33" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="4" strokeDasharray="0.6 2.9" />
        <path d="M72 28L53.4 53.4 46.6 46.6Z" fill="#ff3b30" />
        <path d="M28 72l18.6-25.4 6.8 6.8Z" fill="#f5f5f5" />
      </>
    ),
  },
  photos: {
    label: "Photos",
    draw: () => (
      <>
        <rect width="100" height="100" rx="22.5" fill="#fbfbfb" />
        <g style={{ mixBlendMode: "multiply" }}>
          {["#f5a623", "#f8d53a", "#a6d64c", "#4fbd6b", "#44a8d6", "#6f7fd8", "#a36ccb", "#e8588c"].map((c, i) => (
            <ellipse key={c} cx="50" cy="30" rx="12" ry="19" fill={c} fillOpacity="0.9" transform={`rotate(${i * 45} 50 50) rotate(22 50 30)`} />
          ))}
        </g>
      </>
    ),
  },
  music: {
    label: "Music",
    draw: ({ uid }) => (
      <>
        <defs>
          <linearGradient id={`${uid}-mu`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fb5d74" />
            <stop offset="1" stopColor="#f5243f" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22.5" fill={`url(#${uid}-mu)`} />
        <path d="M40 29l35-8v10l-35 8z" fill="#fff" />
        <rect x="37" y="30" width="5" height="42" rx="1.5" fill="#fff" />
        <rect x="72" y="22" width="5" height="42" rx="1.5" fill="#fff" />
        <ellipse cx="32" cy="72" rx="10" ry="8" transform="rotate(-18 32 72)" fill="#fff" />
        <ellipse cx="67" cy="64" rx="10" ry="8" transform="rotate(-18 67 64)" fill="#fff" />
      </>
    ),
  },
  calendar: {
    label: "Calendar",
    draw: ({ uid, month, day }) => (
      <>
        <defs>
          <clipPath id={`${uid}-kc`}>
            <rect width="100" height="100" rx="22.5" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-kc)`}>
          <rect width="100" height="100" fill="#fbfbfb" />
          <rect width="100" height="30" fill="#f0524a" />
        </g>
        <text x="50" y="22" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" fontFamily="-apple-system, system-ui, sans-serif">
          {month.slice(0, 3).toUpperCase()}
        </text>
        <text x="50" y="85" textAnchor="middle" fontSize="54" fontWeight="300" fill="#222" fontFamily="-apple-system, system-ui, sans-serif">
          {day}
        </text>
      </>
    ),
  },
};

const APP_ORDER = ["finder", "calculator", "terminal", "mail", "notes", "safari", "photos", "music", "calendar"];

/* ───────────────────────── dock item ───────────────────────── */

function DockIcon({
  app,
  mouseX,
  scaleRef,
  base,
  magnified,
  range,
  stiffness,
  running,
  onLaunch,
  showLabel,
  bounce,
  month,
  day,
  dotColor,
  reorderable,
}: {
  app: string;
  mouseX: MotionValue<number>;
  scaleRef: React.RefObject<number>;
  base: number;
  magnified: number;
  range: number;
  stiffness: number;
  running: boolean;
  onLaunch: () => void;
  showLabel: boolean;
  bounce: boolean;
  month: string;
  day: number;
  dotColor: string;
  reorderable: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [scope, animateBounce] = useAnimate();

  // Cosine falloff reads smoother than a linear tent: neighbours ease up instead of stepping.
  const target = useTransform(() => {
    const x = mouseX.get();
    const el = ref.current;
    if (!el || !Number.isFinite(x)) return base;
    const r = el.getBoundingClientRect();
    const d = Math.abs(x - (r.left + r.width / 2)) / (scaleRef.current || 1);
    if (d >= range) return base;
    return base + (magnified - base) * (0.5 + 0.5 * Math.cos((d / range) * Math.PI));
  });
  const size = useSpring(target, { stiffness, damping: 22, mass: 0.35 });

  const meta = ICONS[app];

  function launch() {
    if (dragged.current) return;
    onLaunch();
    if (bounce) {
      const h = base * 0.45;
      animateBounce(scope.current, { y: [0, -h, 0, -h * 0.5, 0] }, { duration: 1.1, ease: "easeInOut" });
    }
  }

  return (
    <Reorder.Item
      value={app}
      drag={reorderable ? "x" : false}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={() => {
        setTimeout(() => (dragged.current = false), 0);
      }}
      whileDrag={{ zIndex: 10 }}
      className="relative flex shrink-0 flex-col items-center"
      style={{ width: size }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <AnimatePresence>
        {showLabel && hovered && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute bottom-full mb-3 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium text-white"
            style={{ backgroundColor: "rgba(40,40,40,0.92)", boxShadow: "0 4px 14px rgba(0,0,0,0.25), inset 0 0 0 0.5px rgba(255,255,255,0.18)" }}
          >
            {meta.label}
          </motion.span>
        )}
      </AnimatePresence>
      <motion.div ref={scope}>
        <motion.div
          ref={ref}
          role="button"
          aria-label={meta.label}
          tabIndex={0}
          onClick={launch}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && launch()}
          className={`${reorderable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} outline-none`}
          style={{ width: size, height: size, filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.25))" }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%" className="pointer-events-none block" aria-hidden="true">
            {meta.draw({ uid, month, day })}
          </svg>
        </motion.div>
      </motion.div>
      <span
        className="mt-[3px] block rounded-full transition-opacity duration-300"
        style={{ width: Math.max(3, base * 0.08), height: Math.max(3, base * 0.08), backgroundColor: dotColor, opacity: running ? 1 : 0 }}
      />
    </Reorder.Item>
  );
}

/* ───────────────────────── dock ───────────────────────── */

export default function PhysicsDock({
  background = "#fbfbfb",
  dockColor = "#5e5e5e",
  dotColor = "#e8e8e8",
  iconCount = 9,
  iconSize = 52,
  magnification = 84,
  range = 150,
  gap = 16,
  showLabels = true,
  showDots = true,
  bounceOnClick = true,
  reorderable = true,
  calendarMonth = "Jul",
  calendarDay = 17,
  speed = 100,
}: {
  background?: string;
  dockColor?: string;
  dotColor?: string;
  iconCount?: number;
  iconSize?: number;
  magnification?: number;
  range?: number;
  gap?: number;
  showLabels?: boolean;
  showDots?: boolean;
  bounceOnClick?: boolean;
  reorderable?: boolean;
  calendarMonth?: string;
  calendarDay?: number;
  speed?: number;
}) {
  const count = Math.max(1, Math.min(APP_ORDER.length, Math.round(iconCount)));
  const [order, setOrder] = useState(APP_ORDER);
  const items = order.filter((a) => APP_ORDER.indexOf(a) < count);
  const [running, setRunning] = useState<Record<string, boolean>>({ finder: true, safari: true });
  const mouseX = useMotionValue(Infinity);

  const pad = Math.round(iconSize * 0.3);
  const dotSpace = Math.max(3, iconSize * 0.08) + 3;
  const dockH = iconSize + pad * 2;
  const mag = Math.max(iconSize, magnification);

  // Fit the dock (plus magnification headroom) into whatever box hosts it.
  const frameRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const dockW = count * iconSize + (count - 1) * gap + pad * 2 + (mag - iconSize) * 2;
  const dockTotalH = dockH + (mag - iconSize) + 56;
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => {
      const s = Math.max(0.3, Math.min(1, (frame.clientWidth - 32) / dockW, (frame.clientHeight - 32) / dockTotalH));
      scaleRef.current = s;
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [dockW, dockTotalH]);

  const stiffness = 320 * (speed / 100);

  return (
    <div
      ref={frameRef}
      className="relative flex h-full w-full select-none items-center justify-center overflow-hidden"
      style={{ backgroundColor: background }}
    >
      <div style={{ transform: `scale(${scale})`, paddingTop: mag - iconSize + 40 }}>
        <Reorder.Group
          as="div"
          axis="x"
          values={items}
          onReorder={(next: string[]) => setOrder([...next, ...order.filter((a) => !next.includes(a))])}
          onPointerMove={(e) => mouseX.set(e.clientX)}
          onPointerLeave={() => mouseX.set(Infinity)}
          className="relative flex items-end"
          style={{
            height: dockH,
            gap,
            paddingLeft: pad,
            paddingRight: pad,
            paddingBottom: pad - dotSpace,
            borderRadius: dockH * 0.3,
            backgroundColor: dockColor,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.14), 0 0 0 1px rgba(0,0,0,0.12), 0 18px 40px -10px rgba(0,0,0,0.35)`,
          }}
        >
          {items.map((app) => (
            <DockIcon
              key={app}
              app={app}
              mouseX={mouseX}
              scaleRef={scaleRef}
              base={iconSize}
              magnified={mag}
              range={range}
              stiffness={stiffness}
              running={showDots && !!running[app]}
              onLaunch={() => setRunning((r) => ({ ...r, [app]: true }))}
              showLabel={showLabels}
              bounce={bounceOnClick}
              month={calendarMonth}
              day={calendarDay}
              dotColor={dotColor}
              reorderable={reorderable}
            />
          ))}
        </Reorder.Group>
      </div>
    </div>
  );
}
