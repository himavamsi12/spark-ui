/**
 * Repeat-group layout maths.
 *
 * A repeating layer renders N clones placed by these functions rather than by
 * hand. Preview and codegen both call in here, so a ring in the studio and a
 * ring in the exported file are positioned by identical arithmetic.
 */

export type RepeatLayout = "ring" | "row" | "column" | "grid";

export type RepeatConfig = {
  count: number;
  layout: RepeatLayout;
  /** Ellipse radii in px, for `ring`. */
  radiusX: number;
  radiusY: number;
  /** Rotates the whole ellipse, so the ring reads as an oval on a slant. */
  tilt: number;
  /** Gap in px between clones for row/column/grid. */
  gap: number;
  /** Columns for `grid`. */
  columns: number;
  /** Each clone turns to face along the ring. */
  faceCenter: boolean;
  /** Clone box in px — repeats are sized absolutely, not as a % of the stage. */
  itemWidth: number;
  itemHeight: number;
  /**
   * One image per clone, cycled if there are fewer sources than clones. Empty
   * falls back to the layer's own content, which is what makes a repeat a
   * gallery rather than the same picture N times.
   */
  sources: string[];
  /** One label per clone, cycled — the text equivalent of `sources`. */
  labels: string[];
};

export const DEFAULT_REPEAT: RepeatConfig = {
  count: 8,
  layout: "ring",
  radiusX: 360,
  radiusY: 200,
  tilt: -20,
  gap: 16,
  columns: 4,
  faceCenter: false,
  itemWidth: 150,
  itemHeight: 100,
  sources: [],
  labels: [],
};

export type CloneTransform = { x: number; y: number; rotation: number; angle: number };

/**
 * Where clone `index` sits, given the group's current rotation in radians.
 *
 * The ring case mirrors CircularGallery: place on an ellipse, then push the
 * point through a 2D rotation so the whole oval tilts as one, instead of
 * tilting each item individually.
 */
export function cloneTransform(
  config: RepeatConfig,
  index: number,
  rotationRad = 0,
): CloneTransform {
  const { count, layout, radiusX, radiusY, tilt, gap, columns } = config;
  if (layout === "ring") {
    const angle = (index / Math.max(1, count)) * Math.PI * 2 + rotationRad;
    const ovalX = Math.cos(angle) * radiusX;
    const ovalY = Math.sin(angle) * radiusY;
    const rad = (tilt * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: ovalX * cos - ovalY * sin,
      y: ovalX * sin + ovalY * cos,
      rotation: config.faceCenter ? (angle * 180) / Math.PI + 90 : 0,
      angle,
    };
  }

  if (layout === "row") {
    const span = (count - 1) * gap;
    return { x: index * gap - span / 2, y: 0, rotation: 0, angle: 0 };
  }

  if (layout === "column") {
    const span = (count - 1) * gap;
    return { x: 0, y: index * gap - span / 2, rotation: 0, angle: 0 };
  }

  const cols = Math.max(1, columns);
  const rows = Math.ceil(count / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: (col - (cols - 1) / 2) * gap,
    y: (row - (rows - 1) / 2) * gap,
    rotation: 0,
    angle: 0,
  };
}

/** The image a given clone should show. */
export function cloneSource(config: RepeatConfig, index: number, fallback: string): string {
  if (!config.sources.length) return fallback;
  return config.sources[index % config.sources.length];
}

/** The text a given clone should show. */
export function cloneLabel(config: RepeatConfig, index: number, fallback: string): string {
  if (!config.labels.length) return fallback;
  return config.labels[index % config.labels.length];
}

/** Clone indices as a plain array, for mapping in JSX. */
export function cloneIndices(config: RepeatConfig | undefined): number[] {
  if (!config || config.count <= 1) return [0];
  return Array.from({ length: config.count }, (_, i) => i);
}
