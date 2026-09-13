"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, Terminal, X } from "lucide-react";
import { generateComponent } from "@/lib/dna/codegen";
import type { DnaProject } from "@/lib/dna/types";

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
      className="flex items-center gap-1.5 text-xs border border-border rounded-pills px-2.5 py-1.5 text-pearl hover:border-pearl/40 hover:text-chalk shrink-0 transition-colors"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export default function DnaExportModal({
  project,
  onClose,
}: {
  project: DnaProject;
  onClose: () => void;
}) {
  const file = useMemo(() => generateComponent(project), [project]);
  const [tab, setTab] = useState<"code" | "json">("code");

  const json = useMemo(() => JSON.stringify(project, null, 2), [project]);
  const shown = tab === "code" ? file.code : json;

  function download() {
    const blob = new Blob([shown], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tab === "code" ? file.fileName : `${file.fileName.replace(/\.tsx$/, "")}.dna.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-void/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-full flex flex-col rounded-cards border border-border bg-panel shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-chalk">Export</h2>
          <span className="text-[11px] text-muted font-mono">{file.fileName}</span>
          <div className="ml-auto flex items-center gap-1 bg-card border border-border rounded-pills p-0.5">
            {(["code", "json"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2.5 py-1 rounded-pills text-[11px] transition-colors ${
                  tab === t ? "bg-slate text-chalk" : "text-muted hover:text-pearl"
                }`}
              >
                {t === "code" ? "Component" : "Project JSON"}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-medium text-muted hover:text-chalk transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {tab === "code" && (
          <div className="px-4 py-2.5 border-b border-border-soft flex items-center gap-2">
            <Terminal size={13} className="text-muted shrink-0" />
            <code className="flex-1 min-w-0 text-[11px] font-mono text-pearl truncate">
              {file.install}
            </code>
            <CopyButton text={file.install} label="Copy" />
          </div>
        )}

        <pre className="flex-1 min-h-0 overflow-auto p-4 text-[11px] leading-relaxed font-mono text-white/80 whitespace-pre bg-[#0a0a0b]">
          {shown}
        </pre>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          <p className="text-[10px] text-muted leading-snug flex-1 min-w-0">
            {tab === "code"
              ? "Drop this straight into your project — refs, ScrollTrigger and cleanup are already wired."
              : "Save this to version the composition, or to re-open it later."}
          </p>
          <button
            onClick={download}
            className="flex items-center gap-1.5 text-xs border border-border rounded-pills px-2.5 py-1.5 text-pearl hover:border-pearl/40 hover:text-chalk transition-colors"
          >
            <Download size={13} />
            Download
          </button>
          <CopyButton text={shown} label={tab === "code" ? "Copy component" : "Copy JSON"} />
        </div>
      </div>
    </div>
  );
}
