import type { AppTheme } from "lcano-react-ui";
import type { Palette } from "../../colors.js";
import { DARK_CARBON_GREEN, DARK_ONYX_AMBER, DRACULA_DARK } from "../../colors.js";
import { themeFromPalette } from "../theme.js";

export interface ThemeOption {
  id: string;
  label: string;
  description: string;
  theme: AppTheme;
  palette: Palette;
  swatch: readonly [string, string, string, string];
}

function themeOption(id: string, label: string, description: string, palette: Palette): ThemeOption {
  const theme = themeFromPalette(label, palette);
  return {
    id,
    label,
    description,
    theme,
    palette,
    swatch: [theme.colors.primary, theme.colors.secondary, theme.colors.quaternary, theme.colors.white],
  };
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  themeOption("darkCarbonGreen", "Dark Carbon Green", "Brushed carbon with a vivid green edge.", DARK_CARBON_GREEN),
  themeOption("darkOnyxAmber", "Dark Onyx Amber", "Brushed carbon with a warm amber edge.", DARK_ONYX_AMBER),
  themeOption("draculaDark", "Dracula Dark", "The classic Dracula palette.", DRACULA_DARK),
] as const;

export const DEFAULT_THEME_ID = THEME_OPTIONS[0].id;

export function getThemeOption(id: string): ThemeOption {
  return THEME_OPTIONS.find((option) => option.id === id) ?? THEME_OPTIONS[0];
}
