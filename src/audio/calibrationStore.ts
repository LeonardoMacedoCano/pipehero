import { readLocalStorage, writeLocalStorage } from "../localStorage.js";

const STORAGE_KEY = "pipehero:calibrationSeconds";

export function getCalibration(): number {
  const value = Number(readLocalStorage(STORAGE_KEY));
  return Number.isFinite(value) ? value : 0;
}

export function setCalibration(seconds: number): void {
  writeLocalStorage(STORAGE_KEY, String(seconds));
}
