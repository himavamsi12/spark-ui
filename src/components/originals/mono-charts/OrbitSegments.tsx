"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, series } from './chartData';

interface OrbitSegmentsProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  segments?: number;
  thickness?: number;
  gap?: number;
  lift?: number;
  showOrbit?: boolean;
  showLegend?: boolean;
  speed?: number;
}

const SEGMENT_NAMES = ['Direct', 'Search', 'Social', 'Referral', 'Email', 'Ads', 'Partners', 'Other'];

const CX = 100;
const CY = 100;

function point(r: number, a: number) {
  return `${(CX + r * Math.cos(a)).toFixed(3)} ${(CY + r * Math.sin(a)).toFixed(3)}`;
}

function arcPath(r0: number, r1: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${point(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${point(r1, a1)} L${point(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${point(r0, a0)}Z`;
}

function buildArcs(count: number, gapDeg: number) {
  const raw = series(count, { min: 8, max: 60, salt: 311 }).sort((x, y) => y - x);
  const total = raw.reduce((t, v) => t + v, 0);
  const gap = (gapDeg * Math.PI) / 180;
  let angle = -Math.PI / 2;
  return raw.map((v, i) => {
    const sweep = (v / total) * Math.PI * 2;
    const a0 = angle + gap / 2;
    const a1 = angle + Math.max(gap / 2 + 0.01, sweep - gap / 2);
    angle += sweep;
    return { name: SEGMENT_NAMES[i], value: Math.round((v / total) * 100), a0, a1, mid: (a0 + a1) / 2 };
  });
}

export function OrbitSegments({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  segments = 5,
  thickness = 28,
  gap = 3,
  lift = 9,
  showOrbit = true,
  showLegend = true,
  speed = 100,
}: OrbitSegmentsProps) {
  const isDark = theme === 'dark';
  const ARCS = useMemo(() => buildArcs(segments, gap), [segments, gap]);
  const [hovered, setHovered] = useState<number | null>(null);

  const spring = useSpring(100, { stiffness: 140, damping: 20 });
  const display = useTransform(spring, (v) => `${Math.round(v)}%`);

  useEffect(() => {
    spring.set(hovered === null ? 100 : ARCS[hovered].value);
  }, [hovered, spring, ARCS]);

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

      <div className={`relative w-full flex-1 min-h-[180px] rounded-[14px] overflow-hidden p-3 flex items-center gap-4 ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <div className="relative w-[160px] h-[160px] shrink-0 mx-auto">
          <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
            {showOrbit && <motion.circle
              cx={CX}
              cy={CY}
              r={94}
              fill="none"
              stroke={hexToRgba(color, 0.25)}
              strokeWidth={1}
              strokeDasharray="2 6"
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              style={{ originX: '50%', originY: '50%' }}
            />}
            {ARCS.map((arc, i) => {
              const isHover = hovered === i;
              const dimmed = hovered !== null && !isHover;
              return (
                <motion.path
                  key={`${segments}-${gap}-${arc.name}`}
                  d={arcPath(Math.max(10, 80 - thickness), 80, arc.a0, arc.a1)}
                  onPointerEnter={() => setHovered(i)}
                  onPointerLeave={() => setHovered(null)}
                  className="cursor-pointer"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{
                    opacity: dimmed ? 0.35 : 1,
                    scale: 1,
                    x: isHover ? Math.cos(arc.mid) * lift : 0,
                    y: isHover ? Math.sin(arc.mid) * lift : 0,
                  }}
                  transition={{
                    opacity: { duration: 0.25, delay: hovered === null ? bySpeed(i * 0.07, speed) : 0 },
                    scale: { type: 'spring', stiffness: 180, damping: 18, delay: bySpeed(i * 0.07, speed) },
                    x: { type: 'spring', stiffness: 320, damping: 22 },
                    y: { type: 'spring', stiffness: 320, damping: 22 },
                  }}
                  style={{ fill: hexToRgba(color, 1 - (i / segments) * 0.8) }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <motion.span className="text-lg font-bold tabular-nums font-sans">{display}</motion.span>
            <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {hovered === null ? 'All traffic' : ARCS[hovered].name}
            </span>
          </div>
        </div>

        {showLegend && <ul className="hidden sm:flex flex-col gap-1.5 pr-2">
          {ARCS.map((arc, i) => (
            <li
              key={arc.name}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered(null)}
              className={`flex items-center gap-2 text-[11px] font-mono cursor-pointer transition-opacity ${
                hovered !== null && hovered !== i ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hexToRgba(color, 1 - (i / segments) * 0.8) }} />
              <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>{arc.name}</span>
            </li>
          ))}
        </ul>}
      </div>
    </div>
  );
}
