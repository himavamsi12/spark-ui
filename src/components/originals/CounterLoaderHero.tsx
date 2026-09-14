"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Cut-outs and photos alternate, so both the ring and the cloud mix the two.
const DEFAULT_ITEMS = [
  ...Array.from({ length: 20 }, (_, i) =>
    i % 2 === 0 ? `/counter-loader-hero/item-${i / 2 + 1}.png` : `/counter-loader-hero/card-${(i - 1) / 2 + 1}.jpg`,
  ),
  "/counter-loader-hero/card-11.jpg",
  "/counter-loader-hero/card-12.jpg",
];

/** Stable pseudo-random in [0, 1) for a pair of integers. */
function hash(a: number, b: number) {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Text with its first `settled` letters fixed and the next few shown as glyphs.
 * Glyphs change on a fixed beat (`tick`) rather than every frame, so the decode
 * reads as calm flicker instead of noise.
 */
function scrambled(text: string, progress: number, tick: number) {
  const settled = Math.floor(progress * text.length);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i < settled || ch === " ") out += ch;
    else if (i < settled + 4) out += SCRAMBLE[Math.floor(hash(i, tick) * SCRAMBLE.length)];
    else out += " ";
  }
  return out;
}

/** Evenly spread unit vectors on a sphere (Fibonacci lattice). */
function spherePoints(n: number) {
  const pts: { x: number; y: number; z: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = golden * i;
    pts.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r });
  }
  return pts;
}

/**
 * A site intro that becomes the hero. While a counter climbs to 100, cards pop
 * in around a steadily turning ring that circles a centre mark, and two lines
 * decode on either side. At 100 the ring keeps turning as it draws in, so the
 * cards spiral into a single stack; after a beat the stack bursts out into a
 * slowly rotating 3D cloud of pictures that leans toward the pointer and can be
 * dragged to spin.
 */
