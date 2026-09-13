"use client";

import React, { useMemo } from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, Tooltip, Cell } from 'recharts';
import { bySpeed, series } from './chartData';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { hexToRgba } from './colorUtils';

const RING_NAMES = ['Core', 'Memory', 'Cache', 'Disk', 'Network', 'GPU'];

interface MonoRoundedRadialGaugeChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  rings?: number;
  ringWidth?: number;
  hole?: number;
  cornerRadius?: number;
  showTrack?: boolean;
  clockwise?: boolean;
  speed?: number;
}

export function MonoRoundedRadialGaugeChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  rings = 3,
  ringWidth = 10,
  hole = 30,
  cornerRadius = 5,
  showTrack = true,
  clockwise = true,
  speed = 100,
}: MonoRoundedRadialGaugeChartProps) {
  const isDark = theme === 'dark';
  const RADIAL_GAUGE_DATA = useMemo(() => {
    const vals = series(rings, { min: 40, max: 95, salt: 141 }).sort((x, y) => y - x);
    return vals.map((val, i) => ({ name: RING_NAMES[i], val }));
  }, [rings]);

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
            innerRadius={`${hole}%`}
            outerRadius="92%"
            barSize={ringWidth}
            data={RADIAL_GAUGE_DATA}
            startAngle={90}
            endAngle={clockwise ? -270 : 450}
            key={`${rings}-${clockwise}`}
          >
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            <RadialBar
              background={showTrack ? { fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } : false}
              dataKey="val"
              cornerRadius={cornerRadius}
              animationDuration={bySpeed(900, speed)}
            >
              {RADIAL_GAUGE_DATA.map((entry, idx) => {
                const shade = 1 - (idx / Math.max(1, RADIAL_GAUGE_DATA.length)) * 0.75;
                return <Cell key={entry.name} fill={isDark ? hexToRgba(color, shade) : `rgba(9,9,11,${shade})`} />;
              })}
            </RadialBar>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
