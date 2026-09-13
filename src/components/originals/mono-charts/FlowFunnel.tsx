"use client";

import React, { useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { AnimatedNumber, ChartCard, smoothPath } from './chartKit';

interface FlowFunnelProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  stages?: number;
  particles?: number;
  showRates?: boolean;
  speed?: number;
}

const W = 600;
const H = 180;
const MID = H / 2;
const NAMES = ['Visit', 'Sign up', 'Activate', 'Trial', 'Subscribe', 'Renew'];

export function FlowFunnel({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  stages = 5,
  particles = 42,
  showRates = true,
  speed = 100,
}: FlowFunnelProps) {
  const isDark = theme === 'dark';
  const uid = useId().replace(/:/g, '');
  const n = Math.max(3, Math.min(NAMES.length, Math.round(stages)));
  const [hover, setHover] = useState<number | null>(null);

  const values = useMemo(() => {
    const out = [100];
    for (let i = 1; i < n; i++) out.push(out[i - 1] * (0.48 + seeded(i * 19 + 4) * 0.32));
    return out;
  }, [n]);

  const colW = W / n;
  const centers = values.map((_, i) => (i + 0.5) * colW);
  const hOf = (v: number) => Math.max(10, (v / 100) * (H - 24));
  const top: [number, number][] = [[0, MID - hOf(values[0]) / 2], ...values.map((v, i) => [centers[i], MID - hOf(v) / 2] as [number, number]), [W, MID - hOf(values[n - 1]) / 2]];
  const bottom = top.map(([x, y]) => [x, H - y] as [number, number]).reverse();
  const band = `${smoothPath(top)}L${bottom[0][0]},${bottom[0][1]}${smoothPath(bottom).replace(/^M[^C]*/, '')}Z`;

  const dots = useMemo(() => {
    const list = [];
    for (let p = 0; p < particles; p++) {
      // how far this visitor gets, following the stage-to-stage conversion rates
      let reach = 0;
      while (reach < n - 1 && seeded(p * 37 + reach * 11 + 5) < values[reach + 1] / values[reach]) reach++;
      const offset = (seeded(p * 53 + 2) - 0.5) * 1.5;
      list.push({ id: p, reach, offset, delay: seeded(p * 71 + 9) * 6 });
    }
    return list;
  }, [particles, n, values]);

  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const pct = (x: number) => `${(x / W) * 100}%`;
  const ypct = (y: number) => `${(y / H) * 100}%`;

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Conversion Flow</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <AnimatedNumber value={hover === null ? values[n - 1] : values[hover]} decimals={1} suffix="%" className="text-xl font-semibold tabular-nums" />
            <span className={`text-[10px] font-mono ${muted}`}>{hover === null ? 'end-to-end' : `reach ${NAMES[hover]}`}</span>
          </div>
        </div>
        <div className={`text-[10px] font-mono ${muted}`}>12,480 visitors</div>
      </div>

      <div className={`relative flex-1 min-h-[130px] rounded-[14px] overflow-hidden ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={color} stopOpacity={isDark ? 0.42 : 0.3} />
              <stop offset="1" stopColor={color} stopOpacity={isDark ? 0.1 : 0.08} />
            </linearGradient>
          </defs>
          <motion.path
            d={band}
            fill={`url(#${uid}-g)`}
            stroke={hexToRgba(color, 0.55)}
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            style={{ originX: 0, transformBox: 'view-box' }}
            transition={{ duration: bySpeed(0.9, speed), ease: [0.22, 1, 0.36, 1] }}
          />
          {values.slice(1).map((_, i) => (
            <line key={i} x1={(i + 1) * colW} x2={(i + 1) * colW} y1={8} y2={H - 8} stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>

        {/* particles ride the band and drop out where visitors churn */}
        {dots.map((d) => {
          const keysX = [0, ...centers.slice(0, d.reach + 1)];
          const keysY = [MID + (d.offset * hOf(values[0])) / 2 * 0.7, ...values.slice(0, d.reach + 1).map((v) => MID + (d.offset * hOf(v)) / 2 * 0.7)];
          const finished = d.reach === n - 1;
          const left = finished ? [...keysX, W] : [...keysX, keysX[keysX.length - 1] + colW * 0.25];
          const topK = finished ? [...keysY, keysY[keysY.length - 1]] : [...keysY, keysY[keysY.length - 1] + 26];
          const opacity = left.map((_, i) => (i === left.length - 1 ? 0 : i === 0 ? 0 : 1));
          const dur = bySpeed(1.1 * (d.reach + 1.5), speed);
          return (
            <motion.span
              key={d.id}
              className="pointer-events-none absolute block h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: finished ? color : hexToRgba(color, 0.8), boxShadow: finished ? `0 0 8px ${color}` : undefined }}
              initial={{ left: pct(0), top: ypct(keysY[0]), opacity: 0 }}
              animate={{ left: left.map(pct), top: topK.map(ypct), opacity }}
              transition={{ duration: dur, ease: 'linear', repeat: Infinity, repeatDelay: bySpeed(1.2, speed), delay: bySpeed(d.delay, speed) }}
            />
          );
        })}

        {/* stage hit areas + labels */}
        <div className="absolute inset-0 flex">
          {values.map((v, i) => (
            <div key={i} className="relative flex-1 cursor-pointer" onPointerEnter={() => setHover(i)}>
              <motion.div className="absolute inset-0" animate={{ backgroundColor: hover === i ? hexToRgba(color, 0.07) : 'rgba(0,0,0,0)' }} />
              <div className={`absolute top-1.5 inset-x-0 text-center text-[10px] ${hover === i ? (isDark ? 'text-white' : 'text-black') : muted}`}>{NAMES[i]}</div>
              {showRates && i > 0 && (
                <div className="absolute bottom-1.5 inset-x-0 text-center text-[9px] font-mono" style={{ color: hover === i ? color : undefined }}>
                  <span className={hover === i ? '' : muted}>{((v / values[i - 1]) * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
