import { Suspense } from "react";
import Header from "@/components/layout/Header";
import Explorer from "@/components/catalog/Explorer";
import { buildOriginalEntries } from "@/lib/originalEntries";
import { CHARTS_PAGE_CATEGORIES } from "@/lib/types";

const data = buildOriginalEntries().filter((e) => CHARTS_PAGE_CATEGORIES.includes(e.category));

// Newest additions lead the grid.
const NEW_CHARTS = [
  "tip-splitter",
  "ev-range-widgets",
  "coverflow-player",
  "rank-race",
  "hour-dial",
  "flow-funnel",
  "cluster-field",
  "layer-stack",
  "velocity-gauge",
  "ridge-lines",
  "drill-sunburst",
  "spline-pulse",
  "pulse-rings",
  "lens-range",
  "depth-book",
  "dot-allocation",
  "live-signal",
  "mirror-bars",
  "share-strip",
  "route-covered",
  "physics-dock",
  "control-center-edit",
  "magnetic-columns",
  "orbit-segments",
  "liquid-tank",
  "scrub-timeline",
  "pulse-radar",
  "ripple-matrix",
  "rank-shuffle",
  "flow-stream",
  "tilt-glow-panel",
  "morph-views",
];

export const metadata = {
  title: "Charts | Spark UI",
  description: "Monochromatic chart visualizers with rounded corner geometry and minimalist typography.",
};

export default function ChartsPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      {/* Explorer reads ?view= with useSearchParams, which opts it out of
          prerendering. Without this boundary the production build fails on
          /charts, even though dev renders it fine. */}
      <Suspense fallback={<div className="flex-1 min-h-0" />}>
        <Explorer data={data} pinnedFirst={NEW_CHARTS} categoryTabs={[...CHARTS_PAGE_CATEGORIES]} />
      </Suspense>
    </div>
  );
}
