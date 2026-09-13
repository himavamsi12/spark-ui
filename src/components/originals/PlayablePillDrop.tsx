"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";

const DEFAULT_LABELS = [
  "HTML",
  "CSS",
  "JavaScript",
  "GSAP",
  "ScrollTrigger",
  "Lenis",
  "React",
  "Next.js",
  "WebGL",
  "Three.js",
  "Creative Dev",
];

/** Lenis's own curve, so the two frames carry the same weight as the source. */
const smoothing = (dt: number) => 1 - Math.pow(0.9, dt * 60);

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

/**
 * Scroll past the opening line and the list drops in as physical objects —
 * they fall, pile up along the floor and can be picked up and thrown at each
 * other, with the closing line sitting underneath the heap.
 */
export default function PlayablePillDrop({
  heroHeading = "Scroll down to break the laws of web design",
  footerHeading = "Because why list when you can play?",
  labels = DEFAULT_LABELS,
  heroBackground = "#ffffff",
  heroColor = "#0f0f0f",
  footerBackground = "#0f0f0f",
  footerColor = "#ffffff",
  pillBackground = "#ffffff",
  pillColor = "#0f0f0f",
  gravity = 1,
  restitution = 0.5,
  friction = 0.15,
  frictionAir = 0.02,
  density = 0.002,
  mouseStiffness = 0.6,
  pillRadius = 50,
  pillSize = 2,
  headingSize = 4,
  fontFamily = "var(--font-dm-sans), sans-serif",
  textScale = 100,
  autoPlay = true,
}: {
  heroHeading?: string;
  footerHeading?: string;
  /** One falling object per label. */
  labels?: string[];
  heroBackground?: string;
  heroColor?: string;
  footerBackground?: string;
  footerColor?: string;
  pillBackground?: string;
  pillColor?: string;
  /** Downward pull on the objects. */
  gravity?: number;
  /** How much of an impact an object gives back — its bounce. */
  restitution?: number;
  /** Drag between objects as they slide over each other. */
  friction?: number;
  /** Drag against the air, which is what settles the pile. */
  frictionAir?: number;
  /** Mass per unit of area; heavier objects shove lighter ones further. */
  density?: number;
  /** How rigidly a held object follows the cursor. */
  mouseStiffness?: number;
  /** Corner rounding of the objects, in px. */
  pillRadius?: number;
  /** Size of the label inside each object, in rem. */
  pillSize?: number;
  /** Size of the two headings, in rem. */
  headingSize?: number;
  fontFamily?: string;
  textScale?: number;
  /** Scrolls down on its own to drop the objects. */
  autoPlay?: boolean;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const configRef = useRef({
    gravity,
    restitution,
    friction,
    frictionAir,
    density,
    mouseStiffness,
    autoPlay,
  });
  useEffect(() => {
    configRef.current = {
      gravity,
      restitution,
      friction,
      frictionAir,
      density,
      mouseStiffness,
      autoPlay,
    };
  });

  // The scroll track: an opening frame and the frame the objects fall into.
  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const container = containerRef.current;
    if (!root || !track || !container) return;

    let scroll = 0;
    let target = 0;
    let raf = 0;
    let last = performance.now();
    let userDriven = false;
    let started = false;
    let cancelled = false;
    // The objects are measured to build their bodies, so a webfont landing
    // late would size every one of them against the fallback face.
    let fontsReady = document.fonts?.status === "loaded";
    if (!fontsReady) document.fonts?.ready.then(() => (fontsReady = true)).catch(() => (fontsReady = true));

    const frameH = () => root!.clientHeight;
    const maxScroll = () => frameH();

    let disposePhysics: (() => void) | null = null;

    function initPhysics() {
      if (started || cancelled) return;
      started = true;

      const { Engine, Runner, World, Bodies, Body, Mouse, MouseConstraint, Events } = Matter;
      const cfg = configRef.current;

      const engine = Engine.create();
      engine.gravity = { x: 0, y: cfg.gravity, scale: engine.gravity.scale };
      engine.constraintIterations = 10;
      engine.positionIterations = 20;
      engine.velocityIterations = 16;
      engine.timing.timeScale = 1;

      // Layout sizes, not getBoundingClientRect: inside a CSS-zoomed preview
      // card the rect comes back shrunk, while the bodies are positioned with
      // unzoomed left/top, which would crush every pill into one corner.
      const containerRect = { width: container!.clientWidth, height: container!.clientHeight };
      const zoom = container!.getBoundingClientRect().width / (container!.clientWidth || 1) || 1;
      const wallThickness = 200;

      // Floor and two side walls; the ceiling comes later, so the objects can
      // fall in from above it.
      const walls = [
        Bodies.rectangle(
          containerRect.width / 2,
          containerRect.height + wallThickness / 2,
          containerRect.width + wallThickness * 2,
          wallThickness,
          { isStatic: true },
        ),
        Bodies.rectangle(
          -wallThickness / 2,
          containerRect.height / 2,
          wallThickness,
          containerRect.height + wallThickness * 2,
          { isStatic: true },
        ),
        Bodies.rectangle(
          containerRect.width + wallThickness / 2,
          containerRect.height / 2,
          wallThickness,
          containerRect.height + wallThickness * 2,
          { isStatic: true },
        ),
      ];
      World.add(engine.world, walls);

      const objects = container!.querySelectorAll<HTMLElement>("[data-object]");
      const bodies: { body: Matter.Body; element: HTMLElement; width: number; height: number }[] =
        [];

      // A re-run would otherwise measure elements a previous run had already
      // rotated, and a rotated bounding box is bigger than the object itself.
      objects.forEach((obj) => {
        obj.style.left = "";
        obj.style.top = "";
        obj.style.transform = "";
      });

      objects.forEach((obj, index) => {
        const objRect = { width: obj.offsetWidth, height: obj.offsetHeight };

        const startX = Math.random() * (containerRect.width - objRect.width) + objRect.width / 2;
        const startY = -500 - index * 200;
        const startRotation = (Math.random() - 0.5) * Math.PI;

        const body = Bodies.rectangle(startX, startY, objRect.width, objRect.height, {
          restitution: cfg.restitution,
          friction: cfg.friction,
          frictionAir: cfg.frictionAir,
          density: cfg.density,
        });

        Body.setAngle(body, startRotation);

        bodies.push({ body, element: obj, width: objRect.width, height: objRect.height });
        World.add(engine.world, body);
      });

      // The ceiling arrives late, so the objects can fall in from above it.
      const topWallTimer = window.setTimeout(() => {
        const topWall = Bodies.rectangle(
          containerRect.width / 2,
          -wallThickness / 2,
          containerRect.width + wallThickness * 2,
          wallThickness,
          { isStatic: true },
        );
        World.add(engine.world, topWall);
      }, 3000);

      const mouse = Mouse.create(container!);
      // Pointer events arrive in on-screen pixels; map them back to layout ones.
      if (zoom !== 1) Mouse.setScale(mouse, { x: 1 / zoom, y: 1 / zoom });
      // Matter claims the wheel for itself; the page needs it back. The handler
      // is attached at runtime but absent from the typings.
      const mousewheel = (mouse as unknown as { mousewheel: EventListener }).mousewheel;
      mouse.element.removeEventListener("mousewheel", mousewheel);
      mouse.element.removeEventListener("DOMMouseScroll", mousewheel);

      const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: { stiffness: cfg.mouseStiffness, render: { visible: false } },
      });

      mouseConstraint.mouse.element.oncontextmenu = () => false;

      let dragging: Matter.Body | null = null;
      let originalInertia: number | null = null;

      // Held objects lose their spin and follow the cursor flat, which is what
      // keeps a grabbed object from windmilling out of the hand.
      Events.on(mouseConstraint, "startdrag", (event) => {
        dragging = (event as unknown as { body: Matter.Body }).body;
        if (dragging) {
          originalInertia = dragging.inertia;
          Body.setInertia(dragging, Infinity);
          Body.setVelocity(dragging, { x: 0, y: 0 });
          Body.setAngularVelocity(dragging, 0);
        }
      });

      Events.on(mouseConstraint, "enddrag", () => {
        if (dragging) {
          Body.setInertia(dragging, originalInertia || 1);
          dragging = null;
          originalInertia = null;
        }
      });

      Events.on(engine, "beforeUpdate", () => {
        if (!dragging) return;
        const found = bodies.find((b) => b.body === dragging);
        if (!found) return;

        const minX = found.width / 2;
        const maxX = containerRect.width - found.width / 2;
        const minY = found.height / 2;
        const maxY = containerRect.height - found.height / 2;

        Body.setPosition(dragging, {
          x: clamp(dragging.position.x, minX, maxX),
          y: clamp(dragging.position.y, minY, maxY),
        });

        Body.setVelocity(dragging, {
          x: clamp(dragging.velocity.x, -20, 20),
          y: clamp(dragging.velocity.y, -20, 20),
        });
      });

      // Matter itself uses null here to mean "holding nothing", which the
      // typings do not model.
      const release = () => {
        mouseConstraint.constraint.bodyB = null as unknown as Matter.Body;
        mouseConstraint.constraint.pointB = null as unknown as Matter.Vector;
      };
      container!.addEventListener("mouseleave", release);
      document.addEventListener("mouseup", release);

      World.add(engine.world, mouseConstraint);

      const runner = Runner.create();
      Runner.run(runner, engine);

      let positionRaf = 0;
      function updatePositions() {
        bodies.forEach(({ body, element, width, height }) => {
          const x = clamp(body.position.x - width / 2, 0, containerRect.width - width);
          const y = clamp(body.position.y - height / 2, -height * 3, containerRect.height - height);

          element.style.left = `${x}px`;
          element.style.top = `${y}px`;
          element.style.transform = `rotate(${body.angle}rad)`;
        });

        positionRaf = requestAnimationFrame(updatePositions);
      }
      updatePositions();

      disposePhysics = () => {
        clearTimeout(topWallTimer);
        cancelAnimationFrame(positionRaf);
        container!.removeEventListener("mouseleave", release);
        document.removeEventListener("mouseup", release);
        Runner.stop(runner);
        World.clear(engine.world, false);
        Engine.clear(engine);
      };
    }

    function onWheel(e: WheelEvent) {
      // Let a grabbed object keep the pointer; only the page scrolls here.
      e.preventDefault();
      userDriven = true;
      target = clamp(target + e.deltaY, 0, maxScroll());
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // Matches the reference's "top bottom" trigger: the objects are built the
      // moment their section starts to appear, so they are already falling by
      // the time it is on screen.
      if (configRef.current.autoPlay && !userDriven && !started) target = maxScroll();
      if (target > 0 && !started && fontsReady) initPhysics();

      scroll += (target - scroll) * smoothing(dt);
      track!.style.transform = `translateY(${-scroll}px)`;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      root.removeEventListener("wheel", onWheel);
      disposePhysics?.();
    };
  }, [labels.length]);

  const headingStyle = {
    fontFamily,
    fontSize: `calc(${headingSize}rem * ${scale})`,
    fontWeight: 500,
    letterSpacing: "-0.04rem",
    lineHeight: 1.2,
  } as const;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={{ fontFamily, containerType: "inline-size" }}
    >
      <div ref={trackRef} className="absolute inset-0 will-change-transform">
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden"
          style={{ background: heroBackground, color: heroColor, padding: "2rem" }}
        >
          <h1
            className="w-[45%] text-center select-none @max-[1000px]:!w-full @max-[1000px]:![font-size:calc(2rem*var(--ppd-scale))]"
            style={{ ...headingStyle, "--ppd-scale": String(scale) } as React.CSSProperties}
          >
            {heroHeading}
          </h1>
        </div>

        <div
          className="relative h-full w-full overflow-hidden"
          style={{ background: footerBackground, color: footerColor, padding: "2rem" }}
        >
          {/* The objects are laid out by the engine, so they start stacked at
              the container's origin where they can still be measured. */}
          <div ref={containerRef} className="absolute top-0 left-0 h-full w-full">
            {labels.map((label, i) => (
              <div
                key={`${label}-${i}`}
                data-object
                className="absolute z-[2] w-max cursor-grab select-none active:cursor-grabbing @max-[1000px]:![font-size:calc(1rem*var(--ppd-scale))]"
                style={{
                  "--ppd-scale": String(scale),
                  background: pillBackground,
                  color: pillColor,
                  fontSize: `calc(${pillSize}rem * ${scale})`,
                  fontWeight: 500,
                  padding: "1rem 2rem",
                  borderRadius: `${pillRadius}px`,
                  pointerEvents: "auto",
                } as React.CSSProperties}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Sits under the heap and stays out of the way of a grab. */}
          <div
            className="pointer-events-none absolute top-0 left-0 flex h-full w-full items-center justify-center"
            style={{ padding: "2rem" }}
          >
            <h1
              className="pointer-events-auto w-[45%] text-center select-none @max-[1000px]:!w-full @max-[1000px]:![font-size:calc(2rem*var(--ppd-scale))]"
              style={{ ...headingStyle, "--ppd-scale": String(scale) } as React.CSSProperties}
            >
              {footerHeading}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
