"use client";

import { useEffect, useRef, useState } from "react";

/** p5's own remap, which deliberately does not clamp. */
const map = (v: number, a: number, b: number, c: number, d: number) =>
  c + (d - c) * ((v - a) / (b - a));

const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Shape = "triangle" | "square" | "circle";

type Cfg = {
  background: string;
  particleColor: string;
  particleCount: number;
  particleSize: number;
  spacingFactor: number;
  gravity: number;
  bounce: number;
  stirRadius: number;
  stirStrength: number;
  stirOnHover: boolean;
  relaxPasses: number;
  autoPlay: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  lastX: number;
  lastY: number;
  density: number;
  rotation: number;
  rotationVel: number;
  shape: Shape;
};

/**
 * A few hundred small shapes behave like a liquid: they fall, pile up and
 * settle against each other, and dragging through the heap shoves it aside in
 * a wave that sloshes back and finds its level again.
 */
export default function FluidParticleField({
  eyebrow = "Got something worth building?",
  heading = "Let's make\nit move.",
  buttonLabel = "Start a project",
  background = "#1a2ffb",
  particleColor = "#ffffff",
  textColor = "#ffffff",
  particleCount = 1400,
  particleSize = 12,
  spacingFactor = 5,
  gravity = 2.2,
  bounce = 0.25,
  stirRadius = 250,
  stirStrength = 30,
  stirOnHover = true,
  relaxPasses = 3,
  headingSize = 7.5,
  fontFamily = "var(--font-inter), sans-serif",
  textScale = 100,
  autoPlay = true,
}: {
  eyebrow?: string;
  /** The heading. A blank line splits it across lines. */
  heading?: string;
  buttonLabel?: string;
  background?: string;
  particleColor?: string;
  textColor?: string;
  /** How many shapes fill the frame. */
  particleCount?: number;
  /** Size of each shape, in px. */
  particleSize?: number;
  /** How far apart they sit before pushing each other, as a multiple of size. */
  spacingFactor?: number;
  /** Downward pull on the heap. */
  gravity?: number;
  /** How much of a wall impact a shape keeps. */
  bounce?: number;
  /** How far a drag reaches, in px. */
  stirRadius?: number;
  /** How hard a drag shoves the heap. */
  stirStrength?: number;
  /** Stir on plain pointer movement. Off means it only stirs while dragging. */
  stirOnHover?: boolean;
  /** How many times the heap settles against itself each frame. Higher is
   * smoother and more liquid; 1 is the reference. */
  relaxPasses?: number;
  /** Size of the heading, as a % of the frame width. */
  headingSize?: number;
  fontFamily?: string;
  textScale?: number;
  /** Stirs the heap on its own until the pointer is used. */
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const [buttonHover, setButtonHover] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const configRef = useRef({
    background,
    particleColor,
    particleCount,
    particleSize,
    spacingFactor,
    gravity,
    bounce,
    stirRadius,
    stirStrength,
    stirOnHover,
    relaxPasses,
    autoPlay,
  });
  useEffect(() => {
    configRef.current = {
      background,
      particleColor,
      particleCount,
      particleSize,
      spacingFactor,
      gravity,
      bounce,
      stirRadius,
      stirStrength,
      stirOnHover,
      relaxPasses,
      autoPlay,
    };
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    let pressed = false;
    let hovering = false;
    let stirring = false;
    let userDriven = false;
    let mouseX = 0;
    let mouseY = 0;
    let mousePrevX = 0;
    let mousePrevY = 0;
    let autoT = 0;

    const SHAPES: Shape[] = ["triangle", "square", "circle"];

    function seed() {
      const cfg = configRef.current;
      const spacing = cfg.particleSize * cfg.spacingFactor;

      // The reference's own grid: as many columns as fit across 95% of the
      // frame, then as many rows as it takes — most of them starting below the
      // floor, which is what packs the heap in.
      const availableWidth = width * 0.95;
      const cols = Math.max(1, Math.floor(availableWidth / spacing));
      const startX = (width - cols * spacing) * 0.5;
      const startY = height * 0.05;

      particles = [];
      let count = 0;
      let row = 0;
      while (count < cfg.particleCount) {
        for (let col = 0; col < cols && count < cfg.particleCount; col++) {
          const x = startX + col * spacing + rand(-5, 5);
          const y = startY + row * spacing + rand(-5, 5);
          particles.push({
            x,
            y,
            vx: rand(-20, 20),
            vy: rand(-20, 20),
            ax: 0,
            ay: 0,
            lastX: x,
            lastY: y,
            density: 0,
            rotation: rand(0, Math.PI * 2),
            rotationVel: rand(-0.1, 0.1),
            shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
          });
          count++;
        }
        row++;
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = root!.clientWidth;
      height = root!.clientHeight;
      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function update(p: Particle, dt: number, cfg: Cfg, size: number) {
      p.lastX = p.x;
      p.lastY = p.y;

      p.rotation += p.rotationVel * dt;

      const gravityScale = map(p.density, 0, 5, 1, 0.7);
      p.ay += cfg.gravity * 4 * gravityScale;

      if (stirring) {
        const mdx = p.x - mouseX;
        const mdy = p.y - mouseY;
        const d = Math.sqrt(mdx * mdx + mdy * mdy);
        const maxDist = cfg.stirRadius;
        if (d < maxDist) {
          const mvx = mouseX - mousePrevX;
          const mvy = mouseY - mousePrevY;
          const densityScale = map(p.density, 0, 5, 1, 0.85);
          // The reference falls off at 1.75, which leaves everything past the
          // halfway point barely moving. A gentler curve lets more of the
          // radius respond, so the heap moves with the pointer rather than
          // trailing a dent behind it.
          const strength = Math.pow(map(d, 0, maxDist, 1, 0), 1.25);
          p.ax += mvx * cfg.stirStrength * densityScale * strength;
          p.ay += mvy * cfg.stirStrength * densityScale * strength;
          p.rotationVel += Math.sqrt(mvx * mvx + mvy * mvy) * 0.01 * rand(-1, 1);
        }
      }

      const dampingFactor = map(p.density, 0, 5, 1, 1);
      p.vx += p.ax * dt * 15.0 * dampingFactor;
      p.vy += p.ay * dt * 15.0 * dampingFactor;

      // Shapes near the floor are damped harder, which is what lets the heap
      // settle instead of jittering forever.
      if (p.y > height - size * 2) {
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.vx *= 0.94;
        p.rotationVel *= 0.95;
      } else {
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.rotationVel *= 0.99;
      }

      p.x += p.vx * dt * 11.5;
      p.y += p.vy * dt * 11.5;

      const b = cfg.bounce;
      const buffer = size;

      if (p.x < buffer) {
        p.x = buffer;
        p.vx = Math.abs(p.vx) * b;
      }
      if (p.x > width - buffer) {
        p.x = width - buffer;
        p.vx = -Math.abs(p.vx) * b;
      }
      if (p.y < buffer) {
        p.y = buffer;
        p.vy = Math.abs(p.vy) * b;
      }
      if (p.y > height - buffer) {
        p.y = height - buffer;
        p.vy = -Math.abs(p.vy) * b;
      }

      p.ax = 0;
      p.ay = 0;
      p.density = 0;
    }

    // Hot path: this runs tens of thousands of times a frame, so everything it
    // needs is passed in rather than looked up, and the distance uses sqrt
    // rather than hypot.
    function interact(a: Particle, o: Particle, size: number, spacing: number, accumulate: boolean) {
      const dx = a.x - o.x;
      const dy = a.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= spacing * spacing) return;
      const d = Math.sqrt(d2);

      if (accumulate) {
        const densityIncrease = map(d, 0, spacing, 1.2, 0.1);
        a.density += densityIncrease;
        o.density += densityIncrease;
      }

      const len = d || 1e-6;
      let fx = dx / len;
      let fy = dy / len;

      let strength = map(d, 0, spacing, 0.8, 0);
      strength = Math.pow(strength, 1.1);
      fx *= strength;
      fy *= strength;

      const overlap = spacing - d;
      if (overlap > 0) {
        const correctionStrength = map(overlap, 0, spacing, 0.15, 0.25);
        let cx = fx * overlap * correctionStrength;
        let cy = fy * overlap * correctionStrength;

        let boundaryFactor = 1.0;
        if (a.y > height - size * 4 || o.y > height - size * 4) boundaryFactor = 0.7;
        cx *= boundaryFactor;
        cy *= boundaryFactor;

        const densityScale = map(a.density + o.density, 0, 10, 1, 0.9);
        const correctionWeight = 0.15 * densityScale;
        a.x += cx * correctionWeight;
        a.y += cy * correctionWeight;
        o.x -= cx * correctionWeight;
        o.y -= cy * correctionWeight;

        const avgX = (a.vx + o.vx) * 0.5;
        const avgY = (a.vy + o.vy) * 0.5;
        let velocityBlend = map(d, 0, spacing, 0.15, 0.02);
        velocityBlend *= map(a.density + o.density, 0, 10, 1.2, 0.95);
        if (d < spacing * 0.5) velocityBlend *= 1.5;

        a.vx += (avgX - a.vx) * velocityBlend;
        a.vy += (avgY - a.vy) * velocityBlend;
        o.vx += (avgX - o.vx) * velocityBlend;
        o.vy += (avgY - o.vy) * velocityBlend;
      }

      if (accumulate) {
        const afx = fx * 0.4;
        const afy = fy * 0.4;
        a.ax += afx;
        a.ay += afy;
        o.ax -= afx;
        o.ay -= afy;
      }
    }

    function drawParticle(p: Particle, size: number) {
      // Drawn half a step behind, which smooths the jitter of a stiff solver.
      const renderX = (p.lastX + p.x) * 0.5;
      const renderY = (p.lastY + p.y) * 0.5;

      ctx!.save();
      ctx!.translate(renderX, renderY);
      ctx!.rotate(p.rotation);
      ctx!.beginPath();
      if (p.shape === "triangle") {
        ctx!.moveTo(-size / 2, size / 2);
        ctx!.lineTo(size / 2, size / 2);
        ctx!.lineTo(0, -size / 2);
        ctx!.closePath();
      } else if (p.shape === "square") {
        ctx!.rect(-size / 2, -size / 2, size, size);
      } else {
        ctx!.arc(0, 0, size / 2, 0, Math.PI * 2);
      }
      ctx!.fill();
      ctx!.restore();
    }

    let last = performance.now();
    let smoothDt = 1 / 60;

    function frame(now: number) {
      const cfg = configRef.current;
      // p5 feeds this solver 1/frameRate(), which is a *smoothed* rate, so its
      // timestep barely moves frame to frame. Raw measured time jitters by a
      // millisecond or two, and in a solver this stiff that jitter shows up as
      // visible shimmer — so the step is smoothed the same way.
      const raw = Math.min(Math.max((now - last) / 1000, 1 / 240), 1 / 30);
      last = now;
      smoothDt += (raw - smoothDt) * 0.1;
      const dt = smoothDt;

      // Sweeps a pointer through the heap so the demo stirs itself.
      if (cfg.autoPlay && !userDriven) {
        autoT += dt;
        stirring = true;
        mousePrevX = mouseX;
        mousePrevY = mouseY;
        mouseX = width * (0.5 + 0.38 * Math.cos(autoT * 0.9));
        mouseY = height * (0.62 + 0.18 * Math.sin(autoT * 1.6));
      } else {
        // The reference only stirs while the button is held. Plain movement
        // stirring too is the friendlier default, and the drag still works.
        stirring = pressed || (cfg.stirOnHover && hovering);
      }

      ctx!.fillStyle = cfg.background;
      ctx!.fillRect(0, 0, width, height);
      ctx!.fillStyle = cfg.particleColor;

      const size = cfg.particleSize;
      const spacing = size * cfg.spacingFactor;
      // Numeric keys: building and splitting a string key per particle per
      // frame is pure overhead in a loop this hot.
      const grid = new Map<number, number[]>();
      const STRIDE = 4096;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        update(p, dt, cfg, size);
        const key = (Math.floor(p.x / spacing) + 2048) * STRIDE + (Math.floor(p.y / spacing) + 2048);
        const cell = grid.get(key);
        if (cell) cell.push(i);
        else grid.set(key, [i]);
      }

      // Only neighbouring cells are tested, which is what keeps a few hundred
      // shapes affordable at this density.
      //
      // The relaxation is run several times per frame. One pass leaves a dense
      // heap under-resolved — neighbours still overlapping — and that reads as
      // granular chatter rather than a liquid. Extra passes let the pile settle
      // against itself within the frame. Density and acceleration accumulate on
      // the last pass only, or they would compound with each one.
      const passes = Math.max(1, Math.round(cfg.relaxPasses));
      for (let pass = 0; pass < passes; pass++) {
        const accumulate = pass === passes - 1;
        grid.forEach((cell, key) => {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const neighbour = grid.get(key + dx * STRIDE + dy);
              if (!neighbour) continue;
              for (let ci = 0; ci < cell.length; ci++) {
                const i = cell[ci];
                for (let nj = 0; nj < neighbour.length; nj++) {
                  const j = neighbour[nj];
                  if (i < j) interact(particles[i], particles[j], size, spacing, accumulate);
                }
              }
            }
          }
        });
      }

      for (let i = 0; i < particles.length; i++) drawParticle(particles[i], size);

      mousePrevX = mouseX;
      mousePrevY = mouseY;

      raf = requestAnimationFrame(frame);
    }

    function pointerPos(e: PointerEvent) {
      const rect = root!.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }

    // Taking over has to reseat the previous point too, or the first frame
    // reads one huge jump and flings the heap.
    function takeOver(e: PointerEvent) {
      if (userDriven) return;
      userDriven = true;
      pointerPos(e);
      mousePrevX = mouseX;
      mousePrevY = mouseY;
    }

    function onPointerDown(e: PointerEvent) {
      takeOver(e);
      pointerPos(e);
      pressed = true;
    }
    function onPointerMove(e: PointerEvent) {
      takeOver(e);
      pointerPos(e);
      hovering = true;
    }
    function onPointerLeave() {
      hovering = false;
    }
    function onPointerUp() {
      pressed = false;
    }

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointerup", onPointerUp);

    const onResize = () => {
      resize();
      seed();
    };
    window.addEventListener("resize", onResize);

    resize();
    seed();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
    };
  }, [particleCount, particleSize, spacingFactor]);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full touch-none overflow-hidden"
      style={{ background, fontFamily, containerType: "inline-size" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      <div
        className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center select-none"
        style={{ zIndex: 2 }}
      >
        <p
          className="uppercase"
          style={{ color: textColor, fontWeight: 400, marginBottom: "1.5em" }}
        >
          {eyebrow}
        </p>
        <h1
          className="text-center"
          style={{
            color: textColor,
            fontSize: `calc(${headingSize}cqw * ${scale})`,
            fontWeight: 400,
            lineHeight: "100%",
            marginBottom: "0.75em",
          }}
        >
          {heading.split("\n").map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>
        <button
          type="button"
          className="pointer-events-auto relative cursor-pointer overflow-hidden uppercase"
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
          style={{
            border: "none",
            outline: "none",
            padding: "1.5em 3em",
            fontWeight: 500,
            background: particleColor,
            color: buttonHover ? particleColor : background,
            borderRadius: "2em",
            fontFamily,
            transition: "color 0.4s cubic-bezier(0.76, 0, 0.24, 1)",
          }}
        >
          {/* The fill rises from the bottom on the way in and keeps going up on
              the way out, so the two halves of the hover read as one motion
              rather than the same wipe played backwards. */}
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background,
              transform: buttonHover ? "scaleY(1)" : "scaleY(0)",
              transformOrigin: buttonHover ? "bottom" : "top",
              transition: "transform 0.45s cubic-bezier(0.76, 0, 0.24, 1)",
            }}
          />
          <span className="relative">{buttonLabel}</span>
        </button>
      </div>
    </div>
  );
}
