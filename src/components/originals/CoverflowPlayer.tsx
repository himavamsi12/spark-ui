"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import {
  Ellipsis,
  FastForward,
  ListMusic,
  MessageSquareQuote,
  Pause,
  Play,
  Rewind,
  Volume2,
  VolumeX,
} from "lucide-react";

const DEFAULT_IMAGES = [
  "/coverflow-player/cover1.jpg",
  "/coverflow-player/cover2.jpg",
  "/coverflow-player/cover3.jpg",
  "/coverflow-player/cover4.jpg",
  "/coverflow-player/cover5.jpg",
  "/coverflow-player/cover6.jpg",
];
/* Official iTunes 30-second preview streams; only the first clip of each plays. */
const DEFAULT_AUDIO = [
  "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/19/d6/60/19d660ff-e3a9-8377-15a3-ce4b28e89cac/mzaf_18422426156481158187.plus.aac.p.m4a",
  "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/11/71/d6/1171d6ad-3c96-e027-2af6-58028426588c/mzaf_15137631797407745471.plus.aac.p.m4a",
  "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f1/b3/56/f1b356b5-8591-4dce-af6e-ee482d73f799/mzaf_12873669089313914993.plus.aac.p.m4a",
  "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f0/60/39/f060399b-690f-2e55-7013-5530cd616d95/mzaf_6001308391779304655.plus.aac.p.m4a",
  "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/2d/f5/fb/2df5fb2d-e299-654a-d83b-e82b80e7f004/mzaf_12691315588940985591.plus.aac.p.m4a",
  "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f5/e0/66/f5e066f4-3b33-e5a0-6328-ca1ae6742f83/mzaf_5397637265841153345.plus.aac.p.m4a",
];
const DEFAULT_TITLES = ["Blinding Lights", "Starboy", "What Makes You Beautiful", "Goosebumps", "Steal My Girl", "Highest in the Room"];
const DEFAULT_ARTISTS = ["The Weeknd", "The Weeknd", "One Direction", "Travis Scott", "One Direction", "Travis Scott"];

