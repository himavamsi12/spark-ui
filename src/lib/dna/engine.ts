/**
 * Preview runtime for Interaction DNA.
 *
 * Builds one master GSAP timeline from the project so the studio's playhead can
 * scrub the whole composition. Scroll-kind effects are laid onto the same
 * timeline rather than wired to ScrollTrigger: in the editor "scroll progress"
 * *is* timeline progress, which is what makes scrubbing a scroll animation
 * possible without a scroll container. Codegen re-attaches them to ScrollTrigger
 * on export.
 *
 * Pointer effects can't live on a timeline at all, so they're bound as live
 * listeners and torn down alongside it.
 */

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { effectDuration, resolveBuild } from "./effects";
import { MachineRuntime } from "./machine";
import { cloneTransform } from "./layout";
import Matter from "matter-js";
import type { MachineListener, MachineState, StateMachine } from "./machine";
import { getPreset } from "./effects";
import type {
  AnimatableProperty,
  DnaProject,
  EffectInstance,
  KeyframeTrack,
  Layer,
  SplitMode,
} from "./types";

if (typeof window !== "undefined") gsap.registerPlugin(SplitText);

export type StageRefs = Map<string, HTMLElement>;
/** Clone elements for repeating layers, keyed by layer id. */
export type CloneRefs = Map<string, HTMLElement[]>;

/**
 * Keyframe values are plain numbers; GSAP wants the property spelled its way.
 * `blur` is the odd one out — it has to go through the filter shorthand.
 */
export function keyVars(property: AnimatableProperty, value: number): gsap.TweenVars {
  if (property === "blur") return { filter: `blur(${value}px)` };
  if (property === "letterSpacing") return { letterSpacing: `${value}em` };
  return { [property]: value };
}

/**
 * Lays a track's keys onto the timeline as a chain of tweens: the first key is
 * a `set` at its own time, and every key after it tweens in from the one
 * before, using that key's own ease. Two keys at the same time would produce a
 * zero-length tween, so they're skipped rather than left to divide by zero.
 */
function addTrack(timeline: gsap.core.Timeline, target: Element, track: KeyframeTrack) {
  const keys = [...track.keys].sort((a, b) => a.time - b.time);
  if (keys.length === 0) return;

  timeline.set(target, keyVars(track.property, keys[0].value), keys[0].time);
  for (let i = 1; i < keys.length; i++) {
    const prev = keys[i - 1];
    const key = keys[i];
    const dur = key.time - prev.time;
    if (dur <= 0) continue;
    timeline.to(
      target,
      { ...keyVars(track.property, key.value), duration: dur, ease: key.ease },
      prev.time,
    );
  }
}

export type BuiltPreview = {
  timeline: gsap.core.Timeline;
  /** Present only when the project's state machine is switched on. */
  runtime: MachineRuntime | null;
  /** Tears down listeners, splits and tweens created for this build. */
  destroy: () => void;
};

/** Splits a text layer, returning the pieces to animate plus a revert. */
function splitTargets(el: HTMLElement, mode: SplitMode) {
  if (mode === "none") return { targets: [el] as Element[], revert: () => {} };
  const type = mode === "chars" ? "chars" : mode === "words" ? "words" : "lines";
  const split = SplitText.create(el, {
    type,
    // Masked lines are what make "Line Rise" read as a reveal rather than a slide.
    mask: mode === "lines" ? "lines" : undefined,
    linesClass: "dna-line",
    wordsClass: "dna-word",
    charsClass: "dna-char",
  });
  const targets =
    mode === "chars" ? split.chars : mode === "words" ? split.words : split.lines;
  return { targets: targets as Element[], revert: () => split.revert() };
}

