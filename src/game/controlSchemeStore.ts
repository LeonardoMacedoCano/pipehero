import { readLocalStorage, writeLocalStorage } from "../localStorage.js";

export type ControlSchemeOverride = "auto" | "touch" | "keyboard";

export interface TouchPreferences {
  overrideScheme: ControlSchemeOverride;
}

export const DEFAULT_TOUCH_PREFERENCES: TouchPreferences = {
  overrideScheme: "auto",
};

const STORAGE_KEY = "pipehero:touchPreferences";

function isValidPreferences(value: unknown): value is TouchPreferences {
  if (!value || typeof value !== "object") return false;
  const prefs = value as Record<string, unknown>;
  return ["auto", "touch", "keyboard"].includes(prefs.overrideScheme as string);
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
