"use client";

import React, { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, series } from './chartData';

interface MorphViewsProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  points?: number;
  mode?: 'Bars' | 'Dots' | 'Area';
  dotSize?: number;
  strokeWidth?: number;
  speed?: number;
}

const MODES = ['Bars', 'Dots', 'Area'] as const;
type Mode = (typeof MODES)[number];

const W = 320;
const H = 150;
const BASE = 138;

type Pt = { x: number; y: number };

function geometry(data: number[]) {
  const slot = W / data.length;
  const pts = data.map((v, i) => ({ x: slot * i + slot / 2, y: BASE - (v / 100) * 120 }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  return { slot, pts, line, area: `${line} L${pts[pts.length - 1].x} ${BASE} L${pts[0].x} ${BASE} Z` };
}

function shapeFor(mode: Mode, p: Pt, slot: number, dotSize: number) {
  if (mode === 'Bars') {
    const w = slot * 0.52;
    return { x: p.x - w / 2, y: p.y, width: w, height: BASE - p.y, rx: w / 2 };
  }
  if (mode === 'Dots') {
    return { x: p.x - dotSize / 2, y: p.y - dotSize / 2, width: dotSize, height: dotSize, rx: dotSize / 2 };
  }
  return { x: p.x - 1, y: p.y, width: 2, height: BASE - p.y, rx: 1 };
}

export function MorphViews({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  points = 8,
  mode: modeProp = 'Bars',
  dotSize = 12,
  strokeWidth = 2,
  speed = 100,
}: MorphViewsProps) {
  const isDark = theme === 'dark';
  const gradId = `morph-grad-${useId().replace(/:/g, '')}`;
  const [mode, setMode] = useState<Mode>(modeProp);
  const [prevMode, setPrevMode] = useState(modeProp);
  if (prevMode !== modeProp) {
    setPrevMode(modeProp);
    setMode(modeProp);
  }
  const DATA = useMemo(() => series(points, { min: 30, max: 95, salt: 461 }), [points]);
  const { slot: SLOT, pts: PTS, line: LINE, area: AREA } = useMemo(() => geometry(DATA), [DATA]);
  const spring = { type: 'spring' as const, stiffness: 170 * (speed / 100), damping: 20 };
  const [hover, setHover] = useState<number | null>(null);

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
      <div className="flex items-center justify-end mb-3">
        <div className={`p-0.5 rounded-full border flex items-center gap-0.5 ${isDark ? 'bg-white/5 border-white/10' : 'bg-neutral-100 border-neutral-200'}`}>
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`relative px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                mode === m ? 'text-void' : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
              }`}
            >
              {mode === m && (
                <motion.span
                  layoutId="morph-views-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: color }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{m}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`relative w-full flex-1 min-h-[180px] rounded-[14px] overflow-hidden p-3 flex items-center ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          <line x1={0} x2={W} y1={BASE} y2={BASE} stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />

          <AnimatePresence>
            {mode === 'Area' && (
              <motion.path
                key={`area-${points}`}
                d={AREA}
                fill={`url(#${gradId})`}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }}
                transition={{ duration: bySpeed(0.5, speed), ease: [0.22, 1, 0.36, 1] }}
                style={{ originY: 1 }}
              />
            )}
            {mode !== 'Bars' && (
              <motion.path
                key={`line-${points}`}
                d={LINE}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: mode === 'Dots' ? 0.45 : 1 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: bySpeed(0.7, speed), ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </AnimatePresence>

          {DATA.map((v, i) => {
            const shape = shapeFor(mode, PTS[i], SLOT, dotSize);
            const isHover = hover === i;
            return (
              <g key={`${points}-${i}`} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} className="cursor-pointer">
                <rect x={SLOT * i} y={0} width={SLOT} height={H} fill="transparent" />
                <motion.rect
                  initial={{ ...shapeFor('Bars', PTS[i], SLOT, dotSize), height: 0, y: BASE }}
                  animate={{ ...shape, opacity: hover !== null && !isHover ? 0.4 : 1 }}
                  transition={{ ...spring, delay: bySpeed(i * 0.03, speed) }}
                  fill={mode === 'Area' ? color : hexToRgba(color, isHover ? 1 : 0.85)}
                />
                <AnimatePresence>
                  {isHover && (
                    <motion.text
                      x={PTS[i].x}
                      textAnchor="middle"
                      fontSize={10}
                      className="font-mono"
                      fill={isDark ? '#ffffff' : '#09090B'}
                      initial={{ opacity: 0, y: PTS[i].y - 6 }}
                      animate={{ opacity: 1, y: PTS[i].y - 12 }}
                      exit={{ opacity: 0, y: PTS[i].y - 6 }}
                      transition={{ duration: 0.2 }}
                    >
                      {v}
                    </motion.text>
                  )}
                </AnimatePresence>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
