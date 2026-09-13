import { notFound } from "next/navigation";
import OriginalDetailView from "@/components/detail/OriginalDetailView";
import ChartDetailView from "@/components/detail/ChartDetailView";
import { buildOriginalEntries } from "@/lib/originalEntries";

const data = buildOriginalEntries();

export function generateStaticParams() {
  return data.map((d) => ({ slug: d.slug }));
}

export default async function ComponentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = data.find((d) => d.slug === slug);
  if (!entry) notFound();

  const similar = data
    .filter((d) => d.category === entry.category && d.slug !== entry.slug)
    .slice(0, 8);

  // Charts get a documentation-style page; everything else opens full-bleed
  // with its toolbar above the preview and the sidebar as the only other chrome.
  return (
    <div className="h-screen">
      {entry.category === "Charts" ? (
        <ChartDetailView key={entry.slug} entry={entry} allComponents={data} />
      ) : (
        <OriginalDetailView key={entry.slug} entry={entry} similar={similar} allComponents={data} />
      )}
    </div>
  );
}
