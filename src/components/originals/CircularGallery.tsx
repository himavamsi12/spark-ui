"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const IMAGE_COUNT = 12;

type GalleryItem = {
  wrapper: HTMLDivElement;
  frame: HTMLDivElement;
  image: HTMLImageElement;
  ringAngle: number;
};

export default function CircularGallery({
  centerLabel = "spark ui",
  speed = 100,
  tiltAngle = -20,
  hoverScale = 110,
  dimStrength = 65,
  fontFamily = "var(--font-dm-sans), sans-serif",
  textScale = 100,
}: {
  centerLabel?: string;
  speed?: number;
  tiltAngle?: number;
  hoverScale?: number;
  dimStrength?: number;
  fontFamily?: string;
  textScale?: number;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const gallery = galleryRef.current;
    if (!root || !gallery) return;

    gallery.innerHTML = "";
    const items: GalleryItem[] = [];

    for (let i = 0; i < IMAGE_COUNT; i++) {
      const wrapper = document.createElement("div");
      wrapper.className = "absolute";
      wrapper.style.top = "50%";
      wrapper.style.left = "50%";
      wrapper.style.width = "23%";
      wrapper.style.aspectRatio = "3 / 2";
      wrapper.style.marginLeft = "-11.5%";
      wrapper.style.marginTop = "-8%";

      const frame = document.createElement("div");
      frame.className = "w-full h-full overflow-hidden rounded";

      const image = document.createElement("img");
      image.src = `/circular-gallery/img${i + 1}.jpg`;
      image.className = "w-full h-full object-cover";
      image.draggable = false;

      frame.appendChild(image);
      wrapper.appendChild(frame);
      gallery.appendChild(wrapper);

      gsap.set(frame, { scale: 1 });
      gsap.set(image, { scale: 1.1 });
      gsap.set(wrapper, { filter: "saturate(1) brightness(1)" });

      items.push({ wrapper, frame, image, ringAngle: (i / IMAGE_COUNT) * Math.PI * 2 });
    }

    let ovalRadiusX = 0;
    let ovalRadiusY = 0;
    let tiltCos = 0;
    let tiltSin = 0;

    function measure() {
      if (!root) return;
      // Layout size, so a zoomed grid preview keeps the full-size oval.
      const rect = { width: root.clientWidth, height: root.clientHeight };
      ovalRadiusX = rect.width * 0.3;
      ovalRadiusY = rect.height * 0.28;
      const rad = (tiltAngle * Math.PI) / 180;
      tiltCos = Math.cos(rad);
      tiltSin = Math.sin(rad);
    }
    measure();

    function positionItem(item: GalleryItem, rotation: number) {
      const angle = item.ringAngle + rotation;
      const ovalX = Math.cos(angle) * ovalRadiusX;
      const ovalY = Math.sin(angle) * ovalRadiusY;
      const tiltedX = ovalX * tiltCos - ovalY * tiltSin;
      const tiltedY = ovalX * tiltSin + ovalY * tiltCos;
      item.wrapper.style.transform = `translate(${tiltedX}px, ${tiltedY}px)`;
    }
    items.forEach((item) => positionItem(item, 0));

    const ro = new ResizeObserver(measure);
    ro.observe(root);

    let ringRotation = 0;
    let rotationDirection = 1;
    const idleSpeed = 0.035 * (speed / 100);
    let rotationSpeed = idleSpeed;
    let pointerX = -1;
    let pointerY = -1;
    let hoveredItem: GalleryItem | null = null;
    let raf = 0;

    function getHoveredItem(): GalleryItem | null {
      if (pointerX < 0) return null;
      const target = document.elementFromPoint(pointerX, pointerY);
      const wrapperEl = target ? (target as HTMLElement).closest(".gallery-item") : null;
      if (!wrapperEl) return null;
      return items.find((it) => it.wrapper === wrapperEl) ?? null;
    }

    function applyHoverState(activeItem: GalleryItem | null) {
      items.forEach((item) => {
        const isActive = item === activeItem;
        const isDimmed = !!activeItem && !isActive;
        gsap.to(item.frame, { scale: isActive ? hoverScale / 100 : 1, duration: 1, ease: "expo.out", overwrite: true });
        gsap.to(item.image, { scale: isActive ? 1 : 1.1, duration: 1, ease: "expo.out", overwrite: true });
        gsap.to(item.wrapper, {
          filter: `saturate(${isDimmed ? 0 : 1}) brightness(${isDimmed ? 1 - dimStrength / 100 : 1})`,
          duration: 1,
          ease: "expo.out",
          overwrite: true,
        });
      });
    }

    items.forEach((item) => item.wrapper.classList.add("gallery-item"));

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      rotationDirection = e.deltaY > 0 ? 1 : -1;
      rotationSpeed = Math.min(rotationSpeed + Math.abs(e.deltaY) * 0.0055, 2.5);
    }
    function onMove(e: MouseEvent) {
      pointerX = e.clientX;
      pointerY = e.clientY;
    }
    function onLeave() {
      pointerX = -1;
      pointerY = -1;
    }

    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);

    function loop() {
      rotationSpeed += (idleSpeed - rotationSpeed) * 0.05;
      ringRotation += rotationSpeed * rotationDirection;
      const rad = (ringRotation * Math.PI) / 180;

      const current = getHoveredItem();
      if (current !== hoveredItem) {
        hoveredItem = current;
        applyHoverState(current);
      }

      items.forEach((item) => positionItem(item, rad));
      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [speed, tiltAngle, hoverScale, dimStrength]);

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden bg-black" style={{ fontFamily }}>
      <div ref={galleryRef} className="absolute inset-0" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur border border-white/10 text-white/70 uppercase tracking-wide pointer-events-none"
        style={{ fontSize: `calc(10px * ${scale})` }}
      >
        {centerLabel}
      </div>
    </div>
  );
}
