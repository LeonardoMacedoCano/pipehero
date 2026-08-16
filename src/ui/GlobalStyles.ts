import { createGlobalStyle, keyframes, css, type Keyframes } from "styled-components";

const endCycleHue = keyframes`
  0%, 100% { filter: hue-rotate(0deg) saturate(1) sepia(0); }
  50% { filter: hue-rotate(50deg) saturate(1.6) sepia(0.3); }
`;

const breathingBrightness = keyframes`
  0%, 100% { filter: brightness(0.94); }
  50% { filter: brightness(1.06); }
`;

const bloomPulse = keyframes`
  0%, 100% { opacity: 0; }
  50% { opacity: 0.1; }
`;

const FILTER_EFFECT_ANIMATIONS: Record<string, Keyframes> = {
  endCycle: endCycleHue,
  breathing: breathingBrightness,
};

export const GlobalStyles = createGlobalStyle<{ $themeEffectId: string }>`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    background-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.white};
  }

  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }

  *, button, input, select {
    border: 0;
    outline: 0;
    color: inherit;
    font-family: inherit;
  }

  button {
    cursor: pointer;
    background: none;
  }

  @media (prefers-reduced-motion: no-preference) {
    #root {
      animation: ${({ $themeEffectId }) => FILTER_EFFECT_ANIMATIONS[$themeEffectId] ?? "none"} 18s ease-in-out infinite;
    }

    ${({ $themeEffectId, theme }) =>
      $themeEffectId === "bloom" &&
      css`
        #root::after {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 40;
          pointer-events: none;
          opacity: 0;
          background: ${theme.colors.quaternary};
          animation: ${bloomPulse} 18s ease-in-out infinite;
        }
      `}
  }
`;
