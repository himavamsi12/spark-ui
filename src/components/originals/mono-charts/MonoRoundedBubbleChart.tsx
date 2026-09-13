"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
} from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { bySpeed, seeded } from './chartData';
import { hexToRgba } from './colorUtils';

interface MonoRoundedBubbleChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  bubbles?: number;
  minSize?: number;
  maxSize?: number;
  fillOpacity?: number;
  strokeWidth?: number;
  speed?: number;
}

export function MonoRoundedBubbleChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  bubbles = 4,
  minSize = 100,
  maxSize = 500,
  fillOpacity = 20,
  strokeWidth = 2,
  speed = 100,
}: MonoRoundedBubbleChartProps) {
  const BUBBLE_DATA = useMemo(
    () =>
      Array.from({ length: bubbles }, (_, i) => ({
        x: Math.round(8 + seeded(i * 17 + 181) * 86),
        y: Math.round(10 + seeded(i * 23 + 182) * 80),
        z: Math.round(200 + seeded(i * 29 + 183) * 600),
        tag: `Cluster ${i + 1}`,
      })),
    [bubbles]
  );

  const isDark = theme === 'dark';

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
          <ScatterChart key={bubbles} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            <XAxis dataKey="x" type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <YAxis dataKey="y" type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <ZAxis dataKey="z" range={[minSize, Math.max(minSize, maxSize)]} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            <Scatter
              name="Clusters"
              data={BUBBLE_DATA}
              fill={isDark ? hexToRgba(color, fillOpacity / 100) : `rgba(9,9,11,${fillOpacity / 100})`}
              stroke={isDark ? color : '#09090B'}
              strokeWidth={strokeWidth}
              animationDuration={bySpeed(800, speed)}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
