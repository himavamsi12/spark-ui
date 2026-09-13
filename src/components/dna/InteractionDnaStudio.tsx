"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  ImagePlus,
  Square,
  Trash2,
  Type,
  Layers,
  Undo2,
} from "lucide-react";
import EffectLibrary from "./EffectLibrary";
import Inspector from "./Inspector";
import DnaTimeline from "./DnaTimeline";
import DnaExportModal from "./DnaExportModal";
import StateMachinePanel from "./StateMachinePanel";
import { buildPreview, projectDuration, type BuiltPreview } from "@/lib/dna/engine";
import {
  cloneIndices,
  cloneLabel,
  cloneSource,
  cloneTransform,
  DEFAULT_REPEAT,
} from "@/lib/dna/layout";
import { presetDefaults } from "@/lib/dna/effects";
import { moveKey, removeTrack, upsertKey } from "@/lib/dna/keyframes";
import {
  createInput,
  createListener,
  createState,
  createTransition,
  emptyMachine,
} from "@/lib/dna/machine";
import type { MachineState, StateMachine } from "@/lib/dna/machine";
import {
  DEFAULT_SETTINGS,
  createLayer,
  nextId,
  type DnaProject,
  type EffectInstance,
  type Layer,
  type LayerType,
  type ProjectSettings,
  type AnimatableProperty,
  type EffectParams,
  type SplitMode,
} from "@/lib/dna/types";
import type { EffectPreset } from "@/lib/dna/types";

/** A small scene so the studio is never a blank page on first open. */
/** Terser helpers for building the demo scene below. */
function fx(preset: string, start: number, params: EffectParams = {}, split?: SplitMode) {
  return { id: nextId("fx"), preset, params, start, split, enabled: true };
}
function track(property: AnimatableProperty, keys: [number, number, string?][]) {
  return {
    id: nextId("track"),
    property,
    keys: keys.map(([time, value, ease]) => ({
      id: nextId("k"),
      time,
      value,
      ease: ease ?? "power2.out",
    })),
  };
}

/**
 * The scene the studio opens on. It's a worked example rather than a
 * placeholder: every effect kind is represented (timeline tweens, a scroll
 * scrub, two pointer behaviours) alongside hand-authored keyframe tracks, so
 * opening the tool shows what it can do and gives you something to pull apart.
 */
