import type { Fret } from "../types.js";
import { COLORS } from "../colors.js";

export type ControlAction =
  | "fretGreen"
  | "fretRed"
  | "fretYellow"
  | "fretBlue"
  | "fretOrange"
  | "fretOpen"
  | "starPower";

export interface ControlActionInfo {
  id: ControlAction;
  label: string;
  color: string;
  fret?: Fret;
}

export const CONTROL_ACTIONS: ControlActionInfo[] = [
  { id: "fretGreen", label: "Verde", color: COLORS.laneGreen, fret: 0 },
  { id: "fretRed", label: "Vermelho", color: COLORS.laneRed, fret: 1 },
  { id: "fretYellow", label: "Amarelo", color: COLORS.laneYellow, fret: 2 },
  { id: "fretBlue", label: "Azul", color: COLORS.laneBlue, fret: 3 },
  { id: "fretOrange", label: "Laranja", color: COLORS.laneOrange, fret: 4 },
  { id: "fretOpen", label: "Aberta", color: COLORS.laneOpen, fret: 7 },
  { id: "starPower", label: "Star Power", color: COLORS.info },
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

const KEY_CODE_LABELS: Record<string, string> = {
  Space: "Espaço",
  ShiftLeft: "Shift Esquerdo",
  ShiftRight: "Shift Direito",
  ControlLeft: "Ctrl Esquerdo",
  ControlRight: "Ctrl Direito",
  AltLeft: "Alt Esquerdo",
  AltRight: "Alt Direito",
  ArrowUp: "Seta Cima",
  ArrowDown: "Seta Baixo",
  ArrowLeft: "Seta Esquerda",
  ArrowRight: "Seta Direita",
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
  return `Botão ${binding.button + 1}`;
}
