/** Deterministic pseudo-random in [0, 1) (mulberry32), so server and client
 * render identical demo data regardless of how many points are requested. */
export function seeded(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** `count` whole-number values between `min` and `max`, drifting smoothly so
 * lines and areas read as a trend rather than noise. */
export function series(count: number, { min = 20, max = 95, salt = 0 } = {}): number[] {
  const out: number[] = [];
  let v = min + (max - min) * seeded(salt * 97 + 1);
  for (let i = 0; i < count; i++) {
    const step = (seeded(salt * 131 + i * 17 + 3) - 0.45) * (max - min) * 0.45;
    v = Math.min(max, Math.max(min, v + step));
    out.push(Math.round(v));
  }
  return out;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type LabelKind = 'month' | 'day' | 'quarter' | 'hour' | 'index';

export function labels(count: number, kind: LabelKind = 'month'): string[] {
  return Array.from({ length: count }, (_, i) => {
    if (kind === 'month') return MONTHS[i % 12];
    if (kind === 'day') return DAYS[i % 7];
    if (kind === 'quarter') return `Q${(i % 4) + 1}`;
    if (kind === 'hour') return `${String((i * 2) % 24).padStart(2, '0')}:00`;
    return String(i + 1).padStart(2, '0');
  });
}

/** Scales a base duration (in seconds or ms) by a speed percentage. */
export function bySpeed(base: number, speed = 100): number {
  return base * (100 / Math.max(10, speed));
}
