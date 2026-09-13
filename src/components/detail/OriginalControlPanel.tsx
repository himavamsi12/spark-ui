"use client";

import { useRef } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { FONT_OPTIONS, type ControlDef } from "@/lib/controls";
import type { Params, ParamValue } from "@/lib/effects";

// Reads a picked file as a data: URL so the preview updates immediately without
// needing an upload endpoint. The value is a normal src, so it also works when
// the user pastes a remote URL instead.
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ImageSlot({
  src,
  onPick,
  onClear,
}: {
  src: string;
  onPick: (dataUrl: string) => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative group/slot shrink-0">
      <button
        onClick={() => inputRef.current?.click()}
        className="w-10 h-10 rounded-small border border-border-soft overflow-hidden bg-panel flex items-center justify-center hover:border-accent transition-colors"
        title="Replace image"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus size={14} className="text-muted" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) onPick(await readAsDataUrl(file));
          e.target.value = "";
        }}
      />
      {onClear && (
        <button
          onClick={onClear}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-void border border-border text-muted text-[10px] leading-none opacity-0 group-hover/slot:opacity-100 transition-opacity"
          title="Remove"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function OriginalControlPanel({
  schema,
  values,
  onChange,
}: {
  schema: ControlDef[];
  values: Params;
  onChange: (key: string, value: ParamValue) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {schema.map((c) => (
        <div
          key={c.key}
          className={
            c.type === "imageList" || c.type === "textList" || (c.type === "text" && c.multiline)
              ? "sm:col-span-2 lg:col-span-3"
              : undefined
          }
        >
          {c.type === "slider" && (() => {
            const value = Number(values[c.key] ?? c.default);
            const pct = Math.max(0, Math.min(100, ((value - c.min) / (c.max - c.min)) * 100));
            return (
              <div className="relative h-10 rounded-medium border border-border bg-card overflow-hidden">
                {/* Label and value bookend the ticks so nothing collides. The
                    fill and thumb below are nested inside the ticks' own
                    flex-1 region (not the outer box), so their percentage
                    math is relative to the track's real, already-shrunk
                    width — a long label can never push the thumb underneath
                    its own text, whatever the current value is. */}
                <div className="relative h-full flex items-center gap-2 px-3 pointer-events-none">
                  <span className="text-sm text-pearl shrink-0 truncate max-w-[45%]">{c.label}</span>
                  <div className="relative flex-1 min-w-0 h-full flex items-center justify-between px-1">
                    {/* Filled portion grows to the current value. */}
                    <div
                      className="absolute inset-y-0 left-0 bg-slate pointer-events-none"
                      style={{ width: `${pct}%` }}
                    />
                    {Array.from({ length: 7 }).map((_, i) => (
                      <span key={i} className="relative w-px h-1.5 bg-pearl/20" />
                    ))}
                    {/* Thumb sits at the fill edge, inset so it stays inside at both ends. */}
                    <span
                      className="absolute top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-full bg-chalk pointer-events-none"
                      style={{ left: `calc(${pct}% - ${(pct / 100) * 3}px)` }}
                    />
                  </div>
                  <span className="text-sm text-chalk shrink-0 tabular-nums">{value}</span>
                </div>
                <input
                  type="range"
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={value}
                  onChange={(e) => onChange(c.key, parseFloat(e.target.value))}
                  aria-label={c.label}
                  className="scrubber absolute inset-0 w-full h-full"
                />
              </div>
            );
          })()}

          {c.type === "color" && (
            <div className="h-10 flex items-center gap-2 bg-card border border-border rounded-medium px-3">
              <span className="text-sm text-pearl flex-1 truncate">{c.label}</span>
              <input
                type="color"
                aria-label={c.label}
                value={String(values[c.key] ?? c.default)}
                onChange={(e) => onChange(c.key, e.target.value)}
                className="swatch w-6 h-6 shrink-0"
              />
              <input
                type="text"
                spellCheck={false}
                value={String(values[c.key] ?? c.default)}
                onChange={(e) => onChange(c.key, e.target.value)}
                className="w-[76px] bg-panel border border-border-soft rounded-small px-1.5 py-1 text-xs text-pearl font-mono focus:outline-none focus:border-accent shrink-0"
              />
            </div>
          )}

          {c.type === "select" && (
            <div className="h-10 flex items-center gap-2 bg-card border border-border rounded-medium px-3">
              <span className="text-sm text-pearl shrink-0">{c.label}</span>
              <select
                value={String(values[c.key] ?? c.default)}
                onChange={(e) => onChange(c.key, e.target.value)}
                className="flex-1 bg-transparent text-sm text-pearl focus:outline-none min-w-0 text-right"
              >
                {c.options.map((o) => (
                  <option key={o.value} value={o.value} className="bg-panel text-left">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {c.type === "text" && !c.multiline && (
            <div className="h-10 flex items-center gap-2 bg-card border border-border rounded-medium px-3">
              <span className="text-sm text-pearl shrink-0">{c.label}</span>
              <input
                type="text"
                spellCheck={false}
                placeholder={c.placeholder}
                value={String(values[c.key] ?? c.default)}
                onChange={(e) => onChange(c.key, e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm text-chalk text-right focus:outline-none placeholder:text-muted"
              />
            </div>
          )}

          {c.type === "text" && c.multiline && (
            <div className="bg-card border border-border rounded-medium px-3 py-2">
              <span className="text-sm text-pearl">{c.label}</span>
              <textarea
                spellCheck={false}
                rows={2}
                placeholder={c.placeholder}
                value={String(values[c.key] ?? c.default)}
                onChange={(e) => onChange(c.key, e.target.value)}
                className="mt-1 w-full bg-transparent text-sm text-chalk resize-y focus:outline-none placeholder:text-muted"
              />
            </div>
          )}

          {c.type === "image" && (
            <div className="h-10 flex items-center gap-2 bg-card border border-border rounded-medium px-3">
              <span className="text-sm text-pearl flex-1 truncate">{c.label}</span>
              <input
                type="text"
                spellCheck={false}
                placeholder="/path or https://…"
                value={String(values[c.key] ?? c.default).startsWith("data:") ? "uploaded image" : String(values[c.key] ?? c.default)}
                onChange={(e) => onChange(c.key, e.target.value)}
                className="w-[110px] bg-panel border border-border-soft rounded-small px-1.5 py-1 text-xs text-pearl font-mono focus:outline-none focus:border-accent shrink-0"
              />
              <ImageSlot src={String(values[c.key] ?? c.default)} onPick={(url) => onChange(c.key, url)} />
            </div>
          )}

          {c.type === "imageList" && (
            <div className="bg-card border border-border rounded-medium px-3 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-pearl">{c.label}</span>
                <span className="text-xs text-muted">
                  {(Array.isArray(values[c.key]) ? (values[c.key] as string[]) : c.default).length} images
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(values[c.key]) ? (values[c.key] as string[]) : c.default).map((src, i) => {
                  const list = Array.isArray(values[c.key]) ? (values[c.key] as string[]) : c.default;
                  return (
                    <ImageSlot
                      key={i}
                      src={src}
                      onPick={(url) => {
                        const next = [...list];
                        next[i] = url;
                        onChange(c.key, next);
                      }}
                      onClear={
                        list.length > 1
                          ? () => onChange(c.key, list.filter((_, idx) => idx !== i))
                          : undefined
                      }
                    />
                  );
                })}
                {(() => {
                  const list = Array.isArray(values[c.key]) ? (values[c.key] as string[]) : c.default;
                  if (c.max !== undefined && list.length >= c.max) return null;
                  return (
                    <ImageSlot src="" onPick={(url) => onChange(c.key, [...list, url])} />
                  );
                })()}
              </div>
            </div>
          )}

          {c.type === "textList" && (() => {
            const list = Array.isArray(values[c.key]) ? (values[c.key] as string[]) : c.default;
            return (
              <div className="bg-card border border-border rounded-medium px-3 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-pearl">{c.label}</span>
                  <span className="text-xs text-muted">{list.length} items</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {list.map((val, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        spellCheck={false}
                        value={val}
                        onChange={(e) => {
                          const next = [...list];
                          next[i] = e.target.value;
                          onChange(c.key, next);
                        }}
                        className="flex-1 min-w-0 h-8 bg-panel border border-border-soft rounded-small px-2 text-xs text-pearl focus:outline-none focus:border-accent"
                      />
                      {list.length > 1 && (
                        <button
                          onClick={() => onChange(c.key, list.filter((_, idx) => idx !== i))}
                          className="w-8 h-8 shrink-0 rounded-small border border-border-soft text-muted hover:text-pearl hover:border-pearl/40 flex items-center justify-center"
                          title="Remove"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(c.max === undefined || list.length < c.max) && (
                    <button
                      onClick={() => onChange(c.key, [...list, ""])}
                      className="flex items-center justify-center gap-1 h-8 rounded-small border border-dashed border-border-soft text-xs text-muted hover:text-pearl hover:border-pearl/40"
                    >
                      <Plus size={12} />
                      Add
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {c.type === "font" && (
            <div className="h-10 flex items-center gap-2 bg-card border border-border rounded-medium px-3">
              <span className="text-sm text-pearl shrink-0">{c.label}</span>
              <select
                value={String(values[c.key] ?? c.default)}
                onChange={(e) => onChange(c.key, e.target.value)}
                className="flex-1 bg-transparent text-sm text-pearl focus:outline-none min-w-0 text-right"
                style={{ fontFamily: String(values[c.key] ?? c.default) }}
              >
                {FONT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-panel text-left" style={{ fontFamily: o.value }}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {c.type === "fontScale" && (() => {
            const value = Number(values[c.key] ?? c.default);
            const pct = Math.max(0, Math.min(100, ((value - c.min) / (c.max - c.min)) * 100));
            return (
              <div className="relative h-10 rounded-medium border border-border bg-card overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-slate pointer-events-none" style={{ width: `${pct}%` }} />
                <div className="relative h-full flex items-center gap-2 px-3 pointer-events-none">
                  <span className="text-sm text-pearl shrink-0 truncate max-w-[55%]">{c.label}</span>
                  <div className="flex-1 min-w-0 flex items-center justify-between px-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <span key={i} className="w-px h-1.5 bg-pearl/20" />
                    ))}
                  </div>
                  <span className="text-sm text-chalk shrink-0 tabular-nums">{value}%</span>
                </div>
                <span
                  className="absolute top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-full bg-chalk pointer-events-none"
                  style={{ left: `calc(${pct}% - ${(pct / 100) * 3}px)` }}
                />
                <input
                  type="range"
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={value}
                  onChange={(e) => onChange(c.key, parseFloat(e.target.value))}
                  aria-label={c.label}
                  className="scrubber absolute inset-0 w-full h-full"
                />
              </div>
            );
          })()}

          {c.type === "toggle" && (
            <div className="h-10 flex items-center gap-2 bg-card border border-border rounded-medium px-3">
              <span className="text-sm text-pearl flex-1 truncate">{c.label}</span>
              <button
                onClick={() => onChange(c.key, !(values[c.key] ?? c.default))}
                className={`w-9 h-5 rounded-full relative overflow-hidden transition-colors shrink-0 ${
                  values[c.key] ?? c.default ? "bg-chalk" : "bg-panel border border-border"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full transition-transform ${
                    values[c.key] ?? c.default ? "bg-void translate-x-4" : "bg-fog translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