function bindPointer(
  el: HTMLElement,
  stage: HTMLElement,
  instance: EffectInstance,
): () => void {
  const build = resolveBuild(instance.preset, instance.params);
  if (!build?.pointer) return () => {};
  const { strength, rotate, scale, ease } = build.pointer;
  const dur = build.duration;

  const xTo = gsap.quickTo(el, "x", { duration: dur, ease });
  const yTo = gsap.quickTo(el, "y", { duration: dur, ease });
  const rxTo = gsap.quickTo(el, "rotationX", { duration: dur, ease });
  const ryTo = gsap.quickTo(el, "rotationY", { duration: dur, ease });
  const sTo = gsap.quickTo(el, "scale", { duration: dur, ease });

  // Magnetic and tilt react to the element's own box; cursor parallax tracks
  // the whole stage, so it keeps drifting even when the pointer is far away.
  const scoped = instance.preset === "cursor-parallax" ? stage : el;

  function onMove(e: PointerEvent) {
    const rect = scoped.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    if (strength) {
      xTo(dx * strength);
      yTo(dy * strength);
    }
    if (rotate) {
      ryTo((dx / (rect.width / 2)) * rotate);
      rxTo((-dy / (rect.height / 2)) * rotate);
    }
  }
  function onEnter() {
    if (scale) sTo(scale);
    if (rotate) gsap.set(el, { transformPerspective: 800 });
  }
  function onLeave() {
    xTo(0);
    yTo(0);
    if (rotate) {
      rxTo(0);
      ryTo(0);
    }
    if (scale) sTo(1);
  }

  scoped.addEventListener("pointermove", onMove);
  el.addEventListener("pointerenter", onEnter);
  el.addEventListener("pointerleave", onLeave);
  return () => {
    scoped.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerenter", onEnter);
    el.removeEventListener("pointerleave", onLeave);
    gsap.set(el, { x: 0, y: 0, rotationX: 0, rotationY: 0, scale: 1 });
  };
}

/**
 * Drives a repeating ring (or a single element) from wheel input.
 *
 * Speed accumulates from the wheel, eases back toward `idle` every frame, and
 * the property integrates that speed — so a flick spins it up and it coasts
 * down on its own. Clones are re-placed from the shared layout maths, which is
 * what makes the ring travel rather than just rotate in place.
 */
function bindInertia(
  el: HTMLElement,
  stage: HTMLElement,
  clones: HTMLElement[],
  layer: Layer,
  build: NonNullable<ReturnType<typeof resolveBuild>>,
): () => void {
  const cfg = build.inertia;
  if (!cfg) return () => {};

  let speed = cfg.idle;
  let direction = 1;
  let value = 0;

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    direction = e.deltaY > 0 ? 1 : -1;
    speed = Math.min(speed + Math.abs(e.deltaY) * cfg!.sensitivity * 0.01, cfg!.max);
  }
  stage.addEventListener("wheel", onWheel, { passive: false });

  const tick = () => {
    speed += (cfg.idle - speed) * cfg.decay;
    value += speed * direction;
    if (layer.repeat && clones.length) {
      // A ring integrates into an angle; a row into a pixel offset.
      const rad = cfg.property === "rotation" ? (value * Math.PI) / 180 : 0;
      clones.forEach((clone, i) => {
        const t = cloneTransform(layer.repeat!, i, rad);
        const dx = cfg.property === "x" ? value : 0;
        const dy = cfg.property === "y" ? value : 0;
        clone.style.transform = `translate(${t.x + dx}px, ${t.y + dy}px) rotate(${t.rotation}deg)`;
      });
    } else {
      gsap.set(el, { [cfg.property]: value });
    }
  };
  gsap.ticker.add(tick);

  return () => {
    stage.removeEventListener("wheel", onWheel);
    gsap.ticker.remove(tick);
  };
}

/**
 * Hover focus reaches past its own element: it scales whatever the pointer is
 * over and drains the colour from its siblings. Hit-testing goes through
 * elementFromPoint rather than per-clone listeners, so it keeps working while
 * the ring is moving underneath the cursor.
 */
