"use client";

import React, { useEffect, useId, useState } from 'react';
import { motion, useMotionValueEvent, useSpring, useTransform } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { ChartCard } from './chartKit';

interface VelocityGaugeProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  alertColor?: string;
  max?: number;
  majorTicks?: number;
  redline?: number;
  wander?: boolean;
  speed?: number;
}

const S = 220;
const C = S / 2;
const SWEEP = 240;

const pt = (r: number, deg: number) => [C + r * Math.sin((deg * Math.PI) / 180), C - r * Math.cos((deg * Math.PI) / 180)] as const;
function arc(r: number, from: number, to: number) {
  const [x0, y0] = pt(r, from);
  const [x1, y1] = pt(r, to);
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${to - from > 180 ? 1 : 0},1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

const PRESETS = [
  { label: 'Idle', v: 0.14 },
  { label: 'Cruise', v: 0.55 },
  { label: 'Boost', v: 0.93 },
];

export function VelocityGauge({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  alertColor = '#f43f5e',
  max = 240,
  majorTicks = 7,
  redline = 80,
  wander = true,
  speed = 100,
}: VelocityGaugeProps) {
  const isDark = theme === 'dark';
  const uid = useId().replace(/:/g, '');
  const [target, setTarget] = useState(0.55);
  const [preset, setPreset] = useState<string | null>(wander ? null : 'Cruise');
  const [readout, setReadout] = useState(0);

  // Under-damped spring: the needle overshoots and settles like a real gauge.
  const value = useSpring(0, { stiffness: 55 * (speed / 100), damping: 8, mass: 1 });
  useEffect(() => {
    value.set(target);
  }, [value, target]);
  useMotionValueEvent(value, 'change', (v) => setReadout(Math.max(0, v)));

  useEffect(() => {
    if (!wander || preset) return;
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setTarget(0.15 + seeded(i * 97 + 13) * 0.82);
    }, bySpeed(1800, speed));
    return () => window.clearInterval(id);
  }, [wander, preset, speed]);

  const start = -SWEEP / 2;
  const R = 84;
  const progress = useTransform(value, (v) => arc(R, start, start + Math.max(0.003, Math.min(1.04, v)) * SWEEP));
  const needle = useTransform(value, (v) => {
    const a = start + Math.max(-0.02, Math.min(1.04, v)) * SWEEP;
    const [tx, ty] = pt(R - 16, a);
    const [lx, ly] = pt(5, a - 90);
    const [rx, ry] = pt(5, a + 90);
    return `M${lx.toFixed(2)},${ly.toFixed(2)} L${tx.toFixed(2)},${ty.toFixed(2)} L${rx.toFixed(2)},${ry.toFixed(2)} Z`;
  });

  const hot = readout * 100 >= redline;
  const tint = hot ? alertColor : color;
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const majors = Math.max(3, Math.round(majorTicks));
  const minorPer = 4;

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Velocity</span>
        <div className={`relative p-0.5 rounded-full border flex items-center gap-0.5 ${isDark ? 'bg-white/5 border-white/10' : 'bg-neutral-100 border-neutral-200'}`}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setPreset(p.label);
                setTarget(p.v);
              }}
              className={`relative px-2.5 py-0.5 rounded-full text-[11px] font-medium cursor-pointer ${preset === p.label ? 'text-[#08080a]' : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500'}`}
            >
              {preset === p.label && <motion.span layoutId={`vg-${uid}`} className="absolute inset-0 rounded-full" style={{ backgroundColor: color }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative">{p.label}</span>
            </button>
          ))}
          {wander && (
            <button
              type="button"
              onClick={() => setPreset(null)}
              className={`relative px-2.5 py-0.5 rounded-full text-[11px] font-medium cursor-pointer ${preset === null ? 'text-[#08080a]' : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500'}`}
            >
              {preset === null && <motion.span layoutId={`vg-${uid}`} className="absolute inset-0 rounded-full" style={{ backgroundColor: color }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative">Auto</span>
            </button>
          )}
        </div>
      </div>

      <div className={`relative flex-1 min-h-[150px] rounded-[14px] flex items-center justify-center ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <svg viewBox={`0 ${C - 104} ${S} 186`} className="h-full max-h-[200px] min-h-[140px] w-auto">
          <defs>
            <linearGradient id={`${uid}-g`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor={color} stopOpacity={0.35} />
              <stop offset="1" stopColor={color} />
            </linearGradient>
            <filter id={`${uid}-blur`}>
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* track + redline zone */}
          <path d={arc(R, start, start + SWEEP)} fill="none" stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'} strokeWidth={12} strokeLinecap="round" />
          <path d={arc(R, start + (redline / 100) * SWEEP, start + SWEEP)} fill="none" stroke={hexToRgba(alertColor, 0.35)} strokeWidth={12} strokeLinecap="round" />

          {/* ticks */}
          {Array.from({ length: (majors - 1) * minorPer + 1 }, (_, i) => {
            const t = i / ((majors - 1) * minorPer);
            const a = start + t * SWEEP;
            const major = i % minorPer === 0;
            const [x0, y0] = pt(R - 14, a);
            const [x1, y1] = pt(R - (major ? 24 : 19), a);
            const [lx, ly] = pt(R - 36, a);
            return (
              <g key={i}>
                <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={t * 100 >= redline ? alertColor : isDark ? '#a1a1aa' : '#52525b'} strokeOpacity={major ? 0.9 : 0.4} strokeWidth={major ? 2 : 1} strokeLinecap="round" />
                {major && (
                  <text x={lx} y={ly + 3} textAnchor="middle" fontSize={8} fontFamily="ui-monospace, monospace" fill={isDark ? '#71717a' : '#a1a1aa'}>
                    {Math.round(t * max)}
                  </text>
                )}
              </g>
            );
          })}

          {/* glowing progress */}
          <motion.path d={progress} fill="none" stroke={tint} strokeWidth={12} strokeLinecap="round" filter={`url(#${uid}-blur)`} opacity={isDark ? 0.55 : 0.25} />
          <motion.path d={progress} fill="none" stroke={hot ? alertColor : `url(#${uid}-g)`} strokeWidth={12} strokeLinecap="round" />

          <motion.path d={needle} fill={isDark ? '#f4f4f5' : '#09090b'} />
          <circle cx={C} cy={C} r={9} fill={isDark ? '#18181b' : '#fff'} stroke={tint} strokeWidth={2.5} />

          <text x={C} y={C + 44} textAnchor="middle" fontSize={26} fontWeight={600} fill={hot ? alertColor : isDark ? '#fafafa' : '#09090b'} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(readout * max)}
          </text>
          <text x={C} y={C + 58} textAnchor="middle" fontSize={8} fontFamily="ui-monospace, monospace" fill={isDark ? '#71717a' : '#a1a1aa'}>
            KM/H
          </text>
        </svg>
      </div>
    </ChartCard>
  );
}
