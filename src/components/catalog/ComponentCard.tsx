"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import MediaPreview from "./MediaPreview";
import type { ComponentEntry } from "@/lib/types";

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
  // Charts are usable right in the grid: their preview sits above the card's
  // link, so only the name row below it navigates.
  const interactive = entry.category === "Charts" && !still;
  return (
    // A container with a link stretched over it, rather than one big <a>:
    // several previews render links of their own (menus, a "Sign up"), and a
    // link inside a link is invalid HTML that React flags as a hydration error.
    <div className="group relative block rounded-cards overflow-hidden border border-border bg-card hover:border-pearl/30 transition-colors">
      <Link href={`/components/${entry.slug}`} aria-label={entry.name} className="absolute inset-0 z-10" />
      <div className={`relative aspect-video bg-void overflow-hidden ${interactive ? "z-20" : ""}`}>
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
