import { readLocalStorage, writeLocalStorage } from "../localStorage.js";

const STORAGE_KEY = "pipehero:strumModeEnabled";

export function getStrumModeEnabled(): boolean {
  return readLocalStorage(STORAGE_KEY) === "true";
}

export function setStrumModeEnabled(enabled: boolean): void {
  writeLocalStorage(STORAGE_KEY, String(enabled));
}
