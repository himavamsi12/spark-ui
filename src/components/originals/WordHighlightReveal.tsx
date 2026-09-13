"use client";

import { useEffect, useRef } from "react";

const DEFAULT_ABOUT = [
  "Kinetic began as a private set of tools for people who could not leave a layout alone. It grew into a restless studio where a rough thought becomes a living thing, held together by colour, timing and a great deal of stubbornness.",
  "Every good piece starts with clarity and finishes on instinct. The work between those two is what this place is built to carry — the loose pass, the second guess, the late change of mind, right up to the moment a palette settles and the thing finally holds.",
];

const DEFAULT_FEATURES = [
  "Structure, rhythm and craft share one room here. Draw a page that answers to any screen, score transitions that keep their nerve, and let a story run the length of a scroll — without once opening an editor or memorising a syntax.",
  "Live components, scroll-driven effects and previews that keep pace with your edits. Rough something out with real texture and honest momentum, then watch it read as well as it looks. It is the shortest road from a vague horizon to a thing you can send.",
];

/** Lenis's own curve, so the scroll carries the same weight as the source. */
const smoothing = (dt: number) => 1 - Math.pow(0.9, dt * 60);

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** The reference strips punctuation before matching a word against the list. */
const normalize = (word: string) => word.toLowerCase().replace(/[.,!?;:"]/g, "");

type Word = { text: string; accent: string | null };

/**
 * A paragraph arrives one word at a time as you scroll: each word surfaces as a
 * blank grey pill, then the word itself fades up inside it just as the pill
 * clears — and once the passage is whole, the same wave runs back through it,
 * taking the words away and leaving the pills behind.
 */
export default function WordHighlightReveal({
  heroHeading = "Nothing here sits still for long.",
  ctaHeading = "Ship the version you actually imagined.",
  outroHeading = "Now go make something loud.",
  aboutParagraphs = DEFAULT_ABOUT,
  featureParagraphs = DEFAULT_FEATURES,
  accentOneWords = ["restless", "rhythm", "texture"],
  accentTwoWords = ["living", "instinct", "momentum"],
  accentThreeWords = ["clarity", "craft", "horizon"],
  accentOne = "#7a78ff",
  accentTwo = "#fe6d38",
  accentThree = "#c6fe69",
  background = "#141414",
  pillColor = "60, 60, 60",
  textColor = "#ffffff",
  headingSize = 5,
  bodySize = 2,
  pinFrames = 4,
  fontFamily = "var(--font-dm-sans), sans-serif",
  textScale = 100,
  speed = 100,
  autoPlay = true,
}: {
  heroHeading?: string;
  ctaHeading?: string;
  outroHeading?: string;
  /** The first passage, one entry per paragraph. */
  aboutParagraphs?: string[];
  /** The second passage, one entry per paragraph. */
  featureParagraphs?: string[];
  /** Words that get the first accent pill behind them. */
  accentOneWords?: string[];
  accentTwoWords?: string[];
  accentThreeWords?: string[];
  accentOne?: string;
  accentTwo?: string;
  accentThree?: string;
  background?: string;
  /** The blank pill a word surfaces in, as `r, g, b`. */
  pillColor?: string;
  textColor?: string;
  /** Size of the panel headings, in rem. */
  headingSize?: number;
  /** Size of the passages, in rem. */
  bodySize?: number;
  /** How many frames of scroll each passage holds for. */
  pinFrames?: number;
  fontFamily?: string;
  textScale?: number;
  speed?: number;
  /** Runs the scroll on its own instead of waiting for a wheel gesture. */
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wordRefs = useRef<HTMLSpanElement[][]>([[], []]);

  const configRef = useRef({ pinFrames, pillColor, speed, autoPlay });
  useEffect(() => {
    configRef.current = { pinFrames, pillColor, speed, autoPlay };
  });

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;

    let scroll = 0;
    let target = 0;
    let raf = 0;
    let last = performance.now();
    let userDriven = false;

    const frameH = () => root!.clientHeight;

    // hero | passage + pin | cta | passage + pin | outro
    const sectionStart = (i: number) => {
      const pin = configRef.current.pinFrames;
      return [0, 1, 2 + pin, 3 + pin, 4 + pin * 2][i] * frameH();
    };
    const totalFrames = () => 5 + configRef.current.pinFrames * 2;
    const maxScroll = () => (totalFrames() - 1) * frameH();

    /**
     * The reference's own reveal: a window of 15 words wide slides along the
     * passage, so a word is part-way through its own arrival while its
     * neighbours are still starting theirs.
     */
    function applyPassage(passageIndex: number, progress: number) {
      const words = wordRefs.current[passageIndex];
      const totalWords = words.length;
      if (!totalWords) return;
      const bg = configRef.current.pillColor;

      words.forEach((word, index) => {
        const wordText = word.querySelector("span");
        if (!wordText) return;

        if (progress <= 0.7) {
          const progressTarget = 0.7;
          const revealProgress = Math.min(1, progress / progressTarget);

          const overlapWords = 15;
          const totalAnimationLength = 1 + overlapWords / totalWords;

          const wordStart = index / totalWords;
          const wordEnd = wordStart + overlapWords / totalWords;

          const timelineScale =
            1 /
            Math.min(
              totalAnimationLength,
              1 + (totalWords - 1) / totalWords + overlapWords / totalWords,
            );

          const adjustedStart = wordStart * timelineScale;
          const adjustedEnd = wordEnd * timelineScale;
          const duration = adjustedEnd - adjustedStart;

          const wordProgress =
            revealProgress <= adjustedStart
              ? 0
              : revealProgress >= adjustedEnd
                ? 1
                : (revealProgress - adjustedStart) / duration;

          word.style.opacity = String(wordProgress);

          const backgroundFadeStart = wordProgress >= 0.9 ? (wordProgress - 0.9) / 0.1 : 0;
          const backgroundOpacity = Math.max(0, 1 - backgroundFadeStart);
          word.style.backgroundColor = `rgba(${bg}, ${backgroundOpacity})`;

          // The word itself only appears in the last tenth of its pill's life,
          // which is what makes it read as surfacing rather than fading in.
          const textRevealThreshold = 0.9;
          const textRevealProgress =
            wordProgress >= textRevealThreshold
              ? (wordProgress - textRevealThreshold) / (1 - textRevealThreshold)
              : 0;
          (wordText as HTMLElement).style.opacity = String(Math.pow(textRevealProgress, 0.5));
        } else {
          const reverseProgress = (progress - 0.7) / 0.3;
          word.style.opacity = "1";
          const targetTextOpacity = 1;

          const reverseOverlapWords = 5;
          const reverseWordStart = index / totalWords;
          const reverseWordEnd = reverseWordStart + reverseOverlapWords / totalWords;

          const reverseTimelineScale =
            1 / Math.max(1, (totalWords - 1) / totalWords + reverseOverlapWords / totalWords);

          const reverseAdjustedStart = reverseWordStart * reverseTimelineScale;
          const reverseAdjustedEnd = reverseWordEnd * reverseTimelineScale;
          const reverseDuration = reverseAdjustedEnd - reverseAdjustedStart;

          const reverseWordProgress =
            reverseProgress <= reverseAdjustedStart
              ? 0
              : reverseProgress >= reverseAdjustedEnd
                ? 1
                : (reverseProgress - reverseAdjustedStart) / reverseDuration;

          if (reverseWordProgress > 0) {
            (wordText as HTMLElement).style.opacity = String(
              targetTextOpacity * (1 - reverseWordProgress),
            );
            word.style.backgroundColor = `rgba(${bg}, ${reverseWordProgress})`;
          } else {
            (wordText as HTMLElement).style.opacity = String(targetTextOpacity);
            word.style.backgroundColor = `rgba(${bg}, 0)`;
          }
        }
      });
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      userDriven = true;
      target = clamp(target + e.deltaY, 0, maxScroll());
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const cfg = configRef.current;

      if (cfg.autoPlay && !userDriven) {
        target = Math.min(target + frameH() * 0.006 * (cfg.speed / 100), maxScroll());
      }

      scroll += (target - scroll) * smoothing(dt);
      track!.style.transform = `translateY(${-scroll}px)`;

      // Each passage is held in place across its own stretch of scroll by
      // pushing it back down exactly as far as the track has moved up.
      [1, 3].forEach((sectionIndex, passageIndex) => {
        const pinEl = pinRefs.current[passageIndex];
        if (!pinEl) return;

        const start = sectionStart(sectionIndex);
        const length = cfg.pinFrames * frameH();
        const held = clamp(scroll - start, 0, length);

        pinEl.style.transform = held > 0 ? `translateY(${held}px)` : "";
        applyPassage(passageIndex, length > 0 ? held / length : 0);
      });

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("wheel", onWheel);
    };
  }, [aboutParagraphs, featureParagraphs, accentOneWords, accentTwoWords, accentThreeWords]);

  const accentFor = (word: string): string | null => {
    const n = normalize(word);
    if (accentOneWords.map(normalize).includes(n)) return accentOne;
    if (accentTwoWords.map(normalize).includes(n)) return accentTwo;
    if (accentThreeWords.map(normalize).includes(n)) return accentThree;
    return null;
  };

  const splitWords = (text: string): Word[] =>
    text
      .split(/\s+/)
      .filter((w) => w.trim())
      .map((text) => ({ text, accent: accentFor(text) }));

  const panel = (heading: string, panelColor: string) => (
    <div className="h-full w-full" style={{ padding: "2em" }}>
      <div
        className="flex h-full w-full items-center justify-center text-center"
        style={{ background: panelColor, borderRadius: "2rem" }}
      >
        <h1
          className="w-[70%] @max-[1000px]:!w-[90%] @max-[1000px]:![font-size:calc(2rem*var(--whr-scale))]"
          style={
            {
              color: background,
              fontSize: `calc(${headingSize}rem * ${scale})`,
              fontWeight: 900,
              lineHeight: 1,
              "--whr-scale": String(scale),
            } as React.CSSProperties
          }
        >
          {heading}
        </h1>
      </div>
    </div>
  );

  const passage = (paragraphs: string[], passageIndex: number) => {
    let running = -1;
    return (
      <div
        ref={(el) => {
          pinRefs.current[passageIndex] = el;
        }}
        className="h-full w-full will-change-transform"
        style={{ padding: "2em" }}
      >
        <div
          className="flex h-full w-full items-center justify-center text-center"
          style={{ borderRadius: "2rem", border: `0.15rem dashed rgb(${pillColor})` }}
        >
          <div className="w-[60%] @max-[1000px]:!w-[90%]">
            {paragraphs.map((paragraph, p) => (
              <p
                key={p}
                className="text-center @max-[1000px]:![font-size:calc(1.25rem*var(--whr-scale))]"
                style={
                  {
                    color: textColor,
                    marginBottom: "2rem",
                    fontSize: `calc(${bodySize}rem * ${scale})`,
                    fontWeight: 900,
                    lineHeight: 1,
                    "--whr-scale": String(scale),
                  } as React.CSSProperties
                }
              >
                {splitWords(paragraph).map((word, w) => {
                  running += 1;
                  const at = running;
                  return (
                    // A span, not a div: the reference builds these after load
                    // where the parser never sees them, but a div inside a <p>
                    // is invalid nesting and breaks hydration. It is
                    // display:inline-block either way.
                    <span
                      key={`${p}-${w}`}
                      ref={(el) => {
                        if (el) wordRefs.current[passageIndex][at] = el;
                      }}
                      className={
                        word.accent
                          ? "relative inline-block will-change-[background-color,opacity] @max-[1000px]:!mr-[0.2rem] @max-[1000px]:!mb-[0.1rem] @max-[1000px]:!ml-[0.1rem]"
                          : "relative inline-block will-change-[background-color,opacity] @max-[1000px]:!mr-[0.1rem] @max-[1000px]:!mb-[0.15rem]"
                      }
                      style={{
                        // A keyword is given more room, since its own pill is
                        // wider than the word it sits behind.
                        ...(word.accent
                          ? { margin: "0 0.4rem 0.2rem 0.2rem" }
                          : { marginRight: "0.2rem", marginBottom: "0.2rem" }),
                        padding: "0.1rem 0.2rem",
                        borderRadius: "2rem",
                        opacity: 0,
                      }}
                    >
                      <span
                        className="relative"
                        style={
                          word.accent
                            ? {
                                display: "inline-block",
                                width: "100%",
                                height: "100%",
                                padding: "0.1rem 0",
                                borderRadius: "2rem",
                                color: background,
                                opacity: 0,
                              }
                            : { opacity: 0 }
                        }
                      >
                        {word.accent ? (
                          // Sits behind the word, and behind the grey pill too,
                          // so it is only uncovered as that pill clears.
                          <span
                            aria-hidden
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              width: "calc(100% + 1rem)",
                              height: "calc(100% + 0.4rem)",
                              background: word.accent,
                              borderRadius: "2rem",
                              zIndex: -1,
                            }}
                          />
                        ) : null}
                        {word.text}
                      </span>
                    </span>
                  );
                })}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background, fontFamily, containerType: "inline-size" }}
    >
      <div ref={trackRef} className="absolute inset-0 will-change-transform">
        <div className="h-full w-full">{panel(heroHeading, accentTwo)}</div>

        {/* The passage sits at the top of its block; the rest of the block is
            the stretch of scroll it is held across. */}
        <div style={{ height: `calc(100% * ${pinFrames + 1})` }} className="w-full">
          <div className="h-[calc(100%/var(--whr-block))] w-full" style={{ "--whr-block": pinFrames + 1 } as React.CSSProperties}>
            {passage(aboutParagraphs, 0)}
          </div>
        </div>

        <div className="h-full w-full">{panel(ctaHeading, accentThree)}</div>

        <div style={{ height: `calc(100% * ${pinFrames + 1})` }} className="w-full">
          <div className="h-[calc(100%/var(--whr-block))] w-full" style={{ "--whr-block": pinFrames + 1 } as React.CSSProperties}>
            {passage(featureParagraphs, 1)}
          </div>
        </div>

        <div className="h-full w-full">{panel(outroHeading, accentOne)}</div>
      </div>
    </div>
  );
}
