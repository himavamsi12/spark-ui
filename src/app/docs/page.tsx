import Header from "@/components/layout/Header";
import DocsIntro from "@/components/docs/DocsIntro";
import { buildOriginalEntries } from "@/lib/originalEntries";

const data = buildOriginalEntries();

export const metadata = {
  title: "Introduction | Spark UI Docs",
  description: "What Spark UI is, why it exists, and how to get a component into your project.",
};

export default function DocsPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <DocsIntro allComponents={data} />
    </div>
  );
}
