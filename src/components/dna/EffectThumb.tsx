"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { presetDefaults, resolveBuild } from "@/lib/dna/effects";
import type { EffectPreset } from "@/lib/dna/types";

/**
 * The abstract shape a preview is drawn from. Picked per preset so a text
 * effect reads as lines of type and a ring effect reads as a ring, without
 * needing 39 hand-drawn thumbnails that would drift from the presets they
 * illustrate.
 */
type Motif = "lines" | "words" | "chars" | "card" | "stack" | "ring" | "cursor";

function motifFor(preset: EffectPreset): Motif {
  if (preset.kind === "inertia") return "ring";
  if (preset.kind === "pointer") return "cursor";
  if (preset.category === "Text") {
    const split = preset.split ?? "lines";
    return split === "chars" ? "chars" : split === "words" ? "words" : "lines";
  }
  if (preset.kind === "scroll") return "stack";
  return "card";
}

/** Tile boxes for each motif, as percentages of the thumb. */
function tilesFor(motif: Motif): { left: number; top: number; w: number; h: number }[] {
  switch (motif) {
    case "lines":
      return [
        { left: 18, top: 28, w: 64, h: 9 },
        { left: 18, top: 45, w: 50, h: 9 },
        { left: 18, top: 62, w: 58, h: 9 },
      ];
    case "words":
      return [
        { left: 16, top: 34, w: 26, h: 10 },
        { left: 48, top: 34, w: 20, h: 10 },
        { left: 16, top: 54, w: 18, h: 10 },
        { left: 40, top: 54, w: 30, h: 10 },
      ];
    case "chars":
      return [
        { left: 14, top: 44, w: 10, h: 14 },
        { left: 28, top: 44, w: 10, h: 14 },
        { left: 42, top: 44, w: 10, h: 14 },
        { left: 56, top: 44, w: 10, h: 14 },
        { left: 70, top: 44, w: 10, h: 14 },
      ];
    case "stack":
      return [
        { left: 22, top: 22, w: 42, h: 26 },
        { left: 34, top: 48, w: 42, h: 26 },
      ];
    case "ring": {
      // Six tiles around an ellipse — the shape a repeat group makes.
      const out = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        out.push({
          left: 50 + Math.cos(a) * 30 - 9,
          top: 50 + Math.sin(a) * 18 - 6,
          w: 18,
          h: 12,
        });
      }
      return out;
    }
    case "cursor":
    case "card":
    default:
      return [{ left: 28, top: 34, w: 44, h: 32 }];
  }
}

/**
 * A small live preview of one preset.
 *
 * The animation is built from the same resolveBuild() the stage and the
 * exporter use, so the tile shows what the effect actually does. It only runs
 * while hovered — 39 permanent timelines would cost far more than the panel is
 * worth.
 */
