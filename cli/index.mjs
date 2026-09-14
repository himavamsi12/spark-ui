#!/usr/bin/env node
/**
 * Spark UI CLI: copies animated components into your project, shadcn-style.
 *
 *   npx spark-ui-registry@latest add portrait-orbit
 *   npx spark-ui-registry@latest list
 *
 * The component source is fetched from the registry and written into your repo,
 * so you own the file and can edit it freely. Peer packages the component
 * imports (gsap, three, …) are installed with your package manager.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_REGISTRY = process.env.SPARK_UI_REGISTRY ?? "https://spark-ui-cyan.vercel.app";

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

function parseArgs(argv) {
  const opts = { command: argv[0], slugs: [], dir: null, registry: DEFAULT_REGISTRY, yes: false };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir" || a === "-d") opts.dir = argv[++i];
    else if (a === "--registry" || a === "-r") opts.registry = argv[++i];
    else if (a === "--yes" || a === "-y") opts.yes = true;
    else if (!a.startsWith("-")) opts.slugs.push(a);
  }
  return opts;
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} · ${url}`);
  return res.json();
}

/** Picks the package manager from whichever lockfile is present. */
function detectPackageManager(cwd) {
  if (existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(path.join(cwd, "bun.lockb"))) return "bun";
  return "npm";
}

function installArgs(pm, deps) {
  if (pm === "yarn") return ["add", ...deps];
  if (pm === "bun") return ["add", ...deps];
  return ["install", ...deps];
}

/** Reads a tsconfig path alias so we can suggest the right import specifier. */
async function defaultTargetDir(cwd) {
  if (existsSync(path.join(cwd, "src", "components"))) return "src/components/spark-ui";
  if (existsSync(path.join(cwd, "components"))) return "components/spark-ui";
  if (existsSync(path.join(cwd, "app"))) return "components/spark-ui";
  return "components/spark-ui";
}

/** Which of the component's peer packages aren't already in package.json. */
async function missingDeps(cwd, deps) {
  try {
    const pkg = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8"));
    const have = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]);
    return deps.filter((d) => !have.has(d));
  } catch {
    return deps;
  }
}

async function addComponent(slug, opts, cwd) {
  const meta = await getJson(`${opts.registry}/api/components/${slug}`);

  const targetDir = opts.dir ?? (await defaultTargetDir(cwd));
  const outPath = path.join(cwd, targetDir, meta.fileName);

  if (existsSync(outPath) && !opts.yes) {
    console.log(c.yellow(`  ! ${path.relative(cwd, outPath)} already exists, skipping (use --yes to overwrite)`));
  } else {
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, meta.code, "utf8");
    console.log(`  ${c.green("+")} ${path.relative(cwd, outPath)}`);
  }

  // Pull down any static assets the component references.
  const assets = (meta.assets ?? []).filter((a) => !a.endsWith("/*"));
  for (const asset of assets) {
    const dest = path.join(cwd, "public", asset.replace(/^\//, ""));
    if (existsSync(dest) && !opts.yes) continue;
    try {
      const res = await fetch(`${opts.registry}${asset}`);
      if (!res.ok) throw new Error(String(res.status));
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      console.log(`  ${c.green("+")} ${path.relative(cwd, dest)}`);
    } catch {
      console.log(c.yellow(`  ! could not fetch asset ${asset}, add your own and update the path`));
    }
  }
  const wildcards = (meta.assets ?? []).filter((a) => a.endsWith("/*"));
  for (const w of wildcards) {
    console.log(c.dim(`    uses images under public${w}, swap in your own and update the paths`));
  }

  return meta;
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);
  const cwd = process.cwd();

  if (!opts.command || opts.command === "help" || opts.command === "--help") {
    console.log(`
${c.bold("spark-ui")}: animated React components, copied into your project

  ${c.cyan("npx spark-ui-registry@latest add <component…>")}   add one or more components
  ${c.cyan("npx spark-ui-registry@latest list")}               list everything available

Options
  -d, --dir <path>        where to write components  ${c.dim("(default: components/spark-ui)")}
  -r, --registry <url>    registry to pull from      ${c.dim(`(default: ${DEFAULT_REGISTRY})`)}
  -y, --yes               overwrite existing files without asking
`);
    return;
  }

  if (opts.command === "list") {
    const { components } = await getJson(`${opts.registry}/api/components`);
    console.log(`\n${c.bold(`${components.length} components`)}\n`);
    for (const comp of components) {
      console.log(`  ${c.cyan(comp.slug.padEnd(26))} ${c.dim(comp.category.padEnd(12))} ${comp.name}`);
    }
    console.log(`\n${c.dim("Add one with:")} npx spark-ui-registry@latest add <component>\n`);
    return;
  }

  if (opts.command !== "add") {
    console.error(c.red(`Unknown command: ${opts.command}`));
    process.exit(1);
  }

  if (opts.slugs.length === 0) {
    console.error(c.red("Specify at least one component, e.g. npx spark-ui-registry@latest add aurora-login-card"));
    process.exit(1);
  }

  const allDeps = new Set();
  for (const slug of opts.slugs) {
    console.log(`\n${c.bold(slug)}`);
    try {
      const meta = await addComponent(slug, opts, cwd);
      (meta.dependencies ?? []).forEach((d) => allDeps.add(d));
    } catch (err) {
      console.error(c.red(`  ✗ ${err.message}`));
      process.exitCode = 1;
    }
  }

  const needed = await missingDeps(cwd, [...allDeps]);
  if (needed.length) {
    const pm = detectPackageManager(cwd);
    console.log(`\n${c.dim(`Installing ${needed.join(", ")} with ${pm}…`)}`);
    const res = spawnSync(pm, installArgs(pm, needed), { stdio: "inherit", cwd, shell: process.platform === "win32" });
    if (res.status !== 0) {
      console.log(c.yellow(`\n  ! install failed, run it yourself: ${pm} ${installArgs(pm, needed).join(" ")}`));
    }
  }

  console.log(`\n${c.green("Done.")} Import it and you are set.\n`);
}

main().catch((err) => {
  console.error(c.red(`\n${err.message}\n`));
  process.exit(1);
});
