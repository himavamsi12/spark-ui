"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";

/**
 * A deck of component covers receding along one diagonal axis and drifting
 * up-to-the-right, like cards pulled from a drawer.
 *
 * The cards sit on a straight line at a constant (dx, dy) step, so translating
 * the track by exactly one set's span lands every card where its predecessor
 * was, which is what makes the wrap invisible. A per-card scale or depth ramp
 * would break that, so depth is read purely from the overlap and the shared angle.
 */

// Small copies of each component's cover. The deck shows 36 cards at 300px,
// and decoding the full-size originals (up to 2400px) stalled the page load.
const COVERS = Array.from({ length: 12 }, (_, i) => `/hero-deck/cover-${String(i + 1).padStart(2, "0")}.jpg`);

// Same order as COVERS - clicking a card jumps to its real component page.
const COVER_SLUGS = [
  "accordion-frames",
  "ripple-slider",
  "circular-gallery",
  "clip-mask-page-transition",
  "perpetual-slider",
  "portrait-orbit",
  "magnetic-marquee",
  "grid-wipe-transition",
  "counter-reveal-hero",
  "grid-shutter-transition",
  "scroll-tunnel",
  "list-hover-cards",
];

const CARD_W = 300;
const CARD_H = 198;
const STEP_X = 103; // horizontal gap between neighbours, small so they overlap
const STEP_Y = 2; // each card sits slightly higher, barely any tilt
const SETS = 3;
/**
 * Empty strip above the deck so a lifted card isn't clipped by the container's
 * overflow. The box grows upward and the cards are pushed down by the same
 * amount, so the deck and everything around it stay exactly where they were.
 * Has to clear FALL_DISTANCE (below) plus the diagonal's own Y drift, or the
 * on-load fall-in clips against the container's top edge.
 */
const HEADROOM = 210;
// How far above its resting spot each card starts before falling into place.
const FALL_DISTANCE = 190;

const SET_SPAN_X = COVERS.length * STEP_X;
const SET_SPAN_Y = COVERS.length * STEP_Y;

const BASE_TILT = "rotateX(9deg) rotateY(-32deg) rotateZ(-1deg)";

// How far (in px) a card's influence reaches along the deck before it fades
// to nothing - about 2.5 card-steps, so the wave clearly touches neighbours
// on both sides of the one under the cursor without spreading so wide the
// whole row looks evenly lifted.
const WAVE_RADIUS = STEP_X * 2.6;
// >1 sharpens the curve so it drops off fast right next to the peak (the
// hovered card) instead of staying near-full-height for the first neighbour.
const WAVE_POWER = 2.4;
const LIFT_Y = -46;
const LIFT_SCALE = 0.04;

