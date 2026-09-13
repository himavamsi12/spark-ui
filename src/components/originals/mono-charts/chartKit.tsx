"use client";

import React, { useEffect, useId } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';

/** Catmull-Rom spline through the points, emitted as cubic Béziers. Same point
 * count in → same command count out, so Motion can morph between datasets. */
export function smoothPath(pts: [number, number][], tension = 1): string {
  if (pts.length === 0) return '';
  const r = (n: number) => Math.round(n * 10) / 10;
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += `C${r(c1x)},${r(c1y)} ${r(c2x)},${r(c2y)} ${r(p2[0])},${r(p2[1])}`;
  }
  return d;
}

/** A number that springs to its new value instead of jumping. */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  style,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const spring = useSpring(value, { stiffness: 140, damping: 22 });
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  const text = useTransform(spring, (v) =>
    `${prefix}${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`,
  );
  return (
    <motion.span className={className} style={style}>
      {text}
    </motion.span>
  );
}

/** Shared card shell matching the rest of the chart kit. */
export function ChartCard({
  theme,
  compact,
  children,
  className = '',
}: {
  theme: 'dark' | 'light';
  compact: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const isDark = theme === 'dark';
  return (
    <div
      className={`relative w-full rounded-[24px] transition-colors duration-300 flex flex-col overflow-hidden p-4 sm:p-5 ${
        compact ? 'h-[220px] sm:h-[268px]' : 'min-h-[290px]'
      } ${
        isDark
          ? 'bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] text-white'
          : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-neutral-100 text-black'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Pill segmented control with a sliding highlight. */
export function Segmented<T extends string>({
  id,
  options,
  value,
  onChange,
  color,
  isDark,
}: {
  id: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  color: string;
  isDark: boolean;
}) {
  const uid = useId();
  return (
    <div className={`relative p-0.5 rounded-full border flex items-center gap-0.5 ${isDark ? 'bg-white/5 border-white/10' : 'bg-neutral-100 border-neutral-200'}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative px-2.5 py-0.5 rounded-full text-[11px] font-medium cursor-pointer transition-colors ${
            value === o.value ? 'text-[#08080a]' : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-black'
          }`}
        >
          {value === o.value && (
            <motion.span
              layoutId={`${id}-${uid}`}
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: color }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
