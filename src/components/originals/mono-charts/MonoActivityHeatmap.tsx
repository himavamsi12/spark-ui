"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from './cn';
import { bySpeed } from './chartData';

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type Contribution = {
  date: string;
  count: number;
  level: ContributionLevel;
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

interface MonoActivityHeatmapProps {
  theme?: 'dark' | 'light';
  color?: string;
  compact?: boolean;
  weeks?: number;
  cellHeight?: number;
  gap?: number;
  radius?: number;
  density?: number;
  showMonths?: boolean;
  speed?: number;
}

// Deterministic PRNG (mulberry32) seeded by cell index, so server and
// client render the exact same demo data and avoid a hydration mismatch.
function seededRandom(seed: number) {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function generateDemoContributions(weeks: number, density: number): Contribution[] {
  const today = new Date();
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (weeks * 7 - 1 - i));

    const rand = seededRandom(i);
    let level: ContributionLevel = 0;
    let count = 0;

    if (rand > 1 - density / 100) {
      level = Math.floor(seededRandom(i + 1000) * 4 + 1) as ContributionLevel;
      count = level * 3 + Math.floor(seededRandom(i + 2000) * 4);
    }

    return {
      date: date.toISOString().slice(0, 10),
      count,
      level,
    };
  });
}

function toWeeks(contributions: Contribution[]) {
  const weeks: Contribution[][] = [];
  for (let i = 0; i < contributions.length; i += 7) {
    weeks.push(contributions.slice(i, i + 7));
  }
  return weeks;
}

export function MonoActivityHeatmap({
  theme = 'dark',
  color = '#39d353',
  compact = false,
  weeks: weekCount = 20,
  cellHeight = 12,
  gap = 6,
  radius = 3,
  density = 65,
  showMonths = true,
  speed = 100,
}: MonoActivityHeatmapProps) {
  const isDark = theme === 'dark';
  const [hoveredDay, setHoveredDay] = useState<Contribution | null>(null);

  const demoData = useMemo(() => generateDemoContributions(weekCount, density), [weekCount, density]);
  const weeks = useMemo(() => toWeeks(demoData), [demoData]);

  const opacityForLevel = (lvl: ContributionLevel) => {
    switch (lvl) {
      case 0: return isDark ? 0.06 : 0.08;
      case 1: return 0.3;
      case 2: return 0.55;
      case 3: return 0.8;
      case 4: return 1;
    }
  };

  return (
    <div
      className={cn(
        'relative w-full rounded-[24px] transition-all duration-300 group flex flex-col justify-between overflow-hidden p-4 sm:p-5 font-sans',
        compact ? 'h-[220px] sm:h-[268px]' : 'min-h-[290px]',
        isDark
          ? 'bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] text-white'
          : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-neutral-100 text-black'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono border"
              style={{ backgroundColor: `${color}33`, borderColor: `${color}66`, color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              Custom
            </span>
          </div>
        </div>
      </div>

      {/* Main Heatmap Stage Grid (No list drawer animation!) */}
      <div className={cn(
        'relative w-full flex-1 rounded-[14px] overflow-hidden p-3 transition-colors duration-300 flex flex-col justify-center items-center',
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      )}>
        {/* Month Headers */}
        {showMonths && (
        <div className="flex justify-center gap-1.5 mb-1.5 w-full">
          {MONTH_NAMES.slice(0, Math.max(1, Math.round(weekCount / 4.3))).map((m, idx) => (
            <span key={idx} className={`text-[10px] font-mono flex-1 text-center ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {m}
            </span>
          ))}
        </div>
        )}

        <div className="flex justify-center w-full overflow-hidden" style={{ gap }} onMouseLeave={() => setHoveredDay(null)}>
          {weeks.map((week, wIdx) => (
            <div key={`${weekCount}-${wIdx}`} className="flex flex-col flex-1 items-center" style={{ gap }}>
              {week.map((day, dIdx) => (
                <motion.div
                  key={`${wIdx}-${dIdx}`}
                  onMouseEnter={() => setHoveredDay(day)}
                  className="w-full cursor-pointer"
                  style={{ height: cellHeight, borderRadius: radius, backgroundColor: color }}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: opacityForLevel(day.level), scale: 1 }}
                  whileHover={{ scale: 1.35 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22, delay: bySpeed((wIdx + dIdx) * 0.012, speed) }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Active Cell Tooltip Callout */}
        <div className="h-5 mt-2 flex items-center justify-center">
          {hoveredDay ? (
            <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              {hoveredDay.count} {hoveredDay.count === 1 ? 'item' : 'items'} on {hoveredDay.date}
            </span>
          ) : (
            <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Hover tiles for metrics
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
