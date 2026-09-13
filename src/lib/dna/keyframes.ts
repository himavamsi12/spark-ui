/**
 * Pure helpers for reading and editing keyframe tracks.
 *
 * The studio follows the stopwatch model from After Effects and Rive: arm a
 * property once, then any value change at the playhead writes a key there. That
 * keeps the advanced path (arbitrary keyframes) reachable without a separate
 * "keyframe mode" to learn.
 */

import { ANIMATABLE, nextId } from "./types";
import type { AnimatableProperty, Keyframe, KeyframeTrack, Layer } from "./types";

const NEUTRAL = new Map(ANIMATABLE.map((a) => [a.key, a.neutral]));

export function neutralValue(property: AnimatableProperty): number {
  return NEUTRAL.get(property) ?? 0;
}

export function getTrack(layer: Layer, property: AnimatableProperty): KeyframeTrack | undefined {
  return layer.tracks.find((t) => t.property === property);
}

/** Linear read of a track at `time`, clamped to the first and last key. */
export function valueAt(track: KeyframeTrack | undefined, time: number, fallback: number): number {
  if (!track || track.keys.length === 0) return fallback;
  const keys = [...track.keys].sort((a, b) => a.time - b.time);
  if (time <= keys[0].time) return keys[0].value;
  const last = keys[keys.length - 1];
  if (time >= last.time) return last.value;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (time <= b.time) {
      const span = b.time - a.time;
      // Coincident keys would divide by zero; the later one simply wins.
      if (span <= 0) return b.value;
      return a.value + ((time - a.time) / span) * (b.value - a.value);
    }
  }
  return last.value;
}

/** The key sitting exactly on `time`, within a frame's tolerance. */
export function keyAt(track: KeyframeTrack | undefined, time: number): Keyframe | undefined {
  return track?.keys.find((k) => Math.abs(k.time - time) < 0.02);
}

/**
 * Writes `value` at `time`, replacing a key already there. Arming a property
 * for the first time away from t=0 also drops a key at 0 holding the neutral
 * value, so the animation has somewhere to travel from.
 */
export function upsertKey(
  layer: Layer,
  property: AnimatableProperty,
  time: number,
  value: number,
  ease = "power2.out",
): KeyframeTrack[] {
  const existing = getTrack(layer, property);
  const rounded = Math.round(time * 100) / 100;

  if (!existing) {
    const keys: Keyframe[] = [];
    if (rounded > 0) {
      keys.push({ id: nextId("k"), time: 0, value: neutralValue(property), ease });
    }
    keys.push({ id: nextId("k"), time: rounded, value, ease });
    return [...layer.tracks, { id: nextId("track"), property, keys }];
  }

  const at = keyAt(existing, rounded);
  const keys = at
    ? existing.keys.map((k) => (k.id === at.id ? { ...k, value } : k))
    : [...existing.keys, { id: nextId("k"), time: rounded, value, ease }];

  return layer.tracks.map((t) =>
    t.id === existing.id ? { ...t, keys: keys.sort((a, b) => a.time - b.time) } : t,
  );
}

/** Drops a key; the track goes with it once its last key is gone. */
export function removeKey(layer: Layer, property: AnimatableProperty, keyId: string): KeyframeTrack[] {
  return layer.tracks
    .map((t) =>
      t.property === property ? { ...t, keys: t.keys.filter((k) => k.id !== keyId) } : t,
    )
    .filter((t) => t.keys.length > 0);
}

export function moveKey(
  layer: Layer,
  trackId: string,
  keyId: string,
  time: number,
): KeyframeTrack[] {
  return layer.tracks.map((t) =>
    t.id === trackId
      ? {
          ...t,
          keys: t.keys
            .map((k) => (k.id === keyId ? { ...k, time: Math.max(0, Math.round(time * 100) / 100) } : k))
            .sort((a, b) => a.time - b.time),
        }
      : t,
  );
}

export function removeTrack(layer: Layer, property: AnimatableProperty): KeyframeTrack[] {
  return layer.tracks.filter((t) => t.property !== property);
}
