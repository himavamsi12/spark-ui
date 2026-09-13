/**
 * Turns a DNA project into a standalone React + GSAP component.
 *
 * The output is meant to be pasted into a project and run, not read as a
 * sketch: real refs, real ScrollTrigger wiring, real cleanup via gsap.context,
 * and the smooth-scroll runtime the project asked for. Every tween printed here
 * comes from the same resolveBuild() the preview uses, so exported code matches
 * the timeline you scrubbed.
 */

import { getPreset, resolveBuild } from "./effects";
import { describeCondition } from "./machine";
import { cloneLabel, cloneSource, cloneTransform } from "./layout";
import type { StateMachine } from "./machine";
import type { AnimatableProperty, DnaProject, KeyframeTrack, Layer, SplitMode } from "./types";

const INDENT = "  ";

function pascal(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const out = parts.map((p) => p[0].toUpperCase() + p.slice(1)).join("");
  return /^[A-Za-z]/.test(out) ? out : `Interaction${out}`;
}

/** Stable, readable ref names — `titleRef`, `titleRef2` on collision. */
function refNames(layers: Layer[]) {
  const used = new Map<string, number>();
  const names = new Map<string, string>();
  for (const layer of layers) {
    const base =
      layer.name
        .replace(/[^a-zA-Z0-9 ]/g, " ")
        .trim()
        .split(/\s+/)
        .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
        .join("") || "layer";
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    names.set(layer.id, count === 1 ? `${base}Ref` : `${base}${count}Ref`);
  }
  return names;
}

/** Prints a vars object the way you'd hand-write it. */
function vars(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  if (!entries.length) return "{}";
  const body = entries
    .map(([k, v]) => `${k}: ${typeof v === "string" ? JSON.stringify(v) : v}`)
    .join(", ");
  return `{ ${body} }`;
}

/** Mirrors keyVars() in engine.ts so preview and export agree. */
function keyVarText(property: AnimatableProperty, value: number): string {
  if (property === "blur") return `filter: "blur(${value}px)"`;
  if (property === "letterSpacing") return `letterSpacing: "${value}em"`;
  return `${property}: ${value}`;
}

/** Prints one keyframe track as a chain of timeline tweens. */
function trackLines(refName: string, track: KeyframeTrack, indent: string): string[] {
  const keys = [...track.keys].sort((a, b) => a.time - b.time);
  if (!keys.length) return [];
  const out = [
    `${indent}tl.set(${refName}.current, { ${keyVarText(track.property, keys[0].value)} }, ${keys[0].time});`,
  ];
  for (let i = 1; i < keys.length; i++) {
    const prev = keys[i - 1];
    const key = keys[i];
    const dur = Math.round((key.time - prev.time) * 1000) / 1000;
    if (dur <= 0) continue;
    out.push(
      `${indent}tl.to(${refName}.current, { ${keyVarText(track.property, key.value)}, duration: ${dur}, ease: ${JSON.stringify(key.ease)} }, ${prev.time});`,
    );
  }
  return out;
}

function splitCall(refName: string, mode: SplitMode) {
  const type = mode === "chars" ? "chars" : mode === "words" ? "words" : "lines";
  const mask = mode === "lines" ? `, mask: "lines"` : "";
  return `SplitText.create(${refName}.current, { type: "${type}"${mask} })`;
}

/**
 * Placement lives on an outer wrapper, never on the animated node: GSAP writes
 * the whole `transform` property, so a translate(-50%, -50%) on the same
 * element is wiped the first time a tween runs.
 */
function wrapperStyle(layer: Layer): string {
  const entries: string[] = [
    `position: "absolute"`,
    `left: "${layer.x}%"`,
    `top: "${layer.y}%"`,
    `transform: "translate(-50%, -50%)${layer.rotation ? ` rotate(${layer.rotation}deg)` : ""}"`,
  ];
  if (layer.type !== "text") {
    entries.push(`width: "${layer.width}%"`, `height: "${layer.height}%"`);
  }
  if (layer.opacity !== 100) entries.push(`opacity: ${layer.opacity / 100}`);
  return `{ ${entries.join(", ")} }`;
}

/** Everything that isn't placement goes on the node GSAP animates. */
function innerStyle(layer: Layer): string {
  const entries: string[] = [];
  if (layer.type !== "text") entries.push(`width: "100%"`, `height: "100%"`);
  if (layer.type === "text") {
    entries.push(
      `fontSize: "${layer.fontSize}px"`,
      `fontWeight: ${layer.fontWeight}`,
      `lineHeight: 1.1`,
      `whiteSpace: "pre-wrap"`,
    );
    if (layer.letterSpacing) entries.push(`letterSpacing: "${layer.letterSpacing}em"`);
  }
  if (layer.color !== "transparent") entries.push(`color: "${layer.color}"`);
  if (layer.type === "box") entries.push(`background: "${layer.background}"`);
  if (layer.radius) entries.push(`borderRadius: "${layer.radius}px"`);
  return `{ ${entries.join(", ")} }`;
}

