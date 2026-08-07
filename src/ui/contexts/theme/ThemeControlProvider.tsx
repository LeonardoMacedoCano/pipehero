import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ThemeProvider, type DefaultTheme } from "styled-components";
import { THEME_OPTIONS, getThemeOption, type ThemeOption } from "../../themes/registry.js";
import { getStoredThemeId, setStoredThemeId } from "../../themes/themeStore.js";
import { useSyncedPreference } from "../../hooks/useSyncedPreference.js";

interface ThemeControlContextValue {
  currentTheme: DefaultTheme;
  themeOption: ThemeOption;
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
  const { value: themeId, updateValue: setThemeId } = useSyncedPreference<string>({
    field: "themeId",
    get: getStoredThemeId,
    set: setStoredThemeId,
    toPayload: (id) => id,
    fromPayload: (raw) => raw as string,
  });

  const themeOption = getThemeOption(themeId);
  const currentTheme = themeOption.theme;

  const value = useMemo(
    () => ({ currentTheme, themeOption, themeId, availableThemes: THEME_OPTIONS, setThemeId }),
    [currentTheme, themeOption, themeId, setThemeId]
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
}
