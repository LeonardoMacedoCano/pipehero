import { useSyncedPreference as useLibrarySyncedPreference } from "lcano-react-ui";
import { useAuth } from "./useAuth.js";
import { useAchievementToast, type UnlockedAchievement } from "../components/chrome/AchievementToastProvider.js";

export type SettingsField = "calibrationMs" | "themeId" | "themeEffectId" | "keyBindings" | "strumModeEnabled" | "graphicsQuality";

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

  return useLibrarySyncedPreference<T>({
    field,
    get,
    set,
    toPayload,
    fromPayload,
    endpoint: "/api/settings/me",
    enabled: !!user,
    cacheKey: user?.email,
    onSaved: (response) => notify((response.unlockedAchievements as UnlockedAchievement[] | undefined) ?? []),
  });
}
