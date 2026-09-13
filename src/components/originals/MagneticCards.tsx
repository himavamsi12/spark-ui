"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Effective CSS zoom on an untransformed element (1 unless inside a zoomed container). */
function cssZoom(el: HTMLElement): number {
  const layout = el.offsetWidth;
  const visual = el.getBoundingClientRect().width;
  return layout && visual ? visual / layout : 1;
}

const DEFAULT_IMAGES = Array.from({ length: 4 }, (_, i) => `/magnetic-cards/card-img-${i + 1}.jpg`);

// The reference's resting arrangement: each card sits at its own offset and
// angle, which is what the spring pulls every card back toward.
const LAYOUT = {
  rotation: [5, -5, 7.5, -10],
  x: [-275, -100, 100, 275],
  y: [10, -10, 25, -10],
};

export default function MagneticCards({
  images = DEFAULT_IMAGES,
  background = "#141414",
  cardSize = 250,
  proximityRadius = 500,
  pushForce = 10,
  tiltAmount = 10,
  neighborInfluence = 20,
  springStiffness = 5,
  bounceFriction = 85,
}: {
  images?: string[];
  background?: string;
  cardSize?: number;
  proximityRadius?: number;
  pushForce?: number;
  tiltAmount?: number;
  neighborInfluence?: number;
  springStiffness?: number;
  bounceFriction?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const container = containerRef.current;
    if (!root || !container) return;

    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!cards.length) return;

    // Percentage controls back to the reference's raw coefficients.
    const TILT = tiltAmount / 100;
    const NEIGHBOR = neighborInfluence / 100;
    const STIFFNESS = springStiffness / 100;
    const FRICTION = bounceFriction / 100;
    const CURSOR_SMOOTHING = 0.75;

    const cursor = { x: 0, y: 0, vx: 0, vy: 0 };
    let prevX = 0;
    let prevY = 0;

    const physics = cards.map((el, i) => {
      const restX = LAYOUT.x[i % LAYOUT.x.length];
      const restY = LAYOUT.y[i % LAYOUT.y.length];
      const restR = LAYOUT.rotation[i % LAYOUT.rotation.length];
      gsap.set(el, { x: restX, y: restY, rotation: restR, zIndex: i, xPercent: -50, yPercent: -50 });
      return { el, restX, restY, restR, x: restX, y: restY, r: restR, vx: 0, vy: 0, vr: 0 };
    });

    function onMove(e: MouseEvent) {
      cursor.vx = cursor.vx * CURSOR_SMOOTHING + (e.clientX - prevX) * (1 - CURSOR_SMOOTHING);
      cursor.vy = cursor.vy * CURSOR_SMOOTHING + (e.clientY - prevY) * (1 - CURSOR_SMOOTHING);
      prevX = cursor.x = e.clientX;
      prevY = cursor.y = e.clientY;
    }
    function onLeave() {
      cursor.vx = cursor.vy = 0;
    }
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);

    // Cards are pushed by how fast the cursor is moving, not merely where it
    // is, so a slow pass leaves them alone and a flick scatters them.
    function pushForceFor(card: (typeof physics)[number]) {
      const speed = Math.sqrt(cursor.vx ** 2 + cursor.vy ** 2);
      if (speed < 0.5) return { fx: 0, fy: 0 };

      const rect = container!.getBoundingClientRect();
      // Cursor and rect are in on-screen pixels, rest offsets in layout ones.
      const zoom = cssZoom(container!);
      const cx = rect.left + rect.width / 2 + card.restX * zoom;
      const cy = rect.top + rect.height / 2 + card.restY * zoom;
      const dist = Math.sqrt((cursor.x - cx) ** 2 + (cursor.y - cy) ** 2) / zoom;
      if (dist > proximityRadius) return { fx: 0, fy: 0 };

      const weight = (1 - dist / proximityRadius) ** 3;
      return { fx: cursor.vx * pushForce * weight, fy: cursor.vy * pushForce * weight };
    }

    // A card also feels its neighbours, falling off sharply with distance in
    // the stack, which is what makes the row move as one piece of fabric.
    function withNeighbors(forces: { fx: number; fy: number }[], index: number) {
      let { fx, fy } = forces[index];
      forces.forEach((f, j) => {
        if (j === index) return;
        const falloff = NEIGHBOR ** Math.abs(j - index);
        fx += f.fx * falloff;
        fy += f.fy * falloff * 0.6;
      });
      return { fx, fy };
    }

    const tick = () => {
      const forces = physics.map(pushForceFor);
      physics.forEach((card, i) => {
        const { fx, fy } = withNeighbors(forces, i);
        card.vx = (card.vx + (card.restX + fx - card.x) * STIFFNESS) * FRICTION;
        card.vy = (card.vy + (card.restY + fy - card.y) * STIFFNESS) * FRICTION;
        card.vr = (card.vr + (card.restR + fx * TILT - card.r) * STIFFNESS) * FRICTION;
        card.x += card.vx;
        card.y += card.vy;
        card.r += card.vr;
        gsap.set(card.el, { x: card.x, y: card.y, rotation: card.r });
      });
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [
    images,
    proximityRadius,
    pushForce,
    tiltAmount,
    neighborInfluence,
    springStiffness,
    bounceFriction,
  ]);

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden" style={{ background }}>
      <div ref={containerRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="absolute rounded-2xl overflow-hidden will-change-transform"
            style={{ width: cardSize, height: cardSize }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" draggable={false} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
