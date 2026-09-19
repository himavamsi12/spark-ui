import Header from "@/components/layout/Header";
import Landing from "@/components/landing/Landing";
import { buildOriginalEntries } from "@/lib/originalEntries";
import { CHARTS_PAGE_CATEGORIES } from "@/lib/types";

const data = buildOriginalEntries();
const isUiKit = (category: string) => CHARTS_PAGE_CATEGORIES.includes(category);

// Live, hands-on pieces the hero playground cycles through.
const HERO_PLAYGROUND = ["route-covered", "coverflow-player", "ev-range-widgets", "tip-splitter"];

export default function Home() {
  // Newest first, so the shelf shows what just came in.
  const featured = [...data].sort((a, b) => a.addedRank - b.addedRank).slice(0, 6);

  return (
    <div className="relative h-screen">
      <Header overlay />
      <Landing
        featured={featured}
        total={data.length}
        playground={HERO_PLAYGROUND.map((slug) => data.find((d) => d.slug === slug)).filter((d) => d !== undefined)}
        componentCount={data.filter((d) => !isUiKit(d.category)).length}
        uiKitCount={data.filter((d) => isUiKit(d.category)).length}
      />
    </div>
  );
}
