"use client";

import { Plus, Trash2, Zap } from "lucide-react";
import {
  createInput,
  createListener,
  createState,
  createTransition,
  describeCondition,
  type Condition,
  type ConditionOp,
  type InputType,
  type ListenerAction,
  type ListenerEvent,
  type MachineInput,
  type MachineListener,
  type MachineState,
  type StateMachine,
  type Transition,
} from "@/lib/dna/machine";
import { nextId, type Layer } from "@/lib/dna/types";

const CONDITION_OPS: { value: ConditionOp; label: string }[] = [
  { value: "true", label: "is true" },
  { value: "false", label: "is false" },
  { value: "fired", label: "fired" },
  { value: "eq", label: "==" },
  { value: "neq", label: "!=" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
];

const EVENTS: { value: ListenerEvent; label: string }[] = [
  { value: "hover", label: "Pointer enter" },
  { value: "unhover", label: "Pointer leave" },
  { value: "click", label: "Click" },
  { value: "press", label: "Press" },
  { value: "release", label: "Release" },
];

const ACTIONS: { value: ListenerAction; label: string }[] = [
  { value: "setTrue", label: "set true" },
  { value: "setFalse", label: "set false" },
  { value: "toggle", label: "toggle" },
  { value: "fire", label: "fire" },
  { value: "setValue", label: "set value" },
];

function Field({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1.5 py-0.5">{children}</div>;
}

const inputCls =
  "min-w-0 bg-void border border-border rounded-medium px-1.5 py-1 text-[11px] text-pearl focus:outline-none focus:border-accent transition-colors";

function Num({
  value,
  onChange,
  step = 0.1,
  width = "w-14",
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  width?: string;
}) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`${inputCls} ${width} tabular-nums`}
    />
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-medium p-2 mb-1.5 bg-void/40">{children}</div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[10px] text-muted hover:text-chalk transition-colors"
    >
      <Plus size={11} />
      {label}
    </button>
  );
}

function Remove({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 p-0.5 text-muted hover:text-accent transition-colors"
    >
      <Trash2 size={11} />
    </button>
  );
}

/**
 * Structured editor for the state machine. Rive draws this as a node graph;
 * a grouped list carries the same information without a canvas to learn, and
 * every row maps one-to-one onto what codegen prints.
 */
