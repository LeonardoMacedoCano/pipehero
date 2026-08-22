import { createGlobalStyle } from "styled-components";
import { themeEffectCss } from "./themes/effectStyles.js";
import { LANDSCAPE_MEDIA_QUERY, MOBILE_LAYOUT_MEDIA_QUERY } from "./responsive.js";

export const GlobalStyles = createGlobalStyle<{ $themeEffectId: string }>`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;

    @media ${MOBILE_LAYOUT_MEDIA_QUERY}, ${LANDSCAPE_MEDIA_QUERY} {
      font-size: 14px;
    }
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

  ${({ $themeEffectId }) => themeEffectCss($themeEffectId, { selector: "#root", bloomPosition: "fixed", bloomZIndex: 40 })}
`;
