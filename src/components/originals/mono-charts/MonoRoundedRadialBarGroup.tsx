"use client";

import React, { useMemo } from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, Tooltip, Cell } from 'recharts';
import { bySpeed, series } from './chartData';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { hexToRgba } from './colorUtils';

const RING_NAMES = ['System', 'Network', 'Storage', 'Memory', 'Cache', 'GPU', 'Queue', 'Disk'];

interface MonoRoundedRadialBarGroupProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  rings?: number;
  ringWidth?: number;
  sweep?: '180' | '270' | '360';
  cornerRadius?: number;
  showTrack?: boolean;
  speed?: number;
}

export function MonoRoundedRadialBarGroup({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  rings = 4,
  ringWidth = 8,
  sweep = '180',
  cornerRadius = 8,
  showTrack = true,
  speed = 100,
}: MonoRoundedRadialBarGroupProps) {
  const isDark = theme === 'dark';
  const RADIAL_GROUP_DATA = useMemo(() => {
    const vals = series(rings, { min: 25, max: 95, salt: 81 }).sort((x, y) => y - x);
    return vals.map((val, i) => ({ name: RING_NAMES[i], val }));
  }, [rings]);
  const startAngle = sweep === '360' ? 90 : sweep === '270' ? 225 : 180;
  const endAngle = sweep === '360' ? -270 : sweep === '270' ? -45 : 0;

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
        <ResponsiveContainer width="100%" height={compact ? 130 : 180}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="20%"
            outerRadius="95%"
            barSize={ringWidth}
            data={RADIAL_GROUP_DATA}
            startAngle={startAngle}
            endAngle={endAngle}
            key={`${rings}-${sweep}`}
          >
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            <RadialBar
              background={showTrack ? { fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } : false}
              dataKey="val"
              cornerRadius={cornerRadius}
              animationDuration={bySpeed(800, speed)}
            >
              {RADIAL_GROUP_DATA.map((entry, idx) => {
                const shade = 1 - (idx / Math.max(1, RADIAL_GROUP_DATA.length)) * 0.8;
                return <Cell key={entry.name} fill={isDark ? hexToRgba(color, shade) : `rgba(9,9,11,${shade})`} />;
              })}
            </RadialBar>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
