import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider, type DefaultTheme } from "styled-components";
import { THEME_OPTIONS, getThemeOption, type ThemeOption } from "../../themes/registry.js";
import { getStoredThemeId, setStoredThemeId } from "../../themes/themeStore.js";

interface ThemeControlContextValue {
  currentTheme: DefaultTheme;
  themeId: string;
  availableThemes: readonly ThemeOption[];
  setThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeControlContextValue | undefined>(undefined);

export function useThemeControl(): ThemeControlContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeControl must be used within a <ThemeControlProvider>");
  }
  return context;
}

export function ThemeControlProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState(() => getStoredThemeId());

  const setThemeId = useCallback((id: string) => {
    setStoredThemeId(id);
    setThemeIdState(id);
  }, []);

  const currentTheme = getThemeOption(themeId).theme;

  const value = useMemo(
    () => ({ currentTheme, themeId, availableThemes: THEME_OPTIONS, setThemeId }),
    [currentTheme, themeId, setThemeId]
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
}
