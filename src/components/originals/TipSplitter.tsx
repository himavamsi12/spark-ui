"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useTransform } from "motion/react";
import { Check, Minus, Plus, ReceiptText, SlidersHorizontal, Users } from "lucide-react";

const PRESETS = [10, 15, 20, 25];
const MAX_BILL = 999;
const TICK = 12;

/* Stage the widget is designed at; it's scaled to fit its container. */
const STAGE_W = 420;
const STAGE_H = 620;

const MONO = "ui-monospace, 'JetBrains Mono', 'SF Mono', SFMono-Regular, Menlo, monospace";

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Characters roll up or down individually as the value changes. */
function RollingText({ text, dir, className, style }: { text: string; dir: number; className?: string; style?: React.CSSProperties }) {
  const chars = text.split("");
  return (
    <span className={`inline-flex overflow-hidden ${className ?? ""}`} style={style}>
      {chars.map((c, i) => (
        <span key={`${chars.length - i}`} className="relative inline-block">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={c}
              className="inline-block"
              initial={{ y: dir >= 0 ? "70%" : "-70%", opacity: 0, filter: "blur(3px)" }}
              animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
              exit={{ y: dir >= 0 ? "-70%" : "70%", opacity: 0, filter: "blur(3px)" }}
              transition={{ type: "spring", stiffness: 520, damping: 38 }}
            >
              {c}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

type PayState = "idle" | "processing" | "paid";

type TipSplitterProps = {
  initialBill?: number;
  initialTip?: number;
  initialSplit?: number;
  currency?: string;
  background?: string;
  cardColor?: string;
  surfaceColor?: string;
  accentColor?: string;
  /** Corner radius of the card in stage pixels. */
  radius?: number;
  showRuler?: boolean;
  speed?: number;
  autoPlay?: boolean;
};

/** The starting values seed internal state, so changing them remounts the card. */
export default function TipSplitter(props: TipSplitterProps) {
  const { initialBill = 40, initialTip = 20, initialSplit = 2 } = props;
  return <TipSplitterCard key={`${initialBill}-${initialTip}-${initialSplit}`} {...props} />;
}

/**
 * A bill splitter card: scrub the ruler or step the amount, pick a tip, set
 * how many people are paying, then pay — the button fills while it
 * "processes" and a receipt toast rises from under the card.
 */
function TipSplitterCard({
  initialBill = 40,
  initialTip = 20,
  initialSplit = 2,
  currency = "$",
  background = "#efeee9",
  cardColor = "#0b0b0c",
  surfaceColor = "#1b1b1d",
  accentColor = "#ff8a3d",
  radius = 40,
  showRuler = true,
  speed = 100,
  autoPlay = false,
}: TipSplitterProps) {
  const rate = Math.max(0.25, speed / 100);
  const [bill, setBill] = useState(Math.round(initialBill));
  const [billDir, setBillDir] = useState(1);
  const [tip, setTip] = useState(initialTip);
  const [customOpen, setCustomOpen] = useState(!PRESETS.includes(initialTip));
  const [split, setSplit] = useState(Math.max(1, Math.round(initialSplit)));
  const [splitDir, setSplitDir] = useState(1);
  const [pay, setPay] = useState<PayState>("idle");

  const tipAmount = (bill * tip) / 100;
  const perPerson = (bill + tipAmount) / split;
  const money = (v: number) => `${currency}${v.toFixed(2)}`;

  /* ── ruler: one float drives the strip, the integer drives the UI ── */
  const rulerVal = useMotionValue(Math.round(initialBill));
  const stripX = useTransform(rulerVal, (v) => -v * TICK);
  const lastBill = useRef(bill);
  useMotionValueEvent(rulerVal, "change", (v) => {
    const next = Math.min(MAX_BILL, Math.max(1, Math.round(v)));
    if (next !== lastBill.current) {
      setBillDir(next > lastBill.current ? 1 : -1);
      lastBill.current = next;
      setBill(next);
    }
  });

  const setBillTo = useCallback(
    (target: number) => {
      const t = Math.min(MAX_BILL, Math.max(1, Math.round(target)));
      animate(rulerVal, t, { type: "spring", stiffness: 260 * rate, damping: 32 });
    },
    [rulerVal, rate],
  );

  const drag = useRef<{ x: number; v: number; lastX: number; lastT: number; vel: number } | null>(null);
  const onRulerDown = (e: ReactPointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    rulerVal.stop();
    drag.current = { x: e.clientX, v: rulerVal.get(), lastX: e.clientX, lastT: performance.now(), vel: 0 };
  };
  const onRulerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const now = performance.now();
    // Pointer deltas arrive in screen pixels; divide out the fit-to-container
    // scale so a tick always follows the finger.
    const s = scaleRef.current;
    d.vel = ((d.lastX - e.clientX) / s / TICK / Math.max(1, now - d.lastT)) * 1000;
    d.lastX = e.clientX;
    d.lastT = now;
    rulerVal.set(Math.min(MAX_BILL, Math.max(1, d.v + (d.x - e.clientX) / s / TICK)));
  };
  const onRulerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    // Fling: project the release velocity, then settle on a whole tick.
    const projected = rulerVal.get() + d.vel * 0.18;
    setBillTo(projected);
  };

  const stepSplit = (dir: number) => {
    setSplitDir(dir);
    setSplit((s) => Math.min(20, Math.max(1, s + dir)));
  };

  /* ── pay flow ── */
  const payTimer = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearPayTimers = () => {
    payTimer.current.forEach(clearTimeout);
    payTimer.current = [];
  };
  const startPay = useCallback(() => {
    if (pay !== "idle") return;
    setPay("processing");
    payTimer.current.push(setTimeout(() => setPay("paid"), 1300 / rate));
    payTimer.current.push(setTimeout(() => setPay("idle"), (1300 + 3400) / rate));
  }, [pay, rate]);
  useEffect(() => clearPayTimers, []);

  /* ── auto demo for grid previews ── */
  useEffect(() => {
    if (!autoPlay) return;
    const steps: (() => void)[] = [
      () => setBillTo(64),
      () => setTip(15),
      () => {
        setSplitDir(1);
        setSplit(3);
      },
      () => setBillTo(52),
      () => setTip(25),
      () => {
        setPay("processing");
        timers.push(setTimeout(() => setPay("paid"), 1200 / rate));
      },
      () => {},
      () => {
        setPay("idle");
        setBillTo(40);
        setTip(20);
        setSplitDir(-1);
        setSplit(2);
      },
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let i = 0;
    const id = setInterval(() => {
      steps[i % steps.length]();
      i++;
    }, 1400 / rate);
    return () => {
      clearInterval(id);
      timers.forEach(clearTimeout);
    };
  }, [autoPlay, rate, setBillTo]);

  /* ── fit to container ── */
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => {
      const s = Math.max(0.3, Math.min(1.5, (frame.clientWidth - 24) / STAGE_W, (frame.clientHeight - 24) / STAGE_H));
      scaleRef.current = s;
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  const spring = { type: "spring", stiffness: 420 * rate, damping: 34 } as const;
  const surface = { background: surfaceColor } as const;
  const muted = "rgba(255,255,255,0.5)";

  return (
    <div
      ref={frameRef}
      className="relative h-full w-full overflow-hidden select-none"
      style={{ background, fontFamily: "var(--font-plus-jakarta-sans), system-ui, sans-serif" }}
    >
      <div className="absolute left-1/2 top-1/2" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {/* ── Paid toast: tucked under the card, rises out once paid ── */}
        <AnimatePresence>
          {pay === "paid" && (
            <motion.div
              className="absolute left-5 right-5 flex items-center gap-3 rounded-full py-3 pl-3 pr-3 text-white"
              style={{ top: 514, background: cardColor, boxShadow: "0 18px 40px -18px rgba(0,0,0,0.45)" }}
              initial={{ y: -70, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -60, opacity: 0, scale: 0.92 }}
              transition={spring}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={surface}>
                <ReceiptText size={20} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[16px] font-semibold">Bill settled</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[13px]" style={{ color: muted, fontFamily: MONO }}>
                  <span>{money(tipAmount)} tip</span>
                  <span className="opacity-40">/</span>
                  <span>{tip}%</span>
                  <span className="opacity-40">/</span>
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {split}
                  </span>
                </div>
              </div>
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                style={{ background: hexToRgba(accentColor, 0.14), color: accentColor }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <motion.path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45 / rate, delay: 0.15 / rate, ease: "easeOut" }}
                  />
                </svg>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Card ── */}
        <div
          className="absolute inset-x-0 top-0 flex flex-col gap-3 p-5 text-white"
          style={{ height: 500, background: cardColor, borderRadius: radius, boxShadow: "0 30px 60px -30px rgba(0,0,0,0.5)" }}
        >
          {/* Amount */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <RoundButton label="Decrease bill" onClick={() => setBillTo(bill - 1)} surface={surfaceColor}>
              <Minus size={20} />
            </RoundButton>
            {/* The symbol sits top-aligned with the digits, like a price tag,
                rather than on a baseline the rolling digits don't share. */}
            <div className="flex min-w-[150px] items-start justify-center" style={{ fontFamily: MONO }}>
              <span className="mr-1 mt-[6px] text-[26px] font-medium leading-none" style={{ color: muted }}>
                {currency}
              </span>
              <RollingText text={String(bill)} dir={billDir} className="text-[54px] font-semibold leading-none tracking-tight" />
            </div>
            <RoundButton label="Increase bill" onClick={() => setBillTo(bill + 1)} surface={surfaceColor}>
              <Plus size={20} />
            </RoundButton>
          </div>

          {/* Ruler */}
          {showRuler && (
            <div
              className="relative h-11 cursor-ew-resize touch-none overflow-hidden"
              onPointerDown={onRulerDown}
              onPointerMove={onRulerMove}
              onPointerUp={onRulerUp}
              onPointerCancel={onRulerUp}
              style={{
                maskImage: "linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)",
                WebkitMaskImage: "linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)",
              }}
            >
              <motion.svg
                className="absolute top-0"
                width={(MAX_BILL + 1) * TICK}
                height={44}
                style={{ x: stripX, left: STAGE_W / 2 - 20 }}
                aria-hidden="true"
              >
                {Array.from({ length: MAX_BILL + 1 }, (_, v) => {
                  const major = v % 10 === 0;
                  const mid = v % 5 === 0;
                  const h = major ? 22 : mid ? 16 : 10;
                  return (
                    <line
                      key={v}
                      x1={v * TICK}
                      x2={v * TICK}
                      y1={22 - h / 2}
                      y2={22 + h / 2}
                      stroke="white"
                      strokeOpacity={major ? 0.75 : mid ? 0.45 : 0.22}
                      strokeWidth={major ? 2 : 1.25}
                      strokeLinecap="round"
                    />
                  );
                })}
              </motion.svg>
              {/* Centre needle, with a soft glow so it reads as the "cursor". */}
              <div
                className="pointer-events-none absolute left-1/2 top-1 h-9 w-[3px] -translate-x-1/2 rounded-full"
                style={{ background: accentColor, boxShadow: `0 0 12px ${hexToRgba(accentColor, 0.7)}` }}
              />
            </div>
          )}

          {/* Tip chips */}
          <div className="relative flex h-[52px] items-center gap-2">
            {PRESETS.map((p) => {
              const active = !customOpen && tip === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setCustomOpen(false);
                    setTip(p);
                  }}
                  className="relative h-full flex-1 rounded-full text-[17px] font-medium"
                  style={{ fontFamily: MONO, color: active ? cardColor : "white" }}
                >
                  <span className="absolute inset-0 rounded-full" style={surface} />
                  {active && (
                    <motion.span
                      layoutId="tip-chip"
                      className="absolute inset-0 rounded-full"
                      style={{ background: accentColor }}
                      transition={spring}
                    />
                  )}
                  <span className="relative">{p}%</span>
                </button>
              );
            })}
            <button
              type="button"
              aria-label="Custom tip"
              aria-pressed={customOpen}
              onClick={() => setCustomOpen((o) => !o)}
              className="relative h-full shrink-0 rounded-full px-4"
              style={{ color: customOpen ? cardColor : "white" }}
            >
              <span className="absolute inset-0 rounded-full" style={surface} />
              {customOpen && (
                <motion.span layoutId="tip-chip" className="absolute inset-0 rounded-full" style={{ background: accentColor }} transition={spring} />
              )}
              <span className="relative flex items-center gap-1.5 text-[15px] font-medium" style={{ fontFamily: MONO }}>
                <SlidersHorizontal size={17} />
                {customOpen && `${tip}%`}
              </span>
            </button>
          </div>

          {/* Custom tip slider, swaps in for the split row */}
          <AnimatePresence mode="popLayout" initial={false}>
            {customOpen ? (
              <motion.div
                key="custom"
                className="flex h-[76px] items-center gap-4 rounded-[26px] px-5"
                style={surface}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={spring}
              >
                <span className="text-[15px]" style={{ color: muted }}>
                  Custom
                </span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={tip}
                  onChange={(e) => setTip(Number(e.target.value))}
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15"
                  style={{ accentColor }}
                  aria-label="Custom tip percentage"
                />
                <span className="w-12 text-right text-[18px]" style={{ fontFamily: MONO }}>
                  {tip}%
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="split"
                className="flex h-[76px] items-center justify-between rounded-[26px] pl-5 pr-3"
                style={surface}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={spring}
              >
                <span className="flex items-center gap-2 text-[15px]" style={{ color: muted }}>
                  <Users size={16} />
                  Split between
                </span>
                <div className="flex items-center gap-3">
                  <RoundButton label="Fewer people" onClick={() => stepSplit(-1)} surface="rgba(255,255,255,0.08)" small disabled={split <= 1}>
                    <Minus size={18} />
                  </RoundButton>
                  <RollingText text={String(split)} dir={splitDir} className="w-8 justify-center text-[30px] font-medium" style={{ fontFamily: MONO }} />
                  <RoundButton label="More people" onClick={() => stepSplit(1)} surface="rgba(255,255,255,0.08)" small disabled={split >= 20}>
                    <Plus size={18} />
                  </RoundButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary */}
          <div className="flex flex-col rounded-[26px] px-5 py-1" style={surface}>
            <SummaryRow label="Tip amount" muted={muted}>
              <RollingText text={`+${money(tipAmount)}`} dir={1} style={{ color: accentColor, fontFamily: MONO }} className="text-[19px]" />
            </SummaryRow>
            <div className="h-px bg-white/[0.07]" />
            <SummaryRow label={split > 1 ? "Each pays" : "You pay"} muted={muted}>
              <RollingText text={money(perPerson)} dir={1} style={{ fontFamily: MONO }} className="text-[19px]" />
            </SummaryRow>
          </div>

          {/* Pay button: fills left-to-right while processing */}
          <motion.button
            type="button"
            onClick={startPay}
            disabled={pay !== "idle"}
            whileTap={pay === "idle" ? { scale: 0.97 } : undefined}
            className="relative mt-auto h-[64px] overflow-hidden rounded-full text-[18px] font-semibold"
            style={{
              background: `linear-gradient(180deg, ${hexToRgba("#ffffff", 0.14)}, ${hexToRgba("#ffffff", 0.05)})`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.4)",
            }}
          >
            <motion.span
              className="absolute inset-y-0 left-0"
              style={{ background: hexToRgba(accentColor, 0.9) }}
              initial={false}
              animate={{ width: pay === "idle" ? "0%" : "100%" }}
              transition={pay === "idle" ? { duration: 0.2 } : { duration: 1.2 / rate, ease: [0.4, 0, 0.2, 1] }}
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={pay}
                className="relative flex items-center justify-center gap-2"
                style={{ color: pay === "idle" ? "white" : cardColor }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                {pay === "idle" && `Pay ${money(bill + tipAmount)}`}
                {pay === "processing" && "Processing…"}
                {pay === "paid" && (
                  <>
                    <Check size={20} strokeWidth={2.6} /> Paid
                  </>
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function RoundButton({
  label,
  onClick,
  surface,
  small = false,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  surface: string;
  small?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const size = small ? 40 : 56;
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.86 }}
      className="flex shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-35"
      style={{ width: size, height: size, background: surface }}
    >
      {children}
    </motion.button>
  );
}

function SummaryRow({ label, muted, children }: { label: string; muted: string; children: React.ReactNode }) {
  return (
    <div className="flex h-[44px] items-center justify-between">
      <span className="text-[15px]" style={{ color: muted }}>
        {label}
      </span>
      {children}
    </div>
  );
}