function bindHoverFocus(
  stage: HTMLElement,
  clones: HTMLElement[],
  build: NonNullable<ReturnType<typeof resolveBuild>>,
): () => void {
  const cfg = build.hoverFocus;
  if (!cfg || !clones.length) return () => {};

  let hovered: HTMLElement | null = null;
  let px = -1;
  let py = -1;

  const onMove = (e: PointerEvent) => {
    px = e.clientX;
    py = e.clientY;
  };
  const onLeave = () => {
    px = -1;
    py = -1;
  };
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerleave", onLeave);

  const apply = (active: HTMLElement | null) => {
    for (const clone of clones) {
      const isActive = clone === active;
      const dimmed = active !== null && !isActive;
      gsap.to(clone, {
        scale: isActive ? cfg.scale : 1,
        duration: build.duration || 1,
        ease: build.ease,
        overwrite: true,
      });
      gsap.to(clone, {
        filter: `saturate(${dimmed ? 0 : 1}) brightness(${dimmed ? 1 - cfg.dim / 100 : 1})`,
        duration: build.duration || 1,
        ease: build.ease,
        overwrite: "auto",
      });
    }
  };

  const tick = () => {
    if (px < 0) {
      if (hovered) {
        hovered = null;
        apply(null);
      }
      return;
    }
    const under = document.elementFromPoint(px, py) as HTMLElement | null;
    const match = under ? clones.find((c) => c === under || c.contains(under)) ?? null : null;
    if (match !== hovered) {
      hovered = match;
      apply(match);
    }
  };
  gsap.ticker.add(tick);

  return () => {
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerleave", onLeave);
    gsap.ticker.remove(tick);
  };
}

/**
 * Runs a Matter.js world over a repeating layer's clones.
 *
 * Matter owns the positions and the DOM just mirrors them each frame — the same
 * split the original PhysicsTagHover uses. Floor and walls are built from the
 * stage's live box so the pile always lands inside the frame rather than
 * falling out of it.
 */
function bindPhysics(
  stage: HTMLElement,
  clones: HTMLElement[],
  build: NonNullable<ReturnType<typeof resolveBuild>>,
): () => void {
  const cfg = build.physics;
  if (!cfg || !clones.length) return () => {};

  const { Engine, World, Bodies, Body } = Matter;
  let engine: Matter.Engine | null = null;
  let bodies: Matter.Body[] = [];
  let running = false;

  // Hidden until they drop, exactly as the source component does — the tags
  // are created by the hover, not revealed by it.
  const rest = () => {
    for (const el of clones) {
      el.style.opacity = "0";
      el.style.transform = "";
    }
  };
  if (cfg.onHover) rest();

  const start = () => {
    if (running) return;
    running = true;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    engine = Engine.create({ gravity: { x: 0, y: cfg.gravity, scale: 0.001 } });

    // Generous, thick bounds so a fast body can't tunnel straight through.
    const wall = 200;
    World.add(engine.world, [
      Bodies.rectangle(w / 2, h + wall / 2, w * 3, wall, { isStatic: true }),
      Bodies.rectangle(-wall / 2, h / 2, wall, h * 3, { isStatic: true }),
      Bodies.rectangle(w + wall / 2, h / 2, wall, h * 3, { isStatic: true }),
    ]);

    bodies = clones.map((el, i) => {
      const cw = el.offsetWidth || 80;
      const ch = el.offsetHeight || 32;
      const body = Bodies.rectangle(
        w * ((1 - cfg.spread) / 2) + Math.random() * w * cfg.spread,
        -(ch / 2) - i * 40,
        cw,
        ch,
        {
          chamfer: { radius: Math.min(ch / 2, 24) },
          restitution: cfg.restitution,
          friction: cfg.friction,
          density: 0.002,
        },
      );
      Body.setAngle(body, (Math.random() - 0.5) * cfg.jitter);
      World.add(engine!.world, body);
      // Physics drives absolute coords, so the ring/grid offsets step aside.
      el.style.left = "0px";
      el.style.top = "0px";
      el.style.marginLeft = "0px";
      el.style.marginTop = "0px";
      // Staggered fade as each body enters, so the pile builds rather than
      // appearing all at once.
      gsap.fromTo(
        el,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, delay: i * 0.04, ease: "power2.out" },
      );
      return body;
    });
  };

  const stop = () => {
    running = false;
    gsap.killTweensOf(clones);
    if (cfg.onHover) rest();
    if (engine) {
      World.clear(engine.world, false);
      Engine.clear(engine);
      engine = null;
    }
    bodies = [];
  };

  const tick = () => {
    if (!engine || !running) return;
    Engine.update(engine, 1000 / 60);
    for (let i = 0; i < clones.length; i++) {
      const b = bodies[i];
      if (!b) continue;
      const el = clones[i];
      el.style.transform = `translate(${b.position.x - el.offsetWidth / 2}px, ${
        b.position.y - el.offsetHeight / 2
      }px) rotate(${b.angle}rad)`;
    }
  };
  gsap.ticker.add(tick);

  const onEnter = () => start();
  const onLeave = () => stop();
  if (cfg.onHover) {
    stage.addEventListener("pointerenter", onEnter);
    stage.addEventListener("pointerleave", onLeave);
  } else {
    start();
  }

  return () => {
    gsap.ticker.remove(tick);
    stage.removeEventListener("pointerenter", onEnter);
    stage.removeEventListener("pointerleave", onLeave);
    stop();
  };
}

