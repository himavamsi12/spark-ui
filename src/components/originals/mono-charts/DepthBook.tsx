"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { AnimatedNumber, ChartCard } from './chartKit';

interface DepthBookProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  askColor?: string;
  levels?: number;
  live?: boolean;
  speed?: number;
}

const W = 600;
const H = 180;

/** Cumulative bid/ask ladders for a given tick; each side has `levels` steps. */
function book(levels: number, tick: number) {
  const bids: number[] = [];
  const asks: number[] = [];
  let b = 0;
  let a = 0;
  for (let i = 0; i < levels; i++) {
    b += 2 + seeded(i * 13 + tick * 7 + 1) * 9 + i * 0.35;
    a += 2 + seeded(i * 17 + tick * 11 + 5) * 9 + i * 0.35;
    bids.push(b);
    asks.push(a);
  }
  return { bids, asks };
}

export function DepthBook({
  theme = 'dark',
  compact = false,
  color = '#4ade80',
  askColor = '#ff8a3d',
  levels = 22,
  live = true,
  speed = 100,
}: DepthBookProps) {
  const isDark = theme === 'dark';
  const uid = useId().replace(/:/g, '');
  const [tick, setTick] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setTick((t) => t + 1), bySpeed(1600, speed));
    return () => window.clearInterval(id);
  }, [live, speed]);

  const { bids, asks } = useMemo(() => book(levels, tick), [levels, tick]);
  const max = Math.max(bids[bids.length - 1], asks[asks.length - 1]) * 1.08;
  const mid = 64210 + Math.round((seeded(tick * 3 + 2) - 0.5) * 40);
  const half = W / 2;
  const gapPx = 10;
  const step = (half - gapPx) / levels;
  const y = (v: number) => H - (v / max) * (H - 16);

  // Stepped outlines: bids fan left from the mid gap, asks fan right.
  let bidLine = `M${half - gapPx},${H}`;
  let askLine = `M${half + gapPx},${H}`;
  for (let i = 0; i < levels; i++) {
    const xb = half - gapPx - i * step;
    const xa = half + gapPx + i * step;
    bidLine += `L${xb},${y(bids[i])}L${xb - step},${y(bids[i])}`;
    askLine += `L${xa},${y(asks[i])}L${xa + step},${y(asks[i])}`;
  }
  const bidArea = `${bidLine}L0,${H}Z`;
  const askArea = `${askLine}L${W},${H}Z`;

  // hover: negative = bid level, positive = ask level (1-based)
  function onMove(e: React.PointerEvent) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    if (Math.abs(x - half) < gapPx) return setHover(null);
    const lvl = Math.min(levels, Math.floor(Math.abs(x - half - (x < half ? -gapPx : gapPx)) / step) + 1);
    setHover(x < half ? -lvl : lvl);
  }

  const side = hover === null ? null : hover < 0 ? 'bid' : 'ask';
  const lvl = hover === null ? 0 : Math.abs(hover);
  const size = side === 'bid' ? bids[lvl - 1] : side === 'ask' ? asks[lvl - 1] : 0;
  const price = side === 'bid' ? mid - lvl * 2.5 : mid + lvl * 2.5;
  const hx = side === 'bid' ? half - gapPx - (lvl - 0.5) * step : half + gapPx + (lvl - 0.5) * step;
  const tint = side === 'bid' ? color : askColor;
  const tr = { duration: bySpeed(0.9, speed), ease: [0.22, 1, 0.36, 1] as const };
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Market Depth</span>
          {live && (
            <span className="flex items-center gap-1 text-[10px] font-mono" style={{ color }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: color }} />
                <span className="relative h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              </span>
              LIVE
            </span>
          )}
        </div>
        <div className="text-right">
          <AnimatedNumber value={mid} prefix="$" className="text-sm font-semibold tabular-nums" />
          <div className={`text-[10px] font-mono ${muted}`}>spread 0.02%</div>
        </div>
      </div>

      <div className={`relative flex-1 min-h-[120px] rounded-[14px] overflow-hidden ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity={0.32} />
              <stop offset="1" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`${uid}-s`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={askColor} stopOpacity={0.32} />
              <stop offset="1" stopColor={askColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <motion.g initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ originY: 1, transformBox: 'view-box' }} transition={{ duration: bySpeed(0.9, speed), ease: [0.22, 1, 0.36, 1] }}>
            <motion.path d={bidArea} initial={false} animate={{ d: bidArea }} transition={tr} fill={`url(#${uid}-b)`} />
            <motion.path d={askArea} initial={false} animate={{ d: askArea }} transition={tr} fill={`url(#${uid}-s)`} />
            <motion.path d={bidLine} initial={false} animate={{ d: bidLine }} transition={tr} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <motion.path d={askLine} initial={false} animate={{ d: askLine }} transition={tr} fill="none" stroke={askColor} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </motion.g>
          <line x1={half} x2={half} y1={0} y2={H} stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          {side && (
            <>
              <rect
                x={side === 'bid' ? hx - step / 2 : half + gapPx}
                width={side === 'bid' ? half - gapPx - (hx - step / 2) : hx + step / 2 - half - gapPx}
                y={0}
                height={H}
                fill={hexToRgba(tint, 0.08)}
              />
              <line x1={hx} x2={hx} y1={0} y2={H} stroke={tint} strokeOpacity={0.6} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>

        <AnimatePresence>
          {side && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, left: `${(hx / W) * 100}%` }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              className={`pointer-events-none absolute top-2 -translate-x-1/2 rounded-lg px-2 py-1 text-[10px] font-mono whitespace-nowrap border ${
                isDark ? 'bg-[#141416]/90 border-white/10' : 'bg-white/90 border-black/10'
              }`}
            >
              <div style={{ color: tint }}>{side === 'bid' ? 'BID' : 'ASK'} ${price.toFixed(1)}</div>
              <div className={muted}>Σ {size.toFixed(1)} BTC</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ChartCard>
  );
}
