"use client";

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { AnimatedNumber, ChartCard, Segmented } from './chartKit';

type Metric = 'users' | 'revenue';

interface ShareStripProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  segments?: number;
  stripHeight?: number;
  segmentGap?: number;
  expandOnHover?: boolean;
  speed?: number;
}

const CHANNELS = ['Organic', 'Paid', 'Referral', 'Social', 'Email', 'Direct'];
const ALPHAS = [1, 0.7, 0.48, 0.32, 0.2, 0.12];

export function ShareStrip({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  segments = 5,
  stripHeight = 34,
  segmentGap = 4,
  expandOnHover = true,
  speed = 100,
}: ShareStripProps) {
  const isDark = theme === 'dark';
  const [metric, setMetric] = useState<Metric>('users');
  const [hover, setHover] = useState<number | null>(null);
  const count = Math.max(2, Math.min(CHANNELS.length, segments));

  const values = useMemo(() => {
    const salt = metric === 'users' ? 7 : 13;
    const raw = Array.from({ length: count }, (_, i) => 0.3 + seeded(salt * 29 + i * 5) * (count - i * 0.6));
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map((r) => r / sum);
  }, [count, metric]);

  const totals = metric === 'users' ? 48210 : 912400;
  const fill = (i: number) => (isDark ? hexToRgba(color, ALPHAS[i]) : hexToRgba('#09090b', ALPHAS[i] * 0.85 + 0.06));
  const spring = { type: 'spring' as const, stiffness: 260 * (speed / 100), damping: 28 };
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const focus = hover ?? 0;

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Channel Mix</span>
        <Segmented
          id="share-strip"
          isDark={isDark}
          color={color}
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'users', label: 'Users' },
            { value: 'revenue', label: 'Revenue' },
          ]}
        />
      </div>

      <div className={`relative flex-1 min-h-[140px] rounded-[14px] p-3 flex flex-col gap-3 ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <div className="flex items-end justify-between">
          <div>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={focus}
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.25 }}
                className={`text-[10px] font-mono ${muted}`}
              >
                {CHANNELS[focus]}
              </motion.div>
            </AnimatePresence>
            <AnimatedNumber
              value={values[focus] * totals}
              prefix={metric === 'revenue' ? '$' : ''}
              className="text-xl font-semibold tabular-nums tracking-tight"
            />
          </div>
          <AnimatedNumber value={values[focus] * 100} decimals={1} suffix="%" className="text-sm font-mono tabular-nums" style={{ color }} />
        </div>

        {/* strip: widths are flex-grow springs, so hovering a segment makes room without reflow jumps */}
        <div className="flex w-full" style={{ height: stripHeight, gap: segmentGap }} onPointerLeave={() => setHover(null)}>
          {values.map((v, i) => {
            const grow = v * 100 + (expandOnHover && hover === i ? 14 : 0);
            return (
              <motion.div
                key={i}
                onPointerEnter={() => setHover(i)}
                className="relative h-full min-w-[6px] overflow-hidden cursor-pointer"
                style={{ borderRadius: Math.min(10, stripHeight / 2.5) }}
                initial={{ flexGrow: 0, opacity: 0 }}
                animate={{
                  flexGrow: grow,
                  opacity: hover !== null && hover !== i ? 0.55 : 1,
                  backgroundColor: fill(i),
                  scaleY: hover === i ? 1.12 : 1,
                }}
                transition={{ flexGrow: { ...spring, delay: bySpeed(i * 0.06, speed) }, opacity: { duration: 0.2 }, scaleY: spring, backgroundColor: { duration: 0.3 } }}
              >
                <motion.span
                  className="absolute inset-y-0 w-1/3 -skew-x-12"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)' }}
                  initial={{ left: '-40%' }}
                  animate={{ left: hover === i ? '120%' : '-40%' }}
                  transition={{ duration: hover === i ? 0.7 : 0, ease: 'easeOut' }}
                />
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
          {values.map((v, i) => (
            <div
              key={i}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              className="flex items-center justify-between text-[11px] cursor-pointer"
              style={{ opacity: hover !== null && hover !== i ? 0.45 : 1, transition: 'opacity 200ms' }}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: fill(i) }} />
                <span className={`truncate ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{CHANNELS[i]}</span>
              </span>
              <AnimatedNumber value={v * 100} decimals={0} suffix="%" className="font-mono tabular-nums" />
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
