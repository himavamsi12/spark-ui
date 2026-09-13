import Link from "next/link";
import FlowerInspector from "./FlowerInspector";
import { Heart, Radar } from "lucide-react";
import Footer from "@/components/layout/Footer";

function GithubMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.96.1-.75.4-1.25.73-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.77.12 3.06.74.8 1.18 1.83 1.18 3.09 0 4.43-2.69 5.4-5.26 5.69.42.36.78 1.07.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export default function ThreeDToolIntro() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
      {/* Hero ------------------------------------------------------------ */}
      <section className="relative px-6 pt-16 pb-20 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,var(--accent)_0%,transparent_62%)] opacity-[0.13]" />

        <div className="relative max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-pills border border-border bg-panel px-3 py-1 text-xs text-accent mb-6">
            <Radar size={12} />
            Coming soon
          </span>

          <h1
            className="font-display font-semibold tracking-tight text-chalk leading-[1.02] text-balance"
            style={{ fontSize: "clamp(2.75rem,7.5vw,5.25rem)" }}
          >
            See past the
            <br />
            <span className="text-accent">&lt;canvas&gt;</span>
          </h1>

          <p className="mt-6 text-lg text-pearl leading-relaxed max-w-lg mx-auto text-balance">
            Right-click gets you nothing. A 3D site is one opaque element. This pulls it open: every
            mesh, shader, texture and scroll trigger, named.
          </p>
        </div>

        <div className="relative mt-12 px-2">
          <FlowerInspector />
        </div>
      </section>

      {/* Open source ------------------------------------------------------ */}
      <section className="px-6 pb-20 text-center">
        <div className="max-w-xl mx-auto pt-14 border-t border-border-soft">
          <h2 className="text-lg font-display font-medium tracking-tight text-chalk mb-2.5">
            Open source, built in the open
          </h2>
          <p className="text-sm text-pearl leading-relaxed mb-6">
            This one’s bigger than a single component, and it’s not built yet; the hero above is the
            direction, not a finished tool. It’ll be open source from day one, so if pulling 3D sites apart
            like this sounds like your kind of problem, there’ll be a real codebase to join.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href="https://github.com/himavamsi12/Spark-UI"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-border text-pearl text-sm font-medium px-3.5 py-2 rounded-pills hover:border-pearl/40 hover:text-chalk transition-colors"
            >
              <GithubMark size={15} />
              Follow the repo
            </a>
            <a
              href="https://buymeachai.in/himavamsi.kummari"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-accent text-void text-sm font-medium px-3.5 py-2 rounded-pills hover:brightness-110 transition-[filter]"
            >
              <Heart size={15} className="fill-void" />
              Sponsor this build
            </a>
            <Link
              href="/docs"
              className="text-sm font-medium text-muted hover:text-pearl px-3.5 py-2 transition-colors"
            >
              Back to docs
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
