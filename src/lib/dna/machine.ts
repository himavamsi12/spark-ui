/**
 * State machines — the interactive layer over the timeline.
 *
 * Modelled on Rive's: a state is a named slice of the master timeline, a
 * transition moves between states once its conditions pass, and conditions read
 * inputs that listeners set from pointer events. That combination is what turns
 * a linear composition into something that reacts.
 *
 * The runtime here is deliberately framework-free — it only needs something it
 * can `seek` and `play` — so the studio preview and the exported component run
 * the exact same logic rather than two implementations that drift.
 */

import { nextId } from "./types";

export type InputType = "boolean" | "number" | "trigger";

export type MachineInput = {
  id: string;
  name: string;
  type: InputType;
  /** Booleans start false, numbers start here, triggers are always momentary. */
  value: number;
};

export type MachineState = {
  id: string;
  name: string;
  /** The slice of the master timeline this state plays, in seconds. */
  from: number;
  to: number;
  loop: boolean;
};

export type ConditionOp = "true" | "false" | "fired" | "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

export type Condition = {
  id: string;
  input: string;
  op: ConditionOp;
  value: number;
};

/** `from: "any"` mirrors Rive's Any State — it can fire from wherever you are. */
export type Transition = {
  id: string;
  from: string | "any";
  to: string;
  conditions: Condition[];
  /** Crossfade seconds. 0 cuts straight to the target state. */
  duration: number;
  /**
   * Fraction (0–1) of the source state that must play before this can fire.
   * null means "interrupt whenever the conditions pass".
   */
  exitTime: number | null;
};

export type ListenerEvent = "hover" | "unhover" | "click" | "press" | "release" | "enterView";
export type ListenerAction = "setTrue" | "setFalse" | "toggle" | "fire" | "setValue";

/** Binds a DOM event on a layer to an input change. */
export type MachineListener = {
  id: string;
  layerId: string;
  event: ListenerEvent;
  input: string;
  action: ListenerAction;
  value: number;
};

export type StateMachine = {
  enabled: boolean;
  inputs: MachineInput[];
  states: MachineState[];
  transitions: Transition[];
  listeners: MachineListener[];
  initial: string;
};

export function emptyMachine(): StateMachine {
  return {
    enabled: false,
    inputs: [],
    states: [],
    transitions: [],
    listeners: [],
    initial: "",
  };
}

export function createInput(name: string, type: InputType): MachineInput {
  return { id: nextId("in"), name, type, value: 0 };
}

export function createState(name: string, from: number, to: number): MachineState {
  return { id: nextId("st"), name, from, to, loop: false };
}

export function createTransition(from: string, to: string): Transition {
  return { id: nextId("tr"), from, to, conditions: [], duration: 0.25, exitTime: null };
}

export function createListener(layerId: string, input: string): MachineListener {
  return {
    id: nextId("ls"),
    layerId,
    event: "hover",
    input,
    action: "setTrue",
    value: 1,
  };
}

/** Human-readable form of a condition, for the panel and generated comments. */
export function describeCondition(c: Condition, inputs: MachineInput[]): string {
  const name = inputs.find((i) => i.id === c.input)?.name ?? "?";
  switch (c.op) {
    case "true":
      return `${name} is true`;
    case "false":
      return `${name} is false`;
    case "fired":
      return `${name} fired`;
    case "eq":
      return `${name} == ${c.value}`;
    case "neq":
      return `${name} != ${c.value}`;
    case "gt":
      return `${name} > ${c.value}`;
    case "gte":
      return `${name} >= ${c.value}`;
    case "lt":
      return `${name} < ${c.value}`;
    default:
      return `${name} <= ${c.value}`;
  }
}

/** The bit of a timeline the runtime needs; keeps it testable and portable. */
export type Playable = {
  seek: (time: number) => void;
  play: () => void;
  pause: () => void;
  time: () => number;
};

