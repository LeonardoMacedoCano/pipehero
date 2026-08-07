import type { AppTheme } from "lcano-react-ui";
import type { Palette } from "../colors.js";

export function themeFromPalette(title: string, palette: Palette): AppTheme {
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

      lane1: palette.lane1,
      lane2: palette.lane2,
      lane3: palette.lane3,
      lane4: palette.lane4,
      lane5: palette.lane5,
      laneOpen: palette.laneOpen,
    },
  };
}