function layerJsx(layer: Layer, refName: string, indent: string): string {
  const I = INDENT;
  const open = `${indent}<div style={${wrapperStyle(layer)}}>`;
  const close = `${indent}</div>`;

  // A repeating layer renders its clones from the same layout maths the studio
  // used, so the exported ring lands in exactly the positions you composed.
  if (layer.repeat) {
    const r = layer.repeat;
    const items = Array.from({ length: r.count }, (_, i) => {
      const t = cloneTransform(r, i, 0);
      const round = (n: number) => Math.round(n * 100) / 100;
      // Text clones hug their label (so a physics body matches the pill it
      // represents); everything else uses the configured item box.
      const isText = layer.type === "text";
      const style = [
        `position: "absolute"`,
        `left: "50%"`,
        `top: "50%"`,
        isText ? `whiteSpace: "nowrap"` : `width: "${r.itemWidth}px"`,
        isText ? `padding: "0.5rem 1.25rem"` : `height: "${r.itemHeight}px"`,
        isText ? `border: "1px solid ${layer.color}"` : `marginLeft: "${-r.itemWidth / 2}px"`,
        isText ? `lineHeight: 1` : `marginTop: "${-r.itemHeight / 2}px"`,
        isText ? `fontSize: "${layer.fontSize}px"` : "",
        isText ? `color: "${layer.color}"` : "",
        `transform: "translate(${round(t.x)}px, ${round(t.y)}px) rotate(${round(t.rotation)}deg)"`,
        layer.type === "box" ? `background: "${layer.background}"` : "",
        layer.radius ? `borderRadius: "${layer.radius}px"` : "",
        isText ? "" : `overflow: "hidden"`,
      ]
        .filter(Boolean)
        .join(", ");
      const inner =
        layer.type === "image"
          ? `\n${indent}${I}${I}{/* eslint-disable-next-line @next/next/no-img-element */}\n${indent}${I}${I}<img src=${JSON.stringify(cloneSource(r, i, layer.content))} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />\n${indent}${I}`
          : layer.type === "text"
            // Wrapped as an expression, not bare JSX text — otherwise the
            // quote characters land in the rendered output.
            ? `{${JSON.stringify(cloneLabel(r, i, layer.content))}}`
            : "";
      return `${indent}${I}<div key={${i}} ref={(el) => { if (el) ${refName}Items.current[${i}] = el; }} style={{ ${style} }}>${inner}</div>`;
    });
    return [
      open,
      `${indent}${I}<div ref={${refName}} style={{ width: "100%", height: "100%", position: "relative" }}>`,
      ...items.map((line) => `${I}${line}`),
      `${indent}${I}</div>`,
      close,
    ].join("\n");
  }
  if (layer.type === "image") {
    return [
      open,
      `${indent}${I}{/* eslint-disable-next-line @next/next/no-img-element */}`,
      `${indent}${I}<img ref={${refName}} src=${JSON.stringify(layer.content)} alt="" style={${innerStyle(layer)}} />`,
      close,
    ].join("\n");
  }
  if (layer.type === "text") {
    return [
      open,
      `${indent}${I}<div ref={${refName}} style={${innerStyle(layer)}}>`,
      `${indent}${I}${I}{${JSON.stringify(layer.content)}}`,
      `${indent}${I}</div>`,
      close,
    ].join("\n");
  }
  return [open, `${indent}${I}<div ref={${refName}} style={${innerStyle(layer)}} />`, close].join("\n");
}

const LISTENER_EVENT: Record<string, string> = {
  hover: "pointerenter",
  unhover: "pointerleave",
  click: "click",
  press: "pointerdown",
  release: "pointerup",
  enterView: "pointerenter",
};

/**
 * Prints a self-contained state machine driver. It's emitted inline rather than
 * imported from a package so the exported file stays a single drop-in with no
 * runtime dependency beyond GSAP.
 */
