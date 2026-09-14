"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

export type PixelOrder = "random" | "rows" | "columns" | "center" | "diagonal";

const DEFAULT_IMAGES = Array.from({ length: 4 }, (_, i) => `/pixel-page-transition/page-${i + 1}.jpg`);

/** Cell indices in the order they switch, for a grid of `cols` × `rows`. */
function cellOrder(order: PixelOrder, cols: number, rows: number) {
  const idx = Array.from({ length: cols * rows }, (_, i) => i);
  const col = (i: number) => i % cols;
  const row = (i: number) => Math.floor(i / cols);
  // Small jitter keeps structured orders from looking like a hard wipe.
  const jitter = () => Math.random() * 0.9;
  switch (order) {
    case "rows":
      return idx.sort((a, b) => row(a) + jitter() - (row(b) + jitter()));
    case "columns":
      return idx.sort((a, b) => col(a) + jitter() - (col(b) + jitter()));
    case "center": {
      const cx = (cols - 1) / 2;
      const cy = (rows - 1) / 2;
      const d = (i: number) => Math.hypot(col(i) - cx, row(i) - cy) + jitter() * 1.5;
      const dist = idx.map(d);
      return idx.sort((a, b) => dist[a] - dist[b]);
    }
    case "diagonal": {
      const dist = idx.map((i) => col(i) + row(i) + jitter() * 2);
      return idx.sort((a, b) => dist[a] - dist[b]);
    }
    default:
      return gsap.utils.shuffle(idx);
  }
}

/**
 * A small site whose pages change behind a wall of pixels: pick a link and
 * square cells blink on across the frame until it is covered, the page swaps
 * underneath, then the cells blink off again to reveal it. The first page is
 * uncovered the same way on load.
 */
