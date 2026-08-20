export interface AchievementEffectOption {
  id: string;
  label: string;
}

export const ACHIEVEMENT_EFFECT_OPTIONS: readonly AchievementEffectOption[] = [
  { id: "shimmer", label: "Shimmer" },
  { id: "pulse", label: "Pulse" },
] as const;

const EFFECT_BY_ID = new Map(ACHIEVEMENT_EFFECT_OPTIONS.map((option) => [option.id, option]));

export function getAchievementEffectOption(id: string): AchievementEffectOption | undefined {
  return EFFECT_BY_ID.get(id);
}
