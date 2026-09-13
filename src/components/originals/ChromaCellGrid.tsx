"use client";

import { useEffect, useRef } from "react";

/** Effective CSS zoom on an untransformed element (1 unless inside a zoomed container). */
function cssZoom(el: HTMLElement): number {
  const layout = el.offsetWidth;
  const visual = el.getBoundingClientRect().width;
  return layout && visual ? visual / layout : 1;
}

/** getBoundingClientRect() in layout pixels, so rects and CSS left/top agree under zoom. */
function layoutRect(el: Element, zoom: number) {
  const r = el.getBoundingClientRect();
  return { left: r.left / zoom, top: r.top / zoom, right: r.right / zoom, bottom: r.bottom / zoom, width: r.width / zoom, height: r.height / zoom };
}

const DEFAULT_TOP_ROW = ["Identity", "Film", "Type"];
const DEFAULT_BOTTOM_ROW = ["Product", "Print", "Objects", "Rooms", "Audio"];
/** Unscaled size of the highlight block; its real size comes from scale(). */
const BASE = 100;
const DEFAULT_COLORS = ["#E24E1B", "#4381C1", "#F79824", "#04A777", "#5B8C5A", "#2176FF", "#818D92", "#22AAA1"];

/**
 * A bordered two-row grid of labels with a single coloured block that glides
 * to whichever cell the cursor is over, resizing to fit it and taking on that
 * cell's colour. Below 900px the rows stack and the block is hidden.
 */
export default function ChromaCellGrid({
  brand = "Northfold",
  navMeta = "Vol. 03",
  footerLeft = "Pick a discipline",
  footerRight = "Est. 2019",
  topRow = DEFAULT_TOP_ROW,
  bottomRow = DEFAULT_BOTTOM_ROW,
  colors = DEFAULT_COLORS,
  background = "#1a1a1a",
  textColor = "#ffffff",
  duration = 250,
  fontFamily = "var(--font-dm-mono), monospace",
  textScale = 100,
}: {
  brand?: string;
  navMeta?: string;
  footerLeft?: string;
  footerRight?: string;
  topRow?: string[];
  bottomRow?: string[];
  colors?: string[];
  background?: string;
  textColor?: string;
  /** Glide duration of the highlight, in milliseconds. */
  duration?: number;
  fontFamily?: string;
  textScale?: number;
}) {
  const scale = textScale / 100;
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const layoutKey = [...colors, "|", ...topRow, "|", ...bottomRow].join("\u0000");

  useEffect(() => {
    const container = containerRef.current;
    const highlight = highlightRef.current;
    if (!container || !highlight) return;
    const gridItems = container.querySelectorAll<HTMLElement>("[data-grid-item]");
    const firstItem = gridItems[0];
    const palette = colors.length ? colors : DEFAULT_COLORS;

    gridItems.forEach((item, index) => {
      item.dataset.color = palette[index % palette.length];
    });

    const moveToElement = (element: HTMLElement | null) => {
      if (element) {
        // Layout-pixel rects, so the block still lands on its cell inside a
        // zoomed preview card.
        const zoom = cssZoom(container);
        const rect = layoutRect(element, zoom);
        const containerRect = layoutRect(container, zoom);

        // Same result as the reference's width/height transition, but sized
        // with scale on a fixed-size block: a solid fill looks identical, and
        // the glide stays on the compositor instead of re-laying out the page
        // every frame, which is what made it stutter.
        highlight.style.transform = `translate(${rect.left - containerRect.left}px, ${rect.top - containerRect.top}px) scale(${rect.width / BASE}, ${rect.height / BASE})`;
        highlight.style.backgroundColor = element.dataset.color ?? "";
      }
    };

    const moveHighlight = (e: MouseEvent) => {
      const hoveredElement = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;

      if (hoveredElement && hoveredElement.hasAttribute("data-grid-item")) {
        moveToElement(hoveredElement);
      } else if (hoveredElement?.parentElement?.hasAttribute("data-grid-item")) {
        moveToElement(hoveredElement.parentElement);
      }
    };

    moveToElement(firstItem);

    // The reference only positions on load; a component can be resized, so
    // keep the block glued to the first cell's size until it's hovered.
    let hovered = false;
    const onMove = (e: MouseEvent) => {
      hovered = true;
      moveHighlight(e);
    };
    const ro = new ResizeObserver(() => {
      if (!hovered) moveToElement(firstItem);
    });
    ro.observe(container);

    container.addEventListener("mousemove", onMove);

    return () => {
      ro.disconnect();
      container.removeEventListener("mousemove", onMove);
    };
    // Keyed on content, not identity: callers that rebuild these arrays every
    // render would otherwise snap the block back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  const border = "1px solid rgba(255, 255, 255, 0.2)";
  const pStyle = {
    textTransform: "uppercase",
    color: textColor,
    fontSize: `${13 * scale}px`,
    fontWeight: 500,
  } as const;

  const cell = (label: string, i: number, row: string[]) => (
    <div
      key={`${label}-${i}`}
      data-grid-item
      className="flex h-full flex-1 items-center justify-center @max-[900px]:w-full @max-[900px]:py-[60px] @max-[900px]:!border-r-0 @max-[900px]:[&:not(:last-child)]:border-b"
      style={{
        borderRight: i < row.length - 1 ? border : undefined,
        borderBottomColor: "rgba(255, 255, 255, 0.2)",
      }}
    >
      <p className="relative z-[2]" style={pStyle}>
        {label}
      </p>
    </div>
  );

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background, fontFamily, containerType: "inline-size" }}>
      {/* The reference's fixed bars, pinned to this box instead of the window. */}
      <nav
        className="absolute left-0 top-0 z-10 flex w-full items-center justify-between p-[1em]"
        style={{ background, borderBottom: border }}
      >
        <p style={pStyle}>{brand}</p>
        <p style={{ ...pStyle, opacity: 0.3 }}>{navMeta}</p>
      </nav>

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div
          ref={containerRef}
          className="relative flex h-full w-full items-center justify-center @max-[900px]:!h-auto @max-[900px]:min-h-full @max-[900px]:py-32"
        >
          <div className="relative mx-auto flex h-[60%] w-[90%] flex-col @max-[900px]:!h-max" style={{ border }}>
            <div className="flex h-full flex-1 items-center justify-center @max-[900px]:flex-col" style={{ borderBottom: border }}>
              {topRow.map((label, i) => cell(label, i, topRow))}
            </div>
            <div className="flex h-full flex-1 items-center justify-center @max-[900px]:flex-col">
              {bottomRow.map((label, i) => cell(label, i, bottomRow))}
            </div>
          </div>
          <div
            ref={highlightRef}
            className="pointer-events-none absolute left-0 top-0 @max-[900px]:hidden"
            style={{
              width: BASE,
              height: BASE,
              background: "white",
              opacity: 1,
              transformOrigin: "0 0",
              willChange: "transform",
              transition: `transform ${duration}ms ease, background-color ${duration}ms ease`,
            }}
          />
        </div>
      </div>

      <footer
        className="absolute bottom-0 left-0 z-10 flex w-full items-center justify-between p-[1em]"
        style={{ background, borderTop: border }}
      >
        <p style={{ ...pStyle, opacity: 0.3 }}>{footerLeft}</p>
        <p className="@max-[900px]:text-right" style={{ ...pStyle, opacity: 0.3 }}>
          {footerRight}
        </p>
      </footer>
    </div>
  );
}
