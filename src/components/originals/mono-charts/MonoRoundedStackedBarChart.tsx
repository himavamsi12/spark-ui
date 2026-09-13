"use client";

import React, { useMemo } from 'react';
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

const LAYER_NAMES = ['Base', 'Mid', 'Upper', 'Peak', 'Top'];

interface MonoRoundedStackedBarChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  groups?: number;
  layers?: number;
  barWidth?: number;
  radius?: number;
  tintLayers?: boolean;
  showGrid?: boolean;
  speed?: number;
}

export function MonoRoundedStackedBarChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  groups = 4,
  layers = 3,
  barWidth = 18,
  radius = 8,
  tintLayers = false,
  showGrid = true,
  speed = 100,
}: MonoRoundedStackedBarChartProps) {
  const isDark = theme === 'dark';
  const STACKED_DATA = useMemo(() => {
    const cols = Array.from({ length: layers }, (_, l) => series(groups, { min: 15, max: 60 - l * 8, salt: 121 + l }));
    return labels(groups, 'quarter').map((label, i) => {
      const row: Record<string, string | number> = { label: groups > 4 ? `${label}·${Math.floor(i / 4) + 1}` : label };
      cols.forEach((c, l) => (row[`layer${l}`] = c[i]));
      return row;
    });
  }, [groups, layers]);

  const fillFor = (l: number) => {
    if (l === 0) return isDark ? color : '#09090B';
    const alpha = 0.6 - (l / layers) * 0.45;
    return tintLayers ? hexToRgba(color, alpha) : isDark ? `rgba(255,255,255,${alpha})` : `rgba(9,9,11,${alpha})`;
  };

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
        <ResponsiveContainer width="100%" height={compact ? 130 : 180}>
          <BarChart key={`${groups}-${layers}`} data={STACKED_DATA} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="2 2" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />}
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            {Array.from({ length: layers }, (_, l) => (
              <Bar
                key={l}
                dataKey={`layer${l}`}
                name={LAYER_NAMES[l]}
                stackId="a"
                fill={fillFor(l)}
                barSize={barWidth}
                radius={l === layers - 1 ? [radius, radius, 0, 0] : l === 0 ? [0, 0, radius, radius] : [0, 0, 0, 0]}
                animationDuration={bySpeed(600 + l * 150, speed)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
