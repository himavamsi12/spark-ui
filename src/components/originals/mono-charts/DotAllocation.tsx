"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { AnimatedNumber, ChartCard, Segmented } from './chartKit';

type Period = 'q1' | 'q2' | 'q3' | 'q4';

interface DotAllocationProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  categories?: number;
  columns?: number;
  rows?: number;
  shape?: 'circle' | 'square';
  speed?: number;
}

const NAMES = ['Equities', 'Bonds', 'Cash', 'Crypto', 'Real estate'];
const SHADES = [1, 0.62, 0.36, 0.2, 0.1];

function shares(categories: number, period: Period) {
  const salt = { q1: 1, q2: 2, q3: 3, q4: 4 }[period];
  const raw = Array.from({ length: categories }, (_, i) => 0.4 + seeded(salt * 41 + i * 9) * (categories - i));
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => r / total);
}

export function DotAllocation({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  categories = 4,
  columns = 20,
  rows = 5,
  shape = 'circle',
  speed = 100,
}: DotAllocationProps) {
  const isDark = theme === 'dark';
  const [period, setPeriod] = useState<Period>('q3');
  const [hover, setHover] = useState<number | null>(null);
  const cats = Math.max(2, Math.min(5, categories));
  const total = columns * rows;

  const share = useMemo(() => shares(cats, period), [cats, period]);
  // Largest-remainder rounding so the dots always add up to the grid.
  const counts = useMemo(() => {
    const exact = share.map((s) => s * total);
    const base = exact.map(Math.floor);
    const left = total - base.reduce((a, b) => a + b, 0);
    const order = exact.map((e, i) => [e - Math.floor(e), i] as const).sort((a, b) => b[0] - a[0]);
    for (let k = 0; k < left; k++) base[order[k % order.length][1]] += 1;
    return base;
  }, [share, total]);

  const owner = useMemo(() => {
    const out: number[] = [];
    counts.forEach((c, i) => {
      for (let k = 0; k < c; k++) out.push(i);
    });
    return out;
  }, [counts]);

  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const shade = (i: number) => (isDark ? hexToRgba(color, SHADES[i]) : hexToRgba('#09090b', SHADES[i] * 0.9 + 0.05));

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Allocation</span>
        <Segmented
          id="dot-allocation"
          isDark={isDark}
          color={color}
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'q1', label: 'Q1' },
            { value: 'q2', label: 'Q2' },
            { value: 'q3', label: 'Q3' },
            { value: 'q4', label: 'Q4' },
          ]}
        />
      </div>

      <div className={`relative flex-1 min-h-[140px] rounded-[14px] p-3 flex flex-col gap-3 ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <div className="grid flex-1 content-center" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 4 }}>
          {owner.map((cat, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const dim = hover !== null && hover !== cat;
            return (
              <motion.span
                key={i}
                className="block aspect-square w-full"
                style={{ borderRadius: shape === 'circle' ? 999 : 3 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: dim ? 0.55 : 1, opacity: dim ? 0.35 : 1, backgroundColor: shade(cat) }}
                transition={{
                  // a diagonal wave sweeps the grid whenever the mix changes
                  backgroundColor: { duration: bySpeed(0.35, speed), delay: bySpeed((col + row) * 0.018, speed) },
                  scale: { type: 'spring', stiffness: 380, damping: 22, delay: hover === null ? bySpeed((col + row) * 0.012, speed) : 0 },
                  opacity: { duration: 0.2 },
                }}
                onPointerEnter={() => setHover(cat)}
                onPointerLeave={() => setHover(null)}
              />
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {counts.map((c, i) => (
            <button
              key={i}
              type="button"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              className="flex items-center gap-1.5 text-[11px] cursor-pointer"
              style={{ opacity: hover !== null && hover !== i ? 0.45 : 1, transition: 'opacity 200ms' }}
            >
              <span className="h-2 w-2" style={{ backgroundColor: shade(i), borderRadius: shape === 'circle' ? 999 : 2 }} />
              <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>{NAMES[i]}</span>
              <AnimatedNumber value={(c / total) * 100} decimals={0} suffix="%" className="font-mono tabular-nums" />
            </button>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
