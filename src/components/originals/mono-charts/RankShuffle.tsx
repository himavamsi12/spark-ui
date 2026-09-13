"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { hexToRgba } from './colorUtils';
import { series } from './chartData';

interface RankShuffleProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  entries?: number;
  rounds?: number;
  interval?: number;
  barHeight?: number;
  showScores?: boolean;
  speed?: number;
}

const TEAM_NAMES = ['Atlas', 'Nova', 'Orion', 'Vega', 'Lyra', 'Hydra', 'Rigel', 'Deneb'];

export function RankShuffle({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  entries = 5,
  rounds = 4,
  interval = 2.4,
  barHeight = 20,
  showScores = true,
  speed = 100,
}: RankShuffleProps) {
  const isDark = theme === 'dark';
  const TEAMS = TEAM_NAMES.slice(0, entries);
  // Scores per round, cycled on a timer. Each round reshuffles the ranking.
  const ROUNDS = useMemo(
    () => Array.from({ length: rounds }, (_, r) => series(entries, { min: 40, max: 98, salt: 431 + r * 3 })),
    [entries, rounds]
  );
  const [round, setRound] = useState(0);
  const [paused, setPaused] = useState(false);
  const safeRound = round % ROUNDS.length;
  const spring = { type: 'spring' as const, stiffness: 260 * (speed / 100), damping: 28 };

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setRound((r) => (r + 1) % ROUNDS.length), interval * 1000);
    return () => clearInterval(id);
  }, [paused, interval, ROUNDS.length]);

  const ranked = TEAMS.map((name, i) => ({ name, score: ROUNDS[safeRound][i] })).sort((a, b) => b.score - a.score);
  const max = Math.max(...ranked.map((r) => r.score));

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
        <div className="flex items-center gap-1">
          {ROUNDS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Round ${i + 1}`}
              onClick={() => setRound(i)}
              className="relative h-1.5 w-5 rounded-full overflow-hidden"
              style={{ backgroundColor: hexToRgba(color, 0.2) }}
            >
              {safeRound === i && (
                <motion.span
                  key={`${safeRound}-${paused}-${interval}`}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: paused ? '100%' : '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: paused ? 0 : interval, ease: 'linear' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`relative w-full flex-1 min-h-[180px] rounded-[14px] overflow-hidden p-3 ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        <ul className="flex flex-col gap-2">
          {ranked.map((row, i) => (
            <motion.li
              key={row.name}
              layout
              transition={spring}
              className="flex items-center gap-2.5"
            >
              <motion.span
                layout="position"
                className="w-5 text-[11px] font-mono tabular-nums text-right"
                style={{ color: i === 0 ? color : isDark ? '#71717A' : '#A1A1AA' }}
              >
                {String(i + 1).padStart(2, '0')}
              </motion.span>
              <span className={`w-12 text-[11px] font-medium ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>{row.name}</span>
              <div className="relative flex-1 rounded-full overflow-hidden" style={{ height: barHeight, backgroundColor: hexToRgba(color, 0.08) }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  animate={{ width: `${(row.score / max) * 100}%`, opacity: i === 0 ? 1 : 0.35 + (1 - i / ranked.length) * 0.45 }}
                  initial={{ width: '0%' }}
                  transition={{ type: 'spring', stiffness: 120 * (speed / 100), damping: 20 }}
                  style={{ backgroundColor: color }}
                />
              </div>
              {showScores && <motion.span
                key={`${row.name}-${row.score}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`w-7 text-[11px] font-mono tabular-nums text-right ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}
              >
                {row.score}
              </motion.span>}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
