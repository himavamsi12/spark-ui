"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { AnimatedNumber, ChartCard, Segmented } from './chartKit';

type Day = 'weekday' | 'weekend';

interface HourDialProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  bars?: number;
  innerRadius?: number;
  barWidth?: number;
  showSweep?: boolean;
  speed?: number;
}

const SIZE = 220;
const C = SIZE / 2;

function activity(bars: number, day: Day) {
  return Array.from({ length: bars }, (_, i) => {
    const h = (i / bars) * 24;
    const peakA = day === 'weekday' ? 9 : 12;
    const peakB = day === 'weekday' ? 18.5 : 20;
    const wave = Math.exp(-((h - peakA) ** 2) / 6) * 0.9 + Math.exp(-((h - peakB) ** 2) / 8) * 1 + 0.12;
    return Math.min(1, wave * (0.75 + seeded(i * 13 + (day === 'weekday' ? 1 : 2)) * 0.35));
  });
}

export function HourDial({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  bars = 24,
  innerRadius = 38,
  barWidth = 60,
  showSweep = true,
  speed = 100,
}: HourDialProps) {
  const isDark = theme === 'dark';
  const [day, setDay] = useState<Day>('weekday');
  const [hover, setHover] = useState<number | null>(null);
  const n = Math.max(8, Math.min(60, Math.round(bars)));
  const values = useMemo(() => activity(n, day), [n, day]);

  const outer = C - 14;
  const maxLen = outer - innerRadius;
  const slot = (2 * Math.PI * innerRadius) / n;
  const w = Math.max(2, slot * (barWidth / 100));
  const peakIdx = values.indexOf(Math.max(...values));
  const focus = hover ?? peakIdx;
  const hourOf = (i: number) => {
    const mins = Math.round((i / n) * 24 * 60);
    return `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  };
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Activity by Hour</span>
        <Segmented
          id="hour-dial"
          isDark={isDark}
          color={color}
          value={day}
          onChange={setDay}
          options={[
            { value: 'weekday', label: 'Weekday' },
            { value: 'weekend', label: 'Weekend' },
          ]}
        />
      </div>

      <div className={`relative flex-1 min-h-[150px] rounded-[14px] flex items-center justify-center gap-5 px-3 ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <div className={`relative shrink-0 ${compact ? 'h-[128px] w-[128px]' : 'h-[168px] w-[168px]'}`}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 w-full h-full" onPointerLeave={() => setHover(null)}>
            <circle cx={C} cy={C} r={outer + 4} fill="none" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} />
            <circle cx={C} cy={C} r={innerRadius - 6} fill="none" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="2 4" />

            {showSweep && (
              <g>
                {/* native SMIL rotation pivots on the true centre (Motion would pivot on the wedge's own bbox) */}
                <animateTransform attributeName="transform" type="rotate" from={`0 ${C} ${C}`} to={`360 ${C} ${C}`} dur={`${bySpeed(10, speed)}s`} repeatCount="indefinite" />
                <path
                  d={`M${C},${C} L${C},${C - outer - 4} A${outer + 4},${outer + 4} 0 0,1 ${C + (outer + 4) * Math.sin(0.5)},${C - (outer + 4) * Math.cos(0.5)} Z`}
                  fill={hexToRgba(color, isDark ? 0.1 : 0.12)}
                />
                <line x1={C} y1={C} x2={C} y2={C - outer - 4} stroke={color} strokeOpacity={0.5} strokeWidth={1} />
              </g>
            )}

            {values.map((v, i) => {
              const angle = (i / n) * 360;
              const len = Math.max(3, v * maxLen);
              const active = i === focus;
              return (
                <g key={i} transform={`rotate(${angle} ${C} ${C})`} onPointerEnter={() => setHover(i)} className="cursor-pointer">
                  <rect x={C - slot / 2} y={C - outer} width={slot} height={maxLen} fill="transparent" />
                  <motion.rect
                    x={C - w / 2}
                    width={w}
                    rx={w / 2}
                    initial={{ height: 0, attrY: C - innerRadius }}
                    animate={{ height: len, attrY: C - innerRadius - len }}
                    transition={{ type: 'spring', stiffness: 120 * (speed / 100), damping: 16, delay: bySpeed(i * (0.6 / n), speed) }}
                    fill={active ? color : isDark ? hexToRgba(color, 0.22 + v * 0.45) : hexToRgba('#09090b', 0.15 + v * 0.55)}
                    style={{ filter: active ? `drop-shadow(0 0 6px ${hexToRgba(color, 0.7)})` : undefined, transition: 'fill 200ms' }}
                  />
                </g>
              );
            })}

            {[0, 6, 12, 18].map((h) => {
              const a = (h / 24) * Math.PI * 2;
              const r = innerRadius - 16;
              return (
                <text key={h} x={C + r * Math.sin(a)} y={C - r * Math.cos(a) + 3} textAnchor="middle" fontSize={8} fontFamily="ui-monospace, monospace" fill={isDark ? '#71717a' : '#a1a1aa'}>
                  {String(h).padStart(2, '0')}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="min-w-[88px]">
          <motion.div key={focus} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`text-[10px] font-mono ${muted}`}>
            {hover === null ? 'Peak' : 'At'} {hourOf(focus)}
          </motion.div>
          <AnimatedNumber value={values[focus] * 1840} className="block text-2xl font-semibold tabular-nums tracking-tight" />
          <div className={`text-[10px] ${muted}`}>sessions</div>
          <div className={`mt-2 h-1 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
            <motion.div className="h-full rounded-full" style={{ backgroundColor: color }} animate={{ width: `${values[focus] * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 24 }} />
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