/**
 * Drives a Playable from a state machine definition.
 *
 * Triggers are consumed the moment they satisfy a transition, which is what
 * makes them momentary rather than sticky — the same semantics Rive uses.
 */
export class MachineRuntime {
  private machine: StateMachine;
  private timeline: Playable;
  private values = new Map<string, number>();
  private current: MachineState | null = null;
  /** Set while a transition is crossfading, to hold off re-entry. */
  private blockedUntil = 0;
  private onStateChange?: (state: MachineState | null) => void;

  constructor(
    machine: StateMachine,
    timeline: Playable,
    onStateChange?: (state: MachineState | null) => void,
  ) {
    this.machine = machine;
    this.timeline = timeline;
    this.onStateChange = onStateChange;
    for (const input of machine.inputs) this.values.set(input.id, input.value);
    const initial =
      machine.states.find((s) => s.id === machine.initial) ?? machine.states[0] ?? null;
    if (initial) this.enter(initial);
  }

  get state(): MachineState | null {
    return this.current;
  }

  getValue(inputId: string): number {
    return this.values.get(inputId) ?? 0;
  }

  /** Sets an input and immediately re-evaluates, so reactions feel instant. */
  setValue(inputId: string, value: number) {
    this.values.set(inputId, value);
    this.evaluate();
  }

  toggle(inputId: string) {
    this.setValue(inputId, this.getValue(inputId) ? 0 : 1);
  }

  fire(inputId: string) {
    this.values.set(inputId, 1);
    this.evaluate();
    // Triggers never persist: whether or not it caused a transition, it's spent.
    this.values.set(inputId, 0);
  }

  private enter(state: MachineState) {
    this.current = state;
    this.timeline.seek(state.from);
    this.timeline.play();
    this.onStateChange?.(state);
  }

  private passes(condition: Condition): boolean {
    const v = this.values.get(condition.input) ?? 0;
    switch (condition.op) {
      case "true":
        return v !== 0;
      case "false":
        return v === 0;
      case "fired":
        return v !== 0;
      case "eq":
        return v === condition.value;
      case "neq":
        return v !== condition.value;
      case "gt":
        return v > condition.value;
      case "gte":
        return v >= condition.value;
      case "lt":
        return v < condition.value;
      default:
        return v <= condition.value;
    }
  }

  /** Progress through the current state, 0–1. */
  private progress(): number {
    if (!this.current) return 1;
    const span = this.current.to - this.current.from;
    if (span <= 0) return 1;
    return Math.min(1, Math.max(0, (this.timeline.time() - this.current.from) / span));
  }

  /**
   * Picks the first transition whose conditions all pass. Called on every input
   * change and once per frame from tick(), so exit-time gating still resolves
   * when nothing is touching the inputs.
   */
  evaluate(): boolean {
    if (!this.machine.enabled) return false;
    const now = performance.now();
    if (now < this.blockedUntil) return false;

    for (const t of this.machine.transitions) {
      if (t.from !== "any" && t.from !== this.current?.id) continue;
      if (t.to === this.current?.id) continue;
      if (t.exitTime !== null && this.progress() < t.exitTime) continue;
      if (!t.conditions.every((c) => this.passes(c))) continue;

      const target = this.machine.states.find((s) => s.id === t.to);
      if (!target) continue;
      this.blockedUntil = now + t.duration * 1000;
      this.enter(target);
      return true;
    }
    return false;
  }

  /** Call once per frame: holds the state's range and re-checks transitions. */
  tick() {
    if (!this.machine.enabled || !this.current) return;
    const t = this.timeline.time();
    if (t >= this.current.to) {
      if (this.current.loop) {
        this.timeline.seek(this.current.from);
        this.timeline.play();
      } else {
        // Park on the last frame so the state holds its end pose.
        this.timeline.seek(this.current.to);
        this.timeline.pause();
      }
    }
    this.evaluate();
  }
}
