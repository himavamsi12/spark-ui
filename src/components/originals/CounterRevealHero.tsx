"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
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

gsap.registerPlugin(SplitText, CustomEase);

const DEFAULT_WORDS = ["Studios", "Season", "Chamber", "Archive", "Vision"];
const IMAGES = Array.from({ length: 10 }, (_, i) => `/counter-reveal/img${i + 1}.jpg`);

export default function CounterRevealHero({
  words = DEFAULT_WORDS,
  eyebrow = "Currently Developing",
  accentColor = "#272d2d",
  title1 = "Everything",
  title2 = "Beneath",
  title3 = "The Surface",
  fontFamily = "var(--font-neue-montreal)",
  textScale = 100,
  speed = 100,
}: {
  words?: string[];
  eyebrow?: string;
  accentColor?: string;
  title1?: string;
  title2?: string;
  title3?: string;
  fontFamily?: string;
  textScale?: number;
  speed?: number;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const preloaderRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLHeadingElement>(null);
  const wordRef = useRef<HTMLHeadingElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const heroHeadingsRef = useRef<(HTMLHeadingElement | null)[]>([]);
  const frameRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLParagraphElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CustomEase.get("hop-counter")) CustomEase.create("hop-counter", "0.8, 0, 0.1, 1");

    const root = rootRef.current;
    const preloader = preloaderRef.current;
    const counterEl = counterRef.current;
    const wordEl = wordRef.current;
    const frame = frameRef.current;
    const footer = footerRef.current;
    const fade = fadeRef.current;
    const headings = heroHeadingsRef.current.filter(Boolean) as HTMLHeadingElement[];
    if (!root || !preloader || !counterEl || !wordEl || !frame || !footer || !fade || headings.length !== 3) return;

    const rate = Math.max(0.2, speed / 100);
    const zoom = cssZoom(root);
    const rootRect = layoutRect(root, zoom);

    const splits = headings.map((h, i) => {
      const split = SplitText.create(h, { type: "words", mask: "words", wordsClass: "word" });
      gsap.set(split.words, { x: i === 1 ? "100%" : "-100%" });
      return split;
    });

    const frameStartRect = layoutRect(frame, zoom);
    const leftEdgeOffset = 24 - (frameStartRect.left - rootRect.left);
    gsap.set(frame, { x: leftEdgeOffset });

    const counter = { progress: 0 };
    const wordCycle = { progress: 0 };
    const imageCycle = { progress: 0 };
    let activeWord = 0;
    let activeImage = 0;

    const images = frame.querySelectorAll("img");

    function renderCounter() {
      counterEl!.textContent = String(Math.round(counter.progress)).padStart(3, "0");
    }
    function renderWord() {
      const index = Math.round(wordCycle.progress);
      if (index === activeWord) return;
      activeWord = index;
      wordEl!.textContent = words[index];
    }
    function renderImage() {
      const index = Math.round(imageCycle.progress) % images.length;
      if (index === activeImage) return;
      activeImage = index;
      images.forEach((img, i) => ((img as HTMLElement).style.opacity = i === index ? "1" : "0"));
    }

    function expandToFill() {
      const z = cssZoom(root!);
      const frameRect = layoutRect(frame!, z);
      const parentRect = layoutRect(root!, z);
      gsap.set(frame, {
        position: "absolute",
        top: frameRect.top - parentRect.top,
        left: frameRect.left - parentRect.left,
        width: frameRect.width,
        height: frameRect.height,
        x: 0,
        y: 0,
        zIndex: 0,
      });
      gsap.to(frame, { top: 0, left: 0, width: parentRect.width, height: parentRect.height, duration: 1.25 / rate, ease: "hop-counter" });
    }

    const tl = gsap.timeline({ delay: 0.5 / rate });
    tl.to(counter, { progress: 100, duration: 3 / rate, ease: "none", onUpdate: renderCounter });
    tl.to(frame, { x: 0, duration: 3 / rate, ease: "none" }, 0);
    tl.to(wordCycle, { progress: words.length - 1, duration: 3 / rate, ease: "none", onUpdate: renderWord }, 0);
    tl.to(imageCycle, { progress: images.length * 3 - 1, duration: 3 / rate, ease: "none", onUpdate: renderImage }, 0);
    tl.to(fade, { opacity: 0, duration: 0.25 / rate }, `+=${0.35 / rate}`);
    tl.to(preloader, { clipPath: "polygon(0% 0%, 100% 0, 100% 0%, 0% 0%)", duration: 1 / rate, ease: "hop-counter" });
    tl.to(splits.map((s) => s.words), { x: "0%", duration: 1.25 / rate, ease: "power3.out", onComplete: expandToFill }, `-=${0.5 / rate}`);
    tl.to(footer, { opacity: 1, duration: 1 / rate, ease: "power3.out" }, "<");

    return () => {
      tl.kill();
      splits.forEach((s) => s.revert());
    };
  }, [speed, title1, title2, title3]);

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden bg-black text-white" style={{ fontFamily }}>
      <div
        ref={preloaderRef}
        className="absolute inset-0 z-[2] flex flex-col justify-between p-5"
        style={{ backgroundColor: accentColor, clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
      >
        <div ref={fadeRef} className="flex flex-col gap-6">
          <h1 ref={wordRef} className="uppercase font-black leading-[0.85]" style={{ fontSize: `clamp(calc(1.5rem * ${scale}),calc(7vw * ${scale}),calc(3.5rem * ${scale}))` }}>
            Studios
          </h1>
          <div className="flex justify-between items-end">
            <h1 ref={counterRef} className="uppercase font-black leading-[0.85]" style={{ fontSize: `clamp(calc(1.5rem * ${scale}),calc(7vw * ${scale}),calc(3.5rem * ${scale}))` }}>
              000
            </h1>
            <p className="uppercase font-medium" style={{ fontSize: `calc(0.65rem * ${scale})` }}>{eyebrow}</p>
          </div>
        </div>
      </div>

      <section className="relative w-full h-full flex flex-col items-end justify-end gap-1 p-5">
        <h1
          ref={(el) => {
            heroHeadingsRef.current[0] = el;
          }}
          className="uppercase font-black leading-[0.85] overflow-hidden self-end"
          style={{ fontSize: `clamp(calc(1.5rem * ${scale}),calc(7vw * ${scale}),calc(3.5rem * ${scale}))`, mixBlendMode: "difference" }}
        >
          {title1}
        </h1>
        <div ref={row2Ref} className="flex items-center gap-3">
          <h1
            className="uppercase font-black leading-[0.85] overflow-hidden"
            style={{ fontSize: `clamp(calc(1.5rem * ${scale}),calc(7vw * ${scale}),calc(3.5rem * ${scale}))`, mixBlendMode: "difference" }}
            ref={(el) => {
              heroHeadingsRef.current[1] = el;
            }}
          >
            {title2}
          </h1>
          <div ref={frameRef} className="relative shrink-0 w-[90px] h-[50px] z-10">
            {IMAGES.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: i === 0 ? 1 : 0 }}
                draggable={false}
              />
            ))}
          </div>
        </div>
        <h1
          ref={(el) => {
            heroHeadingsRef.current[2] = el;
          }}
          className="uppercase font-black leading-[0.85] overflow-hidden self-end"
          style={{ fontSize: `clamp(calc(1.5rem * ${scale}),calc(7vw * ${scale}),calc(3.5rem * ${scale}))`, mixBlendMode: "difference" }}
        >
          {title3}
        </h1>
        <p ref={footerRef} className="absolute left-5 bottom-5 uppercase opacity-0" style={{ fontSize: `calc(0.7rem * ${scale})`, mixBlendMode: "difference" }}>
          Seen and Unseen
        </p>
      </section>
    </div>
  );
}
