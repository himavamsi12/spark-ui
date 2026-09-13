"use client";

import React, { useEffect, useId, useState } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';

interface LiquidTankProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  level?: number;
  waveHeight?: number;
  tankSize?: number;
  bubbles?: number;
  showRings?: boolean;
  speed?: number;
}

const METRICS = [
  { label: 'Storage', value: 72 },
  { label: 'Memory', value: 41 },
  { label: 'Bandwidth', value: 88 },
];

function wavePath(amp: number) {
  return `M0 0 Q25 ${-amp} 50 0 T100 0 T150 0 T200 0 T250 0 T300 0 V240 H0 Z`;
}

export function LiquidTank({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  level: storageLevel = 72,
  waveHeight = 7,
  tankSize = 170,
  bubbles = 6,
  showRings = true,
  speed = 100,
}: LiquidTankProps) {
  const LEVELS = [{ label: 'Storage', value: storageLevel }, ...METRICS.slice(1)];
  const WAVE = wavePath(waveHeight);
  const isDark = theme === 'dark';
  const clipId = `liquid-clip-${useId().replace(/:/g, '')}`;
  const [index, setIndex] = useState(0);
  const level = LEVELS[index].value;

  const levelSpring = useSpring(0, { stiffness: 60, damping: 14 });
  const waveY = useTransform(levelSpring, (v) => 180 - (v / 100) * 160);
  const readout = useTransform(levelSpring, (v) => `${Math.round(v)}%`);

  useEffect(() => {
    levelSpring.set(level);
  }, [level, levelSpring]);

  return (
    <div
      className={`relative w-full rounded-[24px] transition-all duration-300 group flex flex-col overflow-hidden p-4 sm:p-5 ${
        compact ? 'h-[220px] sm:h-[268px]' : 'min-h-[290px]'
      } ${
        isDark
          ? 'bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] text-white'
          : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-neutral-100 text-black'
      }`}
    >
      <div className="flex items-center justify-end mb-3">
        <div className={`p-0.5 rounded-full border flex items-center gap-0.5 ${isDark ? 'bg-white/5 border-white/10' : 'bg-neutral-100 border-neutral-200'}`}>
          {LEVELS.map((l, i) => (
            <button
              key={l.label}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                index === i ? 'text-void' : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
              }`}
            >
              {index === i && (
                <motion.span
                  layoutId="liquid-tank-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: color }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`relative w-full flex-1 min-h-[180px] rounded-[14px] overflow-hidden flex items-center justify-center ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <svg viewBox="0 0 200 200" style={{ width: tankSize, height: tankSize }}>
          <defs>
            <clipPath id={clipId}>
              <circle cx="100" cy="100" r="80" />
            </clipPath>
          </defs>

          <circle cx="100" cy="100" r="80" fill={hexToRgba(color, 0.06)} />

          <g clipPath={`url(#${clipId})`}>
            <motion.g style={{ y: waveY }}>
              <motion.path
                d={WAVE}
                fill={hexToRgba(color, 0.35)}
                animate={{ x: [0, -100] }}
                transition={{ duration: bySpeed(3.2, speed), repeat: Infinity, ease: 'linear' }}
              />
            </motion.g>
            <motion.g style={{ y: waveY }}>
              <g transform="translate(0 6)">
                <motion.path
                  d={WAVE}
                  fill={color}
                  animate={{ x: [-100, 0] }}
                  transition={{ duration: bySpeed(2.2, speed), repeat: Infinity, ease: 'linear' }}
                />
              </g>
            </motion.g>
            {Array.from({ length: bubbles }, (_, i) => {
              const cx = 40 + seeded(i * 13 + 401) * 120;
              const r = 2 + seeded(i * 7 + 402) * 3.5;
              const dur = bySpeed(2.4 + seeded(i * 5 + 403) * 2.4, speed);
              return (
                <circle key={i} cx={cx} cy={190} r={r} fill="rgba(255,255,255,0.55)">
                  <animate attributeName="cy" from="190" to="60" dur={`${dur}s`} begin={`${(i * 0.45).toFixed(2)}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.8;0" dur={`${dur}s`} begin={`${(i * 0.45).toFixed(2)}s`} repeatCount="indefinite" />
                </circle>
              );
            })}
          </g>

          {showRings && <><circle cx="100" cy="100" r="86" fill="none" stroke={hexToRgba(color, 0.35)} strokeWidth="1.5" />
          <circle cx="100" cy="100" r="92" fill="none" stroke={hexToRgba(color, 0.2)} strokeWidth="1" strokeDasharray="1 5">
            <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="-360 100 100" dur="30s" repeatCount="indefinite" />
          </circle></>}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span className="text-2xl font-bold tabular-nums font-sans text-white mix-blend-difference">{readout}</motion.span>
          <span className="text-[10px] font-mono text-white/80 mix-blend-difference">{LEVELS[index].label}</span>
        </div>
      </div>
    </div>
  );
}
