"use client";

import React, { useId, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { bySpeed, labels, series } from './chartData';

interface MonoRoundedStreamChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  points?: number;
  layers?: number;
  curve?: 'natural' | 'monotone' | 'linear';
  strokeWidth?: number;
  fillOpacity?: number;
  stacked?: boolean;
  speed?: number;
}

export function MonoRoundedStreamChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  points = 6,
  layers = 2,
  curve = 'natural',
  strokeWidth = 2,
  fillOpacity = 40,
  stacked = false,
  speed = 100,
}: MonoRoundedStreamChartProps) {
  const isDark = theme === 'dark';
  const idPrefix = useId().replace(/:/g, '');
  const STREAM_DATA = useMemo(() => {
    const cols = Array.from({ length: layers }, (_, l) => series(points, { min: 12, max: 85 - l * 10, salt: 201 + l }));
    return labels(points, 'index').map((t, i) => {
      const row: Record<string, string | number> = { t };
      cols.forEach((c, l) => (row[`w${l}`] = c[i]));
      return row;
    });
  }, [points, layers]);

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
            {Array.from({ length: layers }, (_, l) => (
              <linearGradient key={l} id={`${idPrefix}stream-g${l}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDark ? color : '#09090B'} stopOpacity={(fillOpacity / 100) * (1 - l / (layers + 1))} />
                <stop offset="100%" stopColor={isDark ? color : '#09090B'} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
        </svg>
        <ResponsiveContainer width="100%" height={compact ? 130 : 180}>
          <AreaChart key={`${points}-${layers}-${stacked}`} data={STREAM_DATA} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            <XAxis dataKey="t" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            {Array.from({ length: layers }, (_, l) => (
              <Area
                key={l}
                type={curve}
                dataKey={`w${l}`}
                name={`Wave ${l + 1}`}
                stackId={stacked ? 'stream' : undefined}
                stroke={l === 0 ? (isDark ? color : '#09090B') : isDark ? `rgba(161,161,170,${1 - l * 0.2})` : '#52525B'}
                strokeWidth={Math.max(1, strokeWidth - l * 0.4)}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={`url(#${idPrefix}stream-g${l})`}
                animationDuration={bySpeed(800 + l * 120, speed)}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
