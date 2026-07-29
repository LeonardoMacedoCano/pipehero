export const COLORS = {
  primary: "#111318",
  secondary: "#1b1e26",
  tertiary: "#9aa0a6",
  quaternary: "#5c6270",
  white: "#eeeeee",
  black: "#05060a",
  gray: "#333333",
  success: "#3ddc46",
  info: "#3d8ee8",
  warning: "#e8443c",

  laneGreen: "#3ddc46",
  laneRed: "#e8443c",
  laneYellow: "#f5d033",
  laneBlue: "#3d8ee8",
  laneOrange: "#f58a33",
  laneOpen: "#c8c8c8",

  canvasBackground: "#05060a",
  hitLine: "#e0e0e0",
  noteFallback: "#ffffff",
  noteStrokeOverlay: "rgba(0, 0, 0, 0.4)",
  pipeGradientStops: ["#202430", "#454b58", "#8891a0", "#454b58", "#202430"],
  pipeMissGradientStops: ["#300a0a", "#5c1414", "#9c2424", "#5c1414", "#300a0a"],
} as const;

export interface Palette {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  white: string;
  black: string;
  gray: string;
  success: string;
  info: string;
  warning: string;
  laneGreen: string;
  laneRed: string;
  laneYellow: string;
  laneBlue: string;
  laneOrange: string;
  laneOpen: string;
  canvasBackground: string;
  hitLine: string;
  noteFallback: string;
  noteStrokeOverlay: string;
  pipeGradientStops: readonly string[];
  pipeMissGradientStops: readonly string[];
}

export const STAR_POWER_COLORS: Palette = {
  primary: "#1a1024",
  secondary: "#241a33",
  tertiary: "#b39ddb",
  quaternary: "#6a5c8a",
  white: "#f3eaff",
  black: "#0a0512",
  gray: "#3a2f4d",
  success: "#7c4dff",
  info: "#9c6dff",
  warning: "#ff4da6",

  laneGreen: "#8e44ff",
  laneRed: "#e040fb",
  laneYellow: "#c9a0ff",
  laneBlue: "#5c3fe0",
  laneOrange: "#b23fd6",
  laneOpen: "#d8c8ff",

  canvasBackground: "#0d0620",
  hitLine: "#e8d9ff",
  noteFallback: "#f0e6ff",
  noteStrokeOverlay: "rgba(0, 0, 0, 0.4)",
  pipeGradientStops: ["#2a1f42", "#4a3572", "#9c7fd6", "#4a3572", "#2a1f42"],
  pipeMissGradientStops: ["#300a0a", "#5c1414", "#9c2424", "#5c1414", "#300a0a"],
};
