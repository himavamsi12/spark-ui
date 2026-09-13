"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

/** Effective CSS zoom on an untransformed element (1 unless inside a zoomed container). */
function cssZoom(el: HTMLElement): number {
  const layout = el.offsetWidth;
  const visual = el.getBoundingClientRect().width;
  return layout && visual ? visual / layout : 1;
}

/** getBoundingClientRect() in layout pixels, so rects and CSS left/top agree under zoom. */
function layoutRect(el: Element, zoom: number) {
  const r = el.getBoundingClientRect();
  return { left: r.left / zoom, top: r.top / zoom, right: r.right / zoom, bottom: r.bottom / zoom, width: r.width / zoom, height: r.height / zoom };
}

gsap.registerPlugin(CustomEase);

const ITEMS = ["Drawn And Dressed", "Sketch The Look", "Palette Of Style", "Muse In Ink", "Runway Reimagined", "Bold Brushstroke"];
const ROTATIONS = [-10, 10, 8, -8];

export default function ListHoverCards({
  bgColor = "#0f0f0f",
  textColor = "#ffffff",
  growth = 50,
  fontFamily = "var(--font-host-grotesk), sans-serif",
  textScale = 100,
  speed = 100,
  autoPlay = false,
}: {
  bgColor?: string;
  textColor?: string;
  growth?: number;
  fontFamily?: string;
  textScale?: number;
  speed?: number;
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const defaultRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const altRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cardRefs = useRef<(HTMLImageElement | null)[]>([]);
  const baseHeight = useRef(0);
  const interactedRef = useRef(false);
  const rate = Math.max(0.2, speed / 100);

  useEffect(() => {
    if (!CustomEase.get("hop-list")) CustomEase.create("hop-list", "0.35, 0.75, 0, 1");
    const items = itemRefs.current.filter(Boolean) as HTMLDivElement[];
    if (items.length === 0) return;
    items.forEach((el) => (el.style.height = ""));
    baseHeight.current = Math.round(Math.max(...items.map((el) => el.offsetHeight)) + 10);
    gsap.set(items, { height: baseHeight.current });

    const cards = cardRefs.current.filter(Boolean) as HTMLImageElement[];
    cards.forEach((card, i) => {
      const rotation = ROTATIONS[i % ROTATIONS.length];
      card.dataset.rotation = String(rotation);
      card.src = `/list-hover-cards/item_1_card_${i + 1}.jpg`;
      gsap.set(card, { rotation, scale: 0 });
    });
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    let idx = 0;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function cycle() {
      if (cancelled || interactedRef.current) return;
      handleListEnter();
      handleItemEnter(idx);
      timers.push(
        setTimeout(() => {
          if (cancelled || interactedRef.current) return;
          handleItemLeave(idx);
          handleListLeave();
          idx = (idx + 1) % ITEMS.length;
          timers.push(setTimeout(cycle, 500));
        }, 1600),
      );
    }
    const start = setTimeout(cycle, 500);

    return () => {
      cancelled = true;
      clearTimeout(start);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  function animateLabel(el: HTMLSpanElement | null, opts: { opacity: number; scaleX: number; scaleY: number; blur: number }) {
    if (!el) return;
    gsap.to(el, { opacity: opts.opacity, duration: 0.1 / rate, delay: 0.025, ease: "hop-list", overwrite: "auto" });
    gsap.to(el, { scaleX: opts.scaleX, scaleY: opts.scaleY, duration: 0.25 / rate, ease: "back.out(1.75)", overwrite: "auto" });
    gsap.to(el, { filter: `blur(${opts.blur}px)`, duration: 0.25 / rate, ease: "hop-list", overwrite: "auto" });
  }

  function positionCards(itemEl: HTMLDivElement, itemNumber: number) {
    const list = listRef.current;
    const cards = cardRefs.current.filter(Boolean) as HTMLImageElement[];
    if (!list) return;
    const zoom = cssZoom(list);
    const listRect = layoutRect(list, zoom);
    const itemRect = layoutRect(itemEl, zoom);
    const followY = (itemRect.top + itemRect.height / 2 - listRect.top - listRect.height / 2) * 0.75;

    cards.forEach((card, i) => {
      card.src = `/list-hover-cards/item_${itemNumber}_card_${i + 1}.jpg`;
      const baseRotation = Number(card.dataset.rotation ?? 0);
      gsap.to(card, {
        x: gsap.utils.random(-100, 100),
        y: followY + gsap.utils.random(-50, 50),
        rotation: baseRotation + gsap.utils.random(-20, 20),
        duration: 1 / rate,
        ease: "elastic.out(1, 0.5)",
        overwrite: "auto",
      });
    });
  }

  function handleListEnter() {
    const cards = cardRefs.current.filter(Boolean) as HTMLImageElement[];
    gsap.to(cards, { scale: 1, duration: 0.75 / rate, ease: "elastic.out(1, 0.6)", overwrite: "auto" });
  }

  function handleListLeave() {
    const cards = cardRefs.current.filter(Boolean) as HTMLImageElement[];
    const items = itemRefs.current.filter(Boolean) as HTMLDivElement[];
    gsap.to(cards, { scale: 0, duration: 0.5 / rate, ease: "power3.out", overwrite: "auto" });
    gsap.to(items, { height: baseHeight.current, duration: 0.35 / rate, ease: "power3.out", overwrite: "auto" });
  }

  function handleItemEnter(index: number) {
    const items = itemRefs.current.filter(Boolean) as HTMLDivElement[];
    const itemEl = itemRefs.current[index];
    if (!itemEl) return;

    animateLabel(defaultRefs.current[index], { opacity: 0, scaleX: 0.75, scaleY: 1.25, blur: 1 });
    animateLabel(altRefs.current[index], { opacity: 1, scaleX: 1, scaleY: 1, blur: 0 });
    positionCards(itemEl, index + 1);

    const growthPx = (growth / 100) * baseHeight.current * 0.5;
    const weights = items.map((_, i) => (i === index ? 0 : 1 / Math.abs(i - index)));
    const totalWeight = weights.reduce((s, w) => s + w, 0);

    items.forEach((el, i) => {
      const targetHeight =
        i === index
          ? baseHeight.current + growthPx
          : Math.round(baseHeight.current - (growthPx * weights[i]) / totalWeight);
      gsap.to(el, { height: targetHeight, duration: 0.5 / rate, ease: "power2.out", overwrite: "auto" });
    });
  }

  function handleItemLeave(index: number) {
    animateLabel(defaultRefs.current[index], { opacity: 1, scaleX: 1, scaleY: 1, blur: 0 });
    animateLabel(altRefs.current[index], { opacity: 0, scaleX: 0.75, scaleY: 1.25, blur: 1 });
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden flex items-center justify-center px-6"
      style={{ fontFamily, backgroundColor: bgColor }}
    >
      <div className="absolute inset-0 pointer-events-none">
        {[0, 1, 2, 3].map((i) => (
          <img
            key={i}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            alt=""
            className="absolute w-[16%] aspect-[2/3] object-cover rounded-lg border-2 will-change-transform"
            style={{
              borderColor: textColor,
              top: i < 2 ? "10%" : undefined,
              bottom: i >= 2 ? "12%" : undefined,
              left: i % 2 === 0 ? "10%" : undefined,
              right: i % 2 === 1 ? "10%" : undefined,
            }}
          />
        ))}
      </div>

      <div
        ref={listRef}
        onMouseEnter={() => {
          interactedRef.current = true;
          handleListEnter();
        }}
        onMouseLeave={handleListLeave}
        className="relative z-[1] flex flex-col items-center justify-center w-full max-w-sm"
      >
        {ITEMS.map((label, i) => (
          <div
            key={label}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            onMouseEnter={() => handleItemEnter(i)}
            onMouseLeave={() => handleItemLeave(i)}
            className="relative w-full flex items-center justify-center will-change-[height]"
          >
            <span className="relative grid place-items-center">
              <span
                ref={(el) => {
                  defaultRefs.current[i] = el;
                }}
                className="[grid-area:1/1] font-black uppercase tracking-tight text-center whitespace-nowrap"
                style={{ color: textColor, fontSize: `clamp(calc(1rem * ${scale}),calc(3.2vw * ${scale}),calc(2.2rem * ${scale}))` }}
              >
                {label}
              </span>
              <span
                ref={(el) => {
                  altRefs.current[i] = el;
                }}
                className="[grid-area:1/1] italic font-serif text-center whitespace-nowrap opacity-0"
                style={{ color: textColor, fontSize: `clamp(calc(1.1rem * ${scale}),calc(3.6vw * ${scale}),calc(2.4rem * ${scale}))`, transform: "translateY(15%)" }}
              >
                {label}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
