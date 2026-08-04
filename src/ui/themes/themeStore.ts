import { readLocalStorage, writeLocalStorage } from "../../localStorage.js";
import { DEFAULT_THEME_ID } from "./registry.js";

const STORAGE_KEY = "pipehero:themeId";

export function getStoredThemeId(): string {
  return readLocalStorage(STORAGE_KEY) ?? DEFAULT_THEME_ID;
}

export function setStoredThemeId(id: string): void {
  writeLocalStorage(STORAGE_KEY, id);
}
