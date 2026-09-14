"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const DEFAULT_IMAGES = Array.from({ length: 12 }, (_, i) => `/portrait-orbit/photo-${i + 1}.jpg`);
const DEFAULT_TITLES = [
  "Quiet signal",
  "Glass orbit",
  "Soft machine",
  "Night bloom",
  "Low tide",
  "Paper moon",
  "Drift field",
  "Salt and ember",
  "Hollow light",
  "Second nature",
  "Blue hour",
  "Still water",
];

const CARD_W = 1.6;
const CARD_H = 1.05;

const vertexShader = /* glsl */ `
  uniform float uBend;
  uniform float uRadius;
  uniform float uCurl;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    // Wrap the flat card around the helix's cylinder so it hugs the spiral.
    float theta = p.x / uRadius;
    vec3 wrapped = vec3(sin(theta) * uRadius, p.y, (cos(theta) - 1.0) * uRadius);
    p = mix(p, wrapped, uBend);
    // Scroll speed lifts the corners like paper caught in a draft.
    float edge = uv.x - 0.5;
    p.z += uCurl * (edge * edge * 2.0 + (uv.y - 0.5) * edge);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uCover;
  uniform float uShade;
  uniform float uReady;
  uniform vec2 uSize;
  uniform float uBlur;
  varying vec2 vUv;
  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float d = roundedBox(p, uSize * 0.5, 0.06);
    if (d > 0.0) discard;
    vec2 uv = (vUv - 0.5) * uCover + 0.5;
    // Out-of-focus cards: average taps scattered over a golden-angle disc,
    // reading softer mip levels as the blur grows so the result stays smooth.
    vec3 tex = texture2D(uMap, uv).rgb;
    if (uBlur > 0.001) {
      vec3 sum = tex;
      float bias = uBlur * 4.0;
      for (int i = 1; i < 16; i++) {
        float fi = float(i);
        float r = sqrt(fi / 16.0) * uBlur * 0.06;
        float a = fi * 2.39996;
        sum += texture2D(uMap, uv + vec2(cos(a), sin(a)) * r * uCover, bias).rgb;
      }
      tex = sum / 16.0;
    }
    vec3 col = mix(vec3(0.08), tex, uReady);
    gl_FragColor = vec4(col * uShade, 1.0);
    #include <colorspace_fragment>
  }
`;

type Card = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  index: number;
};

