"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Eye,
  RotateCw,
  RotateCcw,
  Code2,
  EyeIcon,
  PanelRightOpen,
  SlidersHorizontal,
  Wand2,
  X,
} from "lucide-react";
import OriginalControlPanel from "./OriginalControlPanel";
import ComponentDelivery from "./ComponentDelivery";
import Sidebar from "@/components/layout/Sidebar";
import ComponentActions from "./ComponentActions";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getOriginal, getOriginalDefaults } from "@/lib/originalControls";
import { ORIGINAL_COMPONENTS } from "@/components/originals";
import { generateUsageSnippet } from "@/lib/usageSnippet";
import type { Params, ParamValue } from "@/lib/effects";
import { CHARTS_PAGE_CATEGORIES, type ComponentEntry, type SortKey } from "@/lib/types";

/** Below tablet width, render the preview at a desktop-sized canvas scaled down to fit,
 *  so phones see the component as it looks on desktop instead of a squashed full-screen version. */
const DESKTOP_W = 1100;
const DESKTOP_H = 740;
function DesktopFrame({ children, lifted = false }: { children: ReactNode; lifted?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const compact = box !== null && box.w < 768;
  // when the customize sheet is up, fit into the strip above it
  const availH = compact && lifted ? box.h * 0.4 : box ? box.h : 0;
  const scale = compact ? Math.min((box.w - 24) / DESKTOP_W, (availH - 24) / DESKTOP_H) : 1;
  return (
    <div ref={ref} className="absolute inset-0 flex justify-center transition-[padding] duration-300" style={{ alignItems: compact && lifted ? "flex-start" : "center", paddingTop: compact && lifted ? 12 : 0 }}>
      {compact ? (
        <div className="relative shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]" style={{ width: DESKTOP_W * scale, height: DESKTOP_H * scale }}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: DESKTOP_W, height: DESKTOP_H, transform: `scale(${scale})` }}>
            {children}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0">{children}</div>
      )}
    </div>
  );
}

