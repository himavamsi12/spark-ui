"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const DEFAULT_IMAGES = Array.from({ length: 5 }, (_, i) => `/dissolve-image-reveal/photo-${i + 1}.jpg`);
const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*+=?!<>{}[]";

/** Deterministic per-cell noise, so the scatter is stable across renders. */
function hashFromPosition(row: number, col: number, seed: number) {
  const raw = Math.sin(row * seed + col * (seed * 2.45)) * 43758.5453;
  return raw - Math.floor(raw);
}

export default function DissolveImageReveal({
  images = DEFAULT_IMAGES,
  dissolveColor = "#ffb454",
  cellSize = 16,
  spreadAbove = 25,
  spreadBelow = 25,
  scatterIntensity = 15,
  visibilityThreshold = 65,
  fontFamily = "var(--font-commit-mono), monospace",
  speed = 100,
  autoPlay = false,
}: {
  images?: string[];
  dissolveColor?: string;
  cellSize?: number;
  spreadAbove?: number;
  spreadBelow?: number;
  scatterIntensity?: number;
  visibilityThreshold?: number;
  fontFamily?: string;
  speed?: number;
  autoPlay?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const grid = gridRef.current;
    if (!root || !grid) return;

    const stacked = imgRefs.current.filter(Boolean) as HTMLDivElement[];
    const totalTransitions = Math.max(1, stacked.length - 1);

    // The reference's tuning constants, exposed here as 0-100 controls.
    const size = Math.max(4, Math.round(cellSize));
    const above = spreadAbove / 100;
    const below = spreadBelow / 100;
    const scatter = scatterIntensity / 100;
    const threshold = visibilityThreshold / 100;
    const solidCoreRadius = 0.025;
    const minScatterAtCentre = 0.3;
    const travelRange = 1 + above + below;

    stacked.forEach((el, i) => {
      el.style.zIndex = String(stacked.length - i);
    });

    // --- build the character grid --------------------------------------
    let columns = 0;
    let rows = 0;
    let cells: { row: number; col: number; normalizedY: number }[] = [];
    let cellEls: HTMLDivElement[] = [];
    let visibilityRandom: number[] = [];
    let scatterOffset: number[] = [];

    function buildGrid() {
      const w = root!.clientWidth;
      const h = root!.clientHeight;
      columns = Math.ceil(w / size);
      rows = Math.ceil(h / size);
      grid!.innerHTML = "";
      cells = [];
      cellEls = [];

      const fontSize = Math.round(size * 0.7);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const cell = document.createElement("div");
          cell.style.cssText = `position:absolute;left:${col * size}px;top:${row * size}px;width:${size}px;height:${size}px;font-size:${fontSize}px;background:${dissolveColor};color:#000;visibility:hidden;font-weight:500;line-height:1;display:flex;align-items:center;justify-content:center;overflow:hidden;`;
          cell.textContent = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          grid!.appendChild(cell);
          cellEls.push(cell);
          cells.push({ row, col, normalizedY: (row + 0.5) / rows });
        }
      }
      visibilityRandom = cells.map((c) => hashFromPosition(c.row, c.col, 127.1));
      scatterOffset = cells.map((c) => (hashFromPosition(c.row, c.col, 269.3) - 0.5) * scatter);
    }
    buildGrid();

    // --- the two things scroll drives ----------------------------------
    function updateClipPaths(progress: number) {
      for (let i = 0; i < totalTransitions; i++) {
        const segmentStart = i / totalTransitions;
        const segmentEnd = (i + 1) / totalTransitions;
        const segment = gsap.utils.clamp(
          0,
          1,
          (progress - segmentStart) / (segmentEnd - segmentStart),
        );
        const clipPercent = gsap.utils.clamp(0, 100, (-above + segment * travelRange) * 100);
        stacked[i].style.clipPath = `polygon(0% ${clipPercent}%, 100% ${clipPercent}%, 100% 100%, 0% 100%)`;
      }
    }

    function hideAllCells() {
      for (const el of cellEls) el.style.visibility = "hidden";
    }

    function updateBand(bandCentreY: number) {
      for (let i = 0; i < cells.length; i++) {
        const raw = Math.abs(cells[i].normalizedY - bandCentreY);
        // Cells near the band's centre scatter least, which keeps a solid
        // core with a noisy fringe rather than an even wash.
        const strength = gsap.utils.clamp(minScatterAtCentre, 1, raw / solidCoreRadius);
        const scattered = cells[i].normalizedY - bandCentreY + scatterOffset[i] * strength;
        const normalized = scattered >= 0 ? scattered / below : Math.abs(scattered) / above;

        if (normalized >= 1) {
          cellEls[i].style.visibility = "hidden";
          continue;
        }
        const density = (1 - normalized) * (1 - normalized);
        cellEls[i].style.visibility =
          density > visibilityRandom[i] * threshold ? "visible" : "hidden";
      }
    }

    function apply(progress: number) {
      const rawPosition = progress * totalTransitions;
      const current = Math.min(Math.floor(rawPosition), totalTransitions - 1);
      const segment = gsap.utils.clamp(0, 1, rawPosition - current);
      const bandCentreY = -above + segment * travelRange;

      updateClipPaths(progress);
      if (segment <= 0 || segment >= 1) hideAllCells();
      else updateBand(bandCentreY);
    }

    apply(0);

    // --- drive ----------------------------------------------------------
    // The reference pins for one viewport per transition and scrubs; the wheel
    // stands in for that here, at the same scroll-distance-per-transition.
    const rate = Math.max(0.2, speed / 100);
    let progress = 0;
    let target = 0;
    let userDriven = false;

    function onWheel(e: WheelEvent) {
      const travel = root!.clientHeight * totalTransitions;
      const next = gsap.utils.clamp(0, 1, target + (e.deltaY / travel) * rate);
      if (next === target) return;
      e.preventDefault();
      userDriven = true;
      target = next;
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    let dir = 1;
    let last = performance.now();
    function loop(now: number) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (autoPlay && !userDriven) {
        target += dir * dt * 0.12 * rate;
        if (target >= 1) {
          target = 1;
          dir = -1;
        } else if (target <= 0) {
          target = 0;
          dir = 1;
        }
      }
      progress += (target - progress) * Math.min(1, dt / 0.3);
      apply(progress);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      buildGrid();
      apply(progress);
    });
    ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("wheel", onWheel);
    };
  }, [
    images,
    dissolveColor,
    cellSize,
    spreadAbove,
    spreadBelow,
    scatterIntensity,
    visibilityThreshold,
    speed,
    autoPlay,
  ]);

  return (
    <div
      ref={rootRef}
      className="relative w-full h-full overflow-hidden bg-[#0f0c18]"
      style={{ isolation: "isolate", fontFamily }}
    >
      {images.map((src, i) => (
        <div
          key={`${src}-${i}`}
          ref={(el) => {
            imgRefs.current[i] = el;
          }}
          className="absolute inset-0 will-change-[clip-path]"
          style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
        </div>
      ))}

      <div ref={gridRef} className="absolute inset-0 z-[100] pointer-events-none" />
    </div>
  );
}
