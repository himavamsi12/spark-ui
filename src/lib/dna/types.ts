/**
 * Interaction DNA — the data model behind the animation studio.
 *
 * A project is a flat list of layers on a stage. Each layer carries a stack of
 * effect instances; each instance points at a preset in the effect registry and
 * holds its own params plus timing. The same model drives both the live preview
 * (lib/dna/engine.ts) and the exported source (lib/dna/codegen.ts), so what you
 * scrub in the timeline is what ships.
 */

import type { StateMachine } from "./machine";
import type { RepeatConfig } from "./layout";

export type ParamValue = string | number | boolean;
export type EffectParams = Record<string, ParamValue>;

/** How a preset drives its target. */
export type EffectKind =
  /** A normal tween placed on the master timeline. */
  | "tween"
  /** Continuous, pointer-driven — magnetic, tilt, cursor parallax. */
  | "pointer"
  /** Scrubbed against scroll position rather than time. */
  | "scroll"
  /**
   * Wheel- and drag-driven with inertia — the pattern most of the existing
   * component library is built on: input adds speed, speed decays toward an
   * idle rate, and the property integrates that speed every frame.
   */
  | "inertia"
  /**
   * Rigid-body simulation. Nothing in a tween can produce collision-driven
   * piling, so these run a real Matter.js world and mirror body positions onto
   * the clones each frame.
   */
  | "physics";

/** Text presets animate the pieces SplitText hands back rather than the node. */
export type SplitMode = "none" | "chars" | "words" | "lines";

export type EffectCategory =
  | "Entrance"
  | "Text"
  | "Scroll"
  | "Inertia"
  | "Physics"
  | "Pointer"
  | "Emphasis"
  | "Exit";

export type EffectParamDef =
  | {
      key: string;
      label: string;
      type: "slider";
      default: number;
      min: number;
      max: number;
      step: number;
      unit?: string;
    }
  | {
      key: string;
      label: string;
      type: "select";
      default: string;
      options: { value: string; label: string }[];
    }
  | { key: string; label: string; type: "toggle"; default: boolean }
  | { key: string; label: string; type: "color"; default: string };

/**
 * What a preset resolves to once its params are applied. Kept deliberately
 * close to GSAP's own vocabulary so codegen is a direct transcription rather
 * than a translation layer.
 */
export type EffectBuild = {
  /** gsap.from() vars — the state the target animates out of. */
  from?: Record<string, ParamValue>;
  /** gsap.to() vars — used when `from` is absent, or for the second half. */
  to?: Record<string, ParamValue>;
  duration: number;
  ease: string;
  /** Per-piece offset when the preset splits text. */
  stagger?: number;
  /** Repeat/yoyo for looping emphasis presets. */
  repeat?: number;
  yoyo?: boolean;
  /** Pointer presets: how hard the target chases the cursor. */
  pointer?: { strength: number; rotate?: number; scale?: number; ease: string };
  /** Inertia presets: how wheel input becomes continuous motion. */
  inertia?: {
    /** Which property the accumulated value is written to. */
    property: "rotation" | "x" | "y";
    /** Speed the system settles back to with no input. */
    idle: number;
    /** How much one wheel notch adds to speed. */
    sensitivity: number;
    /** Per-frame pull back toward `idle`, 0–1. */
    decay: number;
    /** Speed ceiling, so a fast flick can't run away. */
    max: number;
  };
  /**
   * Pointer presets that reach past their own element: scales whatever is
   * hovered and drains saturation/brightness from its siblings.
   */
  hoverFocus?: { scale: number; dim: number };
  /** Physics presets: the world and body settings the clones drop under. */
  physics?: {
    gravity: number;
    restitution: number;
    friction: number;
    /** Fraction of the stage width the spawn points are spread across. */
    spread: number;
    /** Random start rotation, in radians. */
    jitter: number;
    /** Only drop while the stage is hovered, resetting on leave. */
    onHover: boolean;
  };
};

export type EffectPreset = {
  key: string;
  name: string;
  category: EffectCategory;
  kind: EffectKind;
  blurb: string;
  /** Default split granularity; only meaningful for text layers. */
  split?: SplitMode;
  params: EffectParamDef[];
  build: (p: EffectParams) => EffectBuild;
};

/** A preset placed on a layer, with its own params and timing. */
export type EffectInstance = {
  id: string;
  preset: string;
  params: EffectParams;
  /** Seconds from the start of the timeline. Ignored by pointer effects. */
  start: number;
  /** Overrides the preset's natural duration when set. */
  duration?: number;
  split?: SplitMode;
  enabled: boolean;
};

/**
 * Properties a keyframe track can drive. Presets cover the common moves in one
 * click; tracks are the escape hatch for everything a preset can't express —
 * the same split Rive draws between its canned interpolations and raw keys.
 */
export type AnimatableProperty =
  | "x"
  | "y"
  | "scale"
  | "rotation"
  | "rotationX"
  | "rotationY"
  | "skewX"
  | "opacity"
  | "blur"
  | "letterSpacing";