function machineLines(
  machine: StateMachine,
  refs: Map<string, string>,
  indent: string,
): string[] {
  // Raw ids are random strings; the generated file reads far better keyed by
  // the state names the author actually chose.
  const slugs = new Map<string, string>();
  const used = new Set<string>();
  for (const st of machine.states) {
    const base =
      st.name
        .replace(/[^a-zA-Z0-9]/g, " ")
        .trim()
        .split(/\s+/)
        .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
        .join("") || "state";
    let slug = base;
    let n = 2;
    while (used.has(slug)) slug = `${base}${n++}`;
    used.add(slug);
    slugs.set(st.id, slug);
  }
  const sid = (id: string) => JSON.stringify(slugs.get(id) ?? id);

  const I = INDENT;
  const i2 = indent + I;
  const i3 = i2 + I;
  const out: string[] = [``, `${indent}// ── State machine ──`];

  const states = machine.states
    .map(
      (st) =>
        `${i3}${sid(st.id)}: { from: ${st.from}, to: ${st.to}, loop: ${st.loop} },`,
    )
    .join("\n");
  out.push(`${indent}const states: Record<string, { from: number; to: number; loop: boolean }> = {`);
  out.push(states);
  out.push(`${indent}};`);

  const inputSlugs = new Map(machine.inputs.map((i) => [i.id, i.name || i.id]));
  const iid = (id: string) => JSON.stringify(inputSlugs.get(id) ?? id);
  out.push(`${indent}const inputs: Record<string, number> = {`);
  for (const input of machine.inputs) {
    out.push(`${i2}${JSON.stringify(input.name || input.id)}: ${input.value}, // ${input.type}`);
  }
  out.push(`${indent}};`);

  // Explicitly typed: without the annotation TypeScript narrows this to the
  // initial state's literal type and every later comparison looks impossible.
  out.push(`${indent}let current: string = ${sid(machine.initial || machine.states[0].id)};`);
  out.push(`${indent}let blockedUntil = 0;`);
  out.push(
    `${indent}const progress = () => {`,
    `${i2}const s = states[current];`,
    `${i2}const span = s.to - s.from;`,
    `${i2}return span <= 0 ? 1 : Math.min(1, Math.max(0, (tl.time() - s.from) / span));`,
    `${indent}};`,
  );
  out.push(
    `${indent}const enter = (id: string) => {`,
    `${i2}current = id;`,
    `${i2}tl.seek(states[id].from);`,
    `${i2}tl.play();`,
    `${indent}};`,
  );

  // Transitions, printed in order, each with its conditions spelled out.
  out.push(`${indent}const evaluate = () => {`);
  out.push(`${i2}const now = performance.now();`);
  out.push(`${i2}if (now < blockedUntil) return;`);
  for (const t of machine.transitions) {
    const guards: string[] = [];
    // Only "any" transitions need the self-transition guard: when `from` is a
    // named state, `current === from` already implies it isn't the target, and
    // emitting both makes TypeScript flag a comparison it can prove is always
    // true.
    if (t.from !== "any") guards.push(`current === ${sid(t.from)}`);
    else guards.push(`current !== ${sid(t.to)}`);
    if (t.exitTime !== null) guards.push(`progress() >= ${t.exitTime}`);
    for (const c of t.conditions) {
      const v = `inputs[${iid(c.input)}]`;
      const expr =
        c.op === "true" || c.op === "fired"
          ? `${v} !== 0`
          : c.op === "false"
            ? `${v} === 0`
            : c.op === "eq"
              ? `${v} === ${c.value}`
              : c.op === "neq"
                ? `${v} !== ${c.value}`
                : c.op === "gt"
                  ? `${v} > ${c.value}`
                  : c.op === "gte"
                    ? `${v} >= ${c.value}`
                    : c.op === "lt"
                      ? `${v} < ${c.value}`
                      : `${v} <= ${c.value}`;
      guards.push(expr);
    }
    const label = t.conditions.length
      ? t.conditions.map((c) => describeCondition(c, machine.inputs)).join(" and ")
      : t.exitTime !== null
        ? `after ${Math.round(t.exitTime * 100)}% of the state`
        : "immediately";
    const fromLabel = t.from === "any" ? "any" : (machine.states.find((x) => x.id === t.from)?.name ?? t.from);
    const toLabel = machine.states.find((x) => x.id === t.to)?.name ?? t.to;
    out.push(`${i2}// ${fromLabel} → ${toLabel}: ${label}`);
    out.push(`${i2}if (${guards.join(" && ")}) {`);
    out.push(`${i3}blockedUntil = now + ${Math.round(t.duration * 1000)};`);
    out.push(`${i3}enter(${sid(t.to)});`);
    out.push(`${i3}return;`);
    out.push(`${i2}}`);
  }
  out.push(`${indent}};`);

  out.push(
    `${indent}const setInput = (id: string, value: number) => { inputs[id] = value; evaluate(); };`,
    `${indent}// Triggers are momentary: spent as soon as they've been evaluated.`,
    `${indent}const fireInput = (id: string) => { inputs[id] = 1; evaluate(); inputs[id] = 0; };`,
  );

  for (const l of machine.listeners) {
    const refName = refs.get(l.layerId);
    if (!refName) continue;
    const inputName = machine.inputs.find((i) => i.id === l.input)?.name ?? l.input;
    const call =
      l.action === "fire"
        ? `fireInput(${iid(l.input)})`
        : l.action === "toggle"
          ? `setInput(${iid(l.input)}, inputs[${iid(l.input)}] ? 0 : 1)`
          : l.action === "setTrue"
            ? `setInput(${iid(l.input)}, 1)`
            : l.action === "setFalse"
              ? `setInput(${iid(l.input)}, 0)`
              : `setInput(${iid(l.input)}, ${l.value})`;
    out.push(
      `${indent}// ${l.event} on this layer ${l.action === "fire" ? "fires" : "sets"} "${inputName}"`,
      `${indent}${refName}.current?.addEventListener(${JSON.stringify(LISTENER_EVENT[l.event] ?? "click")}, () => ${call});`,
    );
  }

  out.push(
    `${indent}const machineTick = () => {`,
    `${i2}const s = states[current];`,
    `${i2}if (tl.time() >= s.to) {`,
    `${i3}if (s.loop) { tl.seek(s.from); tl.play(); }`,
    `${i3}else { tl.seek(s.to); tl.pause(); }`,
    `${i2}}`,
    `${i2}evaluate();`,
    `${indent}};`,
    `${indent}gsap.ticker.add(machineTick);`,
    `${indent}enter(current);`,
  );

  return out;
}

