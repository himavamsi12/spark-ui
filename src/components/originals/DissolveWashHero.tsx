"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

/** The reference's shaders, verbatim. */
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uProgress;
  uniform vec2 uResolution;
  uniform vec3 uColor;
  uniform float uSpread;
  varying vec2 vUv;

  float Hash(vec2 p) {
    vec3 p2 = vec3(p.xy, 1.0);
    return fract(sin(dot(p2, vec3(37.1, 61.7, 12.4))) * 3758.5453123);
  }

  float noise(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f *= f * (3.0 - 2.0 * f);
    return mix(
      mix(Hash(i + vec2(0.0, 0.0)), Hash(i + vec2(1.0, 0.0)), f.x),
      mix(Hash(i + vec2(0.0, 1.0)), Hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    v += noise(p * 1.0) * 0.5;
    v += noise(p * 2.0) * 0.25;
    v += noise(p * 4.0) * 0.125;
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 centeredUv = (uv - 0.5) * vec2(aspect, 1.0);

    float dissolveEdge = uv.y - uProgress * 1.2;
    float noiseValue = fbm(centeredUv * 15.0);
    float d = dissolveEdge + noiseValue * uSpread;

    float pixelSize = 1.0 / uResolution.y;
    float alpha = 1.0 - smoothstep(-pixelSize, pixelSize, d);

    gl_FragColor = vec4(uColor, alpha);
  }
`;

/** The reference's section heights, in frames. */
const HERO_FRAMES = 1.75;
const CONTENT_FRAMES = 1.25;

/** Lenis' default lerp, the smoothing the reference scrolls with. */
const smoothing = (dt: number) => 1 - Math.pow(0.9, dt * 60);

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0.89, g: 0.89, b: 0.89 };
}

/**
 * A tall hero where a noisy wash of colour climbs from the bottom and swallows
 * the picture as you scroll, with the copy behind it lighting up word by word
 * as the wash reaches it.
 */
export default function DissolveWashHero({
  title = "Canopy",
  subtitle = "Water carves the green in slow motion.",
  bodyText = "Mist rolls off the ridge and the forest softens into colour, every branch and falling thread of water dissolving into one quiet, moving surface.",
  heroImage = "/dissolve-wash-hero/photo-1.jpg",
  dissolveColor = "#e6edf5",
  heroTextColor = "#ffffff",
  contentTextColor = "#16263a",
  spread = 50,
  dissolveSpeed = 200,
  displayFont = "var(--font-instrument-serif), serif",
  bodyFont = "var(--font-instrument-sans), sans-serif",
  textScale = 100,
  speed = 100,
  autoPlay = true,
}: {
  title?: string;
  subtitle?: string;
  /** Revealed word by word as the wash climbs past it. */
  bodyText?: string;
  heroImage?: string;
  /** Colour of the wash that climbs over the picture. */
  dissolveColor?: string;
  heroTextColor?: string;
  contentTextColor?: string;
  /** How far the noise frays the wash's edge, as a %. */
  spread?: number;
  /** How fast the wash climbs relative to the scroll, as a %. */
  dissolveSpeed?: number;
  displayFont?: string;
  bodyFont?: string;
  textScale?: number;
  speed?: number;
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const configRef = useRef({ dissolveColor, spread, dissolveSpeed, speed, autoPlay });
  useEffect(() => {
    configRef.current = { dissolveColor, spread, dissolveSpeed, speed, autoPlay };
  }, [dissolveColor, spread, dissolveSpeed, speed, autoPlay]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    const heading = headingRef.current;
    if (!root || !track || !hero || !canvas || !heading) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });

    const rgb = hexToRgb(configRef.current.dissolveColor);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uProgress: { value: 0 },
        uResolution: { value: new THREE.Vector2(hero.offsetWidth, hero.offsetHeight) },
        uColor: { value: new THREE.Vector3(rgb.r, rgb.g, rgb.b) },
        uSpread: { value: configRef.current.spread / 100 },
      },
      transparent: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    function resize() {
      const width = hero!.offsetWidth;
      const height = hero!.offsetHeight;
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      material.uniforms.uResolution.value.set(width, height);
    }
    resize();

    let split: SplitText | null = null;
    let words: Element[] = [];
    let lastWordsProgress = -1;

    function startSplit() {
      split = SplitText.create(heading, { type: "words" });
      words = split.words;
      gsap.set(words, { opacity: 0 });
    }
    // SplitText measures rendered text, so a webfont landing late would split
    // against the fallback face.
    if (document.fonts?.status === "loaded") startSplit();
    else document.fonts?.ready.then(startSplit).catch(startSplit);

    const frameH = () => root!.clientHeight;
    /**
     * The hero is the whole piece now, so the travel is its own overflow past
     * the frame — which is also exactly the range the word reveal runs over.
     */
    const maxScroll = () => frameH() * (HERO_FRAMES - 1);

    function applyWords(progress: number) {
      if (!words.length || progress === lastWordsProgress) return;
      lastWordsProgress = progress;
      const totalWords = words.length;
      words.forEach((word, index) => {
        const wordProgress = index / totalWords;
        const nextWordProgress = (index + 1) / totalWords;
        let opacity = 0;
        if (progress >= nextWordProgress) opacity = 1;
        else if (progress >= wordProgress) {
          opacity = (progress - wordProgress) / (nextWordProgress - wordProgress);
        }
        gsap.to(word, { opacity, duration: 0.1, overwrite: true });
      });
    }

    function frame(scroll: number) {
      const cfg = configRef.current;
      const h = frameH();
      track!.style.transform = `translateY(${-scroll}px)`;

      // The reference measures against the hero's own overflow past the
      // viewport, not the whole document.
      const heroOverflow = h * (HERO_FRAMES - 1);
      material.uniforms.uProgress.value = Math.min(
        (scroll / heroOverflow) * (cfg.dissolveSpeed / 100),
        1.1,
      );
      material.uniforms.uSpread.value = cfg.spread / 100;
      // Re-read only when it actually changes; the reference hard-codes it
      // in CONFIG, but here it is a control and has to reach the uniform.
      if (cfg.dissolveColor !== lastColor) {
        lastColor = cfg.dissolveColor;
        const c = hexToRgb(cfg.dissolveColor);
        material.uniforms.uColor.value.set(c.r, c.g, c.b);
      }

      // `.hero-content` is bottom-anchored in the hero, so its top sits at
      // (HERO - CONTENT) frames. The reference's trigger runs from that top
      // reaching 25% of the frame to its bottom reaching the frame's foot.
      const contentTop = h * (HERO_FRAMES - CONTENT_FRAMES);
      const contentBottom = h * HERO_FRAMES;
      const startScroll = contentTop - h * 0.25;
      const endScroll = contentBottom - h;
      applyWords(gsap.utils.clamp(0, 1, (scroll - startScroll) / (endScroll - startScroll)));

      renderer.render(scene, camera);
    }

    let lastColor = configRef.current.dissolveColor;
    let scroll = 0;
    let target = 0;
    let userDriven = false;
    frame(0);

    function onWheel(e: WheelEvent) {
      const rate = Math.max(0.2, configRef.current.speed / 100);
      const next = gsap.utils.clamp(0, maxScroll(), target + e.deltaY * rate);
      if (next === target) return;
      e.preventDefault();
      userDriven = true;
      target = next;
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    let dir = 1;
    let last = performance.now();
    function loop(now: number) {
      const cfg = configRef.current;
      const rate = Math.max(0.2, cfg.speed / 100);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (cfg.autoPlay && !userDriven) {
        target += dir * dt * maxScroll() * 0.09 * rate;
        if (target >= maxScroll()) {
          target = maxScroll();
          dir = -1;
        } else if (target <= 0) {
          target = 0;
          dir = 1;
        }
      }
      scroll += (target - scroll) * smoothing(dt);
      frame(scroll);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      root!.style.setProperty("--frame-h", `${root!.clientHeight}px`);
      resize();
      frame(scroll);
    });
    root.style.setProperty("--frame-h", `${root.clientHeight}px`);
    ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("wheel", onWheel);
      split?.revert();
      gsap.killTweensOf(words);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [bodyText]);

  const displayType = {
    fontFamily: displayFont,
    fontWeight: 500,
    lineHeight: 0.9,
    textTransform: "uppercase",
  } as const;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={{ containerType: "inline-size", fontFamily: bodyFont }}
    >
      <div ref={trackRef} className="absolute inset-x-0 top-0 will-change-transform">
        <section
          ref={heroRef}
          className="relative w-full overflow-hidden"
          style={{ height: `calc(var(--frame-h, 100vh) * ${HERO_FRAMES})`, color: heroTextColor }}
        >
          <div className="absolute h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt="" className="h-full w-full object-cover" draggable={false} />
          </div>

          <div
            className="absolute flex w-full flex-col items-center justify-center text-center"
            style={{ height: "var(--frame-h, 100vh)", gap: "0.5rem" }}
          >
            <h1
              style={{
                ...displayType,
                fontSize: `clamp(calc(4rem * ${scale}), calc(7.5cqw * ${scale}), calc(10rem * ${scale}))`,
              }}
            >
              {title}
            </h1>
            <p
              className="w-3/4"
              style={{ fontFamily: bodyFont, fontWeight: 400, fontSize: `calc(1.125rem * ${scale})` }}
            >
              {subtitle}
            </p>
          </div>

          {/* The wash. Drawn over the picture but under the copy, so the words
              read against it as it climbs. */}
          <canvas ref={canvasRef} className="pointer-events-none absolute bottom-0 h-full w-full" />

          <div
            className="absolute bottom-0 flex w-full items-center justify-center text-center"
            style={{ height: `calc(var(--frame-h, 100vh) * ${CONTENT_FRAMES})` }}
          >
            <h2
              ref={headingRef}
              className="w-3/4 @max-[1000px]:!w-[calc(100%-4rem)]"
              style={{
                ...displayType,
                color: contentTextColor,
                fontSize: `clamp(calc(2.5rem * ${scale}), calc(4.5cqw * ${scale}), calc(5rem * ${scale}))`,
              }}
            >
              {bodyText}
            </h2>
          </div>
        </section>

      </div>
    </div>
  );
}