export default function StateMachinePanel({
  machine,
  layers,
  duration,
  activeStateId,
  onChange,
}: {
  machine: StateMachine;
  layers: Layer[];
  duration: number;
  /** Highlighted live while the preview machine runs. */
  activeStateId: string | null;
  onChange: (patch: Partial<StateMachine>) => void;
}) {
  const stateName = (id: string) =>
    id === "any" ? "Any state" : (machine.states.find((s) => s.id === id)?.name ?? "—");

  function patchState(id: string, patch: Partial<MachineState>) {
    onChange({ states: machine.states.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }
  function patchTransition(id: string, patch: Partial<Transition>) {
    onChange({
      transitions: machine.transitions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  }
  function patchInput(id: string, patch: Partial<MachineInput>) {
    onChange({ inputs: machine.inputs.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  }
  function patchListener(id: string, patch: Partial<MachineListener>) {
    onChange({
      listeners: machine.listeners.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto no-scrollbar">
      <section className="px-3 py-3 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-accent" />
          <h2 className="text-xs font-semibold tracking-wide text-chalk uppercase">
            State Machine
          </h2>
          <button
            onClick={() => onChange({ enabled: !machine.enabled })}
            className={`ml-auto w-8 h-4 rounded-full relative transition-colors shrink-0 ${
              machine.enabled ? "bg-accent" : "bg-slate border border-border"
            }`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${
                machine.enabled ? "bg-void translate-x-4" : "bg-fog translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <p className="text-[10px] text-muted leading-snug mt-1.5">
          {machine.enabled
            ? "The machine drives the playhead — states play slices of the timeline, and transitions move between them."
            : "Off: the timeline plays straight through."}
        </p>
      </section>

      {/* ── Inputs ───────────────────────────────────────────────── */}
      <section className="px-3 py-3 border-b border-border-soft">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-[11px] font-semibold text-chalk">Inputs</h3>
          <span className="ml-auto">
            <AddButton
              label="Add"
              onClick={() =>
                onChange({
                  inputs: [...machine.inputs, createInput(`input${machine.inputs.length + 1}`, "boolean")],
                })
              }
            />
          </span>
        </div>
        {machine.inputs.length === 0 && (
          <p className="text-[10px] text-muted">Inputs are what listeners set and conditions read.</p>
        )}
        {machine.inputs.map((input) => (
          <Field key={input.id}>
            <input
              value={input.name}
              onChange={(e) => patchInput(input.id, { name: e.target.value })}
              className={`${inputCls} flex-1`}
            />
            <select
              value={input.type}
              onChange={(e) => patchInput(input.id, { type: e.target.value as InputType })}
              className={`${inputCls} w-[74px]`}
            >
              <option value="boolean">boolean</option>
              <option value="number">number</option>
              <option value="trigger">trigger</option>
            </select>
            <Remove
              onClick={() =>
                onChange({ inputs: machine.inputs.filter((i) => i.id !== input.id) })
              }
            />
          </Field>
        ))}
      </section>

      {/* ── States ───────────────────────────────────────────────── */}
      <section className="px-3 py-3 border-b border-border-soft">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-[11px] font-semibold text-chalk">States</h3>
          <span className="ml-auto">
            <AddButton
              label="Add"
              onClick={() => {
                const st = createState(`State ${machine.states.length + 1}`, 0, duration);
                onChange({
                  states: [...machine.states, st],
                  initial: machine.initial || st.id,
                });
              }}
            />
          </span>
        </div>
        {machine.states.length === 0 && (
          <p className="text-[10px] text-muted">A state is a named slice of the timeline.</p>
        )}
        {machine.states.map((st) => (
          <Card key={st.id}>
            <Field>
              <input
                value={st.name}
                onChange={(e) => patchState(st.id, { name: e.target.value })}
                className={`${inputCls} flex-1`}
              />
              {activeStateId === st.id && (
                <span className="text-[9px] uppercase tracking-wide text-accent shrink-0">live</span>
              )}
              <Remove
                onClick={() =>
                  onChange({
                    states: machine.states.filter((s) => s.id !== st.id),
                    transitions: machine.transitions.filter(
                      (t) => t.from !== st.id && t.to !== st.id,
                    ),
                  })
                }
              />
            </Field>
            <Field>
              <span className="text-[10px] text-muted w-8">from</span>
              <Num value={st.from} onChange={(v) => patchState(st.id, { from: v })} />
              <span className="text-[10px] text-muted w-5">to</span>
              <Num value={st.to} onChange={(v) => patchState(st.id, { to: v })} />
              <label className="flex items-center gap-1 text-[10px] text-muted ml-auto">
                <input
                  type="checkbox"
                  checked={st.loop}
                  onChange={(e) => patchState(st.id, { loop: e.target.checked })}
                  className="accent-[var(--accent)]"
                />
                loop
              </label>
            </Field>
            <Field>
              <label className="flex items-center gap-1 text-[10px] text-muted">
                <input
                  type="radio"
                  checked={machine.initial === st.id}
                  onChange={() => onChange({ initial: st.id })}
                  className="accent-[var(--accent)]"
                />
                start here
              </label>
            </Field>
          </Card>
        ))}
      </section>

      {/* ── Transitions ──────────────────────────────────────────── */}
      <section className="px-3 py-3 border-b border-border-soft">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-[11px] font-semibold text-chalk">Transitions</h3>
          <span className="ml-auto">
            <AddButton
              label="Add"
              onClick={() => {
                if (machine.states.length < 1) return;
                onChange({
                  transitions: [
                    ...machine.transitions,
                    createTransition(machine.states[0].id, machine.states[machine.states.length - 1].id),
                  ],
                });
              }}
            />
          </span>
        </div>
        {machine.transitions.map((t) => (
          <Card key={t.id}>
            <Field>
              <select
                value={t.from}
                onChange={(e) => patchTransition(t.id, { from: e.target.value })}
                className={`${inputCls} flex-1`}
              >
                <option value="any">Any state</option>
                {machine.states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-muted shrink-0">→</span>
              <select
                value={t.to}
                onChange={(e) => patchTransition(t.id, { to: e.target.value })}
                className={`${inputCls} flex-1`}
              >
                {machine.states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Remove
                onClick={() =>
                  onChange({ transitions: machine.transitions.filter((x) => x.id !== t.id) })
                }
              />
            </Field>
            <Field>
              <span className="text-[10px] text-muted w-[52px]">fade</span>
              <Num value={t.duration} onChange={(v) => patchTransition(t.id, { duration: v })} />
              <label className="flex items-center gap-1 text-[10px] text-muted ml-2">
                <input
                  type="checkbox"
                  checked={t.exitTime !== null}
                  onChange={(e) => patchTransition(t.id, { exitTime: e.target.checked ? 1 : null })}
                  className="accent-[var(--accent)]"
                />
                exit time
              </label>
              {t.exitTime !== null && (
                <Num
                  value={t.exitTime}
                  step={0.05}
                  onChange={(v) => patchTransition(t.id, { exitTime: Math.min(1, Math.max(0, v)) })}
                />
              )}
            </Field>

            {t.conditions.map((c) => (
              <Field key={c.id}>
                <select
                  value={c.input}
                  onChange={(e) =>
                    patchTransition(t.id, {
                      conditions: t.conditions.map((x) =>
                        x.id === c.id ? { ...x, input: e.target.value } : x,
                      ),
                    })
                  }
                  className={`${inputCls} flex-1`}
                >
                  {machine.inputs.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <select
                  value={c.op}
                  onChange={(e) =>
                    patchTransition(t.id, {
                      conditions: t.conditions.map((x) =>
                        x.id === c.id ? { ...x, op: e.target.value as ConditionOp } : x,
                      ),
                    })
                  }
                  className={`${inputCls} w-[64px]`}
                >
                  {CONDITION_OPS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {!["true", "false", "fired"].includes(c.op) && (
                  <Num
                    value={c.value}
                    step={1}
                    onChange={(v) =>
                      patchTransition(t.id, {
                        conditions: t.conditions.map((x) =>
                          x.id === c.id ? { ...x, value: v } : x,
                        ),
                      })
                    }
                  />
                )}
                <Remove
                  onClick={() =>
                    patchTransition(t.id, {
                      conditions: t.conditions.filter((x) => x.id !== c.id),
                    })
                  }
                />
              </Field>
            ))}

            <div className="flex items-center gap-2 mt-0.5">
              <AddButton
                label="Condition"
                onClick={() => {
                  if (!machine.inputs.length) return;
                  const cond: Condition = {
                    id: nextId("cond"),
                    input: machine.inputs[0].id,
                    op: "true",
                    value: 1,
                  };
                  patchTransition(t.id, { conditions: [...t.conditions, cond] });
                }}
              />
              <span className="ml-auto text-[9px] text-muted truncate">
                {t.conditions.length
                  ? t.conditions.map((c) => describeCondition(c, machine.inputs)).join(" and ")
                  : t.exitTime !== null
                    ? `after ${Math.round(t.exitTime * 100)}%`
                    : "fires immediately"}
              </span>
            </div>
          </Card>
        ))}
        {machine.transitions.length === 0 && (
          <p className="text-[10px] text-muted">
            Transitions move between states once their conditions pass.
          </p>
        )}
      </section>

      {/* ── Listeners ────────────────────────────────────────────── */}
      <section className="px-3 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-[11px] font-semibold text-chalk">Listeners</h3>
          <span className="ml-auto">
            <AddButton
              label="Add"
              onClick={() => {
                if (!layers.length || !machine.inputs.length) return;
                onChange({
                  listeners: [
                    ...machine.listeners,
                    createListener(layers[0].id, machine.inputs[0].id),
                  ],
                });
              }}
            />
          </span>
        </div>
        {machine.listeners.length === 0 && (
          <p className="text-[10px] text-muted">
            Listeners turn pointer events on a layer into input changes.
          </p>
        )}
        {machine.listeners.map((l) => (
          <Card key={l.id}>
            <Field>
              <select
                value={l.layerId}
                onChange={(e) => patchListener(l.id, { layerId: e.target.value })}
                className={`${inputCls} flex-1`}
              >
                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
              <Remove
                onClick={() =>
                  onChange({ listeners: machine.listeners.filter((x) => x.id !== l.id) })
                }
              />
            </Field>
            <Field>
              <select
                value={l.event}
                onChange={(e) => patchListener(l.id, { event: e.target.value as ListenerEvent })}
                className={`${inputCls} flex-1`}
              >
                {EVENTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={l.action}
                onChange={(e) => patchListener(l.id, { action: e.target.value as ListenerAction })}
                className={`${inputCls} w-[84px]`}
              >
                {ACTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <select
                value={l.input}
                onChange={(e) => patchListener(l.id, { input: e.target.value })}
                className={`${inputCls} flex-1`}
              >
                {machine.inputs.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              {l.action === "setValue" && (
                <Num value={l.value} step={1} onChange={(v) => patchListener(l.id, { value: v })} />
              )}
            </Field>
            <p className="text-[9px] text-muted mt-0.5 truncate">
              {stateName("")}
              {EVENTS.find((e) => e.value === l.event)?.label} →{" "}
              {ACTIONS.find((a) => a.value === l.action)?.label}{" "}
              {machine.inputs.find((i) => i.id === l.input)?.name}
            </p>
          </Card>
        ))}
      </section>
    </div>
  );
}
