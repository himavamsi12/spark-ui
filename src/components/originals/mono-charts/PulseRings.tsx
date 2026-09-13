"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { AnimatedNumber, ChartCard } from './chartKit';

interface PulseRingsProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  secondColor?: string;
  thirdColor?: string;
  rings?: number;
  thickness?: number;
  ringGap?: number;
  showLegend?: boolean;
  speed?: number;
}

const NAMES = ['Move', 'Focus', 'Sleep', 'Water', 'Steps'];
const UNITS = ['kcal', 'min', 'hrs', 'L', 'k'];
const GOALS = [620, 90, 8, 3, 10];

export function PulseRings({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  secondColor = '#7dd3fc',
  thirdColor = '#c4f36b',
  rings = 3,
  thickness = 14,
  ringGap = 5,
  showLegend = true,
  speed = 100,
}: PulseRingsProps) {
  const isDark = theme === 'dark';
  const [round, setRound] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const palette = [color, secondColor, thirdColor, hexToRgba(color, 0.55), hexToRgba(secondColor, 0.55)];
  const count = Math.max(1, Math.min(5, rings));

  const values = useMemo(
    () => Array.from({ length: count }, (_, i) => 0.35 + seeded(round * 31 + i * 7 + 11) * 0.8),
    [count, round],
  );

  const size = 200;
  const c = size / 2;
  const outer = c - thickness / 2 - 4;

  const focus = hover ?? 0;
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Daily Goals</span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => setRound((r) => r + 1)}
          className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border cursor-pointer ${
            isDark ? 'border-white/10 bg-white/5 text-neutral-300 hover:text-white' : 'border-neutral-200 bg-neutral-100 text-neutral-600'
          }`}
        >
          Next day
        </motion.button>
      </div>

      <div className={`relative flex-1 min-h-[150px] rounded-[14px] flex items-center gap-4 px-3 ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <div className="relative h-full aspect-square max-h-[180px] min-h-[130px] shrink-0">
          <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full -rotate-90">
            {values.map((v, i) => {
              const r = outer - i * (thickness + ringGap);
              if (r < thickness) return null;
              const circ = 2 * Math.PI * r;
              const main = Math.min(v, 1);
              const over = Math.max(0, v - 1);
              const tint = palette[i];
              const dim = hover !== null && hover !== i;
              return (
                <g
                  key={i}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  className="cursor-pointer"
                  style={{ opacity: dim ? 0.35 : 1, transition: 'opacity 200ms' }}
                >
                  <circle cx={c} cy={c} r={r} fill="none" stroke={typeof tint === 'string' && tint.startsWith('#') ? hexToRgba(tint, 0.14) : tint} strokeWidth={thickness} />
                  <motion.circle
                    cx={c}
                    cy={c}
                    r={r}
                    fill="none"
                    stroke={tint}
                    strokeWidth={hover === i ? thickness + 3 : thickness}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ * (1 - main) }}
                    transition={{ type: 'spring', stiffness: 60 * (speed / 100), damping: 16, delay: bySpeed(i * 0.12, speed) }}
                  />
                  {over > 0 && (
                    <motion.circle
                      cx={c}
                      cy={c}
                      r={r}
                      fill="none"
                      stroke={tint}
                      strokeWidth={thickness}
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      style={{ filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.6))' }}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ * (1 - over) }}
                      transition={{ type: 'spring', stiffness: 60 * (speed / 100), damping: 16, delay: bySpeed(0.6 + i * 0.12, speed) }}
                    />
                  )}
                </g>
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <AnimatedNumber value={Math.round(values[focus] * 100)} suffix="%" className="text-xl font-semibold tabular-nums" />
            <motion.span key={focus} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`text-[10px] font-mono ${muted}`}>
              {NAMES[focus]}
            </motion.span>
          </div>
        </div>

        {showLegend && (
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {values.map((v, i) => (
              <div
                key={i}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                className="cursor-pointer"
                style={{ opacity: hover !== null && hover !== i ? 0.45 : 1, transition: 'opacity 200ms' }}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette[i] }} />
                    <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>{NAMES[i]}</span>
                  </span>
                  <span className="font-mono tabular-nums">
                    <AnimatedNumber value={v * GOALS[i]} decimals={GOALS[i] < 20 ? 1 : 0} />
                    <span className={muted}> / {GOALS[i]}{UNITS[i]}</span>
                  </span>
                </div>
                <div className={`mt-1 h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: palette[i] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(1, v) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 80 * (speed / 100), damping: 18 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
