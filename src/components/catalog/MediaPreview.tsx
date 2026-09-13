"use client";

import { useEffect, useRef, useState } from "react";
import { CHARTS_PAGE_CATEGORIES, type ComponentEntry } from "@/lib/types";
import { ORIGINAL_COMPONENTS } from "@/components/originals";

/** Width full-page originals are laid out at before being shrunk into a card. */
const STAGE_WIDTH = 1280;

export default function MediaPreview({
  entry,
  className,
  still = false,
}: {
  entry: ComponentEntry;
  className?: string;
  still?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [cardSize, setCardSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // Synchronous first check so we never depend on the observer firing to show
    // anything, since IntersectionObserver callbacks can be deferred (backgrounded
    // tabs, prerender), which would otherwise leave the preview permanently blank.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 0;
    const vw = window.innerWidth || 0;
    setVisible(rect.bottom > -200 && rect.top < vh + 200 && rect.right > -200 && rect.left < vw + 200);

    const io = new IntersectionObserver(
      (entries) => setVisible(entries[0]?.isIntersecting ?? false),
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Several originals capture `wheel` with preventDefault to drive their own
  // scroll-linked progress. That is correct on their detail page, but inside a
  // card it swallows the page scroll. A capture-phase listener here runs before
  // any descendant's handler, so the wheel never reaches them in a thumbnail.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const block = (e: WheelEvent) => e.stopPropagation();
    el.addEventListener("wheel", block, { capture: true });
    return () => el.removeEventListener("wheel", block, { capture: true });
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setCardSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const Comp = ORIGINAL_COMPONENTS[entry.slug];
  // Only mount the live component once it is actually near the viewport, and
  // leave it un-animated for `still` thumbnails. Mounting every original at
  // once (each with its own rAF/canvas/WebGL loop) saturates the main thread.
  const node = Comp && visible && <Comp {...entry.defaults} autoPlay={!still} />;
  // Charts and widgets are designed at card size. Full-page originals are
  // not: squeezed into a ~600px card their responsive layouts collapse into
  // the mobile breakpoint and overlap. Lay those out on a desktop-width stage
  // and `zoom` it down, so the thumbnail is a true miniature of the page.
  // Components that measure with getBoundingClientRect must convert back to
  // layout pixels themselves, since rects come back in zoomed pixels.
  const cardSized = CHARTS_PAGE_CATEGORIES.includes(entry.category);
  const zoom = cardSize && cardSize.w > 0 ? cardSize.w / STAGE_WIDTH : null;
  return (
    <div ref={wrapRef} className={`relative bg-black overflow-hidden ${className ?? ""}`}>
      {cardSized ? (
        node
      ) : (
        zoom && (
          <div
            className="absolute left-0 top-0"
            style={{ width: STAGE_WIDTH, height: cardSize!.h / zoom, zoom }}
          >
            {node}
          </div>
        )
      )}
    </div>
  );
}
