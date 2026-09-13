"use client";

import { useEffect, useRef } from "react";

const DEFAULT_IMAGES = Array.from(
  { length: 20 },
  (_, i) => `/accordion-frames/spotlight-${i + 1}.jpg`,
);

const MathUtils = {
  lerp: (a: number, b: number, n: number) => (1 - n) * a + n * b,
  distance: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1),
};

type TrailItem = {
  element: HTMLDivElement;
  maskLayers: HTMLDivElement[];
  imageLayers: HTMLDivElement[];
  removeTime: number;
};

/**
 * Move the cursor across the frame and it leaves pictures behind it. Each one
 * appears where the cursor was a moment ago and slides to where it is now,
 * opening in ten horizontal bands that split outwards from its middle — then
 * closes the same way from the edges in and fades out.
 */
export default function CursorImageTrail({
  images = DEFAULT_IMAGES,
  heroImage = "/accordion-frames/spotlight-7.jpg",
  lines = ["[ Every Move Leaves a Trace ]", "Trail Study 08 — Spark UI"],
  background = "#101010",
  maskColor = "#000000",
  textColor = "#4e4e4e",
  heroOpacity = 20,
  imageSize = 175,
  mouseThreshold = 110,
  imageLifespan = 1000,
  inDuration = 450,
  outDuration = 1000,
  staggerIn = 45,
  staggerOut = 25,
  slideDuration = 400,
  followStrength = 35,
  fontFamily = "var(--font-commit-mono), monospace",
  textScale = 100,
  autoPlay = true,
}: {
  /** The pictures the cursor leaves behind, cycled in order. */
  images?: string[];
  /** The still behind everything. */
  heroImage?: string;
  /** The two lines at the centre of the frame. */
  lines?: string[];
  background?: string;
  /** The colour behind each band before its picture opens. */
  maskColor?: string;
  textColor?: string;
  /** How visible the still behind everything is, as a %. */
  heroOpacity?: number;
  /** Size of each trail picture, in px. */
  imageSize?: number;
  /** How far the cursor must travel before the next picture drops, in px. */
  mouseThreshold?: number;
  /** How long a picture stays before it starts closing, in ms. */
  imageLifespan?: number;
  /** How long the bands take to open, in ms. */
  inDuration?: number;
  /** How long the bands take to close, in ms. */
  outDuration?: number;
  /** Gap between bands as they open, from the middle out, in ms. */
  staggerIn?: number;
  /** Gap between bands as they close, from the edges in, in ms. */
  staggerOut?: number;
  /** How long a picture takes to catch up to the cursor, in ms. */
  slideDuration?: number;
  /** How closely the trail tracks the cursor, as a %. Lower trails further. */
  followStrength?: number;
  fontFamily?: string;
  textScale?: number;
  /** Traces a path on its own until the pointer is used. */
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const trailContainerRef = useRef<HTMLDivElement>(null);

  const configRef = useRef({
    images,
    maskColor,
    imageSize,
    mouseThreshold,
    imageLifespan,
    inDuration,
    outDuration,
    staggerIn,
    staggerOut,
    slideDuration,
    followStrength,
    autoPlay,
  });
  useEffect(() => {
    configRef.current = {
      images,
      maskColor,
      imageSize,
      mouseThreshold,
      imageLifespan,
      inDuration,
      outDuration,
      staggerIn,
      staggerOut,
      slideDuration,
      followStrength,
      autoPlay,
    };
  });

  useEffect(() => {
    const root = rootRef.current;
    const trailContainer = trailContainerRef.current;
    if (!root || !trailContainer) return;

    /** The reference's own curves. */
    const SLIDE_EASING = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    const EASING = "cubic-bezier(0.87, 0, 0.13, 1)";
    const LAYERS = 10;

    const trail: TrailItem[] = [];
    const timeouts = new Set<number>();
    let currentImageIndex = 0;
    let raf = 0;
    let userDriven = false;
    let autoAngle = 0;

    const mousePos = { x: 0, y: 0 };
    const lastMousePos = { x: 0, y: 0 };
    const interpolatedMousePos = { x: 0, y: 0 };

    // The reference's own gate, and deliberately the window rather than the
    // frame: this switches the whole effect off, not a layout breakpoint, so a
    // small frame on a large screen should still run it.
    const isDesktop = () => window.innerWidth > 1000;

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timeouts.delete(id);
        fn();
      }, ms);
      timeouts.add(id);
    };

    const getMouseDistance = () =>
      MathUtils.distance(mousePos.x, mousePos.y, lastMousePos.x, lastMousePos.y);

    const isInTrailContainer = (x: number, y: number) => {
      const rect = trailContainer!.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    function createTrailImage() {
      const cfg = configRef.current;
      const pool = cfg.images.length ? cfg.images : DEFAULT_IMAGES;
      const half = cfg.imageSize / 2;

      const imgContainer = document.createElement("div");
      imgContainer.style.position = "absolute";
      imgContainer.style.width = `${cfg.imageSize}px`;
      imgContainer.style.height = `${cfg.imageSize}px`;
      imgContainer.style.pointerEvents = "none";

      const imgSrc = pool[currentImageIndex];
      currentImageIndex = (currentImageIndex + 1) % pool.length;

      // It is born where the cursor was a moment ago and slides to where the
      // cursor is now, which is what gives the trail its lag.
      const rect = trailContainer!.getBoundingClientRect();
      const startX = interpolatedMousePos.x - rect.left - half;
      const startY = interpolatedMousePos.y - rect.top - half;
      const targetX = mousePos.x - rect.left - half;
      const targetY = mousePos.y - rect.top - half;

      imgContainer.style.left = `${startX}px`;
      imgContainer.style.top = `${startY}px`;
      imgContainer.style.transition = `left ${cfg.slideDuration}ms ${SLIDE_EASING}, top ${cfg.slideDuration}ms ${SLIDE_EASING}`;

      const maskLayers: HTMLDivElement[] = [];
      const imageLayers: HTMLDivElement[] = [];
      for (let i = 0; i < LAYERS; i++) {
        const layer = document.createElement("div");
        layer.style.position = "absolute";
        layer.style.top = "0";
        layer.style.left = "0";
        layer.style.width = "100%";
        layer.style.height = "100%";
        layer.style.backgroundColor = cfg.maskColor;
        layer.style.willChange = "clip-path";

        const imageLayer = document.createElement("div");
        imageLayer.style.position = "absolute";
        imageLayer.style.top = "0";
        imageLayer.style.left = "0";
        imageLayer.style.width = "100%";
        imageLayer.style.height = "100%";
        imageLayer.style.backgroundSize = "cover";
        imageLayer.style.backgroundPosition = "center";
        imageLayer.style.backgroundImage = `url(${imgSrc})`;

        const bandTop = i * 10;
        const bandBottom = (i + 1) * 10;

        // Each band starts as a zero-width sliver down its own centre line.
        layer.style.clipPath = `polygon(50% ${bandTop}%, 50% ${bandTop}%, 50% ${bandBottom}%, 50% ${bandBottom}%)`;
        layer.style.transition = `clip-path ${cfg.inDuration}ms ${EASING}`;
        layer.style.transform = "translateZ(0)";
        layer.style.backfaceVisibility = "hidden";

        layer.appendChild(imageLayer);
        imgContainer.appendChild(layer);
        maskLayers.push(layer);
        imageLayers.push(imageLayer);
      }

      trailContainer!.appendChild(imgContainer);

      requestAnimationFrame(() => {
        imgContainer.style.left = `${targetX}px`;
        imgContainer.style.top = `${targetY}px`;

        maskLayers.forEach((layer, i) => {
          const bandTop = i * 10;
          const bandBottom = (i + 1) * 10;
          // Bands nearest the middle go first, so the picture splits open.
          const distanceFromMiddle = Math.abs(i - 4.5);
          const delay = distanceFromMiddle * configRef.current.staggerIn;

          later(() => {
            layer.style.clipPath = `polygon(0% ${bandTop}%, 100% ${bandTop}%, 100% ${bandBottom}%, 0% ${bandBottom}%)`;
          }, delay);
        });
      });

      trail.push({
        element: imgContainer,
        maskLayers,
        imageLayers,
        removeTime: Date.now() + cfg.imageLifespan,
      });
    }

    function removeOldImages() {
      const cfg = configRef.current;
      const now = Date.now();
      if (trail.length === 0) return;

      const oldestImage = trail[0];
      if (now < oldestImage.removeTime) return;

      const imgToRemove = trail.shift()!;

      imgToRemove.maskLayers.forEach((layer, i) => {
        const bandTop = i * 10;
        const bandBottom = (i + 1) * 10;
        // Closing runs the other way: the outermost bands go first.
        const distanceFromEdge = 4.5 - Math.abs(i - 4.5);
        const delay = distanceFromEdge * cfg.staggerOut;

        layer.style.transition = `clip-path ${cfg.outDuration}ms ${EASING}`;

        later(() => {
          layer.style.clipPath = `polygon(50% ${bandTop}%, 50% ${bandTop}%, 50% ${bandBottom}%, 50% ${bandBottom}%)`;
        }, delay);
      });

      imgToRemove.imageLayers.forEach((imageLayer) => {
        imageLayer.style.transition = `opacity ${cfg.outDuration}ms ${EASING}`;
        imageLayer.style.opacity = "0.25";
      });

      later(() => {
        imgToRemove.element.parentNode?.removeChild(imgToRemove.element);
      }, cfg.outDuration + 112);
    }

    // The reference tears the trail down when the window drops below its
    // threshold and rebuilds it on the way back up; without this the pictures
    // already on screen would be left frozen there.
    function clearTrail() {
      timeouts.forEach((id) => clearTimeout(id));
      timeouts.clear();
      trail.forEach((item) => item.element.parentNode?.removeChild(item.element));
      trail.length = 0;
    }

    let wasDesktop = isDesktop();

    function render() {
      const desktop = isDesktop();
      if (desktop !== wasDesktop) {
        wasDesktop = desktop;
        if (!desktop) clearTrail();
      }

      if (!desktop) {
        raf = requestAnimationFrame(render);
        return;
      }

      const cfg = configRef.current;

      // Traces a slow wandering path so the trail shows itself unattended.
      if (cfg.autoPlay && !userDriven) {
        const rect = trailContainer!.getBoundingClientRect();
        autoAngle += 0.012;
        mousePos.x = rect.left + rect.width * (0.5 + 0.32 * Math.cos(autoAngle));
        mousePos.y = rect.top + rect.height * (0.5 + 0.26 * Math.sin(autoAngle * 1.7));
      }

      const distance = getMouseDistance();

      // The reference lerps at a flat 0.1, which leaves the spawn point a long
      // way behind the cursor and is most of why its trail feels heavy.
      const follow = Math.min(1, Math.max(0.02, cfg.followStrength / 100));
      interpolatedMousePos.x = MathUtils.lerp(
        interpolatedMousePos.x || mousePos.x,
        mousePos.x,
        follow,
      );
      interpolatedMousePos.y = MathUtils.lerp(
        interpolatedMousePos.y || mousePos.y,
        mousePos.y,
        follow,
      );

      if (distance > cfg.mouseThreshold && isInTrailContainer(mousePos.x, mousePos.y)) {
        createTrailImage();
        lastMousePos.x = mousePos.x;
        lastMousePos.y = mousePos.y;
      }

      removeOldImages();
      raf = requestAnimationFrame(render);
    }

    function handleMouseMove(e: MouseEvent) {
      // Taking over from the idle path has to reset the lagged position too.
      // Left alone it still holds a point on that path, and the first pictures
      // would be born there and spend the whole slide catching up to the
      // cursor — a delay the reference never has, because it never idles.
      if (!userDriven) {
        userDriven = true;
        mousePos.x = interpolatedMousePos.x = lastMousePos.x = e.clientX;
        mousePos.y = interpolatedMousePos.y = lastMousePos.y = e.clientY;
        return;
      }

      mousePos.x = e.clientX;
      mousePos.y = e.clientY;
    }

    document.addEventListener("mousemove", handleMouseMove);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", handleMouseMove);
      clearTrail();
    };
  }, [images.length]);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background, fontFamily, containerType: "inline-size" }}
    >
      <div className="absolute inset-0" style={{ opacity: heroOpacity / 100 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImage} alt="" className="h-full w-full object-cover" draggable={false} />
      </div>

      <div className="relative flex h-full w-full flex-col items-center justify-center">
        {lines.map((line, i) => (
          <p
            key={i}
            className="select-none uppercase"
            style={{ color: textColor, fontSize: `calc(0.85rem * ${scale})` }}
          >
            {line}
          </p>
        ))}
      </div>

      {/* The trail is laid out by hand, above the still and the lines. */}
      <div ref={trailContainerRef} className="absolute inset-0 z-[2] overflow-hidden" />
    </div>
  );
}
