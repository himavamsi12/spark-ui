"use client";

import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { MonoChartTooltipContent } from './lib/recharts-tooltip';
import { hexToRgba } from './colorUtils';
import { bySpeed, series } from './chartData';

const SEGMENT_NAMES = ['Core Engine', 'UI Layer', 'Assets', 'Network', 'Storage', 'Cache', 'Workers', 'Other'];

interface MonoRoundedDonutChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  segments?: number;
  thickness?: number;
  gap?: number;
  cornerRadius?: number;
  showLegend?: boolean;
  speed?: number;
}

export function MonoRoundedDonutChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  segments = 4,
  thickness = 22,
  gap = 6,
  cornerRadius = 8,
  showLegend = true,
  speed = 100,
}: MonoRoundedDonutChartProps) {
  const isDark = theme === 'dark';
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const MONO_DONUT_DATA = useMemo(() => {
    const raw = series(segments, { min: 10, max: 60, salt: 31 }).sort((x, y) => y - x);
    const total = raw.reduce((t, v) => t + v, 0);
    const rows: { name: string; value: number }[] = [];
    let used = 0;
    for (let i = 0; i < raw.length; i++) {
      const value = i === raw.length - 1 ? 100 - used : Math.round((raw[i] / total) * 100);
      used += value;
      rows.push({ name: SEGMENT_NAMES[i], value });
    }
    return rows;
  }, [segments]);
  const outer = compact ? 58 : 72;

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
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-2 transition-colors duration-300 flex items-center justify-center ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`}>
        <ResponsiveContainer width="100%" height={compact ? 130 : 170}>
          <PieChart key={segments}>
            <Tooltip content={<MonoChartTooltipContent theme={theme} indicator="dot" />} />
            <Pie
              data={MONO_DONUT_DATA}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={Math.max(8, outer - thickness)}
              outerRadius={outer}
              paddingAngle={gap}
              cornerRadius={cornerRadius}
              strokeLinecap="round"
              onMouseEnter={(_, idx) => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              animationDuration={bySpeed(900, speed)}
            >
              {MONO_DONUT_DATA.map((entry, index) => {
                const isHovered = hoverIndex === index;
                const shade = 1 - (index / Math.max(1, MONO_DONUT_DATA.length)) * 0.8;
                const fillColor = isDark ? hexToRgba(color, shade) : `rgba(9,9,11,${shade})`;

                return (
                  <Cell
                    key={`mono-cell-${index}`}
                    fill={fillColor}
                    stroke={isDark ? 'var(--panel)' : '#FFFFFF'}
                    strokeWidth={2}
                    style={{
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: 'center center',
                      transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      cursor: 'pointer',
                    }}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Stat Callout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm font-bold tabular-nums font-sans">
            {hoverIndex !== null ? `${MONO_DONUT_DATA[hoverIndex].value}%` : '100%'}
          </span>
          <span className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            {hoverIndex !== null ? MONO_DONUT_DATA[hoverIndex].name : 'Mono Arc'}
          </span>
        </div>
      </div>

      {/* Segment Legend Footer */}
      {showLegend && (
      <div className="flex flex-wrap items-center justify-around gap-x-3 gap-y-1 mt-3 pt-1 border-t border-white/5 text-[10px]">
        {MONO_DONUT_DATA.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hexToRgba(color, 1 - (idx / Math.max(1, MONO_DONUT_DATA.length)) * 0.8) }} />
            <span className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>{seg.name}</span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
