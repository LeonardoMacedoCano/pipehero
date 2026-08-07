import { readLocalStorage, writeLocalStorage } from "../localStorage.js";

export type ControlSchemeOverride = "auto" | "touch" | "keyboard";
export type Handedness = "right" | "left";
export type TouchButtonSize = "small" | "medium" | "large";

export interface TouchPreferences {
  overrideScheme: ControlSchemeOverride;
  handedness: Handedness;
  buttonSize: TouchButtonSize;
}

export const DEFAULT_TOUCH_PREFERENCES: TouchPreferences = {
  overrideScheme: "auto",
  handedness: "right",
  buttonSize: "medium",
};

const STORAGE_KEY = "pipehero:touchPreferences";

function isValidPreferences(value: unknown): value is TouchPreferences {
  if (!value || typeof value !== "object") return false;
  const prefs = value as Record<string, unknown>;
  return (
    ["auto", "touch", "keyboard"].includes(prefs.overrideScheme as string) &&
    ["right", "left"].includes(prefs.handedness as string) &&
    ["small", "medium", "large"].includes(prefs.buttonSize as string)
  );
}

export function getTouchPreferences(): TouchPreferences {
  const raw = readLocalStorage(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_TOUCH_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isValidPreferences(parsed) ? parsed : { ...DEFAULT_TOUCH_PREFERENCES };
  } catch {
    return { ...DEFAULT_TOUCH_PREFERENCES };
  }
}

export function setTouchPreferences(preferences: TouchPreferences): void {
  writeLocalStorage(STORAGE_KEY, JSON.stringify(preferences));
}