export default function ComponentFlowHero({ className }: { className?: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fallRefs = useRef<(HTMLDivElement | null)[]>([]);
  const liftRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    const fallEls = fallRefs.current.filter((el): el is HTMLDivElement => !!el);
    const liftEls = liftRefs.current.filter((el): el is HTMLDivElement => !!el);
    if (!container || !track || !fallEls.length) return;

    // Cards fall into place one by one on load, left to right, then sit at
    // rest - only the drift and the hover wave ever move them after that.
    const reducedMotionForFall = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotionForFall) {
      gsap.set(fallEls, { y: 0, x: 0, rotate: 0, opacity: 1 });
    } else {
      gsap.set(fallEls, { y: -FALL_DISTANCE, x: 0, rotate: 0, opacity: 0 });
      gsap.to(fallEls, {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.045,
      });
    }

    // Lifting one card also nudges its neighbours, tapering off with distance,
    // so the row reads as one curve responding to the cursor rather than a
    // single card popping up in isolation.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const quickTos = reducedMotion
      ? []
      : liftEls.map((el) => ({
          y: gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" }),
          scale: gsap.quickTo(el, "scale", { duration: 0.5, ease: "power3.out" }),
        }));

    // proxy.p is an unbounded "how many set-widths along the diagonal" value.
    // Only its fractional part is ever rendered, so the drift never runs out
    // of the pre-rendered sets.
    const proxy = { p: 0 };
    const render = () => {
      const wrapped = ((proxy.p % 1) + 1) % 1;
      gsap.set(track, { x: -wrapped * SET_SPAN_X, y: wrapped * SET_SPAN_Y });
    };
    render();

    let hoverPaused = false;
    // Stop drifting once the deck is scrolled out of view; it otherwise kept
    // moving 36 cards every frame for the rest of the visit.
    let offscreen = false;
    const visibilityIo = new IntersectionObserver(([entry]) => {
      offscreen = !entry.isIntersecting;
    });
    visibilityIo.observe(container);

    const ticker = (_time: number, deltaMs: number) => {
      if (hoverPaused || offscreen) return;
      proxy.p += deltaMs / 1000 / 15; // ~70px/s along the diagonal, same pace as before
      render();
    };
    if (!reducedMotion) gsap.ticker.add(ticker);

    // Cached so the wave-hover below never calls getBoundingClientRect -
    // reading layout on every pointermove while the deck's transform is
    // changing every frame forces a synchronous reflow each time, which is
    // what made the drift look jerky. Only the container's own box (not the
    // constantly-moving cards) needs measuring, and it only changes on resize.
    let containerLeft = container.getBoundingClientRect().left;
    const onResize = () => {
      containerLeft = container.getBoundingClientRect().left;
    };
    window.addEventListener("resize", onResize);

    // rAF-gated: pointermove can fire far more often than the screen repaints
    // (especially on trackpads/high-poll mice), so without this the same
    // per-card math below could run hundreds of times a second for no
    // visible benefit.
    let pendingClientX: number | null = null;
    let rafId: number | null = null;
    const applyWave = () => {
      rafId = null;
      if (pendingClientX === null) return;
      const clientX = pendingClientX;
      const wrapped = ((proxy.p % 1) + 1) % 1;
      const trackX = -wrapped * SET_SPAN_X;
      liftEls.forEach((el, i) => {
        const cardCenterX = containerLeft + trackX + i * STEP_X + CARD_W / 2;
        const dist = Math.abs(clientX - cardCenterX);
        const angle = (Math.min(dist, WAVE_RADIUS) / WAVE_RADIUS) * (Math.PI / 2);
        const falloff = Math.pow(Math.cos(angle), WAVE_POWER);
        quickTos[i].y(LIFT_Y * falloff);
        quickTos[i].scale(1 + LIFT_SCALE * falloff);
      });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pendingClientX = e.clientX;
      if (rafId === null) rafId = requestAnimationFrame(applyWave);
    };
    const onLeave = () => {
      pendingClientX = null;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      quickTos.forEach(({ y, scale }) => {
        y(0);
        scale(1);
      });
    };

    if (!reducedMotion) {
      container.addEventListener("pointermove", onMove);
      container.addEventListener("pointerleave", onLeave);
    }

    // Hovering a card holds the deck still. Done with plain listeners rather
    // than React state so the moving deck sliding under the cursor never
    // triggers a re-render mid-lift.
    const onOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".cfh-card")) hoverPaused = true;
    };
    const onOut = (e: MouseEvent) => {
      const to = e.relatedTarget as HTMLElement | null;
      // Sliding straight onto a neighbouring card should stay paused.
      if (to?.closest?.(".cfh-card")) return;
      hoverPaused = false;
    };
    track.addEventListener("mouseover", onOver);
    track.addEventListener("mouseout", onOut);

    // Click-through: a cover navigates to the real component page it's
    // standing in for.
    const onClick = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest(".cfh-card") as HTMLElement | null;
      if (!card) return;
      const idx = Number(card.dataset.idx);
      const slug = COVER_SLUGS[idx % COVER_SLUGS.length];
      if (slug) router.push(`/components/${slug}`);
    };
    container.addEventListener("click", onClick);

    return () => {
      track.removeEventListener("mouseover", onOver);
      track.removeEventListener("mouseout", onOut);
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      container.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
      gsap.ticker.remove(ticker);
      visibilityIo.disconnect();
      gsap.killTweensOf(fallEls);
      gsap.killTweensOf(liftEls);
    };
  }, [router]);

  const cards = Array.from({ length: COVERS.length * SETS });

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden pointer-events-none ${className ?? ""}`}
      style={{
        height: 360 + HEADROOM,
        marginTop: -HEADROOM,
        perspective: "1500px",
        maskImage:
          "linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)",
      }}
    >
      <style>{`
        /* .cfh-card is a static hit area: it never moves, so lifting the art
           can't slide it out from under the cursor and start a hover flicker.
           Only .cfh-lift animates. */
        .cfh-card {
          transform: ${BASE_TILT};
          transform-style: preserve-3d;
          transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        /* Just enough z to sort in front of its coplanar siblings. A large
           translateZ also pushes the card outward from the perspective origin,
           which reads as a sideways slide rather than a clean lift. */
        .cfh-card:hover { transform: translateZ(12px) ${BASE_TILT}; }
        .cfh-card { cursor: pointer; }

        .cfh-lift {
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .cfh-card, .cfh-card img { transition: none; }
        }
      `}</style>

      <div
        ref={trackRef}
        className="cfh-track absolute will-change-transform"
        style={{ left: 0, top: 0, transformStyle: "preserve-3d" }}
      >
        {cards.map((_, i) => (
          <div
            key={i}
            data-idx={i}
            className="cfh-card absolute pointer-events-auto"
            style={{
              width: CARD_W,
              height: CARD_H,
              // Laid along the diagonal, front card at the bottom-left.
              left: i * STEP_X,
              top: HEADROOM + 100 - i * STEP_Y,
            }}
          >
            {/* Owns only the entrance fall: a separate node from .cfh-card's
                fixed 3D tilt and .cfh-lift's hover transform, so none of the
                three transforms fight each other. */}
            <div
              ref={(el) => {
                fallRefs.current[i] = el;
              }}
              className="w-full h-full"
            >
              <div
                ref={(el) => {
                  liftRefs.current[i] = el;
                }}
                className="cfh-lift w-full h-full rounded-cards overflow-hidden border border-pearl/12 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.95)]"
              >
                <img
                  src={COVERS[i % COVERS.length]}
                  alt=""
                  draggable={false}
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
