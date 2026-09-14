"use client";

/*
 * Adapted from "Horizontal Parallax Gallery" (2D/DOM version) by David Faure
 * for Codrops. https://github.com/davidfaure/horizontal-parallax-gallery-codrops
 * MIT License, Copyright (c) 2009 - 2025 Codrops (https://codrops.com)
 */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const DEFAULT_IMAGES = Array.from({ length: 10 }, (_, i) => `/horizontal-parallax-gallery/photo-${i + 1}.jpg`);

/**
 * A row of pictures that scrolls sideways on the wheel. The row eases after
 * the wheel, and each picture slides the other way inside its frame the
 * further it sits from the centre, so the frames and the pictures move at
 * different speeds.
 */
export default function HorizontalParallaxGallery({
  images = DEFAULT_IMAGES,
  background = "#000000",
  loaderColor = "#ffffff",
  autoPlay = false,
}: {
  /** Pictures along the row, in order. */
  images?: string[];
  background?: string;
  /** Colour of the loading line. */
  loaderColor?: string;
  /** Drifts along the row on its own until the wheel is used. Off by default,
   * as in the reference; grid previews switch it on. */
  autoPlay?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef(autoPlay);
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  });
  const imagesKey = images.join("|");
  // Loading until the current picture list has finished preloading.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== imagesKey;

  // Preload every picture before the row starts, like the reference's loader.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      images.map(
        (src) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => resolve();
            image.onerror = () => resolve();
            image.src = src;
          }),
      ),
    ).then(() => {
      if (!cancelled) setLoadedKey(imagesKey);
    });
    return () => {
      cancelled = true;
    };
    // Keyed on the picture list's content, not the array's identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesKey]);

  useEffect(() => {
    if (loading) return;
    const root = rootRef.current;
    const wrapper = wrapperRef.current;
    const container = containerRef.current;
    if (!root || !wrapper || !container) return;

    const scroll = { current: 0, target: 0, ease: 0.07, limit: 0 };
    let userDriven = false;
    let autoT = 0;
    let raf = 0;

    const setLimit = () => {
      scroll.limit = container.scrollWidth - wrapper.clientWidth;
    };

    const applyParallaxEffect = () => {
      // The reference measures the window; a component measures its own box.
      const box = root.getBoundingClientRect();
      const viewportCenter = box.left + box.width * 0.5;
      const half = box.width * 0.5;
      container.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
        const parent = image.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const elementCenter = rect.left + rect.width * 0.5;
        // -1 (left) .. 0 (centre) .. 1 (right)
        const t = gsap.utils.clamp(-1, 1, (elementCenter - viewportCenter) / half);
        // The image is 125% wide (12.5% spare each side); translateX(%) is of
        // that width, so 10% is the safe maximum.
        const maxShift = 10;
        image.style.transform = `translate3d(${-t * maxShift}%, 0, 0)`;
      });
    };

    const render = () => {
      if (autoPlayRef.current && !userDriven && scroll.limit > 0) {
        // Grid previews: ease back and forth along the whole row.
        autoT += 0.004;
        scroll.target = scroll.limit * (0.5 - 0.5 * Math.cos(autoT));
      }
      scroll.target = gsap.utils.clamp(0, scroll.limit, scroll.target);
      scroll.current = gsap.utils.interpolate(scroll.current, scroll.target, scroll.ease);
      container.style.transform = `translateX(${scroll.current < 0.01 ? 0 : -scroll.current}px)`;
      applyParallaxEffect();
      raf = requestAnimationFrame(render);
    };

    const onWheel = (e: WheelEvent) => {
      // Contained: the wheel drives the row instead of scrolling the page.
      e.preventDefault();
      userDriven = true;
      scroll.target += e.deltaY;
    };

    // Not in the reference, which is wheel-only: touch screens have no wheel,
    // so a finger drag stands in for it. Mouse and pen stay wheel-only.
    let dragX: number | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      dragX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (dragX === null) return;
      userDriven = true;
      scroll.target -= (e.clientX - dragX) * 1.5;
      dragX = e.clientX;
    };
    const onPointerUp = () => {
      dragX = null;
    };

    setLimit();
    const ro = new ResizeObserver(setLimit);
    ro.observe(root);
    ro.observe(container);
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [loading, imagesKey]);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full touch-pan-y select-none overflow-hidden"
      style={{ background }}
    >
      <style>{`
        @keyframes hpg-loader {
          0% { transform: scaleX(0); transform-origin: 0% 50%; }
          50% { transform: scaleX(1); transform-origin: 0% 50%; }
          50.1% { transform: scaleX(1); transform-origin: 100% 50%; }
          100% { transform: scaleX(0); transform-origin: 100% 50%; }
        }
      `}</style>

      <div className="relative flex h-full w-full flex-col items-center justify-center" style={{ padding: 18 }}>
        <div ref={wrapperRef} className="relative w-full overflow-hidden" style={{ height: "60%" }}>
          <div ref={containerRef} className="flex h-full will-change-transform" style={{ gap: 24 }}>
            {images.map((src, i) => (
              <picture key={`${src}-${i}`} className="relative block h-full shrink-0 overflow-hidden" style={{ aspectRatio: "4 / 3" }}>
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="absolute top-0 h-full object-cover"
                  // Past the site-wide img max-width, which would pin it to the frame and
                  // let the counter-shift slide it out of view.
                  style={{ left: "-12.5%", width: "125%", maxWidth: "none" }}
                />
              </picture>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-20" style={{ background }}>
          <div
            className="absolute left-1/2 top-1/2 h-px w-[100px] -ml-[50px]"
            style={{ background: loaderColor, animation: "hpg-loader 1.5s ease-in-out infinite alternate forwards" }}
          />
        </div>
      )}
    </div>
  );
}
