"use client";

import { useState } from "react";

const BARS = 9;
const MAX_SPEED = 200;

/**
 * A working miniature of the real control panel: the accent and speed controls
 * drive the preview above them, so the tile demonstrates the claim rather than
 * illustrating it. Kept in its own component so dragging the slider re-renders
 * this tile alone, not the whole landing page.
 */
export default function CustomiseDemo() {
  const [accent, setAccent] = useState("#ff8a3d");
  const [speed, setSpeed] = useState(100);

  // 0 crawls at 2.8s a cycle, 200 snaps through in 0.5s.
  const duration = 2.8 - (speed / MAX_SPEED) * 2.3;
  const pct = (speed / MAX_SPEED) * 100;

  return (
    <div>
      <style>{`
        @keyframes cd-wave {
          0%, 100% { transform: scaleY(0.28); opacity: 0.5; }
          50%      { transform: scaleY(1);    opacity: 1; }
        }
        .cd-bar {
          transform-origin: bottom;
          animation-name: cd-wave;
          animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
          animation-iteration-count: infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .cd-bar { animation: none; transform: scaleY(0.6); }
        }
      `}</style>

      <p className="text-sm text-muted leading-relaxed mb-4">
        Swap the images, rewrite the copy, retime the animation, then copy the code with your
        settings already baked in.
      </p>

      {/* Live preview the two controls below actually drive. */}
      <div className="h-16 mb-2.5 rounded-medium border border-border-soft bg-void/50 flex items-end justify-center gap-1.5 px-3 py-3 overflow-hidden">
        {Array.from({ length: BARS }).map((_, i) => (
          <span
            key={i}
            className="cd-bar w-2 h-full rounded-full"
            style={{
              background: accent,
              animationDuration: `${duration}s`,
              animationDelay: `${-(i * duration) / BARS}s`,
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="h-9 flex items-center gap-2 bg-panel border border-border-soft rounded-medium px-2.5 cursor-pointer hover:border-pearl/30 transition-colors">
          <span className="text-xs text-pearl">Accent</span>
          <span
            className="w-4 h-4 rounded-[4px] border border-border"
            style={{ background: accent }}
          />
          <code className="text-[11px] font-mono text-muted tabular-nums">{accent}</code>
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="sr-only"
            aria-label="Accent colour"
          />
        </label>

        <div className="relative h-9 min-w-[150px] flex-1 rounded-medium border border-border-soft bg-panel overflow-hidden hover:border-pearl/30 transition-colors">
          <div className="absolute inset-y-0 left-0 bg-slate" style={{ width: `${pct}%` }} />
          <div className="relative h-full flex items-center justify-between px-2.5 pointer-events-none">
            <span className="text-xs text-pearl">Speed</span>
            <span className="text-xs text-chalk tabular-nums">{speed}</span>
          </div>
          <span
            className="absolute top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-chalk pointer-events-none"
            style={{ left: `calc(${pct}% - 1.5px)` }}
          />
          {/* Laid over the row fully transparent, so the styled fill above is
              what you see while the native input handles drag and keyboard. */}
          <input
            type="range"
            min={0}
            max={MAX_SPEED}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
            aria-label="Animation speed"
          />
        </div>
      </div>
    </div>
  );
}
