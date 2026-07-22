import { createGlobalStyle } from "styled-components";

export const GlobalStyles = createGlobalStyle`
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
  }
`;
