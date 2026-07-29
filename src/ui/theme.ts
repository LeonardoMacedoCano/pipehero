import type { AppTheme } from "lcano-react-ui";
import { COLORS, STAR_POWER_COLORS, type Palette } from "../colors.js";

function themeFromPalette(title: string, palette: Palette): AppTheme {
  return {
    title,
    colors: {
      primary: palette.primary,
      secondary: palette.secondary,
      tertiary: palette.tertiary,
      quaternary: palette.quaternary,
      white: palette.white,
      black: palette.black,
      gray: palette.gray,
      success: palette.success,
      info: palette.info,
      warning: palette.warning,

      laneGreen: palette.laneGreen,
      laneRed: palette.laneRed,
      laneYellow: palette.laneYellow,
      laneBlue: palette.laneBlue,
      laneOrange: palette.laneOrange,
      laneOpen: palette.laneOpen,
    },
  };
}

export const pipeHeroTheme: AppTheme = themeFromPalette("PipeHero", COLORS);
export const starPowerTheme: AppTheme = themeFromPalette("PipeHero — Star Power", STAR_POWER_COLORS);
