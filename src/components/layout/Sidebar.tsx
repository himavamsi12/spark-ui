"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
 BookOpen,
 Heart,
 Search,
 TrendingUp,
 Sparkles,
 Flame,
 Sparkle,
 X,
 PanelLeftClose,
 PanelLeft,
} from "lucide-react";
import MediaPreview from "@/components/catalog/MediaPreview";
import { useFavorites } from "@/lib/favorites";
import { CATEGORY_ORDER, type ComponentEntry, type SortKey } from "@/lib/types";

const EXPLORE_LINKS: { href: string; label: string; icon: React.ElementType }[] = [
 { href: "/docs", label: "Introduction", icon: BookOpen },
];

const EXPLORE: { key: SortKey; label: string; icon: React.ElementType; disabled?: boolean }[] = [
 { key: "trending", label: "Trending", icon: TrendingUp },
 { key: "recent", label: "Recently Added", icon: Sparkles },
 { key: "copied", label: "Most Copied", icon: Flame },
 { key: "recommended", label: "Recommended", icon: Sparkle, disabled: true },
];

const PREVIEW_W = 260;
const PREVIEW_H = 150;
const HOVER_DELAY = 150; // avoids mounting a live preview for every item you sweep past

// Tooltip for the collapsed rail. Defined at module level: declared inside
// Sidebar it was a new component type every render, remounting every button.
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 pointer-events-none whitespace-nowrap rounded-medium bg-charcoal border border-border px-2.5 py-1 text-xs text-chalk opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
        {text}
      </span>
    </div>
  );
}

