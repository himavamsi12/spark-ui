"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function GridDeformVideo({
  strength = 100,
  aberration = 100,
  gridSize = 25,
}: {
  strength?: number;
  aberration?: number;
  gridSize?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video) return;

    const STRENGTH = 0.1 * (strength / 100);
    const RELAXATION = 0.925;
    const DISPLACEMENT = 0.015 * (aberration / 100);
    const ABERRATION = 0.15;
    const MOUSE_RADIUS = 0.25;

    let width = root.offsetWidth;
    let height = root.offsetHeight;
    let gridX = gridSize;
    let gridY = gridSize;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    root.appendChild(renderer.domElement);

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;

    function createDataTexture() {
      const aspect = width / height;
      gridX = aspect >= 1 ? Math.round(gridSize * aspect) : gridSize;
      gridY = aspect >= 1 ? gridSize : Math.round(gridSize / aspect);
      const data = new Float32Array(gridX * gridY * 4);
      const texture = new THREE.DataTexture(data, gridX, gridY, THREE.RGBAFormat, THREE.FloatType);
      texture.magFilter = texture.minFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      return texture;
    }

    let dataTexture = createDataTexture();

    function getCoverScale(): [number, number] {
      const videoAspect = (video!.videoWidth || 16) / (video!.videoHeight || 9);
      const containerAspect = width / height;
      const scaleX = containerAspect < videoAspect ? videoAspect / containerAspect : 1;
      const scaleY = containerAspect > videoAspect ? containerAspect / videoAspect : 1;
      return [2 * scaleX, 2 * scaleY];
    }

    const material = new THREE.ShaderMaterial({
      uniforms: { uTexture: { value: videoTexture }, uDataTexture: { value: dataTexture } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uDataTexture;
        varying vec2 vUv;
        void main() {
          vec4 offset = texture2D(uDataTexture, vUv);
          vec2 shift = ${DISPLACEMENT.toFixed(6)} * offset.rg;
          vec2 split = shift * ${ABERRATION.toFixed(6)};
          float r = texture2D(uTexture, vUv - shift + split).r;
          float g = texture2D(uTexture, vUv - shift).g;
          float b = texture2D(uTexture, vUv - shift - split).b;
          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `,
    });

    const [sx, sy] = getCoverScale();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), material);
    scene.add(mesh);

    const mouse = { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 };

    function onLoadedData() {
      mesh.geometry.dispose();
      const [nsx, nsy] = getCoverScale();
      mesh.geometry = new THREE.PlaneGeometry(nsx, nsy);
    }
    video.addEventListener("loadeddata", onLoadedData);

    function onMouseMove(event: MouseEvent) {
      const rect = root!.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      mouse.vX = x - mouse.prevX;
      mouse.vY = y - mouse.prevY;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x = x;
      mouse.y = y;
    }
    root.addEventListener("mousemove", onMouseMove);

    function updateDataTexture() {
      const data = dataTexture.image.data as Float32Array;
      for (let i = 0; i < data.length; i += 4) {
        data[i] *= RELAXATION;
        data[i + 1] *= RELAXATION;
      }
      const gridMouseX = gridX * mouse.x;
      const gridMouseY = gridY * (1 - mouse.y);
      const maxDist = gridSize * MOUSE_RADIUS;

      for (let i = 0; i < gridX; i++) {
        for (let j = 0; j < gridY; j++) {
          const distanceSq = (gridMouseX - i) ** 2 + (gridMouseY - j) ** 2;
          if (distanceSq >= maxDist * maxDist) continue;
          const index = 4 * (i + gridX * j);
          const power = Math.min(10, maxDist / Math.sqrt(distanceSq));
          data[index] += STRENGTH * 100 * mouse.vX * power;
          data[index + 1] -= STRENGTH * 100 * mouse.vY * power;
        }
      }
      mouse.vX *= 0.9;
      mouse.vY *= 0.9;
      dataTexture.needsUpdate = true;
    }

    const ro = new ResizeObserver(() => {
      width = root!.offsetWidth;
      height = root!.offsetHeight;
      mesh.geometry.dispose();
      const [nsx, nsy] = getCoverScale();
      mesh.geometry = new THREE.PlaneGeometry(nsx, nsy);
      dataTexture.dispose();
      dataTexture = createDataTexture();
      material.uniforms.uDataTexture.value = dataTexture;
      renderer.setSize(width, height);
    });
    ro.observe(root);

    video.play().catch(() => {});

    let frameId = 0;
    function animate() {
      updateDataTexture();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      video.removeEventListener("loadeddata", onLoadedData);
      root.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      material.dispose();
      mesh.geometry.dispose();
      dataTexture.dispose();
      videoTexture.dispose();
      if (renderer.domElement.parentElement === root) root.removeChild(renderer.domElement);
    };
  }, [strength, aberration, gridSize]);

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden bg-[#050b14]" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-0"
        autoPlay
        muted
        loop
        playsInline
        src="/grid-deform-video/footage.mp4"
      />
    </div>
  );
}