function starterProject(): DnaProject {
  // Soft bloom behind the type. Keyframed rather than tweened so the blur and
  // scale can drift on their own curve, independent of any preset.
  const glow = createLayer("box", {
    name: "Glow",
    x: 50,
    y: 43,
    width: 52,
    height: 24,
    background: "#ff8a3d",
    radius: 400,
    opacity: 22,
  });
  glow.tracks = [
    track("blur", [
      [0, 60],
      [1.6, 34, "power2.out"],
      [4.5, 46, "sine.inOut"],
    ]),
    track("scale", [
      [0, 0.6],
      [1.8, 1, "expo.out"],
      [5, 1.12, "sine.inOut"],
    ]),
    track("opacity", [
      [0, 0],
      [1.2, 1, "power2.out"],
    ]),
  ];

  const eyebrow = createLayer("text", {
    name: "Eyebrow",
    content: "SPARK UI — INTERACTION DNA",
    x: 50,
    y: 27,
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 0.32,
    color: "#8b8e9c",
  });
  eyebrow.effects = [fx("text-chars", 0.15, { stagger: 0.015 }, "chars")];

  const title = createLayer("text", {
    name: "Headline",
    content: "Motion that\nexplains itself",
    x: 50,
    y: 43,
    fontSize: 82,
    fontWeight: 700,
    letterSpacing: -0.03,
  });
  title.effects = [fx("text-rise", 0.4, {}, "lines")];
  // A slow lift on top of the reveal — the parallax drift you'd normally have
  // to hand-write after the fact.
  title.tracks = [track("y", [[0.4, 0], [5.5, -34, "none"]])];

  const sub = createLayer("text", {
    name: "Subtitle",
    content: "Compose it once. Export the GSAP.",
    x: 50,
    y: 57,
    fontSize: 19,
    fontWeight: 400,
    color: "#aeaac0",
  });
  sub.effects = [fx("text-blur-words", 1.25, {}, "words")];

  const rule = createLayer("box", {
    name: "Rule",
    x: 50,
    y: 65,
    width: 9,
    height: 0.5,
    background: "#ff8a3d",
    radius: 2,
  });
  rule.effects = [fx("clip-reveal", 1.7, { direction: "left" }), fx("magnetic", 0, { strength: 0.5 })];

  // A card that leans under the cursor and drifts on scroll — the two
  // behaviours that can't live on a timeline, shown side by side.
  const card = createLayer("box", {
    name: "Card",
    x: 50,
    y: 83,
    width: 22,
    height: 13,
    background: "#17171c",
    radius: 12,
  });
  card.effects = [
    fx("scale-in", 1.9, { scale: 0.82 }),
    fx("tilt", 0, { rotate: 18 }),
    fx("parallax", 0, { distance: -70 }),
  ];
  card.tracks = [track("rotation", [[1.9, -6], [4, 0, "expo.out"]])];

  // A small state machine over the same timeline: play the reveal once, settle
  // into a looping idle, and let a click on the card replay it. This is the
  // piece that makes the composition interactive rather than linear.
  const replay = createInput("replay", "trigger");
  const intro = createState("Intro", 0, 3.2);
  const idle = createState("Idle", 3.2, 6);
  idle.loop = true;

  const settle = createTransition(intro.id, idle.id);
  settle.exitTime = 1; // let the reveal finish before settling
  settle.duration = 0;

  const restart = createTransition("any", intro.id);
  restart.conditions = [{ id: nextId("cond"), input: replay.id, op: "fired", value: 1 }];

  const onCardClick = createListener(card.id, replay.id);
  onCardClick.event = "click";
  onCardClick.action = "fire";

  return {
    settings: { ...DEFAULT_SETTINGS, name: "Aurora Hero", duration: 6 },
    layers: [glow, eyebrow, title, sub, rule, card],
    machine: {
      enabled: true,
      inputs: [replay],
      states: [intro, idle],
      transitions: [settle, restart],
      listeners: [onCardClick],
      initial: intro.id,
    },
  };
}

/**
 * Circular Gallery, rebuilt with the tool's own primitives.
 *
 * This is the component from the library expressed as a project: one repeating
 * image layer laid out on a tilted ellipse, spun by wheel inertia, with hover
 * focus lifting whatever is under the cursor and dimming the rest. It's the
 * case that drove the repeat, inertia and hover-focus features — if it can be
 * built here, the tool covers the library's hardest pattern.
 */
function circularGalleryProject(): DnaProject {
  const ring = createLayer("image", {
    name: "Ring",
    content: "/circular-gallery/img1.jpg",
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    radius: 6,
  });
  ring.repeat = {
    ...DEFAULT_REPEAT,
    count: 12,
    layout: "ring",
    // Sized so the whole oval clears a default 16:9 stage — the original
    // component measures its container instead, which a fixed project can't.
    radiusX: 330,
    radiusY: 128,
    tilt: -18,
    itemWidth: 148,
    itemHeight: 98,
    // One picture per clone, the same set the original component ships with.
    sources: Array.from({ length: 12 }, (_, i) => `/circular-gallery/img${i + 1}.jpg`),
  };
  ring.effects = [
    fx("wheel-spin", 0, { idle: 0.12, sensitivity: 0.55, decay: 0.05, max: 2.5 }),
    fx("hover-focus", 0, { scale: 1.12, dim: 65 }),
  ];

  const badge = createLayer("text", {
    name: "Badge",
    content: "SPARK UI",
    x: 50,
    y: 50,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.22,
    color: "#aeaac0",
  });
  badge.effects = [fx("fade-in", 0.3)];

  return {
    settings: {
      ...DEFAULT_SETTINGS,
      name: "Circular Gallery",
      duration: 3,
      smoothScroll: "none",
      scrollTrigger: false,
    },
    layers: [ring, badge],
    machine: emptyMachine(),
  };
}