/* Stage the carousel is designed at; it's scaled to fit its container. */
const STAGE_W = 760;
const STAGE_H = 560;

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Shortest signed distance from `active` to `i` around a ring of `n`. */
function ringOffset(i: number, active: number, n: number) {
  let d = (((i - active) % n) + n) % n;
  if (d > n / 2) d -= n;
  return d;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * A now-playing coverflow: album cards fan out in 3D around the focused track,
 * over an ambient backdrop blurred from its artwork, with a glass transport
 * dock underneath. Swipe, scroll, use the arrow keys or click a card to switch
 * tracks; the dock's progress bar advances to the next one on its own.
 */
export default function CoverflowPlayer({
  images = DEFAULT_IMAGES,
  titles = DEFAULT_TITLES,
  artists = DEFAULT_ARTISTS,
  audio = DEFAULT_AUDIO,
  accentColor = "#ffffff",
  cardWidth = 210,
  spread = 150,
  tilt = 28,
  visibleSides = 2,
  glassOpacity = 22,
  blur = 24,
  trackLength = 10,
  showEqualizer = true,
  startPlaying = true,
  speed = 100,
  autoPlay = false,
}: {
  images?: string[];
  titles?: string[];
  artists?: string[];
  /** Audio source per card, paired by position. Cards without one play silently. */
  audio?: string[];
  accentColor?: string;
  /** Width of the focused card in stage pixels. */
  cardWidth?: number;
  /** Horizontal distance between neighbouring cards. */
  spread?: number;
  /** How far side cards turn away, in degrees. */
  tilt?: number;
  /** Cards shown on each side of the focused one. */
  visibleSides?: number;
  glassOpacity?: number;
  blur?: number;
  /** Seconds each track plays (the clip length) before the carousel moves on. */
  trackLength?: number;
  showEqualizer?: boolean;
  startPlaying?: boolean;
  speed?: number;
  autoPlay?: boolean;
}) {
  const count = Math.max(1, titles.length);
  const tracks = Array.from({ length: count }, (_, i) => ({
    title: titles[i] ?? "",
    artist: artists[i % Math.max(1, artists.length)] ?? "",
    image: images[i % Math.max(1, images.length)] ?? DEFAULT_IMAGES[0],
    audio: audio[i] ?? "",
  }));

  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(startPlaying || autoPlay);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const progress = useMotionValue(0);
  const progressWidth = useTransform(progress, (p) => `${p * 100}%`);
  const rate = Math.max(0.25, speed / 100);
  // Grid previews loop quickly so the card shows the carousel moving.
  const duration = autoPlay ? 3.2 : Math.max(3, trackLength);

  const safeActive = active % count;
  const current = tracks[safeActive];
  // Grid previews stay silent; audio only plays on the full demo.
  const audioSrc = autoPlay ? "" : current.audio;
  const audioRef = useRef<HTMLAudioElement>(null);

  const go = useCallback(
    (dir: number) => {
      setActive((a) => (((a + dir) % count) + count) % count);
      progress.set(0);
      setElapsed(0);
    },
    [count, progress],
  );

  const focus = useCallback(
    (i: number) => {
      setActive(i);
      progress.set(0);
      setElapsed(0);
    },
    [progress],
  );

  /* ── playback clock ── */
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let lastSecond = -1;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const el = audioRef.current;
      // With a clip loaded the bar follows the real audio, so buffering
      // holds it in place instead of letting it run ahead of the sound.
      const next =
        audioSrc && el && el.readyState >= 2 && !el.error
          ? el.currentTime / duration
          : audioSrc && el && !el.error
            ? progress.get()
            : progress.get() + dt / duration;
      if (next >= 1) {
        go(1);
      } else {
        progress.set(next);
        const sec = Math.floor(next * duration);
        if (sec !== lastSecond) {
          lastSecond = sec;
          setElapsed(sec);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, go, progress, audioSrc]);

  /* ── audio ── */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = muted;
  }, [muted]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioSrc) return;
    if (playing) {
      // Browsers block sound until the visitor interacts; fall back to paused
      // so the play button reflects reality.
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [playing, audioSrc]);

  /* ── fit to container ── */
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => setScale(Math.max(0.3, Math.min(1.6, frame.clientWidth / STAGE_W, frame.clientHeight / STAGE_H)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  /* ── wheel: one track per gesture ── */
  const wheelLock = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 12) return;
    const now = performance.now();
    if (now - wheelLock.current < 450) return;
    wheelLock.current = now;
    go(delta > 0 ? 1 : -1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === " ") {
      e.preventDefault();
      setPlaying((p) => !p);
    } else return;
  };

  const spring = { type: "spring", stiffness: 260 * rate, damping: 30, mass: 0.9 } as const;
  const glass = {
    background: `linear-gradient(180deg, rgba(255,255,255,${glassOpacity / 100 + 0.08}), rgba(255,255,255,${glassOpacity / 100 - 0.06}))`,
    backdropFilter: `blur(${blur}px) saturate(160%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(160%)`,
    border: "1px solid rgba(255,255,255,0.28)",
  } as const;
  const cardH = cardWidth * 1.3;

  return (
    <div
      ref={frameRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
      className="relative h-full w-full overflow-hidden bg-[#1a0f08] outline-none select-none"
      style={{ fontFamily: "var(--font-plus-jakarta-sans), system-ui, sans-serif" }}
    >
      {audioSrc && <audio ref={audioRef} key={audioSrc} src={audioSrc} preload="auto" muted={muted} />}
      {/* Ambient backdrop: the focused artwork, blown up and blurred, so the
          whole scene takes on the colour of what's playing. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={current.image}
          className="absolute inset-[-15%]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9 / rate }}
          style={{
            backgroundImage: `url(${current.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(70px) saturate(170%) brightness(0.8)",
          }}
        />
      </AnimatePresence>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 55% at 50% 45%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="absolute left-1/2 top-1/2" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {/* ── Cards ── */}
        <motion.div
          className="absolute inset-x-0 top-0 cursor-grab active:cursor-grabbing"
          style={{ height: 400, perspective: 1100, touchAction: "pan-y" }}
          onPanEnd={(_, info) => {
            if (info.offset.x < -40) go(1);
            else if (info.offset.x > 40) go(-1);
          }}
        >
          {tracks.map((track, i) => {
            const d = ringOffset(i, safeActive, count);
            const ad = Math.abs(d);
            const hidden = ad > visibleSides;
            // Spacing tightens past the first neighbour so the stack reads as
            // cards tucking behind one another rather than an even row.
            const x = Math.sign(d) * (ad <= 1 ? ad * spread : spread + (ad - 1) * spread * 0.62);
            const isActive = d === 0;
            return (
              <motion.button
                key={i}
                type="button"
                aria-label={`${track.title} by ${track.artist}`}
                aria-current={isActive}
                onClick={() => (isActive ? setPlaying((p) => !p) : focus(i))}
                className="absolute left-1/2 top-1/2 overflow-hidden rounded-[26px] text-left"
                style={{
                  width: cardWidth,
                  height: cardH,
                  marginLeft: -cardWidth / 2,
                  marginTop: -cardH / 2,
                  zIndex: 20 - ad,
                  pointerEvents: hidden ? "none" : "auto",
                  ...glass,
                  boxShadow: isActive
                    ? "0 30px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.35)"
                    : "0 20px 40px -20px rgba(0,0,0,0.5)",
                }}
                initial={false}
                animate={{
                  x,
                  scale: 1 - Math.min(ad, visibleSides + 1) * 0.13,
                  rotateY: -Math.sign(d) * Math.min(ad, 2) * (tilt / 2),
                  opacity: hidden ? 0 : 1 - ad * 0.08,
                }}
                transition={spring}
              >
                <div className="p-2 pb-0" style={{ height: cardH * 0.73 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={track.image} alt="" draggable={false} className="h-full w-full rounded-[19px] object-cover" />
                </div>
                <div className="flex flex-col items-center justify-center px-3 text-center" style={{ height: cardH * 0.27 }}>
                  <span className="w-full truncate text-[19px] font-semibold leading-tight text-white">{track.title}</span>
                  <span className="w-full truncate text-[15px] leading-tight text-white/65">{track.artist}</span>
                </div>
                {/* Side cards dim with distance; an overlay rather than a CSS
                    filter, which would break the card's own backdrop blur. */}
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-black"
                  initial={false}
                  animate={{ opacity: isActive ? 0 : Math.min(0.45, ad * 0.16) }}
                  transition={spring}
                />
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Dock ── */}
        <div
          className="absolute left-1/2 flex items-center justify-between rounded-full px-5"
          style={{
            top: 432,
            width: 680,
            height: 76,
            transform: "translateX(-50%)",
            ...glass,
            boxShadow: "0 24px 50px -24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          <div className="flex items-center gap-1">
            <DockButton label="Previous" onClick={() => go(-1)}>
              <Rewind size={22} fill="currentColor" strokeWidth={0} />
            </DockButton>
            <DockButton label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={playing ? "pause" : "play"}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex"
                >
                  {playing ? <Pause size={24} fill="currentColor" strokeWidth={0} /> : <Play size={24} fill="currentColor" strokeWidth={0} />}
                </motion.span>
              </AnimatePresence>
            </DockButton>
            <DockButton label="Next" onClick={() => go(1)}>
              <FastForward size={22} fill="currentColor" strokeWidth={0} />
            </DockButton>
          </div>

          {/* Now-playing chip */}
          <div className="relative flex h-[56px] w-[258px] items-center gap-3 overflow-hidden rounded-[16px] bg-black/55 pl-2 pr-3">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={current.image}
                src={current.image}
                alt=""
                draggable={false}
                className="h-10 w-10 shrink-0 rounded-[9px] object-cover"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.25 }}
              />
            </AnimatePresence>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-semibold text-white">{current.title}</div>
              <div className="truncate text-[11px] text-white/60">
                {current.artist} · {formatTime(elapsed)}
              </div>
            </div>
            {showEqualizer && <Equalizer playing={playing && !muted} color={accentColor} />}
            <Ellipsis size={16} className="shrink-0 text-white/80" />
            <div className="absolute inset-x-3 bottom-[5px] h-[3px] overflow-hidden rounded-full bg-white/15">
              <motion.div className="h-full rounded-full" style={{ width: progressWidth, background: accentColor }} />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <DockButton label="Lyrics">
              <MessageSquareQuote size={21} />
            </DockButton>
            <DockButton label="Queue">
              <ListMusic size={21} />
            </DockButton>
            <DockButton label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>
              {muted ? <VolumeX size={21} /> : <Volume2 size={21} />}
            </DockButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function DockButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.14)" }}
      whileTap={{ scale: 0.86 }}
      className="flex h-11 w-11 items-center justify-center rounded-full text-white"
    >
      {children}
    </motion.button>
  );
}

/** Four bars that bounce while playing and settle flat when paused. */
function Equalizer({ playing, color }: { playing: boolean; color: string }) {
  const peaks = [
    [0.35, 1, 0.5, 0.8],
    [0.8, 0.4, 1, 0.3],
    [0.5, 0.9, 0.3, 1],
    [1, 0.45, 0.75, 0.4],
  ];
  return (
    <div className="flex h-4 shrink-0 items-end gap-[2px]" aria-hidden="true">
      {peaks.map((p, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: hexToRgba(color, 0.9), height: 16, originY: 1 }}
          animate={playing ? { scaleY: p } : { scaleY: 0.2 }}
          transition={
            playing
              ? { duration: 0.9 + i * 0.12, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}
