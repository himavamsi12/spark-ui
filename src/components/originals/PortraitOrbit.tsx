"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

const DEFAULT_TITLES = ["Sunlit Field", "Golden Hair", "Film Camera", "Hooded Tide", "Wild Bloom", "Lake Stand", "Low Fog", "Blue Hour", "City Edge", "Last Light", "Window Seat", "Shutter Hands", "Spark Night", "Knit Cap", "Golden Hush", "Pine Walk", "Page Turn", "Autumn Scarf", "Paddle Out", "Soft Gaze"];

const DEFAULT_IMAGES = Array.from({ length: 20 }, (_, i) => `/portrait-orbit/photo-${i + 1}.jpg`);

type CardState = {
  currentRotation: number;
  targetRotation: number;
  currentX: number;
  targetX: number;
  currentY: number;
  targetY: number;
  currentScale: number;
  targetScale: number;
  angle: number;
};

/**
 * A ring of small portrait cards that flip, swell and push outward as the
 * cursor passes, with the whole ring tilting in 3D toward the pointer. Click a
 * card and the ring spins it to the top and zooms in on it while its title
 * rises in; click anywhere or press Escape to return.
 */
export default function PortraitOrbit({
  brand = "Quiet Faces",
  navAction = "Browse Archive",
  footerLabel = "Volume Four",
  titles = DEFAULT_TITLES,
  images = DEFAULT_IMAGES,
  imageCount = 25,
  radius = 275,
  sensitivity = 500,
  effectFalloff = 250,
  cardMoveAmount = 50,
  background = "#15171c",
  textColor = "#ece6da",
  fontFamily = "var(--font-host-grotesk), sans-serif",
  textScale = 100,
  autoPlay = false,
}: {
  brand?: string;
  navAction?: string;
  footerLabel?: string;
  titles?: string[];
  images?: string[];
  imageCount?: number;
  radius?: number;
  sensitivity?: number;
  effectFalloff?: number;
  cardMoveAmount?: number;
  background?: string;
  textColor?: string;
  fontFamily?: string;
  textScale?: number;
  /** Sweep an invisible pointer around the ring, for previews nobody is hovering. */
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const galleryContainerRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const galleryContainer = galleryContainerRef.current;
    const gallery = galleryRef.current;
    const titleContainer = titleContainerRef.current;
    if (!root || !galleryContainer || !gallery || !titleContainer) return;

    const collection = images.map((img, i) => ({ img, title: titles[i % Math.max(1, titles.length)] ?? "" }));
    if (collection.length === 0) return;

    gallery.innerHTML = "";
    titleContainer.innerHTML = "";

    const cards: HTMLDivElement[] = [];
    const transformState: CardState[] = [];

    let currentTitle: HTMLParagraphElement | null = null;
    let currentSplit: SplitText | null = null;
    let isPreviewActive = false;
    let isTransitioning = false;

    // The reference reads the window; a component reads its own box instead.
    const config = {
      imageCount,
      radius,
      sensitivity,
      effectFalloff,
      cardMoveAmount,
      lerpFactor: 0.15,
      isMobile: root.clientWidth < 1000,
    };

    const parallaxState = {
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      currentX: 0,
      currentY: 0,
      currentZ: 0,
    };

    const onCardClick = (e: MouseEvent) => {
      const card = e.currentTarget as HTMLDivElement;
      if (!isPreviewActive && !isTransitioning) {
        togglePreview(parseInt(card.dataset.index ?? "0"));
        e.stopPropagation();
      }
    };

    for (let i = 0; i < config.imageCount; i++) {
      const angle = (i / config.imageCount) * Math.PI * 2;
      const x = config.radius * Math.cos(angle);
      const y = config.radius * Math.sin(angle);
      const cardIndex = i % collection.length;

      const card = document.createElement("div");
      card.dataset.index = String(i);
      card.dataset.title = collection[cardIndex].title;
      Object.assign(card.style, {
        position: "absolute",
        width: "45px",
        height: "60px",
        borderRadius: "4px",
        transformOrigin: "center",
        willChange: "transform",
        transformStyle: "preserve-3d",
        backfaceVisibility: "visible",
        overflow: "hidden",
        cursor: "pointer",
      });

      const img = document.createElement("img");
      img.src = collection[cardIndex].img;
      img.alt = "";
      img.draggable = false;
      Object.assign(img.style, {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        backfaceVisibility: "hidden",
      });
      card.appendChild(img);

      gsap.set(card, {
        x,
        y,
        rotation: (angle * 180) / Math.PI + 90,
        transformPerspective: 800,
        transformOrigin: "center center",
      });

      gallery.appendChild(card);
      cards.push(card);
      transformState.push({
        currentRotation: 0,
        targetRotation: 0,
        currentX: 0,
        targetX: 0,
        currentY: 0,
        targetY: 0,
        currentScale: 1,
        targetScale: 1,
        angle,
      });

      card.addEventListener("click", onCardClick);
    }

    function galleryScaleFor(width: number) {
      if (width < 768) return 0.6;
      if (width < 1200) return 0.8;
      return 1;
    }

    function togglePreview(index: number) {
      isPreviewActive = true;
      isTransitioning = true;

      const angle = transformState[index].angle;
      const targetPosition = (Math.PI * 3) / 2;
      let rotationRadians = targetPosition - angle;

      if (rotationRadians > Math.PI) rotationRadians -= Math.PI * 2;
      else if (rotationRadians < -Math.PI) rotationRadians += Math.PI * 2;

      transformState.forEach((state) => {
        state.currentRotation = state.targetRotation = 0;
        state.currentScale = state.targetScale = 1;
        state.currentX = state.targetX = state.currentY = state.targetY = 0;
      });

      gsap.to(gallery, {
        onStart: () => {
          cards.forEach((card, i) => {
            gsap.to(card, {
              x: config.radius * Math.cos(transformState[i].angle),
              y: config.radius * Math.sin(transformState[i].angle),
              rotationY: 0,
              scale: 1,
              duration: 1.25,
              ease: "power4.out",
            });
          });
        },
        scale: 5,
        y: 1300,
        rotation: (rotationRadians * 180) / Math.PI + 360,
        duration: 2,
        ease: "power4.inOut",
        onComplete: () => {
          isTransitioning = false;
        },
      });

      gsap.to(parallaxState, {
        currentX: 0,
        currentY: 0,
        currentZ: 0,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => {
          gsap.set(galleryContainer, {
            rotateX: parallaxState.currentX,
            rotateY: parallaxState.currentY,
            rotation: parallaxState.currentZ,
            transformOrigin: "center center",
          });
        },
      });

      const titleText = cards[index].dataset.title ?? "";
      const p = document.createElement("p");
      p.textContent = titleText;
      Object.assign(p.style, {
        position: "absolute",
        width: "100%",
        textAlign: "center",
        fontSize: `${36 * scale}px`,
        letterSpacing: "-0.05rem",
        lineHeight: "1",
        fontWeight: "600",
      });
      titleContainer!.appendChild(p);
      currentTitle = p;

      const splitText = new SplitText(p, { type: "words", wordsClass: "word" });
      currentSplit = splitText;
      const words = splitText.words as HTMLElement[];
      words.forEach((w) => {
        w.style.position = "relative";
        w.style.display = "inline-block";
        w.style.willChange = "transform";
      });

      gsap.set(words, { y: "125%" });
      gsap.to(words, {
        y: "0%",
        duration: 0.75,
        delay: 1.25,
        stagger: 0.1,
        ease: "power4.out",
      });
    }

    function resetGallery() {
      if (isTransitioning) return;

      isTransitioning = true;

      if (currentTitle) {
        const title = currentTitle;
        const words = title.querySelectorAll(".word");
        gsap.to(words, {
          y: "-125%",
          duration: 0.75,
          delay: 0.5,
          stagger: 0.1,
          ease: "power4.out",
          onComplete: () => {
            title.remove();
            if (currentTitle === title) currentTitle = null;
          },
        });
      }

      gsap.to(gallery, {
        scale: galleryScaleFor(root!.clientWidth),
        y: 0,
        x: 0,
        rotation: 0,
        duration: 2.5,
        ease: "power4.inOut",
        onComplete: () => {
          isPreviewActive = isTransitioning = false;
          Object.assign(parallaxState, {
            targetX: 0,
            targetY: 0,
            targetZ: 0,
            currentX: 0,
            currentY: 0,
            currentZ: 0,
          });
        },
      });
    }

    function handleResize() {
      const width = root!.clientWidth;
      config.isMobile = width < 1000;

      gsap.set(gallery, { scale: galleryScaleFor(width) });

      if (!isPreviewActive) {
        parallaxState.targetX = 0;
        parallaxState.targetY = 0;
        parallaxState.targetZ = 0;
        parallaxState.currentX = 0;
        parallaxState.currentY = 0;
        parallaxState.currentZ = 0;

        transformState.forEach((state) => {
          state.targetRotation = 0;
          state.currentRotation = 0;
          state.targetScale = 1;
          state.currentScale = 1;
          state.targetX = 0;
          state.currentX = 0;
          state.targetY = 0;
          state.currentY = 0;
        });
      }
    }

    const ro = new ResizeObserver(handleResize);
    ro.observe(root);
    handleResize();

    const onRootClick = () => {
      if (isPreviewActive && !isTransitioning) resetGallery();
    };
    root.addEventListener("click", onRootClick);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPreviewActive && !isTransitioning) resetGallery();
    };
    document.addEventListener("keydown", onKeyDown);

    const onMouseMove = (e: MouseEvent) => {
      if (isPreviewActive || isTransitioning || config.isMobile) return;

      // Centre and distances come from the component's box rather than the
      // window. Everything here stays in on-screen pixels, then distances are
      // mapped back to layout pixels so a zoomed preview card behaves the same.
      const rect = root!.getBoundingClientRect();
      const zoom = root!.offsetWidth ? rect.width / root!.offsetWidth : 1;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const percentX = (e.clientX - centerX) / (rect.width / 2);
      const percentY = (e.clientY - centerY) / (rect.height / 2);

      parallaxState.targetY = percentX * 15;
      parallaxState.targetX = -percentY * 15;
      parallaxState.targetZ = (percentX + percentY) * 5;

      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const dx = e.clientX - (cardRect.left + cardRect.width / 2);
        const dy = e.clientY - (cardRect.top + cardRect.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy) / (zoom || 1);

        if (distance < config.sensitivity && !config.isMobile) {
          const flipFactor = Math.max(0, 1 - distance / config.effectFalloff);
          const angle = transformState[index].angle;
          const moveAmount = config.cardMoveAmount * flipFactor;

          transformState[index].targetRotation = 180 * flipFactor;
          transformState[index].targetScale = 1 + 0.3 * flipFactor;
          transformState[index].targetX = moveAmount * Math.cos(angle);
          transformState[index].targetY = moveAmount * Math.sin(angle);
        } else {
          transformState[index].targetRotation = 0;
          transformState[index].targetScale = 1;
          transformState[index].targetX = 0;
          transformState[index].targetY = 0;
        }
      });
    };
    root.addEventListener("mousemove", onMouseMove);

    // The reference resets when the pointer leaves the window; here, the box.
    const onMouseLeave = () => {
      if (!isPreviewActive && !isTransitioning) {
        transformState.forEach((state) => {
          state.targetRotation = 0;
          state.targetScale = 1;
          state.targetX = 0;
          state.targetY = 0;
        });
        parallaxState.targetX = 0;
        parallaxState.targetY = 0;
        parallaxState.targetZ = 0;
      }
    };
    root.addEventListener("mouseleave", onMouseLeave);

    let raf = 0;
    // Once the pointer has left and every card has eased back to rest, each
    // frame would re-apply the same 3D transforms to the ring and all its
    // cards. Skip those frames; any pointer movement wakes it up again.
    const settled = () => {
      const eps = 0.01;
      const p = parallaxState;
      if (Math.abs(p.targetX - p.currentX) > eps || Math.abs(p.targetY - p.currentY) > eps || Math.abs(p.targetZ - p.currentZ) > eps) return false;
      return transformState.every(
        (st) =>
          Math.abs(st.targetRotation - st.currentRotation) < eps &&
          Math.abs(st.targetScale - st.currentScale) < 0.0005 &&
          Math.abs(st.targetX - st.currentX) < eps &&
          Math.abs(st.targetY - st.currentY) < eps,
      );
    };
    let restingApplied = false;

    // Auto-play: a virtual pointer circles just outside the ring, feeding the
    // same hover logic as a real cursor, so the cards flip and push outward as
    // it passes and the ring tilts toward it.
    const autoStart = performance.now();
    function autoPointer() {
      const rect = root!.getBoundingClientRect();
      if (!rect.width) return;
      const zoom = root!.offsetWidth ? rect.width / root!.offsetWidth : 1;
      const t = (performance.now() - autoStart) / 1000;
      const angle = t * ((Math.PI * 2) / 9) - Math.PI / 2; // one lap every 9s, starting at the top
      const r = config.radius * galleryScaleFor(root!.clientWidth) * zoom * (1.08 + 0.06 * Math.sin(t * 0.8));
      onMouseMove({ clientX: rect.left + rect.width / 2 + Math.cos(angle) * r, clientY: rect.top + rect.height / 2 + Math.sin(angle) * r } as MouseEvent);
    }

    function animate() {
      if (autoPlay) autoPointer();
      if (!isPreviewActive && !isTransitioning && settled()) {
        // Apply the exact rest values once, then idle.
        if (!restingApplied) {
          restingApplied = true;
        } else {
          raf = requestAnimationFrame(animate);
          return;
        }
      } else {
        restingApplied = false;
      }
      if (!isPreviewActive && !isTransitioning) {
        parallaxState.currentX += (parallaxState.targetX - parallaxState.currentX) * config.lerpFactor;
        parallaxState.currentY += (parallaxState.targetY - parallaxState.currentY) * config.lerpFactor;
        parallaxState.currentZ += (parallaxState.targetZ - parallaxState.currentZ) * config.lerpFactor;

        gsap.set(galleryContainer, {
          rotateX: parallaxState.currentX,
          rotateY: parallaxState.currentY,
          rotation: parallaxState.currentZ,
          transformOrigin: "center center",
        });

        cards.forEach((card, index) => {
          const state = transformState[index];

          state.currentRotation += (state.targetRotation - state.currentRotation) * config.lerpFactor;
          state.currentScale += (state.targetScale - state.currentScale) * config.lerpFactor;
          state.currentX += (state.targetX - state.currentX) * config.lerpFactor;
          state.currentY += (state.targetY - state.currentY) * config.lerpFactor;

          const angle = state.angle;
          const x = config.radius * Math.cos(angle);
          const y = config.radius * Math.sin(angle);

          gsap.set(card, {
            x: x + state.currentX,
            y: y + state.currentY,
            rotationY: state.currentRotation,
            scale: state.currentScale,
            rotation: (angle * 180) / Math.PI + 90,
            transformOrigin: "center center",
            transformPerspective: 1000,
          });
        });
      }
      raf = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("click", onRootClick);
      root.removeEventListener("mousemove", onMouseMove);
      root.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("keydown", onKeyDown);
      cards.forEach((card) => card.removeEventListener("click", onCardClick));
      gsap.killTweensOf([gallery, galleryContainer, parallaxState, ...cards]);
      if (currentSplit) currentSplit.revert();
      gallery.innerHTML = "";
      titleContainer.innerHTML = "";
    };
  }, [images, titles, imageCount, radius, sensitivity, effectFalloff, cardMoveAmount, scale, autoPlay]);

  const labelStyle = {
    color: textColor,
    fontFamily,
    fontSize: `${15 * scale}px`,
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: "-0.02rem",
    textDecoration: "none",
  } as const;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background, color: textColor, fontFamily }}
    >
      <nav className="absolute left-0 top-0 z-[2] flex w-full items-center justify-between p-[2em]">
        <a href="#" onClick={(e) => e.preventDefault()} style={labelStyle}>
          {brand}
        </a>
        <p style={labelStyle}>{navAction}</p>
      </nav>

      <div className="relative h-full w-full overflow-hidden">
        <div
          ref={galleryContainerRef}
          className="relative flex h-full w-full items-center justify-center"
          style={{ transformStyle: "preserve-3d", perspective: "2000px", willChange: "transform" }}
        >
          <div
            ref={galleryRef}
            className="relative flex items-center justify-center"
            style={{ width: 600, height: 600, transformOrigin: "center", willChange: "transform" }}
          />
        </div>
        <div
          ref={titleContainerRef}
          className="absolute left-1/2 w-full"
          style={{
            bottom: "25%",
            transform: "translate(-50%, -50%)",
            height: `${42 * scale}px`,
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
            color: textColor,
            fontFamily,
          }}
        />
      </div>

      <footer className="absolute bottom-0 left-0 z-[2] flex w-full items-center justify-between p-[2em]">
        <p style={labelStyle}>{footerLabel}</p>
      </footer>
    </div>
  );
}
