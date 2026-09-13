"use client";

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { bySpeed, labels, series } from './chartData';

interface MonoRoundedLineChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  points?: number;
  strokeWidth?: number;
  curve?: 'monotone' | 'natural' | 'linear' | 'step';
  showDots?: boolean;
  showBaseline?: boolean;
  showGrid?: boolean;
  speed?: number;
}

export function MonoRoundedLineChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  points = 6,
  strokeWidth = 3,
  curve = 'monotone',
  showDots = true,
  showBaseline = true,
  showGrid = true,
  speed = 100,
}: MonoRoundedLineChartProps) {
  const isDark = theme === 'dark';
  const [activeSeries, setActiveSeries] = useState<'value' | 'all'>(showBaseline ? 'all' : 'value');
  const [prevBaseline, setPrevBaseline] = useState(showBaseline);
  if (prevBaseline !== showBaseline) {
    setPrevBaseline(showBaseline);
    setActiveSeries(showBaseline ? 'all' : 'value');
  }

  const data = useMemo(() => {
    const value = series(points, { min: 20, max: 92, salt: 11 });
    const secondary = series(points, { min: 12, max: 65, salt: 12 });
    return labels(points, 'month').map((label, i) => ({ label, value: value[i], secondary: secondary[i] }));
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
      <div className="flex items-center justify-end mb-2">
        <div className={`p-0.5 rounded-full border flex items-center gap-0.5 ${isDark ? 'bg-white/5 border-white/10' : 'bg-neutral-100 border-neutral-200'}`}>
          {(['all', 'value'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveSeries(s)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                activeSeries === s ? 'font-semibold shadow-sm text-void' : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
              }`}
              style={activeSeries === s ? { backgroundColor: color } : undefined}
            >
              {s === 'all' ? 'Dual' : 'Single'}
            </button>
          ))}
        </div>
      </div>

      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-2 transition-colors duration-300 ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <ResponsiveContainer width="100%" height={compact ? 130 : 180}>
          <LineChart key={`${points}-${curve}`} data={data} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />}
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />

            {activeSeries === 'all' && (
              <Line
                type={curve}
                dataKey="secondary"
                name="Baseline"
                stroke={isDark ? '#52525B' : '#A1A1AA'}
                strokeWidth={Math.max(1, strokeWidth - 1)}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 4"
                dot={false}
                animationDuration={bySpeed(900, speed)}
              />
            )}

            <Line
              type={curve}
              dataKey="value"
              name="Active"
              stroke={isDark ? color : '#09090B'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={showDots ? { r: strokeWidth + 1, fill: isDark ? color : '#09090B', stroke: isDark ? 'var(--panel)' : '#FFFFFF', strokeWidth: 2 } : false}
              activeDot={{ r: strokeWidth + 3, fill: isDark ? color : '#09090B', stroke: isDark ? '#A1A1AA' : '#52525B', strokeWidth: 2 }}
              animationDuration={bySpeed(800, speed)}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
