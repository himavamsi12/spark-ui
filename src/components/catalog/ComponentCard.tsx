"use client";

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
  return (
    <a
      href={`/components/${entry.slug}`}
      onClick={(e) => {
        // Live previews contain their own controls (toggles, tabs); using
        // those should work in place, not open the detail page.
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, textarea, label, [role="button"]')) {
          e.preventDefault();
        }
      }}
      className="group relative block rounded-cards overflow-hidden border border-border bg-card hover:border-pearl/30 transition-colors"
    >
      <div className="relative aspect-video bg-void overflow-hidden">
        <MediaPreview entry={entry} className="w-full h-full" still={still} />
        <div className="absolute top-2 right-2 bg-void/85 border border-pearl/10 text-[10px] font-medium text-pearl/80 px-2 py-0.5 rounded-pills">
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
    </a>
  );
}
