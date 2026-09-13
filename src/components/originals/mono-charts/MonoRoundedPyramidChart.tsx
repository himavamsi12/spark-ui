"use client";

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { bySpeed } from './chartData';
import { hexToRgba } from './colorUtils';

const TIER_NAMES = ['Executive', 'Management', 'Senior Staff', 'Specialists', 'Core Team', 'Associates', 'Interns', 'Contractors'];

interface MonoRoundedPyramidChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  tiers?: number;
  tierHeight?: number;
  radius?: number;
  inverted?: boolean;
  showLabels?: boolean;
  speed?: number;
}

export function MonoRoundedPyramidChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  tiers = 4,
  tierHeight = 26,
  radius = 12,
  inverted = false,
  showLabels = true,
  speed = 100,
}: MonoRoundedPyramidChartProps) {
  const isDark = theme === 'dark';
  const PYRAMID_LEVELS = useMemo(() => {
    const rows = Array.from({ length: tiers }, (_, i) => ({
      label: TIER_NAMES[i],
      widthPct: 25 + (i / Math.max(1, tiers - 1)) * 70,
      opacity: 1 - (i / Math.max(1, tiers)) * 0.8,
    }));
    return inverted ? [...rows].reverse() : rows;
  }, [tiers, inverted]);

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
      {/* Main Stage Stage */}
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-3 transition-colors duration-300 flex flex-col items-center justify-around gap-2 ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`}>
        {PYRAMID_LEVELS.map((lvl, idx) => (
          <motion.div
            key={`${tiers}-${inverted}-${lvl.label}`}
            className="flex items-center justify-center border cursor-pointer overflow-hidden"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: bySpeed(idx * 0.08, speed) }}
            style={{
              width: `${lvl.widthPct}%`,
              height: tierHeight,
              borderRadius: radius,
              backgroundColor: isDark ? hexToRgba(color, lvl.opacity) : `rgba(9,9,11,${lvl.opacity})`,
              borderColor: isDark ? hexToRgba(color, 0.3) : 'rgba(9,9,11,0.2)',
              color: isDark ? (lvl.opacity > 0.6 ? '#000000' : '#FFFFFF') : (lvl.opacity > 0.6 ? '#FFFFFF' : '#000000'),
            }}
          >
            {showLabels && <span className="text-[10px] font-bold font-mono tracking-tight whitespace-nowrap">{lvl.label}</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
