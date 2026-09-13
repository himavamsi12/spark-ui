"use client";

import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { bySpeed } from './chartData';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MonoRoundedMeterChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  value?: number;
  thickness?: number;
  status?: string;
  showNeedle?: boolean;
  segments?: number;
  speed?: number;
}

export function MonoRoundedMeterChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  value = 78,
  thickness = 18,
  status = 'Optimal Load',
  showNeedle = true,
  segments = 1,
  speed = 100,
}: MonoRoundedMeterChartProps) {
  const isDark = theme === 'dark';
  const val = Math.min(100, Math.max(0, value));
  const outer = compact ? 60 : 78;
  const spring = useSpring(0, { stiffness: 60 * (speed / 100), damping: 16 });
  const readout = useTransform(spring, (v) => `${Math.round(v)}%`);
  const needle = useTransform(spring, (v) => -90 + (v / 100) * 180);
  useEffect(() => {
    spring.set(val);
  }, [val, spring]);

  // With segments > 1 the arc is split into equal notches that light up in order.
  const data =
    segments > 1
      ? Array.from({ length: segments }, (_, i) => ({ name: `S${i}`, value: 1, on: (i + 1) / segments <= val / 100 + 1e-6 }))
      : [
          { name: 'Active', value: val, on: true },
          { name: 'Remaining', value: 100 - val, on: false },
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
        <div className="relative w-full" style={{ height: compact ? 130 : 160 }}>
        <ResponsiveContainer width="100%" height={compact ? 130 : 160}>
          <PieChart key={`${segments}-${thickness}`}>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="70%"
              startAngle={180}
              endAngle={0}
              innerRadius={Math.max(10, outer - thickness)}
              outerRadius={outer}
              cornerRadius={segments > 1 ? 3 : 6}
              strokeLinecap="round"
              stroke="none"
              paddingAngle={segments > 1 ? 2 : 4}
              animationDuration={bySpeed(900, speed)}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.on ? (isDark ? color : '#09090B') : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(9,9,11,0.1)'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {showNeedle && (
          <div className="absolute left-1/2 pointer-events-none" style={{ top: '70%' }}>
            <motion.div
              className="absolute bottom-0 left-0 w-[3px] -ml-[1.5px] rounded-full origin-bottom"
              style={{ height: outer - thickness - 8, rotate: needle, backgroundColor: isDark ? '#ffffff' : '#09090B' }}
            />
            <div className="absolute -left-[5px] -bottom-[5px] w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          </div>
        )}
        </div>

        <div className="absolute bottom-3 flex flex-col items-center pointer-events-none">
          <motion.span className="text-lg font-bold tabular-nums font-sans">{readout}</motion.span>
          <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{status}</span>
        </div>
      </div>
    </div>
  );
}
