"use client";

import React, { useId, useMemo, useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, series } from './chartData';

interface TiltGlowPanelProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  bars?: number;
  tilt?: number;
  glare?: number;
  depth?: number;
  showLine?: boolean;
  speed?: number;
}


export function TiltGlowPanel({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  bars = 12,
  tilt = 14,
  glare: glareStrength = 28,
  depth = 30,
  showLine = true,
  speed = 100,
}: TiltGlowPanelProps) {
  const BARS = useMemo(() => series(bars, { min: 30, max: 98, salt: 451 }), [bars]);
  const isDark = theme === 'dark';
  const gradId = `tilt-grad-${useId().replace(/:/g, '')}`;
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 150, damping: 18 });
  const sy = useSpring(py, { stiffness: 150, damping: 18 });

  const rotateY = useTransform(sx, [0, 1], [-tilt, tilt]);
  const rotateX = useTransform(sy, [0, 1], [tilt * 0.7, -tilt * 0.7]);
  const glareX = useTransform(sx, (v) => `${v * 100}%`);
  const glareY = useTransform(sy, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(260px circle at ${glareX} ${glareY}, ${hexToRgba(color, glareStrength / 100)}, transparent 65%)`;
  const shadowX = useTransform(sx, [0, 1], [18, -18]);
  const shadowY = useTransform(sy, [0, 1], [18, -6]);
  const shadow = useMotionTemplate`${shadowX}px ${shadowY}px 40px ${hexToRgba(color, 0.18)}`;

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }

  function reset() {
    px.set(0.5);
    py.set(0.5);
  }

  const max = Math.max(...BARS);
  const linePts = BARS.map((v, i) => `${((i / BARS.length) * 250 + 6 + Math.max(3, (250 / BARS.length) * 0.65) / 2).toFixed(2)},${(104 - (v / max) * 90).toFixed(2)}`).join(' ');

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

      <div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={reset}
        className={`relative w-full flex-1 min-h-[190px] rounded-[14px] overflow-hidden flex items-center justify-center p-5 ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}
        style={{ perspective: 800 }}
      >
        <motion.div
          className={`relative w-full max-w-[300px] rounded-2xl border p-4 overflow-hidden ${
            isDark ? 'bg-panel border-white/10' : 'bg-white border-neutral-200'
          }`}
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d', boxShadow: shadow }}
        >
          <motion.div className="pointer-events-none absolute inset-0" style={{ background: glare }} />

          <div className="relative flex items-baseline justify-between mb-2" style={{ transform: `translateZ(${depth}px)` }}>
            <span className={`text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Throughput
            </span>
            <span className="text-[10px] font-mono" style={{ color }}>
              +18.4%
            </span>
          </div>

          <svg viewBox="0 0 260 120" className="relative w-full h-auto" style={{ transform: `translateZ(${Math.round(depth * 0.66)}px)` }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                <stop offset="100%" stopColor={color} stopOpacity="0.15" />
              </linearGradient>
            </defs>
            {BARS.map((v, i) => {
              const h = (v / max) * 90;
              return (
                <motion.rect
                  key={`${bars}-${i}`}
                  x={(i / BARS.length) * 250 + 6}
                  width={Math.max(3, (250 / BARS.length) * 0.65)}
                  rx={5}
                  fill={`url(#${gradId})`}
                  initial={{ y: 112, height: 0 }}
                  animate={{ y: 112 - h, height: h }}
                  transition={{ type: 'spring', stiffness: 120, damping: 16, delay: bySpeed(i * 0.05, speed) }}
                />
              );
            })}
            {showLine && <motion.polyline
              key={`line-${bars}`}
              points={linePts}
              fill="none"
              stroke={isDark ? '#ffffff' : '#09090B'}
              strokeOpacity={0.6}
              strokeWidth={1.5}
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: bySpeed(1.6, speed), delay: bySpeed(0.5, speed), ease: [0.22, 1, 0.36, 1] }}
            />}
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
