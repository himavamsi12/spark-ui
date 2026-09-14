"use client";

/*
 * The fluid solver below (splat, advection, curl/vorticity, divergence,
 * pressure and gradient-subtraction passes, plus the framebuffer helpers) is
 * adapted from WebGL Fluid Simulation by Pavel Dobryakov.
 * https://github.com/PavelDoGreat/WebGL-Fluid-Simulation
 *
 * MIT License
 *
 * Copyright (c) 2017 Pavel Dobryakov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const BASE_VERT = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const CLEAR_FRAG = `
precision mediump float;
varying highp vec2 vUv;
uniform sampler2D uTexture;
uniform float value;
void main () { gl_FragColor = value * texture2D(uTexture, vUv); }
`;

// Splat: a gaussian of `color` added at `point`.
const SPLAT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}
`;

const ADVECTION_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main () {
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  vec4 result = texture2D(uSource, coord);
  float decay = 1.0 + dissipation * dt;
  gl_FragColor = result / decay;
}
`;

const DIVERGENCE_FRAG = `
precision mediump float;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

const CURL_FRAG = `
precision mediump float;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`;

const VORTICITY_FRAG = `
precision highp float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

const PRESSURE_FRAG = `
precision mediump float;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

const GRADIENT_SUBTRACT_FRAG = `
precision mediump float;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

// Display (ours): the ink density is cut at a threshold into a crisp edge, and
// the hidden layer shows inside it, dragged a little by the flow.
const DISPLAY_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform sampler2D uReveal;
uniform float uThreshold;
uniform float uSoftness;
uniform float uDrag;
void main () {
  float density = texture2D(uDye, vUv).r;
  float ink = smoothstep(uThreshold - uSoftness, uThreshold + uSoftness, density);
  if (ink <= 0.0) { gl_FragColor = vec4(0.0); return; }
  vec2 flow = texture2D(uVelocity, vUv).xy;
  vec3 hidden = texture2D(uReveal, vUv - flow * uDrag).rgb;
  gl_FragColor = vec4(hidden * ink, ink);
}
`;

// ---------------------------------------------------------------------------
// WebGL helpers (adapted from the solver's framebuffer utilities)
// ---------------------------------------------------------------------------

type GL = WebGLRenderingContext | WebGL2RenderingContext;
type Fbo = {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelX: number;
  texelY: number;
  attach: (id: number) => number;
};
type DoubleFbo = { width: number; height: number; texelX: number; texelY: number; read: Fbo; write: Fbo; swap: () => void };
type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };

function compile(gl: GL, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function makeProgram(gl: GL, vert: WebGLShader, fragSource: string): Program {
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragSource));
  gl.bindAttribLocation(program, 0, "aPosition");
  gl.linkProgram(program);
  const uniforms: Program["uniforms"] = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const name = gl.getActiveUniform(program, i)!.name;
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return { program, uniforms };
}

function getContext(canvas: HTMLCanvasElement) {
  const params = { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false };
  const gl2 = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
  if (gl2) {
    gl2.getExtension("EXT_color_buffer_float");
    const linear = !!gl2.getExtension("OES_texture_float_linear");
    return { gl: gl2 as GL, isWebGL2: true, halfFloat: gl2.HALF_FLOAT, linear };
  }
  const gl1 = canvas.getContext("webgl", params) as WebGLRenderingContext | null;
  if (!gl1) return null;
  const hf = gl1.getExtension("OES_texture_half_float");
  const linear = !!gl1.getExtension("OES_texture_half_float_linear");
  if (!hf) return null;
  return { gl: gl1 as GL, isWebGL2: false, halfFloat: hf.HALF_FLOAT_OES, linear };
}

/** Grid size for a resolution, following the canvas aspect. */
function resolutionFor(res: number, w: number, h: number) {
  const aspect = w > h ? w / h : h / w;
  const min = Math.round(res);
  const max = Math.round(res * aspect);
  return w > h ? { width: max, height: min } : { width: min, height: max };
}

/**
 * A page that hides a second one under ink: move the pointer and ink pours
 * out of it into a real fluid simulation, swirling, curling and spreading as
 * it drifts, with a chrome version of the headline showing inside the ink.
 * Stop, and the ink slowly thins away until the page is clean again.
 */