/**
 * Physics Tag Hover, rebuilt from the tool's primitives.
 *
 * The library component drops pill tags into a Matter.js world on hover; here
 * that's one repeating text layer carrying a label per clone, with a Physics
 * Drop effect providing the world. Hover the stage to drop them, leave to reset.
 */
function physicsTagsProject(): DnaProject {
  const tags = createLayer("text", {
    name: "Tags",
    content: "Tag",
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    fontSize: 17,
    fontWeight: 400,
    color: "#ffffd9",
    radius: 64,
  });
  tags.repeat = {
    ...DEFAULT_REPEAT,
    count: 10,
    layout: "ring",
    // Physics takes over placement the moment it starts, so the resting layout
    // only decides where the pills sit before the first hover.
    radiusX: 300,
    radiusY: 90,
    tilt: 0,
    labels: [
      "Art Direction",
      "Motion",
      "Branding",
      "3D",
      "Type",
      "Interaction",
      "Systems",
      "Web",
      "Identity",
      "Sound",
    ],
  };
  tags.effects = [
    fx("physics-drop", 0, {
      gravity: 2,
      restitution: 0.15,
      friction: 0.6,
      spread: 50,
      jitter: 0.4,
      onHover: true,
    }),
  ];

  // The name sits low so the tags land on top of it, the way they pile onto
  // the service word in the source component.
  const heading = createLayer("text", {
    name: "Service",
    content: "DESIGN",
    x: 50,
    y: 62,
    fontSize: 132,
    fontWeight: 700,
    letterSpacing: 0.02,
    color: "#ff3831",
  });
  heading.effects = [fx("text-rise", 0.1, {}, "lines")];

  const hint = createLayer("text", {
    name: "Hint",
    content: "hover the stage to drop the tags",
    x: 50,
    y: 14,
    fontSize: 13,
    fontWeight: 400,
    color: "#8b8e9c",
  });
  hint.effects = [fx("fade-in", 0.6)];

  return {
    settings: {
      ...DEFAULT_SETTINGS,
      name: "Physics Tags",
      duration: 3,
      background: "#171717",
      smoothScroll: "none",
      scrollTrigger: false,
    },
    layers: [heading, hint, tags],
    machine: emptyMachine(),
  };
}

const DEMOS: { key: string; label: string; blurb: string; build: () => DnaProject }[] = [
  {
    key: "aurora",
    label: "Aurora Hero",
    blurb: "Keyframed glow, masked text reveals, pointer and scroll effects, driven by a state machine.",
    build: starterProject,
  },
  {
    key: "gallery",
    label: "Circular Gallery",
    blurb: "12 clones on a tilted ellipse, spun by wheel inertia, with hover focus dimming the rest.",
    build: circularGalleryProject,
  },
  {
    key: "physics",
    label: "Physics Tags",
    blurb: "Pill tags dropped into a Matter.js world on hover — they collide, tumble and pile up.",
    build: physicsTagsProject,
  },
];

