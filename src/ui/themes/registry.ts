import type { AppTheme } from "lcano-react-ui";
import { pipeHeroTheme } from "../theme.js";

export interface ThemeOption {
  id: string;
  label: string;
  description: string;
  theme: AppTheme;
  swatch: readonly [string, string, string, string];
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    id: "pipehero",
    label: "PipeHero",
    description: "The default iron & steel look.",
    theme: pipeHeroTheme,
    swatch: [pipeHeroTheme.colors.primary, pipeHeroTheme.colors.secondary, pipeHeroTheme.colors.quaternary, pipeHeroTheme.colors.white],
  },
] as const;

export const DEFAULT_THEME_ID = THEME_OPTIONS[0].id;

export function getThemeOption(id: string): ThemeOption {
  return THEME_OPTIONS.find((option) => option.id === id) ?? THEME_OPTIONS[0];
}
