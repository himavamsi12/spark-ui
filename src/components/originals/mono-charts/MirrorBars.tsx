"use client";

import React, { useMemo, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { ChartCard, Segmented } from './chartKit';

type Sort = 'delta' | 'current' | 'name';

interface MirrorBarsProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  compareColor?: string;
  rows?: number;
  barHeight?: number;
  showDelta?: boolean;
  speed?: number;
}

const REGIONS = ['Berlin', 'Austin', 'Lagos', 'Seoul', 'Lima', 'Oslo', 'Pune', 'Perth', 'Quito', 'Kyiv'];

export function MirrorBars({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  compareColor = '#a1a1aa',
  rows = 6,
  barHeight = 12,
  showDelta = true,
  speed = 100,
}: MirrorBarsProps) {
  const isDark = theme === 'dark';
  const [sort, setSort] = useState<Sort>('delta');
  const [hover, setHover] = useState<string | null>(null);
  const count = Math.max(3, Math.min(REGIONS.length, rows));

  const data = useMemo(
    () =>
      REGIONS.slice(0, count).map((name, i) => {
        const prev = 30 + seeded(i * 19 + 3) * 60;
        const curr = Math.max(8, Math.min(100, prev + (seeded(i * 23 + 9) - 0.42) * 50));
        return { name, prev, curr, delta: ((curr - prev) / prev) * 100 };
      }),
    [count],
  );

  const sorted = useMemo(() => {
    const list = [...data];
    if (sort === 'delta') list.sort((a, b) => b.delta - a.delta);
    else if (sort === 'current') list.sort((a, b) => b.curr - a.curr);
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [data, sort]);

  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const spring = { type: 'spring' as const, stiffness: 300 * (speed / 100), damping: 30 };

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Regions</span>
          <span className="hidden sm:flex items-center gap-2 text-[10px] font-mono">
            <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: hexToRgba(compareColor, 0.6) }} />2024</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: color }} />2025</span>
          </span>
        </div>
        <Segmented
          id="mirror-bars"
          isDark={isDark}
          color={color}
          value={sort}
          onChange={setSort}
          options={[
            { value: 'delta', label: 'Δ' },
            { value: 'current', label: 'Top' },
            { value: 'name', label: 'A–Z' },
          ]}
        />
      </div>

      <div className={`relative flex-1 min-h-[140px] rounded-[14px] px-3 py-2.5 overflow-hidden flex flex-col justify-center ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <div className={`absolute top-2 bottom-2 left-1/2 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
        <LayoutGroup>
          {sorted.map((r, i) => {
            const dim = hover !== null && hover !== r.name;
            const up = r.delta >= 0;
            return (
              <motion.div
                key={r.name}
                layout="position"
                transition={spring}
                onPointerEnter={() => setHover(r.name)}
                onPointerLeave={() => setHover(null)}
                className="relative grid items-center cursor-default"
                style={{ gridTemplateColumns: '1fr 1fr', height: barHeight + 10, opacity: dim ? 0.4 : 1, transition: 'opacity 200ms' }}
              >
                {/* last year grows leftward from the axis */}
                <div className="relative h-full flex items-center justify-end pr-1.5">
                  <span className={`absolute left-0 text-[10px] ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{r.name}</span>
                  <motion.div
                    className="rounded-full origin-right"
                    style={{ height: barHeight, backgroundColor: hexToRgba(compareColor, isDark ? 0.45 : 0.6) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${r.prev * 0.62}%` }}
                    transition={{ ...spring, delay: bySpeed(i * 0.05, speed) }}
                  />
                </div>
                {/* this year grows rightward */}
                <div className="relative h-full flex items-center pl-1.5">
                  <motion.div
                    className="rounded-full"
                    style={{ height: barHeight, backgroundColor: isDark ? color : '#09090b' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${r.curr * 0.62}%`, boxShadow: hover === r.name ? `0 0 16px ${hexToRgba(color, 0.55)}` : '0 0 0 rgba(0,0,0,0)' }}
                    transition={{ ...spring, delay: bySpeed(i * 0.05 + 0.08, speed) }}
                  />
                  {showDelta && (
                    <motion.span
                      layout="position"
                      className="ml-1.5 text-[10px] font-mono font-semibold tabular-nums"
                      style={{ color: up ? color : isDark ? '#a1a1aa' : '#71717a' }}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: bySpeed(0.4 + i * 0.05, speed) }}
                    >
                      {up ? '+' : ''}
                      {r.delta.toFixed(0)}%
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </LayoutGroup>
      </div>
    </ChartCard>
  );
}