export default function InteractionDnaStudio() {
  const [project, setProject] = useState<DnaProject>(starterProject);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showExport, setShowExport] = useState(false);
  /** One step of undo covers the destructive actions (delete layer/effect). */
  const [undoSnapshot, setUndoSnapshot] = useState<DnaProject | null>(null);
  /**
   * A React-visible copy of the playhead. Deliberately only synced when the
   * transport settles — during playback the head is painted straight to the DOM
   * so the inspector and timeline don't re-render every frame.
   */
  const [uiTime, setUiTime] = useState(0);
  const [panel, setPanel] = useState<"inspect" | "states">("inspect");
  /** Mirrors the running machine so the panel can flag the live state. */
  const [activeState, setActiveState] = useState<MachineState | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Map<string, HTMLElement>>(new Map());
  /** Clone nodes for repeating layers, handed to the engine to drive. */
  const cloneRefs = useRef<Map<string, HTMLElement[]>>(new Map());
  const previewRef = useRef<BuiltPreview | null>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const timeLabelRef = useRef<HTMLSpanElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** The opening scene plays itself once; after that the transport is yours. */
  const autoPlayedRef = useRef(false);
  /** Survives rebuilds so tweaking a param doesn't snap the stage back to 0. */
  const timeRef = useRef(0);

  const duration = useMemo(() => projectDuration(project), [project]);
  // Mirrored into a ref so the imperative playhead painter can read the
  // current length without being re-created on every duration change.
  const durationRef = useRef(duration);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const selectedLayer = project.layers.find((l) => l.id === selectedLayerId) ?? null;
  const selectedEffect =
    selectedLayer?.effects.find((f) => f.id === selectedEffectId) ?? null;

  const paint = useCallback((time: number) => {
    const ratio = durationRef.current ? time / durationRef.current : 0;
    if (playheadRef.current) playheadRef.current.style.left = `${Math.min(1, ratio) * 100}%`;
    if (timeLabelRef.current) {
      timeLabelRef.current.textContent = `${time.toFixed(2)} / ${durationRef.current.toFixed(2)}s`;
    }
  }, []);

  // Rebuild the timeline whenever the composition changes. Coalesced through a
  // frame so dragging a slider doesn't re-split text on every input event.
  useEffect(() => {
    let raf = 0;
    raf = requestAnimationFrame(() => {
      previewRef.current?.destroy();
      const built = buildPreview(
        project,
        layerRefs.current,
        stageRef.current,
        setActiveState,
        cloneRefs.current,
      );
      previewRef.current = built;
      built.timeline.eventCallback("onUpdate", () => {
        timeRef.current = built.timeline.time();
        paint(timeRef.current);
      });
      built.timeline.eventCallback("onComplete", () => {
        setPlaying(false);
        setUiTime(built.timeline.time());
      });
      built.timeline.seek(Math.min(timeRef.current, built.timeline.duration()));
      paint(built.timeline.time());
      // With a machine running, it owns the transport — starting playback here
      // too would fight it for the playhead.
      if (built.runtime) {
        setPlaying(true);
      } else if (!autoPlayedRef.current) {
        // At t=0 every entrance effect sits at its "from" state, so a still
        // stage reads as broken. Playing the first build through shows what it is.
        autoPlayedRef.current = true;
        built.timeline.play();
        setPlaying(true);
      } else if (playing) {
        built.timeline.play();
      }
    });
    return () => {
      cancelAnimationFrame(raf);
    };
    // `playing` is deliberately excluded: play/pause is driven imperatively
    // below, and including it here would rebuild the whole scene on every
    // transport press.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, paint]);

  // Tear the last build down when the studio unmounts.
  useEffect(() => () => previewRef.current?.destroy(), []);

  function togglePlay() {
    const tl = previewRef.current?.timeline;
    if (!tl) return;
    if (playing) {
      tl.pause();
      setPlaying(false);
      setUiTime(tl.time());
    } else {
      // Restart from the top when the playhead is already parked at the end.
      if (tl.time() >= tl.duration() - 0.01) tl.seek(0);
      tl.play();
      setPlaying(true);
    }
  }

  function restart() {
    const tl = previewRef.current?.timeline;
    if (!tl) return;
    tl.seek(0);
    timeRef.current = 0;
    setUiTime(0);
    paint(0);
  }

  function seekRatio(ratio: number) {
    const tl = previewRef.current?.timeline;
    if (!tl) return;
    tl.pause();
    setPlaying(false);
    const t = ratio * duration;
    tl.seek(Math.min(t, tl.duration()));
    timeRef.current = t;
    setUiTime(t);
    paint(t);
  }

  // ── Project mutation ────────────────────────────────────────────────
  const patchLayer = useCallback((layerId: string, patch: Partial<Layer>) => {
    setProject((p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
    }));
  }, []);

  const patchEffect = useCallback(
    (layerId: string, effectId: string, patch: Partial<EffectInstance>) => {
      setProject((p) => ({
        ...p,
        layers: p.layers.map((l) =>
          l.id === layerId
            ? { ...l, effects: l.effects.map((f) => (f.id === effectId ? { ...f, ...patch } : f)) }
            : l,
        ),
      }));
    },
    [],
  );

  function addLayer(type: LayerType) {
    const layer = createLayer(type, {
      name: type === "text" ? "Text" : type === "image" ? "Image" : "Shape",
      y: 50 + (project.layers.length % 3) * 6,
    });
    setProject((p) => ({ ...p, layers: [...p.layers, layer] }));
    setSelectedLayerId(layer.id);
    setSelectedEffectId(null);
  }

  function addEffect(preset: EffectPreset) {
    if (!selectedLayer) return;
    const instance: EffectInstance = {
      id: nextId("fx"),
      preset: preset.key,
      params: presetDefaults(preset),
      // New clips land at the playhead, which is where you're looking.
      start: preset.kind === "pointer" ? 0 : Math.round(timeRef.current * 20) / 20,
      split: selectedLayer.type === "text" ? (preset.split ?? "none") : undefined,
      enabled: true,
    };
    setProject((p) => ({
      ...p,
      layers: p.layers.map((l) =>
        l.id === selectedLayer.id ? { ...l, effects: [...l.effects, instance] } : l,
      ),
    }));
    setSelectedEffectId(instance.id);
  }

  function removeEffect(effectId: string) {
    if (!selectedLayer) return;
    setUndoSnapshot(project);
    patchLayerEffects(selectedLayer.id, (fx) => fx.filter((f) => f.id !== effectId));
    if (selectedEffectId === effectId) setSelectedEffectId(null);
  }

  function duplicateEffect(effectId: string) {
    if (!selectedLayer) return;
    const source = selectedLayer.effects.find((f) => f.id === effectId);
    if (!source) return;
    const copy: EffectInstance = { ...source, id: nextId("fx"), params: { ...source.params } };
    patchLayerEffects(selectedLayer.id, (fx) => {
      const i = fx.findIndex((f) => f.id === effectId);
      return [...fx.slice(0, i + 1), copy, ...fx.slice(i + 1)];
    });
    setSelectedEffectId(copy.id);
  }

  function patchLayerEffects(layerId: string, fn: (fx: EffectInstance[]) => EffectInstance[]) {
    setProject((p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === layerId ? { ...l, effects: fn(l.effects) } : l)),
    }));
  }

  function deleteLayer() {
    if (!selectedLayer) return;
    setUndoSnapshot(project);
    layerRefs.current.delete(selectedLayer.id);
    setProject((p) => ({ ...p, layers: p.layers.filter((l) => l.id !== selectedLayer.id) }));
    setSelectedLayerId(null);
    setSelectedEffectId(null);
  }

  function undo() {
    if (!undoSnapshot) return;
    setProject(undoSnapshot);
    setUndoSnapshot(null);
  }

  /** Writes a key for `property` at the playhead on the selected layer. */
  function setKey(property: AnimatableProperty, value: number) {
    if (!selectedLayer) return;
    const tracks = upsertKey(selectedLayer, property, uiTime, value);
    patchLayer(selectedLayer.id, { tracks });
  }

  function clearProperty(property: AnimatableProperty) {
    if (!selectedLayer) return;
    patchLayer(selectedLayer.id, { tracks: removeTrack(selectedLayer, property) });
  }

  function loadDemo(demo: (typeof DEMOS)[number]) {
    setUndoSnapshot(project);
    // Clone/layer refs point at nodes from the outgoing scene; keeping them
    // would leave the next build driving elements that no longer exist.
    cloneRefs.current.clear();
    layerRefs.current.clear();
    setProject(demo.build());
    setSelectedLayerId(null);
    setSelectedEffectId(null);
    timeRef.current = 0;
    setUiTime(0);
    autoPlayedRef.current = false;
  }

  function patchMachine(patch: Partial<StateMachine>) {
    setProject((p) => ({ ...p, machine: { ...(p.machine ?? emptyMachine()), ...patch } }));
  }

  function patchSettings(patch: Partial<ProjectSettings>) {
    setProject((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
  }

  /** Drag a layer around the stage; positions stay in stage percentages. */
  function startLayerDrag(e: React.PointerEvent, layer: Layer) {
    e.stopPropagation();
    setSelectedLayerId(layer.id);
    setSelectedEffectId(null);
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = layer.x;
    const originY = layer.y;

    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      patchLayer(layer.id, {
        x: Math.min(100, Math.max(0, Math.round((originX + dx) * 10) / 10)),
        y: Math.min(100, Math.max(0, Math.round((originY + dy) * 10) / 10)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /**
   * Images are read straight to a data: URL — no upload endpoint needed, and the
   * project JSON stays self-contained when exported.
   */
  function pickImage(file: File, layerId: string) {
    const reader = new FileReader();
    reader.onload = () => patchLayer(layerId, { content: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function addImageLayer(file: File) {
    const layer = createLayer("image", { name: file.name.replace(/\.[^.]+$/, "") || "Image" });
    setProject((p) => ({ ...p, layers: [...p.layers, layer] }));
    setSelectedLayerId(layer.id);
    setSelectedEffectId(null);
    pickImage(file, layer.id);
  }

  const setLayerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) layerRefs.current.set(id, el);
    else layerRefs.current.delete(id);
  }, []);

  const setCloneRef = useCallback((id: string, index: number, el: HTMLElement | null) => {
    const list = cloneRefs.current.get(id) ?? [];
    if (el) list[index] = el;
    cloneRefs.current.set(
      id,
      list.filter(Boolean),
    );
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="h-11 shrink-0 border-b border-border flex items-center gap-2 px-3">
        <span className="flex items-center gap-1.5 text-xs text-chalk font-medium">
          <Layers size={13} className="text-accent" />
          Interaction DNA
        </span>
        <span className="w-px h-4 bg-border mx-1" />
        {(
          [
            { type: "text" as const, icon: Type, label: "Text" },
            { type: "box" as const, icon: Square, label: "Shape" },
          ]
        ).map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => addLayer(type)}
            className="flex items-center gap-1.5 text-[11px] border border-border rounded-pills px-2.5 py-1.5 text-pearl hover:border-pearl/40 hover:text-chalk transition-colors"
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-[11px] border border-border rounded-pills px-2.5 py-1.5 text-pearl hover:border-pearl/40 hover:text-chalk transition-colors"
        >
          <ImagePlus size={12} />
          Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) addImageLayer(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={deleteLayer}
          disabled={!selectedLayer}
          className="flex items-center gap-1.5 text-[11px] border border-border rounded-pills px-2.5 py-1.5 text-pearl hover:border-pearl/40 hover:text-chalk disabled:opacity-40 disabled:hover:border-border transition-colors"
        >
          <Trash2 size={12} />
          Delete
        </button>
        <button
          onClick={undo}
          disabled={!undoSnapshot}
          title="Undo the last delete"
          className="flex items-center gap-1.5 text-[11px] border border-border rounded-pills px-2.5 py-1.5 text-pearl hover:border-pearl/40 hover:text-chalk disabled:opacity-40 disabled:hover:border-border transition-colors"
        >
          <Undo2 size={12} />
          Undo
        </button>

        {/* Demos sit in the toolbar as plain buttons rather than behind a
            picker — they're the fastest way to see what the tool can do, so
            they shouldn't take a menu to find. */}
        <span className="ml-auto flex items-center gap-1.5 mr-2">
          <span className="text-[10px] uppercase tracking-wide text-muted">Demos</span>
          {DEMOS.map((d) => (
            <button
              key={d.key}
              onClick={() => loadDemo(d)}
              title={d.blurb}
              className={`text-[11px] border rounded-pills px-2.5 py-1.5 transition-colors ${
                project.settings.name === d.label
                  ? "border-accent text-chalk"
                  : "border-border text-pearl hover:border-pearl/40 hover:text-chalk"
              }`}
            >
              {d.label}
            </button>
          ))}
        </span>
        <button
          onClick={() => setShowExport(true)}
          className="flex items-center gap-1.5 text-[11px] bg-chalk text-void font-medium rounded-pills px-3 py-1.5 hover:bg-pearl transition-colors"
        >
          <Code2 size={12} />
          Export GSAP
        </button>
      </div>

      {/* ── Panels ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex">
        <aside className="w-[248px] shrink-0 border-r border-border bg-charcoal hidden md:block">
          <EffectLibrary onAdd={addEffect} disabled={!selectedLayer} />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Stage — sized to the section box so the composition is framed the
              same way it will be on the page. */}
          <div className="flex-1 min-h-0 p-4 overflow-hidden flex items-center justify-center">
            <div
              ref={stageRef}
              style={{
                background: project.settings.background,
                aspectRatio:
                  project.settings.heightMode === "fixed"
                    ? `${project.settings.maxWidth || 1440} / ${project.settings.heightPx}`
                    : undefined,
                maxWidth: project.settings.maxWidth ? `${project.settings.maxWidth}px` : undefined,
              }}
              onPointerDown={() => {
                setSelectedLayerId(null);
                setSelectedEffectId(null);
              }}
              className={`relative rounded-cards border border-border overflow-hidden ${
                project.settings.heightMode === "fixed" ? "h-auto max-h-full w-full" : "w-full h-full"
              }`}
            >
              {project.layers.map((layer) =>
                layer.visible ? (
                  <div
                    key={layer.id}
                    onPointerDown={(e) => startLayerDrag(e, layer)}
                    style={{
                      position: "absolute",
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                      width: layer.type === "text" ? "auto" : `${layer.width}%`,
                      height: layer.type === "text" ? "auto" : `${layer.height}%`,
                      opacity: layer.opacity / 100,
                    }}
                    className={`cursor-grab active:cursor-grabbing ${
                      selectedLayerId === layer.id
                        ? "outline outline-1 outline-offset-4 outline-accent"
                        : "hover:outline hover:outline-1 hover:outline-offset-4 hover:outline-border"
                    }`}
                  >
                    {/* GSAP owns the transform on this inner node, so the
                        wrapper above keeps the centring and layout rotation.
                        A repeating layer puts its clones inside instead, each
                        positioned by the shared layout maths. */}
                    <div
                      ref={(el) => setLayerRef(layer.id, el)}
                      style={{
                        width: "100%",
                        height: "100%",
                        color: layer.color,
                        background:
                          layer.type === "box" && !layer.repeat ? layer.background : undefined,
                        borderRadius: `${layer.radius}px`,
                        fontSize: layer.type === "text" ? `${layer.fontSize}px` : undefined,
                        fontWeight: layer.type === "text" ? layer.fontWeight : undefined,
                        letterSpacing:
                          layer.type === "text" ? `${layer.letterSpacing}em` : undefined,
                        lineHeight: layer.type === "text" ? 1.1 : undefined,
                        textAlign: "center",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {layer.repeat ? (
                        cloneIndices(layer.repeat).map((i) => {
                          const t = cloneTransform(layer.repeat!, i);
                          return (
                            <div
                              key={i}
                              ref={(el) => setCloneRef(layer.id, i, el)}
                              style={{
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                // Text clones size to their label so physics
                                // bodies match the pill they represent.
                                width:
                                  layer.type === "text"
                                    ? "auto"
                                    : `${layer.repeat!.itemWidth}px`,
                                height:
                                  layer.type === "text"
                                    ? "auto"
                                    : `${layer.repeat!.itemHeight}px`,
                                marginLeft:
                                  layer.type === "text"
                                    ? undefined
                                    : `${-layer.repeat!.itemWidth / 2}px`,
                                marginTop:
                                  layer.type === "text"
                                    ? undefined
                                    : `${-layer.repeat!.itemHeight / 2}px`,
                                whiteSpace: layer.type === "text" ? "nowrap" : undefined,
                                padding: layer.type === "text" ? "0.5rem 1.25rem" : undefined,
                                border:
                                  layer.type === "text" ? `1px solid ${layer.color}` : undefined,
                                lineHeight: layer.type === "text" ? 1 : undefined,
                                transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rotation}deg)`,
                                background: layer.type === "box" ? layer.background : undefined,
                                borderRadius: `${layer.radius}px`,
                                overflow: "hidden",
                              }}
                            >
                              {layer.type === "image" && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={cloneSource(layer.repeat!, i, layer.content)}
                                  alt=""
                                  draggable={false}
                                  className="w-full h-full object-cover pointer-events-none"
                                />
                              )}
                              {layer.type === "text" &&
                                cloneLabel(layer.repeat!, i, layer.content)}
                            </div>
                          );
                        })
                      ) : (
                        <>
                          {layer.type === "text" && layer.content}
                          {layer.type === "image" &&
                            (layer.content ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={layer.content}
                                alt=""
                                draggable={false}
                                className="w-full h-full object-cover pointer-events-none"
                                style={{ borderRadius: `${layer.radius}px` }}
                              />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center border border-dashed border-border text-[10px] text-muted">
                                Add an image URL
                              </span>
                            ))}
                        </>
                      )}
                    </div>
                  </div>
                ) : null,
              )}

              {project.layers.length === 0 && (
                <p className="absolute inset-0 flex items-center justify-center text-xs text-muted">
                  Add a layer from the toolbar to start.
                </p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="h-[260px] shrink-0 border-t border-border">
            <DnaTimeline
              project={project}
              duration={duration}
              playing={playing}
              selectedLayerId={selectedLayerId}
              selectedEffectId={selectedEffectId}
              playheadRef={playheadRef}
              timeLabelRef={timeLabelRef}
              onTogglePlay={togglePlay}
              onRestart={restart}
              onSeekRatio={seekRatio}
              onSelect={(layerId, effectId) => {
                setSelectedLayerId(layerId);
                setSelectedEffectId(effectId);
              }}
              onEffectChange={patchEffect}
              onKeyMove={(layerId, trackId, keyId, t) => {
                const target = project.layers.find((l) => l.id === layerId);
                if (target) patchLayer(layerId, { tracks: moveKey(target, trackId, keyId, t) });
              }}
            />
          </div>
        </div>

        <aside className="w-[280px] shrink-0 border-l border-border bg-charcoal hidden lg:flex lg:flex-col">
          <div className="flex items-center gap-1 p-2 border-b border-border-soft shrink-0">
            {(
              [
                { key: "inspect" as const, label: "Inspect" },
                { key: "states" as const, label: "States" },
              ]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPanel(key)}
                className={`flex-1 px-2 py-1 rounded-medium text-[11px] transition-colors ${
                  panel === key ? "bg-card text-chalk" : "text-muted hover:text-pearl"
                }`}
              >
                {label}
                {key === "states" && project.machine?.enabled && (
                  <span className="ml-1 text-accent">•</span>
                )}
              </button>
            ))}
          </div>
          {panel === "states" ? (
            <StateMachinePanel
              machine={project.machine ?? emptyMachine()}
              layers={project.layers}
              duration={duration}
              activeStateId={activeState?.id ?? null}
              onChange={patchMachine}
            />
          ) : (
          <Inspector
            project={project}
            layer={selectedLayer}
            effect={selectedEffect}
            onLayerChange={(patch) => selectedLayer && patchLayer(selectedLayer.id, patch)}
            onEffectChange={(id, patch) =>
              selectedLayer && patchEffect(selectedLayer.id, id, patch)
            }
            onEffectRemove={removeEffect}
            onEffectDuplicate={duplicateEffect}
            onSettingsChange={patchSettings}
            onSelectEffect={setSelectedEffectId}
            time={uiTime}
            onSetKey={setKey}
            onClearProperty={clearProperty}
          />
          )}
        </aside>
      </div>

      {showExport && <DnaExportModal project={project} onClose={() => setShowExport(false)} />}
    </div>
  );
}
