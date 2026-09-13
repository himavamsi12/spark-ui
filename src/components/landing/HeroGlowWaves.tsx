"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Soft glowing waves hanging from the top: big, heavily blurred tongues of
// light whose tips drift and swell, with a brighter core along the top edge and
// dark pockets that wander through the glow.
const FRAG = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uLow;
uniform float uReach;
uniform float uIntensity;
out vec4 fragColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int k = 0; k < 5; k++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  float x = uv.x * aspect;
  // Measured from the top edge, so the glow hangs down from the top of the box.
  float y = 1.0 - uv.y;
  float t = uTime;

  // Warp the space a little so the crests lean and billow instead of being
  // plain sine waves.
  vec2 warp = vec2(fbm(vec2(x * 0.9, y * 1.2 - t * 0.12)), fbm(vec2(x * 0.9 + 4.0, y * 1.2 - t * 0.1)));
  float wx = x + (warp.x - 0.5) * 0.18;

  // Outer glow: tall rising tongues whose crest height changes along x and time.
  float crest = uReach * (0.72
    + 0.26 * (fbm(vec2(wx * 0.9 + t * 0.09, t * 0.06)) - 0.5) * 2.0
    + 0.10 * sin(wx * 2.2 - t * 0.9)
    + 0.02 * sin(wx * 4.1 + t * 1.2));
  float body = 1.0 - smoothstep(crest - 0.34, crest + 0.14, y);

  // Brighter core lower down.
  float coreCrest = uReach * (0.34 + 0.12 * (fbm(vec2(wx * 1.6 - t * 0.09, 3.0 + t * 0.06)) - 0.5) * 2.0 + 0.05 * sin(wx * 3.2 + t));
  float core = 1.0 - smoothstep(coreCrest - 0.25, coreCrest + 0.12, y);

  // Dark pockets drifting up through the glow.
  float pocketNoise = fbm(vec2(wx * 1.4, y * 2.2 - t * 0.18) + warp * 0.8);
  float pocket = smoothstep(0.5, 0.74, pocketNoise) * smoothstep(0.1, 0.55, y);

  vec3 col = mix(uLow, uMid, body);
  col = mix(col, uTop, core * 0.9);

  float alpha = body * (1.0 - pocket * 0.22);
  alpha = clamp(alpha * uIntensity * 0.92, 0.0, 1.0);
  fragColor = vec4(col * alpha, alpha);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function HeroGlowWaves({
  top = "#ffb27a",
  mid = "#f2601c",
  low = "#a8360d",
  reach = 1,
  intensity = 1,
  speed = 1,
  className,
}: {
  /** Brightest colour, in the core of the glow. */
  top?: string;
  mid?: string;
  /** Colour at the edges of the glow before it fades to dark. */
  low?: string;
  /** How far down the box the waves reach, relative. */
  reach?: number;
  intensity?: number;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ top, mid, low, reach, intensity, speed });
  useEffect(() => {
    propsRef.current = { top, mid, low, reach, intensity, speed };
  }, [top, mid, low, reach, intensity, speed]);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    // A soft effect: no antialiasing, and at most 1.5x resolution.
    const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio || 1, 1.5) });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uTop: { value: hexToRgb(top) },
        uMid: { value: hexToRgb(mid) },
        uLow: { value: hexToRgb(low) },
        uReach: { value: reach },
        uIntensity: { value: intensity },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    host.appendChild(gl.canvas);

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    let colorKey = "";
    const start = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const p = propsRef.current;
      program.uniforms.uTime.value = ((now - start) / 1000) * p.speed;
      program.uniforms.uReach.value = p.reach;
      program.uniforms.uIntensity.value = p.intensity;
      const key = `${p.top}${p.mid}${p.low}`;
      if (key !== colorKey) {
        colorKey = key;
        program.uniforms.uTop.value = hexToRgb(p.top);
        program.uniforms.uMid.value = hexToRgb(p.mid);
        program.uniforms.uLow.value = hexToRgb(p.low);
      }
      renderer.render({ scene: mesh });
    };

    // Only animate while on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!raf) raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(host);

    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Colours and sizes are read live from propsRef; the context is built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