/** DOM events each listener kind maps onto. */
const LISTENER_EVENT: Record<MachineListener["event"], string> = {
  hover: "pointerenter",
  unhover: "pointerleave",
  click: "click",
  press: "pointerdown",
  release: "pointerup",
  enterView: "pointerenter",
};

function applyListener(runtime: MachineRuntime, listener: MachineListener) {
  switch (listener.action) {
    case "setTrue":
      return runtime.setValue(listener.input, 1);
    case "setFalse":
      return runtime.setValue(listener.input, 0);
    case "toggle":
      return runtime.toggle(listener.input);
    case "fire":
      return runtime.fire(listener.input);
    default:
      return runtime.setValue(listener.input, listener.value);
  }
}

/**
 * Wires the state machine to the built timeline: listeners drive inputs, and a
 * ticker callback advances the machine so exit-time transitions still resolve
 * when nothing is touching the inputs.
 */
function bindMachine(
  machine: StateMachine,
  timeline: gsap.core.Timeline,
  refs: StageRefs,
  onStateChange?: (state: MachineState | null) => void,
): { runtime: MachineRuntime; cleanup: () => void } {
  const runtime = new MachineRuntime(
    machine,
    {
      seek: (t) => void timeline.seek(t),
      play: () => void timeline.play(),
      pause: () => void timeline.pause(),
      time: () => timeline.time(),
    },
    onStateChange,
  );

  const unbinds: (() => void)[] = [];
  for (const listener of machine.listeners) {
    const el = refs.get(listener.layerId);
    if (!el) continue;
    const type = LISTENER_EVENT[listener.event];
    const handler = () => applyListener(runtime, listener);
    el.addEventListener(type, handler);
    unbinds.push(() => el.removeEventListener(type, handler));
  }

  const tick = () => runtime.tick();
  gsap.ticker.add(tick);
  unbinds.push(() => gsap.ticker.remove(tick));

  return { runtime, cleanup: () => unbinds.forEach((fn) => fn()) };
}

/**
 * Builds the master timeline. Callers own the returned object and must call
 * destroy() before rebuilding, or splits will stack up on the same nodes.
 */
