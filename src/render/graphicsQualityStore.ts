import { readLocalStorage, writeLocalStorage } from "../localStorage.js";
import { DEFAULT_GRAPHICS_QUALITY, isGraphicsQuality, type GraphicsQuality } from "./graphicsQuality.js";

const STORAGE_KEY = "pipehero:graphicsQuality";

const listeners = new Set<() => void>();

export function getGraphicsQuality(): GraphicsQuality {
  const raw = readLocalStorage(STORAGE_KEY);
  return isGraphicsQuality(raw) ? raw : DEFAULT_GRAPHICS_QUALITY;
}

export function setGraphicsQuality(quality: GraphicsQuality): void {
  writeLocalStorage(STORAGE_KEY, quality);
  for (const listener of listeners) listener();
}

export function subscribeGraphicsQuality(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function parseGraphicsQualityFromServer(raw: unknown): GraphicsQuality {
  return isGraphicsQuality(raw) ? raw : DEFAULT_GRAPHICS_QUALITY;
}
