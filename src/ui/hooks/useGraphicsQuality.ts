import { useSyncExternalStore } from "react";
import { getGraphicsQuality, subscribeGraphicsQuality } from "../../render/graphicsQualityStore.js";
import { DEFAULT_GRAPHICS_QUALITY, type GraphicsQuality } from "../../render/graphicsQuality.js";

export function useGraphicsQuality(): GraphicsQuality {
  return useSyncExternalStore(subscribeGraphicsQuality, getGraphicsQuality, () => DEFAULT_GRAPHICS_QUALITY);
}