export default function Sidebar({
 data,
 search,
 onSearch,
 sort,
 onSort,
 category,
 onCategory,
 counts,
 total,
 mobileOpen = false,
 onMobileClose,
}: {
 data: ComponentEntry[];
 search: string;
 onSearch: (v: string) => void;
 sort: SortKey;
 onSort: (v: SortKey) => void;
 category: string | null;
 onCategory: (v: string | null) => void;
 counts: Record<string, number>;
 total: number;
 /** Below `lg` the sidebar is an off-canvas drawer instead of a static column. */
 mobileOpen?: boolean;
 onMobileClose?: () => void;
}) {
 const pathname = usePathname();
 const activeSlug = pathname?.startsWith("/components/") ? pathname.split("/")[2] : null;
 const onExploreLink = EXPLORE_LINKS.some((l) => pathname === l.href);
 // The sort buttons only have a live grid to act on from the browse page;
 // everywhere else (docs, a single component's detail page) they need to
 // navigate there instead of quietly flipping state nothing on screen reads.
 const onExplorerPage = pathname === "/components";

 // Saved from the heart on any component page. Ordered by the stored list so
 // the most recently saved sits at the bottom, matching the order they were added.
 const favorites = useFavorites();
 const favoriteEntries = useMemo(
 () => favorites.map((slug) => data.find((d) => d.slug === slug)).filter((d): d is ComponentEntry => !!d),
 [favorites, data],
 );

 const [preview, setPreview] = useState<{ entry: ComponentEntry; top: number; left: number } | null>(null);
 const searchInputRef = useRef<HTMLInputElement>(null);
 const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 // Tracked outside state so handleEnter can tell "already showing" from "first
 // hover" without waiting on a render.
 const isShowing = useRef(false);

 // ── Collapse state ────────────────────────────────────────────────────
 // Collapsed by default; hovering anywhere over the panel expands it, and
 // leaving collapses it back. The toggle button is the touch fallback,
 // where there's no hover to expand it in the first place.
 const [hoverCollapsed, setHoverCollapsed] = useState(true);
 // The mobile drawer always shows the full menu — there's no hover on touch
 // to expand it otherwise — regardless of the desktop hover/pin state.
 const collapsed = hoverCollapsed && !mobileOpen;

 function toggleCollapsed() {
 setHoverCollapsed((c) => !c);
 }

 function clearHoverTimer() {
 if (hoverTimer.current) {
 clearTimeout(hoverTimer.current);
 hoverTimer.current = null;
 }
 }

 function positionFor(el: HTMLElement) {
 const rect = el.getBoundingClientRect();
 const left = rect.right + 12;
 // Clamp vertically so the card never runs off the bottom of the viewport.
 const top = Math.min(Math.max(rect.top - 8, 8), window.innerHeight - PREVIEW_H - 8);
 return { top, left };
 }

 function handleEnter(entry: ComponentEntry, el: HTMLElement) {
 clearHoverTimer();
 if (isShowing.current) {
 // A preview is already up: follow the cursor straight to the next item,
 // with the position change eased by CSS rather than a fresh delay, so
 // sweeping down the list reads as one continuous glide.
 setPreview({ entry, ...positionFor(el) });
 return;
 }
 hoverTimer.current = setTimeout(() => {
 isShowing.current = true;
 setPreview({ entry, ...positionFor(el) });
 }, HOVER_DELAY);
 }

 function handleLeave() {
 clearHoverTimer();
 isShowing.current = false;
 setPreview(null);
 }

 // A component link navigating away should close the mobile drawer instead
 // of leaving it open behind the new page.
 useEffect(() => {
 onMobileClose?.();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [pathname]);

 // Every component, grouped by category and alphabetised. This list is the
 // full site index, independent of the category/sort filters applied to the
 // grid, so you can always jump straight to a component by name.
 const groups = useMemo(() => {
 const q = search.trim().toLowerCase();
 const byCategory = new Map<string, ComponentEntry[]>();
 for (const entry of data) {
 if (q && !entry.name.toLowerCase().includes(q)) continue;
 const list = byCategory.get(entry.category) ?? [];
 list.push(entry);
 byCategory.set(entry.category, list);
 }
 const orderedKeys = [
 ...CATEGORY_ORDER.filter((c) => byCategory.has(c)),
 ...[...byCategory.keys()].filter((c) => !(CATEGORY_ORDER as readonly string[]).includes(c)),
 ];
 return orderedKeys.map((cat) => ({
 category: cat,
 entries: [...(byCategory.get(cat) ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
 }));
 }, [data, search]);


 return (
 <>
 {/* Backdrop: mobile/tablet only, and only while the drawer is open. */}
 {mobileOpen && (
 <div
 className="fixed inset-0 z-40 bg-void/70 lg:hidden"
 onClick={onMobileClose}
 aria-hidden="true"
 />
 )}
 <aside
 onMouseEnter={() => setHoverCollapsed(false)}
 onMouseLeave={() => setHoverCollapsed(true)}
 className={`fixed inset-y-0 left-0 z-50 bg-bg border-r border-border overflow-y-auto overflow-x-hidden no-scrollbar transition-[width,padding,transform] duration-[420ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
 mobileOpen ? "translate-x-0" : "-translate-x-full"
 } lg:static lg:z-auto lg:shrink-0 lg:h-full lg:translate-x-0 ${
 collapsed
 ? "w-[60px] lg:w-[60px] px-2"
 : "w-[280px] lg:w-[280px] max-w-[82vw] px-4"
 }`}
 >
 {/* ── Header: toggle + (search when expanded) ── */}
 <div
 className={`mb-4 flex transition-[justify-content] duration-300 ${collapsed ? "flex-col items-center" : "items-center justify-end"}`}
 >
 <Tooltip text={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
 <button
 onClick={toggleCollapsed}
 aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
 className="p-2 rounded-lg text-muted hover:text-chalk hover:bg-panel transition-all"
 >
 {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
 </button>
 </Tooltip>
 </div>

 {/* Search — collapses out of flow instead of popping, so the toggle
 doesn't jump the instant the rail switches. */}
 <div
 className={`relative overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out ${
 collapsed ? "max-h-0 opacity-0 mb-0 pointer-events-none" : "max-h-16 opacity-100 mb-5"
 }`}
 >
 <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
 <input
 ref={searchInputRef}
 value={search}
 onChange={(e) => onSearch(e.target.value)}
 placeholder={`Filter ${total} components…`}
 tabIndex={collapsed ? -1 : 0}
 className="w-full bg-charcoal border border-border rounded-pills pl-9 pr-9 py-2 text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
 />
 <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted border border-border rounded-small px-1.5 py-0.5">
 /
 </kbd>
 </div>

 {/* ── Collapsed rail and expanded nav are both kept mounted and
 crossfaded, rather than hard-swapped, so the content doesn't pop
 while the width is still animating. ── */}
 <div className="relative">
 <nav
 className={`flex flex-col gap-0.5 transition-opacity duration-200 ${
 collapsed ? "opacity-100 delay-150" : "opacity-0 pointer-events-none absolute inset-0 overflow-hidden"
 }`}
 onMouseLeave={handleLeave}
 >
 {/* Explore rail only */}
 <div className="flex flex-col gap-0.5 items-center">
 <Tooltip text="Search">
 <button
 onClick={() => {
 setHoverCollapsed(false);
 // Wait for the expand transition to start before focusing,
 // otherwise the input is still width:0 and unfocusable.
 requestAnimationFrame(() => searchInputRef.current?.focus());
 }}
 className="flex justify-center py-2 rounded-medium text-muted hover:text-chalk transition-colors"
 >
 <Search size={20} />
 </button>
 </Tooltip>
 {EXPLORE_LINKS.map(({ href, label, icon: Icon }) => (
 <Tooltip key={href} text={label}>
 <Link
 href={href}
 className={`flex justify-center py-2 rounded-medium transition-colors ${
 pathname === href ? "text-chalk" : "text-muted hover:text-chalk"
 }`}
 >
 <Icon size={20} />
 </Link>
 </Tooltip>
 ))}
 {EXPLORE.filter((e) => !e.disabled).map(({ key, label, icon: Icon }) => {
 const active = sort === key && !onExploreLink && onExplorerPage;
 return (
 <Tooltip key={key} text={label}>
 <button
 onClick={() => {
 if (!onExplorerPage) {
 window.location.href = `/components?sort=${key}`;
 } else {
 onSort(key);
 }
 }}
 className={`flex justify-center py-2 rounded-medium transition-colors ${
 active ? "text-chalk" : "text-muted hover:text-chalk"
 }`}
 >
 <Icon size={20} />
 </button>
 </Tooltip>
 );
 })}
 </div>
 </nav>

 {/* ── Expanded: full sidebar (original layout) ── */}
 <div
 className={`transition-opacity duration-200 ${
 collapsed ? "opacity-0 pointer-events-none absolute inset-0 overflow-hidden" : "opacity-100 delay-150"
 }`}
 >
 <div className="mb-5 pb-5 border-b border-border-soft">
 <h3 className="text-xs font-medium text-muted mb-2.5 px-0.5">Explore</h3>
 <div className="flex flex-col gap-1.5">
 {EXPLORE_LINKS.map(({ href, label, icon: Icon }) => (
 <Link
 key={href}
 href={href}
 className={`flex items-center gap-2 text-sm rounded-pills border px-3 py-2 transition-colors ${
 pathname === href
 ? "bg-slate border-border text-chalk"
 : "border-border text-pearl hover:border-pearl/40"
 }`}
 >
 <Icon size={14} />
 {label}
 </Link>
 ))}
 {EXPLORE.map(({ key, label, icon: Icon, disabled }) => {
 const active = sort === key && !onExploreLink && onExplorerPage;
 const className = `flex items-center gap-2 text-sm rounded-pills border px-3 py-2 transition-colors text-left ${
 active
 ? "bg-slate border-border text-chalk"
 : disabled
 ? "border-border text-muted/50 cursor-not-allowed"
 : "border-border text-pearl hover:border-pearl/40"
 }`;
 const content = (
 <>
 <Icon size={14} />
 {label}
 </>
 );
 // Off the browse page there's no grid for onSort to reorder, so
 // this needs to actually navigate there instead.
 if (!onExplorerPage && !disabled) {
 return (
 <Link key={key} href={`/components?sort=${key}`} className={className}>
 {content}
 </Link>
 );
 }
 return (
 <button
 key={key}
 disabled={disabled}
 onClick={() => onSort(key)}
 title={disabled ? "Sign in to see recommendations" : undefined}
 className={className}
 >
 {content}
 </button>
 );
 })}
 </div>
 </div>

 {groups.length === 0 ? (
 <p className="text-sm text-muted px-0.5">No components match &ldquo;{search}&rdquo;.</p>
 ) : (
 <nav className="flex flex-col gap-5" onMouseLeave={handleLeave}>
 {favoriteEntries.length > 0 && (
 <div>
 <div className="flex items-center justify-between w-full text-xs font-medium mb-2 px-0.5 text-muted">
 <span className="uppercase tracking-wide flex items-center gap-1.5">
 <Heart size={11} className="text-accent fill-accent" />
 Favorites
 </span>
 <span className="text-[10px] tabular-nums">{favoriteEntries.length}</span>
 </div>
 <div className="flex flex-col">
 {favoriteEntries.map((entry) => (
 <Link
 key={`fav-${entry.slug}`}
 href={`/components/${entry.slug}`}
 onMouseEnter={(e) => handleEnter(entry, e.currentTarget)}
 className={`text-sm rounded-medium px-2.5 py-1.5 -mx-0.5 transition-colors truncate ${
 entry.slug === activeSlug
 ? "bg-slate text-chalk"
 : "text-pearl hover:bg-panel hover:text-chalk"
 }`}
 >
 {entry.name}
 </Link>
 ))}
 </div>
 </div>
 )}
 {groups.map(({ category: cat, entries }) => (
 <div key={cat}>
 <button
 onClick={() => onCategory(category === cat ? null : cat)}
 className={`flex items-center justify-between w-full text-xs font-medium mb-2 px-0.5 transition-colors ${
 category === cat ? "text-chalk" : "text-muted hover:text-pearl"
 }`}
 >
 <span className="uppercase tracking-wide">{cat}</span>
 <span className="text-[10px] tabular-nums">{counts[cat] ?? entries.length}</span>
 </button>
 <div className="flex flex-col">
 {entries.map((entry) => {
 const isActive = entry.slug === activeSlug;
 return (
 <Link
 key={entry.slug}
 href={`/components/${entry.slug}`}
 onMouseEnter={(e) => handleEnter(entry, e.currentTarget)}
 className={`text-sm rounded-medium px-2.5 py-1.5 -mx-0.5 transition-colors truncate ${
 isActive
 ? "bg-slate text-chalk"
 : "text-pearl hover:bg-panel hover:text-chalk"
 }`}
 >
 {entry.name}
 </Link>
 );
 })}
 </div>
 </div>
 ))}
 </nav>
 )}
 </div>
 </div>

 </aside>

 {/* Rendered as a sibling of <aside>, not a child: the aside has
 overflow-x-hidden for the collapse-width animation, and an
 overflow-hidden ancestor clips position:fixed descendants too —
 nesting this here was cutting the preview off at the sidebar's edge. */}
 {preview && (
 <div
 className="hidden lg:block fixed z-50 pointer-events-none rounded-cards border border-border bg-card shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden transition-[top,left] duration-150 ease-out"
 style={{ top: preview.top, left: preview.left, width: PREVIEW_W }}
 >
 <div className="bg-void" style={{ height: PREVIEW_H }}>
 <MediaPreview entry={preview.entry} className="w-full h-full" />
 </div>
 <div className="px-2.5 py-2 flex items-center justify-between gap-2 border-t border-border-soft">
 <span className="text-xs text-chalk truncate">{preview.entry.name}</span>
 <span className="text-[10px] text-muted shrink-0">{preview.entry.category}</span>
 </div>
 </div>
 )}
 </>
 );
}
