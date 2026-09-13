"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Code2, Copy, Eye, PanelLeft, RotateCw, SlidersHorizontal, Terminal } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import ComponentDelivery from "./ComponentDelivery";
import ComponentActions from "./ComponentActions";
import OriginalControlPanel from "./OriginalControlPanel";
import { getOriginal, getOriginalDefaults } from "@/lib/originalControls";
import type { Params, ParamValue } from "@/lib/effects";
import { ORIGINAL_COMPONENTS } from "@/components/originals";
import { generateUsageSnippet } from "@/lib/usageSnippet";
import type { ComponentEntry, SortKey } from "@/lib/types";


/** Every Mono Chart component shares this same base prop shape. */
const BASE_CHART_PROPS = [
  { key: "theme", type: "'dark' | 'light'", default: "'dark'", description: "Colour scheme of the card." },
  { key: "compact", type: "boolean", default: "false", description: "Shrinks the card to a smaller fixed height." },
];

export default function ChartDetailView({
  entry,
  allComponents,
}: {
  entry: ComponentEntry;
  allComponents: ComponentEntry[];
}) {
  const original = getOriginal(entry.slug);
  const Comp = ORIGINAL_COMPONENTS[entry.slug];
  const schema = useMemo(() => original?.controls ?? [], [original]);

  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [params, setParams] = useState<Params>(() => getOriginalDefaults(entry.slug));
  const [replayKey, setReplayKey] = useState(0);
  const [copied, setCopied] = useState(false);

  // Same left nav as the component detail page. Search, sort and category are
  // cosmetic here as there's no grid on this page to apply them to; they just
  // drive which entries the sidebar highlights.
  const [navSearch, setNavSearch] = useState("");
  const [navSort, setNavSort] = useState<SortKey>("trending");
  const [navCategory, setNavCategory] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const navCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of allComponents) c[d.category] = (c[d.category] || 0) + 1;
    return c;
  }, [allComponents]);

  const installCommand = `npx spark-ui-registry@latest add ${entry.slug}`;
  const snippet = generateUsageSnippet(entry.name, schema, params);

  function updateParam(key: string, value: ParamValue) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function resetParams() {
    setParams(getOriginalDefaults(entry.slug));
    setReplayKey((k) => k + 1);
  }

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="flex flex-col h-screen">
      <Header section="charts" />
      {/* The sidebar is a static column from `lg` up and an off-canvas drawer
          below it, so it needs a flex row with a definite height to sit in. */}
      <div className="flex flex-1 min-h-0">
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
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto no-scrollbar">
        <div className="px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
          {/* Back */}
          <div className="mb-8 flex items-center gap-2">
            {/* Below `lg` the sidebar is off-canvas, so it needs a trigger. */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              aria-label="Browse components"
              className="lg:hidden inline-flex items-center text-chalk border border-border rounded-pills p-2 hover:border-pearl/40 transition-colors"
            >
              <PanelLeft size={15} />
            </button>
            <Link
              href="/charts"
              className="inline-flex items-center gap-2 text-sm font-medium text-chalk border border-border rounded-pills px-4 py-2 hover:border-pearl/40 transition-colors"
            >
              <ArrowLeft size={15} />
              Back to UI Kit
            </Link>
          </div>

          <h1 className="font-display font-semibold tracking-tight text-chalk leading-[1.05] mb-3 text-balance" style={{ fontSize: "clamp(2rem,5vw,3rem)" }}>
            {entry.name}
          </h1>

          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <p className="text-base text-pearl leading-relaxed max-w-xl">{original?.blurb}</p>
          </div>

          {/* Install command and toolbar (Code/Preview toggle, replay, details,
              share/copy-for-AI) share one row. */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <button
              onClick={copyInstall}
              className="flex items-center gap-2 bg-panel border border-border rounded-pills pl-4 pr-2 py-2 hover:border-pearl/40 transition-colors min-w-0"
            >
              <Terminal size={13} className="text-muted shrink-0" />
              <code className="text-xs font-mono text-pearl truncate max-w-[240px]">{installCommand}</code>
              <span className="p-1.5 rounded-pills bg-card text-pearl shrink-0">
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </span>
            </button>
            <div className="flex items-center gap-1 border border-border rounded-cards p-1">
              <button
                onClick={() => setTab(tab === "preview" ? "code" : "preview")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-pills text-sm text-pearl hover:text-chalk transition-colors"
              >
                {tab === "preview" ? <Code2 size={14} /> : <Eye size={14} />}
                {tab === "preview" ? "Code" : "Preview"}
              </button>
              {tab === "preview" && (
                <button
                  onClick={() => setReplayKey((k) => k + 1)}
                  className="p-2 rounded-pills text-pearl hover:text-chalk transition-colors"
                  aria-label="Replay"
                  title="Replay"
                >
                  <RotateCw size={14} />
                </button>
              )}
              <span className="w-px h-5 bg-border mx-0.5" />
              <ComponentActions entry={entry} snippet={snippet} />
            </div>
          </div>

          {tab === "preview" && (
            <div className="border border-border rounded-cards overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
                <h3 className="text-sm font-semibold text-chalk">Interactive Stage Preview</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetParams}
                    className="p-2 rounded-pills border border-border text-pearl hover:border-pearl/40 hover:text-chalk transition-colors"
                    aria-label="Reset"
                    title="Reset to defaults"
                  >
                    <RotateCw size={13} />
                  </button>
                  <div className="flex items-center gap-1 bg-card border border-border rounded-pills p-0.5">
                    {(["dark", "light"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`px-3 py-1 rounded-pills text-xs font-medium capitalize transition-colors ${
                          theme === t ? "bg-chalk text-void" : "text-muted hover:text-pearl"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="min-h-[420px] flex items-center justify-center p-6 sm:p-10 bg-void">
                {Comp && (
                  <div className="w-full max-w-xl">
                    <Suspense fallback={null}>
                      <Comp key={replayKey} theme={theme} {...params} />
                    </Suspense>
                  </div>
                )}
              </div>
              {schema.length > 0 && (
                <div className="border-t border-border-soft px-5 py-5">
                  <div className="flex items-center gap-2 mb-4">
                    <SlidersHorizontal size={13} className="text-accent" />
                    <h4 className="text-sm font-semibold text-chalk">Customize</h4>
                    <span className="text-xs text-muted">{schema.length} options</span>
                  </div>
                  <OriginalControlPanel schema={schema} values={params} onChange={updateParam} />
                </div>
              )}
            </div>
          )}

          {tab === "code" && (
            <pre className="border border-border rounded-cards p-5 text-xs leading-relaxed text-pearl font-mono whitespace-pre overflow-x-auto bg-panel">
              {snippet}
            </pre>
          )}

          {(
            <div className="mt-8 flex flex-col gap-6">
              <ComponentDelivery slug={entry.slug} />

          {(
            <div className="border border-border rounded-cards p-5">
              <div className="grid grid-cols-[110px_140px_80px_1fr] gap-3 pb-2 mb-1 border-b border-border-soft">
                <span className="text-xs text-muted font-medium">Property</span>
                <span className="text-xs text-muted font-medium">Type</span>
                <span className="text-xs text-muted font-medium">Default</span>
                <span className="text-xs text-muted font-medium">Description</span>
              </div>
              <div className="flex flex-col divide-y divide-border-soft">
                {[
                  ...BASE_CHART_PROPS,
                  ...schema.map((c) => ({
                    key: c.key,
                    type: c.type === "slider" ? "number" : c.type === "toggle" ? "boolean" : c.type === "color" ? "string (hex)" : "string",
                    default: typeof c.default === "string" ? `'${c.default}'` : String(c.default),
                    description: c.description ?? c.label,
                  })),
                ].map((p) => (
                  <div key={p.key} className="py-3 grid grid-cols-[110px_140px_80px_1fr] gap-3 items-start text-sm">
                    <code className="text-accent font-mono text-xs">{p.key}</code>
                    <span className="text-muted text-xs font-mono">{p.type}</span>
                    <span className="text-muted text-xs font-mono">{p.default}</span>
                    <span className="text-pearl text-xs">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
            </div>
          )}
        </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