function formatViews(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${n}`;
}

function typeLabel(t: string) {
  if (t === "toggle") return "boolean";
  if (t === "select") return "enum";
  if (t === "color") return "color";
  if (t === "text") return "string";
  if (t === "image") return "string";
  if (t === "imageList") return "string[]";
  if (t === "textList") return "string[]";
  if (t === "font") return "string";
  return "number";
}

/** Arrays are compared by value, since reference equality would always read as dirty. */
function sameValue(a: unknown, b: unknown) {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

function formatDefault(v: unknown) {
  if (Array.isArray(v)) return `${v.length} images`;
  const s = String(v);
  return s.length > 18 ? `${s.slice(0, 17)}…` : s;
}

export default function OriginalDetailView({
  entry,
  allComponents,
}: {
  entry: ComponentEntry;
  similar: ComponentEntry[];
  allComponents: ComponentEntry[];
}) {
  const original = getOriginal(entry.slug);
  const Comp = ORIGINAL_COMPONENTS[entry.slug];
  const schema = original?.controls ?? [];

  const [params, setParams] = useState<Params>(() => getOriginalDefaults(entry.slug));
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [replayKey, setReplayKey] = useState(0);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // The left nav is the same full site index as the browse page, where search,
  // sort, and category here are purely cosmetic (there's no grid on this page
  // to apply them to), they just drive which entries the sidebar highlights.
  const [navSearch, setNavSearch] = useState("");
  const [navSort, setNavSort] = useState<SortKey>("trending");
  const [navCategory, setNavCategory] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const navCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of allComponents) c[d.category] = (c[d.category] || 0) + 1;
    return c;
  }, [allComponents]);

  function updateParam(key: string, value: ParamValue) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  const defaults = getOriginalDefaults(entry.slug);
  const isDirty = schema.some((c) => !sameValue(params[c.key], defaults[c.key]));

  function resetParams() {
    setParams(defaults);
    setReplayKey((k) => k + 1);
  }

  const snippet = generateUsageSnippet(entry.name, schema, params);

  function openDetails() {
    setCustomizeOpen(false);
    setDetailsOpen(true);
  }

  return (
    <div className="flex h-full">
      <Sidebar
        data={allComponents}
        search={navSearch}
        onSearch={setNavSearch}
        sort={navSort}
        onSort={setNavSort}
        category={navCategory}
        onCategory={setNavCategory}
        counts={navCounts}
        total={allComponents.length}
        mobileOpen={mobileFiltersOpen}
        onMobileClose={() => setMobileFiltersOpen(false)}
      />

      <main className="flex-1 min-w-0 h-full overflow-y-auto no-scrollbar">
        {/* Phones get the site navbar back, since the sidebar is hidden there */}
        <div className="md:hidden">
          <Header section={CHARTS_PAGE_CATEGORIES.includes(entry.category) ? "charts" : undefined} />
        </div>
        {/* ── Preview fills the viewport below a solid toolbar row. The
            controls used to float over the component, which covered whatever
            each component drew along its top edge. ── */}
        <div className="relative w-full h-[calc(100dvh-5rem)] md:h-screen bg-void overflow-hidden flex flex-col">
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/10 bg-void">
          {/* Left: back to the grid + component name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="hidden md:flex lg:hidden items-center gap-1.5 p-2 rounded-pills bg-black/60 backdrop-blur border border-white/10 text-white/80 hover:text-white shrink-0"
              aria-label="Browse components"
            >
              <SlidersHorizontal size={14} />
            </button>
            <Link
              href={CHARTS_PAGE_CATEGORIES.includes(entry.category) ? "/charts" : "/components"}
              className="flex md:hidden lg:flex items-center gap-1.5 p-2 rounded-pills bg-black/60 backdrop-blur border border-white/10 text-white/80 hover:text-white shrink-0"
              aria-label="Back to components"
            >
              <ChevronLeft size={14} />
            </Link>
            <span className="flex min-w-0 items-center gap-2 text-[13px] sm:text-sm text-white/90 sm:bg-black/60 sm:backdrop-blur sm:border sm:border-white/10 rounded-pills sm:px-3 py-1.5">
              <span className="truncate">{entry.name}</span>
              <span className="hidden sm:inline text-white/40 shrink-0">·</span>
              <span className="hidden sm:inline text-white/50 shrink-0">{entry.category}</span>
            </span>
          </div>

          {/* Right: a single Code/Preview toggle, Reset, and the
              share/copy-for-AI actions all share one pill. */}
          <div className="shrink-0 flex items-center gap-0.5 sm:gap-1 bg-black/60 backdrop-blur border border-white/10 rounded-pills p-1">
            <button
              onClick={() => setTab(tab === "preview" ? "code" : "preview")}
              aria-label={tab === "preview" ? "Show code" : "Show preview"}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-pills text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              {tab === "preview" ? <Code2 size={14} /> : <EyeIcon size={14} />}
              <span className="hidden sm:inline">{tab === "preview" ? "Code" : "Preview"}</span>
            </button>
            {tab === "preview" && (
              <button
                onClick={() => setReplayKey((k) => k + 1)}
                className="p-2 rounded-pills text-white/60 hover:text-white/90 transition-colors"
                aria-label="Reset"
              >
                <RotateCw size={14} />
              </button>
            )}
            <span className="hidden sm:block w-px h-5 bg-white/10 mx-0.5" />
            <button
              onClick={openDetails}
              aria-pressed={detailsOpen}
              aria-label="Component details"
              title="Component details"
              className="p-2 rounded-pills text-white/60 hover:text-white/90 transition-colors"
            >
              <PanelRightOpen size={14} />
            </button>
            <span className="hidden sm:block w-px h-5 bg-white/10 mx-0.5" />
            <div className="[&_button]:border-white/10 [&_button]:text-white/70 [&_button:hover]:text-white [&_button:hover]:border-white/30 [&_[role=menu]]:bg-charcoal">
              <ComponentActions entry={entry} snippet={snippet} compact />
            </div>
          </div>
          </div>

          <div className="relative flex-1 min-h-0 overflow-hidden">
          {tab === "preview" ? (
            Comp && (
              <DesktopFrame lifted={customizeOpen}>
                <Comp key={replayKey} {...params} />
              </DesktopFrame>
            )
          ) : (
            <pre className="w-full h-full overflow-auto p-6 text-xs leading-relaxed text-white/80 font-mono whitespace-pre bg-[#0a0a0b]">
              {snippet}
            </pre>
          )}
          </div>

          {/* Customize tab: docked to the right edge of the screen at all
              times, rather than living inside the toolbar. It rides along
              with the panel's leading edge, so it reads as the panel's handle
              whether the panel is open or shut. */}
          {tab === "preview" && schema.length > 0 && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 z-20 hidden md:block transition-[right] duration-300 ease-out ${
                customizeOpen ? "right-[360px]" : "right-0"
              }`}
            >
              {/* Concave fillets: two quarter-circles of the tab's own color,
                  tangent to both the tab and the flat screen edge, so the tab
                  reads as flowing out of the edge (like a device notch)
                  instead of meeting it at a hard right angle. */}
              <div className="absolute -top-4 right-0 h-4 w-4 bg-[radial-gradient(circle_at_0_0,transparent_16px,rgba(17,17,19,0.82)_16px)]" />
              <button
                onClick={() => {
                  setDetailsOpen(false);
                  setCustomizeOpen((v) => !v);
                }}
                aria-pressed={customizeOpen}
                aria-label="Customize"
                title="Customize"
                className="relative flex h-20 w-9 sm:h-28 sm:w-12 items-center justify-center rounded-l-2xl border border-r-0 border-white/10 bg-[rgba(17,17,19,0.82)] text-white/70 backdrop-blur-xl transition-colors hover:text-white"
              >
                <Wand2 size={16} />
              </button>
              <div className="absolute -bottom-4 right-0 h-4 w-4 bg-[radial-gradient(circle_at_0_100%,transparent_16px,rgba(17,17,19,0.82)_16px)]" />
            </div>
          )}

          {/* Phones: a floating Customize pill that opens the panel as a bottom sheet */}
          {tab === "preview" && schema.length > 0 && (
            <button
              onClick={() => {
                setDetailsOpen(false);
                setCustomizeOpen(true);
              }}
              aria-label="Customize"
              className={`md:hidden absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-pills border border-white/15 bg-[rgba(17,17,19,0.85)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-300 active:scale-95 ${
                customizeOpen ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100"
              }`}
            >
              <Wand2 size={15} className="text-accent" />
              Customize
            </button>
          )}

          {/* Customize: slides in over the preview from the right, flush
              against the screen edge, instead of living below the fold — so
              tweaking a value and watching it land on the live component
              happen in the same glance. */}
          <div
            className={`absolute right-0 bottom-0 z-20 border-white/10 bg-black/85 backdrop-blur-xl transition-transform duration-300 ease-out md:top-0 md:w-[360px] md:max-w-[calc(100%-2.5rem)] md:border-l md:shadow-[-20px_0_60px_-12px_rgba(0,0,0,0.7)] max-md:left-0 max-md:h-[58%] max-md:rounded-t-3xl max-md:border-t max-md:shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.7)] ${
              customizeOpen ? "translate-x-0 translate-y-0" : "md:translate-x-full max-md:translate-y-full"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="md:hidden flex justify-center pt-2.5" onClick={() => setCustomizeOpen(false)}>
                <span className="h-1 w-10 rounded-full bg-white/25" />
              </div>
              <div className="flex items-center gap-2 px-4 py-3.5 border-b border-white/10 shrink-0">
                <h3 className="text-sm font-semibold text-white">Customize</h3>
                <button
                  onClick={resetParams}
                  disabled={!isDirty}
                  className="ml-auto flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 disabled:opacity-40 disabled:hover:text-white/60 transition-colors"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
                <button
                  onClick={() => setCustomizeOpen(false)}
                  aria-label="Close customize panel"
                  className="p-1 rounded-pills text-white/60 hover:text-white/90 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 [&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-white [&_button]:border-white/10 [&_button]:text-white/80 [&_label]:text-white/50 [&>div]:!grid-cols-1 [&_[class*=col-span]]:!col-span-1">
                <OriginalControlPanel schema={schema} values={params} onChange={updateParam} />
              </div>
            </div>
          </div>

          {/* Details: slides in over the preview from the right, holding the
              info that used to live below the fold — the page never needs to
              scroll past the component now. */}
          <div
            className={`absolute top-0 right-0 bottom-0 z-20 w-[420px] max-w-[calc(100%-2.5rem)] border-l border-white/10 bg-black/80 backdrop-blur-xl shadow-[-20px_0_60px_-12px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-out ${
              detailsOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 px-4 py-3.5 border-b border-white/10 shrink-0">
                <h3 className="text-sm font-semibold text-white">{entry.name}</h3>
                <span className="text-xs border border-white/10 text-white/70 rounded-pills px-2 py-0.5">
                  {entry.category}
                </span>
                <button
                  onClick={() => setDetailsOpen(false)}
                  aria-label="Close details panel"
                  className="ml-auto p-1 rounded-pills text-white/60 hover:text-white/90 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 [&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-white [&_button]:border-white/10 [&_button]:text-white/80">
                <div className="flex items-center gap-3 text-xs text-white/50 mb-5">
                  <span className="flex items-center gap-1">
                    <Eye size={13} /> {formatViews(entry.views)} views
                  </span>
                  <span>•</span>
                  <span>{formatViews(entry.copies)} uses</span>
                </div>

                <div className="border border-white/10 rounded-cards p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-white">Props</h4>
                    <span className="text-xs text-white/50">{schema.length} properties</span>
                  </div>
                  <div className="flex flex-col divide-y divide-white/10">
                    {schema.map((c) => (
                      <div key={c.key} className="py-3 flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <code className="text-accent font-mono text-xs">{c.key}</code>
                          <span className="text-white/40 text-xs font-mono">{typeLabel(c.type)}</span>
                          <span className="text-white/40 text-xs font-mono truncate">
                            {formatDefault(c.default)}
                          </span>
                        </div>
                        <span className="text-white/70 text-xs">{c.description ?? c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <ComponentDelivery slug={entry.slug} />

                {original?.blurb && (
                  <p className="text-sm text-white/70 leading-relaxed mb-6">{original.blurb}</p>
                )}
                {original?.features && original.features.length > 0 && (
                  <>
                    <h4 className="text-xs font-semibold tracking-wide text-white/50 mb-3">KEY FEATURES</h4>
                    <ul className="space-y-2 mb-4">
                      {original.features.map((f, i) => (
                        <li key={i} className="text-sm text-white/70 flex gap-2">
                          <span className="text-white/40">·</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Phones scroll past the preview to the site footer */}
        <div className="md:hidden">
          <Footer />
        </div>
      </main>
    </div>
  );
}
