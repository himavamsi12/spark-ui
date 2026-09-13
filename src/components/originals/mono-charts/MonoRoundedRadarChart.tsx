"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
} from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { bySpeed, series } from './chartData';
import { hexToRgba } from './colorUtils';

const AXIS_NAMES = ['Speed', 'Memory', 'Scale', 'Latency', 'IOPS', 'Uptime', 'Security', 'Cost', 'Energy', 'Reach'];

interface MonoRoundedRadarChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  axes?: number;
  strokeWidth?: number;
  fillOpacity?: number;
  gridType?: 'polygon' | 'circle';
  showDots?: boolean;
  showComparison?: boolean;
  speed?: number;
}

export function MonoRoundedRadarChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  axes = 5,
  strokeWidth = 2,
  fillOpacity = 20,
  gridType = 'polygon',
  showDots = false,
  showComparison = false,
  speed = 100,
}: MonoRoundedRadarChartProps) {
  const isDark = theme === 'dark';
  const RADAR_DATA = useMemo(() => {
    const a = series(axes, { min: 55, max: 97, salt: 131 });
    const b = series(axes, { min: 35, max: 85, salt: 132 });
    return a.map((metric, i) => ({ subject: AXIS_NAMES[i], metric, baseline: b[i] }));
  }, [axes]);

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
        <ResponsiveContainer width="100%" height={compact ? 150 : 200}>
          <RadarChart cx="50%" cy="50%" outerRadius={compact ? 48 : 66} data={RADAR_DATA} key={`${axes}-${gridType}`}>
            <PolarGrid gridType={gridType} stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: isDark ? '#71717A' : '#A1A1AA' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            {showComparison && (
              <Radar
                name="Baseline"
                dataKey="baseline"
                stroke={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(9,9,11,0.4)'}
                strokeDasharray="4 3"
                strokeWidth={Math.max(1, strokeWidth - 1)}
                fill="transparent"
                animationDuration={bySpeed(900, speed)}
              />
            )}
            <Radar
              name="Metric"
              dataKey="metric"
              stroke={isDark ? color : '#09090B'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={isDark ? hexToRgba(color, fillOpacity / 100) : `rgba(9,9,11,${fillOpacity / 100})`}
              dot={showDots ? { r: strokeWidth + 1.5, fill: isDark ? color : '#09090B' } : false}
              animationDuration={bySpeed(800, speed)}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
