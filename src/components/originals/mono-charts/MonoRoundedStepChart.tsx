"use client";

import React, { useMemo } from 'react';
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

interface MonoRoundedStepChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  steps?: number;
  strokeWidth?: number;
  stepType?: 'stepAfter' | 'stepBefore' | 'step';
  showDots?: boolean;
  showGrid?: boolean;
  speed?: number;
}

export function MonoRoundedStepChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  steps = 6,
  strokeWidth = 3,
  stepType = 'stepAfter',
  showDots = true,
  showGrid = true,
  speed = 100,
}: MonoRoundedStepChartProps) {
  const isDark = theme === 'dark';
  const STEP_DATA = useMemo(() => {
    const lv = series(steps, { min: 15, max: 95, salt: 111 });
    return labels(steps, 'index').map((step, i) => ({ step, level: lv[i] }));
  }, [steps]);

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
          <LineChart key={`${steps}-${stepType}`} data={STEP_DATA} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />}
            <XAxis dataKey="step" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            <Line
              type={stepType}
              dataKey="level"
              name="Level"
              stroke={isDark ? color : '#09090B'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={showDots ? { r: strokeWidth + 1, fill: isDark ? color : '#09090B' } : false}
              animationDuration={bySpeed(800, speed)}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
