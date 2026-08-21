import { css, keyframes, type Keyframes } from "styled-components";

export const endCycleHue = keyframes`
  0%, 100% { filter: hue-rotate(0deg) saturate(1) sepia(0); }
  50% { filter: hue-rotate(50deg) saturate(1.6) sepia(0.3); }
`;

export const breathingBrightness = keyframes`
  0%, 100% { filter: brightness(0.94); }
  50% { filter: brightness(1.06); }
`;

export const bloomPulse = keyframes`
  0%, 100% { opacity: 0; }
  50% { opacity: 0.1; }
`;

const FILTER_EFFECT_ANIMATIONS: Record<string, Keyframes> = {
  endCycle: endCycleHue,
  breathing: breathingBrightness,
};

export interface ThemeEffectCssOptions {
  selector: string;
  bloomPosition: "fixed" | "absolute";
  bloomZIndex?: number;
}

export function themeEffectCss(themeEffectId: string, { selector, bloomPosition, bloomZIndex }: ThemeEffectCssOptions) {
  return css`
    @media (prefers-reduced-motion: no-preference) {
      ${selector} {
        animation: ${FILTER_EFFECT_ANIMATIONS[themeEffectId] ?? "none"} 18s ease-in-out infinite;
      }

      ${themeEffectId === "bloom" &&
      css`
        ${selector}::after {
          content: "";
          position: ${bloomPosition};
          inset: 0;
          ${bloomZIndex !== undefined ? css`z-index: ${bloomZIndex};` : ""}
          pointer-events: none;
          opacity: 0;
          background: ${({ theme }) => theme.colors.quaternary};
          animation: ${bloomPulse} 18s ease-in-out infinite;
        }
      `}
    }
  `;
}
