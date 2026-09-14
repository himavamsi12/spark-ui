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
import HeroGlowWaves from "./HeroGlowWaves";
import HeroPlayground from "./HeroPlayground";
import CustomiseDemo from "./CustomiseDemo";
import Footer from "@/components/layout/Footer";
import MediaPreview from "@/components/catalog/MediaPreview";
import type { ComponentEntry } from "@/lib/types";

/**
 * A bento tile: icon and title on one line, then whatever proves the point.
 * On hover a spotlight follows the pointer around the border.
 */
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
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={`group relative rounded-cards bg-border p-px ${className ?? ""}`}
    >
      {/* Border spotlight: sits in the 1px gap around the inner surface. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-cards opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(260px circle at var(--mx, 50%) var(--my, 0px), var(--accent), transparent 70%)" }}
      />
      <div className="relative h-full overflow-hidden rounded-[calc(var(--radius-cards)-1px)] bg-card p-5 flex flex-col shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
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
    </div>
  );
}

export default function Landing({
  featured,
  total,
  playground,
  componentCount,
  uiKitCount,
}: {
  featured: ComponentEntry[];
  total: number;
  playground: ComponentEntry[];
  componentCount: number;
  uiKitCount: number;
}) {
  return (
    <main className="absolute inset-0 overflow-y-auto no-scrollbar">
      {/* Hero ------------------------------------------------------------ */}
      <section className="relative mb-10 flex min-h-[90dvh] flex-col justify-start px-6 pt-40 pb-10 overflow-hidden lg:mb-12 lg:pt-44">
        {/* Soft glowing waves hang from the top, behind the header and the
            hero, and fade out below it. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] overflow-hidden">
          <HeroGlowWaves className="absolute inset-0" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_65%,var(--color-void)_100%)]" />
        </div>

        {/* Split hero: the pitch on the left, a live playground on the right. */}
        <div className="relative mx-auto grid max-w-[1680px] items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:px-10">
          <div className="text-center lg:text-left">
            {/* Same smoked-glass treatment as the overlay header, so the glow
                carries through the badge instead of stopping at it. */}
            <span className="inline-flex items-center gap-1.5 rounded-pills border border-border bg-void/65 backdrop-blur-md px-3 py-1 text-xs text-pearl mb-6">
              <Sparkles size={12} className="text-accent" />
              {componentCount} components and {uiKitCount} UI Kit pieces, free to use
            </span>

            {/* Exactly two lines from tablet up: each line is kept whole and the
                size scales with the column so the longer one still fits. */}
            <h1 className="font-display font-semibold tracking-tight text-chalk leading-[1.05]" style={{ fontSize: "clamp(2.4rem,4.3vw,4.9rem)", textShadow: "0 2px 28px rgba(0,0,0,0.45)" }}>
              <span className="sm:whitespace-nowrap">A library of animations,</span>
              <br className="hidden sm:block" />{" "}
              <span className="sm:whitespace-nowrap">open on every shelf</span>
            </h1>

            <p className="mt-6 text-lg text-pearl leading-relaxed max-w-2xl mx-auto lg:mx-0 text-balance" style={{ textShadow: "0 1px 12px rgba(0,0,0,0.6)" }}>
              Production-ready React and TypeScript animations. Tune each one in the browser,
              then copy it straight into your project.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/components"
                className="group flex items-center gap-2 bg-chalk text-void text-sm font-medium px-5 py-2.5 rounded-pills hover:bg-pearl transition-colors shadow-[0_-1px_0_0_var(--color-iron)]"
              >
                Browse components
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/charts"
                className="flex items-center gap-2 border border-border bg-void/40 text-pearl text-sm font-medium px-5 py-2.5 rounded-pills hover:border-pearl/40 hover:text-chalk transition-colors"
              >
                Explore UI Kit
              </Link>
            </div>

            <Link
              href="/mcp"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-pearl"
            >
              <Plug size={14} className="text-accent" />
              Or let your AI agent add them via MCP
              <ArrowRight size={13} />
            </Link>
          </div>

          <HeroPlayground items={playground} />
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
              // Stretched link, not a wrapping one: previews can contain links of their own.
              <div
                key={entry.slug}
                className="group relative block rounded-cards overflow-hidden border border-border hover:border-pearl/40 transition-colors bg-card"
              >
                <Link href={`/components/${entry.slug}`} aria-label={entry.name} className="absolute inset-0 z-10" />
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features -------------------------------------------------------- */}
      <section className="px-6 pt-12 pb-20 lg:pt-20">
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
                <code className="text-[11px] font-mono text-pearl truncate">AuroraLoginCard.tsx</code>
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
                  npx spark-ui-registry@latest add aurora-login-card
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
          {/* The hero's glowing waves, hanging from the card's top edge and
              fading out below the copy, so the page closes the way it opens. */}
          <div className="pointer-events-none absolute inset-0">
            <HeroGlowWaves className="absolute inset-0" reach={0.85} intensity={0.85} />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_45%,var(--color-card)_100%)]" />
          </div>
          <div className="relative">
            <h2
              className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-chalk text-balance"
              style={{ textShadow: "0 2px 28px rgba(0,0,0,0.45)" }}
            >
              Free to use, not free to make
            </h2>
            <p className="mt-2.5 text-sm text-pearl max-w-md mx-auto text-balance" style={{ textShadow: "0 1px 12px rgba(0,0,0,0.6)" }}>
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