export const ANIMATABLE: {
  key: AnimatableProperty;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  /** Value when the property is untouched, used for the first key. */
  neutral: number;
}[] = [
  { key: "x", label: "Move X", unit: "px", min: -1000, max: 1000, step: 1, neutral: 0 },
  { key: "y", label: "Move Y", unit: "px", min: -1000, max: 1000, step: 1, neutral: 0 },
  { key: "scale", label: "Scale", unit: "", min: 0, max: 4, step: 0.01, neutral: 1 },
  { key: "rotation", label: "Rotate", unit: "°", min: -1080, max: 1080, step: 1, neutral: 0 },
  { key: "rotationX", label: "Rotate X", unit: "°", min: -180, max: 180, step: 1, neutral: 0 },
  { key: "rotationY", label: "Rotate Y", unit: "°", min: -180, max: 180, step: 1, neutral: 0 },
  { key: "skewX", label: "Skew X", unit: "°", min: -80, max: 80, step: 1, neutral: 0 },
  { key: "opacity", label: "Opacity", unit: "", min: 0, max: 1, step: 0.01, neutral: 1 },
  { key: "blur", label: "Blur", unit: "px", min: 0, max: 60, step: 0.5, neutral: 0 },
  { key: "letterSpacing", label: "Tracking", unit: "em", min: -0.2, max: 1, step: 0.01, neutral: 0 },
];

export type Keyframe = {
  id: string;
  /** Seconds on the master timeline. */
  time: number;
  value: number;
  /** Ease used travelling *into* this key, matching how AE and Rive read. */
  ease: string;
};

export type KeyframeTrack = {
  id: string;
  property: AnimatableProperty;
  /** Always kept sorted by time. */
  keys: Keyframe[];
};

export type LayerType = "text" | "box" | "image";

export type Layer = {
  id: string;
  name: string;
  type: LayerType;
  /** Text content, or an image src. Unused for boxes. */
  content: string;
  /** Percentages of the stage, so the preview stays responsive. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  background: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  radius: number;
  opacity: number;
  effects: EffectInstance[];
  /** Per-property keyframes, layered on top of whatever the presets do. */
  tracks: KeyframeTrack[];
  /** Renders the layer as N laid-out clones instead of one element. */
  repeat?: RepeatConfig;
  visible: boolean;
  locked: boolean;
};

export type SmoothScroll = "none" | "lenis" | "locomotive";

/**
 * These compositions are meant to be dropped into a page as a section, so the
 * project carries its own box: how tall it is, and how much scroll it consumes
 * when pinned.
 */
export type HeightMode = "viewport" | "fixed" | "auto";

export type ProjectSettings = {
  name: string;
  /** Timeline length in seconds. */
  duration: number;
  background: string;
  smoothScroll: SmoothScroll;
  /** Wraps scroll effects in ScrollTrigger on export. */
  scrollTrigger: boolean;
  /** ScrollTrigger scrub value; 0 means snap straight to progress. */
  scrub: number;
  /** Pins the stage while scroll effects play. */
  pin: boolean;
  markers: boolean;
  /** Section box. `viewport` is 100vh, `fixed` uses heightPx, `auto` hugs content. */
  heightMode: HeightMode;
  heightPx: number;
  /** With pin on, how many viewport heights of scroll the section consumes. */
  scrollLength: number;
  /** Max content width in px; 0 means full-bleed. */
  maxWidth: number;
};

export type DnaProject = {
  settings: ProjectSettings;
  layers: Layer[];
  /** Optional interactive layer over the timeline; see lib/dna/machine.ts. */
  machine: StateMachine;
};

export const DEFAULT_SETTINGS: ProjectSettings = {
  name: "Untitled Interaction",
  duration: 4,
  background: "#08080a",
  smoothScroll: "lenis",
  scrollTrigger: true,
  scrub: 1,
  pin: false,
  markers: false,
  heightMode: "viewport",
  heightPx: 720,
  scrollLength: 2,
  maxWidth: 0,
};

let idCounter = 0;
/** Ids only need to be unique inside one project, and stable across renders. */
export function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createLayer(type: LayerType, overrides: Partial<Layer> = {}): Layer {
  const base: Layer = {
    id: nextId(type),
    name: type === "text" ? "Text" : type === "image" ? "Image" : "Shape",
    type,
    content: type === "text" ? "Interaction DNA" : type === "image" ? "" : "",
    x: 50,
    y: 50,
    width: type === "text" ? 60 : 24,
    height: type === "text" ? 14 : 24,
    rotation: 0,
    color: "#dad7de",
    background: type === "box" ? "#ff8a3d" : "transparent",
    fontSize: 56,
    fontWeight: 600,
    letterSpacing: 0,
    radius: type === "box" ? 8 : 0,
    opacity: 100,
    effects: [],
    tracks: [],
    visible: true,
    locked: false,
  };
  return { ...base, ...overrides };
}
