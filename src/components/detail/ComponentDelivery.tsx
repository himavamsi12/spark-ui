"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, Plug, Terminal } from "lucide-react";

type Meta = {
  fileName: string;
  code: string;
  dependencies: string[];
  assets: string[];
};

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="flex items-center gap-1.5 text-xs border border-border rounded-pills px-2.5 py-1.5 text-pearl hover:border-pearl/40 shrink-0 transition-colors"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}

function CommandRow({ command }: { command: string }) {
  return (
    <div className="flex items-center gap-2 bg-panel border border-border-soft rounded-small px-3 py-2">
      <Terminal size={12} className="text-muted shrink-0" />
      <code className="flex-1 min-w-0 text-xs font-mono text-pearl overflow-x-auto whitespace-pre no-scrollbar">
        {command}
      </code>
      <CopyButton text={command} />
    </div>
  );
}

export default function ComponentDelivery({ slug }: { slug: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [tab, setTab] = useState<"cli" | "manual">("cli");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/components/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setMeta(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const deps = meta?.dependencies ?? [];

  return (
    <div className="border border-border rounded-cards p-5 mb-10">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-chalk">Get this component</h3>
        <div className="flex items-center gap-1 bg-panel border border-border rounded-pills p-0.5">
          {(["cli", "manual"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2.5 py-1 rounded-pills text-xs font-medium transition-colors ${
                tab === t ? "bg-slate text-chalk" : "text-muted hover:text-pearl"
              }`}
            >
              {t === "cli" ? "CLI" : "Manual"}
            </button>
          ))}
        </div>
      </div>

      {tab === "cli" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted mb-3">
            Copies the component into your project, installs what it needs, and pulls down its
            images. Nothing to download by hand.
          </p>
          <CommandRow command={`npx spark-ui-registry@latest add ${slug}`} />
          <p className="text-[11px] text-muted pt-0.5">
            Writes to <code className="font-mono text-pearl">components/spark-ui/</code> by default;
            override with <code className="font-mono text-pearl">--dir</code>. The file is yours to
            edit; there is no package to keep in sync.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs text-muted flex-1">
              Take the file directly
              {meta ? `: ${meta.fileName}` : ""}. It is one self-contained React + TypeScript file.
            </p>
            {meta && <CopyButton text={meta.code} label="Copy source" />}
            <a
              href={`/api/components/${slug}?format=file`}
              download
              className="flex items-center gap-1.5 text-xs bg-chalk text-void rounded-pills px-2.5 py-1.5 font-medium hover:bg-pearl transition-colors shrink-0"
            >
              <Download size={13} />
              Download
            </a>
          </div>

          {deps.length > 0 && (
            <>
              <div className="text-xs text-muted">
                Then install the packages it imports
                <span className="text-muted/70"> (peer dependencies, not Spark UI itself)</span>
              </div>
              <CommandRow command={`npm install ${deps.join(" ")}`} />
            </>
          )}
          {meta && deps.length === 0 && (
            <div className="text-xs text-muted">No external packages required.</div>
          )}

          {meta && meta.assets.length > 0 && (
            <div className="pt-1">
              <div className="text-xs text-muted mb-1.5">
                Static assets to copy into <code className="font-mono text-pearl">public/</code>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {meta.assets.map((a) => (
                  <code
                    key={a}
                    className="text-[11px] font-mono text-pearl bg-panel border border-border-soft rounded-small px-1.5 py-0.5"
                  >
                    {a}
                  </code>
                ))}
              </div>
              <p className="text-[11px] text-muted mt-1.5">
                Swap these for your own via the image controls above, then update the paths in the file.
              </p>
            </div>
          )}
        </div>
      )}

      <Link
        href="/mcp"
        className="mt-4 pt-3.5 border-t border-border-soft flex items-center gap-1.5 text-xs text-muted hover:text-pearl transition-colors"
      >
        <Plug size={12} className="text-accent" />
        Or let an AI agent pull it in for you. Set up the MCP server
      </Link>
    </div>
  );
}
