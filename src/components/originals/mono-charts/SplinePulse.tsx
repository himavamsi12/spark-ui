"use client";

import React, { useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, series } from './chartData';
import { AnimatedNumber, ChartCard, Segmented, smoothPath } from './chartKit';

type Range = '7d' | '30d' | '90d';

interface SplinePulseProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  points?: number;
  strokeWidth?: number;
  showGrid?: boolean;
  glow?: boolean;
  speed?: number;
}

const W = 600;
const H = 200;
const PAD_T = 18;
const PAD_B = 14;
const PAD_X = 18;

export function SplinePulse({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  points = 24,
  strokeWidth = 2.5,
  showGrid = true,
  glow = true,
  speed = 100,
}: SplinePulseProps) {
  const isDark = theme === 'dark';
  const uid = useId().replace(/:/g, '');
  const [range, setRange] = useState<Range>('30d');
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    const salt = range === '7d' ? 501 : range === '30d' ? 502 : 503;
    return series(points, { min: 18, max: 96, salt });
  }, [points, range]);

  const coords = useMemo<[number, number][]>(
    () => data.map((v, i) => [PAD_X + (i / (data.length - 1)) * (W - PAD_X * 2), PAD_T + (1 - v / 100) * (H - PAD_T - PAD_B)]),
    [data],
  );
  const line = smoothPath(coords);
  const area = `${line}L${W - PAD_X},${H}L${PAD_X},${H}Z`;

  const idx = hover ?? data.length - 1;
  const value = data[idx];
  const prev = data[Math.max(0, idx - 1)];
  const delta = prev ? ((value - prev) / prev) * 100 : 0;
  const [cx, cy] = coords[idx];

  function onMove(e: React.PointerEvent) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(t * (data.length - 1)))));
  }

  const transition = { duration: bySpeed(0.7, speed), ease: [0.22, 1, 0.36, 1] as const };
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-start justify-between mb-2 gap-3">
        <div className="min-w-0">
          <div className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Net Volume</div>
          <div className="flex items-baseline gap-2 mt-1">
            <AnimatedNumber value={value * 128} prefix="$" className="text-2xl font-semibold tabular-nums tracking-tight" />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={delta >= 0 ? 'up' : 'down'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: hexToRgba(color, 0.14), color }}
              >
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <Segmented
          id="spline-pulse"
          isDark={isDark}
          color={color}
          value={range}
          onChange={(r) => {
            setRange(r);
            setHover(null);
          }}
          options={[
            { value: '7d', label: '7D' },
            { value: '30d', label: '30D' },
            { value: '90d', label: '90D' },
          ]}
        />
      </div>

      <div className={`relative w-full flex-1 min-h-[120px] rounded-[14px] overflow-hidden ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity={0.32} />
              <stop offset="1" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <filter id={`${uid}-glow`} x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <clipPath id={`${uid}-reveal`}>
              <motion.rect
                x={0}
                y={0}
                height={H}
                initial={{ width: 0 }}
                animate={{ width: W }}
                transition={{ duration: bySpeed(1.2, speed), ease: [0.65, 0, 0.35, 1] }}
              />
            </clipPath>
          </defs>

          {showGrid &&
            [0.25, 0.5, 0.75].map((g) => (
              <line
                key={g}
                x1={0}
                x2={W}
                y1={PAD_T + g * (H - PAD_T - PAD_B)}
                y2={PAD_T + g * (H - PAD_T - PAD_B)}
                stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}
                strokeDasharray="3 5"
                vectorEffect="non-scaling-stroke"
              />
            ))}

          <g clipPath={`url(#${uid}-reveal)`}>
            <motion.path d={area} fill={`url(#${uid}-fill)`} initial={false} animate={{ d: area }} transition={transition} />
            {glow && isDark && (
              <motion.path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth * 2.5}
                opacity={0.45}
                filter={`url(#${uid}-glow)`}
                initial={false}
                animate={{ d: line }}
                transition={transition}
                vectorEffect="non-scaling-stroke"
              />
            )}
            <motion.path
              d={line}
              fill="none"
              stroke={isDark ? color : '#09090B'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              initial={false}
              animate={{ d: line }}
              transition={transition}
              vectorEffect="non-scaling-stroke"
            />
          </g>

          <AnimatePresence>
            {hover !== null && (
              <motion.line
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, x1: cx, x2: cx }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                y1={0}
                y2={H}
                stroke={isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.2)'}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </AnimatePresence>
        </svg>

        {/* HTML dot so it stays round under preserveAspectRatio="none" */}
        <motion.div
          className="pointer-events-none absolute"
          initial={false}
          animate={{ left: `${(cx / W) * 100}%`, top: `${(cy / H) * 100}%` }}
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        >
          <span className="absolute -translate-x-1/2 -translate-y-1/2 block h-6 w-6 rounded-full animate-ping" style={{ backgroundColor: hexToRgba(color, 0.25) }} />
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 block h-3 w-3 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${isDark ? '#0a0a0b' : '#fff'}` }}
          />
        </motion.div>
      </div>
    </ChartCard>
  );
}
