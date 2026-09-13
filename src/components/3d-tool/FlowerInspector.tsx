"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Coordinate space every probe and mesh point below is authored in. The
 * artwork ships at 2368x2656, exactly 2x this and the same aspect, so the
 * two agree without any rescaling of the coordinates.
 */
const W = 1184;
const H = 1328;

const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*<>_";
const CYCLE_MS = 2600;
const SCRAMBLE_MS = 380;

/**
 * Each probe reads one part of the flower. `terms` is what the readout cycles
 * through, the same way an inspector would step through what it found at that
 * point in the scene.
 */
const PROBES = [
  {
    id: "petal",
    anchor: [352, 322] as const,
    elbow: [188, 236] as const,
    box: [16, 176, 300] as const, // x, y, width
    side: "right" as const,
    label: "SURFACE",
    terms: ["TEXTURES", "ALBEDO MAP", "NORMAL MAP", "ROUGHNESS"],
    shifts: [0, -54, 32, -26],
    meta: "uv0 · 2048²",
  },
  {
    id: "core",
    anchor: [596, 330] as const,
    elbow: [872, 176] as const,
    box: [886, 118, 286] as const,
    side: "left" as const,
    label: "MATERIAL",
    terms: ["SHADERS", "FRAGMENT PASS", "GLSL UNIFORMS", "BLEND MODE"],
    shifts: [0, 44, -36, 20],
    meta: "glsl · 312 lines",
  },
  {
    id: "bloom",
    anchor: [884, 452] as const,
    elbow: [1012, 596] as const,
    box: [880, 636, 292] as const,
    side: "left" as const,
    label: "GEOMETRY",
    terms: ["LAYERS", "DRAW CALLS", "MESH TREE", "VERTEX BUFFER"],
    shifts: [0, -40, 48, -22],
    meta: "18 nodes · 41k tris",
  },
  {
    id: "stem",
    anchor: [566, 1002] as const,
    elbow: [286, 1084] as const,
    box: [16, 1044, 306] as const,
    side: "right" as const,
    label: "MOTION",
    terms: ["SCROLL TRIGGERS", "TIMELINE", "EASING CURVE", "SCRUB 0.8"],
    shifts: [0, 46, -42, 24],
    meta: "pinned · 4 tweens",
  },
];

/**
 * Secondary tracking points spread over the bloom, stem, and leaves. These
 * carry no meaning on their own: they are the "everything else the scan
 * picked up" layer sitting behind the four labelled probes.
 */
const NODES = [
  [470, 300], [612, 258], [742, 300], [836, 396], [880, 470],
  [352, 430], [430, 512], [560, 420], [690, 470], [790, 560],
  [610, 596], [500, 620], [716, 690], [566, 742], [640, 872],
  [452, 900], [742, 940], [566, 1058], [690, 1130], [430, 1122],
] as const;

const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 1],
  [7, 8], [8, 9], [9, 4], [8, 10], [10, 11], [6, 11], [10, 12],
  [12, 13], [13, 11], [13, 14], [14, 16], [14, 15], [15, 17],
  [17, 18], [17, 19], [16, 18], [12, 16], [2, 8],
] as const;

/** Which nodes carry a visible number, and the value each starts at. */
const READOUT_NODES = [1, 3, 6, 8, 10, 13, 15, 17] as const;
const SEED_VALUES = [-29.8297, 100.8246, 74.3806, -11.701, 159.9612, -61.5123, 82.4858, -45.0731];

function drift(v: number) {
  return v + (Math.random() - 0.5) * 8;
}

