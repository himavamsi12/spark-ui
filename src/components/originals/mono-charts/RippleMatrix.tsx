"use client";

import React, { useMemo, useRef } from 'react';
import { useAnimate } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed } from './chartData';

interface RippleMatrixProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  columns?: number;
  rows?: number;
  gap?: number;
  radius?: number;
  rippleScale?: number;
  shape?: 'square' | 'circle';
  speed?: number;
}

// Deterministic intensity field so server and client render identical cells.
function buildCells(cols: number, rows: number) {
  return Array.from({ length: cols * rows }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const wave = Math.sin(c * 0.7) * 0.5 + Math.cos(r * 1.1 + c * 0.3) * 0.5;
    return Math.round(((wave + 1) / 2) * 100) / 100;
  });
}

export function RippleMatrix({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  columns: COLS = 14,
  rows: ROWS = 6,
  gap = 6,
  radius = 4,
  rippleScale = 1.45,
  shape = 'square',
  speed = 100,
}: RippleMatrixProps) {
  const CELLS = useMemo(() => buildCells(COLS, ROWS), [COLS, ROWS]);
  const isDark = theme === 'dark';
  const [scope, animate] = useAnimate();
  const lastCell = useRef<number | null>(null);

  function ripple(origin: number) {
    if (lastCell.current === origin) return;
    lastCell.current = origin;
    const or = Math.floor(origin / COLS);
    const oc = origin % COLS;

    animate(
      '[data-cell]',
      { scale: [1, rippleScale, 1], filter: ['brightness(1)', 'brightness(1.9)', 'brightness(1)'] },
      {
        duration: bySpeed(0.55, speed),
        ease: [0.22, 1, 0.36, 1],
        delay: (i: number) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          return bySpeed(Math.hypot(r - or, c - oc) * 0.045, speed);
        },
      }
    );
  }

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

      <div className={`relative w-full flex-1 min-h-[170px] rounded-[14px] overflow-hidden p-4 flex items-center ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <div
          ref={scope}
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap }}
          onPointerLeave={() => (lastCell.current = null)}
        >
          {CELLS.map((intensity, i) => (
            <div
              key={`${COLS}-${ROWS}-${i}`}
              data-cell
              onPointerEnter={() => ripple(i)}
              onClick={() => {
                lastCell.current = null;
                ripple(i);
              }}
              className="aspect-square cursor-pointer will-change-transform"
              style={{ borderRadius: shape === 'circle' ? 9999 : radius, backgroundColor: hexToRgba(color, 0.08 + intensity * 0.82) }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
