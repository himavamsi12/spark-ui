import type { Metadata } from "next";
import {
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Barlow_Condensed,
  Instrument_Sans,
  Instrument_Serif,
  DM_Sans,
  DM_Mono,
  DM_Serif_Display,
  Plus_Jakarta_Sans,
  Gasoek_One,
  Host_Grotesk,
  Nanum_Pen_Script,
} from "next/font/google";
import "./globals.css";

// --- Site chrome -----------------------------------------------------------
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const displayFont = Inter_Tight({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const commitMono = JetBrains_Mono({
  variable: "--font-commit-mono",
  subsets: ["latin"],
});

// --- Component typefaces ---------------------------------------------------
// Each of these is the typeface the original source used, so the previews and
// the code people copy out match what the animation was designed with.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const gasoekOne = Gasoek_One({
  variable: "--font-gasoek-one",
  subsets: ["latin"],
  weight: ["400"],
});

const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
});

const nanumPenScript = Nanum_Pen_Script({
  variable: "--font-nanum-pen-script",
  subsets: ["latin"],
  weight: ["400"],
});

const fontVars = [
  inter,
  displayFont,
  commitMono,
  barlowCondensed,
  instrumentSans,
  instrumentSerif,
  dmSans,
  dmMono,
  dmSerifDisplay,
  plusJakartaSans,
  gasoekOne,
  hostGrotesk,
  nanumPenScript,
]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  metadataBase: new URL("https://spark-ui-cyan.vercel.app"),
  title: "Spark UI | Free Animated component library for modern websites",
  description:
    "The largest free animated component library for building modern websites. Copy code, use in Framer, or connect through MCP.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`}>
      <head>
        {/* Site chrome typeface. Not on next/font/google, so loaded the same
            way individual components already pull in their own reference
            fonts elsewhere - a direct stylesheet link. */}
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text font-sans">{children}</body>
    </html>
  );
}
