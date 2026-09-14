"use client";

/*
 * Mask patterns and text choreography adapted from "SVG Mask Transitions on
 * Scroll with GSAP and ScrollTrigger" by Hiroki Watanabe for Codrops.
 * https://github.com/Hiro-kiii/Scroll-Transition — MIT License,
 * Copyright (c) 2009 - 2025 Codrops (https://codrops.com)
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";

export type MaskPattern = "horizontal-blinds" | "random-grid" | "vertical-blinds" | "column-grid";

const DEFAULT_IMAGES = Array.from({ length: 4 }, (_, i) => `/mask-page-transition/page-${i + 1}.jpg`);
const SVG_NS = "http://www.w3.org/2000/svg";

type Layer = {
  svg: SVGSVGElement;
  /** Builds the pattern's reveal, from fully masked to fully open. */
  open: () => gsap.core.Timeline;
};

/** Grid density from the reference's breakpoints, read off the frame instead of the window. */
function gridCols(width: number) {
  if (width <= 599) return 6;
  if (width <= 1024) return 10;
  return 14;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/**
 * One full-frame picture behind an SVG mask whose white shapes are what the
 * pattern animates. Mirrors each reference script's createBlinds/openBlinds.
 */
function createLayer(pattern: MaskPattern, src: string, width: number, height: number, maskId: string, brightness: number): Layer {
  // Vertical blinds work in a 100-tall viewBox; the others in a 100-wide one.
  const vbW = pattern === "vertical-blinds" ? (width / height) * 100 : 100;
  const vbH = pattern === "vertical-blinds" ? 100 : (height / width) * 100;

  const svg = el("svg", { viewBox: `0 0 ${vbW} ${vbH}`, preserveAspectRatio: "none" });
  Object.assign(svg.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });

  const defs = el("defs", {});
  const mask = el("mask", { id: maskId, maskUnits: "userSpaceOnUse" });
  mask.appendChild(el("rect", { x: 0, y: 0, width: vbW, height: vbH, fill: "black" }));
  const g = el("g", {});
  mask.appendChild(g);
  defs.appendChild(mask);
  svg.appendChild(defs);

  const image = el("image", { href: src, x: 0, y: 0, width: vbW, height: vbH, preserveAspectRatio: "xMidYMid slice", mask: `url(#${maskId})` });
  image.style.filter = `brightness(${brightness})`;
  svg.appendChild(image);

  if (pattern === "horizontal-blinds") {
    const COUNT = 30;
    const h = vbH / COUNT;
    const blinds: { top: SVGRectElement; bottom: SVGRectElement; y: number; h: number }[] = [];
    let currentY = 0;
    for (let i = 0; i < COUNT; i++) {
      const centerY = vbH - (currentY + h / 2);
      const top = el("rect", { x: 0, y: centerY, width: 100, height: 0, fill: "white", "shape-rendering": "crispEdges" });
      const bottom = el("rect", { x: 0, y: centerY, width: 100, height: 0, fill: "white", "shape-rendering": "crispEdges" });
      g.append(top, bottom);
      blinds.push({ top, bottom, y: centerY, h: h / 2 });
      currentY += h;
    }
    return {
      svg,
      open: () =>
        gsap.timeline().to(
          blinds.flatMap((b) => [b.top, b.bottom]),
          {
            attr: {
              y: (i: number) => {
                const b = blinds[Math.floor(i / 2)];
                return i % 2 === 0 ? b.y - b.h : b.y;
              },
              height: (i: number) => blinds[Math.floor(i / 2)].h + 0.01,
            },
            ease: "power3.out",
            stagger: { each: 0.02, from: "start" },
          },
        ),
    };
  }

  if (pattern === "vertical-blinds") {
    const COUNT = 12;
    const w = vbW / COUNT;
    const blinds: { left: SVGRectElement; right: SVGRectElement; x: number; w: number }[] = [];
    let currentX = 0;
    for (let i = 0; i < COUNT; i++) {
      const centerX = currentX + w / 2;
      const left = el("rect", { x: centerX, y: 0, width: 0, height: 100, fill: "white", "shape-rendering": "crispEdges" });
      const right = el("rect", { x: centerX, y: 0, width: 0, height: 100, fill: "white", "shape-rendering": "crispEdges" });
      g.append(left, right);
      blinds.push({ left, right, x: centerX, w: w / 2 });
      currentX += w;
    }
    return {
      svg,
      open: () =>
        gsap.timeline().to(
          blinds.flatMap((b) => [b.left, b.right]),
          {
            attr: {
              x: (i: number) => {
                const b = blinds[Math.floor(i / 2)];
                return i % 2 === 0 ? b.x - b.w : b.x;
              },
              width: (i: number) => blinds[Math.floor(i / 2)].w + 0.05,
            },
            ease: "none",
            stagger: { each: 0.02, from: "start" },
          },
        ),
    };
  }

  // Random grid and column grid share their cells; only the reveal order differs.
  const cols = gridCols(width);
  const rows = Math.max(1, Math.round(cols * (vbH / vbW)));
  const cellW = vbW / cols;
  const cellH = vbH / rows;
  const cells: SVGRectElement[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const rect = el("rect", { x: x * cellW, y: y * cellH, width: cellW, height: cellH, fill: "white", "shape-rendering": "crispEdges", opacity: 0 });
      g.appendChild(rect);
      cells.push(rect);
    }
  }
  return {
    svg,
    open: () => {
      let ordered: SVGRectElement[];
      if (pattern === "random-grid") {
        ordered = gsap.utils.shuffle([...cells]);
      } else {
        // Left to right, random order within each column.
        ordered = [];
        for (let x = 0; x < cols; x++) {
          const column: SVGRectElement[] = [];
          for (let y = 0; y < rows; y++) column.push(cells[y * cols + x]);
          ordered.push(...gsap.utils.shuffle(column));
        }
      }
      return gsap.timeline().to(ordered, { opacity: 1, duration: 1, ease: "power3.out", stagger: { each: 0.02 } });
    },
  };
}

