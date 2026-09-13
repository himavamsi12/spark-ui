"use client";

import React, { useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { bySpeed, seeded } from './chartData';
import { AnimatedNumber, ChartCard } from './chartKit';

interface RankRaceProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  rows?: number;
  years?: number;
  interval?: number;
  autoPlay?: boolean;
  speed?: number;
}

const PITCH = 22;
const TEAMS = ['Nova', 'Atlas', 'Pulse', 'Vertex', 'Orbit', 'Ember', 'Drift', 'Lumen', 'Quark', 'Halo'];

function buildSeries(years: number) {
  return TEAMS.map((name, t) => {
    let v = 20 + seeded(t * 7 + 1) * 40;
    const growth = 0.9 + seeded(t * 11 + 3) * 0.5;
    const values: number[] = [];
    for (let y = 0; y < years; y++) {
      v = v * (0.88 + seeded(t * 31 + y * 17) * 0.34 * growth) + 4;
      values.push(v);
    }
    return { name, id: t, values };
  });
}

export function RankRace({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  rows = 5,
  years = 10,
  interval = 1400,
  autoPlay = true,
  speed = 100,
}: RankRaceProps) {
  const isDark = theme === 'dark';
  const uid = useId();
  const span = Math.max(3, Math.round(years));
  const data = useMemo(() => buildSeries(span), [span]);
  const [year, setYear] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [prevAuto, setPrevAuto] = useState(autoPlay);
  if (prevAuto !== autoPlay) {
    setPrevAuto(autoPlay);
    setPlaying(autoPlay);
  }
  const ms = bySpeed(interval, speed);
  const y = Math.min(year, span - 1);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setYear((v) => (v + 1) % span), ms);
    return () => window.clearInterval(id);
  }, [playing, ms, span]);

  const count = Math.max(3, Math.min(TEAMS.length, rows));
  const ranked = [...data].sort((a, b) => b.values[y] - a.values[y]);
  const top = ranked[0].values[y];
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const spring = { type: 'spring' as const, stiffness: 220 * (speed / 100), damping: 28 };

  return (
    <ChartCard theme={theme} compact={compact}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold tracking-wider uppercase ${muted}`}>Market Share Race</span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => setPlaying((p) => !p)}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border cursor-pointer ${
            isDark ? 'border-white/10 bg-white/5 text-neutral-300 hover:text-white' : 'border-neutral-200 bg-neutral-100 text-neutral-600'
          }`}
        >
          <span className="text-[9px]">{playing ? '❚❚' : '▶'}</span>
          {playing ? 'Pause' : 'Play'}
        </motion.button>
      </div>

      <div className={`relative flex-1 min-h-[150px] rounded-[14px] overflow-hidden px-3 pt-2.5 pb-2 flex flex-col ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        {/* watermark year */}
        <div className="pointer-events-none absolute right-3 bottom-8 overflow-hidden h-12">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={y}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={`text-5xl font-bold tabular-nums leading-none ${isDark ? 'text-white/[0.07]' : 'text-black/[0.07]'}`}
            >
              {2016 + y}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* every team stays mounted and springs to its rank's slot; teams outside the top N sink and fade */}
        <div className="relative flex-1 flex items-center">
          <div className="relative w-full" style={{ height: count * PITCH - 6 }}>
            {ranked.map((team, i) => {
              const v = team.values[y];
              const inTop = i < count;
              const tint = i === 0 ? color : hexToRgba(color, Math.max(0.2, 0.62 - i * 0.08));
              return (
                <motion.div
                  key={team.id}
                  initial={false}
                  animate={{ top: (inTop ? i : count) * PITCH, opacity: inTop ? 1 : 0, zIndex: count - i }}
                  transition={spring}
                  className="absolute inset-x-0 flex items-center gap-2"
                  style={{ height: 16 }}
                >
                  <span className={`w-3 text-[10px] font-mono tabular-nums ${muted}`}>{i + 1}</span>
                  <span className={`w-11 text-[11px] truncate ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>{team.name}</span>
                  <div className="relative flex-1 h-4">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(v / top) * 86}%`, backgroundColor: isDark ? tint : hexToRgba('#09090b', Math.max(0.2, 0.9 - i * 0.12)) }}
                      transition={spring}
                    >
                      {i === 0 && (
                        <motion.span
                          layoutId={`rank-race-crown-${uid}`}
                          className="absolute -right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
                        />
                      )}
                    </motion.div>
                    <motion.span
                      className="absolute top-1/2 -translate-y-1/2 pl-2 text-[10px] font-mono tabular-nums whitespace-nowrap"
                      initial={false}
                      animate={{ left: `${(v / top) * 86}%` }}
                      transition={spring}
                    >
                      <AnimatedNumber value={v} decimals={1} />
                    </motion.span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* scrubber */}
        <div className="relative mt-2 flex items-center gap-1">
          {Array.from({ length: span }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Year ${2016 + i}`}
              onClick={() => {
                setYear(i);
                setPlaying(false);
              }}
              className="relative flex-1 h-3 cursor-pointer group"
            >
              <span className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full transition-colors ${isDark ? 'bg-white/10 group-hover:bg-white/20' : 'bg-black/10'}`} />
              {i <= y && (
                <motion.span
                  className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full origin-left"
                  style={{ backgroundColor: color }}
                  initial={{ scaleX: i === y ? 0 : 1 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: i === y && playing ? ms / 1000 : 0.2, ease: 'linear' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
