"use client";

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { bySpeed, labels, series } from './chartData';
import { hexToRgba } from './colorUtils';

interface MonoRoundedComposedChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  periods?: number;
  barWidth?: number;
  radius?: number;
  lineWidth?: number;
  showLine?: boolean;
  tintBars?: boolean;
  showGrid?: boolean;
  speed?: number;
}

export function MonoRoundedComposedChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  periods = 4,
  barWidth = 20,
  radius = 8,
  lineWidth = 3,
  showLine: showLineProp = true,
  tintBars = false,
  showGrid = true,
  speed = 100,
}: MonoRoundedComposedChartProps) {
  const isDark = theme === 'dark';
  const [showLine, setShowLine] = useState<boolean>(showLineProp);
  const [prevShowLine, setPrevShowLine] = useState(showLineProp);
  if (prevShowLine !== showLineProp) {
    setPrevShowLine(showLineProp);
    setShowLine(showLineProp);
  }
  const data = useMemo(() => {
    const count = series(periods, { min: 120, max: 360, salt: 41 });
    return labels(periods, 'quarter').map((label, i) => ({
      label: periods > 4 ? `${label}·${Math.floor(i / 4) + 1}` : label,
      count: count[i],
      trend: Math.round(count[i] * 0.92),
    }));
  }, [periods]);

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
        {/* Toggle Line Layer */}
        <button
          type="button"
          onClick={() => setShowLine(!showLine)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
            showLine
              ? isDark
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-neutral-100 text-black border-neutral-300'
              : isDark
              ? 'bg-transparent border-white/5 text-neutral-500'
              : 'bg-transparent border-neutral-200 text-neutral-400'
          }`}
        >
          {showLine ? 'Spline On' : 'Spline Off'}
        </button>
      </div>

      {/* Main Recharts Stage */}
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-2 transition-colors duration-300 ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`}>
        <ResponsiveContainer width="100%" height={compact ? 130 : 180}>
          <ComposedChart key={periods} data={data} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            {showGrid && (
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
            )}
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />

            {/* Rounded Pill Bar Column */}
            <Bar
              dataKey="count"
              name="Quarter Count"
              fill={tintBars ? hexToRgba(color, 0.3) : isDark ? 'rgba(255,255,255,0.18)' : 'rgba(9,9,11,0.12)'}
              stroke={tintBars ? hexToRgba(color, 0.6) : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(9,9,11,0.3)'}
              strokeWidth={1}
              radius={[radius, radius, radius, radius]}
              barSize={barWidth}
              animationDuration={bySpeed(800, speed)}
            />

            {/* Smooth Spline Overlay */}
            {showLine && (
              <Line
                type="monotone"
                dataKey="trend"
                name="Quarter Trend"
                stroke={isDark ? color : '#09090B'}
                strokeWidth={lineWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{
                  r: lineWidth + 1,
                  fill: isDark ? color : '#09090B',
                  stroke: isDark ? 'var(--panel)' : '#FFFFFF',
                  strokeWidth: 2,
                }}
                animationDuration={bySpeed(900, speed)}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
