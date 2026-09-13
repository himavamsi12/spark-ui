"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, SlidersHorizontal, Terminal } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import type { ComponentEntry, SortKey } from "@/lib/types";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-panel border border-border-soft rounded-medium p-4 text-[13px] font-mono text-pearl overflow-x-auto no-scrollbar leading-relaxed">
      {children}
    </pre>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-14">
      <h2 className="font-display text-xl font-semibold tracking-tight text-chalk mb-3">{title}</h2>
      <div className="space-y-4 text-[15px] text-pearl leading-relaxed">{children}</div>
    </section>
  );
}

const TOC = [
  { id: "what-is-spark-ui", label: "What is Spark UI" },
  { id: "why", label: "Why Spark UI" },
  { id: "prerequisites", label: "Prerequisites" },
  { id: "quick-start", label: "Quick start" },
  { id: "next-steps", label: "Next steps" },
];

export default function DocsIntro({ allComponents }: { allComponents: ComponentEntry[] }) {
  // Same full site-index nav used on the component detail pages, where search,
  // sort, and category here are cosmetic (there's no grid on this page to
  // apply them to), they just drive which entries the sidebar highlights.
  const [navSearch, setNavSearch] = useState("");
  const [navSort, setNavSort] = useState<SortKey>("trending");
  const [navCategory, setNavCategory] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const navCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of allComponents) c[d.category] = (c[d.category] || 0) + 1;
    return c;
  }, [allComponents]);

  return (
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
        <div className="flex gap-16 px-10 md:px-16 py-12 max-w-6xl">
          <div className="flex-1 min-w-0 max-w-3xl">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-1.5 mb-4 border border-border text-pearl text-xs font-medium px-2.5 py-1.5 rounded-pills hover:border-pearl/40 hover:text-chalk transition-colors lg:hidden"
            >
              <SlidersHorizontal size={13} />
              Browse components
            </button>
            <span className="text-xs font-medium text-accent uppercase tracking-wide">Getting started</span>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-chalk mt-2 mb-4">
              Introduction
            </h1>
            <p className="text-base text-pearl leading-relaxed mb-12 max-w-xl">
              Spark UI is a library of animated React and TypeScript components: the kind of motion you’d
              normally pay an agency to build, delivered as source you own outright.
            </p>

            <Section id="what-is-spark-ui" title="What is Spark UI">
              <p>
                Every component in the library is a single, self-contained <code className="text-accent font-mono text-sm">.tsx</code> file
                built with GSAP-driven animation and Tailwind. There’s no wrapper package to install and no
                runtime dependency on Spark UI itself. When you add a component, that file becomes part of
                your codebase, the same way it would if you’d written it yourself.
              </p>
              <p>
                Each component ships with a full set of props for customization (colors, fonts, text,
                images, and animation speed), so what you get out of the box is rarely what you ship. You’re
                expected to make it yours.
              </p>
            </Section>

            <Section id="why" title="Why Spark UI">
              <ul className="space-y-2.5">
                {[
                  "Full customization on every component: color, font family, text scale, images, and copy, not just a color prop.",
                  "One file per component. No dependency to upgrade, no breaking change to track. The code is yours the moment you add it.",
                  "A CLI that installs the real source, plus its peer dependencies and static assets, with one command.",
                  "An MCP server, so agents like Claude can search the library and pull a component, customized to spec, straight into your project.",
                  "Motion tuned to match its real-world reference, not an approximation. Timings, easing, and sequencing built to hold up under scrutiny.",
                ].map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <Check size={16} className="text-accent shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="prerequisites" title="Prerequisites">
              <p>Components are plain React, so they’ll run anywhere React does. A couple of things to have in place:</p>
              <ul className="space-y-2 list-disc list-inside marker:text-muted">
                <li>React 18 or newer.</li>
                <li>Tailwind CSS configured in your project, since components are styled with Tailwind utility classes.</li>
                <li>
                  <code className="text-accent font-mono text-sm">gsap</code> installed, as nearly every component
                  animates with it. A handful of components have their own additional dependency (e.g.{" "}
                  <code className="text-accent font-mono text-sm">three</code> for the WebGL video effect); the CLI
                  installs whatever a given component actually needs, nothing more.
                </li>
              </ul>
            </Section>

            <Section id="quick-start" title="Quick start">
              <p>Three ways in, depending on how hands-on you want to be.</p>

              <p className="text-sm font-semibold text-chalk mt-6 mb-2">1. CLI</p>
              <p>
                Writes the component into your project, downloads the images it references, and
                installs the packages it imports.
              </p>
              <CodeBlock>{`npx spark-ui-registry@latest add cassette-menu`}</CodeBlock>
              <p className="mt-4">See everything available:</p>
              <CodeBlock>{`npx spark-ui-registry@latest list`}</CodeBlock>

              <p className="text-sm font-semibold text-chalk mt-6 mb-2">2. Browse and copy</p>
              <p>
                Open any component’s page, tune it in the live customizer, then copy the source or download
                the file directly.
              </p>

              <p className="text-sm font-semibold text-chalk mt-6 mb-2">3. MCP</p>
              <p>Connect the registry to Claude Code or another MCP client and ask for what you need.</p>
              <CodeBlock>{`claude mcp add --transport http spark-ui https://sparkui-chi.vercel.app/api/mcp`}</CodeBlock>
            </Section>

            <Section id="next-steps" title="Next steps">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 not-prose">
                <Link
                  href="/components"
                  className="group flex items-center justify-between gap-3 border border-border rounded-cards px-4 py-3.5 hover:border-pearl/40 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-chalk">Browse components</div>
                    <div className="text-xs text-muted mt-0.5">See everything available, live.</div>
                  </div>
                  <ArrowRight size={16} className="text-muted shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/mcp"
                  className="group flex items-center justify-between gap-3 border border-border rounded-cards px-4 py-3.5 hover:border-pearl/40 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-chalk">Set up MCP</div>
                    <div className="text-xs text-muted mt-0.5">Connect an AI agent to the registry.</div>
                  </div>
                  <Terminal size={16} className="text-muted shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </Section>
          </div>

          {/* On-this-page: mirrors the left nav pattern, common to most docs sites. */}
          <nav className="hidden lg:block w-[180px] shrink-0 sticky top-12 self-start">
            <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">On this page</h3>
            <div className="flex flex-col gap-2 border-l border-border-soft">
              {TOC.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="text-sm text-muted hover:text-pearl transition-colors pl-3 -ml-px border-l border-transparent hover:border-pearl/40"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </main>
    </div>
  );
}
