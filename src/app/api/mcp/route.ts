import { NextResponse } from "next/server";
import { ORIGINALS, getOriginal } from "@/lib/originalControls";
import { ORIGINAL_SOURCE_FILES } from "@/lib/originalSources";
import { getComponentSource, mergeCustomProps, buildAssetLinks } from "@/lib/componentSource";
import { generateUsageSnippet } from "@/lib/usageSnippet";

export const dynamic = "force-dynamic";

const SERVER_INFO = { name: "spark-ui", version: "1.0.0" };
const PROTOCOL_VERSION = "2025-06-18";

// The catalogue is public and read-only, so any origin may call it. Without
// these, browser-based MCP clients (the web Inspector, for one) fail preflight.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, accept, authorization, mcp-protocol-version, mcp-session-id, last-event-id",
  "Access-Control-Expose-Headers": "mcp-session-id",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status?: number) {
  return NextResponse.json(body, { status, headers: CORS });
}

function empty(status: number) {
  return new NextResponse(null, { status, headers: CORS });
}

const TOOLS = [
  {
    name: "list_components",
    description:
      "List every Spark UI animated component, with its slug, category, and a short description. Call this first to discover what is available.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Optional category filter, e.g. Navigation, Gallery, Animations, Text, Background.",
        },
      },
    },
  },
  {
    name: "get_component",
    description:
      "Get the full React/TypeScript source for one Spark UI component, along with its props, npm dependencies, and fetchable URLs for the static assets it references. Optionally pass `props` to get back a ready-to-paste usage snippet with those values already applied, e.g. { accentColor: \"#2563eb\", title: \"Launch week\" }, instead of the generic defaults. Use the slug from list_components.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Component slug, e.g. \"cassette-menu\"." },
        props: {
          type: "object",
          description:
            "Optional prop overrides matching this component's own schema (see the Props list in the response). Unknown keys are ignored; numeric sliders are clamped to their valid range.",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "search_components",
    description:
      "Search Spark UI components by keyword across their name, category, description, and feature list.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search terms, e.g. \"scroll reveal\" or \"marquee\"." },
      },
      required: ["query"],
    },
  },
];

function available() {
  return ORIGINALS.filter((o) => o.key in ORIGINAL_SOURCE_FILES);
}

function textResult(text: string) {
  return { content: [{ type: "text", text }] };
}

async function callTool(name: string, args: Record<string, unknown>, origin: string) {
  if (name === "list_components") {
    const category = typeof args.category === "string" ? args.category.toLowerCase() : null;
    const rows = available()
      .filter((o) => !category || o.category.toLowerCase() === category)
      .map((o) => `${o.key}  [${o.category}]  ${o.name}: ${o.blurb}`);
    return textResult(
      rows.length ? `${rows.length} components:\n\n${rows.join("\n")}` : "No components matched that category.",
    );
  }

  if (name === "search_components") {
    const q = String(args.query ?? "").toLowerCase().trim();
    if (!q) return textResult("Provide a non-empty query.");
    const terms = q.split(/\s+/);
    const rows = available()
      .filter((o) => {
        const hay = `${o.key} ${o.name} ${o.category} ${o.blurb} ${o.features.join(" ")}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
      .map((o) => `${o.key}  [${o.category}]  ${o.name}: ${o.blurb}`);
    return textResult(rows.length ? `${rows.length} match(es):\n\n${rows.join("\n")}` : `No components matched "${q}".`);
  }

  if (name === "get_component") {
    const slug = String(args.slug ?? "");
    const source = await getComponentSource(slug);
    if (!source) {
      const slugs = available().map((o) => o.key).join(", ");
      return { ...textResult(`Unknown component "${slug}". Available slugs: ${slugs}`), isError: true };
    }

    const propsList = source.props
      .map((p) => `  ${p.key}: ${p.type} = ${JSON.stringify(p.default)} · ${p.description}`)
      .join("\n");
    const deps = source.dependencies.length ? source.dependencies.join(", ") : "none beyond react";

    const { files, patterns } = buildAssetLinks(source, origin);
    const assetLines = [
      ...files.map((f) => `  ${f.path} -> ${f.url}`),
      ...patterns.map((p) => `  ${p} (numbered sequence, fetch each file from the site to see exact names)`),
    ];
    const assetsBlock = assetLines.length ? assetLines.join("\n") : "  none";

    let customBlock = "";
    const rawProps = args.props;
    if (rawProps && typeof rawProps === "object" && !Array.isArray(rawProps)) {
      const original = getOriginal(slug);
      const controls = original?.controls ?? [];
      const { values, warnings } = mergeCustomProps(controls, rawProps as Record<string, unknown>);
      const snippet = generateUsageSnippet(source.name, controls, values);
      customBlock =
        `\n\n--- Usage with your props applied ---\n${snippet}` +
        (warnings.length ? `\n(${warnings.join(" ")})\n` : "");
    }

    return textResult(
      `${source.name} (${source.category})\n${source.description}\n\n` +
        `File: ${source.fileName}\nDependencies: ${deps}\n\nAssets (fetch these into your project's public/ folder):\n${assetsBlock}\n\n` +
        `Props:\n${propsList}` +
        customBlock +
        `\n\n--- ${source.fileName} (unmodified, always drop this in as-is) ---\n${source.code}`,
    );
  }

  return { ...textResult(`Unknown tool: ${name}`), isError: true };
}

async function handle(
  body: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> },
  origin: string,
) {
  const { id, method, params = {} } = body;
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id, result });

  switch (method) {
    case "initialize":
      return reply({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case "notifications/initialized":
      return null; // notification, no response
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call": {
      const name = String(params.name ?? "");
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      try {
        return reply(await callTool(name, args, origin));
      } catch (err) {
        return reply({
          content: [{ type: "text", text: `Tool error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        });
      }
    }
    default:
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  const origin = new URL(request.url).origin;

  // A batch is allowed by JSON-RPC; notifications drop out of the response.
  if (Array.isArray(body)) {
    const results = (await Promise.all(body.map((m) => handle(m, origin)))).filter(Boolean);
    return results.length ? json(results) : empty(204);
  }

  const result = await handle(body as Parameters<typeof handle>[0], origin);
  return result ? json(result) : empty(204);
}

/** Preflight for browser-based clients. */
export async function OPTIONS() {
  return empty(204);
}

/** Lets people sanity-check the endpoint in a browser. */
export async function GET() {
  return json({
    ...SERVER_INFO,
    protocolVersion: PROTOCOL_VERSION,
    transport: "http",
    tools: TOOLS.map((t) => t.name),
    components: available().length,
  });
}
