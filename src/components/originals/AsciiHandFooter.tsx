"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

const ASCII_CHARS = "........:::=+xX#0369";
const FONT_SIZE = 18;
const CELL_SIZE = 20;
const ASCII_COLUMNS = 80;
/** Upper bound for the canvas pixel ratio; the real ratio is used below it. */
const MAX_DPR = 2;

type Cell = { col: number; row: number; char: string; highlightEndTime: number };
type Hand = { canvas: HTMLCanvasElement; cells: Map<string, Cell>; cellList: Cell[]; rows: number };

export default function AsciiHandFooter({
  charColor = "#803500",
  hoverColor = "#ff6a00",
  headingLeft = "Blank",
  headingRight = "Canvas",
  fontFamily = "var(--font-instrument-sans), sans-serif",
  textScale = 100,
}: {
  charColor?: string;
  hoverColor?: string;
  headingLeft?: string;
  headingRight?: string;
  fontFamily?: string;
  textScale?: number;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const linkRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const textRef = useRef<HTMLParagraphElement>(null);
  const handWrapRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const headings = headingRefs.current.filter(Boolean) as HTMLHeadingElement[];
    const chars: HTMLElement[] = [];
    const headingSplits = headings.map((h) => {
      const split = SplitText.create(h, { type: "chars", charsClass: "char" });
      chars.push(...(split.chars as HTMLElement[]));
      return split;
    });
    gsap.set(chars, { position: "relative", yPercent: 125 });

    const lineTargets = [...linkRefs.current.filter(Boolean), textRef.current].filter(Boolean) as HTMLElement[];
    const lines: HTMLElement[] = [];
    const lineSplits = lineTargets.map((el) => {
      const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line" });
      lines.push(...(split.lines as HTMLElement[]));
      return split;
    });
    gsap.set(lines, { yPercent: 100 });

    const backgroundCharIndex = ASCII_CHARS.lastIndexOf(".");
    const sampleImagePixels = (image: HTMLImageElement, gridRows: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = ASCII_COLUMNS;
      canvas.height = gridRows;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0, ASCII_COLUMNS, gridRows);
      return ctx.getImageData(0, 0, ASCII_COLUMNS, gridRows).data;
    };
    const pixelToCharIndex = (pixels: Uint8ClampedArray, offset: number) => {
      const brightness = (pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114) / 255;
      return Math.min(ASCII_CHARS.length - 1, Math.floor((1 - brightness) * ASCII_CHARS.length));
    };
    const buildCells = (image: HTMLImageElement) => {
      const rows = Math.round(ASCII_COLUMNS / (image.naturalWidth / image.naturalHeight));
      const pixels = sampleImagePixels(image, rows);
      const cells = new Map<string, Cell>();
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < ASCII_COLUMNS; col++) {
          const charIndex = pixelToCharIndex(pixels, (row * ASCII_COLUMNS + col) * 4);
          if (charIndex <= backgroundCharIndex) continue;
          cells.set(`${col},${row}`, { col, row, char: ASCII_CHARS[charIndex], highlightEndTime: 0 });
        }
      }
      return { rows, cells };
    };

    const hands: Hand[] = [];
    const rafIds: number[] = [];
    const DPR = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    // Nothing changes on screen unless a cluster is lit, so the glyphs are only
    // redrawn while one is fading. Redrawing thousands of characters on both
    // hands every frame regardless kept the page's main thread busy full-time.
    let busyUntil = 0;
    const cleanupFns: (() => void)[] = [];

    const setupHand = (image: HTMLImageElement) => {
      const { rows, cells } = buildCells(image);
      const cellList = [...cells.values()];
      const canvas = document.createElement("canvas");
      canvas.className = "absolute inset-0 w-full h-full";
      image.closest(".hand-img")?.appendChild(canvas);
      canvas.width = ASCII_COLUMNS * CELL_SIZE * DPR;
      canvas.height = rows * CELL_SIZE * DPR;

      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.font = `${FONT_SIZE}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const metrics = ctx.measureText("X");
      const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const baselineOffset = CELL_SIZE / 2 + glyphHeight / 2 - metrics.actualBoundingBoxDescent;
      const canvasWidth = ASCII_COLUMNS * CELL_SIZE;
      const canvasHeight = rows * CELL_SIZE;

      const handIndex = rafIds.length;
      rafIds.push(0);
      let drawn = false;
      const render = () => {
        rafIds[handIndex] = requestAnimationFrame(render);
        const now = Date.now();
        // One extra pass after the last highlight expires clears it away.
        if (drawn && now > busyUntil + 50) return;
        drawn = true;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        for (const cell of cellList) {
          const x = cell.col * CELL_SIZE;
          const y = cell.row * CELL_SIZE;
          const isHighlighted = cell.highlightEndTime > now;
          if (isHighlighted) {
            ctx.fillStyle = hoverColor;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          }
          ctx.fillStyle = isHighlighted ? "#0f0f0f" : charColor;
          ctx.fillText(cell.char, x + CELL_SIZE / 2, y + baselineOffset);
        }
      };
      render();
      return { canvas, cells, cellList, rows };
    };

    const images = root.querySelectorAll<HTMLImageElement>("img.ascii-hand");
    images.forEach((image) => {
      const start = () => hands.push(setupHand(image));
      if (image.complete && image.naturalWidth) start();
      else image.addEventListener("load", start);
    });

    const highlightCluster = (cells: Map<string, Cell>, startCell: Cell) => {
      const now = Date.now();
      startCell.highlightEndTime = now + 300;
      busyUntil = Math.max(busyUntil, now + 300 + 10 * 10);
      const steps = Math.floor(Math.random() * 10) + 1;
      const litCells = [startCell];
      let current = startCell;
      for (let step = 0; step < steps; step++) {
        const neighbours: Cell[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const n = cells.get(`${current.col + dx},${current.row + dy}`);
            if (n && !litCells.includes(n)) neighbours.push(n);
          }
        }
        if (neighbours.length === 0) break;
        const next = neighbours[Math.floor(Math.random() * neighbours.length)];
        next.highlightEndTime = now + 300 + step * 10;
        litCells.push(next);
        current = next;
      }
    };

    const hoverHand = (hand: Hand, clientX: number, clientY: number) => {
      const rect = hand.canvas.getBoundingClientRect();
      const mouseCol = ((clientX - rect.left) / rect.width) * ASCII_COLUMNS;
      const mouseRow = ((clientY - rect.top) / rect.height) * hand.rows;
      let closest: Cell | null = null;
      let closestDist = Infinity;
      for (const cell of hand.cellList) {
        const dx = mouseCol - cell.col;
        const dy = mouseRow - cell.row;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = cell;
        }
      }
      if (closest && closestDist <= 8) highlightCluster(hand.cells, closest);
    };

    function onMouseMove(e: MouseEvent) {
      hands.forEach((h) => hoverHand(h, e.clientX, e.clientY));
    }
    root.addEventListener("mousemove", onMouseMove);
    cleanupFns.push(() => root.removeEventListener("mousemove", onMouseMove));

    const wrappers = handWrapRefs.current.filter(Boolean) as HTMLDivElement[];
    const pointer = { x: 0, y: 0 };
    const drift = { x: 0, y: 0 };
    // Hands start pushed off each edge and slide in, matching the source's reveal.
    const reveal = { left: -125, right: 125 };
    function setPointerTarget(clientX: number, clientY: number) {
      const rect = root!.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width - 0.5) * 40;
      pointer.y = ((clientY - rect.top) / rect.height - 0.5) * 40;
    }
    let parallaxRaf = 0;
    function renderParallax() {
      drift.x += (pointer.x - drift.x) * 0.05;
      drift.y += (pointer.y - drift.y) * 0.05;
      wrappers.forEach((wrapper, i) => {
        const direction = i === 0 ? 1 : -1;
        const x = drift.x * direction;
        const y = -drift.y;
        const revealX = i === 0 ? reveal.left : reveal.right;
        wrapper.style.transform = `translate(calc(${x}px + ${revealX}%), ${y}px) scale(1.2)`;
      });
      parallaxRaf = requestAnimationFrame(renderParallax);
    }
    renderParallax();
    root.addEventListener("mousemove", (e) => setPointerTarget(e.clientX, e.clientY));

    const tl = gsap.timeline({ delay: 0.3 });
    tl.to(reveal, { left: 0, right: 0, duration: 1, ease: "power3.out" }, 0);
    tl.to(chars, { yPercent: 0, duration: 1, ease: "power3.out", stagger: { each: 0.04, from: "center" } }, 0);
    tl.to(lines, { yPercent: 0, duration: 1, ease: "power3.out", stagger: 0.08 }, "<0.1");

    return () => {
      tl.kill();
      cancelAnimationFrame(parallaxRaf);
      rafIds.forEach(cancelAnimationFrame);
      cleanupFns.forEach((fn) => fn());
      headingSplits.forEach((s) => s.revert());
      lineSplits.forEach((s) => s.revert());
    };
  }, [charColor, hoverColor, headingLeft, headingRight]);

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden bg-[#0f0f0f]" style={{ fontFamily }}>
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div ref={(el) => { handWrapRefs.current[0] = el; }} className="hand-img relative w-[40%] min-w-[100px]">
          <img className="ascii-hand w-full opacity-0" src="/ascii-footer/hand-left.jpg" alt="" />
        </div>
        <div ref={(el) => { handWrapRefs.current[1] = el; }} className="hand-img relative w-[40%] min-w-[100px]">
          <img className="ascii-hand w-full opacity-0" src="/ascii-footer/hand-right.jpg" alt="" />
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full p-4 flex justify-between gap-4 text-white">
        <nav className="flex flex-col gap-0.5">
          {["Work", "About", "Journal", "Contact"].map((label, i) => (
            <span
              key={label}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              className="text-xs text-white overflow-hidden"
            >
              {label}
            </span>
          ))}
        </nav>
        <p ref={textRef} className="text-xs leading-relaxed max-w-[55%] overflow-hidden">
          A multidisciplinary studio working across direction, design and motion. We build considered digital experiences.
        </p>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-4 flex justify-between items-end text-white">
        <h1
          ref={(el) => {
            headingRefs.current[0] = el;
          }}
          className="uppercase font-medium leading-none"
          style={{ fontSize: `clamp(calc(1.5rem * ${scale}),calc(7vw * ${scale}),calc(4rem * ${scale}))` }}
        >
          {headingLeft}
        </h1>
        <h1
          ref={(el) => {
            headingRefs.current[1] = el;
          }}
          className="uppercase font-medium leading-none"
          style={{ fontSize: `clamp(calc(1.5rem * ${scale}),calc(7vw * ${scale}),calc(4rem * ${scale}))` }}
        >
          {headingRight}
        </h1>
      </div>
    </div>
  );
}
