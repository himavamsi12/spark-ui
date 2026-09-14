import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Spark UI, free animated components for the web.</span>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            Made with
            <img src="/icons/pixel-heart.png" alt="love" className="w-3.5 h-3.5" draggable={false} />
            by{" "}
            <a
              href="https://www.linkedin.com/in/hima-vamsi-297744250/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-pearl transition-colors"
            >
              Vamsi
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/components" className="text-xs text-muted hover:text-pearl transition-colors">
            Components
          </Link>
          <Link href="/charts" className="text-xs text-muted hover:text-pearl transition-colors">
            UI Kit
          </Link>
          <Link href="/mcp" className="text-xs text-muted hover:text-pearl transition-colors">
            MCP
          </Link>
        </div>
      </div>
    </footer>
  );
}
