"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import Footer from "@/components/layout/Footer";

const SITE_URL = "https://spark-ui-cyan.vercel.app";

const TOOLS = [
  {
    name: "list_components",
    args: "category?",
    description: "Lists every component with its slug, category, and description. The place to start.",
  },
  {
    name: "search_components",
    args: "query",
    description: "Keyword search across names, categories, descriptions, and feature lists.",
  },
  {
    name: "get_component",
    args: "slug, props?",
    description:
      "Returns the full React + TypeScript source for one component, plus its props, npm dependencies, and the static assets it references.",
  },
];

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
    <div className="flex items-center gap-2 bg-panel border border-border-soft rounded-small px-3 py-2.5">
      <Terminal size={12} className="text-muted shrink-0" />
      <code className="flex-1 min-w-0 text-xs font-mono text-pearl overflow-x-auto whitespace-pre no-scrollbar">
        {command}
      </code>
      <CopyButton text={command} />
    </div>
  );
}

export default function McpSetup({ componentCount }: { componentCount: number }) {
  // The public site, not window.location.origin: these snippets are meant to be
  // copied into a client's config, where a localhost dev URL would be useless.
  const origin = SITE_URL;
  const url = `${origin}/api/mcp`;
  const config = `{
  "mcpServers": {
    "spark-ui": {
      "type": "http",
      "url": "${url}"
    }
  }
}`;

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-10">
      <h1 className="text-3xl font-display font-medium tracking-tight text-chalk mb-2">
        Spark UI MCP Server
      </h1>
      <p className="text-sm text-pearl leading-relaxed mb-8 max-w-2xl">
        Connect Spark UI to Claude, Cursor, or any MCP-compatible client. Your agent can then search
        all {componentCount} animated components and pull their full React + TypeScript source
        directly into your project, with no copy-pasting from the browser.
      </p>

      <section className="border border-border rounded-cards p-5 mb-5">
        <h2 className="text-sm font-semibold text-chalk mb-1">Claude Code</h2>
        <p className="text-xs text-muted mb-3">Add the server with a single command.</p>
        <CommandRow command={`claude mcp add --transport http spark-ui ${url}`} />
      </section>

      <section className="border border-border rounded-cards p-5 mb-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-chalk">Cursor, Claude Desktop & others</h2>
          <CopyButton text={config} label="Copy config" />
        </div>
        <p className="text-xs text-muted mb-3">
          Add this to your client&apos;s MCP configuration file.
        </p>
        <pre className="bg-panel border border-border-soft rounded-small p-3.5 text-[11px] font-mono text-pearl overflow-x-auto no-scrollbar">
          {config}
        </pre>
      </section>

      <section className="border border-border rounded-cards p-5 mb-5">
        <h2 className="text-sm font-semibold text-chalk mb-1">Endpoint</h2>
        <p className="text-xs text-muted mb-3">
          Streamable HTTP transport. A GET returns a small status payload you can check in a browser.
        </p>
        <div className="flex items-center gap-2 bg-panel border border-border-soft rounded-small px-3 py-2.5">
          <code className="flex-1 min-w-0 text-xs font-mono text-accent overflow-x-auto whitespace-pre no-scrollbar">
            {url}
          </code>
          <CopyButton text={url} />
        </div>
      </section>

      <section className="border border-border rounded-cards p-5 mb-5">
        <h2 className="text-sm font-semibold text-chalk mb-4">Available tools</h2>
        <div className="flex flex-col divide-y divide-border-soft">
          {TOOLS.map((t) => (
            <div key={t.name} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline gap-2 mb-1">
                <code className="text-accent font-mono text-xs">{t.name}</code>
                <code className="text-muted font-mono text-[11px]">({t.args})</code>
              </div>
              <p className="text-xs text-pearl leading-relaxed">{t.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-border rounded-cards p-5 mb-5">
        <h2 className="text-sm font-semibold text-chalk mb-3">Try it</h2>
        <p className="text-xs text-muted mb-2">Once connected, ask your agent things like:</p>
        <ul className="space-y-2">
          {[
            "What animated components are available in Spark UI?",
            "Find me a scroll-driven text reveal and add it to my landing page.",
            "Pull in the aurora login card component and wire it up with my own images.",
          ].map((q) => (
            <li key={q} className="text-sm text-pearl flex gap-2">
              <span className="text-muted shrink-0">·</span>
              <span className="italic">&ldquo;{q}&rdquo;</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-border rounded-cards p-5 mb-5">
        <h2 className="text-sm font-semibold text-chalk mb-1">Prefer a CLI?</h2>
        <p className="text-xs text-muted mb-3">
          The same registry backs the command line, if you would rather add components yourself.
        </p>
        <div className="space-y-2">
          <CommandRow command="npx spark-ui-registry@latest list" />
          <CommandRow command="npx spark-ui-registry@latest add aurora-login-card" />
        </div>
      </section>

      <section className="border border-border rounded-cards p-5 mb-10">
        <h2 className="text-sm font-semibold text-chalk mb-1">REST alternative</h2>
        <p className="text-xs text-muted mb-3">
          The same catalogue is available over plain HTTP if you would rather not use MCP.
        </p>
        <div className="space-y-2">
          <CommandRow command={`curl ${origin}/api/components`} />
          <CommandRow command={`curl ${origin}/api/components/aurora-login-card`} />
        </div>
      </section>

      <div className="-mx-6">
        <Footer />
      </div>
    </div>
  );
}