export default function CounterLoaderHero({
  name = "Motion Library",
  role = "Crafted for the Web",
  monogram = "Spark UI",
  items = DEFAULT_ITEMS,
  ringCount = 10,
  background = "#ffffff",
  cardColor = "#f1f1f0",
  textColor = "#141414",
  loadDuration = 2.8,
  ringSpin = 40,
  cloudSize = 100,
  cloudSpeed = 50,
  scramble = true,
  fontFamily = "var(--font-host-grotesk), sans-serif",
  accentFont = "var(--font-instrument-serif), serif",
  textScale = 100,
  autoPlay = false,
}: {
  /** Line on the left of the loading screen. */
  name?: string;
  /** Line on the right of the loading screen. */
  role?: string;
  /** Short mark at the centre of the ring. */
  monogram?: string;
  /** Card pictures. The first `ringCount` form the loader ring; all of them form the cloud. PNG cut-outs sit on the card colour, photos fill their card. */
  items?: string[];
  /** How many cards make up the loader ring. */
  ringCount?: number;
  background?: string;
  /** Fill behind cut-out pictures. */
  cardColor?: string;
  textColor?: string;
  /** Seconds the counter takes to reach 100. */
  loadDuration?: number;
  /** Degrees the ring turns over the loading time. */
  ringSpin?: number;
  /** Size of the cloud, as a %. */
  cloudSize?: number;
  /** How fast the cloud turns on its own, 0-100. */
  cloudSpeed?: number;
  /** Decode the side lines letter by letter instead of fading them in. */
  scramble?: boolean;
  fontFamily?: string;
  /** Typeface for the right-hand line. */
  accentFont?: string;
  textScale?: number;
  /** Replays the whole intro a few seconds after the cloud forms. */
  autoPlay?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const roleRef = useRef<HTMLSpanElement>(null);
  const monoRef = useRef<HTMLSpanElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Read live by the render loop, so dragging these sliders doesn't replay the intro.
  const live = useRef({ cloudSize, cloudSpeed });
  useEffect(() => {
    live.current = { cloudSize, cloudSpeed };
  });

  const itemsKey = items.join("|");

  // Layout depends on the frame's size, so a resize rebuilds (and replays) it.
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => setSize({ w: root.clientWidth, h: root.clientHeight }), 150);
    });
    ro.observe(root);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const { w: W, h: H } = size;
    const root = rootRef.current;
    const counter = counterRef.current;
    const nameEl = nameRef.current;
    const roleEl = roleRef.current;
    const mono = monoRef.current;
    const cards = cardRefs.current.slice(0, items.length).filter(Boolean) as HTMLDivElement[];
    if (!W || !H || !root || !counter || !nameEl || !roleEl || !mono || cards.length === 0) return;

    const n = cards.length;
    const inRing = Math.max(1, Math.min(ringCount, n));
    const dur = Math.max(0.8, loadDuration);
    const sphere = spherePoints(n);
    // Per-card size variety, so the cloud reads as a loose collection rather than a lattice.
    const cardScale = cards.map((_, i) => 0.75 + hash(i, 7) * 0.85);

    /*
     * Architecture: GSAP animates plain numbers in `state` and nothing else.
     * One rAF loop reads `state` and is the only thing that ever writes a
     * card's transform, opacity or stacking order. Every phase (ring, spiral
     * collapse, cloud) is one continuous function of that state, so there is
     * no hand-off between animation systems for a card to jump across.
     */
    const state = {
      appear: new Float32Array(n), // 0..1 pop-in per ring card
      ringRadius: Math.min(W, H) * 0.34,
      ringAngle: 0, // integrated by the loop
      ringBoost: 1, // multiplies ring spin during the collapse
      stackScale: 1, // card scale while ringed or stacked
      cloud: 0, // 0 = ring/stack, 1 = fully formed cloud
      count: 0,
      nameP: 0,
      roleP: 0,
    };
    const view = { yaw: 0, yawOffset: 0, targetYawOffset: 0, pitch: -0.28, targetPitch: -0.28, spin: 0 };
    const baseSpin = ((ringSpin * Math.PI) / 180) / (dur + 1.5); // radians per second
    const lastZ = new Int16Array(n).fill(-1);
    let dragging = false;
    let lastX = 0;
    let raf = 0;
    let last = performance.now();
    let cancelled = false;
    let replay: gsap.core.Tween | null = null;

    const writeText = (el: HTMLElement, text: string, p: number, tick: number) => {
      el.textContent = scramble ? scrambled(text, p, tick) : text;
      el.style.opacity = scramble ? "1" : String(p);
    };

    const render = (now: number, dt: number) => {
      const { cloudSize: sizePct, cloudSpeed: speedPct } = live.current;

      // Loader text, on a 20 fps glyph beat.
      const tick = Math.floor(now / 50);
      counter.textContent = String(Math.round(state.count)).padStart(3, "0");
      writeText(nameEl, name, state.nameP, tick);
      writeText(roleEl, role, state.roleP, tick + 97);

      // Ring turns at a steady rate the whole time, faster while it draws in.
      state.ringAngle += dt * baseSpin * state.ringBoost;

      // Cloud rotation: idle turn plus drag momentum, easing toward the pointer.
      const grow = state.cloud;
      if (grow > 0) {
        view.spin *= Math.pow(0.04, dt);
        view.yaw += dt * (0.05 + (speedPct / 100) * 0.35) + view.spin * dt;
      }
      const ease = 1 - Math.pow(0.001, dt); // frame-rate independent smoothing
      view.yawOffset += (view.targetYawOffset - view.yawOffset) * ease;
      view.pitch += (view.targetPitch - view.pitch) * ease;

      const R = Math.min(W * 0.36, H * 0.29) * (sizePct / 100); // keeps front cards inside the frame
      const focal = R * 3.2;
      const yaw = view.yaw + view.yawOffset;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(view.pitch * grow); // the cloud tilts in as it forms
      const sp = Math.sin(view.pitch * grow);

      for (let i = 0; i < n; i++) {
        const el = cards[i];
        const ringed = i < inRing;

        // Ring / stack position.
        const a = -Math.PI / 2 + (i / inRing) * Math.PI * 2 + state.ringAngle;
        const pop = ringed ? state.appear[i] : 0;
        const rx = ringed ? Math.cos(a) * state.ringRadius : 0;
        const ry = ringed ? Math.sin(a) * state.ringRadius : 0;
        const rScale = state.stackScale * (0.4 + 0.6 * pop);
        const rOpacity = pop;

        // Cloud position.
        const p = sphere[i];
        const x1 = p.x * cy + p.z * sy;
        const z1 = -p.x * sy + p.z * cy;
        const y2 = p.y * cp - z1 * sp;
        const z2 = p.y * sp + z1 * cp;
        const persp = focal / (focal - z2 * R);
        const depth = (z2 + 1) / 2; // 0 at the back, 1 at the front
        const cx = x1 * R * persp;
        const cyPos = y2 * R * persp;
        const cScale = cardScale[i] * persp;
        const cOpacity = 0.55 + 0.45 * depth;

        // One continuous blend between the two, so nothing ever jumps.
        const x = rx + (cx - rx) * grow;
        const y = ry + (cyPos - ry) * grow;
        const s = rScale + (cScale - rScale) * grow;
        const o = ringed ? rOpacity + (cOpacity - rOpacity) * grow : cOpacity * Math.min(1, grow * 2);

        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
        el.style.opacity = o.toFixed(3);

        // Stacking order only changes when a card actually passes another.
        const z = grow > 0 ? Math.round(depth * 40) : 0;
        if (z !== lastZ[i]) {
          lastZ[i] = z;
          el.style.zIndex = String(z);
        }
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      render(now, dt);
    };

    // Pointer leans the cloud; dragging throws it round.
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      view.targetYawOffset = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
      view.targetPitch = -0.28 + ((e.clientY - r.top) / r.height - 0.5) * 0.45;
      if (dragging) {
        view.spin += ((e.clientX - lastX) / r.width) * 18;
        lastX = e.clientX;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (state.cloud < 0.5) return;
      dragging = true;
      lastX = e.clientX;
    };
    const onUp = () => {
      dragging = false;
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    // --- Intro timeline: numbers only ------------------------------------------
    const ringRadius = Math.min(W, H) * 0.34;
    const tl = gsap.timeline({ paused: true });

    tl.call(
      () => {
        state.appear.fill(0);
        Object.assign(state, { ringRadius, ringAngle: 0, ringBoost: 1, stackScale: 1, cloud: 0, count: 0, nameP: 0, roleP: 0 });
        view.yaw = 0;
        view.spin = 0;
      },
      [],
      0,
    )
      .set([counter, nameEl, roleEl, mono], { yPercent: 0 }, 0)
      .set([counter, mono], { opacity: 0 }, 0);

    // 1. Loader: counter, centre mark and decoding side lines.
    tl.to(counter, { opacity: 1, duration: 0.5, ease: "power1.out" }, 0.1);
    tl.to(mono, { opacity: 1, duration: 0.7, ease: "power2.out" }, 0.2);
    tl.to(state, { count: 100, duration: dur, ease: "power2.inOut" }, 0.2);
    tl.to(state, { nameP: 1, duration: dur * 0.4, ease: "none" }, 0.3 + dur * 0.12);
    tl.to(state, { roleP: 1, duration: dur * 0.4, ease: "none" }, 0.3 + dur * 0.22);

    // 2. Ring cards pop in quickly, one after another, part-way through the count.
    const popStart = 0.2 + dur * 0.3;
    for (let i = 0; i < inRing; i++) {
      const target = { v: 0 };
      tl.fromTo(
        target,
        { v: 0 },
        {
          v: 1,
          duration: 0.6,
          ease: "back.out(1.5)",
          onUpdate: () => {
            state.appear[i] = target.v;
          },
        },
        popStart + i * 0.075,
      );
    }

    // 3. At 100 the side lines lift out; the ring keeps turning while it draws
    //    in, so the cards spiral into a single stack rather than sliding straight.
    const exit = 0.2 + dur + 0.05;
    tl.to(counter, { yPercent: 110, duration: 0.6, ease: "power3.in" }, exit);
    tl.to([nameEl, roleEl, mono], { yPercent: -110, duration: 0.65, ease: "power3.in", stagger: 0.05 }, exit);
    tl.to(state, { ringRadius: 0, duration: 1.05, ease: "power3.inOut" }, exit + 0.2);
    tl.to(state, { ringBoost: 4, duration: 1.05, ease: "power2.in" }, exit + 0.2);
    tl.to(state, { stackScale: 0.92, duration: 1.05, ease: "power2.inOut" }, exit + 0.2);

    // 4. A beat on the stack, then it bursts out into the cloud.
    const burst = exit + 0.2 + 1.05 + 0.45;
    tl.to(state, { ringBoost: 0, duration: 0.3, ease: "power2.out" }, burst - 0.3);
    tl.to(state, { cloud: 1, duration: 1.7, ease: "expo.out" }, burst);

    tl.eventCallback("onComplete", () => {
      if (autoPlay && !cancelled) replay = gsap.delayedCall(5, () => tl.restart());
    });

    // Start the loop and the intro once every picture has decoded, so no card pops in blank.
    render(performance.now(), 0);
    raf = requestAnimationFrame(frame);
    const sources = itemsKey ? itemsKey.split("|") : [];
    const ready = Promise.all(
      sources.map((src) => {
        const pic = new Image();
        pic.src = src;
        return pic.decode().catch(() => {});
      }),
    );
    const start = () => {
      if (!cancelled) tl.play(0);
    };
    const fallback = setTimeout(start, 2500);
    ready.then(() => {
      clearTimeout(fallback);
      start();
    });

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      cancelAnimationFrame(raf);
      replay?.kill();
      tl.kill();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
    // Rebuilt when content, timing or the frame size changes, replaying the intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, name, role, itemsKey, ringCount, loadDuration, ringSpin, scramble, autoPlay]);

  const scale = textScale / 100;
  const pad = "3cqw";
  const cardWidth = "clamp(38px, 5.2cqw, 92px)";

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full cursor-grab select-none overflow-hidden active:cursor-grabbing"
      style={{ background, color: textColor, fontFamily, containerType: "size", touchAction: "pan-y" }}
    >
      {/* Cards, anchored at the centre. Transforms come only from the render loop. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
        {items.map((src, i) => {
          const cutout = /\.png($|\?)/i.test(src);
          return (
            <div
              key={`${src}-${i}`}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="absolute left-0 top-0 overflow-hidden"
              style={{
                width: cardWidth,
                aspectRatio: "10 / 13",
                marginLeft: `calc(${cardWidth} / -2)`,
                marginTop: `calc(${cardWidth} * -0.65)`,
                background: cardColor,
                opacity: 0,
                willChange: "transform, opacity",
                backfaceVisibility: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                draggable={false}
                decoding="async"
                className={`absolute inset-0 h-full w-full ${cutout ? "object-contain p-[12%]" : "object-cover"}`}
              />
            </div>
          );
        })}
      </div>

      {/* Loader line: left line, centre mark, right line */}
      <div
        className="pointer-events-none absolute inset-0 grid grid-cols-[1fr_auto_1fr] items-center"
        style={{ padding: `0 ${pad}`, fontSize: `calc(clamp(12px, 1.15cqw, 17px) * ${scale})` }}
      >
        {/* Each decoding line sits over an invisible copy of its final text, so
            its box keeps the settled width while the letters change. */}
        <span className="relative block justify-self-start overflow-hidden font-medium">
          <span className="invisible block whitespace-pre" aria-hidden="true">
            {name}
          </span>
          <span ref={nameRef} className="absolute left-0 top-0 block whitespace-pre" />
        </span>
        <span className="block overflow-hidden">
          <span ref={monoRef} className="block font-medium tracking-tight" style={{ opacity: 0 }}>
            {monogram}
          </span>
        </span>
        <span className="relative block justify-self-end overflow-hidden" style={{ fontFamily: accentFont }}>
          <span className="invisible block whitespace-pre" aria-hidden="true">
            {role}
          </span>
          <span ref={roleRef} className="absolute right-0 top-0 block whitespace-pre text-right" />
        </span>
      </div>

      <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ bottom: pad }}>
        <span className="block overflow-hidden">
          <span
            ref={counterRef}
            className="block font-mono tabular-nums"
            style={{ fontSize: `calc(clamp(11px, 1.05cqw, 15px) * ${scale})`, opacity: 0 }}
          >
            000
          </span>
        </span>
      </div>
    </div>
  );
}
