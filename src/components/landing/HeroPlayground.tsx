"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { ORIGINAL_COMPONENTS, ORIGINAL_LOADERS } from "@/components/originals";
import { CHARTS_PAGE_CATEGORIES, type ComponentEntry } from "@/lib/types";

/** How long each piece stays up before the playground moves on. */
const CYCLE_MS = 6500;
/** Layout width full-page components are rendered at before scaling to fit. */
const STAGE_WIDTH = 1280;

/**
 * UI Kit pieces that switch to a stacked phone layout in a narrow box; they go
 * on the scaled full-width stage instead, so their wide layout shows.
 */
const WIDE_PIECES = new Set(["route-covered"]);

/** Per-piece prop overrides so each one sits well on the dark window. */
const OVERRIDES: Record<string, Record<string, unknown>> = {
  "coverflow-player": { startPlaying: false },
  "route-covered": { backdrop: "#0b0b0d" },
  "portrait-orbit": { autoPlay: true },
};

/**
 * A browser-style window with one live, usable component inside and a row of
 * chips to switch between pieces. It keeps advancing on its own, pausing only
 * while the pointer is over the window so the piece can be used.
 */
export default function HeroPlayground({ items }: { items: ComponentEntry[] }) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const paused = hovering;
  const active = items[index];

  // Warm up every piece's code shortly after load, so switching is instant.
  useEffect(() => {
    const id = window.setTimeout(() => items.forEach((e) => ORIGINAL_LOADERS[e.slug]?.().catch(() => {})), 1200);
    return () => window.clearTimeout(id);
  }, [items]);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % items.length), CYCLE_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, items.length]);

  if (!active) return null;

  return (
    <div className="mx-auto w-full max-w-[880px] lg:mr-0">
      <div
        className="overflow-hidden rounded-[20px] border border-white/10 bg-[#0c0c0e]/90 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur"
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <div className="flex min-w-0 flex-1 justify-center">
            <span className="truncate rounded-pills bg-white/[0.05] px-3 py-1 font-mono text-[11px] text-muted">
              spark-ui / <span className="text-pearl">{active.slug}</span>
            </span>
          </div>
          <Link
            href={`/components/${active.slug}`}
            className="flex shrink-0 items-center gap-1 rounded-pills px-2 py-1 text-xs text-pearl transition-colors hover:text-chalk"
          >
            Open <ArrowUpRight size={13} />
          </Link>
        </div>

        {/* Live piece */}
        <div className="relative h-[380px] sm:h-[520px] bg-void">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.slug}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <LivePiece entry={active} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Chips */}
      <div role="tablist" aria-label="Live components" className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
        {items.map((entry, i) => {
          const selected = i === index;
          return (
            <button
              key={entry.slug}
              role="tab"
              aria-selected={selected}
              // Jumps to the piece; the countdown restarts from there.
              onClick={() => setIndex(i)}
              className={`relative overflow-hidden rounded-pills border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                selected ? "border-white/20 bg-white/[0.08] text-chalk" : "border-white/10 text-muted hover:border-white/20 hover:text-pearl"
              }`}
            >
              <span className="relative">{entry.name}</span>
              {/* Progress toward the next piece while it is cycling. */}
              {selected && !paused && (
                <motion.span
                  key={`${entry.slug}-${index}`}
                  className="absolute bottom-0 left-0 h-[2px] bg-accent"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Renders a piece live: card-sized UI Kit pieces directly, full-page ones on a scaled stage. */
function LivePiece({ entry }: { entry: ComponentEntry }) {
  const Comp = ORIGINAL_COMPONENTS[entry.slug];
  const cardSized = CHARTS_PAGE_CATEGORIES.includes(entry.category) && !WIDE_PIECES.has(entry.slug);
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || cardSized) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cardSized]);

  if (!Comp) return null;
  const props = { ...entry.defaults, ...OVERRIDES[entry.slug] };

  if (cardSized) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 [&>*]:max-h-full">
        <Suspense fallback={null}>
          <div className="h-full w-full max-w-[560px] [&>*]:h-full">
            <Comp {...props} />
          </div>
        </Suspense>
      </div>
    );
  }

  const zoom = size && size.w ? size.w / STAGE_WIDTH : null;
  return (
    <div ref={frameRef} className="absolute inset-0 overflow-hidden">
      {zoom && (
        <div className="absolute left-0 top-0" style={{ width: STAGE_WIDTH, height: size!.h / zoom, zoom }}>
          <Suspense fallback={null}>
            <Comp {...props} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
