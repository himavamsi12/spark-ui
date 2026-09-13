"use client";

import { Trash2, Eye, EyeOff, Copy } from "lucide-react";
import { getPreset, presetDefaults } from "@/lib/dna/effects";
import KeyframePanel from "./KeyframePanel";
import type {
  AnimatableProperty,
  DnaProject,
  HeightMode,
  EffectInstance,
  EffectParamDef,
  Layer,
  ParamValue,
  ProjectSettings,
  SmoothScroll,
  SplitMode,
} from "@/lib/dna/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 py-1">
      <span className="w-[86px] shrink-0 text-[11px] text-muted truncate">{label}</span>
      <div className="flex-1 min-w-0 flex items-center gap-2">{children}</div>
    </label>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 min-w-0 accent-[var(--accent)] h-1"
      />
      <span className="w-[52px] shrink-0 text-right text-[11px] text-pearl tabular-nums">
        {Number.isInteger(value) ? value : value.toFixed(2)}
        {unit ?? ""}
      </span>
    </>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-0 bg-void border border-border rounded-medium px-2 py-1 text-[11px] text-pearl focus:outline-none focus:border-accent transition-colors"
    />
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <input
        type="color"
        value={value.startsWith("#") ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 shrink-0 rounded-small bg-transparent border border-border cursor-pointer"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-void border border-border rounded-medium px-2 py-1 text-[11px] font-mono text-pearl focus:outline-none focus:border-accent transition-colors"
      />
    </>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-0 bg-void border border-border rounded-medium px-1.5 py-1 text-[11px] text-pearl focus:outline-none focus:border-accent transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-8 h-4 rounded-full relative transition-colors shrink-0 ${
        value ? "bg-accent" : "bg-slate border border-border"
      }`}
    >
      <span
        className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${
          value ? "bg-void translate-x-4" : "bg-fog translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ParamField({
  def,
  value,
  onChange,
}: {
  def: EffectParamDef;
  value: ParamValue;
  onChange: (v: ParamValue) => void;
}) {
  if (def.type === "slider") {
    return (
      <Row label={def.label}>
        <Slider
          value={typeof value === "number" ? value : def.default}
          min={def.min}
          max={def.max}
          step={def.step}
          unit={def.unit}
          onChange={onChange}
        />
      </Row>
    );
  }
  if (def.type === "select") {
    return (
      <Row label={def.label}>
        <Select
          value={typeof value === "string" ? value : def.default}
          options={def.options}
          onChange={onChange}
        />
      </Row>
    );
  }
  if (def.type === "color") {
    return (
      <Row label={def.label}>
        <ColorInput value={typeof value === "string" ? value : def.default} onChange={onChange} />
      </Row>
    );
  }
  return (
    <Row label={def.label}>
      <Toggle value={typeof value === "boolean" ? value : def.default} onChange={onChange} />
    </Row>
  );
}

const SPLIT_OPTIONS: { value: SplitMode; label: string }[] = [
  { value: "none", label: "Whole element" },
  { value: "lines", label: "Lines" },
  { value: "words", label: "Words" },
  { value: "chars", label: "Characters" },
];

export default function Inspector({
  project,
  layer,
  effect,
  onLayerChange,
  onEffectChange,
  onEffectRemove,
  onEffectDuplicate,
  onSettingsChange,
  onSelectEffect,
  time,
  onSetKey,
  onClearProperty,
}: {
  project: DnaProject;
  layer: Layer | null;
  effect: EffectInstance | null;
  onLayerChange: (patch: Partial<Layer>) => void;
  onEffectChange: (id: string, patch: Partial<EffectInstance>) => void;
  onEffectRemove: (id: string) => void;
  onEffectDuplicate: (id: string) => void;
  onSettingsChange: (patch: Partial<ProjectSettings>) => void;
  onSelectEffect: (id: string | null) => void;
  /** Playhead position, so keys land where the user is looking. */
  time: number;
  onSetKey: (property: AnimatableProperty, value: number) => void;
  onClearProperty: (property: AnimatableProperty) => void;
}) {
  const preset = effect ? getPreset(effect.preset) : null;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto no-scrollbar">
      {/* ── Scene ────────────────────────────────────────────────── */}
      <section className="px-3 py-3 border-b border-border-soft">
        <h2 className="text-xs font-semibold tracking-wide text-chalk uppercase mb-2">Scene</h2>
        <Row label="Name">
          <TextInput value={project.settings.name} onChange={(v) => onSettingsChange({ name: v })} />
        </Row>
        <Row label="Background">
          <ColorInput
            value={project.settings.background}
            onChange={(v) => onSettingsChange({ background: v })}
          />
        </Row>
        <Row label="Duration">
          <Slider
            value={project.settings.duration}
            min={1}
            max={20}
            step={0.5}
            unit="s"
            onChange={(v) => onSettingsChange({ duration: v })}
          />
        </Row>
        <Row label="Section height">
          <Select
            value={project.settings.heightMode}
            options={[
              { value: "viewport", label: "Full viewport (100vh)" },
              { value: "fixed", label: "Fixed height" },
              { value: "auto", label: "Hug content" },
            ]}
            onChange={(v) => onSettingsChange({ heightMode: v as HeightMode })}
          />
        </Row>
        {project.settings.heightMode === "fixed" && (
          <Row label="Height">
            <Slider
              value={project.settings.heightPx}
              min={200}
              max={2000}
              step={20}
              unit="px"
              onChange={(v) => onSettingsChange({ heightPx: v })}
            />
          </Row>
        )}
        <Row label="Max width">
          <Slider
            value={project.settings.maxWidth}
            min={0}
            max={2000}
            step={20}
            unit={project.settings.maxWidth === 0 ? "" : "px"}
            onChange={(v) => onSettingsChange({ maxWidth: v })}
          />
        </Row>
        {project.settings.maxWidth === 0 && (
          <p className="text-[10px] text-muted leading-relaxed">Full-bleed — no max width.</p>
        )}
      </section>

      {/* ── Scroll ───────────────────────────────────────────────── */}
      <section className="px-3 py-3 border-b border-border-soft">
        <h2 className="text-xs font-semibold tracking-wide text-chalk uppercase mb-2">
          Scroll &amp; Smoothing
        </h2>
        <Row label="Smooth scroll">
          <Select
            value={project.settings.smoothScroll}
            options={[
              { value: "none", label: "None (native)" },
              { value: "lenis", label: "Lenis" },
              { value: "locomotive", label: "Locomotive" },
            ]}
            onChange={(v) => onSettingsChange({ smoothScroll: v as SmoothScroll })}
          />
        </Row>
        <Row label="ScrollTrigger">
          <Toggle
            value={project.settings.scrollTrigger}
            onChange={(v) => onSettingsChange({ scrollTrigger: v })}
          />
        </Row>
        {project.settings.scrollTrigger && (
          <>
            <Row label="Scrub">
              <Slider
                value={project.settings.scrub}
                min={0}
                max={3}
                step={0.1}
                unit="s"
                onChange={(v) => onSettingsChange({ scrub: v })}
              />
            </Row>
            <Row label="Pin section">
              <Toggle value={project.settings.pin} onChange={(v) => onSettingsChange({ pin: v })} />
            </Row>
            {project.settings.pin && (
              <Row label="Scroll length">
                <Slider
                  value={project.settings.scrollLength}
                  min={0.5}
                  max={8}
                  step={0.5}
                  unit="×vh"
                  onChange={(v) => onSettingsChange({ scrollLength: v })}
                />
              </Row>
            )}
            <Row label="Markers">
              <Toggle
                value={project.settings.markers}
                onChange={(v) => onSettingsChange({ markers: v })}
              />
            </Row>
          </>
        )}
        <p className="text-[10px] text-muted leading-relaxed mt-1.5">
          {project.settings.smoothScroll === "none"
            ? "Exports with native scrolling."
            : `Exported code wires ${project.settings.smoothScroll === "lenis" ? "Lenis" : "Locomotive Scroll"} into GSAP's ticker and syncs ScrollTrigger to it.`}
        </p>
      </section>

      {/* ── Layer ────────────────────────────────────────────────── */}
      {layer ? (
        <section className="px-3 py-3 border-b border-border-soft">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xs font-semibold tracking-wide text-chalk uppercase">Layer</h2>
            <span className="ml-auto text-[10px] text-muted uppercase">{layer.type}</span>
          </div>
          <Row label="Name">
            <TextInput value={layer.name} onChange={(v) => onLayerChange({ name: v })} />
          </Row>
          {layer.type !== "box" && (
            <Row label={layer.type === "text" ? "Text" : "Image URL"}>
              <TextInput value={layer.content} onChange={(v) => onLayerChange({ content: v })} />
            </Row>
          )}
          <Row label="X">
            <Slider value={layer.x} min={0} max={100} step={0.5} unit="%" onChange={(v) => onLayerChange({ x: v })} />
          </Row>
          <Row label="Y">
            <Slider value={layer.y} min={0} max={100} step={0.5} unit="%" onChange={(v) => onLayerChange({ y: v })} />
          </Row>
          {layer.type !== "text" && (
            <>
              <Row label="Width">
                <Slider value={layer.width} min={1} max={100} step={0.5} unit="%" onChange={(v) => onLayerChange({ width: v })} />
              </Row>
              <Row label="Height">
                <Slider value={layer.height} min={1} max={100} step={0.5} unit="%" onChange={(v) => onLayerChange({ height: v })} />
              </Row>
            </>
          )}
          {layer.type === "text" && (
            <>
              <Row label="Font size">
                <Slider value={layer.fontSize} min={10} max={220} step={1} unit="px" onChange={(v) => onLayerChange({ fontSize: v })} />
              </Row>
              <Row label="Weight">
                <Slider value={layer.fontWeight} min={100} max={900} step={100} onChange={(v) => onLayerChange({ fontWeight: v })} />
              </Row>
              <Row label="Tracking">
                <Slider value={layer.letterSpacing} min={-0.1} max={0.5} step={0.01} unit="em" onChange={(v) => onLayerChange({ letterSpacing: v })} />
              </Row>
            </>
          )}
          <Row label="Rotation">
            <Slider value={layer.rotation} min={-180} max={180} step={1} unit="°" onChange={(v) => onLayerChange({ rotation: v })} />
          </Row>
          <Row label="Opacity">
            <Slider value={layer.opacity} min={0} max={100} step={1} unit="%" onChange={(v) => onLayerChange({ opacity: v })} />
          </Row>
          <Row label={layer.type === "box" ? "Fill" : "Color"}>
            <ColorInput
              value={layer.type === "box" ? layer.background : layer.color}
              onChange={(v) => onLayerChange(layer.type === "box" ? { background: v } : { color: v })}
            />
          </Row>
          {layer.type !== "text" && (
            <Row label="Radius">
              <Slider value={layer.radius} min={0} max={200} step={1} unit="px" onChange={(v) => onLayerChange({ radius: v })} />
            </Row>
          )}
        </section>
      ) : (
        <section className="px-3 py-3 border-b border-border-soft">
          <p className="text-[11px] text-muted leading-relaxed">
            No layer selected. Add one from the toolbar, or click a layer on the stage.
          </p>
        </section>
      )}

      {layer && (
        <KeyframePanel
          layer={layer}
          time={time}
          onSetKey={onSetKey}
          onClearProperty={onClearProperty}
        />
      )}

      {/* ── Effect stack ─────────────────────────────────────────── */}
      {layer && (
        <section className="px-3 py-3">
          <h2 className="text-xs font-semibold tracking-wide text-chalk uppercase mb-2">
            Effects
            <span className="ml-2 text-[10px] text-muted normal-case tracking-normal">
              {layer.effects.length}
            </span>
          </h2>
          {layer.effects.length === 0 && (
            <p className="text-[11px] text-muted leading-relaxed">
              Pick an effect from the left panel to add it to this layer.
            </p>
          )}
          <div className="flex flex-col gap-1">
            {layer.effects.map((fx) => {
              const fxPreset = getPreset(fx.preset);
              const selected = effect?.id === fx.id;
              return (
                <button
                  key={fx.id}
                  onClick={() => onSelectEffect(selected ? null : fx.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-medium border text-left transition-colors ${
                    selected ? "border-accent bg-card" : "border-border hover:border-pearl/40"
                  }`}
                >
                  <span
                    className={`text-[11px] truncate ${fx.enabled ? "text-pearl" : "text-muted line-through"}`}
                  >
                    {fxPreset?.name ?? fx.preset}
                  </span>
                  <span className="ml-auto flex items-center gap-1 shrink-0">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEffectChange(fx.id, { enabled: !fx.enabled });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          onEffectChange(fx.id, { enabled: !fx.enabled });
                        }
                      }}
                      className="p-0.5 text-muted hover:text-chalk transition-colors"
                      title={fx.enabled ? "Mute effect" : "Unmute effect"}
                    >
                      {fx.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEffectDuplicate(fx.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          onEffectDuplicate(fx.id);
                        }
                      }}
                      className="p-0.5 text-muted hover:text-chalk transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={12} />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEffectRemove(fx.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          onEffectRemove(fx.id);
                        }
                      }}
                      className="p-0.5 text-muted hover:text-accent transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {effect && preset && (
            <div className="mt-3 pt-3 border-t border-border-soft">
              <div className="flex items-baseline gap-2 mb-1">
                <h3 className="text-[11px] font-semibold text-chalk">{preset.name}</h3>
                <span className="text-[9px] uppercase tracking-wide text-accent/80">
                  {preset.kind}
                </span>
              </div>
              <p className="text-[10px] text-muted leading-snug mb-2">{preset.blurb}</p>

              {preset.kind !== "pointer" && (
                <Row label="Start">
                  <Slider
                    value={effect.start}
                    min={0}
                    max={Math.max(project.settings.duration, 1)}
                    step={0.05}
                    unit="s"
                    onChange={(v) => onEffectChange(effect.id, { start: v })}
                  />
                </Row>
              )}
              {layer?.type === "text" && preset.kind !== "pointer" && (
                <Row label="Split by">
                  <Select
                    value={effect.split ?? preset.split ?? "none"}
                    options={SPLIT_OPTIONS}
                    onChange={(v) => onEffectChange(effect.id, { split: v as SplitMode })}
                  />
                </Row>
              )}
              {preset.params.map((def) => (
                <ParamField
                  key={def.key}
                  def={def}
                  value={effect.params[def.key] ?? presetDefaults(preset)[def.key]}
                  onChange={(v) =>
                    onEffectChange(effect.id, { params: { ...effect.params, [def.key]: v } })
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
