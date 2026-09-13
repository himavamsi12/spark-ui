"use client";

import React, { useEffect, useId, useMemo } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { bySpeed, series } from './chartData';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface MonoRoundedKpiCardChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  value?: number;
  prefix?: string;
  delta?: number;
  points?: number;
  strokeWidth?: number;
  showFill?: boolean;
  speed?: number;
}

export function MonoRoundedKpiCardChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  value = 48920,
  prefix = '$',
  delta = 14.2,
  points = 8,
  strokeWidth = 2.5,
  showFill = true,
  speed = 100,
}: MonoRoundedKpiCardChartProps) {
  const isDark = theme === 'dark';
  const gradId = `kpi-grad-${useId().replace(/:/g, '')}`;
  const KPI_LINE_DATA = useMemo(() => series(points, { min: 25, max: 95, salt: 71 }).map((v) => ({ v })), [points]);

  const spring = useSpring(0, { stiffness: 60 * (speed / 100), damping: 18 });
  const display = useTransform(spring, (v) => `${prefix}${Math.round(v).toLocaleString('en-US')}`);
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

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
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-2xl font-extrabold tracking-tight tabular-nums mt-1 font-sans">
            <motion.span>{display}</motion.span>{' '}
            <span className={`text-xs font-normal font-mono ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {delta >= 0 ? '+' : ''}
              {delta}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Stage Stage Sparkline */}
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-2 transition-colors duration-300 flex flex-col justify-end ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`}>
        <div className="w-full h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart key={points} data={KPI_LINE_DATA}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isDark ? color : "#09090B"} stopOpacity={showFill ? 0.3 : 0} />
                  <stop offset="100%" stopColor={isDark ? color : "#09090B"} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={isDark ? color : '#09090B'}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill={`url(#${gradId})`}
                animationDuration={bySpeed(800, speed)}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
