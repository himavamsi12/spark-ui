"use client";

import React, { useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, labels, series } from './chartData';

interface ScrubTimelineProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  points?: number;
  strokeWidth?: number;
  smooth?: boolean;
  showArea?: boolean;
  showGrid?: boolean;
  speed?: number;
}

const W = 320;
const H = 150;
const PAD_X = 16;
const PAD_Y = 18;

function smoothPath(pts: { x: number; y: number }[]) {
  let d = `M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function linearPath(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

export function ScrubTimeline({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  points = 7,
  strokeWidth = 2.5,
  smooth = true,
  showArea = true,
  showGrid = true,
  speed = 100,
}: ScrubTimelineProps) {
  const { DATA, POINTS, LINE, AREA } = useMemo(() => {
    const vals = series(points, { min: 20, max: 92, salt: 411 });
    const data = labels(points, 'day').map((label, i) => ({ label, value: vals[i] }));
    const pts = data.map((d, i) => ({
      x: PAD_X + (i / (data.length - 1)) * (W - PAD_X * 2),
      y: H - PAD_Y - (d.value / 100) * (H - PAD_Y * 2),
    }));
    const line = smooth ? smoothPath(pts) : linearPath(pts);
    return { DATA: data, POINTS: pts, LINE: line, AREA: `${line} L${pts[pts.length - 1].x} ${H} L${pts[0].x} ${H} Z` };
  }, [points, smooth]);
  const isDark = theme === 'dark';
  const gradientId = `scrub-grad-${useId().replace(/:/g, '')}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    POINTS.forEach((p, i) => {
      const dist = Math.abs(p.x - x);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setActive(nearest);
  }

  const point = active === null || active >= POINTS.length ? null : POINTS[active];

  return (
    <div
      className={`relative w-full rounded-[24px] transition-all duration-300 group flex flex-col overflow-hidden p-4 sm:p-5 ${
        compact ? 'h-[220px] sm:h-[268px]' : 'min-h-[290px]'
      } ${
        isDark
          ? 'bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] text-white'
          : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-neutral-100 text-black'
      }`}
    >

      <div className={`relative w-full flex-1 min-h-[180px] rounded-[14px] overflow-hidden p-2 flex flex-col ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full flex-1 touch-none cursor-crosshair"
          onPointerMove={handleMove}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {showGrid && [0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={0}
              x2={W}
              y1={PAD_Y + f * (H - PAD_Y * 2)}
              y2={PAD_Y + f * (H - PAD_Y * 2)}
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}
              strokeDasharray="3 4"
            />
          ))}

          {showArea && <motion.path
            key={`area-${points}-${smooth}`}
            d={AREA}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: bySpeed(1, speed), delay: bySpeed(0.6, speed) }}
          />}
          <motion.path
            key={`line-${points}-${smooth}`}
            d={LINE}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: bySpeed(1.4, speed), ease: [0.22, 1, 0.36, 1] }}
          />

          <AnimatePresence>
            {point && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <motion.line
                  y1={0}
                  y2={H}
                  stroke={hexToRgba(color, 0.5)}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  animate={{ x1: point.x, x2: point.x }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
                <motion.circle
                  r={10}
                  fill={hexToRgba(color, 0.18)}
                  animate={{ cx: point.x, cy: point.y }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
                <motion.circle
                  r={4.5}
                  fill={color}
                  stroke={isDark ? '#0d0d12' : '#ffffff'}
                  strokeWidth={2}
                  animate={{ cx: point.x, cy: point.y }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
              </motion.g>
            )}
          </AnimatePresence>
        </svg>

        <div className="flex justify-between px-2 pt-1">
          {DATA.map((d, i) => (
            <span
              key={`${d.label}-${i}`}
              className={`text-[9px] font-mono transition-colors ${
                active === i ? (isDark ? 'text-white' : 'text-black') : isDark ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              {d.label}
            </span>
          ))}
        </div>

        <AnimatePresence>
          {point && active !== null && (
            <motion.div
              key="scrub-tip"
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, left: `${(POINTS[active].x / W) * 100}%` }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="absolute top-2 px-2 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap pointer-events-none"
              style={{ x: '-50%', backgroundColor: color, color: '#08080a' }}
            >
              {DATA[active].label} · {DATA[active].value}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
