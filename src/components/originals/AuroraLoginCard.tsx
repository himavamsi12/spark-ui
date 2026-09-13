"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

const VIDEO_SRC = "https://cdn.midjourney.com/video/71048e88-d8e6-470e-88ef-555c01eacb12/0.mp4";

/**
 * The submit button's rotating rim and its glow are the same conic gradient, so
 * they're declared once and reused — otherwise the two drift apart the moment
 * one stop is edited.
 */
const CONIC = "conic-gradient(from 0deg, #00c6ff, #0072ff, #ff007a, #ff8a00, #00c6ff)";

function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.26a12 12 0 0 0 0 10.74l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.2 15.23 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function XMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.153h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

function SocialButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/social flex w-full items-center gap-3 rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4 text-left transition-colors hover:border-gray-300 hover:bg-gray-100"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <ArrowRight
        size={16}
        className="ml-auto shrink-0 text-gray-400 transition-colors group-hover/social:text-gray-700"
      />
    </button>
  );
}

export default function AuroraLoginCard({
  title = "Welcome back",
  subtitle = "Sign in to your account",
  emailLabel = "Email",
  emailPlaceholder = "Enter your email",
  googleLabel = "Continue with Google",
  xLabel = "Continue with X",
  footerText = "Don't have an account?",
  footerLinkText = "Sign up",
  videoSrc = VIDEO_SRC,
  accentFrom = "#FF512F",
  accentTo = "#F09819",
  cardBackground = "#ffffff",
  panelBackground = "#0c0c0e",
  fontFamily = "var(--font-dm-sans), sans-serif",
  textScale = 100,
}: {
  title?: string;
  subtitle?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  googleLabel?: string;
  xLabel?: string;
  footerText?: string;
  footerLinkText?: string;
  videoSrc?: string;
  accentFrom?: string;
  accentTo?: string;
  cardBackground?: string;
  panelBackground?: string;
  fontFamily?: string;
  textScale?: number;
}) {
  const scale = textScale / 100;
  const [email, setEmail] = useState("");
  const sunset = `linear-gradient(135deg, ${accentFrom}, ${accentTo})`;

  return (
    <div
      className="relative flex min-h-full w-full items-center justify-center overflow-hidden bg-black p-6"
      style={{ fontFamily }}
    >
      {/* ── Background: the same clip as the left panel, dimmed back ── */}
      <video
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-black/10 backdrop-blur-sm" />

      {/* ── Card ── */}
      <div
        className="relative z-10 flex w-full max-w-[1040px] flex-col overflow-hidden rounded-[2.5rem] border border-gray-200 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] md:min-h-[650px] md:flex-row"
        style={{ background: cardBackground }}
      >
        {/* Left: the clip again, this time undimmed */}
        <div
          className="relative m-2 h-56 shrink-0 overflow-hidden rounded-[2rem] md:h-auto md:w-[45%]"
          style={{ background: panelBackground }}
        >
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        {/* Right: the form */}
        <div className="relative flex w-full flex-col justify-center overflow-hidden p-8 sm:p-12 md:w-[55%]">
          {/* Decorative bloom, kept behind the content */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full opacity-20 blur-[80px]"
            style={{ background: sunset }}
          />

          <div className="relative">
            <header className="text-center">
              <h1
                className="font-semibold tracking-tight text-gray-900"
                style={{ fontSize: `${40 * scale}px`, lineHeight: 1.1 }}
              >
                {title}
              </h1>
              <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
            </header>

            <div className="mt-8 flex flex-col gap-3">
              <SocialButton label={googleLabel} icon={<GoogleMark />} />
              <SocialButton label={xLabel} icon={<XMark />} />
            </div>

            {/* Rules fade out at the outer edges rather than butting the padding */}
            <div className="my-7 flex items-center gap-4">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">or</span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
            </div>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex items-center gap-2 rounded-[1.25rem] border border-gray-200 bg-gray-50 p-2 transition-colors focus-within:border-gray-400 focus-within:bg-white"
            >
              <label className="flex min-w-0 flex-1 flex-col pl-3">
                <span className="text-[11px] font-medium text-gray-500">{emailLabel}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={emailPlaceholder}
                  className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
              </label>

              {/* Submit: a black disc inside a conic rim, both of which spin on
                  hover. The rim is a padded gradient box with the disc laid on
                  top, so the gradient reads as a border without needing one. */}
              <button
                type="submit"
                aria-label="Continue"
                className="group/submit relative h-[52px] w-[52px] shrink-0"
              >
                <span
                  aria-hidden="true"
                  className="absolute -inset-1 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover/submit:animate-spin group-hover/submit:opacity-100"
                  style={{ background: CONIC }}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full group-hover/submit:animate-spin"
                  style={{ background: CONIC }}
                />
                <span className="absolute inset-[3px] flex items-center justify-center rounded-full bg-black transition-shadow group-hover/submit:shadow-[inset_0_2px_8px_rgba(255,255,255,0.25)]">
                  <ArrowRight
                    size={18}
                    className="text-white transition-transform group-hover/submit:translate-x-0.5"
                  />
                </span>
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-500">
              {footerText}{" "}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="bg-clip-text font-medium text-transparent"
                style={{ backgroundImage: sunset }}
              >
                {footerLinkText}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
