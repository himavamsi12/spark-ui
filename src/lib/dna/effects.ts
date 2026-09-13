/**
 * The Interaction DNA preset library.
 *
 * Every preset resolves its params down to an EffectBuild — a plain description
 * in GSAP's own vocabulary. The preview engine feeds that to gsap directly and
 * codegen prints it, so a preset is defined exactly once and can never drift
 * between what you see and what you export.
 */

import type { EffectBuild, EffectParams, EffectPreset } from "./types";

const EASES = [
  { value: "power2.out", label: "Power2 Out" },
  { value: "power3.out", label: "Power3 Out" },
  { value: "power4.out", label: "Power4 Out" },
  { value: "expo.out", label: "Expo Out" },
  { value: "circ.out", label: "Circ Out" },
  { value: "back.out(1.7)", label: "Back Out" },
  { value: "elastic.out(1, 0.4)", label: "Elastic Out" },
  { value: "none", label: "Linear" },
];

const ease = (def = "power3.out") => ({
  key: "ease",
  label: "Ease",
  type: "select" as const,
  default: def,
  options: EASES,
});

const duration = (def = 1, max = 4) => ({
  key: "duration",
  label: "Duration",
  type: "slider" as const,
  default: def,
  min: 0.1,
  max,
  step: 0.05,
  unit: "s",
});

const stagger = (def = 0.04) => ({
  key: "stagger",
  label: "Stagger",
  type: "slider" as const,
  default: def,
  min: 0,
  max: 0.3,
  step: 0.005,
  unit: "s",
});

const num = (p: EffectParams, k: string, fallback = 0) =>
  typeof p[k] === "number" ? (p[k] as number) : fallback;
const str = (p: EffectParams, k: string, fallback = "") =>
  typeof p[k] === "string" ? (p[k] as string) : fallback;
const bool = (p: EffectParams, k: string, fallback = false) =>
  typeof p[k] === "boolean" ? (p[k] as boolean) : fallback;

/** Shared tail every tween preset ends with. */
function timing(p: EffectParams, defDuration = 1): Pick<EffectBuild, "duration" | "ease"> {
  return { duration: num(p, "duration", defDuration), ease: str(p, "ease", "power3.out") };
}