export default function EffectThumb({ preset, active }: { preset: EffectPreset; active: boolean }) {
  const scope = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const motif = motifFor(preset);
  const tiles = tilesFor(motif);

  /**
   * The resting pose: the effect frozen partway through, so Slide In reads as
   * an offset card and Blur In as a blurred one instead of every Entrance tile
   * looking identical. GSAP does the interpolation — hand-lerping clip-path and
   * filter strings would be its own small disaster.
   */
  const applyPoster = useRef<() => void>(null);

  useEffect(() => {
    const el = scope.current;
    if (!el) return;
    const nodes = el.querySelectorAll<HTMLElement>("[data-tile]");
    if (!nodes.length) return;

    const build = resolveBuild(preset.key, presetDefaults(preset));
    if (!build) return;

    const poster = () => {
      // Explicit reset rather than clearProps: "all" — that also strips the
      // inline layout styles React set, and React won't re-apply them because
      // its virtual DOM sees no change, leaving the tiles collapsed.
      gsap.set(nodes, {
        opacity: 1,
        x: 0,
        y: 0,
        xPercent: 0,
        yPercent: 0,
        scale: 1,
        rotation: 0,
        rotationX: 0,
        rotationY: 0,
        skewY: 0,
        filter: "none",
        clipPath: "none",
      });
      gsap.set(el, { rotation: 0 });
      if (build.inertia || build.pointer || build.hoverFocus) return;
      const vars = build.from
        ? { ...(build.to ?? {}), ...neutral(build.from) }
        : (build.to ?? null);
      if (!vars) return;
      const tween = build.from
        ? gsap.fromTo(nodes, { ...build.from }, { ...vars, duration: 1, paused: true })
        : gsap.to(nodes, { ...vars, duration: 1, paused: true });
      tween.progress(0.38);
      tween.kill();
    };
    applyPoster.current = poster;
    poster();
  }, [preset]);

  useEffect(() => {
    if (!hovered || !scope.current) return;
    const nodes = scope.current.querySelectorAll<HTMLElement>("[data-tile]");
    if (!nodes.length) return;

    const build = resolveBuild(preset.key, presetDefaults(preset));
    if (!build) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4 });

      if (build.inertia) {
        // Inertia has no timeline of its own; spinning the ring is the honest
        // shorthand for "this turns continuously".
        tl.to(scope.current, { rotation: 360, duration: 6, ease: "none" });
        return;
      }

      if (build.pointer || build.hoverFocus) {
        const lean = build.pointer?.rotate ? { rotationY: 22, rotationX: -12 } : { x: 10, y: -6 };
        tl.fromTo(
          nodes,
          { x: 0, y: 0, rotationX: 0, rotationY: 0, scale: 1 },
          {
            ...lean,
            scale: build.pointer?.scale ?? build.hoverFocus?.scale ?? 1.06,
            transformPerspective: 400,
            duration: 0.7,
            ease: build.ease,
            yoyo: true,
            repeat: 1,
          },
        );
        return;
      }

      const vars: gsap.TweenVars = {
        duration: Math.min(build.duration, 1.4),
        ease: build.ease,
        stagger: build.stagger ? Math.min(build.stagger * 2, 0.14) : 0,
      };

      if (build.from) {
        tl.fromTo(nodes, { ...build.from }, { ...(build.to ?? {}), ...vars, ...neutral(build.from) });
      } else if (build.to) {
        // Looping presets (float, pulse, marquee) read best as a there-and-back.
        tl.fromTo(nodes, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }, {
          ...build.to,
          ...vars,
          yoyo: true,
          repeat: 1,
        });
      }
    }, scope);

    return () => {
      ctx.revert();
      // Drop straight back to the resting pose rather than the neutral state.
      applyPoster.current?.();
    };
  }, [hovered, preset]);

  return (
    <div
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={`relative w-full aspect-square rounded-medium overflow-hidden border transition-colors ${
        active ? "border-accent bg-card" : "border-border bg-void group-hover:border-pearl/40"
      }`}
    >
      <div ref={scope} className="absolute inset-0">
        {tiles.map((t, i) => (
          <span
            key={i}
            data-tile
            style={{
              position: "absolute",
              left: `${t.left}%`,
              top: `${t.top}%`,
              width: `${t.w}%`,
              height: `${t.h}%`,
              borderRadius: motif === "chars" || motif === "lines" || motif === "words" ? 2 : 3,
              background:
                i % 2 === 0 ? "rgb(174 170 192 / 0.55)" : "rgb(174 170 192 / 0.32)",
            }}
          />
        ))}
      </div>
      {motif === "cursor" && (
        <span className="absolute right-[22%] bottom-[24%] w-1.5 h-1.5 rounded-full bg-accent" />
      )}
    </div>
  );
}

/** `from` tweens need explicit neutral end values — same rule as the engine. */
function neutral(from: Record<string, unknown>) {
  const map: Record<string, unknown> = {
    opacity: 1,
    x: 0,
    y: 0,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
    skewY: 0,
    filter: "blur(0px)",
    clipPath: "inset(0% 0% 0% 0%)",
  };
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(from)) if (key in map) out[key] = map[key];
  return out;
}
