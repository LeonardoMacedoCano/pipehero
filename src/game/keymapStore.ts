import { bindingsEqual, DEFAULT_ACTION_BINDINGS, type ControlAction, type InputBinding } from "./keymap.js";
import { readLocalStorage, writeLocalStorage } from "../localStorage.js";

const STORAGE_KEY = "pipehero:keyBindings";

export type ActionBindings = Record<ControlAction, InputBinding | null>;

function isValidBinding(value: unknown): value is InputBinding {
  if (!value || typeof value !== "object") return false;
  const binding = value as Record<string, unknown>;
  if (binding.source === "keyboard") return typeof binding.code === "string";
  if (binding.source === "gamepad") return typeof binding.deviceId === "string" && typeof binding.button === "number";
  return false;
}

export function getBindings(): ActionBindings {
  const raw = readLocalStorage(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_ACTION_BINDINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<ControlAction, unknown>>;
    const result: ActionBindings = { ...DEFAULT_ACTION_BINDINGS };
    for (const action of Object.keys(DEFAULT_ACTION_BINDINGS) as ControlAction[]) {
      if (!(action in parsed)) continue;
      const value = parsed[action];
      if (value === null || isValidBinding(value)) result[action] = value as InputBinding | null;
    }
    return result;
  } catch {
    return { ...DEFAULT_ACTION_BINDINGS };
  }
}

function saveBindings(bindings: ActionBindings): void {
  writeLocalStorage(STORAGE_KEY, JSON.stringify(bindings));
}

export function setBinding(action: ControlAction, binding: InputBinding): ActionBindings {
  const next: ActionBindings = { ...getBindings() };
  for (const key of Object.keys(next) as ControlAction[]) {
    if (key !== action && bindingsEqual(next[key], binding)) next[key] = null;
  }
  next[action] = binding;
  saveBindings(next);
  return next;
}

export function resetToDefaults(): ActionBindings {
  const defaults: ActionBindings = { ...DEFAULT_ACTION_BINDINGS };
  saveBindings(defaults);
  return defaults;
}
