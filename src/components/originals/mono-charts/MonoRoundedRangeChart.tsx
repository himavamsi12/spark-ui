"use client";

import React, { useId, useMemo } from 'react';
import {
  ResponsiveContainer,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  ComposedChart,
} from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { bySpeed, labels, seeded, series } from './chartData';

interface MonoRoundedRangeChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  points?: number;
  spread?: number;
  curve?: 'monotone' | 'natural' | 'linear';
  strokeWidth?: number;
  fillOpacity?: number;
  showMidline?: boolean;
  speed?: number;
}

export function MonoRoundedRangeChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  points = 5,
  spread = 50,
  curve = 'monotone',
  strokeWidth = 2,
  fillOpacity = 30,
  showMidline = false,
  speed = 100,
}: MonoRoundedRangeChartProps) {
  const isDark = theme === 'dark';
  const idPrefix = useId().replace(/:/g, '');
  const RANGE_DATA = useMemo(() => {
    const mid = series(points, { min: 35, max: 70, salt: 221 });
    return labels(points, 'day').map((day, i) => {
      const half = 5 + (spread / 100) * 25 * (0.6 + seeded(i * 43 + 222) * 0.8);
      const lo = Math.max(0, Math.round(mid[i] - half));
      const hi = Math.min(100, Math.round(mid[i] + half));
      return { day, range: [lo, hi] as [number, number], mid: mid[i] };
    });
  }, [points, spread]);

  return (
    <div
      className={`relative w-full rounded-[24px] transition-all duration-300 group flex flex-col justify-between overflow-hidden p-4 sm:p-5 ${
        compact ? 'h-[220px] sm:h-[268px]' : 'min-h-[290px]'
      } ${
        isDark
          ? 'bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-neutral-100 text-black'
      }`}
    >
      {/* Main Stage */}
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-2 transition-colors duration-300 ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`}>
        <svg className="absolute w-0 h-0 pointer-events-none">
          <defs>
            <linearGradient id={`${idPrefix}range-grad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isDark ? color : "#09090B"} stopOpacity={fillOpacity / 100} />
              <stop offset="100%" stopColor={isDark ? color : "#09090B"} stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
        <ResponsiveContainer width="100%" height={compact ? 130 : 180}>
          <ComposedChart key={`${points}-${curve}`} data={RANGE_DATA} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            <Area
              type={curve}
              dataKey="range"
              name="Band Range"
              stroke={isDark ? color : '#09090B'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={`url(#${idPrefix}range-grad)`}
              animationDuration={bySpeed(800, speed)}
            />
            {showMidline && (
              <Line
                type={curve}
                dataKey="mid"
                name="Midpoint"
                stroke={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(9,9,11,0.5)'}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                animationDuration={bySpeed(1000, speed)}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
