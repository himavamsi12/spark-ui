"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { bySpeed } from './chartData';
import { hexToRgba } from './colorUtils';

const STAGE_NAMES = ['Visits', 'Signup', 'Onboard', 'Active', 'Trial', 'Pro', 'Team', 'Enterprise'];

interface MonoRoundedFunnelChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  stages?: number;
  retention?: number;
  barHeight?: number;
  radius?: number;
  showPercent?: boolean;
  fade?: boolean;
  speed?: number;
}

export function MonoRoundedFunnelChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  stages = 4,
  retention = 68,
  barHeight = 14,
  radius = 8,
  showPercent = true,
  fade = false,
  speed = 100,
}: MonoRoundedFunnelChartProps) {
  const FUNNEL_DATA = useMemo(
    () => Array.from({ length: stages }, (_, i) => ({ stage: STAGE_NAMES[i], volume: Math.max(1, Math.round(100 * Math.pow(retention / 100, i))) })),
    [stages, retention]
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
          <BarChart key={stages} data={FUNNEL_DATA} layout="vertical" margin={{ top: 8, right: showPercent ? 36 : 12, left: -4, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="stage" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            <Bar
              dataKey="volume"
              name="Volume"
              fill={isDark ? color : '#09090B'}
              radius={[0, radius, radius, 0]}
              barSize={barHeight}
              animationDuration={bySpeed(800, speed)}
            >
              {FUNNEL_DATA.map((d, i) => (
                <Cell key={d.stage} fill={fade ? hexToRgba(color, 1 - (i / Math.max(1, stages)) * 0.7) : isDark ? color : '#09090B'} />
              ))}
              {showPercent && (
                <LabelList dataKey="volume" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10, fill: isDark ? '#a1a1aa' : '#52525b' }} />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