function DataMesh() {
  const [values, setValues] = useState(SEED_VALUES);

  // Seeded on the server, then left to wander once the client takes over.
  useEffect(() => {
    const id = setInterval(() => setValues((vs) => vs.map(drift)), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <g className="mesh">
      {EDGES.map(([a, b], i) => {
        const [x1, y1] = NODES[a];
        const [x2, y2] = NODES[b];
        return (
          <line
            key={`e-${i}`}
            className="mesh-edge"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#ffffff"
            strokeOpacity="0.5"
            strokeWidth="1.2"
            style={{ animationDelay: `${(i % 9) * 420}ms` }}
          />
        );
      })}

      {NODES.map(([x, y], i) => (
        <circle
          key={`n-${i}`}
          className="mesh-node"
          cx={x}
          cy={y}
          r="3"
          fill="#ffffff"
          fillOpacity="0.75"
          style={{ animationDelay: `${(i % 7) * 300}ms` }}
        />
      ))}

      {READOUT_NODES.map((n, i) => {
        const [x, y] = NODES[n];
        const text = values[i].toFixed(4);
        const w = text.length * 8.5 + 14;
        return (
          <g key={`r-${n}`} className="mesh-readout" style={{ animationDelay: `${i * 240}ms` }}>
            <rect x={x + 14} y={y - 22} width={w} height="22" fill="rgba(0,0,0,0.55)" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
            <text
              x={x + 21}
              y={y - 6}
              fontSize="14"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fill="#ffffff"
              fillOpacity="0.8"
            >
              {text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function scrambled(text: string) {
  return text
    .split("")
    .map((ch) => (ch === " " ? " " : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]))
    .join("");
}

/** Cycles through terms, briefly scrambling the characters on each swap. */
function useReadout(terms: string[], offsetMs: number) {
  const [display, setDisplay] = useState(terms[0]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let i = 0;
    let noiseTicker: ReturnType<typeof setInterval> | undefined;
    let settle: ReturnType<typeof setTimeout> | undefined;
    let loop: ReturnType<typeof setInterval> | undefined;

    const advance = () => {
      i = (i + 1) % terms.length;
      const target = terms[i];
      setIndex(i);
      noiseTicker = setInterval(() => setDisplay(scrambled(target)), 45);
      settle = setTimeout(() => {
        clearInterval(noiseTicker);
        setDisplay(target);
      }, SCRAMBLE_MS);
    };

    const start = setTimeout(() => {
      advance();
      loop = setInterval(advance, CYCLE_MS);
    }, offsetMs);

    return () => {
      clearTimeout(start);
      clearTimeout(settle);
      clearInterval(noiseTicker);
      clearInterval(loop);
    };
  }, [terms, offsetMs]);

  return { display, index };
}

function Probe({ probe, delay }: { probe: (typeof PROBES)[number]; delay: number }) {
  const { display: readout, index } = useReadout(probe.terms, delay);
  const lineRef = useRef<SVGPolylineElement>(null);
  const [len, setLen] = useState(0);

  const [ax, ay] = probe.anchor;
  const [ex, ey] = probe.elbow;
  const [bx, by, bw] = probe.box;
  const bh = 84;
  const joinX = probe.side === "left" ? bx : bx + bw;
  const joinY = by + bh / 2;
  const points = `${ax},${ay} ${ex},${ey} ${joinX},${joinY}`;

  // The travelling pulse needs the real path length to loop cleanly.
  useEffect(() => {
    if (lineRef.current) setLen(lineRef.current.getTotalLength());
  }, []);

  return (
    <g className="probe" style={{ animationDelay: `${delay}ms` }}>
      {/* Every part rides the same shift, so the line stays joined at both ends. */}
      <g className="probe-shift" style={{ transform: `translateY(${probe.shifts[index]}px)` }}>
      {/* Anchor reticle: stays welded to the flower while the rest drifts. */}
      <g>
        <circle
          className="probe-ring"
          cx={ax}
          cy={ay}
          r="22"
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.3"
          strokeWidth="1"
          strokeDasharray="6 7"
          style={{ transformBox: "view-box", transformOrigin: `${ax}px ${ay}px`, animationDelay: `${delay}ms` }}
        />
        <rect x={ax - 9} y={ay - 9} width="18" height="18" fill="none" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.5" />
        <circle className="probe-pulse" cx={ax} cy={ay} r="4" fill="var(--accent)" style={{ animationDelay: `${delay}ms` }} />
      </g>

      {/* Line + panel drift together so the join never separates. */}
      <g className="probe-float" style={{ animationDelay: `${delay}ms` }}>
        <polyline
          ref={lineRef}
          className="probe-line"
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          style={{ animationDelay: `${delay}ms` }}
        />
        {/* A signal running out of the flower and into the readout, on a loop. */}
        {len > 0 && (
          <polyline
            className="probe-travel"
            points={points}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={
              {
                "--len": `${len}px`,
                strokeDasharray: `26 ${len}`,
                animationDelay: `${delay}ms`,
              } as React.CSSProperties
            }
          />
        )}
        <rect x={bx} y={by} width={bw} height={bh} fill="rgba(8,8,10,0.86)" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1.5" />
        {/* corner ticks */}
        <path d={`M ${bx} ${by + 14} L ${bx} ${by} L ${bx + 14} ${by}`} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
        <path d={`M ${bx + bw} ${by + bh - 14} L ${bx + bw} ${by + bh} L ${bx + bw - 14} ${by + bh}`} fill="none" stroke="var(--accent)" strokeWidth="2.5" />

        <text x={bx + 16} y={by + 26} fontSize="15" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="2.4" fill="var(--accent)" fillOpacity="0.85">
          {probe.label}
        </text>
        <text x={bx + 16} y={by + 52} fontSize="21" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="1.2" fill="#f4f4f5">
          {readout}
        </text>
        <text x={bx + 16} y={by + 72} fontSize="13" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="#ffffff" fillOpacity="0.4">
          {probe.meta}
        </text>
      </g>
      </g>
    </g>
  );
}

export default function FlowerInspector() {
  return (
    <div className="relative w-full max-w-3xl mx-auto" style={{ aspectRatio: `${W} / ${H}` }}>
      <style>{`
        @keyframes fi-draw { from { stroke-dashoffset: 900; } to { stroke-dashoffset: 0; } }
        @keyframes fi-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fi-pulse { 0%,100% { opacity: 1; r: 4; } 50% { opacity: 0.35; r: 6; } }
        @keyframes fi-spin { to { transform: rotate(360deg); } }
        /* Runs from the flower out to the readout panel. */
        @keyframes fi-travel { from { stroke-dashoffset: var(--len); } to { stroke-dashoffset: 0; } }
        @keyframes fi-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        /* 'top' rather than a percentage translate, because a percentage translate is
           relative to the band's own height, which barely moved it. */
        /* One 10s timeline drives the whole reveal:
             0.0-2.5s  scan sweeps down, shaded pass wipes in behind it
             2.5-7.5s  shaded pass holds alone, wireframe fully hidden (5s)
             7.5-8.3s  cross-fade back to the wireframe
             8.3-10s   wireframe rests before the next pass          */
        @keyframes fi-scan {
          0%   { top: -16%; opacity: 1; }
          25%  { top: 102%; opacity: 1; }
          27%  { opacity: 0; }
          100% { top: 102%; opacity: 0; }
        }
        @keyframes fi-wipe {
          0%     { height: 0%;   opacity: 1; }
          25%    { height: 100%; opacity: 1; }
          75%    { height: 100%; opacity: 1; }
          83%    { height: 100%; opacity: 0; }
          83.01% { height: 0%;   opacity: 0; }
          100%   { height: 0%;   opacity: 1; }
        }
        /* The exact complement of fi-wipe, so only one pass is ever visible.
           The height snaps back at 75% while still fully transparent, then
           fades in as the shaded pass fades out. */
        @keyframes fi-unwipe {
          0%     { height: 100%; opacity: 1; }
          25%    { height: 0%;   opacity: 1; }
          74.99% { height: 0%;   opacity: 1; }
          75%    { height: 100%; opacity: 0; }
          83%    { height: 100%; opacity: 1; }
          100%   { height: 100%; opacity: 1; }
        }
        @keyframes fi-flicker { 0%,100% { opacity: 0.55; } 45% { opacity: 0.22; } 60% { opacity: 0.7; } }
        @keyframes fi-blink { 0%,100% { opacity: 0.8; } 50% { opacity: 0.25; } }

        .probe { opacity: 0; animation: fi-fade 500ms ease forwards; }
        .probe-line { stroke-dasharray: 900; animation: fi-draw 900ms cubic-bezier(0.4,0,0.2,1) forwards; }
        .probe-travel { animation: fi-travel 2.4s linear infinite; }
        .probe-float { animation: fi-float 7s ease-in-out infinite; }
        .probe-shift { transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1); }
        .probe-pulse { animation: fi-pulse 1.8s ease-in-out infinite; }
        .probe-ring { animation: fi-spin 14s linear infinite; }
        .mesh-edge { animation: fi-flicker 4.5s ease-in-out infinite; }
        .mesh-node { animation: fi-blink 2.6s ease-in-out infinite; }
        .mesh-readout { animation: fi-blink 5s ease-in-out infinite; }
        .fi-scanline { animation: fi-scan 10s linear infinite; }
        .fi-wipe { height: 0; animation: fi-wipe 10s linear infinite; }
        .fi-unwipe { height: 100%; animation: fi-unwipe 10s linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .probe, .probe-line { animation-duration: 1ms; }
          .probe-shift { transition: none; }
          .probe-travel, .probe-float, .probe-pulse, .probe-ring,
          .mesh-edge, .mesh-node, .mesh-readout, .fi-scanline,
          .fi-wipe, .fi-unwipe { animation: none; }
        }
      `}</style>

      {/* Wireframe is the resting state: the mesh before it is shaded. Both
          artworks sit on pure black, so screen blending drops that ground out
          and they read as if lit on the page itself.

          The two files share one frame and one subject position, so they
          overlay exactly and the wipe between them lands on the same petal in
          both. Keep it that way when swapping either image out. */}
      {/* Clipped to exactly what the render has not taken yet: anchored to the
          bottom, its height shrinks as the wipe above grows, so the two never
          overlap and the shaded pass isn't showing mesh through itself. */}
      <div className="fi-unwipe absolute inset-x-0 bottom-0 overflow-hidden pointer-events-none mix-blend-screen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/3d-tool/wireframe.png"
          alt="A lily, scanned down to its wireframe"
          className="absolute bottom-0 left-0 w-full object-contain select-none"
          style={{ aspectRatio: `${W} / ${H}` }}
          draggable={false}
        />
      </div>

      {/* The shaded render, wiped in behind the scan line. Blending lives on
          the wrapper: the wipe animates opacity, which makes the wrapper its
          own stacking context, so a blend on the image inside would only see
          the wrapper's own (black) backdrop. */}
      <div className="fi-wipe absolute inset-x-0 top-0 overflow-hidden pointer-events-none mix-blend-screen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/3d-tool/flower1.png"
          alt=""
          aria-hidden="true"
          className="absolute top-0 left-0 w-full object-contain select-none"
          style={{ aspectRatio: `${W} / ${H}` }}
          draggable={false}
        />
      </div>

      {/* Scan sweep passing over the subject */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="fi-scanline absolute inset-x-0 h-24"
          style={{
            background:
              "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--accent) 16%, transparent), transparent)",
            // Feathered at the sides so the band never shows a hard edge
            // where it runs off the subject.
            maskImage: "linear-gradient(to right, transparent, #000 22%, #000 78%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, #000 22%, #000 78%, transparent)",
          }}
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <DataMesh />
        {PROBES.map((probe, i) => (
          <Probe key={probe.id} probe={probe} delay={i * 260} />
        ))}
      </svg>
    </div>
  );
}
