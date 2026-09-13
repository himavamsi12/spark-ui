import { Suspense } from "react";
import Header from "@/components/layout/Header";
import Explorer from "@/components/catalog/Explorer";
import { CHARTS_PAGE_CATEGORIES } from "@/lib/types";
import { buildOriginalEntries } from "@/lib/originalEntries";

// Charts and Widgets originals live on their own /charts catalog, not mixed in here.
const data = buildOriginalEntries().filter(
  (d) => !CHARTS_PAGE_CATEGORIES.includes(d.category)
);

// Newest additions lead the grid, in this order, whatever the sort is set to.
// `addedRank` can't carry this on its own: it's derived from position in the
// ORIGINALS array, and new entries get slotted in beside their relatives there
// rather than appended, so it tracks grouping rather than recency.
const NEW_COMPONENTS = [
  "fluid-particle-field",
  "chroma-cell-grid",
  "portrait-orbit",
  "cursor-image-trail",
  "word-highlight-reveal",
  "playable-pill-drop",
  "block-sweep-page-transition",
  "sliding-rail-menu",
  "parallax-minimap-scroll",
  "dissolve-wash-hero",
  "spotlight-project-index",
  "parting-contact-rows",
  "draggable-pill-menu",
  "scribble-stroke-cards",
  "photo-scatter-gallery",
  "sticky-image-deck",
  "unravel-stroke-reveal",
  "expanding-row-gallery",
  "aurora-login-card",
];

export const metadata = {
  title: "Components | Spark UI",
  description: "Browse every animated React component in the Spark UI library.",
};

export default function ComponentsPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      {/* Explorer reads ?view= with useSearchParams, which opts it out of
          prerendering. Without this boundary the production build fails on
          /components, even though dev renders it fine. */}
      <Suspense fallback={<div className="flex-1 min-h-0" />}>
        <Explorer data={data} pinnedFirst={NEW_COMPONENTS} />
      </Suspense>
    </div>
  );
}