/** Each reference script's own text in/out, keyed by pattern. */
function textTweens(pattern: MaskPattern) {
  switch (pattern) {
    case "horizontal-blinds":
      return {
        hidden: { clipPath: "inset(100% 0% 0% 0%)", y: 40, opacity: 1 },
        in: { overwrite: "auto" as const, clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.5, ease: "expo.out" },
        out: { overwrite: "auto" as const, clipPath: "inset(0% 0% 100% 0%)", y: -30, duration: 1.2, ease: "power2.inOut" },
      };
    case "random-grid":
      return {
        hidden: { clipPath: "inset(100% 0% 0% 0%)", y: 40, opacity: 1 },
        in: { overwrite: "auto" as const, clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 2.6, ease: "expo.out" },
        out: { overwrite: "auto" as const, clipPath: "inset(0% 0% 100% 0%)", y: 0, duration: 2.0, ease: "power2.inOut" },
      };
    case "vertical-blinds":
      return {
        hidden: { clipPath: "inset(0% 0% 100% 0%)", y: 40, opacity: 0 },
        in: { overwrite: "auto" as const, clipPath: "inset(0% 0% 0% 0%)", y: 0, opacity: 1, duration: 0.8 },
        out: { overwrite: "auto" as const, clipPath: "inset(0% 0% 100% 0%)", y: -40, opacity: 0, duration: 0.8 },
      };
    case "column-grid":
      return {
        hidden: { clipPath: "inset(100% 0% 0% 0%)", y: 40, opacity: 1 },
        in: { overwrite: "auto" as const, clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 2.2, ease: "expo.out" },
        out: { overwrite: "auto" as const, clipPath: "inset(0% 0% 100% 0%)", y: 0, duration: 1.6, ease: "power2.inOut" },
      };
  }
}

/**
 * A small site whose pages change through SVG mask transitions: click a nav
 * link and the next page's full-frame picture is revealed through blinds or a
 * grid of cells while its headline wipes in. The first page plays in on load.
 */
