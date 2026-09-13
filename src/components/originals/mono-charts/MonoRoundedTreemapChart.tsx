"use client";

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { bySpeed, series } from './chartData';

const TILE_NAMES = ['Storage', 'Compute', 'Network', 'Cache', 'Backups', 'Logs', 'CDN', 'Queues', 'Search', 'Other'];

type Rect = { x: number; y: number; w: number; h: number };
type Tile = Rect & { label: string; share: number; rank: number };

// Binary split treemap: halve the list by weight and cut along the longer side.
function layout(items: { label: string; share: number; rank: number }[], box: Rect): Tile[] {
  if (items.length === 1) return [{ ...items[0], ...box }];
  const total = items.reduce((t, it) => t + it.share, 0);
  let acc = 0;
  let cut = 1;
  for (let i = 0; i < items.length - 1; i++) {
    acc += items[i].share;
    cut = i + 1;
    if (acc >= total / 2) break;
  }
  const a = items.slice(0, cut);
  const b = items.slice(cut);
  const ratio = a.reduce((t, it) => t + it.share, 0) / total;
  if (box.w >= box.h) {
    const wA = box.w * ratio;
    return [...layout(a, { ...box, w: wA }), ...layout(b, { ...box, x: box.x + wA, w: box.w - wA })];
  }
  const hA = box.h * ratio;
  return [...layout(a, { ...box, h: hA }), ...layout(b, { ...box, y: box.y + hA, h: box.h - hA })];
}
import { hexToRgba } from './colorUtils';

interface MonoRoundedTreemapChartProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  color?: string;
  tiles?: number;
  gap?: number;
  radius?: number;
  showLabels?: boolean;
  speed?: number;
}

export function MonoRoundedTreemapChart({
  theme = 'dark',
  compact = false,
  color = '#ff8a3d',
  tiles = 4,
  gap = 6,
  radius = 12,
  showLabels = true,
  speed = 100,
}: MonoRoundedTreemapChartProps) {
  const isDark = theme === 'dark';
  const TREEMAP_TILES = useMemo(() => {
    const raw = series(tiles, { min: 8, max: 60, salt: 191 }).sort((x, y) => y - x);
    const total = raw.reduce((t, v) => t + v, 0);
    const items = raw.map((v, i) => ({ label: TILE_NAMES[i], share: Math.round((v / total) * 100), rank: i }));
    return layout(items, { x: 0, y: 0, w: 100, h: 100 }).map((t) => ({ ...t, opacity: 1 - (t.rank / Math.max(1, tiles)) * 0.8 }));
  }, [tiles]);

  return (
    <div
      className={`relative w-full rounded-[24px] transition-all duration-300 group flex flex-col justify-between overflow-hidden p-4 sm:p-5 ${
        compact ? 'h-[220px] sm:h-[268px]' : 'min-h-[290px]'
      } ${
        isDark
          ? 'bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-neutral-100 text-black'
      }`}
    >
      <div className={`relative w-full flex-1 min-h-[180px] rounded-[14px] overflow-hidden p-1 ${isDark ? 'bg-void' : 'bg-[#f4f4f6]'}`}>
        <div className="relative w-full h-full min-h-[172px]">
          {TREEMAP_TILES.map((tile) => (
            <motion.div
              key={tile.label}
              layout
              className={`absolute p-2 flex flex-col justify-between cursor-pointer border overflow-hidden ${isDark ? 'border-white/10' : 'border-black/10'}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 220, damping: 24, delay: bySpeed(tile.rank * 0.05, speed) }}
              style={{
                left: `calc(${tile.x}% + ${gap / 2}px)`,
                top: `calc(${tile.y}% + ${gap / 2}px)`,
                width: `calc(${tile.w}% - ${gap}px)`,
                height: `calc(${tile.h}% - ${gap}px)`,
                borderRadius: radius,
                backgroundColor: isDark ? hexToRgba(color, tile.opacity) : `rgba(9,9,11,${tile.opacity})`,
                color: isDark ? (tile.opacity > 0.5 ? '#000000' : '#FFFFFF') : (tile.opacity > 0.5 ? '#FFFFFF' : '#000000'),
              }}
            >
              {showLabels && (
                <>
                  <span className="text-[11px] font-bold tracking-tight font-sans truncate">{tile.label}</span>
                  <span className="text-[10px] font-mono opacity-80">{tile.share}%</span>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
