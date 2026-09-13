"use client";

import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, labels, series } from './chartData';
import { ChartCard, Segmented, smoothPath } from './chartKit';

type Mode = 'stacked' | 'percent';

interface LayerStackProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  layers?: number;
  points?: number;
  smooth?: boolean;
  speed?: number;
}

const W = 600;
const H = 180;
const NAMES = ['Compute', 'Storage', 'Network', 'Database', 'CDN'];
const SHADES = [1, 0.66, 0.42, 0.26, 0.14];

export function LayerStack({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  layers = 4,
  points = 14,
  smooth = true,
  speed = 100,
}: LayerStackProps) {
  const isDark = theme === 'dark';
  const count = Math.max(2, Math.min(5, Math.round(layers)));
  const n = Math.max(4, Math.round(points));
  const [mode, setMode] = useState<Mode>('stacked');
  const [hidden, setHidden] = useState<Record<number, boolean>>({});
  const [hover, setHover] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const raw = useMemo(() => Array.from({ length: count }, (_, s) => series(n, { min: 8, max: 40, salt: 900 + s * 3 })), [count, n]);
  const xs = labels(n, 'month');

  // Hidden layers animate to zero thickness (same point count), so the stack re-flows instead of re-drawing.
  const visible = raw.map((vals, s) => vals.map((v) => (hidden[s] ? 0 : v)));
  const totals = Array.from({ length: n }, (_, i) => visible.reduce((a, vals) => a + vals[i], 0));
  const maxTotal = Math.max(1, ...totals);
  const scaleY = (v: number, i: number) => (mode === 'percent' ? (totals[i] ? v / totals[i] : 0) : v / (maxTotal * 1.08));

  const bands: { lower: number[]; upper: number[] }[] = [];
  for (let s = 0; s < visible.length; s++) {
    const lower = s === 0 ? new Array(n).fill(0) : bands[s - 1].upper;
    bands.push({ lower, upper: visible[s].map((v, i) => lower[i] + scaleY(v, i)) });
  }

  const px = (i: number) => 6 + (i / (n - 1)) * (W - 12);
  const py = (v: number) => H - 4 - v * (H - 12);
  const edge = (vals: number[]) => {
    const pts: [number, number][] = vals.map((v, i) => [px(i), py(v)]);
    return smooth ? smoothPath(pts, 0.8) : pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join('');
  };
  const bandPath = (b: { lower: number[]; upper: number[] }) => {
    const lowPts: [number, number][] = b.lower.map((v, i) => [px(i), py(v)] as [number, number]).reverse();
    const low = smooth ? smoothPath(lowPts, 0.8).replace(/^M/, 'L') : lowPts.map(([x, y]) => `L${x},${y}`).join('');
    return `${edge(b.upper)}${low}Z`;
  };

  function onMove(e: React.PointerEvent) {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
  }

  const shade = (s: number) => (isDark ? hexToRgba(color, SHADES[s]) : hexToRgba('#09090b', SHADES[s] * 0.8 + 0.08));
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const tr = { duration: bySpeed(0.6, speed), ease: [0.22, 1, 0.36, 1] as const };

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {raw.map((_, s) => (
            <motion.button
              key={s}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setHidden((h) => ({ ...h, [s]: !h[s] }))}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border cursor-pointer transition-colors ${
                hidden[s]
                  ? isDark ? 'border-white/10 text-neutral-500' : 'border-black/10 text-neutral-400'
                  : isDark ? 'border-white/15 bg-white/5 text-neutral-200' : 'border-black/15 bg-black/5 text-neutral-700'
              }`}
            >
              <motion.span className="h-1.5 w-1.5 rounded-full" animate={{ backgroundColor: hidden[s] ? 'rgba(128,128,128,0.4)' : shade(s), scale: hidden[s] ? 0.7 : 1 }} />
              {NAMES[s]}
            </motion.button>
          ))}
        </div>
        <Segmented
          id="layer-stack"
          isDark={isDark}
          color={color}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'stacked', label: 'Σ' },
            { value: 'percent', label: '%' },
          ]}
        />
      </div>

      <div
        ref={boxRef}
        className={`relative flex-1 min-h-[120px] rounded-[14px] overflow-hidden ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <motion.g initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ originY: 1, transformBox: 'view-box' }} transition={{ duration: bySpeed(0.8, speed), ease: [0.22, 1, 0.36, 1] }}>
            {bands.map((b, s) => {
              const d = bandPath(b);
              const topD = edge(b.upper);
              return (
                <g key={s}>
                  <motion.path d={d} initial={false} animate={{ d }} transition={tr} fill={shade(s)} fillOpacity={isDark ? 0.55 : 0.7} />
                  <motion.path d={topD} initial={false} animate={{ d: topD, opacity: hidden[s] ? 0 : 1 }} transition={tr} fill="none" stroke={shade(s)} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
          </motion.g>
          {hover !== null && <line x1={px(hover)} x2={px(hover)} y1={0} y2={H} stroke={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        </svg>

        <AnimatePresence>
          {hover !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, left: `${(px(hover) / W) * 100}%`, x: hover > n / 2 ? -128 : 8 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              className={`pointer-events-none absolute top-2 w-[120px] rounded-xl px-2.5 py-1.5 border backdrop-blur ${isDark ? 'bg-[#141416]/85 border-white/10' : 'bg-white/85 border-black/10'}`}
            >
              <div className={`text-[10px] font-mono mb-0.5 ${muted}`}>{xs[hover]}</div>
              {raw.map((vals, s) =>
                hidden[s] ? null : (
                  <div key={s} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: shade(s) }} />
                      {NAMES[s]}
                    </span>
                    <span className="font-mono tabular-nums">
                      {mode === 'percent' ? `${((visible[s][hover] / Math.max(1, totals[hover])) * 100).toFixed(0)}%` : vals[hover]}
                    </span>
                  </div>
                ),
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ChartCard>
  );
}
