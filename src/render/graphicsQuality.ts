export type GraphicsQuality = "low" | "medium" | "high";

export interface GraphicsSettings {
  lightningEffectsEnabled: boolean;
  hitResidueEnabled: boolean;
  boltCountMultiplier: number;
  maxDevicePixelRatio: number;
  intenseDropStyle: "full" | "tint";
}

export const DEFAULT_GRAPHICS_QUALITY: GraphicsQuality = "medium";

const GRAPHICS_SETTINGS_BY_QUALITY: Record<GraphicsQuality, GraphicsSettings> = {
  low: {
    lightningEffectsEnabled: false,
    hitResidueEnabled: false,
    boltCountMultiplier: 1,
    maxDevicePixelRatio: 1.5,
    intenseDropStyle: "tint",
  },
  medium: {
    lightningEffectsEnabled: true,
    hitResidueEnabled: true,
    boltCountMultiplier: 1,
    maxDevicePixelRatio: 2,
    intenseDropStyle: "full",
  },
  high: {
    lightningEffectsEnabled: true,
    hitResidueEnabled: true,
    boltCountMultiplier: 1.5,
    maxDevicePixelRatio: Infinity,
    intenseDropStyle: "full",
  },
};

export function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === "low" || value === "medium" || value === "high";
}

export function graphicsSettingsFor(quality: GraphicsQuality): GraphicsSettings {
  return GRAPHICS_SETTINGS_BY_QUALITY[quality];
}
