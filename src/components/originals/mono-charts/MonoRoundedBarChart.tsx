"use client";

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { bySpeed, labels, series } from './chartData';
import { hexToRgba } from './colorUtils';

interface MonoRoundedBarChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  bars?: number;
  barWidth?: number;
  radius?: number;
  showSecondary?: boolean;
  showGrid?: boolean;
  layout?: 'vertical' | 'horizontal';
  speed?: number;
}

export function MonoRoundedBarChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  bars = 6,
  barWidth = 16,
  radius = 8,
  showSecondary = true,
  showGrid = true,
  layout: layoutProp = 'vertical',
  speed = 100,
}: MonoRoundedBarChartProps) {
  const isDark = theme === 'dark';
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>(layoutProp);
  const [prevLayout, setPrevLayout] = useState(layoutProp);
  if (prevLayout !== layoutProp) {
    setPrevLayout(layoutProp);
    setLayout(layoutProp);
  }

  const isHorizontal = layout === 'horizontal';
  const data = useMemo(() => {
    const primary = series(bars, { min: 40, max: 96, salt: 1 });
    const secondary = series(bars, { min: 18, max: 55, salt: 2 });
    return labels(bars, 'day').map((label, i) => ({ label, primary: primary[i], secondary: secondary[i] }));
  }, [bars]);

  const size = isHorizontal ? Math.max(6, barWidth - 4) : barWidth;
  const corners: [number, number, number, number] = isHorizontal ? [0, radius, radius, 0] : [radius, radius, radius, radius];

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
          {(['vertical', 'horizontal'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLayout(l)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                layout === l
                  ? 'font-semibold shadow-sm text-void'
                  : isDark
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-600 hover:text-black'
              }`}
              style={layout === l ? { backgroundColor: color } : undefined}
            >
              {l === 'vertical' ? 'Col' : 'Row'}
            </button>
          ))}
        </div>
      </div>

      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-2 transition-colors duration-300 ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <ResponsiveContainer width="100%" height={compact ? 130 : 180}>
          <BarChart
            key={`${bars}-${layout}`}
            data={data}
            layout={isHorizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 12, right: 12, left: isHorizontal ? 0 : -22, bottom: 0 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="2 2"
                vertical={isHorizontal}
                horizontal={!isHorizontal}
                stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
              />
            )}
            {isHorizontal ? (
              <>
                <XAxis type="number" hide />
                <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={34} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
              </>
            )}
            <Tooltip cursor={{ fill: hexToRgba(color, 0.06) }} content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />

            <Bar
              dataKey="primary"
              name="Primary Output"
              fill={isDark ? color : '#09090B'}
              radius={corners}
              barSize={size}
              animationDuration={bySpeed(800, speed)}
            />
            {showSecondary && (
              <Bar
                dataKey="secondary"
                name="Secondary Output"
                fill={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
                radius={corners}
                barSize={size}
                animationDuration={bySpeed(1000, speed)}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
