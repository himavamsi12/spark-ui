"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, animate, motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { AnimatedNumber, ChartCard } from './chartKit';

interface DrillSunburstProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  categories?: number;
  ringGap?: number;
  padAngle?: number;
  showLegend?: boolean;
  speed?: number;
}

const TREE = [
  { name: 'Product', kids: ['Design', 'Frontend', 'Mobile', 'QA'] },
  { name: 'Growth', kids: ['Ads', 'SEO', 'Partners'] },
  { name: 'Infra', kids: ['Cloud', 'Security', 'Data', 'Tooling'] },
  { name: 'People', kids: ['Hiring', 'Benefits', 'Offsites'] },
  { name: 'Ops', kids: ['Legal', 'Finance', 'Facilities'] },
];
const SHADES = [1, 0.72, 0.52, 0.36, 0.24];
const TAU = Math.PI * 2;
const S = 220;
const C = S / 2;

type Span = [number, number];
type Layout = { inner: Span[]; outer: Span[][] };

function sector(r0: number, r1: number, a0: number, a1: number) {
  const span = Math.min(a1 - a0, TAU - 0.0004);
  if (span <= 0.0005) return '';
  const e = a0 + span;
  const p = (r: number, a: number) => `${(C + r * Math.sin(a)).toFixed(2)},${(C - r * Math.cos(a)).toFixed(2)}`;
  const large = span > Math.PI ? 1 : 0;
  return `M${p(r1, a0)} A${r1},${r1} 0 ${large},1 ${p(r1, e)} L${p(r0, e)} A${r0},${r0} 0 ${large},0 ${p(r0, a0)} Z`;
}

