import { ORIGINALS, defaultsFrom } from "./originalControls";
import { ORIGINAL_SLUGS } from "@/components/originals/slugs";
import type { ComponentEntry } from "./types";

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function buildOriginalEntries(): ComponentEntry[] {
  return ORIGINALS.filter((o) => ORIGINAL_SLUGS.has(o.key)).map((o, i) => {
    const h = hash(o.key);
    return {
      slug: o.key,
      name: o.name,
      category: o.category,
      views: 20 + (h % 400),
      copies: 5 + (h % 100),
      addedRank: 1000 + i,
      source: "original",
      defaults: defaultsFrom(o.controls),
    };
  });
}
