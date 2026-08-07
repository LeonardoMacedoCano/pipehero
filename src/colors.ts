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

  lane1: string;
  lane2: string;
  lane3: string;
  lane4: string;
  lane5: string;
  laneOpen: string;

  canvasBackground: string;
  hitLine: string;
  noteFallback: string;
  noteStrokeOverlay: string;
  pipeGradientStops: readonly string[];
  pipeMissGradientStops: readonly string[];
}

const MISS_GRADIENT_STOPS = ["#300a0a", "#5c1414", "#9c2424", "#5c1414", "#300a0a"] as const;

// Pipes are brushed steel in every theme and every state — only the drops/glow follow the theme.
const PIPE_GRADIENT_STOPS = ["#202430", "#454b58", "#8891a0", "#454b58", "#202430"] as const;

export const DARK_CARBON_GREEN: Palette = {
  primary: "#1c1c1c",
  secondary: "#2e2e2e",
  tertiary: "#505050",
  quaternary: "#2ed22e",
  white: "#f8f8f2",
  black: "#000000",
  gray: "#a9a9a9",
  success: "#008000",
  info: "#007bff",
  warning: "#ff4500",

  lane1: "#2ed22e",
  lane2: "#e8443c",
  lane3: "#f5d033",
  lane4: "#3d8ee8",
  lane5: "#f58a33",
  laneOpen: "#c8c8c8",

  canvasBackground: "#0a0a0a",
  hitLine: "#e0e0e0",
  noteFallback: "#ffffff",
  noteStrokeOverlay: "rgba(0, 0, 0, 0.4)",
  pipeGradientStops: PIPE_GRADIENT_STOPS,
  pipeMissGradientStops: MISS_GRADIENT_STOPS,
};

export const DARK_ONYX_AMBER: Palette = {
  primary: "#1c1c1c",
  secondary: "#2e2e2e",
  tertiary: "#505050",
  quaternary: "#ffc107",
  white: "#f8f8f2",
  black: "#000000",
  gray: "#a9a9a9",
  success: "#008000",
  info: "#007bff",
  warning: "#ff4500",

  lane1: "#ffc107",
  lane2: "#e8443c",
  lane3: "#3ddc46",
  lane4: "#3d8ee8",
  lane5: "#c74cf0",
  laneOpen: "#c8c8c8",

  canvasBackground: "#0a0a0a",
  hitLine: "#e0e0e0",
  noteFallback: "#ffffff",
  noteStrokeOverlay: "rgba(0, 0, 0, 0.4)",
  pipeGradientStops: PIPE_GRADIENT_STOPS,
  pipeMissGradientStops: MISS_GRADIENT_STOPS,
};

export const DRACULA_DARK: Palette = {
  primary: "#282a36",
  secondary: "#44475a",
  tertiary: "#5e5e89",
  quaternary: "#a478e3",
  white: "#f8f8f2",
  black: "#000000",
  gray: "#6272a4",
  success: "#50fa7b",
  info: "#8be9fd",
  warning: "#ff5555",

  lane1: "#a478e3",
  lane2: "#ff5555",
  lane3: "#f1fa8c",
  lane4: "#8be9fd",
  lane5: "#ffb86c",
  laneOpen: "#d8c8ff",

  canvasBackground: "#191a21",
  hitLine: "#f8f8f2",
  noteFallback: "#f8f8f2",
  noteStrokeOverlay: "rgba(0, 0, 0, 0.4)",
  pipeGradientStops: PIPE_GRADIENT_STOPS,
  pipeMissGradientStops: MISS_GRADIENT_STOPS,
};

export const COLORS: Palette = DARK_CARBON_GREEN;
