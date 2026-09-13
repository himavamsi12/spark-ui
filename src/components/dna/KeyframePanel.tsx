"use client";

import { Diamond, Trash2 } from "lucide-react";
import { getTrack, keyAt, neutralValue, valueAt } from "@/lib/dna/keyframes";
import { ANIMATABLE, type AnimatableProperty, type Layer } from "@/lib/dna/types";

/**
 * The stopwatch row from After Effects and Rive: hit the diamond to drop a key
 * at the playhead, then move the playhead and change the value to add the next
 * one. No separate mode to enter, which is what keeps arbitrary keyframing from
 * feeling like the "hard" half of the tool.
 */
export default function KeyframePanel({
  layer,
  time,
  onSetKey,
  onClearProperty,
}: {
  layer: Layer;
  /** Playhead position the keys are written at. */
  time: number;
  onSetKey: (property: AnimatableProperty, value: number) => void;
  onClearProperty: (property: AnimatableProperty) => void;
}) {
  return (
    <section className="px-3 py-3 border-t border-border-soft">
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="text-xs font-semibold tracking-wide text-chalk uppercase">Keyframes</h2>
        <span className="ml-auto text-[10px] text-muted tabular-nums font-mono">
          @ {time.toFixed(2)}s
        </span>
      </div>
      <p className="text-[10px] text-muted leading-snug mb-2">
        Move the playhead, then change a value to drop a key there.
      </p>

      <div className="flex flex-col">
        {ANIMATABLE.map((prop) => {
          const track = getTrack(layer, prop.key);
          const armed = !!track;
          const value = valueAt(track, time, neutralValue(prop.key));
          const onKey = !!keyAt(track, time);

          return (
            <div key={prop.key} className="flex items-center gap-1.5 py-1">
              <button
                onClick={() => onSetKey(prop.key, value)}
                title={onKey ? "Key at playhead" : "Add a key here"}
                className={`shrink-0 p-0.5 transition-colors ${
                  onKey ? "text-accent" : armed ? "text-pearl" : "text-muted hover:text-pearl"
                }`}
              >
                <Diamond size={11} className={onKey ? "fill-accent" : undefined} />
              </button>

              <span
                className={`w-[70px] shrink-0 text-[11px] truncate ${
                  armed ? "text-pearl" : "text-muted"
                }`}
              >
                {prop.label}
              </span>

              <input
                type="range"
                min={prop.min}
                max={prop.max}
                step={prop.step}
                value={value}
                onChange={(e) => onSetKey(prop.key, Number(e.target.value))}
                className="flex-1 min-w-0 accent-[var(--accent)] h-1"
              />
              <span className="w-[46px] shrink-0 text-right text-[11px] text-pearl tabular-nums">
                {Number.isInteger(value) ? value : value.toFixed(2)}
                {prop.unit}
              </span>

              <button
                onClick={() => onClearProperty(prop.key)}
                disabled={!armed}
                title="Remove this property's keys"
                className="shrink-0 p-0.5 text-muted hover:text-accent disabled:opacity-25 disabled:hover:text-muted transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
