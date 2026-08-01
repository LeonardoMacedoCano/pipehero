import type { Fret } from "../types.js";
import { COLORS } from "../colors.js";

export type ControlAction =
  | "fretGreen"
  | "fretRed"
  | "fretYellow"
  | "fretBlue"
  | "fretOrange"
  | "fretOpen"
  | "strumUp"
  | "strumDown"
  | "starPower";

export type InputMode = "tap" | "strum";

const BOTH_MODES: InputMode[] = ["tap", "strum"];

export interface ControlActionInfo {
  id: ControlAction;
  label: string;
  color: string;
  fret?: Fret;
  modes: InputMode[];
}

export const CONTROL_ACTIONS: ControlActionInfo[] = [
  { id: "fretGreen", label: "Green", color: COLORS.laneGreen, fret: 0, modes: BOTH_MODES },
  { id: "fretRed", label: "Red", color: COLORS.laneRed, fret: 1, modes: BOTH_MODES },
  { id: "fretYellow", label: "Yellow", color: COLORS.laneYellow, fret: 2, modes: BOTH_MODES },
  { id: "fretBlue", label: "Blue", color: COLORS.laneBlue, fret: 3, modes: BOTH_MODES },
  { id: "fretOrange", label: "Orange", color: COLORS.laneOrange, fret: 4, modes: BOTH_MODES },
  { id: "fretOpen", label: "Open", color: COLORS.laneOpen, fret: 7, modes: ["tap"] },
  { id: "strumUp", label: "Strum Up", color: COLORS.tertiary, modes: ["strum"] },
  { id: "strumDown", label: "Strum Down", color: COLORS.tertiary, modes: ["strum"] },
  { id: "starPower", label: "Star Power", color: COLORS.info, modes: BOTH_MODES },
];

export type InputBinding =
  | { source: "keyboard"; code: string }
  | { source: "gamepad"; deviceId: string; button: number };

export const DEFAULT_ACTION_BINDINGS: Record<ControlAction, InputBinding> = {
  fretGreen: { source: "keyboard", code: "KeyA" },
  fretRed: { source: "keyboard", code: "KeyS" },
  fretYellow: { source: "keyboard", code: "KeyJ" },
  fretBlue: { source: "keyboard", code: "KeyK" },
  fretOrange: { source: "keyboard", code: "KeyL" },
  fretOpen: { source: "keyboard", code: "Space" },
  strumUp: { source: "keyboard", code: "ArrowUp" },
  strumDown: { source: "keyboard", code: "ArrowDown" },
  starPower: { source: "keyboard", code: "ShiftLeft" },
};

export function bindingsEqual(a: InputBinding | null, b: InputBinding | null): boolean {
  if (!a || !b) return a === b;
  if (a.source !== b.source) return false;
  if (a.source === "keyboard") return a.code === (b as { code: string }).code;
  const gamepadB = b as { deviceId: string; button: number };
  return a.deviceId === gamepadB.deviceId && a.button === gamepadB.button;
}

export function actionForBinding(
  binding: InputBinding,
  bindings: Record<ControlAction, InputBinding | null>
): ControlAction | null {
  for (const action of CONTROL_ACTIONS) {
    if (bindingsEqual(bindings[action.id], binding)) return action.id;
  }
  return null;
}

export function fretForBinding(binding: InputBinding, bindings: Record<ControlAction, InputBinding | null>): Fret | null {
  const action = actionForBinding(binding, bindings);
  if (!action) return null;
  const info = CONTROL_ACTIONS.find((a) => a.id === action);
  return info?.fret ?? null;
}

export function isStarPowerBinding(binding: InputBinding, bindings: Record<ControlAction, InputBinding | null>): boolean {
  return actionForBinding(binding, bindings) === "starPower";
}

export function isStrumBinding(binding: InputBinding, bindings: Record<ControlAction, InputBinding | null>): boolean {
  const action = actionForBinding(binding, bindings);
  return action === "strumUp" || action === "strumDown";
}

export function isBindingActiveInMode(
  binding: InputBinding,
  bindings: Record<ControlAction, InputBinding | null>,
  mode: InputMode
): boolean {
  const action = actionForBinding(binding, bindings);
  const info = action && CONTROL_ACTIONS.find((a) => a.id === action);
  return info ? info.modes.includes(mode) : false;
}

const KEY_CODE_LABELS: Record<string, string> = {
  Space: "Space",
  ShiftLeft: "Left Shift",
  ShiftRight: "Right Shift",
  ControlLeft: "Left Ctrl",
  ControlRight: "Right Ctrl",
  AltLeft: "Left Alt",
  AltRight: "Right Alt",
  ArrowUp: "Up Arrow",
  ArrowDown: "Down Arrow",
  ArrowLeft: "Left Arrow",
  ArrowRight: "Right Arrow",
  Enter: "Enter",
  Escape: "Esc",
  Tab: "Tab",
  CapsLock: "Caps Lock",
  Backspace: "Backspace",
  Backquote: "`",
};

export function describeKeyCode(code: string): string {
  if (code in KEY_CODE_LABELS) return KEY_CODE_LABELS[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code;
}

export function describeBinding(binding: InputBinding | null | undefined): string {
  if (!binding) return "—";
  if (binding.source === "keyboard") return describeKeyCode(binding.code);
  return `Button ${binding.button + 1}`;
}
