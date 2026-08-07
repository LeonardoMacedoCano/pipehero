import type { DefaultTheme } from "styled-components";

export const cylinderGradientHorizontal = (theme: DefaultTheme) => `linear-gradient(
  90deg,
  ${theme.colors.black} 0%,
  ${theme.colors.gray} 22%,
  ${theme.colors.white} 50%,
  ${theme.colors.gray} 78%,
  ${theme.colors.black} 100%
)`;

export const cylinderGradientVertical = (theme: DefaultTheme) => `linear-gradient(
  180deg,
  ${theme.colors.black} 0%,
  ${theme.colors.gray} 22%,
  ${theme.colors.white} 50%,
  ${theme.colors.gray} 78%,
  ${theme.colors.black} 100%
)`;

export const pipeShadow = "0 1px 4px rgba(0, 0, 0, 0.85), inset 0 0 0 1px rgba(0, 0, 0, 0.5)";

export const pipeCapGradient = (theme: DefaultTheme) => `radial-gradient(
  ellipse at center,
  ${theme.colors.black} 0%,
  ${theme.colors.black} 35%,
  ${theme.colors.gray} 55%,
  ${theme.colors.white} 72%,
  ${theme.colors.gray} 100%
)`;

export function elbowRingGradient(theme: DefaultTheme, size: number, thickness: number, cx: number, cy: number): string {
  const outer = size;
  const inner = size - thickness;
  const at = (t: number) => inner + (outer - inner) * t;
  return `radial-gradient(
    circle at ${cx}px ${cy}px,
    transparent ${Math.max(0, inner)}px,
    ${theme.colors.black} ${Math.max(0, inner)}px,
    ${theme.colors.gray} ${at(0.22)}px,
    ${theme.colors.white} ${at(0.5)}px,
    ${theme.colors.gray} ${at(0.78)}px,
    ${theme.colors.black} ${outer}px,
    transparent ${outer}px
  )`;
}
