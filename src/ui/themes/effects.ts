export interface ThemeEffectOption {
  id: string;
  label: string;
  description: string;
}

export const THEME_EFFECT_OPTIONS: readonly ThemeEffectOption[] = [
  { id: "none", label: "None", description: "No animated effect." },
  {
    id: "endCycle",
    label: "End Cycle",
    description: "A slow, subtle color drift across the whole site, inspired by the End portal in Minecraft.",
  },
  {
    id: "breathing",
    label: "Breathing",
    description: "A gentle brightness pulse across the whole site, like it's slowly breathing.",
  },
  {
    id: "bloom",
    label: "Bloom",
    description: "A very soft wash of the theme's accent color breathes across the whole screen.",
  },
] as const;

export const DEFAULT_THEME_EFFECT_ID = THEME_EFFECT_OPTIONS[0].id;

export function isThemeEffectId(value: unknown): value is string {
  return typeof value === "string" && THEME_EFFECT_OPTIONS.some((option) => option.id === value);
}

export function getThemeEffectOption(id: string): ThemeEffectOption {
  return THEME_EFFECT_OPTIONS.find((option) => option.id === id) ?? THEME_EFFECT_OPTIONS[0];
}
