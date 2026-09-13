import Header from "@/components/layout/Header";
import McpSetup from "@/components/docs/McpSetup";
import { ORIGINALS } from "@/lib/originalControls";
import { ORIGINAL_SOURCE_FILES } from "@/lib/originalSources";

export const metadata = {
  title: "MCP Server | Spark UI",
  description: "Connect Spark UI to Claude, Cursor, or any MCP client and pull components straight into your project.",
};

export default function McpPage() {
  const componentCount = ORIGINALS.filter((o) => o.key in ORIGINAL_SOURCE_FILES).length;

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <McpSetup componentCount={componentCount} />
      </main>
    </div>
  );
}
