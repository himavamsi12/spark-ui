"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, Camera, Clapperboard, LayoutGrid, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Sidebar from "@/components/layout/Sidebar";
import ComponentCard from "./ComponentCard";
import Footer from "@/components/layout/Footer";
import type { ComponentEntry, SortKey } from "@/lib/types";

const SORT_KEYS: SortKey[] = ["trending", "recent", "copied", "recommended"];

const TAB_ICONS: Record<string, LucideIcon> = { Charts: BarChart3, Widgets: LayoutGrid };

export default function Explorer({
  data,
  pinnedFirst = [],
  categoryTabs,
}: {
  data: ComponentEntry[];
  /** Slugs forced to the top of the grid, in this order, ahead of any sort. */
  pinnedFirst?: string[];
  /** When set, replaces the preview-type toggle with category tabs; the first tab is selected by default. */
  categoryTabs?: string[];
}) {
  const searchParams = useSearchParams();
  const originalsOnly = searchParams.get("view") === "originals";
  const scoped = useMemo(
    () => (originalsOnly ? data.filter((d) => d.source === "original") : data),
    [data, originalsOnly]
  );

  // Lets the sidebar's Explore shortcuts (Trending, Recently Added, ...) land
  // here already sorted when they navigate in from another page, instead of
  // arriving and silently resetting to the default.
  const initialSort = searchParams.get("sort") as SortKey | null;
  const [search, setSearch] = useState("");
  // ?category= picks the opening tab, so a detail page's back link returns to
  // the tab the visitor came from rather than always the first one.
  const initialCategory = searchParams.get("category");
  const [category, setCategoryState] = useState<string | null>(
    categoryTabs ? (initialCategory && categoryTabs.includes(initialCategory) ? initialCategory : categoryTabs[0]) : null,
  );
  const setCategory = (next: string | null) => {
    setCategoryState(next);
    if (!categoryTabs) return;
    // Keep the URL in step with the tab so the browser's back button and
    // reloads land on it too.
    const params = new URLSearchParams(window.location.search);
    if (next && next !== categoryTabs[0]) params.set("category", next);
    else params.delete("category");
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  };
  const [sort, setSort] = useState<SortKey>(
    initialSort && SORT_KEYS.includes(initialSort) ? initialSort : "trending",
  );
  const [previewType, setPreviewType] = useState<"live" | "still">("live");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of scoped) c[d.category] = (c[d.category] || 0) + 1;
    return c;
  }, [scoped]);

  const filtered = useMemo(() => {
    let list = scoped;
    if (category) list = list.filter((d) => d.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === "trending") sorted.sort((a, b) => b.views - a.views);
    else if (sort === "copied") sorted.sort((a, b) => b.copies - a.copies);
    else if (sort === "recent") sorted.sort((a, b) => a.addedRank - b.addedRank);
    if (pinnedFirst.length === 0) return sorted;
    const pinned = pinnedFirst
      .map((slug) => sorted.find((d) => d.slug === slug))
      .filter((d): d is ComponentEntry => Boolean(d));
    return [...pinned, ...sorted.filter((d) => !pinnedFirst.includes(d.slug))];
  }, [scoped, category, search, sort, pinnedFirst]);

  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar
        data={scoped}
        search={search}
        onSearch={setSearch}
        sort={sort}
        onSort={setSort}
        category={category}
        onCategory={setCategory}
        counts={counts}
        total={scoped.length}
        mobileOpen={mobileFiltersOpen}
        onMobileClose={() => setMobileFiltersOpen(false)}
      />
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto no-scrollbar px-6 py-5" data-shell-scroll>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-1.5 shrink-0 border border-border text-pearl text-xs font-medium px-2.5 py-1.5 rounded-pills hover:border-pearl/40 hover:text-chalk transition-colors lg:hidden"
            >
              <SlidersHorizontal size={13} />
              Filters
            </button>
            {categoryTabs ? (
              // Category tabs lead the toolbar as the page's primary control,
              // with a sliding highlight so switching reads as one motion.
              <div
                role="tablist"
                aria-label="Kit category"
                className="flex items-center gap-1 bg-panel border border-border rounded-[10px] p-1 min-w-0 overflow-x-auto no-scrollbar"
              >
                {categoryTabs.map((tab) => {
                  const Icon = TAB_ICONS[tab];
                  const active = category === tab;
                  return (
                    <button
                      key={tab}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setCategory(tab)}
                      className={`relative flex cursor-pointer items-center gap-2 px-4 py-2 text-sm font-medium rounded-[8px] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                        active ? "text-chalk" : "text-muted hover:text-pearl"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="kit-tab-highlight"
                          className="absolute inset-0 rounded-[8px] bg-slate border border-accent/70 shadow-[0_0_0_1px_rgba(255,138,61,0.08),0_0_14px_-4px_rgba(255,138,61,0.45)]"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      {Icon && <Icon size={15} className={`relative ${active ? "text-accent" : ""}`} />}
                      <span className="relative">{tab}</span>
                      <span
                        className={`relative min-w-5 px-1.5 py-0.5 rounded-[5px] text-[11px] leading-none tabular-nums ${
                          active ? "bg-accent/15 text-accent" : "bg-card text-muted"
                        }`}
                      >
                        {counts[tab] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted truncate">
                {category ? (
                  <>
                    {category} • {filtered.length}
                  </>
                ) : (
                  <>Discover {filtered.length} Components</>
                )}
              </p>
            )}
          </div>
          {categoryTabs ? null : (
            <div className="flex items-center gap-1 bg-panel border border-border rounded-pills p-1 shrink-0">
              <span className="text-xs text-muted pl-1.5 pr-1 hidden sm:inline">Preview Type:</span>
              <button
                onClick={() => setPreviewType("live")}
                className={`p-1.5 rounded-pills transition-colors ${
                  previewType === "live" ? "bg-slate text-chalk" : "text-muted"
                }`}
                title="Animated preview"
              >
                <Clapperboard size={14} />
              </button>
              <button
                onClick={() => setPreviewType("still")}
                className={`p-1.5 rounded-pills transition-colors ${
                  previewType === "still" ? "bg-slate text-chalk" : "text-muted"
                }`}
                title="Still preview"
              >
                <Camera size={14} />
              </button>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-sm text-muted py-20 text-center">No components match your search.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
            {filtered.map((entry) => (
              <ComponentCard key={entry.slug} entry={entry} still={previewType === "still"} />
            ))}
          </div>
        )}

        <div className="-mx-6">
          <Footer />
        </div>
      </main>
    </div>
  );
}
