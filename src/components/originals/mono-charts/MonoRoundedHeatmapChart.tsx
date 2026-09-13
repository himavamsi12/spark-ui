"use client";

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { bySpeed, labels, seeded } from './chartData';
import { hexToRgba } from './colorUtils';

interface MonoRoundedHeatmapChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  rows?: number;
  columns?: number;
  cellHeight?: number;
  gap?: number;
  radius?: number;
  shape?: 'rounded' | 'circle';
  showLabels?: boolean;
  speed?: number;
}

export function MonoRoundedHeatmapChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  rows = 5,
  columns = 7,
  cellHeight = 18,
  gap = 6,
  radius = 6,
  shape = 'rounded',
  showLabels = true,
  speed = 100,
}: MonoRoundedHeatmapChartProps) {
  const isDark = theme === 'dark';
  const HEATMAP_DATA = useMemo(
    () =>
      labels(rows, 'day').map((day, r) => ({
        day,
        hours: Array.from({ length: columns }, (_, c) => Math.round(10 + seeded(r * 31 + c * 7 + 161) * 85)),
      })),
    [rows, columns]
  );

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
      {/* Main Stage Matrix Grid */}
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-3 transition-colors duration-300 flex flex-col justify-center ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`} style={{ gap }}>
        {HEATMAP_DATA.map((row, rIdx) => (
          <div key={`${rows}-${columns}-${rIdx}`} className="flex items-center justify-between" style={{ gap }}>
            {showLabels && (
              <span className={`text-[10px] font-mono w-7 shrink-0 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {row.day}
              </span>
            )}
            <div className="flex-1 flex items-center justify-between" style={{ gap }}>
              {row.hours.map((val, cIdx) => {
                const opacity = val / 100;
                return (
                  <motion.div
                    key={cIdx}
                    title={`Activity: ${val}%`}
                    className="flex-1 cursor-pointer"
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: bySpeed((rIdx + cIdx) * 0.02, speed) }}
                    style={{
                      height: shape === 'circle' ? undefined : cellHeight,
                      aspectRatio: shape === 'circle' ? '1 / 1' : undefined,
                      borderRadius: shape === 'circle' ? 9999 : radius,
                      backgroundColor: isDark ? hexToRgba(color, opacity) : `rgba(9,9,11,${opacity})`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
