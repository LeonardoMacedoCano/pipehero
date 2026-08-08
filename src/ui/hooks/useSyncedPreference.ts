import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth.js";
import { useAchievementToast, type UnlockedAchievement } from "../components/chrome/AchievementToastProvider.js";

export interface SettingsResponse {
  calibrationMs: number | null;
  themeId: string | null;
  keyBindings: Record<string, unknown> | null;
  strumModeEnabled: boolean | null;
  graphicsQuality: string | null;
}

type SettingsField = keyof SettingsResponse;

const EMPTY_SETTINGS: SettingsResponse = {
  calibrationMs: null,
  themeId: null,
  keyBindings: null,
  strumModeEnabled: null,
  graphicsQuality: null,
};

let settingsPromise: Promise<SettingsResponse> | null = null;
let settingsPromiseUserKey: string | null = null;

function fetchSettings(userKey: string): Promise<SettingsResponse> {
  if (settingsPromiseUserKey !== userKey) {
    settingsPromiseUserKey = userKey;
    settingsPromise = fetch("/api/settings/me")
      .then((response) => response.json() as Promise<SettingsResponse>)
      .catch(() => {
        settingsPromiseUserKey = null;
        return EMPTY_SETTINGS;
      });
  }
  return settingsPromise!;
}

export function useSyncedPreference<T>({
  field,
  get,
  set,
  toPayload,
  fromPayload,
}: {
  field: SettingsField;
  get: () => T;
  set: (value: T) => void;
  toPayload: (value: T) => unknown;
  fromPayload: (raw: unknown) => T;
}): { value: T; updateValue: (next: T) => void } {
  const { user } = useAuth();
  const { notify } = useAchievementToast();
  const [value, setValueState] = useState<T>(() => get());
  const appliedLocalChangeRef = useRef(false);
  const latestRef = useRef({ field, set, toPayload, user, notify });
  latestRef.current = { field, set, toPayload, user, notify };

  useEffect(() => {
    appliedLocalChangeRef.current = false;
    if (!user) return;
    let cancelled = false;
    fetchSettings(user.email).then((settings) => {
      if (cancelled || appliedLocalChangeRef.current) return;
      const raw = settings[field];
      if (raw === null || raw === undefined) return;
      const next = fromPayload(raw);
      set(next);
      setValueState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [user, field]);

  const updateValue = useCallback((next: T) => {
    const { field, set, toPayload, user, notify } = latestRef.current;
    appliedLocalChangeRef.current = true;
    set(next);
    setValueState(next);
    if (user) {
      fetch("/api/settings/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: toPayload(next) }),
      })
        .then((response) => response.json() as Promise<{ unlockedAchievements?: UnlockedAchievement[] }>)
        .then((data) => notify(data.unlockedAchievements ?? []))
        .catch(() => {});
    }
  }, []);

  return { value, updateValue };
}
