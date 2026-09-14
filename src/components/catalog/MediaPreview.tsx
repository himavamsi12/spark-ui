"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CHARTS_PAGE_CATEGORIES, type ComponentEntry } from "@/lib/types";
import { ORIGINAL_COMPONENTS, ORIGINAL_LOADERS } from "@/components/originals";

/** Width full-page originals are laid out at before being shrunk into a card. */
const STAGE_WIDTH = 1280;

/**
 * Mount and unmount use different distances on purpose. With a single margin
 * both boundaries sit on the same line, so parking the scroll there mounts and
 * unmounts the same component over and over — and each remount re-runs its
 * GSAP/canvas/physics setup, which is the flicker. The gap between these two
 * gives it hysteresis. The gap is kept narrow on purpose: every preview held
 * open is another rAF loop on the main thread, so widening it would trade one
 * kind of stutter for another.
 */
const MOUNT_MARGIN = 300;
const UNMOUNT_MARGIN = 700;
// Chart and widget cards are cheap to start but numerous, so they keep a
// tighter band: the UI Kit page dropped from 61 to 34fps with the wider one.
const CARD_MOUNT_MARGIN = 150;
const CARD_UNMOUNT_MARGIN = 450;
/**
 * Previews shown as a still image instead of the live component. Reserved for
 * components too expensive to run beside a grid of others; the live version
 * still runs on its own page.
 * - Fluid Particle Field: its simulation alone held the grid to ~30fps.
 */
const STILL_PREVIEWS: Record<string, string> = {
  "fluid-particle-field": "/fluid-particle-field/poster.jpg",
};

/**
 * The nearest scrolling ancestor. Observer margins only extend the observer's
 * root, and the grid scrolls inside its own container that clips everything
 * outside it. Observed against the window, the margins never took effect:
 * cards only started loading once already on screen, so whole rows appeared
 * empty for up to a second and a half.
 */
function scrollParent(el: HTMLElement): Element | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/** How far ahead a card's component code starts downloading, without mounting. */
const PRELOAD_MARGIN = 1200;

/**
 * Canvas and WebGL previews size their backing store from devicePixelRatio.
 * Laid out on the 1280px stage and zoomed down, a retina screen would have
 * them drawing a 2560px-wide canvas to show a ~600px thumbnail, four times the
 * pixels of the card itself, which is what made the grid stutter. While any
 * live preview is mounted, report a ratio of 1: the thumbnail looks the same
 * and costs what it did before the stage existed. The real value comes back
 * once the last preview unmounts, so component pages keep full resolution.
 */
let livePreviews = 0;
let capped = false;
let savedDpr: PropertyDescriptor | undefined;
function capPixelRatio() {
  if (livePreviews++ > 0 || window.devicePixelRatio <= 1) return;
  savedDpr = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, get: () => 1 });
  capped = true;
}
function releasePixelRatio() {
  livePreviews = Math.max(0, livePreviews - 1);
  if (livePreviews > 0 || !capped) return;
  if (savedDpr) Object.defineProperty(window, "devicePixelRatio", savedDpr);
  else delete (window as { devicePixelRatio?: number }).devicePixelRatio;
  savedDpr = undefined;
  capped = false;
}