export type GeneratedFile = {
  fileName: string;
  code: string;
  install: string;
  dependencies: string[];
};

export function generateComponent(project: DnaProject): GeneratedFile {
  const { settings, layers } = project;
  const name = pascal(settings.name || "Interaction");
  const refs = refNames(layers);
  const visible = layers.filter((l) => l.visible);

  const active = visible.flatMap((layer) =>
    layer.effects
      .filter((fx) => fx.enabled)
      .map((fx) => ({ layer, fx, preset: getPreset(fx.preset) }))
      .filter((x) => x.preset),
  );

  const hasScroll = active.some((a) => a.preset!.kind === "scroll");
  const hasPhysics = active.some((a) => a.preset!.kind === "physics");
  const hasTracks = visible.some((l) => l.tracks.some((t) => t.keys.length > 0));
  const hasTimeline = active.some((a) => a.preset!.kind === "tween") || hasTracks;
  const hasSplit = active.some(
    (a) =>
      a.layer.type === "text" &&
      a.preset!.kind !== "pointer" &&
      (a.fx.split ?? a.preset!.split ?? "none") !== "none",
  );
  const useScrollTrigger = hasScroll && settings.scrollTrigger;

  // ── imports ────────────────────────────────────────────────────────
  const imports = [`import { useEffect, useRef } from "react";`, `import gsap from "gsap";`];
  if (useScrollTrigger) imports.push(`import { ScrollTrigger } from "gsap/ScrollTrigger";`);
  if (hasSplit) imports.push(`import { SplitText } from "gsap/SplitText";`);
  if (hasPhysics) imports.push(`import Matter from "matter-js";`);
  if (settings.smoothScroll === "lenis") imports.push(`import Lenis from "lenis";`);
  if (settings.smoothScroll === "locomotive")
    imports.push(
      `import LocomotiveScroll from "locomotive-scroll";`,
      `import "locomotive-scroll/dist/locomotive-scroll.css";`,
    );

  const plugins = [useScrollTrigger && "ScrollTrigger", hasSplit && "SplitText"].filter(Boolean);

  // ── refs ───────────────────────────────────────────────────────────
  const refLines = visible.flatMap((l) => {
    // A repeating layer's own ref points at the group container, with a second
    // ref array holding the clones the inertia and hover code drives.
    const type = l.repeat || l.type !== "image" ? "HTMLDivElement" : "HTMLImageElement";
    const lines = [`${INDENT}const ${refs.get(l.id)} = useRef<${type}>(null);`];
    if (l.repeat) {
      lines.push(`${INDENT}const ${refs.get(l.id)}Items = useRef<HTMLDivElement[]>([]);`);
    }
    return lines;
  });

  // ── smooth scroll ──────────────────────────────────────────────────
  const smooth: string[] = [];
  if (settings.smoothScroll === "lenis") {
    smooth.push(
      `${INDENT}${INDENT}const lenis = new Lenis({ duration: 1.1, smoothWheel: true });`,
      `${INDENT}${INDENT}// Drive Lenis from GSAP's ticker so scroll and tweens share one clock.`,
      `${INDENT}${INDENT}const raf = (time: number) => lenis.raf(time * 1000);`,
      `${INDENT}${INDENT}gsap.ticker.add(raf);`,
      `${INDENT}${INDENT}gsap.ticker.lagSmoothing(0);`,
    );
    if (useScrollTrigger) {
      smooth.push(
        `${INDENT}${INDENT}lenis.on("scroll", ScrollTrigger.update);`,
      );
    }
  } else if (settings.smoothScroll === "locomotive") {
    smooth.push(
      `${INDENT}${INDENT}const locomotive = new LocomotiveScroll({`,
      `${INDENT}${INDENT}${INDENT}el: root.current as HTMLElement,`,
      `${INDENT}${INDENT}${INDENT}smooth: true,`,
      `${INDENT}${INDENT}});`,
    );
    if (useScrollTrigger) {
      smooth.push(
        `${INDENT}${INDENT}locomotive.on("scroll", ScrollTrigger.update);`,
      );
    }
  }

  // ── animation body ─────────────────────────────────────────────────
  const body: string[] = [];
  const I3 = INDENT.repeat(3);
  /** Names of ticker callbacks registered below, so cleanup can remove them. */
  const tickers: string[] = [];

  if (hasTimeline) {
    const trigger = useScrollTrigger || !settings.scrollTrigger ? "" : "";
    body.push(`${I3}const tl = gsap.timeline();${trigger}`);
  }

  for (const { layer, fx, preset } of active) {
    const refName = refs.get(layer.id)!;
    const build = resolveBuild(fx.preset, fx.params);
    if (!preset || !build) continue;

    const mode: SplitMode =
      layer.type === "text" ? (fx.split ?? preset.split ?? "none") : "none";

    body.push(``, `${I3}// ${preset.name} — ${layer.name}`);

    if (preset.kind === "physics") {
      const cfg = build.physics!;
      const items = `${refName}Items.current`;
      const I = INDENT;
      // Conditional lines collapse to "" when they don't apply; dropping them
      // keeps the printed body free of blank gaps.
      body.push(
        ...[
        `${I3}{`,
        `${I3}${I}// Matter owns the positions; the DOM just mirrors them each frame.`,
        `${I3}${I}const { Engine, World, Bodies, Body } = Matter;`,
        `${I3}${I}let engine: Matter.Engine | null = null;`,
        `${I3}${I}let bodies: Matter.Body[] = [];`,
        `${I3}${I}let running = false;`,
        `${I3}${I}const rest = () => ${items}.forEach((el) => { el.style.opacity = "0"; el.style.transform = ""; });`,
        cfg.onHover ? `${I3}${I}rest();` : "",
        `${I3}${I}const startSim = () => {`,
        `${I3}${I}${I}if (running) return;`,
        `${I3}${I}${I}running = true;`,
        `${I3}${I}${I}const w = root.current!.clientWidth;`,
        `${I3}${I}${I}const h = root.current!.clientHeight;`,
        `${I3}${I}${I}engine = Engine.create({ gravity: { x: 0, y: ${cfg.gravity}, scale: 0.001 } });`,
        `${I3}${I}${I}// Thick bounds so a fast body can't tunnel straight through.`,
        `${I3}${I}${I}const wall = 200;`,
        `${I3}${I}${I}World.add(engine.world, [`,
        `${I3}${I}${I}${I}Bodies.rectangle(w / 2, h + wall / 2, w * 3, wall, { isStatic: true }),`,
        `${I3}${I}${I}${I}Bodies.rectangle(-wall / 2, h / 2, wall, h * 3, { isStatic: true }),`,
        `${I3}${I}${I}${I}Bodies.rectangle(w + wall / 2, h / 2, wall, h * 3, { isStatic: true }),`,
        `${I3}${I}${I}]);`,
        `${I3}${I}${I}bodies = ${items}.map((el, i) => {`,
        `${I3}${I}${I}${I}const cw = el.offsetWidth || 80;`,
        `${I3}${I}${I}${I}const ch = el.offsetHeight || 32;`,
        `${I3}${I}${I}${I}const b = Bodies.rectangle(`,
        `${I3}${I}${I}${I}${I}w * ${(1 - cfg.spread) / 2} + Math.random() * w * ${cfg.spread},`,
        `${I3}${I}${I}${I}${I}-(ch / 2) - i * 40,`,
        `${I3}${I}${I}${I}${I}cw, ch,`,
        `${I3}${I}${I}${I}${I}{ chamfer: { radius: Math.min(ch / 2, 24) }, restitution: ${cfg.restitution}, friction: ${cfg.friction}, density: 0.002 },`,
        `${I3}${I}${I}${I});`,
        `${I3}${I}${I}${I}Body.setAngle(b, (Math.random() - 0.5) * ${cfg.jitter});`,
        `${I3}${I}${I}${I}World.add(engine!.world, b);`,
        `${I3}${I}${I}${I}el.style.left = "0px"; el.style.top = "0px";`,
        `${I3}${I}${I}${I}el.style.marginLeft = "0px"; el.style.marginTop = "0px";`,
        `${I3}${I}${I}${I}gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: i * 0.04, ease: "power2.out" });`,
        `${I3}${I}${I}${I}return b;`,
        `${I3}${I}${I}});`,
        `${I3}${I}};`,
        `${I3}${I}const stopSim = () => {`,
        `${I3}${I}${I}running = false;`,
        `${I3}${I}${I}gsap.killTweensOf(${items});`,
        cfg.onHover ? `${I3}${I}${I}rest();` : "",
        `${I3}${I}${I}if (engine) { World.clear(engine.world, false); Engine.clear(engine); engine = null; }`,
        `${I3}${I}${I}bodies = [];`,
        `${I3}${I}};`,
        `${I3}${I}const step = () => {`,
        `${I3}${I}${I}if (!engine || !running) return;`,
        `${I3}${I}${I}Engine.update(engine, 1000 / 60);`,
        `${I3}${I}${I}${items}.forEach((el, i) => {`,
        `${I3}${I}${I}${I}const b = bodies[i];`,
        `${I3}${I}${I}${I}if (!b) return;`,
        `${I3}${I}${I}${I}el.style.transform = \`translate(\${b.position.x - el.offsetWidth / 2}px, \${b.position.y - el.offsetHeight / 2}px) rotate(\${b.angle}rad)\`;`,
        `${I3}${I}${I}});`,
        `${I3}${I}};`,
        `${I3}${I}gsap.ticker.add(step);`,
        `${I3}${I}tickers.push(step);`,
        cfg.onHover
          ? `${I3}${I}root.current?.addEventListener("pointerenter", startSim);\n${I3}${I}root.current?.addEventListener("pointerleave", stopSim);`
          : `${I3}${I}startSim();`,
        `${I3}}`,
        ].filter(Boolean),
      );
      tickers.push("step");
      continue;
    }

    if (preset.kind === "inertia") {
      const cfg = build.inertia!;
      const items = `${refName}Items.current`;
      body.push(
        `${I3}{`,
        `${I3}${INDENT}let speed = ${cfg.idle};`,
        `${I3}${INDENT}let direction = 1;`,
        `${I3}${INDENT}let value = 0;`,
        `${I3}${INDENT}const onWheel = (e: WheelEvent) => {`,
        `${I3}${INDENT}${INDENT}e.preventDefault();`,
        `${I3}${INDENT}${INDENT}direction = e.deltaY > 0 ? 1 : -1;`,
        `${I3}${INDENT}${INDENT}speed = Math.min(speed + Math.abs(e.deltaY) * ${cfg.sensitivity} * 0.01, ${cfg.max});`,
        `${I3}${INDENT}};`,
        `${I3}${INDENT}root.current?.addEventListener("wheel", onWheel, { passive: false });`,
        `${I3}${INDENT}const spin = () => {`,
        `${I3}${INDENT}${INDENT}// Speed eases back to the idle rate, and the property integrates it.`,
        `${I3}${INDENT}${INDENT}speed += (${cfg.idle} - speed) * ${cfg.decay};`,
        `${I3}${INDENT}${INDENT}value += speed * direction;`,
      );
      if (layer.repeat) {
        const r = layer.repeat;
        body.push(
          `${I3}${INDENT}${INDENT}const rad = ${cfg.property === "rotation" ? "(value * Math.PI) / 180" : "0"};`,
          `${I3}${INDENT}${INDENT}${items}.forEach((el, i) => {`,
          `${I3}${INDENT}${INDENT}${INDENT}const angle = (i / ${r.count}) * Math.PI * 2 + rad;`,
          `${I3}${INDENT}${INDENT}${INDENT}const ox = Math.cos(angle) * ${r.radiusX};`,
          `${I3}${INDENT}${INDENT}${INDENT}const oy = Math.sin(angle) * ${r.radiusY};`,
          `${I3}${INDENT}${INDENT}${INDENT}const t = (${r.tilt} * Math.PI) / 180;`,
          `${I3}${INDENT}${INDENT}${INDENT}const x = ox * Math.cos(t) - oy * Math.sin(t)${cfg.property === "x" ? " + value" : ""};`,
          `${I3}${INDENT}${INDENT}${INDENT}const y = ox * Math.sin(t) + oy * Math.cos(t)${cfg.property === "y" ? " + value" : ""};`,
          `${I3}${INDENT}${INDENT}${INDENT}el.style.transform = \`translate(\${x}px, \${y}px)\`;`,
          `${I3}${INDENT}${INDENT}});`,
        );
      } else {
        body.push(
          `${I3}${INDENT}${INDENT}gsap.set(${refName}.current, { ${cfg.property}: value });`,
        );
      }
      body.push(
        `${I3}${INDENT}};`,
        `${I3}${INDENT}gsap.ticker.add(spin);`,
        `${I3}${INDENT}tickers.push(spin);`,
        `${I3}}`,
      );
      tickers.push("spin");
      continue;
    }

    if (preset.kind === "pointer" && build.hoverFocus) {
      const cfg = build.hoverFocus;
      const items = `${refName}Items.current`;
      body.push(
        `${I3}{`,
        `${I3}${INDENT}// Hit-tested against the pointer rather than bound per item, so it`,
        `${I3}${INDENT}// keeps working while the ring moves under the cursor.`,
        `${I3}${INDENT}let hovered: HTMLElement | null = null;`,
        `${I3}${INDENT}let px = -1, py = -1;`,
        `${I3}${INDENT}root.current?.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; });`,
        `${I3}${INDENT}root.current?.addEventListener("pointerleave", () => { px = -1; py = -1; });`,
        `${I3}${INDENT}const apply = (active: HTMLElement | null) => {`,
        `${I3}${INDENT}${INDENT}${items}.forEach((el) => {`,
        `${I3}${INDENT}${INDENT}${INDENT}const isActive = el === active;`,
        `${I3}${INDENT}${INDENT}${INDENT}const dimmed = active !== null && !isActive;`,
        `${I3}${INDENT}${INDENT}${INDENT}gsap.to(el, { scale: isActive ? ${cfg.scale} : 1, duration: ${build.duration || 1}, ease: ${JSON.stringify(build.ease)}, overwrite: true });`,
        `${I3}${INDENT}${INDENT}${INDENT}gsap.to(el, { filter: \`saturate(\${dimmed ? 0 : 1}) brightness(\${dimmed ? ${1 - cfg.dim / 100} : 1})\`, duration: ${build.duration || 1}, ease: ${JSON.stringify(build.ease)}, overwrite: "auto" });`,
        `${I3}${INDENT}${INDENT}});`,
        `${I3}${INDENT}};`,
        `${I3}${INDENT}const focusTick = () => {`,
        `${I3}${INDENT}${INDENT}if (px < 0) { if (hovered) { hovered = null; apply(null); } return; }`,
        `${I3}${INDENT}${INDENT}const under = document.elementFromPoint(px, py) as HTMLElement | null;`,
        `${I3}${INDENT}${INDENT}const match = under ? ${items}.find((c) => c === under || c.contains(under)) ?? null : null;`,
        `${I3}${INDENT}${INDENT}if (match !== hovered) { hovered = match; apply(match); }`,
        `${I3}${INDENT}};`,
        `${I3}${INDENT}gsap.ticker.add(focusTick);`,
        `${I3}${INDENT}tickers.push(focusTick);`,
        `${I3}}`,
      );
      tickers.push("focusTick");
      continue;
    }

    if (preset.kind === "pointer") {
      const { strength, rotate, scale, ease } = build.pointer!;
      const dur = build.duration;
      const scope = fx.preset === "cursor-parallax" ? "root" : refName;
      body.push(
        `${I3}{`,
        `${I3}${INDENT}const el = ${refName}.current!;`,
        `${I3}${INDENT}const scope = ${scope}.current!;`,
        `${I3}${INDENT}const xTo = gsap.quickTo(el, "x", { duration: ${dur}, ease: "${ease}" });`,
        `${I3}${INDENT}const yTo = gsap.quickTo(el, "y", { duration: ${dur}, ease: "${ease}" });`,
      );
      if (rotate) {
        body.push(
          `${I3}${INDENT}const rxTo = gsap.quickTo(el, "rotationX", { duration: ${dur}, ease: "${ease}" });`,
          `${I3}${INDENT}const ryTo = gsap.quickTo(el, "rotationY", { duration: ${dur}, ease: "${ease}" });`,
          `${I3}${INDENT}gsap.set(el, { transformPerspective: 800 });`,
        );
      }
      if (scale) {
        body.push(
          `${I3}${INDENT}const sTo = gsap.quickTo(el, "scale", { duration: ${dur}, ease: "${ease}" });`,
        );
      }
      body.push(
        `${I3}${INDENT}const onMove = (e: PointerEvent) => {`,
        `${I3}${INDENT}${INDENT}const r = scope.getBoundingClientRect();`,
        `${I3}${INDENT}${INDENT}const dx = e.clientX - (r.left + r.width / 2);`,
        `${I3}${INDENT}${INDENT}const dy = e.clientY - (r.top + r.height / 2);`,
      );
      if (strength) {
        body.push(
          `${I3}${INDENT}${INDENT}xTo(dx * ${strength});`,
          `${I3}${INDENT}${INDENT}yTo(dy * ${strength});`,
        );
      }
      if (rotate) {
        body.push(
          `${I3}${INDENT}${INDENT}ryTo((dx / (r.width / 2)) * ${rotate});`,
          `${I3}${INDENT}${INDENT}rxTo((-dy / (r.height / 2)) * ${rotate});`,
        );
      }
      body.push(`${I3}${INDENT}};`);
      const resets = [
        `xTo(0); yTo(0);`,
        rotate ? `rxTo(0); ryTo(0);` : "",
        scale ? `sTo(1);` : "",
      ].filter(Boolean);
      body.push(
        ...[
          `${I3}${INDENT}const onLeave = () => { ${resets.join(" ")} };`,
          scale ? `${I3}${INDENT}const onEnter = () => sTo(${scale});` : "",
          `${I3}${INDENT}scope.addEventListener("pointermove", onMove);`,
          scale ? `${I3}${INDENT}el.addEventListener("pointerenter", onEnter);` : "",
          `${I3}${INDENT}el.addEventListener("pointerleave", onLeave);`,
          `${I3}}`,
          // Conditional lines above collapse to "" when they don't apply;
          // dropping them here keeps the printed body free of blank gaps.
        ].filter(Boolean),
      );
      continue;
    }

    const targetExpr = mode === "none" ? `${refName}.current` : `split.${mode}`;
    const open = mode === "none" ? "" : `${I3}{\n${I3}${INDENT}const split = ${splitCall(refName, mode)};\n`;
    const close = mode === "none" ? "" : `\n${I3}}`;
    const inner = mode === "none" ? I3 : `${I3}${INDENT}`;

    const tweenVars: Record<string, unknown> = {
      ...(build.to ?? {}),
      duration: fx.duration ?? build.duration,
      ease: build.ease,
    };
    if (build.stagger) tweenVars.stagger = build.stagger;
    if (build.repeat) tweenVars.repeat = build.repeat;
    if (build.yoyo) tweenVars.yoyo = build.yoyo;

    if (preset.kind === "scroll") {
      // Scroll effects leave the timeline entirely and get their own trigger.
      // A pinned section holds still while the page scrolls past it, so it
      // starts at the top of the viewport and runs for scrollLength screens.
      // Unpinned, the classic "enters bottom, leaves top" window is right.
      const stLines = settings.pin
        ? [
            `trigger: root.current`,
            `start: "top top"`,
            `end: "+=${Math.round(settings.scrollLength * 100)}%"`,
            `scrub: ${settings.scrub || true}`,
            `pin: true`,
            `anticipatePin: 1`,
            `markers: ${settings.markers}`,
          ]
        : [
            `trigger: root.current`,
            `start: "top bottom"`,
            `end: "bottom top"`,
            `scrub: ${settings.scrub || true}`,
            `markers: ${settings.markers}`,
          ];
      const st = settings.scrollTrigger
        ? `,\n${inner}${INDENT}scrollTrigger: {\n` +
          stLines.map((l) => `${inner}${INDENT}${INDENT}${l},`).join("\n") +
          `\n${inner}${INDENT}}`
        : "";
      const to = Object.entries(tweenVars)
        .map(([k, v]) => `${inner}${INDENT}${k}: ${typeof v === "string" ? JSON.stringify(v) : v}`)
        .join(",\n");
      body.push(`${open}${inner}gsap.to(${targetExpr}, {\n${to}${st}\n${inner}});${close}`);
      continue;
    }

    const position = fx.start > 0 ? `, ${fx.start}` : `, 0`;
    if (build.from) {
      const fromVars = vars(build.from);
      const toVars = vars({ ...neutralFor(build.from, build.to), ...tweenVars });
      body.push(`${open}${inner}tl.fromTo(${targetExpr}, ${fromVars}, ${toVars}${position});${close}`);
    } else {
      body.push(`${open}${inner}tl.to(${targetExpr}, ${vars(tweenVars)}${position});${close}`);
    }
  }

  // Keyframe tracks print after the presets, matching engine.ts ordering.
  for (const layer of visible) {
    const refName = refs.get(layer.id)!;
    for (const track of layer.tracks) {
      if (!track.keys.length) continue;
      body.push(``, `${I3}// Keyframes: ${track.property} — ${layer.name}`);
      body.push(...trackLines(refName, track, I3));
    }
  }

  // ── state machine ──────────────────────────────────────────────────
  const machine = project.machine;
  const useMachine = !!machine?.enabled && machine.states.length > 0;
  if (useMachine) {
    body.push(...machineLines(machine, refs, I3));
    body.push(`${I3}tickers.push(machineTick);`);
  }

  // gsap.context() runs a returned function on revert — the only hook that
  // reliably pulls global ticker callbacks back out again.
  if (tickers.length || useMachine) {
    body.unshift(`${I3}const tickers: gsap.TickerCallback[] = [];`);
    body.push(``, `${I3}return () => tickers.forEach((fn) => gsap.ticker.remove(fn));`);
  }

  // ── cleanup ────────────────────────────────────────────────────────
  const cleanup: string[] = [`${INDENT}${INDENT}return () => {`, `${INDENT}${INDENT}${INDENT}ctx.revert();`];
  if (settings.smoothScroll === "lenis") {
    cleanup.push(
      `${INDENT}${INDENT}${INDENT}gsap.ticker.remove(raf);`,
      `${INDENT}${INDENT}${INDENT}lenis.destroy();`,
    );
  } else if (settings.smoothScroll === "locomotive") {
    cleanup.push(`${INDENT}${INDENT}${INDENT}locomotive.destroy();`);
  }
  cleanup.push(`${INDENT}${INDENT}};`);

  const jsx = visible.map((l) => layerJsx(l, refs.get(l.id)!, `${INDENT}${INDENT}${INDENT}`)).join("\n");

  // The composition ships as a section, so its own box is part of the output.
  const height =
    settings.heightMode === "viewport"
      ? `"100vh"`
      : settings.heightMode === "fixed"
        ? `"${settings.heightPx}px"`
        : `"auto"`;
  const rootStyle = [
    `position: "relative"`,
    `width: "100%"`,
    `height: ${height}`,
    settings.maxWidth ? `maxWidth: "${settings.maxWidth}px"` : "",
    settings.maxWidth ? `margin: "0 auto"` : "",
    `overflow: "hidden"`,
    `background: ${JSON.stringify(settings.background)}`,
  ]
    .filter(Boolean)
    .join(", ");

  const code = [
    `"use client";`,
    ``,
    ...imports,
    ``,
    plugins.length ? `gsap.registerPlugin(${plugins.join(", ")});\n` : ``,
    `export default function ${name}() {`,
    `${INDENT}const root = useRef<HTMLDivElement>(null);`,
    ...refLines,
    ``,
    `${INDENT}useEffect(() => {`,
    ...smooth,
    smooth.length ? `` : null,
    `${INDENT}${INDENT}const ctx = gsap.context(() => {`,
    ...body,
    `${INDENT}${INDENT}}, root);`,
    ``,
    ...cleanup,
    `${INDENT}}, []);`,
    ``,
    `${INDENT}return (`,
    `${INDENT}${INDENT}<div`,
    `${INDENT}${INDENT}${INDENT}ref={root}`,
    `${INDENT}${INDENT}${INDENT}style={{ ${rootStyle} }}`,
    `${INDENT}${INDENT}>`,
    jsx,
    `${INDENT}${INDENT}</div>`,
    `${INDENT});`,
    `}`,
    ``,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const dependencies = [
    "gsap",
    hasPhysics ? "matter-js" : "",
    settings.smoothScroll === "lenis" ? "lenis" : "",
    settings.smoothScroll === "locomotive" ? "locomotive-scroll" : "",
  ].filter(Boolean);

  return {
    fileName: `${name}.tsx`,
    code,
    install: `npm install ${dependencies.join(" ")}`,
    dependencies,
  };
}

/** Mirrors engine.ts — `from` tweens need explicit neutral end values. */
function neutralFor(from: Record<string, unknown>, to?: Record<string, unknown>) {
  const neutral: Record<string, unknown> = {
    opacity: 1,
    x: 0,
    y: 0,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
    filter: "blur(0px)",
    clipPath: "inset(0% 0% 0% 0%)",
  };
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(from)) {
    if (to && key in to) continue;
    if (key in neutral) out[key] = neutral[key];
  }
  return out;
}
