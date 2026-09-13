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
  CartesianGrid,
} from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { bySpeed, seeded } from './chartData';

const STEP_NAMES = ['Inflow', 'Refunds', 'Upsell', 'Churn', 'Fees', 'Renewals', 'Tax', 'Bonus', 'Costs', 'Grants', 'Returns'];

interface MonoRoundedWaterfallChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  lossColor?: string;
  changes?: number;
  barWidth?: number;
  radius?: number;
  showTotal?: boolean;
  showGrid?: boolean;
  speed?: number;
}

export function MonoRoundedWaterfallChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  lossColor = '#71717a',
  changes = 2,
  barWidth = 18,
  radius = 6,
  showTotal = true,
  showGrid = false,
  speed = 100,
}: MonoRoundedWaterfallChartProps) {
  const isDark = theme === 'dark';
  const WATERFALL_DATA = useMemo(() => {
    const rows: { step: string; base: number; delta: number; kind: 'start' | 'gain' | 'loss' | 'total' }[] = [];
    let running = 50;
    rows.push({ step: 'Start', base: 0, delta: running, kind: 'start' });
    for (let i = 0; i < changes; i++) {
      const up = seeded(i * 37 + 211) > 0.35;
      const size = Math.round(8 + seeded(i * 41 + 212) * 25);
      const change = up ? size : -Math.min(size, running - 5);
      const next = running + change;
      rows.push({ step: STEP_NAMES[i], base: Math.min(running, next), delta: Math.abs(change), kind: change >= 0 ? 'gain' : 'loss' });
      running = next;
    }
    if (showTotal) rows.push({ step: 'Net', base: 0, delta: running, kind: 'total' });
    return rows;
  }, [changes, showTotal]);

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
          <BarChart key={`${changes}-${showTotal}`} data={WATERFALL_DATA} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="2 2" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />}
            <XAxis dataKey="step" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
            <Bar
              dataKey="delta"
              name="Delta"
              stackId="a"
              fill={isDark ? color : '#09090B'}
              radius={[radius, radius, radius, radius]}
              barSize={barWidth}
              animationDuration={bySpeed(800, speed)}
            >
              {WATERFALL_DATA.map((d) => (
                <Cell
                  key={d.step}
                  fill={d.kind === 'loss' ? lossColor : d.kind === 'total' ? (isDark ? '#e4e4e7' : '#09090B') : isDark ? color : '#09090B'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