export function DrillSunburst({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  categories = 5,
  ringGap = 4,
  padAngle = 1.2,
  showLegend = true,
  speed = 100,
}: DrillSunburstProps) {
  const isDark = theme === 'dark';
  const count = Math.max(2, Math.min(TREE.length, Math.round(categories)));

  const values = useMemo(
    () => TREE.slice(0, count).map((c, i) => c.kids.map((_, j) => 12 + Math.round(seeded(i * 31 + j * 7 + 3) * 60))),
    [count],
  );
  const sums = values.map((k) => k.reduce((a, b) => a + b, 0));
  const total = sums.reduce((a, b) => a + b, 0);

  const layoutFor = (focus: number | null): Layout => {
    const inner: Span[] = [];
    const outer: Span[][] = [];
    let a = 0;
    for (let i = 0; i < count; i++) {
      let s0: number;
      let s1: number;
      if (focus === null) {
        s0 = a;
        s1 = a + (sums[i] / total) * TAU;
        a = s1;
      } else if (i === focus) {
        s0 = 0;
        s1 = TAU;
      } else {
        s0 = s1 = i < focus ? 0 : TAU;
      }
      inner.push([s0, s1]);
      let b = s0;
      outer.push(
        values[i].map((v) => {
          const span: Span = [b, b + (v / sums[i]) * (s1 - s0)];
          b = span[1];
          return span;
        }),
      );
    }
    return { inner, outer };
  };

  const [focus, setFocus] = useState<number | null>(null);
  const [trans, setTrans] = useState<{ from: Layout; to: Layout } | null>(null);
  const [t, setT] = useState(1);
  const [hover, setHover] = useState<{ c: number; k: number | null } | null>(null);

  const target = layoutFor(focus);
  const lerp = (x: number, y: number) => x + (y - x) * t;
  const current: Layout =
    trans && t < 1
      ? {
          inner: trans.to.inner.map((s, i) => [lerp(trans.from.inner[i][0], s[0]), lerp(trans.from.inner[i][1], s[1])]),
          outer: trans.to.outer.map((kids, i) => kids.map((s, j) => [lerp(trans.from.outer[i][j][0], s[0]), lerp(trans.from.outer[i][j][1], s[1])] as Span)),
        }
      : target;

  useEffect(() => {
    if (!trans) return;
    const ctrl = animate(0, 1, { duration: bySpeed(0.75, speed), ease: [0.65, 0, 0.35, 1], onUpdate: setT });
    return () => ctrl.stop();
  }, [trans, speed]);

  function drill(next: number | null) {
    if (next === focus) return;
    setTrans({ from: current, to: layoutFor(next) });
    setT(0);
    setFocus(next);
    setHover(null);
  }

  const pad = (padAngle * Math.PI) / 180;
  const r0 = 40;
  const r1 = 70;
  const r2 = r1 + ringGap;
  const r3 = 104;
  const shade = (i: number, j?: number) => {
    const base = SHADES[i] * (j === undefined ? 1 : 0.9 - j * 0.14);
    return isDark ? hexToRgba(color, Math.max(0.1, base)) : hexToRgba('#09090b', Math.max(0.1, base * 0.85 + 0.05));
  };

  const centerLabel = hover
    ? hover.k === null
      ? { name: TREE[hover.c].name, value: sums[hover.c] }
      : { name: TREE[hover.c].kids[hover.k], value: values[hover.c][hover.k] }
    : focus === null
      ? { name: 'Total spend', value: total }
      : { name: TREE[focus].name, value: sums[focus] };

  const legend =
    focus === null
      ? TREE.slice(0, count).map((c, i) => ({ key: `c${i}`, name: c.name, value: sums[i], fill: shade(i), h: { c: i, k: null as number | null } }))
      : TREE[focus].kids.map((k, j) => ({ key: `k${j}`, name: k, value: values[focus][j], fill: shade(focus, j), h: { c: focus, k: j as number | null } }));

  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
          <button type="button" onClick={() => drill(null)} className={`cursor-pointer uppercase ${focus === null ? muted : 'text-neutral-500 hover:text-white'}`}>
            Budget
          </button>
          <AnimatePresence>
            {focus !== null && (
              <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} className="flex items-center gap-1.5" style={{ color }}>
                <span className={muted}>/</span>
                {TREE[focus].name}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <span className={`text-[10px] font-mono ${muted}`}>{focus === null ? 'click a slice' : 'click centre to go back'}</span>
      </div>

      <div className={`relative flex-1 min-h-[150px] rounded-[14px] flex items-center justify-center gap-4 px-3 ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <motion.div
          className={`relative shrink-0 ${compact ? 'h-[132px] w-[132px]' : 'h-[176px] w-[176px]'}`}
          initial={{ scale: 0.6, opacity: 0, rotate: -40 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          <svg viewBox={`0 0 ${S} ${S}`} className="absolute inset-0 w-full h-full" onPointerLeave={() => setHover(null)}>
            {current.inner.map(([a0, a1], i) => {
              const hot = hover?.c === i && hover.k === null;
              return (
                <path
                  key={`i${i}`}
                  d={sector(r0, hot ? r1 + 3 : r1, a0 + pad / 2, a1 - pad / 2)}
                  fill={shade(i)}
                  className="cursor-pointer transition-[opacity] duration-200"
                  opacity={hover && hover.c !== i ? 0.35 : 1}
                  onPointerEnter={() => setHover({ c: i, k: null })}
                  onClick={() => drill(focus === i ? null : i)}
                />
              );
            })}
            {current.outer.map((kids, i) =>
              kids.map(([a0, a1], j) => {
                const hot = hover?.c === i && hover.k === j;
                return (
                  <path
                    key={`o${i}-${j}`}
                    d={sector(r2, hot ? r3 + 4 : r3, a0 + pad / 2, a1 - pad / 2)}
                    fill={shade(i, j)}
                    className="cursor-pointer transition-[opacity] duration-200"
                    opacity={hover && !(hover.c === i && (hover.k === j || hover.k === null)) ? 0.3 : 1}
                    onPointerEnter={() => setHover({ c: i, k: j })}
                    onClick={() => drill(focus === i ? null : i)}
                  />
                );
              }),
            )}
            <circle cx={C} cy={C} r={r0 - 4} fill="transparent" className={focus !== null ? 'cursor-pointer' : ''} onClick={() => drill(null)} />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={centerLabel.name}
                initial={{ opacity: 0, y: 5, filter: 'blur(3px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -5, filter: 'blur(3px)' }}
                transition={{ duration: 0.2 }}
                className={`text-[9px] font-mono max-w-[58px] truncate ${muted}`}
              >
                {centerLabel.name}
              </motion.span>
            </AnimatePresence>
            <AnimatedNumber value={centerLabel.value} prefix="$" suffix="k" className="text-sm font-semibold tabular-nums" />
          </div>
        </motion.div>

        {showLegend && (
          <div className="min-w-0 flex-1 max-w-[150px] flex flex-col gap-1">
            <AnimatePresence mode="popLayout">
              {legend.map((row, idx) => (
                <motion.button
                  key={`${focus}-${row.key}`}
                  type="button"
                  layout
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: hover && !(hover.c === row.h.c && (row.h.k === null || hover.k === row.h.k)) ? 0.4 : 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: idx * 0.03 }}
                  onPointerEnter={() => setHover(row.h)}
                  onPointerLeave={() => setHover(null)}
                  onClick={() => focus === null && drill(row.h.c)}
                  className="flex items-center justify-between gap-2 text-[11px] cursor-pointer text-left"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: row.fill }} />
                    <span className={`truncate ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{row.name}</span>
                  </span>
                  <span className="font-mono tabular-nums">${row.value}k</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
