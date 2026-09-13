"use client";

import React, { useMemo } from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, Tooltip, Cell } from 'recharts';
import { bySpeed, series } from './chartData';
import { hexToRgba } from './colorUtils';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';

const CATEGORY_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];

interface MonoRoundedPolarChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  categories?: number;
  barWidth?: number;
  cornerRadius?: number;
  sorted?: boolean;
  shaded?: boolean;
  speed?: number;
}

export function MonoRoundedPolarChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  categories = 3,
  barWidth = 12,
  cornerRadius = 6,
  sorted = true,
  shaded = false,
  speed = 100,
}: MonoRoundedPolarChartProps) {
  const isDark = theme === 'dark';
  const POLAR_DATA = useMemo(() => {
    const vals = series(categories, { min: 30, max: 95, salt: 151 });
    const rows = vals.map((count, i) => ({ name: CATEGORY_NAMES[i], count }));
    return sorted ? rows.sort((x, y) => y.count - x.count) : rows;
  }, [categories, sorted]);

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
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-2 transition-colors duration-300 flex items-center justify-center ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`}>
        <ResponsiveContainer width="100%" height={compact ? 140 : 190}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="25%"
            outerRadius="85%"
            barSize={barWidth}
            data={POLAR_DATA}
            key={`${categories}-${sorted}`}
            startAngle={90}
            endAngle={-270}
          >
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            <RadialBar
              background={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              dataKey="count"
              cornerRadius={cornerRadius}
              fill={isDark ? color : '#09090B'}
              animationDuration={bySpeed(800, speed)}
            >
              {POLAR_DATA.map((entry, idx) => (
                <Cell
                  key={entry.name}
                  fill={shaded ? hexToRgba(color, 1 - (idx / Math.max(1, POLAR_DATA.length)) * 0.75) : isDark ? color : '#09090B'}
                />
              ))}
            </RadialBar>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
