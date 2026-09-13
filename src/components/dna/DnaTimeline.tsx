"use client";

import { useRef } from "react";
import { Pause, Play, RotateCcw, MousePointer2 } from "lucide-react";
import { effectDuration, getPreset } from "@/lib/dna/effects";
import type { DnaProject, EffectInstance, Layer } from "@/lib/dna/types";
import { ANIMATABLE } from "@/lib/dna/types";

const ROW_H = 26;

/** Clip colouring by kind, so scroll and pointer read differently at a glance. */
const KIND_STYLE: Record<string, string> = {
  tween: "bg-accent/25 border-accent/60 hover:bg-accent/35",
  scroll: "bg-[#4c9aff]/20 border-[#4c9aff]/60 hover:bg-[#4c9aff]/30",
  pointer: "bg-[#8b5cf6]/20 border-[#8b5cf6]/60 hover:bg-[#8b5cf6]/30",
};

export default function DnaTimeline({
  project,
  duration,
  playing,
  selectedLayerId,
  selectedEffectId,
  playheadRef,
  timeLabelRef,
  onTogglePlay,
  onRestart,
  onSeekRatio,
  onSelect,
  onEffectChange,
  onKeyMove,
}: {
  project: DnaProject;
  duration: number;
  playing: boolean;
  selectedLayerId: string | null;
  selectedEffectId: string | null;
  /** Written to directly during playback so scrubbing never re-renders the tree. */
  playheadRef: React.RefObject<HTMLDivElement | null>;
  timeLabelRef: React.RefObject<HTMLSpanElement | null>;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeekRatio: (ratio: number) => void;
  onSelect: (layerId: string, effectId: string | null) => void;
  onEffectChange: (layerId: string, effectId: string, patch: Partial<EffectInstance>) => void;
  onKeyMove: (layerId: string, trackId: string, keyId: string, time: number) => void;
}) {
  const tracksRef = useRef<HTMLDivElement>(null);

  const seconds = Math.max(1, Math.ceil(duration));
  const ticks = Array.from({ length: seconds + 1 }, (_, i) => i);

  function ratioFromEvent(e: { clientX: number }) {
    const el = tracksRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }

  function startScrub(e: React.PointerEvent) {
    onSeekRatio(ratioFromEvent(e));
    const move = (ev: PointerEvent) => onSeekRatio(ratioFromEvent(ev));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /** Drag a clip sideways to retime it, or its right edge to stretch it. */
  function startClipDrag(
    e: React.PointerEvent,
    layer: Layer,
    fx: EffectInstance,
    mode: "move" | "resize",
  ) {
    e.stopPropagation();
    onSelect(layer.id, fx.id);
    const el = tracksRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const perSecond = rect.width / duration;
    const startX = e.clientX;
    const startValue = mode === "move" ? fx.start : effectDuration(fx.preset, fx.params, fx.duration);

    const move = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) / perSecond;
      if (mode === "move") {
        onEffectChange(layer.id, fx.id, {
          start: Math.max(0, Math.round((startValue + delta) * 20) / 20),
        });
      } else {
        onEffectChange(layer.id, fx.id, {
          duration: Math.max(0.1, Math.round((startValue + delta) * 20) / 20),
        });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /** Drag a keyframe diamond along its track to retime it. */
  function startKeyDrag(e: React.PointerEvent, layer: Layer, trackId: string, keyId: string) {
    e.stopPropagation();
    onSelect(layer.id, null);
    const el = tracksRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const ratio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      onKeyMove(layer.id, trackId, keyId, ratio * duration);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-charcoal">
      {/* ── Transport ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 h-9 shrink-0 border-b border-border-soft">
        <button
          onClick={onTogglePlay}
          className="p-1.5 rounded-medium bg-card border border-border text-pearl hover:text-chalk hover:border-pearl/40 transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button
          onClick={onRestart}
          className="p-1.5 rounded-medium bg-card border border-border text-pearl hover:text-chalk hover:border-pearl/40 transition-colors"
          aria-label="Restart"
        >
          <RotateCcw size={13} />
        </button>
        <span ref={timeLabelRef} className="text-[11px] text-pearl tabular-nums font-mono w-[86px]">
          0.00 / {duration.toFixed(2)}s
        </span>
        <span className="ml-auto flex items-center gap-3 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-[2px] bg-accent/60" /> Time
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-[2px] bg-[#4c9aff]/60" /> Scroll
          </span>
          <span className="flex items-center gap-1">
            <MousePointer2 size={9} /> Pointer (live)
          </span>
        </span>
      </div>

      {/* ── Ruler + tracks ────────────────────────────────────────────
          Labels and clips share one vertical scroller so the two columns can
          never drift out of alignment; only the ruler is pinned. ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex shrink-0">
          <div className="w-[150px] shrink-0 border-r border-border-soft h-6 border-b border-border-soft flex items-center px-2.5">
            <span className="text-[10px] uppercase tracking-wide text-muted">Layers</span>
          </div>
          <div
            onPointerDown={startScrub}
            className="flex-1 min-w-0 h-6 border-b border-border-soft relative cursor-ew-resize select-none"
          >
            {ticks.map((t) => (
              <span
                key={t}
                style={{ left: `${(t / duration) * 100}%` }}
                className="absolute top-0 h-full flex items-center pl-1 border-l border-border-soft/60 text-[9px] text-muted tabular-nums"
              >
                {t}s
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex">
          <div className="w-[150px] shrink-0 border-r border-border-soft">
            <div>
            {project.layers.map((layer) => (
              <button
                key={layer.id}
                onClick={() => onSelect(layer.id, null)}
                style={{ height: ROW_H }}
                className={`w-full flex items-center gap-1.5 px-2.5 border-b border-border-soft/50 text-left transition-colors ${
                  selectedLayerId === layer.id ? "bg-card text-chalk" : "text-pearl hover:bg-panel"
                }`}
              >
                <span className="text-[11px] truncate">{layer.name}</span>
                <span className="ml-auto text-[9px] text-muted tabular-nums shrink-0">
                  {layer.effects.length}
                </span>
              </button>
            ))}
            {/* Keyframed properties get their own labelled sub-rows, mirrored
                by the diamond rows in the clip area. */}
            {project.layers.map((layer) =>
              layer.tracks.map((track) => (
                <div
                  key={track.id}
                  style={{ height: ROW_H }}
                  className="flex items-center gap-1.5 pl-6 pr-2.5 border-b border-border-soft/50"
                >
                  <span className="text-[10px] text-muted truncate">
                    {ANIMATABLE.find((a) => a.key === track.property)?.label ?? track.property}
                  </span>
                  <span className="ml-auto text-[9px] text-muted tabular-nums shrink-0">
                    {track.keys.length}
                  </span>
                </div>
              )),
            )}
            {project.layers.length === 0 && (
              <p className="px-2.5 py-2 text-[10px] text-muted">No layers yet.</p>
            )}
            </div>
          </div>

          <div ref={tracksRef} onPointerDown={startScrub} className="flex-1 min-w-0 relative">
            {/* Second gridlines behind the clips. */}
            {ticks.map((t) => (
              <span
                key={t}
                style={{ left: `${(t / duration) * 100}%` }}
                className="absolute top-0 bottom-0 border-l border-border-soft/30 pointer-events-none"
              />
            ))}

            <div>
              {project.layers.map((layer) => (
                <div
                  key={layer.id}
                  style={{ height: ROW_H }}
                  className="relative border-b border-border-soft/50"
                >
                  {layer.effects.map((fx) => {
                    const preset = getPreset(fx.preset);
                    if (!preset) return null;
                    // Pointer effects have no time extent — they're always live,
                    // so they're pinned as a full-width ghost rather than a clip.
                    const isPointer = preset.kind === "pointer";
                    const len = isPointer
                      ? duration
                      : effectDuration(fx.preset, fx.params, fx.duration);
                    const left = isPointer ? 0 : (fx.start / duration) * 100;
                    const width = Math.max(1.5, (len / duration) * 100);
                    const selected = selectedEffectId === fx.id;
                    return (
                      <div
                        key={fx.id}
                        onPointerDown={(e) =>
                          isPointer
                            ? (e.stopPropagation(), onSelect(layer.id, fx.id))
                            : startClipDrag(e, layer, fx, "move")
                        }
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${preset.name}${isPointer ? " (always live)" : ` — ${fx.start.toFixed(2)}s`}`}
                        className={`absolute top-1 bottom-1 rounded-small border flex items-center px-1.5 overflow-hidden ${
                          isPointer ? "cursor-pointer opacity-50 border-dashed" : "cursor-grab active:cursor-grabbing"
                        } ${KIND_STYLE[preset.kind]} ${
                          selected ? "ring-1 ring-accent" : ""
                        } ${fx.enabled ? "" : "opacity-30"}`}
                      >
                        <span className="text-[9px] text-chalk truncate pointer-events-none">
                          {preset.name}
                        </span>
                        {!isPointer && (
                          <span
                            onPointerDown={(e) => startClipDrag(e, layer, fx, "resize")}
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-chalk/30"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {project.layers.map((layer) =>
                layer.tracks.map((track) => (
                  <div
                    key={track.id}
                    style={{ height: ROW_H }}
                    className="relative border-b border-border-soft/50"
                  >
                    {track.keys.map((key) => (
                      <span
                        key={key.id}
                        onPointerDown={(e) => startKeyDrag(e, layer, track.id, key.id)}
                        title={`${key.value} @ ${key.time.toFixed(2)}s`}
                        style={{ left: `${(key.time / duration) * 100}%` }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-accent/70 border border-accent cursor-ew-resize hover:bg-accent"
                      />
                    ))}
                  </div>
                )),
              )}
            </div>

            {/* Playhead — moved imperatively during playback. */}
            <div
              ref={playheadRef}
              className="absolute top-0 bottom-0 w-px bg-accent pointer-events-none z-10"
              style={{ left: 0 }}
            >
              <span className="absolute -top-6 -translate-x-1/2 w-2 h-2 rotate-45 bg-accent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
