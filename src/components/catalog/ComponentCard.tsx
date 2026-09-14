"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import MediaPreview from "./MediaPreview";
import type { ComponentEntry } from "@/lib/types";

/** Anything a chart preview uses as its own control. Clicks on these stay in the grid. */
const CONTROL_SELECTOR =
  'button, a, input, select, textarea, label, [role="button"], [role="tab"], [role="slider"], [role="switch"], [role="checkbox"], [role="radio"], [data-card-control]';

function formatViews(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${n}`;
}

export default function ComponentCard({
  entry,
  still = false,
}: {
  entry: ComponentEntry;
  still?: boolean;
}) {
  // Charts are usable right in the grid, so their preview sits above the card's
  // link. A click on the preview still opens the component, unless it lands on
  // one of the chart's own controls or ends a drag.
  const interactive = entry.category === "Charts" && !still;
  const router = useRouter();
  const href = `/components/${entry.slug}`;
  const down = useRef<{ x: number; y: number } | null>(null);

  function openFromPreview(e: React.MouseEvent<HTMLDivElement>) {
    const start = down.current;
    down.current = null;
    if (e.defaultPrevented || e.button !== 0) return;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
    const target = e.target as Element;
    if (target.closest(CONTROL_SELECTOR)) return;
    // Clickable chart marks (a sunburst slice, a legend dot) set a pointer cursor
    // of their own. The preview itself shows a pointer too, and children inherit
    // it, so only an element that switches the cursor to pointer counts.
    for (let el: Element | null = target; el && el !== e.currentTarget; el = el.parentElement) {
      const parent = el.parentElement;
      if (parent && getComputedStyle(el).cursor === "pointer" && getComputedStyle(parent).cursor !== "pointer") return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href);
  }

  return (
    // A container with a link stretched over it, rather than one big <a>:
    // several previews render links of their own (menus, a "Sign up"), and a
    // link inside a link is invalid HTML that React flags as a hydration error.
    <div className="group relative block rounded-cards overflow-hidden border border-border bg-card hover:border-pearl/30 transition-colors">
      <Link href={href} aria-label={entry.name} className="absolute inset-0 z-10" />
      <div
        className={`relative aspect-video bg-void overflow-hidden ${interactive ? "z-20 cursor-pointer" : ""}`}
        onPointerDown={interactive ? (e) => (down.current = { x: e.clientX, y: e.clientY }) : undefined}
        onClick={interactive ? openFromPreview : undefined}
      >
        <MediaPreview entry={entry} className="w-full h-full" still={still} interactive={interactive} />
        <div className="pointer-events-none absolute top-2 right-2 bg-void/85 border border-pearl/10 text-[10px] font-medium text-pearl/80 px-2 py-0.5 rounded-pills">
          Free
        </div>
      </div>
      <div className="flex items-center justify-between px-3.5 py-3">
        <span className="text-sm font-medium text-pearl truncate">{entry.name}</span>
        <span className="flex items-center gap-1 text-xs text-muted shrink-0 ml-2">
          <Eye size={13} />
          {formatViews(entry.views)}
        </span>
      </div>
    </div>
  );
}
