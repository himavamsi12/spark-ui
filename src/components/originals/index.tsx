"use client";

import dynamic from "next/dynamic";

// Every component is split into its own chunk and only downloaded when a page
// actually renders it. Importing them statically put the whole library —
// three.js, matter-js, recharts, GSAP plugins — into every page that showed
// even one card.

const SpiralGallery = dynamic(() => import("./SpiralGallery"));
const AuroraLoginCard = dynamic(() => import("./AuroraLoginCard"));
const FallingImageTrail = dynamic(() => import("./FallingImageTrail"));
const MaskPageTransition = dynamic(() => import("./MaskPageTransition"));
const CounterLoaderHero = dynamic(() => import("./CounterLoaderHero"));
const InkRevealCursor = dynamic(() => import("./InkRevealCursor"));
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
  "spiral-gallery": SpiralGallery,
  "aurora-login-card": AuroraLoginCard,
  "falling-image-trail": FallingImageTrail,
  "mask-page-transition": MaskPageTransition,
  "counter-loader-hero": CounterLoaderHero,
  "ink-reveal-cursor": InkRevealCursor,
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

/**
 * Loaders for each component's code, without mounting it. The grid calls
 * these a screen ahead of a card so its chunk is already downloaded when the
 * card scrolls into view, instead of showing an empty box that pops in.
 */
export const ORIGINAL_LOADERS: Record<string, () => Promise<unknown>> = {
  "spiral-gallery": () => import("./SpiralGallery"),
  "aurora-login-card": () => import("./AuroraLoginCard"),
  "falling-image-trail": () => import("./FallingImageTrail"),
  "mask-page-transition": () => import("./MaskPageTransition"),
  "counter-loader-hero": () => import("./CounterLoaderHero"),
  "ink-reveal-cursor": () => import("./InkRevealCursor"),
  "control-center-edit": () => import("./ControlCenterEdit"),
  "physics-dock": () => import("./PhysicsDock"),
  "coverflow-player": () => import("./CoverflowPlayer"),
  "tip-splitter": () => import("./TipSplitter"),
  "route-covered": () => import("./RouteCovered"),
  "ev-range-widgets": () => import("./EvRangeWidgets"),
  "mono-activity-heatmap": () => import("./mono-charts/MonoActivityHeatmap"),
  "mono-rounded-spline-line": () => import("./mono-charts/MonoRoundedLineChart"),
  "mono-rounded-pill-pillars": () => import("./mono-charts/MonoRoundedBarChart"),
  "mono-curved-wave-area": () => import("./mono-charts/MonoRoundedAreaChart"),
  "mono-rounded-donut-ring": () => import("./mono-charts/MonoRoundedDonutChart"),
  "mono-hybrid-spline-bar": () => import("./mono-charts/MonoRoundedComposedChart"),
  "mono-scatter-matrix": () => import("./mono-charts/MonoRoundedScatterChart"),
  "mono-financial-candlesticks": () => import("./mono-charts/MonoRoundedCandlestickChart"),
  "mono-tier-pyramid-stack": () => import("./mono-charts/MonoRoundedPyramidChart"),
  "mono-radial-bar-group": () => import("./mono-charts/MonoRoundedRadialBarGroup"),
  "mono-speedometer-gauge-arc": () => import("./mono-charts/MonoRoundedGaugeArc"),
  "mono-step-progression": () => import("./mono-charts/MonoRoundedStepChart"),
  "mono-stacked-tones-bar": () => import("./mono-charts/MonoRoundedStackedBarChart"),
  "mono-polygon-web-radar": () => import("./mono-charts/MonoRoundedRadarChart"),
  "mono-concentric-radial-rings": () => import("./mono-charts/MonoRoundedRadialGaugeChart"),
  "mono-stage-funnel": () => import("./mono-charts/MonoRoundedFunnelChart"),
  "mono-dot-matrix-heatmap": () => import("./mono-charts/MonoRoundedHeatmapChart"),
  "mono-sparkline-telemetry": () => import("./mono-charts/MonoRoundedSparklineChart"),
  "mono-bubble-clusters": () => import("./mono-charts/MonoRoundedBubbleChart"),
  "mono-tile-treemap": () => import("./mono-charts/MonoRoundedTreemapChart"),
  "mono-fluid-stream-wave": () => import("./mono-charts/MonoRoundedStreamChart"),
  "mono-arc-meter-gauge": () => import("./mono-charts/MonoRoundedMeterChart"),
  "mono-waterfall-steps": () => import("./mono-charts/MonoRoundedWaterfallChart"),
  "mono-polar-radial-pillars": () => import("./mono-charts/MonoRoundedPolarChart"),
  "magnetic-columns": () => import("./mono-charts/MagneticColumns"),
  "rank-race": () => import("./mono-charts/RankRace"),
  "hour-dial": () => import("./mono-charts/HourDial"),
  "flow-funnel": () => import("./mono-charts/FlowFunnel"),
  "cluster-field": () => import("./mono-charts/ClusterField"),
  "layer-stack": () => import("./mono-charts/LayerStack"),
  "velocity-gauge": () => import("./mono-charts/VelocityGauge"),
  "ridge-lines": () => import("./mono-charts/RidgeLines"),
  "drill-sunburst": () => import("./mono-charts/DrillSunburst"),
  "spline-pulse": () => import("./mono-charts/SplinePulse"),
  "pulse-rings": () => import("./mono-charts/PulseRings"),
  "lens-range": () => import("./mono-charts/LensRange"),
  "depth-book": () => import("./mono-charts/DepthBook"),
  "dot-allocation": () => import("./mono-charts/DotAllocation"),
  "live-signal": () => import("./mono-charts/LiveSignal"),
  "mirror-bars": () => import("./mono-charts/MirrorBars"),
  "share-strip": () => import("./mono-charts/ShareStrip"),
  "orbit-segments": () => import("./mono-charts/OrbitSegments"),
  "liquid-tank": () => import("./mono-charts/LiquidTank"),
  "scrub-timeline": () => import("./mono-charts/ScrubTimeline"),
  "pulse-radar": () => import("./mono-charts/PulseRadar"),
  "ripple-matrix": () => import("./mono-charts/RippleMatrix"),
  "rank-shuffle": () => import("./mono-charts/RankShuffle"),
  "flow-stream": () => import("./mono-charts/FlowStream"),
  "tilt-glow-panel": () => import("./mono-charts/TiltGlowPanel"),
  "morph-views": () => import("./mono-charts/MorphViews"),
};
