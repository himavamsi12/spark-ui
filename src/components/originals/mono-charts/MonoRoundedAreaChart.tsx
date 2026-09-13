"use client";

import React, { useId, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { bySpeed, labels, series } from './chartData';

interface MonoRoundedAreaChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  points?: number;
  strokeWidth?: number;
  fillOpacity?: number;
  curve?: 'monotone' | 'natural';
  showGrid?: boolean;
  speed?: number;
}

export function MonoRoundedAreaChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  points = 6,
  strokeWidth = 2.5,
  fillOpacity = 35,
  curve: curveProp = 'monotone',
  showGrid = true,
  speed = 100,
}: MonoRoundedAreaChartProps) {
  const isDark = theme === 'dark';
  const idPrefix = useId().replace(/:/g, '');
  const [curve, setCurve] = useState<'monotone' | 'natural'>(curveProp);
  const [prevCurve, setPrevCurve] = useState(curveProp);
  if (prevCurve !== curveProp) {
    setPrevCurve(curveProp);
    setCurve(curveProp);
  }
  const data = useMemo(() => {
    const v = series(points, { min: 15, max: 92, salt: 21 });
    return labels(points, 'hour').map((time, i) => ({ time, volume: v[i] }));
  }, [points]);

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
      {/* Header */}
      <div className="flex items-center justify-end mb-2">
        {/* Curve Toggle */}
        <div className={`p-0.5 rounded-full border flex items-center gap-0.5 ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-neutral-100 border-neutral-200'
        }`}>
          {(['monotone', 'natural'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurve(c)}
              style={curve === c ? { backgroundColor: color } : undefined}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize transition-all cursor-pointer ${
                curve === c
                  ? 'text-void font-semibold shadow-sm'
                  : isDark
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Main Recharts Stage */}
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-2 transition-colors duration-300 ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`}>
        <svg className="absolute w-0 h-0 pointer-events-none">
          <defs>
            <linearGradient id={`${idPrefix}mono-area-gradient`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isDark ? color : "#09090B"} stopOpacity={fillOpacity / 100} />
              <stop offset="100%" stopColor={isDark ? color : "#09090B"} stopOpacity="0.0" />
            </linearGradient>
          </defs>
        </svg>

        <ResponsiveContainer width="100%" height={compact ? 130 : 180}>
          <AreaChart key={`${points}-${curve}`} data={data} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            {showGrid && (
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
            )}
            <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />

            {/* Mono Rounded Area Fill */}
            <Area
              type={curve}
              dataKey="volume"
              name="Volume Flow"
              stroke={isDark ? color : '#09090B'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={`url(#${idPrefix}mono-area-gradient)`}
              animationDuration={bySpeed(900, speed)}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
