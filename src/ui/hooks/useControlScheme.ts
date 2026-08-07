import { useCallback, useEffect, useState } from "react";
import {
  getTouchPreferences,
  setTouchPreferences,
  type TouchPreferences,
} from "../../game/controlSchemeStore.js";

export type ControlScheme = "touch" | "keyboard";

function detectTouchCapable(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  return coarsePointer && navigator.maxTouchPoints > 0;
}

export function useControlScheme(): {
  scheme: ControlScheme;
  touchCapable: boolean;
  preferences: TouchPreferences;
  updatePreferences: (next: TouchPreferences) => void;
} {
  const [touchCapable, setTouchCapableState] = useState(detectTouchCapable);
  const [preferences, setPreferencesState] = useState(getTouchPreferences);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    function handleChange() {
      setTouchCapableState(detectTouchCapable());
    }
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const updatePreferences = useCallback((next: TouchPreferences) => {
    setTouchPreferences(next);
    setPreferencesState(next);
  }, []);

  const scheme: ControlScheme =
    preferences.overrideScheme === "auto" ? (touchCapable ? "touch" : "keyboard") : preferences.overrideScheme;

  return { scheme, touchCapable, preferences, updatePreferences };
}
