# Spark UI

**Animated React + TypeScript components you copy into your project — not a dependency you install.**

[spark-ui-cyan.vercel.app](https://spark-ui-cyan.vercel.app) · [Components](https://spark-ui-cyan.vercel.app/components) · [UI Kit](https://spark-ui-cyan.vercel.app/charts) · [Docs](https://spark-ui-cyan.vercel.app/docs) · [MCP](https://spark-ui-cyan.vercel.app/mcp)

111 components: galleries, menus, page transitions, scroll effects, text animations, charts and widgets. Every one is a **single self-contained file** with no runtime dependency on Spark UI itself. Once it is in your repo, it is your code — edit it however you like.

---

## Three ways to get a component

### 1. CLI

```bash
npx spark-ui-registry@latest list
npx spark-ui-registry@latest add aurora-login-card
```

`add` writes the source into your project, installs the npm packages the component imports (`gsap`, `three`, …) using whichever package manager your lockfile implies, and downloads the images it references into `public/`.

| Option | Default | What it does |
|---|---|---|
| `-d, --dir <path>` | `components/spark-ui` | Where to write the component |
| `-r, --registry <url>` | `https://spark-ui-cyan.vercel.app` | Pull from a different registry |
| `-y, --yes` | off | Overwrite existing files without asking |

### 2. MCP server — let your agent do it

Spark UI ships an MCP server, so Claude Code, Cursor, Claude Desktop, or any MCP client can search the catalogue and pull source straight into your project.

```bash
claude mcp add --transport http spark-ui https://spark-ui-cyan.vercel.app/api/mcp
```

For clients that use a config file:

```json
{
  "mcpServers": {
    "spark-ui": {
      "type": "http",
      "url": "https://spark-ui-cyan.vercel.app/api/mcp"
    }
  }
}
```

**Tools exposed:**

| Tool | Arguments | Returns |
|---|---|---|
| `list_components` | `category?` | Every component with slug, category, description |
| `search_components` | `query` | Keyword search across names, categories, descriptions, features |
| `get_component` | `slug`, `props?` | Full source, prop table, npm dependencies, absolute asset URLs — plus a ready-to-paste usage snippet when you pass `props` |

Then just ask: *"Find me a scroll-driven text reveal and add it to my landing page."*

A `GET` on the endpoint returns a small status payload you can check in a browser. The transport is streamable HTTP, and CORS is open, so browser-based clients work too.

### 3. Browse and copy

Open any component's page, tune it with the live controls, then copy the configured code, copy the raw source, or download the file.

---

## REST API

The same catalogue over plain HTTP, if you would rather not use MCP.

```bash
curl https://spark-ui-cyan.vercel.app/api/components
curl https://spark-ui-cyan.vercel.app/api/components/aurora-login-card
```

- `GET /api/components` → `{ count, components: [{ slug, name, category, description, props }] }`
- `GET /api/components/<slug>` → the above plus `fileName`, `code`, `dependencies`, `assets`

---

## What's in the library

| Category | Count | Examples |
|---|---:|---|
| Charts | 52 | Mono chart set and dashboard widgets |
| Animations | 12 | Magnetic marquee, particle effects |
| Gallery | 10 | Circular gallery, portrait orbit, grid deformation |
| Scroll | 9 | Scroll-driven reveals and pinned sequences |
| Navigation | 8 | Cassette menu, overlay menu |
| Widgets | 6 | Compact UI kit pieces |
| Text | 4 | Stroke draw reveal, kinetic type |
| Background | 3 | Ambient canvas backdrops |
| Transitions, Hover, Sliders, Forms, 3D | 7 | Page transitions, hover states, orbit slider |

---

## Running it locally

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
npm run cli     # run the CLI from source
```

Requires Node 20+. Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, GSAP, Three.js and Motion.

---

## Project layout

```
cli/                     spark-ui-registry CLI (npx spark-ui-registry add …)
docs/
  brand/                 logo source files
  design-references/     style references used while designing the site
public/<component>/      images and media used by each component
src/
  app/                   routes: /, /components, /components/[slug], /charts (UI Kit),
                         /docs, /mcp, /3d-tool, /interaction-dna, api/
    api/mcp/             the MCP server (JSON-RPC over HTTP)
    api/components/      REST catalogue used by the CLI
  components/
    originals/           the component library itself, one file per component
      index.tsx          lazy registry: slug -> component, loaded on demand
      slugs.ts           server-safe list of registered slugs
      mono-charts/       chart and widget components
    catalog/             grid pages: Explorer, ComponentCard, MediaPreview
    detail/              component pages: preview, controls, code, install
    layout/              Header, Footer, Sidebar, Logo
    landing/             home page sections
    docs/                /docs and /mcp page content
    3d-tool/             /3d-tool page content
    dna/                 Interaction DNA studio
  lib/
    originalControls.ts  metadata and live controls for every component
    originalSources.ts   slug -> source file, used by the CLI and MCP
    originalEntries.ts   catalog entries built from the metadata
```

---

## Adding a component

1. Add the file to `src/components/originals/` — keep it self-contained, with no `@/` imports, so it can be copied into any project as-is.
2. Register it in `originals/index.tsx` and `originals/slugs.ts`.
3. Add its metadata and controls to `src/lib/originalControls.ts`, and its file name to `src/lib/originalSources.ts`.
4. Put its images in `public/<component-name>/`.

The controls you declare in step 3 drive the live customizer, the generated usage snippet, the CLI, and the MCP `get_component` prop table — all from that one definition.

---

## License

UNLICENSED. The components are free to copy into your own projects; the site and registry source are not licensed for redistribution.
