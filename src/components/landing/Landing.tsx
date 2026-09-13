"use client";

import Link from "next/link";
import {
  ArrowRight,
  Heart,
  Plug,
  Sparkles,
  SlidersHorizontal,
  Package,
  Terminal,
  FileCode2,
  type LucideIcon,
} from "lucide-react";
import Aurora from "./Aurora";
import ComponentFlowHero from "./ComponentFlowHero";
import CustomiseDemo from "./CustomiseDemo";
import Footer from "@/components/layout/Footer";
import MediaPreview from "@/components/catalog/MediaPreview";
import type { ComponentEntry } from "@/lib/types";

/** A bento tile: icon and title on one line, then whatever proves the point. */
function Tile({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-cards border border-border bg-card p-5 flex flex-col transition-colors hover:border-pearl/25 ${className ?? ""}`}
    >
      {/* Accent bloom that warms up on hover. */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[var(--accent)] opacity-[0.06] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.14]" />
      <div className="relative flex items-center gap-2.5 mb-2.5">
        <span className="w-7 h-7 rounded-medium bg-panel border border-border-soft flex items-center justify-center shrink-0">
          <Icon size={14} className="text-accent" />
        </span>
        <h3 className="text-sm font-semibold text-chalk">{title}</h3>
      </div>
      <div className="relative mt-auto">{children}</div>
    </div>
  );
}

export default function Landing({
  featured,
  total,
}: {
  featured: ComponentEntry[];
  total: number;
}) {
  return (
    <main className="absolute inset-0 overflow-y-auto no-scrollbar">
      {/* Hero ------------------------------------------------------------ */}
      <section className="relative px-6 pt-28 pb-32 text-center overflow-hidden">
        {/* The aurora bleeds up behind the transparent, blurred header
            instead of stopping at the hero's own top edge. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden opacity-40">
          <Aurora colorStops={["#e8730a", "#ff8a3d", "#7c2d12"]} blend={0.55} amplitude={2.4} speed={0.9} />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,var(--color-void)_92%)]" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-pills border border-border bg-panel px-3 py-1 text-xs text-pearl mb-6">
            <Sparkles size={12} className="text-accent" />
            {total} animated components, free to use
          </span>

          <h1 className="font-display font-semibold tracking-tight text-chalk leading-[1.05] text-balance" style={{ fontSize: "clamp(2.5rem,6.5vw,4.5rem)" }}>
            A library of <span className="text-accent">animations</span>,
            <br />
            open on every shelf
          </h1>

          <p className="mt-5 text-base text-pearl leading-relaxed max-w-xl mx-auto text-balance">
            Every component here is a book you can pull down, flip through, and take with you.
            Production-ready React and TypeScript, tuned in the browser before you copy a line.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/components"
              className="group flex items-center gap-2 bg-chalk text-void text-sm font-medium px-5 py-2.5 rounded-pills hover:bg-pearl transition-colors shadow-[0_-1px_0_0_var(--color-iron)]"
            >
              Browse components
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/mcp"
              className="flex items-center gap-2 border border-border text-pearl text-sm font-medium px-5 py-2.5 rounded-pills hover:border-pearl/40 hover:text-chalk transition-colors"
            >
              <Plug size={14} className="text-accent" />
              Connect via MCP
            </Link>
          </div>
        </div>

        {/* pointer-events-none because the hero's negative top margin collapses
            into this wrapper, dragging it up over the CTAs above. The cards
            inside re-enable pointer events for themselves. */}
        <div className="relative mt-14 -mx-6 pointer-events-none">
          <ComponentFlowHero className="w-full" />
        </div>
      </section>

      {/* Featured -------------------------------------------------------- */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-chalk">
                Off the shelf
              </h2>
              <p className="text-sm text-muted mt-1">A few of the newest arrivals.</p>
            </div>
            <Link
              href="/components"
              className="hidden sm:flex items-center gap-1.5 text-sm text-pearl hover:text-chalk transition-colors shrink-0"
            >
              See all {total}
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((entry) => (
              <Link
                key={entry.slug}
                href={`/components/${entry.slug}`}
                className="group block rounded-cards overflow-hidden border border-border hover:border-pearl/40 transition-colors bg-card"
              >
                <div className="aspect-video bg-void overflow-hidden">
                  <MediaPreview entry={entry} className="w-full h-full" />
                </div>
                <div className="px-3.5 py-3 flex items-center justify-between gap-2">
                  <span className="text-sm text-pearl truncate group-hover:text-chalk transition-colors">
                    {entry.name}
                  </span>
                  <span className="text-[11px] text-muted border border-border-soft rounded-pills px-1.5 py-0.5 shrink-0">
                    {entry.category}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features -------------------------------------------------------- */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between gap-6 mb-6">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-chalk">
                Borrow it however you like
              </h2>
              <p className="text-sm text-muted mt-1">
                Four ways in, all of them ending with the code in your project.
              </p>
            </div>
          </div>

          {/* Asymmetric bento: each tile shows the thing it describes. */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Tile className="lg:col-span-2" icon={SlidersHorizontal} title="Customise before you take it">
              <CustomiseDemo />
            </Tile>

            <Tile icon={Package} title="You own the file">
              <p className="text-sm text-muted leading-relaxed mb-4">
                One self-contained React file. No wrapper package, no version to keep in step with.
              </p>
              <div className="flex items-center gap-2 bg-panel border border-border-soft rounded-medium px-2.5 py-2">
                <FileCode2 size={13} className="text-accent shrink-0" />
                <code className="text-[11px] font-mono text-pearl truncate">CassetteMenu.tsx</code>
              </div>
            </Tile>

            <Tile icon={Plug} title="Built for agents">
              <p className="text-sm text-muted leading-relaxed mb-4">
                Point Claude or Cursor at the MCP server and let it pull components in for you.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["list_components", "search_components", "get_component"].map((t) => (
                  <code
                    key={t}
                    className="text-[10px] font-mono text-accent bg-panel border border-border-soft rounded-small px-1.5 py-1"
                  >
                    {t}
                  </code>
                ))}
              </div>
            </Tile>

            <Tile className="lg:col-span-2" icon={Terminal} title="One command to install">
              <p className="text-sm text-muted leading-relaxed mb-4">
                The CLI writes the component into your project, installs what it imports, and pulls
                down its images.
              </p>
              <div className="flex items-center gap-2 bg-panel border border-border-soft rounded-medium px-3 py-2.5">
                <span className="text-muted font-mono text-xs shrink-0">$</span>
                <code className="text-xs font-mono text-pearl truncate">
                  npx spark-ui-registry@latest add cassette-menu
                </code>
                <span className="ml-auto w-[7px] h-3.5 bg-accent/70 rounded-[1px] shrink-0" />
              </div>
            </Tile>
          </div>
        </div>
      </section>

      {/* CTA ------------------------------------------------------------- */}
      <section className="px-6 pt-10 pb-20">
        <div
          className="max-w-5xl mx-auto relative overflow-hidden rounded-cards border border-border bg-card px-6 py-12 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]"
        >
          <div className="absolute inset-0 opacity-40">
            <Aurora colorStops={["#e8730a", "#ff8a3d", "#7c2d12"]} blend={0.4} amplitude={0.8} speed={1.8} />
          </div>
          {/* Vignette so the rays read as a light source falling across the
              card rather than an isolated streak in one corner. */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,var(--color-void)_90%)] opacity-80" />
          <div className="relative">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-chalk text-balance">
              Free to use, not free to make
            </h2>
            <p className="mt-2.5 text-sm text-pearl max-w-md mx-auto text-balance">
              No ads, no premium tier, no paywall coming later. If this saved you time, a chai keeps it going.
            </p>
            <div className="mt-6 flex items-center justify-center">
              <a
                href="https://buymeachai.in/himavamsi.kummari"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 bg-accent text-void text-sm font-medium px-5 py-2.5 rounded-pills hover:brightness-110 transition-[filter]"
              >
                <Heart size={15} className="fill-void group-hover:[animation:sponsorHeartbeat_1.1s_ease-in-out_infinite]" />
                Sponsor
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
