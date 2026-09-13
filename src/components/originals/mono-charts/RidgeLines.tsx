"use client";

import React, { useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { ChartCard, Segmented, smoothPath } from './chartKit';

type Year = 'y24' | 'y25';

interface RidgeLinesProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  rows?: number;
  overlap?: number;
  resolution?: number;
  speed?: number;
}

const W = 600;
const H = 220;
const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Hol'];

function density(row: number, year: Year, samples: number) {
  const y = year === 'y24' ? 1 : 2;
  const c1 = 0.25 + seeded(row * 11 + y * 3) * 0.3;
  const c2 = 0.55 + seeded(row * 17 + y * 5) * 0.35;
  const w1 = 0.05 + seeded(row * 23 + y) * 0.06;
  const w2 = 0.04 + seeded(row * 29 + y * 7) * 0.07;
  const a2 = 0.4 + seeded(row * 31 + y * 2) * 0.8;
  const out: number[] = [];
  for (let i = 0; i < samples; i++) {
    const x = i / (samples - 1);
    out.push(Math.exp(-((x - c1) ** 2) / (2 * w1 * w1)) + a2 * Math.exp(-((x - c2) ** 2) / (2 * w2 * w2)));
  }
  const m = Math.max(...out);
  return out.map((v) => v / m);
}

export function RidgeLines({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  rows = 6,
  overlap = 60,
  resolution = 48,
  speed = 100,
}: RidgeLinesProps) {
  const isDark = theme === 'dark';
  const uid = useId().replace(/:/g, '');
  const [year, setYear] = useState<Year>('y25');
  const [hover, setHover] = useState<number | null>(null);
  const count = Math.max(3, Math.min(LABELS.length, Math.round(rows)));
  const samples = Math.max(16, Math.round(resolution));

  const curves = useMemo(() => Array.from({ length: count }, (_, r) => density(r, year, samples)), [count, year, samples]);

  // Reserve headroom so the first ridge's peak (which rises above its row) never clips.
  const rise = overlap / 50;
  const gap = (H - 18) / (count + rise);
  const top = 6 + gap * rise;
  const amp = gap * (1 + rise);
  const card = isDark ? '#0a0a0b' : '#f4f4f6';
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Traffic Distribution</span>
        <Segmented
          id="ridge-lines"
          isDark={isDark}
          color={color}
          value={year}
          onChange={setYear}
          options={[
            { value: 'y24', label: '2024' },
            { value: 'y25', label: '2025' },
          ]}
        />
      </div>

      <div className={`relative flex-1 min-h-[150px] rounded-[14px] overflow-hidden ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity={isDark ? 0.45 : 0.3} />
              <stop offset="1" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {curves.map((vals, r) => {
            const base = top + (r + 1) * gap;
            const pts: [number, number][] = vals.map((v, i) => [48 + (i / (samples - 1)) * (W - 60), base - v * amp]);
            const line = smoothPath(pts, 0.9);
            const area = `${line}L${W - 12},${base}L48,${base}Z`;
            const active = hover === r;
            const dim = hover !== null && !active;
            return (
              <motion.g
                key={r}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: dim ? 0.25 : 1, y: active ? -6 : 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 24, delay: hover === null ? bySpeed(r * 0.07, speed) : 0 }}
                onPointerEnter={() => setHover(r)}
              >
                {/* opaque underlay hides the ridges behind, giving the layered joyplot look */}
                <motion.path d={area} initial={false} animate={{ d: area }} transition={{ duration: bySpeed(0.7, speed), ease: [0.22, 1, 0.36, 1] }} fill={card} />
                <motion.path d={area} initial={false} animate={{ d: area }} transition={{ duration: bySpeed(0.7, speed), ease: [0.22, 1, 0.36, 1] }} fill={`url(#${uid}-f)`} />
                <motion.path
                  d={line}
                  initial={false}
                  animate={{ d: line }}
                  transition={{ duration: bySpeed(0.7, speed), ease: [0.22, 1, 0.36, 1] }}
                  fill="none"
                  stroke={isDark ? color : '#09090b'}
                  strokeOpacity={active ? 1 : 0.55 + (r / count) * 0.45}
                  strokeWidth={active ? 2.4 : 1.4}
                  vectorEffect="non-scaling-stroke"
                />
                <line x1={48} x2={W - 12} y1={base} y2={base} stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'} vectorEffect="non-scaling-stroke" />
              </motion.g>
            );
          })}
        </svg>

        {curves.map((vals, r) => {
          const base = top + (r + 1) * gap;
          const peak = vals.indexOf(1);
          const hour = Math.round((peak / (samples - 1)) * 24);
          return (
            <div key={r} className="pointer-events-none absolute left-2 flex items-center gap-2" style={{ top: `calc(${(base / H) * 100}% - 9px)` }}>
              <span className={`text-[10px] font-mono transition-colors ${hover === r ? (isDark ? 'text-white' : 'text-black') : muted}`}>{LABELS[r]}</span>
              {hover === r && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[9px] font-mono px-1.5 py-px rounded-full"
                  style={{ backgroundColor: hexToRgba(color, 0.16), color }}
                >
                  peak {String(hour).padStart(2, '0')}:00
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
