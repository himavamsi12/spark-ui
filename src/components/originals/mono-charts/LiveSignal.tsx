"use client";

import React, { useEffect, useId, useState } from 'react';
import { motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded, series } from './chartData';
import { AnimatedNumber, ChartCard, smoothPath } from './chartKit';

interface LiveSignalProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  alertColor?: string;
  points?: number;
  interval?: number;
  volatility?: number;
  threshold?: number;
  showThreshold?: boolean;
  speed?: number;
}

const W = 600;
const H = 180;
const HEAD_PAD = 24;

function nextValue(prev: number, tick: number, volatility: number) {
  const drift = (seeded(tick * 53 + 7) - 0.5) * volatility;
  const pull = (55 - prev) * 0.08;
  return Math.max(6, Math.min(96, prev + drift + pull));
}

export function LiveSignal({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  alertColor = '#f43f5e',
  points = 40,
  interval = 900,
  volatility = 22,
  threshold = 72,
  showThreshold = true,
  speed = 100,
}: LiveSignalProps) {
  const isDark = theme === 'dark';
  const uid = useId().replace(/:/g, '');
  const n = Math.max(8, Math.round(points));
  const [state, setState] = useState(() => ({ tick: 0, data: series(n + 1, { min: 30, max: 80, salt: 777 }) }));
  const [prevN, setPrevN] = useState(n);
  if (prevN !== n) {
    setPrevN(n);
    setState({ tick: 0, data: series(n + 1, { min: 30, max: 80, salt: 777 }) });
  }
  const [paused, setPaused] = useState(false);
  const ms = bySpeed(interval, speed);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setState((s) => {
        const last = s.data[s.data.length - 1];
        return { tick: s.tick + 1, data: [...s.data.slice(1), nextValue(last, s.tick + 1, volatility)] };
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [paused, ms, volatility]);

  const { tick, data } = state;
  const step = W / (n - 1);
  const y = (v: number) => 10 + (1 - v / 100) * (H - 20);
  const pts: [number, number][] = data.map((v, i) => [i * step, y(v)]);
  const line = smoothPath(pts);
  const area = `${line}L${pts[pts.length - 1][0]},${H}L0,${H}Z`;

  const current = data[data.length - 2];
  const incoming = data[data.length - 1];
  const hot = showThreshold && incoming >= threshold;
  const headColor = hot ? alertColor : color;
  const thY = y(threshold);
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div>
            <div className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Throughput</div>
            <div className="flex items-baseline gap-1">
              <AnimatedNumber value={incoming * 12.4} decimals={0} className="text-xl font-semibold tabular-nums" style={{ color: hot ? alertColor : undefined }} />
              <span className={`text-[10px] font-mono ${muted}`}>req/s</span>
            </div>
          </div>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => setPaused((p) => !p)}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border cursor-pointer ${
            isDark ? 'border-white/10 bg-white/5 text-neutral-300 hover:text-white' : 'border-neutral-200 bg-neutral-100 text-neutral-600'
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            {!paused && <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: headColor }} />}
            <span className="relative h-1.5 w-1.5 rounded-full" style={{ backgroundColor: paused ? '#71717a' : headColor }} />
          </span>
          {paused ? 'Resume' : 'Live'}
        </motion.button>
      </div>

      <div className={`relative flex-1 min-h-[120px] rounded-[14px] overflow-hidden ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <svg viewBox={`0 0 ${W + HEAD_PAD} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity={0.26} />
              <stop offset="1" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <clipPath id={`${uid}-c`}>
              <rect x={0} y={0} width={W} height={H} />
            </clipPath>
            <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity={0} />
              <stop offset="0.12" stopColor="#fff" stopOpacity={1} />
            </linearGradient>
            <mask id={`${uid}-m`}>
              <rect x={0} y={0} width={W} height={H} fill={`url(#${uid}-fade)`} />
            </mask>
          </defs>

          {showThreshold && (
            <>
              <rect x={0} y={0} width={W + HEAD_PAD} height={thY} fill={hexToRgba(alertColor, isDark ? 0.05 : 0.06)} />
              <line x1={0} x2={W + HEAD_PAD} y1={thY} y2={thY} stroke={alertColor} strokeOpacity={0.5} strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
            </>
          )}

          <g clipPath={`url(#${uid}-c)`} mask={`url(#${uid}-m)`}>
            {/* the whole trace glides one step left per tick, then the buffer shifts — seamless scrolling */}
            <motion.g
              key={`${tick}-${paused}`}
              initial={{ x: 0 }}
              animate={{ x: paused ? 0 : -step }}
              transition={{ duration: ms / 1000, ease: 'linear' }}
            >
              <path d={area} fill={`url(#${uid}-f)`} />
              <path d={line} fill="none" stroke={isDark ? color : '#09090b'} strokeWidth={2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </motion.g>
          </g>
        </svg>

        {/* head rides the right edge, interpolating between the last two samples */}
        <motion.div
          key={`h-${tick}-${paused}`}
          className="pointer-events-none absolute"
          style={{ left: `${(W / (W + HEAD_PAD)) * 100}%` }}
          initial={{ top: `${(y(current) / H) * 100}%` }}
          animate={{ top: `${(y(paused ? current : incoming) / H) * 100}%` }}
          transition={{ duration: ms / 1000, ease: 'linear' }}
        >
          <span className="absolute -translate-x-1/2 -translate-y-1/2 block h-5 w-5 rounded-full animate-ping" style={{ backgroundColor: hexToRgba(headColor, 0.35) }} />
          <span className="absolute -translate-x-1/2 -translate-y-1/2 block h-2.5 w-2.5 rounded-full transition-colors" style={{ backgroundColor: headColor, boxShadow: `0 0 12px ${headColor}` }} />
        </motion.div>
        {showThreshold && (
          <span className="absolute right-2 text-[9px] font-mono" style={{ top: `calc(${(thY / H) * 100}% - 14px)`, color: alertColor }}>
            limit {threshold}
          </span>
        )}
      </div>
    </ChartCard>
  );
}