export const EFFECT_PRESETS: EffectPreset[] = [
  // ── Entrance ─────────────────────────────────────────────────────────
  {
    key: "fade-in",
    name: "Fade In",
    category: "Entrance",
    kind: "tween",
    blurb: "The plainest reveal: opacity from zero, nothing else moves.",
    params: [duration(0.8), ease()],
    build: (p) => ({ from: { opacity: 0 }, ...timing(p, 0.8) }),
  },
  {
    key: "slide-in",
    name: "Slide In",
    category: "Entrance",
    kind: "tween",
    blurb: "Travels in from one edge while fading up.",
    params: [
      {
        key: "direction",
        label: "From",
        type: "select",
        default: "bottom",
        options: [
          { value: "bottom", label: "Bottom" },
          { value: "top", label: "Top" },
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
      { key: "distance", label: "Distance", type: "slider", default: 80, min: 10, max: 400, step: 5, unit: "px" },
      duration(1),
      ease(),
    ],
    build: (p) => {
      const d = num(p, "distance", 80);
      const dir = str(p, "direction", "bottom");
      const axis: Record<string, number> =
        dir === "bottom" ? { y: d } : dir === "top" ? { y: -d } : dir === "left" ? { x: -d } : { x: d };
      return { from: { ...axis, opacity: 0 }, ...timing(p) };
    },
  },
  {
    key: "scale-in",
    name: "Scale In",
    category: "Entrance",
    kind: "tween",
    blurb: "Grows into place from a smaller scale, with optional overshoot.",
    params: [
      { key: "scale", label: "From Scale", type: "slider", default: 0.7, min: 0, max: 1.5, step: 0.05 },
      duration(0.9),
      ease("back.out(1.7)"),
    ],
    build: (p) => ({ from: { scale: num(p, "scale", 0.7), opacity: 0 }, ...timing(p, 0.9) }),
  },
  {
    key: "clip-reveal",
    name: "Clip Reveal",
    category: "Entrance",
    kind: "tween",
    blurb: "Wipes in behind a clip-path edge, like a curtain pulling back.",
    params: [
      {
        key: "direction",
        label: "Wipe From",
        type: "select",
        default: "bottom",
        options: [
          { value: "bottom", label: "Bottom" },
          { value: "top", label: "Top" },
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
      duration(1.1),
      ease("expo.out"),
    ],
    build: (p) => {
      const dir = str(p, "direction", "bottom");
      const closed =
        dir === "bottom"
          ? "inset(100% 0% 0% 0%)"
          : dir === "top"
            ? "inset(0% 0% 100% 0%)"
            : dir === "left"
              ? "inset(0% 100% 0% 0%)"
              : "inset(0% 0% 0% 100%)";
      return {
        from: { clipPath: closed },
        to: { clipPath: "inset(0% 0% 0% 0%)" },
        ...timing(p, 1.1),
      };
    },
  },
  {
    key: "flip-in",
    name: "Flip In",
    category: "Entrance",
    kind: "tween",
    blurb: "Rotates in on the X axis with perspective, like a card turning over.",
    params: [
      { key: "angle", label: "Angle", type: "slider", default: 90, min: 15, max: 180, step: 5, unit: "°" },
      duration(1),
      ease("power4.out"),
    ],
    build: (p) => ({
      from: { rotationX: num(p, "angle", 90), transformPerspective: 800, opacity: 0 },
      ...timing(p),
    }),
  },
  {
    key: "blur-in",
    name: "Blur In",
    category: "Entrance",
    kind: "tween",
    blurb: "Resolves out of a soft focus into a sharp edge.",
    params: [
      { key: "blur", label: "From Blur", type: "slider", default: 14, min: 2, max: 40, step: 1, unit: "px" },
      duration(1.2),
      ease("power2.out"),
    ],
    build: (p) => ({
      from: { filter: `blur(${num(p, "blur", 14)}px)`, opacity: 0 },
      to: { filter: "blur(0px)" },
      ...timing(p, 1.2),
    }),
  },

  // ── Text ─────────────────────────────────────────────────────────────
  {
    key: "text-rise",
    name: "Line Rise",
    category: "Text",
    kind: "tween",
    blurb: "Lines lift out from behind a mask, the workhorse editorial reveal.",
    split: "lines",
    params: [
      { key: "distance", label: "Distance", type: "slider", default: 100, min: 20, max: 200, step: 5, unit: "%" },
      duration(1),
      stagger(0.08),
      ease("expo.out"),
    ],
    build: (p) => ({
      from: { yPercent: num(p, "distance", 100), opacity: 0 },
      stagger: num(p, "stagger", 0.08),
      ...timing(p),
    }),
  },
  {
    key: "text-chars",
    name: "Character Cascade",
    category: "Text",
    kind: "tween",
    blurb: "Every character drops in on its own beat.",
    split: "chars",
    params: [
      { key: "distance", label: "Distance", type: "slider", default: 40, min: 5, max: 200, step: 5, unit: "px" },
      { key: "rotate", label: "Rotation", type: "slider", default: 0, min: -90, max: 90, step: 5, unit: "°" },
      duration(0.7),
      stagger(0.025),
      ease("back.out(1.7)"),
    ],
    build: (p) => ({
      from: { y: num(p, "distance", 40), rotation: num(p, "rotate", 0), opacity: 0 },
      stagger: num(p, "stagger", 0.025),
      ...timing(p, 0.7),
    }),
  },
  {
    key: "text-blur-words",
    name: "Word Focus",
    category: "Text",
    kind: "tween",
    blurb: "Words sharpen one after another out of a heavy blur.",
    split: "words",
    params: [
      { key: "blur", label: "From Blur", type: "slider", default: 12, min: 2, max: 40, step: 1, unit: "px" },
      duration(0.9),
      stagger(0.06),
      ease("power3.out"),
    ],
    build: (p) => ({
      from: { filter: `blur(${num(p, "blur", 12)}px)`, opacity: 0 },
      to: { filter: "blur(0px)" },
      stagger: num(p, "stagger", 0.06),
      ...timing(p, 0.9),
    }),
  },
  {
    key: "text-typewriter",
    name: "Typewriter",
    category: "Text",
    kind: "tween",
    blurb: "Characters appear one at a time at a fixed cadence.",
    split: "chars",
    params: [
      { key: "speed", label: "Per Char", type: "slider", default: 0.04, min: 0.01, max: 0.2, step: 0.005, unit: "s" },
    ],
    build: (p) => ({
      from: { opacity: 0 },
      duration: 0.01,
      ease: "none",
      stagger: num(p, "speed", 0.04),
    }),
  },
  {
    key: "text-wave",
    name: "Wave",
    category: "Text",
    kind: "tween",
    blurb: "A sine-like ripple runs through the characters and settles.",
    split: "chars",
    params: [
      { key: "amplitude", label: "Amplitude", type: "slider", default: 24, min: 4, max: 80, step: 2, unit: "px" },
      duration(0.8),
      stagger(0.03),
      ease("elastic.out(1, 0.4)"),
    ],
    build: (p) => ({
      from: { y: -num(p, "amplitude", 24) },
      stagger: num(p, "stagger", 0.03),
      ...timing(p, 0.8),
    }),
  },
  {
    key: "text-scale-words",
    name: "Word Pop",
    category: "Text",
    kind: "tween",
    blurb: "Words punch up from nothing with an elastic overshoot.",
    split: "words",
    params: [
      { key: "scale", label: "From Scale", type: "slider", default: 0.4, min: 0, max: 1, step: 0.05 },
      duration(0.8),
      stagger(0.05),
      ease("back.out(2)"),
    ],
    build: (p) => ({
      from: { scale: num(p, "scale", 0.4), opacity: 0 },
      stagger: num(p, "stagger", 0.05),
      ...timing(p, 0.8),
    }),
  },

  // ── Scroll ───────────────────────────────────────────────────────────
  {
    key: "parallax",
    name: "Parallax",
    category: "Scroll",
    kind: "scroll",
    blurb: "Drifts at a different rate to the page, the depth cue everything else is built on.",
    params: [
      { key: "distance", label: "Travel", type: "slider", default: -160, min: -600, max: 600, step: 10, unit: "px" },
      {
        key: "axis",
        label: "Axis",
        type: "select",
        default: "y",
        options: [
          { value: "y", label: "Vertical" },
          { value: "x", label: "Horizontal" },
        ],
      },
      ease("none"),
    ],
    build: (p) => {
      const d = num(p, "distance", -160);
      const travel: Record<string, number> = str(p, "axis", "y") === "x" ? { x: d } : { y: d };
      return {
        to: travel,
        duration: 1,
        ease: str(p, "ease", "none"),
      };
    },
  },
  {
    key: "scroll-scale",
    name: "Scroll Scale",
    category: "Scroll",
    kind: "scroll",
    blurb: "Grows or shrinks as the section moves through the viewport.",
    params: [
      { key: "scale", label: "To Scale", type: "slider", default: 1.35, min: 0.2, max: 3, step: 0.05 },
      ease("none"),
    ],
    build: (p) => ({ to: { scale: num(p, "scale", 1.35) }, duration: 1, ease: str(p, "ease", "none") }),
  },
  {
    key: "scroll-rotate",
    name: "Scroll Rotate",
    category: "Scroll",
    kind: "scroll",
    blurb: "Spins in step with scroll progress.",
    params: [
      { key: "rotation", label: "Rotation", type: "slider", default: 180, min: -1080, max: 1080, step: 15, unit: "°" },
      ease("none"),
    ],
    build: (p) => ({ to: { rotation: num(p, "rotation", 180) }, duration: 1, ease: str(p, "ease", "none") }),
  },
  {
    key: "scroll-fade",
    name: "Scroll Fade",
    category: "Scroll",
    kind: "scroll",
    blurb: "Fades against scroll progress — the standard hero hand-off.",
    params: [
      { key: "to", label: "To Opacity", type: "slider", default: 0, min: 0, max: 1, step: 0.05 },
      ease("none"),
    ],
    build: (p) => ({ to: { opacity: num(p, "to", 0) }, duration: 1, ease: str(p, "ease", "none") }),
  },
  {
    key: "scroll-horizontal",
    name: "Horizontal Drift",
    category: "Scroll",
    kind: "scroll",
    blurb: "Slides sideways as you scroll down — the base of a horizontal section.",
    params: [
      { key: "distance", label: "Travel", type: "slider", default: -400, min: -1500, max: 1500, step: 20, unit: "px" },
      ease("none"),
    ],
    build: (p) => ({ to: { x: num(p, "distance", -400) }, duration: 1, ease: str(p, "ease", "none") }),
  },

  // ── Pointer ──────────────────────────────────────────────────────────
  {
    key: "magnetic",
    name: "Magnetic",
    category: "Pointer",
    kind: "pointer",
    blurb: "Leans toward the cursor and springs back when it leaves.",
    params: [
      { key: "strength", label: "Strength", type: "slider", default: 0.35, min: 0.05, max: 1.2, step: 0.05 },
      { key: "scale", label: "Hover Scale", type: "slider", default: 1.05, min: 1, max: 1.6, step: 0.05 },
      ease("power3.out"),
    ],
    build: (p) => ({
      duration: 0.6,
      ease: str(p, "ease", "power3.out"),
      pointer: {
        strength: num(p, "strength", 0.35),
        scale: num(p, "scale", 1.05),
        ease: str(p, "ease", "power3.out"),
      },
    }),
  },
  {
    key: "tilt",
    name: "Tilt 3D",
    category: "Pointer",
    kind: "pointer",
    blurb: "Tips on two axes under the cursor, with perspective.",
    params: [
      { key: "rotate", label: "Max Tilt", type: "slider", default: 14, min: 2, max: 45, step: 1, unit: "°" },
      ease("power2.out"),
    ],
    build: (p) => ({
      duration: 0.5,
      ease: str(p, "ease", "power2.out"),
      pointer: { strength: 0, rotate: num(p, "rotate", 14), ease: str(p, "ease", "power2.out") },
    }),
  },
  {
    key: "cursor-parallax",
    name: "Cursor Parallax",
    category: "Pointer",
    kind: "pointer",
    blurb: "Floats against pointer movement across the whole stage, not just on hover.",
    params: [
      { key: "strength", label: "Strength", type: "slider", default: 0.08, min: 0.01, max: 0.5, step: 0.01 },
      ease("power2.out"),
    ],
    build: (p) => ({
      duration: 0.9,
      ease: str(p, "ease", "power2.out"),
      pointer: { strength: num(p, "strength", 0.08), ease: str(p, "ease", "power2.out") },
    }),
  },

  // ── Emphasis ─────────────────────────────────────────────────────────
  {
    key: "float",
    name: "Float",
    category: "Emphasis",
    kind: "tween",
    blurb: "A slow endless bob — the cheapest way to stop a hero feeling dead.",
    params: [
      { key: "distance", label: "Distance", type: "slider", default: 14, min: 2, max: 80, step: 2, unit: "px" },
      duration(2, 8),
      ease("sine.inOut"),
    ],
    build: (p) => ({
      to: { y: `-=${num(p, "distance", 14)}` },
      repeat: -1,
      yoyo: true,
      duration: num(p, "duration", 2),
      ease: str(p, "ease", "sine.inOut"),
    }),
  },
  {
    key: "pulse",
    name: "Pulse",
    category: "Emphasis",
    kind: "tween",
    blurb: "Breathes in scale, forever.",
    params: [
      { key: "scale", label: "Peak Scale", type: "slider", default: 1.08, min: 1, max: 2, step: 0.02 },
      duration(1.2, 6),
      ease("sine.inOut"),
    ],
    build: (p) => ({
      to: { scale: num(p, "scale", 1.08) },
      repeat: -1,
      yoyo: true,
      duration: num(p, "duration", 1.2),
      ease: str(p, "ease", "sine.inOut"),
    }),
  },
  {
    key: "shake",
    name: "Shake",
    category: "Emphasis",
    kind: "tween",
    blurb: "A short nervous jitter, good for alerts and glitch beats.",
    params: [
      { key: "distance", label: "Distance", type: "slider", default: 8, min: 1, max: 40, step: 1, unit: "px" },
      { key: "shakes", label: "Shakes", type: "slider", default: 6, min: 2, max: 20, step: 1 },
      duration(0.5),
    ],
    build: (p) => ({
      to: { x: `+=${num(p, "distance", 8)}` },
      repeat: num(p, "shakes", 6),
      yoyo: true,
      duration: num(p, "duration", 0.5) / Math.max(1, num(p, "shakes", 6)),
      ease: "none",
    }),
  },
  {
    key: "spin",
    name: "Spin",
    category: "Emphasis",
    kind: "tween",
    blurb: "Continuous rotation at a constant rate.",
    params: [duration(6, 20), ease("none")],
    build: (p) => ({
      to: { rotation: 360 },
      repeat: -1,
      duration: num(p, "duration", 6),
      ease: str(p, "ease", "none"),
    }),
  },


  // ── Added from the patterns across the existing component library:
  // masked line reveals, clip wipes, skew-on-scroll and marquee loops. ──
  {
    key: "curtain-in",
    name: "Curtain Open",
    category: "Entrance",
    kind: "tween",
    blurb: "Opens from the centre outward behind a clip edge, like a shutter.",
    params: [duration(1.1), ease("expo.out")],
    build: (p) => ({
      from: { clipPath: "inset(0% 50% 0% 50%)" },
      to: { clipPath: "inset(0% 0% 0% 0%)" },
      ...timing(p, 1.1),
    }),
  },
  {
    key: "skew-in",
    name: "Skew In",
    category: "Entrance",
    kind: "tween",
    blurb: "Slides up with a skew that straightens as it lands.",
    params: [
      { key: "skew", label: "Skew", type: "slider", default: 12, min: -45, max: 45, step: 1, unit: "°" },
      { key: "distance", label: "Distance", type: "slider", default: 60, min: 10, max: 300, step: 5, unit: "px" },
      duration(1),
      ease("power4.out"),
    ],
    build: (p) => ({
      from: { skewY: num(p, "skew", 12), y: num(p, "distance", 60), opacity: 0 },
      to: { skewY: 0 },
      ...timing(p),
    }),
  },
  {
    key: "text-mask-wipe",
    name: "Mask Wipe",
    category: "Text",
    kind: "tween",
    blurb: "Each line is uncovered left to right behind its own mask.",
    split: "lines",
    params: [duration(1), stagger(0.09), ease("power3.inOut")],
    build: (p) => ({
      from: { clipPath: "inset(0% 100% 0% 0%)" },
      to: { clipPath: "inset(0% 0% 0% 0%)" },
      stagger: num(p, "stagger", 0.09),
      ...timing(p),
    }),
  },
  {
    key: "text-char-flip",
    name: "Character Flip",
    category: "Text",
    kind: "tween",
    blurb: "Characters tumble in on the X axis with perspective.",
    split: "chars",
    params: [
      { key: "angle", label: "Angle", type: "slider", default: 90, min: 20, max: 180, step: 5, unit: "°" },
      duration(0.8),
      stagger(0.02),
      ease("back.out(1.4)"),
    ],
    build: (p) => ({
      from: { rotationX: num(p, "angle", 90), transformPerspective: 600, opacity: 0 },
      stagger: num(p, "stagger", 0.02),
      ...timing(p, 0.8),
    }),
  },
  {
    key: "scroll-skew",
    name: "Scroll Skew",
    category: "Scroll",
    kind: "scroll",
    blurb: "Leans as the section travels, the classic velocity-skew cue.",
    params: [
      { key: "skew", label: "Skew", type: "slider", default: 8, min: -45, max: 45, step: 1, unit: "°" },
      ease("none"),
    ],
    build: (p) => ({
      from: { skewY: -num(p, "skew", 8) },
      to: { skewY: num(p, "skew", 8) },
      duration: 1,
      ease: str(p, "ease", "none"),
    }),
  },
  {
    key: "scroll-blur",
    name: "Scroll Blur",
    category: "Scroll",
    kind: "scroll",
    blurb: "Defocuses as it leaves, so depth falls away with distance.",
    params: [
      { key: "blur", label: "To Blur", type: "slider", default: 10, min: 0, max: 40, step: 1, unit: "px" },
      ease("none"),
    ],
    build: (p) => ({
      from: { filter: "blur(0px)" },
      to: { filter: `blur(${num(p, "blur", 10)}px)` },
      duration: 1,
      ease: str(p, "ease", "none"),
    }),
  },
  {
    key: "scroll-clip",
    name: "Scroll Reveal",
    category: "Scroll",
    kind: "scroll",
    blurb: "Uncovers behind a clip edge as the section scrolls through.",
    params: [ease("none")],
    build: (p) => ({
      from: { clipPath: "inset(50% 0% 50% 0%)" },
      to: { clipPath: "inset(0% 0% 0% 0%)" },
      duration: 1,
      ease: str(p, "ease", "none"),
    }),
  },
  {
    key: "marquee",
    name: "Marquee Loop",
    category: "Emphasis",
    kind: "tween",
    blurb: "Slides sideways forever — pair two copies for a seamless ticker.",
    params: [
      {
        key: "direction",
        label: "Direction",
        type: "select",
        default: "left",
        options: [
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
      duration(8, 30),
    ],
    build: (p) => ({
      from: { xPercent: str(p, "direction", "left") === "left" ? 0 : -100 },
      to: { xPercent: str(p, "direction", "left") === "left" ? -100 : 0 },
      repeat: -1,
      duration: num(p, "duration", 8),
      ease: "none",
    }),
  },
  {
    key: "repel",
    name: "Repel",
    category: "Pointer",
    kind: "pointer",
    blurb: "Backs away from the cursor instead of chasing it.",
    params: [
      { key: "strength", label: "Strength", type: "slider", default: 0.3, min: 0.05, max: 1.2, step: 0.05 },
      ease("power3.out"),
    ],
    build: (p) => ({
      duration: 0.7,
      ease: str(p, "ease", "power3.out"),
      pointer: { strength: -num(p, "strength", 0.3), ease: str(p, "ease", "power3.out") },
    }),
  },


  // ── Inertia ──────────────────────────────────────────────────────────
  // The wheel-driven loop the existing library leans on: input adds speed,
  // speed decays back toward an idle rate, and the property integrates it.
  {
    key: "wheel-spin",
    name: "Wheel Spin",
    category: "Inertia",
    kind: "inertia",
    blurb: "Turns forever at an idle rate; the wheel shoves it faster and it eases back.",
    params: [
      { key: "idle", label: "Idle Speed", type: "slider", default: 0.12, min: 0, max: 2, step: 0.01, unit: "°/f" },
      { key: "sensitivity", label: "Wheel Push", type: "slider", default: 0.55, min: 0.05, max: 3, step: 0.05 },
      { key: "decay", label: "Settle", type: "slider", default: 0.05, min: 0.005, max: 0.4, step: 0.005 },
      { key: "max", label: "Max Speed", type: "slider", default: 2.5, min: 0.5, max: 12, step: 0.1, unit: "°/f" },
    ],
    build: (p) => ({
      duration: 0,
      ease: "none",
      inertia: {
        property: "rotation",
        idle: num(p, "idle", 0.12),
        sensitivity: num(p, "sensitivity", 0.55),
        decay: num(p, "decay", 0.05),
        max: num(p, "max", 2.5),
      },
    }),
  },
  {
    key: "wheel-drift",
    name: "Wheel Drift",
    category: "Inertia",
    kind: "inertia",
    blurb: "Slides sideways under the wheel and coasts to a stop — the infinite-slider feel.",
    params: [
      {
        key: "axis",
        label: "Axis",
        type: "select",
        default: "x",
        options: [
          { value: "x", label: "Horizontal" },
          { value: "y", label: "Vertical" },
        ],
      },
      { key: "idle", label: "Idle Speed", type: "slider", default: 0, min: 0, max: 6, step: 0.1, unit: "px/f" },
      { key: "sensitivity", label: "Wheel Push", type: "slider", default: 1.4, min: 0.1, max: 8, step: 0.1 },
      { key: "decay", label: "Settle", type: "slider", default: 0.08, min: 0.005, max: 0.4, step: 0.005 },
      { key: "max", label: "Max Speed", type: "slider", default: 22, min: 2, max: 80, step: 1, unit: "px/f" },
    ],
    build: (p) => ({
      duration: 0,
      ease: "none",
      inertia: {
        property: str(p, "axis", "x") === "y" ? "y" : "x",
        idle: num(p, "idle", 0),
        sensitivity: num(p, "sensitivity", 1.4),
        decay: num(p, "decay", 0.08),
        max: num(p, "max", 22),
      },
    }),
  },
  {
    key: "hover-focus",
    name: "Hover Focus",
    category: "Pointer",
    kind: "pointer",
    blurb: "Lifts whatever the cursor is over and drains the colour from everything beside it.",
    params: [
      { key: "scale", label: "Hover Scale", type: "slider", default: 1.1, min: 1, max: 2, step: 0.05 },
      { key: "dim", label: "Dim Others", type: "slider", default: 65, min: 0, max: 100, step: 5, unit: "%" },
    ],
    build: (p) => ({
      duration: 1,
      ease: "expo.out",
      hoverFocus: { scale: num(p, "scale", 1.1), dim: num(p, "dim", 65) },
    }),
  },


  // ── Physics ──────────────────────────────────────────────────────────
  {
    key: "physics-drop",
    name: "Physics Drop",
    category: "Physics",
    kind: "physics",
    blurb: "Clones fall as real rigid bodies, colliding with the floor and each other until they settle.",
    params: [
      { key: "gravity", label: "Gravity", type: "slider", default: 2, min: 0.2, max: 6, step: 0.1 },
      { key: "restitution", label: "Bounce", type: "slider", default: 0.15, min: 0, max: 1, step: 0.05 },
      { key: "friction", label: "Friction", type: "slider", default: 0.6, min: 0, max: 1, step: 0.05 },
      { key: "spread", label: "Spread", type: "slider", default: 50, min: 10, max: 100, step: 5, unit: "%" },
      { key: "jitter", label: "Tilt Spread", type: "slider", default: 0.4, min: 0, max: 1.5, step: 0.05, unit: "rad" },
      { key: "onHover", label: "Drop On Hover", type: "toggle", default: true },
    ],
    build: (p) => ({
      duration: 0,
      ease: "none",
      physics: {
        gravity: num(p, "gravity", 2),
        restitution: num(p, "restitution", 0.15),
        friction: num(p, "friction", 0.6),
        spread: num(p, "spread", 50) / 100,
        jitter: num(p, "jitter", 0.4),
        onHover: bool(p, "onHover", true),
      },
    }),
  },

  // ── Exit ─────────────────────────────────────────────────────────────
  {
    key: "fade-out",
    name: "Fade Out",
    category: "Exit",
    kind: "tween",
    blurb: "Opacity to zero, holding position.",
    params: [duration(0.6), ease("power2.in")],
    build: (p) => ({ to: { opacity: 0 }, ...timing(p, 0.6) }),
  },
  {
    key: "slide-out",
    name: "Slide Out",
    category: "Exit",
    kind: "tween",
    blurb: "Leaves toward an edge while fading.",
    params: [
      {
        key: "direction",
        label: "Toward",
        type: "select",
        default: "top",
        options: [
          { value: "top", label: "Top" },
          { value: "bottom", label: "Bottom" },
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
      { key: "distance", label: "Distance", type: "slider", default: 80, min: 10, max: 400, step: 5, unit: "px" },
      duration(0.7),
      ease("power2.in"),
    ],
    build: (p) => {
      const d = num(p, "distance", 80);
      const dir = str(p, "direction", "top");
      const axis: Record<string, number> =
        dir === "top" ? { y: -d } : dir === "bottom" ? { y: d } : dir === "left" ? { x: -d } : { x: d };
      return { to: { ...axis, opacity: 0 }, ...timing(p, 0.7) };
    },
  },
  {
    key: "clip-hide",
    name: "Clip Out",
    category: "Exit",
    kind: "tween",
    blurb: "Wipes away behind a clip-path edge.",
    params: [
      {
        key: "direction",
        label: "Wipe To",
        type: "select",
        default: "top",
        options: [
          { value: "top", label: "Top" },
          { value: "bottom", label: "Bottom" },
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
      duration(0.8),
      ease("expo.in"),
    ],
    build: (p) => {
      const dir = str(p, "direction", "top");
      const closed =
        dir === "top"
          ? "inset(0% 0% 100% 0%)"
          : dir === "bottom"
            ? "inset(100% 0% 0% 0%)"
            : dir === "left"
              ? "inset(0% 100% 0% 0%)"
              : "inset(0% 0% 0% 100%)";
      return { to: { clipPath: closed }, ...timing(p, 0.8) };
    },
  },
];

export const EFFECT_CATEGORIES = [
  "Entrance",
  "Text",
  "Scroll",
  "Inertia",
  "Physics",
  "Pointer",
  "Emphasis",
  "Exit",
] as const;

const BY_KEY = new Map(EFFECT_PRESETS.map((p) => [p.key, p]));

export function getPreset(key: string): EffectPreset | undefined {
  return BY_KEY.get(key);
}

export function presetDefaults(preset: EffectPreset): EffectParams {
  const out: EffectParams = {};
  for (const p of preset.params) out[p.key] = p.default;
  return out;
}

/** The build with the instance's params merged over the preset defaults. */
export function resolveBuild(presetKey: string, params: EffectParams): EffectBuild | null {
  const preset = getPreset(presetKey);
  if (!preset) return null;
  return preset.build({ ...presetDefaults(preset), ...params });
}

/** Natural length of an instance, used for laying clips out on the timeline. */
export function effectDuration(presetKey: string, params: EffectParams, override?: number): number {
  if (typeof override === "number") return override;
  const build = resolveBuild(presetKey, params);
  if (!build) return 1;
  const staggerTotal = (build.stagger ?? 0) * 12; // assume ~12 pieces for layout
  // Looping presets get a nominal clip length; they run past it regardless.
  if (build.repeat === -1) return Math.min(build.duration * 2, 4);
  return build.duration + staggerTotal;
}

export { bool as paramBool, num as paramNum, str as paramStr };
