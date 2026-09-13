export default function Logo({ size = 24, strikeId = 0 }: { size?: number; strikeId?: number }) {
  return (
    <svg width={size} height={size} viewBox="40 20 140 140" className="shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="logoGradTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffdca8" />
          <stop offset="100%" stopColor="var(--color-lavender-beam)" />
        </linearGradient>
        <linearGradient id="logoGradMid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-lavender-beam)" />
          <stop offset="100%" stopColor="var(--color-iris-glow)" />
        </linearGradient>
        <linearGradient id="logoGradShadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-iris-glow)" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <linearGradient id="logoDropGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--color-lavender-beam)" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff4dd" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--color-lavender-beam)" stopOpacity="0" />
        </linearGradient>
        <clipPath id="logoClip">
          <rect x="58" y="38" width="124" height="124" rx="27" />
        </clipPath>
        {/* Grows from the top down, so the bolt fills within its own outline
            instead of the whole shape sliding into place. */}
        <clipPath id="boltReveal">
          <rect key={`reveal-${strikeId}`} x="60" y="40" width="120" style={{ animation: "sparkThunderReveal 1s cubic-bezier(0.6, 0, 0.4, 1) both" }} />
        </clipPath>
      </defs>

      <rect
        x="60"
        y="40"
        width="120"
        height="120"
        rx="26"
        fill="none"
        stroke="var(--color-pearl)"
        strokeOpacity="0.4"
        strokeWidth="4"
      />

      <g clipPath="url(#logoClip)">
        {/* Thunder flash: a bright wash that strikes just as the bolt lands. */}
        <rect
          key={`flash-${strikeId}`}
          x="60"
          y="40"
          width="120"
          height="120"
          fill="var(--color-lavender-beam)"
          style={{ animation: "sparkThunderFlash 1s ease-out both", mixBlendMode: "screen" }}
        />

        {/* The bolt itself: revealed top-to-bottom by boltReveal, then blinks
            once it has fully formed. */}
        <g key={`bolt-${strikeId}`} clipPath="url(#boltReveal)" style={{ animation: "sparkThunderBlink 1s ease-out both" }}>
          <path d="M140 66 L92 114 L116 114 L106 138 L152 92 L126 92 Z" fill="url(#logoGradShadow)" transform="translate(4,4)" />
          <path d="M138 62 L88 112 L114 112 L124 88 Z" fill="url(#logoGradTop)" />
          <path d="M114 112 L102 138 L152 88 L124 88 Z" fill="url(#logoGradMid)" />
          <path d="M138 62 L124 88 L114 88 Z" fill="#fef3c7" opacity="0.8" />
        </g>

        {/* Traces the bolt's own zigzag outline from its top tip down to its
            base, so the shape draws itself into being as it falls rather than
            just wiping into view. Its length (254) is the hexagon's true
            perimeter, so the dash offset lands exactly on the last vertex. */}
        <path
          key={`draw-${strikeId}`}
          d="M138 62 L88 112 L114 112 L102 138 L152 88 L124 88 Z"
          fill="none"
          stroke="#fff7e6"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="254"
          style={{ animation: "sparkThunderDraw 0.62s cubic-bezier(0.3, 0, 0.2, 1) both", filter: "drop-shadow(0 0 4px rgba(255, 230, 170, 0.9))" }}
        />

        {/* A bright leading edge that travels down with the fill, like the
            falling light forming the bolt rather than the bolt itself moving. */}
        <rect
          key={`drop-${strikeId}`}
          x="80"
          y="34"
          width="90"
          height="12"
          fill="url(#logoDropGlow)"
          style={{ animation: "sparkThunderDrop 0.62s ease-in both", mixBlendMode: "screen" }}
        />
      </g>
    </svg>
  );
}