export default function SpiralGallery({
  images = DEFAULT_IMAGES,
  titles = DEFAULT_TITLES,
  radius = 24,
  pitch = 45,
  cardsPerTurn = 9,
  tilt = 0,
  curl = 60,
  blur = 100,
  background = "#0b0b0b",
  fontFamily = "var(--font-instrument-sans), sans-serif",
  textScale = 100,
  autoPlay = true,
}: {
  images?: string[];
  titles?: string[];
  /** Helix radius, in tenths of a card width. */
  radius?: number;
  /** Vertical rise per card, as a percentage of card height. */
  pitch?: number;
  cardsPerTurn?: number;
  tilt?: number;
  curl?: number;
  /** Focus blur on cards away from the centre, as a percentage. */
  blur?: number;
  background?: string;
  fontFamily?: string;
  textScale?: number;
  autoPlay?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const scale = textScale / 100;

  const settings = useRef({ radius, pitch, cardsPerTurn, tilt, curl, blur, autoPlay });
  // Live settings are read by the render loop, so slider changes apply
  // without rebuilding the scene.
  useEffect(() => {
    settings.current = { radius, pitch, cardsPerTurn, tilt, curl, blur, autoPlay };
  }, [radius, pitch, cardsPerTurn, tilt, curl, blur, autoPlay]);

  const list = images.length ? images : DEFAULT_IMAGES;
  // Repeat short image lists so the spiral always has enough cards to read.
  const count = Math.max(24, list.length);
  const imageKey = list.join("|");

  useEffect(() => {
    const root = rootRef.current;
    const host = canvasHostRef.current;
    if (!root || !host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    // Close and wide, so the front of the spiral fills the frame and the turns
    // above and below slant away in strong perspective.
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    const group = new THREE.Group();
    scene.add(group);

    const loader = new THREE.TextureLoader();
    const textures = new Map<string, THREE.Texture>();
    const geometry = new THREE.PlaneGeometry(CARD_W, CARD_H, 32, 16);
    const cards: Card[] = [];

    for (let i = 0; i < count; i++) {
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
        uniforms: {
          uMap: { value: null },
          uCover: { value: new THREE.Vector2(1, 1) },
          uShade: { value: 1 },
          uReady: { value: 0 },
          uSize: { value: new THREE.Vector2(CARD_W, CARD_H) },
          uBend: { value: 1 },
          uRadius: { value: 2.6 },
          uCurl: { value: 0 },
          uBlur: { value: 0 },
        },
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.index = i;
      group.add(mesh);
      cards.push({ mesh, index: i });
    }

    // One texture per distinct image, shared by every card that repeats it.
    for (const src of new Set(list)) {
      const tex = loader.load(src, (t) => {
        const img = t.image as { width: number; height: number };
        const imgAspect = img.width / img.height;
        const cardAspect = CARD_W / CARD_H;
        for (const c of cards) {
          if (list[c.index % list.length] !== src) continue;
          const u = c.mesh.material.uniforms;
          // object-fit: cover, done in UV space.
          u.uCover.value.set(
            imgAspect > cardAspect ? cardAspect / imgAspect : 1,
            imgAspect > cardAspect ? 1 : imgAspect / cardAspect,
          );
          u.uMap.value = t;
        }
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      textures.set(src, tex);
    }

    // --- input -----------------------------------------------------------
    let target = 0; // scroll position, in cards
    let current = 0;
    let velocity = 0;
    let dragging = false;
    let lastY = 0;
    let lastX = 0;
    let moved = 0;
    const pointer = new THREE.Vector2(-10, -10);
    let pointerInside = false;
    let lastInput = -Infinity;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      target += (e.deltaY + e.deltaX) * 0.0025;
      lastInput = performance.now();
    };
    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastY = e.clientY;
      lastX = e.clientX;
      root.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      pointerInside = true;
      if (!dragging) return;
      const dy = e.clientY - lastY;
      const dx = e.clientX - lastX;
      moved += Math.abs(dy) + Math.abs(dx);
      target -= (dy + dx * 0.5) * 0.006;
      lastY = e.clientY;
      lastX = e.clientX;
      lastInput = performance.now();
    };
    const onUp = () => {
      dragging = false;
    };
    const onLeave = () => {
      pointerInside = false;
    };
    const raycaster = new THREE.Raycaster();
    const onClick = () => {
      if (moved > 6) return;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(group.children)[0];
      if (!hit) return;
      // Glide the clicked card to the front.
      const idx = hit.object.userData.index as number;
      const n = cards.length;
      const rel = ((((idx - current) % n) + n + n / 2) % n) - n / 2;
      target = current + rel;
      lastInput = performance.now();
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("click", onClick);

    // --- layout ------------------------------------------------------------
    const resize = () => {
      const w = root.clientWidth || 1;
      const h = root.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      // Keep the spiral filling the frame on narrow or wide containers.
      camera.position.z = w / h < 1.2 ? 7 * (1.2 / (w / h)) * 0.85 : 7;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(root);

    const spiralPos = new THREE.Vector3();
    const euler = new THREE.Euler();
    let raf = 0;
    let last = performance.now();
    let shownActive = -1;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = settings.current;
      const n = cards.length;

      // Drift slowly on its own, pausing briefly after the visitor scrolls or drags.
      if (s.autoPlay && now - lastInput > 2000 && !dragging) target += dt * 0.2;

      const prev = current;
      current += (target - current) * (1 - Math.exp(-dt * 6));
      velocity += ((current - prev) / Math.max(dt, 1e-4) - velocity) * 0.2;

      const R = s.radius / 10;
      const rise = (s.pitch / 100) * CARD_H;
      const step = (Math.PI * 2) / s.cardsPerTurn;
      group.rotation.set(0, 0, THREE.MathUtils.degToRad(s.tilt));

      let front = 0;
      let frontScore = -Infinity;

      for (const card of cards) {
        // Position along the spiral, wrapped so it loops forever.
        const t = ((((card.index - current) % n) + n + n / 2) % n) - n / 2;
        const a = t * step;

        spiralPos.set(Math.sin(a) * R, -t * rise, Math.cos(a) * R);
        card.mesh.position.copy(spiralPos);

        card.mesh.quaternion.setFromEuler(euler.set(0, a, 0));

        // Fade cards out as they approach the wrap point at either end.
        const edgeFade = 1 - THREE.MathUtils.smoothstep(Math.abs(t), n / 2 - 2, n / 2);
        const facing = Math.cos(a);
        const u = card.mesh.material.uniforms;
        // A gentler curve than the helix itself, so side cards don't fold.
        u.uRadius.value = R * 2;
        u.uBend.value = 1;
        const curlAmt = (s.curl / 100) * THREE.MathUtils.clamp(velocity * 0.12, -0.6, 0.6);
        u.uCurl.value = curlAmt;
        const depthShade = THREE.MathUtils.lerp(0.35, 1, (facing + 1) / 2);
        u.uShade.value = depthShade * edgeFade;
        // Only the card at the heart of the spiral is in focus; the rest
        // soften with distance from it, sharpening as they drift into place.
        u.uBlur.value = THREE.MathUtils.smoothstep(Math.abs(t), 0.35, 2.5) * (s.blur / 100);
        if (u.uMap.value && u.uReady.value < 1) u.uReady.value = Math.min(1, u.uReady.value + dt * 3);

        const score = facing - Math.abs(t) * 0.2;
        if (score > frontScore) {
          frontScore = score;
          front = card.index;
        }
      }

      // Hovered card wins the label; otherwise the one facing the viewer.
      let labelIdx = front;
      if (pointerInside && !dragging) {
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(group.children)[0];
        if (hit) labelIdx = hit.object.userData.index as number;
        root.style.cursor = hit ? "pointer" : "grab";
      }
      if (labelIdx !== shownActive) {
        shownActive = labelIdx;
        setActive(labelIdx);
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("click", onClick);
      for (const c of cards) c.mesh.material.dispose();
      geometry.dispose();
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageKey, count]);

  const activeSrc = list[active % list.length];
  const activeTitle = titles.length ? titles[active % titles.length] : "";

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden select-none touch-none"
      style={{ background, fontFamily, cursor: "grab" }}
    >
      {/* faint drafting grid behind the spiral */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 85%)",
        }}
      />
      <div ref={canvasHostRef} className="absolute inset-0" />

      {activeTitle && (
        <div
          className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-white p-1.5 pr-5 text-black shadow-xl"
          style={{ fontSize: `${16 * scale}px` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={activeSrc}
            src={activeSrc}
            alt=""
            draggable={false}
            className="rounded-xl object-cover"
            style={{ width: `${44 * scale}px`, height: `${44 * scale}px` }}
          />
          <span key={activeTitle} className="whitespace-nowrap font-medium" style={{ animation: "sparkPreviewIn 240ms ease-out both" }}>
            {activeTitle}
          </span>
        </div>
      )}
    </div>
  );
}
