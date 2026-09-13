"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { bySpeed, seeded } from './chartData';
import { hexToRgba } from './colorUtils';

interface MonoRoundedScatterChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  nodes?: number;
  minSize?: number;
  maxSize?: number;
  opacity?: number;
  showGrid?: boolean;
  speed?: number;
}

export function MonoRoundedScatterChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  nodes = 6,
  minSize = 60,
  maxSize = 240,
  opacity = 100,
  showGrid = true,
  speed = 100,
}: MonoRoundedScatterChartProps) {
  const data = useMemo(
    () =>
      Array.from({ length: nodes }, (_, i) => {
        const x = Math.round(5 + seeded(i * 7 + 51) * 90);
        return {
          x,
          y: Math.round(Math.min(98, Math.max(4, x * 0.7 + seeded(i * 13 + 52) * 40 - 10))),
          z: Math.round(100 + seeded(i * 19 + 53) * 500),
          name: `Node ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`,
        };
      }),
    [nodes]
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
      {/* Main Recharts Stage */}
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-2 transition-colors duration-300 ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`}>
        <ResponsiveContainer width="100%" height={compact ? 130 : 180}>
          <ScatterChart key={nodes} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="2 2" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />}
            <XAxis dataKey="x" type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <YAxis dataKey="y" type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <ZAxis dataKey="z" range={[minSize, Math.max(minSize, maxSize)]} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} cursor={{ strokeDasharray: '3 3' }} />

            <Scatter
              name="Cluster Nodes"
              data={data}
              fill={isDark ? hexToRgba(color, opacity / 100) : '#09090B'}
              stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(9,9,11,0.5)'}
              strokeWidth={1.5}
              animationDuration={bySpeed(800, speed)}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
