"use client";

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { bySpeed, labels, seeded } from './chartData';

interface MonoRoundedCandlestickChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  downColor?: string;
  candles?: number;
  candleWidth?: number;
  volatility?: number;
  radius?: number;
  showWicks?: boolean;
  speed?: number;
}

export function MonoRoundedCandlestickChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  downColor = '#52525b',
  candles = 5,
  candleWidth = 22,
  volatility = 40,
  radius = 6,
  showWicks = true,
  speed = 100,
}: MonoRoundedCandlestickChartProps) {
  const isDark = theme === 'dark';

  const { data, minVal, range } = useMemo(() => {
    const swing = 4 + (volatility / 100) * 40;
    const times = labels(candles, 'hour');
    const rows: { time: string; open: number; close: number; high: number; low: number }[] = [];
    let price = 140;
    for (let i = 0; i < candles; i++) {
      const open = price;
      const close = Math.round(open + (seeded(i * 11 + 61) - 0.46) * swing);
      const high = Math.max(open, close) + Math.round(seeded(i * 7 + 62) * swing * 0.6);
      const low = Math.min(open, close) - Math.round(seeded(i * 5 + 63) * swing * 0.6);
      price = close;
      rows.push({ time: times[i], open, close, high, low });
    }
    const lo = Math.min(...rows.map((r) => r.low)) - 4;
    const hi = Math.max(...rows.map((r) => r.high)) + 4;
    return { data: rows, minVal: lo, range: hi - lo };
  }, [candles, volatility]);
  const maxVal = minVal + range;

  return (
    <div
      className={`relative w-full rounded-[24px] transition-all duration-300 group flex flex-col justify-between overflow-hidden p-4 sm:p-5 ${
        compact ? 'h-[220px] sm:h-[268px]' : 'h-[290px]'
      } ${
        isDark
          ? 'bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-neutral-100 text-black'
      }`}
    >
      {/* Main Stage Stage */}
      <div className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-3 transition-colors duration-300 flex items-center justify-around gap-2 ${
        isDark ? 'bg-void' : 'bg-[#f4f4f6]'
      }`}>
        {data.map((c, idx) => {
          const isBull = c.close >= c.open;
          const bodyTop = Math.max(c.open, c.close);
          const bodyBottom = Math.min(c.open, c.close);
          const bodyTopPct = ((maxVal - bodyTop) / range) * 100;
          const bodyHeightPct = Math.max(3, ((bodyTop - bodyBottom) / range) * 100);
          const highPct = ((maxVal - c.high) / range) * 100;
          const lowPct = ((maxVal - c.low) / range) * 100;
          const tone = isBull ? (isDark ? color : '#09090B') : downColor;
          const delay = bySpeed(idx * 0.06, speed);

          return (
            <div key={`${candles}-${idx}`} className="relative flex-1 h-full flex flex-col items-center justify-center">
              {showWicks && (
                <motion.div
                  className="absolute w-0.5 rounded-full origin-center"
                  style={{ top: `${highPct}%`, bottom: `${100 - lowPct}%`, backgroundColor: tone, opacity: 0.55 }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: bySpeed(0.5, speed), delay }}
                />
              )}
              <motion.div
                className="absolute border origin-center cursor-pointer"
                style={{
                  top: `${bodyTopPct}%`,
                  height: `${bodyHeightPct}%`,
                  width: candleWidth,
                  borderRadius: radius,
                  backgroundColor: isBull ? tone : 'transparent',
                  borderColor: tone,
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                whileHover={{ scaleX: 1.2 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20, delay }}
                title={`O ${c.open} · H ${c.high} · L ${c.low} · C ${c.close}`}
              />
              <span className={`absolute bottom-0 text-[9px] font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {candles <= 10 || idx % 2 === 0 ? c.time : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
