"use client";

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { ChartCard, Segmented } from './chartKit';

type Mode = 'raw' | 'clustered';

interface ClusterFieldProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  points?: number;
  clusters?: number;
  pointSize?: number;
  speed?: number;
}

const W = 600;
const H = 240;
const NAMES = ['Power users', 'Explorers', 'Casual', 'At risk', 'New'];
const SHADES = [1, 0.7, 0.48, 0.32, 0.2];
const CENTERS: [number, number][] = [
  [0.78, 0.26],
  [0.3, 0.3],
  [0.55, 0.68],
  [0.16, 0.74],
  [0.86, 0.72],
];

export function ClusterField({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  points = 90,
  clusters = 4,
  pointSize = 7,
  speed = 100,
}: ClusterFieldProps) {
  const isDark = theme === 'dark';
  const [mode, setMode] = useState<Mode>('clustered');
  const [hover, setHover] = useState<number | null>(null);
  const k = Math.max(2, Math.min(5, Math.round(clusters)));

  const data = useMemo(
    () =>
      Array.from({ length: points }, (_, i) => {
        const c = Math.floor(seeded(i * 7 + 3) * k);
        const angle = seeded(i * 13 + 1) * Math.PI * 2;
        const radius = Math.sqrt(seeded(i * 17 + 5)) * (0.08 + c * 0.012);
        return {
          id: i,
          cluster: c,
          raw: [0.05 + seeded(i * 29 + 11) * 0.9, 0.08 + seeded(i * 31 + 19) * 0.84] as [number, number],
          grouped: [CENTERS[c][0] + Math.cos(angle) * radius, CENTERS[c][1] + Math.sin(angle) * radius * 1.6] as [number, number],
        };
      }),
    [points, k],
  );

  const stats = useMemo(
    () =>
      Array.from({ length: k }, (_, c) => {
        const members = data.filter((d) => d.cluster === c);
        return { size: members.length, share: (members.length / Math.max(1, data.length)) * 100 };
      }),
    [data, k],
  );

  const shade = (c: number) => (isDark ? hexToRgba(color, SHADES[c]) : hexToRgba('#09090b', SHADES[c] * 0.85 + 0.1));
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const clustered = mode === 'clustered';

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>User Segments</span>
        <Segmented
          id="cluster-field"
          isDark={isDark}
          color={color}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setHover(null);
          }}
          options={[
            { value: 'raw', label: 'Raw' },
            { value: 'clustered', label: 'Clustered' },
          ]}
        />
      </div>

      <div className={`relative flex-1 min-h-[140px] rounded-[14px] overflow-hidden ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
          {[0.25, 0.5, 0.75].map((g) => (
            <g key={g} stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}>
              <line x1={g * W} x2={g * W} y1={0} y2={H} />
              <line x1={0} x2={W} y1={g * H} y2={g * H} />
            </g>
          ))}

          <AnimatePresence>
            {clustered &&
              Array.from({ length: k }, (_, c) => (
                <motion.ellipse
                  key={`halo-${c}`}
                  cx={CENTERS[c][0] * W}
                  cy={CENTERS[c][1] * H}
                  initial={{ rx: 0, ry: 0, opacity: 0 }}
                  animate={{
                    rx: (0.08 + c * 0.012) * W + (hover === c ? 14 : 8),
                    ry: (0.08 + c * 0.012) * 1.6 * H * 0.95 + (hover === c ? 14 : 8),
                    opacity: hover === null ? 0.5 : hover === c ? 1 : 0.15,
                  }}
                  exit={{ rx: 0, ry: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 20, delay: hover === null ? bySpeed(0.3 + c * 0.08, speed) : 0 }}
                  fill={hexToRgba(isDark ? color : '#09090b', hover === c ? 0.08 : 0.03)}
                  stroke={shade(c)}
                  strokeDasharray="4 5"
                  onPointerEnter={() => setHover(c)}
                />
              ))}
          </AnimatePresence>

          {data.map((d) => {
            const [x, y] = clustered ? d.grouped : d.raw;
            const dim = hover !== null && hover !== d.cluster;
            return (
              <motion.circle
                key={d.id}
                r={pointSize / 2}
                initial={{ cx: d.raw[0] * W, cy: d.raw[1] * H, opacity: 0, scale: 0 }}
                animate={{
                  cx: x * W,
                  cy: y * H,
                  opacity: dim ? 0.18 : 1,
                  scale: hover === d.cluster ? 1.25 : 1,
                  fill: clustered ? shade(d.cluster) : isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                }}
                transition={{
                  cx: { type: 'spring', stiffness: 90 * (speed / 100), damping: 16, delay: bySpeed((d.id % 30) * 0.012, speed) },
                  cy: { type: 'spring', stiffness: 90 * (speed / 100), damping: 16, delay: bySpeed((d.id % 30) * 0.012, speed) },
                  opacity: { duration: 0.2 },
                  scale: { type: 'spring', stiffness: 400, damping: 20 },
                  fill: { duration: 0.4 },
                }}
                style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
                onPointerEnter={() => clustered && setHover(d.cluster)}
                className="cursor-pointer"
              />
            );
          })}
        </svg>

        <AnimatePresence>
          {clustered && hover !== null && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              className={`pointer-events-none absolute left-2 bottom-2 rounded-xl px-2.5 py-1.5 border backdrop-blur ${
                isDark ? 'bg-[#141416]/85 border-white/10' : 'bg-white/85 border-black/10'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-medium">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: shade(hover) }} />
                {NAMES[hover]}
              </div>
              <div className={`text-[10px] font-mono ${muted}`}>
                {stats[hover].size} users · {stats[hover].share.toFixed(0)}%
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ChartCard>
  );
}