export default function PixelPageTransition({
  images = DEFAULT_IMAGES,
  navLabels = ["Index", "Streets", "Archive", "Night"],
  titles = ["Side Streets", "City Above", "Paper Trail", "After Hours"],
  subtitles = [
    "Pick a page and the frame fills with pixels before the next one appears.",
    "Every cell switches on its own beat, so the cover never lands as one flat wipe.",
    "The page swaps while it is fully covered, then the pixels clear to reveal it.",
    "Change the cell size, colour and order to give each site its own texture.",
  ],
  brand = "Grain Studio",
  order = "random",
  cellSize = 64,
  coverDuration = 0.5,
  revealDuration = 0.5,
  hold = 0.15,
  pixelColor = "#0d0d0d",
  background = "#0d0d0d",
  textColor = "#f4f1ea",
  fontFamily = "var(--font-host-grotesk), sans-serif",
  textScale = 100,
  autoPlay = true,
}: {
  /** One full-frame picture per page, paired with the nav links by position. */
  images?: string[];
  navLabels?: string[];
  titles?: string[];
  subtitles?: string[];
  brand?: string;
  /** Order the cells switch in. */
  order?: PixelOrder;
  /** Side of each pixel cell, in px. */
  cellSize?: number;
  /** Seconds for the pixels to cover the frame. */
  coverDuration?: number;
  /** Seconds for the pixels to clear. */
  revealDuration?: number;
  /** Seconds the frame stays fully covered while the page swaps. */
  hold?: number;
  pixelColor?: string;
  background?: string;
  textColor?: string;
  fontFamily?: string;
  textScale?: number;
  /** Steps through the pages on its own until a link is clicked. */
  autoPlay?: boolean;
}) {
  const count = Math.max(1, navLabels.length);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(0);
  const [activeLink, setActiveLink] = useState(0);

  const config = useRef({ order, cellSize, coverDuration, revealDuration, hold, pixelColor, autoPlay, count });
  useEffect(() => {
    config.current = { order, cellSize, coverDuration, revealDuration, hold, pixelColor, autoPlay, count };
  });

  // Grid state lives outside React: it's redrawn every frame of a transition.
  const grid = useRef({ cols: 0, rows: 0, on: new Uint8Array(0), sequence: [] as number[] });
  const state = useRef({ busy: false, userDriven: false, current: 0 });
  const tweenRef = useRef<gsap.core.Timeline | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { cols, rows, on } = grid.current;
    const dpr = canvas.width / Math.max(1, canvas.clientWidth);
    const size = config.current.cellSize * dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = config.current.pixelColor;
    for (let i = 0; i < cols * rows; i++) {
      if (!on[i]) continue;
      // Overdraw by a device pixel so neighbouring cells never show hairline seams.
      ctx.fillRect(Math.floor((i % cols) * size), Math.floor(Math.floor(i / cols) * size), Math.ceil(size) + 1, Math.ceil(size) + 1);
    }
  }, []);

  /** Size the canvas and grid to the frame. `filled` sets every cell on or off. */
  const layout = useCallback(
    (filled?: boolean) => {
      const root = rootRef.current;
      const canvas = canvasRef.current;
      if (!root || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = root.clientWidth;
      const h = root.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const size = Math.max(8, config.current.cellSize);
      const cols = Math.ceil(w / size);
      const rows = Math.ceil(h / size);
      const prev = grid.current;
      const keep = filled === undefined && prev.cols === cols && prev.rows === rows;
      const on = keep ? prev.on : new Uint8Array(cols * rows).fill(filled ? 1 : 0);
      grid.current = { cols, rows, on, sequence: prev.sequence };
      draw();
    },
    [draw],
  );

  /** Switch every cell to `value` in the configured order over `duration`. */
  const sweep = useCallback(
    (tl: gsap.core.Timeline, value: 0 | 1, duration: number, position: gsap.Position) => {
      const counter = { n: 0 };
      let seq: number[] = [];
      let applied = 0;
      tl.to(
        counter,
        {
          n: 1,
          duration: Math.max(0.05, duration),
          ease: "none",
          onStart: () => {
            const { cols, rows } = grid.current;
            seq = cellOrder(config.current.order, cols, rows);
            applied = 0;
          },
          onUpdate: () => {
            const target = Math.round(counter.n * seq.length);
            const { on } = grid.current;
            for (; applied < target; applied++) on[seq[applied]] = value;
            draw();
          },
        },
        position,
      );
    },
    [draw],
  );

  const goTo = useCallback(
    (next: number) => {
      const s = state.current;
      if (s.busy || next === s.current) return;
      s.busy = true;
      s.current = next;
      setActiveLink(next);
      const cfg = config.current;
      const tl = gsap.timeline({
        onComplete: () => {
          s.busy = false;
        },
      });
      sweep(tl, 1, cfg.coverDuration, ">");
      // Swap the page only once the frame is fully covered.
      tl.call(() => setPage(next), [], `>+=${Math.max(0, cfg.hold) / 2}`);
      sweep(tl, 0, cfg.revealDuration, `>+=${Math.max(0, cfg.hold) / 2}`);
      tweenRef.current = tl;
    },
    [sweep],
  );

  // On load: start covered, then clear once the first picture is ready.
  useEffect(() => {
    layout(true);
    const s = state.current;
    s.busy = true;
    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      const tl = gsap.timeline({
        onComplete: () => {
          s.busy = false;
        },
      });
      sweep(tl, 0, config.current.revealDuration, 0.15);
      tweenRef.current = tl;
    };
    const first = new Image();
    first.src = images[0] ?? DEFAULT_IMAGES[0];
    const fallback = setTimeout(reveal, 1500);
    first
      .decode()
      .then(() => {
        clearTimeout(fallback);
        reveal();
      })
      .catch(() => {});
    images.slice(1).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      tweenRef.current?.kill();
    };
    // Plays once per mount; later changes are picked up from config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the grid matched to the frame; a new cell size rebuilds it clear.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => {
      if (!state.current.busy) layout();
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [layout]);
  useEffect(() => {
    if (!state.current.busy) layout(false);
  }, [cellSize, layout]);
  useEffect(() => {
    draw();
  }, [pixelColor, draw]);

  // Auto-play: step through the pages until a link is clicked.
  useEffect(() => {
    const id = setInterval(
      () => {
        const s = state.current;
        const cfg = config.current;
        if (!cfg.autoPlay || s.userDriven || s.busy) return;
        goTo((s.current + 1) % cfg.count);
      },
      (coverDuration + revealDuration + hold + 2.4) * 1000,
    );
    return () => clearInterval(id);
  }, [coverDuration, revealDuration, hold, goTo]);

  const scale = textScale / 100;
  const i = page % count;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full select-none overflow-hidden"
      style={{ background, color: textColor, fontFamily, containerType: "size" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={i}
        src={images[i % Math.max(1, images.length)] ?? DEFAULT_IMAGES[0]}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.35) 100%)" }}
      />

      <nav
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4"
        style={{ padding: "3cqw 3.5cqw", fontSize: `calc(clamp(12px, 1.1cqw, 16px) * ${scale})` }}
      >
        <span className="font-semibold tracking-tight">{brand}</span>
        <div className="flex flex-wrap items-center justify-end gap-x-[2.4cqw] gap-y-1">
          {navLabels.map((label, n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                state.current.userDriven = true;
                goTo(n);
              }}
              aria-current={activeLink === n ? "page" : undefined}
              className="cursor-pointer transition-opacity"
              style={{ opacity: activeLink === n ? 1 : 0.6 }}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10" style={{ padding: "3.5cqw" }}>
        <p className="font-mono uppercase tracking-[0.2em] opacity-70" style={{ fontSize: `calc(clamp(10px, 0.9cqw, 13px) * ${scale})` }}>
          {String(i + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </p>
        <h2
          className="font-semibold"
          style={{ marginTop: "1.2cqw", fontSize: `calc(clamp(36px, 8.5cqw, 160px) * ${scale})`, lineHeight: 0.9, letterSpacing: "-0.04em" }}
        >
          {titles[i % Math.max(1, titles.length)] ?? ""}
        </h2>
        <p style={{ marginTop: "1.6cqw", maxWidth: "min(460px, 60cqw)", fontSize: `calc(clamp(12px, 1.1cqw, 17px) * ${scale})`, lineHeight: 1.5, opacity: 0.85 }}>
          {subtitles[i % Math.max(1, subtitles.length)] ?? ""}
        </p>
      </div>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-20 h-full w-full" />
    </div>
  );
}
