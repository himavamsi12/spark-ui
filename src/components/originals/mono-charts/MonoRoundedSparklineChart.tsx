"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { bySpeed, seeded } from './chartData';

const ROW_META = [
  { name: 'CPU Temp', unit: '°C', base: 42 },
  { name: 'GPU Temp', unit: '°C', base: 58 },
  { name: 'Fan Speed', unit: 'k RPM', base: 1.2 },
  { name: 'Memory', unit: '%', base: 64 },
  { name: 'Network', unit: ' Mb/s', base: 180 },
  { name: 'Disk IO', unit: ' MB/s', base: 92 },
];

interface MonoRoundedSparklineChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  rows?: number;
  points?: number;
  strokeWidth?: number;
  showEndDot?: boolean;
  live?: boolean;
  speed?: number;
}

export function MonoRoundedSparklineChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  rows = 3,
  points = 5,
  strokeWidth = 2,
  showEndDot = true,
  live = true,
  speed = 100,
}: MonoRoundedSparklineChartProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setTick((t) => t + 1), bySpeed(1400, speed));
    return () => clearInterval(id);
  }, [live, speed]);

  const SPARK_ROWS = useMemo(
    () =>
      ROW_META.slice(0, rows).map((meta, r) => {
        const data = Array.from({ length: points }, (_, x) => ({ x, y: Math.round(10 + seeded(r * 53 + (x + tick) * 11 + 171) * 80) }));
        const last = data[data.length - 1].y;
        const v = meta.base * (0.8 + (last / 100) * 0.4);
        return { name: meta.name, val: `${meta.base < 10 ? v.toFixed(1) : Math.round(v)}${meta.unit}`, data };
      }),
    [rows, points, tick]
  );

  const isDark = theme === 'dark';

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
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-3 transition-colors duration-300 flex flex-col justify-around gap-2 ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`}>
        {SPARK_ROWS.map((row, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex flex-col w-20 shrink-0">
              <span className={`text-[11px] font-medium ${isDark ? 'text-white' : 'text-black'}`}>{row.name}</span>
              <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{row.val}</span>
            </div>
            <div className="flex-1 h-7">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={row.data} margin={{ top: 4, right: 6, bottom: 4, left: 2 }}>
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke={isDark ? color : '#09090B'}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    dot={
                      showEndDot
                        ? (props: { cx?: number; cy?: number; index?: number }) =>
                            props.index === row.data.length - 1 ? (
                              <circle key="end" cx={props.cx} cy={props.cy} r={strokeWidth + 1.5} fill={isDark ? color : '#09090B'} />
                            ) : (
                              <g key={`d-${props.index}`} />
                            )
                        : false
                    }
                    isAnimationActive={tick === 0}
                    animationDuration={bySpeed(800, speed)}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
