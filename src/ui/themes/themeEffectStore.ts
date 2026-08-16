import { readLocalStorage, writeLocalStorage } from "../../localStorage.js";
import { DEFAULT_THEME_EFFECT_ID } from "./effects.js";

const STORAGE_KEY = "pipehero:themeEffectId";

export function getStoredThemeEffectId(): string {
  return readLocalStorage(STORAGE_KEY) ?? DEFAULT_THEME_EFFECT_ID;
}

export function setStoredThemeEffectId(id: string): void {
  writeLocalStorage(STORAGE_KEY, id);
}
