"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  FileCode2,
  FileText,
  Share2,
  Sparkles,
  Terminal,
} from "lucide-react";
import { getOriginal } from "@/lib/originalControls";
import type { ComponentEntry } from "@/lib/types";

/** Chat targets that accept a prefilled prompt in the query string. */
const OPEN_IN = [
  { label: "Open in ChatGPT", url: (q: string) => `https://chatgpt.com/?q=${q}` },
  { label: "Open in Claude", url: (q: string) => `https://claude.ai/new?q=${q}` },
  { label: "Open in v0", url: (q: string) => `https://v0.dev/chat?q=${q}` },
];

export default function ComponentActions({
  entry,
  snippet,
  compact = false,
}: {
  entry: ComponentEntry;
  /** The usage snippet with the panel's current settings already applied. */
  snippet: string;
  /** Icon-only buttons on small screens. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const installCommand = `npx spark-ui-registry@latest add ${entry.slug}`;
  const blurb = getOriginal(entry.slug)?.blurb ?? "";

  function buildPrompt() {
    return [
      `Add the "${entry.name}" component from Spark UI to my project.`,
      "",
      "Install it (this copies the source into the project and installs its dependencies):",
      installCommand,
      "",
      "Then render it with these settings:",
      snippet,
      "",
      `It is a single self-contained React + TypeScript file. ${blurb}`.trim(),
    ].join("\n");
  }

  async function flash(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setDone(label);
      setTimeout(() => setDone(null), 1600);
    } catch {
      setDone("Copy failed");
      setTimeout(() => setDone(null), 1600);
    }
    setOpen(false);
  }

  async function copySource() {
    setDone("Fetching…");
    try {
      const res = await fetch(`/api/components/${entry.slug}`);
      if (!res.ok) throw new Error(String(res.status));
      const meta = await res.json();
      await flash("Source copied", meta.code);
    } catch {
      setDone("Copy failed");
      setTimeout(() => setDone(null), 1600);
      setOpen(false);
    }
  }

  async function share() {
    const url = window.location.href;
    // The share sheet is the better experience where it exists; everywhere
    // else, putting the link on the clipboard is the useful fallback.
    if (navigator.share) {
      try {
        await navigator.share({ title: `${entry.name} | Spark UI`, url });
        return;
      } catch {
        return; // dismissed
      }
    }
    await flash("Link copied", url);
  }

  const ITEMS = [
    { label: "Copy prompt", icon: Sparkles, run: () => flash("Prompt copied", buildPrompt()) },
    { label: "Copy configured code", icon: FileText, run: () => flash("Code copied", snippet) },
    { label: "Copy component source", icon: FileCode2, run: copySource },
    { label: "Copy install command", icon: Terminal, run: () => flash("Command copied", installCommand) },
  ];

  return (
    <div className={`relative flex items-center ${compact ? "gap-1 sm:gap-2" : "gap-2"}`}>
      {done && (
        <span className={`text-xs text-accent mr-1 tabular-nums ${compact ? "max-sm:absolute max-sm:right-0 max-sm:top-full max-sm:mt-2 max-sm:whitespace-nowrap max-sm:rounded-pills max-sm:bg-panel max-sm:px-2 max-sm:py-1" : ""}`}>{done}</span>
      )}

      <button
        onClick={share}
        title="Share this component"
        aria-label="Share this component"
        className={`p-2 rounded-pills border border-border text-pearl hover:text-chalk hover:border-pearl/40 transition-colors ${compact ? "max-sm:border-transparent" : ""}`}
      >
        <Share2 size={15} />
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Copy for AI"
          className={`flex items-center gap-1.5 text-sm border border-border rounded-pills px-3 py-2 text-pearl hover:border-pearl/40 transition-colors ${compact ? "max-sm:px-2" : ""}`}
        >
          {compact && <Sparkles size={15} className="sm:hidden" />}
          <span className={compact ? "hidden sm:inline" : undefined}>Copy for AI</span>
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""} ${compact ? "hidden sm:block" : ""}`} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-64 z-50 rounded-cards border border-border bg-panel shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {ITEMS.map(({ label, icon: Icon, run }) => (
              <button
                key={label}
                role="menuitem"
                onClick={run}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-pearl hover:bg-card hover:text-chalk transition-colors text-left"
              >
                <Icon size={15} className="text-muted shrink-0" />
                {label}
              </button>
            ))}

            <div className="border-t border-border-soft" />

            {OPEN_IN.map(({ label, url }) => (
              <button
                key={label}
                role="menuitem"
                onClick={() => {
                  window.open(url(encodeURIComponent(buildPrompt())), "_blank", "noopener,noreferrer");
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-pearl hover:bg-card hover:text-chalk transition-colors text-left"
              >
                <ExternalLink size={15} className="text-muted shrink-0" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
