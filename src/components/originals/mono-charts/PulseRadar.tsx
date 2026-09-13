"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, series } from './chartData';

interface PulseRadarProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  axes?: number;
  fillOpacity?: number;
  strokeWidth?: number;
  sweepDuration?: number;
  showSweep?: boolean;
  showPulse?: boolean;
  speed?: number;
}

const AXIS_NAMES = ['Speed', 'Power', 'Range', 'Focus', 'Agility', 'Stamina', 'Vision', 'Control', 'Balance', 'Grip'];
const SET_KEYS = ['Current', 'Previous'] as const;
type SetKey = (typeof SET_KEYS)[number];

const CX = 110;
const CY = 110;
const R = 78;

function vertex(i: number, ratio: number, n: number) {
  const a = (Math.PI * 2 * i) / n - Math.PI / 2;
  return { x: CX + Math.cos(a) * R * ratio, y: CY + Math.sin(a) * R * ratio };
}

function polygon(values: number[]) {
  return (
    values
      .map((v, i) => {
        const p = vertex(i, v / 100, values.length);
        return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      })
      .join(' ') + ' Z'
  );
}

export function PulseRadar({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  axes = 6,
  fillOpacity = 22,
  strokeWidth = 2,
  sweepDuration = 6,
  showSweep = true,
  showPulse = true,
  speed = 100,
}: PulseRadarProps) {
  const isDark = theme === 'dark';
  const [setKey, setSetKey] = useState<SetKey>('Current');
  const AXES = AXIS_NAMES.slice(0, axes);
  const SETS = useMemo(
    () => ({
      Current: series(axes, { min: 55, max: 96, salt: 421 }),
      Previous: series(axes, { min: 40, max: 85, salt: 422 }),
    }),
    [axes]
  );
  const values = SETS[setKey];
  const spring = { type: 'spring' as const, stiffness: 90 * (speed / 100), damping: 14 };
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

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
          {SET_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSetKey(k)}
              className={`relative px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                setKey === k ? 'text-void' : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
              }`}
            >
              {setKey === k && (
                <motion.span
                  layoutId="pulse-radar-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: color }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{k}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`relative w-full flex-1 min-h-[190px] rounded-[14px] overflow-hidden flex items-center justify-center ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <svg viewBox="0 0 220 220" className="h-[190px] w-[190px] overflow-visible">
          {[0.25, 0.5, 0.75, 1].map((ring) => (
            <path key={ring} d={polygon(AXES.map(() => ring * 100))} fill="none" stroke={gridStroke} strokeWidth={1} />
          ))}
          {AXES.map((axis, i) => {
            const end = vertex(i, 1, axes);
            const label = vertex(i, 1.22, axes);
            return (
              <g key={axis}>
                <line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke={gridStroke} strokeWidth={1} />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-mono"
                  fontSize={8}
                  fill={isDark ? '#71717A' : '#A1A1AA'}
                >
                  {axis}
                </text>
              </g>
            );
          })}

          {showSweep && <g key={`sweep-${sweepDuration}`}>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${CX} ${CY}`}
              to={`360 ${CX} ${CY}`}
              dur={`${sweepDuration}s`}
              repeatCount="indefinite"
            />
            <path d={`M${CX} ${CY} L${CX} ${CY - R} A${R} ${R} 0 0 1 ${vertex(1, 1, 6).x.toFixed(2)} ${vertex(1, 1, 6).y.toFixed(2)} Z`} fill={hexToRgba(color, 0.12)} />
            <line x1={CX} y1={CY} x2={CX} y2={CY - R} stroke={hexToRgba(color, 0.6)} strokeWidth={1} />
          </g>}

          <motion.path
            key={`poly-${axes}`}
            initial={{ d: polygon(AXES.map(() => 0)) }}
            animate={{ d: polygon(values) }}
            transition={spring}
            fill={hexToRgba(color, fillOpacity / 100)}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />

          {values.map((v, i) => {
            const p = vertex(i, v / 100, axes);
            return (
              <g key={`${axes}-${i}`}>
                <motion.circle
                  r={strokeWidth + 1.5}
                  fill={color}
                  initial={{ cx: CX, cy: CY }}
                  animate={{ cx: p.x, cy: p.y }}
                  transition={spring}
                />
                {showPulse && <motion.circle
                  r={3.5}
                  fill="none"
                  stroke={color}
                  initial={{ cx: CX, cy: CY }}
                  animate={{ cx: p.x, cy: p.y, r: [3.5, 10], opacity: [0.8, 0] }}
                  transition={{
                    cx: spring,
                    cy: spring,
                    r: { duration: bySpeed(1.8, speed), repeat: Infinity, delay: bySpeed(i * 0.3, speed), ease: 'easeOut' },
                    opacity: { duration: bySpeed(1.8, speed), repeat: Infinity, delay: bySpeed(i * 0.3, speed), ease: 'easeOut' },
                  }}
                />}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
