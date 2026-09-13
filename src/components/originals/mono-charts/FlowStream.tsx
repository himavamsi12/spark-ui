"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, series } from './chartData';

interface FlowStreamProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  sources?: number;
  particles?: number;
  particleSize?: number;
  bandScale?: number;
  showPulse?: boolean;
  speed?: number;
}

const W = 320;
const H = 170;
const TARGET = { x: 272, y: 85 };

const SOURCE_NAMES = ['API', 'Web', 'Edge', 'iOS', 'Android', 'Batch'];

function buildChannels(count: number, bandScale: number) {
  const weights = series(count, { min: 15, max: 90, salt: 441 });
  const total = weights.reduce((t, v) => t + v, 0);
  const slot = H / count;
  return weights.map((w, i) => {
    const y = slot * i + slot / 2;
    const share = Math.round((w / total) * 100);
    return {
      label: SOURCE_NAMES[i],
      y,
      share,
      d: `M58 ${y.toFixed(1)} C150 ${y.toFixed(1)} 170 ${TARGET.y} ${TARGET.x - 22} ${TARGET.y}`,
      width: 2 + (share / 100) * (bandScale / 3),
      box: Math.min(26, slot - 4),
    };
  });
}

export function FlowStream({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  sources = 3,
  particles = 4,
  particleSize = 2.2,
  bandScale = 60,
  showPulse = true,
  speed = 100,
}: FlowStreamProps) {
  const CHANNELS = useMemo(() => buildChannels(sources, bandScale), [sources, bandScale]);
  const isDark = theme === 'dark';
  const [focus, setFocus] = useState<number | null>(null);

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

      <div className={`relative w-full flex-1 min-h-[180px] rounded-[14px] overflow-hidden p-2 flex items-center ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
          {CHANNELS.map((ch, i) => {
            const dim = focus !== null && focus !== i;
            return (
              <g
                key={ch.label}
                onPointerEnter={() => setFocus(i)}
                onPointerLeave={() => setFocus(null)}
                className="cursor-pointer"
              >
                <motion.path
                  d={ch.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={ch.width}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: dim ? 0.06 : focus === i ? 0.4 : 0.16 }}
                  transition={{
                    pathLength: { duration: bySpeed(1.1, speed), delay: bySpeed(i * 0.15, speed), ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.3 },
                  }}
                />

                {Array.from({ length: particles }, (_, p) => {
                  const dur = bySpeed(2.4 - ch.share / 100, speed);
                  return (
                  <circle
                    key={`${sources}-${particles}-${p}`}
                    r={focus === i ? particleSize + 1 : particleSize}
                    fill={color}
                    opacity={dim ? 0.15 : 0.95}
                    style={{ transition: 'opacity 0.3s, r 0.3s' }}
                  >
                    <animateMotion
                      dur={`${dur.toFixed(2)}s`}
                      repeatCount="indefinite"
                      begin={`${((p * dur) / particles + i * 0.2).toFixed(2)}s`}
                      path={ch.d}
                      calcMode="spline"
                      keyTimes="0;1"
                      keySplines="0.4 0 0.2 1"
                    />
                  </circle>
                  );
                })}

                <motion.rect
                  x={18}
                  y={ch.y - ch.box / 2}
                  width={40}
                  height={ch.box}
                  rx={8}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: dim ? 0.35 : 1, x: 0 }}
                  transition={{ delay: bySpeed(i * 0.1, speed), type: 'spring', stiffness: 200, damping: 20 }}
                  fill={hexToRgba(color, focus === i ? 0.35 : 0.18)}
                  stroke={hexToRgba(color, 0.5)}
                />
                <text
                  x={38}
                  y={ch.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  className="font-mono pointer-events-none"
                  fill={isDark ? '#e5e5e5' : '#262626'}
                >
                  {ch.label}
                </text>
              </g>
            );
          })}

          {showPulse && <motion.circle
            cx={TARGET.x}
            cy={TARGET.y}
            r={30}
            fill={hexToRgba(color, 0.1)}
            animate={{ r: [26, 34, 26] }}
            transition={{ duration: bySpeed(2.4, speed), repeat: Infinity, ease: 'easeInOut' }}
          />}
          <circle cx={TARGET.x} cy={TARGET.y} r={22} fill={color} />
          <text
            x={TARGET.x}
            y={TARGET.y + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fontWeight={700}
            className="font-mono pointer-events-none"
            fill="#08080a"
          >
            {focus === null ? '100%' : `${CHANNELS[focus].share}%`}
          </text>
        </svg>
      </div>
    </div>
  );
}
