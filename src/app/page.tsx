import Header from "@/components/layout/Header";
import Landing from "@/components/landing/Landing";
import { buildOriginalEntries } from "@/lib/originalEntries";

const data = buildOriginalEntries();

export default function Home() {
  // Newest first, so the shelf shows what just came in.
  const featured = [...data].sort((a, b) => a.addedRank - b.addedRank).slice(0, 6);

  return (
    <div className="relative h-screen">
      <Header overlay />
      <Landing featured={featured} total={data.length} />
    </div>
  );
}
