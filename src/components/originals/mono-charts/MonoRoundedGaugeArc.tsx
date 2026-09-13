"use client";

import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { bySpeed } from './chartData';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MonoRoundedGaugeArcProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  value?: number;
  thickness?: number;
  sweep?: number;
  status?: string;
  showTicks?: boolean;
  speed?: number;
}

export function MonoRoundedGaugeArc({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  value = 84,
  thickness = 18,
  sweep = 240,
  status = 'Target Met',
  showTicks = true,
  speed = 100,
}: MonoRoundedGaugeArcProps) {
  const isDark = theme === 'dark';
  const val = Math.min(100, Math.max(0, value));
  const startAngle = 90 + sweep / 2;
  const endAngle = 90 - sweep / 2;
  const outer = compact ? 60 : 76;

  const spring = useSpring(0, { stiffness: 70 * (speed / 100), damping: 18 });
  const readout = useTransform(spring, (v) => v.toFixed(1));
  useEffect(() => {
    spring.set(val);
  }, [val, spring]);

  const data = [
    { name: 'Active', value: val },
    { name: 'Remaining', value: 100 - val },
  ];

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
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-2 transition-colors duration-300 flex flex-col items-center justify-center ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`}>
        <ResponsiveContainer width="100%" height={compact ? 130 : 170}>
          <PieChart key={`${sweep}-${thickness}`}>
            {showTicks && (
              <Pie
                data={Array.from({ length: 24 }, () => ({ value: 1 }))}
                dataKey="value"
                cx="50%"
                cy="62%"
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outer + 6}
                outerRadius={outer + 10}
                paddingAngle={3}
                isAnimationActive={false}
                stroke="none"
                fill={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(9,9,11,0.12)'}
              />
            )}
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="62%"
              startAngle={startAngle}
              endAngle={endAngle}
              innerRadius={Math.max(10, outer - thickness)}
              outerRadius={outer}
              animationDuration={bySpeed(900, speed)}
              stroke="none"
              cornerRadius={8}
              strokeLinecap="round"
              paddingAngle={4}
            >
              <Cell fill={isDark ? color : '#09090B'} />
              <Cell fill={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(9,9,11,0.1)'} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute bottom-4 flex flex-col items-center pointer-events-none">
          <motion.span className="text-xl font-extrabold tabular-nums font-sans">{readout}</motion.span>
          <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{status}</span>
        </div>
      </div>
    </div>
  );
}
