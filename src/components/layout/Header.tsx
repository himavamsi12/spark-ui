"use client";

import { LayoutGrid, Heart, Menu, Plug, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";

function GithubMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.96.1-.75.4-1.25.73-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.77.12 3.06.74.8 1.18 1.83 1.18 3.09 0 4.43-2.69 5.4-5.26 5.69.42.36.78 1.07.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

const NAV = [
  { label: "Components", href: "/components" },
  { label: "Docs", href: "/docs" },
];

const MOBILE_NAV = [
  { label: "Components", href: "/components" },
  { label: "Docs", href: "/docs" },
  { label: "UI Kit", href: "/charts" },
  { label: "MCP", href: "/mcp" },
  { label: "3D Tool", href: "/3d-tool" },
];

export default function Header({
  overlay = false,
  section,
}: {
  overlay?: boolean;
  // Overrides the pathname-based highlight, e.g. chart detail pages live
  // under /components/[slug] but belong to UI Kit.
  section?: "charts";
}) {
  const pathname = usePathname();
  const isComponents = !section && pathname.startsWith("/components");
  const isDocs = pathname.startsWith("/docs");
  const isCharts = section === "charts" || pathname.startsWith("/charts");
  const isMcp = pathname === "/mcp";
  const is3dTool = pathname === "/3d-tool";

  // Bumped on hover of the whole wordmark (icon + text), so the strike
  // replays every time. See Logo.tsx for how strikeId drives the remount.
  const [strikeId, setStrikeId] = useState(0);

  // The full nav (Components/Docs/MCP/3D Tool) collapses into this dropdown
  // below `md`, since that's the only way to reach MCP or 3D Tool on mobile.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header
      className={`h-20 shrink-0 flex items-center justify-between px-6 z-20 ${
        overlay
          ? // Sits over the hero glow: no rule of its own, just a light frost so
            // the links keep their contrast against the brightest part of it.
            "absolute top-0 inset-x-0 bg-void/65 backdrop-blur-md"
          : "relative border-b border-border bg-bg"
      }`}
    >
      <Link
        href="/"
        className="flex items-center gap-2"
        onMouseEnter={() => setStrikeId((k) => k + 1)}
      >
        <Logo size={30} strikeId={strikeId} />
        <span className="font-display font-medium text-[19px] tracking-tight text-chalk">Spark UI</span>
      </Link>

      <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 px-1 py-1">
        {NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`px-3.5 py-1.5 rounded-pills text-sm font-medium transition-colors ${
              (item.label === "Components" && isComponents) || (item.label === "Docs" && isDocs)
                ? "bg-slate text-chalk"
                : "text-chalk hover:text-pearl"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <span className="w-1 h-1 rounded-full bg-pearl/50 mx-1" />
        <Link
          href="/charts"
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-pills text-sm font-medium transition-colors ${
            isCharts ? "bg-slate text-chalk" : "text-chalk hover:text-pearl"
          }`}
        >
          <LayoutGrid size={13} />
          UI Kit
        </Link>
        <span className="w-1 h-1 rounded-full bg-pearl/50 mx-1" />
        <Link
          href="/mcp"
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-pills text-sm font-medium transition-colors ${
            isMcp ? "bg-slate text-chalk" : "text-chalk hover:text-pearl"
          }`}
        >
          <Plug size={13} />
          MCP
        </Link>
        <span className="w-1 h-1 rounded-full bg-pearl/50 mx-1" />
        <Link
          href="/3d-tool"
          className={`px-3.5 py-1.5 rounded-pills text-sm font-medium transition-colors ${
            is3dTool ? "bg-slate text-chalk" : "text-chalk hover:text-pearl"
          }`}
        >
          3D Tool
        </Link>
      </nav>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
          className="flex items-center justify-center p-2 rounded-pills border border-border text-pearl hover:border-pearl/40 hover:text-chalk transition-colors md:hidden"
        >
          {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
        <a
          href="https://github.com/himavamsi12/Spark-UI"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 border border-border text-pearl text-sm font-medium px-3.5 py-2 rounded-pills hover:border-pearl/40 hover:text-chalk transition-colors"
        >
          <GithubMark size={15} />
          <span className="hidden sm:inline">Star on GitHub</span>
        </a>
        <a
          href="https://buymeachai.in/himavamsi.kummari"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-1.5 bg-accent text-void text-sm font-medium px-3.5 py-2 rounded-pills hover:brightness-110 transition-[filter] shadow-[0_0_20px_-4px_var(--accent)]"
        >
          <Heart size={15} className="fill-void group-hover:[animation:sponsorHeartbeat_1.1s_ease-in-out_infinite]" />
          <span className="hidden md:inline">Sponsor</span>
        </a>
      </div>

      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 top-20 z-20 bg-void/70 md:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <nav className="absolute left-0 right-0 top-full z-30 border-b border-border bg-charcoal px-4 py-3 flex flex-col gap-1 md:hidden">
            {MOBILE_NAV.map((item) => {
              const active =
                (item.label === "Components" && isComponents) ||
                (item.label === "Docs" && isDocs) ||
                (item.label === "UI Kit" && isCharts) ||
                (item.label === "MCP" && isMcp) ||
                (item.label === "3D Tool" && is3dTool);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2.5 rounded-pills text-sm font-medium transition-colors ${
                    active ? "bg-slate text-chalk" : "text-pearl hover:bg-panel"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <span className="my-1 h-px bg-border" />
            <a
              href="https://github.com/himavamsi12/Spark-UI"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-pills text-sm font-medium text-pearl hover:bg-panel transition-colors"
            >
              <GithubMark size={15} />
              Star on GitHub
            </a>
          </nav>
        </>
      )}
    </header>
  );
}
