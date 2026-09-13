"use client";

import dynamic from "next/dynamic";

// Every component is split into its own chunk and only downloaded when a page
// actually renders it. Importing them statically put the whole library —
// three.js, matter-js, recharts, GSAP plugins — into every page that showed
// even one card.

const CassetteMenu = dynamic(() => import("./CassetteMenu"));
const CircularGallery = dynamic(() => import("./CircularGallery"));
const PortraitOrbit = dynamic(() => import("./PortraitOrbit"));
const ChromaCellGrid = dynamic(() => import("./ChromaCellGrid"));
const ListHoverCards = dynamic(() => import("./ListHoverCards"));
const GridRevealHero = dynamic(() => import("./GridRevealHero"));
const InlineHoverImage = dynamic(() => import("./InlineHoverImage"));
const SplitFlickerMenu = dynamic(() => import("./SplitFlickerMenu"));
const OrbitSlider = dynamic(() => import("./OrbitSlider"));
const AuroraLoginCard = dynamic(() => import("./AuroraLoginCard"));
const ExpandingRowGallery = dynamic(() => import("./ExpandingRowGallery"));
const UnravelStrokeReveal = dynamic(() => import("./UnravelStrokeReveal"));
const GooeyTextReveal = dynamic(() => import("./GooeyTextReveal"));
const CounterRevealHero = dynamic(() => import("./CounterRevealHero"));
const ConfettiReveal = dynamic(() => import("./ConfettiReveal"));
const PerpetualSlider = dynamic(() => import("./PerpetualSlider"));
const GridDeformVideo = dynamic(() => import("./GridDeformVideo"));
const AsciiHandFooter = dynamic(() => import("./AsciiHandFooter"));
const MagneticMarquee = dynamic(() => import("./MagneticMarquee"));
const ClipMaskPageTransition = dynamic(() => import("./ClipMaskPageTransition"));
const GridWipeTransition = dynamic(() => import("./GridWipeTransition"));
const StrokeDrawReveal = dynamic(() => import("./StrokeDrawReveal"));
const GridShutterTransition = dynamic(() => import("./GridShutterTransition"));
const DissolveImageReveal = dynamic(() => import("./DissolveImageReveal"));
const MosaicFlipHover = dynamic(() => import("./MosaicFlipHover"));
const LensZoomScroll = dynamic(() => import("./LensZoomScroll"));
const AccordionFrames = dynamic(() => import("./AccordionFrames"));
const MagneticCards = dynamic(() => import("./MagneticCards"));
const SteelworksReveal = dynamic(() => import("./SteelworksReveal"));
const ScrollTunnel = dynamic(() => import("./ScrollTunnel"));
const AsciiImageReveal = dynamic(() => import("./AsciiImageReveal"));
const PhysicsTagHover = dynamic(() => import("./PhysicsTagHover"));
const FluidCursor = dynamic(() => import("./FluidCursor"));
const AccessGateReveal = dynamic(() => import("./AccessGateReveal"));
const StickyFlipCards = dynamic(() => import("./StickyFlipCards"));
const StickyImageDeck = dynamic(() => import("./StickyImageDeck"));
const PhotoScatterGallery = dynamic(() => import("./PhotoScatterGallery"));
const ScribbleStrokeCards = dynamic(() => import("./ScribbleStrokeCards"));
const DraggablePillMenu = dynamic(() => import("./DraggablePillMenu"));
const PartingContactRows = dynamic(() => import("./PartingContactRows"));
const SpotlightProjectIndex = dynamic(() => import("./SpotlightProjectIndex"));
const DissolveWashHero = dynamic(() => import("./DissolveWashHero"));
const ParallaxMinimapScroll = dynamic(() => import("./ParallaxMinimapScroll"));
const SlidingRailMenu = dynamic(() => import("./SlidingRailMenu"));
const BlockSweepPageTransition = dynamic(() => import("./BlockSweepPageTransition"));
const PlayablePillDrop = dynamic(() => import("./PlayablePillDrop"));
const WordHighlightReveal = dynamic(() => import("./WordHighlightReveal"));
const CursorImageTrail = dynamic(() => import("./CursorImageTrail"));
const FluidParticleField = dynamic(() => import("./FluidParticleField"));
const OverlayMenu = dynamic(() => import("./OverlayMenu"));
const RippleSlider = dynamic(() => import("./RippleSlider"));
const SpiralImageGallery = dynamic(() => import("./SpiralImageGallery"));
const StrokePageTransition = dynamic(() => import("./StrokePageTransition"));
const ControlCenterEdit = dynamic(() => import("./ControlCenterEdit"));
const PhysicsDock = dynamic(() => import("./PhysicsDock"));
const CoverflowPlayer = dynamic(() => import("./CoverflowPlayer"));
const TipSplitter = dynamic(() => import("./TipSplitter"));
const RouteCovered = dynamic(() => import("./RouteCovered"));
const EvRangeWidgets = dynamic(() => import("./EvRangeWidgets"));
const MonoActivityHeatmap = dynamic(() => import("./mono-charts/MonoActivityHeatmap").then((m) => m.MonoActivityHeatmap));
const MonoRoundedLineChart = dynamic(() => import("./mono-charts/MonoRoundedLineChart").then((m) => m.MonoRoundedLineChart));
const MonoRoundedBarChart = dynamic(() => import("./mono-charts/MonoRoundedBarChart").then((m) => m.MonoRoundedBarChart));
const MonoRoundedAreaChart = dynamic(() => import("./mono-charts/MonoRoundedAreaChart").then((m) => m.MonoRoundedAreaChart));
const MonoRoundedDonutChart = dynamic(() => import("./mono-charts/MonoRoundedDonutChart").then((m) => m.MonoRoundedDonutChart));
const MonoRoundedComposedChart = dynamic(() => import("./mono-charts/MonoRoundedComposedChart").then((m) => m.MonoRoundedComposedChart));
const MonoRoundedScatterChart = dynamic(() => import("./mono-charts/MonoRoundedScatterChart").then((m) => m.MonoRoundedScatterChart));
const MonoRoundedCandlestickChart = dynamic(() => import("./mono-charts/MonoRoundedCandlestickChart").then((m) => m.MonoRoundedCandlestickChart));
const MonoRoundedKpiCardChart = dynamic(() => import("./mono-charts/MonoRoundedKpiCardChart").then((m) => m.MonoRoundedKpiCardChart));
const MonoRoundedPyramidChart = dynamic(() => import("./mono-charts/MonoRoundedPyramidChart").then((m) => m.MonoRoundedPyramidChart));
const MonoRoundedRadialBarGroup = dynamic(() => import("./mono-charts/MonoRoundedRadialBarGroup").then((m) => m.MonoRoundedRadialBarGroup));
const MonoRoundedGaugeArc = dynamic(() => import("./mono-charts/MonoRoundedGaugeArc").then((m) => m.MonoRoundedGaugeArc));
const MonoRoundedStepChart = dynamic(() => import("./mono-charts/MonoRoundedStepChart").then((m) => m.MonoRoundedStepChart));
const MonoRoundedStackedBarChart = dynamic(() => import("./mono-charts/MonoRoundedStackedBarChart").then((m) => m.MonoRoundedStackedBarChart));
const MonoRoundedRadarChart = dynamic(() => import("./mono-charts/MonoRoundedRadarChart").then((m) => m.MonoRoundedRadarChart));
const MonoRoundedRadialGaugeChart = dynamic(() => import("./mono-charts/MonoRoundedRadialGaugeChart").then((m) => m.MonoRoundedRadialGaugeChart));
const MonoRoundedFunnelChart = dynamic(() => import("./mono-charts/MonoRoundedFunnelChart").then((m) => m.MonoRoundedFunnelChart));
const MonoRoundedHeatmapChart = dynamic(() => import("./mono-charts/MonoRoundedHeatmapChart").then((m) => m.MonoRoundedHeatmapChart));
const MonoRoundedSparklineChart = dynamic(() => import("./mono-charts/MonoRoundedSparklineChart").then((m) => m.MonoRoundedSparklineChart));
const MonoRoundedBubbleChart = dynamic(() => import("./mono-charts/MonoRoundedBubbleChart").then((m) => m.MonoRoundedBubbleChart));
const MonoRoundedTreemapChart = dynamic(() => import("./mono-charts/MonoRoundedTreemapChart").then((m) => m.MonoRoundedTreemapChart));
const MonoRoundedStreamChart = dynamic(() => import("./mono-charts/MonoRoundedStreamChart").then((m) => m.MonoRoundedStreamChart));
const MonoRoundedMeterChart = dynamic(() => import("./mono-charts/MonoRoundedMeterChart").then((m) => m.MonoRoundedMeterChart));
const MonoRoundedWaterfallChart = dynamic(() => import("./mono-charts/MonoRoundedWaterfallChart").then((m) => m.MonoRoundedWaterfallChart));
const MonoRoundedPolarChart = dynamic(() => import("./mono-charts/MonoRoundedPolarChart").then((m) => m.MonoRoundedPolarChart));
const MonoRoundedRangeChart = dynamic(() => import("./mono-charts/MonoRoundedRangeChart").then((m) => m.MonoRoundedRangeChart));
const MagneticColumns = dynamic(() => import("./mono-charts/MagneticColumns").then((m) => m.MagneticColumns));
const RankRace = dynamic(() => import("./mono-charts/RankRace").then((m) => m.RankRace));
const HourDial = dynamic(() => import("./mono-charts/HourDial").then((m) => m.HourDial));
const FlowFunnel = dynamic(() => import("./mono-charts/FlowFunnel").then((m) => m.FlowFunnel));
const ClusterField = dynamic(() => import("./mono-charts/ClusterField").then((m) => m.ClusterField));
const LayerStack = dynamic(() => import("./mono-charts/LayerStack").then((m) => m.LayerStack));
const VelocityGauge = dynamic(() => import("./mono-charts/VelocityGauge").then((m) => m.VelocityGauge));
const RidgeLines = dynamic(() => import("./mono-charts/RidgeLines").then((m) => m.RidgeLines));
const DrillSunburst = dynamic(() => import("./mono-charts/DrillSunburst").then((m) => m.DrillSunburst));
const SplinePulse = dynamic(() => import("./mono-charts/SplinePulse").then((m) => m.SplinePulse));
const PulseRings = dynamic(() => import("./mono-charts/PulseRings").then((m) => m.PulseRings));
const LensRange = dynamic(() => import("./mono-charts/LensRange").then((m) => m.LensRange));
const DepthBook = dynamic(() => import("./mono-charts/DepthBook").then((m) => m.DepthBook));
const DotAllocation = dynamic(() => import("./mono-charts/DotAllocation").then((m) => m.DotAllocation));
const LiveSignal = dynamic(() => import("./mono-charts/LiveSignal").then((m) => m.LiveSignal));
const MirrorBars = dynamic(() => import("./mono-charts/MirrorBars").then((m) => m.MirrorBars));
const ShareStrip = dynamic(() => import("./mono-charts/ShareStrip").then((m) => m.ShareStrip));
const OrbitSegments = dynamic(() => import("./mono-charts/OrbitSegments").then((m) => m.OrbitSegments));
const LiquidTank = dynamic(() => import("./mono-charts/LiquidTank").then((m) => m.LiquidTank));
const ScrubTimeline = dynamic(() => import("./mono-charts/ScrubTimeline").then((m) => m.ScrubTimeline));
const PulseRadar = dynamic(() => import("./mono-charts/PulseRadar").then((m) => m.PulseRadar));
const RippleMatrix = dynamic(() => import("./mono-charts/RippleMatrix").then((m) => m.RippleMatrix));
const RankShuffle = dynamic(() => import("./mono-charts/RankShuffle").then((m) => m.RankShuffle));
const FlowStream = dynamic(() => import("./mono-charts/FlowStream").then((m) => m.FlowStream));
const TiltGlowPanel = dynamic(() => import("./mono-charts/TiltGlowPanel").then((m) => m.TiltGlowPanel));
const MorphViews = dynamic(() => import("./mono-charts/MorphViews").then((m) => m.MorphViews));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ORIGINAL_COMPONENTS: Record<string, React.ComponentType<any>> = {
  "cassette-menu": CassetteMenu,
  "circular-gallery": CircularGallery,
  "portrait-orbit": PortraitOrbit,
  "chroma-cell-grid": ChromaCellGrid,
  "list-hover-cards": ListHoverCards,
  "grid-reveal-hero": GridRevealHero,
  "inline-hover-image": InlineHoverImage,
  "split-flicker-menu": SplitFlickerMenu,
  "orbit-slider": OrbitSlider,
  "aurora-login-card": AuroraLoginCard,
  "expanding-row-gallery": ExpandingRowGallery,
  "unravel-stroke-reveal": UnravelStrokeReveal,
  "gooey-text-reveal": GooeyTextReveal,
  "counter-reveal-hero": CounterRevealHero,
  "confetti-reveal": ConfettiReveal,
  "perpetual-slider": PerpetualSlider,
  "grid-deform-video": GridDeformVideo,
  "ascii-hand-footer": AsciiHandFooter,
  "magnetic-marquee": MagneticMarquee,
  "clip-mask-page-transition": ClipMaskPageTransition,
  "grid-wipe-transition": GridWipeTransition,
  "stroke-draw-reveal": StrokeDrawReveal,
  "grid-shutter-transition": GridShutterTransition,
  "dissolve-image-reveal": DissolveImageReveal,
  "mosaic-flip-hover": MosaicFlipHover,
  "lens-zoom-scroll": LensZoomScroll,
  "accordion-frames": AccordionFrames,
  "magnetic-cards": MagneticCards,
  "steelworks-reveal": SteelworksReveal,
  "scroll-tunnel": ScrollTunnel,
  "ascii-image-reveal": AsciiImageReveal,
  "physics-tag-hover": PhysicsTagHover,
  "fluid-cursor": FluidCursor,
  "access-gate-reveal": AccessGateReveal,
  "sticky-flip-cards": StickyFlipCards,
  "sticky-image-deck": StickyImageDeck,
  "photo-scatter-gallery": PhotoScatterGallery,
  "scribble-stroke-cards": ScribbleStrokeCards,
  "draggable-pill-menu": DraggablePillMenu,
  "parting-contact-rows": PartingContactRows,
  "spotlight-project-index": SpotlightProjectIndex,
  "dissolve-wash-hero": DissolveWashHero,
  "parallax-minimap-scroll": ParallaxMinimapScroll,
  "sliding-rail-menu": SlidingRailMenu,
  "block-sweep-page-transition": BlockSweepPageTransition,
  "playable-pill-drop": PlayablePillDrop,
  "word-highlight-reveal": WordHighlightReveal,
  "cursor-image-trail": CursorImageTrail,
  "fluid-particle-field": FluidParticleField,
  "overlay-menu": OverlayMenu,
  "ripple-slider": RippleSlider,
  "spiral-image-gallery": SpiralImageGallery,
  "stroke-page-transition": StrokePageTransition,
  "control-center-edit": ControlCenterEdit,
  "physics-dock": PhysicsDock,
  "coverflow-player": CoverflowPlayer,
  "tip-splitter": TipSplitter,
  "route-covered": RouteCovered,
  "ev-range-widgets": EvRangeWidgets,
  "mono-activity-heatmap": MonoActivityHeatmap,
  "mono-rounded-spline-line": MonoRoundedLineChart,
  "mono-rounded-pill-pillars": MonoRoundedBarChart,
  "mono-curved-wave-area": MonoRoundedAreaChart,
  "mono-rounded-donut-ring": MonoRoundedDonutChart,
  "mono-hybrid-spline-bar": MonoRoundedComposedChart,
  "mono-scatter-matrix": MonoRoundedScatterChart,
  "mono-financial-candlesticks": MonoRoundedCandlestickChart,
  "mono-stat-kpi-card": MonoRoundedKpiCardChart,
  "mono-tier-pyramid-stack": MonoRoundedPyramidChart,
  "mono-radial-bar-group": MonoRoundedRadialBarGroup,
  "mono-speedometer-gauge-arc": MonoRoundedGaugeArc,
  "mono-step-progression": MonoRoundedStepChart,
  "mono-stacked-tones-bar": MonoRoundedStackedBarChart,
  "mono-polygon-web-radar": MonoRoundedRadarChart,
  "mono-concentric-radial-rings": MonoRoundedRadialGaugeChart,
  "mono-stage-funnel": MonoRoundedFunnelChart,
  "mono-dot-matrix-heatmap": MonoRoundedHeatmapChart,
  "mono-sparkline-telemetry": MonoRoundedSparklineChart,
  "mono-bubble-clusters": MonoRoundedBubbleChart,
  "mono-tile-treemap": MonoRoundedTreemapChart,
  "mono-fluid-stream-wave": MonoRoundedStreamChart,
  "mono-arc-meter-gauge": MonoRoundedMeterChart,
  "mono-waterfall-steps": MonoRoundedWaterfallChart,
  "mono-polar-radial-pillars": MonoRoundedPolarChart,
  "mono-range-band-area": MonoRoundedRangeChart,
  "magnetic-columns": MagneticColumns,
  "rank-race": RankRace,
  "hour-dial": HourDial,
  "flow-funnel": FlowFunnel,
  "cluster-field": ClusterField,
  "layer-stack": LayerStack,
  "velocity-gauge": VelocityGauge,
  "ridge-lines": RidgeLines,
  "drill-sunburst": DrillSunburst,
  "spline-pulse": SplinePulse,
  "pulse-rings": PulseRings,
  "lens-range": LensRange,
  "depth-book": DepthBook,
  "dot-allocation": DotAllocation,
  "live-signal": LiveSignal,
  "mirror-bars": MirrorBars,
  "share-strip": ShareStrip,
  "orbit-segments": OrbitSegments,
  "liquid-tank": LiquidTank,
  "scrub-timeline": ScrubTimeline,
  "pulse-radar": PulseRadar,
  "ripple-matrix": RippleMatrix,
  "rank-shuffle": RankShuffle,
  "flow-stream": FlowStream,
  "tilt-glow-panel": TiltGlowPanel,
  "morph-views": MorphViews,
};
