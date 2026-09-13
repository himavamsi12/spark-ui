"use client";

import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, labels, series } from './chartData';

interface MagneticColumnsProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  bars?: number;
  pull?: number;
  reach?: number;
  gap?: number;
  showLabels?: boolean;
  speed?: number;
}


export function MagneticColumns({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  bars = 10,
  pull = 8,
  reach = 30,
  gap = 6,
  showLabels = true,
  speed = 100,
}: MagneticColumnsProps) {
  const DATA = useMemo(() => series(bars, { min: 35, max: 96, salt: 301 }), [bars]);
  const LABELS = useMemo(() => labels(bars, 'month'), [bars]);
  const isDark = theme === 'dark';
  const stageRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<number | null>(null);

  const active = pointer === null ? null : Math.min(DATA.length - 1, Math.max(0, Math.floor(pointer * DATA.length)));

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPointer((e.clientX - rect.left) / rect.width);
  }

  return (
    <div
      className={`relative w-full rounded-[24px] transition-all duration-300 group flex flex-col overflow-hidden p-4 sm:p-5 ${
        compact ? 'h-[220px] sm:h-[268px]' : 'h-[290px]'
      } ${
        isDark
          ? 'bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] text-white'
          : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-neutral-100 text-black'
      }`}
    >

      <div
        ref={stageRef}
        onPointerMove={handleMove}
        onPointerLeave={() => setPointer(null)}
        className={`relative w-full flex-1 min-h-[170px] rounded-[14px] overflow-hidden px-3 pt-10 pb-7 flex items-end ${
          isDark ? 'bg-void' : 'bg-[#f4f4f6]'
        }`}
        style={{ gap }}
      >
        {DATA.map((value, i) => {
          const center = (i + 0.5) / DATA.length;
          const distance = pointer === null ? 1 : Math.min(1, Math.abs(pointer - center) / (reach / 100));
          const isActive = active === i;

          return (
            <div key={`${bars}-${i}`} className="relative flex-1 h-full flex flex-col items-center justify-end">
              <motion.div
                className="w-full rounded-full origin-bottom"
                style={{ height: `${value}%` }}
                initial={{ scaleY: 0 }}
                animate={{
                  scaleY: 1 + (1 - distance) * (pull / 80),
                  y: -(1 - distance) * pull,
                  backgroundColor: isActive ? color : hexToRgba(color, 0.22 + (1 - distance) * 0.4),
                }}
                transition={{
                  scaleY: { type: 'spring', stiffness: 260, damping: 20, delay: pointer === null ? bySpeed(i * 0.04, speed) : 0 },
                  y: { type: 'spring', stiffness: 320, damping: 24 },
                  backgroundColor: { duration: 0.2 },
                }}
              />
              {isActive && (
                <motion.span
                  layoutId="magnetic-columns-tip"
                  className="absolute px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold whitespace-nowrap"
                  style={{ bottom: `calc(${value * 1.1}% + 10px)`, backgroundColor: color, color: '#08080a' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  {value}
                </motion.span>
              )}
              {showLabels && (bars <= 14 || i % 2 === 0) && <span
                className={`absolute -bottom-5 text-[9px] font-mono transition-colors ${
                  isActive ? (isDark ? 'text-white' : 'text-black') : isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                {LABELS[i]}
              </span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
