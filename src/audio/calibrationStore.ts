const STORAGE_KEY = "pipehero:calibrationSeconds";

export function getCalibration(): number {
  if (typeof localStorage === "undefined") return 0;
  const raw = localStorage.getItem(STORAGE_KEY);
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function setCalibration(seconds: number): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(seconds));
}