export function buildPreview(
  project: DnaProject,
  refs: StageRefs,
  stage: HTMLElement | null,
  onStateChange?: (state: MachineState | null) => void,
  cloneRefs?: CloneRefs,
): BuiltPreview {
  const cleanups: (() => void)[] = [];
  const timeline = gsap.timeline({ paused: true });

  for (const layer of project.layers) {
    const el = refs.get(layer.id);
    if (!el || !layer.visible) continue;

    for (const instance of layer.effects) {
      if (!instance.enabled) continue;
      const preset = getPreset(instance.preset);
      const build = resolveBuild(instance.preset, instance.params);
      if (!preset || !build) continue;

      const clones = cloneRefs?.get(layer.id) ?? [];

      if (preset.kind === "physics") {
        if (stage) cleanups.push(bindPhysics(stage, clones, build));
        continue;
      }

      if (preset.kind === "inertia") {
        if (stage) cleanups.push(bindInertia(el, stage, clones, layer, build));
        continue;
      }

      if (preset.kind === "pointer") {
        if (build.hoverFocus) {
          if (stage) cleanups.push(bindHoverFocus(stage, clones, build));
        } else if (stage) {
          cleanups.push(bindPointer(el, stage, instance));
        }
        continue;
      }

      const mode: SplitMode =
        layer.type === "text" ? (instance.split ?? preset.split ?? "none") : "none";
      const { targets, revert } = splitTargets(el, mode);
      if (mode !== "none") cleanups.push(revert);

      const dur = instance.duration ?? build.duration;
      const vars: gsap.TweenVars = {
        duration: dur,
        ease: build.ease,
        stagger: build.stagger,
        repeat: build.repeat,
        yoyo: build.yoyo,
      };

      if (build.from) {
        timeline.fromTo(
          targets,
          { ...build.from },
          { ...(build.to ?? {}), ...vars, ...zeroed(build.from, build.to) },
          instance.start,
        );
      } else {
        timeline.to(targets, { ...(build.to ?? {}), ...vars }, instance.start);
      }
    }

    // Keyframe tracks go on after the presets, so a hand-authored track wins
    // over a preset touching the same property.
    for (const track of layer.tracks) addTrack(timeline, el, track);
  }

  // An empty timeline has zero duration, which makes the scrubber unusable.
  timeline.set({}, {}, Math.max(project.settings.duration, timeline.duration()));

  cleanups.push(() => {
    timeline.kill();
    // Clear inline transforms GSAP left behind so the next build starts clean.
    for (const layer of project.layers) {
      const el = refs.get(layer.id);
      if (el) gsap.set(el, { clearProps: "all" });
    }
  });

  let runtime: MachineRuntime | null = null;
  if (project.machine?.enabled && project.machine.states.length) {
    const bound = bindMachine(project.machine, timeline, refs, onStateChange);
    runtime = bound.runtime;
    cleanups.push(bound.cleanup);
  }

  return { timeline, runtime, destroy: () => cleanups.forEach((fn) => fn()) };
}

/**
 * `from` vars need explicit end values or GSAP animates back to whatever the
 * element already had — which, after a previous effect on the same layer, is not
 * necessarily the neutral state.
 */
function zeroed(from: Record<string, unknown>, to?: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
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
  for (const key of Object.keys(from)) {
    if (to && key in to) continue;
    if (key in neutral) out[key] = neutral[key];
  }
  return out;
}

/** Total time the composition needs, used to size the timeline ruler. */
export function projectDuration(project: DnaProject): number {
  let end = project.settings.duration;
  for (const layer of project.layers) {
    for (const fx of layer.effects) {
      if (!fx.enabled) continue;
      const preset = getPreset(fx.preset);
      if (!preset || preset.kind === "pointer") continue;
      end = Math.max(end, fx.start + effectDuration(fx.preset, fx.params, fx.duration));
    }
    for (const track of layer.tracks) {
      for (const key of track.keys) end = Math.max(end, key.time);
    }
  }
  return end;
}

/** Applies a layer's static styling — shared by the stage and the exporter. */
export function layerStyle(layer: Layer): React.CSSProperties {
  return {
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: layer.type === "text" ? "auto" : `${layer.width}%`,
    height: layer.type === "text" ? "auto" : `${layer.height}%`,
    transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
    color: layer.color,
    background: layer.type === "box" ? layer.background : undefined,
    fontSize: layer.type === "text" ? `${layer.fontSize}px` : undefined,
    fontWeight: layer.type === "text" ? layer.fontWeight : undefined,
    letterSpacing: layer.type === "text" ? `${layer.letterSpacing}em` : undefined,
    borderRadius: `${layer.radius}px`,
    opacity: layer.opacity / 100,
  };
}
