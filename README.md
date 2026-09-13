# Spark UI

Animated React + TypeScript components you copy straight into your project: galleries, menus, page transitions, text effects, charts and widgets. Every component is a single file with live controls on its page.

## Use a component

```bash
npx spark-ui-registry@latest list
npx spark-ui-registry@latest add list-hover-cards
```

`add` copies the component source into your project, installs the npm packages it needs and fetches its images. Components are also available to AI agents through the MCP server at `/api/mcp`.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

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

## Adding a component

1. Add the file to `src/components/originals/` (keep it self-contained: no `@/` imports).
2. Register it in `originals/index.tsx` and `originals/slugs.ts`.
3. Add its metadata and controls to `src/lib/originalControls.ts` and its file name to `src/lib/originalSources.ts`.
4. Put its images in `public/<component-name>/`.
