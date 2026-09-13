"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  MousePointer2,
  Search,
  Sparkles,
  Type,
  Waves,
  Zap,
  LogOut,
  RotateCw,
  Boxes,
} from "lucide-react";
import EffectThumb from "./EffectThumb";
import { EFFECT_CATEGORIES, EFFECT_PRESETS } from "@/lib/dna/effects";
import type { EffectCategory, EffectPreset } from "@/lib/dna/types";

const CATEGORY_ICON: Record<EffectCategory, React.ElementType> = {
  Entrance: ArrowDownToLine,
  Text: Type,
  Scroll: Waves,
  Inertia: RotateCw,
  Physics: Boxes,
  Pointer: MousePointer2,
  Emphasis: Zap,
  Exit: LogOut,
};

export default function EffectLibrary({
  onAdd,
  disabled,
}: {
  onAdd: (preset: EffectPreset) => void;
  /** No layer selected — effects have nothing to attach to. */
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<EffectCategory | null>("Entrance");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EFFECT_CATEGORIES.map((category) => ({
      category,
      presets: EFFECT_PRESETS.filter(
        (p) =>
          p.category === category &&
          (!q || p.name.toLowerCase().includes(q) || p.blurb.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.presets.length > 0);
  }, [query]);

  // Searching should surface matches wherever they are, not make you open
  // each category to find them.
  const searching = query.trim().length > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Sparkles size={13} className="text-accent" />
          <h2 className="text-xs font-semibold tracking-wide text-chalk uppercase">Effects</h2>
          <span className="ml-auto text-[10px] text-muted tabular-nums">
            {EFFECT_PRESETS.length}
          </span>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search effects…"
            className="w-full bg-void border border-border rounded-medium pl-8 pr-2 py-1.5 text-xs placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-2 pb-3">
        {disabled && (
          <p className="text-[11px] text-muted px-1.5 py-2 leading-relaxed">
            Select a layer on the stage to attach effects to it.
          </p>
        )}
        {groups.map(({ category, presets }) => {
          const Icon = CATEGORY_ICON[category];
          const open = searching || openCategory === category;
          return (
            <div key={category} className="mb-1">
              <button
                onClick={() => setOpenCategory(open && !searching ? null : category)}
                className="w-full flex items-center gap-2 px-1.5 py-1.5 text-[11px] font-medium text-muted hover:text-pearl transition-colors"
              >
                <Icon size={12} />
                <span className="uppercase tracking-wide">{category}</span>
                <span className="ml-auto tabular-nums text-[10px]">{presets.length}</span>
              </button>
              {open && (
                <div className="grid grid-cols-2 gap-2 px-1 pb-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => onAdd(preset)}
                      disabled={disabled}
                      title={preset.blurb}
                      className="group text-left disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <EffectThumb preset={preset} active={false} />
                      <span className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] text-pearl group-hover:text-chalk transition-colors truncate">
                          {preset.name}
                        </span>
                        {preset.kind !== "tween" && (
                          <span className="w-1 h-1 rounded-full bg-accent/70 shrink-0" />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {groups.length === 0 && (
          <p className="text-[11px] text-muted px-1.5 py-3">No effects match &ldquo;{query}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}
