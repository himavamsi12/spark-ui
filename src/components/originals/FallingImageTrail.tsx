"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const DEFAULT_IMAGES = Array.from({ length: 10 }, (_, i) => `/falling-image-trail/object-${i + 1}.png`);

/**
 * Move the pointer and pictures drop out of it: each one pops in with an
 * elastic squash, gets flung along the direction you were moving, lands on the
 * bottom edge, then bounces off the frame. A new one drops every time the
 * pointer has travelled a set distance, so faster movement throws more.
 */
export default function FallingImageTrail({
  images = DEFAULT_IMAGES,
  lines = ["Wave your cursor to drop", "pictures that tumble down"],
  background = "#121212",
  textColor = "#f1f1f1",
  mutedColor = "#999999",
  fontFamily = "var(--font-inter), sans-serif",
  textScale = 100,
  autoPlay = true,
}: {
  /** Pictures that drop, cycled in order. */
  images?: string[];
  /** Two lines at the centre; the second is shown muted. */
  lines?: string[];
  background?: string;
  textColor?: string;
  /** Colour of the second line. */
  mutedColor?: string;
  fontFamily?: string;
  textScale?: number;
  /** Traces a path on its own until the pointer is used. */
  autoPlay?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef(images);
  const autoPlayRef = useRef(autoPlay);
  useEffect(() => {
    imagesRef.current = images;
    autoPlayRef.current = autoPlay;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let incr = 0;
    let oldIncrX = 0;
    let oldIncrY = 0;
    let firstMove = true;
    let indexImg = 0;
    let userDriven = false;
    const timelines = new Set<gsap.core.Timeline>();

    // The reference measures the window; a component measures its own box.
    const isCoarsePointer = window.matchMedia("(hover: none)").matches;
    const width = () => root.clientWidth;
    const height = () => root.clientHeight;

    function applyMove(localX: number, localY: number) {
      const valX = gsap.utils.clamp(0, width(), localX);
      const valY = gsap.utils.clamp(0, height(), localY);

      if (firstMove) {
        firstMove = false;
        oldIncrX = valX;
        oldIncrY = valY;
        return;
      }

      incr += Math.abs(valX - oldIncrX) + Math.abs(valY - oldIncrY);

      if (incr > width() / (isCoarsePointer ? 6 : 8)) {
        incr = 0;
        createMedia(valX, valY, valX - oldIncrX, valY - oldIncrY);
      }

      oldIncrX = valX;
      oldIncrY = valY;
    }

    function fromEvent(clientX: number, clientY: number) {
      const r = root!.getBoundingClientRect();
      // The detail page can render the frame scaled; map back to its own pixels.
      const sx = r.width / (root!.offsetWidth || r.width);
      const sy = r.height / (root!.offsetHeight || r.height);
      applyMove((clientX - r.left) / sx, (clientY - r.top) / sy);
    }

    function handleMouseMove(e: MouseEvent) {
      if (!userDriven) {
        userDriven = true;
        firstMove = true;
      }
      fromEvent(e.clientX, e.clientY);
    }

    function handleTouchMove(e: TouchEvent) {
      if (!e.touches || !e.touches[0]) return;
      if (!userDriven) {
        userDriven = true;
        firstMove = true;
      }
      fromEvent(e.touches[0].clientX, e.touches[0].clientY);
    }

    root.addEventListener("mousemove", handleMouseMove);
    root.addEventListener("touchstart", handleTouchMove, { passive: true });
    root.addEventListener("touchmove", handleTouchMove, { passive: true });

    function createMedia(x: number, y: number, deltaX: number, deltaY: number) {
      const H = height();
      void deltaY;

      if (y > H - 200) return;

      const list = imagesRef.current;
      if (list.length === 0) return;

      const image = document.createElement("img");
      image.src = list[indexImg % list.length];
      image.alt = "";
      image.draggable = false;
      // 15vw (35vw on narrow screens) in the reference, taken from the frame here.
      const size = width() < 768 ? "35%" : "15%";
      Object.assign(image.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: size,
        aspectRatio: "1 / 1",
        height: "auto",
        objectFit: "cover",
        borderRadius: "4%",
        zIndex: "5",
        pointerEvents: "none",
      });
      root!.appendChild(image);

      const tl = gsap.timeline({
        onComplete: () => {
          image.remove();
          timelines.delete(tl);
          tl.kill();
        },
      });
      timelines.add(tl);

      tl.fromTo(
        image,
        {
          xPercent: -50 + (Math.random() - 0.5) * 80,
          yPercent: -50 + (Math.random() - 0.5) * 10,
          scaleX: 1.3,
          scaleY: 1.3,
          rotation: (Math.random() - 0.5) * 20,
        },
        {
          scaleX: 1,
          scaleY: 1,
          ease: "elastic.out(2, 0.6)",
          duration: 0.4,
        },
      );

      tl.fromTo(
        image,
        { x },
        {
          x: "+=" + deltaX * 2,
          rotation: 0,
          ease: "power1.in",
          duration: 0.4,
        },
        "<",
      );

      tl.fromTo(
        image,
        { y },
        {
          y: "+=" + (H - y),
          scale: 0.9,
          // Lands the bottom edge exactly on the frame's bottom, given the 0.9 scale.
          yPercent: -95,
          ease: "back.in(1.1)",
          duration: 0.4,
        },
        "<",
      );

      // Bounce
      tl.to(image, {
        x: "+=" + deltaX * 1.6,
        rotation: (Math.random() - 0.5) * 40,
        ease: "power1.in",
        duration: 0.3,
      });
      tl.to(
        image,
        {
          yPercent: 150,
          ease: "back.in(" + (1.5 + (1 - y / H)) + ")",
          duration: 0.3,
        },
        "<",
      );

      indexImg = (indexImg + 1) % list.length;
    }

    // Grid previews: sweep a figure-eight through the upper frame until the
    // pointer takes over, feeding it through the same move handler.
    let raf = 0;
    let t = 0;
    function autoLoop() {
      raf = requestAnimationFrame(autoLoop);
      if (!autoPlayRef.current || userDriven) return;
      t += 0.022;
      const w = width();
      const h = height();
      applyMove(w * (0.5 + 0.36 * Math.sin(t)), h * (0.34 + 0.14 * Math.sin(t * 2)));
    }
    raf = requestAnimationFrame(autoLoop);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("mousemove", handleMouseMove);
      root.removeEventListener("touchstart", handleTouchMove);
      root.removeEventListener("touchmove", handleTouchMove);
      timelines.forEach((tl) => tl.kill());
      root.querySelectorAll(":scope > img").forEach((el) => el.remove());
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full select-none overflow-hidden"
      style={{ background, color: textColor, fontFamily, containerType: "size" }}
    >
      <p
        className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center font-medium"
        style={{
          fontSize: `calc(min(60px, 5.6cqw) * ${textScale / 100})`,
          lineHeight: 1.3,
          letterSpacing: "-0.03em",
        }}
      >
        {lines.map((line, i) => (
          <span
            key={i}
            className="block w-max"
            style={{ color: i === lines.length - 1 && lines.length > 1 ? mutedColor : undefined }}
          >
            {line}
          </span>
        ))}
      </p>
    </div>
  );
}
