import type { Params } from "./effects";

export type ComponentEntry = {
  slug: string;
  name: string;
  category: string;
  views: number;
  copies: number;
  addedRank: number;
  source: "original";
  /** Default prop values from the component's control schema, resolved on the
   * server so grid pages don't have to ship every component's settings. */
  defaults: Params;
};

export const CATEGORY_ORDER = ["Navigation", "Gallery", "Animations", "Text", "Widgets", "Charts", "Background"] as const;

/** Categories that live on the /charts catalog instead of /components. */
export const CHARTS_PAGE_CATEGORIES: readonly string[] = ["Charts", "Widgets"];

export type SortKey = "trending" | "recent" | "copied" | "recommended";
