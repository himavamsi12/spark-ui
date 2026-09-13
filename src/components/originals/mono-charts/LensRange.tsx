"use client";

import React, { useId, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, series } from './chartData';
import { AnimatedNumber, ChartCard, smoothPath } from './chartKit';

interface LensRangeProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  points?: number;
  windowSize?: number;
  showDots?: boolean;
  speed?: number;
}

const MW = 600;
const MH = 150;
const OH = 36;

export function LensRange({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  points = 72,
  windowSize = 30,
  showDots = true,
  speed = 100,
}: LensRangeProps) {
  const isDark = theme === 'dark';
  const uid = useId().replace(/:/g, '');
  const data = useMemo(() => series(points, { min: 12, max: 96, salt: 611 }), [points]);
  const [win, setWin] = useState<[number, number]>(() => [0.55, Math.min(1, 0.55 + windowSize / 100)]);
  const [prevSize, setPrevSize] = useState(windowSize);
  if (prevSize !== windowSize) {
    setPrevSize(windowSize);
    setWin(([a]) => {
      const w = windowSize / 100;
      const start = Math.min(a, 1 - w);
      return [start, start + w];
    });
  }
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: 'move' | 'l' | 'r'; x: number; win: [number, number] } | null>(null);
  const [dragging, setDragging] = useState(false);

  const n = data.length;
  const i0 = Math.floor(win[0] * (n - 1));
  const i1 = Math.max(i0 + 2, Math.ceil(win[1] * (n - 1)));
  const slice = data.slice(i0, i1 + 1);
  const lo = Math.min(...slice) - 6;
  const hi = Math.max(...slice) + 6;

  // Continuous x so the lens pans smoothly between integer indices.
  const span = (win[1] - win[0]) * (n - 1);
  const mainPts: [number, number][] = slice.map((v, k) => [
    ((i0 + k - win[0] * (n - 1)) / span) * MW,
    10 + (1 - (v - lo) / (hi - lo)) * (MH - 20),
  ]);
  const mainLine = smoothPath(mainPts);
  const overviewPts: [number, number][] = data.map((v, i) => [(i / (n - 1)) * MW, 4 + (1 - v / 100) * (OH - 8)]);
  const overviewLine = smoothPath(overviewPts);

  const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
  const peak = Math.max(...slice);

  function start(mode: 'move' | 'l' | 'r', e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { mode, x: e.clientX, win };
    setDragging(true);
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      const rect = trackRef.current?.getBoundingClientRect();
      if (!d || !rect) return;
      const dx = (ev.clientX - d.x) / rect.width;
      const minW = 6 / (n - 1);
      let [a, b] = d.win;
      if (d.mode === 'move') {
        const w = b - a;
        a = Math.min(1 - w, Math.max(0, a + dx));
        b = a + w;
      } else if (d.mode === 'l') a = Math.min(b - minW, Math.max(0, a + dx));
      else b = Math.max(a + minW, Math.min(1, b + dx));
      setWin([a, b]);
    };
    const up = () => {
      drag.current = null;
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const lineColor = isDark ? color : '#09090B';

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Session Load</div>
          <div className={`text-[10px] font-mono mt-0.5 ${muted}`}>
            Day {String(i0 + 1).padStart(2, '0')} – {String(i1 + 1).padStart(2, '0')}
          </div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className={`text-[10px] ${muted}`}>Avg</div>
            <AnimatedNumber value={avg} decimals={1} className="text-sm font-semibold tabular-nums" />
          </div>
          <div>
            <div className={`text-[10px] ${muted}`}>Peak</div>
            <AnimatedNumber value={peak} className="text-sm font-semibold tabular-nums" style={{ color }} />
          </div>
        </div>
      </div>

      <div className={`relative flex-1 min-h-[100px] rounded-[14px] overflow-hidden ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <svg viewBox={`0 0 ${MW} ${MH}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity={0.28} />
              <stop offset="1" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: bySpeed(0.6, speed) }}>
            <path d={`${mainLine}L${mainPts[mainPts.length - 1][0]},${MH}L${mainPts[0][0]},${MH}Z`} fill={`url(#${uid}-a)`} />
            <path d={mainLine} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </motion.g>
        </svg>
        {showDots && span < 26 &&
          mainPts.map(([x, y], k) =>
            x >= 0 && x <= MW ? (
              <span
                key={i0 + k}
                className="pointer-events-none absolute block h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: `${(x / MW) * 100}%`, top: `${(y / MH) * 100}%`, backgroundColor: lineColor, boxShadow: `0 0 0 2px ${isDark ? '#0a0a0b' : '#f4f4f6'}` }}
              />
            ) : null,
          )}
      </div>

      {/* overview + lens */}
      <div ref={trackRef} className={`relative mt-2 rounded-[10px] overflow-hidden select-none ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`} style={{ height: OH }}>
        <svg viewBox={`0 0 ${MW} ${OH}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path d={overviewLine} fill="none" stroke={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="absolute inset-y-0 left-0" style={{ width: `${win[0] * 100}%`, background: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.6)' }} />
        <div className="absolute inset-y-0 right-0" style={{ width: `${(1 - win[1]) * 100}%`, background: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.6)' }} />
        <motion.div
          role="button"
          aria-label="Pan range"
          onPointerDown={(e) => start('move', e)}
          className={`absolute inset-y-0 touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          animate={{ boxShadow: `inset 0 0 0 ${dragging ? 2 : 1.5}px ${color}` }}
          style={{ left: `${win[0] * 100}%`, width: `${(win[1] - win[0]) * 100}%`, borderRadius: 10, backgroundColor: hexToRgba(color, 0.1) }}
        >
          {(['l', 'r'] as const).map((side) => (
            <span
              key={side}
              role="button"
              aria-label={side === 'l' ? 'Resize start' : 'Resize end'}
              onPointerDown={(e) => start(side, e)}
              className="absolute top-1/2 -translate-y-1/2 flex h-5 w-2.5 items-center justify-center rounded-full cursor-ew-resize"
              style={{ [side === 'l' ? 'left' : 'right']: -5, backgroundColor: color }}
            >
              <span className="block h-2.5 w-px bg-black/50" />
            </span>
          ))}
        </motion.div>
      </div>
    </ChartCard>
  );
}
