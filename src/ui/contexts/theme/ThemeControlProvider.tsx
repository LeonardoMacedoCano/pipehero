import { createContext, useContext, type ReactNode } from "react";
import { ThemeProvider, type DefaultTheme } from "styled-components";
import { pipeHeroTheme } from "../../theme.js";

interface ThemeControlContextValue {
  currentTheme: DefaultTheme;
}

const ThemeContext = createContext<ThemeControlContextValue | undefined>(undefined);

export function useThemeControl(): ThemeControlContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeControl precisa ser usado dentro de <ThemeControlProvider>");
  }
  return context;
}

export function ThemeControlProvider({ children }: { children: ReactNode }) {
  const currentTheme = pipeHeroTheme;

  return (
    <ThemeContext.Provider value={{ currentTheme }}>
      <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
}