export default function MaskPageTransition({
  pattern = "horizontal-blinds",
  images = DEFAULT_IMAGES,
  navLabels = ["Home", "Journal", "Studio", "Contact"],
  titles = ["Quiet\nHighlands", "Northern\nLights", "First\nSunrise", "Golden\nHills"],
  eyebrow = "Page transition",
  descriptions = [
    "Each page is revealed through a mask that opens in strips or cells, so moving between pages feels like turning a slide rather than loading a screen.",
    "A green sky drifts over the tree line. The mask opens piece by piece, and the headline wipes in once the picture is almost whole.",
    "Morning light spills across the valley. Every link runs the same pattern, so the whole site keeps one rhythm as you move through it.",
    "Rolling hills under a heavy sky. Pick a pattern in the settings and every page change uses it, including the very first one on load.",
  ],
  brand = "Northbound",
  duration = 1.8,
  brightness = 80,
  background = "#000000",
  textColor = "#ffffff",
  showProgress = true,
  fontFamily = "var(--font-instrument-serif), serif",
  textScale = 100,
  autoPlay = true,
}: {
  pattern?: MaskPattern;
  /** One full-frame picture per page, paired with the nav labels by position. */
  images?: string[];
  navLabels?: string[];
  /** Headline per page; a line break splits it. */
  titles?: string[];
  eyebrow?: string;
  descriptions?: string[];
  brand?: string;
  /** Seconds the mask takes to open fully. */
  duration?: number;
  /** Picture brightness, as a %. */
  brightness?: number;
  background?: string;
  textColor?: string;
  showProgress?: boolean;
  fontFamily?: string;
  textScale?: number;
  /** Cycles through the pages on its own until a link is clicked. */
  autoPlay?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const count = Math.max(1, navLabels.length);
  const rootRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  // Parent re-renders can hand over a fresh array with the same pictures; key on the content.
  const imagesKey = images.join("|");

  const state = useRef({ current: -1, animating: false, userDriven: false, layerSeq: 0 });
  const config = useRef({ pattern, images, duration, brightness, autoPlay, count });
  useEffect(() => {
    config.current = { pattern, images, duration, brightness, autoPlay, count };
  });

  const goTo = useCallback(
    (next: number) => {
      const root = rootRef.current;
      const host = layersRef.current;
      const s = state.current;
      if (!root || !host || s.animating || next === s.current) return;
      const cfg = config.current;
      const src = cfg.images[next % Math.max(1, cfg.images.length)] ?? DEFAULT_IMAGES[0];
      const prev = s.current;
      const tweens = textTweens(cfg.pattern);

      s.animating = true;
      s.current = next;
      setActive(next);

      const layer = createLayer(cfg.pattern, src, root.clientWidth, root.clientHeight, `${uid}-mask-${s.layerSeq++}`, cfg.brightness / 100);
      host.appendChild(layer.svg);

      const open = layer.open();
      const openLength = open.duration();
      // No scroll to scrub against, so the reference timeline is played over a
      // fixed time: scaled so the mask finishes opening in `duration` seconds.
      const scale = openLength / Math.max(0.2, cfg.duration);

      const tl = gsap.timeline();
      const prevText = prev >= 0 ? textRefs.current[prev] : null;
      const nextText = textRefs.current[next];

      // A headline's wipe-in outlasts the mask, so it can still be running when
      // the next page is picked. Stop every headline tween first, and snap all
      // but the outgoing one hidden, so two headlines never show at once.
      textRefs.current.forEach((t) => {
        if (!t) return;
        gsap.killTweensOf(t);
        if (t !== prevText) gsap.set(t, tweens.hidden);
      });

      if (cfg.pattern === "vertical-blinds") {
        // Reference order: old text out, blinds open 0.3s before it ends, new text in 0.5s before they finish.
        if (prevText) tl.to(prevText, tweens.out, ">");
        tl.add(open, prevText ? "-=0.3" : 0);
        if (nextText) tl.to(nextText, tweens.in, "-=0.5");
      } else {
        // Reference order: mask opens, new text comes in 0.3s before it ends.
        if (prevText) tl.to(prevText, tweens.out, 0);
        tl.add(open, 0);
        if (nextText) tl.to(nextText, tweens.in, "-=0.3");
      }
      const openEnd = open.startTime() + openLength;
      tl.timeScale(scale);

      // Progress: earlier pages full, later ones empty, this one fills with the mask.
      fillRefs.current.forEach((fill, i) => {
        if (!fill) return;
        gsap.killTweensOf(fill);
        if (i !== next) gsap.set(fill, { width: i < next ? "100%" : "0%" });
      });
      const fill = fillRefs.current[next];
      if (fill) {
        gsap.set(fill, { width: "0%" });
        tl.to(fill, { width: "100%", duration: openLength, ease: "none" }, open.startTime());
      }

      tl.call(
        () => {
          // The new picture now covers everything; drop the layers beneath it.
          while (host.firstChild && host.firstChild !== layer.svg) host.removeChild(host.firstChild);
          s.animating = false;
        },
        [],
        openEnd,
      );
    },
    [uid],
  );

  // Hide every headline, then play the first page in on load once its picture is ready.
  useEffect(() => {
    const tweens = textTweens(pattern);
    const texts = textRefs.current.filter(Boolean);
    texts.forEach((t) => gsap.set(t, tweens.hidden));
    const host = layersRef.current;
    if (host) host.innerHTML = "";
    const s = state.current;
    s.current = -1;
    s.animating = false;
    fillRefs.current.forEach((f) => f && gsap.set(f, { width: "0%" }));

    let cancelled = false;
    const first = new Image();
    first.src = config.current.images[0] ?? DEFAULT_IMAGES[0];
    const start = () => !cancelled && goTo(0);
    const timer = setTimeout(start, 1200);
    first
      .decode()
      .then(() => {
        clearTimeout(timer);
        start();
      })
      .catch(() => {});
    // Warm the rest so later reveals don't open onto an empty picture.
    config.current.images.slice(1).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      gsap.killTweensOf(texts);
    };
    // Rebuilt when the pattern or page set changes; everything else is read live.
  }, [pattern, count, imagesKey, goTo]);

  // Auto-play: step through the pages until a link is clicked.
  useEffect(() => {
    const id = setInterval(() => {
      const s = state.current;
      const cfg = config.current;
      if (!cfg.autoPlay || s.userDriven || s.animating || s.current < 0) return;
      goTo((s.current + 1) % cfg.count);
    }, Math.max(2.5, duration + 2.2) * 1000);
    return () => clearInterval(id);
  }, [duration, goTo]);

  // On resize, settle on the current page fully revealed at the new size.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout>;
    let lastW = root.clientWidth;
    let lastH = root.clientHeight;
    const ro = new ResizeObserver(() => {
      if (root.clientWidth === lastW && root.clientHeight === lastH) return;
      lastW = root.clientWidth;
      lastH = root.clientHeight;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const s = state.current;
        const host = layersRef.current;
        if (!host || s.animating || s.current < 0) return;
        const cfg = config.current;
        const layer = createLayer(cfg.pattern, cfg.images[s.current % Math.max(1, cfg.images.length)], root.clientWidth, root.clientHeight, `${uid}-mask-${s.layerSeq++}`, cfg.brightness / 100);
        layer.open().progress(1);
        host.innerHTML = "";
        host.appendChild(layer.svg);
      }, 250);
    });
    ro.observe(root);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [uid]);

  const scale = textScale / 100;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full select-none overflow-hidden"
      style={{ background, color: textColor, containerType: "size" }}
    >
      <div ref={layersRef} className="absolute inset-0" />

      <nav
        className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4"
        style={{ padding: "3cqw", fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: `calc(clamp(11px, 1.05cqw, 15px) * ${scale})` }}
      >
        <span className="font-medium tracking-wide">{brand}</span>
        <div className="flex flex-wrap items-center justify-end gap-x-[2.2cqw] gap-y-1">
          {navLabels.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                state.current.userDriven = true;
                goTo(i);
              }}
              aria-current={active === i ? "page" : undefined}
              className="cursor-pointer transition-opacity hover:opacity-100"
              style={{ opacity: active === i ? 1 : 0.7, textDecoration: active === i ? "underline" : "none", textUnderlineOffset: "4px" }}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="pointer-events-none absolute inset-0 z-20" style={{ padding: "3cqw", fontFamily }}>
        {navLabels.map((_, i) => (
          <div
            key={i}
            ref={(node) => {
              textRefs.current[i] = node;
            }}
            className="absolute uppercase"
            style={{ left: "3cqw", right: "3cqw", top: "3cqw", clipPath: "inset(100% 0 0 0)" }}
          >
            <h2
              className="whitespace-pre-line"
              style={{ marginTop: "10cqh", fontSize: `calc(clamp(34px, 6.8cqw, 150px) * ${scale})`, letterSpacing: "-0.025em", lineHeight: 0.85 }}
            >
              {titles[i % Math.max(1, titles.length)] ?? ""}
            </h2>
            <p style={{ marginTop: "6cqw", fontSize: `calc(clamp(11px, 1.067cqw, 18px) * ${scale})`, letterSpacing: "0.24em" }}>{eyebrow}</p>
            <span
              className="block normal-case"
              style={{ marginTop: "2cqw", width: "clamp(180px, 22cqw, 380px)", fontSize: `calc(clamp(11px, 0.95cqw, 14px) * ${scale})`, lineHeight: 1.8 }}
            >
              {descriptions[i % Math.max(1, descriptions.length)] ?? ""}
            </span>
          </div>
        ))}
      </div>

      {showProgress && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex" style={{ padding: "3cqw", gap: "1cqw" }}>
          {navLabels.map((_, i) => (
            <div key={i} className="relative h-[2px] flex-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
              <div
                ref={(node) => {
                  fillRefs.current[i] = node;
                }}
                className="absolute inset-y-0 left-0 w-0"
                style={{ background: textColor }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
