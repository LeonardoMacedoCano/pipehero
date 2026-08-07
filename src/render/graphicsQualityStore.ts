import { readLocalStorage, writeLocalStorage } from "../localStorage.js";
import { DEFAULT_GRAPHICS_QUALITY, isGraphicsQuality, type GraphicsQuality } from "./graphicsQuality.js";

const STORAGE_KEY = "pipehero:graphicsQuality";

export function getGraphicsQuality(): GraphicsQuality {
  const raw = readLocalStorage(STORAGE_KEY);
  return isGraphicsQuality(raw) ? raw : DEFAULT_GRAPHICS_QUALITY;
}

export function setGraphicsQuality(quality: GraphicsQuality): void {
  writeLocalStorage(STORAGE_KEY, quality);
}

export function parseGraphicsQualityFromServer(raw: unknown): GraphicsQuality {
  return isGraphicsQuality(raw) ? raw : DEFAULT_GRAPHICS_QUALITY;
}