export default function MediaPreview({
  entry,
  className,
  still = false,
  interactive = false,
}: {
  entry: ComponentEntry;
  className?: string;
  still?: boolean;
  /** Let the pointer reach the live component so it can be used in the card. */
  interactive?: boolean;
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
    const m = CHARTS_PAGE_CATEGORIES.includes(entry.category) ? CARD_MOUNT_MARGIN : MOUNT_MARGIN;
    setVisible(rect.bottom > -m && rect.top < vh + m && rect.right > -m && rect.left < vw + m);

    // Near the viewport: mount. Only once it is well clear does the second
    // observer take it back down again.
    const root = scrollParent(el);
    const cardSizedEntry = CHARTS_PAGE_CATEGORIES.includes(entry.category);
    const mountMargin = cardSizedEntry ? CARD_MOUNT_MARGIN : MOUNT_MARGIN;
    const unmountMargin = cardSizedEntry ? CARD_UNMOUNT_MARGIN : UNMOUNT_MARGIN;
    const mountIo = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible(true);
      },
      { root, rootMargin: `${mountMargin}px` }
    );
    const unmountIo = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) setVisible(false);
      },
      { root, rootMargin: `${unmountMargin}px` }
    );
    // Fetch the component's code a screen or so early, so by the time the card
    // mounts it renders straight away rather than sitting empty while its
    // chunk downloads.
    const preloadIo = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          if (!STILL_PREVIEWS[entry.slug]) ORIGINAL_LOADERS[entry.slug]?.().catch(() => {});
          preloadIo.disconnect();
        }
      },
      { root, rootMargin: `${PRELOAD_MARGIN}px` }
    );
    mountIo.observe(el);
    unmountIo.observe(el);
    preloadIo.observe(el);
    return () => {
      mountIo.disconnect();
      unmountIo.disconnect();
      preloadIo.disconnect();
    };
  }, [entry.slug, entry.category]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setCardSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stillSrc = STILL_PREVIEWS[entry.slug];
  const Comp = stillSrc ? undefined : ORIGINAL_COMPONENTS[entry.slug];
  const live = Boolean(Comp && visible);

  // Must run before the component's own effects read the ratio, hence a
  // layout effect on this parent, which fires ahead of the child's effects.
  useLayoutEffect(() => {
    if (!live) return;
    capPixelRatio();
    return releasePixelRatio;
  }, [live]);
  // Only mount the live component once it is actually near the viewport, and
  // leave it un-animated for `still` thumbnails. Mounting every original at
  // once (each with its own rAF/canvas/WebGL loop) saturates the main thread.
  // Each preview gets its own Suspense boundary. Components are loaded on
  // demand, and while a card's code is still arriving React suspends it; with
  // no boundary of its own, the nearest one was around the entire grid, so the
  // whole page blanked for a frame (and lost its scroll position) every time a
  // new card came into view. The fade sits inside, so it starts once the
  // component is actually ready.
  const node = Comp && visible && (
    <Suspense fallback={null}>
      {/* pointer-events: none keeps previews out of the page's scrolling. About
          twenty originals register non-passive wheel listeners to drive their
          own scroll effects; while the pointer is over one, the browser cannot
          scroll the page until the (busy) main thread answers each wheel event.
          Elements that cannot be hit-tested don't block scrolling, and the card
          around a preview is a link anyway. Interactive previews opt back in. */}
      <div className={`${interactive ? "" : "pointer-events-none "}h-full w-full`} style={{ animation: "sparkPreviewIn 280ms ease-out both" }}>
        <Comp {...entry.defaults} autoPlay={!still} />
      </div>
    </Suspense>
  );
  // Charts and widgets are designed at card size. Full-page originals are
  // not: squeezed into a ~600px card their responsive layouts collapse into
  // the mobile breakpoint and overlap. Lay those out on a desktop-width stage
  // and `zoom` it down, so the thumbnail is a true miniature of the page.
  // Components that measure with getBoundingClientRect must convert back to
  // layout pixels themselves, since rects come back in zoomed pixels.
  const cardSized = CHARTS_PAGE_CATEGORIES.includes(entry.category);
  if (stillSrc) {
    return (
      <div ref={wrapRef} className={`relative bg-black overflow-hidden ${className ?? ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={stillSrc} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
      </div>
    );
  }
  const zoom = cardSize && cardSize.w > 0 ? cardSize.w / STAGE_WIDTH : null;
  return (
    <div
      ref={wrapRef}
      className={`relative bg-black overflow-hidden ${className ?? ""}`}
      // Each live preview rewrites styles every frame. Without containment the
      // browser has to consider the rest of the page when it does, so a dozen
      // of them running at once makes scrolling stutter. `content-visibility`
      // additionally lets it skip rendering cards that are off screen; the
      // parent gives this element a definite size, so that costs no layout
      // stability.
      style={{ contain: "layout paint style", contentVisibility: "auto" }}
    >
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