export default function InkRevealCursor({
  headline = "SPARK UI",
  topLeft = "Move to spill the ink.\nEvery stroke hides another page.",
  bottomLeft = "Animated components for the web",
  bottomRight = "Ink Reveal — 01",
  revealImage = "",
  background = "#f4f3ef",
  textColor = "#0b0b0b",
  inkColor = "#0b0b0b",
  revealFrom = "#fafafa",
  revealTo = "#6f6f74",
  brushSize = 60,
  trailLength = 60,
  swirl = 45,
  splash = 60,
  fontFamily = "var(--font-host-grotesk), sans-serif",
  textScale = 100,
  autoPlay = true,
}: {
  /** The big word on the page, repainted in chrome inside the ink. */
  headline?: string;
  /** Small text at the top left; a line break splits it. */
  topLeft?: string;
  bottomLeft?: string;
  bottomRight?: string;
  /** Optional picture shown inside the ink, behind the chrome headline. */
  revealImage?: string;
  background?: string;
  textColor?: string;
  /** Colour of the ink itself. */
  inkColor?: string;
  /** Light tone of the chrome headline inside the ink. */
  revealFrom?: string;
  /** Dark tone of the chrome headline inside the ink. */
  revealTo?: string;
  /** How much ink pours out, 0-100. */
  brushSize?: number;
  /** How long the ink lasts before it thins away, 0-100. */
  trailLength?: number;
  /** How much the fluid curls into eddies, 0-100. */
  swirl?: number;
  /** How hard pointer movement throws the ink, 0-100. */
  splash?: number;
  fontFamily?: string;
  textScale?: number;
  /** Paints a path on its own until the pointer moves. */
  autoPlay?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Read live by the loop, so these sliders don't rebuild the simulation.
  const live = useRef({ brushSize, trailLength, swirl, splash, autoPlay });
  useEffect(() => {
    live.current = { brushSize, trailLength, swirl, splash, autoPlay };
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => setSize({ w: root.clientWidth, h: root.clientHeight }), 120);
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
    const headlineEl = headlineRef.current;
    if (!W || !H || !root || !headlineEl) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
    const ctx = getContext(canvas);
    if (!ctx) return;
    root.appendChild(canvas);
    const { gl, isWebGL2, halfFloat, linear } = ctx;
    let cancelled = false;

    // --- Framebuffers --------------------------------------------------------
    const filter = linear ? gl.LINEAR : gl.NEAREST;
    const formats = isWebGL2
      ? {
          rgba: { internal: (gl as WebGL2RenderingContext).RGBA16F, format: gl.RGBA },
          rg: { internal: (gl as WebGL2RenderingContext).RG16F, format: (gl as WebGL2RenderingContext).RG },
          r: { internal: (gl as WebGL2RenderingContext).R16F, format: (gl as WebGL2RenderingContext).RED },
        }
      : { rgba: { internal: gl.RGBA, format: gl.RGBA }, rg: { internal: gl.RGBA, format: gl.RGBA }, r: { internal: gl.RGBA, format: gl.RGBA } };

    const createFbo = (w: number, h: number, internal: number, format: number, param: number): Fbo => {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, halfFloat, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelX: 1 / w,
        texelY: 1 / h,
        attach(id: number) {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return id;
        },
      };
    };
    const createDouble = (w: number, h: number, internal: number, format: number, param: number): DoubleFbo => {
      let a = createFbo(w, h, internal, format, param);
      let b = createFbo(w, h, internal, format, param);
      return {
        width: w,
        height: h,
        texelX: a.texelX,
        texelY: a.texelY,
        get read() {
          return a;
        },
        get write() {
          return b;
        },
        swap() {
          [a, b] = [b, a];
        },
      } as DoubleFbo;
    };

    const simRes = resolutionFor(128, canvas.width, canvas.height);
    const dyeRes = resolutionFor(512, canvas.width, canvas.height);
    const dye = createDouble(dyeRes.width, dyeRes.height, formats.rgba.internal, formats.rgba.format, filter);
    const velocity = createDouble(simRes.width, simRes.height, formats.rg.internal, formats.rg.format, filter);
    const divergence = createFbo(simRes.width, simRes.height, formats.r.internal, formats.r.format, gl.NEAREST);
    const curl = createFbo(simRes.width, simRes.height, formats.r.internal, formats.r.format, gl.NEAREST);
    const pressure = createDouble(simRes.width, simRes.height, formats.r.internal, formats.r.format, gl.NEAREST);

    // --- Programs --------------------------------------------------------------
    const vert = compile(gl, gl.VERTEX_SHADER, BASE_VERT);
    const clearProg = makeProgram(gl, vert, CLEAR_FRAG);
    const splatProg = makeProgram(gl, vert, SPLAT_FRAG);
    const advectProg = makeProgram(gl, vert, ADVECTION_FRAG);
    const divergenceProg = makeProgram(gl, vert, DIVERGENCE_FRAG);
    const curlProg = makeProgram(gl, vert, CURL_FRAG);
    const vorticityProg = makeProgram(gl, vert, VORTICITY_FRAG);
    const pressureProg = makeProgram(gl, vert, PRESSURE_FRAG);
    const gradProg = makeProgram(gl, vert, GRADIENT_SUBTRACT_FRAG);
    const displayProg = makeProgram(gl, vert, DISPLAY_FRAG);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const blit = (target: Fbo | null) => {
      if (target) {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
    const bindProgram = (p: Program) => {
      gl.useProgram(p.program);
      return p.uniforms;
    };

    // --- Hidden layer: chrome headline on ink, lined up with the real type ---
    const revealTexture = gl.createTexture()!;
    const uploadReveal = (source: HTMLCanvasElement) => {
      gl.bindTexture(gl.TEXTURE_2D, revealTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    const paintReveal = (img?: HTMLImageElement) => {
      const c = document.createElement("canvas");
      c.width = canvas.width;
      c.height = canvas.height;
      const g = c.getContext("2d");
      if (!g) return;
      g.fillStyle = inkColor;
      g.fillRect(0, 0, c.width, c.height);
      if (img && img.naturalWidth) {
        const s = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
        g.globalAlpha = 0.85;
        g.drawImage(img, (c.width - img.naturalWidth * s) / 2, (c.height - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
        g.globalAlpha = 1;
      }
      const rootBox = root.getBoundingClientRect();
      const box = headlineEl.getBoundingClientRect();
      const cs = getComputedStyle(headlineEl);
      const fontPx = parseFloat(cs.fontSize) * dpr;
      g.font = `${cs.fontStyle} ${cs.fontWeight} ${fontPx}px ${cs.fontFamily}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      const ls = parseFloat(cs.letterSpacing);
      if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Number.isFinite(ls) ? ls * dpr : 0}px`;
      const cx = (box.left - rootBox.left + box.width / 2) * dpr;
      const cy = (box.top - rootBox.top + box.height / 2) * dpr;
      const top = cy - fontPx * 0.5;
      const grad = g.createLinearGradient(0, top, 0, top + fontPx);
      grad.addColorStop(0, revealFrom);
      grad.addColorStop(0.45, revealTo);
      grad.addColorStop(0.55, revealFrom);
      grad.addColorStop(1, revealTo);
      g.fillStyle = grad;
      g.shadowColor = "rgba(255,255,255,0.25)";
      g.shadowBlur = fontPx * 0.04;
      g.fillText(headline, cx, cy);
      uploadReveal(c);
    };
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => {
      if (cancelled) return;
      if (revealImage) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => !cancelled && paintReveal(img);
        img.onerror = () => !cancelled && paintReveal();
        img.src = revealImage;
      } else {
        paintReveal();
      }
    });

    // --- Simulation ------------------------------------------------------------
    const aspect = canvas.width / canvas.height;
    const splat = (x: number, y: number, dx: number, dy: number, amount: number, radius: number) => {
      let u = bindProgram(splatProg);
      gl.uniform1i(u.uTarget, velocity.read.attach(0));
      gl.uniform1f(u.aspectRatio, aspect);
      gl.uniform2f(u.point, x, y);
      gl.uniform3f(u.color, dx, dy, 0);
      gl.uniform1f(u.radius, aspect > 1 ? radius * aspect : radius);
      blit(velocity.write);
      velocity.swap();

      u = bindProgram(splatProg);
      gl.uniform1i(u.uTarget, dye.read.attach(0));
      gl.uniform3f(u.color, amount, amount, amount);
      blit(dye.write);
      dye.swap();
    };

    const step = (dt: number) => {
      const s = live.current;
      gl.disable(gl.BLEND);

      let u = bindProgram(curlProg);
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(u.uVelocity, velocity.read.attach(0));
      blit(curl);

      u = bindProgram(vorticityProg);
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(u.uVelocity, velocity.read.attach(0));
      gl.uniform1i(u.uCurl, curl.attach(1));
      gl.uniform1f(u.curl, (s.swirl / 100) * 30);
      gl.uniform1f(u.dt, dt);
      blit(velocity.write);
      velocity.swap();

      u = bindProgram(divergenceProg);
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(u.uVelocity, velocity.read.attach(0));
      blit(divergence);

      u = bindProgram(clearProg);
      gl.uniform1i(u.uTexture, pressure.read.attach(0));
      gl.uniform1f(u.value, 0.8);
      blit(pressure.write);
      pressure.swap();

      u = bindProgram(pressureProg);
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(u.uDivergence, divergence.attach(0));
      for (let i = 0; i < 20; i++) {
        gl.uniform1i(u.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
      }

      u = bindProgram(gradProg);
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(u.uPressure, pressure.read.attach(0));
      gl.uniform1i(u.uVelocity, velocity.read.attach(1));
      blit(velocity.write);
      velocity.swap();

      u = bindProgram(advectProg);
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      const vId = velocity.read.attach(0);
      gl.uniform1i(u.uVelocity, vId);
      gl.uniform1i(u.uSource, vId);
      gl.uniform1f(u.dt, dt);
      gl.uniform1f(u.dissipation, 1.2);
      blit(velocity.write);
      velocity.swap();

      gl.uniform1i(u.uVelocity, velocity.read.attach(0));
      gl.uniform1i(u.uSource, dye.read.attach(1));
      // Longer trails dissipate the ink more slowly.
      gl.uniform1f(u.dissipation, 2.4 - (s.trailLength / 100) * 2.1);
      blit(dye.write);
      dye.swap();
    };

    const render = () => {
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const u = bindProgram(displayProg);
      gl.uniform1i(u.uDye, dye.read.attach(0));
      gl.uniform1i(u.uVelocity, velocity.read.attach(1));
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, revealTexture);
      gl.uniform1i(u.uReveal, 2);
      gl.uniform1f(u.uThreshold, 0.5);
      gl.uniform1f(u.uSoftness, 0.04);
      gl.uniform1f(u.uDrag, 0.00004);
      blit(null);
    };

    // --- Pointer ---------------------------------------------------------------
    const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, moved: false, seeded: false };
    let userDriven = false;
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      if (!pointer.seeded) {
        pointer.px = x;
        pointer.py = y;
        pointer.seeded = true;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.moved = true;
      userDriven = true;
    };
    const onLeave = () => {
      pointer.seeded = false;
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);

    // --- Loop ------------------------------------------------------------------
    let raf = 0;
    let last = performance.now();
    let autoT = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 1 / 60);
      last = now;
      const s = live.current;

      if (s.autoPlay && !userDriven) {
        autoT += dt * 0.9;
        const x = 0.5 + 0.34 * Math.sin(autoT);
        const y = 0.5 + 0.2 * Math.sin(autoT * 2);
        if (!pointer.seeded) {
          pointer.px = x;
          pointer.py = y;
          pointer.seeded = true;
        }
        pointer.x = x;
        pointer.y = y;
        pointer.moved = true;
      }

      if (pointer.moved) {
        pointer.moved = false;
        let dx = pointer.x - pointer.px;
        let dy = pointer.y - pointer.py;
        if (aspect < 1) dx *= aspect;
        if (aspect > 1) dy /= aspect;
        const force = 2000 + (s.splash / 100) * 9000;
        const radius = (0.02 + (s.brushSize / 100) * 0.15) / 100;
        const amount = 0.55 + (s.brushSize / 100) * 0.75;
        // Several splats along a long jump keep fast strokes continuous.
        const steps = Math.min(8, Math.max(1, Math.ceil(Math.hypot(dx * aspect, dy) / 0.02)));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          splat(pointer.px + (pointer.x - pointer.px) * t, pointer.py + (pointer.y - pointer.py) * t, (dx * force) / steps, (dy * force) / steps, amount / Math.sqrt(steps), radius);
        }
        pointer.px = pointer.x;
        pointer.py = pointer.y;
      }

      step(dt);
      render();
    };

    // Only run while on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!raf) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(root);

    return () => {
      cancelled = true;
      io.disconnect();
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
    // Rebuilt when layout or the hidden layer's content changes.
  }, [size, headline, revealImage, inkColor, revealFrom, revealTo, fontFamily, textScale]);

  const scale = textScale / 100;
  const small = `calc(clamp(11px, 1.05cqw, 15px) * ${scale})`;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full select-none overflow-hidden"
      style={{ background, color: textColor, fontFamily, containerType: "size" }}
    >
      <p
        className="absolute left-0 top-0 whitespace-pre-line font-medium leading-tight"
        style={{ padding: "2.4cqw 2.6cqw", fontSize: `calc(clamp(12px, 1.3cqw, 18px) * ${scale})` }}
      >
        {topLeft}
      </p>
      <div className="absolute inset-0 flex items-center justify-center" style={{ padding: "0 2cqw" }}>
        <h1 ref={headlineRef} className="whitespace-nowrap font-bold leading-none" style={{ fontSize: `calc(18cqw * ${scale})`, letterSpacing: "-0.05em" }}>
          {headline}
        </h1>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between" style={{ padding: "2.4cqw 2.6cqw", fontSize: small }}>
        <span>{bottomLeft}</span>
        <span className="font-medium uppercase tracking-wide">{bottomRight}</span>
      </div>
    </div>
  );
}
